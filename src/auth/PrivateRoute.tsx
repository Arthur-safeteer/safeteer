import React from "react";
import { Navigate } from "react-router-dom";

function getAccessToken() {
  return localStorage.getItem("accessToken");
}

function parseJwt(token?: string | null) {
  try {
    if (!token) return null;
    const [, payload] = token.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isExpired(token?: string | null, skewSeconds = 60) {
  const p = parseJwt(token);
  if (!p?.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return p.exp <= now + skewSeconds;
}

export default function PrivateRoute({ children }: { children: React.ReactElement }) {
  const t = getAccessToken();
  if (!t || isExpired(t)) return <Navigate to="/login" replace />;
  return children;
}
