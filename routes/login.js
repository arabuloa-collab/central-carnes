const express = require("express");
const router = express.Router();

// usuarios con rol
const usuarios = [
  { user: "admin", pass: "1234", role: "admin" },
  { user: "vendedor", pass: "1234", role: "vendedor" }
];

router.post("/", (req, res) => {
  const { user, pass } = req.body || {};

  const encontrado = usuarios.find(
    u => u.user === user && u.pass === pass
  );

  if (encontrado) {
    res.json({
      ok: true,
      user: encontrado.user,
      role: encontrado.role
    });
  } else {
    res.status(401).json({ ok: false });
  }
});

module.exports = router;
