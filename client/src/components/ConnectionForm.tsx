import { useState, FormEvent } from "react";

interface Props {
  onConnect: (config: {
    name: string;
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    forcePathStyle: boolean;
    checksumMode?: string;
  }) => void;
  persistEnabled: boolean;
  onTogglePersist: (enabled: boolean) => void;
}

const PRESETS = [
  { label: "AWS S3", endpoint: "", region: "us-east-1", pathStyle: false, checksum: "supported" },
  { label: "MinIO", endpoint: "http://localhost:9000", region: "us-east-1", pathStyle: true, checksum: "compatible" },
  { label: "Cloudflare R2", endpoint: "", region: "auto", pathStyle: false, checksum: "compatible" },
  { label: "DigitalOcean Spaces", endpoint: "", region: "nyc3", pathStyle: false, checksum: "compatible" },
  { label: "Backblaze B2", endpoint: "", region: "us-west-004", pathStyle: true, checksum: "supported" },
];

const iconSignal = (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 7.5h3l2-4 2 8 2-6 1.5 2H14" />
  </svg>
);

const iconEye = (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1.5 7.5S3.8 3.5 7.5 3.5 13.5 7.5 13.5 7.5 11.2 11.5 7.5 11.5 1.5 7.5 1.5 7.5Z" />
    <circle cx="7.5" cy="7.5" r="1.75" />
  </svg>
);

const iconEyeOff = (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 2l11 11M6.3 6.4a1.75 1.75 0 0 0 2.4 2.4M4.2 4.4C2.6 5.5 1.5 7.5 1.5 7.5s2.3 4 6 4c1 0 1.9-.3 2.6-.8M6.2 3.7A6 6 0 0 1 7.5 3.5c3.7 0 6 4 6 4a12 12 0 0 1-2 2.4" />
  </svg>
);

export default function ConnectionForm({ onConnect, persistEnabled, onTogglePersist }: Props) {
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [forcePathStyle, setForcePathStyle] = useState(true);
  const [checksumMode, setChecksumMode] = useState("compatible");
  const [showToken, setShowToken] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePreset = (preset: (typeof PRESETS)[0]) => {
    setEndpoint(preset.endpoint);
    setRegion(preset.region);
    setForcePathStyle(preset.pathStyle);
    setChecksumMode(preset.checksum ?? "compatible");
    setActivePreset(preset.label);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onConnect({
      name: name || endpoint || "AWS S3",
      endpoint, region, accessKeyId, secretAccessKey,
      sessionToken: sessionToken || undefined,
      forcePathStyle, checksumMode,
    });
    setLoading(false);
  };

  return (
    <div className="panel connection-form">
      <div className="panel-head">
        <span className="panel-title">
          <span className="icon">{iconSignal}</span>
          Channel Calibration
        </span>
        <span className="panel-label">Credentials</span>
      </div>
      {loading && <div className="yield-bar" style={{ borderRadius: 0 }} />}
      <div className="panel-body">
        <p className="panel-intro">
          Tune into any S3-compatible endpoint. When session memory is on,
          credentials persist in browser storage across restarts. Turn it off
          to keep everything in session memory only &mdash; no trace left behind.
        </p>

        <div className="preset-rack">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className={`preset-chip${activePreset === p.label ? " on" : ""}`}
              onClick={() => handlePreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="calib-grid">
          <div className="field-row">
            <div className="field">
              <label className="field-label" htmlFor="cn-name">Connection Name</label>
              <input id="cn-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-minio" />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="cn-region">Region</label>
              <input id="cn-region" className="input" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="us-east-1" />
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="cn-endpoint">Custom Endpoint URL</label>
            <input
              id="cn-endpoint"
              className="input"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://s3.amazonaws.com"
            />
            <span className="field-hint">Leave empty for AWS S3. Use http://host:port for local/MinIO.</span>
          </div>

          <div className="field-row">
            <div className="field">
              <label className="field-label" htmlFor="cn-key">Access Key ID <span className="req">*</span></label>
              <input id="cn-key" className="input" value={accessKeyId} onChange={(e) => setAccessKeyId(e.target.value)} placeholder="AKIA..." required />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="cn-secret">Secret Access Key <span className="req">*</span></label>
              <div className="input-with-action">
                <input
                  id="cn-secret"
                  className="input"
                  type={showToken ? "text" : "password"}
                  value={secretAccessKey}
                  onChange={(e) => setSecretAccessKey(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
                <span className="input-action">
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => setShowToken(!showToken)}
                    aria-label={showToken ? "Hide secret" : "Show secret"}
                  >
                    {showToken ? iconEyeOff : iconEye}
                  </button>
                </span>
              </div>
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="cn-token">Session Token <span style={{ textTransform: "none", letterSpacing: 0, color: "var(--ink-4)" }}>(optional)</span></label>
            <input id="cn-token" className="input" value={sessionToken} onChange={(e) => setSessionToken(e.target.value)} placeholder="temporary credentials only" />
          </div>

          <div className="field">
            <label className="field-label">Addressing &amp; Integrity</label>
            <label className="toggle-row">
              <input type="checkbox" checked={forcePathStyle} onChange={(e) => setForcePathStyle(e.target.checked)} />
              <span className="toggle-copy">
                <span className="toggle-title">Force path-style addressing</span>
                <span className="toggle-desc">Required for MinIO, Ceph, and most S3-compatible services. Disable for AWS S3.</span>
              </span>
            </label>
          </div>

          <div className="field">
            <label className="field-label">Checksum Compatibility</label>
            <div className="radio-stack">
              <label className={`radio-card${checksumMode === "compatible" ? " on" : ""}`}>
                <input type="radio" name="checksumMode" value="compatible" checked={checksumMode === "compatible"} onChange={() => setChecksumMode("compatible")} />
                <span className="radio-copy">
                  <span className="name">Compatible</span>
                  <span className="desc">Skips optional checksum headers &mdash; safer for non-AWS S3 (MinIO, Ceph, R2)</span>
                </span>
              </label>
              <label className={`radio-card${checksumMode === "supported" ? " on" : ""}`}>
                <input type="radio" name="checksumMode" value="supported" checked={checksumMode === "supported"} onChange={() => setChecksumMode("supported")} />
                <span className="radio-copy">
                  <span className="name">Full integrity (AWS S3)</span>
                  <span className="desc">Enables CRC32 checksum validation on uploads &mdash; AWS S3 only</span>
                </span>
              </label>
            </div>
          </div>

          <div className="field">
            <label className="field-label">Session Memory</label>
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={persistEnabled}
                onChange={(e) => onTogglePersist(e.target.checked)}
              />
              <span className="toggle-copy">
                <span className="toggle-title">Remember connections in browser storage</span>
                <span className="toggle-desc">
                  When enabled, connection details (including credentials) are saved to
                  localStorage so they survive page refreshes and browser restarts.
                  Disable to keep everything in session memory only &mdash; no trace left behind.
                </span>
              </span>
            </label>
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
            {loading ? "Calibrating\u2026" : "Connect & Test"}
          </button>
        </form>
      </div>
    </div>
  );
}
