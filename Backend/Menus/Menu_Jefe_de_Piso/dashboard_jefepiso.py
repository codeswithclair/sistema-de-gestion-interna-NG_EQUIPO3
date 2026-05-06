from flask import Blueprint, jsonify, render_template
from db import get_connection

dashboard_jefepiso_bp = Blueprint("dashboard_jefepiso_bp", __name__)

@dashboard_jefepiso_bp.route("/jefepiso")
def jefepiso_dashboard():
    return render_template("jefepiso_dashboard.html")


@dashboard_jefepiso_bp.route("/api/dashboard/jefepiso")
def api_dashboard_jefepiso():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT COUNT(*) AS total FROM Mesa WHERE estado='ocupada'")
    mesas_servicio = cursor.fetchone()["total"]

    cursor.execute("""
        SELECT COUNT(*) AS total
        FROM Mesa
        WHERE razon_retraso IS NOT NULL
          AND razon_retraso <> ''
    """)
    retrasos_hoy = cursor.fetchone()["total"]

    cursor.execute("""
        SELECT COUNT(*) AS total
        FROM Usuarios u
        JOIN Rol r ON u.id_rol = r.id_rol
        WHERE r.id_rol = 'M'
          AND u.estado='ACTIVO'
    """)
    meseros_turno = cursor.fetchone()["total"]

    cursor.execute("""
        SELECT COUNT(*) AS total
        FROM Mesa
        WHERE no_empleado IS NOT NULL
          AND estado = 'ocupada'
    """)
    mesas_asignadas = cursor.fetchone()["total"]

    cursor.execute("""
        SELECT CONCAT(u.nombre, ' ', u.apellido) AS nombre, g.calificacion
        FROM Gestion_de_meseros g
        JOIN Usuarios u ON g.no_empleado = u.no_empleado
        WHERE g.id_mesa IS NULL
          AND g.fecha_registro = CURDATE()
        ORDER BY g.calificacion DESC
        LIMIT 1
    """)
    destacado = cursor.fetchone()

    cursor.execute("""
        SELECT id_mesa, razon_retraso
        FROM Mesa
        WHERE razon_retraso IS NOT NULL
          AND razon_retraso <> ''
        ORDER BY id_mesa
        LIMIT 3
    """)
    retrasos = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify({
        "mesas_servicio": mesas_servicio,
        "retrasos_hoy": retrasos_hoy,
        "meseros_turno": meseros_turno,
        "mesas_asignadas": mesas_asignadas,
        "destacado": destacado,
        "retrasos": retrasos
    })