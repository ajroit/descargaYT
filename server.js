const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Servidor funcionando');
});

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
      quality: format === 'mp3' ? 'highestaudio' : 'highest'
    });

    stream.pipe(res);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
