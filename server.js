const express = require("express");
const app = express();
const path = require("path");

// archivos públicos
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// PRODUCTOS con precio
app.get("/api/productos", (req, res) => {
  res.json([
    { nombre: "AGUJA RIOPLATENSE", precio: 6500 },
    { nombre: "ALITAS CAMELIAS", precio: 4200 },
    { nombre: "ALITAS SOYCHU", precio: 4300 },
    { nombre: "ASADO FORTUNA", precio: 9800 },
    { nombre: "BIFE DE CHORIZO", precio: 12500 },
    { nombre: "CUADRIL", precio: 11800 },
    { nombre: "LOMO", precio: 14900 },
    { nombre: "VACIO", precio: 11000 }
  ]);
});

// HOME
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// APIs
app.use("/api/pedidos", require("./routes/pedidos"));
app.use("/api/login", require("./routes/login"));
app.use("/api/clientes", require("./routes/clientes"));

// PUERTO
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor funcionando");
});