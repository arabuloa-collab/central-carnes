const express = require("express");
const app = express();
const path = require("path");

// servir archivos
app.use(express.static(path.join(__dirname, "public")));

app.use(express.json());

// 🔥 PRODUCTOS (IMPORTANTE)
app.get("/api/productos", (req, res) => {
  res.json([
    { nombre: "AGUJA RIOPLATENSE" },
    { nombre: "ALITAS CAMELIAS" },
    { nombre: "ALITAS SOYCHU" },
    { nombre: "ASADO FORTUNA" },
    { nombre: "BIFE DE CHORIZO" },
    { nombre: "CUADRIL" },
    { nombre: "LOMO" },
    { nombre: "VACIO" }
  ]);
});

// 🔥 ruta principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// rutas API
app.use("/api/pedidos", require("./routes/pedidos"));

// puerto
const PORT = process.env.PORT || 3000;

app.use("/api/login", require("./routes/login"));

app.listen(PORT, () => {
  console.log("Servidor funcionando");
});