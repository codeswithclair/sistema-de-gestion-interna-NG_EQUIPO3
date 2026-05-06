const ROL = localStorage.getItem("ROL");
if (!ROL) window.location.href = "/";

const esGerente = ROL === "GERENTE";
const esJefePiso = ROL === "JEFEDEPISO";

const rolMap = {
    GERENTE: "G",
    JEFEPISO: "JP",
    HOSTESS: "H",
    MESERO: "M"
};

let usuarios = [];
let editId = null;

const btnNuevo = document.getElementById("btnNuevoUsuario");
const modal = document.getElementById("modalUsuario");
const tituloModal = document.getElementById("tituloModal");

const inUser = document.getElementById("inUser");
const inNombre = document.getElementById("inNombre");
const inCorreo = document.getElementById("inCorreo");
const inContrasena = document.getElementById("inContrasena");
const inRol = document.getElementById("inRol");
const inEstado = document.getElementById("inEstado");

const searchUsuarios = document.getElementById("searchUsuarios");
const filterRol = document.getElementById("filterRol");
const filterEstado = document.getElementById("filterEstado");
const checkAll = document.getElementById("checkAll");

if (!esGerente) {
    btnNuevo.style.display = "none";
}

function separarNombre(nombreCompleto) {
    const partes = nombreCompleto.trim().split(" ");
    const nombre = partes[0] || "";
    const apellido = partes.slice(1).join(" ") || "";
    return { nombre, apellido };
}

function generarNoEmpleado() {
    if (usuarios.length === 0) return 1001;
    return Math.max(...usuarios.map(u => u.id)) + 1;
}

async function cargarUsuarios() {
    try {
        const response = await fetch("/api/usuarios");
        const data = await response.json();

        usuarios = data.map(u => ({
            id: u.no_empleado,
            user: u.nombre_usuario,
            nombre: `${u.nombre} ${u.apellido || ""}`.trim(),
            correo: u.correo || "",
            rol: u.rol,
            estado: u.estado,
            acceso: u.ultimo_acceso || "-"
        }));

        renderTabla();

    } catch (error) {
        console.error("Error al cargar usuarios:", error);
        alert("No se pudieron cargar los usuarios.");
    }
}

function renderTabla() {
    const tbody = document.querySelector("#tablaUsuarios tbody");
    tbody.innerHTML = "";

    const filtro = searchUsuarios.value.trim().toLowerCase();
    const rolFiltro = filterRol.value || "";
    const estadoFiltro = filterEstado.value || "";

    const visibles = usuarios.filter(u => {
        const coincideTexto =
            u.user.toLowerCase().includes(filtro) ||
            u.nombre.toLowerCase().includes(filtro) ||
            u.correo.toLowerCase().includes(filtro) ||
            u.rol.toLowerCase().includes(filtro);

        const coincideRol = !rolFiltro || u.rol === rolFiltro;
        const coincideEstado = !estadoFiltro || u.estado === estadoFiltro;

        return coincideTexto && coincideRol && coincideEstado;
    });

    visibles.forEach(u => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td><input type="checkbox" class="row-check" value="${u.id}"></td>
            <td>${u.user}</td>
            <td>${u.nombre}</td>
            <td>${u.correo}</td>
            <td><span class="role-badge role-${u.rol.toLowerCase()}">${u.rol}</span></td>
            <td><span class="status-badge status-${u.estado.toLowerCase()}">${u.estado}</span></td>
            <td>${u.acceso}</td>
            <td class="actions-cell">
                <button class="icon-action-btn" onclick="editarUsuario(${u.id})" title="Editar">✎</button>
                ${esGerente ? `
                    <button class="icon-action-btn delete-icon" onclick="eliminarUsuario(${u.id})" title="Eliminar usuario">🗑</button>
                ` : ""}
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function abrirModalNuevo() {
    editId = null;
    tituloModal.innerText = "Registrar nuevo usuario";

    inUser.value = "";
    inNombre.value = "";
    inCorreo.value = "";
    inContrasena.value = "";
    inRol.value = "HOSTESS";
    inEstado.value = "ACTIVO";

    inRol.disabled = false;
    inEstado.disabled = false;

    modal.classList.add("show");
}

window.editarUsuario = function (id) {
    const u = usuarios.find(x => x.id === id);
    if (!u) return;

    if (esJefePiso && u.rol === "GERENTE") {
        alert("PERMISO DENEGADO: no puedes modificar a un gerente.");
        return;
    }

    if (esJefePiso && !["HOSTESS", "MESERO"].includes(u.rol)) {
        alert("Solo puedes modificar cuentas operativas.");
        return;
    }

    editId = id;
    tituloModal.innerText = "Editar usuario";

    inUser.value = u.user;
    inNombre.value = u.nombre;
    inCorreo.value = u.correo;
    inContrasena.value = "";
    inRol.value = u.rol;
    inEstado.value = u.estado;

    modal.classList.add("show");
};

async function guardarUsuario() {
    const nombreCompleto = inNombre.value.trim();
    const { nombre, apellido } = separarNombre(nombreCompleto);

    if (!inUser.value.trim() || !nombre || !inRol.value || !inEstado.value) {
        alert("Completa usuario, nombre, rol y estado.");
        return;
    }

    if (!editId && !inContrasena.value.trim()) {
        alert("La contraseña es obligatoria para registrar un usuario nuevo.");
        return;
    }

    const payload = {
        no_empleado: editId || generarNoEmpleado(),
        id_rol: rolMap[inRol.value],
        nombre: nombre,
        apellido: apellido,
        contrasena: inContrasena.value.trim(),
        correo: inCorreo.value.trim(),
        nombre_usuario: inUser.value.trim(),
        estado: inEstado.value,
        rol_sesion: ROL
    };

    const url = editId ? `/api/usuarios/${editId}` : "/api/usuarios";
    const metodo = editId ? "PUT" : "POST";

    try {
        const res = await fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "No se pudo guardar el usuario.");
            return;
        }

        alert(data.message || "Usuario guardado correctamente.");
        cerrarModal();
        await cargarUsuarios();

    } catch (error) {
        console.error("Error al guardar usuario:", error);
        alert("Error al guardar usuario.");
    }
}

window.eliminarUsuario = async function (id) {
    if (!esGerente) {
        alert("Solo gerente puede eliminar usuarios.");
        return;
    }

    if (!confirm("¿Seguro que deseas eliminar este usuario?")) return;

    try {
        const res = await fetch(`/api/usuarios/${id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rol_sesion: ROL })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "No se pudo eliminar.");
            return;
        }

        alert(data.message || "Usuario eliminado correctamente.");
        await cargarUsuarios();

    } catch (error) {
        console.error("Error al eliminar:", error);
        alert("Error al eliminar usuario.");
    }
};

function obtenerSeleccionados() {
    return Array.from(document.querySelectorAll(".row-check:checked"))
        .map(chk => parseInt(chk.value));
}

async function cambiarEstadoSeleccionados(nuevoEstado) {
    const ids = obtenerSeleccionados();

    if (ids.length === 0) {
        alert("Selecciona al menos un usuario.");
        return;
    }

    try {
        const res = await fetch("/api/usuarios/bulk-estado", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ids: ids,
                estado: nuevoEstado,
                rol_sesion: ROL
            })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "No se pudieron actualizar los usuarios.");
            return;
        }

        alert(data.message || "Usuarios actualizados.");
        checkAll.checked = false;
        await cargarUsuarios();

    } catch (error) {
        console.error("Error en cambio masivo:", error);
        alert("Error al actualizar usuarios.");
    }
}

async function eliminarSeleccionados() {
    if (!esGerente) {
        alert("Solo gerente puede eliminar usuarios.");
        return;
    }

    const ids = obtenerSeleccionados();

    if (ids.length === 0) {
        alert("Selecciona al menos un usuario.");
        return;
    }

    if (!confirm("¿Seguro que deseas eliminar los usuarios seleccionados?")) return;

    try {
        const res = await fetch("/api/usuarios/bulk-delete", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ids: ids,
                rol_sesion: ROL
            })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "No se pudieron eliminar los usuarios.");
            return;
        }

        alert(data.message || "Usuarios eliminados.");
        checkAll.checked = false;
        await cargarUsuarios();

    } catch (error) {
        console.error("Error al eliminar usuarios:", error);
        alert("Error al eliminar usuarios.");
    }
}

function cerrarModal() {
    modal.classList.remove("show");
}

function volverMenu() {
    if (esGerente) window.location.href = "/gerente";
    else if (esJefePiso) window.location.href = "/jefepiso";
    else window.location.href = "/";
}

window.volverMenu = volverMenu;

searchUsuarios.addEventListener("input", renderTabla);
filterRol.addEventListener("change", renderTabla);
filterEstado.addEventListener("change", renderTabla);

checkAll.addEventListener("change", () => {
    document.querySelectorAll(".row-check").forEach(chk => {
        chk.checked = checkAll.checked;
    });
});

document.getElementById("btnLimpiarFiltros").addEventListener("click", () => {
    searchUsuarios.value = "";
    filterRol.selectedIndex = 0;
    filterEstado.selectedIndex = 0;
    checkAll.checked = false;
    renderTabla();
});

btnNuevo.addEventListener("click", abrirModalNuevo);
document.getElementById("btnGuardar").addEventListener("click", guardarUsuario);
document.getElementById("btnCancelar").addEventListener("click", cerrarModal);
document.getElementById("btnCerrarModal").addEventListener("click", cerrarModal);

modal.addEventListener("click", e => {
    if (e.target === modal) cerrarModal();
});

document.getElementById("btnActivarSeleccionados").addEventListener("click", () => {
    cambiarEstadoSeleccionados("ACTIVO");
});

document.getElementById("btnDesactivarSeleccionados").addEventListener("click", () => {
    cambiarEstadoSeleccionados("INACTIVO");
});

document.getElementById("btnEliminarSeleccionados").addEventListener("click", eliminarSeleccionados);

cargarUsuarios();