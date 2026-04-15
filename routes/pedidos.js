const express = require("express");
const router = express.Router();
const fs = require("fs");

let pedidos = [];

// cargar archivo
if (fs.existsSync("pedidos.json")) {
  try {
    const data = fs.readFileSync("pedidos.json", "utf-8");
    pedidos = data ? JSON.parse(data) : [];
  } catch {
    pedidos = [];
  }
}

// GET
router.get("/", (req, res) => {
  res.json(pedidos);
});

// POST
router.post("/", (req, res) => {
  const nuevoPedido = req.body;

  nuevoPedido.fecha = new Date().toLocaleString();
  nuevoPedido.estado = "pendiente";

  pedidos.push(nuevoPedido);

  fs.writeFileSync("pedidos.json", JSON.stringify(pedidos, null, 2));

  res.json({ ok: true });
});

// DELETE
router.delete("/:index", (req, res) => {
  const i = parseInt(req.params.index);

  if (i >= 0 && i < pedidos.length) {
    pedidos.splice(i, 1);
    fs.writeFileSync("pedidos.json", JSON.stringify(pedidos, null, 2));
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: "No existe" });
  }
});

// PUT (estado)
router.put("/:index", (req, res) => {
  const i = parseInt(req.params.index);

  if (i >= 0 && i < pedidos.length) {
    pedidos[i].estado = req.body.estado;

    fs.writeFileSync("pedidos.json", JSON.stringify(pedidos, null, 2));

    res.json({ ok: true });
  } else {
    res.status(404).json({ error: "No existe" });
  }
});

module.exports = router;
