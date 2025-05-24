const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const app = express();

app.use(cors()); // Permitir todas las conexiones
app.use(express.json()); // Parsear JSON en requests

// Ruta para comprobar que está funcionando
app.get('/', (req, res) => {
  res.send('Servidor de descarga de YouTube activo.');
});

// Ruta de descarga
app.post('/download', async (req, res) => {
  const { url, format } = req.body;

  if (!ytdl.validateURL(url)) {
    return res.status(400).json({ error: 'URL inválida de YouTube.' });
  }

  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');

    res.header('Content-Disposition', `attachment; filename="${title}.${format}"`);

    const stream = ytdl(url, {
      filter: format === 'mp3' ? 'audioonly' : 'videoandaudio',
      quality: format === 'mp3' ? 'highestaudio' : 'highest',
    });

    stream.pipe(res);
  } catch (err) {
    console.error('Error al descargar:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// Puerto dinámico para Render o local (por ejemplo 3000)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
