const express = require("express");
const router = express.Router();

const productos = [
  { nombre: "AGUJA RIOPLATENSE" },
  { nombre: "ALITAS CAMELIAS" },
  { nombre: "ALITAS SOYCHU" },
  { nombre: "ASADO FORTUNA" },
  { nombre: "BIFE DE CHORIZO" },
  { nombre: "CUADRIL" },
  { nombre: "LOMO" },
  { nombre: "VACIO" }
];

router.get("/", (req, res) => {
  res.json(productos);
});

module.exports = router;