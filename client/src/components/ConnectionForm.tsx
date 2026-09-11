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
}

const PRESETS = [
  { label: "AWS S3", endpoint: "", region: "us-east-1", pathStyle: false, checksum: "supported" },
  { label: "MinIO", endpoint: "http://localhost:9000", region: "us-east-1", pathStyle: true, checksum: "compatible" },
  { label: "Cloudflare R2", endpoint: "", region: "auto", pathStyle: false, checksum: "compatible" },
  { label: "DigitalOcean Spaces", endpoint: "", region: "nyc3", pathStyle: false, checksum: "compatible" },
  { label: "Backblaze B2", endpoint: "", region: "us-west-004", pathStyle: true, checksum: "supported" },
];

export default function ConnectionForm({ onConnect }: Props) {
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [forcePathStyle, setForcePathStyle] = useState(true);
  const [checksumMode, setChecksumMode] = useState("compatible");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePreset = (preset: (typeof PRESETS)[0]) => {
    setEndpoint(preset.endpoint);
    setRegion(preset.region);
    setForcePathStyle(preset.pathStyle);
    setChecksumMode(preset.checksum ?? "compatible");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onConnect({
      name: name || endpoint || "AWS S3",
      endpoint,
      region,
      accessKeyId,
      secretAccessKey,
      sessionToken: sessionToken || undefined,
      forcePathStyle,
      checksumMode,
    });
    setLoading(false);
  };

  return (
    <div className="card connection-form">
      <h2>Connect to S3</h2>

      <div className="presets">
        {PRESETS.map((p) => (
          <button key={p.label} className="btn btn-xs btn-outline" onClick={() => handlePreset(p)}>
            {p.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Connection Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My MinIO" />
          </div>
          <div className="form-group">
            <label>Region</label>
            <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="us-east-1" />
          </div>
        </div>

        <div className="form-group">
          <label>Custom Endpoint URL</label>
          <input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://s3.amazonaws.com (leave empty for AWS)"
          />
          <span className="form-hint">Leave empty for AWS S3. Use http://host:port for local/MinIO.</span>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Access Key ID</label>
            <input
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value)}
              placeholder="AKIA..."
              required
            />
          </div>
          <div className="form-group">
            <label>Secret Access Key</label>
            <div className="password-input">
              <input
                type={showToken ? "text" : "password"}
                value={secretAccessKey}
                onChange={(e) => setSecretAccessKey(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button type="button" className="btn-icon" onClick={() => setShowToken(!showToken)}>
                {showToken ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Session Token (optional)</label>
          <input
            value={sessionToken}
            onChange={(e) => setSessionToken(e.target.value)}
            placeholder="Temporary session token"
          />
        </div>

        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={forcePathStyle}
              onChange={(e) => setForcePathStyle(e.target.checked)}
            />
            Force Path Style
          </label>
          <span className="form-hint">
            Required for MinIO and most S3-compatible services. Disable for AWS S3.
          </span>
        </div>

        <div className="form-group">
          <label>Checksum Compatibility</label>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="checksumMode"
                value="compatible"
                checked={checksumMode === "compatible"}
                onChange={() => setChecksumMode("compatible")}
              />
              <span>Compatible</span>
              <span className="form-hint">Skips optional checksum headers — safer for non-AWS S3 (MinIO, Ceph, etc.)</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="checksumMode"
                value="supported"
                checked={checksumMode === "supported"}
                onChange={() => setChecksumMode("supported")}
              />
              <span>Full (AWS S3)</span>
              <span className="form-hint">Enables CRC32 integrity checks on uploads — AWS S3 only</span>
            </label>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
          {loading ? "Connecting..." : "Connect & Test"}
        </button>
      </form>
    </div>
  );
}