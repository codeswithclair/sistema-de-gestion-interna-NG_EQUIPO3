from flask import Blueprint, jsonify, request
from db import get_connection

auth_bp = Blueprint("auth_bp", __name__)

@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()

    nombre_usuario = data.get("nombre_usuario")
    contrasena = data.get("contrasena")

    if not nombre_usuario or not contrasena:
        return jsonify({
            "ok": False,
            "message": "Faltan credenciales"
        }), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT 
            u.no_empleado,
            u.nombre_usuario,
            u.contrasena,
            u.estado,
            r.nombre AS rol
        FROM Usuarios u
        JOIN Rol r ON u.id_rol = r.id_rol
        WHERE u.nombre_usuario = %s
    """
    cursor.execute(query, (nombre_usuario,))
    usuario = cursor.fetchone()

    cursor.close()
    conn.close()

    if not usuario:
        return jsonify({
            "ok": False,
            "message": "El usuario no existe"
        }), 404

    if usuario["contrasena"] != contrasena:
        return jsonify({
            "ok": False,
            "message": "Contraseña incorrecta"
        }), 401

    if usuario["estado"] != "ACTIVO":
        return jsonify({
            "ok": False,
            "message": "El usuario no está activo"
        }), 403

    return jsonify({
        "ok": True,
        "usuario": {
            "no_empleado": usuario["no_empleado"],
            "nombre_usuario": usuario["nombre_usuario"],
            "rol": usuario["rol"]
        }
    })