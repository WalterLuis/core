/**
 * CAdES Detached signature format (ETSI.CAdES.detached).
 *
 * This is the modern PAdES-compliant signature format. It extends PKCS#7 with:
 * - ESS signing-certificate-v2 attribute (binds certificate to signature)
 * - Content hints (optional)
 *
 * ETSI EN 319 122-1: CAdES digital signatures
 * ETSI EN 319 142-1: PAdES digital signatures
 */

import { fromBER, ObjectIdentifier, OctetString, UTCTime } from "asn1js";
import * as pkijs from "pkijs";
import { toArrayBuffer } from "../../helpers/buffer";
import {
  OID_CONTENT_TYPE,
  OID_DATA,
  OID_MESSAGE_DIGEST,
  OID_SIGNED_DATA,
  OID_SIGNING_TIME,
  OID_TIMESTAMP_TOKEN,
} from "../oids";
import type { DigestAlgorithm, Signer } from "../types";
import {
  buildCMSAlgorithmProtection,
  encodeSignedAttributesForSigning,
  getDigestAlgorithmOid,
  getSignatureAlgorithmOid,
  parseCertificate,
} from "./common";
import type { CMSCreateOptions, CMSFormatBuilder, CMSSignedData } from "./types";

/**
 * CAdES Detached signature format builder.
 *
 * Creates CMS signatures compatible with PAdES (PDF Advanced Electronic Signatures).
 * Uses the same structure as PDFBox for maximum Adobe Reader compatibility.
 *
 * Note: While ETSI EN 319 122-1 requires ESS signing-certificate-v2 for CAdES-BES,
 * we omit it because Adobe Reader has issues recognizing timestamps when it's present.
 * PDFBox also omits this attribute.
 */
export class CAdESDetachedBuilder implements CMSFormatBuilder, CMSSignedData {
  private signedData!: pkijs.SignedData;
  private signerInfo!: pkijs.SignerInfo;
  private signatureValue!: Uint8Array;

  /**
   * Create a CMS SignedData structure in CAdES detached format.
   *
   * Returns this builder which can have a timestamp added before
   * being serialized to DER.
   */
  async create(options: CMSCreateOptions): Promise<CMSSignedData> {
    const { signer, documentHash, digestAlgorithm, signingTime } = options;

    // Parse certificates
    const signerCert = parseCertificate(signer.certificate);
    const chainCerts = (signer.certificateChain ?? []).map(parseCertificate);
    const allCerts = [signerCert, ...chainCerts];

    // Build signed attributes
    const signedAttrs = this.buildSignedAttributes(
      documentHash,
      digestAlgorithm,
      signer,
      signingTime,
    );

    // Encode and sign
    const signedAttrsForSigning = encodeSignedAttributesForSigning(signedAttrs);

    this.signatureValue = await signer.sign(new Uint8Array(signedAttrsForSigning), digestAlgorithm);

    // Build SignerInfo
    this.signerInfo = new pkijs.SignerInfo({
      version: 1,
      sid: new pkijs.IssuerAndSerialNumber({
        issuer: signerCert.issuer,
        serialNumber: signerCert.serialNumber,
      }),
      digestAlgorithm: new pkijs.AlgorithmIdentifier({
        algorithmId: getDigestAlgorithmOid(digestAlgorithm),
      }),
      signedAttrs: new pkijs.SignedAndUnsignedAttributes({
        type: 0,
        attributes: signedAttrs,
      }),
      signatureAlgorithm: new pkijs.AlgorithmIdentifier({
        algorithmId: getSignatureAlgorithmOid(signer, digestAlgorithm),
      }),
      signature: new OctetString({ valueHex: toArrayBuffer(this.signatureValue) }),
    });

    // Build SignedData
    this.signedData = new pkijs.SignedData({
      version: 1,
      encapContentInfo: new pkijs.EncapsulatedContentInfo({
        eContentType: OID_DATA,
      }),
      digestAlgorithms: [
        new pkijs.AlgorithmIdentifier({
          algorithmId: getDigestAlgorithmOid(digestAlgorithm),
        }),
      ],
      certificates: allCerts,
      signerInfos: [this.signerInfo],
    });

    return this;
  }

  getSignatureValue(): Uint8Array {
    return this.signatureValue;
  }

  addTimestampToken(token: Uint8Array): void {
    const asn1 = fromBER(toArrayBuffer(token));

    if (asn1.offset === -1) {
      throw new Error("Failed to parse timestamp token");
    }

    if (!this.signerInfo.unsignedAttrs) {
      this.signerInfo.unsignedAttrs = new pkijs.SignedAndUnsignedAttributes({
        type: 1,
        attributes: [],
      });
    }

    this.signerInfo.unsignedAttrs.attributes.push(
      new pkijs.Attribute({
        type: OID_TIMESTAMP_TOKEN,
        values: [asn1.result],
      }),
    );
  }

  toDER(): Uint8Array {
    const contentInfo = new pkijs.ContentInfo({
      contentType: OID_SIGNED_DATA,
      content: this.signedData.toSchema(),
    });

    return new Uint8Array(contentInfo.toSchema().toBER(false));
  }

  /**
   * Build the signed attributes for CAdES signature.
   */
  private buildSignedAttributes(
    documentHash: Uint8Array,
    digestAlgorithm: DigestAlgorithm,
    signer: Signer,
    signingTime?: Date,
  ): pkijs.Attribute[] {
    const attrs: pkijs.Attribute[] = [];

    // Content Type (required)
    attrs.push(
      new pkijs.Attribute({
        type: OID_CONTENT_TYPE,
        values: [new ObjectIdentifier({ value: OID_DATA })],
      }),
    );

    // Signing Time (optional but recommended)
    if (signingTime) {
      attrs.push(
        new pkijs.Attribute({
          type: OID_SIGNING_TIME,
          values: [new UTCTime({ valueDate: signingTime })],
        }),
      );
    }

    // CMS Algorithm Protection (RFC 6211)
    attrs.push(buildCMSAlgorithmProtection(digestAlgorithm, signer));

    // Message Digest (required)
    attrs.push(
      new pkijs.Attribute({
        type: OID_MESSAGE_DIGEST,
        values: [new OctetString({ valueHex: toArrayBuffer(documentHash) })],
      }),
    );

    return attrs;
  }
}
