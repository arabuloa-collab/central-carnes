const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..");
const FILE_PATH = path.join(DATA_DIR, "pedidos.json");
const CLIENTES_FILE_PATH = path.join(DATA_DIR, "clientes.json");

let pedidosDB = [];

function ensureStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(FILE_PATH)) {
      fs.writeFileSync(FILE_PATH, "[]", "utf8");
    }
    if (!fs.existsSync(CLIENTES_FILE_PATH)) {
      fs.writeFileSync(CLIENTES_FILE_PATH, "[]", "utf8");
    }
  } catch (e) {
    console.error("Error preparando almacenamiento de pedidos:", e);
  }
}

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

function safeReadJSON(filePath) {
  try {
    ensureStorage();
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw.trim()) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error leyendo JSON:", filePath, e);
    return [];
  }
}

function saveDB() {
  ensureStorage();
  fs.writeFileSync(FILE_PATH, JSON.stringify(pedidosDB, null, 2), "utf8");
}

function nextPedidoNumero() {
  const max = pedidosDB.reduce((acc, p) => {
    const n = Number(p.pedidoNumero || 0);
    return n > acc ? n : acc;
  }, 1000);
  return max + 1;
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeCliente(cliente = {}) {
  return {
    nombre: String(cliente.nombre || "").trim(),
    telefono: onlyDigits(cliente.telefono),
    direccion: String(cliente.direccion || "").trim()
  };
}

function normalizeCantidad(value) {
  return String(value || "").trim().replace(",", ".");
}

function cantidadValida(value) {
  const n = parseFloat(normalizeCantidad(value));
  return Number.isFinite(n) && n > 0;
}

function normalizeItems(body) {
  if (Array.isArray(body.items) && body.items.length > 0) {
    return body.items
      .map(i => ({
        producto: String(i.producto || "").trim(),
        cantidad: normalizeCantidad(i.cantidad)
      }))
      .filter(i => i.producto && cantidadValida(i.cantidad));
  }

  const producto = String(body.producto || "").trim();
  const cantidad = normalizeCantidad(body.cantidad);

  if (!producto || !cantidadValida(cantidad)) return [];
  return [{ producto, cantidad }];
}

function sameCliente(a = {}, b = {}) {
  return (
    String(a.nombre || "").trim() === String(b.nombre || "").trim() &&
    onlyDigits(a.telefono) === onlyDigits(b.telefono) &&
    String(a.direccion || "").trim() === String(b.direccion || "").trim()
  );
}

function canAppendToLastOrder(lastOrder, cliente) {
  if (!lastOrder) return false;
  if (lastOrder.estado !== "pendiente") return false;
  if (!sameCliente(lastOrder.cliente, cliente)) return false;

  const lastCreated = new Date(lastOrder.createdAt || 0).getTime();
  return Date.now() - lastCreated <= 2 * 60 * 1000;
}

function groupedPedidosForAdmin() {
  return pedidosDB.map(order => ({
    id: order.id,
    pedidoNumero: order.pedidoNumero,
    cliente: order.cliente,
    clienteDni: order.clienteDni || "",
    items: order.items || [],
    fecha: order.fecha,
    estado: order.estado,
    actualizado: order.actualizado || order.fecha
  }));
}

function flattenPedidos() {
  const flat = [];
  pedidosDB.forEach(order => {
    (order.items || []).forEach((item, itemIndex) => {
      flat.push({
        pedidoNumero: order.pedidoNumero,
        cliente: order.cliente,
        clienteDni: order.clienteDni || "",
        producto: item.producto,
        cantidad: item.cantidad,
        fecha: order.fecha,
        estado: order.estado,
        actualizado: order.actualizado || order.fecha,
        __orderId: order.id,
        __itemIndex: itemIndex
      });
    });
  });
  return flat;
}

function migrateData(raw) {
  if (!Array.isArray(raw)) return [];

  const grouped = raw.every(p => Array.isArray(p.items));
  if (grouped) {
    return raw.map(p => ({
      id: p.id || Date.now() + Math.random(),
      pedidoNumero: p.pedidoNumero || 1001,
      cliente: normalizeCliente(p.cliente),
      clienteDni: onlyDigits(p.clienteDni || ""),
      items: (p.items || []).map(i => ({
        producto: String(i.producto || "").trim(),
        cantidad: normalizeCantidad(i.cantidad)
      })).filter(i => i.producto && cantidadValida(i.cantidad)),
      fecha: p.fecha || formatFechaArgentina(),
      createdAt: p.createdAt || nowISO(),
      estado: p.estado || "pendiente",
      actualizado: p.actualizado || p.fecha || formatFechaArgentina()
    }));
  }

  let numero = 1001;
  return raw.map(p => ({
    id: Date.now() + Math.random(),
    pedidoNumero: numero++,
    cliente: normalizeCliente(p.cliente),
    clienteDni: onlyDigits(p.clienteDni || ""),
    items: [{
      producto: String(p.producto || "").trim(),
      cantidad: normalizeCantidad(p.cantidad)
    }].filter(i => i.producto && cantidadValida(i.cantidad)),
    fecha: p.fecha || formatFechaArgentina(),
    createdAt: p.createdAt || nowISO(),
    estado: p.estado || "pendiente",
    actualizado: p.actualizado || p.fecha || formatFechaArgentina()
  }));
}

function buscarClientePorDni(dni) {
  const clientes = safeReadJSON(CLIENTES_FILE_PATH);
  return clientes.find(c => onlyDigits(c.dni) === onlyDigits(dni));
}

ensureStorage();
pedidosDB = migrateData(safeReadJSON(FILE_PATH));
saveDB();

router.get("/", (req, res) => {
  res.json(flattenPedidos());
});

router.get("/grouped", (req, res) => {
  res.json(groupedPedidosForAdmin());
});

router.post("/", (req, res) => {
  const body = req.body || {};
  const items = normalizeItems(body);

  if (!items.length) {
    return res.status(400).json({ ok: false, error: "Sin productos válidos" });
  }

  const clienteDni = onlyDigits(body.clienteDni || "");
  let clienteFinal = normalizeCliente(body.cliente || {});

  if (clienteDni) {
    const clienteRegistrado = buscarClientePorDni(clienteDni);
    if (!clienteRegistrado) {
      return res.status(400).json({ ok: false, error: "Cliente no registrado" });
    }

    clienteFinal = {
      nombre: String(clienteRegistrado.nombre || "").trim(),
      telefono: onlyDigits(clienteRegistrado.telefono),
      direccion: String(clienteRegistrado.direccion || "").trim()
    };
  }

  if (!clienteFinal.nombre || !clienteFinal.telefono || !clienteFinal.direccion) {
    return res.status(400).json({ ok: false, error: "Cliente incompleto" });
  }

  const lastOrder = pedidosDB[pedidosDB.length - 1];

  if (canAppendToLastOrder(lastOrder, clienteFinal)) {
    lastOrder.items.push(...items);
    lastOrder.actualizado = formatFechaArgentina();
    saveDB();
    return res.json({ ok: true, agrupado: true, pedidoNumero: lastOrder.pedidoNumero });
  }

  const nuevoPedido = {
    id: Date.now() + Math.random(),
    pedidoNumero: nextPedidoNumero(),
    cliente: clienteFinal,
    clienteDni,
    items,
    fecha: formatFechaArgentina(),
    createdAt: nowISO(),
    estado: "pendiente",
    actualizado: formatFechaArgentina()
  };

  pedidosDB.push(nuevoPedido);
  saveDB();

  res.json({ ok: true, agrupado: false, pedidoNumero: nuevoPedido.pedidoNumero });
});

module.exports = router;