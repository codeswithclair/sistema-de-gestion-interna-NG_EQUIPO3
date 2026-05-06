async function cargarDashboardMesero() {
    const noEmpleado = localStorage.getItem("NO_EMPLEADO");

    if (!noEmpleado) {
        alert("No se encontró el número de empleado.");
        return;
    }

    const res = await fetch(`/api/dashboard/mesero/${noEmpleado}`);
    const data = await res.json();

    document.getElementById("cardMesasAtendidas").textContent = data.mesas_atendidas;
    document.getElementById("cardPromedioServicio").textContent = data.promedio_servicio + " min";
    document.getElementById("cardPromos").textContent = data.promos;
    document.getElementById("meseroTurnoAsignado").textContent = data.turno;

    const lista = document.getElementById("listaMesasMesero");
    lista.innerHTML = "";

    if (!data.mesas_actuales.length) {
        lista.innerHTML = `
            <div class="list-item">
                <span class="list-title">Sin mesas asignadas</span>
                <span class="list-subtitle">No tienes mesas activas actualmente.</span>
            </div>
        `;
        return;
    }

    data.mesas_actuales.forEach(m => {
        lista.innerHTML += `
            <div class="list-item">
                <span class="list-title">Mesa ${m.id_mesa} — ${m.estado}</span>
                <span class="list-subtitle">Tiempo: ${m.minutos || 0} min</span>
            </div>
        `;
    });
}

document.addEventListener("DOMContentLoaded", cargarDashboardMesero);