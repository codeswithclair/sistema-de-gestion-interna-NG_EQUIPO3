async function cargarDashboardHostess() {
    const res = await fetch("/api/dashboard/hostess");
    const data = await res.json();

    document.getElementById("cardClientesEspera").textContent = data.clientes_espera;
    document.getElementById("cardMesasOcupadas").textContent = data.mesas_ocupadas;
    document.getElementById("cardMesasLibres").textContent = data.mesas_libres;
    document.getElementById("cardPromedioServicio").textContent = data.promedio_servicio + " min";
    document.getElementById("cardPromocionesVigentes").textContent = data.promociones_vigentes;

    const reservacionesBox = document.getElementById("listaReservacionesRecientes");
    reservacionesBox.innerHTML = "";

    data.reservaciones.forEach(r => {
        reservacionesBox.innerHTML += `
            <div class="list-item">
                <span class="list-title">${r.nombre_cliente} – ${r.no_personas} personas</span>
                <span class="list-subtitle">Hoy • ${r.hora} • ${r.estado}</span>
            </div>
        `;
    });

    const esperaBox = document.getElementById("listaEsperaResumen");
    esperaBox.innerHTML = "";

    data.espera.forEach(e => {
        esperaBox.innerHTML += `
            <div class="list-item">
                <span class="list-title">${e.nombre} – ${e.no_personas} personas</span>
                <span class="list-subtitle">En lista de espera</span>
            </div>
        `;
    });
}

document.addEventListener("DOMContentLoaded", cargarDashboardHostess);