import type { Connection, BucketInfo, ObjectListResponse, DownloadResult, PresignResult, ObjectHead } from "./types";

const BASE = "/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data as T;
}

export const api = {
  // Connection
  connect: (config: {
    name: string;
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    forcePathStyle: boolean;
    checksumMode?: string;
    bucketName?: string;
  }) => request<Connection>("/connect", { method: "POST", body: JSON.stringify(config) }),

  disconnect: (id: string) => request<{ removed: boolean }>(`/connections/${id}`, { method: "DELETE" }),

  testConnection: (id: string) =>
    request<{ id: string; buckets: string[]; bucketCount: number }>(`/connections/${id}/test`, { method: "POST" }),

  // Buckets
  listBuckets: (connectionId: string) =>
    request<{ buckets: BucketInfo[]; defaultBucket?: string }>(`/buckets/${connectionId}`),

  createBucket: (connectionId: string, bucketName: string) =>
    request<{ success: boolean; message: string }>(`/buckets/${connectionId}`, {
      method: "POST",
      body: JSON.stringify({ bucketName }),
    }),

  deleteBucket: (connectionId: string, bucketName: string, force = false) =>
    request<{ success: boolean; message: string }>(
      `/buckets/${connectionId}/${encodeURIComponent(bucketName)}${force ? "?force=true" : ""}`,
      { method: "DELETE" }
    ),

  headBucket: (connectionId: string, bucketName: string) =>
    request<{ exists: boolean }>(`/buckets/${connectionId}/${encodeURIComponent(bucketName)}`, { method: "HEAD" }).catch((e) => {
      if (typeof e === "object" && e !== null && "exists" in e) return e;
      return { exists: false, error: e.error || "Unknown error" };
    }),

  // Objects
  listObjects: (connectionId: string, bucketName: string, prefix = "") =>
    request<ObjectListResponse>(
      `/objects/${connectionId}/${encodeURIComponent(bucketName)}?prefix=${encodeURIComponent(prefix)}`
    ),

  downloadObject: (connectionId: string, bucketName: string, key: string) =>
    request<DownloadResult>(
      `/objects/${connectionId}/${encodeURIComponent(bucketName)}/download?key=${encodeURIComponent(key)}`
    ),

  presignUrl: (connectionId: string, bucketName: string, key: string, action = "getObject", expiresIn = 3600) =>
    request<PresignResult>(
      `/objects/${connectionId}/${encodeURIComponent(bucketName)}/presign`,
      { method: "POST", body: JSON.stringify({ key, action, expiresIn }) }
    ),

  deleteObject: (connectionId: string, bucketName: string, key: string) =>
    request<{ success: boolean; key: string }>(
      `/objects/${connectionId}/${encodeURIComponent(bucketName)}/delete?key=${encodeURIComponent(key)}`,
      { method: "DELETE" }
    ),

  deleteMultipleObjects: (connectionId: string, bucketName: string, keys: string[]) =>
    request<{ deleted: string[]; errors: { key: string; error: string }[] }>(
      `/objects/${connectionId}/${encodeURIComponent(bucketName)}/delete-multiple`,
      { method: "POST", body: JSON.stringify({ keys }) }
    ),

  headObject: (connectionId: string, bucketName: string, key: string) =>
    request<ObjectHead>(
      `/objects/${connectionId}/${encodeURIComponent(bucketName)}/${encodeURIComponent(key)}`,
      { method: "HEAD" }
    ).catch((e) => {
      if (typeof e === "object" && e !== null && "key" in e) return e;
      throw e;
    }),

  // Upload file (multipart form)
  uploadFile: async (connectionId: string, bucketName: string, file: File, prefix = "", large = false) => {
    const formData = new FormData();
    formData.append("file", file);
    if (prefix) formData.append("prefix", prefix);

    const endpoint = large ? "upload-large" : "upload";
    const res = await fetch(
      `${BASE}/objects/${connectionId}/${encodeURIComponent(bucketName)}/${endpoint}`,
      { method: "POST", body: formData }
    );
    const data = await res.json();
    if (!res.ok) throw data;
    return data as { success: boolean; key: string; size: number };
  },

  // Create folder
  createFolder: (connectionId: string, bucketName: string, folderName: string, prefix = "") =>
    request<{ success: boolean; key: string }>(
      `/objects/${connectionId}/${encodeURIComponent(bucketName)}/folder`,
      { method: "POST", body: JSON.stringify({ folderName, prefix }) }
    ),
};