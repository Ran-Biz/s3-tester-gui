# 🪣 S3 Compatibility Tester

A web-based tool to test any S3-compatible API — AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces, Backblaze B2, and more.

Test credentials, list/create/delete buckets, browse folders, upload/download files, generate presigned URLs, and inspect file contents — all from a clean web UI.

## Features

- **Connection management** — Save multiple S3 connections, test them live, with quick presets for AWS/MinIO/R2/DO/B2
- **Bucket operations** — List, create, delete (with force-empty), head/existence check, get location
- **Object operations** — Browse folders (common prefixes), upload (simple + multipart/large), download, preview (text & images), delete single & bulk
- **Folder creation** — Create folder markers in buckets
- **Presigned URLs** — Generate GET/PUT presigned URLs with custom expiry
- **Flexible auth** — Access key, secret key, optional session token, custom endpoint, path-style addressing
- **Error surfacing** — Real S3 error codes/messages shown in the UI

## Project Structure

```
s3-tester/
├── package.json           # Root scripts (runs both server + client)
├── docker-compose.yml     # Optional: local MinIO for testing
├── server/                # Express backend
│   ├── index.js           # Server entry, connection store
│   ├── routes.js          # All S3 API routes
│   ├── s3-client.js       # AWS SDK client factory
│   └── package.json
└── client/                # React + Vite + TypeScript frontend
    ├── index.html
    ├── vite.config.ts     # Proxies /api → localhost:3001
    └── src/
        ├── App.tsx
        ├── api.ts          # Typed API client
        ├── types.ts
        ├── styles.css
        └── components/
            ├── ConnectionForm.tsx
            ├── ConnectionList.tsx
            └── BucketExplorer.tsx
```

## Getting Started

```bash
# Install everything (root + server + client)
npm run install:all

# Run both server (3001) and client (5173)
npm run dev
```

Then open **http://localhost:5173**

### Running separately

```bash
npm run server   # backend only  → http://localhost:3001
npm run client   # frontend only → http://localhost:5173
```

## Using it

1. Pick a **preset** (or fill in manually):
   - **AWS S3** — leave endpoint empty, path style off, region `us-east-1`
   - **MinIO** — endpoint `http://localhost:9000`, path style on
   - **Cloudflare R2** — endpoint `https://<account-id>.r2.cloudflarestorage.com`, region `auto`
   - **DigitalOcean Spaces** — endpoint `https://<region>.digitaloceanspaces.com`
2. Enter **Access Key ID** and **Secret Access Key** (and session token if using temporary credentials)
3. Click **Connect & Test** — it validates credentials by listing buckets
4. Use the **bucket explorer** to browse, upload, download, presign, and delete

## Testing locally with MinIO

A `docker-compose.yml` is included for spinning up MinIO:

```bash
docker compose up -d
```

- Console: http://localhost:9001 (login: `minioadmin` / `minioadmin`)
- S3 API: http://localhost:9000

Then connect with endpoint `http://localhost:9000`, region `us-east-1`, path style ON, and the `minioadmin` credentials.

## API Endpoints (backend)

All routes are prefixed with `/api`.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/connect` | Create + verify a connection |
| GET | `/connections` | List saved connections |
| DELETE | `/connections/:id` | Remove a connection |
| POST | `/connections/:id/test` | Re-test connection |
| GET | `/buckets/:connectionId` | List buckets |
| POST | `/buckets/:connectionId` | Create bucket |
| DELETE | `/buckets/:connectionId/:bucketName` | Delete bucket (`?force=true` to empty first) |
| HEAD | `/buckets/:connectionId/:bucketName` | Check bucket exists |
| GET | `/buckets/:connectionId/:bucketName/location` | Get bucket region |
| GET | `/objects/:connectionId/:bucketName` | List objects (`?prefix=`) |
| HEAD | `/objects/:connectionId/:bucketName/*` | Object metadata |
| GET | `/objects/:connectionId/:bucketName/download` | Download object (`?key=`) |
| POST | `/objects/:connectionId/:bucketName/presign` | Generate presigned URL |
| POST | `/objects/:connectionId/:bucketName/upload` | Upload file (multipart form) |
| POST | `/objects/:connectionId/:bucketName/upload-large` | Multipart upload |
| POST | `/objects/:connectionId/:bucketName/folder` | Create folder |
| DELETE | `/objects/:connectionId/:bucketName/delete` | Delete object (`?key=`) |
| POST | `/objects/:connectionId/:bucketName/delete-multiple` | Bulk delete |

## Notes

- Connections are stored **in memory** on the server only — credentials are never written to disk.
- Restarting the backend clears all connections.
- This tool is intended for **testing and debugging** S3 APIs from your own machine.

## Security

Credentials pass through the local backend to the AWS SDK. Only run this on a trusted machine/network. Do not expose the backend publicly.
