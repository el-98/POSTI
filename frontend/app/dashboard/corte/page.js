"use client";

import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";
import { TokenContext } from "../TokenContext";

export default function CortePage() {
  const { token } = useContext(TokenContext);
  const [corte, setCorte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api
      .get(`/reports/corte?date=${fecha}`, { headers })
      .then((r) => setCorte(r.data))
      .catch(() => {
        toast.error("Error al cargar corte de caja");
        setCorte(null);
      })
      .finally(() => setLoading(false));
  }, [token, fecha]);

  const handlePrint = () => {
    if (!corte) return;
    const w = window.open("", "_blank", "width=400,height=700");
    if (!w) {
      toast.error("Permite ventanas emergentes para imprimir");
      return;
    }
    const byPay = (corte.byPaymentMethod || [])
      .map((p) => `${p.method}: $${Number(p.total).toFixed(2)} (${p.count})`)
      .join("\n");
    w.document.write(`
      <!DOCTYPE html>
      <html><head><title>Corte de caja ${corte.date}</title>
      <style>body{font-family:monospace;padding:16px;font-size:12px;} h2{font-size:14px;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #333;padding:4px 8px;text-align:left;} .total{font-weight:bold;}</style>
      </head><body>
      <h2>ITCOMMERCE - Corte de caja</h2>
      <p><strong>Fecha:</strong> ${corte.date}</p>
      <p><strong>Ventas:</strong> ${corte.count}</p>
      <p><strong>Total:</strong> $${Number(corte.total).toFixed(2)}</p>
      <pre>${byPay}</pre>
      <p><em>Impreso: ${new Date().toLocaleString()}</em></p>
      </body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.close();
    }, 300);
  };

  if (loading) {
    return (
      <main>
        <div className="page-header">
          <h1 className="page-title">Corte de caja</h1>
        </div>
        <div className="empty-state">
          <div className="loading-spinner" style={{ margin: "0 auto 12px" }} />
          <p>Cargando corte…</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="page-header">
        <div>
          <h1 className="page-title">Corte de caja</h1>
          <p className="page-subtitle">Resumen de ventas por día</p>
        </div>
      </div>
      <div className="card corte-date-card">
        <div className="form-group" style={{ marginBottom: 0, maxWidth: 220 }}>
          <label>Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
      </div>
      <div className="card">
        <h3 className="section-title">Resumen del día</h3>
        <div className="corte-summary-grid">
          <div className="corte-stat">
            <span className="dashboard-stat-label">Total ventas</span>
            <span className="dashboard-stat-value">${Number(corte?.total ?? 0).toFixed(2)}</span>
          </div>
          <div className="corte-stat">
            <span className="dashboard-stat-label">Cantidad de ventas</span>
            <span className="dashboard-stat-value">{corte?.count ?? 0}</span>
          </div>
        </div>
        {(corte?.byPaymentMethod?.length ?? 0) > 0 && (
          <div className="data-table-wrap" style={{ marginBottom: 16 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Forma de pago</th>
                  <th>Total</th>
                  <th>Ventas</th>
                </tr>
              </thead>
              <tbody>
                {corte.byPaymentMethod.map((p) => (
                  <tr key={p.method}>
                    <td>{p.method}</td>
                    <td><strong>${Number(p.total).toFixed(2)}</strong></td>
                    <td>{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="corte-print-wrap">
          <button type="button" className="btn-primary" onClick={handlePrint}>Imprimir corte</button>
        </div>
      </div>
      {(corte?.sales?.length ?? 0) > 0 && (
        <div className="card corte-sales-card">
          <h3 className="section-title">Ventas del día</h3>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Total</th>
                  <th>Cliente</th>
                  <th>Pago</th>
                  <th>Hora</th>
                </tr>
              </thead>
              <tbody>
                {corte.sales.map((s) => (
                  <tr key={s._id}>
                    <td><strong>${Number(s.finalCharged).toFixed(2)}</strong></td>
                    <td>{s.client?.name ?? "-"}</td>
                    <td>{s.paymentMethod}</td>
                    <td>{new Date(s.createdAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
