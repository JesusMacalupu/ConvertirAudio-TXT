const express = require("express");
const path = require("path");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs").promises;

const app = express();
const PORT = 3000;

// Carpeta de archivos subidos
const upload = multer({ dest: "uploads/" });

// Servir archivos estáticos desde public
app.use(express.static(path.join(__dirname, "public")));

// Ruta principal -> abre main.html automáticamente
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "main.html"));
});

// Ruta para transcripción
app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No se subió ningún archivo" });
  }

  const inputPath = path.join(__dirname, req.file.path);

  try {
    // Ejecutar el script de Python para transcripción
    const { stdout, stderr } = await new Promise((resolve, reject) => {
      exec(`py transcribir.py "${inputPath}"`, (error, stdout, stderr) => {
        if (error) {
          reject({ error, stderr });
        } else {
          resolve({ stdout, stderr });
        }
      });
    });

    // Devolver la transcripción
    res.json({ transcript: stdout.trim() });
  } catch (error) {
    console.error("Error en Python:", error.stderr || error);
    res.status(500).json({ error: "Error al transcribir audio" });
  } finally {
    // Borrar archivo subido
    try {
      await fs.unlink(inputPath);
    } catch (err) {
      console.error("Error al borrar el archivo:", err);
    }
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en 👉 http://localhost:${PORT}`);
});