import { useState, useCallback } from "react";
import ConnectionForm from "./components/ConnectionForm";
import ConnectionList from "./components/ConnectionList";
import BucketExplorer from "./components/BucketExplorer";
import { api } from "./api";
import type { Connection, S3Error } from "./types";

type View = "connections" | "explorer";

export default function App() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [view, setView] = useState<View>("connections");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const notify = useCallback((message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const handleConnect = async (config: {
    name: string;
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    forcePathStyle: boolean;
    checksumMode?: string;
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
    if (activeConnectionId === id) {
      setActiveConnectionId(null);
      setView("connections");
    }
  };

  const handleSelectConnection = (id: string) => {
    setActiveConnectionId(id);
    setView("explorer");
  };

  const handleBack = () => {
    setView("connections");
  };

  const activeConnection = connections.find((c) => c.id === activeConnectionId);

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <span className="logo">🪣</span> S3 Compatibility Tester
        </h1>
        <div className="header-actions">
          {view === "explorer" && activeConnection && (
            <>
              <span className="connection-badge" title={`${activeConnection.endpoint || "AWS"} — ${activeConnection.region}`}>
                🔗 {activeConnection.name}
              </span>
              <button className="btn btn-sm btn-outline" onClick={handleBack}>
                ← Connections
              </button>
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
        {view === "connections" && (
          <div className="connections-page">
            <ConnectionForm onConnect={handleConnect} />
            {connections.length > 0 && (
              <ConnectionList
                connections={connections}
                onSelect={handleSelectConnection}
                onDisconnect={handleDisconnect}
              />
            )}
          </div>
        )}

        {view === "explorer" && activeConnection && (
          <BucketExplorer
            connectionId={activeConnection.id}
            connectionName={activeConnection.name}
            onNotify={notify}
          />
        )}
      </main>
    </div>
  );
}