const express = require("express");
const app = express();
const path = require("path");

// servir archivos
app.use(express.static(path.join(__dirname, "public")));

app.use(express.json());

// 🔥 ruta principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// rutas API
app.use("/api/pedidos", require("./routes/pedidos"));

// puerto
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor funcionando");
});