/**
 * Certificate revocation data providers.
 *
 * Provides OCSP responses and CRLs for long-term validation (LTV).
 * Used for PAdES B-LT level to embed validation data in the PDF.
 *
 * RFC 6960: X.509 Internet Public Key Infrastructure OCSP
 * RFC 5280: X.509 Certificate and CRL Profile
 */

import { fromBER, ObjectIdentifier, OctetString, Sequence } from "asn1js";
import * as pkijs from "pkijs";
import { toArrayBuffer } from "../helpers/buffer";
import {
  OID_AD_OCSP,
  OID_AUTHORITY_INFO_ACCESS,
  OID_CRL_DISTRIBUTION_POINTS,
  OID_SHA256,
} from "./oids";
import type { RevocationProvider } from "./types";
import { RevocationError } from "./types";

/**
 * Options for DefaultRevocationProvider.
 */
export interface DefaultRevocationProviderOptions {
  /**
   * Request timeout in milliseconds.
   * @default 15000
   */
  timeout?: number;

  /**
   * Custom fetch implementation.
   */
  fetch?: typeof globalThis.fetch;

  /**
   * Whether to fetch CRLs if OCSP fails or is unavailable.
   * @default true
   */
  fallbackToCrl?: boolean;
}

/**
 * Default revocation provider that fetches OCSP responses and CRLs
 * from URLs embedded in certificates.
 *
 * @example
 * ```typescript
 * const provider = new DefaultRevocationProvider();
 * const ocsp = await provider.getOCSP(cert, issuer);
 * const crl = await provider.getCRL(cert);
 * ```
 */
export class DefaultRevocationProvider implements RevocationProvider {
  private readonly timeout: number;
  private readonly fetchFn: typeof globalThis.fetch;

  constructor(options: DefaultRevocationProviderOptions = {}) {
    this.timeout = options.timeout ?? 15000;
    this.fetchFn = options.fetch ?? globalThis.fetch;
  }

  /**
   * Get OCSP response for a certificate.
   *
   * @param cert - DER-encoded certificate to check
   * @param issuer - DER-encoded issuer certificate
   * @returns DER-encoded OCSPResponse, or null if unavailable
   */
  async getOCSP(cert: Uint8Array, issuer: Uint8Array): Promise<Uint8Array | null> {
    try {
      // Parse certificates
      const certObj = this.parseCertificate(cert);
      const issuerObj = this.parseCertificate(issuer);

      // Get OCSP responder URL from certificate
      const ocspUrl = this.getOcspUrl(certObj);
      if (!ocspUrl) {
        return null;
      }

      // Build OCSP request
      const request = await this.buildOcspRequest(certObj, issuerObj);

      // Send request
      const response = await this.sendOcspRequest(ocspUrl, request);

      return response;
    } catch (error) {
      console.warn(`Could not get OCSP for certificate`);
      console.warn(error);

      // OCSP is optional - return null on failure
      return null;
    }
  }

  /**
   * Get CRL for a certificate.
   *
   * @param cert - DER-encoded certificate
   * @returns DER-encoded CRL, or null if unavailable
   */
  async getCRL(cert: Uint8Array): Promise<Uint8Array | null> {
    try {
      // Parse certificate
      const certObj = this.parseCertificate(cert);

      // Get CRL distribution point URLs
      const crlUrls = this.getCrlUrls(certObj);

      if (crlUrls.length === 0) {
        return null;
      }

      // Try each URL until one works
      for (const url of crlUrls) {
        try {
          const crl = await this.fetchCrl(url);

          if (crl) {
            return crl;
          }
        } catch (error) {
          console.warn(`Could not fetch CRL from ${url}`);
          console.warn(error);
        }
      }

      return null;
    } catch (error) {
      console.warn(`Could not fetch CRL from certificate`);
      console.warn(error);

      return null;
    }
  }

  /**
   * Parse a DER-encoded certificate.
   */
  private parseCertificate(der: Uint8Array): pkijs.Certificate {
    const asn1 = fromBER(toArrayBuffer(der));

    if (asn1.offset === -1) {
      throw new Error("Failed to parse certificate");
    }

    return new pkijs.Certificate({ schema: asn1.result });
  }

  /**
   * Get OCSP responder URL from certificate's Authority Information Access extension.
   */
  private getOcspUrl(cert: pkijs.Certificate): string | null {
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
      // AccessDescription ::= SEQUENCE { accessMethod OID, accessLocation GeneralName }
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

        // Check if this is OCSP
        if (
          accessMethod instanceof ObjectIdentifier &&
          accessMethod.valueBlock.toString() === OID_AD_OCSP
        ) {
          // accessLocation is a GeneralName - check for URI (tag 6)
          if (accessLocation.idBlock?.tagNumber === 6) {
            // Extract URL from the IA5String value
            const urlBytes = (accessLocation as any).valueBlock?.valueHexView;

            if (urlBytes) {
              return new TextDecoder().decode(urlBytes);
            }
          }
        }
      }
    } catch (error) {
      console.warn(error);

      return null;
    }

    return null;
  }

  /**
   * Get CRL distribution point URLs from certificate.
   */
  private getCrlUrls(cert: pkijs.Certificate): string[] {
    const urls: string[] = [];

    const crlExtension = cert.extensions?.find(ext => ext.extnID === OID_CRL_DISTRIBUTION_POINTS);

    if (!crlExtension) {
      return urls;
    }

    try {
      // Parse CRL Distribution Points
      const crlAsn1 = fromBER(toArrayBuffer(crlExtension.extnValue.valueBlock.valueHexView));

      if (crlAsn1.offset === -1) {
        return urls;
      }

      const crlDPs = new pkijs.CRLDistributionPoints({ schema: crlAsn1.result });

      for (const dp of crlDPs.distributionPoints) {
        if (dp.distributionPoint) {
          // distributionPoint can be fullName or nameRelativeToCRLIssuer
          const fullName = (dp.distributionPoint as any).fullName;

          if (fullName && Array.isArray(fullName)) {
            for (const name of fullName) {
              if (name.type === 6) {
                // uniformResourceIdentifier
                urls.push(name.value);
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn(error);

      // Ignore parsing errors
    }

    return urls;
  }

  /**
   * Build an OCSP request.
   */
  private async buildOcspRequest(
    cert: pkijs.Certificate,
    issuer: pkijs.Certificate,
  ): Promise<Uint8Array> {
    const crypto = pkijs.getCrypto(true);

    // Hash the issuer's name
    const issuerNameHash = await crypto.digest(
      { name: "SHA-256" },
      issuer.subject.toSchema().toBER(false),
    );

    // Hash the issuer's public key
    const issuerKeyHash = await crypto.digest(
      { name: "SHA-256" },
      toArrayBuffer(
        new Uint8Array(issuer.subjectPublicKeyInfo.subjectPublicKey.valueBlock.valueHexView),
      ),
    );

    // Build CertID
    const certId = new Sequence({
      value: [
        // hashAlgorithm
        new Sequence({
          value: [new ObjectIdentifier({ value: OID_SHA256 })],
        }),
        // issuerNameHash
        new OctetString({ valueHex: issuerNameHash }),
        // issuerKeyHash
        new OctetString({ valueHex: issuerKeyHash }),
        // serialNumber
        cert.serialNumber,
      ],
    });

    // Build Request (single certificate)
    const request = new Sequence({
      value: [certId],
    });

    // Build TBSRequest
    const tbsRequest = new Sequence({
      value: [
        // requestList
        new Sequence({ value: [request] }),
      ],
    });

    // Build OCSPRequest
    const ocspRequest = new Sequence({
      value: [tbsRequest],
    });

    return new Uint8Array(ocspRequest.toBER(false));
  }

  /**
   * Send OCSP request and get response.
   */
  private async sendOcspRequest(url: string, request: Uint8Array): Promise<Uint8Array> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Try POST first (preferred)
      const response = await this.fetchFn(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/ocsp-request",
          Accept: "application/ocsp-response",
        },
        body: request,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new RevocationError(`OCSP request failed: HTTP ${response.status}`);
      }

      const data = await response.arrayBuffer();

      return new Uint8Array(data);
    } catch (error) {
      clearTimeout(timeoutId);

      throw error;
    }
  }

  /**
   * Fetch a CRL from URL.
   */
  private async fetchCrl(url: string): Promise<Uint8Array | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await this.fetchFn(url, {
        method: "GET",
        headers: {
          Accept: "application/pkix-crl, application/x-pkcs7-crl",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.arrayBuffer();

      return new Uint8Array(data);
    } catch {
      clearTimeout(timeoutId);

      return null;
    }
  }
}
