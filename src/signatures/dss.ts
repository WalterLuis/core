/**
 * Document Security Store (DSS) builder for Long-Term Validation (LTV).
 *
 * The DSS dictionary contains validation data (certificates, OCSP responses, CRLs)
 * that allows verifying signatures even after certificates expire.
 *
 * PDF 2.0: Section 12.8.4.3 - Document Security Store dictionary
 * ETSI EN 319 142-1: PAdES digital signatures
 */

import { bytesToHex } from "#src/helpers/strings.ts";
import type { ObjectRegistry } from "../document/object-registry";
import { toArrayBuffer } from "../helpers/buffer";
import { formatPdfDate } from "../helpers/format";
import { PdfArray } from "../objects/pdf-array";
import { PdfDict } from "../objects/pdf-dict";
import { PdfName } from "../objects/pdf-name";
import type { PdfRef } from "../objects/pdf-ref";
import { PdfStream } from "../objects/pdf-stream";
import { PdfString } from "../objects/pdf-string";

/**
 * Validation data for a signature.
 */
export interface SignatureValidationData {
  /** DER-encoded certificates */
  certificates: Uint8Array[];

  /** DER-encoded OCSP responses */
  ocspResponses: Uint8Array[];

  /** DER-encoded CRLs */
  crls: Uint8Array[];
}

/**
 * A single VRI (Validation-Related Information) entry.
 */
export interface VriEntry {
  /** SHA-1 hash of the signature's /Contents value (uppercase hex, no spaces) */
  signatureHash: string;

  /** Validation data for this signature */
  validationData: SignatureValidationData;

  /** Timestamp when validation data was gathered */
  timestamp?: Date;
}

/**
 * DSS dictionary builder.
 *
 * Creates and updates the Document Security Store dictionary in a PDF
 * to embed long-term validation data.
 *
 * @example
 * ```typescript
 * const dss = new DSSBuilder(registry);
 *
 * // Add validation data for a signature
 * dss.addValidationData({
 *   signatureHash: "ABC123...",
 *   validationData: {
 *     certificates: [cert1, cert2],
 *     ocspResponses: [ocsp1],
 *     crls: [],
 *   },
 * });
 *
 * // Build DSS dictionary
 * const dssRef = await dss.build();
 *
 * // Add to catalog
 * catalog.set("DSS", dssRef);
 * ```
 */
export class DSSBuilder {
  private readonly registry: ObjectRegistry;

  /** VRI entries keyed by signature hash */
  private vriEntries: VriEntry[] = [];

  constructor(registry: ObjectRegistry) {
    this.registry = registry;
  }

  /**
   * Add validation data for a signature.
   */
  addValidationData(entry: VriEntry): void {
    this.vriEntries.push({
      signatureHash: entry.signatureHash.toUpperCase(),
      validationData: entry.validationData,
      timestamp: entry.timestamp,
    });
  }

  /**
   * Build the DSS dictionary and register it.
   *
   * @returns Reference to the DSS dictionary
   */
  async build(): Promise<PdfRef> {
    const dss = new PdfDict();
    dss.set("Type", PdfName.of("DSS"));

    // Collect all unique data with hash-based deduplication
    const certMap = new Map<string, { data: Uint8Array; ref?: PdfRef }>();
    const ocspMap = new Map<string, { data: Uint8Array; ref?: PdfRef }>();
    const crlMap = new Map<string, { data: Uint8Array; ref?: PdfRef }>();

    // Collect all data from VRI entries

    for (const entry of this.vriEntries) {
      for (const cert of entry.validationData.certificates) {
        const hash = await this.hashData(cert);

        if (!certMap.has(hash)) {
          certMap.set(hash, { data: cert });
        }
      }

      for (const ocsp of entry.validationData.ocspResponses) {
        const hash = await this.hashData(ocsp);

        if (!ocspMap.has(hash)) {
          ocspMap.set(hash, { data: ocsp });
        }
      }

      for (const crl of entry.validationData.crls) {
        const hash = await this.hashData(crl);

        if (!crlMap.has(hash)) {
          crlMap.set(hash, { data: crl });
        }
      }
    }

    // Create stream objects for certificates
    const certRefs: PdfRef[] = [];

    for (const entry of certMap.values()) {
      const stream = PdfStream.fromDict({}, entry.data);
      const ref = this.registry.register(stream);

      certRefs.push(ref);

      entry.ref = ref;
    }

    if (certRefs.length > 0) {
      dss.set("Certs", new PdfArray(certRefs));
    }

    // Create stream objects for OCSP responses
    const ocspRefs: PdfRef[] = [];

    for (const entry of ocspMap.values()) {
      const stream = PdfStream.fromDict({}, entry.data);
      const ref = this.registry.register(stream);

      ocspRefs.push(ref);

      entry.ref = ref;
    }

    if (ocspRefs.length > 0) {
      dss.set("OCSPs", new PdfArray(ocspRefs));
    }

    // Create stream objects for CRLs
    const crlRefs: PdfRef[] = [];

    for (const entry of crlMap.values()) {
      const stream = PdfStream.fromDict({}, entry.data);
      const ref = this.registry.register(stream);

      crlRefs.push(ref);

      entry.ref = ref;
    }

    if (crlRefs.length > 0) {
      dss.set("CRLs", new PdfArray(crlRefs));
    }

    // Build VRI dictionary
    if (this.vriEntries.length > 0) {
      const vri = new PdfDict();

      for (const entry of this.vriEntries) {
        const vriEntry = new PdfDict();

        // Add certificate references for this signature
        const certRefsForSig: PdfRef[] = [];

        for (const cert of entry.validationData.certificates) {
          const hash = await this.hashData(cert);
          const mapEntry = certMap.get(hash);

          if (mapEntry?.ref) {
            certRefsForSig.push(mapEntry.ref);
          }
        }

        if (certRefsForSig.length > 0) {
          vriEntry.set("Cert", new PdfArray(certRefsForSig));
        }

        // Add OCSP references for this signature
        const ocspRefsForSig: PdfRef[] = [];

        for (const ocsp of entry.validationData.ocspResponses) {
          const hash = await this.hashData(ocsp);
          const mapEntry = ocspMap.get(hash);

          if (mapEntry?.ref) {
            ocspRefsForSig.push(mapEntry.ref);
          }
        }

        if (ocspRefsForSig.length > 0) {
          vriEntry.set("OCSP", new PdfArray(ocspRefsForSig));
        }

        // Add CRL references for this signature
        const crlRefsForSig: PdfRef[] = [];

        for (const crl of entry.validationData.crls) {
          const hash = await this.hashData(crl);
          const mapEntry = crlMap.get(hash);

          if (mapEntry?.ref) {
            crlRefsForSig.push(mapEntry.ref);
          }
        }

        if (crlRefsForSig.length > 0) {
          vriEntry.set("CRL", new PdfArray(crlRefsForSig));
        }

        // Add timestamp if present
        if (entry.timestamp) {
          vriEntry.set("TU", PdfString.fromString(formatPdfDate(entry.timestamp)));
        }

        // Key is SHA-1 hash of signature Contents, uppercase hex
        vri.set(entry.signatureHash, vriEntry);
      }

      dss.set("VRI", vri);
    }

    // Register and return DSS dictionary
    return this.registry.register(dss);
  }

  /**
   * Compute SHA-1 hash of signature /Contents value for VRI key.
   *
   * The VRI key is the uppercase hexadecimal SHA-1 hash of the
   * signature's /Contents value (the CMS SignedData bytes).
   */
  static async computeSignatureHash(signatureContents: Uint8Array): Promise<string> {
    const buffer = toArrayBuffer(signatureContents);
    const hash = await crypto.subtle.digest("SHA-1", buffer);

    return bytesToHex(new Uint8Array(hash));
  }

  /**
   * Hash data for deduplication.
   */
  private async hashData(data: Uint8Array): Promise<string> {
    const buffer = toArrayBuffer(data);
    const hash = await crypto.subtle.digest("SHA-1", buffer);

    return bytesToHex(new Uint8Array(hash));
  }
}
