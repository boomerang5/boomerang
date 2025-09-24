require("dotenv").config({ path: ".env.local" });
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.static("public"));

// Endpoint para intercambiar la clave por un token corto (≈10 min)
app.get("/token", async (req, res) => {
  try {
    const region = process.env.SPEECH_REGION;
    const key = process.env.SPEECH_KEY;
    if (!region || !key) {
      return res
        .status(500)
        .json({ error: "Falta SPEECH_REGION o SPEECH_KEY" });
    }

    // issueToken endpoint (región global pública)
    const url = `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": "0",
      },
    });

    if (!r.ok) {
      const text = await r.text();
      return res
        .status(500)
        .json({ error: "No se pudo obtener token", details: text });
    }

    const token = await r.text();
    res.json({ token, region });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Server http://localhost:${PORT}`));
