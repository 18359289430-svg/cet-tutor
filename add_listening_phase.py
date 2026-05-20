#!/usr/bin/env python3
"""添加听力诊断阶段：阅读→听力→自评→写作→翻译"""
import re

with open('/dev/stdin', 'r') as f:
    pass  # we'll read from file directly

filepath = 'public/js/main.js'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. 修改阅读题做完后的跳转：startWritingTest -> startListeningTest
code = code.replace(
    '''            // 阅读题做完，进入写作测试
            startWritingTest();''',
    '''            // 阅读题做完，进入听力测试
            startListeningTest();'''
)

# 2. 在 startReadingPhase 函数后面添加 startListeningTest 函数
# 找到 "========== 听力实测功能结束 ==========" 这个标记，在它前面插入
listening_test_func = '''
// ===== 听力诊断阶段 =====
function startListeningTest() {
    diagState.phase = 'listening';
    
    // 从diagnosis_questions.json加载听力passages
    var diagUrl = EXAM_TYPE === 'cet6' ? '/public/cet6_diagnosis_questions.json' : '/public/diagnosis_questions.json';
    diagUrl += '?t=' + Date.now();
    console.log('[听力阶段] 加载听力题目:', diagUrl);
    
    fetchWithTimeout(diagUrl).then(function(resp) {
        return resp.json();
    }).then(function(data) {
        var passages = data.listening_passages || [];
        if (passages.length === 0) {
            console.log('[听力阶段] 无听力题目，跳过');
            showSelfEval();
            return;
        }
        
        // 随机选取2-3个passage
        passages.sort(function() { return Math.random() - 0.5; });
        var selected = passages.slice(0, Math.min(3, passages.length));
        
        // 确保题目格式一致（选项用optionA/B/C/D）
        selected.forEach(function(p) {
            (p.questions || []).forEach(function(q) {
                if (!q.optionA && q.options) {
                    // 旧格式转换
                    var opts = q.options;
                    q.optionA = opts[0] || '';
                    q.optionB = opts[1] || '';
                    q.optionC = opts[2] || '';
                    q.optionD = opts[3] || '';
                    delete q.options;
                }
            });
        });
        
        diagState.listeningPassages = selected;
        diagState.currentListeningPassageIndex = 0;
        diagState.currentListeningQIndex = 0;
        diagState.listeningAnswers = [];
        diagState.listeningCorrectCount = 0;
        diagState.listeningPlayed = false;
        diagState.listeningReplayCount = 0;
        
        // 重置播放器
        listeningPlayer.extraRounds = 0;
        listeningPlayer.round = 1;
        listeningPlayer.maxRounds = 1;
        listeningPlayer.currentText = '';
        listeningPlayer.totalDuration = 0;
        
        console.log('[听力阶段] 加载完成，', selected.length, '个passage');
        showCurrentListening();
    }).catch(function(e) {
        console.error('[听力阶段加载失败]', e);
        showSelfEval();
    });
}

'''

# 在 "========== 听力实测功能结束 ==========" 前面插入
marker = '// ========== 听力实测功能结束 =========='
if marker in code:
    code = code.replace(marker, listening_test_func + marker)
    print('已插入 startListeningTest 函数')
else:
    print('ERROR: 找不到标记行')

# 3. 修改 showCurrentListening 中的跳转：听力做完后跳到自评而不是写作
# 原来是 showCurrentListening 里 passage 为空时调 startWritingTest
code = code.replace(
    '''    if (!passage) {
        startWritingTest();
        return;
    }
    
    var q = passage.questions[diagState.currentListeningQIndex];''',
    '''    if (!passage) {
        showSelfEval();
        return;
    }
    
    var q = passage.questions[diagState.currentListeningQIndex];'''
)

# 4. 导出 startListeningTest 到 window
if 'window.startListeningTest' not in code:
    # 在 window.selectListeningOption 后面添加
    code = code.replace(
        'window.selectListeningOption = selectListeningOption;',
        'window.selectListeningOption = selectListeningOption;\nwindow.startListeningTest = startListeningTest;'
    )
    print('已导出 startListeningTest 到 window')

# 5. 修改 diagState.phase 添加 listening
code = code.replace(
    "phase: 'loading', // loading, questions, selfeval, writing, translation, generating, done",
    "phase: 'loading', // loading, questions, listening, selfeval, writing, translation, generating, done"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print('修改完成')
