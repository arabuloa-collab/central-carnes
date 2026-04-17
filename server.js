const express = require("express");
const app = express();
const path = require("path");

// archivos públicos
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// PRODUCTOS con precio
app.get("/api/productos", (req, res) => {
  res.json([
    { nombre: "ASADO completo", precio: 15600 },
    { nombre: "ASADO plancha", precio: 12500 },
    { nombre: "ASADO plancha cortado/marcado", precio: 13200 },
    { nombre: "ASADO centro", precio: 20500 },
    { nombre: "ASADO puntas", precio: 8800 },
    { nombre: "BIFE DE CHORIZO B", precio: 15400 },
    { nombre: "BIFE DE CHORIZO PREMIUM", precio: 22000 },
    { nombre: "BIFE DE COSTILLA", precio: 15400 },
    { nombre: "BOLA DE LOMO", precio: 15500 },
    { nombre: "BOLA DE LOMO FETEADA", precio: 16000 },
    { nombre: "CARNE CUBETEADA comun", precio: 11000 },
    { nombre: "CARNE CUBETEADA premium", precio: 18000 },
    { nombre: "CARNE PICADA", precio: 8200 },
    { nombre: "CARNE PICADA de Roast Beef", precio: 11500 },
    { nombre: "COLITA", precio: 19500 },
    { nombre: "COLITA ECONOMICA", precio: 13500 },
    { nombre: "CUADRADA", precio: 15500 },
    { nombre: "CUADRADA FETEADA", precio: 16000 },
    { nombre: "CUADRIL CT", precio: 15500 },
    { nombre: "CUADRIL ST", precio: 16000 },
    { nombre: "ENTRAÑA", precio: 28000 },
    { nombre: "LOMO CC", precio: 26500 },
    { nombre: "LOMO SC", precio: 30500 },
    { nombre: "MATAMBRE ECONOMICO", precio: 10500 },
    { nombre: "MATAMBRE PREMIUM", precio: 15000 },
    { nombre: "NALGA con tapa", precio: 16500 },
    { nombre: "NALGA FETEADA", precio: 18500 },
    { nombre: "NALGA SIN TAPA", precio: 17700 },
    { nombre: "OJO DE BIFE B", precio: 19000 },
    { nombre: "OJO DE BIFE PREMIUM", precio: 31300 },
    { nombre: "OSOBUCO | Entero o cortado", precio: 8200 },
    { nombre: "PALETA", precio: 12500 },
    { nombre: "PALETA ECONOMICA", precio: 11100 },
    { nombre: "PECETO", precio: 18500 },
    { nombre: "PECETO ECONOMICO", precio: 14000 },
    { nombre: "RECORTE ROJO", precio: 8300 },
    { nombre: "RECORTE 80/20", precio: 7000 },
    { nombre: "ROAST BEEF", precio: 13800 },
    { nombre: "ROAST BEEF ECONOMICO", precio: 11500 },
    { nombre: "TAPA DE ASADO", precio: 11900 },
    { nombre: "TAPA DE ASADO ECONOMICA", precio: 11000 },
    { nombre: "TAPA DE BIFE", precio: 9500 },
    { nombre: "TAPA DE NALGA", precio: 11800 },
    { nombre: "VACIO ECONOMICO", precio: 11800 },
    { nombre: "VACIO PREMIUM", precio: 17900 },
    { nombre: "CHORIZOS PURO CERDO", precio: 6800 },
    { nombre: "SALCHICHA PARRILLERA", precio: 7700 },
    { nombre: "MORCILLA", precio: 5900 },
    { nombre: "SALCHICHA AHUMADA CON PIEL", precio: 10500 },
    { nombre: "ASADO Ventana", precio: 28000 },
    { nombre: "BLEND HAMBURGUESAS | Bolsa 5k", precio: 11000 },
    { nombre: "BLEND HAMBURGUESAS | MEDALLONES", precio: 11700 },
    { nombre: "HUESO C/ TUETANO", precio: 1800 },
    { nombre: "OSOBUCO Frances", precio: 10000 },
    { nombre: "RIBS NOVILLO", precio: 6500 },
    { nombre: "TAPA ASADO LIMPIA | brisket", precio: 13500 },
    { nombre: "CIMA PARRILLERA", precio: 12500 },
    { nombre: "GRASA PELLA", precio: 1900 },
    { nombre: "VACIO FINO", precio: 26000 },
    { nombre: "VACIO PULPON", precio: 26000 },
    { nombre: "BASTONES DE MOZZARELLA  X5K", precio: 10000 },
    { nombre: "NUGGETS X5K", precio: 8000 },
    { nombre: "MEDALLON DE CARNE CJA 60UN X 80G", precio: 11000 },
    { nombre: "HAMBURGUESA CJA 60UN X 80G", precio: 13000 },
    { nombre: "MEDALLON DE POLLO 60G", precio: 9000 },
    { nombre: "MILANESA POLLO", precio: 9500 },
    { nombre: "SALCHICHAS", precio: 6000 },
    { nombre: "MEDALLON DE CARNE ECONOMICO 60UN X 80G", precio: 8000 }
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