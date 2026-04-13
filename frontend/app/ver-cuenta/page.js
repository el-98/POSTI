"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { api, setAuthSession } from "../../lib/api";

export default function VerCuentaPage() {
  const [clientCode, setClientCode] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = String(clientCode).trim().toUpperCase();
    const pinVal = String(pin).trim();
    if (!code) {
      toast.error("Ingresa tu código de cliente");
      return;
    }
    if (pinVal.length !== 6 || !/^\d+$/.test(pinVal)) {
      toast.error("El PIN debe tener 6 dígitos numéricos");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/client-access", { clientCode: code, pin: pinVal });
      try {
        setAuthSession({
          accessToken: data.accessToken || "",
          refreshToken: data.refreshToken || "",
          deviceId: data.deviceId || ""
        });
      } catch {
        // ignore
      }
      toast.success("Bienvenido");
      window.location.href = "/dashboard/cliente";
    } catch (err) {
      const msg = err.response?.data?.message || "Código o PIN incorrectos";
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <main className="ver-cuenta-page">
      <div className="ver-cuenta-card">
        <h1 className="ver-cuenta-title">Ver mi cuenta</h1>
        <p className="ver-cuenta-subtitle">
          Ingresa el código y PIN que te dio el negocio para ver tu monedero, compras y reparaciones.
        </p>
        <form onSubmit={handleSubmit} className="ver-cuenta-form">
          <label htmlFor="clientCode">Código de cliente</label>
          <input
            id="clientCode"
            type="text"
            placeholder="Ej. C-1000"
            value={clientCode}
            onChange={(e) => setClientCode(e.target.value)}
            autoComplete="off"
            disabled={loading}
            className="ver-cuenta-input"
          />
          <label htmlFor="pin">PIN (6 dígitos)</label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="••••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            autoComplete="off"
            disabled={loading}
            className="ver-cuenta-input"
          />
          <button type="submit" className="ver-cuenta-btn" disabled={loading}>
            {loading ? "Entrando…" : "Entrar a mi cuenta"}
          </button>
        </form>
        <p className="ver-cuenta-footer">
          <Link href="/dashboard" className="ver-cuenta-link">
            ¿Eres staff? Inicia sesión con correo
          </Link>
        </p>
      </div>
    </main>
  );
}
