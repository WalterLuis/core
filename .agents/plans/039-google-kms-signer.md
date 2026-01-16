# Plan: Google Cloud KMS (HSM) Signer

## Problem Statement

Users want to sign PDFs using keys stored in Google Cloud Key Management Service (KMS), particularly for HSM-backed keys. This is common in enterprise environments where private keys must never leave a hardware security module for compliance and security reasons.

Currently, we support:

- `P12Signer` - Local PKCS#12 files
- `CryptoKeySigner` - Web Crypto API keys

We need a `GoogleKmsSigner` that:

1. Uses keys stored in Google Cloud KMS
2. Supports HSM-backed keys (protection level)
3. Works with RSA and ECDSA keys
4. Handles the certificate separately (KMS only stores keys, not certificates)

## Goals

1. Add `GoogleKmsSigner` implementation of the `Signer` interface
2. Configure `@google-cloud/kms` as an optional peer dependency
3. Add it as a dev dependency for testing
4. Maintain the async-first design pattern
5. Support all KMS signing algorithms compatible with PDF signing

## Scope

### In Scope

- `GoogleKmsSigner` class implementing `Signer` interface
- Support for RSA (PKCS#1 v1.5, RSA-PSS with compatibility warning) and ECDSA (P-256, P-384, P-521) keys
- Auto-detection of key type and algorithm from KMS key metadata
- Certificate-to-public-key validation during `create()`
- Automatic certificate chain building via AIA (reuses existing `buildCertificateChain`)
- Unit tests for pure logic + integration tests with real KMS in CI
- Documentation in JSDoc

### Out of Scope

- AWS KMS support (separate signer, separate plan)
- Azure Key Vault support (separate signer, separate plan)
- Certificate issuance (user must get certificate from their CA via CSR)
- KMS key creation/management (user must create keys in GCP console)
- secp256k1 curve support (not suitable for PDF signing)

## External Dependencies

### `@google-cloud/kms`

The official Google Cloud KMS client library for Node.js.

```bash
npm install @google-cloud/kms
```

**Peer dependency version:** `^4.0.0` (latest major only)

**Key APIs we'll use:**

- `KeyManagementServiceClient` - Main client
- `asymmetricSign()` - Sign data with asymmetric key
- `getPublicKey()` - Get public key (for certificate validation)
- `getCryptoKeyVersion()` - Get key metadata

**Authentication:** Uses Application Default Credentials (ADC) by default:

- `GOOGLE_APPLICATION_CREDENTIALS` env var
- `gcloud auth application-default login`
- Workload Identity on GKE
- Service account key file

### `@google-cloud/secret-manager` (Optional)

For the `getCertificateFromSecretManager()` helper.

```bash
npm install @google-cloud/secret-manager
```

**Peer dependency version:** `^5.0.0`

**Key APIs we'll use:**

- `SecretManagerServiceClient` - Main client
- `accessSecretVersion()` - Fetch secret payload

This is only needed if users want to store their certificate in Secret Manager. The helper will throw a clear error if the package isn't installed.

### Package Configuration

```json
{
  "peerDependencies": {
    "@google-cloud/kms": "^4.0.0",
    "@google-cloud/secret-manager": "^5.0.0"
  },
  "peerDependenciesMeta": {
    "@google-cloud/kms": { "optional": true },
    "@google-cloud/secret-manager": { "optional": true }
  },
  "devDependencies": {
    "@google-cloud/kms": "^4.0.0",
    "@google-cloud/secret-manager": "^5.0.0"
  }
}
```

Both GCP packages are optional peer dependencies - users only install what they need.

## Desired Usage

### Basic Usage

```typescript
import { PDF, GoogleKmsSigner } from "@libpdf/core";

// Create signer with key reference and certificate
const signer = await GoogleKmsSigner.create({
  // Full resource name of the KMS key version
  keyVersionName:
    "projects/my-project/locations/us-east1/keyRings/my-ring/cryptoKeys/my-key/cryptoKeyVersions/1",

  // Certificate issued for the KMS key (DER-encoded, from your CA)
  certificate: certificateDer, // Uint8Array
});

// Sign the PDF
const pdf = await PDF.load(pdfBytes);
const { bytes } = await pdf.sign({
  signer,
  reason: "Approved by KMS",
});
```

### With Certificate from Secret Manager

```typescript
// Helper to load certificate from Google Secret Manager
// Supports cross-project access via full resource name
const certificate = await GoogleKmsSigner.getCertificateFromSecretManager(
  "projects/my-project/secrets/my-cert/versions/latest",
);

const signer = await GoogleKmsSigner.create({
  keyVersionName: "projects/.../cryptoKeyVersions/1",
  certificate,
  buildChain: true,
});
```

### With Automatic Chain Building (AIA)

```typescript
// If your certificate has AIA extensions (most CA-issued certs do),
// the chain will be built automatically
const signer = await GoogleKmsSigner.create({
  keyVersionName: "projects/.../cryptoKeyVersions/1",
  certificate: certificateDer,
  buildChain: true, // Fetch intermediates via AIA (default: false)
});

// Chain is now populated automatically
console.log(signer.certificateChain.length); // e.g., 2 (intermediate + root)
```

### With Manual Chain

```typescript
// You can also provide the chain manually if needed
const signer = await GoogleKmsSigner.create({
  keyVersionName: "projects/.../cryptoKeyVersions/1",
  certificate: certificateDer,
  certificateChain: [intermediateDer, rootDer], // Explicit chain
});
```

### With Shorthand Key Reference

```typescript
// Using shorthand options (builds full resource name internally)
const signer = await GoogleKmsSigner.create({
  projectId: "my-project",
  locationId: "us-east1",
  keyRingId: "my-ring",
  keyId: "my-key",
  keyVersion: "1", // Optional, defaults to "1"

  certificate: certificateDer,
  buildChain: true,
});
```

### With Custom Client Options

```typescript
import { KeyManagementServiceClient } from "@google-cloud/kms";

// Use your own client (useful for custom auth or mocking)
const client = new KeyManagementServiceClient({
  keyFilename: "/path/to/service-account.json",
});

const signer = await GoogleKmsSigner.create({
  client, // Provide pre-configured client
  keyVersionName: "projects/.../cryptoKeyVersions/1",
  certificate: certificateDer,
});
```

### Inspecting Signer Properties

```typescript
// Algorithm is auto-detected from KMS key metadata
const signer = await GoogleKmsSigner.create({
  keyVersionName: "projects/.../cryptoKeyVersions/1",
  certificate: certificateDer,
});

console.log(signer.keyType); // "RSA" or "EC"
console.log(signer.signatureAlgorithm); // "RSASSA-PKCS1-v1_5", "RSA-PSS", or "ECDSA"
console.log(signer.digestAlgorithm); // "SHA-256", "SHA-384", or "SHA-512"
console.log(signer.keyVersionName); // Full resource name (for logging/debugging)
```

## Architecture

### File Structure

```
src/signatures/signers/
├── index.ts                 # Export GoogleKmsSigner (class only, not types)
├── google-kms.ts            # GoogleKmsSigner implementation
└── google-kms.test.ts       # Unit tests for pure logic + integration tests
```

### Options Type (Discriminated Union)

The options interface uses a TypeScript discriminated union to enforce that users provide EITHER a full `keyVersionName` OR the shorthand properties:

```typescript
/** Base options shared by both key reference styles */
interface GoogleKmsSignerBaseOptions {
  /** DER-encoded X.509 certificate issued for this KMS key */
  certificate: Uint8Array;

  /** Certificate chain [intermediate, ..., root] (optional) */
  certificateChain?: Uint8Array[];

  /** Build certificate chain via AIA extensions (default: false) */
  buildChain?: boolean;

  /** Timeout for AIA chain building in ms (default: 15000) */
  chainTimeout?: number;

  /** Pre-configured KMS client (optional, uses ADC if not provided) */
  client?: KeyManagementServiceClient;
}

/** Full resource name style */
interface GoogleKmsSignerFullNameOptions extends GoogleKmsSignerBaseOptions {
  /** Full KMS key version resource name */
  keyVersionName: string;
}

/** Shorthand style */
interface GoogleKmsSignerShorthandOptions extends GoogleKmsSignerBaseOptions {
  projectId: string;
  locationId: string;
  keyRingId: string;
  keyId: string;
  /** Key version number (default: "1") */
  keyVersion?: string;
}

/** Options for GoogleKmsSigner.create() */
type GoogleKmsSignerOptions = GoogleKmsSignerFullNameOptions | GoogleKmsSignerShorthandOptions;
```

**Note:** Options types are NOT exported from the public API. Users rely on TypeScript inference from `create()` parameters.

### Static Helper: `getCertificateFromSecretManager`

````typescript
/**
 * Load a certificate from Google Secret Manager.
 *
 * The secret must contain a DER-encoded certificate. PEM format is NOT supported -
 * convert to DER before storing in Secret Manager.
 *
 * Supports cross-project access: the secret can be in a different GCP project
 * than the KMS key.
 *
 * @param secretVersionName - Full resource name, e.g.
 *   "projects/my-project/secrets/my-cert/versions/latest"
 * @param options - Optional client configuration
 * @throws {KmsSignerError} if @google-cloud/secret-manager is not installed
 *
 * @example
 * ```typescript
 * // From same project
 * const cert = await GoogleKmsSigner.getCertificateFromSecretManager(
 *   "projects/my-project/secrets/signing-cert/versions/latest"
 * );
 *
 * // From different project (cross-project access)
 * const cert = await GoogleKmsSigner.getCertificateFromSecretManager(
 *   "projects/shared-certs-project/secrets/signing-cert/versions/1"
 * );
 * ```
 */
static async getCertificateFromSecretManager(
  secretVersionName: string,
  options?: { client?: SecretManagerServiceClient }
): Promise<Uint8Array>
````

Implementation notes:

- Dynamically imports `@google-cloud/secret-manager` using `await import()`
- On `MODULE_NOT_FOUND`, throws: `KmsSignerError: @google-cloud/secret-manager is required. Install with: npm install @google-cloud/secret-manager`
- DER format only (consistent with P12Signer and certificate parameter)
- Uses provided client or creates one with ADC

### KMS Algorithm Mapping

Google KMS uses specific algorithm identifiers. We map them to our types:

| KMS Algorithm                | KeyType | SignatureAlgorithm | DigestAlgorithm | Notes                 |
| ---------------------------- | ------- | ------------------ | --------------- | --------------------- |
| `RSA_SIGN_PKCS1_2048_SHA256` | RSA     | RSASSA-PKCS1-v1_5  | SHA-256         |                       |
| `RSA_SIGN_PKCS1_3072_SHA256` | RSA     | RSASSA-PKCS1-v1_5  | SHA-256         |                       |
| `RSA_SIGN_PKCS1_4096_SHA256` | RSA     | RSASSA-PKCS1-v1_5  | SHA-256         |                       |
| `RSA_SIGN_PKCS1_4096_SHA512` | RSA     | RSASSA-PKCS1-v1_5  | SHA-512         |                       |
| `RSA_SIGN_PSS_2048_SHA256`   | RSA     | RSA-PSS            | SHA-256         | Compatibility warning |
| `RSA_SIGN_PSS_3072_SHA256`   | RSA     | RSA-PSS            | SHA-256         | Compatibility warning |
| `RSA_SIGN_PSS_4096_SHA256`   | RSA     | RSA-PSS            | SHA-256         | Compatibility warning |
| `RSA_SIGN_PSS_4096_SHA512`   | RSA     | RSA-PSS            | SHA-512         | Compatibility warning |
| `EC_SIGN_P256_SHA256`        | EC      | ECDSA              | SHA-256         |                       |
| `EC_SIGN_P384_SHA384`        | EC      | ECDSA              | SHA-384         |                       |
| `EC_SIGN_SECP256K1_SHA256`   | -       | -                  | -               | **Rejected**          |

**RSA-PSS Note:** When a KMS key uses RSA-PSS, `create()` logs a warning:

```
Warning: RSA-PSS signatures may not verify correctly in older PDF readers (Adobe Acrobat < 2020). Consider using PKCS#1 v1.5 for maximum compatibility.
```

**secp256k1 Note:** If the KMS key uses `EC_SIGN_SECP256K1_SHA256`, `create()` throws:

```
KmsSignerError: Unsupported curve for PDF signing: secp256k1. Use P-256, P-384, or P-521 instead.
```

### Digest Algorithm Validation

KMS keys are locked to specific digest algorithms. The `sign()` method validates that the requested digest matches:

```typescript
async sign(data: Uint8Array, algorithm: DigestAlgorithm): Promise<Uint8Array> {
  // Validate digest algorithm matches KMS key
  if (algorithm !== this.digestAlgorithm) {
    throw new KmsSignerError(
      `Digest algorithm mismatch: this KMS key requires ${this.digestAlgorithm}, but ${algorithm} was requested`
    );
  }

  // ... hash and sign
}
```

### Error Handling

New error type for KMS-specific errors:

```typescript
export class KmsSignerError extends SignerError {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(`KMS: ${message}`);
    this.name = "KmsSignerError";
  }
}
```

Error scenarios and messages:

| Scenario              | Error Message                                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Package not installed | `@google-cloud/kms is required. Install with: npm install @google-cloud/kms`                                                     |
| Key not found         | `Key not found: {keyVersionName}. Verify the resource name and your permissions.`                                                |
| Permission denied     | `Permission denied for key: {keyVersionName}. Ensure the service account has 'cloudkms.cryptoKeyVersions.useToSign' permission.` |
| Key not ENABLED       | `Key is not enabled: {keyVersionName}. State: {state}. Only ENABLED keys can sign.`                                              |
| Wrong key purpose     | `Key purpose must be ASYMMETRIC_SIGN, got: {purpose}`                                                                            |
| Unsupported algorithm | `Unsupported KMS algorithm for PDF signing: {algorithm}`                                                                         |
| Certificate mismatch  | `Certificate public key does not match KMS key. Ensure the certificate was issued for this KMS key.`                             |
| Digest mismatch       | `Digest algorithm mismatch: this KMS key requires {expected}, but {actual} was requested`                                        |
| Network error         | `Failed to connect to KMS: {originalError}`                                                                                      |

### Creation Flow

1. User calls `GoogleKmsSigner.create()` with options
2. Dynamically import `@google-cloud/kms` (throw helpful error if not installed)
3. Build full `keyVersionName` if shorthand options provided
4. Create KMS client if not provided (uses ADC)
5. Fetch key version metadata via `getCryptoKeyVersion()`
6. Validate:
   - Key state is `ENABLED`
   - Key purpose is `ASYMMETRIC_SIGN`
   - Algorithm is supported (not secp256k1)
7. Map KMS algorithm to our types (`keyType`, `signatureAlgorithm`, `digestAlgorithm`)
8. Log warning if RSA-PSS
9. Fetch public key via `getPublicKey()` and validate it matches certificate's public key
10. If `buildChain: true`, call `buildCertificateChain()` from `aia.ts`
11. Return configured signer instance

### Certificate Validation

During `create()`, we validate that the provided certificate matches the KMS key:

```typescript
// Fetch public key from KMS
const [publicKeyResponse] = await client.getPublicKey({ name: keyVersionName });
const kmsPublicKeyPem = publicKeyResponse.pem;

// Parse certificate and extract its public key
const certPublicKey = extractPublicKeyFromCertificate(certificate);

// Compare (both as PEM or DER)
if (!publicKeysMatch(kmsPublicKeyPem, certPublicKey)) {
  throw new KmsSignerError(
    "Certificate public key does not match KMS key. Ensure the certificate was issued for this KMS key.",
  );
}
```

This catches configuration errors early rather than producing signatures that won't verify.

### Signing Flow

When `sign(data, algorithm)` is called:

1. Validate `algorithm` matches `this.digestAlgorithm` (throw if mismatch)
2. Hash data locally using `@noble/hashes`:

   ```typescript
   import { sha256 } from "@noble/hashes/sha256";
   import { sha384, sha512 } from "@noble/hashes/sha2";

   const digest =
     algorithm === "SHA-256" ? sha256(data) : algorithm === "SHA-384" ? sha384(data) : sha512(data);
   ```

3. Call KMS `asymmetricSign()` with pre-computed digest:
   ```typescript
   const [response] = await this.client.asymmetricSign({
     name: this.keyVersionName,
     digest: {
       [this.digestAlgorithm === "SHA-256"
         ? "sha256"
         : this.digestAlgorithm === "SHA-384"
           ? "sha384"
           : "sha512"]: digest,
     },
   });
   ```
4. Return signature bytes directly (KMS returns DER-encoded ECDSA, which matches our interface)

### ECDSA Signature Format

Google KMS returns ECDSA signatures in DER-encoded ASN.1 format (a SEQUENCE of two INTEGERs for r and s). Our `Signer` interface specifies "DER-encoded (r, s) pair" for ECDSA. Since these match, we pass through the KMS response directly without conversion.

### Client Lifecycle

- If `client` option is provided, use it (caller manages lifecycle)
- If not provided, create a new `KeyManagementServiceClient()` internally
- The GCP client handles connection pooling and cleanup automatically
- No explicit `close()` method needed on `GoogleKmsSigner`

Document in JSDoc:

```typescript
/**
 * @param options.client - Pre-configured KMS client. If not provided, a new client
 *   is created using Application Default Credentials (ADC). The GCP client library
 *   manages connection lifecycle automatically.
 */
```

### Class Definition

````typescript
/**
 * Signer that uses Google Cloud KMS for signing operations.
 *
 * Supports RSA and ECDSA keys stored in Cloud KMS, including HSM-backed keys.
 * The private key never leaves KMS - only the digest is sent for signing.
 *
 * **Performance note:** Each `sign()` call makes a network request to KMS
 * (~50-200ms latency). For bulk signing, consider the performance implications.
 *
 * @example
 * ```typescript
 * const signer = await GoogleKmsSigner.create({
 *   keyVersionName: "projects/my-project/locations/us/keyRings/ring/cryptoKeys/key/cryptoKeyVersions/1",
 *   certificate: certificateDer,
 * });
 *
 * const pdf = await PDF.load(pdfBytes);
 * const { bytes } = await pdf.sign({ signer });
 * ```
 */
export class GoogleKmsSigner implements Signer {
  readonly certificate: Uint8Array;
  readonly certificateChain: Uint8Array[];
  readonly keyType: KeyType;
  readonly signatureAlgorithm: SignatureAlgorithm;

  /** The digest algorithm this KMS key uses (locked at key creation) */
  readonly digestAlgorithm: DigestAlgorithm;

  /** Full resource name of the KMS key version (for logging/debugging) */
  readonly keyVersionName: string;

  private readonly client: KeyManagementServiceClient;

  private constructor(/* ... */) {
    /* ... */
  }

  static async create(options: GoogleKmsSignerOptions): Promise<GoogleKmsSigner>;

  static async getCertificateFromSecretManager(
    secretVersionName: string,
    options?: { client?: SecretManagerServiceClient },
  ): Promise<Uint8Array>;

  async sign(data: Uint8Array, algorithm: DigestAlgorithm): Promise<Uint8Array>;
}
````

## Test Plan

### Unit Tests (Pure Logic)

Test without any network calls or mocks:

1. **Algorithm mapping logic**
   - Test `mapKmsAlgorithm()` for all supported algorithms
   - Test secp256k1 throws appropriate error
   - Test unknown algorithm throws appropriate error

2. **Resource name building**
   - Test shorthand → full resource name conversion
   - Test with/without explicit keyVersion
   - Test that keyVersion defaults to "1"

3. **Error class construction**
   - Test `KmsSignerError` message formatting
   - Test `cause` chaining

4. **Digest algorithm validation logic**
   - Test mismatch detection

### Integration Tests (Real KMS)

Run with real GCP credentials in CI:

```typescript
describe("GoogleKmsSigner integration", () => {
  // These tests require:
  // - GOOGLE_APPLICATION_CREDENTIALS or workload identity
  // - Test KMS keys in the configured project
  // - Test certificate matching those keys

  it("signs with RSA PKCS#1 v1.5 key", async () => {
    const signer = await GoogleKmsSigner.create({
      keyVersionName: process.env.TEST_RSA_KEY_VERSION!,
      certificate: testRsaCertificate,
    });

    const signature = await signer.sign(testData, "SHA-256");
    expect(signature).toBeInstanceOf(Uint8Array);
    expect(signature.length).toBeGreaterThan(0);

    // Verify signature externally
    const valid = await verifySignature(testData, signature, testRsaCertificate);
    expect(valid).toBe(true);
  });

  it("signs with ECDSA P-256 key", async () => {
    /* ... */
  });

  it("rejects mismatched certificate", async () => {
    await expect(
      GoogleKmsSigner.create({
        keyVersionName: process.env.TEST_RSA_KEY_VERSION!,
        certificate: wrongCertificate,
      }),
    ).rejects.toThrow("does not match KMS key");
  });

  it("rejects disabled key", async () => {
    /* ... */
  });

  it("builds certificate chain via AIA", async () => {
    /* ... */
  });

  it("signs a complete PDF", async () => {
    const signer = await GoogleKmsSigner.create({
      /* ... */
    });
    const pdf = await PDF.load(testPdfBytes);
    const { bytes } = await pdf.sign({ signer });

    // Verify with external tool (pdfsig, Adobe, etc.)
    const valid = await verifyPdfSignature(bytes);
    expect(valid).toBe(true);
  });
});
```

### CI Configuration

Set up a dedicated GCP project for CI with:

- Service account with minimal permissions (`cloudkms.cryptoKeyVersions.useToSign`, `cloudkms.cryptoKeyVersions.viewPublicKey`, `cloudkms.cryptoKeyVersions.get`)
- Test keys (RSA PKCS#1 v1.5, RSA-PSS, ECDSA P-256)
- Service account key stored as CI secret (`GOOGLE_APPLICATION_CREDENTIALS`)

Environment variables for tests:

```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/ci-service-account.json
TEST_RSA_KEY_VERSION=projects/libpdf-test/locations/us-east1/keyRings/ci-testing/cryptoKeys/rsa-signing/cryptoKeyVersions/1
TEST_EC_KEY_VERSION=projects/libpdf-test/locations/us-east1/keyRings/ci-testing/cryptoKeys/ec-signing/cryptoKeyVersions/1
```

### Test Fixtures

- Test certificates (DER) matching the CI KMS keys
- Sample PDF files for end-to-end signing tests
- Expected signature formats for verification

## Decisions Summary

| Decision                 | Choice                           | Rationale                                  |
| ------------------------ | -------------------------------- | ------------------------------------------ |
| Import strategy          | Dynamic import with try/catch    | Allows optional dep without bundler config |
| RSA-PSS support          | Allow with warning               | User choice, but document compatibility    |
| ECDSA format             | Pass through directly            | KMS returns DER, interface expects DER     |
| Lazy initialization      | No                               | Fail fast on config errors                 |
| Secret Manager helper    | Static method on class           | Discoverable, common SDK pattern           |
| Digest mismatch          | Throw at sign() time             | Clear error when it happens                |
| Key reference validation | No pre-validation                | Let KMS API return clear errors            |
| Key state check          | ENABLED only                     | Match KMS behavior, clear error            |
| Missing dep error        | Include npm command              | `npm install @google-cloud/kms`            |
| Certificate format       | DER only                         | Consistent with P12Signer                  |
| buildChain default       | false                            | No surprise network calls                  |
| Cert validation          | Validate in create()             | Fail fast on misconfiguration              |
| secp256k1                | Reject with error                | Not suitable for PDF signing               |
| Expose keyVersionName    | Yes, readonly                    | Useful for logging/debugging               |
| Options typing           | Discriminated union              | Type-safe mutual exclusion                 |
| Export types             | Class only                       | Simpler public API                         |
| Cross-project secrets    | Yes                              | Full resource name includes project        |
| Peer dep version         | ^4.0.0                           | Latest major only                          |
| Testing strategy         | Unit (pure) + Integration (real) | Real tests more valuable than mocks        |
| CI testing               | Real GCP with service account    | Full confidence in implementation          |

## Risks

1. **Authentication complexity** - GCP auth has many modes (ADC, service accounts, workload identity). Document common setups clearly in JSDoc.

2. **Latency** - Each `sign()` call is a network round-trip (~50-200ms). Document this prominently. For bulk signing, users should be aware of the cumulative latency.

3. **Cost** - KMS operations have costs (~$0.03 per 10,000 operations). Not our problem, but worth noting in docs.

4. **Version compatibility** - We pin to `^4.0.0`. If v5 has breaking changes, users will need to wait for us to update.

5. **CI costs** - Running integration tests on every PR uses real KMS. Set up budget alerts.

## Appendix: KMS Key Creation Reference

For testing/documentation, here's how to create compatible keys:

```bash
# Create key ring
gcloud kms keyrings create pdf-signing \
  --location us-east1

# Create RSA signing key (HSM-backed)
gcloud kms keys create pdf-rsa-key \
  --keyring pdf-signing \
  --location us-east1 \
  --purpose asymmetric-signing \
  --default-algorithm rsa-sign-pkcs1-2048-sha256 \
  --protection-level hsm

# Create ECDSA signing key (HSM-backed)
gcloud kms keys create pdf-ec-key \
  --keyring pdf-signing \
  --location us-east1 \
  --purpose asymmetric-signing \
  --default-algorithm ec-sign-p256-sha256 \
  --protection-level hsm

# Get public key (for certificate generation)
gcloud kms keys versions get-public-key 1 \
  --key pdf-rsa-key \
  --keyring pdf-signing \
  --location us-east1 \
  --output-file public-key.pem
```

Users then need to:

1. Generate a CSR using the public key
2. Submit CSR to their CA
3. Receive certificate and store it (e.g., in Secret Manager)
4. Use the certificate with `GoogleKmsSigner`

## Appendix: CI Setup Reference

```bash
# Create CI service account
gcloud iam service-accounts create libpdf-ci \
  --display-name="libpdf CI Testing"

# Grant minimal permissions
gcloud kms keys add-iam-policy-binding pdf-rsa-key \
  --keyring pdf-signing \
  --location us-east1 \
  --member="serviceAccount:libpdf-ci@PROJECT.iam.gserviceaccount.com" \
  --role="roles/cloudkms.signerVerifier"

# Create and download key (store as CI secret)
gcloud iam service-accounts keys create ci-key.json \
  --iam-account=libpdf-ci@PROJECT.iam.gserviceaccount.com
```
