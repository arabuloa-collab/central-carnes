const express = require("express");
const router = express.Router();

let clientes = [];

router.get("/", (req, res) => {
  res.json(clientes);
});

router.post("/", (req, res) => {
  const cliente = req.body;
  clientes.push(cliente);
  res.json({ mensaje: "Cliente agregado", cliente });
});

module.exports = router;