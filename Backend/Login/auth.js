async function login() {
    const user = document.getElementById("user").value.trim();
    const pass = document.getElementById("pass").value.trim();

    if (user.length < 3) {
        alert("El usuario debe tener al menos 3 caracteres.");
        return;
    }

    if (pass.length < 3) {
        alert("La contraseña debe tener al menos 3 caracteres.");
        return;
    }

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nombre_usuario: user,
                contrasena: pass
            })
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
            alert(data.message || "Credenciales incorrectas");
            return;
        }

        localStorage.setItem("ROL", data.usuario.rol);
        localStorage.setItem("USER", data.usuario.nombre_usuario);
        localStorage.setItem("NO_EMPLEADO", data.usuario.no_empleado);

        if (data.usuario.rol === "GERENTE") {
            window.location.href = "/gerente";
        } else if (data.usuario.rol === "HOSTESS") {
            window.location.href = "/hostess";
        } else if (data.usuario.rol === "MESERO") {
            window.location.href = "/mesero";
        } else if (data.usuario.rol === "JEFEPISO") {
            window.location.href = "/jefepiso";
        } else {
            alert("Rol no reconocido.");
        }

    } catch (error) {
        console.error("Error en login:", error);
        alert("Error al intentar iniciar sesión.");
    }
}