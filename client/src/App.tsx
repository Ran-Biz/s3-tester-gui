import { useState, useCallback, useEffect, useRef } from "react";
import ConnectionForm from "./components/ConnectionForm";
import BucketExplorer from "./components/BucketExplorer";
import { api } from "./api";
import type { Connection, S3Error } from "./types";
import {
  loadSettings,
  saveSettings,
  upsertConnection,
  removeConnection as removeStoredConnection,
  loadConnections,
  clearAllConnections,
} from "./storage";
import type { AppSettings, StoredConnection } from "./storage";

const iconBucket = (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 8a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
    <path d="M4 8c0-2 2.5-4 6-4s6 2 6 4" />
  </svg>
);

const iconShield = (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 1.5 13 3.5v4c0 3.5-2.5 5.8-5 7-2.5-1.2-5-3.5-5-7v-4L8 1.5Z" />
    <path d="M6 7.5l1.5 1.5L10.5 6" />
  </svg>
);

export default function App() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [view, setView] = useState<"connections" | "explorer">("connections");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const notifyTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!settings.persistConnections) return;
    const stored = loadConnections();
    if (stored.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const cfg of stored) {
        if (cancelled) break;
        try {
          const result = await api.connect(cfg);
          if (!cancelled) {
            setConnections((prev) => {
              if (prev.some((c) => c.id === result.id)) return prev;
              return [...prev, result];
            });
          }
        } catch {
          // stale credentials — silently skip
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notify = useCallback((message: string, type: "success" | "error") => {
    setNotification({ message, type });
    window.clearTimeout(notifyTimer.current);
    notifyTimer.current = window.setTimeout(() => setNotification(null), 4000);
  }, []);

  const connToStoredRef = useRef<Map<string, StoredConnection>>(new Map());

  const handleConnect = async (config: {
    name: string; endpoint: string; region: string;
    accessKeyId: string; secretAccessKey: string; sessionToken?: string;
    forcePathStyle: boolean; checksumMode?: string;
  }) => {
    try {
      const result = await api.connect(config);
      setConnections((prev) => [...prev, result]);
      setActiveConnectionId(result.id);
      setView("explorer");
      notify(`Connected to "${result.name}" — ${result.bucketCount} buckets found.`, "success");
      if (settings.persistConnections) {
        const stored: StoredConnection = {
          name: config.name,
          endpoint: config.endpoint,
          region: config.region,
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
          sessionToken: config.sessionToken || undefined,
          forcePathStyle: config.forcePathStyle,
          checksumMode: config.checksumMode,
        };
        connToStoredRef.current.set(result.id, stored);
        upsertConnection(stored);
      }
    } catch (err) {
      const e = err as S3Error;
      notify(e.error || "Connection failed", "error");
      throw err;
    }
  };

  const handleDisconnect = async (id: string) => {
    try { await api.disconnect(id); } catch { /* already gone */ }
    const stored = connToStoredRef.current.get(id);
    if (stored && settings.persistConnections) removeStoredConnection(stored);
    connToStoredRef.current.delete(id);
    setConnections((prev) => prev.filter((c) => c.id !== id));
    if (activeConnectionId === id) { setActiveConnectionId(null); setView("connections"); }
    notify("Connection removed.", "success");
  };

  const handleTogglePersist = (enabled: boolean) => {
    setSettings((prev) => ({ ...prev, persistConnections: enabled }));
    if (!enabled) {
      clearAllConnections();
      connToStoredRef.current.clear();
    }
  };

  const handleSelectConnection = (id: string) => {
    setActiveConnectionId(id);
    setView("explorer");
  };

  const handleBack = () => setView("connections");

  const activeConnection = connections.find((c) => c.id === activeConnectionId) ?? null;

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">{iconBucket}</span>
          <span className="brand-name">S3 Tester</span>
          <span className="brand-tag">Console</span>
        </div>
        <div className="header-actions">
          {view === "explorer" && activeConnection && (
            <>
              <div className="status-pill" title={activeConnection.endpoint || "AWS S3"}>
                <span className="dot" />
                <span className="name">{activeConnection.name}</span>
                <span className="endpoint">{activeConnection.endpoint || "s3.amazonaws.com"}</span>
              </div>
              {connections.length > 1 && (
                <select
                  className="conn-switcher"
                  value={activeConnection.id}
                  onChange={(e) => handleSelectConnection(e.target.value)}
                  aria-label="Switch connection"
                >
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
              <button className="btn btn-ghost btn-sm" onClick={handleBack}>All connections</button>
            </>
          )}
        </div>
      </header>

      {notification && (
        <div className={`notification notification-${notification.type}`} role="status">
          <span className="n-dot" />
          <span>{notification.message}</span>
        </div>
      )}

      <main className="app-main">
        {view === "connections" || !activeConnection ? (
          <div className="dash">
            <div className="dash-hero">
              <h1>Connect to object storage</h1>
              <p>Point at any S3-compatible endpoint, verify credentials, and browse buckets — no install, nothing stored on a server.</p>
            </div>
            <div className="dash-grid">
              <section className="card" aria-label="New connection">
                <div className="card-head">
                  <h2>New connection</h2>
                  <p>Pick a provider to prefill sensible defaults, then enter your keys.</p>
                </div>
                <div className="card-body">
                  <ConnectionForm
                    onConnect={handleConnect}
                    persistEnabled={settings.persistConnections}
                    onTogglePersist={handleTogglePersist}
                  />
                </div>
              </section>
              <div className="dash-aside">
                <section className="mini-card" aria-label="Saved connections">
                  <h3>Saved connections ({connections.length})</h3>
                  {connections.length === 0 ? (
                    <p className="empty-mini">Nothing saved yet. Your connections will appear here once you connect.</p>
                  ) : (
                    <div className="conn-list" style={{ marginTop: 10 }}>
                      {connections.map((c) => (
                        <div key={c.id} className="conn-card">
                          <div className="conn-card-top">
                            <span className="name">{c.name}</span>
                            <span className="count-badge">{c.bucketCount} buckets</span>
                          </div>
                          <div className="conn-card-meta">{c.endpoint || "s3.amazonaws.com"} · {c.region}</div>
                          <div className="conn-card-actions">
                            <button className="btn btn-outline btn-sm" onClick={() => handleSelectConnection(c.id)}>Open</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleDisconnect(c.id)}>Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                <section className="mini-card safety-note" aria-label="Safety note">
                  <span className="icon">{iconShield}</span>
                  <div>
                    <h3>Ephemeral by design</h3>
                    <p>Connections live in server memory. Restart the server and everything is gone — unless you enable browser storage on the form.</p>
                  </div>
                </section>
                <section className="mini-card" aria-label="How it works">
                  <h3>What you can do next</h3>
                  <ol>
                    <li>Connect with an access key</li>
                    <li>Pick a bucket from the sidebar</li>
                    <li>Upload, preview, or share objects</li>
                  </ol>
                </section>
              </div>
            </div>
          </div>
        ) : (
          <BucketExplorer
            connectionId={activeConnection.id}
            connectionName={activeConnection.name}
            endpoint={activeConnection.endpoint}
            onNotify={notify}
          />
        )}
      </main>
    </div>
  );
}
