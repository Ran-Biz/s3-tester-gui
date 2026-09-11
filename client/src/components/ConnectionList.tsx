import type { Connection } from "../types";

interface Props {
  connections: Connection[];
  onSelect: (id: string) => void;
  onDisconnect: (id: string) => void;
}

export default function ConnectionList({ connections, onSelect, onDisconnect }: Props) {
  return (
    <div className="card connection-list">
      <h2>Saved Connections</h2>
      {connections.length === 0 ? (
        <p className="text-muted">No connections yet. Add one above.</p>
      ) : (
        <div className="conn-grid">
          {connections.map((c) => (
            <div key={c.id} className="conn-card">
              <div className="conn-card-header">
                <h3>{c.name}</h3>
                <button className="btn btn-xs btn-danger" onClick={() => onDisconnect(c.id)}>
                  ✕
                </button>
              </div>
              <div className="conn-card-body">
                <div className="conn-detail">
                  <span className="label">Endpoint:</span>
                  <span>{c.endpoint || "AWS S3 (default)"}</span>
                </div>
                <div className="conn-detail">
                  <span className="label">Region:</span>
                  <span>{c.region}</span>
                </div>
                <div className="conn-detail">
                  <span className="label">Buckets:</span>
                  <span>{c.bucketCount}</span>
                </div>
              </div>
              <button className="btn btn-primary btn-full btn-sm" onClick={() => onSelect(c.id)}>
                Open Explorer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}