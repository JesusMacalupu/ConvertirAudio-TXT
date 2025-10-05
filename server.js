const express = require("express");
const path = require("path");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs").promises;
const sql = require("mssql");
const session = require("express-session");
const PDFDocument = require('pdfkit');
require("dotenv").config();

const app = express();
const PORT = 3000;

// Configuración SQL Server
const dbConfig = {
  user: "sa",
  password: "12345",
  server: "localhost",
  database: "HRLatam_BD",
  options: {
    encrypt: false,
    trustServerCertificate: true,
    useUTC: false,
  },
};

// Configuración de sesiones
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
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
app.get("/main", (req, res) => {
  if (!req.session.user || req.session.isAdmin) {
    return res.redirect("/");
  }
  res.sendFile(path.join(__dirname, "public", "main.html"));
});

// Ruta protegida para el panel de administrador
app.get("/panelAdmin", (req, res) => {
  if (!req.session.user || !req.session.isAdmin) {
    return res.redirect("/");
  }
  res.sendFile(path.join(__dirname, "public", "panelAdmin.html"));
});

// Ruta para obtener info del usuario
app.get("/api/user", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "No autorizado" });
  }
  res.json({ nombre: req.session.user.nombre, isAdmin: req.session.isAdmin || false });
});

// Ruta para obtener el conteo de usuarios
app.get("/api/users/count", async (req, res) => {
  if (!req.session.user || !req.session.isAdmin) {
    return res.status(401).json({ error: "No autorizado" });
  }

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query("SELECT COUNT(*) AS count FROM UsuariosHRL");
    res.json({ count: result.recordset[0].count });
  } catch (error) {
    console.error("Error al obtener conteo de usuarios:", error.message, error.stack);
    res.status(500).json({ error: "Error al obtener conteo de usuarios" });
  }
});

// Ruta para obtener todos los usuarios
app.get("/api/users", async (req, res) => {
  if (!req.session.user || !req.session.isAdmin) {
    return res.status(401).json({ error: "No autorizado" });
  }

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .query("SELECT Id, Nombre, Email, PasswordHash, CONVERT(varchar, FechaRegistro, 120) AS FechaRegistro FROM UsuariosHRL");
    if (result.recordset.length === 0) {
      console.log("No se encontraron usuarios en UsuariosHRL");
      return res.json([]);
    }
    res.json(result.recordset);
  } catch (error) {
    console.error("Error al obtener usuarios:", error.message, error.stack);
    res.status(500).json({ error: "Error al obtener usuarios", details: error.message });
  }
});

// Ruta para obtener el conteo de transcripciones
app.get("/api/transcriptions/count", async (req, res) => {
  if (!req.session.user || !req.session.isAdmin) {
    return res.status(401).json({ error: "No autorizado" });
  }

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query("SELECT COUNT(*) AS count FROM Historial_transcripciones");
    res.json({ count: result.recordset[0].count });
  } catch (error) {
    console.error("Error al obtener conteo de transcripciones:", error.message, error.stack);
    res.status(500).json({ error: "Error al obtener conteo de transcripciones" });
  }
});

// Ruta para obtener la última transcripción
app.get("/api/transcriptions/latest", async (req, res) => {
  if (!req.session.user || !req.session.isAdmin) {
    return res.status(401).json({ error: "No autorizado" });
  }

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .query("SELECT TOP 1 nombre_archivo FROM Historial_transcripciones ORDER BY fecha_subida DESC");
    
    if (result.recordset.length === 0) {
      return res.json({ nombre_archivo: "Sin transcripciones" });
    }
    
    res.json({ nombre_archivo: result.recordset[0].nombre_archivo });
  } catch (error) {
    console.error("Error al obtener la última transcripción:", error.message, error.stack);
    res.status(500).json({ error: "Error al obtener la última transcripción" });
  }
});

// Ruta para obtener los 3 usuarios con más transcripciones
app.get("/api/transcriptions/top-users", async (req, res) => {
  if (!req.session.user || !req.session.isAdmin) {
    return res.status(401).json({ error: "No autorizado" });
  }

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .query(`
        SELECT TOP 3 nombre_usuario, COUNT(*) as transcription_count
        FROM Historial_transcripciones
        GROUP BY nombre_usuario
        ORDER BY transcription_count DESC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error("Error al obtener los top usuarios:", error.message, error.stack);
    res.status(500).json({ error: "Error al obtener los top usuarios" });
  }
});

// Ruta para obtener el conteo de transcripciones por día de la semana
app.get("/api/transcriptions/daily", async (req, res) => {
  if (!req.session.user || !req.session.isAdmin) {
    return res.status(401).json({ error: "No autorizado" });
  }

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .query(`
        SELECT 
          DATEPART(WEEKDAY, fecha_subida) AS day_of_week,
          COUNT(*) AS transcription_count
        FROM Historial_transcripciones
        GROUP BY DATEPART(WEEKDAY, fecha_subida)
        ORDER BY day_of_week
      `);

    const days = [
      { day: "Lunes", count: 0 },
      { day: "Martes", count: 0 },
      { day: "Miércoles", count: 0 },
      { day: "Jueves", count: 0 },
      { day: "Viernes", count: 0 },
      { day: "Sábado", count: 0 },
      { day: "Domingo", count: 0 }
    ];

    result.recordset.forEach(row => {
      const index = row.day_of_week === 1 ? 6 : row.day_of_week - 2;
      days[index].count = row.transcription_count;
    });

    res.json(days);
  } catch (error) {
    console.error("Error al obtener transcripciones por día:", error.message, error.stack);
    res.status(500).json({ error: "Error al obtener transcripciones por día" });
  }
});

// Ruta para obtener todas las transcripciones con filtros
app.get("/api/transcriptions/all", async (req, res) => {
  if (!req.session.user || !req.session.isAdmin) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const filter = req.query.filter || '';
  let query = `
    SELECT id_transcripcion, nombre_archivo, 
           CONVERT(varchar, fecha_subida, 120) AS fecha_subida, 
           texto_transcrito, nombre_usuario
    FROM Historial_transcripciones
  `;

  if (filter === 'recent') {
    query += ' ORDER BY fecha_subida DESC';
  } else if (filter === 'oldest') {
    query += ' ORDER BY fecha_subida ASC';
  } else if (filter === 'longest') {
    query += ' ORDER BY LEN(texto_transcrito) DESC';
  } else if (filter === 'mostTranscriptions') {
    query = `
      SELECT ht.id_transcripcion, ht.nombre_archivo, 
             CONVERT(varchar, ht.fecha_subida, 120) AS fecha_subida, 
             ht.texto_transcrito, ht.nombre_usuario
      FROM Historial_transcripciones ht
      JOIN (
        SELECT nombre_usuario, COUNT(*) as transcription_count
        FROM Historial_transcripciones
        GROUP BY nombre_usuario
      ) counts ON ht.nombre_usuario = counts.nombre_usuario
      ORDER BY counts.transcription_count DESC, ht.fecha_subida DESC
    `;
  } else {
    query += ' ORDER BY id_transcripcion ASC';
  }

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error al obtener transcripciones:", error.message, error.stack);
    res.status(500).json({ error: "Error al obtener transcripciones", details: error.message });
  }
});

// Función para actualizar la tabla Datos_TiempoReal
async function updateRealtimeData() {
  try {
    const pool = await sql.connect(dbConfig);

    // total_usuarios
    const totalUsersRes = await pool.request().query("SELECT COUNT(*) AS count FROM UsuariosHRL");
    const total_usuarios = totalUsersRes.recordset[0].count;

    // numero_transcripciones
    const totalTransRes = await pool.request().query("SELECT COUNT(*) AS count FROM Historial_transcripciones");
    const numero_transcripciones = totalTransRes.recordset[0].count;

    // usuario_MasTranscripciones (solo el primero con más transcripciones)
    const topUserRes = await pool.request().query(`
      SELECT TOP 1 nombre_usuario, COUNT(*) as count
      FROM Historial_transcripciones
      GROUP BY nombre_usuario
      ORDER BY count DESC
    `);
    let usuario_MasTranscripciones = 'Ninguno';
    if (topUserRes.recordset.length > 0) {
      usuario_MasTranscripciones = topUserRes.recordset[0].nombre_usuario;
    }

    // ultima_transcripcion (nombre del archivo de la última transcripción)
    const latestRes = await pool.request().query(`
      SELECT TOP 1 nombre_archivo
      FROM Historial_transcripciones
      ORDER BY fecha_subida DESC
    `);
    let ultima_transcripcion = 'Ninguna';
    if (latestRes.recordset.length > 0) {
      ultima_transcripcion = latestRes.recordset[0].nombre_archivo;
    }

    // dia_MasTranscripciones (día con más transcripciones en español con cantidad en paréntesis)
    const dailyRes = await pool.request().query(`
      SELECT 
        DATEPART(WEEKDAY, fecha_subida) AS day_of_week,
        COUNT(*) AS count
      FROM Historial_transcripciones
      GROUP BY DATEPART(WEEKDAY, fecha_subida)
      ORDER BY day_of_week
    `);

    // Mapa explícito de días en español
    const spanishDays = {
      1: 'Domingo',
      2: 'Lunes',
      3: 'Martes',
      4: 'Miércoles',
      5: 'Jueves',
      6: 'Viernes',
      7: 'Sábado'
    };

    let dia_MasTranscripciones = 'Ninguno';
    let maxCount = 0;
    dailyRes.recordset.forEach(row => {
      if (row.count > maxCount) {
        maxCount = row.count;
        const dayIndex = row.day_of_week;
        const dayName = spanishDays[dayIndex] || 'Desconocido';
        dia_MasTranscripciones = `${dayName} (${row.count})`;
      }
    });

    // Actualizar o insertar en Datos_TiempoReal (asumiendo id_tiempoReal = 1)
    await pool.request()
      .input('total_usuarios', sql.Int, total_usuarios)
      .input('numero_transcripciones', sql.Int, numero_transcripciones)
      .input('usuario_MasTranscripciones', sql.VarChar(255), usuario_MasTranscripciones)
      .input('ultima_transcripcion', sql.Text, ultima_transcripcion)
      .input('dia_MasTranscripciones', sql.Text, dia_MasTranscripciones)
      .query(`
        IF EXISTS (SELECT * FROM Datos_TiempoReal WHERE id_tiempoReal = 1)
          UPDATE Datos_TiempoReal
          SET total_usuarios = @total_usuarios,
              numero_transcripciones = @numero_transcripciones,
              usuario_MasTranscripciones = @usuario_MasTranscripciones,
              ultima_transcripcion = @ultima_transcripcion,
              dia_MasTranscripciones = @dia_MasTranscripciones
          WHERE id_tiempoReal = 1
        ELSE
          INSERT INTO Datos_TiempoReal (id_tiempoReal, total_usuarios, numero_transcripciones, usuario_MasTranscripciones, ultima_transcripcion, dia_MasTranscripciones)
          VALUES (1, @total_usuarios, @numero_transcripciones, @usuario_MasTranscripciones, @ultima_transcripcion, @dia_MasTranscripciones)
      `);
  } catch (err) {
    console.error('Error actualizando datos en tiempo real:', err.message, err.stack);
  }
}

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

    await updateRealtimeData(); // Actualizar tabla de datos en tiempo real después de la inserción

    res.json({ transcript, id_transcripcion: result.recordset[0].id_transcripcion });
  } catch (error) {
    console.error("Error en Python o base de datos:", error.stderr || error.message, error.stack);
    res.status(500).json({ error: "Error al transcribir audio" });
  } finally {
    try {
      await fs.unlink(inputPath);
    } catch (err) {
      console.error("Error al borrar el archivo:", err.message, err.stack);
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
      .query("SELECT id_transcripcion, nombre_archivo, CONVERT(varchar, fecha_subida, 120) AS fecha_subida, texto_transcrito FROM Historial_transcripciones WHERE nombre_usuario = @nombre_usuario");
    res.json(result.recordset);
  } catch (error) {
    console.error("Error al obtener transcripciones:", error.message, error.stack);
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
    console.error("Error al obtener transcripción:", error.message, error.stack);
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

    await updateRealtimeData(); // Actualizar si el edit afecta (por seguridad, aunque edit no siempre afecta counts)

    res.json({ message: "Actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar:", error.message, error.stack);
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

    await updateRealtimeData(); // Actualizar tabla de datos en tiempo real después de la eliminación

    res.json({ message: "Transcripción borrada" });
  } catch (error) {
    console.error("Error al borrar transcripción:", error.message, error.stack);
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
        "INSERT INTO UsuariosHRL (Nombre, Email, PasswordHash) VALUES (@Nombre, @Email, @PasswordHash)"
      );

    await updateRealtimeData(); // Actualizar tabla de datos en tiempo real después del registro

    res.json({ message: "👍 Usuario registrado correctamente" });
  } catch (err) {
    console.error("Error al registrar:", err.message, err.stack);
    res.status(500).json({ error: "Error al registrar usuario", details: err.message });
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

    // Check AdministradoresHRL table
    const adminResult = await pool
      .request()
      .input("Email", sql.NVarChar(150), email)
      .query("SELECT Nombre, PasswordAdmin FROM AdministradoresHRL WHERE Email = @Email");

    if (adminResult.recordset.length > 0) {
      const admin = adminResult.recordset[0];
      if (password === admin.PasswordAdmin) {
        req.session.user = { nombre: admin.Nombre, email };
        req.session.isAdmin = true;
        return res.json({ success: true, message: `Bienvenido administrador, ${admin.Nombre}`, redirect: "/panelAdmin" });
      } else {
        return res.json({ success: false, message: "Contraseña incorrecta para administrador" });
      }
    }

    // Check UsuariosHRL table
    const userResult = await pool
      .request()
      .input("Email", sql.NVarChar(150), email)
      .query("SELECT Nombre, PasswordHash FROM UsuariosHRL WHERE Email = @Email");

    if (userResult.recordset.length === 0) {
      return res.json({ success: false, message: "Usuario no encontrado" });
    }

    const user = userResult.recordset[0];

    if (password !== user.PasswordHash) {
      return res.json({ success: false, message: "Contraseña incorrecta" });
    }

    req.session.user = { nombre: user.Nombre, email };
    req.session.isAdmin = false;

    res.json({ success: true, message: `Bienvenido de nuevo, ${user.Nombre}`, redirect: "/main" });
  } catch (err) {
    console.error("Error al iniciar sesión:", err.message, err.stack);
    res.status(500).json({ error: "Error al iniciar sesión", details: err.message });
  }
});

// Ruta para cerrar sesión
app.post("/api/logout", (req, res) => {
  if (req.session.user) {
    const nombre = req.session.user.nombre;
    req.session.destroy((err) => {
      if (err) {
        console.error("Error al cerrar sesión:", err.message, err.stack);
        return res.status(500).json({ error: "Error al cerrar sesión" });
      }
      res.json({ message: `Sesión cerrada, ${nombre}` });
    });
  } else {
    res.json({ message: "No hay sesión activa" });
  }
});

/************ ACCIONES CRUD PARA EL ADMINISTRADOR **************/

// Ruta para actualizar un usuario
app.put("/api/users/:id", async (req, res) => {
  if (!req.session.user || !req.session.isAdmin) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const { Nombre, Email, PasswordHash } = req.body;
  if (!Nombre && !Email && !PasswordHash) {
    return res.status(400).json({ error: "No se proporcionó ningún dato para actualizar" });
  }

  try {
    const pool = await sql.connect(dbConfig);
    const request = pool.request();
    let query = "UPDATE UsuariosHRL SET ";
    const updates = [];
    
    if (Nombre) {
      updates.push("Nombre = @Nombre");
      request.input("Nombre", sql.NVarChar(150), Nombre);
    }
    if (Email) {
      updates.push("Email = @Email");
      request.input("Email", sql.NVarChar(150), Email);
    }
    if (PasswordHash) {
      updates.push("PasswordHash = @PasswordHash");
      request.input("PasswordHash", sql.NVarChar(255), PasswordHash);
    }

    query += updates.join(", ") + " WHERE Id = @Id";
    request.input("Id", sql.Int, req.params.id);

    const result = await request.query(query);
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    await updateRealtimeData(); // Update real-time data
    res.json({ message: "Usuario actualizado correctamente" });
  } catch (error) {
    console.error("Error al actualizar usuario:", error.message, error.stack);
    res.status(500).json({ error: "Error al actualizar usuario", details: error.message });
  }
});

// Ruta para eliminar un usuario
app.delete("/api/users/:id", async (req, res) => {
  if (!req.session.user || !req.session.isAdmin) {
    return res.status(401).json({ error: "No autorizado" });
  }

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .input("Id", sql.Int, req.params.id)
      .query("DELETE FROM UsuariosHRL WHERE Id = @Id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    await updateRealtimeData(); // Update real-time data
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error.message, error.stack);
    res.status(500).json({ error: "Error al eliminar usuario", details: error.message });
  }
});

// Generar reportes en PDF
app.post('/api/generate-report', async (req, res) => {
  const { type } = req.body;
  if (!req.session.user || !req.session.isAdmin) {
    return res.status(401).json({ error: "No autorizado" });
  }

  if (!['estadisticas', 'usuarios', 'historial-transcripciones', 'general'].includes(type)) {
    return res.status(400).json({ error: "Tipo de reporte inválido" });
  }

  try {
    const pool = await sql.connect(dbConfig);

    // Fetch data based on type
    let data = {};
    if (type === 'estadisticas' || type === 'general') {
      const userCountRes = await pool.request().query("SELECT COUNT(*) AS count FROM UsuariosHRL");
      data.totalUsers = userCountRes.recordset[0].count;

      const transCountRes = await pool.request().query("SELECT COUNT(*) AS count FROM Historial_transcripciones");
      data.transCount = transCountRes.recordset[0].count;

      const latestTransRes = await pool.request().query("SELECT TOP 1 nombre_archivo FROM Historial_transcripciones ORDER BY fecha_subida DESC");
      data.latestTrans = latestTransRes.recordset.length > 0 ? latestTransRes.recordset[0].nombre_archivo : 'Ninguna';

      const topUsersRes = await pool.request().query(`
        SELECT TOP 3 nombre_usuario, COUNT(*) as count
        FROM Historial_transcripciones
        GROUP BY nombre_usuario
        ORDER BY count DESC
      `);
      data.topUsers = topUsersRes.recordset;

      const dailyRes = await pool.request().query(`
        SELECT DATEPART(WEEKDAY, fecha_subida) AS day_of_week, COUNT(*) AS count
        FROM Historial_transcripciones
        GROUP BY DATEPART(WEEKDAY, fecha_subida)
      `);
      const daysMap = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo' };
      const totalDaily = dailyRes.recordset.reduce((sum, row) => sum + row.count, 0);
      data.dailyCounts = Object.keys(daysMap).map(dayNum => {
        const row = dailyRes.recordset.find(r => r.day_of_week === parseInt(dayNum)) || { count: 0 };
        const percentage = totalDaily > 0 ? ((row.count / totalDaily) * 100).toFixed(1) : 0;
        return { day: daysMap[dayNum], count: row.count, percentage };
      }).sort((a, b) => {
        const order = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        return order.indexOf(a.day) - order.indexOf(b.day);
      });
    }

    if (type === 'usuarios' || type === 'general') {
      const usersRes = await pool.request().query("SELECT Id, Nombre, Email, PasswordHash, CONVERT(varchar, FechaRegistro, 120) AS FechaRegistro FROM UsuariosHRL ORDER BY Id");
      data.users = usersRes.recordset;
    }

    if (type === 'historial-transcripciones' || type === 'general') {
      const transRes = await pool.request().query(`
        SELECT id_transcripcion, nombre_archivo, CONVERT(varchar, fecha_subida, 120) AS fecha_subida,
               LEN(CAST(texto_transcrito AS NVARCHAR(MAX))) AS char_count, nombre_usuario
        FROM Historial_transcripciones
        ORDER BY id_transcripcion
      `);
      data.transcriptions = transRes.recordset;
    }

    // Generate PDF with proper margins
    const margin = 50;
    const doc = new PDFDocument({ margin });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=reporte_${type}.pdf`);
    doc.pipe(res);

    // Headers mapping
    const headers = {
      estadisticas: 'Reporte de Estadísticas',
      usuarios: 'Reporte de Usuarios',
      'historial-transcripciones': 'Reporte de Historial de Transcripciones',
      general: 'Reporte General'
    };

    // Header Section
    const pageWidth = doc.page.width - 2 * margin;
    try {
      doc.image('public/img/Logo-HR-LATAM.png', margin, margin, { width: 150 });
    } catch (err) {
      console.warn('Logo no encontrado, omitiendo:', err.message);
      doc.text('Logo no disponible', margin, margin, { align: 'left' });
    }
    const generationDate = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    doc.fontSize(10).fillColor('#000000').font('Helvetica').text(`Generado el: ${generationDate}`, margin + pageWidth - 150, margin, { align: 'right', width: 150 });
    
    // Calculate header height dynamically
    const headerText = headers[type] || 'Reporte General';
    const headerFontSize = 20;
    doc.fontSize(headerFontSize).font('Helvetica-Bold').fillColor('#F97316');
    const headerHeight = doc.heightOfString(headerText, { width: pageWidth });
    const headerY = margin + 80;
    doc.text(headerText, margin, headerY, { align: 'center', width: pageWidth });
    doc.moveDown(2);

    // Draw sections based on type
    let yPos = doc.y;
    if (type === 'estadisticas' || type === 'general') {
      if (type === 'general') {
        doc.fontSize(16).fillColor('#000000').text('Sección: Estadísticas', margin, yPos, { underline: true });
        doc.moveDown(1);
        yPos = doc.y;
      }
      drawTable(doc, yPos, [
        ['Métrica', 'Valor'],
        ['Total de Usuarios', data.totalUsers.toString()],
        ['Número de Transcripciones', data.transCount.toString()],
        ['Última Transcripción', data.latestTrans]
      ], 'Resumen de Estadísticas', [250, 250], margin, pageWidth);

      yPos = doc.y + 20;

      const topUsersRows = [['Usuario', 'Transcripciones'], ...data.topUsers.map(u => [u.nombre_usuario, u.count.toString()])];
      drawTable(doc, yPos, topUsersRows, 'Top 3 Usuarios con Más Transcripciones', [250, 250], margin, pageWidth);

      yPos = doc.y + 20;

      const dailyRows = [['Día', 'Conteo', 'Porcentaje'], ...data.dailyCounts.map(d => [d.day, d.count.toString(), `${d.percentage}%`])];
      drawTable(doc, yPos, dailyRows, 'Transcripciones por Día de la Semana', [166, 167, 167], margin, pageWidth);

      doc.moveDown(2);
    }

    if (type === 'usuarios' || type === 'general') {
      if (type === 'general') {
        doc.addPage();
        doc.fontSize(16).fillColor('#000000').text('Sección: Usuarios', margin, margin, { underline: true });
        doc.moveDown(1);
      }
      const usersRows = [['ID', 'Nombre', 'Email', 'Contraseña', 'Fecha de Registro'], ...data.users.map(u => [u.Id.toString(), u.Nombre, u.Email, u.PasswordHash, u.FechaRegistro])];
      drawTable(doc, doc.y, usersRows, 'Lista de Usuarios Registrados', [50, 100, 150, 150, 100], margin, pageWidth);
      doc.moveDown(2);
    }

    if (type === 'historial-transcripciones' || type === 'general') {
      if (type === 'general') {
        doc.addPage();
        doc.fontSize(16).fillColor('#000000').text('Sección: Historial de Transcripciones', margin, margin, { underline: true });
        doc.moveDown(1);
      }
      const transRows = [['ID', 'Nombre del Archivo', 'Fecha de Subida', 'Texto Transcrito (Caracteres)', 'Nombre del Usuario'], ...data.transcriptions.map(t => [t.id_transcripcion.toString(), t.nombre_archivo, t.fecha_subida, `${t.char_count || 0} caracteres`, t.nombre_usuario])];
      drawTable(doc, doc.y, transRows, 'Historial de Transcripciones', [50, 150, 100, 100, 100], margin, pageWidth);
    }

    doc.end();
  } catch (error) {
    console.error("Error generando reporte PDF:", error.message, error.stack);
    res.status(500).json({ error: "Error al generar reporte PDF", details: error.message });
  }
});

// Helper function to draw tables
function drawTable(doc, startY, rows, title, colWidths, margin, pageWidth) {
  const cellPadding = 10;
  const fontSize = 10;
  const headerTextColor = '#FFFFFF'; // White color for header text
  const headerBgColor = '#F97316'; // Orange background for header
  const alternateRowColor = '#F9F9F9'; // Light gray for alternating rows
  const borderColor = '#000000'; // Black for borders
  const rowHeight = 20;
  const headerHeightReduction = 11.34; // 0.4 cm ≈ 11.34 points
  let tableWidth = sumArray(colWidths);
  let y = startY;

  // Ensure table fits within page margins
  if (tableWidth > pageWidth) {
    const scaleFactor = pageWidth / tableWidth;
    colWidths = colWidths.map(width => width * scaleFactor);
    tableWidth = sumArray(colWidths);
  }

  // Title
  doc.fontSize(14).fillColor('#000000').font('Helvetica-Bold').text(title, margin, y, { width: pageWidth });
  y += 20;
  let tableTop = y;

  // Calculate header height dynamically based on text content
  let headerRowHeight = rowHeight;
  doc.fontSize(fontSize).font('Helvetica-Bold');
  rows[0].forEach((cell, i) => {
    const cellWidth = colWidths[i] - 2 * cellPadding;
    const textHeight = doc.heightOfString(cell, { width: cellWidth, align: 'left' });
    headerRowHeight = Math.max(headerRowHeight, Math.ceil(textHeight / (fontSize * 1.2)) * rowHeight + cellPadding);
  });
  headerRowHeight = Math.max(rowHeight, headerRowHeight - headerHeightReduction); // Reduce header height by 0.4 cm

  // Draw header background with solid orange color, covering full header height
  doc.rect(margin, tableTop, tableWidth, headerRowHeight).fill(headerBgColor);
  doc.fillColor(headerTextColor); // Set text color for headers to white

  // Draw headers
  rows[0].forEach((cell, i) => {
    doc.text(cell, margin + sumArray(colWidths.slice(0, i)) + cellPadding, tableTop + cellPadding / 2, { width: colWidths[i] - 2 * cellPadding, align: 'left' });
  });
  y = tableTop + headerRowHeight;

  // Draw header borders
  doc.lineWidth(1).strokeColor(borderColor)
    .moveTo(margin, tableTop)
    .lineTo(margin + tableWidth, tableTop)
    .stroke();
  doc.moveTo(margin, tableTop + headerRowHeight)
    .lineTo(margin + tableWidth, tableTop + headerRowHeight)
    .stroke();

  // Store x-positions for vertical lines
  const verticalLineX = [margin];
  for (let i = 0; i < colWidths.length; i++) {
    verticalLineX.push(margin + sumArray(colWidths.slice(0, i + 1)));
  }

  // Draw rows
  doc.font('Helvetica').fillColor('#000000');
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    // Calculate required height for row based on longest wrapped text
    let maxRowHeight = rowHeight;
    rows[rowIndex].forEach((cell, i) => {
      const cellWidth = colWidths[i] - 2 * cellPadding;
      const textHeight = doc.heightOfString(cell.toString(), { width: cellWidth, align: 'left' });
      maxRowHeight = Math.max(maxRowHeight, Math.ceil(textHeight / (fontSize * 1.2)) * rowHeight + cellPadding);
    });

    // Check for page overflow
    if (y + maxRowHeight > doc.page.height - margin) {
      // Draw vertical lines up to current y-position before page break
      verticalLineX.forEach(x => {
        doc.moveTo(x, tableTop)
          .lineTo(x, y)
          .stroke();
      });
      doc.addPage();
      y = margin;
      tableTop = y; // Update tableTop for vertical lines on new page
    }

    // Draw row background (alternating)
    if (rowIndex % 2 === 0) {
      doc.rect(margin, y, tableWidth, maxRowHeight).fill(alternateRowColor);
      doc.fillColor('#000000'); // Reset text color
    }

    // Draw cells with word wrap
    doc.fontSize(fontSize);
    rows[rowIndex].forEach((cell, i) => {
      doc.text(cell.toString(), margin + sumArray(colWidths.slice(0, i)) + cellPadding, y + cellPadding / 2, { width: colWidths[i] - 2 * cellPadding, align: 'left' });
    });

    // Draw row border for EVERY row
    doc.strokeColor(borderColor)
      .moveTo(margin, y)
      .lineTo(margin + tableWidth, y)
      .stroke();

    y += maxRowHeight;
  }

  // Draw final bottom border
  doc.strokeColor(borderColor)
    .moveTo(margin, y)
    .lineTo(margin + tableWidth, y)
    .stroke();

  // Draw vertical lines across entire table height
  verticalLineX.forEach(x => {
    doc.moveTo(x, tableTop)
      .lineTo(x, y)
      .stroke();
  });

  doc.y = y + 20;
}

// Helper to sum array
function sumArray(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

// Iniciar servidor y actualizar datos en tiempo real al inicio
app.listen(PORT, async () => {
  console.log(`Servidor corriendo en 👉 http://localhost:${PORT}`);
  await updateRealtimeData();
});