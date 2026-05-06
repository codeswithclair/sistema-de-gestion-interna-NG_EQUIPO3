const rol = localStorage.getItem("ROL") || "HOSTESS";

const btnBackMenu = document.getElementById("btnBackMenu");
const btnBackWaitlist = document.getElementById("btnBackWaitlist");

const urlParams = new URLSearchParams(window.location.search);
let clientePendiente = urlParams.get("cliente");
let personasPendientes = urlParams.get("personas");

const mesaIds = [
    10, 11, 12, 13, 14, 15,
    20, 30, 21, 31, 22, 32, 23, 33, 24, 34,
    40, 50, 41, 51, 42, 52, 43, 53, 44, 54,
    60, 70, 80, 90,
    61, 71, 81, 91,
    62, 72, 82, 92,
    63, 73, 83, 93,
    64, 74, 84,
    25, 35, 45, 55, 65, 75, 85
];

let mesas = {};
let meserosDisponibles = [];
let mesaSeleccionada = null;
let mesaEnRetraso = null;

const mesaInfo = document.getElementById("mesaInfo");
const mesaEstadoSelect = document.getElementById("mesaEstado");
const mesaClienteInput = document.getElementById("mesaCliente");
const mesaPersonasInput = document.getElementById("mesaPersonas");
const mesaMeseroInput = document.getElementById("mesaMesero");
const mesaTimerLabel = document.getElementById("mesaTimer");
const delayBox = document.getElementById("delayBox");
const delayReasonSelect = document.getElementById("delayReason");
const btnGuardarEstado = document.getElementById("btnGuardarEstado");

const modalRetraso = document.getElementById("modalRetraso");
const modalMesaInfo = document.getElementById("modalMesaInfo");
const razonRetrasoSelect = document.getElementById("razonRetrasoSelect");
const razonRetrasoComentario = document.getElementById("razonRetrasoComentario");
const btnGuardarRazonRetraso = document.getElementById("btnGuardarRazonRetraso");

function crearShapes() {
    document.querySelectorAll(".table-wrapper").forEach(w => {
        const id = w.dataset.id;
        w.innerHTML = `
            <div class="table table--libre" data-id="${id}">
                <div class="chair chair--top"></div>
                <div class="chair chair--right"></div>
                <div class="chair chair--bottom"></div>
                <div class="chair chair--left"></div>
                <div class="table-center">
                    <div class="table-number">${id}</div>
                    <div class="table-timer" id="timer-mesa-${id}">--:--</div>
                </div>
            </div>
        `;
    });
}

function formatTime(seconds) {
    if (!seconds || seconds <= 0) return "--:--";
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

async function cargarMeserosDisponibles() {
    try {
        const res = await fetch("/api/meseros-disponibles");
        meserosDisponibles = await res.json();
    } catch (error) {
        console.error("Error al cargar meseros:", error);
        meserosDisponibles = [];
    }
}

async function cargarMesas() {
    try {
        const res = await fetch("/api/mesas");
        const data = await res.json();

        mesas = {};

        mesaIds.forEach(id => {
            mesas[id] = {
                id_mesa: id,
                estado: "libre",
                nombre_cliente: "",
                no_personas: "",
                no_empleado: null,
                nombre_mesero: "",
                segundos_transcurridos: 0,
                razon_retraso: "",
                comentario_retraso: "",
                delayAsked: false
            };
        });

        data.forEach(m => {
            mesas[m.id_mesa] = {
                id_mesa: m.id_mesa,
                estado: m.estado || "libre",
                nombre_cliente: m.nombre_cliente || "",
                no_personas: m.no_personas || "",
                no_empleado: m.no_empleado || null,
                nombre_mesero: m.nombre_mesero || "",
                segundos_transcurridos: m.segundos_transcurridos || 0,
                razon_retraso: m.razon_retraso || "",
                comentario_retraso: m.comentario_retraso || "",
                delayAsked: !!m.razon_retraso
            };
        });

        mesaIds.forEach(id => updateMesaVisual(id));

        if (mesaSeleccionada) {
            fillDetailPanel(mesaSeleccionada);
        }

    } catch (error) {
        console.error("Error al cargar mesas:", error);
        alert("No se pudieron cargar las mesas.");
    }
}

function llenarSelectMeseros(meseroActual, nombreMeseroActual) {
    mesaMeseroInput.innerHTML = `<option value="">Sin mesero asignado</option>`;

    meserosDisponibles.forEach(m => {
        const option = document.createElement("option");
        option.value = m.no_empleado;
        option.textContent = m.nombre_completo;
        mesaMeseroInput.appendChild(option);
    });

    if (meseroActual) {
        const existe = [...mesaMeseroInput.options].some(opt => opt.value == meseroActual);

        if (!existe) {
            const option = document.createElement("option");
            option.value = meseroActual;
            option.textContent = nombreMeseroActual || `Mesero ${meseroActual}`;
            mesaMeseroInput.appendChild(option);
        }

        mesaMeseroInput.value = meseroActual;
    }
}

function updateMesaVisual(id) {
    const m = mesas[id];
    if (!m) return;

    const mesaEl = document.querySelector(`.table[data-id="${id}"], .booth[data-id="${id}"]`);
    if (!mesaEl) return;

    mesaEl.classList.remove(
        "table--libre", "table--ocupada", "table--ocupada-espera", "table--limpieza", "table--delay",
        "booth--libre", "booth--ocupada", "booth--ocupada-espera", "booth--limpieza", "booth--delay"
    );

    const isTable = mesaEl.classList.contains("table");
    const base = isTable ? "table" : "booth";

    if (m.estado === "libre") {
        mesaEl.classList.add(`${base}--libre`);
    } else if (m.estado === "limpieza") {
        mesaEl.classList.add(`${base}--limpieza`);
    } else if (m.estado === "ocupada") {
        if (m.no_empleado) {
            mesaEl.classList.add(`${base}--ocupada`);
        } else {
            mesaEl.classList.add(`${base}--ocupada-espera`);
        }
    }

    if (isDelayed(m)) {
        mesaEl.classList.add(`${base}--delay`);
    }

    const timerSpan = document.getElementById(`timer-mesa-${id}`);
    if (timerSpan) {
        timerSpan.textContent = formatTime(m.segundos_transcurridos);
    }
}

function fillDetailPanel(id) {
    const m = mesas[id];
    if (!m) return;

    mesaInfo.textContent = `Mesa/booth ${id} seleccionado.`;

    mesaEstadoSelect.value = m.estado || "libre";
    mesaClienteInput.value = m.nombre_cliente || "";
    mesaPersonasInput.value = m.no_personas || "";
    mesaTimerLabel.textContent = formatTime(m.segundos_transcurridos);
    delayReasonSelect.value = m.razon_retraso || "";

    llenarSelectMeseros(m.no_empleado, m.nombre_mesero);

    delayBox.style.display = shouldShowDelayBox(m) ? "block" : "none";
}

function isDelayed(m) {
    if (!m || !m.segundos_transcurridos) return false;

    const tenMin = 10 * 60;

    if (m.segundos_transcurridos >= tenMin) {
        if (m.estado === "ocupada" && !m.no_empleado) return true;
        if (m.estado === "limpieza") return true;
    }

    return false;
}

function shouldShowDelayBox(m) {
    return isDelayed(m) || !!m.razon_retraso;
}

document.addEventListener("click", e => {
    const mesaEl = e.target.closest(".table, .booth");
    if (!mesaEl) return;

    const id = parseInt(mesaEl.dataset.id);
    if (!mesas[id]) return;

    mesaSeleccionada = id;
    fillDetailPanel(id);

    if (clientePendiente && mesas[id].estado === "libre") {
        mesaEstadoSelect.value = "ocupada";
        mesaClienteInput.value = clientePendiente;
        mesaPersonasInput.value = personasPendientes || "";

        alert(`Cliente ${clientePendiente} cargado en la mesa ${id}. Ahora selecciona el mesero y guarda los cambios.`);

        clientePendiente = null;
        personasPendientes = null;
    }
});

btnGuardarEstado.addEventListener("click", async () => {
    if (!mesaSeleccionada) {
        alert("Primero selecciona una mesa o booth en el mapa.");
        return;
    }

    const id = mesaSeleccionada;

    const payload = {
        estado: mesaEstadoSelect.value,
        nombre_cliente: mesaClienteInput.value.trim(),
        no_personas: mesaPersonasInput.value ? parseInt(mesaPersonasInput.value) : null,
        no_empleado: mesaMeseroInput.value ? parseInt(mesaMeseroInput.value) : null,
        razon_retraso: delayReasonSelect.value || null,
        comentario_retraso: ""
    };

    if (payload.estado === "ocupada") {
        if (!payload.nombre_cliente || !payload.no_personas) {
            alert("Complete cliente y número de personas para ocupar la mesa.");
            return;
        }
    }

    try {
        const res = await fetch(`/api/mesas/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "No se pudo guardar la mesa.");
            return;
        }

        alert(data.message || "Mesa actualizada correctamente.");

        await cargarMeserosDisponibles();
        await cargarMesas();

    } catch (error) {
        console.error("Error al guardar mesa:", error);
        alert("No se pudo guardar la mesa.");
    }
});

function mostrarModalRetraso(mesaId) {
    mesaEnRetraso = mesaId;
    modalMesaInfo.textContent = `Mesa ${mesaId} – tiempo excedido`;
    razonRetrasoSelect.value = "";
    razonRetrasoComentario.value = "";
    modalRetraso.style.display = "flex";
}

btnGuardarRazonRetraso.addEventListener("click", async () => {
    if (!mesaEnRetraso) return;

    if (!razonRetrasoSelect.value) {
        alert("Debes seleccionar una razón del retraso.");
        return;
    }

    const payload = {
        razon_retraso: razonRetrasoSelect.value,
        comentario_retraso: razonRetrasoComentario.value || ""
    };

    try {
        const res = await fetch(`/api/mesas/${mesaEnRetraso}/retraso`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "No se pudo guardar la razón.");
            return;
        }

        modalRetraso.style.display = "none";
        alert(data.message || "Razón registrada.");

        mesaEnRetraso = null;

        await cargarMeserosDisponibles();
        await cargarMesas();

    } catch (error) {
        console.error("Error al guardar retraso:", error);
        alert("No se pudo guardar la razón.");
    }
});

btnBackMenu.addEventListener("click", () => {
    if (rol === "HOSTESS") window.location.href = "/hostess";
    else if (rol === "GERENTE") window.location.href = "/gerente";
    else if (rol === "MESERO") window.location.href = "/mesero";
    else if (rol === "JEFEDEPISO") window.location.href = "/jefepiso";
    else window.location.href = "/";
});

if (rol !== "HOSTESS") {
    btnBackWaitlist.style.display = "none";
} else {
    btnBackWaitlist.addEventListener("click", () => {
        window.location.href = "/lista_espera";
    });
}

setInterval(() => {
    Object.values(mesas).forEach(m => {
        if (m.estado === "ocupada" || m.estado === "limpieza") {
            m.segundos_transcurridos++;
        }

        updateMesaVisual(m.id_mesa);

        if (mesaSeleccionada === m.id_mesa) {
            mesaTimerLabel.textContent = formatTime(m.segundos_transcurridos);
            delayBox.style.display = shouldShowDelayBox(m) ? "block" : "none";
        }

        if (isDelayed(m) && !m.razon_retraso && !m.delayAsked) {
            m.delayAsked = true;
            mostrarModalRetraso(m.id_mesa);
        }
    });
}, 1000);

async function init() {
    crearShapes();
    await cargarMeserosDisponibles();
    await cargarMesas();
}

init();