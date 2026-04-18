const express = require("express");
const router = express.Router();
const { pool } = require("../db");

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function validarNombre(nombre) {
  return String(nombre || "").trim().length >= 3;
}

function validarDNI(dni) {
  return /^\d{7,8}$/.test(onlyDigits(dni));
}

function validarTelefono(telefono) {
  return /^\d{10,13}$/.test(onlyDigits(telefono));
}

function validarDireccion(direccion) {
  return String(direccion || "").trim().length >= 6;
}

function validarPassword(password) {
  return String(password || "").trim().length >= 4;
}

router.post("/register", async (req, res) => {
  try {
    const nombre = String(req.body?.nombre || "").trim();
    const dni = onlyDigits(req.body?.dni);
    const telefono = onlyDigits(req.body?.telefono);
    const direccion = String(req.body?.direccion || "").trim();
    const password = String(req.body?.password || "").trim();

    if (!validarNombre(nombre)) {
      return res.status(400).json({ ok: false, error: "Nombre inválido" });
    }

    if (!validarDNI(dni)) {
      return res.status(400).json({ ok: false, error: "DNI inválido" });
    }

    if (!validarTelefono(telefono)) {
      return res.status(400).json({ ok: false, error: "Teléfono inválido" });
    }

    if (!validarDireccion(direccion)) {
      return res.status(400).json({ ok: false, error: "Dirección inválida" });
    }

    if (!validarPassword(password)) {
      return res.status(400).json({ ok: false, error: "Contraseña inválida" });
    }

    const existe = await pool.query(
      `SELECT dni, telefono FROM clientes WHERE dni = $1 OR telefono = $2 LIMIT 1`,
      [dni, telefono]
    );

    if (existe.rows.length > 0) {
      const row = existe.rows[0];
      if (row.dni === dni) {
        return res.status(400).json({ ok: false, error: "Ese DNI ya está registrado" });
      }
      if (row.telefono === telefono) {
        return res.status(400).json({ ok: false, error: "Ese teléfono ya está registrado" });
      }
    }

    await pool.query(
      `INSERT INTO clientes (nombre, dni, telefono, direccion, password)
       VALUES ($1, $2, $3, $4, $5)`,
      [nombre, dni, telefono, direccion, password]
    );

    res.json({
      ok: true,
      cliente: { nombre, dni, telefono, direccion }
    });
  } catch (err) {
    console.error("Error register cliente:", err);
    res.status(500).json({ ok: false, error: "Error interno al registrar" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const dni = onlyDigits(req.body?.dni);
    const password = String(req.body?.password || "").trim();

    const result = await pool.query(
      `SELECT nombre, dni, telefono, direccion
       FROM clientes
       WHERE dni = $1 AND password = $2
       LIMIT 1`,
      [dni, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ ok: false, error: "DNI o contraseña incorrectos" });
    }

    res.json({
      ok: true,
      cliente: result.rows[0]
    });
  } catch (err) {
    console.error("Error login cliente:", err);
    res.status(500).json({ ok: false, error: "Error interno al iniciar sesión" });
  }
});

router.get("/:dni", async (req, res) => {
  try {
    const dni = onlyDigits(req.params.dni);

    const result = await pool.query(
      `SELECT nombre, dni, telefono, direccion
       FROM clientes
       WHERE dni = $1
       LIMIT 1`,
      [dni]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Cliente no encontrado" });
    }

    res.json({
      ok: true,
      cliente: result.rows[0]
    });
  } catch (err) {
    console.error("Error get cliente:", err);
    res.status(500).json({ ok: false, error: "Error interno al buscar cliente" });
  }
});

router.put("/:dni", async (req, res) => {
  try {
    const dni = onlyDigits(req.params.dni);
    const telefono = onlyDigits(req.body?.telefono);
    const direccion = String(req.body?.direccion || "").trim();

    if (!validarTelefono(telefono)) {
      return res.status(400).json({ ok: false, error: "Teléfono inválido" });
    }

    if (!validarDireccion(direccion)) {
      return res.status(400).json({ ok: false, error: "Dirección inválida" });
    }

    const existeCliente = await pool.query(
      `SELECT id FROM clientes WHERE dni = $1 LIMIT 1`,
      [dni]
    );

    if (existeCliente.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Cliente no encontrado" });
    }

    const telefonoUsado = await pool.query(
      `SELECT id FROM clientes WHERE telefono = $1 AND dni <> $2 LIMIT 1`,
      [telefono, dni]
    );

    if (telefonoUsado.rows.length > 0) {
      return res.status(400).json({ ok: false, error: "Ese teléfono ya está registrado" });
    }

    await pool.query(
      `UPDATE clientes
       SET telefono = $1, direccion = $2
       WHERE dni = $3`,
      [telefono, direccion, dni]
    );

    const actualizado = await pool.query(
      `SELECT nombre, dni, telefono, direccion
       FROM clientes
       WHERE dni = $1
       LIMIT 1`,
      [dni]
    );

    res.json({
      ok: true,
      cliente: actualizado.rows[0]
    });
  } catch (err) {
    console.error("Error update cliente:", err);
    res.status(500).json({ ok: false, error: "Error interno al actualizar cliente" });
  }
});

module.exports = router;