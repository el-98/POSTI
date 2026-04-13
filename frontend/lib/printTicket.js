/**
 * Abre una ventana con el ticket de venta y dispara la impresión.
 * @param {Object} data - { items: [{ name, quantity, unitPrice?, subtotal? }], clientName, total, paymentMethod, date }
 */
export function printTicket(data) {
  const { items = [], clientName = "—", total = 0, subtotal, walletApplied = 0, paymentMethod = "", date = new Date() } = data;
  const d = typeof date === "string" ? new Date(date) : date;
  const dateStr = d.toLocaleDateString() + " " + d.toLocaleTimeString();
  const subtotalNum = Number(subtotal ?? total) || 0;
  const walletAppliedNum = Number(walletApplied) || 0;
  const totalNum = Number(total) || 0;

  const rows = items
    .map(
      (i) =>
        `<tr><td>${escapeHtml(i.name || "")}</td><td>${i.quantity}</td><td>$${Number(i.unitPrice ?? i.subtotal / i.quantity ?? 0).toFixed(2)}</td><td>$${Number(i.subtotal ?? i.unitPrice * i.quantity ?? 0).toFixed(2)}</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Ticket de venta</title>
<style>
  body { font-family: monospace; font-size: 12px; padding: 16px; max-width: 320px; margin: 0 auto; }
  h2 { font-size: 14px; text-align: center; margin: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th, td { border-bottom: 1px dashed #333; padding: 4px 2px; }
  th { text-align: left; }
  .total { font-weight: bold; font-size: 14px; margin-top: 8px; }
  .line { display: flex; justify-content: space-between; margin: 4px 0; }
  .discount { color: #065f46; }
  .meta, .pdf-hint { margin-top: 12px; font-size: 10px; color: #666; }
</style>
</head><body>
<h2>ITCOMMERCE</h2>
<p><strong>Cliente:</strong> ${escapeHtml(clientName)}</p>
<p><strong>Fecha:</strong> ${escapeHtml(dateStr)}</p>
<p><strong>Pago:</strong> ${escapeHtml(paymentMethod)}</p>
<table>
  <tr><th>Producto</th><th>Cant</th><th>P.u</th><th>Subtotal</th></tr>
  ${rows}
</table>
${walletAppliedNum > 0 || subtotal != null ? `<p class="line"><span>Subtotal</span><span>$${subtotalNum.toFixed(2)}</span></p>` : ""}
${walletAppliedNum > 0 ? `<p class="line discount"><span>Descuento (Monedero)</span><span>-$${walletAppliedNum.toFixed(2)}</span></p>` : ""}
<p class="total">TOTAL A PAGAR: $${totalNum.toFixed(2)}</p>
<p class="meta">Gracias por su compra</p>
<p class="pdf-hint">Al imprimir, elige &quot;Guardar como PDF&quot; para descargar el ticket en PDF.</p>
</body></html>`;

  const w = window.open("", "_blank", "width=360,height=600");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
    // No cerrar automáticamente para permitir "Guardar como PDF" en el diálogo de impresión
    setTimeout(() => w.close(), 1500);
  }, 350);
  return true;
}

/**
 * Abre el ticket en una ventana para imprimir o guardar como PDF (mismo contenido que printTicket).
 * Útil desde historial de ventas para reimprimir.
 */
export function openTicketForPdf(data) {
  const { items = [], clientName = "—", total = 0, subtotal, walletApplied = 0, paymentMethod = "", date = new Date() } = data;
  const d = typeof date === "string" ? new Date(date) : date;
  const dateStr = d.toLocaleDateString() + " " + d.toLocaleTimeString();
  const subtotalNum = Number(subtotal ?? total) || 0;
  const walletAppliedNum = Number(walletApplied) || 0;
  const totalNum = Number(total) || 0;
  const rows = items
    .map(
      (i) =>
        `<tr><td>${escapeHtml(i.name || "")}</td><td>${i.quantity}</td><td>$${Number(i.unitPrice ?? i.subtotal / i.quantity ?? 0).toFixed(2)}</td><td>$${Number(i.subtotal ?? i.unitPrice * i.quantity ?? 0).toFixed(2)}</td></tr>`
    )
    .join("");
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Ticket de venta</title>
<style>
  body { font-family: monospace; font-size: 12px; padding: 16px; max-width: 320px; margin: 0 auto; }
  h2 { font-size: 14px; text-align: center; margin: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th, td { border-bottom: 1px dashed #333; padding: 4px 2px; }
  th { text-align: left; }
  .total { font-weight: bold; font-size: 14px; margin-top: 8px; }
  .line { display: flex; justify-content: space-between; margin: 4px 0; }
  .discount { color: #065f46; }
  .meta, .pdf-hint { margin-top: 12px; font-size: 10px; color: #666; }
</style>
</head><body>
<h2>ITCOMMERCE</h2>
<p><strong>Cliente:</strong> ${escapeHtml(clientName)}</p>
<p><strong>Fecha:</strong> ${escapeHtml(dateStr)}</p>
<p><strong>Pago:</strong> ${escapeHtml(paymentMethod)}</p>
<table>
  <tr><th>Producto</th><th>Cant</th><th>P.u</th><th>Subtotal</th></tr>
  ${rows}
</table>
${walletAppliedNum > 0 || subtotal != null ? `<p class="line"><span>Subtotal</span><span>$${subtotalNum.toFixed(2)}</span></p>` : ""}
${walletAppliedNum > 0 ? `<p class="line discount"><span>Descuento (Monedero)</span><span>-$${walletAppliedNum.toFixed(2)}</span></p>` : ""}
<p class="total">TOTAL A PAGAR: $${totalNum.toFixed(2)}</p>
<p class="meta">Gracias por su compra</p>
<p class="pdf-hint">Al imprimir, elige &quot;Guardar como PDF&quot; para descargar el ticket en PDF.</p>
</body></html>`;
  const w = window.open("", "_blank", "width=360,height=600");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
  return true;
}

function escapeHtml(text) {
  const s = String(text ?? "");
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
