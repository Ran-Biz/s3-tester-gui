export interface S3Error {
  error: string;
  code?: string;
}

export interface Connection {
  id: string;
  name: string;
  endpoint: string;
  region: string;
  buckets: string[];
  bucketCount: number;
  defaultBucket?: string;
  bucketName?: string;
}

export interface BucketInfo {
  name: string;
  created?: string;
}

export interface S3Object {
  key: string;
  type: "file" | "folder";
  size: number;
  lastModified: string | null;
  etag?: string;
  storageClass?: string;
}

export interface ObjectListResponse {
  items: S3Object[];
  prefix: string;
  delimiter: string;
  isTruncated: boolean;
  nextContinuationToken?: string;
  keyCount?: number;
}

export interface DownloadResult {
  key: string;
  size: number;
  contentType: string;
  data: string;
  isText: boolean;
  textContent: string | null;
}

export interface PresignResult {
  url: string;
  action: string;
  expiresIn: number;
}

export interface ObjectHead {
  key: string;
  size: number;
  lastModified: string;
  etag: string;
  contentType: string;
  metadata: Record<string, string>;
  storageClass?: string;
}