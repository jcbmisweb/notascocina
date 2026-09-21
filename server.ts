import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// AI endpoint to parse student screenshot
app.post('/api/ai/parse-student-image', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/png' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    const detectedMime = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,/)?.[1] || mimeType;

    const imagePart = {
      inlineData: {
        mimeType: detectedMime,
        data: cleanBase64,
      },
    };

    const promptText = `Analiza esta captura de pantalla de la ficha del alumno de un centro educativo (tipo InfoEducativa / MurciaEduca) y extrae todos los datos personales y académicos del alumno con precisión.
Del título o nombre superior (ej. "CHAZARRA VIVO, LAURA"), extrae el apellido1 ("CHAZARRA"), apellido2 ("VIVO") y nombre ("LAURA").
Extrae también NRE, Nº de expediente, fecha de nacimiento, teléfono, email personal o alternativo y email oficial (@alu.murciaeduca.es), así como el grupo o curso.
Devuelve un objeto JSON estrictamente con la siguiente estructura:
{
  "nombre": "Nombre de pila del alumno",
  "apellido1": "Primer apellido",
  "apellido2": "Segundo apellido (si lo hay)",
  "nre": "Número NRE",
  "expediente": "Número de expediente",
  "grupo": "Curso o grupo (ej. 2HCA o 2)",
  "subgrupo": "Subgrupo si aparece",
  "fechaNacimiento": "Fecha de nacimiento en formato YYYY-MM-DD o DD/MM/YYYY",
  "telefono": "Teléfono de contacto principal",
  "emailPersonal": "Email personal o alternativo",
  "emailOficial": "Email oficial (@alu...)"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: { parts: [imagePart, { text: promptText }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nombre: { type: Type.STRING, description: "Nombre de pila" },
            apellido1: { type: Type.STRING, description: "Primer apellido" },
            apellido2: { type: Type.STRING, description: "Segundo apellido" },
            nre: { type: Type.STRING, description: "Número NRE" },
            expediente: { type: Type.STRING, description: "Número de expediente" },
            grupo: { type: Type.STRING, description: "Grupo o curso" },
            subgrupo: { type: Type.STRING, description: "Subgrupo" },
            fechaNacimiento: { type: Type.STRING, description: "Fecha de nacimiento" },
            telefono: { type: Type.STRING, description: "Teléfono" },
            emailPersonal: { type: Type.STRING, description: "Email personal" },
            emailOficial: { type: Type.STRING, description: "Email oficial" },
          }
        }
      }
    });

    const parsedData = JSON.parse(response.text || '{}');
    res.json({ success: true, student: parsedData });
  } catch (error: any) {
    console.error('Error parsing student image with AI:', error);
    res.status(500).json({ error: error.message || 'Error processing image with AI' });
  }
});

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
