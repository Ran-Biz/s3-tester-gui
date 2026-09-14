import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../api";

interface Props {
  connectionId: string;
  bucketName: string;
  endpoint?: string;
  onNotify: (message: string, type: "success" | "error") => void;
}

interface BlogAsset {
  key: string;
  name: string;
  contentType: string;
  size: number;
}

interface BlogPost {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  assets: BlogAsset[];
  /** storage key of the post JSON, e.g. blog/posts/abc.json */
  _key: string;
}

const POSTS_PREFIX = "blog/posts/";
const ASSETS_PREFIX = "blog/assets/";

const iconPen = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2.5 11.5 4.5 5 11H3V9L9.5 2.5Z" />
    <path d="M8.5 3.5 10.5 5.5" />
  </svg>
);
const iconImage = (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="12" height="10" rx="1.5" />
    <circle cx="6" cy="7" r="1.2" />
    <path d="M2.5 12.5 6.5 8.5l3 3 2-2 2 2" />
  </svg>
);
const iconVideo = (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="12" height="8" rx="1.5" />
    <path d="M6.5 7v2l1.8-1L6.5 7Z" fill="currentColor" stroke="none" />
  </svg>
);
const iconFile = (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6l-4-4Z" />
    <path d="M9 2v4h4" />
  </svg>
);
const iconTrash = (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4h9M5 4V2.5A.5.5 0 0 1 5.5 2h2a.5.5 0 0 1 .5.5V4M4 6v5a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V6" />
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
const iconX = (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
    <path d="M3 3l7 7M10 3 3 10" />
  </svg>
);
const iconUpload = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 10V3M4 6l3-3 3 3M2 11v1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" />
  </svg>
);

function guessType(name: string, contentType: string): string {
  if (contentType) return contentType;
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "avif", "svg", "bmp"].includes(ext))
    return `image/${ext === "jpg" ? "jpeg" : ext}`;
  if (["mp4", "webm", "ogv", "mov"].includes(ext)) return `video/${ext === "mov" ? "quicktime" : ext}`;
  if (["mp3", "wav", "ogg", "m4a"].includes(ext)) return `audio/${ext}`;
  if (ext === "pdf") return "application/pdf";
  return "application/octet-stream";
}

const isImage = (ct: string) => ct.startsWith("image/");
const isVideo = (ct: string) => ct.startsWith("video/");
const isAudio = (ct: string) => ct.startsWith("audio/");

function formatSize(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

function formatDate(iso: string): string {
  try {
    const dt = new Date(iso);
    return (
      dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
      ", " +
      dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    );
  } catch {
    return iso;
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID().slice(0, 8);
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default function MiniBlog({ connectionId, bucketName, onNotify }: Props) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [urlCache, setUrlCache] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listObjects(connectionId, bucketName, POSTS_PREFIX);
      const jsonFiles = list.items.filter((o) => o.type === "file" && o.key.endsWith(".json"));
      const results = await Promise.allSettled(
        jsonFiles.map(async (f) => {
          const dl = await api.downloadObject(connectionId, bucketName, f.key);
          const text = dl.textContent ?? (dl.data ? atob(dl.data) : "");
          // download endpoint base64-encodes; textContent is utf-8 for json content-type,
          // but our post JSON is uploaded as application/json so textContent is set.
          // Fallback: decode base64 manually.
          let raw = text;
          if (!raw && dl.data) {
            try {
              const bin = atob(dl.data);
              const bytes = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
              raw = new TextDecoder().decode(bytes);
            } catch {
              raw = "";
            }
          }
          const parsed = JSON.parse(raw);
          const post: BlogPost = {
            id: parsed.id,
            title: parsed.title ?? "Untitled",
            body: parsed.body ?? "",
            createdAt: parsed.createdAt ?? new Date().toISOString(),
            updatedAt: parsed.updatedAt ?? parsed.createdAt ?? new Date().toISOString(),
            assets: Array.isArray(parsed.assets) ? parsed.assets : [],
            _key: f.key,
          };
          return post;
        })
      );
      const ok: BlogPost[] = [];
      for (const r of results) if (r.status === "fulfilled" && r.value?.id) ok.push(r.value);
      ok.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      setPosts(ok);
    } catch (err: any) {
      onNotify(err.error || "Couldn't load blog posts.", "error");
      setPosts([]);
    }
    setLoading(false);
  }, [connectionId, bucketName, onNotify]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Lazily resolve presigned URLs for all assets so images/videos stream
  // straight from S3 (a real-world read path) instead of base64.
  useEffect(() => {
    const missing = new Set<string>();
    for (const p of posts) for (const a of p.assets) if (!urlCache[a.key]) missing.add(a.key);
    if (missing.size === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.allSettled(
        Array.from(missing).map(async (key) => {
          const r = await api.presignUrl(connectionId, bucketName, key, "getObject", 3600);
          return [key, r.url] as const;
        })
      );
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const e of entries) if (e.status === "fulfilled") next[e.value[0]] = e.value[1];
      if (Object.keys(next).length) setUrlCache((prev) => ({ ...prev, ...next }));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, connectionId, bucketName]);

  const handleDelete = async (post: BlogPost) => {
    setDeletingId(post.id);
    try {
      const keys = [post._key, ...post.assets.map((a) => a.key)];
      await api.deleteMultipleObjects(connectionId, bucketName, keys);
      onNotify(`Deleted "${post.title}".`, "success");
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch (err: any) {
      onNotify(err.error || "Couldn't delete post.", "error");
    }
    setDeletingId(null);
  };

  const handleDownloadAsset = async (asset: BlogAsset) => {
    try {
      const r = await api.downloadObject(connectionId, bucketName, asset.key);
      const bc = atob(r.data);
      const bn = new Array(bc.length);
      for (let i = 0; i < bc.length; i++) bn[i] = bc.charCodeAt(i);
      const blob = new Blob([new Uint8Array(bn)], { type: guessType(asset.name, asset.contentType) });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = asset.name;
      a.click();
      URL.revokeObjectURL(url);
      onNotify("Download started.", "success");
    } catch (err: any) {
      onNotify(err.error || "Download failed.", "error");
    }
  };

  const handleCopyLink = async (asset: BlogAsset) => {
    try {
      let url = urlCache[asset.key];
      if (!url) {
        const r = await api.presignUrl(connectionId, bucketName, asset.key, "getObject", 3600);
        url = r.url;
        setUrlCache((prev) => ({ ...prev, [asset.key]: url as string }));
      }
      await navigator.clipboard.writeText(url);
      onNotify("Share link copied (valid 1 hour).", "success");
    } catch {
      onNotify("Couldn't copy link.", "error");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) => p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q)
    );
  }, [posts, search]);

  const totalAssets = posts.reduce((n, p) => n + p.assets.length, 0);

  return (
    <div className="blog">
      <div className="blog-hero">
        <div className="blog-hero-text">
          <h2>Mini blog — real-world bucket test</h2>
          <p>
            Posts and uploads live entirely in this bucket under <code>blog/</code> — no database.
            Write a post, attach photos or videos, then read it back exactly like a production app would.
          </p>
          <div className="blog-stats">
            <span>
              <strong>{posts.length}</strong> post{posts.length === 1 ? "" : "s"}
            </span>
            <span className="sep">·</span>
            <span>
              <strong>{totalAssets}</strong> asset{totalAssets === 1 ? "" : "s"}
            </span>
            <span className="sep">·</span>
            <span className="mono">blog/posts/ + blog/assets/</span>
          </div>
        </div>
        <div className="blog-hero-actions">
          <button className="btn btn-outline btn-sm" onClick={loadPosts} disabled={loading}>
            Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowComposer(true)}>
            {iconPen} New post
          </button>
        </div>
      </div>

      {posts.length > 1 && (
        <div className="filter-box blog-filter">
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts…"
            aria-label="Search posts"
          />
        </div>
      )}

      {loading ? (
        <div className="table-card">
          <div className="empty-state">
            <p>Loading posts from <span className="mono">blog/posts/</span>…</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="table-card">
          <div className="empty-state">
            <span className="empty-icon">{iconPen}</span>
            <h2>{search ? "No posts match" : "No blog posts yet"}</h2>
            <p>
              {search
                ? `Nothing matches "${search}". Try a different search.`
                : "Write your first post to prove this bucket can back a real app — text plus file uploads, served back with previews."}
            </p>
            {!search && (
              <div className="empty-actions">
                <button className="btn btn-primary btn-sm" onClick={() => setShowComposer(true)}>
                  {iconPen} Write first post
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="blog-feed">
          {filtered.map((post) => (
            <article key={post.id} className="card blog-card">
              <div className="blog-card-head">
                <div className="blog-card-title">
                  <h3>{post.title}</h3>
                  <div className="blog-meta">
                    <span>{formatDate(post.createdAt)}</span>
                    {post.assets.length > 0 && (
                      <>
                        <span className="sep">·</span>
                        <span>
                          {post.assets.length} attachment{post.assets.length === 1 ? "" : "s"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  className="btn-icon danger"
                  title={`Delete "${post.title}"`}
                  aria-label={`Delete "${post.title}"`}
                  disabled={deletingId === post.id}
                  onClick={() => handleDelete(post)}
                >
                  {iconTrash}
                </button>
              </div>

              {post.body && <p className="blog-body">{post.body}</p>}

              {post.assets.length > 0 && (
                <div className="blog-assets">
                  {/* Inline previews: images + playable video/audio */}
                  {post.assets.filter((a) => isImage(guessType(a.name, a.contentType))).length > 0 && (
                    <div className="blog-gallery">
                      {post.assets
                        .filter((a) => isImage(guessType(a.name, a.contentType)))
                        .map((a) => {
                          const src = urlCache[a.key];
                          return (
                            <a
                              key={a.key}
                              className="blog-photo"
                              href={src || "#"}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => {
                                if (!src) e.preventDefault();
                              }}
                              title={a.name}
                            >
                              {src ? (
                                <img src={src} alt={a.name} loading="lazy" />
                              ) : (
                                <span className="blog-media-loading">{iconImage} Loading…</span>
                              )}
                              <span className="blog-photo-name">{a.name}</span>
                            </a>
                          );
                        })}
                    </div>
                  )}

                  {post.assets
                    .filter((a) => isVideo(guessType(a.name, a.contentType)))
                    .map((a) => {
                      const src = urlCache[a.key];
                      return (
                        <div key={a.key} className="blog-media">
                          <div className="blog-media-label">
                            {iconVideo} <span>{a.name}</span>
                            <span className="blog-media-size">{formatSize(a.size)}</span>
                          </div>
                          {src ? (
                            <video src={src} controls preload="metadata" playsInline />
                          ) : (
                            <div className="blog-media-loading">Resolving share link…</div>
                          )}
                          <AssetActions
                            asset={a}
                            onDownload={() => handleDownloadAsset(a)}
                            onCopy={() => handleCopyLink(a)}
                          />
                        </div>
                      );
                    })}

                  {post.assets
                    .filter((a) => isAudio(guessType(a.name, a.contentType)))
                    .map((a) => {
                      const src = urlCache[a.key];
                      return (
                        <div key={a.key} className="blog-media blog-audio">
                          <div className="blog-media-label">
                            {iconVideo} <span>{a.name}</span>
                            <span className="blog-media-size">{formatSize(a.size)}</span>
                          </div>
                          {src ? (
                            <audio src={src} controls preload="metadata" />
                          ) : (
                            <div className="blog-media-loading">Resolving share link…</div>
                          )}
                          <AssetActions
                            asset={a}
                            onDownload={() => handleDownloadAsset(a)}
                            onCopy={() => handleCopyLink(a)}
                          />
                        </div>
                      );
                    })}

                  {/* Everything else: file card with download + share */}
                  {post.assets.filter(
                    (a) => {
                      const ct = guessType(a.name, a.contentType);
                      return !isImage(ct) && !isVideo(ct) && !isAudio(ct);
                    }
                  ).length > 0 && (
                    <div className="blog-files">
                      {post.assets
                        .filter((a) => {
                          const ct = guessType(a.name, a.contentType);
                          return !isImage(ct) && !isVideo(ct) && !isAudio(ct);
                        })
                        .map((a) => (
                          <div key={a.key} className="blog-file">
                            <span className="blog-file-icon">{iconFile}</span>
                            <span className="blog-file-text">
                              <span className="blog-file-name">{a.name}</span>
                              <span className="blog-file-meta">
                                {formatSize(a.size)} · {guessType(a.name, a.contentType)}
                              </span>
                            </span>
                            <span className="blog-file-actions">
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => handleDownloadAsset(a)}
                                title={`Download ${a.name}`}
                              >
                                {iconDownload} Download
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleCopyLink(a)}
                                title={`Copy share link for ${a.name}`}
                              >
                                {iconLink} Share
                              </button>
                            </span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Download/share for previewable media too */}
                  {post.assets.filter((a) => {
                    const ct = guessType(a.name, a.contentType);
                    return isImage(ct);
                  }).length > 0 && (
                    <div className="blog-files blog-files-compact">
                      {post.assets
                        .filter((a) => isImage(guessType(a.name, a.contentType)))
                        .map((a) => (
                          <div key={a.key} className="blog-file blog-file-compact">
                            <span className="blog-file-text">
                              <span className="blog-file-name">{a.name}</span>
                              <span className="blog-file-meta">{formatSize(a.size)}</span>
                            </span>
                            <span className="blog-file-actions">
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleDownloadAsset(a)}
                                title={`Download ${a.name}`}
                              >
                                {iconDownload}
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleCopyLink(a)}
                                title={`Copy share link for ${a.name}`}
                              >
                                {iconLink}
                              </button>
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {showComposer && (
        <Composer
          connectionId={connectionId}
          bucketName={bucketName}
          onClose={() => setShowComposer(false)}
          onPublished={(post) => {
            setPosts((prev) => [post, ...prev]);
            setShowComposer(false);
          }}
          onNotify={onNotify}
        />
      )}
    </div>
  );
}

function AssetActions({ onDownload, onCopy }: { asset: BlogAsset; onDownload: () => void; onCopy: () => void }) {
  return (
    <div className="blog-media-actions">
      <button className="btn btn-outline btn-sm" onClick={onDownload}>
        {iconDownload} Download
      </button>
      <button className="btn btn-ghost btn-sm" onClick={onCopy}>
        {iconLink} Copy share link
      </button>
    </div>
  );
}

/* ---------------- Composer ---------------- */

function Composer({
  connectionId,
  bucketName,
  onClose,
  onPublished,
  onNotify,
}: {
  connectionId: string;
  bucketName: string;
  onClose: () => void;
  onPublished: (post: BlogPost) => void;
  onNotify: Props["onNotify"];
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !publishing) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, publishing]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 10));
  };

  const valid = title.trim().length > 0 && body.trim().length > 0 && !publishing;

  const handlePublish = async () => {
    if (!valid) return;
    setPublishing(true);
    const id = newId();
    try {
      // 1. Upload assets first so the post JSON can reference real keys.
      const assets: BlogAsset[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setProgress(`Uploading attachment ${i + 1} of ${files.length}…`);
        const res = await api.uploadFile(connectionId, bucketName, f, `${ASSETS_PREFIX}${id}`, f.size > 8 * 1024 * 1024);
        assets.push({
          key: res.key,
          name: f.name,
          contentType: f.type || guessType(f.name, ""),
          size: f.size,
        });
      }
      // 2. Save the post itself as JSON.
      setProgress("Saving post…");
      const now = new Date().toISOString();
      const payload = {
        id,
        title: title.trim(),
        body: body.trim(),
        createdAt: now,
        updatedAt: now,
        assets,
      };
      const jsonFile = new File([JSON.stringify(payload, null, 2)], `${id}.json`, {
        type: "application/json",
      });
      const saved = await api.uploadFile(connectionId, bucketName, jsonFile, POSTS_PREFIX.replace(/\/$/, ""));
      onNotify(`Published "${payload.title}" with ${assets.length} attachment${assets.length === 1 ? "" : "s"}.`, "success");
      onPublished({ ...payload, _key: saved.key });
    } catch (err: any) {
      onNotify(err.error || "Couldn't publish post.", "error");
    }
    setPublishing(false);
    setProgress("");
  };

  return (
    <div className="modal-overlay" onClick={() => !publishing && onClose()}>
      <div
        className="modal modal-wide blog-composer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="New blog post"
      >
        <div className="modal-title">New post</div>
        <p className="modal-desc">
          Stored as <code style={{ display: "inline", padding: "1px 6px" }}>blog/posts/&lt;id&gt;.json</code> with
          attachments under <code style={{ display: "inline", padding: "1px 6px" }}>blog/assets/&lt;id&gt;/</code>.
        </p>
        <div className="field">
          <label className="field-label" htmlFor="blog-title">
            Title
          </label>
          <input
            id="blog-title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="A day testing this bucket"
            maxLength={120}
            disabled={publishing}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="blog-body">
            Body
          </label>
          <textarea
            id="blog-body"
            className="input blog-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write something… line breaks are preserved when reading back."
            rows={6}
            disabled={publishing}
          />
        </div>
        <div className="field">
          <span className="field-label">
            Attachments <span className="opt">optional · up to 10</span>
          </span>
          <label className="file-drop blog-drop">
            <span className="icon">{iconUpload}</span>
            <span className="prompt">Choose photos, videos, or any files — or drag them here</span>
            <span className="field-hint">Images render inline · videos &amp; audio get players · everything else gets a download button</span>
            <input type="file" multiple onChange={(e) => addFiles(e.target.files)} disabled={publishing} />
          </label>
          {files.length > 0 && (
            <div className="blog-picked">
              {files.map((f, i) => {
                const ct = f.type || guessType(f.name, "");
                const kind = isImage(ct) ? "Image" : isVideo(ct) ? "Video" : isAudio(ct) ? "Audio" : "File";
                return (
                  <div key={`${f.name}-${i}`} className="blog-picked-row">
                    <span className="blog-picked-icon">{kind === "Image" ? iconImage : kind === "Video" ? iconVideo : iconFile}</span>
                    <span className="blog-picked-text">
                      <span className="blog-picked-name">{f.name}</span>
                      <span className="blog-picked-meta">
                        {kind} · {formatSize(f.size)}
                      </span>
                    </span>
                    <button
                      className="btn-icon"
                      aria-label={`Remove ${f.name}`}
                      disabled={publishing}
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    >
                      {iconX}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {progress && <div className="blog-progress">{progress}</div>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={publishing}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!valid} onClick={handlePublish}>
            {publishing ? "Publishing…" : `Publish${files.length ? ` with ${files.length} file${files.length === 1 ? "" : "s"}` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
