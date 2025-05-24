// server.js
const express = require('express');
const cors = require('cors');
const play = require('play-dl');
const app = express();

console.log('Versión de play-dl en uso:', require('play-dl/package.json').version);

// --- INICIO: Configuración CORS explícita ---
const corsOptions = {
  origin: '*', // Permite cualquier origen (file:// o null se incluye aquí)
  methods: ['GET', 'POST', 'OPTIONS'], // Asegúrate de incluir OPTIONS
  allowedHeaders: ['Content-Type', 'Authorization'], // Permite los headers que usas
};

app.use(cors(corsOptions));
// Habilitar el manejo explícito de preflight requests para todas las rutas
app.options('*', cors(corsOptions)); // Esto es clave para las preflight
// --- FIN: Configuración CORS explícita ---

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Servidor funcionando con play-dl');
});

// ... (el resto de tu ruta /download y app.listen no cambian)
// ... (tu ruta app.post('/download', ... ) permanece igual)

app.post('/download', async (req, res) => {
  const { url, format } = req.body;

  if (!url) { // Pequeña validación extra por si acaso
      return res.status(400).json({ error: 'URL no proporcionada.' });
  }
  
  const validation = await play.validate(url);
  if (!validation || validation !== 'yt_video') { // Asegurarse que validation no sea falsey
    return res.status(400).json({ error: 'URL inválida de YouTube o no es un video.' });
  }

  try {
    const videoInfo = await play.video_info(url);
    const title = (videoInfo.video_details.title || 'youtube_video').replace(/[^\w\s.-]/gi, '').trim();

    res.header('Content-Disposition', `attachment; filename="${title}.${format}"`);

    let streamSource;
    if (format === 'mp3') {
      streamSource = await play.stream(url, {
        quality: 2, 
        type: 'audio', 
      });
    } else { 
      streamSource = await play.stream(url, {
        quality: 2, 
      });
    }

    if (!streamSource || !streamSource.stream) {
        throw new Error('No se pudo obtener el stream del video/audio.');
    }

    streamSource.stream.pipe(res);

    streamSource.stream.on('error', (err) => {
      console.error('Error en el stream:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: `Error durante el streaming: ${err.message}` });
      }
    });

    res.on('finish', () => {
        console.log('Stream finalizado para:', title);
    });
    
    res.on('close', () => {
        if (!res.finished) {
            console.warn('Conexión cerrada prematuramente para:', title);
            if (streamSource && streamSource.stream && typeof streamSource.stream.destroy === 'function') {
              streamSource.stream.destroy(); 
            }
        }
    });

  } catch (err) {
    console.error('Error en /download:', err.message, err.stack);
    let errorMsg = `Error al procesar la descarga: ${err.message}`;
    let statusCode = 500;

    if (err.message.includes('unavailable') || err.message.includes('Private video') || err.message.includes('Deleted video') || err.message.includes('Sign in')) {
      errorMsg = `Video no disponible o privado: ${err.message}`;
      statusCode = 404;
    } else {
        const statusMatch = err.message.match(/\b(400|401|403|404|410|500|503)\b/);
        if (statusMatch) {
            statusCode = parseInt(statusMatch[0]);
            errorMsg = `Error de YouTube/Servidor (${statusCode}): ${err.message}`;
        }
    }
    if (!res.headersSent) {
      res.status(statusCode).json({ error: errorMsg });
    }
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});