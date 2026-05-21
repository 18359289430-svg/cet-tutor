#!/usr/bin/env python3
"""v108c: Add time limit hints to writing/translation in diagnosis"""

with open('/opt/cet-tutor/public/js/main.js', 'r', encoding='utf-8') as f:
    js = f.read()

changes = []

# 1. Writing test - add 30min timer hint
old_writing = """            '<div class="diag-writing-title">✍️ 写作实测</div>' +
                '<div class="diag-writing-subtitle">请根据题目要求完成一篇英文作文</div>' +"""
new_writing = """            '<div class="diag-writing-title">✍️ 写作实测 <span style="font-size:12px;color:#FF6B35;font-weight:500;">⏱ 30分钟</span></div>' +
                '<div class="diag-writing-subtitle">请根据题目要求完成一篇英文作文（限时30分钟）</div>' +"""
if old_writing in js:
    js = js.replace(old_writing, new_writing, 1)
    changes.append("writing time limit hint")
else:
    print("ERROR: writing title not found")

# 2. Translation test - add 30min timer hint  
# Find translation section
old_trans_title_search = "翻译实测"
idx = js.find("翻译实测", js.find("// ===== 翻译实测 ====="))
if idx > 0:
    # Find the title line
    title_idx = js.find("翻译实测", idx + 100)
    if title_idx > 0:
        # Show context
        start = max(0, title_idx - 100)
        end = min(len(js), title_idx + 300)
        print(f"Translation context: {js[start:end]}")

# Search for translation title in HTML generation
trans_marker = "'<div class=\"diag-translation-title\">🌐 翻译实测</div>'"
idx2 = js.find(trans_marker)
if idx2 < 0:
    trans_marker2 = "翻译实测</div>"
    idx2 = js.find(trans_marker2, js.find("// ===== 翻译实测 ====="))
    if idx2 > 0:
        start = max(0, idx2 - 80)
        end = min(len(js), idx2 + 200)
        print(f"Found trans title: {js[start:end]}")

with open('/opt/cet-tutor/public/js/main.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("\nChanges:", changes)
