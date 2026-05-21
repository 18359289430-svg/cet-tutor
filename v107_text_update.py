#!/usr/bin/env python3
"""v107: Homepage text update - exam-focused, competitive differentiation"""

with open('/opt/cet-tutor/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

with open('/opt/cet-tutor/public/js/main.js', 'r', encoding='utf-8') as f:
    js = f.read()

html_changes = []
js_changes = []

# === HTML CHANGES ===

# 1. Hero title: "开始今天的四级备考" → "425分，从这里开始"
html = html.replace(
    '开始今天的\u003cbr\u003e\u003cspan id="exam-type-title"\u003e四级\u003c/span\u003e备考',
    '\u003cspan id="exam-type-title"\u003e四级\u003c/span\u003e\u003cbr\u003e425分从这里开始',
    1
)
html_changes.append("hero title")

# 2. Hero subtitle: "5分钟找到你的备考短板" → "AI诊断薄弱点 → 定向训练 → 一次通过"
html = html.replace(
    '5分钟找到你的备考短板',
    '诊断薄弱点 → 定向训练 → 一次通过',
    1
)
html_changes.append("hero subtitle")

# 3. AI capability section title: "AI能帮你做什么" → "不是刷题，是练对地方"
html = html.replace(
    'AI能帮你做什么',
    '不是刷题，是练对地方',
    1
)
html_changes.append("ai-cap title")

# 4. AI capability items text - make them exam-focused
# AI薄弱点诊断 → 精准诊断
html = html.replace(
    'AI薄弱点诊断\u003c/div\u003e\n                                \u003cdiv class=\"ai-cap-sub\"\u003e5分钟定位短板\u003c/div\u003e',
    '精准诊断\u003c/div\u003e\n                                \u003cdiv class=\"ai-cap-sub\"\u003e5分钟找到丢分点\u003c/div\u003e',
    1
)
html_changes.append("diagnosis item")

# 定制备考计划 → 定向训练
html = html.replace(
    '定制备考计划\u003c/div\u003e\n                                \u003cdiv class=\"ai-cap-sub\"\u003e针对性冲刺方案\u003c/div\u003e',
    '定向训练\u003c/div\u003e\n                                \u003cdiv class=\"ai-cap-sub\"\u003e练你最弱的那项\u003c/div\u003e',
    1
)
html_changes.append("training item")

# 词汇诊断 → 词汇速查
html = html.replace(
    '词汇诊断\u003c/div\u003e\n                                \u003cdiv class=\"ai-cap-sub\"\u003e错题高频词分析\u003c/div\u003e',
    '词汇速查\u003c/div\u003e\n                                \u003cdiv class=\"ai-cap-sub\"\u003e真题高频词速记\u003c/div\u003e',
    1
)
html_changes.append("vocab item")

# 听力训练
html = html.replace(
    '听力训练\u003c/div\u003e\n                                \u003cdiv class=\"ai-cap-sub\"\u003e对话短文专项练\u003c/div\u003e',
    '听力训练\u003c/div\u003e\n                                \u003cdiv class=\"ai-cap-sub\"\u003e新规语速模拟\u003c/div\u003e',
    1
)
html_changes.append("listening item")

# 阅读训练
html = html.replace(
    '阅读训练\u003c/div\u003e\n                                \u003cdiv class=\"ai-cap-sub\"\u003e真题阅读理解\u003c/div\u003e',
    '阅读训练\u003c/div\u003e\n                                \u003cdiv class=\"ai-cap-sub\"\u003e定位+同义替换\u003c/div\u003e',
    1
)
html_changes.append("reading item")

# 写作批改
html = html.replace(
    '写作批改\u003c/div\u003e\n                                \u003cdiv class=\"ai-cap-sub\"\u003eAI逐句批改打分\u003c/div\u003e',
    '写作批改\u003c/div\u003e\n                                \u003cdiv class=\"ai-cap-sub\"\u003e反模板·逐句批改\u003c/div\u003e',
    1
)
html_changes.append("writing item")

# 翻译训练
html = html.replace(
    '翻译训练\u003c/div\u003e\n                                \u003cdiv class=\"ai-cap-sub\"\u003e汉译英AI评分\u003c/div\u003e',
    '翻译训练\u003c/div\u003e\n                                \u003cdiv class=\"ai-cap-sub\"\u003e反中式英语\u003c/div\u003e',
    1
)
html_changes.append("translation item")

# 5. Data bar: "天连续" → "天备考", "次练习" → "次训练"
html = html.replace(
    '天连续\u003c/div\u003e',
    '天备考\u003c/div\u003e',
    1
)
html = html.replace(
    '次练习\u003c/div\u003e',
    '次训练\u003c/div\u003e',
    1
)
html_changes.append("data bar labels")

# 6. "备考人格" → "备考角色"
html = html.replace(
    '备考人格',
    '备考角色',
    1
)
html_changes.append("personality title")

# 7. CTA button: "开始AI诊断" stays, but secondary button: "一练" → "今日任务"
html = html.replace(
    '一练\n                            \u003c/button\u003e',
    '今日任务\n                            \u003c/button\u003e',
    1
)
html_changes.append("secondary CTA")

# === JS CHANGES ===

# 1. handleHomeCta - when user has diagnosis data, change CTA text
# Find the handleHomeCta function and update it
old_cta_js = """function handleHomeCta() {
    startNewDiagnosis();
}"""
new_cta_js = """function handleHomeCta() {
    // 有诊断数据 → 直接进今日任务（继续训练）；没做过 → 先诊断
    var profile = JSON.parse(localStorage.getItem(examKey('userProfile')) || '{}');
    var diagHistory = JSON.parse(localStorage.getItem(examKey('diagnosis_history')) || '[]');
    
    if (diagHistory.length > 0) {
        // 做过诊断，进今日任务继续练
        openDailyTask();
    } else {
        // 新用户，先做诊断
        startNewDiagnosis();
    }
}"""

if old_cta_js in js:
    js = js.replace(old_cta_js, new_cta_js, 1)
    js_changes.append("handleHomeCta smart redirect")
else:
    print("WARN: Could not find handleHomeCta")

# 2. Update home CTA text dynamically based on diagnosis status
# Find where home-cta-text is set dynamically
old_cta_text = """document.getElementById('home-cta-text')"""
# Let me search for this
idx = js.find("home-cta-text")
if idx > 0:
    print(f"Found home-cta-text at position {idx}")
    # Show context
    start = max(0, idx - 100)
    end = min(len(js), idx + 200)
    print(f"Context: ...{js[start:end]}...")

# 3. Add dynamic home CTA update function
# Find the updateHomeUI or similar function
update_marker = "function updateHomeUI"
idx = js.find(update_marker)
if idx > 0:
    print(f"Found updateHomeUI at position {idx}")
    start = idx
    end = min(len(js), idx + 300)
    print(f"Context: {js[start:end]}")
else:
    print("No updateHomeUI found, searching alternatives...")
    for fn in ["updateHomeGreeting", "updateHomePage", "renderHomePage", "initHomePage"]:
        idx = js.find(fn)
        if idx > 0:
            print(f"Found {fn} at {idx}")
            start = max(0, idx - 50)
            end = min(len(js), idx + 200)
            print(f"Context: {js[start:end]}")

with open('/opt/cet-tutor/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

with open('/opt/cet-tutor/public/js/main.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("\nHTML changes:", html_changes)
print("JS changes:", js_changes)
