let waitlist = [];
let editandoId = null;

const wForm = document.getElementById("waitForm");
const wBody = document.getElementById("waitBody");
const clearWaitFormBtn = document.getElementById("clearWaitForm");
const btnBack = document.getElementById("btnBack");

const nombreInput = document.getElementById("w_nombre");
const personasInput = document.getElementById("w_personas");
const festejoInput = document.getElementById("w_festejo");

function formatTimer(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min} min ${sec < 10 ? "0" : ""}${sec} s`;
}

async function cargarListaEspera() {
    try {
        const res = await fetch("/api/lista-espera");
        waitlist = await res.json();
        renderWaitlist();
    } catch (error) {
        console.error("Error al cargar lista de espera:", error);
        alert("No se pudo cargar la lista de espera.");
    }
}

function renderWaitlist() {
    wBody.innerHTML = "";

    waitlist.forEach(c => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${c.nombre}</td>
            <td>${c.no_personas}</td>
            <td>${c.tipo_festejo || "—"}</td>
            <td>
                <span class="timer-badge" id="timer-${c.id_lista}">
                    ${formatTimer(c.segundos_esperando)}
                </span>
            </td>
            <td>
                <button class="table-btn table-btn--small" onclick="editWaitlist(${c.id_lista})">
                    Editar
                </button>

                <button class="table-btn table-btn--small" onclick="assignTable(${c.id_lista})">
                    Asignar mesa
                </button>

                <button class="table-btn table-btn--danger table-btn--small" onclick="removeFromWaitlist(${c.id_lista}, '${c.nombre}')">
                    Eliminar
                </button>
            </td>
        `;

        wBody.appendChild(tr);
    });
}

wForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const payload = {
        no_empleado: parseInt(localStorage.getItem("NO_EMPLEADO")) || 1003,
        nombre: nombreInput.value.trim(),
        no_personas: parseInt(personasInput.value),
        tipo_festejo: festejoInput.value.trim()
    };

    if (!payload.nombre || !payload.no_personas) {
        alert("Complete los campos requeridos.");
        return;
    }

    const url = editandoId
        ? `/api/lista-espera/${editandoId}`
        : "/api/lista-espera";

    const metodo = editandoId ? "PUT" : "POST";

    try {
        const res = await fetch(url, {
            method: metodo,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "Ocurrió un error.");
            return;
        }

        alert(data.message || "Datos guardados correctamente.");

        editandoId = null;
        wForm.reset();
        await cargarListaEspera();

    } catch (error) {
        console.error("Error al guardar cliente:", error);
        alert("No se pudo guardar el cliente.");
    }
});

window.editWaitlist = function (id) {
    const c = waitlist.find(x => x.id_lista === id);
    if (!c) return;

    editandoId = id;

    nombreInput.value = c.nombre;
    personasInput.value = c.no_personas;
    festejoInput.value = c.tipo_festejo || "";
};

window.removeFromWaitlist = async function (id, nombre) {
    if (!confirm(`¿Eliminar a ${nombre} de la lista de espera?`)) return;

    try {
        const res = await fetch(`/api/lista-espera/${id}`, {
            method: "DELETE"
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "No se pudo eliminar.");
            return;
        }

        alert(data.message || "Cliente eliminado.");
        await cargarListaEspera();

    } catch (error) {
        console.error("Error al eliminar cliente:", error);
        alert("No se pudo eliminar el cliente.");
    }
};

window.assignTable = async function (id) {
    const cliente = waitlist.find(c => c.id_lista === id);
    if (!cliente) return;

    await fetch(`/api/lista-espera/${id}/asignar`, {
        method: "PUT"
    });

    const nombre = encodeURIComponent(cliente.nombre);
    const personas = encodeURIComponent(cliente.no_personas);

    window.location.href = `/estado_mesas?cliente=${nombre}&personas=${personas}`;
};

clearWaitFormBtn.addEventListener("click", () => {
    editandoId = null;
    wForm.reset();
});

btnBack.addEventListener("click", () => {
    window.location.href = "/hostess";
});

setInterval(() => {
    waitlist.forEach(c => {
        c.segundos_esperando++;

        const timerEl = document.getElementById(`timer-${c.id_lista}`);
        if (timerEl) {
            timerEl.textContent = formatTimer(c.segundos_esperando);
        }
    });
}, 1000);

cargarListaEspera();