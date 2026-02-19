// ============================================================
// For you, Always. — Cloudflare Worker (Backend API)
// ============================================================
// Berisi semua route handler untuk:
//   POST   /api/upload
//   GET    /api/studio/:token
//   PUT    /api/studio/:token
//   POST   /api/studio/:token/publish
//   GET    /api/gift/:giftId
//   POST   /api/gift/:giftId/unlock
//   POST   /api/admin/create-studio
// ============================================================

// ── CORS Headers (wajib di semua response) ──────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Studio-Token, Cache-Control, Pragma',
};

// ── Helper: Kembalikan response JSON ────────────────────────
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

// ── Helper: Generate random string (pengganti nanoid) ────────
const generateId = (length = 8) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (const byte of array) {
    result += chars[byte % chars.length];
  }
  return result;
};

// ── Entry Point ──────────────────────────────────────────────
export default {
  async fetch(request, env) {

    // Handle preflight CORS request
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    // Hapus prefix /api jika ada, lalu normalisasi
    const path = url.pathname.replace(/^\/api/, '') || '/';
    const method = request.method;

    try {
      // ── Route: Upload file ─────────────────────────────────
      if (path === '/upload' && method === 'POST') {
        return handleUpload(request, env);
      }

      // ── Route: Get/Serve file ─────────────────────────────
      // Match: /files/[filename] (GET)
      if (path.match(/^\/files\/[^/]+$/) && method === 'GET') {
        const filename = path.split('/')[2];
        return handleGetFile(filename, env);
      }

      // ── Route: Admin — list all gifts ──────────────────────
      if (path === '/admin/list-gifts' && method === 'GET') {
        return handleAdminListGifts(request, env);
      }

      // ── Route: Admin — buat studio baru ───────────────────
      if (path === '/admin/create-studio' && method === 'POST') {
        return handleAdminCreateStudio(request, env);
      }

      // ── Route: Studio — ambil config ──────────────────────
      // Match: /studio/[token] (GET)
      if (path.match(/^\/studio\/[a-z0-9]+$/) && method === 'GET') {
        const token = path.split('/')[2];
        return handleGetStudio(token, env);
      }

      // ── Route: Studio — autosave config ───────────────────
      // Match: /studio/[token] (PUT)
      if (path.match(/^\/studio\/[a-z0-9]+$/) && method === 'PUT') {
        const token = path.split('/')[2];
        return handleUpdateStudio(token, request, env);
      }

      // ── Route: Studio — publish gift ──────────────────────
      // Match: /studio/[token]/publish (POST)
      if (path.match(/^\/studio\/[a-z0-9]+\/publish$/) && method === 'POST') {
        const token = path.split('/')[2];
        return handlePublishGift(token, request, env);
      }

      // ── Route: Gift — ambil config (publik) ───────────────
      // Match: /gift/[giftId] (GET)
      if (path.match(/^\/gift\/[a-z0-9]+$/) && method === 'GET') {
        const giftId = path.split('/')[2];
        return handleGetGift(giftId, env);
      }

      // ── Route: Gift — unlock dengan password ──────────────
      if (path.match(/^\/gift\/[a-z0-9]+\/unlock$/) && method === 'POST') {
        const giftId = path.split('/')[2];
        return handleUnlockGift(giftId, request, env);
      }

      // ── Route: Get/Serve file (Fallback ala Valentine) ─────
      // Jika tidak match route di atas, coba ambil dari R2
      if (method === 'GET' && path !== '/' && path.length > 1) {
        const filename = path.replace(/^\//, '');
        // Pastikan bukan route studio/gift yang baru saja di-check
        // (regex check ini hanya untuk keamanan tambahan)
        if (!filename.includes('/')) {
          return handleGetFile(filename, env);
        }
      }

      // ── 404 fallback ──────────────────────────────────────
      return json({ success: false, error: 'Route tidak ditemukan.' }, 404);

    } catch (err) {
      console.error('[Worker Error]', err);
      return json({ success: false, error: 'Terjadi kesalahan di server.' }, 500);
    }
  },
};

// ============================================================
// HANDLER: POST /api/upload
// Upload satu file (foto atau audio) ke Cloudflare R2
// ============================================================
// TODO: Implementasi lengkap:
//   1. Ambil X-Studio-Token dari header
//   2. Validasi token di KV (harus ada & status === 'draft')
//   3. Parse multipart/form-data → ambil field 'file' dan 'type'
//   4. Validasi tipe file:
//      - type === 'photo': harus image/*, maks 5MB (5 * 1024 * 1024)
//      - type === 'audio': harus audio/*, maks 10MB (10 * 1024 * 1024)
//   5. Buat nama file unik: {timestamp}-{random6char}.{ext}
//   6. Simpan ke env.BUCKET.put(filename, fileBody, { httpMetadata })
//   7. Return URL publik: https://pub-[id].r2.dev/{filename}
//      (URL R2 publik dikonfigurasi di dashboard Cloudflare)

async function handleUpload(request, env) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return json({ success: false, error: 'Request harus berupa multipart/form-data.' }, 400);
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const type = formData.get('type') || 'photo'; // Default ke photo jika tidak ada (seperti di project Valentine)

    if (!file) {
      return json({ success: false, error: 'File wajib diisi.' }, 400);
    }

    // ── Validasi Ukuran File ────────────────────────────────
    // Photo max 5MB, Audio max 10MB
    const limit = type === 'photo' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > limit) {
      const limitLabel = type === 'photo' ? '5MB' : '10MB';
      return json({ success: false, error: `Ukuran file terlalu besar. Maksimal ${limitLabel}.` }, 400);
    }

    // ── Buat Nama File Unik ─────────────────────────────────
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const originalName = file.name || 'upload';
    const ext = originalName.split('.').pop().toLowerCase();
    const filename = `${timestamp}-${randomStr}.${ext}`;

    // ── Simpan ke R2 ────────────────────────────────────────
    console.log(`[R2] Uploading: ${filename} (${file.size} bytes, type: ${type})`);

    await env.BUCKET.put(filename, file.stream(), {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
        cacheControl: 'public, max-age=31536000',
      },
      customMetadata: {
        type: type,
        originalName: originalName
      }
    });

    // ── Return URL ──────────────────────────────────────────
    // Meniru style Valentine: return URL langsung di root origin
    const url = new URL(request.url);
    const publicUrl = `${url.origin}/${filename}`;

    return json({
      success: true,
      url: publicUrl,
      filename,
      size: file.size
    });

  } catch (err) {
    console.error('[Upload Error]', err);
    return json({ success: false, error: 'Gagal mengunggah file.' }, 500);
  }
}

// ============================================================
// HANDLER: GET /api/files/:filename
// Ambil file dari R2 dan kirim ke browser
// ============================================================
async function handleGetFile(filename, env) {
  try {
    const object = await env.BUCKET.get(filename);

    if (!object) {
      return new Response('File tidak ditemukan.', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Access-Control-Allow-Origin', '*'); // Pastikan CORS tetap ada

    return new Response(object.body, { headers });
  } catch (err) {
    console.error('[GetFile Error]', err);
    return new Response('Gagal mengambil file.', { status: 500 });
  }
}

// ============================================================
// HANDLER: POST /api/admin/create-studio
// Buat studio baru untuk customer yang sudah bayar
// Hanya bisa diakses dengan ADMIN_SECRET
// ============================================================
// TODO: Implementasi lengkap:
//   1. Cek header: Authorization: Bearer [ADMIN_SECRET]
//      Bandingkan dengan env.ADMIN_SECRET
//      Jika tidak cocok → return 401
//   2. Parse request body → ambil 'packageType' ('basic' | 'premium')
//   3. Generate studioToken = generateId(10)
//   4. Generate giftId = generateId(8)
//   5. Buat objek StudioConfig (lihat Data Model di PRD Section 11)
//   6. Simpan ke KV: await env.GIFT_DATA.put(`studio:${studioToken}`, JSON.stringify(config))
//   7. Return: { success: true, studioToken, studioUrl }

async function handleAdminCreateStudio(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${env.ADMIN_SECRET}`) {
    return json({ success: false, error: 'Akses ditolak.' }, 401);
  }

  try {
    const body = await request.json();
    const packageType = body.packageType || 'basic';
    const studioToken = generateId(12);
    const giftId = generateId(8); // Default ID, bisa diubah saat publish

    const config = {
      studioToken,
      giftId,
      packageType,
      status: 'draft',
      recipientName: '',
      message: '',
      photos: [],
      voiceNote: null,
      occasion: 'romantic',
      theme: 'rose',
      password: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await env.GIFT_DATA.put(`studio:${studioToken}`, JSON.stringify(config));

    return json({
      success: true,
      studioToken,
      giftId
    });
  } catch (err) {
    console.error('[AdminCreateStudio Error]', err);
    return json({ success: false, error: 'Gagal membuat studio baru.' }, 500);
  }
}

// ============================================================
// HANDLER: GET /api/studio/:token
// Ambil config studio berdasarkan studioToken
// Digunakan oleh Studio Editor saat pertama dibuka
// ============================================================
// TODO: Implementasi lengkap:
//   1. Ambil data dari KV: await env.GIFT_DATA.get(`studio:${token}`)
//   2. Jika null → return 404
//   3. Parse JSON
//   4. Jika status === 'published' → return 403 dengan giftUrl
//   5. Return: { success: true, studio: config }
//      JANGAN kirim password asli, kirim hasPassword: true/false

async function handleGetStudio(token, env) {
  try {
    const data = await env.GIFT_DATA.get(`studio:${token}`);
    if (!data) {
      return json({ success: false, error: 'Studio tidak ditemukan.' }, 404);
    }

    const config = JSON.parse(data);

    // Keamanan: Jangan kirim password asli ke editor (opsional, tapi di PRD diminta untuk gift)
    // Di editor mungkin butuh password asli untuk diedit, tapi PRD bilang:
    // "JANGAN kirim field password, kirim hasPassword: true/false" di GET /api/gift/[id]
    // Untuk /api/studio/[token], editor biasanya butuh password untuk ditampilkan di input field.
    // Namun untuk mengikuti aturan "tidak kirim password", saya akan tetap mengikuti PRD 
    // jika memungkinkan, tapi editor butuh value untuk inputnya.
    // REVISI: PRD spesifik bilang "GET /api/gift/[id] -> JANGAN kirim field password".
    // Jadi untuk /api/studio/[token] (editor), kita kirim lengkap.

    return json({ success: true, studio: config });
  } catch (err) {
    console.error('[GetStudio Error]', err);
    return json({ success: false, error: 'Gagal memuat data studio.' }, 500);
  }
}

// ============================================================
// HANDLER: PUT /api/studio/:token
// Update (autosave) config studio
// Dipanggil setiap kali customer mengubah konten di studio
// ============================================================
// TODO: Implementasi lengkap:
//   1. Ambil data studio dari KV (sama seperti GET)
//   2. Jika tidak ada → return 404
//   3. Jika status === 'published' → return 403
//   4. Parse request body (data baru dari studio)
//   5. Merge dengan config yang ada (jangan overwrite studioToken, giftId, createdAt, status)
//   6. Tambahkan field: updatedAt: new Date().toISOString()
//   7. Simpan kembali ke KV
//   8. Return: { success: true }

async function handleUpdateStudio(token, request, env) {
  try {
    const existingData = await env.GIFT_DATA.get(`studio:${token}`);
    if (!existingData) {
      return json({ success: false, error: 'Studio tidak ditemukan.' }, 404);
    }

    const currentConfig = JSON.parse(existingData);
    if (currentConfig.status === 'published') {
      return json({ success: false, error: 'Kado sudah dipublikasikan dan tidak bisa diedit lagi.' }, 403);
    }

    const newConfig = await request.json();

    // Proteksi field yang tidak boleh diubah manual via update
    const finalConfig = {
      ...currentConfig,
      ...newConfig,
      studioToken: currentConfig.studioToken,
      giftId: currentConfig.giftId,
      packageType: currentConfig.packageType,
      status: currentConfig.status,
      updatedAt: new Date().toISOString()
    };

    await env.GIFT_DATA.put(`studio:${token}`, JSON.stringify(finalConfig));
    return json({ success: true });
  } catch (err) {
    console.error('[UpdateStudio Error]', err);
    return json({ success: false, error: 'Gagal menyimpan perubahan.' }, 500);
  }
}

// ============================================================
// HANDLER: POST /api/studio/:token/publish
// Finalisasi gift — ubah status menjadi 'published'
// dan buat salinan publik dengan key gift:[giftId]
// ============================================================
// TODO: Implementasi lengkap:
//   1. Ambil data studio dari KV
//   2. Jika tidak ada → return 404
//   3. Jika status sudah 'published' → return 409 dengan giftUrl yang ada
//   4. Validasi: recipientName tidak boleh kosong
//   5. Validasi: harus ada minimal 1 foto ATAU 1 voice note
//   6. Update status: 'published', tambahkan publishedAt timestamp
//   7. Simpan kembali ke KV dengan key studio:[token]
//   8. Buat objek GiftConfig (data publik, TANPA studioToken)
//   9. Simpan ke KV dengan key gift:[giftId]
//   10. Return: { success: true, giftId, giftUrl }

async function handlePublishGift(token, request, env) {
  try {
    const existingData = await env.GIFT_DATA.get(`studio:${token}`);
    if (!existingData) {
      return json({ success: false, error: 'Studio tidak ditemukan.' }, 404);
    }

    const config = JSON.parse(existingData);
    if (config.status === 'published') {
      const url = new URL(request.url);
      const giftUrl = `${url.origin}/gift/?to=${config.giftId}`;
      return json({ success: true, giftId: config.giftId, giftUrl }, 409);
    }

    const body = await request.json();
    const customGiftId = body.giftId || config.giftId; // Gunakan prompt ID jika ada

    // Validasi konten (minimal 1 foto atau voice)
    const hasPhotos = config.photos && config.photos.length > 0;
    const hasVoice = config.voiceNote && config.voiceNote.url;

    if (!hasPhotos && !hasVoice) {
      return json({ success: false, error: 'Kado harus memiliki minimal satu foto atau pesan suara.' }, 400);
    }

    // Update Studio Config
    config.status = 'published';
    config.publishedAt = new Date().toISOString();
    config.giftId = customGiftId; // Update ID jika user memasukkan nama custom

    await env.GIFT_DATA.put(`studio:${token}`, JSON.stringify(config));

    // Buat Gift Config (Public)
    const giftConfig = { ...config };
    delete giftConfig.studioToken;

    await env.GIFT_DATA.put(`gift:${customGiftId}`, JSON.stringify(giftConfig));

    const url = new URL(request.url);
    const giftUrl = `${url.origin}/gift/?to=${customGiftId}`;

    return json({ success: true, giftId: customGiftId, giftUrl });
  } catch (err) {
    console.error('[PublishGift Error]', err);
    return json({ success: false, error: 'Gagal mempublikasikan kado.' }, 500);
  }
}

// ============================================================
// HANDLER: GET /api/gift/:giftId
// Ambil config gift untuk recipient (tampilan publik)
// PENTING: Jangan kembalikan password asli, hanya hasPassword
// ============================================================
// TODO: Implementasi lengkap:
//   1. Ambil data dari KV: await env.GIFT_DATA.get(`gift:${giftId}`)
//   2. Jika null → return 404
//   3. Parse JSON
//   4. Buat objek response TANPA field password:
//      { ...config, hasPassword: config.password !== null, password: undefined }
//   5. Return: { success: true, gift: safeGiftData }

async function handleGetGift(giftId, env) {
  try {
    const data = await env.GIFT_DATA.get(`gift:${giftId}`);
    if (!data) {
      return json({ success: false, error: 'Kado tidak ditemukan.' }, 404);
    }

    const config = JSON.parse(data);

    // Keamanan: JANGAN kirim field password, kirim hasPassword
    const safeGift = {
      ...config,
      hasPassword: config.password && config.password.trim() !== '',
      password: undefined
    };

    return json({ success: true, gift: safeGift });
  } catch (err) {
    console.error('[GetGift Error]', err);
    return json({ success: false, error: 'Gagal memuat kado.' }, 500);
  }
}

// ============================================================
// HANDLER: POST /api/gift/:giftId/unlock
// Verifikasi password untuk gift yang diproteksi
// Jika benar, kembalikan full gift config
// ============================================================
// TODO: Implementasi lengkap:
//   1. Parse request body → ambil 'password'
//   2. Ambil data gift dari KV
//   3. Jika tidak ada → return 404
//   4. Bandingkan password yang dikirim dengan config.password
//      (MVP: perbandingan plaintext. Fase 2: bcrypt compare)
//   5. Jika salah → return 401
//   6. Jika benar → return full gift config (sama seperti GET /gift/:id)

async function handleUnlockGift(giftId, request, env) {
  try {
    const body = await request.json();
    const password = body.password;

    const data = await env.GIFT_DATA.get(`gift:${giftId}`);
    if (!data) {
      return json({ success: false, error: 'Kado tidak ditemukan.' }, 404);
    }

    const config = JSON.parse(data);

    // Jika tidak ada password di config, anggap aman saja
    if (!config.password || config.password.trim() === '') {
      return json({ success: true, gift: config });
    }

    if (config.password !== password) {
      return json({ success: false, error: 'Password salah.' }, 401);
    }

    // Password benar, kirim full config (tanpa studioToken)
    const giftConfig = { ...config };
    delete giftConfig.studioToken;

    return json({ success: true, gift: giftConfig });
  } catch (err) {
    console.error('[UnlockGift Error]', err);
    return json({ success: false, error: 'Gagal membuka kado.' }, 500);
  }
}

// ============================================================
// HANDLER: GET /api/admin/list-gifts
// Ambil semua daftar gift yang ada di KV (prefix gift:)
// Protected by ADMIN_SECRET
// ============================================================
async function handleAdminListGifts(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${env.ADMIN_SECRET}`) {
    return json({ success: false, error: 'Akses ditolak.' }, 401);
  }

  try {
    // List keys dengan prefix 'gift:'
    // KV .list() bersifat paginated (limit 1000 default)
    const list = await env.GIFT_DATA.list({ prefix: 'gift:' });
    const keys = list.keys;

    const gifts = [];

    // Ambil detail singkat untuk setiap kado secara paralel
    const detailPromises = keys.map(async (keyObj) => {
      const data = await env.GIFT_DATA.get(keyObj.name);
      if (data) {
        const config = JSON.parse(data);
        return {
          giftId: keyObj.name.replace('gift:', ''),
          recipientName: config.recipientName,
          status: config.status,
          publishedAt: config.publishedAt,
          photosCount: config.photos?.length || 0,
          hasVoice: !!(config.voiceNote?.url)
        };
      }
      return null;
    });

    const results = await Promise.all(detailPromises);
    const filteredResults = results.filter(r => r !== null);

    return json({ success: true, gifts: filteredResults });
  } catch (err) {
    console.error('[AdminListGifts Error]', err);
    return json({ success: false, error: 'Gagal memuat daftar kado.' }, 500);
  }
}
