from flask import Blueprint, jsonify, render_template, request
from db import get_connection
from mysql.connector import IntegrityError

promociones_bp = Blueprint("promociones_bp", __name__)


@promociones_bp.route("/gestion_promociones")
def vista_gestion_promociones():
    return render_template("gestion_promociones.html")


@promociones_bp.route("/promociones_vigentes")
def vista_promociones_vigentes():
    return render_template("promociones_vigentes.html")


@promociones_bp.route("/api/promociones", methods=["GET"])
def obtener_promociones():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            id_promocion,
            no_empleado,
            nombre,
            descripcion,
            condiciones,
            vigencia_inicio,
            vigencia_fin,
            estado,
            ocasion,
            dias_vigentes
        FROM Promocion
        ORDER BY id_promocion DESC
    """)

    promociones = cursor.fetchall()

    for p in promociones:
        if p["vigencia_inicio"]:
            p["vigencia_inicio"] = p["vigencia_inicio"].strftime("%Y-%m-%d")
        if p["vigencia_fin"]:
            p["vigencia_fin"] = p["vigencia_fin"].strftime("%Y-%m-%d")
        p["estado"] = bool(p["estado"])

    cursor.close()
    conn.close()

    return jsonify(promociones)


@promociones_bp.route("/api/promociones-vigentes", methods=["GET"])
def obtener_promociones_vigentes():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            id_promocion,
            nombre,
            descripcion,
            condiciones,
            vigencia_inicio,
            vigencia_fin,
            estado,
            ocasion,
            dias_vigentes
        FROM Promocion
        WHERE estado = 1
          AND CURDATE() BETWEEN vigencia_inicio AND vigencia_fin
        ORDER BY vigencia_fin ASC
    """)

    promociones = cursor.fetchall()

    for p in promociones:
        if p["vigencia_inicio"]:
            p["vigencia_inicio"] = p["vigencia_inicio"].strftime("%Y-%m-%d")
        if p["vigencia_fin"]:
            p["vigencia_fin"] = p["vigencia_fin"].strftime("%Y-%m-%d")
        p["estado"] = bool(p["estado"])

    cursor.close()
    conn.close()

    return jsonify(promociones)


@promociones_bp.route("/api/promociones", methods=["POST"])
def crear_promocion():
    data = request.get_json()

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO Promocion
        (no_empleado, nombre, descripcion, condiciones, vigencia_inicio, vigencia_fin, estado, ocasion, dias_vigentes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        data["no_empleado"],
        data["nombre"],
        data["descripcion"],
        data.get("condiciones", ""),
        data["vigencia_inicio"],
        data["vigencia_fin"],
        data["estado"],
        data.get("ocasion", ""),
        data["dias_vigentes"]
    ))

    conn.commit()
    nuevo_id = cursor.lastrowid

    cursor.close()
    conn.close()

    return jsonify({
        "ok": True,
        "message": "Promoción registrada correctamente",
        "id_promocion": nuevo_id
    }), 201


@promociones_bp.route("/api/promociones/<int:id_promocion>", methods=["PUT"])
def actualizar_promocion(id_promocion):
    data = request.get_json()

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE Promocion
        SET nombre=%s,
            descripcion=%s,
            condiciones=%s,
            vigencia_inicio=%s,
            vigencia_fin=%s,
            estado=%s,
            ocasion=%s,
            dias_vigentes=%s
        WHERE id_promocion=%s
    """, (
        data["nombre"],
        data["descripcion"],
        data.get("condiciones", ""),
        data["vigencia_inicio"],
        data["vigencia_fin"],
        data["estado"],
        data.get("ocasion", ""),
        data["dias_vigentes"],
        id_promocion
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({
        "ok": True,
        "message": "Promoción actualizada correctamente"
    })


@promociones_bp.route("/api/promociones/<int:id_promocion>/estado", methods=["PUT"])
def cambiar_estado_promocion(id_promocion):
    data = request.get_json()

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE Promocion
        SET estado = %s
        WHERE id_promocion = %s
    """, (
        data["estado"],
        id_promocion
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({
        "ok": True,
        "message": "Estado actualizado correctamente"
    })


@promociones_bp.route("/api/promociones/<int:id_promocion>", methods=["DELETE"])
def eliminar_promocion(id_promocion):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            DELETE FROM Promocion
            WHERE id_promocion = %s
        """, (id_promocion,))
        conn.commit()

        message = "Promoción eliminada correctamente"

    except IntegrityError:
        cursor.execute("""
            UPDATE Promocion
            SET estado = 0
            WHERE id_promocion = %s
        """, (id_promocion,))
        conn.commit()

        message = "La promoción ya tenía registros aplicados, por eso se desactivó en lugar de eliminarse"

    cursor.close()
    conn.close()

    return jsonify({
        "ok": True,
        "message": message
    })