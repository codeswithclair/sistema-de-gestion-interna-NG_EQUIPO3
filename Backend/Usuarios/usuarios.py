from flask import Blueprint, jsonify, render_template, request
from db import get_connection

usuarios_bp = Blueprint("usuarios_bp", __name__)


@usuarios_bp.route("/usuarios")
def vista_usuarios():
    return render_template("usuarios.html")


@usuarios_bp.route("/api/usuarios", methods=["GET"])
def obtener_usuarios():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT 
            u.no_empleado,
            u.nombre_usuario,
            u.nombre,
            u.apellido,
            u.correo,
            u.estado,
            u.ultimo_acceso,
            r.id_rol,
            r.nombre AS rol
        FROM Usuarios u
        JOIN Rol r ON u.id_rol = r.id_rol
        ORDER BY u.no_empleado
    """)

    usuarios = cursor.fetchall()

    for u in usuarios:
        if u["ultimo_acceso"]:
            u["ultimo_acceso"] = u["ultimo_acceso"].strftime("%Y-%m-%d %H:%M:%S")

    cursor.close()
    conn.close()

    return jsonify(usuarios)


@usuarios_bp.route("/api/usuarios", methods=["POST"])
def crear_usuario():
    data = request.get_json()

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO Usuarios
        (no_empleado, id_rol, nombre, apellido, contrasena, correo, nombre_usuario, estado, ultimo_acceso)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
    """, (
        data["no_empleado"],
        data["id_rol"],
        data["nombre"],
        data["apellido"],
        data["contrasena"],
        data.get("correo", ""),
        data["nombre_usuario"],
        data["estado"]
    ))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"ok": True, "message": "Usuario registrado correctamente"}), 201


@usuarios_bp.route("/api/usuarios/<int:no_empleado>", methods=["PUT"])
def actualizar_usuario(no_empleado):
    data = request.get_json()

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    # Validar rol actual del usuario que se quiere modificar
    cursor.execute("""
        SELECT r.nombre AS rol
        FROM Usuarios u
        JOIN Rol r ON u.id_rol = r.id_rol
        WHERE u.no_empleado = %s
    """, (no_empleado,))
    usuario_actual = cursor.fetchone()

    if not usuario_actual:
        cursor.close()
        conn.close()
        return jsonify({"ok": False, "message": "Usuario no encontrado"}), 404

    rol_sesion = data.get("rol_sesion")

    # Jefe de piso no puede modificar gerente
    if rol_sesion == "JEFEPISO" and usuario_actual["rol"] == "GERENTE":
        cursor.close()
        conn.close()
        return jsonify({"ok": False, "message": "El jefe de piso no puede modificar cuentas de gerente"}), 403

    # Jefe de piso solo puede modificar HOSTESS o MESERO
    if rol_sesion == "JEFEPISO" and usuario_actual["rol"] not in ["HOSTESS", "MESERO"]:
        cursor.close()
        conn.close()
        return jsonify({"ok": False, "message": "Solo puede modificar personal operativo"}), 403

    if data.get("contrasena"):
        query = """
            UPDATE Usuarios
            SET id_rol=%s,
                nombre=%s,
                apellido=%s,
                correo=%s,
                nombre_usuario=%s,
                estado=%s,
                contrasena=%s
            WHERE no_empleado=%s
        """
        values = (
            data["id_rol"],
            data["nombre"],
            data["apellido"],
            data.get("correo", ""),
            data["nombre_usuario"],
            data["estado"],
            data["contrasena"],
            no_empleado
        )
    else:
        query = """
            UPDATE Usuarios
            SET id_rol=%s,
                nombre=%s,
                apellido=%s,
                correo=%s,
                nombre_usuario=%s,
                estado=%s
            WHERE no_empleado=%s
        """
        values = (
            data["id_rol"],
            data["nombre"],
            data["apellido"],
            data.get("correo", ""),
            data["nombre_usuario"],
            data["estado"],
            no_empleado
        )

    cursor.execute(query, values)
    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"ok": True, "message": "Usuario actualizado correctamente"})


@usuarios_bp.route("/api/usuarios/<int:no_empleado>/estado", methods=["PUT"])
def cambiar_estado_usuario(no_empleado):
    data = request.get_json()
    nuevo_estado = data["estado"]
    rol_sesion = data.get("rol_sesion")

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT r.nombre AS rol
        FROM Usuarios u
        JOIN Rol r ON u.id_rol = r.id_rol
        WHERE u.no_empleado = %s
    """, (no_empleado,))
    usuario = cursor.fetchone()

    if not usuario:
        cursor.close()
        conn.close()
        return jsonify({"ok": False, "message": "Usuario no encontrado"}), 404

    if rol_sesion == "JEFEPISO" and usuario["rol"] == "GERENTE":
        cursor.close()
        conn.close()
        return jsonify({"ok": False, "message": "No puedes modificar a un gerente"}), 403

    cursor.execute("""
        UPDATE Usuarios
        SET estado = %s
        WHERE no_empleado = %s
    """, (nuevo_estado, no_empleado))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"ok": True, "message": "Estado actualizado correctamente"})


@usuarios_bp.route("/api/usuarios/<int:no_empleado>", methods=["DELETE"])
def eliminar_usuario(no_empleado):
    data = request.get_json(silent=True) or {}
    rol_sesion = data.get("rol_sesion")

    if rol_sesion != "GERENTE":
        return jsonify({"ok": False, "message": "Solo gerente puede eliminar usuarios"}), 403

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        DELETE FROM Usuarios
        WHERE no_empleado = %s
    """, (no_empleado,))

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"ok": True, "message": "Usuario eliminado correctamente"})


@usuarios_bp.route("/api/usuarios/bulk-estado", methods=["PUT"])
def cambiar_estado_masivo():
    data = request.get_json()

    ids = data["ids"]
    estado = data["estado"]
    rol_sesion = data.get("rol_sesion")

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    if rol_sesion == "JEFEPISO":
        cursor.execute("""
            SELECT u.no_empleado, r.nombre AS rol
            FROM Usuarios u
            JOIN Rol r ON u.id_rol = r.id_rol
            WHERE u.no_empleado IN ({})
        """.format(",".join(["%s"] * len(ids))), ids)

        encontrados = cursor.fetchall()

        for u in encontrados:
            if u["rol"] == "GERENTE":
                cursor.close()
                conn.close()
                return jsonify({"ok": False, "message": "No puedes modificar gerentes"}), 403

    cursor.execute("""
        UPDATE Usuarios
        SET estado = %s
        WHERE no_empleado IN ({})
    """.format(",".join(["%s"] * len(ids))), [estado] + ids)

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"ok": True, "message": "Usuarios actualizados correctamente"})


@usuarios_bp.route("/api/usuarios/bulk-delete", methods=["DELETE"])
def eliminar_masivo():
    data = request.get_json()
    ids = data["ids"]
    rol_sesion = data.get("rol_sesion")

    if rol_sesion != "GERENTE":
        return jsonify({"ok": False, "message": "Solo gerente puede eliminar usuarios"}), 403

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        DELETE FROM Usuarios
        WHERE no_empleado IN ({})
    """.format(",".join(["%s"] * len(ids))), ids)

    conn.commit()
    cursor.close()
    conn.close()

    return jsonify({"ok": True, "message": "Usuarios eliminados correctamente"})