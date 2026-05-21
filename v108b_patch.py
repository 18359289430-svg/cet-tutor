#!/usr/bin/env python3
"""v108b: Add training timer + limit reminders"""

with open('/opt/cet-tutor/public/js/main.js', 'r', encoding='utf-8') as f:
    js = f.read()

changes = []

# 1. Add training timer to training mode message
# Add time limit info to the message sent to AI
old_msg = """        var msg = '[训练模式] ' + skillName + '·' + stageName + '：' + stageDesc + '\\n\\nAI请按以下方法训练我：' + stagePrompt;
        sendSuggestion(msg);"""

new_msg = """        var timeLimit = stageInfo ? stageInfo.time : 10;
        var msg = '[训练模式] ' + skillName + '·' + stageName + '：' + stageDesc + '\\n\\n限时' + timeLimit + '分钟。AI请按以下方法训练我：' + stagePrompt;
        sendSuggestion(msg);
        // 启动训练倒计时
        startTrainingTimer(timeLimit, skillName + '·' + stageName);"""

if old_msg in js:
    js = js.replace(old_msg, new_msg, 1)
    changes.append("training message + timer launch")
else:
    print("ERROR: training msg not found")

# 2. Add training timer functions after estimateExamScores
# Find a good insertion point - after the estimateExamScores function
est_marker = "// 预估考试分数：4技能映射到710分制"
idx = js.find(est_marker)
if idx > 0:
    # Find the function end
    func_start = idx
    # Find next blank line after the function
    search_area = js[idx:idx+2000]
    # Find the end of estimateExamScores function
    brace_count = 0
    func_end = -1
    for i, ch in enumerate(search_area):
        if ch == '{':
            brace_count += 1
        elif ch == '}':
            brace_count -= 1
            if brace_count == 0:
                func_end = idx + i + 1
                break
    
    if func_end > 0:
        timer_code = '''

// ===== 训练倒计时 =====
var _trainingTimerInterval = null;
var _trainingTimerEnd = 0;

function startTrainingTimer(minutes, label) {
    clearTrainingTimer();
    _trainingTimerEnd = Date.now() + minutes * 60 * 1000;
    
    // 在聊天header显示倒计时
    var header = document.querySelector('.chat-header-title');
    if (!header) return;
    
    // 移除旧计时器
    var oldTimer = document.getElementById('training-timer');
    if (oldTimer) oldTimer.remove();
    
    var timerEl = document.createElement('span');
    timerEl.id = 'training-timer';
    timerEl.style.cssText = 'font-size:11px;color:#FF6B35;margin-left:8px;font-weight:500;';
    header.appendChild(timerEl);
    
    _trainingTimerInterval = setInterval(function() {
        var remaining = Math.max(0, _trainingTimerEnd - Date.now());
        var min = Math.floor(remaining / 60000);
        var sec = Math.floor((remaining % 60000) / 1000);
        var el = document.getElementById('training-timer');
        if (el) {
            if (remaining > 0) {
                el.textContent = '\\u23F1 ' + min + ':' + (sec < 10 ? '0' : '') + sec;
                if (remaining < 60000) {
                    el.style.color = '#FF3B30'; // 红色警告
                }
            } else {
                el.textContent = '\\u23F0 时间到！';
                el.style.color = '#FF3B30';
                clearTrainingTimer();
                showToast('\\u23F0 ' + label + ' 训练时间到！');
            }
        }
    }, 1000);
}

function clearTrainingTimer() {
    if (_trainingTimerInterval) {
        clearInterval(_trainingTimerInterval);
        _trainingTimerInterval = null;
    }
    var el = document.getElementById('training-timer');
    if (el) el.remove();
}
'''
        js = js[:func_end] + timer_code + js[func_end:]
        changes.append("training timer functions")
    else:
        print("ERROR: Could not find end of estimateExamScores")
else:
    print("ERROR: Could not find estimateExamScores marker")

# 3. Clear training timer when switching away from chat
old_switch = "function switchTab(tabName) {"
idx = js.find(old_switch)
if idx > 0:
    # Find the first line inside switchTab
    snippet = js[idx:idx+500]
    print(f"switchTab start: {snippet[:200]}")

with open('/opt/cet-tutor/public/js/main.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("\nChanges:", changes)
