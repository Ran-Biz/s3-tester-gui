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
    bucketName?: string;
  }) => Promise<void> | void;
  persistEnabled: boolean;
  onTogglePersist: (enabled: boolean) => void;
}

const PRESETS = [
  { label: "AWS S3", desc: "s3.amazonaws.com", endpoint: "", region: "us-east-1", pathStyle: false, checksum: "supported" },
  { label: "MinIO", desc: "Local · localhost:9000", endpoint: "http://localhost:9000", region: "us-east-1", pathStyle: true, checksum: "compatible" },
  { label: "Cloudflare R2", desc: "Custom endpoint", endpoint: "", region: "auto", pathStyle: true, checksum: "compatible" },
  { label: "DigitalOcean", desc: "Spaces · nyc3", endpoint: "", region: "nyc3", pathStyle: false, checksum: "compatible" },
  { label: "Backblaze B2", desc: "S3-compatible", endpoint: "", region: "us-west-004", pathStyle: true, checksum: "supported" },
  { label: "Custom", desc: "Any endpoint", endpoint: "", region: "us-east-1", pathStyle: true, checksum: "compatible" },
];

const iconCheck = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 6.5 4.8 9 10 3.5" />
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

const iconChevron = (
  <svg className="chev" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5l4 4 4-4" />
  </svg>
);

export default function ConnectionForm({ onConnect, persistEnabled, onTogglePersist }: Props) {
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [bucketName, setBucketName] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [forcePathStyle, setForcePathStyle] = useState(true);
  const [checksumMode, setChecksumMode] = useState("compatible");
  const [showSecret, setShowSecret] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePreset = (preset: (typeof PRESETS)[number]) => {
    if (preset.label !== "Custom") {
      setEndpoint(preset.endpoint);
      setRegion(preset.region);
      setForcePathStyle(preset.pathStyle);
      setChecksumMode(preset.checksum ?? "compatible");
    }
    setActivePreset(preset.label);
    setError(null);
  };

  const canSubmit = accessKeyId.trim() !== "" && secretAccessKey.trim() !== "" && !loading;

  // If the user pastes "https://<account>.r2.cloudflarestorage.com/my-bucket",
  // strip the trailing bucket segment so the endpoint stays valid and the
  // bucket field is prefilled.
  const handleEndpointChange = (value: string) => {
    const trimmed = value.trim().replace(/\/+$/, "");
    let withScheme = trimmed;
    if (trimmed && !/^https?:\/\//i.test(withScheme)) withScheme = `https://${withScheme}`;
    try {
      const url = new URL(withScheme);
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length > 0) {
        setEndpoint(url.origin);
        if (!bucketName.trim()) {
          setBucketName(decodeURIComponent(parts[parts.length - 1]));
        }
        return;
      }
    } catch {
      // Not a full URL yet — leave the bucket field alone.
    }
    setEndpoint(value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await onConnect({
        name: name.trim() || bucketName.trim() || endpoint.trim() || "AWS S3",
        endpoint: endpoint.trim(),
        bucketName: bucketName.trim() || undefined,
        region: region.trim() || "us-east-1",
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        sessionToken: sessionToken.trim() || undefined,
        forcePathStyle,
        checksumMode,
      });
    } catch (err: any) {
      setError(err?.error || "Connection failed. Check your endpoint and keys.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-stack" noValidate>
      {/* Step 1 — Provider */}
      <div className="form-section">
        <div className="section-head">
          <span className={`step-num${activePreset ? " done" : ""}`}>{activePreset ? iconCheck : "1"}</span>
          <div>
            <h3>Provider</h3>
            <p>Start from a preset to prefill region and addressing defaults.</p>
          </div>
        </div>
        <div className="preset-grid" role="group" aria-label="Provider presets">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className={`preset-btn${activePreset === p.label ? " on" : ""}`}
              onClick={() => handlePreset(p)}
              aria-pressed={activePreset === p.label}
            >
              <span className="p-name">{p.label}</span>
              <span className="p-desc">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2 — Endpoint */}
      <div className="form-section">
        <div className="section-head">
          <span className="step-num">2</span>
          <div>
            <h3>Endpoint &amp; region</h3>
            <p>Where is your storage? Leave the endpoint empty for AWS S3.</p>
          </div>
        </div>
        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="cn-endpoint">Endpoint URL</label>
            <input
              id="cn-endpoint"
              className="input mono"
              value={endpoint}
              onChange={(e) => handleEndpointChange(e.target.value)}
              placeholder="https://<account>.r2.cloudflarestorage.com"
              inputMode="url"
              autoComplete="url"
            />
            <span className="field-hint">Base endpoint only — no trailing <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>/bucket-name</code> needed. If you paste one anyway, we move it to the bucket field below. Local MinIO looks like <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>http://localhost:9000</code>.</span>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="cn-bucket">Bucket <span className="opt">(optional — required for single-bucket R2 tokens)</span></label>
            <input
              id="cn-bucket"
              className="input mono"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              placeholder="my-bucket"
              autoComplete="off"
            />
            <span className="field-hint">R2 API tokens scoped to one bucket can't list buckets, so enter the bucket name here to open it directly.</span>
          </div>
          <div className="field-row">
            <div className="field">
              <label className="field-label" htmlFor="cn-region">Region</label>
              <input id="cn-region" className="input mono" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="us-east-1" autoComplete="off" />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="cn-name">Display name <span className="opt">(optional)</span></label>
              <input id="cn-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. staging-minio" autoComplete="off" />
            </div>
          </div>
        </div>
      </div>

      {/* Step 3 — Credentials */}
      <div className="form-section">
        <div className="section-head">
          <span className={`step-num${accessKeyId && secretAccessKey ? " done" : ""}`}>3</span>
          <div>
            <h3>Credentials</h3>
            <p>Keys are sent to the local server only, never stored there.</p>
          </div>
        </div>
        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="cn-key">Access key ID <span className="req">*</span></label>
            <input id="cn-key" className="input mono" value={accessKeyId} onChange={(e) => setAccessKeyId(e.target.value)} placeholder="AKIA…" required autoComplete="username" />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="cn-secret">Secret access key <span className="req">*</span></label>
            <div className="input-with-action">
              <input
                id="cn-secret"
                className="input mono"
                type={showSecret ? "text" : "password"}
                value={secretAccessKey}
                onChange={(e) => setSecretAccessKey(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
              />
              <span className="input-action">
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setShowSecret(!showSecret)}
                  aria-label={showSecret ? "Hide secret" : "Show secret"}
                >
                  {showSecret ? iconEyeOff : iconEye}
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced — collapsed */}
      <div className="form-section">
        <details className="advanced">
          <summary>Advanced settings {iconChevron}</summary>
          <div className="advanced-body">
            <div className="field">
              <label className="field-label" htmlFor="cn-token">Session token <span className="opt">(temporary credentials only)</span></label>
              <input id="cn-token" className="input mono" value={sessionToken} onChange={(e) => setSessionToken(e.target.value)} placeholder="Paste STS session token" autoComplete="off" />
            </div>
            <label className="check-row">
              <input type="checkbox" checked={forcePathStyle} onChange={(e) => setForcePathStyle(e.target.checked)} />
              <span className="check-copy">
                <span className="check-title">Use path-style addressing</span>
                <span className="check-desc">Required for MinIO and most S3-compatible services. Turn off for AWS S3 virtual-hosted style.</span>
              </span>
            </label>
            <div className="field">
              <span className="field-label" id="checksum-label">Checksum handling</span>
              <div className="radio-row" role="radiogroup" aria-labelledby="checksum-label">
                <label className={`radio-card${checksumMode === "compatible" ? " on" : ""}`}>
                  <input type="radio" name="checksumMode" value="compatible" checked={checksumMode === "compatible"} onChange={() => setChecksumMode("compatible")} />
                  <span className="check-copy">
                    <span className="check-title">Compatible</span>
                    <span className="check-desc">Works with MinIO, R2, Spaces. Recommended.</span>
                  </span>
                </label>
                <label className={`radio-card${checksumMode === "supported" ? " on" : ""}`}>
                  <input type="radio" name="checksumMode" value="supported" checked={checksumMode === "supported"} onChange={() => setChecksumMode("supported")} />
                  <span className="check-copy">
                    <span className="check-title">Full (AWS)</span>
                    <span className="check-desc">CRC32 validation. AWS S3 only.</span>
                  </span>
                </label>
              </div>
            </div>
            <label className="check-row">
              <input type="checkbox" checked={persistEnabled} onChange={(e) => onTogglePersist(e.target.checked)} />
              <span className="check-copy">
                <span className="check-title">Remember in this browser</span>
                <span className="check-desc">Saves connection details (including keys) to localStorage so they survive refreshes. Off means memory-only.</span>
              </span>
            </label>
          </div>
        </details>
      </div>

      {error && (
        <div className="notification notification-error" role="alert" style={{ position: "static", transform: "none", maxWidth: "none", marginTop: 16 }}>
          <span className="n-dot" />
          <span>{error}</span>
        </div>
      )}

      <div className="form-submit">
        <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={!canSubmit}>
          {loading ? "Connecting…" : "Connect"}
        </button>
        <p className="form-note">We list your buckets immediately so you know the keys work.</p>
      </div>
    </form>
  );
}
