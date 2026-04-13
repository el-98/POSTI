"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";

const STATUS_ORDER = ["Recibido", "En proceso", "Terminado", "Entregado"];
const STATUS_LABELS = {
  Recibido: "Recibido",
  "En proceso": "En proceso",
  Terminado: "Terminado",
  Entregado: "Entregado"
};

function StatusStepper({ currentStatus }) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  return (
    <div className="repair-status-stepper">
      {STATUS_ORDER.map((status, idx) => {
        const isDone = idx <= currentIndex;
        const isCurrent = status === currentStatus;
        return (
          <div key={status} className={`repair-status-step ${isDone ? "done" : ""} ${isCurrent ? "current" : ""}`}>
            <span className="repair-status-step-dot" />
            <span className="repair-status-step-label">{STATUS_LABELS[status]}</span>
            {idx < STATUS_ORDER.length - 1 && <span className="repair-status-step-line" />}
          </div>
        );
      })}
    </div>
  );
}

export default function PublicRepairStatusPage() {
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("tracking") || searchParams.get("code") || "";
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCode(codeFromUrl);
  }, [codeFromUrl]);

  const search = useCallback(async () => {
    const t = (code || codeFromUrl).trim().toUpperCase();
    if (!t) {
      toast.error("Ingresa tu código de seguimiento");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.get(`/public/repair-status/${encodeURIComponent(t)}`);
      setResult(data);
      if (typeof window !== "undefined" && t !== codeFromUrl) {
        const url = new URL(window.location.href);
        url.searchParams.set("tracking", t);
        window.history.replaceState({}, "", url.pathname + "?" + url.searchParams.toString());
      }
    } catch {
      toast.error("Código no encontrado. Revisa el número e inténtalo de nuevo.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [code, codeFromUrl]);

  useEffect(() => {
    if (codeFromUrl?.trim()) {
      const t = codeFromUrl.trim();
      setLoading(true);
      api
        .get(`/public/repair-status/${encodeURIComponent(t)}`)
        .then(({ data }) => setResult(data))
        .catch(() => setResult(null))
        .finally(() => setLoading(false));
    }
  }, [codeFromUrl]);

  const copyLink = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => toast.success("Enlace copiado. Compártelo para consultar después.")).catch(() => toast.success("Guarda esta página en favoritos para consultar después."));
    } else {
      toast.success("Guarda esta página en favoritos para consultar después.");
    }
  };

  return (
    <main className="repair-status-page">
      <div className="repair-status-hero">
        <Link href="/" className="repair-status-back">← Volver al inicio</Link>
        <h1 className="repair-status-title">Seguimiento de tu reparación</h1>
        <p className="repair-status-subtitle">
          Ingresa el código que te entregaron al dejar tu equipo. Con él puedes ver el estado en cualquier momento.
        </p>

        <div className="repair-status-search">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Ej: REP-1730240000000-ABC12D"
            className="repair-status-input"
            disabled={loading}
          />
          <button type="button" onClick={search} className="repair-status-btn" disabled={loading}>
            {loading ? "Buscando…" : "Ver estado"}
          </button>
        </div>
      </div>

      {loading && !result && (
        <div className="repair-status-card repair-status-loading">
          <div className="loading-spinner" style={{ margin: "0 auto 12px" }} />
          <p>Cargando…</p>
        </div>
      )}

      {result && !loading && (
        <div className="repair-status-card repair-status-result">
          <div className="repair-status-result-header">
            <div>
              <span className="repair-status-badge">Código</span>
              <strong className="repair-status-code">{result.trackingNumber}</strong>
            </div>
            <button type="button" onClick={copyLink} className="repair-status-copy-link">
              Copiar enlace
            </button>
          </div>

          <StatusStepper currentStatus={result.status} />

          <div className="repair-status-details">
            <div className="repair-status-detail-row">
              <span className="repair-status-detail-label">Descripción del problema</span>
              <p className="repair-status-detail-value">{result.problemDescription || "—"}</p>
            </div>
            <div className="repair-status-detail-grid">
              <div className="repair-status-detail-row">
                <span className="repair-status-detail-label">Fecha de entrada</span>
                <span className="repair-status-detail-value">
                  {result.dateIn ? new Date(result.dateIn).toLocaleDateString("es", { dateStyle: "long" }) : "—"}
                </span>
              </div>
              <div className="repair-status-detail-row">
                <span className="repair-status-detail-label">Fecha estimada</span>
                <span className="repair-status-detail-value">
                  {result.estimatedDate ? new Date(result.estimatedDate).toLocaleDateString("es", { dateStyle: "long" }) : "Por definir"}
                </span>
              </div>
              {result.deliveredDate && (
                <div className="repair-status-detail-row">
                  <span className="repair-status-detail-label">Fecha de entrega</span>
                  <span className="repair-status-detail-value">
                    {new Date(result.deliveredDate).toLocaleDateString("es", { dateStyle: "long" })}
                  </span>
                </div>
              )}
              {result.cost != null && result.cost > 0 && (
                <div className="repair-status-detail-row">
                  <span className="repair-status-detail-label">Costo</span>
                  <span className="repair-status-detail-value repair-status-cost">${Number(result.cost).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {(result.history?.length ?? 0) > 0 && (
            <div className="repair-status-history">
              <h3 className="repair-status-history-title">Historial del proceso</h3>
              <ul className="repair-status-timeline">
                {result.history.map((item, idx) => (
                  <li key={idx} className="repair-status-timeline-item">
                    <span className="repair-status-timeline-dot" />
                    <div className="repair-status-timeline-content">
                      <strong>{item.status}</strong>
                      <span className="repair-status-timeline-date">
                        {item.changedAt ? new Date(item.changedAt).toLocaleString("es") : ""}
                      </span>
                      {item.note && <p className="repair-status-timeline-note">{item.note}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="repair-status-hint">
            Guarda este enlace o tu código <strong>{result.trackingNumber}</strong> para consultar el estado cuando quieras.
          </p>
        </div>
      )}

      {!result && !loading && codeFromUrl?.trim() && (
        <div className="repair-status-card repair-status-empty">
          <p>No encontramos una reparación con ese código.</p>
          <p className="repair-status-empty-hint">Verifica el número o pide el enlace/código en tu tienda.</p>
        </div>
      )}
    </main>
  );
}
