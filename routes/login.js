const express = require("express");
const router = express.Router();

// 🔐 USUARIOS
const usuarios = [
  { user: "admin", pass: "1234" },
  { user: "vendedor", pass: "1234" }
];

// LOGIN
router.post("/", (req, res) => {
  const { user, pass } = req.body;

  const encontrado = usuarios.find(
    u => u.user === user && u.pass === pass
  );

  if (encontrado) {
    res.json({ ok: true, user });
  } else {
    res.status(401).json({ ok: false });
  }
});

module.exports = router;
