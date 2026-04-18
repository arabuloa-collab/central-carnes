const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const FILE_PATH = path.join(__dirname, "..", "pedidos.json");
const CLIENTES_FILE_PATH = path.join(__dirname, "..", "clientes.json");

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

function safeReadJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, "utf8");
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

function csvEscape(value) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buscarClientePorDni(dni) {
  const clientes = safeReadJSON(CLIENTES_FILE_PATH);
  return clientes.find(c => onlyDigits(c.dni) === onlyDigits(dni));
}

/* =========================
   Init
========================= */

pedidosDB = migrateData(safeReadJSON(FILE_PATH));
saveDB();

/* =========================
   Routes
========================= */

router.get("/", (req, res) => {
  res.json(flattenPedidos());
});

router.get("/grouped", (req, res) => {
  res.json(groupedPedidosForAdmin());
});

router.get("/export.csv", (req, res) => {
  const headers = [
    "PedidoNumero",
    "Cliente",
    "DNI",
    "Telefono",
    "Direccion",
    "Fecha",
    "Actualizado",
    "Estado",
    "Producto",
    "Cantidad"
  ];

  const lines = [headers.join(",")];

  pedidosDB.forEach(order => {
    const items = Array.isArray(order.items) ? order.items : [];

    items.forEach(item => {
      lines.push([
        csvEscape(order.pedidoNumero),
        csvEscape(order.cliente?.nombre || ""),
        csvEscape(order.clienteDni || ""),
        csvEscape(order.cliente?.telefono || ""),
        csvEscape(order.cliente?.direccion || ""),
        csvEscape(order.fecha || ""),
        csvEscape(order.actualizado || ""),
        csvEscape(order.estado || ""),
        csvEscape(item.producto || ""),
        csvEscape(item.cantidad || "")
      ].join(","));
    });
  });

  const csv = "\uFEFF" + lines.join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="pedidos.csv"');
  res.send(csv);
});

router.post("/", (req, res) => {
  const body = req.body || {};
  const items = normalizeItems(body);

  if (items.length === 0) {
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

    return res.json({
      ok: true,
      agrupado: true,
      pedidoNumero: lastOrder.pedidoNumero
    });
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

  res.json({
    ok: true,
    agrupado: false,
    pedidoNumero: nuevoPedido.pedidoNumero
  });
});

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

  const estado = String(req.body.estado || "").trim().toLowerCase();
  const estadosValidos = ["pendiente", "en preparación", "entregado", "cancelado"];

  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ ok: false, error: "Estado inválido" });
  }

  pedido.estado = estado;
  pedido.actualizado = formatFechaArgentina();
  saveDB();

  res.json({ ok: true });
});

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
  } else {
    pedidosDB[ref.orderIndex].actualizado = formatFechaArgentina();
  }

  saveDB();
  res.json({ ok: true });
});

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

  const estado = String(req.body.estado || "").trim().toLowerCase();
  const estadosValidos = ["pendiente", "en preparación", "entregado", "cancelado"];

  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ ok: false, error: "Estado inválido" });
  }

  pedidosDB[ref.orderIndex].estado = estado;
  pedidosDB[ref.orderIndex].actualizado = formatFechaArgentina();
  saveDB();

  res.json({ ok: true });
});

module.exports = router;


