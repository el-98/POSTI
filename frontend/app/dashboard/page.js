"use client";

import { useContext, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { TokenContext } from "./TokenContext";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function DashboardPage() {
  const { token } = useContext(TokenContext);
  const [report, setReport] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        const { data } = await api.get("/reports/dashboard", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReport(data);
      } catch {
        toast.error("No se pudo cargar reporte");
      }
    };
    load();
  }, [token]);

  const chartData = {
    labels: report?.salesByMonth?.map((item) => `Mes ${item._id}`) || [],
    datasets: [
      {
        label: "Ventas",
        data: report?.salesByMonth?.map((item) => item.total) || []
      }
    ]
  };

  const salesToday = report?.salesToday || { total: 0, count: 0 };
  const recentSales = report?.recentSales || [];

  const lowStock = report?.lowStock ?? [];
  const hasLowStock = lowStock.length > 0;

  if (!report) {
    return (
      <main>
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Resumen de ventas e indicadores</p>
          </div>
        </div>
        <div className="dashboard-quick-stats">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="dashboard-stat-card">
              <span className="skeleton skeleton-text" style={{ width: "70%" }} />
              <span className="skeleton skeleton-stat" style={{ marginTop: 8 }} />
            </div>
          ))}
        </div>
        <div className="grid grid-2" style={{ marginTop: 24 }}>
          <div className="card">
            <div className="skeleton skeleton-title" style={{ marginBottom: 12 }} />
            <div className="skeleton skeleton-card" style={{ marginBottom: 8 }} />
            <div className="skeleton skeleton-text" style={{ width: "40%" }} />
          </div>
          <div className="card">
            <div className="skeleton skeleton-title" style={{ marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 220, borderRadius: 10 }} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Resumen de ventas e indicadores</p>
        </div>
      </div>
      {hasLowStock && (
        <div className="dashboard-lowstock-banner" role="alert">
          <strong>⚠️ Productos con stock bajo</strong>
          <span>Hay {lowStock.length} producto(s) con stock en o por debajo del mínimo.</span>
          <Link href="/dashboard/products">Ver productos</Link>
        </div>
      )}
      <div className="dashboard-quick-stats">
        <div className="dashboard-stat-card dashboard-stat-primary">
          <span className="dashboard-stat-label">Ventas hoy</span>
          <span className="dashboard-stat-value">${Number(salesToday.total).toFixed(2)}</span>
          <span className="dashboard-stat-meta">{salesToday.count} ventas</span>
          <Link href="/dashboard/pos" className="dashboard-stat-action">Ir a Caja</Link>
        </div>
        <div className="dashboard-stat-card">
          <span className="dashboard-stat-label">Ganancia total</span>
          <span className="dashboard-stat-value">${Number(report?.gain ?? 0).toFixed(2)}</span>
        </div>
        <div className="dashboard-stat-card">
          <span className="dashboard-stat-label">Reparaciones pendientes</span>
          <span className="dashboard-stat-value">{report?.pendingRepairs ?? 0}</span>
        </div>
        <div className="dashboard-stat-card">
          <span className="dashboard-stat-label">Usuarios</span>
          <span className="dashboard-stat-value">{report?.totalUsers ?? 0}</span>
        </div>
        <div className="dashboard-stat-card">
          <span className="dashboard-stat-label">Clientes (frec. / ocas.)</span>
          <span className="dashboard-stat-value">
            {(report?.clientsByType?.frecuente ?? 0)} / {(report?.clientsByType?.ocasional ?? 0)}
          </span>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 24 }}>
        <div className="card">
          <h3 className="section-title">Ventas recientes</h3>
          {recentSales.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p>Sin ventas recientes</p>
              <Link href="/dashboard/pos" className="dashboard-link-more" style={{ marginTop: 8, display: "inline-block" }}>Ir a Caja</Link>
            </div>
          ) : (
            <>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Total</th>
                      <th>Cliente</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.slice(0, 8).map((s) => (
                      <tr key={s._id}>
                        <td><strong>${Number(s.finalCharged).toFixed(2)}</strong></td>
                        <td>{s.client?.name || "Cliente"}</td>
                        <td>{new Date(s.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Link href="/dashboard/sales" className="dashboard-link-more">Ver todas las ventas</Link>
            </>
          )}
        </div>
        <div className="card">
          <h3 className="section-title">Ventas por mes</h3>
          <Bar data={chartData} />
        </div>
        <div className={`card ${hasLowStock ? "card-warning" : ""}`}>
          <h3 className="section-title">Productos con poco stock {hasLowStock ? `(${lowStock.length})` : ""}</h3>
          {lowStock.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✓</div>
              <p>Todo en orden</p>
            </div>
          ) : (
            <>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Stock / Mínimo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.map((item) => (
                      <tr key={item._id}>
                        <td><Link href="/dashboard/products">{item.name}</Link></td>
                        <td><span className="badge badge-warning">{item.currentStock} / {item.minStock}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Link href="/dashboard/products" className="dashboard-link-more">Ver todos los productos</Link>
            </>
          )}
        </div>
        <div className="card">
          <h3 className="section-title">Top clientes</h3>
          {(report?.topClients || []).length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👤</div>
              <p>Sin datos aún</p>
            </div>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(report?.topClients || []).map((item, i) => (
                    <tr key={item._id || i}>
                      <td>{item.name || item.email || "Cliente"}</td>
                      <td><strong>${Number(item.total).toFixed(2)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
