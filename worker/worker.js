var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// CDN domain untuk akses file R2 langsung (foto & audio)
const CDN_URL = "https://cdn.for-you-always.my.id";

var index_default = {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Cache-Control, Pragma, Range",
      "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // ── POST /upload ────────────────────────────────────────
    if (request.method === "POST" && url.pathname === "/upload") {
      try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!file) {
          return new Response(JSON.stringify({ error: "No file provided" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        if (file.size > 100 * 1024 * 1024) {
          return new Response(JSON.stringify({ error: "File too large. Maximum 100MB." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const ext = file.name.split(".").pop().toLowerCase();
        const filename = `${timestamp}-${randomStr}.${ext}`;

        await env.BUCKET.put(filename, file.stream(), {
          httpMetadata: {
            contentType: file.type || "application/octet-stream"
          }
        });

        // Gunakan CDN URL — bukan domain Worker
        const publicUrl = `${CDN_URL}/${filename}`;

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
        return new Response(JSON.stringify({ error: error.message || "Upload failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ── POST /presign — Generate nama file unik ───────────
    // Worker hanya buat key — browser upload langsung ke R2
    if (request.method === 'POST' && url.pathname === '/presign') {
      try {
        const { filename, contentType } = await request.json();
        if (!filename || !contentType) {
          return new Response(JSON.stringify({ error: 'Missing filename or contentType' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const ext = filename.split('.').pop().toLowerCase();
        const key = `${timestamp}-${randomStr}.${ext}`;
        return new Response(JSON.stringify({
          success: true, key, publicUrl: `${CDN_URL}/${key}`
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message || 'Presign failed' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ── PUT /upload-direct/:key — Browser upload langsung ke R2 ──
    if (request.method === 'PUT' && url.pathname.startsWith('/upload-direct/')) {
      try {
        const key = url.pathname.replace('/upload-direct/', '');
        if (!key || key.includes('..') || key.includes('/')) {
          return new Response(JSON.stringify({ error: 'Invalid key' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Gembok: cek ukuran file maksimal 10MB
        const contentLength = parseInt(request.headers.get('Content-Length') || '0');
        if (contentLength > 10 * 1024 * 1024) {
          return new Response(JSON.stringify({ error: 'File terlalu besar. Maksimal 10MB.' }), {
            status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
        await env.BUCKET.put(key, request.body, {
          httpMetadata: { contentType }
        });

        return new Response(JSON.stringify({
          success: true, url: `${CDN_URL}/${key}`
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (error) {
        console.error('Direct upload error:', error);
        return new Response(JSON.stringify({ error: error.message || 'Upload failed' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ── GET /get-config ─────────────────────────────────────
    if (request.method === "GET" && url.pathname === "/get-config") {
      const id = url.searchParams.get("id");
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing 'id' parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      try {
        const { value: data } = await env.VALENTINE_DATA.getWithMetadata(id);
        if (!data) {
          return new Response(JSON.stringify({ error: "Config not found", id }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
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

    // ── POST /save-config ───────────────────────────────────
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
          lastSaved: (new Date()).toISOString(),
          ip: request.headers.get("cf-connecting-ip") || "unknown"
        };
        await env.VALENTINE_DATA.put(id, JSON.stringify(body));

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

    // ── POST /login ─────────────────────────────────────────
    if (request.method === "POST" && url.pathname === "/login") {
      try {
        const { password } = await request.json();
        const expected = env.ADMIN_SECRET;
        if (!expected) {
          return new Response(JSON.stringify({ success: false, error: "Server Error: ADMIN_SECRET not configured" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        if (password !== expected) {
          return new Response(JSON.stringify({ success: false, error: "Invalid password" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        return new Response(JSON.stringify({
          success: true,
          token: btoa(password + Date.now())
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

    // ── POST /generator-login ───────────────────────────────
    if (request.method === "POST" && url.pathname === "/generator-login") {
      try {
        const { password } = await request.json();
        const expected = env.GENERATOR_SECRET;
        if (!expected) {
          return new Response(JSON.stringify({ success: false, error: "Server Error: GENERATOR_SECRET not configured" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        if (password === expected) {
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } else {
          return new Response(JSON.stringify({ success: false, error: "Password salah" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ── GET /admin/list-gifts ───────────────────────────────
    if (request.method === "GET" && url.pathname === "/admin/list-gifts") {
      return await handleAdminListGifts(request, env, corsHeaders);
    }

    // ── POST /admin/delete-gifts ────────────────────────────
    if (request.method === "POST" && url.pathname === "/admin/delete-gifts") {
      return await handleAdminDeleteGifts(request, env, corsHeaders);
    }

    // ── GET /list-configs ───────────────────────────────────
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

    // ── GET /debug ──────────────────────────────────────────
    if (url.pathname === "/debug") {
      const debug = {
        hasBucket: !!env.BUCKET,
        hasKV: !!env.VALENTINE_DATA,
        cdnUrl: CDN_URL,
        url: request.url,
        method: request.method
      };
      return new Response(JSON.stringify(debug, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── POST /generate-ai — Proxy aman ke Google Gemini API ─
    // API Key TIDAK pernah terekspos ke browser: hanya disimpan di Cloudflare Secret.
    if (request.method === "POST" && url.pathname === "/generate-ai") {
      try {
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "GEMINI_API_KEY belum dikonfigurasi di Cloudflare Secrets." }), {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const body = await request.json();
        const userPrompt = body.prompt;
        const requestedTone = body.tone || 'romantis'; // Default ke romantis jika kosong

        if (!userPrompt || typeof userPrompt !== "string" || userPrompt.trim().length === 0) {
          return new Response(JSON.stringify({ error: "Prompt tidak boleh kosong." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Tentukan gaya bahasa berdasarkan pilihan user
        let toneInstruction = "";
        switch (requestedTone) {
          case 'lucu':
            toneInstruction = "Penulisan bergaya LUCU, SANTAI, dan BERCANDA. Gunakan bahasa gaul anak muda Indonesia, buat pembaca tersenyum atau tertawa kecil. Jangan terlalu serius atau baku.";
            break;
          case 'santai':
            toneInstruction = "Penulisan bergaya SANTAI dan BERSAHABAT. Gunakan kata ganti 'aku' dan 'kamu'. Mengalir natural seperti ngobrol santai dengan teman dekat atau pacar di cafe.";
            break;
          case 'tulus':
            toneInstruction = "Penulisan bergaya FORMAL TAPI TULUS. Gunakan bahasa Indonesia yang baik, sopan, namun tetap menyentuh hati dan sarat makna mendalam. Cocok untuk orang tua, guru, atau atasan.";
            break;
          case 'romantis':
          default:
            toneInstruction = "Penulisan bergaya ROMANTIS ANAK MUDA (usia SMA sampai 27 tahun). Gunakan bahasa gaul kasual sehari-hari tapi rapi (selalu gunakan 'Aku' dan 'Kamu'). Buat pesannya sangat manis, hangat, dan *green flag*, tapi JANGAN terlalu puitis, JANGAN kaku, dan JANGAN cringe/lebay. Bicara seperti pacar yang suportif.";
            break;
        }

        const systemInstruction = `Kamu adalah penulis surat/pesan untuk kado digital "For You, Always".
Tugasmu: Tuliskan pesan rahasia yang menyesuaikan dengan gaya berikut: [${toneInstruction}]
ATURAN WAJIB:
1. Panjang pesan harus berkisar antara 60 hingga 80 kata (sekitar 400-500 karakter).
2. Tulis hanya dalam 1 PARAGRAF yang padat dan bermakna.
3. DILARANG KERAS memotong tulisan di tengah kalimat! Pastikan surat diakhiri dengan tanda titik.
4. Buang format markdown (tanpa asterisk, bold, atau pagar).
5. Langsung isi pesan tanpa ada ucapan pengantar.`;

        // Untuk API v1 stabil, gabungkan system instruction ke dalam pesan utama
        const combinedPrompt = `${systemInstruction}\n\n[INSTRUKSI/TEMA DARI PENGGUNA:]\n${userPrompt.trim()}`;

        const geminiPayload = {
          contents: [{ 
            role: "user", 
            parts: [{ text: combinedPrompt }] 
          }],
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.85,
            topP: 0.95
          }
        };

        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(geminiPayload)
          }
        );

        if (!geminiResponse.ok) {
          const errText = await geminiResponse.text();
          console.error("[Gemini API Error]", geminiResponse.status, errText);
          // Mengembalikan raw error text dari Google agar kita tahu penyebab pastinya (invalid key, disabled api, dll)
          return new Response(JSON.stringify({ error: `Gemini API (Status ${geminiResponse.status}): ${errText.substring(0, 100)}...` }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const geminiData = await geminiResponse.json();
        const generatedText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        return new Response(JSON.stringify({ success: true, text: generatedText.trim() }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      } catch (error) {
        console.error("[generate-ai] Error:", error);
        return new Response(JSON.stringify({ error: error.message || "Gagal menghubungi AI." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ── GET /{filename} — Proxy file lama dari R2 ───────────
    // Semua URL foto/audio customer lama yang masih pakai domain workers.dev
    // akan disajikan langsung oleh Worker untuk menghindari isu CORS/Cache saat redirect.
    if (request.method === "GET" && url.pathname !== "/") {
      const filename = url.pathname.substring(1);
      if (filename && !filename.includes("/") && !filename.includes("..")) {
        try {
          const object = await env.BUCKET.get(filename);

          if (object === null) {
            return new Response("File not found", { status: 404, headers: corsHeaders });
          }

          const headers = new Headers(corsHeaders);
          object.writeHttpMetadata(headers);
          headers.set("etag", object.httpEtag);
          // Paksa cache browser selama 1 jam untuk performa
          headers.set("Cache-Control", "public, max-age=3600");

          return new Response(object.body, { headers });
        } catch (e) {
          return new Response("Error fetching file", { status: 500, headers: corsHeaders });
        }
      }
      return new Response("File not found", { status: 404, headers: corsHeaders });
    }

    // ── Default: API Info Page ──────────────────────────────
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
          <h1>💖 Valentine Backend API</h1>
          <div class="status">✅ API is running!</div>
          <h2>Endpoints:</h2>
          <ul>
            <li><code>POST /upload</code> - Upload file (R2 via CDN)</li>
            <li><code>GET /{filename}</code> - Redirect ke CDN</li>
            <li><code>GET /get-config?id=xxx</code> - Get customer config</li>
            <li><code>POST /save-config?id=xxx</code> - Save customer config</li>
            <li><code>GET /list-configs</code> - List all customers</li>
          </ul>
        </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html", ...corsHeaders }
    });
  }
};

// ── Admin: List Gifts ───────────────────────────────────────
async function handleAdminListGifts(request, env, corsHeaders) {
  const authHeader = request.headers.get("Authorization");
  const secret = env.ADMIN_SECRET;

  if (!secret) {
    return new Response(JSON.stringify({ error: "ADMIN_SECRET not set" }), {
      status: 500,
      headers: corsHeaders
    });
  }
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ success: false, error: "Akses ditolak." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const list = await env.VALENTINE_DATA.list();
    const detailPromises = list.keys.map(async (keyObj) => {
      try {
        const { value: data } = await env.VALENTINE_DATA.getWithMetadata(keyObj.name);
        if (data) {
          const config = JSON.parse(data);
          return {
            giftId: keyObj.name,
            recipientName: config.recipientName || "Unknown",
            status: config.status || "unknown",
            publishedAt: config.publishedAt || config.createdAt || null,
            photosCount: config.photos?.length || 0,
            firstPhotoUrl: config.photos?.[0]?.url || null,
            hasVoice: !!(config.voiceNote?.url),
            theme: config.theme || "rose",
            ambient: config.ambient || "none",
          };
        }
      } catch (e) {
        return null;
      }
      return null;
    });

    const results = (await Promise.all(detailPromises)).filter((r) => r !== null);
    return new Response(JSON.stringify({ success: true, gifts: results }), {
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

// ── Admin: Delete Gifts ─────────────────────────────────────
async function handleAdminDeleteGifts(request, env, corsHeaders) {
  const authHeader = request.headers.get("Authorization");
  const secret = env.ADMIN_SECRET;

  if (!secret) {
    return new Response(JSON.stringify({ error: "ADMIN_SECRET not set" }), {
      status: 500,
      headers: corsHeaders
    });
  }
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ success: false, error: "Akses ditolak." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const { ids } = await request.json();
    if (!ids || !Array.isArray(ids)) {
      return new Response(JSON.stringify({ success: false, error: "Tentukan ID yang akan dihapus." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    await Promise.all(ids.map((id) => env.VALENTINE_DATA.delete(id)));
    return new Response(JSON.stringify({ success: true, message: `${ids.length} kado berhasil dihapus.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
__name(handleAdminDeleteGifts, "handleAdminDeleteGifts");

export { index_default as default };