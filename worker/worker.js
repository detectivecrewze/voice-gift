var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker-telegram.js
var index_default = {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Cache-Control, Pragma"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders
      });
    }
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/upload") {
      try {
        const formData = await request.formData();
        const file = formData.get("file");
        if (!file) {
          return new Response(JSON.stringify({
            error: "No file provided"
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        if (file.size > 100 * 1024 * 1024) {
          return new Response(JSON.stringify({
            error: "File too large. Maximum 100MB."
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const ext = file.name.split(".").pop().toLowerCase();
        const filename = `${timestamp}-${randomStr}.${ext}`;
        console.log(`Uploading file: ${filename} (${file.size} bytes)`);
        await env.BUCKET.put(filename, file.stream(), {
          httpMetadata: {
            contentType: file.type || "application/octet-stream"
          }
        });
        const publicUrl = `${url.origin}/${filename}`;
        console.log(`Upload success: ${publicUrl}`);
        return new Response(JSON.stringify({
          success: true,
          url: publicUrl,
          filename,
          size: file.size
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (error) {
        console.error("Upload error:", error);
        return new Response(JSON.stringify({
          error: error.message || "Upload failed"
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }
    if (request.method === "POST" && url.pathname === "/telegram") {
      return await handleTelegramSubmit(request, env, corsHeaders);
    }
    if (request.method === "GET" && url.pathname === "/get-config") {
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing 'id' parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      try {
        console.log(`[KV] Looking up config for: ${id}`);
        const data = await env.VALENTINE_DATA.get(id);
        if (!data) {
          console.log(`[KV] Config not found: ${id}`);
          return new Response(JSON.stringify({ error: "Config not found", id }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        console.log(`[KV] Config found for: ${id} (${data.length} bytes)`);
        return new Response(data, {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate"
          }
        });
      } catch (error) {
        console.error(`[KV] Error retrieving config: ${error.message}`);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }
    if (request.method === "POST" && url.pathname === "/save-config") {
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing 'id' parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      try {
        const body = await request.json();
        body._server_metadata = {
          lastSaved: (/* @__PURE__ */ new Date()).toISOString(),
          ip: request.headers.get("cf-connecting-ip") || "unknown"
        };
        await env.VALENTINE_DATA.put(id, JSON.stringify(body));
        const customer = body.metadata?.customerName || id;
        const photoCount = (body.gallery?.memories?.length || 0) + (body.map?.locations?.length || 0);
        const notification = `\u{1F680} *Project Published!*

\u{1F464} *Customer:* ${customer}
\u{1F194} *ID:* \`${id}\` 
\u{1F4F8} *Photos:* ${photoCount}
\u{1F3B5} *Music:* ${body.music?.length || 0} songs

\u{1F517} [View Project](https://valentine-site-sigma.vercel.app/?to=${id})`;
        await sendSimpleTelegram(notification, env);
        return new Response(JSON.stringify({
          success: true,
          message: "Configuration saved!",
          id,
          previewUrl: `https://valentine-site-sigma.vercel.app/?to=${id}`
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }
    if (request.method === "POST" && url.pathname === "/login") {
      try {
        const { password, userAgent } = await request.json();
        const expected = "Aldobotak1@";
        if (password !== expected) {
          return new Response(JSON.stringify({ success: false, error: "Invalid password" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        const country = request.cf?.country || "Unknown";
        const city = request.cf?.city || "Unknown";
        const loginMsg = `\u{1F6A8} *Admin Access Detected*

\u{1F4CD} *Location:* ${city}, ${country}
\u{1F4F1} *Device:* ${userAgent || "Unknown"}
\u23F0 *Time:* ${(/* @__PURE__ */ new Date()).toLocaleString()}`;
        await sendSimpleTelegram(loginMsg, env);
        return new Response(JSON.stringify({
          success: true,
          token: btoa(password + Date.now())
          // Simple session token
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }
    if (request.method === "GET" && url.pathname === "/admin/list-gifts") {
      return await handleAdminListGifts(request, env, corsHeaders);
    }
    if (request.method === "GET" && url.pathname === "/list-configs") {
      try {
        const list = await env.VALENTINE_DATA.list();
        const ids = list.keys.map((k) => k.name);
        return new Response(JSON.stringify({ configs: ids, count: ids.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }
    if (url.pathname === "/debug") {
      const debug = {
        hasBucket: !!env.BUCKET,
        hasKV: !!env.VALENTINE_DATA,
        hasChatId: !!env.TELEGRAM_CHAT_ID,
        hasBotToken: !!env.TELEGRAM_BOT_TOKEN,
        url: request.url,
        method: request.method
      };
      return new Response(JSON.stringify(debug, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (request.method === "GET" && url.pathname !== "/") {
      const filename = url.pathname.substring(1);
      console.log(`Fetching file: ${filename}`);
      try {
        const object = await env.BUCKET.get(filename);
        if (!object) {
          return new Response("File not found", {
            status: 404,
            headers: corsHeaders
          });
        }
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("Cache-Control", "public, max-age=31536000");
        for (const [key, value] of Object.entries(corsHeaders)) {
          headers.set(key, value);
        }
        return new Response(object.body, { headers });
      } catch (error) {
        console.error("Download error:", error);
        return new Response("Error fetching file", {
          status: 500,
          headers: corsHeaders
        });
      }
    }
    return new Response(`
      <html>
        <head>
          <title>Valentine Backend API</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; line-height: 1.6; }
            h1 { color: #e91e63; }
            code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
            .status { background: #4caf50; color: white; padding: 10px; border-radius: 5px; text-align: center; }
            .badge { background: #2196f3; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; vertical-align: middle; }
          </style>
        </head>
        <body>
          <h1>\u{1F496} Valentine Backend API</h1>
          <div class="status">\u2705 API is running!</div>
          
          <h2>Endpoints:</h2>
          <ul>
            <li><code>POST /upload</code> - Upload file (R2)</li>
            <li><code>POST /telegram</code> - Secure Telegram Forwarder</li>
            <li><code>GET /{filename}</code> - Download file</li>
            <li><code>GET /get-config?id=xxx</code> <span class="badge">NEW</span> - Get customer config</li>
            <li><code>POST /save-config?id=xxx</code> <span class="badge">NEW</span> - Save customer config</li>
            <li><code>GET /list-configs</code> <span class="badge">NEW</span> - List all customers</li>
          </ul>
        </body>
      </html>
    `, {
      headers: {
        "Content-Type": "text/html",
        ...corsHeaders
      }
    });
  }
};
async function handleTelegramSubmit(request, env, corsHeaders) {
  try {
    const formData = await request.formData();
    const file = formData.get("document");
    const caption = formData.get("caption");
    const chatId = env.TELEGRAM_CHAT_ID;
    const botToken = env.TELEGRAM_BOT_TOKEN;
    if (!chatId || !botToken) {
      throw new Error("Server Misconfiguration: Missing TELEGRAM_CHAT_ID or TELEGRAM_BOT_TOKEN");
    }
    const telegramFormData = new FormData();
    telegramFormData.append("chat_id", chatId);
    telegramFormData.append("document", file);
    if (caption) telegramFormData.append("caption", caption);
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: "POST",
      body: telegramFormData
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.description || "Telegram API Error");
    }
    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
__name(handleTelegramSubmit, "handleTelegramSubmit");
async function sendSimpleTelegram(message, env) {
  const chatId = env.TELEGRAM_CHAT_ID;
  const botToken = env.TELEGRAM_BOT_TOKEN;
  if (!chatId || !botToken) return;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown"
      })
    });
  } catch (e) {
    console.error("Telegram notify failed:", e);
  }
}
__name(sendSimpleTelegram, "sendSimpleTelegram");

async function handleAdminListGifts(request, env, corsHeaders) {
  const authHeader = request.headers.get("Authorization");
  const secret = "Aldobotak1@";
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ success: false, error: "Akses ditolak." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  try {
    const list = await env.VALENTINE_DATA.list();
    const keys = list.keys;
    const detailPromises = keys.map(async (keyObj) => {
      try {
        const data = await env.VALENTINE_DATA.get(keyObj.name);
        if (data) {
          const config = JSON.parse(data);
          return {
            giftId: keyObj.name,
            recipientName: config.recipientName || "Unknown",
            status: config.status || "unknown",
            publishedAt: config.publishedAt || config.createdAt || null,
            photosCount: config.photos?.length || 0,
            hasVoice: !!(config.voiceNote?.url),
            theme: config.theme || "rose",
            ambient: config.ambient || "none"
          };
        }
      } catch (e) {
        return null;
      }
      return null;
    });
    const results = await Promise.all(detailPromises);
    const filteredResults = results.filter((r) => r !== null);
    return new Response(JSON.stringify({ success: true, gifts: filteredResults }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
__name(handleAdminListGifts, "handleAdminListGifts");

export {
  index_default as default
};
//# sourceMappingURL=worker-telegram.js.map
