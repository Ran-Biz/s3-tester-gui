import { useState, useCallback } from "react";
import ConnectionForm from "./components/ConnectionForm";
import BucketExplorer from "./components/BucketExplorer";
import { api } from "./api";
import type { Connection, S3Error } from "./types";

type View = "connections" | "explorer";

const iconBucket = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 8a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
    <path d="M4 8c0-2 2.5-4 6-4s6 2 6 4" />
  </svg>
);

const iconX = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M2 2l8 8M10 2L2 10" />
  </svg>
);

const iconBand = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="7" cy="7" r="5" />
    <circle cx="7" cy="7" r="1.5" />
  </svg>
);

export default function App() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [view, setView] = useState<View>("connections");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const notify = useCallback((message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

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
      notify(`Connected! Found ${result.bucketCount} buckets.`, "success");
    } catch (err) {
      const e = err as S3Error;
      notify(e.error || "Connection failed", "error");
    }
  };

  const handleDisconnect = async (id: string) => {
    await api.disconnect(id);
    setConnections((prev) => prev.filter((c) => c.id !== id));
    if (activeConnectionId === id) { setActiveConnectionId(null); setView("connections"); }
  };

  const handleSelectConnection = (id: string) => {
    setActiveConnectionId(id); setView("explorer"); setSidebarOpen(false);
  };

  const handleBack = () => setView("connections");

  const activeConnection = connections.find((c) => c.id === activeConnectionId);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">{iconBucket}</span>
          <span className="brand-name">S3 Tester</span>
          <span className="brand-sub">Signal Analysis</span>
        </div>
        <div className="header-actions">
          {view === "explorer" && activeConnection && (
            <>
              <div className="tuned-readout">
                <span className="dot" />
                <span className="tuned-name">{activeConnection.name}</span>
                <span className="tuned-sep">&middot;</span>
                <span className="tuned-endpoint">{activeConnection.endpoint || "s3.amazonaws.com"}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleBack}>&larr; Connections</button>
            </>
          )}
        </div>
      </header>

      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}

      <main className="app-main">
        {view === "connections" ? (
          <div className="workspace">
            <aside className={`channel-bank${sidebarOpen ? " open" : ""}`}>
              <div className="bank-head">
                <span className="bank-title">Channels</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-micro)", color: "var(--ink-4)", fontVariantNumeric: "tabular-nums" }}>{connections.length}</span>
              </div>
              <div className="bank-body">
                {connections.length === 0 && <p className="text-muted">No channels tuned.</p>}
                {connections.map((c) => (
                  <button key={c.id} className={`freq-band${c.id === activeConnectionId ? " active" : ""}`} onClick={() => handleSelectConnection(c.id)}>
                    <div className="freq-top">
                      <span className="freq-icon">{iconBand}</span>
                      <span className="freq-name">{c.name}</span>
                      <span className="freq-del" onClick={(e) => { e.stopPropagation(); handleDisconnect(c.id); }} title="Remove channel">{iconX}</span>
                    </div>
                    <div className="freq-meta">
                      <span className="val">{c.bucketCount} buckets</span>
                      <span className="sep">&middot;</span>
                      <span>{c.endpoint || "AWS S3"}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="bank-foot"><span className="panel-label">Calibrate below</span></div>
            </aside>
            <div className="bay">
              <div className="bay-scroll"><div className="bay-narrow"><ConnectionForm onConnect={handleConnect} /></div></div>
            </div>
          </div>
        ) : (
          <div className="workspace">
            <aside className="channel-bank">
              <div className="bank-head"><span className="bank-title">Channels</span></div>
              <div className="bank-body">
                {connections.map((c) => (
                  <button key={c.id} className={`freq-band${c.id === activeConnection!.id ? " active" : ""}`} onClick={() => handleSelectConnection(c.id)}>
                    <div className="freq-top">
                      <span className="freq-icon">{iconBand}</span>
                      <span className="freq-name">{c.name}</span>
                      <span className="freq-del" onClick={(e) => { e.stopPropagation(); handleDisconnect(c.id); }} title="Remove channel">{iconX}</span>
                    </div>
                    <div className="freq-meta"><span className="val">{c.bucketCount} buckets</span></div>
                  </button>
                ))}
              </div>
            </aside>
            <div className="bay">
              <BucketExplorer connectionId={activeConnection!.id} connectionName={activeConnection!.name} onNotify={notify} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
