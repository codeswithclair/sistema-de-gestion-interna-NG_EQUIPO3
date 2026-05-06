from flask import Blueprint, jsonify, render_template, request
from db import get_connection

meseros_bp = Blueprint("meseros_bp", __name__)


@meseros_bp.route("/personal")
def vista_gestion_meseros():
    return render_template("personal.html")


@meseros_bp.route("/rendimiento_mesero")
def vista_rendimiento_mesero():
    return render_template("rendimiento_mesero.html")


def asegurar_gestion_general(cursor, conn, no_empleado):
    cursor.execute("""
        SELECT id_gestion
        FROM Gestion_de_meseros
        WHERE no_empleado = %s
          AND id_mesa IS NULL
          AND fecha_registro = CURDATE()
        ORDER BY id_gestion DESC
        LIMIT 1
    """, (no_empleado,))

    gestion = cursor.fetchone()

    if gestion:
        return gestion["id_gestion"]

    cursor.execute("""
        INSERT INTO Gestion_de_meseros
        (no_empleado, id_mesa, promedio, ranking, turno, observacion, calificacion, fecha_registro)
        VALUES (%s, NULL, 0, 0, NULL, '', 0, CURDATE())
    """, (no_empleado,))

    conn.commit()
    return cursor.lastrowid


def calcular_rankings(meseros):
    ordenados = sorted(
        meseros,
        key=lambda x: (
            float(x.get("calificacion") or 0),
            int(x.get("promos") or 0),
            int(x.get("mesas_atendidas") or 0),
            -float(x.get("promedio") or 999999)
        ),
        reverse=True
    )

    for index, mesero_rank in enumerate(ordenados, start=1):
        for m in meseros:
            if m["no_empleado"] == mesero_rank["no_empleado"]:
                m["ranking"] = index
                break

    return meseros


@meseros_bp.route("/api/meseros", methods=["GET"])
def obtener_meseros():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            u.no_empleado,
            CONCAT(u.nombre, ' ', u.apellido) AS nombre,

            COALESCE((
                SELECT g.turno
                FROM Gestion_de_meseros g
                WHERE g.no_empleado = u.no_empleado
                  AND g.id_mesa IS NULL
                  AND g.fecha_registro = CURDATE()
                ORDER BY g.id_gestion DESC
                LIMIT 1
            ), 'Sin turno') AS turno,

            COALESCE((
                SELECT g.observacion
                FROM Gestion_de_meseros g
                WHERE g.no_empleado = u.no_empleado
                  AND g.id_mesa IS NULL
                  AND g.fecha_registro = CURDATE()
                ORDER BY g.id_gestion DESC
                LIMIT 1
            ), '') AS observacion,

            COALESCE((
                SELECT g.calificacion
                FROM Gestion_de_meseros g
                WHERE g.no_empleado = u.no_empleado
                  AND g.id_mesa IS NULL
                  AND g.fecha_registro = CURDATE()
                ORDER BY g.id_gestion DESC
                LIMIT 1
            ), 0) AS calificacion,

            COALESCE((
                SELECT COUNT(*)
                FROM Gestion_de_meseros g
                WHERE g.no_empleado = u.no_empleado
                  AND g.id_mesa IS NOT NULL
                  AND g.fecha_registro = CURDATE()
            ), 0) AS mesas_atendidas,

            COALESCE((
                SELECT AVG(g.promedio)
                FROM Gestion_de_meseros g
                WHERE g.no_empleado = u.no_empleado
                  AND g.id_mesa IS NOT NULL
                  AND g.fecha_registro = CURDATE()
            ), 0) AS promedio,

            COALESCE((
                SELECT SUM(pg.cantidad)
                FROM Gestion_de_meseros g
                JOIN Promocion_has_Gestion_de_meseros pg
                    ON g.id_gestion = pg.id_gestion
                WHERE g.no_empleado = u.no_empleado
                  AND g.fecha_registro = CURDATE()
                  AND pg.fecha_aplicacion = CURDATE()
            ), 0) AS promos,

            COALESCE((
                SELECT COUNT(*)
                FROM Mesa m
                WHERE m.no_empleado = u.no_empleado
            ), 0) AS mesas_asignadas

        FROM Usuarios u
        JOIN Rol r ON u.id_rol = r.id_rol
        WHERE r.id_rol = 'M'
        ORDER BY u.no_empleado
    """)

    meseros = cursor.fetchall()
    meseros = calcular_rankings(meseros)

    for m in meseros:
        cursor.execute("""
            SELECT id_mesa
            FROM Mesa
            WHERE no_empleado = %s
            ORDER BY id_mesa
        """, (m["no_empleado"],))

        mesas = cursor.fetchall()
        m["mesas"] = [x["id_mesa"] for x in mesas]

    cursor.close()
    conn.close()

    return jsonify(meseros)


@meseros_bp.route("/api/meseros/<int:no_empleado>", methods=["GET"])
def obtener_mesero_individual(no_empleado):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT
            u.no_empleado,
            CONCAT(u.nombre, ' ', u.apellido) AS nombre,

            COALESCE((
                SELECT g.turno
                FROM Gestion_de_meseros g
                WHERE g.no_empleado = u.no_empleado
                  AND g.id_mesa IS NULL
                  AND g.fecha_registro = CURDATE()
                ORDER BY g.id_gestion DESC
                LIMIT 1
            ), 'Sin turno') AS turno,

            COALESCE((
                SELECT g.observacion
                FROM Gestion_de_meseros g
                WHERE g.no_empleado = u.no_empleado
                  AND g.id_mesa IS NULL
                  AND g.fecha_registro = CURDATE()
                ORDER BY g.id_gestion DESC
                LIMIT 1
            ), '') AS observacion,

            COALESCE((
                SELECT g.calificacion
                FROM Gestion_de_meseros g
                WHERE g.no_empleado = u.no_empleado
                  AND g.id_mesa IS NULL
                  AND g.fecha_registro = CURDATE()
                ORDER BY g.id_gestion DESC
                LIMIT 1
            ), 0) AS calificacion,

            COALESCE((
                SELECT COUNT(*)
                FROM Gestion_de_meseros g
                WHERE g.no_empleado = u.no_empleado
                  AND g.id_mesa IS NOT NULL
                  AND g.fecha_registro = CURDATE()
            ), 0) AS mesas_atendidas,

            COALESCE((
                SELECT AVG(g.promedio)
                FROM Gestion_de_meseros g
                WHERE g.no_empleado = u.no_empleado
                  AND g.id_mesa IS NOT NULL
                  AND g.fecha_registro = CURDATE()
            ), 0) AS promedio,

            COALESCE((
                SELECT SUM(pg.cantidad)
                FROM Gestion_de_meseros g
                JOIN Promocion_has_Gestion_de_meseros pg
                    ON g.id_gestion = pg.id_gestion
                WHERE g.no_empleado = u.no_empleado
                  AND g.fecha_registro = CURDATE()
                  AND pg.fecha_aplicacion = CURDATE()
            ), 0) AS promos,

            COALESCE((
                SELECT COUNT(*)
                FROM Mesa m
                WHERE m.no_empleado = u.no_empleado
            ), 0) AS mesas_asignadas

        FROM Usuarios u
        JOIN Rol r ON u.id_rol = r.id_rol
        WHERE u.no_empleado = %s
          AND r.id_rol = 'M'
    """, (no_empleado,))

    mesero = cursor.fetchone()

    if not mesero:
        cursor.close()
        conn.close()
        return jsonify({"ok": False, "message": "Mesero no encontrado"}), 404

    cursor.execute("""
        SELECT
            u.no_empleado,

            COALESCE((
                SELECT g.calificacion
                FROM Gestion_de_meseros g
                WHERE g.no_empleado = u.no_empleado
                  AND g.id_mesa IS NULL
                  AND g.fecha_registro = CURDATE()
                ORDER BY g.id_gestion DESC
                LIMIT 1
            ), 0) AS calificacion,

            COALESCE((
                SELECT SUM(pg.cantidad)
                FROM Gestion_de_meseros g
                JOIN Promocion_has_Gestion_de_meseros pg
                    ON g.id_gestion = pg.id_gestion
                WHERE g.no_empleado = u.no_empleado
                  AND g.fecha_registro = CURDATE()
                  AND pg.fecha_aplicacion = CURDATE()
            ), 0) AS promos,

            COALESCE((
                SELECT COUNT(*)
                FROM Gestion_de_meseros g
                WHERE g.no_empleado = u.no_empleado
                  AND g.id_mesa IS NOT NULL
                  AND g.fecha_registro = CURDATE()
            ), 0) AS mesas_atendidas,

            COALESCE((
                SELECT AVG(g.promedio)
                FROM Gestion_de_meseros g
                WHERE g.no_empleado = u.no_empleado
                  AND g.id_mesa IS NOT NULL
                  AND g.fecha_registro = CURDATE()
            ), 0) AS promedio

        FROM Usuarios u
        JOIN Rol r ON u.id_rol = r.id_rol
        WHERE r.id_rol = 'M'
    """)

    todos = cursor.fetchall()
    todos = calcular_rankings(todos)

    mesero["ranking"] = "--"

    for m in todos:
        if m["no_empleado"] == no_empleado:
            mesero["ranking"] = m["ranking"]
            break

    cursor.execute("""
        SELECT id_mesa
        FROM Mesa
        WHERE no_empleado = %s
        ORDER BY id_mesa
    """, (no_empleado,))

    mesas = cursor.fetchall()
    mesero["mesas"] = [x["id_mesa"] for x in mesas]

    cursor.close()
    conn.close()

    return jsonify(mesero)


@meseros_bp.route("/api/meseros/<int:no_empleado>/detalle-promos", methods=["GET"])
def detalle_promos_mesero(no_empleado):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT 
            p.nombre,
            SUM(pg.cantidad) AS cantidad
        FROM Gestion_de_meseros g
        JOIN Promocion_has_Gestion_de_meseros pg
            ON g.id_gestion = pg.id_gestion
        JOIN Promocion p
            ON pg.id_promocion = p.id_promocion
        WHERE g.no_empleado = %s
          AND g.fecha_registro = CURDATE()
          AND pg.fecha_aplicacion = CURDATE()
        GROUP BY p.nombre
        ORDER BY cantidad DESC
    """, (no_empleado,))

    promos = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(promos)


@meseros_bp.route("/api/meseros/<int:no_empleado>/calificacion", methods=["PUT"])
def actualizar_calificacion(no_empleado):
    data = request.get_json()
    calificacion = float(data.get("calificacion", 0))

    if calificacion < 0:
        calificacion = 0

    if calificacion > 10:
        calificacion = 10

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    id_gestion = asegurar_gestion_general(cursor, conn, no_empleado)

    cursor.execute("""
        UPDATE Gestion_de_meseros
        SET calificacion = %s
        WHERE id_gestion = %s
    """, (calificacion, id_gestion))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"ok": True, "message": "Calificación actualizada"})


@meseros_bp.route("/api/meseros/<int:no_empleado>/turno", methods=["PUT"])
def actualizar_turno(no_empleado):
    data = request.get_json()
    turno = data.get("turno")

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    id_gestion = asegurar_gestion_general(cursor, conn, no_empleado)

    cursor.execute("""
        UPDATE Gestion_de_meseros
        SET turno = %s
        WHERE id_gestion = %s
    """, (turno, id_gestion))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"ok": True, "message": "Turno actualizado"})


@meseros_bp.route("/api/meseros/<int:no_empleado>/observacion", methods=["PUT"])
def actualizar_observacion(no_empleado):
    data = request.get_json()
    nueva_observacion = data.get("observacion", "").strip()

    if not nueva_observacion:
        return jsonify({
            "ok": False,
            "message": "La observación no puede estar vacía"
        }), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    id_gestion = asegurar_gestion_general(cursor, conn, no_empleado)

    cursor.execute("""
        SELECT observacion
        FROM Gestion_de_meseros
        WHERE id_gestion = %s
    """, (id_gestion,))

    actual = cursor.fetchone()
    observacion_actual = actual["observacion"] if actual and actual["observacion"] else ""

    if observacion_actual:
        observacion_final = observacion_actual + "\n- " + nueva_observacion
    else:
        observacion_final = "- " + nueva_observacion

    cursor.execute("""
        UPDATE Gestion_de_meseros
        SET observacion = %s
        WHERE id_gestion = %s
    """, (observacion_final, id_gestion))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({
        "ok": True,
        "message": "Observación agregada correctamente"
    })


@meseros_bp.route("/api/meseros/<int:no_empleado>/observacion", methods=["DELETE"])
def eliminar_observacion(no_empleado):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    id_gestion = asegurar_gestion_general(cursor, conn, no_empleado)

    cursor.execute("""
        UPDATE Gestion_de_meseros
        SET observacion = ''
        WHERE id_gestion = %s
    """, (id_gestion,))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({
        "ok": True,
        "message": "Observación eliminada correctamente"
    })


@meseros_bp.route("/api/meseros/<int:no_empleado>/promo", methods=["POST"])
def registrar_promo_mesero(no_empleado):
    data = request.get_json()

    id_promocion = data.get("id_promocion")
    cantidad = int(data.get("cantidad", 1))

    if not id_promocion:
        return jsonify({"ok": False, "message": "Falta seleccionar promoción"}), 400

    if cantidad <= 0:
        return jsonify({"ok": False, "message": "La cantidad debe ser mayor a cero"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    id_gestion = asegurar_gestion_general(cursor, conn, no_empleado)

    cursor.execute("""
        SELECT cantidad
        FROM Promocion_has_Gestion_de_meseros
        WHERE id_promocion = %s
          AND id_gestion = %s
          AND fecha_aplicacion = CURDATE()
    """, (id_promocion, id_gestion))

    existe = cursor.fetchone()

    if existe:
        cursor.execute("""
            UPDATE Promocion_has_Gestion_de_meseros
            SET cantidad = cantidad + %s
            WHERE id_promocion = %s
              AND id_gestion = %s
              AND fecha_aplicacion = CURDATE()
        """, (cantidad, id_promocion, id_gestion))
    else:
        cursor.execute("""
            INSERT INTO Promocion_has_Gestion_de_meseros
            (id_promocion, id_gestion, cantidad, fecha_aplicacion)
            VALUES (%s, %s, %s, CURDATE())
        """, (id_promocion, id_gestion, cantidad))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({
        "ok": True,
        "message": "Promoción aplicada registrada correctamente"
    })


@meseros_bp.route("/api/promociones-select", methods=["GET"])
def promociones_para_select():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT id_promocion, nombre
        FROM Promocion
        WHERE estado = 1
          AND CURDATE() BETWEEN vigencia_inicio AND vigencia_fin
        ORDER BY nombre
    """)

    promociones = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(promociones)