"use client";

import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api, getProductImageUrl } from "../../../lib/api";
import { TokenContext } from "../TokenContext";

function ProductThumb({ imageUrl, name }) {
  const [failed, setFailed] = useState(false);
  const url = getProductImageUrl(imageUrl);
  if (failed || !url) return <span className="product-thumb-placeholder">{(name || "?").charAt(0).toUpperCase()}</span>;
  return <img src={url} alt="" className="product-thumb" onError={() => setFailed(true)} />;
}

export default function ProductsPage() {
  const { token } = useContext(TokenContext);
  const [products, setProducts] = useState([]);
  const [critical, setCritical] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "",
    purchasePrice: "",
    salePrice: "",
    currentStock: "",
    minStock: "",
    supplier: "",
    imageUrl: ""
  });
  const [creating, setCreating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [suppliers, setSuppliers] = useState([]);

  const headers = { Authorization: `Bearer ${token}` };

  const startEdit = (p) => {
    setEditingId(p._id);
    setForm({
      name: p.name || "",
      category: p.category || "",
      purchasePrice: p.purchasePrice ?? "",
      salePrice: p.salePrice ?? "",
      currentStock: p.currentStock ?? "",
      minStock: p.minStock ?? "",
      supplier: p.supplier || "",
      imageUrl: p.imageUrl || ""
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ name: "", category: "", purchasePrice: "", salePrice: "", currentStock: "", minStock: "", supplier: "", imageUrl: "" });
  };

  const handleDeactivate = async (p) => {
    const isActive = p.active !== false;
    if (!confirm(isActive ? `¿Desactivar "${p.name}"? No aparecerá en Caja ni en listados.` : `¿Reactivar "${p.name}"?`)) return;
    try {
      await api.patch(`/products/${p._id}`, { active: !isActive }, { headers });
      toast.success(isActive ? "Producto desactivado" : "Producto reactivado");
      loadProducts();
      if (editingId === p._id) cancelEdit();
    } catch (err) {
      toast.error(err.response?.data?.message || "No se pudo actualizar");
    }
  };

  const loadProducts = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = showInactive ? "?includeInactive=1" : "";
      const listRes = await api.get(`/products${params}`, { headers });
      setProducts(listRes.data);
      const criticalRes = await api.get("/products/critical", { headers }).catch(() => ({ data: [] }));
      setCritical(Array.isArray(criticalRes.data) ? criticalRes.data : []);
    } catch {
      toast.error("No se pudieron cargar productos");
      setProducts([]);
      setCritical([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [token, showInactive]);

  useEffect(() => {
    if (!token) return;
    api.get("/purchases/suppliers", { headers })
      .then((r) => setSuppliers(r.data?.suppliers || []))
      .catch(() => setSuppliers([]));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("Ingresa el token");
      return;
    }
    const payload = {
      name: form.name,
      category: form.category,
      purchasePrice: Number(form.purchasePrice),
      salePrice: Number(form.salePrice),
      currentStock: Number(form.currentStock),
      minStock: Number(form.minStock),
      supplier: form.supplier,
      imageUrl: editingId ? (form.imageUrl || "").trim() : ((form.imageUrl || "").trim() || undefined)
    };
    setCreating(true);
    try {
      if (editingId) {
        await api.patch(`/products/${editingId}`, payload, { headers });
        toast.success("Producto actualizado");
        cancelEdit();
      } else {
        await api.post("/products", payload, { headers });
        toast.success("Producto creado");
        setForm({ name: "", category: "", purchasePrice: "", salePrice: "", currentStock: "", minStock: "", supplier: "", imageUrl: "" });
      }
      loadProducts();
    } catch (err) {
      if (!err.response) {
        toast.error("No hay conexión con el servidor. En la carpeta del proyecto ejecuta: npm run dev (o npm run dev:backend)", { duration: 8000 });
        return;
      }
      const data = err.response?.data;
      const msg = data?.details?.length ? data.details.join(". ") : (data?.message || (editingId ? "Error al actualizar" : "Error al crear producto"));
      toast.error(msg, { duration: 5000 });
    } finally {
      setCreating(false);
    }
  };

  return (
    <main>
      <div className="page-header">
        <div>
          <h1 className="page-title">Productos</h1>
          <p className="page-subtitle">Inventario y stock</p>
        </div>
      </div>
      <div className="grid grid-2">
        <div className="card">
          <div className="section-toolbar">
            <h3 className="section-title" style={{ margin: 0 }}>Listado ({products.length})</h3>
            <label className="section-toolbar-checkbox">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
              Ver inactivos
            </label>
          </div>
          {loading ? (
            <div className="empty-state">
              <div className="loading-spinner" style={{ margin: "0 auto 12px" }} />
              <p>Cargando productos...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <p>No hay productos. Crea el primero.</p>
            </div>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 56 }}>Imagen</th>
                    <th>Nombre</th>
                    <th>SKU</th>
                    <th>Categoría</th>
                    <th>Stock</th>
                    <th>P. venta</th>
                    <th>Estado</th>
                    <th style={{ width: 90 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p._id}>
                      <td>
                        <span className="product-thumb-wrap">
                          {p.imageUrl ? (
                            <ProductThumb imageUrl={p.imageUrl} name={p.name} />
                          ) : (
                            <span className="product-thumb-placeholder">{(p.name || "?").charAt(0).toUpperCase()}</span>
                          )}
                        </span>
                      </td>
                      <td><strong>{p.name}</strong></td>
                      <td>{p.sku}</td>
                      <td>{p.category}</td>
                      <td>{p.currentStock} / {p.minStock}</td>
                      <td>${Number(p.salePrice).toFixed(2)}</td>
                      <td>
                        {p.active === false ? (
                          <span className="badge" style={{ background: "var(--muted)", color: "var(--bg)" }}>Inactivo</span>
                        ) : critical.some((c) => c._id === p._id) ? (
                          <span className="badge badge-danger">Crítico</span>
                        ) : p.currentStock <= (p.minStock || 0) + 2 ? (
                          <span className="badge badge-warning">Bajo</span>
                        ) : (
                          <span className="badge badge-success">OK</span>
                        )}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 10px", marginRight: 4 }} onClick={() => startEdit(p)}>Editar</button>
                        <button type="button" className="btn" style={{ fontSize: 12, padding: "6px 10px", background: p.active === false ? "var(--accent)" : "transparent", color: p.active === false ? "white" : "var(--muted)" }} onClick={() => handleDeactivate(p)}>{p.active === false ? "Reactivar" : "Desactivar"}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className={`card products-form-card ${editingId ? "products-form-card-editing" : ""}`}>
          <h3 className="section-title">{editingId ? "Editar producto" : "Nuevo producto"}</h3>
          {editingId && (
            <p className="form-hint">Modifica los campos y guarda. El SKU no se cambia.</p>
          )}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nombre</label>
              <input placeholder="Nombre del producto" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Imagen de referencia</label>
              <div className="product-image-options">
                <input
                  type="text"
                  placeholder="Pega una URL o sube desde el equipo (opcional)"
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                />
                <span className="product-image-or">o</span>
                <label className="product-image-upload-btn">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    disabled={uploadingImage}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !token) return;
                      setUploadingImage(true);
                      try {
                        const fd = new FormData();
                        fd.append("image", file);
                        const { data } = await api.post("/products/upload", fd, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        if (data?.url) setForm((f) => ({ ...f, imageUrl: data.url }));
                        toast.success("Imagen subida");
                      } catch (err) {
                        toast.error(err.response?.data?.message || "Error al subir la imagen");
                      } finally {
                        setUploadingImage(false);
                        e.target.value = "";
                      }
                    }}
                  />
                  {uploadingImage ? "Subiendo…" : "Subir desde el equipo"}
                </label>
              </div>
              {form.imageUrl && (
                <div className="product-image-preview">
                  <img src={getProductImageUrl(form.imageUrl)} alt="" />
                </div>
              )}
              <p className="form-hint" style={{ marginTop: 6, marginBottom: 0 }}>Opcional. URL o archivo (JPEG, PNG, GIF, WebP; máx. 5 MB).</p>
            </div>
            {!editingId && (
            <div className="form-hint-box">
              <p><strong>SKU:</strong> Se asigna automáticamente al guardar (ej. SKU-000001, SKU-000002…). No hace falta escribirlo.</p>
            </div>
            )}
            <div className="form-group">
              <label>Categoría</label>
              <input placeholder="Ej. Electrónica" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} required />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label>Precio compra</label>
                <input type="number" step="0.01" min="0" placeholder="0.00" value={form.purchasePrice} onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Precio venta</label>
                <input type="number" step="0.01" min="0" placeholder="0.00" value={form.salePrice} onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))} required />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label>Stock actual</label>
                <input type="number" min="0" placeholder="0" value={form.currentStock} onChange={(e) => setForm((f) => ({ ...f, currentStock: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Stock mínimo</label>
                <input type="number" min="0" placeholder="0" value={form.minStock} onChange={(e) => setForm((f) => ({ ...f, minStock: e.target.value }))} required />
              </div>
            </div>
            <div className="form-group">
              <label>Proveedor</label>
              <input
                list="products-suppliers-list"
                placeholder="Escribe o elige un proveedor (evita duplicados)"
                value={form.supplier}
                onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
                required
              />
              <datalist id="products-suppliers-list">
                {suppliers.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div className="form-actions" style={{ flexWrap: "wrap", gap: 8 }}>
              <button type="submit" className="btn-primary" disabled={creating}>{creating ? "Guardando…" : editingId ? "Guardar cambios" : "Crear producto"}</button>
              {editingId && (
                <button type="button" className="btn-secondary" onClick={cancelEdit} disabled={creating}>Cancelar</button>
              )}
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
