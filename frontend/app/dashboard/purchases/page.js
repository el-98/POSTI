"use client";

import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { api } from "../../../lib/api";
import { TokenContext } from "../TokenContext";

const emptyItem = { product: "", quantity: "", cost: "" };

export default function PurchasesPage() {
  const searchParams = useSearchParams();
  const productIdFromUrl = searchParams.get("product");
  const { token } = useContext(TokenContext);
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [supplierFilter, setSupplierFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [creating, setCreating] = useState(false);
  const [prefillDone, setPrefillDone] = useState(false);
  const [suppliers, setSuppliers] = useState([]);

  const headers = { Authorization: `Bearer ${token}` };

  const loadPurchases = () => {
    if (!token) return;
    const params = new URLSearchParams({ page: pagination.page, limit: 20 });
    if (supplierFilter) params.set("supplier", supplierFilter);
    api.get(`/purchases?${params}`, { headers }).then((r) => {
      setPurchases(r.data.items || []);
      setPagination((p) => ({ ...p, page: r.data.page || 1, pages: r.data.pages || 1, total: r.data.total || 0 }));
    }).catch(() => setPurchases([]));
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api.get("/products", { headers })
      .then((r) => setProducts(r.data))
      .catch(() => {
        toast.error("No se pudieron cargar productos");
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    api.get("/purchases/suppliers", { headers })
      .then((r) => setSuppliers(r.data?.suppliers || []))
      .catch(() => setSuppliers([]));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadPurchases();
  }, [token, supplierFilter, pagination.page]);

  // Si llegaste desde Reportes → Reponer, preseleccionar ese producto
  useEffect(() => {
    if (!productIdFromUrl || prefillDone || products.length === 0) return;
    const exists = products.some((p) => p._id === productIdFromUrl);
    if (exists) {
      setItems([{ product: productIdFromUrl, quantity: "", cost: "" }]);
      const prod = products.find((p) => p._id === productIdFromUrl);
      if (prod?.supplier) setSupplier(prod.supplier);
      setPrefillDone(true);
      toast.success("Producto preseleccionado. Completa cantidad y costo.");
    }
  }, [productIdFromUrl, products, prefillDone]);

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
    const payload = {
      supplier: supplier.trim(),
      items: items
        .filter((it) => it.product && Number(it.quantity) >= 1 && Number(it.cost) >= 0)
        .map((it) => ({ product: it.product, quantity: Number(it.quantity), cost: Number(it.cost) }))
    };
    if (payload.items.length === 0) {
      toast.error("Añade al menos un ítem con producto, cantidad y costo");
      return;
    }
    setCreating(true);
    try {
      await api.post("/purchases", payload, { headers });
      toast.success("Compra registrada");
      setSupplier("");
      setItems([{ ...emptyItem }]);
      loadPurchases();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al crear compra");
    } finally {
      setCreating(false);
    }
  };

  return (
    <main>
      <div className="page-header">
        <div>
          <h1 className="page-title">Compras</h1>
          <p className="page-subtitle">Historial y registro de compras a proveedores</p>
        </div>
      </div>
      <div className="grid grid-2">
        <div className="card">
          <h3 className="section-title">Historial</h3>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <input placeholder="Filtrar por proveedor" value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} />
          </div>
          {purchases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📥</div>
              <p>No hay compras registradas</p>
            </div>
          ) : (
            <>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Proveedor</th>
                      <th>Total</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((p) => (
                      <tr key={p._id}>
                        <td><strong>{p.supplier}</strong></td>
                        <td>${Number(p.totalCost).toFixed(2)}</td>
                        <td>{new Date(p.createdAt).toLocaleDateString()}</td>
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
          <h3 className="section-title">Registrar compra</h3>
          {loading && <p className="dashboard-muted">Cargando productos…</p>}
          {!loading && products.length === 0 && (
            <div className="empty-state purchases-empty-form">
              <div className="empty-state-icon">📦</div>
              <p><strong>No hay productos en el catálogo.</strong></p>
              <p className="form-hint" style={{ marginTop: 8 }}>Agrega productos en <strong>Productos</strong> para poder registrar compras.</p>
              <Link href="/dashboard/products" className="btn btn-primary" style={{ marginTop: 14, display: "inline-block" }}>Ir a Productos</Link>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Proveedor</label>
              <input
                list="suppliers-list"
                placeholder="Escribe o elige un proveedor (evita duplicados)"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                required
              />
              <datalist id="suppliers-list">
                {suppliers.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              {suppliers.length > 0 && (
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Proveedores ya registrados: elige uno para no repetir.</p>
              )}
            </div>
            <h4 className="reportes-table-title" style={{ marginTop: 16 }}>Ítems</h4>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                <select value={it.product} onChange={(e) => updateItem(i, "product", e.target.value)} required style={{ flex: "1 1 160px" }} disabled={products.length === 0}>
                  <option value="">{products.length === 0 ? "Sin productos (ve a Productos)" : "Selecciona un producto"}</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
                <input type="number" min="1" placeholder="Cant." value={it.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} style={{ width: 70 }} />
                <input type="number" min="0" step="0.01" placeholder="Costo" value={it.cost} onChange={(e) => updateItem(i, "cost", e.target.value)} style={{ width: 90 }} />
                <button type="button" className="btn-secondary" onClick={() => removeItem(i)} disabled={items.length === 1}>Quitar</button>
              </div>
            ))}
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={addItem}>Añadir ítem</button>
              <button type="submit" className="btn-primary" disabled={creating}>{creating ? "Guardando…" : "Crear compra"}</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
