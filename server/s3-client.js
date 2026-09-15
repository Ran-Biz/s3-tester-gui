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

/**
 * Split a user-supplied endpoint that may include a bucket path segment
 * (e.g. "https://<account>.r2.cloudflarestorage.com/my-bucket") into a clean
 * base endpoint plus a bucket hint. R2 users often paste the bucket URL
 * directly, which breaks signing/listing if used verbatim.
 *
 * Returns { endpoint, bucketFromPath }.
 */
function splitEndpointAndBucket(rawEndpoint, explicitBucket) {
  const explicit = (explicitBucket || "").trim();
  let endpoint = (rawEndpoint || "").trim().replace(/\/+$/, "");
  if (!endpoint) return { endpoint: "", bucketFromPath: explicit };

  let withScheme = endpoint;
  if (!/^https?:\/\//i.test(withScheme)) withScheme = `https://${withScheme}`;

  let url;
  try {
    url = new URL(withScheme);
  } catch {
    // Not a parseable URL — leave as-is, validation happens later.
    return { endpoint, bucketFromPath: explicit };
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length === 0) {
    return { endpoint: url.origin, bucketFromPath: explicit };
  }

  // Endpoint has a path — treat the last segment as the bucket name
  // (covers "r2url/mybuck" and deeper custom-domain paths).
  const fromPath = decodeURIComponent(parts[parts.length - 1]);
  return { endpoint: url.origin, bucketFromPath: explicit || fromPath };
}

module.exports = { createS3Client, splitEndpointAndBucket };