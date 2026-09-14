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

const iconPlus = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M7 2v10M2 7h10" />
  </svg>
);

const iconX = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M3 3l8 8M11 3L3 11" />
  </svg>
);

const iconArrow = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 7h9M8 3.5 11.5 7 8 10.5" />
  </svg>
);

export default function App() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [view, setView] = useState<"connections" | "explorer">("connections");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [showAddForm, setShowAddForm] = useState(false);
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
      setShowAddForm(false);
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

  useEffect(() => {
    if (!showAddForm) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowAddForm(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAddForm]);

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
          <div className="dash dash-home">
            <div className="dash-hero home-hero">
              <div>
                <h1>Connections</h1>
                <p>Pick a saved connection to browse, or add a new one. Connections live in server memory — restart the server and they're gone, unless you enable browser storage when adding.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>{iconPlus} Add connection</button>
            </div>
            {connections.length === 0 ? (
              <div className="card home-empty">
                <div className="card-body home-empty-body">
                  <span className="empty-icon">{iconBucket}</span>
                  <h2>No connections yet</h2>
                  <p>Add your first connection to start browsing buckets. It takes under 30 seconds.</p>
                  <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>{iconPlus} Add connection</button>
                </div>
              </div>
            ) : (
              <div className="home-list" role="list" aria-label="Saved connections">
                {connections.map((c) => (
                  <div key={c.id} className="card home-conn" role="listitem">
                    <button className="home-conn-main" onClick={() => handleSelectConnection(c.id)} aria-label={`Open ${c.name}`}>
                      <span className="home-conn-icon">{iconBucket}</span>
                      <span className="home-conn-text">
                        <span className="home-conn-name">{c.name}</span>
                        <span className="home-conn-meta">{c.endpoint || "s3.amazonaws.com"} · {c.region} · {c.bucketCount} bucket{c.bucketCount === 1 ? "" : "s"}</span>
                      </span>
                      <span className="home-conn-open">{iconArrow}<span>Open</span></span>
                    </button>
                    <button className="btn btn-ghost btn-sm home-conn-remove" onClick={() => handleDisconnect(c.id)} aria-label={`Remove ${c.name}`}>Remove</button>
                  </div>
                ))}
              </div>
            )}
            {showAddForm && (
              <div className="sheet-overlay" onClick={() => setShowAddForm(false)}>
                <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Add connection">
                  <div className="sheet-head">
                    <div>
                      <h2>New connection</h2>
                      <p>Pick a provider to prefill defaults, then enter your keys.</p>
                    </div>
                    <button className="btn-icon" onClick={() => setShowAddForm(false)} aria-label="Close">{iconX}</button>
                  </div>
                  <div className="sheet-body">
                    <ConnectionForm
                      onConnect={handleConnect}
                      persistEnabled={settings.persistConnections}
                      onTogglePersist={handleTogglePersist}
                    />
                  </div>
                </div>
              </div>
            )}
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
