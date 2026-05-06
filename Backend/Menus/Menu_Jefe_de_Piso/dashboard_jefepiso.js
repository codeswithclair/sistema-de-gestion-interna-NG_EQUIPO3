async function cargarDashboardJefePiso() {
    const res = await fetch("/api/dashboard/jefepiso");
    const data = await res.json();

    document.getElementById("cardMesasServicio").textContent = data.mesas_servicio;
    document.getElementById("cardRetrasosHoy").textContent = data.retrasos_hoy;
    document.getElementById("cardMeserosTurno").textContent = data.meseros_turno;
    document.getElementById("cardMesasAsignadas").textContent = data.mesas_asignadas;

    const box = document.getElementById("listaSupervisionDia");
    box.innerHTML = "";

    if (data.destacado) {
        box.innerHTML += `
            <div class="list-item">
                <span class="list-title">Mesero destacado</span>
                <span class="list-subtitle">${data.destacado.nombre} — calificación ${data.destacado.calificacion}</span>
            </div>
        `;
    }

    if (data.retrasos.length) {
        data.retrasos.forEach(r => {
            box.innerHTML += `
                <div class="list-item">
                    <span class="list-title">Mesa ${r.id_mesa} con retraso</span>
                    <span class="list-subtitle">${r.razon_retraso}</span>
                </div>
            `;
        });
    } else {
        box.innerHTML += `
            <div class="list-item">
                <span class="list-title">Sin retrasos registrados</span>
                <span class="list-subtitle">No hay mesas con razón de retraso actualmente.</span>
            </div>
        `;
    }
}

document.addEventListener("DOMContentLoaded", cargarDashboardJefePiso);