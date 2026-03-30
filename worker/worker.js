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

    // ── SECURITY: Origin Validation Helper ────────────────────
    // Mengizinkan request HANYA dari domain resmi atau *.vercel.app
    // (untuk kado premium yang di-deploy di domain unik customer)
    const isAllowedOrigin = (req) => {
      const origin = req.headers.get("Origin") || "";
      const allowed = [
        "https://arcade.for-you-always.my.id",
        "https://for-you-always.my.id",
        "https://voice.for-you-always.my.id",
        "https://valentine-site-sigma.vercel.app",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:5501",
        "http://127.0.0.1:5501",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
      ];
      // Izinkan semua *.vercel.app untuk kado premium customer
      if (origin.endsWith(".vercel.app")) return true;
      return allowed.includes(origin);
    };

    const url = new URL(request.url);

    // ── POST /upload ────────────────────────────────────────
    if (request.method === "POST" && url.pathname === "/upload") {
      // FIX 5: Hanya izinkan upload dari domain resmi
      if (!isAllowedOrigin(request)) {
        return new Response(JSON.stringify({ error: "Akses ditolak." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
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
    if (request.method === 'POST' && url.pathname === '/presign') {
      // FIX 5: Hanya izinkan presign dari domain resmi
      if (!isAllowedOrigin(request)) {
        return new Response(JSON.stringify({ error: "Akses ditolak." }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
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
      // FIX 5: Hanya izinkan direct upload dari domain resmi
      if (!isAllowedOrigin(request)) {
        return new Response(JSON.stringify({ error: "Akses ditolak." }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      try {
        const key = url.pathname.replace('/upload-direct/', '');
        if (!key || key.includes('..') || key.includes('/')) {
          return new Response(JSON.stringify({ error: 'Invalid key' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

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
      // FIX 2: Hanya izinkan dari domain resmi atau *.vercel.app (kado premium)
      // JALUR PINTAS BROWSER: Abaikan pengecekan Origin jika membawa ?pwd= rahasia Admin
      const pwd = url.searchParams.get("pwd");
      const isOwnerBypass = pwd && env.ADMIN_SECRET && (pwd === env.ADMIN_SECRET);

      if (!isOwnerBypass && !isAllowedOrigin(request)) {
        return new Response(JSON.stringify({ error: "Akses ditolak." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
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
      // FIX 3: Hanya izinkan dari domain resmi atau *.vercel.app
      if (!isAllowedOrigin(request)) {
        return new Response(JSON.stringify({ error: "Akses ditolak." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
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
      // FIX 1: Wajib pakai ADMIN_SECRET
      // JALUR PINTAS BROWSER: Bisa menggunakan Header Authorization ATAU ?pwd= di URL
      const authHeader = request.headers.get("Authorization");
      const pwd = url.searchParams.get("pwd");
      const secret = env.ADMIN_SECRET;
      
      const isAuthenticated = secret && (authHeader === `Bearer ${secret}` || pwd === secret);

      if (!isAuthenticated) {
        return new Response(JSON.stringify({ success: false, error: "Akses ditolak." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
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
      // FIX 4: Wajib pakai ADMIN_SECRET. Jika salah, tampilkan 404
      // JALUR PINTAS BROWSER: Bisa menggunakan Header Authorization ATAU ?pwd= di URL
      const authHeader = request.headers.get("Authorization");
      const pwd = url.searchParams.get("pwd");
      const secret = env.ADMIN_SECRET;
      
      const isAuthenticated = secret && (authHeader === `Bearer ${secret}` || pwd === secret);

      if (!isAuthenticated) {
        return new Response("Not found", { status: 404, headers: corsHeaders });
      }
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

    // ═══════════════════════════════════════════════════════════
    // ── BUNDLE SYSTEM ──────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    // ── POST /api/bundle/create-token  (Admin Only) ──────────
    if (request.method === "POST" && url.pathname === "/api/bundle/create-token") {
      try {
        const authHeader = request.headers.get("Authorization");
        const secret = env.GENERATOR_SECRET;
        if (!secret || authHeader !== `Bearer ${secret}`) {
          return new Response(JSON.stringify({ success: false, error: "Akses ditolak." }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const body = await request.json();
        const limit = parseInt(body.limit || 5);
        const note  = body.note || "";

        // Generate unique token: BNDL-XXXX (random 6 chars)
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let code = "BNDL-";
        for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];

        const tokenKey = `bundle_token:${code}`;

        // Make sure it's unique (very unlikely collision but check anyway)
        const existing = await env.VALENTINE_DATA.get(tokenKey);
        if (existing) {
          return new Response(JSON.stringify({ success: false, error: "Coba lagi, token collision." }), {
            status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const tokenData = {
          token: code,
          max_limit: limit,
          used: 0,
          created_gifts: [],
          note,
          created_at: new Date().toISOString()
        };

        await env.VALENTINE_DATA.put(tokenKey, JSON.stringify(tokenData));

        return new Response(JSON.stringify({ success: true, token: code, data: tokenData }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ── GET /api/bundle/admin/list  (Admin Master Ledger) ────
    if (request.method === "GET" && url.pathname === "/api/bundle/admin/list") {
      try {
        const authHeader = request.headers.get("Authorization");
        const secret = env.ADMIN_SECRET;
        if (!secret || authHeader !== `Bearer ${secret}`) {
          return new Response(JSON.stringify({ success: false, error: "Akses ditolak." }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const list = await env.VALENTINE_DATA.list({ prefix: "bundle_token:" });
        const tokens = [];

        for (const keyObj of list.keys) {
          const raw = await env.VALENTINE_DATA.get(keyObj.name);
          if (raw) {
            try {
              tokens.push(JSON.parse(raw));
            } catch(e) {}
          }
        }

        // Urutkan dari yang terbaru dibuat ke yang paling lama (menurun)
        tokens.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        tokens.reverse();

        return new Response(JSON.stringify({ success: true, tokens }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ── POST /api/bundle/admin/delete-gift  (Admin Revoke/Reset) ──
    if (request.method === "POST" && url.pathname === "/api/bundle/admin/delete-gift") {
      try {
        const authHeader = request.headers.get("Authorization");
        const secret = env.ADMIN_SECRET;
        if (!secret || authHeader !== `Bearer ${secret}`) {
          return new Response(JSON.stringify({ success: false, error: "Akses ditolak." }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const { token, giftId } = await request.json();
        if (!token || !giftId) {
          return new Response(JSON.stringify({ success: false, error: "Token dan giftId wajib disertakan." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const tokenKey = `bundle_token:${token.trim().toUpperCase()}`;
        const rawToken = await env.VALENTINE_DATA.get(tokenKey);

        if (!rawToken) {
          return new Response(JSON.stringify({ success: false, error: "Token tidak ditemukan." }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const tokenData = JSON.parse(rawToken);

        // Hapus dari daftar created_gifts jika ada, dan kembalikan kuota
        const giftIndex = (tokenData.created_gifts || []).indexOf(giftId);
        if (giftIndex !== -1) {
          tokenData.created_gifts.splice(giftIndex, 1);
          tokenData.used = Math.max(0, tokenData.used - 1); // kembalikan kuota
          await env.VALENTINE_DATA.put(tokenKey, JSON.stringify(tokenData));
        }

        // Hapus kado secara permanen dari database
        await env.VALENTINE_DATA.delete(giftId);

        return new Response(JSON.stringify({ success: true, message: `Kado dihapus dan kuota dikembalikan.` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ── POST /api/bundle/login  (Customer) ───────────────────
    if (request.method === "POST" && url.pathname === "/api/bundle/login") {
      try {
        const { token } = await request.json();
        if (!token) {
          return new Response(JSON.stringify({ success: false, error: "Token wajib diisi." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const tokenKey = `bundle_token:${token.trim().toUpperCase()}`;
        const raw = await env.VALENTINE_DATA.get(tokenKey);

        if (!raw) {
          return new Response(JSON.stringify({ success: false, error: "Token tidak ditemukan. Periksa kembali kode Anda." }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const data = JSON.parse(raw);

        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ── GET /api/bundle/check-name  (Public availability check) ──
    if (request.method === "GET" && url.pathname === "/api/bundle/check-name") {
      try {
        const name = url.searchParams.get("name")?.toLowerCase().trim();
        if (!name || name.length < 2) {
          return new Response(JSON.stringify({ available: false, error: "Nama terlalu pendek." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Validate slug: only lowercase letters, numbers, hyphens
        if (!/^[a-z0-9][a-z0-9\-]*[a-z0-9]$/.test(name)) {
          return new Response(JSON.stringify({ available: false, error: "Nama hanya boleh huruf kecil, angka, dan strip." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Block reserved names
        const reserved = ["studio", "gift", "gift-beige", "gift-blanc", "gift-pinky", "gift-sage", "bundle", "generator", "camera", "admin", "api", "index"];
        if (reserved.includes(name)) {
          return new Response(JSON.stringify({ available: false, error: "Nama ini adalah nama sistem dan tidak bisa digunakan." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Check if gift ID already exists in KV
        const existing = await env.VALENTINE_DATA.get(name);
        return new Response(JSON.stringify({ available: !existing }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ available: false, error: err.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ── POST /api/bundle/claim-link  (Cut quota + reserve gift ID) ──
    if (request.method === "POST" && url.pathname === "/api/bundle/claim-link") {
      try {
        const body = await request.json();
        const { token, giftId } = body;

        if (!token || !giftId) {
          return new Response(JSON.stringify({ success: false, error: "Token dan giftId wajib diisi." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const cleanId  = giftId.toLowerCase().trim();
        const tokenKey = `bundle_token:${token.trim().toUpperCase()}`;

        // Validate slug
        if (!/^[a-z0-9][a-z0-9\-]*[a-z0-9]$/.test(cleanId) || cleanId.length < 2) {
          return new Response(JSON.stringify({ success: false, error: "Nama link tidak valid." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Load token record
        const rawToken = await env.VALENTINE_DATA.get(tokenKey);
        if (!rawToken) {
          return new Response(JSON.stringify({ success: false, error: "Token tidak valid." }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const tokenData = JSON.parse(rawToken);

        // Check quota
        if (tokenData.used >= tokenData.max_limit) {
          return new Response(JSON.stringify({ success: false, error: "Kuota kado Anda sudah habis." }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // CRITICAL: Check gift ID availability (atomic-ish — best effort on KV)
        const existingGift = await env.VALENTINE_DATA.get(cleanId);
        if (existingGift) {
          return new Response(JSON.stringify({ success: false, error: `Nama "${cleanId}" sudah dipakai orang lain. Silakan pilih nama lain.` }), {
            status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Reserve the gift ID with an empty shell (prevent race conditions)
        const emptyGift = {
          recipientName: "",
          status: "draft",
          photos: [],
          createdAt: new Date().toISOString(),
          _bundle: token.trim().toUpperCase(),
          _meta: { theme: "classic", theme_folder: "gift" }
        };
        await env.VALENTINE_DATA.put(cleanId, JSON.stringify(emptyGift));

        // Deduct quota from token record
        tokenData.used += 1;
        tokenData.created_gifts = tokenData.created_gifts || [];
        tokenData.created_gifts.push(cleanId);
        await env.VALENTINE_DATA.put(tokenKey, JSON.stringify(tokenData));

        return new Response(JSON.stringify({ success: true, giftId: cleanId, data: tokenData }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ── POST /submit-premium — Terima order premium, kirim notif ke Telegram ─
    if (request.method === "POST" && url.pathname === "/submit-premium") {
      try {
        const body = await request.json();

        // Strip field internal (tidak perlu di config.js)
        const { id, studioPassword, requestDomain, ...configData } = body;

        // Validasi minimal
        if (!id) {
          return new Response(JSON.stringify({ error: "Missing 'id' parameter." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
        const CHAT_ID = env.TELEGRAM_CHAT_ID;

        if (!BOT_TOKEN || !CHAT_ID) {
          console.error("[submit-premium] TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum dikonfigurasi.");
          return new Response(JSON.stringify({ error: "Telegram belum dikonfigurasi di server." }), {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const TG_URL = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

        const timestamp = new Date().toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          dateStyle: 'short',
          timeStyle: 'short'
        });

        // ── Pesan 1: Ringkasan Order ──
        const msg1 =
          `🎁 <b>ORDER VOICES PREMIUM BARU</b>\n\n` +
          `👤 Penerima: <b>${configData.recipientName || '-'}</b>\n` +
          `🎨 Tema: ${configData.theme || '-'} → folder: <code>${configData._meta?.theme_folder || 'gift'}</code>\n` +
          `🔑 Gift ID: <code>${id}</code>\n` +
          `🌐 Request Domain: <code>${requestDomain || '-'}</code>\n` +
          `🕐 Waktu: ${timestamp} WIB\n\n` +
          `📸 Foto: ${configData.photos?.length || 0} foto\n` +
          `🎵 Voice Note: ${configData.voiceNote?.url ? 'Ada ✅' : 'Tidak ada ❌'}\n` +
          `🎼 Ambient: ${configData.ambient || 'none'}\n` +
          `🔒 Password: <b>${configData.password || '(Tanpa Password)'}</b>\n` +
          `💡 Hint: <i>${configData.passwordHint || '-'}</i>\n\n` +
          `─────────────────\nCek pesan berikutnya untuk config.js`;

        await fetch(TG_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: CHAT_ID, text: msg1, parse_mode: 'HTML' })
        });

        // ── Pesan 2: Kirim config.js sebagai file download ──
        const configContent = `window.STANDALONE_CONFIG = ${JSON.stringify(configData, null, 2)};`;
        const fileName = `config-${id}.js`;
        const fileCaption = `📋 config.js untuk ${id}\n🌐 Domain: ${requestDomain || '-'}.vercel.app\nTaruh di folder: ${configData._meta?.theme_folder || 'gift'}/\nRename jadi config.js lalu deploy ke Vercel.`;

        const formData = new FormData();
        formData.append('chat_id', CHAT_ID);
        formData.append('caption', fileCaption);
        formData.append('document', new Blob([configContent], { type: 'text/javascript' }), fileName);

        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
          method: 'POST',
          body: formData
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      } catch (error) {
        console.error("[submit-premium] Error:", error);
        return new Response(JSON.stringify({ error: error.message || "Gagal memproses order premium." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ── POST /generate-ai — Proxy aman ke Qwen AI API (Migrated from Gemini) ─
    if (request.method === "POST" && url.pathname === "/generate-ai") {
      try {
        const apiKey = env.QWEN_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "QWEN_API_KEY belum dikonfigurasi di Cloudflare Secrets." }), {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const body = await request.json();
        const userPrompt = body.prompt;
        const requestedTone = body.tone || 'romantis';

        if (!userPrompt || typeof userPrompt !== "string" || userPrompt.trim().length === 0) {
          return new Response(JSON.stringify({ error: "Prompt tidak boleh kosong." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

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

        const qwenPayload = {
          model: "qwen-plus",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: `[INSTRUKSI/TEMA DARI PENGGUNA:]\n${userPrompt.trim()}` }
          ],
          temperature: 0.85,
          top_p: 0.95
        };

        // Tambahkan timeout protection (20 detik)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const qwenResponse = await fetch(
          "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(qwenPayload),
            signal: controller.signal
          }
        );

        clearTimeout(timeoutId);

        if (!qwenResponse.ok) {
          const errText = await qwenResponse.text();
          console.error("[Qwen API Error]", qwenResponse.status, errText);
          return new Response(JSON.stringify({ error: `Qwen AI (Status ${qwenResponse.status}): ${errText.substring(0, 150)}` }), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const qwenData = await qwenResponse.json();
        const generatedText = qwenData?.choices?.[0]?.message?.content || "";

        return new Response(JSON.stringify({ success: true, text: generatedText.trim() }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      } catch (error) {
        console.error("[generate-ai] Error:", error);
        return new Response(JSON.stringify({ error: error.name === 'AbortError' ? "AI terlalu lama merespons. Coba lagi sebentar lagi." : (error.message || "Gagal menghubungi AI.") }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

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
          headers.set("Cache-Control", "public, max-age=3600");

          return new Response(object.body, { headers });
        } catch (e) {
          return new Response("Error fetching file", { status: 500, headers: corsHeaders });
        }
      }
      return new Response("File not found", { status: 404, headers: corsHeaders });
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
            theme: config.theme || config._meta?.theme_folder || "rose",
            ambient: config.ambient || "none",
            musicMode: config.musicMode || "upload",
            uplMusicTitle: config.uplMusicTitle || null,
            libMusicTitle: config.libMusicTitle || null,
            customAmbientUrl: config.customAmbientUrl || null,
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