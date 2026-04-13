const express = require("express");
const app = express();
const path = require("path");

// 🔥 ESTO ES LO IMPORTANTE
app.use(express.static(path.join(__dirname, "public")));

app.use(express.json());

// tus rutas
app.use("/api/pedidos", require("./routes/pedidos"));

// puerto
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor funcionando");
});