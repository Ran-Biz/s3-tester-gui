import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import type { BucketInfo, S3Object, DownloadResult } from "../types";

interface Props {
  connectionId: string;
  connectionName: string;
  onNotify: (message: string, type: "success" | "error") => void;
}

export default function BucketExplorer({ connectionId, connectionName, onNotify }: Props) {
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [currentPrefix, setCurrentPrefix] = useState("");
  const [prefixStack, setPrefixStack] = useState<string[]>([]);
  const [loadingBuckets, setLoadingBuckets] = useState(false);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Modals
  const [showCreateBucket, setShowCreateBucket] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showPresign, setShowPresign] = useState(false);
  const [showFilePreview, setShowFilePreview] = useState<DownloadResult | null>(null);
  const [presignTarget, setPresignTarget] = useState<string>("");
  const [presignResult, setPresignResult] = useState<string>("");

  // Load buckets
  const loadBuckets = useCallback(async () => {
    setLoadingBuckets(true);
    try {
      const data = await api.listBuckets(connectionId);
      setBuckets(data.buckets);
    } catch (err: any) {
      onNotify(err.error || "Failed to list buckets", "error");
    }
    setLoadingBuckets(false);
  }, [connectionId, onNotify]);

  useEffect(() => {
    loadBuckets();
  }, [loadBuckets]);

  // Load objects
  const loadObjects = useCallback(async (bucket: string, prefix: string) => {
    setLoadingObjects(true);
    try {
      const data = await api.listObjects(connectionId, bucket, prefix);
      setObjects(data.items);
    } catch (err: any) {
      onNotify(err.error || "Failed to list objects", "error");
      setObjects([]);
    }
    setLoadingObjects(false);
  }, [connectionId, onNotify]);

  const handleSelectBucket = (bucketName: string) => {
    setSelectedBucket(bucketName);
    setCurrentPrefix("");
    setPrefixStack([]);
    setSelectedItems(new Set());
    loadObjects(bucketName, "");
  };

  const handleNavigateToFolder = (prefix: string) => {
    setPrefixStack((prev) => [...prev, currentPrefix]);
    setCurrentPrefix(prefix);
    setSelectedItems(new Set());
    if (selectedBucket) loadObjects(selectedBucket, prefix);
  };

  const handleNavigateBack = () => {
    const newStack = [...prefixStack];
    const prev = newStack.pop() || "";
    setPrefixStack(newStack);
    setCurrentPrefix(prev);
    setSelectedItems(new Set());
    if (selectedBucket) loadObjects(selectedBucket, prev);
  };

  const handleCreateBucket = async (name: string) => {
    try {
      await api.createBucket(connectionId, name);
      onNotify(`Bucket "${name}" created`, "success");
      loadBuckets();
    } catch (err: any) {
      onNotify(err.error || "Failed to create bucket", "error");
    }
  };

  const handleDeleteBucket = async (name: string) => {
    const force = window.confirm(`Force delete all contents of "${name}"?`);
    if (!window.confirm(`Delete bucket "${name}"? This cannot be undone.`)) return;
    try {
      await api.deleteBucket(connectionId, name, force);
      onNotify(`Bucket "${name}" deleted`, "success");
      if (selectedBucket === name) setSelectedBucket(null);
      loadBuckets();
    } catch (err: any) {
      onNotify(err.error || "Failed to delete bucket", "error");
    }
  };

  const handleCreateFolder = async (folderName: string) => {
    if (!selectedBucket) return;
    try {
      await api.createFolder(connectionId, selectedBucket, folderName, currentPrefix);
      onNotify(`Folder "${folderName}" created`, "success");
      loadObjects(selectedBucket, currentPrefix);
    } catch (err: any) {
      onNotify(err.error || "Failed to create folder", "error");
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedBucket) return;
    try {
      await api.uploadFile(connectionId, selectedBucket, file, currentPrefix);
      onNotify(`"${file.name}" uploaded`, "success");
      loadObjects(selectedBucket, currentPrefix);
    } catch (err: any) {
      onNotify(err.error || "Failed to upload", "error");
    }
  };

  const handleDeleteObject = async (key: string) => {
    if (!selectedBucket) return;
    if (!window.confirm(`Delete "${key}"?`)) return;
    try {
      await api.deleteObject(connectionId, selectedBucket, key);
      onNotify(`"${key}" deleted`, "success");
      loadObjects(selectedBucket, currentPrefix);
    } catch (err: any) {
      onNotify(err.error || "Failed to delete", "error");
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedBucket || selectedItems.size === 0) return;
    if (!window.confirm(`Delete ${selectedItems.size} selected item(s)?`)) return;
    try {
      const result = await api.deleteMultipleObjects(connectionId, selectedBucket, Array.from(selectedItems));
      onNotify(`Deleted ${result.deleted.length} item(s)`, "success");
      if (result.errors.length > 0) {
        onNotify(`${result.errors.length} errors during delete`, "error");
      }
      setSelectedItems(new Set());
      loadObjects(selectedBucket, currentPrefix);
    } catch (err: any) {
      onNotify(err.error || "Failed to delete", "error");
    }
  };

  const handlePreviewFile = async (key: string) => {
    if (!selectedBucket) return;
    try {
      const result = await api.downloadObject(connectionId, selectedBucket, key);
      setShowFilePreview(result);
    } catch (err: any) {
      onNotify(err.error || "Failed to download", "error");
    }
  };

  const handlePresign = async () => {
    if (!selectedBucket || !presignTarget) return;
    try {
      const result = await api.presignUrl(connectionId, selectedBucket, presignTarget);
      setPresignResult(result.url);
    } catch (err: any) {
      onNotify(err.error || "Failed to generate presigned URL", "error");
    }
  };

  const handleDownload = async (key: string) => {
    if (!selectedBucket) return;
    try {
      const result = await api.downloadObject(connectionId, selectedBucket, key);
      const byteChars = atob(result.data);
      const byteNums = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
      const blob = new Blob([new Uint8Array(byteNums)], { type: result.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = key.split("/").pop() || key;
      a.click();
      URL.revokeObjectURL(url);
      onNotify(`"${key}" downloaded`, "success");
    } catch (err: any) {
      onNotify(err.error || "Failed to download", "error");
    }
  };

  const toggleSelect = (key: string) => {
    const next = new Set(selectedItems);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedItems(next);
  };

  const toggleSelectAll = () => {
    const fileKeys = objects.filter((o) => o.type === "file").map((o) => o.key);
    if (fileKeys.every((k) => selectedItems.has(k))) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(fileKeys));
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatDate = (d: string | null): string => {
    if (!d) return "—";
    return new Date(d).toLocaleString();
  };

  return (
    <div className="explorer">
      {/* Sidebar: Buckets */}
      <aside className="explorer-sidebar">
        <div className="sidebar-header">
          <h3>Buckets</h3>
          <button className="btn btn-xs btn-primary" onClick={() => setShowCreateBucket(true)}>
            + New
          </button>
        </div>
        {loadingBuckets ? (
          <p className="text-muted">Loading...</p>
        ) : buckets.length === 0 ? (
          <p className="text-muted">No buckets</p>
        ) : (
          <ul className="bucket-list">
            {buckets.map((b) => (
              <li key={b.name}>
                <button
                  className={`bucket-item ${selectedBucket === b.name ? "active" : ""}`}
                  onClick={() => handleSelectBucket(b.name)}
                >
                  <span className="bucket-icon">🪣</span>
                  <span className="bucket-name">{b.name}</span>
                </button>
                <button
                  className="btn-icon btn-delete-bucket"
                  title="Delete bucket"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteBucket(b.name);
                  }}
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Main: Objects */}
      <section className="explorer-main">
        {!selectedBucket ? (
          <div className="empty-state">
            <h2>🪣 Select a bucket to explore</h2>
            <p>Or create a new one</p>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="explorer-toolbar">
              <div className="toolbar-breadcrumb">
                <button className="btn btn-sm btn-outline" onClick={() => handleSelectBucket(selectedBucket)}>
                  🪣 {selectedBucket}
                </button>
                {currentPrefix && (
                  <>
                    <span className="breadcrumb-sep">/</span>
                    <button className="btn btn-sm btn-outline" onClick={handleNavigateBack}>
                      ← ..
                    </button>
                    <span className="breadcrumb-sep">/</span>
                    <span className="breadcrumb-current">{currentPrefix}</span>
                  </>
                )}
              </div>
              <div className="toolbar-actions">
                <button className="btn btn-sm btn-outline" onClick={() => setShowCreateFolder(true)}>
                  📁 New Folder
                </button>
                <button className="btn btn-sm btn-primary" onClick={() => setShowUpload(true)}>
                  ⬆ Upload
                </button>
                {selectedItems.size > 0 && (
                  <button className="btn btn-sm btn-danger" onClick={handleDeleteSelected}>
                    🗑️ Delete ({selectedItems.size})
                  </button>
                )}
              </div>
            </div>

            {/* Object Table */}
            <div className="object-table-wrapper">
              {loadingObjects ? (
                <div className="empty-state"><p>Loading...</p></div>
              ) : objects.length === 0 && !currentPrefix ? (
                <div className="empty-state">
                  <p>This bucket is empty</p>
                </div>
              ) : (
                <table className="object-table">
                  <thead>
                    <tr>
                      <th className="col-select">
                        <input
                          type="checkbox"
                          onChange={toggleSelectAll}
                          checked={
                            objects.filter((o) => o.type === "file").length > 0 &&
                            objects.filter((o) => o.type === "file").every((o) => selectedItems.has(o.key))
                          }
                        />
                      </th>
                      <th className="col-name">Name</th>
                      <th className="col-size">Size</th>
                      <th className="col-modified">Last Modified</th>
                      <th className="col-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {objects.map((obj) => (
                      <tr key={obj.key} className={selectedItems.has(obj.key) ? "selected" : ""}>
                        <td>
                          {obj.type === "file" && (
                            <input
                              type="checkbox"
                              checked={selectedItems.has(obj.key)}
                              onChange={() => toggleSelect(obj.key)}
                            />
                          )}
                        </td>
                        <td>
                          {obj.type === "folder" ? (
                            <button
                              className="link-btn folder-link"
                              onClick={() => handleNavigateToFolder(obj.key)}
                            >
                              📁 {obj.key.replace(currentPrefix, "")}
                            </button>
                          ) : (
                            <span className="file-name">
                              📄 {obj.key.replace(currentPrefix, "")}
                            </span>
                          )}
                        </td>
                        <td>{obj.type === "folder" ? "—" : formatSize(obj.size)}</td>
                        <td>{formatDate(obj.lastModified)}</td>
                        <td className="actions-cell">
                          {obj.type === "file" && (
                            <>
                              <button className="btn btn-xs btn-outline" onClick={() => handlePreviewFile(obj.key)} title="Preview">
                                👁️
                              </button>
                              <button className="btn btn-xs btn-outline" onClick={() => handleDownload(obj.key)} title="Download">
                                ⬇
                              </button>
                              <button
                                className="btn btn-xs btn-outline"
                                onClick={() => { setPresignTarget(obj.key); setShowPresign(true); }}
                                title="Presign URL"
                              >
                                🔗
                              </button>
                              <button className="btn btn-xs btn-outline btn-danger-text" onClick={() => handleDeleteObject(obj.key)} title="Delete">
                                🗑️
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </section>

      {/* Modals */}
      <CreateBucketModal
        open={showCreateBucket}
        onClose={() => setShowCreateBucket(false)}
        onCreate={handleCreateBucket}
      />
      <CreateFolderModal
        open={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onCreate={handleCreateFolder}
      />
      <UploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onUpload={handleFileUpload}
      />
      <PresignModal
        open={showPresign}
        onClose={() => { setShowPresign(false); setPresignResult(""); setPresignTarget(""); }}
        target={presignTarget}
        result={presignResult}
        onGenerate={handlePresign}
      />
      <FilePreviewModal
        data={showFilePreview}
        onClose={() => setShowFilePreview(null)}
      />
    </div>
  );
}

// ---------- Modal Components ----------

function CreateBucketModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState("");
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Create Bucket</h3>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="bucket-name"
          onKeyDown={(e) => { if (e.key === "Enter") { onCreate(name); setName(""); onClose(); } }}
        />
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onCreate(name); setName(""); onClose(); }} disabled={!name.trim()}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateFolderModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState("");
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Create Folder</h3>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="folder-name"
          onKeyDown={(e) => { if (e.key === "Enter") { onCreate(name); setName(""); onClose(); } }}
        />
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onCreate(name); setName(""); onClose(); }} disabled={!name.trim()}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadModal({ open, onClose, onUpload }: { open: boolean; onClose: () => void; onUpload: (file: File) => void }) {
  const [file, setFile] = useState<File | null>(null);
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Upload File</h3>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { if (file) { onUpload(file); onClose(); } }} disabled={!file}>
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}

function PresignModal({ open, onClose, target, result, onGenerate }: {
  open: boolean;
  onClose: () => void;
  target: string;
  result: string;
  onGenerate: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h3>Presigned URL for:</h3>
        <code>{target}</code>
        {result ? (
          <div className="presign-result">
            <textarea readOnly value={result} rows={3} onClick={(e) => (e.target as HTMLTextAreaElement).select()} />
            <button className="btn btn-sm btn-primary" onClick={() => { navigator.clipboard.writeText(result); }}>
              📋 Copy
            </button>
          </div>
        ) : (
          <button className="btn btn-primary btn-full" onClick={onGenerate}>
            Generate Presigned URL (GET)
          </button>
        )}
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function FilePreviewModal({ data, onClose }: { data: DownloadResult | null; onClose: () => void }) {
  if (!data) return null;
  const isImage = data.contentType?.startsWith("image/");
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide modal-preview" onClick={(e) => e.stopPropagation()}>
        <h3>Preview: {data.key}</h3>
        <div className="preview-meta">
          <span>Size: {data.size} bytes</span>
          <span>Type: {data.contentType}</span>
        </div>
        <div className="preview-content">
          {isImage ? (
            <img src={`data:${data.contentType};base64,${data.data}`} alt={data.key} style={{ maxWidth: "100%", maxHeight: "400px" }} />
          ) : data.isText && data.textContent ? (
            <pre>{data.textContent.slice(0, 10000)}{data.textContent.length > 10000 ? "\n\n... (truncated)" : ""}</pre>
          ) : (
            <p className="text-muted">Binary file — preview not available</p>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}