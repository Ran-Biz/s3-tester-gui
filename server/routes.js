const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { S3Client, ListBucketsCommand, CreateBucketCommand, DeleteBucketCommand, ListObjectsV2Command, DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, HeadBucketCommand, GetBucketLocationCommand, GetBucketAclCommand, PutBucketAclCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { createS3Client, splitEndpointAndBucket } = require("./s3-client");
const stream = require("stream");

const router = express.Router();

// Helper to get client from stored connection
function getClient(req, connectionId) {
  const conn = req.connections.get(connectionId);
  if (!conn) throw new Error("Connection not found");
  return conn.client;
}

function getConn(req, connectionId) {
  const conn = req.connections.get(connectionId);
  if (!conn) throw new Error("Connection not found");
  return conn;
}

// Verify a single bucket is reachable (for R2 tokens scoped to one bucket
// where ListBuckets returns empty or AccessDenied).
async function verifyBucket(client, bucketName) {
  await client.send(new HeadBucketCommand({ Bucket: bucketName }));
}

// List buckets, merging in the hinted single bucket when ListBuckets
// comes back empty (common for R2 single-bucket API tokens).
async function listBucketsWithFallback(client, bucketHint) {
  let buckets = [];
  let listError = null;
  try {
    const result = await client.send(new ListBucketsCommand({}));
    buckets = result.Buckets?.map((b) => ({ name: b.Name, created: b.CreationDate })) || [];
  } catch (err) {
    listError = err;
  }

  let defaultBucket = "";
  if (bucketHint) {
    const alreadyListed = buckets.some((b) => b.name === bucketHint);
    if (!alreadyListed) {
      try {
        await verifyBucket(client, bucketHint);
        buckets = [{ name: bucketHint }, ...buckets];
        defaultBucket = bucketHint;
      } catch (verifyErr) {
        // If listing also failed, surface the more useful error.
        if (buckets.length === 0 && listError) throw listError;
        // Otherwise keep whatever ListBuckets returned; the hint is
        // unreachable (wrong name or no permission).
        if (buckets.length === 0) throw verifyErr;
      }
    } else {
      defaultBucket = bucketHint;
    }
  } else if (buckets.length === 0 && listError) {
    throw listError;
  }

  // If listing succeeded but is empty and there is no hint, that's a valid
  // (empty) account — not an error.
  if (!defaultBucket && buckets.length === 1 && bucketHint) defaultBucket = bucketHint;
  return { buckets, defaultBucket };
}

function validateEndpoint(rawEndpoint) {
  const trimmed = (rawEndpoint || "").trim();
  if (!trimmed) return ""; // empty = AWS S3, always valid
  let withScheme = trimmed;
  if (!/^https?:\/\//i.test(withScheme)) withScheme = `https://${withScheme}`;
  let url;
  try {
    url = new URL(withScheme);
  } catch {
    const err = new Error(
      "Endpoint doesn't look like a valid URL. Use the base endpoint (e.g. https://<account>.r2.cloudflarestorage.com) — a trailing /bucket-name is stripped automatically."
    );
    err.statusCode = 400;
    throw err;
  }
  if (!/^https?:$/.test(url.protocol)) {
    const err = new Error(
      "Endpoint doesn't look like a valid URL. Use the base endpoint (e.g. https://<account>.r2.cloudflarestorage.com) — a trailing /bucket-name is stripped automatically."
    );
    err.statusCode = 400;
    throw err;
  }
  const host = url.hostname;
  const isLocalhost = host === "localhost" || host === "127.0.0.1" || host === "::1";
  const isIP = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":");
  if (!isLocalhost && !isIP && !host.includes(".")) {
    const err = new Error(
      "Endpoint doesn't look like a valid URL. Use the base endpoint (e.g. https://<account>.r2.cloudflarestorage.com) — a trailing /bucket-name is stripped automatically."
    );
    err.statusCode = 400;
    throw err;
  }
  return withScheme.replace(/\/+$/, "");
}

// ==================== CONNECTION MANAGEMENT ====================

// Test & save a connection
router.post("/connect", async (req, res) => {
  try {
    const rawEndpoint = req.body.endpoint || "";
    const explicitBucket = (req.body.bucketName || req.body.bucket || "").trim();

    if (!req.body.accessKeyId || !req.body.secretAccessKey) {
      return res.status(400).json({ error: "Access Key ID and Secret Access Key are required" });
    }

    // Allow pasting "https://<account>.r2.cloudflarestorage.com/my-bucket":
    // strip the bucket segment for signing, keep it as a hint.
    const { endpoint: endpointBase, bucketFromPath } = splitEndpointAndBucket(rawEndpoint, explicitBucket);
    let endpoint = "";
    try {
      endpoint = endpointBase ? validateEndpoint(endpointBase) : "";
    } catch (validationErr) {
      return res.status(validationErr.statusCode || 400).json({ error: validationErr.message });
    }
    const bucketName = bucketFromPath;

    const config = {
      name: req.body.name || bucketName || endpoint || "Unnamed",
      endpoint,
      region: req.body.region || "us-east-1",
      accessKeyId: req.body.accessKeyId,
      secretAccessKey: req.body.secretAccessKey,
      sessionToken: req.body.sessionToken || "",
      forcePathStyle: req.body.forcePathStyle !== false,
      checksumMode: req.body.checksumMode || "compatible",
      bucketName,
    };

    const client = createS3Client(config);
    const id = uuidv4();

    // Verify connection: ListBuckets, falling back to HeadBucket on the
    // hinted bucket (R2 single-bucket tokens can't list).
    let buckets = [];
    let defaultBucket = "";
    try {
      ({ buckets, defaultBucket } = await listBucketsWithFallback(client, bucketName));
    } catch (err) {
      return res.status(500).json({ error: err.message, code: err.Code || err.name });
    }

    req.connections.set(id, { config, client, createdAt: new Date().toISOString(), defaultBucket });

    res.json({
      id,
      name: config.name,
      endpoint: config.endpoint,
      region: config.region,
      buckets: buckets.map((b) => b.name),
      bucketCount: buckets.length,
      defaultBucket,
      bucketName,
    });
  } catch (err) {
    res.status(500).json({ error: err.message, code: err.Code || err.name });
  }
});

// List saved connections
router.get("/connections", (req, res) => {
  const list = [];
  for (const [id, conn] of req.connections) {
    list.push({
      id,
      name: conn.config.name,
      endpoint: conn.config.endpoint,
      region: conn.config.region,
      bucketName: conn.config.bucketName || "",
      defaultBucket: conn.defaultBucket || "",
      createdAt: conn.createdAt,
    });
  }
  res.json(list);
});

// Remove a connection
router.delete("/connections/:id", (req, res) => {
  const deleted = req.connections.delete(req.params.id);
  res.json({ removed: deleted });
});

// Re-test connection
router.post("/connections/:id/test", async (req, res) => {
  try {
    const conn = req.connections.get(req.params.id);
    if (!conn) return res.status(404).json({ error: "Connection not found" });

    const { buckets, defaultBucket } = await listBucketsWithFallback(
      conn.client,
      conn.config.bucketName || conn.defaultBucket || ""
    );
    conn.defaultBucket = defaultBucket || conn.defaultBucket;

    res.json({
      id: req.params.id,
      buckets: buckets.map((b) => b.name),
      bucketCount: buckets.length,
      defaultBucket: conn.defaultBucket || "",
    });
  } catch (err) {
    res.status(500).json({ error: err.message, code: err.Code || err.name });
  }
});

// ==================== BUCKET OPERATIONS ====================

// List buckets
router.get("/buckets/:connectionId", async (req, res) => {
  try {
    const conn = getConn(req, req.params.connectionId);
    const { buckets, defaultBucket } = await listBucketsWithFallback(
      conn.client,
      conn.config.bucketName || conn.defaultBucket || ""
    );
    if (defaultBucket) conn.defaultBucket = defaultBucket;
    res.json({
      buckets,
      defaultBucket: conn.defaultBucket || "",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create bucket
router.post("/buckets/:connectionId", async (req, res) => {
  try {
    const client = getClient(req, req.params.connectionId);
    const input = { Bucket: req.body.bucketName };

    // For non-default regions, specify location constraint
    const conn = req.connections.get(req.params.connectionId);
    if (conn.config.region && conn.config.region !== "us-east-1") {
      input.CreateBucketConfiguration = { LocationConstraint: conn.config.region };
    }

    await client.send(new CreateBucketCommand(input));
    res.json({ success: true, message: `Bucket "${req.body.bucketName}" created` });
  } catch (err) {
    res.status(500).json({ error: err.message, code: err.Code || err.name });
  }
});

// Delete bucket
router.delete("/buckets/:connectionId/:bucketName", async (req, res) => {
  try {
    const client = getClient(req, req.params.connectionId);

    // First check if bucket is empty
    let isEmpty = true;
    try {
      const objects = await client.send(new ListObjectsV2Command({ Bucket: req.params.bucketName, MaxKeys: 1 }));
      if (objects.Contents && objects.Contents.length > 0) isEmpty = false;
    } catch (e) {
      // ignore - let delete handle it
    }

    if (!isEmpty && req.query.force !== "true") {
      return res.status(409).json({ error: "Bucket is not empty", code: "BucketNotEmpty" });
    }

    // If force, delete all objects first
    if (!isEmpty && req.query.force === "true") {
      await emptyBucket(client, req.params.bucketName);
    }

    await client.send(new DeleteBucketCommand({ Bucket: req.params.bucketName }));
    res.json({ success: true, message: `Bucket "${req.params.bucketName}" deleted` });
  } catch (err) {
    res.status(500).json({ error: err.message, code: err.Code || err.name });
  }
});

// Head bucket (check existence / permissions)
router.head("/buckets/:connectionId/:bucketName", async (req, res) => {
  try {
    const client = getClient(req, req.params.connectionId);
    await client.send(new HeadBucketCommand({ Bucket: req.params.bucketName }));
    res.json({ exists: true });
  } catch (err) {
    res.status(404).json({ exists: false, error: err.message });
  }
});

// Get bucket location
router.get("/buckets/:connectionId/:bucketName/location", async (req, res) => {
  try {
    const client = getClient(req, req.params.connectionId);
    const result = await client.send(new GetBucketLocationCommand({ Bucket: req.params.bucketName }));
    res.json({ location: result.LocationConstraint || "us-east-1" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== OBJECT OPERATIONS ====================

// List objects in a bucket
router.get("/objects/:connectionId/:bucketName", async (req, res) => {
  try {
    const client = getClient(req, req.params.connectionId);
    const prefix = req.query.prefix || "";
    const delimiter = req.query.delimiter || "/";
    const maxKeys = parseInt(req.query.maxKeys) || 1000;

    const input = {
      Bucket: req.params.bucketName,
      MaxKeys: maxKeys,
      Delimiter: delimiter,
    };
    if (prefix) input.Prefix = prefix;

    const result = await client.send(new ListObjectsV2Command(input));

    const items = [];
    // Folders (common prefixes)
    if (result.CommonPrefixes) {
      for (const cp of result.CommonPrefixes) {
        items.push({ key: cp.Prefix, type: "folder", size: 0, lastModified: null });
      }
    }
    // Files
    if (result.Contents) {
      for (const obj of result.Contents) {
        if (obj.Key === prefix) continue; // skip the prefix itself
        items.push({
          key: obj.Key,
          type: "file",
          size: obj.Size,
          lastModified: obj.LastModified,
          etag: obj.ETag,
          storageClass: obj.StorageClass,
        });
      }
    }

    res.json({
      items,
      prefix,
      delimiter,
      isTruncated: result.IsTruncated,
      nextContinuationToken: result.NextContinuationToken,
      keyCount: result.KeyCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message, code: err.Code || err.name });
  }
});

// Head object (metadata)
router.head("/objects/:connectionId/:bucketName/*", async (req, res) => {
  try {
    const client = getClient(req, req.params.connectionId);
    const key = req.params[0];
    const result = await client.send(new HeadObjectCommand({ Bucket: req.params.bucketName, Key: key }));
    res.json({
      key,
      size: result.ContentLength,
      lastModified: result.LastModified,
      etag: result.ETag,
      contentType: result.ContentType,
      metadata: result.Metadata || {},
      storageClass: result.StorageClass,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download an object (returns content as base64)
router.get("/objects/:connectionId/:bucketName/download", async (req, res) => {
  try {
    const client = getClient(req, req.params.connectionId);
    const key = req.query.key;
    if (!key) return res.status(400).json({ error: "Missing key query param" });

    const result = await client.send(new GetObjectCommand({ Bucket: req.params.bucketName, Key: key }));
    const chunks = [];
    for await (const chunk of result.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    res.json({
      key,
      size: buffer.length,
      contentType: result.ContentType,
      data: buffer.toString("base64"),
      isText: result.ContentType ? result.ContentType.startsWith("text") || result.ContentType.includes("json") || result.ContentType.includes("xml") : false,
      textContent: result.ContentType && (result.ContentType.startsWith("text") || result.ContentType.includes("json") || result.ContentType.includes("xml"))
        ? buffer.toString("utf-8")
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate a presigned URL
router.post("/objects/:connectionId/:bucketName/presign", async (req, res) => {
  try {
    const client = getClient(req, req.params.connectionId);
    const key = req.body.key;
    const action = req.body.action || "getObject";
    const expiresIn = parseInt(req.body.expiresIn) || 3600;

    let command;
    if (action === "getObject") {
      command = new GetObjectCommand({ Bucket: req.params.bucketName, Key: key });
    } else if (action === "putObject") {
      command = new PutObjectCommand({ Bucket: req.params.bucketName, Key: key });
    } else {
      return res.status(400).json({ error: "Invalid action. Use getObject or putObject" });
    }

    const url = await getSignedUrl(client, command, { expiresIn });
    res.json({ url, action, expiresIn });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload a file
router.post("/objects/:connectionId/:bucketName/upload", (req, res, next) => {
  // Use multer
  req.upload.single("file")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });

    try {
      const client = getClient(req, req.params.connectionId);
      const prefix = req.body.prefix || "";
      const key = prefix ? `${prefix.replace(/\/+$/, "")}/${req.file.originalname}` : req.file.originalname;

      await client.send(new PutObjectCommand({
        Bucket: req.params.bucketName,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      }));

      res.json({ success: true, key, size: req.file.size });
    } catch (err) {
      res.status(500).json({ error: err.message, code: err.Code || err.name });
    }
  });
});

// Upload a large file (multipart via @aws-sdk/lib-storage)
router.post("/objects/:connectionId/:bucketName/upload-large", (req, res, next) => {
  req.upload.single("file")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });

    try {
      const client = getClient(req, req.params.connectionId);
      const prefix = req.body.prefix || "";
      const key = prefix ? `${prefix.replace(/\/+$/, "")}/${req.file.originalname}` : req.file.originalname;

      const upload = new Upload({
        client,
        params: {
          Bucket: req.params.bucketName,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        },
        partSize: 5 * 1024 * 1024, // 5MB parts
      });

      upload.on("httpUploadProgress", (progress) => {
        console.log(`Upload progress: ${progress.loaded}/${progress.total}`);
      });

      await upload.done();
      res.json({ success: true, key, size: req.file.size });
    } catch (err) {
      res.status(500).json({ error: err.message, code: err.Code || err.name });
    }
  });
});

// Create a folder (empty object with trailing slash)
router.post("/objects/:connectionId/:bucketName/folder", async (req, res) => {
  try {
    const client = getClient(req, req.params.connectionId);
    const prefix = req.body.prefix || "";
    const folderName = req.body.folderName;
    if (!folderName) return res.status(400).json({ error: "folderName is required" });

    const key = prefix ? `${prefix.replace(/\/+$/, "")}/${folderName}/` : `${folderName}/`;

    await client.send(new PutObjectCommand({
      Bucket: req.params.bucketName,
      Key: key,
      Body: "",
    }));

    res.json({ success: true, key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a single object
router.delete("/objects/:connectionId/:bucketName/delete", async (req, res) => {
  try {
    const client = getClient(req, req.params.connectionId);
    const key = req.query.key;
    if (!key) return res.status(400).json({ error: "Missing key query param" });

    await client.send(new DeleteObjectCommand({ Bucket: req.params.bucketName, Key: key }));
    res.json({ success: true, key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete multiple objects
router.post("/objects/:connectionId/:bucketName/delete-multiple", async (req, res) => {
  try {
    const client = getClient(req, req.params.connectionId);
    const keys = req.body.keys;
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: "keys array is required" });
    }

    const result = await client.send(new DeleteObjectsCommand({
      Bucket: req.params.bucketName,
      Delete: { Objects: keys.map((k) => ({ Key: k })), Quiet: false },
    }));

    res.json({
      deleted: result.Deleted?.map((d) => d.Key) || [],
      errors: result.Errors?.map((e) => ({ key: e.Key, error: e.Message })) || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== UTILS ====================

async function emptyBucket(client, bucketName) {
  let continuationToken;
  do {
    const input = { Bucket: bucketName, MaxKeys: 1000 };
    if (continuationToken) input.ContinuationToken = continuationToken;

    const result = await client.send(new ListObjectsV2Command(input));

    if (result.Contents && result.Contents.length > 0) {
      await client.send(new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: { Objects: result.Contents.map((o) => ({ Key: o.Key })) },
      }));
    }

    continuationToken = result.NextContinuationToken;
  } while (continuationToken);
}

module.exports = router;