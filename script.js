function descargar() {
    const url = document.getElementById('url').value;
    const format = document.getElementById('format').value;
    const status = document.getElementById('status');
    
    if (!url) {
      status.textContent = "Por favor ingresa un enlace de YouTube.";
      return;
    }
  
    status.textContent = "Procesando...";
  
    fetch('https://TUBACKEND/render/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, format })
    })
    .then(res => {
      if (res.ok) return res.blob();
      else throw new Error("Error al descargar.");
    })
    .then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `youtube.${format}`;
      a.click();
      status.textContent = "Descarga lista.";
    })
    .catch(err => {
      console.error(err);
      status.textContent = "Error al procesar la descarga.";
    });
  }
  