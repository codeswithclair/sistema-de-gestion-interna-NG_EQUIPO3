let mesero = null;
let detallePromos = [];
let chart = null;
let resumenFilas = [];

const noEmpleado = localStorage.getItem("NO_EMPLEADO");

function formatearMinutos(min) {
    return `${Number(min || 0).toFixed(1).replace(".0", "")} min`;
}

function obtenerNombreTurno(turno) {
    if (!turno || turno === "Sin turno") return "Sin turno";

    const t = turno.toLowerCase();

    if (t.includes("8") || t.includes("mañana")) {
        return "Matutino";
    }

    if (t.includes("3") || t.includes("4")) {
        return "Vespertino";
    }

    if (t.includes("6") || t.includes("1 am") || t.includes("nocturno")) {
        return "Nocturno";
    }

    return turno;
}

async function cargarRendimientoMesero() {
    if (!noEmpleado) {
        alert("No se encontró el empleado en sesión.");
        window.location.href = "/";
        return;
    }

    try {
        const res = await fetch(`/api/meseros/${noEmpleado}`);
        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "No se pudo cargar el rendimiento.");
            return;
        }

        mesero = data;

        const resPromos = await fetch(`/api/meseros/${noEmpleado}/detalle-promos`);
        detallePromos = await resPromos.json();

        renderCards();
        renderResumen();
        renderPromos();
        renderGrafica();

    } catch (error) {
        console.error("Error al cargar rendimiento:", error);
        alert("No se pudo cargar el rendimiento del mesero.");
    }
}

function renderCards() {
    document.getElementById("meseroName").innerText = "Bienvenido, " + mesero.nombre;

    document.getElementById("kpiCalificacion").innerText = mesero.calificacion || 0;
    document.getElementById("kpiRank").innerText = "#" + (mesero.ranking || "--");
    document.getElementById("kpiPromosTotal").innerText = mesero.promos || 0;

    document.getElementById("kpiHorario").innerText =
        obtenerNombreTurno(mesero.turno);
}

function renderResumen() {
    const tbody = document.getElementById("kpiTable");
    tbody.innerHTML = "";

    resumenFilas = [
        {
            concepto: "Mesas atendidas",
            valor: mesero.mesas_atendidas || 0,
            detalle: "Mesas finalizadas durante el día actual."
        },
        {
            concepto: "Promedio por mesa",
            valor: formatearMinutos(mesero.promedio),
            detalle: "Tiempo promedio de atención por mesa."
        },
        {
            concepto: "Calificación",
            valor: mesero.calificacion || 0,
            detalle: "Evaluación general registrada por gerente o jefe de piso."
        },
        {
            concepto: "Promociones aplicadas",
            valor: mesero.promos || 0,
            detalle: "Total de promociones registradas durante el turno."
        },
        {
            concepto: "Turno asignado",
            valor: `${mesero.turno || "Sin turno"} (${obtenerNombreTurno(mesero.turno)})`,
            detalle: "Horario asignado para el turno actual."
        },
        {
            concepto: "Observación",
            valor: mesero.observacion || "Sin observaciones",
            detalle: "Observaciones registradas durante el día."
        }
    ];

    resumenFilas.forEach((f, index) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${f.concepto}</td>
            <td>${f.valor}</td>
            <td>
                <button class="table-btn" onclick="abrirDetalleResumen(${index})">
                    Ver detalles
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function renderPromos() {
    const tbody = document.getElementById("promoDetalleTable");
    tbody.innerHTML = "";

    if (!detallePromos.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="2">No hay promociones aplicadas hoy.</td>
            </tr>
        `;
        return;
    }

    detallePromos.forEach(p => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${p.nombre}</td>
            <td>${p.cantidad}</td>
        `;

        tbody.appendChild(tr);
    });
}

function renderGrafica() {
    const ctx = document.getElementById("kpiBarChart");

    if (!ctx) return;

    const labels = detallePromos.length
        ? detallePromos.map(p => p.nombre)
        : ["Sin promociones"];

    const valores = detallePromos.length
        ? detallePromos.map(p => p.cantidad)
        : [0];

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                data: valores
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function abrirDetalleResumen(index) {
    const f = resumenFilas[index];

    document.getElementById("detalleTitulo").innerText = "Detalle - " + f.concepto;

    document.getElementById("detalleContenido").innerHTML = `
        <div class="detalle-block full">
            <h4>${f.concepto}</h4>
            <p><strong>Valor:</strong> ${f.valor}</p>
            <p>${f.detalle}</p>
        </div>
    `;

    document.getElementById("modalDetalleKPI").classList.add("show");
}

function cerrarDetalleKPI() {
    document.getElementById("modalDetalleKPI").classList.remove("show");
}

document.getElementById("modalDetalleKPI").addEventListener("click", function (e) {
    if (e.target.id === "modalDetalleKPI") cerrarDetalleKPI();
});

function volverMenuMesero() {
    window.location.href = "/mesero";
}

function exportarPDF() {
    window.print();

    const msg = document.getElementById("msgPDF");
    msg.style.display = "block";

    setTimeout(() => {
        msg.style.display = "none";
    }, 2500);
}

document.addEventListener("DOMContentLoaded", cargarRendimientoMesero);