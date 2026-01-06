/**
 * Authority Information Access (AIA) certificate chain builder.
 *
 * Downloads missing intermediate certificates from URLs embedded in certificates
 * to complete the certificate chain for long-term validation.
 *
 * RFC 5280: Section 4.2.2.1 - Authority Information Access
 */

import { fromBER, ObjectIdentifier, Sequence } from "asn1js";
import * as pkijs from "pkijs";
import { bytesToHex } from "#src/helpers/strings.ts";
import { toArrayBuffer } from "../helpers/buffer";
import { OID_AD_CA_ISSUERS, OID_AUTHORITY_INFO_ACCESS } from "./oids";
import { CertificateChainError } from "./types";

/**
 * Options for AIA chain builder.
 */
export interface AiaChainBuilderOptions {
  /**
   * Maximum number of certificates to fetch.
   * Prevents infinite loops in case of circular references.
   * @default 10
   */
  maxChainLength?: number;

  /**
   * Request timeout in milliseconds.
   * @default 15000
   */
  timeout?: number;

  /**
   * Custom fetch implementation.
   */
  fetch?: typeof globalThis.fetch;
}

/**
 * Build a complete certificate chain using AIA extensions.
 *
 * Given a certificate, this function:
 * 1. Checks if the certificate has a CA Issuers URL in AIA
 * 2. Downloads the issuer certificate
 * 3. Repeats until a self-signed (root) certificate is found
 *
 * @example
 * ```typescript
 * const chain = await buildCertificateChain(signerCert, {
 *   existingChain: signer.certificateChain,
 * });
 * ```
 */
export async function buildCertificateChain(
  certificate: Uint8Array,
  options: AiaChainBuilderOptions & {
    /** Existing chain certificates (if any) */
    existingChain?: Uint8Array[];
  } = {},
): Promise<Uint8Array[]> {
  const maxChainLength = options.maxChainLength ?? 10;
  const timeout = options.timeout ?? 15000;
  const fetchFn = options.fetch ?? globalThis.fetch;

  // Start with existing chain or empty
  const chain: Uint8Array[] = [...(options.existingChain ?? [])];
  const seenSerials = new Set<string>();

  // Add existing certificates to seen set
  for (const certDer of chain) {
    try {
      const cert = parseCertificate(certDer);

      seenSerials.add(getSerialKey(cert));
    } catch (error) {
      console.warn(`Could not parse existing certificate, will ignore it`);
      console.warn(error);

      // Ignore unparseable certificates in existing chain
    }
  }

  // Start with the signing certificate
  let currentCert = parseCertificate(certificate);
  seenSerials.add(getSerialKey(currentCert));

  // Build chain by following AIA CA Issuers links
  while (chain.length < maxChainLength) {
    // Check if current cert is self-signed (root)
    if (isSelfSigned(currentCert)) {
      break;
    }

    // Get CA Issuers URL from AIA
    const caIssuersUrl = getCaIssuersUrl(currentCert);

    if (!caIssuersUrl) {
      // No AIA - chain is incomplete but we can't do anything more
      break;
    }

    // Fetch the issuer certificate
    let issuerDer: Uint8Array;

    try {
      issuerDer = await fetchCertificate(caIssuersUrl, fetchFn, timeout);
    } catch (error) {
      throw new CertificateChainError(
        `Failed to fetch issuer certificate from ${caIssuersUrl}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Parse the issuer certificate
    let issuerCert: pkijs.Certificate;
    try {
      issuerCert = parseCertificate(issuerDer);
    } catch (_error) {
      throw new CertificateChainError(`Failed to parse issuer certificate from ${caIssuersUrl}`);
    }

    // Check for circular reference
    const issuerKey = getSerialKey(issuerCert);

    if (seenSerials.has(issuerKey)) {
      // Already have this certificate - break to avoid infinite loop
      break;
    }

    // Add to chain
    chain.push(issuerDer);
    seenSerials.add(issuerKey);

    currentCert = issuerCert;
  }

  return chain;
}

/**
 * Parse a DER-encoded certificate.
 */
function parseCertificate(der: Uint8Array): pkijs.Certificate {
  const asn1 = fromBER(toArrayBuffer(der));

  if (asn1.offset === -1) {
    throw new Error("Failed to parse certificate");
  }

  return new pkijs.Certificate({ schema: asn1.result });
}

/**
 * Get a unique key for a certificate (issuer + serial).
 */
function getSerialKey(cert: pkijs.Certificate): string {
  const issuer = cert.issuer.toSchema().toBER(false);
  const serial = cert.serialNumber.valueBlock.valueHexView;

  return `${bytesToHex(new Uint8Array(issuer))}:${bytesToHex(new Uint8Array(serial))}`;
}

/**
 * Check if a certificate is self-signed.
 */
function isSelfSigned(cert: pkijs.Certificate): boolean {
  // Compare subject and issuer
  const subject = cert.subject.toSchema().toBER(false);
  const issuer = cert.issuer.toSchema().toBER(false);

  if (subject.byteLength !== issuer.byteLength) {
    return false;
  }

  const subjectView = new Uint8Array(subject);
  const issuerView = new Uint8Array(issuer);

  for (let i = 0; i < subjectView.length; i++) {
    if (subjectView[i] !== issuerView[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Get CA Issuers URL from certificate's AIA extension.
 */
function getCaIssuersUrl(cert: pkijs.Certificate): string | null {
  const aiaExtension = cert.extensions?.find(ext => ext.extnID === OID_AUTHORITY_INFO_ACCESS);

  if (!aiaExtension) {
    return null;
  }

  try {
    // Parse AIA extension value
    const aiaAsn1 = fromBER(
      toArrayBuffer(new Uint8Array(aiaExtension.extnValue.valueBlock.valueHexView)),
    );

    if (aiaAsn1.offset === -1) {
      return null;
    }

    // AIA is a SEQUENCE OF AccessDescription
    const aiaSeq = aiaAsn1.result as Sequence;

    if (!(aiaSeq instanceof Sequence)) {
      return null;
    }

    for (const item of aiaSeq.valueBlock.value) {
      if (!(item instanceof Sequence) || item.valueBlock.value.length < 2) {
        continue;
      }

      const accessMethod = item.valueBlock.value[0];
      const accessLocation = item.valueBlock.value[1];

      // Check if this is CA Issuers
      if (
        accessMethod instanceof ObjectIdentifier &&
        accessMethod.valueBlock.toString() === OID_AD_CA_ISSUERS
      ) {
        // accessLocation is a GeneralName - check for URI (tag 6)
        if (accessLocation.idBlock?.tagNumber === 6) {
          const urlBytes = (accessLocation as any).valueBlock?.valueHexView;

          if (urlBytes) {
            return new TextDecoder().decode(urlBytes);
          }
        }
      }
    }
  } catch (error) {
    console.warn(`Could not get CA Issuers URL from certificate`);
    console.warn(error);

    return null;
  }

  return null;
}

/**
 * Fetch a certificate from URL.
 */
async function fetchCertificate(
  url: string,
  fetchFn: typeof globalThis.fetch,
  timeout: number,
): Promise<Uint8Array> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetchFn(url, {
      method: "GET",
      headers: {
        Accept: "application/pkix-cert, application/x-x509-ca-cert",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const data = await response.arrayBuffer();

    return new Uint8Array(data);
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeout}ms`);
    }

    throw error;
  }
}
