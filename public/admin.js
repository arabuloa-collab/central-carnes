async function cargarPedidos() {
  const estadoFiltro = document.getElementById("filtroEstado").value;

  const res = await fetch("/api/pedidos/grouped");
  let pedidos = await res.json();

  if (estadoFiltro !== "todos") {
    pedidos = pedidos.filter(p => p.estado === estadoFiltro);
  }

  const lista = document.getElementById("listaPedidos");
  lista.innerHTML = "";

  pedidos.reverse().forEach(p => {

    const itemsHTML = p.items.map(i =>
      `<div>🥩 ${i.producto} - ${i.cantidad}kg</div>`
    ).join("");

    lista.innerHTML += `
      <div class="card">
        <b>👤 ${p.cliente.nombre}</b><br>
        📞 ${p.cliente.telefono}<br>
        📍 ${p.cliente.direccion}<br><br>

        ${itemsHTML}

        <div class="estado ${getClaseEstado(p.estado)}">
          ${p.estado}
        </div>

        <div>
          <button onclick="cambiarEstado(${p.pedidoNumero}, 'pendiente')">Pendiente</button>
          <button onclick="cambiarEstado(${p.pedidoNumero}, 'en preparacion')">Preparación</button>
          <button onclick="cambiarEstado(${p.pedidoNumero}, 'entregado')">Entregado</button>
          <button onclick="cambiarEstado(${p.pedidoNumero}, 'cancelado')">Cancelar</button>
        </div>
      </div>
    `;
  });
}

function getClaseEstado(e) {
  if (e === "pendiente") return "pendiente";
  if (e === "entregado") return "entregado";
  if (e === "cancelado") return "cancelado";
  if (e === "en preparacion") return "preparacion";
}

async function cambiarEstado(numero, estado) {
  await fetch("/api/pedidos/estado/" + numero, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado })
  });

  cargarPedidos();
}

setInterval(cargarPedidos, 5000);
cargarPedidos();