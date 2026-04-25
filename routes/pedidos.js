
const express = require("express");
const router = express.Router();
const { pool } = require("../db");

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeCantidad(value) {
  return String(value || "").trim().replace(",", ".");
}

function cantidadValida(value) {
  const n = parseFloat(normalizeCantidad(value));
  return Number.isFinite(n) && n > 0;
}

function formatFechaArgentina(dateInput = new Date()) {
  const d = new Date(dateInput);
  return d.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function normalizeEstado(estado) {
  const e = String(estado || "").trim().toLowerCase();

  if (e === "pendiente") return "pendiente";
  if (e === "entregado") return "entregado";
  if (e === "cancelado") return "cancelado";
  if (
    e === "en preparacion" ||
    e === "en preparación" ||
    e === "preparacion" ||
    e === "preparación"
  ) {
    return "en preparación";
  }

  return e;
}

function estadoValido(estado) {
  return ["pendiente", "en preparación", "entregado", "cancelado"].includes(
    normalizeEstado(estado)
  );
}

function normalizeItems(body) {
  if (Array.isArray(body.items) && body.items.length > 0) {
    return body.items
      .map((i) => ({
        producto: String(i.producto || "").trim(),
        cantidad: normalizeCantidad(i.cantidad)
      }))
      .filter((i) => i.producto && cantidadValida(i.cantidad));
  }

  const producto = String(body.producto || "").trim();
  const cantidad = normalizeCantidad(body.cantidad);

  if (!producto || !cantidadValida(cantidad)) return [];

  return [{ producto, cantidad }];
}

async function nextPedidoNumero(client = pool) {
  const result = await client.query(
    `SELECT COALESCE(MAX(pedido_numero), 1000) AS max_num FROM pedidos`
  );
  return Number(result.rows[0].max_num) + 1;
}

function csvEscape(value) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.pedido_numero,
        p.cliente_nombre,
        p.cliente_dni,
        p.cliente_telefono,
        p.cliente_direccion,
        p.fecha,
        p.estado,
        p.actualizado,
        pi.producto,
        pi.cantidad
      FROM pedidos p
      JOIN pedido_items pi ON pi.pedido_id = p.id
      ORDER BY p.pedido_numero DESC, pi.id ASC
    `);

    const flat = result.rows.map((r) => ({
      pedidoNumero: r.pedido_numero,
      clienteDni: r.cliente_dni,
      cliente: {
        nombre: r.cliente_nombre,
        telefono: r.cliente_telefono,
        direccion: r.cliente_direccion
      },
      producto: r.producto,
      cantidad: r.cantidad,
      fecha: r.fecha,
      estado: r.estado,
      actualizado: r.actualizado
    }));

    res.json(flat);
  } catch (err) {
    console.error("Error get pedidos:", err);
    res.status(500).json({ ok: false, error: "Error al cargar pedidos" });
  }
});

router.get("/grouped", async (req, res) => {
  try {
    const pedidosResult = await pool.query(`
      SELECT *
      FROM pedidos
      ORDER BY pedido_numero DESC
    `);

    const itemsResult = await pool.query(`
      SELECT pedido_id, producto, cantidad
      FROM pedido_items
      ORDER BY id ASC
    `);

    const itemsPorPedido = {};

    itemsResult.rows.forEach((item) => {
      if (!itemsPorPedido[item.pedido_id]) {
        itemsPorPedido[item.pedido_id] = [];
      }

      itemsPorPedido[item.pedido_id].push({
        producto: item.producto,
        cantidad: item.cantidad
      });
    });

    const grouped = pedidosResult.rows.map((p) => ({
      id: p.id,
      pedidoNumero: p.pedido_numero,
      clienteDni: p.cliente_dni,
      cliente: {
        nombre: p.cliente_nombre,
        telefono: p.cliente_telefono,
        direccion: p.cliente_direccion
      },
      items: itemsPorPedido[p.id] || [],
      fecha: p.fecha,
      estado: p.estado,
      actualizado: p.actualizado
    }));

    res.json(grouped);
  } catch (err) {
    console.error("Error get grouped pedidos:", err);
    res.status(500).json({ ok: false, error: "Error al cargar pedidos agrupados" });
  }
});

router.get("/export.csv", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.pedido_numero,
        p.cliente_nombre,
        p.cliente_dni,
        p.cliente_telefono,
        p.cliente_direccion,
        p.fecha,
        p.actualizado,
        p.estado,
        pi.producto,
        pi.cantidad
      FROM pedidos p
      JOIN pedido_items pi ON pi.pedido_id = p.id
      ORDER BY p.pedido_numero DESC, pi.id ASC
    `);

    const headers = [
      "PedidoNumero",
      "Cliente",
      "DNI",
      "Telefono",
      "Direccion",
      "Fecha",
      "Actualizado",
      "Estado",
      "Producto",
      "Cantidad"
    ];

    const lines = [headers.join(",")];

    result.rows.forEach((r) => {
      lines.push(
        [
          csvEscape(r.pedido_numero),
          csvEscape(r.cliente_nombre),
          csvEscape(r.cliente_dni),
          csvEscape(r.cliente_telefono),
          csvEscape(r.cliente_direccion),
          csvEscape(r.fecha),
          csvEscape(r.actualizado),
          csvEscape(r.estado),
          csvEscape(r.producto),
          csvEscape(r.cantidad)
        ].join(",")
      );
    });

    const csv = "\uFEFF" + lines.join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="pedidos.csv"');
    res.send(csv);
  } catch (err) {
    console.error("Error export csv:", err);
    res.status(500).json({ ok: false, error: "Error exportando CSV" });
  }
});

router.post("/", async (req, res) => {
  const client = await pool.connect();

  try {
    const items = normalizeItems(req.body || {});

    if (!items.length) {
      return res.status(400).json({ ok: false, error: "Sin productos válidos" });
    }

    const clienteDni = onlyDigits(req.body?.clienteDni);

    if (!clienteDni) {
      return res.status(400).json({ ok: false, error: "Falta DNI del cliente" });
    }

    const clienteResult = await client.query(
      `
      SELECT nombre, dni, telefono, direccion
      FROM clientes
      WHERE dni = $1
      LIMIT 1
      `,
      [clienteDni]
    );

    if (clienteResult.rows.length === 0) {
      return res.status(400).json({ ok: false, error: "Cliente no registrado" });
    }

    const cliente = clienteResult.rows[0];
    const pedidoNumero = await nextPedidoNumero(client);
    const fecha = formatFechaArgentina();
    const actualizado = fecha;

    await client.query("BEGIN");

    const pedidoInsert = await client.query(
      `
      INSERT INTO pedidos
        (pedido_numero, cliente_nombre, cliente_dni, cliente_telefono, cliente_direccion, fecha, estado, actualizado)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
      `,
      [
        pedidoNumero,
        cliente.nombre,
        cliente.dni,
        cliente.telefono,
        cliente.direccion,
        fecha,
        "pendiente",
        actualizado
      ]
    );

    const pedidoId = pedidoInsert.rows[0].id;

    for (const item of items) {
      await client.query(
        `
        INSERT INTO pedido_items (pedido_id, producto, cantidad)
        VALUES ($1, $2, $3)
        `,
        [pedidoId, item.producto, item.cantidad]
      );
    }

    await client.query("COMMIT");

    res.json({
      ok: true,
      pedidoNumero
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error crear pedido:", err);
    res.status(500).json({ ok: false, error: "Error al guardar pedido" });
  } finally {
    client.release();
  }
});

router.put("/grouped/:pedidoNumero", async (req, res) => {
  try {
    const pedidoNumero = Number(req.params.pedidoNumero);
    const estado = normalizeEstado(req.body?.estado);

    if (!pedidoNumero) {
      return res.status(400).json({ ok: false, error: "Número de pedido inválido" });
    }

    if (!estadoValido(estado)) {
      return res.status(400).json({ ok: false, error: "Estado inválido" });
    }

    const actualizado = formatFechaArgentina();

    const result = await pool.query(
      `
      UPDATE pedidos
      SET estado = $1, actualizado = $2
      WHERE pedido_numero = $3
      `,
      [estado, actualizado, pedidoNumero]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "Pedido no encontrado" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Error update grouped pedido:", err);
    res.status(500).json({ ok: false, error: "Error al cambiar estado" });
  }
});

router.put("/estado/:numero", async (req, res) => {
  try {
    const pedidoNumero = Number(req.params.numero);
    const estado = normalizeEstado(req.body?.estado);

    if (!pedidoNumero) {
      return res.status(400).json({ ok: false, error: "Número de pedido inválido" });
    }

    if (!estadoValido(estado)) {
      return res.status(400).json({ ok: false, error: "Estado inválido" });
    }

    const actualizado = formatFechaArgentina();

    const result = await pool.query(
      `
      UPDATE pedidos
      SET estado = $1, actualizado = $2
      WHERE pedido_numero = $3
      `,
      [estado, actualizado, pedidoNumero]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "Pedido no encontrado" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Error update estado pedido:", err);
    res.status(500).json({ ok: false, error: "Error al cambiar estado" });
  }
});

router.delete("/grouped/:pedidoNumero", async (req, res) => {
  try {
    const pedidoNumero = Number(req.params.pedidoNumero);

    if (!pedidoNumero) {
      return res.status(400).json({ ok: false, error: "Número de pedido inválido" });
    }

    const result = await pool.query(
      `
      DELETE FROM pedidos
      WHERE pedido_numero = $1
      `,
      [pedidoNumero]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "Pedido no encontrado" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Error delete pedido:", err);
    res.status(500).json({ ok: false, error: "Error al eliminar pedido" });
  }
});

module.exports = router;