from flask import Blueprint, jsonify, render_template, request
from db import get_connection

lista_espera_bp = Blueprint("lista_espera_bp", __name__)

@lista_espera_bp.route("/lista_espera")
def vista_lista_espera():
    return render_template("lista_espera.html")


@lista_espera_bp.route("/api/lista-espera", methods=["GET"])
def obtener_lista_espera():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT 
            id_lista,
            no_empleado,
            nombre,
            no_personas,
            tipo_festejo,
            hora_registro,
            estado,
            TIMESTAMPDIFF(SECOND, hora_registro, NOW()) AS segundos_esperando
        FROM Lista_Espera
        WHERE estado = 'EN_ESPERA'
        ORDER BY hora_registro ASC
    """

    cursor.execute(query)
    lista = cursor.fetchall()

    for item in lista:
        if item["hora_registro"]:
            item["hora_registro"] = item["hora_registro"].strftime("%Y-%m-%d %H:%M:%S")

    cursor.close()
    conn.close()

    return jsonify(lista)


@lista_espera_bp.route("/api/lista-espera", methods=["POST"])
def agregar_cliente():
    data = request.get_json()

    conn = get_connection()
    cursor = conn.cursor()

    query = """
        INSERT INTO Lista_Espera
        (no_empleado, nombre, no_personas, tipo_festejo)
        VALUES (%s, %s, %s, %s)
    """

    values = (
        data["no_empleado"],
        data["nombre"],
        data["no_personas"],
        data.get("tipo_festejo", "")
    )

    cursor.execute(query, values)
    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"ok": True, "message": "Cliente agregado a la lista"}), 201

@lista_espera_bp.route("/api/lista-espera/<int:id_lista>", methods=["PUT"])
def actualizar_cliente(id_lista):
    data = request.get_json()

    conn = get_connection()
    cursor = conn.cursor()

    query = """
        UPDATE Lista_Espera
        SET nombre = %s,
            no_personas = %s,
            tipo_festejo = %s
        WHERE id_lista = %s
    """

    values = (
        data["nombre"],
        data["no_personas"],
        data.get("tipo_festejo", ""),
        id_lista
    )

    cursor.execute(query, values)
    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"ok": True, "message": "Cliente actualizado correctamente"})


@lista_espera_bp.route("/api/lista-espera/<int:id_lista>", methods=["DELETE"])
def eliminar_cliente(id_lista):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM Lista_Espera WHERE id_lista = %s", (id_lista,))
    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"ok": True, "message": "Cliente eliminado de la lista"})


@lista_espera_bp.route("/api/lista-espera/<int:id_lista>/asignar", methods=["PUT"])
def asignar_cliente(id_lista):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE Lista_Espera
        SET estado = 'ASIGNADO'
        WHERE id_lista = %s
    """, (id_lista,))

    conn.commit()

    cursor.close()
    conn.close()

    return jsonify({"ok": True, "message": "Cliente listo para asignar mesa"})

