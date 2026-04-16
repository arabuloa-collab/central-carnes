const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const FILE_PATH = path.join(__dirname, "..", "pedidos.json");

let pedidosDB = [];

/* =========================
   Helpers
========================= */

function nowISO() {
  return new Date().toISOString();
}

function formatFechaArgentina(dateInput = new Date()) {
  const d = new Date(dateInput);
  return d.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function safeReadJSON() {
  try {
    if (!fs.existsSync(FILE_PATH)) return [];
    const raw = fs.readFileSync(FILE_PATH, "utf8");
    if (!raw.trim()) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveDB() {
  fs.writeFileSync(FILE_PATH, JSON.stringify(pedidosDB, null, 2));
}

function nextPedidoNumero() {
  const max = pedidosDB.reduce((acc, p) => {
    const n = Number(p.pedidoNumero || 0);
    return n > acc ? n : acc;
  }, 1000);
  return max + 1;
}

function normalizeCliente(cliente = {}) {
  return {
    nombre: String(cliente.nombre || "").trim(),
    telefono: String(cliente.telefono || "").trim(),
    direccion: String(cliente.direccion || "").trim()
  };
}

function normalizeItems(body) {
  if (Array.isArray(body.items) && body.items.length > 0) {
    return body.items
      .map(i => ({
        producto: String(i.producto || "").trim(),
        cantidad: String(i.cantidad || "").trim()
      }))
      .filter(i => i.producto && i.cantidad);
  }

  const producto = String(body.producto || "").trim();
  const cantidad = String(body.cantidad || "").trim();

  if (!producto || !cantidad) return [];

  return [{ producto, cantidad }];
}

function sameCliente(a = {}, b = {}) {
  return (
    String(a.nombre || "").trim() === String(b.nombre || "").trim() &&
    String(a.telefono || "").trim() === String(b.telefono || "").trim() &&
    String(a.direccion || "").trim() === String(b.direccion || "").trim()
  );
}

function canAppendToLastOrder(lastOrder, cliente) {
  if (!lastOrder) return false;
  if (lastOrder.estado !== "pendiente") return false;
  if (!sameCliente(lastOrder.cliente, cliente)) return false;

  const lastCreated = new Date(lastOrder.createdAt || 0).getTime();
  const now = Date.now();

  return now - lastCreated <= 2 * 60 * 1000;
}

function flattenPedidos() {
  const flat = [];

  pedidosDB.forEach(order => {
    const items = Array.isArray(order.items) ? order.items : [];

    items.forEach((item, itemIndex) => {
      flat.push({
        pedidoNumero: order.pedidoNumero,
        cliente: order.cliente,
        producto: item.producto,
        cantidad: item.cantidad,
        fecha: order.fecha,
        estado: order.estado,
        __orderId: order.id,
        __itemIndex: itemIndex
      });
    });
  });

  return flat;
}

function getFlatReferenceByIndex(index) {
  const flatRefs = [];

  pedidosDB.forEach((order, orderIndex) => {
    const items = Array.isArray(order.items) ? order.items : [];
    items.forEach((item, itemIndex) => {
      flatRefs.push({
        orderIndex,
        itemIndex
      });
    });
  });

  return flatRefs[index] || null;
}

function migrateData(raw) {
  if (!Array.isArray(raw)) return [];

  const grouped = raw.every(p => Array.isArray(p.items));
  if (grouped) {
    return raw.map(p => ({
      id: p.id || Date.now() + Math.random(),
      pedidoNumero: p.pedidoNumero || nextPedidoNumero(),
      cliente: normalizeCliente(p.cliente),
      items: (p.items || []).map(i => ({
        producto: String(i.producto || "").trim(),
        cantidad: String(i.cantidad || "").trim()
      })),
      fecha: p.fecha || formatFechaArgentina(),
      createdAt: p.createdAt || nowISO(),
      estado: p.estado || "pendiente"
    }));
  }

  let numero = 1001;

  return raw.map(p => ({
    id: Date.now() + Math.random(),
    pedidoNumero: numero++,
    cliente: normalizeCliente(p.cliente),
    items: [{
      producto: String(p.producto || "").trim(),
      cantidad: String(p.cantidad || "").trim()
    }],
    fecha: p.fecha || formatFechaArgentina(),
    createdAt: p.createdAt || nowISO(),
    estado: p.estado || "pendiente"
  }));
}

function groupedPedidosForAdmin() {
  return pedidosDB.map(order => ({
    id: order.id,
    pedidoNumero: order.pedidoNumero,
    cliente: order.cliente,
    items: order.items || [],
    fecha: order.fecha,
    estado: order.estado
  }));
}

/* =========================
   Init
========================= */

pedidosDB = migrateData(safeReadJSON());
saveDB();

/* =========================
   Routes
========================= */

// GET compatibilidad con front cliente actual
router.get("/", (req, res) => {
  res.json(flattenPedidos());
});

// GET agrupado para admin
router.get("/grouped", (req, res) => {
  res.json(groupedPedidosForAdmin());
});

// POST crear pedido / agrupar carrito
router.post("/", (req, res) => {
  const body = req.body || {};
  const cliente = normalizeCliente(body.cliente);
  const items = normalizeItems(body);

  if (!cliente.nombre || !cliente.telefono || !cliente.direccion) {
    return res.status(400).json({ ok: false, error: "Cliente incompleto" });
  }

  if (items.length === 0) {
    return res.status(400).json({ ok: false, error: "Sin productos" });
  }

  const lastOrder = pedidosDB[pedidosDB.length - 1];

  if (canAppendToLastOrder(lastOrder, cliente)) {
    lastOrder.items.push(...items);
    saveDB();

    return res.json({
      ok: true,
      agrupado: true,
      pedidoNumero: lastOrder.pedidoNumero
    });
  }

  const nuevoPedido = {
    id: Date.now() + Math.random(),
    pedidoNumero: nextPedidoNumero(),
    cliente,
    items,
    fecha: formatFechaArgentina(),
    createdAt: nowISO(),
    estado: "pendiente"
  };

  pedidosDB.push(nuevoPedido);
  saveDB();

  res.json({
    ok: true,
    agrupado: false,
    pedidoNumero: nuevoPedido.pedidoNumero
  });
});

// DELETE pedido completo por numero (solo admin)
router.delete("/grouped/:pedidoNumero", (req, res) => {
  const role = String(req.headers["x-role"] || "").trim();
  if (role !== "admin") {
    return res.status(403).json({ ok: false, error: "Sin permisos" });
  }

  const pedidoNumero = Number(req.params.pedidoNumero);
  const index = pedidosDB.findIndex(p => Number(p.pedidoNumero) === pedidoNumero);

  if (index === -1) {
    return res.status(404).json({ ok: false, error: "No existe" });
  }

  pedidosDB.splice(index, 1);
  saveDB();
  res.json({ ok: true });
});

// PUT cambiar estado por numero (admin y vendedor)
router.put("/grouped/:pedidoNumero", (req, res) => {
  const role = String(req.headers["x-role"] || "").trim();
  if (!["admin", "vendedor"].includes(role)) {
    return res.status(403).json({ ok: false, error: "Sin permisos" });
  }

  const pedidoNumero = Number(req.params.pedidoNumero);
  const pedido = pedidosDB.find(p => Number(p.pedidoNumero) === pedidoNumero);

  if (!pedido) {
    return res.status(404).json({ ok: false, error: "No existe" });
  }

  const estado = String(req.body.estado || "").trim();
  if (!estado) {
    return res.status(400).json({ ok: false, error: "Estado inválido" });
  }

  pedido.estado = estado;
  saveDB();

  res.json({ ok: true });
});

// DELETE compatibilidad vieja (solo admin)
router.delete("/:index", (req, res) => {
  const role = String(req.headers["x-role"] || "").trim();
  if (role !== "admin") {
    return res.status(403).json({ ok: false, error: "Sin permisos" });
  }

  const index = parseInt(req.params.index, 10);
  const ref = getFlatReferenceByIndex(index);

  if (!ref) {
    return res.status(404).json({ ok: false, error: "No existe" });
  }

  pedidosDB[ref.orderIndex].items.splice(ref.itemIndex, 1);

  if (pedidosDB[ref.orderIndex].items.length === 0) {
    pedidosDB.splice(ref.orderIndex, 1);
  }

  saveDB();
  res.json({ ok: true });
});

// PUT compatibilidad vieja
router.put("/:index", (req, res) => {
  const role = String(req.headers["x-role"] || "").trim();
  if (!["admin", "vendedor"].includes(role)) {
    return res.status(403).json({ ok: false, error: "Sin permisos" });
  }

  const index = parseInt(req.params.index, 10);
  const ref = getFlatReferenceByIndex(index);

  if (!ref) {
    return res.status(404).json({ ok: false, error: "No existe" });
  }

  const estado = String(req.body.estado || "").trim();
  if (!estado) {
    return res.status(400).json({ ok: false, error: "Estado inválido" });
  }

  pedidosDB[ref.orderIndex].estado = estado;
  saveDB();

  res.json({ ok: true });
});

module.exports = router;