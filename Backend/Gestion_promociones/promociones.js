let promociones = [];
let editandoId = null;

const modal = document.getElementById("promoModal");
const btnNueva = document.getElementById("btnNuevaPromo");
const btnCerrar = document.getElementById("btnCerrarModal");
const btnCancelar = document.getElementById("btnCancelarPromo");
const btnGuardar = document.getElementById("btnGuardarPromo");
const btnVolver = document.getElementById("btnVolverMenu");

const tableBody = document.getElementById("promoTableBody");
const searchInput = document.querySelector(".promo-search");

const totalActivas = document.getElementById("totalActivas");
const totalInactivas = document.getElementById("totalInactivas");
const totalVencer = document.getElementById("totalVencer");

function abrirModalNueva() {
    editandoId = null;
    document.getElementById("modalTitle").innerText = "Nueva promoción";
    limpiarFormulario();
    modal.classList.add("show");
}

function cerrarModal() {
    modal.classList.remove("show");
}

function obtenerDias() {
    const checks = document.querySelectorAll(".days-box input:checked");
    return Array.from(checks).map(c => c.value).join(", ");
}

function marcarDias(diasTexto) {
    document.querySelectorAll(".days-box input").forEach(c => {
        c.checked = false;
    });

    if (!diasTexto) return;

    const dias = diasTexto.split(",").map(d => d.trim());

    document.querySelectorAll(".days-box input").forEach(c => {
        if (dias.includes(c.value)) {
            c.checked = true;
        }
    });
}

function limpiarFormulario() {
    document.getElementById("promoNombre").value = "";
    document.getElementById("promoDescripcion").value = "";
    document.getElementById("promoOcasion").value = "";
    document.getElementById("promoEstatus").value = "Activa";
    document.getElementById("promoInicio").value = "";
    document.getElementById("promoFin").value = "";
    document.getElementById("promoCondiciones").value = "";

    document.querySelectorAll(".days-box input").forEach(c => {
        c.checked = false;
    });
}

async function cargarPromociones() {
    try {
        const res = await fetch("/api/promociones");
        promociones = await res.json();

        renderTabla();
        actualizarResumen();
    } catch (error) {
        console.error("Error al cargar promociones:", error);
        alert("No se pudieron cargar las promociones.");
    }
}

function renderTabla() {
    tableBody.innerHTML = "";

    const filtro = searchInput.value.trim().toLowerCase();

    const filtradas = promociones.filter(p => {
        return (
            p.nombre.toLowerCase().includes(filtro) ||
            p.descripcion.toLowerCase().includes(filtro) ||
            (p.condiciones || "").toLowerCase().includes(filtro) ||
            (p.ocasion || "").toLowerCase().includes(filtro)
        );
    });

    filtradas.forEach(p => {
        const tr = document.createElement("tr");

        const estatusTexto = p.estado ? "Activa" : "Inactiva";
        const estatusClase = p.estado ? "active" : "inactive";

        tr.innerHTML = `
            <td><strong>${p.nombre}</strong></td>
            <td>${p.descripcion}</td>
            <td>${p.dias_vigentes}</td>
            <td>${p.ocasion || "—"}</td>
            <td>${p.vigencia_inicio} - ${p.vigencia_fin}</td>
            <td><span class="promo-badge ${estatusClase}">${estatusTexto}</span></td>
            <td>
                <button class="promo-table-btn" onclick="editarPromo(${p.id_promocion})">Editar</button>

                <button class="promo-table-btn ${p.estado ? "danger" : "success"}" 
                    onclick="toggleEstado(${p.id_promocion}, ${p.estado ? 0 : 1})">
                    ${p.estado ? "Desactivar" : "Activar"}
                </button>

                <button class="promo-table-btn danger" onclick="eliminarPromo(${p.id_promocion})">
                    Eliminar
                </button>
            </td>
        `;

        tableBody.appendChild(tr);
    });
}

function actualizarResumen() {
    const activas = promociones.filter(p => p.estado).length;
    const inactivas = promociones.filter(p => !p.estado).length;

    const hoy = new Date();

    const porVencer = promociones.filter(p => {
        if (!p.estado) return false;

        const fin = new Date(p.vigencia_fin + "T00:00:00");
        const diffDias = (fin - hoy) / (1000 * 60 * 60 * 24);

        return diffDias >= 0 && diffDias <= 7;
    }).length;

    totalActivas.textContent = activas;
    totalInactivas.textContent = inactivas;
    totalVencer.textContent = porVencer;
}

btnGuardar.addEventListener("click", async () => {
    const nombre = document.getElementById("promoNombre").value.trim();
    const descripcion = document.getElementById("promoDescripcion").value.trim();
    const ocasion = document.getElementById("promoOcasion").value.trim();
    const estatus = document.getElementById("promoEstatus").value;
    const inicio = document.getElementById("promoInicio").value;
    const fin = document.getElementById("promoFin").value;
    const condiciones = document.getElementById("promoCondiciones").value.trim();
    const dias = obtenerDias();

    if (!nombre || !descripcion || !inicio || !fin || !dias) {
        alert("Complete los campos obligatorios.");
        return;
    }

    if (fin < inicio) {
        alert("La fecha de finalización no puede ser antes de la fecha de inicio.");
        return;
    }

    const payload = {
        no_empleado: parseInt(localStorage.getItem("NO_EMPLEADO")) || 1001,
        nombre: nombre,
        descripcion: descripcion,
        condiciones: condiciones,
        vigencia_inicio: inicio,
        vigencia_fin: fin,
        estado: estatus === "Activa" ? 1 : 0,
        ocasion: ocasion,
        dias_vigentes: dias
    };

    const url = editandoId
        ? `/api/promociones/${editandoId}`
        : "/api/promociones";

    const metodo = editandoId ? "PUT" : "POST";

    try {
        const res = await fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "No se pudo guardar la promoción.");
            return;
        }

        alert(data.message || "Promoción guardada correctamente.");
        cerrarModal();
        await cargarPromociones();

    } catch (error) {
        console.error("Error al guardar promoción:", error);
        alert("No se pudo guardar la promoción.");
    }
});

function editarPromo(id) {
    const p = promociones.find(x => x.id_promocion === id);
    if (!p) return;

    editandoId = id;

    document.getElementById("modalTitle").innerText = "Editar promoción";

    document.getElementById("promoNombre").value = p.nombre;
    document.getElementById("promoDescripcion").value = p.descripcion;
    document.getElementById("promoOcasion").value = p.ocasion || "";
    document.getElementById("promoEstatus").value = p.estado ? "Activa" : "Inactiva";
    document.getElementById("promoInicio").value = p.vigencia_inicio;
    document.getElementById("promoFin").value = p.vigencia_fin;
    document.getElementById("promoCondiciones").value = p.condiciones || "";

    marcarDias(p.dias_vigentes);

    modal.classList.add("show");
}

async function toggleEstado(id, nuevoEstado) {
    try {
        const res = await fetch(`/api/promociones/${id}/estado`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado: nuevoEstado })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "No se pudo actualizar el estado.");
            return;
        }

        await cargarPromociones();
    } catch (error) {
        console.error("Error al cambiar estado:", error);
        alert("No se pudo cambiar el estado.");
    }
}

async function eliminarPromo(id) {
    if (!confirm("¿Seguro que deseas eliminar esta promoción?")) return;

    try {
        const res = await fetch(`/api/promociones/${id}`, {
            method: "DELETE"
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "No se pudo eliminar.");
            return;
        }

        alert(data.message || "Promoción eliminada o desactivada correctamente.");
        await cargarPromociones();

    } catch (error) {
        console.error("Error al eliminar promoción:", error);
        alert("No se pudo eliminar la promoción.");
    }
}

btnNueva.addEventListener("click", abrirModalNueva);
btnCerrar.addEventListener("click", cerrarModal);
btnCancelar.addEventListener("click", cerrarModal);
searchInput.addEventListener("input", renderTabla);

btnVolver.addEventListener("click", () => {
    window.location.href = "/gerente";
});

cargarPromociones();