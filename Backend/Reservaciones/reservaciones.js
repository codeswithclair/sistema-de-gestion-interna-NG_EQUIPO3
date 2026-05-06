let reservaciones = [];
let editandoId = null;

const form = document.getElementById("reservationForm");
const body = document.getElementById("reservationsBody");
const searchByName = document.getElementById("searchByName");

const nombreInput = document.getElementById("nombre");
const telefonoInput = document.getElementById("telefono");
const fechaInput = document.getElementById("fecha");
const horaInput = document.getElementById("hora");
const personasInput = document.getElementById("personas");
const estadoInput = document.getElementById("estado");
const notaInput = document.getElementById("nota");

const totalToday = document.getElementById("totalToday");
const upcomingCount = document.getElementById("upcomingCount");
const nextReservationLabel = document.getElementById("nextReservationLabel");
const nextReservationTime = document.getElementById("nextReservationTime");

const btnLimpiar = document.getElementById("btnLimpiar");
const btnBack = document.getElementById("btnBack");

function formatearFecha(fecha) {
    if (!fecha) return "—";
    return fecha;
}

function formatearHora(hora) {
    if (!hora) return "—";
    return hora.slice(0, 5);
}

function limpiarFormulario() {
    form.reset();
    editandoId = null;
}

async function cargarReservaciones() {
    try {
        const res = await fetch("/api/reservaciones");
        const data = await res.json();

        reservaciones = Array.isArray(data) ? data : [];
        renderTabla();
        renderCards();
    } catch (err) {
        console.error("Error al cargar reservaciones:", err);
        alert("No se pudieron cargar las reservaciones.");
    }
}

function renderTabla() {
    body.innerHTML = "";

    const filtro = searchByName.value.trim().toLowerCase();

    const filtradas = reservaciones.filter(r => {
        const nombreCompleto = `${r.nombre_cliente} ${r.apellido_cliente || ""}`.toLowerCase();
        return nombreCompleto.includes(filtro);
    });

    filtradas.forEach(r => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${formatearHora(r.hora)}</td>
            <td>${r.nombre_cliente} ${r.apellido_cliente || ""}</td>
            <td>${r.no_personas}</td>
            <td>${formatearFecha(r.fecha)}</td>
            <td>
            <span class="estado-badge estado-${r.estado.toLowerCase()}">
            ${r.estado}
            </span>
            </td> 
            <td>
                <button class="table-btn table-btn--small" onclick="editarReservacion(${r.id_reservacion})">Editar</button>
                <button class="table-btn table-btn--danger table-btn--small" onclick="eliminarReservacion(${r.id_reservacion})">Eliminar</button>
            </td>
        `;

        body.appendChild(tr);
    });
}

function renderCards() {
    const hoy = new Date().toISOString().split("T")[0];
    const ahora = new Date();

    const hoyReservaciones = reservaciones.filter(r => r.fecha === hoy);
    totalToday.textContent = hoyReservaciones.length;

    const proximas = hoyReservaciones.filter(r => {
        const fechaHora = new Date(`${r.fecha}T${r.hora}`);
        const diff = (fechaHora - ahora) / (1000 * 60);
        return diff >= 0 && diff <= 60;
    });

    upcomingCount.textContent = proximas.length;

    const futuras = reservaciones
        .map(r => ({ ...r, fechaHora: new Date(`${r.fecha}T${r.hora}`) }))
        .filter(r => r.fechaHora >= ahora)
        .sort((a, b) => a.fechaHora - b.fechaHora);

    if (futuras.length > 0) {
        nextReservationLabel.textContent = `${futuras[0].nombre_cliente} ${futuras[0].apellido_cliente || ""}`;
        nextReservationTime.textContent = `${futuras[0].fecha} • ${formatearHora(futuras[0].hora)}`;
    } else {
        nextReservationLabel.textContent = "Sin próximas";
        nextReservationTime.textContent = "—";
    }
}

form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const payload = {
        no_empleado: parseInt(localStorage.getItem("NO_EMPLEADO")) || 1001,
        nombre_cliente: nombreInput.value.trim(),
        apellido_cliente: "",
        telefono: telefonoInput.value.trim(),
        fecha: fechaInput.value,
        hora: horaInput.value + ":00",
        no_personas: parseInt(personasInput.value),
        estado: estadoInput.value,
        comentarios: notaInput.value.trim()
    };

    if (!payload.nombre_cliente || !payload.telefono || !payload.fecha || !payload.hora || !payload.no_personas || !payload.estado) {
        alert("Completa todos los campos obligatorios.");
        return;
    }

    try {
        const url = editandoId ? `/api/reservaciones/${editandoId}` : "/api/reservaciones";
        const metodo = editandoId ? "PUT" : "POST";

        const res = await fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "Ocurrió un error.");
            return;
        }

        alert(data.message || "Operación realizada correctamente.");
        limpiarFormulario();
        await cargarReservaciones(); // auto update
    } catch (err) {
        console.error("Error al guardar reservación:", err);
        alert("Error al guardar la reservación.");
    }
});

function editarReservacion(id) {
    const r = reservaciones.find(x => x.id_reservacion === id);
    if (!r) return;

    editandoId = id;

    nombreInput.value = r.nombre_cliente || "";
    telefonoInput.value = r.telefono || "";
    fechaInput.value = r.fecha || "";
    horaInput.value = formatearHora(r.hora);
    personasInput.value = r.no_personas || "";
    estadoInput.value = r.estado || "Pendiente";
    notaInput.value = r.comentarios || "";
}

async function eliminarReservacion(id) {
    const confirmacion = confirm("¿Seguro que deseas eliminar esta reservación?");
    if (!confirmacion) return;

    try {
        const res = await fetch(`/api/reservaciones/${id}`, {
            method: "DELETE"
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "No se pudo eliminar.");
            return;
        }

        alert(data.message || "Reservación eliminada correctamente.");
        await cargarReservaciones();
    } catch (err) {
        console.error("Error al eliminar reservación:", err);
        alert("No se pudo eliminar la reservación.");
    }
}

btnLimpiar.addEventListener("click", limpiarFormulario);
searchByName.addEventListener("input", renderTabla);

btnBack.addEventListener("click", () => {
    const rol = localStorage.getItem("ROL");

    if (rol === "GERENTE") window.location.href = "/gerente";
    else if (rol === "HOSTESS") window.location.href = "/hostess";
    else if (rol === "JEFEDEPISO") window.location.href = "/jefepiso";
    else window.location.href = "/";
});

cargarReservaciones();