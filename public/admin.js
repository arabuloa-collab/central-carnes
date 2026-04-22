const TELEFONO_NEGOCIO = "5491125061324";

let pedidosDB = [];
let ultimoPedidoNumeroVisto = Number(localStorage.getItem("ultimoPedidoNumeroVisto") || 0);
let intervaloPedidos = null;

const PRECIOS = {
  "ASADO completo": 15600,
  "ASADO plancha": 12500,
  "ASADO plancha cortado/marcado": 13200,
  "ASADO centro": 20500,
  "ASADO puntas": 8800,
  "BIFE DE CHORIZO B": 15400,
  "BIFE DE CHORIZO PREMIUM": 22000,
  "BIFE DE COSTILLA": 15400,
  "BOLA DE LOMO": 15500,
  "BOLA DE LOMO FETEADA": 16000,
  "CARNE CUBETEADA comun": 11000,
  "CARNE CUBETEADA premium": 18000,
  "CARNE PICADA": 8200,
  "CARNE PICADA de Roast Beef": 11500,
  "COLITA": 19500,
  "COLITA ECONOMICA": 13500,
  "CUADRADA": 15500,
  "CUADRADA FETEADA": 16000,
  "CUADRIL CT": 15500,
  "CUADRIL ST": 16000,
  "ENTRAÑA": 28000,
  "LOMO CC": 26500,
  "LOMO SC": 30500,
  "MATAMBRE ECONOMICO": 10500,
  "MATAMBRE PREMIUM": 15000,
  "NALGA con tapa": 16500,
  "NALGA FETEADA": 18500,
  "NALGA SIN TAPA": 17700,
  "OJO DE BIFE B": 19000,
  "OJO DE BIFE PREMIUM": 31300,
  "OSOBUCO | Entero o cortado": 8200,
  "PALETA": 12500,
  "PALETA ECONOMICA": 11100,
  "PECETO": 18500,
  "PECETO ECONOMICO": 14000,
  "RECORTE ROJO": 8300,
  "RECORTE 80/20": 7000,
  "ROAST BEEF": 13800,
  "ROAST BEEF ECONOMICO": 11500,
  "TAPA DE ASADO": 11900,
  "TAPA DE ASADO ECONOMICA": 11000,
  "TAPA DE BIFE": 9500,
  "TAPA DE NALGA": 11800,
  "VACIO ECONOMICO": 11800,
  "VACIO PREMIUM": 17900,
  "CHORIZOS PURO CERDO": 6800,
  "SALCHICHA PARRILLERA": 7700,
  "MORCILLA": 5900,
  "SALCHICHA AHUMADA CON PIEL": 10500,
  "ASADO Ventana": 28000,
  "BLEND HAMBURGUESAS | Bolsa 5k": 11000,
  "BLEND HAMBURGUESAS | MEDALLONES": 11700,
  "HUESO C/ TUETANO": 1800,
  "OSOBUCO Frances": 10000,
  "RIBS NOVILLO": 6500,
  "TAPA ASADO LIMPIA | brisket": 13500,
  "CIMA PARRILLERA": 12500,
  "GRASA PELLA": 1900,
  "VACIO FINO": 26000,
  "VACIO PULPON": 26000,
  "BASTONES DE MOZZARELLA  X5K": 10000,
  "NUGGETS X5K": 8000,
  "MEDALLON DE CARNE CJA 60UN X 80G": 11000,
  "HAMBURGUESA CJA 60UN X 80G": 13000,
  "MEDALLON DE POLLO 60G": 9000,
  "MILANESA POLLO": 9500,
  "SALCHICHAS": 6000,
  "MEDALLON DE CARNE ECONOMICO 60UN X 80G": 8000
};

function parseCantidad(value) {
  const n = parseFloat(String(value || "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("es-AR");
}

function getSesion() {
  try {
    return JSON.parse(localStorage.getItem("adminSesion")) || null;
  } catch {
    return null;
  }
}

function setSesion(data) {
  localStorage.setItem("adminSesion", JSON.stringify(data));
}

function clearSesion() {
  localStorage.removeItem("adminSesion");
}

function getSesionHeaders() {
  const sesion = getSesion();
  return {
    "X-Role": sesion?.role || "",
    "X-User": sesion?.user || ""
  };
}

function showApp() {
  const sesion = getSesion();
  if (!sesion) return;

  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("adminApp").classList.remove("hidden");
  document.getElementById("usuarioActual").innerText = sesion.user || "-";
  document.getElementById("rolActual").innerText = sesion.role || "-";

  cargarPedidos(true);

  if (intervaloPedidos) clearInterval(intervaloPedidos);
  intervaloPedidos = setInterval(() => cargarPedidos(false), 10000);
}

async function login() {
  const user = document.getElementById("user").value.trim();
  const pass = document.getElementById("pass").value.trim();

  if (!user || !pass) {
    alert("Completá usuario y contraseña");
    return;
  }

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, pass })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "Usuario o contraseña incorrectos");
    }

    setSesion({
      user: data.user,
      role: data.role
    });

    showApp();
  } catch (err) {
    alert(err.message);
  }
}

function logout() {
  clearSesion();
  if (intervaloPedidos) clearInterval(intervaloPedidos);
  location.reload();
}

function playNuevoPedidoSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    oscillator.frequency.setValueAtTime(660, audioCtx.currentTime + 0.12);

    gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.16, audioCtx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.36);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.36);
  } catch (e) {}
}

function getTotalPedido(items) {
  return (items || []).reduce((acc, item) => {
    const precio = Number(PRECIOS[item.producto] || 0);
    const cantidad = parseCantidad(item.cantidad);
    return acc + (precio * cantidad);
  }, 0);
}

function getEstadoClass(estado) {
  const e = String(estado || "").toLowerCase();
  if (e === "entregado") return "estado-entregado";
  if (e === "cancelado") return "estado-cancelado";
  if (e === "en preparación" || e === "en preparacion") return "estado-preparacion";
  return "estado-pendiente";
}

function normalizePhoneForWhatsApp(phone) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("549")) return digits;
  if (digits.startsWith("54")) return "9" + digits;
  if (digits.startsWith("9")) return "54" + digits;
  return "549" + digits;
}

function buildItemsWhatsappText(items) {
  return (items || []).map(i => `🥩 ${i.producto} - ${i.cantidad} kg`).join("%0A");
}

function buildClienteStatusMessage(pedido, nuevoEstado) {
  const nombre = pedido?.cliente?.nombre || "Cliente";
  const numero = pedido?.pedidoNumero || "-";
  const total = formatMoney(getTotalPedido(pedido.items || []));
  const items = (pedido.items || []).map(i => `• ${i.producto} - ${i.cantidad} kg`).join("\n");
  const itemsEncoded = items ? `${items.replace(/\n/g, "%0A")}%0A%0A` : "";

  if (nuevoEstado === "en preparación") {
    return `Hola ${nombre}, tu pedido #${numero} ya está en preparación.%0A%0A${itemsEncoded}Total estimado: $${total}%0A%0ATe avisamos cuando esté listo.`;
  }

  if (nuevoEstado === "entregado") {
    return `Hola ${nombre}, tu pedido #${numero} figura como entregado.%0A%0A${itemsEncoded}Total estimado: $${total}%0A%0AGracias por tu compra.`;
  }

  if (nuevoEstado === "cancelado") {
    return `Hola ${nombre}, tu pedido #${numero} fue cancelado.%0A%0ASi querés, escribinos y lo resolvemos.`;
  }

  return `Hola ${nombre}, tu pedido #${numero} ahora figura como: ${nuevoEstado}.`;
}

function notifyCliente(pedido, estado) {
  const phone = normalizePhoneForWhatsApp(pedido?.cliente?.telefono || "");
  if (!phone) {
    alert("El cliente no tiene teléfono válido");
    return;
  }

  const msg = buildClienteStatusMessage(pedido, estado);
  window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
}

function wspNegocio(pedido) {
  const nombre = pedido?.cliente?.nombre || "-";
  const telefono = pedido?.cliente?.telefono || "-";
  const direccion = pedido?.cliente?.direccion || "-";
  const fecha = pedido?.fecha || "-";
  const actualizado = pedido?.actualizado || "-";
  const estado = pedido?.estado || "-";
  const numero = pedido?.pedidoNumero || "-";
  const total = formatMoney(getTotalPedido(pedido.items || []));
  const items = buildItemsWhatsappText(pedido.items || []);

  const msg =
    `🛒 *PEDIDO*%0A` +
    `👤 ${nombre}%0A` +
    `📞 ${telefono}%0A` +
    `📍 ${direccion}%0A` +
    `${items}%0A` +
    `💲 Total estimado: $${total}%0A` +
    `📅 ${fecha}%0A` +
    `🕒 Actualizado: ${actualizado}%0A` +
    `📦 Estado: ${estado}%0A` +
    `#️⃣ Pedido: ${numero}`;

  window.open(`https://wa.me/${TELEFONO_NEGOCIO}?text=${msg}`, "_blank");
}

function updateDashboard(data) {
  const total = data.length;
  const pendientes = data.filter(p => p.estado === "pendiente").length;
  const preparacion = data.filter(p => p.estado === "en preparación").length;
  const entregados = data.filter(p => p.estado === "entregado").length;
  const cancelados = data.filter(p => p.estado === "cancelado").length;

  document.getElementById("totalPedidos").innerText = total;
  document.getElementById("totalPendientes").innerText = pendientes;
  document.getElementById("totalPreparacion").innerText = preparacion;
  document.getElementById("totalEntregados").innerText = entregados;
  document.getElementById("totalCancelados").innerText = cancelados;
}

function renderPedidos() {
  const lista = document.getElementById("listaPedidos");
  const texto = (document.getElementById("filtroTexto").value || "").toLowerCase().trim();
  const estado = document.getElementById("filtroEstado").value;

  let pedidos = [...pedidosDB];

  if (estado !== "todos") {
    pedidos = pedidos.filter(p => String(p.estado || "").toLowerCase() === estado.toLowerCase());
  }

  if (texto) {
    pedidos = pedidos.filter(p => {
      const nombre = String(p.cliente?.nombre || "").toLowerCase();
      const dni = String(p.clienteDni || "").toLowerCase();
      const telefono = String(p.cliente?.telefono || "").toLowerCase();
      const numero = String(p.pedidoNumero || "").toLowerCase();
      return nombre.includes(texto) || dni.includes(texto) || telefono.includes(texto) || numero.includes(texto);
    });
  }

  if (!pedidos.length) {
    lista.innerHTML = `<div class="empty-box">No hay pedidos para mostrar.</div>`;
    return;
  }

  lista.innerHTML = pedidos.map(pedido => {
    const itemsHtml = (pedido.items || []).map(item => `
      <div class="item-line">🥩 ${item.producto} — ${item.cantidad} kg</div>
    `).join("");

    return `
      <article class="pedido-card">
        <div class="pedido-top">
          <div>
            <strong>Pedido #${pedido.pedidoNumero || "-"}</strong>
            <div class="pedido-meta">
              👤 ${pedido.cliente?.nombre || "-"}<br>
              🪪 DNI ${pedido.clienteDni || "-"}<br>
              📞 ${pedido.cliente?.telefono || "-"}<br>
              📍 ${pedido.cliente?.direccion || "-"}<br>
              📅 ${pedido.fecha || "-"}<br>
              🕒 Actualizado: ${pedido.actualizado || "-"}
            </div>
          </div>

          <div>
            <span class="estado-badge ${getEstadoClass(pedido.estado)}">${pedido.estado || "pendiente"}</span>
          </div>
        </div>

        <div class="items-box">
          ${itemsHtml}
        </div>

        <div class="pedido-total">💲 Total estimado: $${formatMoney(getTotalPedido(pedido.items || []))}</div>

        <div class="pedido-actions">
          <button class="btn-state" onclick="cambiarEstado(${pedido.pedidoNumero}, 'pendiente')">Pendiente</button>
          <button class="btn-state" onclick="cambiarEstado(${pedido.pedidoNumero}, 'en preparación')">Preparación</button>
          <button class="btn-state" onclick="cambiarEstado(${pedido.pedidoNumero}, 'entregado')">Entregado</button>
          <button class="btn-state" onclick="cambiarEstado(${pedido.pedidoNumero}, 'cancelado')">Cancelar</button>
          <button class="btn-wsp" onclick='wspNegocio(${JSON.stringify(pedido).replace(/'/g, "&apos;")})'>WhatsApp negocio</button>
          <button class="btn-notify" onclick='notifyCliente(${JSON.stringify(pedido).replace(/'/g, "&apos;")}, "${String(pedido.estado || "").replace(/"/g, "&quot;")}")'>Avisar cliente</button>
        </div>
      </article>
    `;
  }).join("");
}

async function cargarPedidos(esPrimeraCarga = false) {
  try {
    const res = await fetch("/api/pedidos/grouped");
    const data = await res.json();

    pedidosDB = Array.isArray(data) ? data : [];
    updateDashboard(pedidosDB);
    renderPedidos();

    const maxNumeroActual = pedidosDB.reduce((acc, p) => {
      const n = Number(p.pedidoNumero || 0);
      return n > acc ? n : acc;
    }, 0);

    if (!esPrimeraCarga && maxNumeroActual > ultimoPedidoNumeroVisto) {
      playNuevoPedidoSound();
    }

    if (maxNumeroActual > ultimoPedidoNumeroVisto) {
      ultimoPedidoNumeroVisto = maxNumeroActual;
      localStorage.setItem("ultimoPedidoNumeroVisto", String(ultimoPedidoNumeroVisto));
    }
  } catch (err) {
    document.getElementById("listaPedidos").innerHTML = `
      <div class="empty-box">No se pudieron cargar los pedidos.</div>
    `;
  }
}

async function cambiarEstado(pedidoNumero, estado) {
  try {
    const res = await fetch(`/api/pedidos/estado/${pedidoNumero}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getSesionHeaders()
      },
      body: JSON.stringify({ estado })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "No se pudo cambiar el estado");
    }

    const pedido = pedidosDB.find(p => Number(p.pedidoNumero) === Number(pedidoNumero));

    if (pedido) {
      pedido.estado = estado;
    }

    const quiereNotificar = confirm("Estado actualizado. ¿Querés avisarle al cliente por WhatsApp?");
    if (quiereNotificar && pedido) {
      notifyCliente(pedido, estado);
    }

    await cargarPedidos(true);
  } catch (err) {
    alert(err.message);
  }
}

function exportarCSV() {
  window.open("/api/pedidos/export.csv", "_blank");
}

window.addEventListener("DOMContentLoaded", () => {
  const sesion = getSesion();
  if (sesion) {
    showApp();
  }
});