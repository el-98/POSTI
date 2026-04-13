"use client";

import { useContext, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api } from "../../lib/api";
import { TokenContext, TokenProvider } from "./TokenContext";

export default function DashboardLayout({ children }) {
  return (
    <TokenProvider>
      <div className="dashboard-wrap">
        <DashboardContent>{children}</DashboardContent>
      </div>
    </TokenProvider>
  );
}

const PASSWORD_MIN = 8;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)/;

function DashboardContent({ children }) {
  const { token, user, login, logout, loading } = useContext(TokenContext);
  const router = useRouter();
  const pathname = usePathname();
  const [showRegister, setShowRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "cliente"
  });
  const [registerSubmitting, setRegisterSubmitting] = useState(false);
  const [lowStockList, setLowStockList] = useState([]);
  const [lowStockAlertDismissed, setLowStockAlertDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const until = sessionStorage.getItem("posit_lowstock_alert_dismissed");
      return until ? Date.now() < Number(until) : false;
    } catch {
      return false;
    }
  });
  const lowStockFetched = useRef(false);

  const handleLogout = () => {
    logout();
    router.replace("/dashboard");
  };

  useEffect(() => {
    if (loading) return;
    if (!token && pathname && pathname !== "/dashboard") {
      router.replace("/dashboard");
    }
  }, [loading, token, pathname, router]);

  useEffect(() => {
    if (!token || !user) return;
    if (pathname === "/dashboard" && user.role === "cliente") {
      router.replace("/dashboard/cliente");
      return;
    }
    if (pathname?.startsWith("/dashboard/admin") && user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    if (user.role === "cliente" && !pathname?.startsWith("/dashboard/cliente")) {
      router.replace("/dashboard/cliente");
    }
  }, [token, user, pathname, router]);

  useEffect(() => {
    if (!token || !user || user.role === "cliente") return;
    if (lowStockFetched.current) return;
    lowStockFetched.current = true;
    api
      .get("/reports/dashboard", { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setLowStockList(Array.isArray(data?.lowStock) ? data.lowStock : []))
      .catch(() => {});
  }, [token, user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Ingresa correo y contraseña");
      return;
    }
    setSubmitting(true);
    try {
      const userData = await login(email.trim(), password);
      toast.success("Sesión iniciada");
      if (userData?.role === "admin") router.push("/dashboard/admin");
      else if (userData?.role === "cliente") router.push("/dashboard/cliente");
      else router.push("/dashboard");
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.details?.length ? data.details.join(". ") : (data?.message || "Correo o contraseña incorrectos");
      toast.error(msg, { id: "login-error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const { name, email: regEmail, password: regPassword, confirmPassword, role } = registerForm;
    if (!name.trim() || name.trim().length < 3) {
      toast.error("El nombre debe tener al menos 3 caracteres");
      return;
    }
    if (!regEmail.trim()) {
      toast.error("Ingresa un correo electrónico válido");
      return;
    }
    if (regPassword.length < PASSWORD_MIN) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (!PASSWORD_REGEX.test(regPassword)) {
      toast.error("La contraseña debe incluir letras y al menos un número");
      return;
    }
    if (regPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setRegisterSubmitting(true);
    try {
      await api.post("/auth/register", {
        name: name.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: role === "vendedor" ? "vendedor" : "cliente"
      });
      const userData = await login(regEmail.trim(), regPassword);
      toast.success("Cuenta creada. Bienvenido.");
      setRegisterForm({ name: "", email: "", password: "", confirmPassword: "", role: "cliente" });
      setShowRegister(false);
      if (userData?.role === "admin") router.push("/dashboard/admin");
      else if (userData?.role === "cliente") router.push("/dashboard/cliente");
      else router.push("/dashboard");
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.details?.length ? data.details.join(". ") : (data?.message || "No se pudo crear la cuenta");
      toast.error(msg);
    } finally {
      setRegisterSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container dashboard-loading">
        <div className="loading-spinner" aria-hidden />
        <p>Cargando...</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="container dashboard-login-screen">
        <div className="dashboard-login-card">
          <h1 className="dashboard-login-title">ITCOMMERCE</h1>
          <p className="dashboard-login-subtitle">
            {showRegister ? "Crea tu cuenta" : "Inicia sesión para continuar"}
          </p>

          {!showRegister ? (
            <>
              <form onSubmit={handleLogin} className="dashboard-login-form">
                <label>Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej. admin@posit.local"
                  autoComplete="email"
                  disabled={submitting}
                />
                <label>Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  autoComplete="current-password"
                  disabled={submitting}
                />
                <button type="submit" className="dashboard-login-btn" disabled={submitting}>
                  {submitting ? "Entrando..." : "Iniciar sesión"}
                </button>
              </form>
              <p className="dashboard-auth-switch">
                ¿No tienes cuenta?{" "}
                <button type="button" className="dashboard-auth-link" onClick={() => setShowRegister(true)}>
                  Crear cuenta
                </button>
              </p>
              <p className="dashboard-auth-switch" style={{ marginTop: 8 }}>
                <Link href="/ver-cuenta" className="dashboard-auth-link">
                  ¿Eres cliente? Accede con código y PIN
                </Link>
              </p>
            </>
          ) : (
            <>
              <form onSubmit={handleRegister} className="dashboard-login-form">
                <label>Nombre completo</label>
                <input
                  type="text"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Mínimo 3 caracteres"
                  autoComplete="name"
                  disabled={registerSubmitting}
                />
                <label>Correo electrónico</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  disabled={registerSubmitting}
                />
                <label>Contraseña</label>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Mín. 8 caracteres, letras y un número"
                  autoComplete="new-password"
                  disabled={registerSubmitting}
                  minLength={PASSWORD_MIN}
                />
                <label>Confirmar contraseña</label>
                <input
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                  disabled={registerSubmitting}
                />
                <label>Rol</label>
                <select
                  value={registerForm.role}
                  onChange={(e) => setRegisterForm((f) => ({ ...f, role: e.target.value }))}
                  disabled={registerSubmitting}
                >
                  <option value="cliente">Cliente</option>
                  <option value="vendedor">Vendedor</option>
                </select>
                <button type="submit" className="dashboard-login-btn" disabled={registerSubmitting}>
                  {registerSubmitting ? "Creando cuenta..." : "Crear cuenta"}
                </button>
              </form>
              <p className="dashboard-auth-switch">
                ¿Ya tienes cuenta?{" "}
                <button type="button" className="dashboard-auth-link" onClick={() => setShowRegister(false)}>
                  Iniciar sesión
                </button>
              </p>
            </>
          )}

          {!showRegister && (
            <div className="dashboard-login-hint dashboard-login-admin-hint">
              <strong>Único administrador</strong>
              <p>Se crea automáticamente al iniciar el servidor. Inicia sesión con:</p>
              <p><code>admin@posit.local</code> / <code>12345678</code></p>
              <p className="dashboard-login-admin-note">No se puede crear otro administrador. Solo existen los roles Cliente y Vendedor en el registro.</p>
            </div>
          )}
          {showRegister && (
            <p className="dashboard-login-hint">
              Solo puedes registrarte como <strong>Cliente</strong> o <strong>Vendedor</strong>. La contraseña debe tener al menos 8 caracteres, letras y un número.
            </p>
          )}
        </div>
      </div>
    );
  }

  const isCliente = user?.role === "cliente";
  const isVendedor = user?.role === "vendedor";
  const isAdmin = user?.role === "admin";
  const showLowStockPush = !isCliente && lowStockList.length > 0 && !lowStockAlertDismissed;

  const dismissLowStockAlert = () => {
    setLowStockAlertDismissed(true);
    try {
      sessionStorage.setItem("posit_lowstock_alert_dismissed", String(Date.now() + 60 * 60 * 1000));
    } catch {}
  };

  return (
    <div className={`dashboard-shell ${showLowStockPush ? "has-push-alert" : ""}`}>
      {showLowStockPush && (
        <div className="push-alert push-alert-lowstock" role="alert">
          <div className="push-alert-inner">
            <div className="push-alert-head">
              <span className="push-alert-icon">⚠️</span>
              <strong>Productos con stock bajo</strong>
              <button
                type="button"
                className="push-alert-close"
                onClick={dismissLowStockAlert}
                aria-label="Cerrar alerta"
              >
                ×
              </button>
            </div>
            <ul className="push-alert-list">
              {lowStockList.map((p) => (
                <li key={p._id}>
                  <span className="push-alert-product-name">{p.name || p.sku || "Sin nombre"}</span>
                  <span className="push-alert-stock">
                    Stock: <strong>{p.currentStock}</strong> / Mín: {p.minStock}
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/dashboard/products" className="push-alert-cta" onClick={dismissLowStockAlert}>
              Ver productos →
            </Link>
          </div>
        </div>
      )}
      <aside className="dashboard-sidebar">
        <div className="dashboard-header-top">
          <div className="dashboard-brand">
            <div className="dashboard-brand-mark" aria-hidden>P</div>
            <div className="dashboard-brand-text">
              <span className="dashboard-brand-name">POSIT</span>
              <span className="dashboard-brand-tag">Punto de venta</span>
            </div>
          </div>
          <div className="dashboard-session">
            <span className="dashboard-session-user">
              {user?.name || user?.email || "Usuario"}
              {user?.role && <span className="dashboard-session-role"> · {user.role}</span>}
            </span>
            <button type="button" onClick={handleLogout} className="dashboard-logout-btn">
              Cerrar sesión
            </button>
          </div>
        </div>
        <nav className="dashboard-nav">
          {isCliente ? (
            <Link href="/dashboard/cliente" className={pathname?.startsWith("/dashboard/cliente") ? "dashboard-nav-active" : ""}><span className="nav-icon" aria-hidden>👤</span> Mi cuenta</Link>
          ) : (
            <>
              <Link href="/dashboard/pos" className={pathname === "/dashboard/pos" ? "dashboard-nav-active" : ""}><span className="nav-icon" aria-hidden>🛒</span> Caja</Link>
              <Link href="/dashboard" className={pathname === "/dashboard" ? "dashboard-nav-active" : ""}><span className="nav-icon" aria-hidden>📊</span> Dashboard</Link>
              <Link href="/dashboard/corte" className={pathname === "/dashboard/corte" ? "dashboard-nav-active" : ""}><span className="nav-icon" aria-hidden>💰</span> Corte</Link>
              <Link href="/dashboard/reportes" className={pathname === "/dashboard/reportes" ? "dashboard-nav-active" : ""}><span className="nav-icon" aria-hidden>📋</span> Reportes</Link>
              <Link href="/dashboard/products" className={pathname === "/dashboard/products" ? "dashboard-nav-active" : ""}><span className="nav-icon" aria-hidden>📦</span> Productos</Link>
              <Link href="/dashboard/sales" className={pathname === "/dashboard/sales" ? "dashboard-nav-active" : ""}><span className="nav-icon" aria-hidden>🧾</span> Ventas</Link>
              <Link href="/dashboard/rewards" className={pathname === "/dashboard/rewards" ? "dashboard-nav-active" : ""}><span className="nav-icon" aria-hidden>🎁</span> Recompensas</Link>
              <Link href="/dashboard/purchases" className={pathname === "/dashboard/purchases" ? "dashboard-nav-active" : ""}><span className="nav-icon" aria-hidden>🛍️</span> Compras</Link>
              <Link href="/dashboard/repairs" className={pathname === "/dashboard/repairs" ? "dashboard-nav-active" : ""}><span className="nav-icon" aria-hidden>🔧</span> Reparaciones</Link>
              {isAdmin && <Link href="/dashboard/admin" className={pathname?.startsWith("/dashboard/admin") ? "dashboard-nav-active" : ""}><span className="nav-icon" aria-hidden>⚙️</span> Admin</Link>}
            </>
          )}
        </nav>
      </aside>
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
