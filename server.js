const express = require("express");
const path = require("path");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs").promises;
const sql = require("mssql");
const session = require("express-session");
require("dotenv").config();

const app = express();
const PORT = 3000;

// Configuración SQL Server
const dbConfig = {
  user: "sa",
  password: "12345",
  server: "localhost",
  database: "MuniConversionBD",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// Configuración de sesiones
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 24 horas
  })
);

// Carpeta de archivos subidos
const upload = multer({ dest: "uploads/" });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Ruta principal -> abre login.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Ruta protegida para la página de transcripción
app.get("/transcribe", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Ruta para obtener info del usuario
app.get("/api/user", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "No autorizado" });
  }
  res.json({ nombre: req.session.user.nombre });
});

// Ruta para transcripción
app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No se subió ningún archivo" });
  }

  if (!req.session.user) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const inputPath = path.join(__dirname, req.file.path);
  const filename = req.body.filename || req.file.originalname;

  try {
    const { stdout, stderr } = await new Promise((resolve, reject) => {
      exec(`py transcribir.py "${inputPath}"`, (error, stdout, stderr) => {
        if (error) reject({ error, stderr });
        else resolve({ stdout, stderr });
      });
    });

    const transcript = stdout.trim();
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input("nombre_archivo", sql.NVarChar(255), filename)
      .input("fecha_subida", sql.DateTime, new Date())
      .input("texto_transcrito", sql.NText, transcript)
      .input("nombre_usuario", sql.NVarChar(150), req.session.user.nombre)
      .query(
        "INSERT INTO Historial_transcripciones (nombre_archivo, fecha_subida, texto_transcrito, nombre_usuario) OUTPUT INSERTED.id_transcripcion VALUES (@nombre_archivo, @fecha_subida, @texto_transcrito, @nombre_usuario)"
      );

    res.json({ transcript, id_transcripcion: result.recordset[0].id_transcripcion });
  } catch (error) {
    console.error("Error en Python o base de datos:", error.stderr || error);
    res.status(500).json({ error: "Error al transcribir audio" });
  } finally {
    try {
      await fs.unlink(inputPath);
    } catch (err) {
      console.error("Error al borrar el archivo:", err);
    }
  }
});

// Ruta para obtener todas las transcripciones del usuario
app.get("/api/transcriptions", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "No autorizado" });
  }

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input("nombre_usuario", sql.NVarChar(150), req.session.user.nombre)
      .query("SELECT id_transcripcion, nombre_archivo, fecha_subida, texto_transcrito FROM Historial_transcripciones WHERE nombre_usuario = @nombre_usuario");
    res.json(result.recordset);
  } catch (error) {
    console.error("Error al obtener transcripciones:", error);
    res.status(500).json({ error: "Error al obtener transcripciones" });
  }
});

// Ruta para obtener una transcripción específica
app.get("/api/transcriptions/:id", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "No autorizado" });
  }

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input("id_transcripcion", sql.Int, req.params.id)
      .input("nombre_usuario", sql.NVarChar(150), req.session.user.nombre)
      .query("SELECT texto_transcrito FROM Historial_transcripciones WHERE id_transcripcion = @id_transcripcion AND nombre_usuario = @nombre_usuario");
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Transcripción no encontrada" });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error("Error al obtener transcripción:", error);
    res.status(500).json({ error: "Error al obtener transcripción" });
  }
});

// Ruta para editar una transcripción o nombre
app.put("/api/transcriptions/:id", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const { texto_transcrito, nombre_archivo } = req.body;
  let query = "UPDATE Historial_transcripciones SET ";
  const request = new sql.Request();
  request.input("id_transcripcion", sql.Int, req.params.id);
  request.input("nombre_usuario", sql.NVarChar(150), req.session.user.nombre);

  if (texto_transcrito) {
    query += "texto_transcrito = @texto_transcrito ";
    request.input("texto_transcrito", sql.NText, texto_transcrito);
  } else if (nombre_archivo) {
    query += "nombre_archivo = @nombre_archivo ";
    request.input("nombre_archivo", sql.NVarChar(255), nombre_archivo);
  } else {
    return res.status(400).json({ error: "No se proporcionó dato para actualizar" });
  }

  query += "WHERE id_transcripcion = @id_transcripcion AND nombre_usuario = @nombre_usuario";

  try {
    const pool = await sql.connect(dbConfig);
    await request.query(query);
    res.json({ message: "Actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar:", error);
    res.status(500).json({ error: "Error al actualizar" });
  }
});

// Ruta para borrar una transcripción
app.delete("/api/transcriptions/:id", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "No autorizado" });
  }

  try {
    const pool = await sql.connect(dbConfig);
    await pool
      .request()
      .input("id_transcripcion", sql.Int, req.params.id)
      .input("nombre_usuario", sql.NVarChar(150), req.session.user.nombre)
      .query("DELETE FROM Historial_transcripciones WHERE id_transcripcion = @id_transcripcion AND nombre_usuario = @nombre_usuario");
    res.json({ message: "Transcripción borrada" });
  } catch (error) {
    console.error("Error al borrar transcripción:", error);
    res.status(500).json({ error: "Error al borrar transcripción" });
  }
});

// Ruta para registrar usuario
app.post("/api/register", async (req, res) => {
  const { nombre, email, password } = req.body;
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    const pool = await sql.connect(dbConfig);
    await pool
      .request()
      .input("Nombre", sql.NVarChar(150), nombre)
      .input("Email", sql.NVarChar(150), email)
      .input("PasswordHash", sql.NVarChar(255), password)
      .query(
        "INSERT INTO usuariosMuni (Nombre, Email, PasswordHash) VALUES (@Nombre, @Email, @PasswordHash)"
      );

    res.json({ message: "👍 Usuario registrado correctamente" });
  } catch (err) {
    console.error("Error al registrar:", err);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

// Ruta para iniciar sesión
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input("Email", sql.NVarChar(150), email)
      .query("SELECT Nombre, PasswordHash FROM usuariosMuni WHERE Email = @Email");

    if (result.recordset.length === 0) {
      return res.json({ success: false, message: "Usuario no encontrado" });
    }

    const user = result.recordset[0];

    if (password !== user.PasswordHash) {
      return res.json({ success: false, message: "Contraseña incorrecta" });
    }

    req.session.user = { nombre: user.Nombre, email };

    res.json({ success: true, message: `Bienvenido de nuevo, ${user.Nombre}`, redirect: "/transcribe" });
  } catch (err) {
    console.error("Error al iniciar sesión:", err);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

// Ruta para cerrar sesión
app.post("/api/logout", (req, res) => {
  if (req.session.user) {
    const nombre = req.session.user.nombre;
    req.session.destroy((err) => {
      if (err) {
        console.error("Error al cerrar sesión:", err);
        return res.status(500).json({ error: "Error al cerrar sesión" });
      }
      res.json({ message: `Acabas de cerrar sesión, ${nombre}` });
    });
  } else {
    res.json({ message: "No hay sesión activa" });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en 👉 http://localhost:${PORT}`);
});