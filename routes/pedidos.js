const express = require("express");
const router = express.Router();
const fs = require("fs");

// 🔥 RUTA CORRECTA AL JSON
const archivo = __dirname + "/../pedidos.json";

// LEER
function leerPedidos() {
  if (!fs.existsSync(archivo)) {
    fs.writeFileSync(archivo, "[]");
  }

  const data = fs.readFileSync(archivo);
  return JSON.parse(data);
}

// GUARDAR
function guardarPedidos(pedidos) {
  fs.writeFileSync(archivo, JSON.stringify(pedidos, null, 2));
}

// CREAR PEDIDO
router.post("/", (req, res) => {
  const pedidos = leerPedidos();
  const nuevo = req.body;

  pedidos.push(nuevo);

  guardarPedidos(pedidos);

  console.log("PEDIDO GUARDADO EN JSON");

  res.json({ mensaje: "OK" });
});

// VER PEDIDOS
router.get("/", (req, res) => {
  const pedidos = leerPedidos();
  res.json(pedidos);
});

module.exports = router;