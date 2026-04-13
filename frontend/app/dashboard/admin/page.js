"use client";

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend } from "chart.js";
import { io } from "socket.io-client";
import { api } from "../../../lib/api";
import { TokenContext } from "../TokenContext";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

export default function AdminPanelPage() {
  const { token } = useContext(TokenContext);
  const [me, setMe] = useState(null);
  const [matrix, setMatrix] = useState(null);
  const [auditData, setAuditData] = useState([]);
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({
    totalLogs: 0,
    topActions: [],
    topEntities: [],
    dailyActivity: [],
    topUsers: [],
    anomalies: [],
    comparison: {
      currentPeriod: { from: "", to: "", total: 0 },
      previousPeriod: { from: "", to: "", total: 0 },
      delta: 0,
      deltaPct: 0
    }
  });
  const [filters, setFilters] = useState({
    q: "",
    entity: "",
    action: "",
    user: "",
    signature: "",
    from: "",
    to: "",
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [realTimeAlerts, setRealTimeAlerts] = useState([]);
  const [ackHistory, setAckHistory] = useState([]);
  const [ackPagination, setAckPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [settings, setSettings] = useState({ ackRetentionHours: 24 });
  const [settingsHistory, setSettingsHistory] = useState([]);
  const [settingsHistoryPagination, setSettingsHistoryPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [settingsHistorySummary, setSettingsHistorySummary] = useState({
    totalChanges: 0,
    lastChange: null,
    topUser: null,
    dailyActivity: [],
    windowDays: 7
  });
  const [settingsHistoryFilters, setSettingsHistoryFilters] = useState({
    user: "",
    q: "",
    changedField: "",
    windowDays: 7,
    from: "",
    to: ""
  });
  const [salesReport, setSalesReport] = useState(null);
  const socketRef = useRef(null);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadMe = async () => {
    if (!token) return;
    try {
      const { data } = await api.get("/auth/me", { headers });
      setMe(data);
    } catch {
      setMe(null);
    }
  };

  const loadPermissions = async () => {
    if (!token || me?.role !== "admin") return;
    try {
      const { data } = await api.get("/permissions", { headers });
      setMatrix(data);
    } catch {
      toast.error("No se pudo cargar matriz de permisos");
    }
  };

  const loadUsers = async () => {
    if (!token || me?.role !== "admin") return;
    try {
      const { data } = await api.get("/users", { headers });
      setUsers(data);
    } catch {
      setUsers([]);
    }
  };

  const loadAudit = async (override = {}) => {
    if (!token) return;
    setLoading(true);
    try {
      const merged = { ...filters, ...override };
      const params = {
        page: merged.page,
        limit: merged.limit
      };
      if (merged.q) params.q = merged.q;
      if (merged.entity) params.entity = merged.entity;
      if (merged.action) params.action = merged.action;
      if (merged.user) params.user = merged.user;
      if (merged.from) params.from = merged.from;
      if (merged.to) params.to = merged.to;

      const { data } = await api.get("/audit-logs", { headers, params });
      setAuditData(data.items || []);
      setPagination({ page: data.page, pages: data.pages, total: data.total });
    } catch {
      toast.error("No se pudo cargar auditoría");
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async (override = {}) => {
    if (!token) return;
    try {
      const merged = { ...filters, ...override };
      const params = {};
      if (merged.q) params.q = merged.q;
      if (merged.entity) params.entity = merged.entity;
      if (merged.action) params.action = merged.action;
      if (merged.user) params.user = merged.user;
      if (merged.from) params.from = merged.from;
      if (merged.to) params.to = merged.to;
      const { data } = await api.get("/audit-logs/summary", { headers, params });
      setSummary(data);
    } catch {
      toast.error("No se pudo cargar resumen de auditoría");
    }
  };

  const loadAckHistory = async (override = {}) => {
    if (!token || me?.role !== "admin") return;
    try {
      const params = {
        page: override.page || 1,
        limit: 10
      };
      if (filters.user) params.user = filters.user;
      if (filters.signature) params.signature = filters.signature;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      const { data } = await api.get("/audit-logs/acknowledgements", { headers, params });
      setAckHistory(data.items || []);
      setAckPagination({ page: data.page, pages: data.pages, total: data.total });
    } catch {
      toast.error("No se pudo cargar historial de alertas reconocidas");
    }
  };

  const loadSettings = async () => {
    if (!token || me?.role !== "admin") return;
    try {
      const { data } = await api.get("/settings", { headers });
      setSettings({ ackRetentionHours: Number(data.ackRetentionHours || 24) });
    } catch {
      toast.error("No se pudo cargar configuración del sistema");
    }
  };

  const loadSettingsHistory = async (override = {}) => {
    if (!token || me?.role !== "admin") return;
    try {
      const merged = { ...settingsHistoryFilters, ...override };
      const params = {
        page: merged.page || 1,
        limit: 10
      };
      if (merged.user) params.user = merged.user;
      if (merged.q) params.q = merged.q;
      if (merged.changedField) params.changedField = merged.changedField;
      if (merged.from) params.from = merged.from;
      if (merged.to) params.to = merged.to;
      const { data } = await api.get("/settings/history", { headers, params });
      setSettingsHistory(data.items || []);
      setSettingsHistoryPagination({ page: data.page, pages: data.pages, total: data.total });
    } catch {
      toast.error("No se pudo cargar historial de configuración");
    }
  };

  const loadSettingsHistorySummary = async (override = {}) => {
    if (!token || me?.role !== "admin") return;
    try {
      const merged = { ...settingsHistoryFilters, ...override };
      const params = {};
      if (merged.user) params.user = merged.user;
      if (merged.q) params.q = merged.q;
      if (merged.changedField) params.changedField = merged.changedField;
      if (merged.windowDays) params.windowDays = merged.windowDays;
      if (merged.from) params.from = merged.from;
      if (merged.to) params.to = merged.to;
      const { data } = await api.get("/settings/history/summary", { headers, params });
      setSettingsHistorySummary({
        totalChanges: data.totalChanges || 0,
        lastChange: data.lastChange || null,
        topUser: data.topUser || null,
        dailyActivity: data.dailyActivity || [],
        windowDays: data.windowDays || 7
      });
    } catch {
      toast.error("No se pudo cargar resumen de cambios de configuración");
    }
  };

  const exportSettingsHistory = (format) => {
    if (!token || me?.role !== "admin") return;
    const params = new URLSearchParams();
    if (settingsHistoryFilters.user) params.set("user", settingsHistoryFilters.user);
    if (settingsHistoryFilters.q) params.set("q", settingsHistoryFilters.q);
    if (settingsHistoryFilters.changedField) params.set("changedField", settingsHistoryFilters.changedField);
    if (settingsHistoryFilters.from) params.set("from", settingsHistoryFilters.from);
    if (settingsHistoryFilters.to) params.set("to", settingsHistoryFilters.to);

    const endpoint = `/settings/history/export/${format}${params.toString() ? `?${params.toString()}` : ""}`;
    api
      .get(endpoint, { headers, responseType: "blob" })
      .then((response) => {
        const blob = new Blob([response.data], { type: response.headers["content-type"] });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = format === "excel" ? "settings-history.xlsx" : "settings-history.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        toast.error("No se pudo exportar historial de configuración");
      });
  };

  const saveSettings = async () => {
    if (!token || me?.role !== "admin") return;
    try {
      const { data } = await api.put("/settings", settings, {
        headers: { ...headers, "x-csrf-token": getCsrfToken() }
      });
      setSettings({ ackRetentionHours: Number(data.ackRetentionHours || 24) });
      loadSettingsHistory({ page: 1 });
      loadSettingsHistorySummary({ page: 1 });
      toast.success("Configuración guardada");
    } catch {
      toast.error("No se pudo guardar configuración");
    }
  };

  const exportAckHistory = (format) => {
    if (!token || me?.role !== "admin") return;
    const params = new URLSearchParams();
    if (filters.user) params.set("user", filters.user);
    if (filters.signature) params.set("signature", filters.signature);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);

    const endpoint = `/audit-logs/acknowledgements/export/${format}${params.toString() ? `?${params.toString()}` : ""}`;
    api
      .get(endpoint, { headers, responseType: "blob" })
      .then((response) => {
        const blob = new Blob([response.data], { type: response.headers["content-type"] });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = format === "excel" ? "acknowledgements.xlsx" : "acknowledgements.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        toast.error("No se pudo exportar historial de reconocimientos");
      });
  };

  const buildAuditQuery = () => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.entity) params.set("entity", filters.entity);
    if (filters.action) params.set("action", filters.action);
    if (filters.user) params.set("user", filters.user);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    return params.toString();
  };

  const exportAudit = (format) => {
    if (!token) return;
    const query = buildAuditQuery();
    const endpoint = `/audit-logs/export/${format}${query ? `?${query}` : ""}`;
    api
      .get(endpoint, { headers, responseType: "blob" })
      .then((response) => {
        const blob = new Blob([response.data], { type: response.headers["content-type"] });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = format === "excel" ? "audit-logs.xlsx" : "audit-logs.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        toast.error("No se pudo exportar auditoría");
      });
  };

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const socketBase = apiBase.replace(/\/api$/, "");
    const socket = io(socketBase, {
      auth: { token },
      transports: ["websocket"]
    });
    socketRef.current = socket;

    socket.on("audit:anomaly", (payload) => {
      const signature = payload?.signature;
      if (signature) {
        setRealTimeAlerts((prev) => {
          if (prev.some((item) => item.signature === signature)) return prev;
          return [payload, ...prev].slice(0, 20);
        });
      }
      if (payload?.severity === "high") {
        toast.error(payload.message || "Anomalía crítica detectada en auditoría");
      } else {
        toast(payload?.message || "Nueva señal de auditoría detectada");
      }
    });

    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    loadPermissions();
    loadSettings();
    loadUsers();
    loadAudit();
    loadSummary();
    loadAckHistory();
    loadSettingsHistory();
    loadSettingsHistorySummary();
    if (me?.role === "admin") {
      api.get("/reports/dashboard", { headers }).then(({ data }) => setSalesReport(data)).catch(() => setSalesReport(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, me?.role]);

  const togglePermission = (role, permission) => {
    setMatrix((prev) => {
      if (!prev) return prev;
      const current = prev.matrix[role] || [];
      const exists = current.includes(permission);
      const nextPermissions = exists ? current.filter((p) => p !== permission) : [...current, permission];
      return { ...prev, matrix: { ...prev.matrix, [role]: nextPermissions } };
    });
  };

  const saveRole = async (role) => {
    if (!matrix) return;
    try {
      const { data } = await api.put(
        "/permissions",
        { role, permissions: matrix.matrix[role] || [] },
        { headers: { ...headers, "x-csrf-token": getCsrfToken() } }
      );
      setMatrix(data);
      toast.success(`Permisos de ${role} guardados`);
    } catch {
      toast.error("No se pudieron guardar permisos");
    }
  };

  const summaryChartData = {
    labels: (summary.dailyActivity || []).map((item) => item.date),
    datasets: [
      {
        label: "Logs por día",
        data: (summary.dailyActivity || []).map((item) => item.total)
      }
    ]
  };

  const settingsHistoryActivityLevel = useMemo(() => {
    const values = (settingsHistorySummary.dailyActivity || []).map((item) => item.total);
    const avg = values.length ? Number((values.reduce((acc, v) => acc + v, 0) / values.length).toFixed(2)) : 0;
    if (avg <= 1) return { avg, label: "Actividad baja", color: "#22c55e" };
    if (avg <= 3) return { avg, label: "Actividad media", color: "#eab308" };
    return { avg, label: "Actividad alta", color: "#ef4444" };
  }, [settingsHistorySummary.dailyActivity]);

  const settingsHistoryChartData = {
    labels: (settingsHistorySummary.dailyActivity || []).map((item) => item.date),
    datasets: [
      {
        type: "bar",
        label: "Cambios por día",
        data: (settingsHistorySummary.dailyActivity || []).map((item) => item.total)
      },
      {
        type: "line",
        label: "Promedio diario",
        data: (settingsHistorySummary.dailyActivity || []).map(() => settingsHistoryActivityLevel.avg),
        borderColor: settingsHistoryActivityLevel.color,
        backgroundColor: settingsHistoryActivityLevel.color,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.25
      }
    ]
  };

  const salesChartData = {
    labels: (salesReport?.salesByMonth || []).map((item) => `Mes ${item._id}`),
    datasets: [
      {
        label: "Ventas ($)",
        data: (salesReport?.salesByMonth || []).map((item) => item.total),
        backgroundColor: "rgba(98, 173, 213, 0.6)",
        borderColor: "rgb(98, 173, 213)",
        borderWidth: 1
      }
    ]
  };

  const topProductsChartData = {
    labels: (salesReport?.topProducts || []).map((p) => p.name || p.sku || `Producto ${p._id}`),
    datasets: [
      {
        label: "Unidades vendidas",
        data: (salesReport?.topProducts || []).map((p) => p.soldQty),
        backgroundColor: "rgba(34, 197, 94, 0.6)",
        borderColor: "rgb(34, 197, 94)",
        borderWidth: 1
      }
    ]
  };

  const acknowledgeAlert = (signature) => {
    if (!socketRef.current || !signature) return;
    socketRef.current.emit("audit:anomaly:ack", { signature });
    setRealTimeAlerts((prev) => prev.filter((item) => item.signature !== signature));
    toast.success("Alerta reconocida");
  };

  return (
    <main>
      <div className="page-header">
        <div>
          <h1 className="page-title">Panel de Auditoría y Permisos</h1>
          <p className="page-subtitle">Rol: {me?.role || "sin sesión"}</p>
        </div>
      </div>

      {me?.role === "admin" && (
        <div className="card admin-section admin-sales-charts" style={{ marginBottom: 24 }}>
          <h3 className="section-title">Ventas y productos vendidos</h3>
          <div className="grid grid-2" style={{ gap: 20 }}>
            <div className="card">
              <h4 className="reportes-table-title">Ventas por mes</h4>
              {salesReport ? (
                <Bar data={salesChartData} options={{ responsive: true, maintainAspectRatio: true, aspectRatio: 1.8 }} />
              ) : (
                <p className="dashboard-muted">Cargando datos de ventas...</p>
              )}
            </div>
            <div className="card">
              <h4 className="reportes-table-title">Productos más vendidos</h4>
              {salesReport ? (
                (salesReport?.topProducts || []).length > 0 ? (
                  <Bar
                    data={topProductsChartData}
                    options={{
                      indexAxis: "y",
                      responsive: true,
                      maintainAspectRatio: true,
                      aspectRatio: 1.2,
                      plugins: { legend: { display: false } }
                    }}
                  />
                ) : (
                  <p className="dashboard-muted">Sin datos de productos vendidos aún.</p>
                )
              ) : (
                <p className="dashboard-muted">Cargando...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {me?.role === "admin" && (
        <div className="card admin-section" style={{ marginBottom: 16 }}>
          <h3 className="section-title">Configuración del sistema</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <label>Retención ACK (horas)</label>
            <input
              type="number"
              min={1}
              max={720}
              value={settings.ackRetentionHours}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  ackRetentionHours: Number(e.target.value || 24)
                }))
              }
            />
            <button onClick={saveSettings}>Guardar configuración</button>
          </div>
          <div className="card" style={{ marginBottom: 12 }}>
            <h4>Bitácora de cambios de configuración</h4>
            <div className="grid grid-2" style={{ marginBottom: 10 }}>
              <input
                placeholder="Búsqueda global (acción, ruta, campo...)"
                value={settingsHistoryFilters.q}
                onChange={(e) => setSettingsHistoryFilters((prev) => ({ ...prev, q: e.target.value }))}
              />
              <input
                placeholder="Campo cambiado (ej: ackRetentionHours)"
                value={settingsHistoryFilters.changedField}
                onChange={(e) => setSettingsHistoryFilters((prev) => ({ ...prev, changedField: e.target.value }))}
              />
              <select
                value={settingsHistoryFilters.windowDays}
                onChange={(e) => setSettingsHistoryFilters((prev) => ({ ...prev, windowDays: Number(e.target.value) }))}
              >
                <option value={7}>Ventana 7 días</option>
                <option value={30}>Ventana 30 días</option>
              </select>
              <select
                value={settingsHistoryFilters.user}
                onChange={(e) => setSettingsHistoryFilters((prev) => ({ ...prev, user: e.target.value }))}
              >
                <option value="">Todos los usuarios</option>
                {users.map((u) => (
                  <option key={`settings-history-${u._id}`} value={u._id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={settingsHistoryFilters.from}
                onChange={(e) => setSettingsHistoryFilters((prev) => ({ ...prev, from: e.target.value }))}
              />
              <input
                type="date"
                value={settingsHistoryFilters.to}
                onChange={(e) => setSettingsHistoryFilters((prev) => ({ ...prev, to: e.target.value }))}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    loadSettingsHistory({ page: 1 });
                    loadSettingsHistorySummary({ page: 1 });
                  }}
                >
                  Aplicar filtros
                </button>
                <button onClick={() => exportSettingsHistory("csv")}>Exportar CSV</button>
                <button onClick={() => exportSettingsHistory("excel")}>Exportar Excel</button>
              </div>
            </div>
            <p>
              Página {settingsHistoryPagination.page} de {settingsHistoryPagination.pages} - {settingsHistoryPagination.total} cambios
            </p>
            <div className="grid grid-2" style={{ marginBottom: 10 }}>
              <div className="card">
                <p>Total cambios filtrados: {settingsHistorySummary.totalChanges}</p>
              </div>
              <div className="card">
                <p>
                  Último cambio:{" "}
                  {settingsHistorySummary.lastChange
                    ? new Date(settingsHistorySummary.lastChange.createdAt).toLocaleString()
                    : "N/D"}
                </p>
                <p>
                  Usuario último cambio:{" "}
                  {settingsHistorySummary.lastChange?.user?.name
                    ? `${settingsHistorySummary.lastChange.user.name} (${settingsHistorySummary.lastChange.user.email})`
                    : "N/D"}
                </p>
                <p>
                  Usuario más activo:{" "}
                  {settingsHistorySummary.topUser?.name
                    ? `${settingsHistorySummary.topUser.name} (${settingsHistorySummary.topUser.total})`
                    : "N/D"}
                </p>
              </div>
            </div>
            <div className="card" style={{ marginBottom: 10 }}>
              <h5 style={{ marginTop: 0 }}>
                Tendencia de cambios ({settingsHistorySummary.windowDays} días) —{" "}
                <span style={{ color: settingsHistoryActivityLevel.color, fontWeight: 600 }}>
                  {settingsHistoryActivityLevel.label}
                </span>
                {" "}(promedio {settingsHistoryActivityLevel.avg} por día)
              </h5>
              <Bar data={settingsHistoryChartData} />
            </div>
            {settingsHistory.length === 0 && <p>Sin cambios registrados.</p>}
            {settingsHistory.map((entry) => (
              <div key={entry._id} style={{ borderTop: "1px solid #2a3a5a", paddingTop: 8, marginTop: 8 }}>
                <p>
                  <strong>Fecha:</strong> {new Date(entry.createdAt).toLocaleString()}
                </p>
                <p>
                  <strong>Usuario:</strong> {entry.user?.name || "N/D"} ({entry.user?.email || "N/D"})
                </p>
                <p>
                  <strong>Antes:</strong> {JSON.stringify(entry.before || {})}
                </p>
                <p>
                  <strong>Después:</strong> {JSON.stringify(entry.after || {})}
                </p>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                onClick={() => {
                  if (settingsHistoryPagination.page > 1) loadSettingsHistory({ page: settingsHistoryPagination.page - 1 });
                }}
                disabled={settingsHistoryPagination.page <= 1}
              >
                Anterior
              </button>
              <button
                onClick={() => {
                  if (settingsHistoryPagination.page < settingsHistoryPagination.pages)
                    loadSettingsHistory({ page: settingsHistoryPagination.page + 1 });
                }}
                disabled={settingsHistoryPagination.page >= settingsHistoryPagination.pages}
              >
                Siguiente
              </button>
            </div>
          </div>

          <h3>Matriz de permisos editable</h3>
          {!matrix && <p>Ingresa token admin para cargar permisos.</p>}
          {matrix &&
            Object.keys(matrix.matrix).map((role) => (
              <div key={role} style={{ marginBottom: 14 }}>
                <h4>{role}</h4>
                <div className="grid grid-2">
                  {matrix.availablePermissions.map((permission) => {
                    const checked = (matrix.matrix[role] || []).includes(permission);
                    return (
                      <label key={`${role}-${permission}`} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(role, permission)}
                        />
                        <span>{permission}</span>
                      </label>
                    );
                  })}
                </div>
                <button onClick={() => saveRole(role)} style={{ marginTop: 8 }}>
                  Guardar {role}
                </button>
              </div>
            ))}
        </div>
      )}

      <div className="card">
        <h3>Auditoría avanzada (timeline)</h3>
        <div className="grid grid-2" style={{ marginBottom: 10 }}>
          <input
            placeholder="Búsqueda global (entidad, acción, id)"
            value={filters.q}
            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value, page: 1 }))}
          />
          <input
            placeholder="Entidad (sale, repair, user...)"
            value={filters.entity}
            onChange={(e) => setFilters((prev) => ({ ...prev, entity: e.target.value, page: 1 }))}
          />
          <input
            placeholder="Acción (create, update, attend...)"
            value={filters.action}
            onChange={(e) => setFilters((prev) => ({ ...prev, action: e.target.value, page: 1 }))}
          />
          <select
            value={filters.user}
            onChange={(e) => setFilters((prev) => ({ ...prev, user: e.target.value, page: 1 }))}
          >
            <option value="">Todos los usuarios</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
          <input type="date" value={filters.from} onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value, page: 1 }))} />
          <input type="date" value={filters.to} onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value, page: 1 }))} />
          <input
            placeholder="Firma ACK (solo historial)"
            value={filters.signature}
            onChange={(e) => setFilters((prev) => ({ ...prev, signature: e.target.value, page: 1 }))}
          />
          <select
            value={filters.limit}
            onChange={(e) => setFilters((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
          >
            <option value={10}>10 por página</option>
            <option value={20}>20 por página</option>
            <option value={50}>50 por página</option>
          </select>
          <button
            onClick={() => {
              loadAudit({ page: 1 });
              loadSummary({ page: 1 });
              loadAckHistory({ page: 1 });
            }}
          >
            Aplicar filtros
          </button>
          <button onClick={() => exportAudit("csv")}>Exportar CSV</button>
          <button onClick={() => exportAudit("excel")}>Exportar Excel</button>
        </div>
        <div className="grid grid-2" style={{ marginBottom: 14 }}>
          <div className="card">
            <p>Total de logs: {summary.totalLogs}</p>
            <p>
              Tendencia: {summary.comparison?.delta >= 0 ? "+" : ""}
              {summary.comparison?.delta || 0} ({summary.comparison?.deltaPct || 0}%)
            </p>
            <p>
              Actual: {summary.comparison?.currentPeriod?.total || 0} | Prev:{" "}
              {summary.comparison?.previousPeriod?.total || 0}
            </p>
            <p>Top acciones:</p>
            {(summary.topActions || []).map((item, idx) => (
              <p key={`${item.action}-${idx}`}>
                {item.action || "N/D"}: {item.total}
              </p>
            ))}
          </div>
          <div className="card">
            <p>Top entidades:</p>
            {(summary.topEntities || []).map((item, idx) => (
              <p key={`${item.entity}-${idx}`}>
                {item.entity || "N/D"}: {item.total}
              </p>
            ))}
            <p style={{ marginTop: 12 }}>Usuarios más activos:</p>
            {(summary.topUsers || []).map((item, idx) => (
              <p key={`${item._id || idx}`}>
                {item.name || item.email || "Usuario"}: {item.total}
              </p>
            ))}
          </div>
        </div>
        <div className="card" style={{ marginBottom: 14 }}>
          <h4>Alertas inteligentes (anomalías)</h4>
          {(summary.anomalies || []).length === 0 && <p>Sin anomalías relevantes en el periodo actual.</p>}
          {(summary.anomalies || []).map((anomaly, idx) => (
            <div key={`${anomaly.type}-${idx}`} style={{ borderTop: "1px solid #2a3a5a", paddingTop: 8, marginTop: 8 }}>
              <span className={`risk-chip risk-${anomaly.risk || "low"}`}>
                {anomaly.risk === "high" ? "Riesgo alto" : anomaly.risk === "medium" ? "Riesgo medio" : "Riesgo bajo"}
              </span>
              <p style={{ margin: "6px 0 2px" }}>
                <strong>{anomaly.title}</strong>
              </p>
              <p style={{ margin: 0 }}>{anomaly.description}</p>
            </div>
          ))}
        </div>
        <div className="card" style={{ marginBottom: 14 }}>
          <h4>Alertas en tiempo real (socket)</h4>
          {realTimeAlerts.length === 0 && <p>Sin alertas nuevas en tiempo real.</p>}
          {realTimeAlerts.map((alert) => (
            <div key={alert.signature} style={{ borderTop: "1px solid #2a3a5a", paddingTop: 8, marginTop: 8 }}>
              <span className={`risk-chip risk-${alert.severity === "high" ? "high" : "medium"}`}>
                {alert.severity === "high" ? "Riesgo alto" : "Riesgo medio"}
              </span>
              <p style={{ margin: "6px 0 2px" }}>{alert.message}</p>
              <button onClick={() => acknowledgeAlert(alert.signature)}>Reconocer alerta</button>
            </div>
          ))}
        </div>
        {me?.role === "admin" && (
          <div className="card" style={{ marginBottom: 14 }}>
            <h4>Historial de alertas reconocidas</h4>
            <p>
              Página {ackPagination.page} de {ackPagination.pages} - {ackPagination.total} reconocimientos
            </p>
            {ackHistory.length === 0 && <p>Sin reconocimientos registrados para los filtros actuales.</p>}
            {ackHistory.map((ack) => (
              <div key={ack._id} style={{ borderTop: "1px solid #2a3a5a", paddingTop: 8, marginTop: 8 }}>
                <p>
                  <strong>Firma:</strong> {ack.signature}
                </p>
                <p>
                  <strong>Usuario:</strong> {ack.user?.name || "N/D"} ({ack.user?.email || "N/D"})
                </p>
                <p>
                  <strong>Reconocida:</strong> {new Date(ack.createdAt).toLocaleString()} | <strong>Expira:</strong>{" "}
                  {new Date(ack.expiresAt).toLocaleString()}
                </p>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                onClick={() => {
                  if (ackPagination.page > 1) loadAckHistory({ page: ackPagination.page - 1 });
                }}
                disabled={ackPagination.page <= 1}
              >
                Anterior
              </button>
              <button
                onClick={() => {
                  if (ackPagination.page < ackPagination.pages) loadAckHistory({ page: ackPagination.page + 1 });
                }}
                disabled={ackPagination.page >= ackPagination.pages}
              >
                Siguiente
              </button>
              <button onClick={() => exportAckHistory("csv")}>Exportar ACK CSV</button>
              <button onClick={() => exportAckHistory("excel")}>Exportar ACK Excel</button>
            </div>
          </div>
        )}
        <div className="card" style={{ marginBottom: 14 }}>
          <h4>Actividad diaria</h4>
          <Bar data={summaryChartData} />
        </div>
        {loading && <p>Cargando...</p>}
        {!loading && (
          <>
            <div style={{ marginBottom: 8 }}>
              Página {pagination.page} de {pagination.pages} - {pagination.total} registros
            </div>
            <div className="timeline">
              {auditData.map((log) => (
                <div key={log._id} className="timeline-item">
                  <p>
                    <strong>{log.entity}</strong> / {log.action} / {new Date(log.createdAt).toLocaleString()}
                  </p>
                  <p>
                    Usuario: {log.user?.name || "sistema"} - {log.user?.email || "-"}
                  </p>
                  <details>
                    <summary>Ver diff</summary>
                    <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(log.diff || [], null, 2)}</pre>
                  </details>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                onClick={() => {
                  if (pagination.page > 1) {
                    const nextPage = pagination.page - 1;
                    setFilters((prev) => ({ ...prev, page: nextPage }));
                    loadAudit({ page: nextPage });
                  }
                }}
                disabled={pagination.page <= 1}
              >
                Anterior
              </button>
              <button
                onClick={() => {
                  if (pagination.page < pagination.pages) {
                    const nextPage = pagination.page + 1;
                    setFilters((prev) => ({ ...prev, page: nextPage }));
                    loadAudit({ page: nextPage });
                  }
                }}
                disabled={pagination.page >= pagination.pages}
              >
                Siguiente
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

const getCsrfToken = () => {
  const found = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("csrfToken="));
  return found ? decodeURIComponent(found.split("=")[1]) : "";
};
