"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home-page">
      <div className="home-video-bg" aria-hidden>
        <span className="home-video-vignette" />
        <span className="home-video-light home-video-light-1" />
        <span className="home-video-light home-video-light-2" />
        <span className="home-video-light home-video-light-3" />
        <span className="home-video-grid" />
      </div>
      <div className="home-hero">
        <h1 className="home-title">ITCOMMERCE</h1>
        <p className="home-subtitle">Punto de venta, inventario, ventas y reparaciones en un solo lugar.</p>
        <div className="home-actions">
          <Link href="/dashboard" className="home-btn home-btn-primary">Entrar a la app</Link>
          <Link href="/public/repair-status" className="home-btn home-btn-secondary">Seguimiento de reparaciones</Link>
        </div>
      </div>
      <div className="home-features">
        <div className="home-feature">
          <strong>Caja</strong>
          <p>Venta rápida con grid de productos y carrito.</p>
        </div>
        <div className="home-feature">
          <strong>Dashboard</strong>
          <p>Ventas de hoy, recientes y métricas.</p>
        </div>
        <div className="home-feature">
          <strong>Productos y stock</strong>
          <p>Inventario, compras y alertas de bajo stock.</p>
        </div>
      </div>
    </main>
  );
}
