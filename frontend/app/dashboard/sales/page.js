"use client";

import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";
import { printTicket } from "../../../lib/printTicket";
import { TokenContext } from "../TokenContext";

const emptyItem = { product: "", quantity: "" };
const PAYMENT_METHODS = ["efectivo", "tarjeta", "transferencia", "monedero", "mixto"];
const PAYMENT_LABELS = { efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia", monedero: "Monedero", mixto: "Mixto" };

export default function SalesPage() {
  const { token } = useContext(TokenContext);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [sales, setSales] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [periodTotal, setPeriodTotal] = useState(0);
  const [byPayment, setByPayment] = useState([]);
  const [clientFilter, setClientFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [creating, setCreating] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientCredentials, setClientCredentials] = useState(null);

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
      const clientForList = { _id: data._id, name: data.name, email: data.email, clientCode: data.clientCode };
      setUsers((prev) => [...prev, clientForList].sort((a, b) => (a.name || "").localeCompare(b.name || "")));
      setClient(data._id);
      setNewClientName("");
      if (data.clientCode != null && data.pin != null) setClientCredentials({ clientCode: data.clientCode, pin: data.pin });
      toast.success(`Cliente "${data.name}" registrado`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al registrar cliente");
    } finally {
      setCreatingClient(false);
    }
  };

  const loadSales = () => {
    if (!token) return;
    const params = new URLSearchParams({ page: pagination.page, limit: 20 });
    if (clientFilter) params.set("client", clientFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (includeCancelled) params.set("includeCancelled", "1");
    api.get(`/sales?${params}`, { headers }).then((r) => {
      setSales(r.data.items || []);
      setPagination((p) => ({ ...p, page: r.data.page || 1, pages: r.data.pages || 1, total: r.data.total || 0 }));
      setPeriodTotal(r.data.periodTotal ?? 0);
      setByPayment(Array.isArray(r.data.byPayment) ? r.data.byPayment : []);
    }).catch(() => {
      setSales([]);
      setByPayment([]);
    });
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      api.get("/products", { headers }).then((r) => r.data).catch(() => []),
      api.get("/users/clients", { headers }).then((r) => r.data).catch(() => [])
    ])
      .then(([prods, usrs]) => {
        setProducts(Array.isArray(prods) ? prods : []);
        setUsers(Array.isArray(usrs) ? usrs : []);
      })
      .catch(() => {
        toast.error("Error al cargar datos");
        setProducts([]);
        setUsers([]);
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadSales();
  }, [token, clientFilter, dateFrom, dateTo, includeCancelled, pagination.page]);

  const handleCancelSale = async (saleId) => {
    if (!window.confirm("¿Cancelar esta venta? Se restaurará el stock de los productos.")) return;
    setCancellingId(saleId);
    try {
      await api.patch(`/sales/${saleId}/cancel`, {}, { headers });
      toast.success("Venta cancelada");
      loadSales();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al cancelar venta");
    } finally {
      setCancellingId(null);
    }
  };

  const exportCsv = () => {
    const headers = ["Fecha", "Cliente", "Total cobrado", "Pago", "Monedero aplicado"];
    const rows = sales.map((s) => [
      new Date(s.createdAt).toLocaleString(),
      (s.client?.name ?? "").replace(/"/g, '""'),
      Number(s.finalCharged).toFixed(2),
      PAYMENT_LABELS[s.paymentMethod] || s.paymentMethod,
      Number(s.walletApplied || 0).toFixed(2)
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ventas_${dateFrom || "inicio"}_${dateTo || "hoy"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("CSV descargado");
  };

  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }]);
  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("Ingresa el token");
      return;
    }
    if (client === "__new__" || !client.trim()) {
      toast.error("Selecciona un cliente o registra uno nuevo por nombre");
      return;
    }
    const payload = {
      client: client.trim(),
      paymentMethod,
      items: items
        .filter((it) => it.product && Number(it.quantity) >= 1)
        .map((it) => ({ product: it.product, quantity: Number(it.quantity) }))
    };
    if (payload.items.length === 0) {
      toast.error("Anade al menos un item con producto y cantidad");
      return;
    }
    setCreating(true);
    try {
      await api.post("/sales", payload, { headers });
      toast.success("Venta registrada");
      setClient("");
      setPaymentMethod("efectivo");
      setItems([{ ...emptyItem }]);
      loadSales();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al crear venta");
    } finally {
      setCreating(false);
    }
  };

  return (
    <main>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ventas</h1>
          <p className="page-subtitle">Historial y registro de ventas</p>
        </div>
      </div>
      <div className="grid grid-2">
        <div className="card">
          <h3 className="section-title">Historial</h3>
          <div className="sales-filters">
            <input placeholder="Filtrar por cliente (ID)" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="sales-filter-input" />
            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: "0.85rem", marginRight: 4 }}>Desde</span>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: "0.85rem", marginRight: 4 }}>Hasta</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={includeCancelled} onChange={(e) => setIncludeCancelled(e.target.checked)} />
              <span style={{ fontSize: "0.85rem" }}>Ver canceladas</span>
            </label>
            <button type="button" className="btn-secondary" onClick={exportCsv} disabled={sales.length === 0} style={{ padding: "8px 12px", fontSize: "0.85rem" }}>
              Exportar CSV
            </button>
          </div>
          {(pagination.total > 0 || periodTotal > 0) && (
            <div className="sales-period-total">
              <strong>Total vendido (filtro actual):</strong> ${Number(periodTotal).toFixed(2)} — {pagination.total} venta(s)
            </div>
          )}
          {byPayment.length > 0 && (
            <div className="sales-by-payment">
              {byPayment.map((p) => (
                <div key={p._id} className="sales-by-payment-card">
                  <span className="sales-by-payment-label">{PAYMENT_LABELS[p._id] || p._id}</span>
                  <span className="sales-by-payment-total">${Number(p.total).toFixed(2)}</span>
                  <span className="sales-by-payment-meta">{p.count} venta(s)</span>
                </div>
              ))}
            </div>
          )}
          {sales.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🛒</div>
              <p>No hay ventas registradas</p>
            </div>
          ) : (
            <>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Total</th>
                      <th>Pago</th>
                      <th>Fecha</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((s) => (
                      <tr key={s._id} className={s.cancelled ? "sale-row-cancelled" : ""}>
                        <td>
                          <strong>{s.client?.name ?? "-"}</strong>
                          {s.cancelled && <span className="badge badge-danger" style={{ marginLeft: 6 }}>Cancelada</span>}
                        </td>
                        <td>${Number(s.finalCharged).toFixed(2)}</td>
                        <td>{PAYMENT_LABELS[s.paymentMethod] || s.paymentMethod}</td>
                        <td>{new Date(s.createdAt).toLocaleString()}</td>
                        <td>
                          {!s.cancelled && (
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: "6px 10px", fontSize: "0.8rem", marginRight: 6 }}
                              onClick={() => handleCancelSale(s._id)}
                              disabled={cancellingId === s._id}
                            >
                              {cancellingId === s._id ? "Cancelando…" : "Cancelar"}
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                            onClick={() =>
                              printTicket({
                                items: (s.items || []).map((i) => ({
                                  name: i.product?.name ?? "-",
                                  quantity: i.quantity,
                                  unitPrice: i.unitPrice,
                                  subtotal: i.subtotal ?? (i.unitPrice * i.quantity)
                                })),
                                clientName: s.client?.name ?? "-",
                                subtotal: s.total,
                                walletApplied: s.walletApplied,
                                total: s.finalCharged,
                                paymentMethod: s.paymentMethod,
                                date: s.createdAt
                              })
                            }
                          >
                            Ticket / PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pagination.pages > 1 && (
                <div className="pagination-bar">
                  <span>Pág. {pagination.page} de {pagination.pages} ({pagination.total} total)</span>
                  <button type="button" className="btn-secondary" onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))} disabled={pagination.page <= 1}>Anterior</button>
                  <button type="button" className="btn-secondary" onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.pages, p.page + 1) }))} disabled={pagination.page >= pagination.pages}>Siguiente</button>
                </div>
              )}
            </>
          )}
        </div>
        <div className="card">
          <h3 className="section-title">Registrar venta</h3>
          {loading && <p className="dashboard-muted">Cargando productos y clientes…</p>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Cliente</label>
              <select value={client} onChange={(e) => setClient(e.target.value)} required={client !== "__new__"}>
                <option value="">Seleccionar cliente</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                ))}
                <option value="__new__">➕ Nuevo cliente...</option>
              </select>
              {client === "__new__" && (
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input type="text" placeholder="Nombre del cliente" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateClient(e)} />
                  <button type="button" className="btn-primary" onClick={handleCreateClient} disabled={creatingClient || !newClientName.trim()}>{creatingClient ? "Registrando..." : "Registrar"}</button>
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Forma de pago</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{PAYMENT_LABELS[m] || m}</option>
                ))}
              </select>
            </div>
            <h4 className="reportes-table-title" style={{ marginTop: 16 }}>Ítems</h4>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                <select value={it.product} onChange={(e) => updateItem(i, "product", e.target.value)} required style={{ flex: "1 1 180px" }}>
                  <option value="">Producto</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
                <input type="number" min="1" placeholder="Cant." value={it.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} style={{ width: 70 }} />
                <button type="button" className="btn-secondary" onClick={() => removeItem(i)} disabled={items.length === 1}>Quitar</button>
              </div>
            ))}
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={addItem}>Añadir ítem</button>
              <button type="submit" className="btn-primary" disabled={creating}>{creating ? "Guardando…" : "Crear venta"}</button>
            </div>
          </form>
        </div>
      </div>

      {clientCredentials && (
        <div className="client-credentials-modal" onClick={() => setClientCredentials(null)}>
          <div className="client-credentials-box" onClick={(e) => e.stopPropagation()}>
            <h4>Cliente registrado</h4>
            <p>Entregar al cliente para que acceda a su cuenta (monedero, compras).</p>
            <div className="client-credentials-row">
              <span>Código</span>
              <strong>{clientCredentials.clientCode}</strong>
            </div>
            <div className="client-credentials-row">
              <span>PIN</span>
              <strong>{clientCredentials.pin}</strong>
            </div>
            <button
              type="button"
              className="client-credentials-copy"
              onClick={() => {
                const text = `Código: ${clientCredentials.clientCode}, PIN: ${clientCredentials.pin}. Accede a tu cuenta: ${typeof window !== "undefined" ? window.location.origin : ""}/ver-cuenta`;
                navigator.clipboard?.writeText(text).then(() => toast.success("Copiado")).catch(() => {});
              }}
            >
              Copiar código y PIN
            </button>
            <p style={{ marginTop: 12, fontSize: "0.85rem", color: "var(--muted)" }}>
              Enlace: <a href="/ver-cuenta" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>/ver-cuenta</a>
            </p>
            <button type="button" className="client-credentials-close" onClick={() => setClientCredentials(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
