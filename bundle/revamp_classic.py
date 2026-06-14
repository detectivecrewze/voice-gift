import re

with open('bundle/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

new_css = """        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
            --cream: #faf8f4;
            --cream-dark: #f0ece4;
            --brown-light: #d4a373;
            --brown: #b07860;
            --brown-dark: #8b5e45;
            --black: #111;
            --gray-text: #6b6b6b;
            --gray-light: #e8e4dc;
            --red-soft: #e07070;
            --green-soft: #6a9e7a;
            --white-glass: rgba(255, 255, 255, 0.65);
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--cream);
            background-image:
                radial-gradient(at 0% 0%, hsla(35, 80%, 96%, 1) 0, transparent 60%),
                radial-gradient(at 100% 100%, hsla(25, 60%, 93%, 1) 0, transparent 60%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 2rem 1rem;
            position: relative;
            overflow-x: hidden;
            color: var(--black);
        }

        /* ── Grain Overlay ── */
        .grain {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: 0; opacity: 0.04;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }

        .container { width: 100%; max-width: 440px; position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; margin-top: 1rem; }

        .header { text-align: center; margin-bottom: 0.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
        .header-icon { width: 3rem; height: 3rem; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--brown-light), var(--brown)); box-shadow: 0 10px 25px rgba(176,120,96,0.25); color: white; }
        .header p.sup-title { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: var(--brown); margin:0; }
        .header h1 { font-family: 'Instrument Serif', serif; font-size: 3.2rem; font-style: italic; font-weight: normal; color: var(--black); line-height: 1; letter-spacing: -0.02em; }

        .panel { width: 100%; background: var(--white-glass); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.85); box-shadow: 0 20px 60px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.9) inset; border-radius: 24px; padding: 2.5rem 2rem; position: relative; overflow: hidden; }
        .panel-title { font-family: 'Instrument Serif', serif; font-size: 1.6rem; color: var(--black); margin-bottom: 0.3rem; }
        .panel-subtitle { font-size: 0.8rem; color: var(--gray-text); margin-bottom: 1.8rem; line-height: 1.6; }

        .input-group { margin-bottom: 1.5rem; }
        .label { display: block; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: var(--gray-text); margin-bottom: 0.6rem; }
        .input-field { width: 100%; background: white; border: 1px solid var(--gray-light); border-radius: 12px; padding: 0.85rem 1rem; font-family: 'Inter', sans-serif; font-size: 0.95rem; color: var(--black); transition: all 0.3s ease; outline: none; text-align: center; font-weight: 500; }
        .input-field:focus { border-color: var(--brown); box-shadow: 0 0 0 4px rgba(176,120,96,0.1); }
        .input-field::placeholder { color: #bbb; font-weight: 400; }

        .url-preview { display: flex; align-items: center; background: white; border: 1px solid var(--gray-light); border-radius: 12px; padding: 0 1rem; transition: all 0.3s ease; }
        .url-preview:focus-within { border-color: var(--brown); box-shadow: 0 0 0 4px rgba(176,120,96,0.1); }
        .url-prefix { font-size: 0.75rem; color: var(--gray-text); padding: 0.85rem 0; font-weight: 500; }
        .url-input { flex: 1; background: transparent; border: none; padding: 0.85rem 0; font-family: 'Inter', sans-serif; font-size: 0.85rem; color: var(--black); font-weight: 600; outline: none; min-width: 0; }
        .url-input::placeholder { color: #bbb; font-weight: 400; }

        .btn { width: 100%; padding: 1rem 1.5rem; border: none; border-radius: 16px; font-family: 'Inter', sans-serif; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; transition: all 0.2s ease; position: relative; }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; box-shadow: none !important; }
        
        .btn-gold { background: linear-gradient(135deg, var(--brown-light), var(--brown)); color: white; box-shadow: 0 8px 24px rgba(176,120,96,0.25); }
        .btn-gold:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(176,120,96,0.3); }
        .btn-gold:not(:disabled):active { transform: translateY(1px); }
        
        .btn-dark { background: var(--black); color: white; box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
        .btn-dark:not(:disabled):hover { transform: translateY(-2px); background: #222; box-shadow: 0 12px 28px rgba(0,0,0,0.2); }
        
        .btn-outline { background: white; color: var(--black); border: 1.5px solid var(--gray-light); }
        .btn-outline:not(:disabled):hover { background: #faf8f4; border-color: var(--black); }

        .alert { padding: 0.85rem 1rem; border-radius: 12px; font-size: 0.75rem; line-height: 1.5; margin-top: 1rem; font-weight: 500; }
        .alert-error { background: #fef2f2; color: #c53030; border: 1px solid #fee2e2; }
        .alert-success { background: #f0fdf4; color: #166534; border: 1px solid #dcfce7; }
        .hidden { display: none !important; }

        .quota-badge { display: inline-flex; justify-content: center; align-items: center; padding: 0.6rem 1.5rem; background: rgba(255,255,255,0.7); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,1); border-radius: 99px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); margin: 0 auto 1.5rem; }
        .quota-text { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gray-text); }
        .quota-text span { color: var(--black); font-weight: 700; font-family: 'Instrument Serif', serif; font-size: 1rem; font-style: italic;}

        .gift-list { list-style: none; display: flex; flex-direction: column; gap: 0.85rem; margin-top: 1rem; }
        .gift-item { display: flex; align-items: center; justify-content: space-between; background: var(--cream-dark); border-radius: 16px; padding: 1rem 1.25rem; gap: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.02); transition: transform 0.2s; }
        .gift-item:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.05); }
        .gift-icon { width: 2.5rem; height: 2.5rem; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: white; flex-shrink: 0; color: var(--brown); box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .gift-item-left { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; flex: 1; }
        .gift-item-name { font-size: 0.9rem; font-weight: 700; color: var(--black); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .gift-item-status { font-size: 0.65rem; color: var(--brown); font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
        
        .gift-actions { display: flex; gap: 0.5rem; }
        .btn-view { padding: 0.5rem 0.85rem; border-radius: 10px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; text-decoration: none; background: white; color: var(--brown); transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .btn-view:hover { background: #faf8f4; color: var(--brown-dark); }
        .empty-list { text-align: center; padding: 2rem 0; color: var(--gray-text); font-size: 0.8rem; font-style: italic; }

        .section-title { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--gray-text); margin-bottom: 0.5rem; text-align: center; display: block; width: 100%; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(17,17,17,0.4); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; opacity: 1; transition: opacity 0.3s ease; }
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
        
        .footer { font-size: 0.65rem; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: var(--gray-text); text-align: center; padding-top: 1rem; }"""

content = re.sub(r'<style>.*?</style>', f'<style>\n{new_css}\n    </style>', content, flags=re.DOTALL)

# Revert Ambient Blobs to Grain
content = re.sub(r'<div class="ambient-blobs">.*?</div>', '<div class="grain"></div>', content, flags=re.DOTALL)

with open('bundle/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated bundle/index.html with classic aesthetic!')
