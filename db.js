const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Falta DATABASE_URL en las variables de entorno");
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      dni VARCHAR(20) NOT NULL UNIQUE,
      telefono VARCHAR(30) NOT NULL UNIQUE,
      direccion TEXT NOT NULL,
      password TEXT NOT NULL,
      creado TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id SERIAL PRIMARY KEY,
      pedido_numero INTEGER NOT NULL UNIQUE,
      cliente_nombre TEXT NOT NULL,
      cliente_dni VARCHAR(20) NOT NULL,
      cliente_telefono VARCHAR(30) NOT NULL,
      cliente_direccion TEXT NOT NULL,
      fecha TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      estado TEXT NOT NULL DEFAULT 'pendiente',
      actualizado TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pedido_items (
      id SERIAL PRIMARY KEY,
      pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
      producto TEXT NOT NULL,
      cantidad VARCHAR(30) NOT NULL
    );
  `);
}

module.exports = {
  pool,
  initDB
};