const promoGrid = document.getElementById("promoGrid");
const btnRegresar = document.getElementById("btnRegresar");

const ROL = (localStorage.getItem("ROL") || "").toUpperCase();
const NO_EMPLEADO = localStorage.getItem("NO_EMPLEADO");

function formatearFecha(fecha) {
    if (!fecha) return "—";
    const partes = fecha.split("-");
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function acortarDias(diasTexto) {
    if (!diasTexto) return [];

    const mapa = {
        "Lunes": "Lun",
        "Martes": "Mar",
        "Miércoles": "Mié",
        "Miercoles": "Mié",
        "Jueves": "Jue",
        "Viernes": "Vie",
        "Sábado": "Sáb",
        "Sabado": "Sáb",
        "Domingo": "Dom"
    };

    return diasTexto.split(",").map(d => mapa[d.trim()] || d.trim());
}

async function cargarPromocionesVigentes() {
    try {
        const res = await fetch("/api/promociones-vigentes");
        const promociones = await res.json();

        if (!res.ok) {
            alert(promociones.message || "Error al cargar promociones.");
            return;
        }

        promoGrid.innerHTML = "";

        if (!promociones.length) {
            promoGrid.innerHTML = `
                <div class="promo-empty">
                    No hay promociones vigentes por el momento.
                </div>
            `;
            return;
        }

        promociones.forEach(p => {
            const dias = acortarDias(p.dias_vigentes);

            const card = document.createElement("div");
            card.className = "promo-card";

            card.innerHTML = `
                <div class="promo-card-top">
                    <span class="promo-status active">Activa</span>
                    <span class="promo-occasion">${p.ocasion || "General"}</span>
                </div>

                <h3 class="promo-title">${p.nombre}</h3>
                <p class="promo-desc">${p.descripcion}</p>

                <div class="promo-days">
                    ${dias.map(d => `<span>${d}</span>`).join("")}
                </div>

                <div class="promo-info">
                    <p><strong>Vigencia:</strong> ${formatearFecha(p.vigencia_inicio)} - ${formatearFecha(p.vigencia_fin)}</p>
                    <p><strong>Condiciones:</strong> ${p.condiciones || "Sin condiciones especiales"}</p>
                </div>

                ${ROL === "MESERO" ? `
                    <div class="promo-apply-box">
                        <label>Cantidad aplicada</label>

                        <input 
                            type="number" 
                            min="1" 
                            value="1" 
                            id="cantidadPromo-${p.id_promocion}" 
                            class="promo-apply-input">

                        <button 
                            class="btn-primary" 
                            onclick="registrarPromoAplicada(${p.id_promocion})">
                            Registrar aplicación
                        </button>
                    </div>
                ` : ""}
            `;

            promoGrid.appendChild(card);
        });

    } catch (error) {
        console.error("Error al cargar promociones vigentes:", error);
        alert("No se pudieron cargar las promociones vigentes.");
    }
}

async function registrarPromoAplicada(idPromocion) {
    if (ROL !== "MESERO") {
        alert("Solo los meseros pueden registrar promociones aplicadas.");
        return;
    }

    if (!NO_EMPLEADO) {
        alert("No se encontró el número de empleado en sesión.");
        return;
    }

    const input = document.getElementById(`cantidadPromo-${idPromocion}`);
    const cantidad = parseInt(input.value);

    if (!cantidad || cantidad <= 0) {
        alert("Ingresa una cantidad válida.");
        return;
    }

    try {
        const res = await fetch(`/api/meseros/${NO_EMPLEADO}/promo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id_promocion: idPromocion,
                cantidad: cantidad
            })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "No se pudo registrar la promoción.");
            return;
        }

        alert(data.message || "Promoción aplicada registrada correctamente.");
        input.value = 1;

    } catch (error) {
        console.error("Error al registrar promoción:", error);
        alert("No se pudo registrar la promoción aplicada.");
    }
}

btnRegresar.addEventListener("click", () => {
    if (ROL === "HOSTESS") window.location.href = "/hostess";
    else if (ROL === "MESERO") window.location.href = "/mesero";
    else if (ROL === "JEFEPISO" || ROL === "JEFEDEPISO") window.location.href = "/jefepiso";
    else if (ROL === "GERENTE") window.location.href = "/gerente";
    else window.location.href = "/";
});

cargarPromocionesVigentes();