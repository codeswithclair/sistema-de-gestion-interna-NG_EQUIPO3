from flask import Blueprint, jsonify, render_template, request
from db import get_connection

reservaciones_bp = Blueprint("reservaciones_bp", __name__)

@reservaciones_bp.route("/reservaciones")
def vista_reservaciones():
    return render_template("reservaciones.html")

@reservaciones_bp.route("/api/reservaciones", methods=["GET"])
def obtener_reservaciones():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT
            r.id_reservacion,
            r.no_empleado,
            r.nombre_cliente,
            r.apellido_cliente,
            r.telefono,
            r.fecha,
            r.hora,
            r.no_personas,
            r.estado,
            r.comentarios
        FROM Reservacion r
        ORDER BY r.fecha ASC, r.hora ASC
    """

    cursor.execute(query)
    reservaciones = cursor.fetchall()

    for r in reservaciones:
        if r["fecha"]:
            r["fecha"] = r["fecha"].strftime("%Y-%m-%d")

        if r["hora"]:
            total_seconds = int(r["hora"].total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            r["hora"] = f"{hours:02d}:{minutes:02d}:{seconds:02d}"

    cursor.close()
    conn.close()

    return jsonify(reservaciones)

@reservaciones_bp.route("/api/reservaciones", methods=["POST"])
def crear_reservacion():
    data = request.get_json()

    conn = get_connection()
    cursor = conn.cursor()

    query = """
        INSERT INTO Reservacion
        (no_empleado, nombre_cliente, apellido_cliente, telefono, fecha, hora, no_personas, estado, comentarios)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    values = (
        data["no_empleado"],
        data["nombre_cliente"],
        data.get("apellido_cliente", ""),
        data["telefono"],
        data["fecha"],
        data["hora"],
        data["no_personas"],
        data["estado"],
        data.get("comentarios", "")
    )

    cursor.execute(query, values)
    conn.commit()

    nuevo_id = cursor.lastrowid

    cursor.close()
    conn.close()

    return jsonify({
        "ok": True,
        "message": "Reservación creada correctamente",
        "id_reservacion": nuevo_id
    }), 201

@reservaciones_bp.route("/api/reservaciones/<int:id_reservacion>", methods=["PUT"])
def actualizar_reservacion(id_reservacion):
    data = request.get_json()

    conn = get_connection()
    cursor = conn.cursor()

    query = """
        UPDATE Reservacion
        SET nombre_cliente=%s,
            apellido_cliente=%s,
            telefono=%s,
            fecha=%s,
            hora=%s,
            no_personas=%s,
            estado=%s,
            comentarios=%s
        WHERE id_reservacion=%s
    """

    values = (
        data["nombre_cliente"],
        data.get("apellido_cliente", ""),
        data["telefono"],
        data["fecha"],
        data["hora"],
        data["no_personas"],
        data["estado"],
        data.get("comentarios", ""),
        id_reservacion
    )

    cursor.execute(query, values)
    conn.commit()

    if cursor.rowcount == 0:
        cursor.close()
        conn.close()
        return jsonify({"ok": False, "message": "Reservación no encontrada"}), 404

    cursor.close()
    conn.close()

    return jsonify({"ok": True, "message": "Reservación actualizada correctamente"})

@reservaciones_bp.route("/api/reservaciones/<int:id_reservacion>", methods=["DELETE"])
def eliminar_reservacion(id_reservacion):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM Reservacion WHERE id_reservacion = %s", (id_reservacion,))
    conn.commit()

    if cursor.rowcount == 0:
        cursor.close()
        conn.close()
        return jsonify({"ok": False, "message": "Reservación no encontrada"}), 404

    cursor.close()
    conn.close()

    return jsonify({"ok": True, "message": "Reservación eliminada correctamente"})