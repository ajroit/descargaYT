const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/download', async (req, res) => {
  const { url, format } = req.body;
  if (!url || !['mp4', 'mp3'].includes(format)) {
    return res.status(400).json({ error: 'URL o formato inválido' });
  }

  const id = Date.now();
  const output = `video_${id}.${format === 'mp3' ? 'mp3' : 'mp4'}`;

  const command = `yt-dlp -f bestaudio[ext=m4a]+bestvideo[ext=mp4]/best -o "${output}" ${format === 'mp3' ? '--extract-audio --audio-format mp3' : ''} "${url}"`;

  exec(command, (error) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error al procesar el video' });
    }

    const filePath = path.join(__dirname, output);
    res.download(filePath, output, (err) => {
      fs.unlink(filePath, () => {}); // eliminar después de descargar
      if (err) console.error(err);
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
