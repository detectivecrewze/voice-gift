import re

with open('bundle/admin.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace body background CSS
new_body_css = '''        body {
            font-family: 'Inter', sans-serif;
            background-color: #faf8f4;
            background-image:
                radial-gradient(at 0% 0%, hsla(35, 80%, 96%, 1) 0, transparent 60%),
                radial-gradient(at 100% 100%, hsla(25, 60%, 93%, 1) 0, transparent 60%);
            color: #111;
        }'''
content = re.sub(r'body\s*\{\s*font-family:[^}]*background:[^}]*\}', new_body_css, content)

# Replace the pink tailwind classes with brown/stone
content = content.replace('text-pink-900', 'text-stone-900')
content = content.replace('bg-pink-600', 'bg-[#b07860]')
content = content.replace('hover:bg-pink-700', 'hover:bg-[#8b5e45]')
content = content.replace('border-pink-200/60', 'border-[#e8e4dc]')
content = content.replace('border-pink-100', 'border-[#e8e4dc]')
content = content.replace('divide-pink-100', 'divide-[#e8e4dc]')

content = content.replace('shadow-pink-200/50', 'shadow-stone-200/30')
content = content.replace('shadow-pink-100', 'shadow-stone-200/20')

# Update empty state
content = content.replace('bg-white/60', 'bg-white/80')

with open('bundle/admin.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated bundle/admin.html with classic aesthetic!')
