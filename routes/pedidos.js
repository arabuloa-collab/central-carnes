const express = require("express");
const router = express.Router();
const fs = require("fs");

let pedidos = [];

// 🔥 cargar pedidos si existen
try {
  if (fs.existsSync("pedidos.json")) {
    const data = fs.readFileSync("pedidos.json", "utf8");
    pedidos = data ? JSON.parse(data) : [];
  }
} catch (error) {
  pedidos = [];
}

// 📥 OBTENER TODOS LOS PEDIDOS
router.get("/", (req, res) => {
  res.json(pedidos);
});

// 📤 CREAR PEDIDO
router.post("/", (req, res) => {
  const nuevoPedido = req.body;

  // 🔥 AGREGAR FECHA
  nuevoPedido.fecha = new Date().toLocaleString("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit"
});

  pedidos.push(nuevoPedido);

  fs.writeFileSync("pedidos.json", JSON.stringify(pedidos, null, 2));

  res.json({ mensaje: "Pedido guardado" });
});

// 🗑 ELIMINAR PEDIDO
router.delete("/:index", (req, res) => {
  const index = parseInt(req.params.index);

  if (index >= 0 && index < pedidos.length) {
    pedidos.splice(index, 1);

    fs.writeFileSync("pedidos.json", JSON.stringify(pedidos, null, 2));

    res.json({ mensaje: "Eliminado" });
  } else {
    res.status(404).json({ error: "No existe" });
  }
});

module.exports = router;
