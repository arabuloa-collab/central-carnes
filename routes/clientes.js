const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..");
const FILE_PATH = path.join(DATA_DIR, "clientes.json");

function ensureStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(FILE_PATH)) {
      fs.writeFileSync(FILE_PATH, "[]", "utf8");
    }
  } catch (e) {
    console.error("Error preparando almacenamiento de clientes:", e);
  }
}

function safeReadJSON() {
  try {
    ensureStorage();
    const raw = fs.readFileSync(FILE_PATH, "utf8");
    if (!raw.trim()) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error leyendo clientes.json:", e);
    return [];
  }
}

function saveJSON(data) {
  ensureStorage();
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), "utf8");
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function validarNombre(nombre) {
  return String(nombre || "").trim().length >= 3;
}

function validarDNI(dni) {
  const limpio = onlyDigits(dni);
  return /^\d{7,8}$/.test(limpio);
}

function validarTelefono(telefono) {
  const limpio = onlyDigits(telefono);
  return /^\d{10,13}$/.test(limpio);
}

function validarDireccion(direccion) {
  return String(direccion || "").trim().length >= 6;
}

function validarPassword(password) {
  return String(password || "").trim().length >= 4;
}

function sanitizeCliente(cliente) {
  return {
    nombre: String(cliente.nombre || "").trim(),
    dni: onlyDigits(cliente.dni),
    telefono: onlyDigits(cliente.telefono),
    direccion: String(cliente.direccion || "").trim(),
    password: String(cliente.password || "").trim()
  };
}

router.post("/register", (req, res) => {
  const clientes = safeReadJSON();
  const nuevo = sanitizeCliente(req.body || {});

  if (!validarNombre(nuevo.nombre)) {
    return res.status(400).json({ ok: false, error: "Nombre inválido" });
  }

  if (!validarDNI(nuevo.dni)) {
    return res.status(400).json({ ok: false, error: "DNI inválido" });
  }

  if (!validarTelefono(nuevo.telefono)) {
    return res.status(400).json({ ok: false, error: "Teléfono inválido" });
  }

  if (!validarDireccion(nuevo.direccion)) {
    return res.status(400).json({ ok: false, error: "Dirección inválida" });
  }

  if (!validarPassword(nuevo.password)) {
    return res.status(400).json({ ok: false, error: "Contraseña inválida" });
  }

  const existeDni = clientes.some(c => c.dni === nuevo.dni);
  if (existeDni) {
    return res.status(400).json({ ok: false, error: "Ese DNI ya está registrado" });
  }

  const existeTelefono = clientes.some(c => c.telefono === nuevo.telefono);
  if (existeTelefono) {
    return res.status(400).json({ ok: false, error: "Ese teléfono ya está registrado" });
  }

  const cliente = {
    id: Date.now(),
    nombre: nuevo.nombre,
    dni: nuevo.dni,
    telefono: nuevo.telefono,
    direccion: nuevo.direccion,
    password: nuevo.password,
    creado: new Date().toISOString()
  };

  clientes.push(cliente);
  saveJSON(clientes);

  res.json({
    ok: true,
    cliente: {
      nombre: cliente.nombre,
      dni: cliente.dni,
      telefono: cliente.telefono,
      direccion: cliente.direccion
    }
  });
});

router.post("/login", (req, res) => {
  const clientes = safeReadJSON();
  const dni = onlyDigits(req.body?.dni);
  const password = String(req.body?.password || "").trim();

  const cliente = clientes.find(c => c.dni === dni && c.password === password);

  if (!cliente) {
    return res.status(401).json({ ok: false, error: "DNI o contraseña incorrectos" });
  }

  res.json({
    ok: true,
    cliente: {
      nombre: cliente.nombre,
      dni: cliente.dni,
      telefono: cliente.telefono,
      direccion: cliente.direccion
    }
  });
});

router.get("/:dni", (req, res) => {
  const clientes = safeReadJSON();
  const dni = onlyDigits(req.params.dni);

  const cliente = clientes.find(c => c.dni === dni);

  if (!cliente) {
    return res.status(404).json({ ok: false, error: "Cliente no encontrado" });
  }

  res.json({
    ok: true,
    cliente: {
      nombre: cliente.nombre,
      dni: cliente.dni,
      telefono: cliente.telefono,
      direccion: cliente.direccion
    }
  });
});

router.put("/:dni", (req, res) => {
  const clientes = safeReadJSON();
  const dni = onlyDigits(req.params.dni);

  const index = clientes.findIndex(c => c.dni === dni);

  if (index === -1) {
    return res.status(404).json({ ok: false, error: "Cliente no encontrado" });
  }

  const actual = clientes[index];
  const telefono = onlyDigits(req.body?.telefono);
  const direccion = String(req.body?.direccion || "").trim();

  if (!validarTelefono(telefono)) {
    return res.status(400).json({ ok: false, error: "Teléfono inválido" });
  }

  if (!validarDireccion(direccion)) {
    return res.status(400).json({ ok: false, error: "Dirección inválida" });
  }

  const telefonoUsadoPorOtro = clientes.some((c, i) => i !== index && c.telefono === telefono);
  if (telefonoUsadoPorOtro) {
    return res.status(400).json({ ok: false, error: "Ese teléfono ya está registrado" });
  }

  actual.telefono = telefono;
  actual.direccion = direccion;

  clientes[index] = actual;
  saveJSON(clientes);

  res.json({
    ok: true,
    cliente: {
      nombre: actual.nombre,
      dni: actual.dni,
      telefono: actual.telefono,
      direccion: actual.direccion
    }
  });
});

module.exports = router;S