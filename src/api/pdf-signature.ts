/**
 * PDFSignature - High-level API for signing PDF documents.
 *
 * Handles the complete signing ceremony including:
 * - Finding or creating signature fields
 * - Creating signature dictionaries with placeholders
 * - Building CMS signatures (PKCS7 or CAdES)
 * - Patching ByteRange and Contents after save
 * - Adding DSS for long-term validation (B-LT)
 * - Adding document timestamps for archival (B-LTA)
 */

import { SignatureField } from "#src/document/forms/fields";
import { formatPdfDate } from "#src/helpers/format.ts";
import { generateUniqueName } from "#src/helpers/strings";
import { PdfArray } from "#src/objects/pdf-array";
import { PdfDict } from "#src/objects/pdf-dict";
import { PdfName } from "#src/objects/pdf-name";
import { PdfNumber } from "#src/objects/pdf-number";
import type { PdfRef } from "#src/objects/pdf-ref";
import { PdfStream } from "#src/objects/pdf-stream";
import { PdfString } from "#src/objects/pdf-string";
import { buildCertificateChain } from "#src/signatures/aia";
import { CAdESDetachedBuilder } from "#src/signatures/formats/cades-detached";
import { PKCS7DetachedBuilder } from "#src/signatures/formats/pkcs7-detached";
import type { CMSFormatBuilder } from "#src/signatures/formats/types";
import {
  calculateByteRange,
  createByteRangePlaceholderObject,
  createContentsPlaceholderObject,
  DEFAULT_PLACEHOLDER_SIZE,
  extractSignedBytes,
  findPlaceholders,
  patchByteRange,
  patchContents,
} from "#src/signatures/placeholder";
import { DefaultRevocationProvider } from "#src/signatures/revocation";
import {
  CertificateChainError,
  type DigestAlgorithm,
  type LtvValidationData,
  type PAdESLevel,
  type RevocationProvider,
  SignatureError,
  type SignOptions,
  type SignResult,
  type SignWarning,
  type SubFilter,
  type TimestampAuthority,
} from "#src/signatures/types";
import {
  computeSha1Hex,
  computeVriKey,
  escapePdfString,
  extractTimestampCertificates,
  extractTimestampFromCms,
  hashData,
} from "#src/signatures/utils";
import type { PDF } from "./pdf";

type RefMap<T = Uint8Array> = Map<string, { data: T; ref?: PdfRef }>;

// ─────────────────────────────────────────────────────────────────────────────
// Helper functions (moved from sign.ts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolved and validated sign options.
 */
interface ResolvedSignOptions {
  digestAlgorithm: DigestAlgorithm;
  subFilter: SubFilter;
  estimatedSize: number;
  signingTime: Date;
  signer: SignOptions["signer"];
  reason?: string;
  location?: string;
  contactInfo?: string;
  fieldName?: string;
  timestampAuthority?: SignOptions["timestampAuthority"];
  longTermValidation: boolean;
  revocationProvider?: RevocationProvider;
  archivalTimestamp: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// PDFSignature class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PDFSignature handles the signing process for a PDF document.
 *
 * This class uses the reload pattern: after each signing operation,
 * the PDF is saved incrementally and reloaded to update internal state.
 *
 * @example
 * ```typescript
 * const pdf = await PDF.load(bytes);
 * const signature = new PDFSignature(pdf);
 *
 * // Sign with full options
 * const result = await signature.sign({
 *   signer,
 *   reason: "Approved",
 *   level: "B-LT",
 *   timestampAuthority,
 * });
 *
 * // PDF is now updated, get final bytes
 * const signedBytes = await pdf.save();
 * ```
 */
export class PDFSignature {
  constructor(private pdf: PDF) {}

  /**
   * Sign the PDF document.
   *
   * Creates a digital signature using PAdES (PDF Advanced Electronic Signatures)
   * format. The signature is embedded as an incremental update, preserving any
   * existing signatures.
   *
   * After signing, the PDF instance is automatically reloaded with the signed
   * bytes, so you can continue using it or call save() to get the final bytes.
   *
   * @param options Signing options including signer, reason, location, etc.
   * @returns Sign result with warnings (bytes are in the PDF instance)
   */
  async sign(options: SignOptions): Promise<SignResult> {
    const warnings: SignWarning[] = [];

    // Resolve and validate options
    const resolved = this.resolveOptions(options);

    // Check for MDP violations
    const mdpWarning = await this.checkMdpViolation();

    if (mdpWarning) {
      warnings.push(mdpWarning);
    }

    // Get first page reference (for widget annotation placement)
    const firstPageRef = this.pdf.context.pages.getPage(0);

    if (!firstPageRef) {
      throw new Error("Document has no pages - cannot create signature field");
    }

    // Create signature dictionary with placeholders
    const signatureDict = PdfDict.of({
      Type: PdfName.of("Sig"),
      Filter: PdfName.of("Adobe.PPKLite"),
      SubFilter: PdfName.of(resolved.subFilter),
      ByteRange: createByteRangePlaceholderObject(),
      Contents: createContentsPlaceholderObject(resolved.estimatedSize),
    });

    // Include /M (signing time) - the timestamp provides authoritative proof,
    // but /M is still useful as a fallback display time.
    signatureDict.set("M", PdfString.fromString(formatPdfDate(resolved.signingTime)));

    if (resolved.reason) {
      signatureDict.set("Reason", PdfString.fromString(escapePdfString(resolved.reason)));
    }

    if (resolved.location) {
      signatureDict.set("Location", PdfString.fromString(escapePdfString(resolved.location)));
    }

    if (resolved.contactInfo) {
      signatureDict.set("ContactInfo", PdfString.fromString(escapePdfString(resolved.contactInfo)));
    }

    const signatureRef = this.pdf.context.registry.register(signatureDict);

    // Find or create signature field
    await this.findOrCreateSignatureField({
      fieldName: resolved.fieldName,
      pageRef: firstPageRef,
      signatureRef,
    });

    // Save incrementally to get bytes with placeholders
    const pdfBytes = await this.pdf.save({ incremental: true });

    // Find placeholders and calculate ByteRange
    const placeholders = findPlaceholders(pdfBytes);
    const byteRange = calculateByteRange(pdfBytes, placeholders);

    // Patch ByteRange
    patchByteRange(pdfBytes, placeholders, byteRange);

    // Extract bytes to sign and hash them
    const signedBytes = extractSignedBytes(pdfBytes, byteRange);
    const documentHash = hashData(signedBytes, resolved.digestAlgorithm);

    // Build CMS signature
    const formatBuilder = this.getFormatBuilder(resolved.subFilter);

    // Create the CMS structure (signs the document)
    // Note: PDFBox includes signingTime even when using a timestamp.
    // The timestamp provides the authoritative time, but signingTime
    // may be needed for Adobe to recognize the timestamp token.
    const signedData = await formatBuilder.create({
      signer: resolved.signer,
      documentHash,
      digestAlgorithm: resolved.digestAlgorithm,
      signingTime: resolved.signingTime,
    });

    // If timestamp authority is configured, add timestamp token
    if (resolved.timestampAuthority) {
      // Hash the signature value for timestamping
      const signatureValue = signedData.getSignatureValue();
      const signatureHash = hashData(signatureValue, resolved.digestAlgorithm);

      // Request timestamp from TSA
      const timestampToken = await resolved.timestampAuthority.timestamp(
        signatureHash,
        resolved.digestAlgorithm,
      );

      // Add timestamp token as unsigned attribute
      signedData.addTimestampToken(timestampToken);
    }

    // Serialize to DER
    const signatureDer = signedData.toDER();

    // Patch Contents with signature
    patchContents(pdfBytes, placeholders, signatureDer);

    // Reload PDF with signed bytes
    await this.pdf.reload(pdfBytes);

    // Gather LTV data if requested
    let ltvData: LtvValidationData | undefined;

    if (resolved.longTermValidation) {
      ltvData = await this.gatherLtvData(
        resolved.signer,
        signatureDer,
        resolved.revocationProvider,
        warnings,
      );
    }

    // If LTV data is present, add DSS as second incremental update
    if (ltvData) {
      await this.addDss(ltvData);

      // For B-LTA, add document timestamp after DSS
      if (resolved.archivalTimestamp && resolved.timestampAuthority) {
        await this.addDocumentTimestamp(resolved.timestampAuthority, resolved.digestAlgorithm);
      }
    }

    // Get final bytes from the reloaded PDF
    const finalBytes = await this.pdf.save();

    return {
      bytes: finalBytes,
      warnings,
    };
  }

  /**
   * Find or create a signature field.
   */
  private async findOrCreateSignatureField(options: {
    fieldName?: string;
    pageRef: PdfRef;
    signatureRef: PdfRef;
  }): Promise<void> {
    const { fieldName, pageRef, signatureRef } = options;

    const form = await this.pdf.getOrCreateForm();

    const existingNames = new Set<string>();

    let fieldDict: PdfDict | undefined;

    const fields = form.getFields();

    for (const field of fields) {
      existingNames.add(field.name);

      // If requested name matches an existing field
      if (fieldName && field.name === fieldName) {
        if (field instanceof SignatureField) {
          if (field.isSigned()) {
            throw new Error(`Signature field "${fieldName}" is already signed`);
          }

          fieldDict = field.getDict(); // Use existing unsigned field
          break;
        }

        throw new Error(`Field "${fieldName}" exists but is not a signature field`);
      }

      // If no name requested, look for first empty signature field
      if (!fieldName && field instanceof SignatureField && !field.isSigned()) {
        fieldDict = field.getDict();
        break;
      }
    }

    if (!fieldDict) {
      fieldDict = form
        .createSignatureField(fieldName ?? generateUniqueName(existingNames, "Signature_"), pageRef)
        .getDict();
    }

    fieldDict.set("V", signatureRef);
    fieldDict.set("F", PdfNumber.of(132)); // Print + Locked (4 + 128)
    fieldDict.set("P", pageRef);
    fieldDict.set(
      "Rect",
      new PdfArray([PdfNumber.of(0), PdfNumber.of(0), PdfNumber.of(0), PdfNumber.of(0)]),
    );
  }

  /**
   * Check for MDP (certification signature) violations.
   */
  private async checkMdpViolation(): Promise<SignWarning | null> {
    const form = await this.pdf.getForm();

    if (!form) {
      return null;
    }

    const fields = form.getFields();

    for (const field of fields) {
      if (field instanceof SignatureField && field.isSigned()) {
        const sigDict = field.getSignatureDict();

        if (sigDict) {
          const reference = sigDict.getArray("Reference");

          if (reference) {
            return {
              code: "MDP_VIOLATION",
              message: "Document has a certification signature that may restrict modifications",
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Add DSS (Document Security Store) for long-term validation.
   *
   * Embeds certificates, OCSP responses, and CRLs so signatures can be
   * validated even after certificates expire.
   *
   * After adding DSS, the PDF is reloaded with the updated bytes.
   *
   * @param ltvData The validation data to embed
   */
  async addDss(ltvData: LtvValidationData): Promise<void> {
    const registry = this.pdf.context.registry;

    // Get catalog
    const catalogDict = await this.pdf.getCatalog();

    if (!catalogDict) {
      throw new Error("Document has no catalog");
    }

    // Deduplicate data using hashes
    const certMap: RefMap<Uint8Array> = new Map();
    const ocspMap: RefMap<Uint8Array> = new Map();
    const crlMap: RefMap<Uint8Array> = new Map();

    for (const cert of ltvData.certificates) {
      const hash = await computeSha1Hex(cert);

      if (!certMap.has(hash)) {
        certMap.set(hash, { data: cert });
      }
    }

    for (const ocsp of ltvData.ocspResponses) {
      const hash = await computeSha1Hex(ocsp);

      if (!ocspMap.has(hash)) {
        ocspMap.set(hash, { data: ocsp });
      }
    }

    for (const crl of ltvData.crls) {
      const hash = await computeSha1Hex(crl);

      if (!crlMap.has(hash)) {
        crlMap.set(hash, { data: crl });
      }
    }

    // Create stream objects for certificates
    const certRefs: PdfRef[] = [];

    for (const [, entry] of certMap) {
      const stream = new PdfStream(new PdfDict(), entry.data);
      const ref = registry.register(stream);
      certRefs.push(ref);
      entry.ref = ref;
    }

    // Create stream objects for OCSP responses
    const ocspRefs: PdfRef[] = [];

    for (const [, entry] of ocspMap) {
      const stream = new PdfStream(new PdfDict(), entry.data);
      const ref = registry.register(stream);
      ocspRefs.push(ref);
      entry.ref = ref;
    }

    // Create stream objects for CRLs
    const crlRefs: PdfRef[] = [];

    for (const [, entry] of crlMap) {
      const stream = new PdfStream(new PdfDict(), entry.data);
      const ref = registry.register(stream);

      crlRefs.push(ref);

      entry.ref = ref;
    }

    // Build VRI entry for this signature
    const vriKey = await computeVriKey(ltvData.signatureContents);
    const vriEntry = new PdfDict();

    // Add certificate references
    const certRefsForSig: PdfRef[] = [];

    for (const cert of ltvData.certificates) {
      const hash = await computeSha1Hex(cert);
      const entry = certMap.get(hash);

      if (entry?.ref) {
        certRefsForSig.push(entry.ref);
      }
    }

    if (certRefsForSig.length > 0) {
      vriEntry.set("Cert", new PdfArray(certRefsForSig));
    }

    // Add OCSP references
    const ocspRefsForSig: PdfRef[] = [];

    for (const ocsp of ltvData.ocspResponses) {
      const hash = await computeSha1Hex(ocsp);
      const entry = ocspMap.get(hash);

      if (entry?.ref) {
        ocspRefsForSig.push(entry.ref);
      }
    }

    if (ocspRefsForSig.length > 0) {
      vriEntry.set("OCSP", new PdfArray(ocspRefsForSig));
    }

    // Add CRL references
    const crlRefsForSig: PdfRef[] = [];

    for (const crl of ltvData.crls) {
      const hash = await computeSha1Hex(crl);
      const entry = crlMap.get(hash);

      if (entry?.ref) {
        crlRefsForSig.push(entry.ref);
      }
    }

    if (crlRefsForSig.length > 0) {
      vriEntry.set("CRL", new PdfArray(crlRefsForSig));
    }

    // Add timestamp
    vriEntry.set("TU", PdfString.fromString(formatPdfDate(ltvData.timestamp)));

    // Build VRI dictionary
    const vriDict = new PdfDict();
    vriDict.set(vriKey, vriEntry);

    // Build DSS dictionary
    const dssDict = new PdfDict();
    dssDict.set("Type", PdfName.of("DSS"));

    if (certRefs.length > 0) {
      dssDict.set("Certs", new PdfArray(certRefs));
    }

    if (ocspRefs.length > 0) {
      dssDict.set("OCSPs", new PdfArray(ocspRefs));
    }

    if (crlRefs.length > 0) {
      dssDict.set("CRLs", new PdfArray(crlRefs));
    }

    dssDict.set("VRI", vriDict);

    // Register DSS and add to catalog
    const dssRef = registry.register(dssDict);
    catalogDict.set("DSS", dssRef);

    // Save and reload
    const savedBytes = await this.pdf.save({ incremental: true });

    await this.pdf.reload(savedBytes);
  }

  /**
   * Add a document timestamp for archival (B-LTA).
   *
   * Creates a document timestamp signature that covers the entire document
   * including previous signatures and DSS data.
   *
   * After adding the timestamp, the PDF is reloaded with the updated bytes.
   *
   * @param timestampAuthority The timestamp authority to use
   * @param digestAlgorithm Digest algorithm (defaults to SHA-256)
   */
  async addDocumentTimestamp(
    timestampAuthority: TimestampAuthority,
    digestAlgorithm: DigestAlgorithm = "SHA-256",
  ): Promise<void> {
    const estimatedSize = DEFAULT_PLACEHOLDER_SIZE;
    const registry = this.pdf.context.registry;

    // Get first page for widget
    const firstPageRef = this.pdf.context.pages.getPage(0);

    if (!firstPageRef) {
      throw new Error("Document has no pages");
    }

    // Create document timestamp dictionary with placeholders
    const timestampDict = PdfDict.of({
      Type: PdfName.of("DocTimeStamp"),
      Filter: PdfName.of("Adobe.PPKLite"),
      SubFilter: PdfName.of("ETSI.RFC3161"),
      ByteRange: createByteRangePlaceholderObject(),
      Contents: createContentsPlaceholderObject(estimatedSize),
    });

    const timestampRef = registry.register(timestampDict);

    // Create signature field for timestamp
    const fieldName = `DocTimeStamp_${Date.now()}`;
    const fieldDict = PdfDict.of({
      Type: PdfName.of("Annot"),
      Subtype: PdfName.of("Widget"),
      FT: PdfName.of("Sig"),
      T: PdfString.fromString(fieldName),
      V: timestampRef,
      F: PdfNumber.of(132),
      P: firstPageRef,
      Rect: new PdfArray([PdfNumber.of(0), PdfNumber.of(0), PdfNumber.of(0), PdfNumber.of(0)]),
    });

    registry.register(fieldDict);

    // Save to get bytes with placeholders
    const savedBytes = await this.pdf.save({ incremental: true });

    // Find placeholders and calculate ByteRange
    const placeholders = findPlaceholders(savedBytes);
    const byteRange = calculateByteRange(savedBytes, placeholders);

    // Patch ByteRange
    patchByteRange(savedBytes, placeholders, byteRange);

    // Hash and get timestamp
    const signedBytes = extractSignedBytes(savedBytes, byteRange);
    const documentHash = hashData(signedBytes, digestAlgorithm);
    const timestampToken = await timestampAuthority.timestamp(documentHash, digestAlgorithm);

    // Patch Contents
    patchContents(savedBytes, placeholders, timestampToken);

    // Reload
    await this.pdf.reload(savedBytes);
  }

  /**
   * Validate and resolve sign options.
   */
  private resolveOptions(options: SignOptions): ResolvedSignOptions {
    // Apply PAdES level defaults
    if (options.level) {
      const levelDefaults = this.resolvePAdESLevel(options.level);

      options = { ...levelDefaults, ...options };
    }

    // Validate subFilter + level compatibility
    const subFilter = options.subFilter ?? "ETSI.CAdES.detached";

    if (options.level && subFilter === "adbe.pkcs7.detached") {
      throw new SignatureError(
        "INVALID_OPTIONS",
        "PAdES levels require ETSI.CAdES.detached subFilter",
      );
    }

    // Validate timestamp requirements

    if (
      (options.level === "B-T" || options.level === "B-LT" || options.level === "B-LTA") &&
      !options.timestampAuthority
    ) {
      throw new SignatureError(
        "INVALID_OPTIONS",
        `PAdES level ${options.level} requires a timestampAuthority`,
      );
    }

    return {
      signer: options.signer,
      digestAlgorithm: options.digestAlgorithm ?? "SHA-256",
      subFilter,
      estimatedSize: options.estimatedSize ?? DEFAULT_PLACEHOLDER_SIZE,
      signingTime: options.signingTime ?? new Date(),
      reason: options.reason,
      location: options.location,
      contactInfo: options.contactInfo,
      fieldName: options.fieldName,
      timestampAuthority: options.timestampAuthority,
      longTermValidation: options.longTermValidation ?? false,
      revocationProvider: options.revocationProvider,
      archivalTimestamp: options.archivalTimestamp ?? false,
    };
  }

  /**
   * Get the CMS format builder for the given subFilter.
   */
  private getFormatBuilder(subFilter: SubFilter): CMSFormatBuilder {
    switch (subFilter) {
      case "adbe.pkcs7.detached":
        return new PKCS7DetachedBuilder();
      case "ETSI.CAdES.detached":
        return new CAdESDetachedBuilder();
    }
  }

  /**
   * Gather long-term validation data (certificates, OCSP, CRL).
   *
   * This includes validation data for both:
   * - The signer's certificate chain
   * - The TSA's certificate chain (if a timestamp is present)
   */
  private async gatherLtvData(
    signer: SignOptions["signer"],
    cmsSignature: Uint8Array,
    revocationProvider: RevocationProvider | undefined,
    warnings: SignWarning[],
  ): Promise<LtvValidationData> {
    const timestamp = new Date();

    // Start with the signer's certificate
    const signerCert = signer.certificate;
    let chain = signer.certificateChain ?? [];

    // Try to build complete chain using AIA
    try {
      chain = await buildCertificateChain(signerCert, {
        existingChain: chain,
      });
    } catch (error) {
      if (error instanceof CertificateChainError) {
        warnings.push({
          code: "CHAIN_INCOMPLETE",
          message: error.message,
        });
      } else {
        throw error;
      }
    }

    // All signer certificates: signer + chain
    const signerCerts = [signerCert, ...chain];

    // Extract TSA certificates from timestamp token (if present)
    let tsaCerts: Uint8Array[] = [];
    const timestampToken = extractTimestampFromCms(cmsSignature);

    if (timestampToken) {
      try {
        // Get certificates embedded in timestamp token
        const embeddedTsaCerts = extractTimestampCertificates(timestampToken);

        if (embeddedTsaCerts.length > 0) {
          // The first cert is usually the TSA signing cert
          const tsaSignerCert = embeddedTsaCerts[0];

          // Try to build complete TSA chain
          try {
            const tsaChain = await buildCertificateChain(tsaSignerCert, {
              existingChain: embeddedTsaCerts.slice(1),
            });

            tsaCerts = [tsaSignerCert, ...tsaChain];
          } catch (error) {
            // If chain building fails, use what we have
            tsaCerts = embeddedTsaCerts;

            if (error instanceof CertificateChainError) {
              warnings.push({
                code: "TSA_CHAIN_INCOMPLETE",
                message: `TSA certificate chain incomplete: ${error.message}`,
              });
            }
          }
        }
      } catch (error) {
        warnings.push({
          code: "TSA_CERT_EXTRACTION_FAILED",
          message: `Could not extract TSA certificates: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    // Combine all certificates (deduplicated by content)
    const allCerts = await this.deduplicateCertificates([...signerCerts, ...tsaCerts]);

    // Get revocation data for each certificate
    const provider = revocationProvider ?? new DefaultRevocationProvider();
    const ocspResponses: Uint8Array[] = [];
    const crls: Uint8Array[] = [];

    // Process signer's certificate chain
    await this.gatherRevocationData(signerCerts, provider, ocspResponses, crls, warnings, "signer");

    // Process TSA's certificate chain (if present)
    if (tsaCerts.length > 0) {
      await this.gatherRevocationData(tsaCerts, provider, ocspResponses, crls, warnings, "TSA");
    }

    return {
      signatureContents: cmsSignature,
      certificates: allCerts,
      ocspResponses,
      crls,
      timestamp,
    };
  }

  /**
   * Gather revocation data for a certificate chain.
   */
  private async gatherRevocationData(
    chain: Uint8Array[],
    provider: RevocationProvider,
    ocspResponses: Uint8Array[],
    crls: Uint8Array[],
    warnings: SignWarning[],
    chainName: string,
  ): Promise<void> {
    for (let i = 0; i < chain.length; i++) {
      const cert = chain[i];
      const issuer = chain[i + 1]; // Next cert is issuer, undefined for root

      // Try OCSP first
      if (issuer && provider.getOCSP) {
        try {
          const ocsp = await provider.getOCSP(cert, issuer);

          if (ocsp) {
            ocspResponses.push(ocsp);
            continue; // Got OCSP, no need for CRL
          }
        } catch (error) {
          console.warn(
            `Could not fetch OCSP for ${chainName} certificate ${i + 1} in chain, will try CRL`,
          );
          console.warn(error);
          // OCSP failed, try CRL
        }
      }

      // Fall back to CRL
      if (provider.getCRL) {
        try {
          const crl = await provider.getCRL(cert);

          if (crl) {
            crls.push(crl);
          }
        } catch (error) {
          console.warn(`Could not fetch CRL for ${chainName} certificate ${i + 1} in chain`);
          console.warn(error);

          warnings.push({
            code: "REVOCATION_UNAVAILABLE",
            message: `Could not fetch revocation data for ${chainName} certificate ${i + 1} in chain`,
          });
        }
      }
    }
  }

  /**
   * Deduplicate certificates by their DER content.
   */
  private async deduplicateCertificates(certs: Uint8Array[]): Promise<Uint8Array[]> {
    const seen = new Set<string>();
    const result: Uint8Array[] = [];

    for (const cert of certs) {
      const hash = await computeSha1Hex(cert);

      if (!seen.has(hash)) {
        seen.add(hash);

        result.push(cert);
      }
    }

    return result;
  }

  /**
   * Resolve PAdES level to individual options.
   */
  private resolvePAdESLevel(level: PAdESLevel): Partial<SignOptions> {
    switch (level) {
      case "B-B":
        return {};
      case "B-T":
        return {}; // timestampAuthority must be provided separately
      case "B-LT":
        return { longTermValidation: true };
      case "B-LTA":
        return { longTermValidation: true, archivalTimestamp: true };
    }
  }
}
