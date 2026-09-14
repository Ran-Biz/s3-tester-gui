/**
 * localStorage persistence for S3 connection configs.
 * WARNING: when enabled this stores secrets (secretAccessKey, sessionToken)
 * in plain text in the browser's localStorage. Off by default in spirit —
 * the toggle on the connect form controls it, and turning it off wipes all
 * saved connections. Used only to restore connections across reloads.
 */

export interface StoredConnection {
  name: string;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  forcePathStyle: boolean;
  checksumMode?: string;
}

const STORAGE_KEY_CONNECTIONS = "s3-tester:connections";
const STORAGE_KEY_SETTINGS = "s3-tester:settings";

export interface AppSettings {
  persistConnections: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  persistConnections: true,
};

/* ---- Settings ---- */

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      persistConnections: typeof parsed.persistConnections === "boolean"
        ? parsed.persistConnections
        : DEFAULT_SETTINGS.persistConnections,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

/* ---- Connections ---- */

export function loadConnections(): StoredConnection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONNECTIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c: any) =>
        typeof c.name === "string" &&
        typeof c.endpoint === "string" &&
        typeof c.region === "string" &&
        typeof c.accessKeyId === "string" &&
        typeof c.secretAccessKey === "string"
    );
  } catch {
    return [];
  }
}

export function saveConnections(connections: StoredConnection[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CONNECTIONS, JSON.stringify(connections));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

export function upsertConnection(config: StoredConnection): void {
  const existing = loadConnections();
  const idx = existing.findIndex(
    (c) =>
      c.name === config.name &&
      c.endpoint === config.endpoint &&
      c.region === config.region &&
      c.accessKeyId === config.accessKeyId
  );
  if (idx >= 0) {
    existing[idx] = config;
  } else {
    existing.push(config);
  }
  saveConnections(existing);
}

export function removeConnection(config: StoredConnection): void {
  const existing = loadConnections();
  const filtered = existing.filter(
    (c) =>
      !(
        c.name === config.name &&
        c.endpoint === config.endpoint &&
        c.region === config.region &&
        c.accessKeyId === config.accessKeyId
      )
  );
  saveConnections(filtered);
}

export function clearAllConnections(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_CONNECTIONS);
  } catch {
    // silently ignore
  }
}