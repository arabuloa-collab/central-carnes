let comboSeleccionado = null;
let carrito = [];
let productosConPrecio = {};
let historialInterval = null;
let productosCarta = [];
let productosCartaFiltrados = [];

const URL = window.location.origin;
const TELEFONO = "5491125061324";

function mostrarSistema(destino = "top") {
  const intro = document.getElementById("introHero");
  const main = document.getElementById("mainContent");

  main.style.display = "block";

  if (intro) {
    intro.classList.add("intro-hide");
    setTimeout(() => {
      intro.style.display = "none";
      scrollA(destino);
    }, 500);
  } else {
    scrollA(destino);
  }
}

function scrollA(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function showElement(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
}

function hideElement(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function parseCantidad(value) {
  const normalizado = String(value || "").trim().replace(",", ".");
  const n = parseFloat(normalizado);
  return Number.isFinite(n) ? n : 0;
}

function normalizarCantidadTexto(value) {
  return String(value || "").trim().replace(",", ".");
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("es-AR");
}

function getCategoriaProducto(nombre) {
  const n = String(nombre || "").toLowerCase();

  const chacinados = ["chorizos", "morcilla", "salchicha", "salchichas"];
  const congelados = ["nuggets", "bastones de mozzarella", "medallon", "hamburguesa", "milanesa pollo"];
  const otros = ["hueso", "grasa pella", "blend"];

  if (chacinados.some(p => n.includes(p))) return "chacinados";
  if (congelados.some(p => n.includes(p))) return "congelados";
  if (otros.some(p => n.includes(p))) return "otros";
  return "vacuna";
}

function getClienteSesion() {
  try {
    return JSON.parse(localStorage.getItem("clienteSesion")) || null;
  } catch {
    return null;
  }
}

function setClienteSesion(cliente) {
  localStorage.setItem("clienteSesion", JSON.stringify(cliente));
  if (cliente?.dni) {
    localStorage.setItem("clienteUltimoDni", cliente.dni);
  }
}

function clearClienteSesion() {
  localStorage.removeItem("clienteSesion");
}

function mostrarRegistro() {
  showElement("registerBox");
  hideElement("loginBox");
  document.getElementById("authTitle").innerText = "Crear cuenta";
}

function mostrarLogin() {
  hideElement("registerBox");
  showElement("loginBox");
  document.getElementById("authTitle").innerText = "Iniciar sesión";

  const ultimoDni = localStorage.getItem("clienteUltimoDni") || "";
  if (ultimoDni) {
    document.getElementById("logDni").value = ultimoDni;
  }
}

function validarDni(dni) {
  return /^\d{7,8}$/.test(onlyDigits(dni));
}

function validarTelefono(telefono) {
  return /^\d{10,13}$/.test(onlyDigits(telefono));
}

function validarDireccion(direccion) {
  return String(direccion || "").trim().length >= 6;
}

async function registrarCliente() {
  const payload = {
    nombre: document.getElementById("regNombre").value.trim(),
    dni: onlyDigits(document.getElementById("regDni").value),
    telefono: onlyDigits(document.getElementById("regTelefono").value),
    direccion: document.getElementById("regDireccion").value.trim(),
    password: document.getElementById("regPassword").value.trim()
  };

  if (payload.nombre.length < 3) return alert("Nombre inválido");
  if (!validarDni(payload.dni)) return alert("DNI inválido");
  if (!validarTelefono(payload.telefono)) return alert("Teléfono inválido");
  if (!validarDireccion(payload.direccion)) return alert("Dirección inválida");
  if (payload.password.length < 4) return alert("Contraseña inválida");

  try {
    const res = await fetch("/api/clientes/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudo registrar");

    setClienteSesion(data.cliente);
    aplicarClienteSesion();
    mostrarSistema("formulario");
  } catch (err) {
    alert(err.message);
  }
}

async function loginCliente() {
  const payload = {
    dni: onlyDigits(document.getElementById("logDni").value),
    password: document.getElementById("logPassword").value.trim()
  };

  if (!validarDni(payload.dni)) return alert("DNI inválido");
  if (!payload.password) return alert("Ingresá la contraseña");

  try {
    const res = await fetch("/api/clientes/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudo iniciar sesión");

    setClienteSesion(data.cliente);
    aplicarClienteSesion();
    mostrarSistema("formulario");
  } catch (err) {
    alert(err.message);
  }
}

function cerrarSesionCliente() {
  clearClienteSesion();
  carrito = [];
  comboSeleccionado = null;
  renderCarrito();

  showElement("authContainer");
  hideElement("cartaContainer");
  hideElement("formulario");
  hideElement("historial");

  document.getElementById("exito").style.display = "none";
  mostrarLogin();
}

function aplicarClienteSesion() {
  const cliente = getClienteSesion();

  if (!cliente) {
    showElement("authContainer");
    hideElement("cartaContainer");
    hideElement("formulario");
    return;
  }

  hideElement("authContainer");
  showElement("cartaContainer");
  showElement("formulario");

  document.getElementById("nombre").value = cliente.nombre || "";
  document.getElementById("telefono").value = cliente.telefono || "";
  document.getElementById("direccion").value = cliente.direccion || "";

  document.getElementById("nombre").readOnly = true;
  document.getElementById("telefono").readOnly = false;
  document.getElementById("direccion").readOnly = false;

  document.getElementById("clienteActualNombre").innerText = cliente.nombre || "-";
  document.getElementById("clienteActualDni").innerText = cliente.dni || "-";
}

async function validarSesionClienteAlCargar() {
  const cliente = getClienteSesion();

  if (!cliente || !cliente.dni) {
    showElement("authContainer");
    hideElement("cartaContainer");
    hideElement("formulario");
    mostrarLogin();
    return;
  }

  document.getElementById("mainContent").style.display = "block";
  document.getElementById("introHero").style.display = "none";
  aplicarClienteSesion();

  try {
    const res = await fetch("/api/clientes/" + onlyDigits(cliente.dni));
    if (!res.ok) throw new Error();

    const data = await res.json();
    setClienteSesion(data.cliente);
    aplicarClienteSesion();
  } catch {
    aplicarClienteSesion();
  }
}

async function guardarMisDatos() {
  const cliente = getClienteSesion();
  if (!cliente || !cliente.dni) {
    alert("Primero tenés que iniciar sesión");
    return;
  }

  const telefonoNuevo = onlyDigits(document.getElementById("telefono").value);
  const direccionNueva = document.getElementById("direccion").value.trim();

  if (!validarTelefono(telefonoNuevo)) return alert("Teléfono inválido");
  if (!validarDireccion(direccionNueva)) return alert("Dirección inválida");

  try {
    const res = await fetch("/api/clientes/" + onlyDigits(cliente.dni), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telefono: telefonoNuevo,
        direccion: direccionNueva
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudo guardar");

    setClienteSesion(data.cliente);
    aplicarClienteSesion();
    alert("Datos actualizados");
  } catch (err) {
    alert(err.message);
  }
}

/* CARTA NUEVA VISUAL PRO */
function renderCarta(productos) {
  const cartaGrid = document.getElementById("cartaGrid");
  cartaGrid.innerHTML = "";

  if (!productos.length) {
    cartaGrid.innerHTML = `
      <div class="carta-empty">
        <strong>No se encontraron cortes</strong>
        <span>Probá con otro nombre o categoría.</span>
      </div>
    `;
    return;
  }

  productos.forEach((p, index) => {
    const categoria = getCategoriaProducto(p.nombre);
    const precio = Number(p.precio || 0);

    cartaGrid.innerHTML += `
      <div class="corte-card">
        <div class="corte-top">
          <div class="corte-icon">🥩</div>
          <div>
            <div class="corte-categoria">${categoria.toUpperCase()}</div>
            <h3>${p.nombre}</h3>
          </div>
        </div>

        <div class="corte-precio">
          $${formatMoney(precio)}
          <span>/ kg</span>
        </div>

        <div class="corte-compra">
          <input
            id="cartaCantidad_${index}"
            class="corte-input"
            type="text"
            inputmode="decimal"
            placeholder="Kg ej: 1.5"
          >

          <button class="corte-btn" type="button" onclick="agregarDesdeCarta(${index})">
            Agregar
          </button>
        </div>
      </div>
    `;
  });
}

function aplicarFiltroCarta() {
  const texto = (document.getElementById("buscadorCarta").value || "").toLowerCase().trim();
  const categoria = document.getElementById("categoriaCarta").value;

  productosCartaFiltrados = productosCarta.filter(p => {
    const coincideTexto = !texto || String(p.nombre || "").toLowerCase().includes(texto);
    const categoriaProducto = getCategoriaProducto(p.nombre);
    const coincideCategoria = categoria === "todos" || categoriaProducto === categoria;
    return coincideTexto && coincideCategoria;
  });

  renderCarta(productosCartaFiltrados);
}

function agregarDesdeCarta(index) {
  const cliente = getClienteSesion();
  if (!cliente) {
    alert("Primero tenés que iniciar sesión");
    return;
  }

  const productoElegido = productosCartaFiltrados[index];
  if (!productoElegido) return;

  const input = document.getElementById(`cartaCantidad_${index}`);
  const cantidadTexto = normalizarCantidadTexto(input.value);
  const cantidadNumero = parseCantidad(cantidadTexto);

  if (!cantidadTexto || cantidadNumero <= 0) {
    alert("Ingresá una cantidad válida");
    return;
  }

  carrito.push({
    producto: productoElegido.nombre,
    cantidad: cantidadTexto
  });

  input.value = "";
  renderCarrito();
  scrollA("formulario");
}

async function cargarProductos() {
  try {
    const res = await fetch("/api/productos");
    const data = await res.json();

    const producto = document.getElementById("producto");
    producto.innerHTML = "";
    productosConPrecio = {};

    data.forEach(p => {
      const o = document.createElement("option");
      o.value = p.nombre;
      o.textContent = p.nombre;
      producto.appendChild(o);

      productosConPrecio[p.nombre] = Number(p.precio || 0);
    });

    productosCarta = [...data];
    productosCartaFiltrados = [...data];
    renderCarta(productosCartaFiltrados);
    renderCarrito();
  } catch {
    console.error("No se pudieron cargar los productos");
  }
}

function aplicarPromo(p, c) {
  comboSeleccionado = null;
  const comboBox = document.getElementById("comboBox");
  comboBox.style.display = "none";
  comboBox.innerHTML = "";

  document.getElementById("producto").value = p;
  document.getElementById("cantidad").value = c;
}

function combo1() {
  comboSeleccionado = [
    { producto: "ASADO completo", cantidad: "2" },
    { producto: "VACIO PREMIUM", cantidad: "1" }
  ];

  const comboBox = document.getElementById("comboBox");
  comboBox.style.display = "block";
  comboBox.innerHTML = "<b>Combo:</b><br>🥩 Asado 2kg<br>🥩 Vacío Premium 1kg";
}

function agregarAlCarrito() {
  const cliente = getClienteSesion();
  if (!cliente) {
    alert("Primero tenés que iniciar sesión");
    return;
  }

  if (comboSeleccionado && comboSeleccionado.length > 0) {
    comboSeleccionado.forEach(item => {
      carrito.push({
        producto: item.producto,
        cantidad: normalizarCantidadTexto(item.cantidad)
      });
    });

    comboSeleccionado = null;
    const comboBox = document.getElementById("comboBox");
    comboBox.style.display = "none";
    comboBox.innerHTML = "";
    renderCarrito();
    return;
  }

  const prod = document.getElementById("producto").value;
  const cantTexto = normalizarCantidadTexto(document.getElementById("cantidad").value);
  const cantNumero = parseCantidad(cantTexto);

  if (!prod || !cantTexto || cantNumero <= 0) {
    alert("Seleccioná producto y una cantidad válida");
    return;
  }

  carrito.push({
    producto: prod,
    cantidad: cantTexto
  });

  document.getElementById("cantidad").value = "";
  renderCarrito();
}

function actualizarCantidadCarrito(index) {
  const input = document.getElementById(`carritoCantidad_${index}`);
  if (!input) return;

  const cantidadTexto = normalizarCantidadTexto(input.value);
  const cantidadNumero = parseCantidad(cantidadTexto);

  if (!cantidadTexto || cantidadNumero <= 0) {
    alert("Ingresá una cantidad válida");
    return;
  }

  carrito[index].cantidad = cantidadTexto;
  renderCarrito();
}

function quitarDelCarrito(index) {
  carrito.splice(index, 1);
  renderCarrito();
}

function vaciarCarrito() {
  carrito = [];
  renderCarrito();
}

function calcularTotalCarrito() {
  return carrito.reduce((acc, item) => {
    const precio = Number(productosConPrecio[item.producto] || 0);
    const cantidad = parseCantidad(item.cantidad);
    return acc + (precio * cantidad);
  }, 0);
}

function renderCarrito() {
  const carritoLista = document.getElementById("carritoLista");
  const carritoTotal = document.getElementById("carritoTotal");

  if (carrito.length === 0) {
    carritoLista.innerHTML = '<div class="carrito-empty">No hay productos agregados</div>';
    carritoTotal.innerText = "Total estimado: $0";
    return;
  }

  carritoLista.innerHTML = "";

  carrito.forEach((item, i) => {
    const precio = Number(productosConPrecio[item.producto] || 0);
    const cantidad = parseCantidad(item.cantidad);
    const subtotal = precio * cantidad;

    carritoLista.innerHTML += `
      <div class="carrito-item">
        <div class="carrito-item-top">
          <div>
            <strong>🥩 ${item.producto}</strong>
            <span>Subtotal: $${formatMoney(subtotal)}</span>
          </div>
          <button class="btn-remove-item" onclick="quitarDelCarrito(${i})">Quitar</button>
        </div>

        <div class="carrito-edit">
          <input id="carritoCantidad_${i}" class="carrito-cantidad-input" type="text" value="${item.cantidad}" placeholder="Kg ej: 1.5">
          <button class="btn-save-item" onclick="actualizarCantidadCarrito(${i})">Guardar</button>
          <span>⚖️ ${item.cantidad} kg</span>
        </div>
      </div>
    `;
  });

  carritoTotal.innerText = `Total estimado: $${formatMoney(calcularTotalCarrito())}`;
}

async function enviar() {
  const cliente = getClienteSesion();
  if (!cliente) {
    alert("Primero tenés que iniciar sesión");
    return;
  }

  const n = document.getElementById("nombre").value.trim();
  const t = document.getElementById("telefono").value.trim();
  const d = document.getElementById("direccion").value.trim();

  if (!n || !t || !d) {
    alert("Datos de cliente incompletos");
    return;
  }

  let itemsAEnviar = [];

  if (carrito.length > 0) {
    itemsAEnviar = [...carrito];
  } else if (comboSeleccionado && comboSeleccionado.length > 0) {
    itemsAEnviar = comboSeleccionado.map(i => ({
      producto: i.producto,
      cantidad: normalizarCantidadTexto(i.cantidad)
    }));
  } else {
    const prod = document.getElementById("producto").value;
    const cantTexto = normalizarCantidadTexto(document.getElementById("cantidad").value);
    const cantNumero = parseCantidad(cantTexto);

    if (!prod || !cantTexto || cantNumero <= 0) {
      alert("Seleccioná producto y una cantidad válida, o agregalos al carrito");
      return;
    }

    itemsAEnviar = [{
      producto: prod,
      cantidad: cantTexto
    }];
  }

  const ahora = new Date();
  const fecha = ahora.toLocaleDateString();
  const hora = ahora.toLocaleTimeString();

  const totalEstimado = itemsAEnviar.reduce((acc, item) => {
    const precio = Number(productosConPrecio[item.producto] || 0);
    const cantidad = parseCantidad(item.cantidad);
    return acc + (precio * cantidad);
  }, 0);

  try {
    const resp = await fetch("/api/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clienteDni: cliente.dni,
        items: itemsAEnviar
      })
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok || !data.ok) {
      throw new Error(data.error || "No se pudo guardar el pedido");
    }

    let mensaje = `🛒 *PEDIDO*%0A👤 ${n}%0A🪪 DNI ${cliente.dni}%0A📞 ${t}%0A📍 ${d}%0A`;

    itemsAEnviar.forEach(item => {
      mensaje += `🥩 ${item.producto} - ${item.cantidad}kg%0A`;
    });

    mensaje += `💲 Total estimado: $${formatMoney(totalEstimado)}%0A`;
    mensaje += `📅 ${fecha}%0A⏰ ${hora}%0A`;
    mensaje += `#️⃣ Pedido: ${data.pedidoNumero || "-"}`;

    window.open(`https://wa.me/${TELEFONO}?text=${mensaje}`, "_blank");

    carrito = [];
    comboSeleccionado = null;

    const comboBox = document.getElementById("comboBox");
    comboBox.style.display = "none";
    comboBox.innerHTML = "";

    renderCarrito();
    document.getElementById("cantidad").value = "";

    hideElement("formulario");
    document.getElementById("exito").style.display = "flex";
  } catch (err) {
    alert(err.message || "No se pudo enviar el pedido");
  }
}

async function cargarHistorialAgrupado() {
  const cliente = getClienteSesion();
  const lista = document.getElementById("lista");

  if (!cliente) {
    lista.innerHTML = "<p>Primero iniciá sesión</p>";
    return;
  }

  try {
    const res = await fetch("/api/pedidos/grouped");
    const data = await res.json();

    lista.innerHTML = "";

    const pedidos = data.filter(p => String(p.clienteDni || "") === String(cliente.dni || ""));

    if (pedidos.length === 0) {
      lista.innerHTML = "<p>No tenés pedidos</p>";
      return;
    }

    pedidos
      .slice()
      .sort((a, b) => Number(b.pedidoNumero) - Number(a.pedidoNumero))
      .forEach(p => {
        const estado = p.estado || "pendiente";
        const clase = estado === "entregado" ? "entregado" : "pendiente";

        const totalPedido = (p.items || []).reduce((acc, item) => {
          const precio = Number(productosConPrecio[item.producto] || 0);
          const cantidad = parseCantidad(item.cantidad);
          return acc + (precio * cantidad);
        }, 0);

        const itemsHTML = (p.items || []).map(item => `
          <div>
            🥩 ${item.producto}<br>
            ⚖️ ${item.cantidad}kg
          </div>
        `).join("<hr style='border-color: rgba(255,255,255,0.08);'>");

        lista.innerHTML += `
          <div class="card">
            <b>👤 ${p.cliente?.nombre || "-"}</b><br>
            🪪 DNI ${p.clienteDni || "-"}<br>
            📞 ${p.cliente?.telefono || "-"}<br>
            📍 ${p.cliente?.direccion || "-"}<br><br>

            <div class="items-box">
              ${itemsHTML}
            </div>

            💲 Total estimado: $${formatMoney(totalPedido)}<br>
            📅 ${p.fecha || "-"}<br>
            🕒 Actualizado: ${p.actualizado || "-"}<br>
            #️⃣ Pedido: ${p.pedidoNumero || "-"}<br>

            <div class="estado ${clase}">${estado}</div>
          </div>
        `;
      });
  } catch {
    lista.innerHTML = "<p>No se pudieron cargar tus pedidos</p>";
  }
}

function verHistorial() {
  const cliente = getClienteSesion();
  if (!cliente) {
    alert("Primero tenés que iniciar sesión");
    return;
  }

  hideElement("formulario");
  showElement("historial");

  cargarHistorialAgrupado();

  if (historialInterval) clearInterval(historialInterval);
  historialInterval = setInterval(() => {
    const historial = document.getElementById("historial");
    if (!historial.classList.contains("hidden")) {
      cargarHistorialAgrupado();
    }
  }, 10000);
}

function compartir() {
  window.open(`https://wa.me/?text=Hacé tu pedido ${URL}`);
}

function verQR() {
  const qrImg = document.getElementById("qrImg");
  const qrModal = document.getElementById("qrModal");

  qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${URL}`;
  qrModal.style.display = "flex";
}

function volver() {
  hideElement("historial");
  document.getElementById("exito").style.display = "none";
  aplicarClienteSesion();

  if (historialInterval) {
    clearInterval(historialInterval);
    historialInterval = null;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  validarSesionClienteAlCargar();
  renderCarrito();
  cargarProductos();
});