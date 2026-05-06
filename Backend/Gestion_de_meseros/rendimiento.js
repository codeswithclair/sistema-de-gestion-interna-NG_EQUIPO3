let meseros = [];
let promociones = [];

const tbody = document.getElementById("tbodyMeseros");

const kpiMesasEl = document.getElementById("kpiMesas");
const kpiPromedioEl = document.getElementById("kpiPromedio");
const kpiPromosEl = document.getElementById("kpiPromos");
const kpiMejorEl = document.getElementById("kpiMejor");

const modalObs = document.getElementById("modalObs");
const modalPromo = document.getElementById("modalPromo");
const modalDetalles = document.getElementById("modalDetalles");
const detallesContent = document.getElementById("detallesContent");

const obsMeseroSel = document.getElementById("obsMesero");
const obsTexto = document.getElementById("obsTexto");
const promoMeseroSel = document.getElementById("promoMesero");
const promoNombre = document.getElementById("promoNombre");

function formatearMinutos(min) {
    return `${Number(min || 0).toFixed(1).replace(".0", "")} min`;
}

function cortarTexto(texto, limite = 45) {
    if (!texto) return "Sin observaciones";
    return texto.length > limite ? texto.substring(0, limite) + "..." : texto;
}

function obtenerNombreTurno(turno) {
    if (!turno || turno === "Sin turno") return "Sin turno";

    const t = turno.toLowerCase();

    if (t.includes("8") || t.includes("mañana")) return "Matutino";
    if (t.includes("3") || t.includes("4")) return "Vespertino";
    if (t.includes("6") || t.includes("1 am") || t.includes("nocturno")) return "Nocturno";

    return turno;
}

async function cargarDatos() {
    try {
        const resMeseros = await fetch("/api/meseros");

        if (!resMeseros.ok) {
            throw new Error("Error al cargar meseros");
        }

        meseros = await resMeseros.json();

        const resPromos = await fetch("/api/promociones-select");

        if (!resPromos.ok) {
            throw new Error("Error al cargar promociones");
        }

        promociones = await resPromos.json();

        renderTabla();
        rellenarSelectsModales();

    } catch (error) {
        console.error("Error al cargar gestión de meseros:", error);
        alert("No se pudo cargar la información de meseros.");
    }
}

function actualizarKPIsGlobales() {
    const totalMesas = meseros.reduce((acc, m) => acc + Number(m.mesas_atendidas || 0), 0);
    const totalPromos = meseros.reduce((acc, m) => acc + Number(m.promos || 0), 0);

    const meserosConPromedio = meseros.filter(m => Number(m.promedio || 0) > 0);
    const totalPromedio = meserosConPromedio.reduce((acc, m) => acc + Number(m.promedio || 0), 0);
    const promedioGlobal = meserosConPromedio.length ? totalPromedio / meserosConPromedio.length : 0;

    const mejor = [...meseros].sort((a, b) => {
        if ((b.calificacion || 0) !== (a.calificacion || 0)) {
            return (b.calificacion || 0) - (a.calificacion || 0);
        }

        if ((b.promos || 0) !== (a.promos || 0)) {
            return (b.promos || 0) - (a.promos || 0);
        }

        if ((b.mesas_atendidas || 0) !== (a.mesas_atendidas || 0)) {
            return (b.mesas_atendidas || 0) - (a.mesas_atendidas || 0);
        }

        return (a.promedio || 999999) - (b.promedio || 999999);
    })[0];

    kpiMesasEl.textContent = totalMesas;
    kpiPromosEl.textContent = totalPromos;
    kpiPromedioEl.textContent = meserosConPromedio.length ? formatearMinutos(promedioGlobal) : "--";
    kpiMejorEl.textContent = mejor ? mejor.nombre : "--";
}

function crearBadgeRanking(m) {
    const ranking = m.ranking || "-";
    let emoji = "⭐";

    if (ranking === 1) emoji = "🥇";
    else if (ranking === 2) emoji = "🥈";
    else if (ranking === 3) emoji = "🥉";

    return `<span class="rank-badge">${emoji} #${ranking}</span>`;
}

function crearSelectHorario(m) {
    const opciones = [
        "Sin turno",
        "8 AM - 3 PM",
        "3 PM - 10 PM",
        "6 PM - 1 AM"
    ];

    return `
        <select onchange="guardarTurno(${m.no_empleado}, this.value)">
            ${opciones.map(h => `
                <option value="${h}" ${h === m.turno ? "selected" : ""}>${h}</option>
            `).join("")}
        </select>
        <small style="display:block; margin-top:4px; color:#6b7280;">
            ${obtenerNombreTurno(m.turno)}
        </small>
    `;
}

function renderTabla() {
    tbody.innerHTML = "";
    actualizarKPIsGlobales();

    meseros.forEach(m => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${m.nombre}</td>

            <td>${crearSelectHorario(m)}</td>

            <td>
                ${(m.mesas || []).length
                    ? m.mesas.map(id => `<span class="tables-chip">Mesa ${id}</span>`).join("")
                    : "—"}
            </td>

            <td>${m.mesas_atendidas || 0}</td>
            <td>${m.promos || 0}</td>
            <td>${formatearMinutos(m.promedio)}</td>

            <td>
                <input 
                    type="number" 
                    min="0" 
                    max="10" 
                    step="0.1"
                    class="score-input"
                    value="${m.calificacion || 0}"
                    onchange="guardarCalificacion(${m.no_empleado}, this.value)">
            </td>

            <td>
                <span class="obs-preview" title="${m.observacion || "Sin observaciones"}">
                    ${cortarTexto(m.observacion)}
                </span>
            </td>

            <td>${crearBadgeRanking(m)}</td>

            <td>
                <button class="table-btn" onclick="abrirDetalles(${m.no_empleado})">
                    Ver detalles
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

async function guardarCalificacion(noEmpleado, valor) {
    let calificacion = parseFloat(valor);

    if (isNaN(calificacion)) calificacion = 0;
    calificacion = Math.max(0, Math.min(10, calificacion));

    const res = await fetch(`/api/meseros/${noEmpleado}/calificacion`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calificacion })
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.message || "No se pudo guardar calificación.");
        return;
    }

    await cargarDatos();
}

async function guardarTurno(noEmpleado, turno) {
    const res = await fetch(`/api/meseros/${noEmpleado}/turno`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turno })
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.message || "No se pudo guardar turno.");
        return;
    }

    await cargarDatos();
}

function abrirModalObs() {
    obsTexto.value = "";
    rellenarSelectsModales();
    modalObs.classList.add("show");
}

async function guardarObservacion() {
    const noEmpleado = obsMeseroSel.value;
    const texto = obsTexto.value.trim();

    if (!noEmpleado) {
        alert("Selecciona un mesero.");
        return;
    }

    if (!texto) {
        alert("Escribe la observación.");
        return;
    }

    const res = await fetch(`/api/meseros/${noEmpleado}/observacion`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observacion: texto })
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.message || "No se pudo guardar observación.");
        return;
    }

    alert(data.message || "Observación guardada.");

    cerrarModals();
    await cargarDatos();
}

function abrirModalPromo() {
    rellenarSelectsModales();
    modalPromo.classList.add("show");
}

async function guardarPromo() {
    const noEmpleado = promoMeseroSel.value;
    const idPromocion = promoNombre.value;

    if (!noEmpleado) {
        alert("Selecciona un mesero.");
        return;
    }

    if (!idPromocion) {
        alert("Selecciona una promoción.");
        return;
    }

    const res = await fetch(`/api/meseros/${noEmpleado}/promo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id_promocion: idPromocion,
            cantidad: 1
        })
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.message || "No se pudo registrar promoción.");
        return;
    }

    alert(data.message || "Promoción registrada.");

    cerrarModals();
    await cargarDatos();
}

function rellenarSelectsModales() {
    obsMeseroSel.innerHTML = "";
    promoMeseroSel.innerHTML = "";
    promoNombre.innerHTML = "";

    meseros.forEach(m => {
        const optionObs = document.createElement("option");
        optionObs.value = m.no_empleado;
        optionObs.textContent = m.nombre;
        obsMeseroSel.appendChild(optionObs);

        const optionPromo = document.createElement("option");
        optionPromo.value = m.no_empleado;
        optionPromo.textContent = m.nombre;
        promoMeseroSel.appendChild(optionPromo);
    });

    promociones.forEach(p => {
        const option = document.createElement("option");
        option.value = p.id_promocion;
        option.textContent = p.nombre;
        promoNombre.appendChild(option);
    });
}

async function abrirDetalles(noEmpleado) {
    const m = meseros.find(x => x.no_empleado === noEmpleado);
    if (!m) return;

    const res = await fetch(`/api/meseros/${noEmpleado}/detalle-promos`);
    const detallePromos = await res.json();

    const promosHTML = detallePromos.length
        ? detallePromos.map(p => `<li>${p.nombre}: <strong>${p.cantidad}</strong></li>`).join("")
        : "<li>Sin promociones aplicadas hoy.</li>";

    detallesContent.innerHTML = `
        <h3>${m.nombre}</h3>

        <div class="detalles-grid">
            <div class="detalle-block">
                <h4>Turno asignado</h4>
                <p>${m.turno || "Sin turno"}</p>
                <p><strong>${obtenerNombreTurno(m.turno)}</strong></p>
            </div>

            <div class="detalle-block">
                <h4>Mesas asignadas actualmente</h4>
                <p>${(m.mesas || []).length ? m.mesas.map(x => "Mesa " + x).join(", ") : "Sin mesas asignadas"}</p>
            </div>

            <div class="detalle-block">
                <h4>Mesas atendidas hoy</h4>
                <p>${m.mesas_atendidas || 0}</p>
            </div>

            <div class="detalle-block">
                <h4>Promedio por mesa</h4>
                <p>${formatearMinutos(m.promedio)}</p>
            </div>

            <div class="detalle-block">
                <h4>Calificación</h4>
                <p>${m.calificacion || 0}</p>
            </div>

            <div class="detalle-block">
                <h4>Ranking</h4>
                <p>#${m.ranking || "--"}</p>
            </div>

            <div class="detalle-block">
                <h4>Promociones aplicadas hoy</h4>
                <ul>${promosHTML}</ul>
            </div>

            <div class="detalle-block full">
                <h4>Observación</h4>
                <p>${m.observacion || "Sin observaciones."}</p>

                ${m.observacion ? `
                    <button class="table-btn table-btn--danger" onclick="eliminarObservacion(${m.no_empleado})">
                        Eliminar observación
                    </button>
                ` : ""}
            </div>
        </div>

        <div style="text-align:right; margin-top:12px;">
            <button class="btn-secondary" onclick="cerrarModals()">Cerrar</button>
        </div>
    `;

    modalDetalles.classList.add("show");
}

async function eliminarObservacion(noEmpleado) {
    if (!confirm("¿Eliminar la observación de este mesero?")) return;

    const res = await fetch(`/api/meseros/${noEmpleado}/observacion`, {
        method: "DELETE"
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.message || "No se pudo eliminar la observación.");
        return;
    }

    alert(data.message || "Observación eliminada.");

    cerrarModals();
    await cargarDatos();
}

function cerrarModals() {
    modalObs.classList.remove("show");
    modalPromo.classList.remove("show");
    modalDetalles.classList.remove("show");
}

[modalObs, modalPromo, modalDetalles].forEach(modal => {
    modal.addEventListener("click", e => {
        if (e.target === modal) cerrarModals();
    });
});

function volverMenuPersonal() {
    const rol = localStorage.getItem("ROL");

    if (rol === "GERENTE") window.location.href = "/gerente";
    else if (rol === "JEFEPISO" || rol === "JEFEDEPISO") window.location.href = "/jefepiso";
    else window.location.href = "/";
}

document.addEventListener("DOMContentLoaded", cargarDatos);