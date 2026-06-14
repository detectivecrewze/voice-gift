import re

with open('bundle/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

new_css = """        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
            --bg-primary: #fff5f8;
            --pink-light: #fef0f4;
            --lilac-light: #f5eeff;
            --pink-accent: #e8789a;
            --pink-accent-dark: #c85070;
            --rosewood: #8a3050;
            --white-glass: rgba(255, 255, 255, 0.7);
            --black: #333;
            --gray-text: #888;
            --green-soft: #22c55e;
            --red-soft: #ef4444;
        }

        body {
            font-family: 'Inter', sans-serif;
            background: radial-gradient(ellipse at 50% 30%, var(--bg-primary) 0%, var(--pink-light) 50%, var(--lilac-light) 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 2rem 1rem;
            position: relative;
            overflow-x: hidden;
            color: var(--black);
        }

        .ambient-blobs { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
        .blob-1 { position: absolute; width: 24rem; height: 24rem; border-radius: 50%; opacity: 0.2; background: #f4b8ce; top: -10%; left: -15%; filter: blur(80px); }
        .blob-2 { position: absolute; width: 16rem; height: 16rem; border-radius: 50%; opacity: 0.15; background: #b8c8f4; bottom: 0%; right: -10%; filter: blur(60px); }

        .container { width: 100%; max-width: 440px; position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; margin-top: 1rem; }

        .header { text-align: center; margin-bottom: 0.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
        .header-icon { width: 3rem; height: 3rem; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f9c8d8, #e8789a); box-shadow: 0 10px 25px rgba(232,120,154,0.3); color: white; }
        .header p.sup-title { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: var(--pink-accent); margin:0; }
        .header h1 { font-size: 2.2rem; font-weight: 700; color: var(--rosewood); line-height: 1.1; letter-spacing: -0.03em; }

        .panel { width: 100%; background: var(--white-glass); backdrop-filter: blur(16px); border: 1px solid rgba(232,120,154,0.15); box-shadow: 0 16px 40px rgba(232,120,154,0.08), 0 4px 12px rgba(232,120,154,0.04); border-radius: 24px; padding: 2.5rem 2rem; position: relative; overflow: hidden; }
        .panel-title { font-size: 1.3rem; font-weight: 700; color: var(--rosewood); margin-bottom: 0.5rem; letter-spacing:-0.02em; }
        .panel-subtitle { font-size: 0.8rem; color: var(--gray-text); margin-bottom: 1.8rem; line-height: 1.6; }

        .input-group { margin-bottom: 1.5rem; }
        .label { display: block; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: var(--pink-accent-dark); margin-bottom: 0.6rem; }
        .input-field { width: 100%; background: white; border: 1px solid rgba(232,120,154,0.3); border-radius: 12px; padding: 0.85rem 1rem; font-family: 'Inter', sans-serif; font-size: 0.95rem; color: var(--black); transition: all 0.3s ease; outline: none; text-align: center; font-weight: 500; }
        .input-field:focus { border-color: var(--pink-accent); box-shadow: 0 0 0 4px rgba(232,120,154,0.1); }
        .input-field::placeholder { color: #ccc; font-weight: 400; }

        .url-preview { display: flex; align-items: center; background: white; border: 1px solid rgba(232,120,154,0.3); border-radius: 12px; padding: 0 1rem; transition: all 0.3s ease; }
        .url-preview:focus-within { border-color: var(--pink-accent); box-shadow: 0 0 0 4px rgba(232,120,154,0.1); }
        .url-prefix { font-size: 0.75rem; color: #a0a0a0; padding: 0.85rem 0; font-weight: 500; }
        .url-input { flex: 1; background: transparent; border: none; padding: 0.85rem 0; font-family: 'Inter', sans-serif; font-size: 0.85rem; color: var(--black); font-weight: 600; outline: none; min-width: 0; }
        .url-input::placeholder { color: #ccc; font-weight: 400; }

        .btn { width: 100%; padding: 1rem 1.5rem; border: none; border-radius: 16px; font-family: 'Inter', sans-serif; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; transition: all 0.2s ease; position: relative; }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; box-shadow: none !important; }
        .btn-gold { background: linear-gradient(135deg, var(--pink-accent), var(--pink-accent-dark)); color: white; box-shadow: 0 8px 24px rgba(232,120,154,0.3); }
        .btn-gold:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(232,120,154,0.4); }
        .btn-gold:not(:disabled):active { transform: translateY(1px); }
        .btn-dark { background: var(--rosewood); color: white; box-shadow: 0 8px 24px rgba(138,48,80,0.25); }
        .btn-dark:not(:disabled):hover { transform: translateY(-2px); background: #702640; box-shadow: 0 12px 28px rgba(138,48,80,0.3); }
        .btn-outline { background: white; color: var(--pink-accent-dark); border: 1px solid rgba(232,120,154,0.3); }
        .btn-outline:not(:disabled):hover { background: #fff5f8; border-color: var(--pink-accent); }

        .alert { padding: 0.85rem 1rem; border-radius: 12px; font-size: 0.75rem; line-height: 1.5; margin-top: 1rem; font-weight: 500; }
        .alert-error { background: #fef2f2; color: #c53030; border: 1px solid #fee2e2; }
        .alert-success { background: #f0fdf4; color: #166534; border: 1px solid #dcfce7; }
        .hidden { display: none !important; }

        .quota-badge { display: inline-flex; justify-content: center; align-items: center; padding: 0.6rem 1.5rem; background: rgba(255,255,255,0.6); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,1); border-radius: 99px; box-shadow: 0 4px 12px rgba(232,120,154,0.05); margin: 0 auto 1.5rem; }
        .quota-text { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--pink-accent-dark); }
        .quota-text span { color: #a0a0a0; font-weight: 600; }

        .gift-list { list-style: none; display: flex; flex-direction: column; gap: 0.85rem; margin-top: 1rem; }
        .gift-item { display: flex; align-items: center; justify-content: space-between; background: white; border-radius: 16px; padding: 1rem 1.25rem; gap: 1rem; box-shadow: 0 4px 12px rgba(232,120,154,0.04); border: 1px solid rgba(232,120,154,0.1); transition: transform 0.2s; }
        .gift-item:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(232,120,154,0.08); }
        .gift-icon { width: 2.5rem; height: 2.5rem; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f9c8d8, #e8789a); flex-shrink: 0; color: white; }
        .gift-item-left { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; flex: 1; }
        .gift-item-name { font-size: 0.9rem; font-weight: 700; color: var(--rosewood); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .gift-item-status { font-size: 0.65rem; color: var(--green-soft); font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
        
        .gift-actions { display: flex; gap: 0.5rem; }
        .btn-view { padding: 0.5rem 0.85rem; border-radius: 10px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; text-decoration: none; background: #fff0f4; color: var(--pink-accent-dark); transition: all 0.2s; }
        .btn-view:hover { background: #ffe4eb; }
        .empty-list { text-align: center; padding: 2rem 0; color: #a0a0a0; font-size: 0.8rem; font-style: italic; }

        .section-title { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--pink-accent-dark); margin-bottom: 0.5rem; text-align: center; display: block; width: 100%; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; opacity: 1; transition: opacity 0.3s ease; }
        .modal-overlay.hidden { opacity: 0; pointer-events: none; }
        .modal-content { max-width: 380px; padding: 2.5rem 2rem; border-radius: 24px; background: var(--white-glass); border: 1px solid rgba(255,255,255,0.8); }
        .flex-gap { display: flex; gap: 0.75rem; width: 100%; }
        .flex-1 { flex: 1; }

        .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.4); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; vertical-align: middle; margin-right: 0.4rem; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .avail-indicator { display: flex; align-items: center; gap: 0.4rem; font-size: 0.7rem; margin-top: 0.5rem; font-weight: 600; }
        .avail-dot { width: 8px; height: 8px; border-radius: 50%; }
        .avail-ok .avail-dot { background: var(--green-soft); }
        .avail-ok { color: var(--green-soft); }
        .avail-err .avail-dot { background: var(--red-soft); }
        .avail-err { color: var(--red-soft); }
        .avail-checking { color: var(--gray-text); }
        .avail-checking .avail-dot { background: var(--gray-text); animation: pulse 1s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-up { animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .delay-1 { animation-delay: 0.1s; opacity: 0; }
        .delay-2 { animation-delay: 0.2s; opacity: 0; }
        .delay-3 { animation-delay: 0.3s; opacity: 0; }
        
        .footer { font-size: 0.65rem; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: #a0a0a0; text-align: center; padding-top: 1rem; }"""

content = re.sub(r'<style>.*?</style>', f'<style>\n{new_css}\n    </style>', content, flags=re.DOTALL)

html_blobs = '''    <div class="ambient-blobs">
        <div class="blob-1"></div>
        <div class="blob-2"></div>
    </div>'''
content = re.sub(r'<div class="grain"></div>', html_blobs, content)

html_header = '''        <div class="header animate-up">
            <div class="header-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path></svg>
            </div>
            <p class="sup-title">Token Dashboard</p>
            <h1>Undangan Spesialmu</h1>
        </div>'''
content = re.sub(r'<div class="header animate-up">.*?</div>', html_header, content, flags=re.DOTALL)

html_quota = '''            <div class="animate-up delay-1" style="text-align: center;">
                <div class="quota-badge">
                    <div class="quota-text">TOKEN: <span id="token-display">...</span> <span style="margin:0 0.5rem; color:#ccc;">|</span> KUOTA: <span id="quota-display" style="display:inline;">—</span></div>
                </div>
            </div>

            <button id="btn-new-gift" class="btn btn-gold animate-up delay-1" style="margin-bottom: 2rem;">✦ Buat Undangan Baru</button>
            <div id="quota-alert" class="hidden"></div>'''
content = re.sub(r'<div class="panel animate-up" id="quota-card">.*?<div id="quota-alert" class="hidden"></div>\s*</div>', html_quota, content, flags=re.DOTALL)

html_gift_list = '''            <div class="animate-up delay-2">
                <span class="section-title">Kado Saya</span>
                <ul class="gift-list" id="gift-list">
                    <li class="empty-list">Memuat daftar kado...</li>
                </ul>
            </div>'''
content = re.sub(r'<div class="panel animate-up delay-1" style="margin-top:1rem;">\s*<p class="section-title">Kado Saya</p>\s*<ul class="gift-list" id="gift-list">.*?</ul>\s*</div>', html_gift_list, content, flags=re.DOTALL)

with open('bundle/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated bundle/index.html!')
