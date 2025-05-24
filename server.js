const express = require('express');
const cors = require('cors');
const play = require('play-dl'); // Cambiado de ytdl
const app = express();

console.log('Versión de play-dl en uso:', require('play-dl/package.json').version);

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Servidor funcionando con play-dl');
});

app.post('/download', async (req, res) => {
  const { url, format } = req.body;

  // Validar URL con play-dl
  const validation = await play.validate(url);
  if (validation !== 'yt_video') {
    return res.status(400).json({ error: 'URL inválida de YouTube o no es un video.' });
  }

  try {
    const videoInfo = await play.video_info(url);
    // Quitar caracteres no válidos para nombres de archivo, permitiendo espacios, puntos y guiones
    const title = videoInfo.video_details.title.replace(/[^\w\s.-]/gi, '').trim() || 'youtube_video';

    res.header('Content-Disposition', `attachment; filename="${title}.${format}"`);

    let streamSource;
    if (format === 'mp3') {
      // play-dl puede buscar audio directamente. 'best' o 'worstaudio' son opciones
      streamSource = await play.stream(url, {
        quality: 2, // 0:low, 1:medium, 2:high para audio. Puede ser numérico.
        type: 'audio', // Especificar explícitamente audio
        // discordPlayerCompatibility: false // A menudo no es necesario para descarga directa
      });
    } else { // mp4
      // Para video y audio combinados, play-dl intenta encontrar el mejor formato.
      streamSource = await play.stream(url, {
        quality: 2, // Para video, también puede ser numérico o 'highest', 'lowest'
        // type: 'video+audio' // O dejar que play-dl decida
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
        // Esto se dispara si el cliente cierra la conexión prematuramente
        if (!res.finished) {
            console.warn('Conexión cerrada prematuramente para:', title);
            streamSource.stream.destroy(); // Asegurarse de limpiar el stream
        }
    });

  } catch (err) {
    console.error('Error en /download:', err.message, err.stack);
    // Errores comunes de play-dl pueden ser más descriptivos
    if (err.message.includes('unavailable') || err.message.includes('Private video') || err.message.includes('Deleted video') || err.message.includes('Sign in')) {
      return res.status(404).json({ error: `Video no disponible o privado: ${err.message}` });
    }
    if (err.message.includes('410') || err.message.includes('403')) {
        return res.status(parseInt(err.message.match(/\d{3}/)[0])).json({ error: `YouTube bloqueó la solicitud (IP o cambio de API): ${err.message}` });
    }
    res.status(500).json({ error: `Error al procesar la descarga: ${err.message}` });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});