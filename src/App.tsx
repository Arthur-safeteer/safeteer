// src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SignIN from "./pages/SignIN";
import Dashboard from "./pages/Dashboard";
import PrivateRoute from "./auth/PrivateRoute";
import GlobalStyles from "./styles/GlobalStyles";
import { PrefsProvider } from "./contexts/PrefsContext";

// ⬇️ importe a nova página de configurações
import Settings from "./pages/Settings"; // src/pages/Settings/index.tsx

export default function App() {
  return (
    <PrefsProvider>
      <GlobalStyles />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<SignIN />} />

          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          {/* ⬇️ nova rota protegida para Configurações do Usuário */}
          <Route
            path="/config"
            element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            }
          />

          {/* fallback 404 -> login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </PrefsProvider>
  );
}
