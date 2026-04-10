const express = require("express");
const cors = require("cors");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
const clientesRoutes = require("./routes/clientes");
app.use("/api/clientes", clientesRoutes);


const pedidosRoutes = require("./routes/pedidos");
app.use("/api/pedidos", pedidosRoutes);


// Servidor
app.listen(3000, () => {
  console.log("Servidor Central de Carnes en http://localhost:3000");
});
