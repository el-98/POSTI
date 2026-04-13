"use client";

import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";
import { TokenContext } from "../TokenContext";

const STATUSES = ["Recibido", "En proceso", "Terminado", "Entregado"];

export default function RepairsPage() {
  const { token } = useContext(TokenContext);
  const [users, setUsers] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ client: "", problemDescription: "", estimatedDate: "", cost: "" });
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [newStatus, setNewStatus] = useState({});
  const [newClientName, setNewClientName] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const handleCreateClient = async (e) => {
    e?.preventDefault();
    const name = (newClientName || "").trim();
    if (!name) {
      toast.error("Escribe el nombre del cliente");
      return;
    }
    setCreatingClient(true);
    try {
      const { data } = await api.post("/users/clients", { name }, { headers });
      setUsers((prev) => [...prev, data].sort((a, b) => (a.name || "").localeCompare(b.name || "")));
      setForm((f) => ({ ...f, client: data._id }));
      setNewClientName("");
      toast.success(`Cliente "${data.name}" registrado`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al registrar cliente");
    } finally {
      setCreatingClient(false);
    }
  };

  const loadRepairs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pagination.page, limit: 20 });
      if (statusFilter) params.set("status", statusFilter);
      const { data } = await api.get(`/repairs?${params}`, { headers });
      setRepairs(data.items || []);
      setPagination((prev) => ({ ...prev, page: data.page || 1, pages: data.pages || 1, total: data.total || 0 }));
    } catch {
      toast.error("No se pudieron cargar reparaciones");
      setRepairs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadRepairs();
  }, [token, statusFilter, pagination.page]);

  useEffect(() => {
    if (!token) return;
    api.get("/users/clients", { headers }).then((r) => setUsers(Array.isArray(r.data) ? r.data : [])).catch(() => setUsers([]));
  }, [token]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("Ingresa el token");
      return;
    }
    if (form.client === "__new__" || !form.client.trim()) {
      toast.error("Selecciona un cliente o registra uno nuevo por nombre");
      return;
    }
    const payload = {
      client: form.client,
      problemDescription: form.problemDescription.trim()
    };
    if (form.estimatedDate) payload.estimatedDate = new Date(form.estimatedDate);
    if (form.cost !== "" && !Number.isNaN(Number(form.cost))) payload.cost = Number(form.cost);
    setCreating(true);
    try {
      const { data: created } = await api.post("/repairs", payload, { headers });
      toast.success("Reparación creada");
      setForm({ client: "", problemDescription: "", estimatedDate: "", cost: "" });
      loadRepairs();
      if (created?.trackingNumber) {
        const link = typeof window !== "undefined" ? `${window.location.origin}/public/repair-status?tracking=${encodeURIComponent(created.trackingNumber)}` : "";
        toast((t) => (
          <span>
            Código: <strong>{created.trackingNumber}</strong>
            {link && (
              <button
                type="button"
                style={{ marginLeft: 8, padding: "4px 10px", fontSize: 12, cursor: "pointer" }}
                onClick={() => {
                  navigator.clipboard?.writeText(link).then(() => toast.success("Enlace copiado. Entregar al cliente."));
                }}
              >
                Copiar enlace cliente
              </button>
            )}
          </span>
        ), { duration: 10000 });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al crear reparación");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (id) => {
    const status = newStatus[id];
    if (!status) return;
    setUpdatingId(id);
    try {
      await api.patch(`/repairs/${id}/status`, { status }, { headers });
      toast.success("Estado actualizado");
      setNewStatus((prev) => ({ ...prev, [id]: undefined }));
      loadRepairs();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al actualizar estado");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <main>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reparaciones</h1>
          <p className="page-subtitle">Seguimiento y registro de reparaciones</p>
        </div>
      </div>
      <div className="grid grid-2">
        <div className="card">
          <h3 className="section-title">Listado</h3>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Estado</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Todos</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {loading ? (
            <div className="empty-state">
              <div className="loading-spinner" style={{ margin: "0 auto 12px" }} />
              <p>Cargando…</p>
            </div>
          ) : repairs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔧</div>
              <p>No hay reparaciones</p>
            </div>
          ) : (
            <>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Cliente</th>
                      <th>Estado</th>
                      <th>Descripción</th>
                      <th style={{ width: 140 }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repairs.map((r) => (
                      <tr key={r._id}>
                        <td><strong>{r.trackingNumber}</strong></td>
                        <td>{r.client?.name ?? "-"}</td>
                        <td><span className="badge badge-success">{r.status}</span></td>
                        <td>{r.problemDescription?.slice(0, 35)}{(r.problemDescription?.length ?? 0) > 35 ? "…" : ""}</td>
                        <td>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: "6px 10px", fontSize: "0.8rem", marginRight: 6 }}
                            onClick={() => {
                              const link = typeof window !== "undefined" ? `${window.location.origin}/public/repair-status?tracking=${encodeURIComponent(r.trackingNumber)}` : "";
                              navigator.clipboard?.writeText(link).then(() => toast.success("Enlace copiado. Entregar al cliente."));
                            }}
                            title="Copiar enlace para que el cliente vea el estado"
                          >
                            Enlace cliente
                          </button>
                          <select value={newStatus[r._id] ?? ""} onChange={(e) => setNewStatus((prev) => ({ ...prev, [r._id]: e.target.value }))} style={{ marginRight: 6, padding: "6px 8px", fontSize: "0.8rem" }}>
                            <option value="">Cambiar</option>
                            {STATUSES.filter((s) => s !== r.status).map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          {newStatus[r._id] && (
                            <button type="button" className="btn-primary" style={{ padding: "6px 10px", fontSize: "0.8rem" }} onClick={() => handleStatusChange(r._id)} disabled={updatingId === r._id}>Aplicar</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pagination.pages > 1 && (
                <div className="pagination-bar">
                  <span>Pág. {pagination.page} de {pagination.pages}</span>
                  <button type="button" className="btn-secondary" onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))} disabled={pagination.page <= 1}>Anterior</button>
                  <button type="button" className="btn-secondary" onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.pages, p.page + 1) }))} disabled={pagination.page >= pagination.pages}>Siguiente</button>
                </div>
              )}
            </>
          )}
        </div>
        <div className="card">
          <h3 className="section-title">Nueva reparación</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Cliente</label>
              <select value={form.client} onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))} required={form.client !== "__new__"}>
                <option value="">Seleccionar</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                ))}
                <option value="__new__">➕ Nuevo cliente...</option>
              </select>
              {form.client === "__new__" && (
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input type="text" placeholder="Nombre del cliente" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateClient(e)} />
                  <button type="button" className="btn-primary" onClick={handleCreateClient} disabled={creatingClient || !newClientName.trim()}>{creatingClient ? "…" : "Registrar"}</button>
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Descripción del problema</label>
              <textarea placeholder="Describa el problema" value={form.problemDescription} onChange={(e) => setForm((f) => ({ ...f, problemDescription: e.target.value }))} required rows={3} />
            </div>
            <div className="form-group">
              <label>Fecha estimada</label>
              <input type="date" value={form.estimatedDate} onChange={(e) => setForm((f) => ({ ...f, estimatedDate: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Costo estimado</label>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={creating}>{creating ? "Guardando…" : "Crear reparación"}</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
