export const getAccessToken = () => localStorage.getItem("accessToken");

export function parseJwt(token?: string | null) {
  try {
    if (!token) return null;
    const [, payload] = token.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isExpired(token?: string | null, skewSeconds = 60) {
  const p = parseJwt(token);
  if (!p?.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return p.exp <= now + skewSeconds;
}

export function getJwt(): string | null {
  // A API pode aceitar idToken (identidade) ou accessToken (escopo de API).
  return (
    localStorage.getItem("idToken") ||
    localStorage.getItem("accessToken") ||
    null
  );
}
