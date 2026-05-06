from flask import Flask, render_template
from auth import auth_bp
from usuarios import usuarios_bp
from reservaciones import reservaciones_bp

app = Flask(__name__)
app.register_blueprint(auth_bp)
app.register_blueprint(usuarios_bp)
app.register_blueprint(reservaciones_bp)

@app.route("/")
def home():
    return render_template("login.html")

@app.route("/gerente")
def gerente_dashboard():
    return render_template("gerente_dashboard.html")

@app.route("/hostess")
def hostess_dashboard():
    return render_template("hostess_dashboard.html")

@app.route("/mesero")
def mesero_dashboard():
    return render_template("mesero_dashboard.html")

@app.route("/jefepiso")
def jefepiso_dashboard():
    return render_template("jefepiso_dashboard.html")

if __name__ == "__main__":
    app.run(debug=True)