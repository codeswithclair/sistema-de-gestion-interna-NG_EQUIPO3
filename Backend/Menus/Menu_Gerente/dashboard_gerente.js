async function cargarDashboardGerente() {
    const res = await fetch("/api/dashboard/gerente");
    const data = await res.json();

    document.getElementById("cardUsuariosActivos").textContent = data.usuarios_activos;
    document.getElementById("cardReservacionesHoy").textContent = data.reservaciones_hoy;
    document.getElementById("cardPromocionesActivas").textContent = data.promociones_activas;
    document.getElementById("cardRendimientoPromedio").textContent = data.rendimiento_promedio + "%";

    const box = document.getElementById("resumenGerente");
    box.innerHTML = "";

    data.reservaciones.forEach(r => {
        box.innerHTML += `
            <div class="list-item">
                <span class="list-title">Reservación: ${r.nombre_cliente} – ${r.no_personas} personas</span>
                <span class="list-subtitle">Hoy • ${r.hora} • ${r.estado || "Registrada"}</span>
            </div>
        `;
    });

    data.promociones.forEach(p => {
        box.innerHTML += `
            <div class="list-item">
                <span class="list-title">Promoción activa</span>
                <span class="list-subtitle">${p.nombre}</span>
            </div>
        `;
    });

    data.mejores.forEach(m => {
        box.innerHTML += `
            <div class="list-item">
                <span class="list-title">Mesero destacado</span>
                <span class="list-subtitle">${m.nombre} — calificación ${m.calificacion}</span>
            </div>
        `;
    });
}

document.addEventListener("DOMContentLoaded", cargarDashboardGerente);