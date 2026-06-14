import re

with open('bundle/admin.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace body background CSS
new_body_css = '''        body {
            font-family: 'Inter', sans-serif;
            background: radial-gradient(ellipse at 50% 30%, #fff5f8 0%, #fef0f4 50%, #f5eeff 100%);
            color: #333;
        }'''
content = re.sub(r'body\s*\{\s*font-family:[^}]*background-color:[^}]*\}', new_body_css, content)

# Change text-slate-900 to text-rosewood (custom or just pink-900)
content = content.replace('text-slate-900', 'text-pink-900')
content = content.replace('text-slate-800', 'text-slate-800')
content = content.replace('bg-slate-900', 'bg-pink-600')
content = content.replace('hover:bg-slate-800', 'hover:bg-pink-700')
content = content.replace('bg-slate-50', 'bg-white/60')
content = content.replace('border-slate-200', 'border-pink-200/60')
content = content.replace('border-slate-100', 'border-pink-100')
content = content.replace('divide-slate-100', 'divide-pink-100')

# Glassmorphism for panels
content = content.replace('bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-slate-100 text-center', 
                          'bg-white/70 backdrop-blur-xl p-8 rounded-3xl shadow-2xl shadow-pink-200/50 w-full max-w-sm border border-white text-center')

content = content.replace('bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-center',
                          'bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-white shadow-lg shadow-pink-100 text-center transition-transform hover:-translate-y-1')

content = content.replace('bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative',
                          'bg-white/80 backdrop-blur-md rounded-2xl shadow-xl shadow-pink-100 border border-white overflow-hidden relative')

with open('bundle/admin.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated bundle/admin.html')
