const express = require("express");
const router = express.Router();
const fs = require("fs");

let pedidos = [];

if (fs.existsSync("pedidos.json")) {
  try {
    const data = fs.readFileSync("pedidos.json", "utf8");
    pedidos = data ? JSON.parse(data) : [];
  } catch (error) {
    pedidos = [];
  }
}

// GET
router.get("/", (req, res) => {
  res.json(pedidos);
});

// POST
router.post("/", (req, res) => {
  const nuevo = req.body;

  nuevo.id = Date.now(); // 🔥 único
  nuevo.fecha = new Date().toLocaleString();

  pedidos.push(nuevo);

  fs.writeFileSync("pedidos.json", JSON.stringify(pedidos, null, 2));

  res.json({ ok: true });
});

// DELETE
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);

  const antes = pedidos.length;

  pedidos = pedidos.filter(p => p.id !== id);

  fs.writeFileSync("pedidos.json", JSON.stringify(pedidos, null, 2));

  res.json({
    ok: true,
    eliminados: antes - pedidos.length
  });
});

module.exports = router;
