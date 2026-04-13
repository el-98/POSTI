"use client";

import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";
import { TokenContext } from "../TokenContext";

export default function ReportesPage() {
  const { token } = useContext(TokenContext);
  const [dashboard, setDashboard] = useState(null);
  const [faltantes, setFaltantes] = useState(null);
  const [loading, setLoading] = useState(true);
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      api.get("/reports/dashboard", { headers }).then((r) => r.data).catch(() => null),
      api.get("/reports/faltantes", { headers }).then((r) => r.data).catch(() => null)
    ])
      .then(([d, f]) => {
        setDashboard(d);
        setFaltantes(f);
      })
      .catch(() => {
        toast.error("Error al cargar reportes");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const exportFaltantes = (format) => {
    api
      .get(`/reports/export/faltantes/${format}`, { headers, responseType: "blob" })
      .then((response) => {
        const blob = new Blob([response.data], { type: response.headers["content-type"] });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = format === "excel" ? "reporte-faltantes.xlsx" : "reporte-faltantes.pdf";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        toast.success("Descarga iniciada");
      })
      .catch(() => toast.error("No se pudo exportar el reporte"));
  };

  const clientsByType = dashboard?.clientsByType ?? { frecuente: 0, ocasional: 0 };
  const enCero = faltantes?.enCero ?? [];
  const bajoMinimo = faltantes?.bajoMinimo ?? [];
  const totalFaltantes = (faltantes?.totalFaltantes ?? 0);

  if (loading) {
    return (
      <main>
        <div className="page-header">
          <h1 className="page-title">Reportes</h1>
        </div>
        <div className="empty-state">
          <div className="loading-spinner" style={{ margin: "0 auto 12px" }} />
          <p>Cargando reportes…</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Faltantes en inventario y tipos de cuenta (cliente frecuente / ocasional)</p>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <h3 className="section-title">Tipos de cuenta (clientes)</h3>
          <p className="page-subtitle" style={{ marginBottom: 12 }}>
            Clientes registrados por tipo: frecuente (habitual) y ocasional.
          </p>
          <div className="dashboard-quick-stats" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div className="dashboard-stat-card" style={{ flex: "1 1 140px" }}>
              <span className="dashboard-stat-label">Cliente frecuente</span>
              <span className="dashboard-stat-value">{clientsByType.frecuente ?? 0}</span>
            </div>
            <div className="dashboard-stat-card" style={{ flex: "1 1 140px" }}>
              <span className="dashboard-stat-label">Cliente ocasional</span>
              <span className="dashboard-stat-value">{clientsByType.ocasional ?? 0}</span>
            </div>
          </div>
          <p style={{ marginTop: 12, fontSize: 14, color: "var(--muted)" }}>
            Total: {(clientsByType.frecuente ?? 0) + (clientsByType.ocasional ?? 0)} clientes. El tipo se asigna al crear o editar el cliente en Caja.
          </p>
        </div>
        <div className="card">
          <h3 className="section-title">Resumen faltantes</h3>
          <p className="page-subtitle" style={{ marginBottom: 12 }}>
            Productos en cero o por debajo del stock mínimo.
          </p>
          <div className="dashboard-quick-stats" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div className="dashboard-stat-card dashboard-stat-primary" style={{ flex: "1 1 120px" }}>
              <span className="dashboard-stat-label">En cero</span>
              <span className="dashboard-stat-value">{faltantes?.totalEnCero ?? 0}</span>
            </div>
            <div className="dashboard-stat-card" style={{ flex: "1 1 120px" }}>
              <span className="dashboard-stat-label">Bajo mínimo</span>
              <span className="dashboard-stat-value">{faltantes?.totalBajoMinimo ?? 0}</span>
            </div>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" onClick={() => exportFaltantes("excel")}>
              Exportar faltantes (Excel)
            </button>
            <button type="button" className="btn" onClick={() => exportFaltantes("pdf")}>
              Exportar faltantes (PDF)
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="section-title">Reporte de faltantes en inventario</h3>
        {totalFaltantes === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✓</div>
            <p>No hay productos con faltantes. Todo en orden.</p>
            <Link href="/dashboard/products" className="dashboard-link-more" style={{ marginTop: 8, display: "inline-block" }}>
              Ver productos
            </Link>
          </div>
        ) : (
          <>
            {enCero.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 className="reportes-table-title">Productos en cero ({enCero.length})</h4>
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>SKU</th>
                        <th>Categoría</th>
                        <th>Proveedor</th>
                        <th style={{ width: 100 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {enCero.map((p) => (
                        <tr key={p._id}>
                          <td><Link href="/dashboard/products">{p.name}</Link></td>
                          <td>{p.sku}</td>
                          <td>{p.category}</td>
                          <td>{p.supplier || "—"}</td>
                          <td>
                            <Link href={`/dashboard/purchases?product=${p._id}`} className="btn btn-primary" style={{ fontSize: 12, padding: "6px 10px" }}>
                              Reponer
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {bajoMinimo.length > 0 && (
              <div>
                <h4 className="reportes-table-title">Productos bajo mínimo ({bajoMinimo.length})</h4>
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>SKU</th>
                        <th>Stock actual</th>
                        <th>Mínimo</th>
                        <th>Faltante</th>
                        <th style={{ width: 100 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {bajoMinimo.map((p) => (
                        <tr key={p._id}>
                          <td><Link href="/dashboard/products">{p.name}</Link></td>
                          <td>{p.sku}</td>
                          <td>{p.currentStock}</td>
                          <td>{p.minStock}</td>
                          <td><span className="badge badge-warning">{(p.minStock || 0) - (p.currentStock || 0)}</span></td>
                          <td>
                            <Link href={`/dashboard/purchases?product=${p._id}`} className="btn btn-primary" style={{ fontSize: 12, padding: "6px 10px" }}>
                              Reponer
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href="/dashboard/purchases" className="btn btn-primary">
                📥 Reponer inventario (ir a Compras)
              </Link>
              <button type="button" className="btn" onClick={() => exportFaltantes("excel")}>
                Descargar Excel
              </button>
              <button type="button" className="btn" onClick={() => exportFaltantes("pdf")}>
                Descargar PDF
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card reportes-pasos" style={{ marginBottom: 24 }}>
        <h3 className="section-title">Cómo reponer el inventario (paso a paso)</h3>
        <ol className="reportes-lista-pasos">
          <li><strong>Entra a Compras</strong> — En el menú: <Link href="/dashboard/purchases">Compras</Link>, o usa el botón &quot;Reponer inventario&quot; de arriba.</li>
          <li><strong>Escribe el proveedor</strong> — Nombre de quien te vendió el producto.</li>
          <li><strong>Elige el producto</strong> — En &quot;Ítems&quot;, selecciona el producto que quieres reponer (si viniste desde &quot;Reponer&quot; en faltantes, ya viene elegido).</li>
          <li><strong>Pon cantidad y costo</strong> — Cuántas unidades entraron y cuánto te costó cada una.</li>
          <li><strong>Crear compra</strong> — Pulsa &quot;Crear compra&quot;. El stock se actualiza solo.</li>
        </ol>
        <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 14 }}>
          Puedes añadir varios ítems en una sola compra (botón &quot;Añadir ítem&quot;).
        </p>
        <div style={{ marginTop: 16 }}>
          <Link href="/dashboard/purchases" className="btn btn-primary">
            Ir a Compras ahora
          </Link>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">Otros reportes</h3>
        <p style={{ marginBottom: 12 }}>Dashboard general y corte de caja incluyen ganancias, reparaciones y usuarios.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/dashboard" className="btn">Ver Dashboard</Link>
          <Link href="/dashboard/corte" className="btn">Corte de caja</Link>
        </div>
      </div>
    </main>
  );
}
