"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api, getProductImageUrl } from "../../../lib/api";
import { printTicket } from "../../../lib/printTicket";
import { TokenContext } from "../TokenContext";

const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
  { value: "monedero", label: "Monedero" },
  { value: "mixto", label: "Mixto" }
];

function POSProductImage({ product, className }) {
  const [failed, setFailed] = useState(false);
  const url = product.imageUrl ? getProductImageUrl(product.imageUrl) : "";
  if (!url || failed) return <span className="pos-product-avatar">{(product.name || "?").charAt(0).toUpperCase()}</span>;
  return <img src={url} alt="" className={className} onError={() => setFailed(true)} />;
}

function POSCartThumb({ product }) {
  const [failed, setFailed] = useState(false);
  const url = product.imageUrl ? getProductImageUrl(product.imageUrl) : "";
  if (!url || failed) return null;
  return <img src={url} alt="" className="pos-cart-item-thumb" onError={() => setFailed(true)} />;
}

export default function POSPage() {
  const { token } = useContext(TokenContext);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [clientId, setClientId] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [charging, setCharging] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientAccountType, setNewClientAccountType] = useState("ocasional");
  const [creatingClient, setCreatingClient] = useState(false);
  const [cashReceived, setCashReceived] = useState("");
  const [clientCredentials, setClientCredentials] = useState(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [lastSaleData, setLastSaleData] = useState(null);
  const lowStockNotified = useRef(false);
  const searchInputRef = useRef(null);
  const router = useRouter();

  const headers = { Authorization: `Bearer ${token}` };
  const cashReceivedNum = Number(cashReceived) || 0;
  const selectedClient = clientId && clientId !== "__new__" ? clients.find((c) => c._id === clientId) : null;
  const walletBalance = selectedClient != null ? Number(selectedClient.walletBalance ?? 0) : 0;

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      api.get("/products", { headers }).then((r) => r.data),
      api.get("/users/clients", { headers }).then((r) => r.data)
    ])
      .then(([prods, clientList]) => {
        setProducts(Array.isArray(prods) ? prods : []);
        const list = Array.isArray(clientList) ? clientList : [];
        setClients(list);
        if (list.length && clientId === "") setClientId(list[0]._id);
        const lowStock = (Array.isArray(prods) ? prods : []).filter((p) => p.currentStock <= (p.minStock ?? 0));
        if (lowStock.length > 0 && !lowStockNotified.current) {
          lowStockNotified.current = true;
          toast(`Hay ${lowStock.length} producto(s) con stock bajo`, { icon: "⚠️", duration: 5000 });
        }
      })
      .catch(() => {
        toast.error("Error al cargar productos y clientes");
        setProducts([]);
        setClients([]);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleCreateClient = async (e) => {
    e?.preventDefault();
    const name = (newClientName || "").trim();
    if (!name) {
      toast.error("Escribe el nombre del cliente");
      return;
    }
    setCreatingClient(true);
    try {
      const { data } = await api.post("/users/clients", { name, accountType: newClientAccountType }, { headers });
      const clientForList = { _id: data._id, name: data.name, email: data.email, clientCode: data.clientCode, walletBalance: 0, accountType: data.accountType || "ocasional" };
      setClients((prev) => [...prev, clientForList].sort((a, b) => (a.name || "").localeCompare(b.name || "")));
      setClientId(data._id);
      setNewClientName("");
      if (data.clientCode != null && data.pin != null) setClientCredentials({ clientCode: data.clientCode, pin: data.pin });
      toast.success(`Cliente "${data.name}" registrado`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al registrar cliente");
    } finally {
      setCreatingClient(false);
    }
  };

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
  const filteredProducts = products.filter((p) => {
    const matchSearch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    const matchCat = !categoryFilter || p.category === categoryFilter;
    return matchSearch && matchCat && p.currentStock > 0;
  });

  const addToCart = (product, qty = 1) => {
    const existing = cart.find((c) => c.product._id === product._id);
    const newQty = Math.min((existing ? existing.quantity + qty : qty), product.currentStock);
    if (newQty <= 0) return;
    if (existing) {
      setCart(cart.map((c) => (c.product._id === product._id ? { ...c, quantity: newQty } : c)));
    } else {
      setCart([...cart, { product, quantity: newQty }]);
    }
  };

  /** Búsqueda rápida / escaneo código de barras: Enter en búsqueda añade por SKU o nombre */
  const handleSearchKeyDown = (e) => {
    if (e.key !== "Enter") return;
    const q = search.trim();
    if (!q) return;
    e.preventDefault();
    const bySku = filteredProducts.find((p) => p.sku && String(p.sku).toLowerCase() === q.toLowerCase());
    const byBarcode = filteredProducts.find((p) => p.barcode && String(p.barcode).trim() === q.trim());
    const byName = filteredProducts.filter((p) => p.name && p.name.toLowerCase().includes(q.toLowerCase()));
    const product = byBarcode || bySku || (byName.length === 1 ? byName[0] : null);
    if (product) {
      addToCart(product, 1);
      setSearch("");
      toast.success(`${product.name} añadido`);
    } else if (byName.length > 1) {
      toast.error("Varios productos coinciden. Refina la búsqueda o elige desde la lista.");
    } else {
      toast.error("Producto no encontrado. Escanea de nuevo o busca por nombre/SKU.");
    }
  };

  const updateCartQty = (productId, delta) => {
    setCart(
      cart
        .map((c) => {
          if (c.product._id !== productId) return c;
          const q = c.quantity + delta;
          if (q <= 0) return null;
          return { ...c, quantity: q };
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((c) => c.product._id !== productId));
  };

  const subtotal = cart.reduce((sum, c) => sum + c.product.salePrice * c.quantity, 0);
  const total = subtotal;
  const walletToApply = selectedClient != null ? Math.min(walletBalance, total) : 0;
  const amountToCharge = Math.max(0, total - walletToApply);
  const change = paymentMethod === "efectivo" && cashReceivedNum >= amountToCharge ? cashReceivedNum - amountToCharge : 0;

  const handleChargeRef = useRef(null);
  const handleCharge = async () => {
    if (cart.length === 0) {
      toast.error("Añade al menos un producto");
      return;
    }
    if (!clientId || clientId === "__new__") {
      toast.error("Selecciona un cliente o registra uno nuevo por nombre");
      return;
    }
    setCharging(true);
    const cartSnapshot = cart.map((c) => ({
      name: c.product.name,
      quantity: c.quantity,
      unitPrice: c.product.salePrice,
      subtotal: c.product.salePrice * c.quantity
    }));
    const clientName = clients.find((c) => c._id === clientId)?.name ?? "Cliente";
    try {
      const { data: sale } = await api.post(
        "/sales",
        {
          client: clientId,
          paymentMethod,
          items: cart.map((c) => ({ product: c.product._id, quantity: c.quantity }))
        },
        { headers }
      );
      toast.success("Venta registrada");
      const ticketData = {
        items: cartSnapshot,
        clientName,
        subtotal: sale?.total ?? total,
        walletApplied: sale?.walletApplied ?? 0,
        total: sale?.finalCharged ?? total,
        paymentMethod,
        date: new Date()
      };
      setLastSaleData(ticketData);
      setShowThankYou(true);
      setCart([]);
      setCashReceived("");
      // Refrescar clientes (saldo monedero) y productos (stock)
      Promise.all([
        api.get("/users/clients", { headers }).then((r) => setClients(Array.isArray(r.data) ? r.data : [])),
        api.get("/products", { headers }).then((r) => setProducts(Array.isArray(r.data) ? r.data : []))
      ]).catch(() => {});
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.details?.join?.(". ") || "Error al cobrar";
      toast.error(msg);
    } finally {
      setCharging(false);
    }
  };
  handleChargeRef.current = handleCharge;

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target?.tagName === "INPUT" || e.target?.tagName === "TEXTAREA") return;
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "F9") {
        e.preventDefault();
        if (cart.length > 0 && clientId && clientId !== "__new__" && !charging) handleChargeRef.current?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cart.length, clientId, charging]);

  if (loading) {
    return (
      <main className="pos-page pos-square">
        <div className="pos-loading">
          <div className="loading-spinner" />
          <p>Cargando productos y clientes…</p>
        </div>
      </main>
    );
  }

  const canCharge = cart.length > 0 && clientId && clientId !== "__new__" && !charging;

  return (
    <main className="pos-page pos-square">
      <div className="pos-header">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Buscar, escanear código de barras o SKU (F2) — Enter añade"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="pos-search pos-search-full"
        />
        <div className="pos-category-pills">
          <button
            type="button"
            className={!categoryFilter ? "pos-pill active" : "pos-pill"}
            onClick={() => setCategoryFilter("")}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              type="button"
              key={cat}
              className={categoryFilter === cat ? "pos-pill active" : "pos-pill"}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="pos-layout">
        <section className="pos-products">
          <div className="pos-product-grid">
            {filteredProducts.map((p) => (
              <button
                type="button"
                key={p._id}
                className="pos-product-card"
                onClick={() => addToCart(p)}
                disabled={p.currentStock <= 0}
              >
                <POSProductImage product={p} className="pos-product-img" />
                <span className="pos-product-name">{p.name}</span>
                <span className="pos-product-price">${Number(p.salePrice).toFixed(2)}</span>
                {p.currentStock <= 5 && <span className="pos-product-low">Stock: {p.currentStock}</span>}
              </button>
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="pos-empty">
              <span className="pos-empty-icon">📦</span>
              <p>Sin productos o sin stock</p>
              <p className="pos-empty-hint">Añade productos en la pestaña Productos</p>
            </div>
          )}
        </section>

        <aside className="pos-cart">
          <h3 className="pos-cart-title">Orden actual</h3>
          <div className="pos-cart-list">
            {cart.length === 0 ? (
              <p className="pos-cart-empty">Añade productos para comenzar</p>
            ) : (
              cart.map((c) => (
                <div key={c.product._id} className="pos-cart-item">
                  <div className="pos-cart-item-info">
                    <POSCartThumb product={c.product} />
                    <div>
                      <span className="pos-cart-item-name">{c.product.name}</span>
                      <span className="pos-cart-item-sub">${Number(c.product.salePrice).toFixed(2)} × {c.quantity}</span>
                    </div>
                  </div>
                  <div className="pos-cart-item-actions">
                    <button type="button" className="pos-qty-btn" onClick={() => updateCartQty(c.product._id, -1)} aria-label="Menos">−</button>
                    <span className="pos-qty-num">{c.quantity}</span>
                    <button type="button" className="pos-qty-btn" onClick={() => updateCartQty(c.product._id, 1)} aria-label="Más" disabled={c.quantity >= c.product.currentStock}>+</button>
                    <button type="button" className="pos-cart-remove" onClick={() => removeFromCart(c.product._id)} aria-label="Quitar">×</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pos-cart-total">
            <span>Subtotal</span>
            <strong>${total.toFixed(2)}</strong>
          </div>
          {selectedClient != null && walletToApply > 0 && (
            <div className="pos-cart-total" style={{ marginTop: 8 }}>
              <span>Descuento (Monedero)</span>
              <strong>-${walletToApply.toFixed(2)}</strong>
            </div>
          )}
          <div className="pos-cart-total pos-cart-total-final">
            <span>Total a pagar</span>
            <strong>${amountToCharge.toFixed(2)}</strong>
          </div>

          <div className="pos-cart-client">
            <label>Cliente</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Seleccionar cliente</option>
              {clients.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}{u.accountType === "frecuente" ? " (Frecuente)" : " (Ocasional)"}
                </option>
              ))}
              <option value="__new__">+ Nuevo cliente</option>
            </select>
            {clientId === "__new__" && (
              <div className="pos-new-client-form">
                <input
                  type="text"
                  placeholder="Nombre del cliente"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateClient(e)}
                />
                <label style={{ display: "block", marginTop: 6, marginBottom: 4, fontSize: 12 }}>Tipo de cuenta</label>
                <select
                  value={newClientAccountType}
                  onChange={(e) => setNewClientAccountType(e.target.value)}
                  style={{ marginBottom: 8 }}
                >
                  <option value="ocasional">Cliente ocasional</option>
                  <option value="frecuente">Cliente frecuente</option>
                </select>
                <button type="button" className="btn-primary" onClick={handleCreateClient} disabled={creatingClient || !newClientName.trim()}>
                  {creatingClient ? "…" : "Registrar"}
                </button>
              </div>
            )}
            {selectedClient != null && (
              <>
                <p className="pos-wallet-balance">
                  Monedero: <strong>${walletBalance.toFixed(2)}</strong>
                  {total > 0 && walletBalance > 0 && (
                    <span className="pos-wallet-hint"> (se descontará al cobrar)</span>
                  )}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12 }}>Tipo de cuenta:</span>
                  <select
                    value={selectedClient.accountType || "ocasional"}
                    onChange={async (e) => {
                      const accountType = e.target.value;
                      try {
                        await api.patch(`/users/clients/${selectedClient._id}`, { accountType }, { headers });
                        setClients((prev) => prev.map((c) => (c._id === selectedClient._id ? { ...c, accountType } : c)));
                        toast.success("Tipo de cuenta actualizado");
                      } catch {
                        toast.error("No se pudo actualizar");
                      }
                    }}
                    style={{ fontSize: 12, padding: "4px 8px" }}
                  >
                    <option value="ocasional">Ocasional</option>
                    <option value="frecuente">Frecuente</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="pos-cart-payment">
            <label>Forma de pago</label>
            <div className="pos-payment-methods">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  className={paymentMethod === m.value ? "pos-pay-pill active" : "pos-pay-pill"}
                  onClick={() => setPaymentMethod(m.value)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === "efectivo" && (
            <div className="pos-cash-change">
              <label>Monto recibido</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                className="pos-cash-received"
              />
              {cashReceivedNum >= amountToCharge && amountToCharge > 0 && (
                <p className="pos-change-line">
                  <strong>Cambio:</strong> <span className="pos-change-amount">${change.toFixed(2)}</span>
                </p>
              )}
              {cashReceivedNum > 0 && cashReceivedNum < amountToCharge && (
                <p className="pos-change-warn">Falta: ${(amountToCharge - cashReceivedNum).toFixed(2)}</p>
              )}
            </div>
          )}

          <button
            type="button"
            className="pos-charge-btn"
            onClick={handleCharge}
            disabled={!canCharge}
          >
            {charging ? "Procesando…" : canCharge ? `Cobrar $${amountToCharge.toFixed(2)} (F9)` : "Añade productos y selecciona cliente"}
          </button>
        </aside>
      </div>

      {showThankYou && (
        <div className="pos-thankyou-overlay" onClick={() => {}}>
          <div className="pos-thankyou-box" onClick={(e) => e.stopPropagation()}>
            <div className="pos-thankyou-icon">✓</div>
            <h2 className="pos-thankyou-title">¡Gracias por su compra!</h2>
            <p className="pos-thankyou-text">Su pago se ha registrado correctamente. Le esperamos de vuelta.</p>
            {lastSaleData && (
              <p className="pos-thankyou-total">Total: <strong>${Number(lastSaleData.total || 0).toFixed(2)}</strong></p>
            )}
            <div className="pos-thankyou-buttons">
              <button
                type="button"
                className="pos-thankyou-btn pos-thankyou-btn-print"
                onClick={() => {
                  if (lastSaleData) printTicket(lastSaleData);
                  toast.success("Abriendo ticket para imprimir");
                }}
              >
                Imprimir ticket
              </button>
              <button
                type="button"
                className="pos-thankyou-btn pos-thankyou-btn-again"
                onClick={() => {
                  setShowThankYou(false);
                  setLastSaleData(null);
                }}
              >
                Volver a comprar
              </button>
              <button
                type="button"
                className="pos-thankyou-btn pos-thankyou-btn-menu"
                onClick={() => {
                  setShowThankYou(false);
                  setLastSaleData(null);
                  router.push("/dashboard");
                }}
              >
                Ir al menú principal
              </button>
            </div>
          </div>
        </div>
      )}

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
