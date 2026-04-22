const express = require("express");
const router = express.Router();

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "1234";

router.post("/", async (req, res) => {
  try {
    const user = String(req.body?.user || "").trim();
    const pass = String(req.body?.pass || "").trim();

    if (!user || !pass) {
      return res.status(400).json({ ok: false, error: "Faltan datos" });
    }

    if (user !== ADMIN_USER || pass !== ADMIN_PASS) {
      return res.status(401).json({ ok: false, error: "Usuario o contraseña incorrectos" });
    }

    res.json({
      ok: true,
      user: ADMIN_USER,
      role: "admin"
    });
  } catch (err) {
    console.error("Error login admin:", err);
    res.status(500).json({ ok: false, error: "Error interno de login" });
  }
});

module.exports = router;