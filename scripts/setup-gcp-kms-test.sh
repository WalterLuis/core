#!/usr/bin/env bash
#
# Setup Google Cloud KMS test infrastructure for GoogleKmsSigner integration tests.
#
# This script creates:
# 1. A KMS key ring with HSM-backed RSA and ECDSA signing keys
# 2. Self-signed certificates using PKCS#11 to sign with the HSM keys
# 3. Exports environment variables for running tests
#
# Prerequisites:
# - gcloud CLI installed and authenticated
# - A GCP project with billing enabled
# - Cloud KMS API enabled
# - Google Cloud KMS PKCS#11 library installed
#
# Usage:
#   ./scripts/setup-gcp-kms-test.sh [PROJECT_ID] [LOCATION]
#
# Example:
#   ./scripts/setup-gcp-kms-test.sh my-project us-east1
#

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null)}"
LOCATION="${2:-us-east1}"
KEY_RING="libpdf-test"
RSA_KEY="pdf-rsa-signing"
EC_KEY="pdf-ec-signing"

# Output directory for certificates
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${SCRIPT_DIR}/../fixtures/kms-test"

# PKCS#11 library path (varies by OS)
if [[ "$(uname)" == "Darwin" ]]; then
  PKCS11_LIB="${PKCS11_LIB:-/usr/local/lib/libkmsp11.dylib}"
else
  PKCS11_LIB="${PKCS11_LIB:-/usr/local/lib/libkmsp11.so}"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────────────────

info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1"
  exit 1
}

step() {
  echo -e "${BLUE}[STEP]${NC} $1"
}

# ─────────────────────────────────────────────────────────────────────────────
# Validation
# ─────────────────────────────────────────────────────────────────────────────

if ! command -v gcloud &> /dev/null; then
  error "gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
fi

if ! command -v openssl &> /dev/null; then
  error "openssl not found. Install it first."
fi

if [[ -z "$PROJECT_ID" ]]; then
  error "No project ID specified. Run: gcloud config set project PROJECT_ID"
fi

info "Using project: $PROJECT_ID"
info "Using location: $LOCATION"

# Ensure we're authenticated
if ! gcloud auth print-access-token &> /dev/null; then
  error "Not authenticated. Run: gcloud auth login"
fi

# Check for PKCS#11 library
if [[ ! -f "$PKCS11_LIB" ]]; then
  warn "PKCS#11 library not found at: $PKCS11_LIB"
  echo ""
  echo "To install the Google Cloud KMS PKCS#11 library:"
  echo ""
  if [[ "$(uname)" == "Darwin" ]]; then
    echo "  # macOS (Apple Silicon)"
    echo "  curl -Lo /tmp/libkmsp11.tar.gz https://github.com/GoogleCloudPlatform/kms-integrations/releases/download/pkcs11-v1.4/libkmsp11-1.4-darwin-arm64.tar.gz"
    echo "  sudo tar -xzf /tmp/libkmsp11.tar.gz -C /usr/local/lib --strip-components=1"
    echo ""
    echo "  # macOS (Intel)"
    echo "  curl -Lo /tmp/libkmsp11.tar.gz https://github.com/GoogleCloudPlatform/kms-integrations/releases/download/pkcs11-v1.4/libkmsp11-1.4-darwin-amd64.tar.gz"
    echo "  sudo tar -xzf /tmp/libkmsp11.tar.gz -C /usr/local/lib --strip-components=1"
  else
    echo "  # Linux (x86_64)"
    echo "  curl -Lo /tmp/libkmsp11.tar.gz https://github.com/GoogleCloudPlatform/kms-integrations/releases/download/pkcs11-v1.4/libkmsp11-1.4-linux-amd64.tar.gz"
    echo "  sudo tar -xzf /tmp/libkmsp11.tar.gz -C /usr/local/lib --strip-components=1"
  fi
  echo ""
  echo "Or set PKCS11_LIB environment variable to the library path."
  echo ""
  error "Please install the PKCS#11 library and try again."
fi

info "Using PKCS#11 library: $PKCS11_LIB"

# Enable KMS API if not already enabled
info "Ensuring Cloud KMS API is enabled..."
gcloud services enable cloudkms.googleapis.com --project="$PROJECT_ID" 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────────────────
# Create Output Directory
# ─────────────────────────────────────────────────────────────────────────────

mkdir -p "$OUTPUT_DIR"
# PKCS#11 library requires strict permissions on config files
chmod 700 "$OUTPUT_DIR"
info "Output directory: $OUTPUT_DIR"

# ─────────────────────────────────────────────────────────────────────────────
# Create Key Ring (if not exists)
# ─────────────────────────────────────────────────────────────────────────────

step "Creating key ring: $KEY_RING..."
if gcloud kms keyrings describe "$KEY_RING" \
    --location="$LOCATION" \
    --project="$PROJECT_ID" &> /dev/null; then
  warn "Key ring already exists, skipping creation"
else
  gcloud kms keyrings create "$KEY_RING" \
    --location="$LOCATION" \
    --project="$PROJECT_ID"
  info "Key ring created"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Create RSA Signing Key (if not exists)
# ─────────────────────────────────────────────────────────────────────────────

step "Creating HSM-backed RSA signing key: $RSA_KEY..."
if gcloud kms keys describe "$RSA_KEY" \
    --keyring="$KEY_RING" \
    --location="$LOCATION" \
    --project="$PROJECT_ID" &> /dev/null; then
  warn "RSA key already exists, skipping creation"
else
  gcloud kms keys create "$RSA_KEY" \
    --keyring="$KEY_RING" \
    --location="$LOCATION" \
    --project="$PROJECT_ID" \
    --purpose=asymmetric-signing \
    --default-algorithm=rsa-sign-pkcs1-2048-sha256 \
    --protection-level=hsm
  info "RSA key created (HSM-backed)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Create ECDSA Signing Key (if not exists)
# ─────────────────────────────────────────────────────────────────────────────

step "Creating HSM-backed ECDSA signing key: $EC_KEY..."
if gcloud kms keys describe "$EC_KEY" \
    --keyring="$KEY_RING" \
    --location="$LOCATION" \
    --project="$PROJECT_ID" &> /dev/null; then
  warn "ECDSA key already exists, skipping creation"
else
  gcloud kms keys create "$EC_KEY" \
    --keyring="$KEY_RING" \
    --location="$LOCATION" \
    --project="$PROJECT_ID" \
    --purpose=asymmetric-signing \
    --default-algorithm=ec-sign-p256-sha256 \
    --protection-level=hsm
  info "ECDSA key created (HSM-backed)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Get Public Keys
# ─────────────────────────────────────────────────────────────────────────────

step "Fetching public keys from KMS..."

gcloud kms keys versions get-public-key 1 \
  --key="$RSA_KEY" \
  --keyring="$KEY_RING" \
  --location="$LOCATION" \
  --project="$PROJECT_ID" \
  --output-file="$OUTPUT_DIR/rsa-public.pem"
info "RSA public key saved"

gcloud kms keys versions get-public-key 1 \
  --key="$EC_KEY" \
  --keyring="$KEY_RING" \
  --location="$LOCATION" \
  --project="$PROJECT_ID" \
  --output-file="$OUTPUT_DIR/ec-public.pem"
info "ECDSA public key saved"

# ─────────────────────────────────────────────────────────────────────────────
# Create PKCS#11 Configuration
# ─────────────────────────────────────────────────────────────────────────────

step "Creating PKCS#11 configuration..."

KEY_RING_RESOURCE="projects/$PROJECT_ID/locations/$LOCATION/keyRings/$KEY_RING"

cat > "$OUTPUT_DIR/pkcs11-config.yaml" << EOF
---
tokens:
  - key_ring: "$KEY_RING_RESOURCE"
    label: "libpdf-test"
EOF

# PKCS#11 library requires strict file permissions (no group/other write)
chmod 600 "$OUTPUT_DIR/pkcs11-config.yaml"

info "PKCS#11 config saved to $OUTPUT_DIR/pkcs11-config.yaml"

# Set environment variable for PKCS#11 library
export KMS_PKCS11_CONFIG="$OUTPUT_DIR/pkcs11-config.yaml"

# ─────────────────────────────────────────────────────────────────────────────
# Create OpenSSL PKCS#11 Engine Configuration
# ─────────────────────────────────────────────────────────────────────────────

step "Creating OpenSSL engine configuration..."

cat > "$OUTPUT_DIR/openssl-pkcs11.conf" << EOF
openssl_conf = openssl_init

[openssl_init]
engines = engine_section

[engine_section]
pkcs11 = pkcs11_section

[pkcs11_section]
engine_id = pkcs11
MODULE_PATH = $PKCS11_LIB
init = 0

[req]
distinguished_name = req_dn
x509_extensions = v3_req
prompt = no

[req_dn]
CN = libpdf-test
O = libpdf Test
C = US

[v3_req]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, nonRepudiation
extendedKeyUsage = codeSigning, emailProtection
subjectKeyIdentifier = hash
EOF

# ─────────────────────────────────────────────────────────────────────────────
# Create Self-Signed Certificates using PKCS#11 (HSM-signed)
# ─────────────────────────────────────────────────────────────────────────────

step "Creating self-signed RSA certificate (signed by HSM)..."

# PKCS#11 URI for the RSA key
RSA_PKCS11_URI="pkcs11:token=libpdf-test;object=$RSA_KEY"

# Create certificate config for RSA
cat > "$OUTPUT_DIR/rsa-cert.conf" << EOF
[req]
distinguished_name = req_dn
x509_extensions = v3_req
prompt = no

[req_dn]
CN = libpdf-test-rsa
O = libpdf Test
C = US

[v3_req]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, nonRepudiation
extendedKeyUsage = codeSigning, emailProtection
subjectKeyIdentifier = hash
EOF

# Generate self-signed certificate using PKCS#11 engine
# The private key never leaves the HSM - signing happens on the HSM
OPENSSL_CONF="$OUTPUT_DIR/openssl-pkcs11.conf" \
KMS_PKCS11_CONFIG="$OUTPUT_DIR/pkcs11-config.yaml" \
openssl req -new -x509 \
  -engine pkcs11 \
  -keyform engine \
  -key "$RSA_PKCS11_URI" \
  -out "$OUTPUT_DIR/rsa-cert.pem" \
  -sha256 \
  -days 365 \
  -config "$OUTPUT_DIR/rsa-cert.conf"

# Convert to DER
openssl x509 -in "$OUTPUT_DIR/rsa-cert.pem" -outform DER -out "$OUTPUT_DIR/rsa-cert.der"
info "RSA certificate created and signed by HSM"

step "Creating self-signed ECDSA certificate (signed by HSM)..."

# PKCS#11 URI for the EC key
EC_PKCS11_URI="pkcs11:token=libpdf-test;object=$EC_KEY"

# Create certificate config for EC
cat > "$OUTPUT_DIR/ec-cert.conf" << EOF
[req]
distinguished_name = req_dn
x509_extensions = v3_req
prompt = no

[req_dn]
CN = libpdf-test-ec
O = libpdf Test
C = US

[v3_req]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, nonRepudiation
extendedKeyUsage = codeSigning, emailProtection
subjectKeyIdentifier = hash
EOF

# Generate self-signed certificate using PKCS#11 engine
OPENSSL_CONF="$OUTPUT_DIR/openssl-pkcs11.conf" \
KMS_PKCS11_CONFIG="$OUTPUT_DIR/pkcs11-config.yaml" \
openssl req -new -x509 \
  -engine pkcs11 \
  -keyform engine \
  -key "$EC_PKCS11_URI" \
  -out "$OUTPUT_DIR/ec-cert.pem" \
  -sha256 \
  -days 365 \
  -config "$OUTPUT_DIR/ec-cert.conf"

# Convert to DER
openssl x509 -in "$OUTPUT_DIR/ec-cert.pem" -outform DER -out "$OUTPUT_DIR/ec-cert.der"
info "ECDSA certificate created and signed by HSM"

# ─────────────────────────────────────────────────────────────────────────────
# Verify Certificates
# ─────────────────────────────────────────────────────────────────────────────

step "Verifying certificates..."

# Extract public key from RSA cert and compare with KMS public key
RSA_CERT_PUBKEY=$(openssl x509 -in "$OUTPUT_DIR/rsa-cert.pem" -pubkey -noout | openssl pkey -pubin -outform PEM)
RSA_KMS_PUBKEY=$(cat "$OUTPUT_DIR/rsa-public.pem")

if [[ "$RSA_CERT_PUBKEY" == "$RSA_KMS_PUBKEY" ]]; then
  info "RSA certificate public key matches KMS key ✓"
else
  error "RSA certificate public key does NOT match KMS key!"
fi

# Extract public key from EC cert and compare with KMS public key
EC_CERT_PUBKEY=$(openssl x509 -in "$OUTPUT_DIR/ec-cert.pem" -pubkey -noout | openssl pkey -pubin -outform PEM)
EC_KMS_PUBKEY=$(cat "$OUTPUT_DIR/ec-public.pem")

if [[ "$EC_CERT_PUBKEY" == "$EC_KMS_PUBKEY" ]]; then
  info "ECDSA certificate public key matches KMS key ✓"
else
  error "ECDSA certificate public key does NOT match KMS key!"
fi

# Verify the certificate signatures (self-signed, so issuer = subject)
openssl verify -CAfile "$OUTPUT_DIR/rsa-cert.pem" "$OUTPUT_DIR/rsa-cert.pem" > /dev/null 2>&1 && \
  info "RSA certificate signature valid ✓" || \
  warn "RSA certificate signature verification failed"

openssl verify -CAfile "$OUTPUT_DIR/ec-cert.pem" "$OUTPUT_DIR/ec-cert.pem" > /dev/null 2>&1 && \
  info "ECDSA certificate signature valid ✓" || \
  warn "ECDSA certificate signature verification failed"

# ─────────────────────────────────────────────────────────────────────────────
# Cleanup temporary files
# ─────────────────────────────────────────────────────────────────────────────

rm -f "$OUTPUT_DIR/rsa-cert.conf" "$OUTPUT_DIR/ec-cert.conf"
rm -f "$OUTPUT_DIR/openssl-pkcs11.conf"

# ─────────────────────────────────────────────────────────────────────────────
# Build resource names
# ─────────────────────────────────────────────────────────────────────────────

RSA_KEY_VERSION="projects/$PROJECT_ID/locations/$LOCATION/keyRings/$KEY_RING/cryptoKeys/$RSA_KEY/cryptoKeyVersions/1"
EC_KEY_VERSION="projects/$PROJECT_ID/locations/$LOCATION/keyRings/$KEY_RING/cryptoKeys/$EC_KEY/cryptoKeyVersions/1"

# ─────────────────────────────────────────────────────────────────────────────
# Output Summary
# ─────────────────────────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo -e "${GREEN}Setup Complete!${NC}"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "HSM-backed keys created:"
echo "  - RSA: $RSA_KEY_VERSION"
echo "  - EC:  $EC_KEY_VERSION"
echo ""
echo "Created files:"
echo "  - $OUTPUT_DIR/rsa-public.pem      (RSA public key from KMS)"
echo "  - $OUTPUT_DIR/rsa-cert.pem        (RSA certificate, PEM)"
echo "  - $OUTPUT_DIR/rsa-cert.der        (RSA certificate, DER)"
echo "  - $OUTPUT_DIR/ec-public.pem       (EC public key from KMS)"
echo "  - $OUTPUT_DIR/ec-cert.pem         (EC certificate, PEM)"
echo "  - $OUTPUT_DIR/ec-cert.der         (EC certificate, DER)"
echo "  - $OUTPUT_DIR/pkcs11-config.yaml  (PKCS#11 configuration)"
echo ""
echo "To run integration tests, set these environment variables:"
echo ""
echo -e "${YELLOW}export TEST_KMS_RSA_KEY=\"$RSA_KEY_VERSION\"${NC}"
echo -e "${YELLOW}export TEST_KMS_EC_KEY=\"$EC_KEY_VERSION\"${NC}"
echo -e "${YELLOW}export TEST_KMS_RSA_CERT=\"$OUTPUT_DIR/rsa-cert.der\"${NC}"
echo -e "${YELLOW}export TEST_KMS_EC_CERT=\"$OUTPUT_DIR/ec-cert.der\"${NC}"
echo ""
echo "Or copy this one-liner:"
echo ""
echo -e "${BLUE}export TEST_KMS_RSA_KEY=\"$RSA_KEY_VERSION\" TEST_KMS_EC_KEY=\"$EC_KEY_VERSION\" TEST_KMS_RSA_CERT=\"$OUTPUT_DIR/rsa-cert.der\" TEST_KMS_EC_CERT=\"$OUTPUT_DIR/ec-cert.der\"${NC}"
echo ""
echo "Then run tests:"
echo -e "  ${GREEN}bun run test:run -- google-kms${NC}"
echo ""
