import React, { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../api";
import type { BucketInfo, S3Object, DownloadResult } from "../types";

interface Props {
  connectionId: string;
  connectionName: string;
  endpoint?: string;
  onNotify: (message: string, type: "success" | "error") => void;
}

const iconBucket = (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6Z" />
    <path d="M2 6c0-2 2.5-3 6-3s6 1 6 3" />
  </svg>
);
const iconFolder = (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 5v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H8.5L7 3.5H3a1 1 0 0 0-1 1v.5Z" />
  </svg>
);
const iconFile = (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6l-4-4Z" />
    <path d="M9 2v4h4" />
  </svg>
);
const iconPlus = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
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
  <svg width="14" height="14" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 6.5S3 3 6.5 3 12 6.5 12 6.5 10 10 6.5 10 1 6.5 1 6.5Z" />
    <circle cx="6.5" cy="6.5" r="1.25" />
  </svg>
);
const iconDownload = (
  <svg width="14" height="14" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 2v7M3.5 6l3 3 3-3M1.5 10v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" />
  </svg>
);
const iconLink = (
  <svg width="14" height="14" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M5.5 3.5H3.5A2.5 2.5 0 0 0 1 6v0a2.5 2.5 0 0 0 2.5 2.5h2M7.5 9.5h2A2.5 2.5 0 0 0 12 7v0a2.5 2.5 0 0 0-2.5-2.5h-2M4.5 6.5h4" />
  </svg>
);
const iconSearch = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="6" cy="6" r="4" />
    <path d="M9.2 9.2 13 13" />
  </svg>
);
const iconUp = (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 12V2M3.5 5.5 7 2l3.5 3.5" />
  </svg>
);
const iconEmpty = (
  <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6Z" />
    <path d="M2 6c0-2 2.5-3 6-3s6 1 6 3" />
  </svg>
);

export default function BucketExplorer({ connectionId, connectionName, endpoint, onNotify }: Props) {
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [currentPrefix, setCurrentPrefix] = useState("");
  const [prefixStack, setPrefixStack] = useState<string[]>([]);
  const [loadingBuckets, setLoadingBuckets] = useState(false);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bucketFilter, setBucketFilter] = useState("");
  const [objectFilter, setObjectFilter] = useState("");

  const [showCreateBucket, setShowCreateBucket] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showPresign, setShowPresign] = useState(false);
  const [showFilePreview, setShowFilePreview] = useState<DownloadResult | null>(null);
  const [presignTarget, setPresignTarget] = useState("");
  const [presignResult, setPresignResult] = useState("");
  const [confirmState, setConfirmState] = useState<
    | { kind: "bucket"; name: string; force: boolean }
    | { kind: "object"; key: string }
    | { kind: "bulk"; count: number }
    | null
  >(null);

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

  const handleSelectBucket = (b: string) => {
    setSelectedBucket(b); setCurrentPrefix(""); setPrefixStack([]);
    setSelectedItems(new Set()); setObjectFilter(""); loadObjects(b, "");
  };
  const handleNavigateToFolder = (p: string) => {
    setPrefixStack((prev) => [...prev, currentPrefix]); setCurrentPrefix(p);
    setSelectedItems(new Set()); setObjectFilter("");
    if (selectedBucket) loadObjects(selectedBucket, p);
  };
  const handleNavigateBack = () => {
    const s = [...prefixStack]; const prev = s.pop() || "";
    setPrefixStack(s); setCurrentPrefix(prev);
    setSelectedItems(new Set()); setObjectFilter("");
    if (selectedBucket) loadObjects(selectedBucket, prev);
  };
  const handleCrumbRoot = () => {
    if (!selectedBucket) return;
    setPrefixStack([]); setCurrentPrefix(""); setSelectedItems(new Set()); setObjectFilter("");
    loadObjects(selectedBucket, "");
  };

  const handleCreateBucket = async (name: string) => {
    try { await api.createBucket(connectionId, name); onNotify(`Bucket "${name}" created.`, "success"); loadBuckets(); }
    catch (err: any) { onNotify(err.error || "Couldn't create bucket.", "error"); }
  };
  const handleDeleteBucket = async (name: string) => {
    setConfirmState({ kind: "bucket", name, force: false });
  };
  const confirmDeleteBucket = async () => {
    if (confirmState?.kind !== "bucket") return;
    const { name, force } = confirmState;
    setConfirmState(null);
    try {
      await api.deleteBucket(connectionId, name, force);
      onNotify(`Bucket "${name}" deleted.`, "success");
      if (selectedBucket === name) { setSelectedBucket(null); setObjects([]); }
      loadBuckets();
    }
    catch (err: any) { onNotify(err.error || "Couldn't delete bucket.", "error"); }
  };
  const handleCreateFolder = async (n: string) => {
    if (!selectedBucket) return;
    try { await api.createFolder(connectionId, selectedBucket, n, currentPrefix); onNotify(`Folder "${n}/" created.`, "success"); loadObjects(selectedBucket, currentPrefix); }
    catch (err: any) { onNotify(err.error || "Couldn't create folder.", "error"); }
  };
  const handleFileUpload = async (file: File) => {
    if (!selectedBucket) return;
    try { await api.uploadFile(connectionId, selectedBucket, file, currentPrefix); onNotify(`"${file.name}" uploaded.`, "success"); loadObjects(selectedBucket, currentPrefix); }
    catch (err: any) { onNotify(err.error || "Upload failed.", "error"); }
  };
  const handleDeleteObject = async (key: string) => {
    if (!selectedBucket) return;
    setConfirmState({ kind: "object", key });
  };
  const confirmDeleteObject = async () => {
    if (confirmState?.kind !== "object" || !selectedBucket) return;
    const { key } = confirmState;
    setConfirmState(null);
    try { await api.deleteObject(connectionId, selectedBucket, key); onNotify("Object deleted.", "success"); loadObjects(selectedBucket, currentPrefix); }
    catch (err: any) { onNotify(err.error || "Couldn't delete object.", "error"); }
  };
  const handleDeleteSelected = async () => {
    if (!selectedBucket || selectedItems.size === 0) return;
    setConfirmState({ kind: "bulk", count: selectedItems.size });
  };
  const confirmDeleteSelected = async () => {
    if (confirmState?.kind !== "bulk" || !selectedBucket) return;
    setConfirmState(null);
    try {
      const r = await api.deleteMultipleObjects(connectionId, selectedBucket, Array.from(selectedItems));
      onNotify(`Deleted ${r.deleted.length} object${r.deleted.length === 1 ? "" : "s"}.`, "success");
      if (r.errors.length) onNotify(`${r.errors.length} couldn't be deleted.`, "error");
      setSelectedItems(new Set()); loadObjects(selectedBucket, currentPrefix);
    }
    catch (err: any) { onNotify(err.error || "Bulk delete failed.", "error"); }
  };
  const handlePreviewFile = async (key: string) => {
    if (!selectedBucket) return;
    try { const r = await api.downloadObject(connectionId, selectedBucket, key); setShowFilePreview(r); }
    catch (err: any) { onNotify(err.error || "Couldn't load preview.", "error"); }
  };
  const handlePresign = async () => {
    if (!selectedBucket || !presignTarget) return;
    try { const r = await api.presignUrl(connectionId, selectedBucket, presignTarget); setPresignResult(r.url); }
    catch (err: any) { onNotify(err.error || "Couldn't generate URL.", "error"); }
  };
  const handleDownload = async (key: string) => {
    if (!selectedBucket) return;
    try {
      const r = await api.downloadObject(connectionId, selectedBucket, key);
      const bc = atob(r.data); const bn = new Array(bc.length);
      for (let i = 0; i < bc.length; i++) bn[i] = bc.charCodeAt(i);
      const blob = new Blob([new Uint8Array(bn)], { type: r.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = key.split("/").pop() || key; a.click();
      URL.revokeObjectURL(url); onNotify("Download started.", "success");
    } catch (err: any) { onNotify(err.error || "Download failed.", "error"); }
  };

  const toggleSelect = (key: string) => {
    const n = new Set(selectedItems);
    if (n.has(key)) n.delete(key); else n.add(key);
    setSelectedItems(n);
  };
  const toggleSelectAll = () => {
    const fk = filteredObjects.filter((o) => o.type === "file").map((o) => o.key);
    if (fk.length > 0 && fk.every((k) => selectedItems.has(k))) setSelectedItems(new Set());
    else setSelectedItems(new Set(fk));
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  };
  const formatDate = (d: string | null): string => {
    if (!d) return "—";
    const dt = new Date(d);
    return dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
      ", " + dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };
  const shortName = (key: string) => key.replace(currentPrefix, "") || key;

  const filteredBuckets = useMemo(() => {
    const q = bucketFilter.trim().toLowerCase();
    if (!q) return buckets;
    return buckets.filter((b) => b.name.toLowerCase().includes(q));
  }, [buckets, bucketFilter]);

  const filteredObjects = useMemo(() => {
    const q = objectFilter.trim().toLowerCase();
    if (!q) return objects;
    return objects.filter((o) => shortName(o.key).toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects, objectFilter, currentPrefix]);

  const fileCount = objects.filter((o) => o.type === "file").length;
  const allFilesSelected = filteredObjects.filter((o) => o.type === "file").length > 0 &&
    filteredObjects.filter((o) => o.type === "file").every((o) => selectedItems.has(o.key));

  const prefixParts = currentPrefix.split("/").filter(Boolean);

  return (
    <div className="explorer">
      <aside className="explorer-sidebar" aria-label="Buckets">
        <div className="sidebar-head">
          <div className="sidebar-title-row">
            <span className="sidebar-title">Buckets · {buckets.length}</span>
            <button className="btn-icon" title="Create bucket" aria-label="Create bucket" onClick={() => setShowCreateBucket(true)}>
              {iconPlus}
            </button>
          </div>
          <div className="search-input">
            <span className="s-icon">{iconSearch}</span>
            <input
              className="input"
              value={bucketFilter}
              onChange={(e) => setBucketFilter(e.target.value)}
              placeholder="Filter buckets…"
              aria-label="Filter buckets"
            />
          </div>
        </div>
        {loadingBuckets ? (
          <div className="text-muted">Loading buckets…</div>
        ) : filteredBuckets.length === 0 ? (
          <div className="text-muted">{buckets.length === 0 ? "No buckets yet. Create one to get started." : "No buckets match."}</div>
        ) : (
          <ul className="bucket-list">
            {filteredBuckets.map((b) => (
              <li key={b.name}>
                <button
                  className={`bucket-item${selectedBucket === b.name ? " active" : ""}`}
                  onClick={() => handleSelectBucket(b.name)}
                  aria-current={selectedBucket === b.name ? "true" : undefined}
                >
                  <span className="bucket-icon">{iconBucket}</span>
                  <span className="bucket-name">{b.name}</span>
                </button>
                <button className="btn-icon danger btn-delete-bucket" title={`Delete ${b.name}`} aria-label={`Delete ${b.name}`} onClick={(e) => { e.stopPropagation(); handleDeleteBucket(b.name); }}>
                  {iconTrash}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="sidebar-foot">
          <span className="field-hint">Connected as <strong style={{ color: "var(--text-2)" }}>{connectionName}</strong></span>
        </div>
      </aside>

      <section className="explorer-main" aria-label="Objects">
        {!selectedBucket ? (
          <div className="table-card">
            <div className="empty-state">
              <span className="empty-icon">{iconEmpty}</span>
              <h2>Select a bucket</h2>
              <p>Choose a bucket on the left to browse its objects. Or create a new bucket to start fresh.</p>
              <div className="empty-actions">
                <button className="btn btn-outline btn-sm" onClick={() => setShowCreateBucket(true)}>{iconPlus} New bucket</button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="bucket-head">
              <div style={{ minWidth: 0 }}>
                <h2>{selectedBucket}</h2>
                <div className="bucket-meta">
                  <span>{fileCount} object{fileCount === 1 ? "" : "s"}</span>
                  <span className="sep">·</span>
                  <span className="mono">{endpoint || "s3.amazonaws.com"}</span>
                  {currentPrefix && (<><span className="sep">·</span><span className="mono">{currentPrefix}</span></>)}
                </div>
              </div>
              <div className="bucket-actions">
                <button className="btn btn-outline btn-sm" onClick={() => setShowCreateFolder(true)}>{iconFolder} New folder</button>
                <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}>{iconUpload} Upload</button>
              </div>
            </div>

            <div className="toolbar-row">
              <nav className="breadcrumb" aria-label="Path">
                <button className={`crumb${!currentPrefix ? " current" : ""}`} onClick={handleCrumbRoot} disabled={!currentPrefix}>
                  {selectedBucket}
                </button>
                {prefixParts.map((part, i) => {
                  const isLast = i === prefixParts.length - 1;
                  const target = prefixParts.slice(0, i + 1).join("/") + "/";
                  return (
                    <span key={target} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span className="breadcrumb-sep">/</span>
                      {isLast ? (
                        <span className="crumb current">{part}</span>
                      ) : (
                        <button className="crumb" onClick={() => {
                          setPrefixStack(prefixStack.slice(0, i));
                          setCurrentPrefix(target);
                          setSelectedItems(new Set()); setObjectFilter("");
                          loadObjects(selectedBucket, target);
                        }}>{part}</button>
                      )}
                    </span>
                  );
                })}
                {currentPrefix && (
                  <button className="crumb" onClick={handleNavigateBack} title="Up one level" style={{ marginLeft: 4, display: "inline-flex", alignItems: "center", gap: 5 }}>{iconUp} Up</button>
                )}
              </nav>
              <div className="filter-box">
                <span className="s-icon">{iconSearch}</span>
                <input
                  className="input"
                  value={objectFilter}
                  onChange={(e) => setObjectFilter(e.target.value)}
                  placeholder="Filter in this folder…"
                  aria-label="Filter objects"
                />
              </div>
            </div>

            {selectedItems.size > 0 && (
              <div className="bulk-bar" role="status">
                <span className="count">{selectedItems.size} selected</span>
                <span className="field-hint">Bulk actions apply to files only.</span>
                <span className="spacer" />
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedItems(new Set())}>Clear</button>
                <button className="btn btn-danger btn-sm" onClick={handleDeleteSelected}>{iconTrash} Delete selected</button>
              </div>
            )}

            <div className="table-card">
              <div className="object-table-wrapper">
                {loadingObjects ? (
                  <div className="empty-state"><p>Loading objects…</p></div>
                ) : filteredObjects.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">{iconFolder}</span>
                    <h2>{objectFilter ? "No matches" : "This folder is empty"}</h2>
                    <p>{objectFilter ? `Nothing named "${objectFilter}" here. Try a different filter.` : "Upload a file or create a folder to get started."}</p>
                    {!objectFilter && (
                      <div className="empty-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}>{iconUpload} Upload file</button>
                        <button className="btn btn-outline btn-sm" onClick={() => setShowCreateFolder(true)}>New folder</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <table className="object-table">
                    <thead>
                      <tr>
                        <th className="col-select" scope="col">
                          <input type="checkbox" className="row-check" onChange={toggleSelectAll}
                            checked={allFilesSelected} aria-label="Select all files" />
                        </th>
                        <th scope="col">Name</th>
                        <th scope="col" className="col-size" style={{ textAlign: "right" }}>Size</th>
                        <th scope="col" className="col-modified">Modified</th>
                        <th scope="col" className="col-actions"><span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredObjects.map((obj) => (
                        <tr key={obj.key} className={selectedItems.has(obj.key) ? "selected" : ""}>
                          <td className="col-select">
                            {obj.type === "file" && (
                              <input type="checkbox" className="row-check"
                                checked={selectedItems.has(obj.key)} onChange={() => toggleSelect(obj.key)}
                                aria-label={`Select ${shortName(obj.key)}`} />
                            )}
                          </td>
                          <td>
                            {obj.type === "folder" ? (
                              <button className="folder-link" onClick={() => handleNavigateToFolder(obj.key)}>
                                <span className="entry-name folder">
                                  <span className="icon">{iconFolder}</span>
                                  <span className="label">{shortName(obj.key).replace(/\/$/, "")}</span>
                                </span>
                              </button>
                            ) : (
                              <span className="entry-name">
                                <span className="icon">{iconFile}</span>
                                <span className="label">{shortName(obj.key)}</span>
                              </span>
                            )}
                          </td>
                          <td className="col-size">{obj.type === "folder" ? "—" : formatSize(obj.size)}</td>
                          <td className="col-modified">{formatDate(obj.lastModified)}</td>
                          <td className="col-actions actions-cell">
                            {obj.type === "file" && (
                              <span className="row-actions">
                                <button className="btn-icon" title="Preview" aria-label={`Preview ${shortName(obj.key)}`} onClick={() => handlePreviewFile(obj.key)}>{iconEye}</button>
                                <button className="btn-icon" title="Download" aria-label={`Download ${shortName(obj.key)}`} onClick={() => handleDownload(obj.key)}>{iconDownload}</button>
                                <button className="btn-icon" title="Share via presigned URL" aria-label={`Share ${shortName(obj.key)}`} onClick={() => { setPresignTarget(obj.key); setPresignResult(""); setShowPresign(true); }}>{iconLink}</button>
                                <button className="btn-icon danger" title="Delete" aria-label={`Delete ${shortName(obj.key)}`} onClick={() => handleDeleteObject(obj.key)}>{iconTrash}</button>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      <CreateBucketModal open={showCreateBucket} onClose={() => setShowCreateBucket(false)} onCreate={handleCreateBucket} />
      <CreateFolderModal open={showCreateFolder} onClose={() => setShowCreateFolder(false)} onCreate={handleCreateFolder} />
      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} onUpload={handleFileUpload} />
      <PresignModal open={showPresign} onClose={() => { setShowPresign(false); setPresignResult(""); setPresignTarget(""); }} target={presignTarget} result={presignResult} onGenerate={handlePresign} />
      <FilePreviewModal data={showFilePreview} onClose={() => setShowFilePreview(null)} />
      <ConfirmModal state={confirmState} onClose={() => setConfirmState(null)}
        onConfirm={() => {
          if (confirmState?.kind === "bucket") confirmDeleteBucket();
          else if (confirmState?.kind === "object") confirmDeleteObject();
          else if (confirmState?.kind === "bulk") confirmDeleteSelected();
        }}
        onToggleForce={(v) => setConfirmState((s) => (s?.kind === "bucket" ? { ...s, force: v } : s))}
      />
    </div>
  );
}

/* ---------- Confirm delete ---------- */

function ConfirmModal({ state, onClose, onConfirm, onToggleForce }: {
  state: { kind: "bucket"; name: string; force: boolean } | { kind: "object"; key: string } | { kind: "bulk"; count: number } | null;
  onClose: () => void;
  onConfirm: () => void;
  onToggleForce: (v: boolean) => void;
}) {
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, onClose]);
  if (!state) return null;
  const title = state.kind === "bucket" ? "Delete bucket" : state.kind === "object" ? "Delete object" : `Delete ${state.count} objects`;
  const body = state.kind === "bucket"
    ? `"${state.name}" will be permanently deleted. This can't be undone.`
    : state.kind === "object"
      ? `"${state.key.split("/").pop() || state.key}" will be permanently deleted.`
      : `${state.count} selected files will be permanently deleted.`;
  return (
    <ModalShell label={title} onClose={onClose}>
        <div className="modal-title">{title}</div>
        <p className="modal-desc">{body}</p>
        {state.kind === "bucket" && (
          <label className="check-row">
            <input type="checkbox" checked={state.force} onChange={(e) => onToggleForce(e.target.checked)} />
            <span className="check-copy">
              <span className="check-title">Also delete everything inside</span>
              <span className="check-desc">Empty the bucket first, then delete it. Leave off to delete only an empty bucket.</span>
            </span>
          </label>
        )}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger btn-sm" style={{ padding: "10px 16px", fontSize: "var(--fs-sm)" }} onClick={onConfirm}>Delete</button>
        </div>
    </ModalShell>
  );
}

/* ---------- Modal shell (Escape to close, initial focus) ---------- */

function ModalShell({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>("input, textarea, button.btn-primary, button");
      el?.focus();
    }, 30);
    return () => { window.removeEventListener("keydown", onKey); window.clearTimeout(t); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div ref={ref} className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  );
}

function ModalShellWide({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>("input, textarea, button.btn-primary, button");
      el?.focus();
    }, 30);
    return () => { window.removeEventListener("keydown", onKey); window.clearTimeout(t); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div ref={ref} className="modal modal-wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  );
}

function CreateBucketModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (name: string) => void }) {
  const [val, setVal] = useState("");
  useEffect(() => { if (open) setVal(""); }, [open ]);
  if (!open) return null;
  const valid = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(val.trim());
  return (
    <ModalShell label="Create bucket" onClose={onClose}>
        <div className="modal-title">Create bucket</div>
        <p className="modal-desc">Names must be 3–63 characters, lowercase letters, numbers, dots, and hyphens.</p>
        <div className="field">
          <label className="field-label" htmlFor="new-bucket">Bucket name</label>
          <input id="new-bucket" className="input mono" value={val} onChange={(e) => setVal(e.target.value)} placeholder="my-bucket"
            onKeyDown={(e) => { if (e.key === "Enter" && valid) { onCreate(val.trim()); onClose(); } }} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => { onCreate(val.trim()); onClose(); }}>Create bucket</button>
        </div>
    </ModalShell>
  );
}

function CreateFolderModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (name: string) => void }) {
  const [val, setVal] = useState("");
  useEffect(() => { if (open) setVal(""); }, [open ]);
  if (!open) return null;
  const valid = val.trim().length > 0 && !val.includes("//");
  return (
    <ModalShell label="Create folder" onClose={onClose}>
        <div className="modal-title">New folder</div>
        <p className="modal-desc">Folders are prefixes — a placeholder object keeps the path visible.</p>
        <div className="field">
          <label className="field-label" htmlFor="new-folder">Folder name</label>
          <input id="new-folder" className="input mono" value={val} onChange={(e) => setVal(e.target.value)} placeholder="uploads/2026"
            onKeyDown={(e) => { if (e.key === "Enter" && valid) { onCreate(val.trim()); onClose(); } }} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => { onCreate(val.trim()); onClose(); }}>Create folder</button>
        </div>
    </ModalShell>
  );
}

function UploadModal({ open, onClose, onUpload }: { open: boolean; onClose: () => void; onUpload: (file: File) => void }) {
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => { if (open) setFile(null); }, [open ]);
  if (!open) return null;
  return (
    <ModalShell label="Upload file" onClose={onClose}>
        <div className="modal-title">Upload file</div>
        <p className="modal-desc">The file lands in the folder you're currently viewing.</p>
        <label className="file-drop">
          <span className="icon">{iconUpload}</span>
          {file ? <span className="filename">{file.name} · {(file.size / 1024).toFixed(1)} KB</span> : <span className="prompt">Choose a file or drag it here</span>}
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!file} onClick={() => { if (file) { onUpload(file); onClose(); } }}>Upload</button>
        </div>
    </ModalShell>
  );
}

function PresignModal({ open, onClose, target, result, onGenerate }: { open: boolean; onClose: () => void; target: string; result: string; onGenerate: () => void }) {
  if (!open) return null;
  return (
    <ModalShellWide label="Share via presigned URL" onClose={onClose}>
        <div className="modal-title">Share object</div>
        <p className="modal-desc">Generate a temporary link anyone can use to download — valid for 1 hour.</p>
        <code>{target}</code>
        {result ? (
          <div className="presign-result">
            <textarea readOnly value={result} rows={3} onClick={(e) => (e.target as HTMLTextAreaElement).select()} aria-label="Presigned URL" />
            <div className="modal-actions" style={{ justifyContent: "flex-start" }}>
              <button className="btn btn-primary btn-sm" onClick={() => { navigator.clipboard.writeText(result); }}>Copy link</button>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <div className="modal-actions" style={{ justifyContent: "flex-start" }}>
            <button className="btn btn-primary" onClick={onGenerate}>Generate link</button>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        )}
    </ModalShellWide>
  );
}

function FilePreviewModal({ data, onClose }: { data: DownloadResult | null; onClose: () => void }) {
  if (!data) return null;
  const isImage = data.contentType?.startsWith("image/");
  return (
    <ModalShellWide label="File preview" onClose={onClose}>
        <div className="modal-title" style={{ fontFamily: "var(--font-mono)", fontSize: 14, wordBreak: "break-all" }}>{data.key}</div>
        <div className="preview-meta">
          <span>{data.size.toLocaleString()} bytes</span>
          <span>{data.contentType}</span>
        </div>
        <div className="preview-content">
          {isImage ? (
            <img src={`data:${data.contentType};base64,${data.data}`} alt={data.key} />
          ) : data.isText && data.textContent ? (
            <pre>{data.textContent.slice(0, 10000)}{data.textContent.length > 10000 ? "\n\n… (truncated)" : ""}</pre>
          ) : (
            <p>This file can't be previewed. Download it to view the contents.</p>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
    </ModalShellWide>
  );
}
