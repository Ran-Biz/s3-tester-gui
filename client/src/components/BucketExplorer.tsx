import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import type { BucketInfo, S3Object, DownloadResult } from "../types";

interface Props {
  connectionId: string;
  connectionName: string;
  onNotify: (message: string, type: "success" | "error") => void;
}

const iconBucket = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6Z" />
    <path d="M2 6c0-2 2.5-3 6-3s6 1 6 3" />
  </svg>
);
const iconFolder = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 5v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H8.5L7 3.5H3a1 1 0 0 0-1 1v.5Z" />
  </svg>
);
const iconFile = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6l-4-4Z" />
    <path d="M9 2v4h4" />
  </svg>
);
const iconPlus = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M7 2v10M2 7h10" />
  </svg>
);
const iconUpload = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 10V3M4 6l3-3 3 3M2 11v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" />
  </svg>
);
const iconTrash = (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4h9M5 4V2.5A.5.5 0 0 1 5.5 2h2a.5.5 0 0 1 .5.5V4M4 6v5a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V6" />
  </svg>
);
const iconEye = (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 6.5S3 3 6.5 3 12 6.5 12 6.5 10 10 6.5 10 1 6.5 1 6.5Z" />
    <circle cx="6.5" cy="6.5" r="1.25" />
  </svg>
);
const iconDownload = (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 2v7M3.5 6l3 3 3-3M1.5 10v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" />
  </svg>
);
const iconLink = (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M5.5 3.5H3.5A2.5 2.5 0 0 0 1 6v0a2.5 2.5 0 0 0 2.5 2.5h2M7.5 9.5h2A2.5 2.5 0 0 0 12 7v0a2.5 2.5 0 0 0-2.5-2.5h-2M4.5 6.5h4" />
  </svg>
);
const iconNoSignal = (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="24" cy="24" r="18" />
    <circle cx="24" cy="24" r="10" />
    <circle cx="24" cy="24" r="3" />
    <line x1="24" y1="4" x2="24" y2="10" />
    <line x1="24" y1="38" x2="24" y2="44" />
    <line x1="4" y1="24" x2="10" y2="24" />
    <line x1="38" y1="24" x2="44" y2="24" />
  </svg>
);

export default function BucketExplorer({ connectionId, connectionName, onNotify }: Props) {
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [currentPrefix, setCurrentPrefix] = useState("");
  const [prefixStack, setPrefixStack] = useState<string[]>([]);
  const [loadingBuckets, setLoadingBuckets] = useState(false);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const [showCreateBucket, setShowCreateBucket] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showPresign, setShowPresign] = useState(false);
  const [showFilePreview, setShowFilePreview] = useState<DownloadResult | null>(null);
  const [presignTarget, setPresignTarget] = useState("");
  const [presignResult, setPresignResult] = useState("");

  const loadBuckets = useCallback(async () => {
    setLoadingBuckets(true);
    try { const data = await api.listBuckets(connectionId); setBuckets(data.buckets); }
    catch (err: any) { onNotify(err.error || "Failed to list buckets", "error"); }
    setLoadingBuckets(false);
  }, [connectionId, onNotify]);

  useEffect(() => { loadBuckets(); }, [loadBuckets]);

  const loadObjects = useCallback(async (bucket: string, prefix: string) => {
    setLoadingObjects(true);
    try { const data = await api.listObjects(connectionId, bucket, prefix); setObjects(data.items); }
    catch (err: any) { onNotify(err.error || "Failed to list objects", "error"); setObjects([]); }
    setLoadingObjects(false);
  }, [connectionId, onNotify]);

  const handleSelectBucket = (b: string) => { setSelectedBucket(b); setCurrentPrefix(""); setPrefixStack([]); setSelectedItems(new Set()); loadObjects(b, ""); };
  const handleNavigateToFolder = (p: string) => { setPrefixStack((prev) => [...prev, currentPrefix]); setCurrentPrefix(p); setSelectedItems(new Set()); if (selectedBucket) loadObjects(selectedBucket, p); };
  const handleNavigateBack = () => { const s = [...prefixStack]; const prev = s.pop() || ""; setPrefixStack(s); setCurrentPrefix(prev); setSelectedItems(new Set()); if (selectedBucket) loadObjects(selectedBucket, prev); };

  const handleCreateBucket = async (name: string) => {
    try { await api.createBucket(connectionId, name); onNotify(`Bucket "${name}" created`, "success"); loadBuckets(); }
    catch (err: any) { onNotify(err.error || "Failed", "error"); }
  };
  const handleDeleteBucket = async (name: string) => {
    const force = window.confirm(`Force delete all contents of "${name}"?`);
    if (!window.confirm(`Delete bucket "${name}"? This cannot be undone.`)) return;
    try { await api.deleteBucket(connectionId, name, force); onNotify(`Bucket "${name}" deleted`, "success"); if (selectedBucket === name) setSelectedBucket(null); loadBuckets(); }
    catch (err: any) { onNotify(err.error || "Failed", "error"); }
  };
  const handleCreateFolder = async (n: string) => {
    if (!selectedBucket) return;
    try { await api.createFolder(connectionId, selectedBucket, n, currentPrefix); onNotify(`Folder "${n}" created`, "success"); loadObjects(selectedBucket, currentPrefix); }
    catch (err: any) { onNotify(err.error || "Failed", "error"); }
  };
  const handleFileUpload = async (file: File) => {
    if (!selectedBucket) return;
    try { await api.uploadFile(connectionId, selectedBucket, file, currentPrefix); onNotify(`"${file.name}" uploaded`, "success"); loadObjects(selectedBucket, currentPrefix); }
    catch (err: any) { onNotify(err.error || "Failed", "error"); }
  };
  const handleDeleteObject = async (key: string) => { if (!selectedBucket || !window.confirm(`Delete "${key}"?`)) return; try { await api.deleteObject(connectionId, selectedBucket, key); onNotify(`"${key}" deleted`, "success"); loadObjects(selectedBucket, currentPrefix); } catch (err: any) { onNotify(err.error || "Failed", "error"); } };
  const handleDeleteSelected = async () => {
    if (!selectedBucket || selectedItems.size === 0) return;
    if (!window.confirm(`Delete ${selectedItems.size} selected item(s)?`)) return;
    try { const r = await api.deleteMultipleObjects(connectionId, selectedBucket, Array.from(selectedItems)); onNotify(`Deleted ${r.deleted.length} item(s)`, "success"); if (r.errors.length) onNotify(`${r.errors.length} errors`, "error"); setSelectedItems(new Set()); loadObjects(selectedBucket, currentPrefix); }
    catch (err: any) { onNotify(err.error || "Failed", "error"); }
  };
  const handlePreviewFile = async (key: string) => { if (!selectedBucket) return; try { const r = await api.downloadObject(connectionId, selectedBucket, key); setShowFilePreview(r); } catch (err: any) { onNotify(err.error || "Failed", "error"); } };
  const handlePresign = async () => { if (!selectedBucket || !presignTarget) return; try { const r = await api.presignUrl(connectionId, selectedBucket, presignTarget); setPresignResult(r.url); } catch (err: any) { onNotify(err.error || "Failed", "error"); } };
  const handleDownload = async (key: string) => { if (!selectedBucket) return; try { const r = await api.downloadObject(connectionId, selectedBucket, key); const bc = atob(r.data); const bn = new Array(bc.length); for (let i = 0; i < bc.length; i++) bn[i] = bc.charCodeAt(i); const blob = new Blob([new Uint8Array(bn)], { type: r.contentType }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = key.split("/").pop() || key; a.click(); URL.revokeObjectURL(url); onNotify(`"${key}" downloaded`, "success"); } catch (err: any) { onNotify(err.error || "Failed", "error"); } };

  const toggleSelect = (key: string) => { const n = new Set(selectedItems); if (n.has(key)) n.delete(key); else n.add(key); setSelectedItems(n); };
  const toggleSelectAll = () => { const fk = objects.filter((o) => o.type === "file").map((o) => o.key); if (fk.every((k) => selectedItems.has(k))) setSelectedItems(new Set()); else setSelectedItems(new Set(fk)); };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "\u2014";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  };
  const formatDate = (d: string | null): string => { if (!d) return "\u2014"; return new Date(d).toLocaleString(); };

  return (
    <div className="explorer">
      <aside className="explorer-sidebar">
        <div className="sidebar-header">
          <span className="bank-title">Buckets</span>
          <button className="btn-icon" title="Create bucket" onClick={() => setShowCreateBucket(true)}>
            {iconPlus}
          </button>
        </div>
        {loadingBuckets ? (
          <div className="text-muted">Scanning\u2026</div>
        ) : buckets.length === 0 ? (
          <div className="text-muted">No buckets detected.</div>
        ) : (
          <ul className="bucket-list">
            {buckets.map((b) => (
              <li key={b.name}>
                <button className={`bucket-item${selectedBucket === b.name ? " active" : ""}`} onClick={() => handleSelectBucket(b.name)}>
                  <span className="bucket-icon">{iconBucket}</span>
                  <span className="bucket-name">{b.name}</span>
                </button>
                <button className="btn-icon danger btn-delete-bucket" title="Delete bucket" onClick={(e) => { e.stopPropagation(); handleDeleteBucket(b.name); }}>
                  {iconTrash}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="explorer-main">
        {!selectedBucket ? (
          <div className="empty-state">
            <span className="glyph">{iconNoSignal}</span>
            <h2>No signal detected</h2>
            <p>Select a bucket from the channel panel to tune into its contents.</p>
            <span className="hint-mono">Signal analysis idle</span>
          </div>
        ) : (
          <>
            <div className="explorer-toolbar">
              <div className="toolbar-breadcrumb">
                <button className="crumb" onClick={() => handleSelectBucket(selectedBucket)}>
                  <span className="icon">{iconBucket}</span>
                  {selectedBucket}
                </button>
                {currentPrefix && (
                  <>
                    <span className="breadcrumb-sep">/</span>
                    <button className="crumb" onClick={handleNavigateBack}>
                      &larr; ..
                    </button>
                    <span className="breadcrumb-sep">/</span>
                    <span className="crumb current">{currentPrefix}</span>
                  </>
                )}
              </div>
              <div className="toolbar-actions">
                <button className="btn btn-outline btn-sm" onClick={() => setShowCreateFolder(true)}>{iconFolder} New Folder</button>
                <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}>{iconUpload} Upload</button>
                {selectedItems.size > 0 && (
                  <button className="btn btn-danger btn-sm" onClick={handleDeleteSelected}>{iconTrash} Delete ({selectedItems.size})</button>
                )}
              </div>
            </div>

            <div className="object-table-wrapper">
              {loadingObjects ? (
                <div className="empty-state"><p>Loading\u2026</p></div>
              ) : objects.length === 0 ? (
                <div className="empty-state">
                  <span className="glyph">{iconNoSignal}</span>
                  <h2>Frequency band clear</h2>
                  <p>No objects detected at this prefix. Upload a file or create a folder to add signals.</p>
                </div>
              ) : (
                <table className="object-table">
                  <thead>
                    <tr>
                      <th className="col-select">
                        <input type="checkbox" className="row-check" onChange={toggleSelectAll}
                          checked={objects.filter((o) => o.type === "file").length > 0
                            && objects.filter((o) => o.type === "file").every((o) => selectedItems.has(o.key))} />
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
                            <input type="checkbox" className="row-check"
                              checked={selectedItems.has(obj.key)} onChange={() => toggleSelect(obj.key)} />
                          )}
                        </td>
                        <td>
                          {obj.type === "folder" ? (
                            <button className="folder-link" onClick={() => handleNavigateToFolder(obj.key)}>
                              <span className="entry-name folder">
                                <span className="icon">{iconFolder}</span>
                                <span className="label">{obj.key.replace(currentPrefix, "")}</span>
                              </span>
                            </button>
                          ) : (
                            <span className="entry-name">
                              <span className="icon">{iconFile}</span>
                              <span className="label">{obj.key.replace(currentPrefix, "")}</span>
                            </span>
                          )}
                        </td>
                        <td className="col-size">{obj.type === "folder" ? "\u2014" : formatSize(obj.size)}</td>
                        <td className="col-modified">{formatDate(obj.lastModified)}</td>
                        <td className="actions-cell">
                          {obj.type === "file" && (
                            <>
                              <button className="btn-icon" title="Preview" onClick={() => handlePreviewFile(obj.key)}>{iconEye}</button>
                              <button className="btn-icon" title="Download" onClick={() => handleDownload(obj.key)}>{iconDownload}</button>
                              <button className="btn-icon" title="Presign URL" onClick={() => { setPresignTarget(obj.key); setShowPresign(true); }}>{iconLink}</button>
                              <button className="btn-icon danger" title="Delete" onClick={() => handleDeleteObject(obj.key)}>{iconTrash}</button>
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

      <CreateBucketModal open={showCreateBucket} onClose={() => setShowCreateBucket(false)} onCreate={handleCreateBucket} />
      <CreateFolderModal open={showCreateFolder} onClose={() => setShowCreateFolder(false)} onCreate={handleCreateFolder} />
      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} onUpload={handleFileUpload} />
      <PresignModal open={showPresign} onClose={() => { setShowPresign(false); setPresignResult(""); setPresignTarget(""); }} target={presignTarget} result={presignResult} onGenerate={handlePresign} />
      <FilePreviewModal data={showFilePreview} onClose={() => setShowFilePreview(null)} />
    </div>
  );
}

/* Modals */

function CreateBucketModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (name: string) => void }) {
  const [val, setVal] = useState("");
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title"><span className="icon">{iconBucket}</span>Create Bucket</div>
        <input className="input" autoFocus value={val} onChange={(e) => setVal(e.target.value)} placeholder="bucket-name"
          onKeyDown={(e) => { if (e.key === "Enter" && val.trim()) { onCreate(val.trim()); setVal(""); onClose(); } }} />
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!val.trim()} onClick={() => { onCreate(val.trim()); setVal(""); onClose(); }}>Create</button>
        </div>
      </div>
    </div>
  );
}

function CreateFolderModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (name: string) => void }) {
  const [val, setVal] = useState("");
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title"><span className="icon">{iconFolder}</span>Create Folder</div>
        <input className="input" autoFocus value={val} onChange={(e) => setVal(e.target.value)} placeholder="folder-name"
          onKeyDown={(e) => { if (e.key === "Enter" && val.trim()) { onCreate(val.trim()); setVal(""); onClose(); } }} />
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!val.trim()} onClick={() => { onCreate(val.trim()); setVal(""); onClose(); }}>Create</button>
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
        <div className="modal-title"><span className="icon">{iconUpload}</span>Upload File</div>
        <label className="file-drop">
          <span className="icon">{iconUpload}</span>
          {file ? <span className="filename">{file.name}</span> : <span className="prompt">Choose a file or drag it here</span>}
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!file} onClick={() => { if (file) { onUpload(file); onClose(); } }}>Upload</button>
        </div>
      </div>
    </div>
  );
}

function PresignModal({ open, onClose, target, result, onGenerate }: { open: boolean; onClose: () => void; target: string; result: string; onGenerate: () => void }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title"><span className="icon">{iconLink}</span>Presigned URL</div>
        <code>{target}</code>
        {result ? (
          <div className="presign-result">
            <textarea readOnly value={result} rows={3} onClick={(e) => (e.target as HTMLTextAreaElement).select()} />
            <button className="btn btn-primary btn-sm" onClick={() => { navigator.clipboard.writeText(result); }}>Copy</button>
          </div>
        ) : (
          <button className="btn btn-primary btn-full" onClick={onGenerate}>Generate (GET, 1h)</button>
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
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title"><span className="icon">{iconFile}</span>{data.key}</div>
        <div className="preview-meta">
          <span>{data.size.toLocaleString()} bytes</span>
          <span>{data.contentType}</span>
        </div>
        <div className="preview-content">
          {isImage ? (
            <img src={`data:${data.contentType};base64,${data.data}`} alt={data.key} />
          ) : data.isText && data.textContent ? (
            <pre>{data.textContent.slice(0, 10000)}{data.textContent.length > 10000 ? "\n\n... (truncated)" : ""}</pre>
          ) : (
            <p>Binary file &mdash; preview not available</p>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
