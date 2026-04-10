console.log("SERVER NUEVO EJECUTANDO");

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// RUTA PRINCIPAL
app.get("/", (req, res) => {
  res.send("Servidor Central de Carnes funcionando");
});

// CLIENTES
const clientesRoutes = require("./routes/clientes");
app.use("/api/clientes", clientesRoutes);

// PRODUCTOS
const productosRoutes = require("./routes/productos");
app.use("/api/productos", productosRoutes);

// PEDIDOS
const pedidosRoutes = require("./routes/pedidos");
app.use("/api/pedidos", pedidosRoutes);

// SERVIDOR
app.listen(3000, () => {
  console.log("Servidor en http://localhost:3000/api/pedidos");
});