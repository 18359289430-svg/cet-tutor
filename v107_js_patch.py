with open('/opt/cet-tutor/public/js/main.js', 'r', encoding='utf-8') as f:
    c = f.read()

changes = []

# 1. Update CTA text logic
old1 = "ctaText.textContent = hasDiag ? '继续AI陪练' : '开始AI诊断';"
new1 = "ctaText.textContent = hasDiag ? '今日任务' : '精准诊断';"
if old1 in c:
    c = c.replace(old1, new1, 1)
    changes.append("CTA text")
else:
    print("ERROR: CTA text not found")

# 2. Update handleHomeCta
old2 = """function handleHomeCta() {
    // 使用新的前端诊断模式
    startNewDiagnosis();
}"""
new2 = """function handleHomeCta() {
    // 有诊断数据 → 进今日任务继续练；没做过 → 先诊断
    var diagHistory = JSON.parse(localStorage.getItem(examKey('diagnosis_history')) || '[]');
    if (diagHistory.length > 0) {
        openDailyTask();
    } else {
        startNewDiagnosis();
    }
}"""
if old2 in c:
    c = c.replace(old2, new2, 1)
    changes.append("handleHomeCta smart redirect")
else:
    print("ERROR: handleHomeCta not found")

# 3. Update hero subtitle dynamically for diagnosed users
old3 = "document.getElementById('greeting-text').textContent = greeting;"
new3 = """document.getElementById('greeting-text').textContent = greeting;
            // 有诊断数据时hero subtitle显示距及格差几分
            var homeSubtitle = document.getElementById('home-hero-subtitle');
            var _diagHist = JSON.parse(localStorage.getItem(examKey('diagnosis_history')) || '[]');
            if (homeSubtitle && _diagHist.length > 0) {
                var _lastDiag = _diagHist[_diagHist.length - 1];
                var _scores = _lastDiag.scores || {};
                var _examScore = estimateExamScores(_scores);
                if (_examScore && _examScore.total > 0) {
                    var _diff = 425 - _examScore.total;
                    homeSubtitle.textContent = _diff > 0 ? '\u8ddd\u53ca\u683c\u8fd8\u5dee' + _diff + '\u5206\uff0c\u4eca\u5929\u7ee7\u7eed' : '\u9884\u4f30' + _examScore.total + '\u5206\uff0c\u4fdd\u6301\u4f4f';
                }
            }"""
if old3 in c:
    c = c.replace(old3, new3, 1)
    changes.append("hero subtitle dynamic exam score")
else:
    print("ERROR: greeting-text not found")

# 4. Update the suggestion text
old4 = "setTimeout(function(){ sendSuggestion('开始AI诊断，帮我找出' + EXAM_LABEL + '薄弱点'); }, 300);"
new4 = "setTimeout(function(){ sendSuggestion('精准诊断，帮我找出' + EXAM_LABEL + '丢分点'); }, 300);"
if old4 in c:
    c = c.replace(old4, new4, 1)
    changes.append("suggestion text")

with open('/opt/cet-tutor/public/js/main.js', 'w', encoding='utf-8') as f:
    f.write(c)

print("JS changes:", changes)
