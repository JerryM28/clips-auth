const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// SET DI RENDER ENV (bukan di code)
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI; // harus sama persis dgn yang di TikTok portal
const SCOPES = process.env.TIKTOK_SCOPES || "user.info.basic,video.upload";

app.get("/", (req, res) => {
  res.send("OK - LoginClips OAuth server running");
});

// 1) Start login
app.get("/auth/login", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");

  const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
  authUrl.searchParams.set("client_key", CLIENT_KEY);
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("state", state);

  return res.redirect(authUrl.toString());
});

// 2) Callback (tukar code -> access token)
app.get("/auth/callback", async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.status(400).send(`OAuth error: ${error} - ${error_description || ""}`);
  }
  if (!code) return res.status(400).send("Missing code");

  try {
    const tokenUrl = "https://open.tiktokapis.com/v2/oauth/token/";
    const payload = new URLSearchParams({
      client_key: CLIENT_KEY,
      client_secret: CLIENT_SECRET,
      code: code.toString(),
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
    });

    const r = await axios.post(tokenUrl, payload.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 30000,
    });

    // Untuk testing: tampilkan respons token (jangan dipakai produksi apa adanya)
    res.setHeader("Content-Type", "application/json");
    return res.send(JSON.stringify(r.data, null, 2));
  } catch (e) {
    const msg = e?.response?.data ? JSON.stringify(e.response.data) : (e.message || "unknown error");
    return res.status(500).send(`Token exchange failed: ${msg}`);
  }
});

app.listen(PORT, () => console.log(`Listening on ${PORT}`));
