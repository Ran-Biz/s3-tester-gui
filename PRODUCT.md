# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary:** General-purpose S3 power users — developers, DevOps engineers, and anyone who needs a quick, reliable GUI for any S3-compatible object store. They reach for it when they need to verify credentials, browse buckets, upload test files, generate presigned URLs, or inspect objects — without installing a desktop client or learning a provider-specific console.

## Product Purpose

A universal S3 compatibility tester and object browser. One web tool that connects identically to AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces, Backblaze B2, and any other S3-compatible API. Success means the user goes from zero to browsing buckets in under 30 seconds and trusts the tool to surface real S3 errors honestly.

## Positioning

The only S3 GUI that treats every provider as a first-class citizen. No other tool combines: (1) one-click presets for five major S3 providers, (2) zero-install web access, (3) first-class error surfacing with real S3 error codes, and (4) presigned URL generation and bulk operations built for testing workflows. The AWS Console only speaks AWS; Cyberduck requires installation; s3cmd is a CLI. This tool is the browser tab you open when you need to know what's actually in that bucket — regardless of who hosts it.

## Operating Context

- **Workflows:** Credential validation, bucket inspection, test file upload/download, presigned URL generation, bulk cleanup, folder structure browsing.
- **Environments:** Local development (MinIO via Docker), staging (R2/DO Spaces), production verification (AWS S3).
- **Frequency:** Bursty — heavy use during integration testing and debugging, idle otherwise.
- **No persistence:** All connections live in server memory only. Closing the server discards everything. This is by design — no credentials are ever written to disk.

## Capabilities and Constraints

**Capabilities:**
- Connect to any S3-compatible endpoint with access key, secret key, and optional session token
- Provider presets: AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces, Backblaze B2
- Bucket operations: list, create, delete (with force-empty), head check, get location
- Object operations: browse by prefix (folder navigation), upload (including large files), download, text/image preview, delete single and bulk
- Folder creation (zero-byte prefix markers)
- Presigned URL generation (GET and PUT) with configurable expiry
- Checksum compatibility toggle for non-AWS providers that reject flexible checksums

**Constraints:**
- In-memory connection store only — no database, no file persistence
- Backend: Express (CommonJS), AWS SDK v3, multer for uploads
- Frontend: React + Vite + TypeScript, proxies /api to backend
- `forcePathStyle` defaults to true for S3-compatible services
- Non-AWS providers may not support all S3 operations

**Terminology:** Connections, buckets, objects, prefixes (folders), presigned URLs, checksum compatibility.

## Brand Commitments

- **Name:** S3 Compatibility Tester (or "S3 Tester" for short)
- **Icon:** 🪣 (bucket emoji) — already the favicon and header logo
- No other binding brand assets or identity commitments exist.

## Evidence on Hand

- Working codebase: React + Vite frontend, Express backend with AWS SDK v3
- README with documented provider presets and API endpoints
- Docker Compose for local MinIO testing
- No customer testimonials, case studies, or press exist. No fabricated claims should be introduced.

## Product Principles

1. **Universal by default.** Every feature works against every provider. Provider-specific behavior is an opt-in toggle, never a silent assumption.
2. **Honest about errors.** Real S3 error codes and messages are surfaced verbatim. The tool never hides or paraphrases what the API returned.
3. **Fast to first bucket.** From browser tab to browsing objects in under 30 seconds. Presets and sensible defaults eliminate configuration friction.
4. **Ephemeral and safe.** No credentials are persisted. Closing the server means everything is gone. This is a feature, not a limitation.
5. **Power where it counts.** Bulk delete, presigned URLs, large file uploads — the operations that turn a browser into a real testing tool are first-class.

## Accessibility & Inclusion

- Web-based: accessible on any platform with a modern browser.
- No specific accessibility standard has been established. The redesign should follow WCAG 2.1 AA as a baseline.