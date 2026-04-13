"use client";

import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";
import { TokenContext } from "../TokenContext";

const MOVEMENT_TYPE_LABELS = {
  conversion: "Conversión puntos",
  aplicacion: "Aplicado a venta",
  manual: "Ajuste"
};

const POINTS_TYPE_LABELS = {
  earn: "Puntos por compra",
  convert: "Conversión a monedero",
  manual: "Ajuste"
};

export default function RewardsPage() {
  const { token } = useContext(TokenContext);
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingWallet, setLoadingWallet] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api
      .get("/users/clients", { headers })
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : [];
        setClients(list);
        if (list.length && !clientId) setClientId(list[0]._id);
      })
      .catch(() => {
        toast.error("Error al cargar clientes");
        setClients([]);
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token || !clientId) {
      setWallet(null);
      return;
    }
    setLoadingWallet(true);
    setWallet(null);
    api
      .get(`/wallet/client/${clientId}`, { headers })
      .then((r) => setWallet(r.data))
      .catch(() => {
        toast.error("Error al cargar monedero del cliente");
        setWallet(null);
      })
      .finally(() => setLoadingWallet(false));
  }, [token, clientId]);

  const selectedClient = clients.find((c) => c._id === clientId);

  return (
    <main>
      <div className="page-header">
        <div>
          <h1 className="page-title">Historial de recompensas</h1>
          <p className="page-subtitle">Monedero y puntos por cliente</p>
        </div>
      </div>

      <div className="card rewards-client-card">
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label>Cliente</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="form-control"
            style={{ maxWidth: 320 }}
            disabled={loading}
          >
            <option value="">Seleccionar cliente</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} {c.email ? `(${c.email})` : ""}
              </option>
            ))}
          </select>
        </div>

        {loading && <p className="dashboard-muted">Cargando clientes…</p>}
        {!loading && clients.length === 0 && (
          <p className="dashboard-muted">No hay clientes registrados.</p>
        )}

        {!loading && clientId && (
          <>
            {loadingWallet ? (
              <p className="dashboard-muted">Cargando monedero…</p>
            ) : wallet ? (
              <div className="rewards-client-view">
                <h3 className="section-title">
                  {wallet.clientName || selectedClient?.name || "Cliente"}
                  {wallet.clientEmail && (
                    <span className="rewards-client-email"> — {wallet.clientEmail}</span>
                  )}
                </h3>

                <div className="cliente-wallet-grid">
                  <div className="cliente-wallet-item">
                    <span className="cliente-wallet-label">Saldo monedero</span>
                    <span className="cliente-wallet-value">${Number(wallet.walletBalance ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="cliente-wallet-item">
                    <span className="cliente-wallet-label">Puntos acumulados</span>
                    <span className="cliente-wallet-value">{Number(wallet.pointsAccumulated ?? 0)}</span>
                  </div>
                </div>

                <p className="cliente-wallet-meta">
                  Conversión mensual: {Number(wallet.pointsRate ?? 0)} pts/$1 → ${Number(wallet.pointsToWalletRate ?? 0).toFixed(2)}/punto.
                  Próxima conversión: {wallet.nextConversionDate ? new Date(wallet.nextConversionDate).toLocaleDateString() : "—"}.
                </p>

                {(wallet.movements?.length ?? 0) > 0 && (
                  <div className="cliente-movements">
                    <h4 className="reportes-table-title">Movimientos de monedero</h4>
                    <div className="data-table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Tipo</th>
                            <th>Monto</th>
                            <th>Saldo después</th>
                            <th>Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {wallet.movements.map((m) => (
                            <tr key={m._id}>
                              <td>{MOVEMENT_TYPE_LABELS[m.type] || m.type}</td>
                              <td>{m.amount != null ? `$${Number(m.amount).toFixed(2)}` : "—"}</td>
                              <td>{m.balanceAfter != null ? `$${Number(m.balanceAfter).toFixed(2)}` : "—"}</td>
                              <td>{m.createdAt ? new Date(m.createdAt).toLocaleString() : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {(wallet.pointsMovements?.length ?? 0) > 0 && (
                  <div className="cliente-movements">
                    <h4 className="reportes-table-title">Historial de recompensas (puntos)</h4>
                    <div className="data-table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Tipo</th>
                            <th>Puntos</th>
                            <th>Puntos después</th>
                            <th>Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {wallet.pointsMovements.map((m) => (
                            <tr key={m._id}>
                              <td>{POINTS_TYPE_LABELS[m.type] || m.type}</td>
                              <td>{m.pointsDelta != null ? `${Number(m.pointsDelta) > 0 ? "+" : ""}${m.pointsDelta}` : "—"}</td>
                              <td>{m.pointsAfter != null ? m.pointsAfter : "—"}</td>
                              <td>{m.createdAt ? new Date(m.createdAt).toLocaleString() : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {(!wallet.movements?.length && !wallet.pointsMovements?.length) && (
                  <p className="cliente-empty">Sin movimientos ni puntos registrados aún.</p>
                )}
              </div>
            ) : (
              <p className="dashboard-muted">No se pudo cargar el monedero de este cliente.</p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
