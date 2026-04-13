"use client";

import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";
import { TokenContext } from "../TokenContext";

export default function ClienteAreaPage() {
  const { token, user } = useContext(TokenContext);
  const [wallet, setWallet] = useState(null);
  const [sales, setSales] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [repairs, setRepairs] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("monedero");

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      api.get("/wallet/me", { headers }).then((r) => r.data).catch(() => null),
      api.get("/sales/me", { headers }).then((r) => r.data).catch(() => ({ items: [], page: 1, pages: 0, total: 0 })),
      api.get("/repairs/me", { headers }).then((r) => r.data).catch(() => ({ items: [], page: 1, pages: 0, total: 0 }))
    ])
      .then(([w, s, r]) => {
        setWallet(w);
        setSales(s || { items: [], page: 1, pages: 0, total: 0 });
        setRepairs(r || { items: [], page: 1, pages: 0, total: 0 });
      })
      .catch(() => {
        toast.error("Error al cargar datos");
        setWallet(null);
        setSales({ items: [], page: 1, pages: 0, total: 0 });
        setRepairs({ items: [], page: 1, pages: 0, total: 0 });
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <main className="cliente-area">
        <p>Cargando...</p>
      </main>
    );
  }

  return (
    <main className="cliente-area">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mi cuenta</h1>
          <p className="page-subtitle">Hola, {user?.name || user?.email}.</p>
        </div>
      </div>

      <div className="cliente-tabs">
        <button type="button" className={activeTab === "monedero" ? "active" : ""} onClick={() => setActiveTab("monedero")}>
          Monedero y puntos
        </button>
        <button type="button" className={activeTab === "compras" ? "active" : ""} onClick={() => setActiveTab("compras")}>
          Mis compras
        </button>
        <button type="button" className={activeTab === "reparaciones" ? "active" : ""} onClick={() => setActiveTab("reparaciones")}>
          Mis reparaciones
        </button>
      </div>

      {activeTab === "monedero" && (
        <div className="card cliente-card">
          <h3 className="section-title">Monedero y puntos</h3>
          <div className="cliente-wallet-grid">
            <div className="cliente-wallet-item">
              <span className="cliente-wallet-label">Saldo monedero</span>
              <span className="cliente-wallet-value">${Number(wallet?.walletBalance ?? 0).toFixed(2)}</span>
            </div>
            <div className="cliente-wallet-item">
              <span className="cliente-wallet-label">Puntos acumulados</span>
              <span className="cliente-wallet-value">{Number(wallet?.pointsAccumulated ?? 0)}</span>
            </div>
          </div>
          <p className="cliente-wallet-meta">
            Cada compra genera puntos. Conversión mensual automática: {Number(wallet?.pointsRate ?? 0)} puntos por $1 y
            ${Number(wallet?.pointsToWalletRate ?? 0).toFixed(2)} por punto. Próxima conversión:{" "}
            {wallet?.nextConversionDate ? new Date(wallet.nextConversionDate).toLocaleDateString() : "—"}.
          </p>
          {(wallet?.movements?.length ?? 0) > 0 && (
            <div className="cliente-movements">
              <h4>Últimos movimientos</h4>
              <ul className="cliente-list">
                {wallet.movements.slice(0, 10).map((m, i) => (
                  <li key={m._id || i}>
                    <span>{m.type === "conversion" ? "Conversión puntos" : m.type === "aplicacion" ? "Aplicado a venta" : m.type === "manual" ? "Ajuste" : m.type || "Movimiento"}</span>
                    <span>{m.amount != null ? `$${Number(m.amount).toFixed(2)}` : ""}</span>
                    <span>{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ""}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(wallet?.pointsMovements?.length ?? 0) > 0 && (
            <div className="cliente-movements">
              <h4>Historial de recompensas (puntos)</h4>
              <ul className="cliente-list">
                {wallet.pointsMovements.slice(0, 10).map((m, i) => (
                  <li key={m._id || i}>
                    <span>{m.type === "earn" ? "Puntos por compra" : m.type === "convert" ? "Conversión a monedero" : "Ajuste"}</span>
                    <span>{m.pointsDelta != null ? `${Number(m.pointsDelta) > 0 ? "+" : ""}${Number(m.pointsDelta)}` : ""}</span>
                    <span>{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ""}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === "compras" && (
        <div className="card cliente-card">
          <h3 className="section-title">Mis compras</h3>
          {sales.items.length === 0 ? (
            <p className="cliente-empty">Aún no tienes compras registradas.</p>
          ) : (
            <>
              <div className="cliente-sales-summary">
                <div className="cliente-sales-summary-item">
                  <span className="cliente-sales-summary-label">Total gastado</span>
                  <span className="cliente-sales-summary-value">
                    ${Number(sales.totalSpent ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="cliente-sales-summary-item">
                  <span className="cliente-sales-summary-label">Última compra</span>
                  <span className="cliente-sales-summary-value">
                    {sales.items.length ? new Date(sales.items[0].createdAt).toLocaleDateString() : "—"}
                  </span>
                </div>
                <div className="cliente-sales-summary-item">
                  <span className="cliente-sales-summary-label">Compras</span>
                  <span className="cliente-sales-summary-value">{sales.total}</span>
                </div>
              </div>
              <ul className="cliente-sales-list">
                {sales.items.map((s) => (
                  <li key={s._id} className="cliente-sale-item">
                    <div className="cliente-sale-header">
                      <strong>${Number(s.finalCharged).toFixed(2)}</strong>
                      <span>{new Date(s.createdAt).toLocaleString()}</span>
                    </div>
                    <ul className="cliente-sale-products">
                      {(s.items || []).map((it, i) => (
                        <li key={i}>
                          {it.product?.name || "Producto"} × {it.quantity} — ${Number(it.subtotal || (it.quantity * (it.product?.salePrice || 0))).toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
              {sales.pages > 1 && (
                <p className="cliente-pagination">Página {sales.page} de {sales.pages} ({sales.total} en total)</p>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "reparaciones" && (
        <div className="card cliente-card">
          <h3 className="section-title">Mis reparaciones</h3>
          {repairs.items.length === 0 ? (
            <p className="cliente-empty">No tienes reparaciones registradas.</p>
          ) : (
            <ul className="cliente-repairs-list">
              {repairs.items.map((r) => (
                <li key={r._id} className="cliente-repair-item">
                  <div className="cliente-repair-header">
                    <strong>{r.trackingNumber}</strong>
                    <span className={`cliente-repair-status status-${r.status?.replace(/\s/g, "-")}`}>{r.status}</span>
                  </div>
                  <p className="cliente-repair-desc">{r.problemDescription}</p>
                  <p className="cliente-repair-date">Entrada: {new Date(r.dateIn || r.createdAt).toLocaleDateString()}</p>
                  <p className="cliente-repair-link">
                    <a href={`/public/repair-status?tracking=${encodeURIComponent(r.trackingNumber)}`} target="_blank" rel="noopener noreferrer">Ver seguimiento</a>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}
