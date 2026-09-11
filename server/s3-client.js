const { S3Client } = require("@aws-sdk/client-s3");

/**
 * Create an S3 client from connection config.
 * Supports both AWS and S3-compatible services (MinIO, DigitalOcean, Cloudflare R2, etc.)
 */
function createS3Client(config) {
  const clientConfig = {
    region: config.region || "us-east-1",
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: config.forcePathStyle !== false, // default true for S3-compatible
  };

  if (config.endpoint) {
    clientConfig.endpoint = config.endpoint;
  }

  if (config.sessionToken) {
    clientConfig.credentials.sessionToken = config.sessionToken;
  }

  // ===== S3-compatible service compatibility =====
  // Since AWS SDK v3.729.0 the SDK adds flexible-checksum headers
  // (x-amz-checksum-crc32, x-amz-sdk-checksum-algorithm) to uploads by default.
  // Many non-AWS S3 implementations reject these with:
  //   NotImplemented: "This x-amz header is not supported."
  // Default to "WHEN_REQUIRED" for maximum compatibility; users can opt in to
  // full checksum behavior for AWS S3 via the connection form.
  const checksumMode = config.checksumMode === "supported" ? "WHEN_SUPPORTED" : "WHEN_REQUIRED";
  clientConfig.requestChecksumCalculation = checksumMode;
  clientConfig.responseChecksumValidation = checksumMode;

  return new S3Client(clientConfig);
}

module.exports = { createS3Client };