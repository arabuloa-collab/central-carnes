const express = require("express");
const app = express();
const path = require("path");

// archivos públicos
app.use(express.static(path.join(__dirname, "public")));

app.use(express.json());

// PRODUCTOS
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

// HOME
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// APIs
app.use("/api/pedidos", require("./routes/pedidos"));
app.use("/api/login", require("./routes/login"));

// PUERTO
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor funcionando");
});
