#!/bin/bash
#
# Generate test certificates for digital signature tests.
#
# This script creates P12 files with different encryption formats
# to test compatibility with various certificate sources.
#
# Usage: ./scripts/generate-fixture-certs.sh
#
# All certificates use password: test123
#
# Supported formats:
#   - AES-256-CBC (modern default, via pkijs/Web Crypto)
#   - AES-128-CBC (via pkijs/Web Crypto)
#   - Triple DES (pbeWithSHA1And3-KeyTripleDES-CBC, via custom crypto engine)
#   - Legacy RC2 (pbeWithSHA1And40BitRC2-CBC, via custom crypto engine)
#

set -e

SCRIPT_DIR="$(readlink -f "$(dirname "$0")")"

CERT_DIR="$SCRIPT_DIR/../fixtures/certificates"
TEMP_DIR="$CERT_DIR/tmp"

mkdir -p "$CERT_DIR"
mkdir -p "$TEMP_DIR"

echo "Generating test certificates in $CERT_DIR"

# Generate a fresh RSA key and self-signed certificate
echo "Creating RSA key and certificate..."
openssl req -x509 -newkey rsa:2048 -keyout "$TEMP_DIR/key.pem" -out "$TEMP_DIR/cert.pem" -days 365 -nodes \
  -subj "/CN=Test Signer/O=Test Organization" 2>/dev/null

PASSWORD="test123"

# Generate ECDSA keys and certificates
echo "Creating ECDSA P-256 key and certificate..."
openssl ecparam -name prime256v1 -genkey -noout -out "$TEMP_DIR/ec-key-p256.pem" 2>/dev/null
openssl req -x509 -new -key "$TEMP_DIR/ec-key-p256.pem" -out "$TEMP_DIR/ec-cert-p256.pem" -days 365 \
  -subj "/CN=Test ECDSA Signer P256/O=Test Organization" 2>/dev/null

echo "Creating ECDSA P-384 key and certificate..."
openssl ecparam -name secp384r1 -genkey -noout -out "$TEMP_DIR/ec-key-p384.pem" 2>/dev/null
openssl req -x509 -new -key "$TEMP_DIR/ec-key-p384.pem" -out "$TEMP_DIR/ec-cert-p384.pem" -days 365 \
  -subj "/CN=Test ECDSA Signer P384/O=Test Organization" 2>/dev/null

# 1. Modern format with AES-256-CBC (default for modern OpenSSL)
echo "Creating test-signer-aes256.p12 (AES-256-CBC)..."
openssl pkcs12 -export -out "$CERT_DIR/test-signer-aes256.p12" -inkey "$TEMP_DIR/key.pem" -in "$TEMP_DIR/cert.pem" \
  -passout pass:$PASSWORD -certpbe AES-256-CBC -keypbe AES-256-CBC

# 2. AES-128-CBC format
echo "Creating test-signer-aes128.p12 (AES-128-CBC)..."
openssl pkcs12 -export -out "$CERT_DIR/test-signer-aes128.p12" -inkey "$TEMP_DIR/key.pem" -in "$TEMP_DIR/cert.pem" \
  -passout pass:$PASSWORD -certpbe AES-128-CBC -keypbe AES-128-CBC

# 3. Triple DES format (common legacy format, still widely supported)
echo "Creating test-signer-3des.p12 (3DES)..."
openssl pkcs12 -export -out "$CERT_DIR/test-signer-3des.p12" -inkey "$TEMP_DIR/key.pem" -in "$TEMP_DIR/cert.pem" \
  -passout pass:$PASSWORD -legacy -certpbe PBE-SHA1-3DES -keypbe PBE-SHA1-3DES 2>/dev/null

if [[ $? -ne 0 ]]; then
openssl pkcs12 -export -out "$CERT_DIR/test-signer-3des.p12" -inkey "$TEMP_DIR/key.pem" -in "$TEMP_DIR/cert.pem" \
  -passout pass:$PASSWORD -descert 2>/dev/null
fi

if [[ $? -ne 0 ]]; then
  echo "  Warning: 3DES format not supported on this OpenSSL version"
fi

# 4. Legacy RC2 format (very old, may not be supported)
echo "Creating test-signer-rc2-40.p12 (Legacy RC2-40)..."
openssl pkcs12 -export -out "$CERT_DIR/test-signer-rc2-40.p12" -inkey "$TEMP_DIR/key.pem" -in "$TEMP_DIR/cert.pem" \
  -passout pass:$PASSWORD -legacy -certpbe PBE-SHA1-RC2-40 -keypbe PBE-SHA1-3DES 2>/dev/null

if [[ $? -ne 0 ]]; then
  echo "  Warning: Legacy format not supported on this OpenSSL version"
fi

# 5. ECDSA P-256 certificate
echo "Creating test-signer-ec-p256-aes256.p12 (ECDSA P-256, AES-256-CBC)..."
openssl pkcs12 -export -out "$CERT_DIR/test-signer-ec-p256-aes256.p12" -inkey "$TEMP_DIR/ec-key-p256.pem" -in "$TEMP_DIR/ec-cert-p256.pem" \
  -passout pass:$PASSWORD -certpbe AES-256-CBC -keypbe AES-256-CBC

# 6. ECDSA P-384 certificate
echo "Creating test-signer-ec-p384-aes256.p12 (ECDSA P-384, AES-256-CBC)..."
openssl pkcs12 -export -out "$CERT_DIR/test-signer-ec-p384-aes256.p12" -inkey "$TEMP_DIR/ec-key-p384.pem" -in "$TEMP_DIR/ec-cert-p384.pem" \
  -passout pass:$PASSWORD -certpbe AES-256-CBC -keypbe AES-256-CBC

# Clean up temporary files
rm -rf "$TEMP_DIR"

echo ""
echo "Generated certificates:"

ls -la "$CERT_DIR"/*.p12

echo ""
echo "Certificate details:"

for cert in "$CERT_DIR"/*.p12; do
  echo ""
  echo "=== $(basename "$cert") ==="
  
  openssl pkcs12 -info -in "$cert" -passin pass:$PASSWORD -legacy -noout 2>&1 | head -5
done

echo ""
echo "Done! All certificates use password: $PASSWORD"
