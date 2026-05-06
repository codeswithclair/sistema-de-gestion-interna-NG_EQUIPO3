from flask import Blueprint, jsonify, render_template, request
from db import get_connection

mesas_bp = Blueprint("mesas_bp", __name__)

@mesas_bp.route("/estado_mesas")
def vista_estado_mesas():
    return render_template("estado_mesas.html")


@mesas_bp.route("/api/mesas", methods=["GET"])
def obtener_mesas():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
    SELECT
        m.id_mesa,
        m.no_empleado,
        CONCAT(u.nombre, ' ', u.apellido) AS nombre_mesero,
        m.estado,
        m.nombre_cliente,
        m.no_personas,
        m.hora_inicio,
        m.razon_retraso,
        m.comentario_retraso,
        TIMESTAMPDIFF(SECOND, m.hora_inicio, NOW()) AS segundos_transcurridos
    FROM Mesa m
    LEFT JOIN Usuarios u ON m.no_empleado = u.no_empleado
    ORDER BY m.id_mesa
"""
    cursor.execute(query)
    mesas = cursor.fetchall()

    for m in mesas:
        if m["hora_inicio"]:
            m["hora_inicio"] = m["hora_inicio"].strftime("%Y-%m-%d %H:%M:%S")
        if m["segundos_transcurridos"] is None:
            m["segundos_transcurridos"] = 0

    cursor.close()
    conn.close()

    return jsonify(mesas)


@mesas_bp.route("/api/mesas/<int:id_mesa>", methods=["PUT"])
def actualizar_mesa(id_mesa):
    data = request.get_json()

    estado = data.get("estado")
    nombre_cliente = data.get("nombre_cliente")
    no_personas = data.get("no_personas")
    no_empleado = data.get("no_empleado")
    razon_retraso = data.get("razon_retraso")
    comentario_retraso = data.get("comentario_retraso")

    conn = get_connection()
    cursor = conn.cursor()

    if estado == "libre":
        query = """
            UPDATE Mesa
            SET estado=%s,
                nombre_cliente=NULL,
                no_personas=NULL,
                no_empleado=NULL,
                hora_inicio=NULL,
                razon_retraso=NULL,
                comentario_retraso=NULL
            WHERE id_mesa=%s
        """
        values = (estado, id_mesa)

    else:
        query = """
            UPDATE Mesa
            SET estado=%s,
                nombre_cliente=%s,
                no_personas=%s,
                no_empleado=%s,
                hora_inicio=IF(hora_inicio IS NULL, NOW(), hora_inicio),
                razon_retraso=%s,
                comentario_retraso=%s
            WHERE id_mesa=%s
        """
        values = (
            estado,
            nombre_cliente,
            no_personas,
            no_empleado,
            razon_retraso,
            comentario_retraso,
            id_mesa
        )

    cursor.execute(query, values)
    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"ok": True, "message": "Mesa actualizada correctamente"})


@mesas_bp.route("/api/mesas/<int:id_mesa>/retraso", methods=["PUT"])
def guardar_retraso(id_mesa):
    data = request.get_json()

    conn = get_connection()
    cursor = conn.cursor()

    query = """
        UPDATE Mesa
        SET razon_retraso=%s,
            comentario_retraso=%s
        WHERE id_mesa=%s
    """

    values = (
        data.get("razon_retraso"),
        data.get("comentario_retraso", ""),
        id_mesa
    )

    cursor.execute(query, values)
    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"ok": True, "message": "Razón del retraso guardada"})

@mesas_bp.route("/api/meseros-disponibles", methods=["GET"])
def obtener_meseros_disponibles():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT 
            u.no_empleado,
            CONCAT(u.nombre, ' ', u.apellido) AS nombre_completo
        FROM Usuarios u
        JOIN Rol r ON u.id_rol = r.id_rol
        WHERE r.nombre = 'MESERO'
          AND u.estado = 'ACTIVO'
          AND u.no_empleado NOT IN (
              SELECT no_empleado
              FROM Mesa
              WHERE estado = 'ocupada'
                AND no_empleado IS NOT NULL
          )
    """

    cursor.execute(query)
    meseros = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(meseros)