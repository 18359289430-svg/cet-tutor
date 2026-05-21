#!/usr/bin/env python3
"""v106: Pre-generated listening audio with HTML5 Audio player"""

with open('/opt/cet-tutor/public/js/main.js', 'r', encoding='utf-8') as f:
    code = f.read()

changes = []

# 1. Add LISTENING_AUDIO_MAP and _listeningAudioEl after listeningPlayer object
old1 = "    progressInterval: null\n};\n\nfunction isSpeechSynthesisSupported"
new1 = """    progressInterval: null
};

// 预生成听力音频文件映射 (CosyVoice TTS)
var LISTENING_AUDIO_MAP = {
    'L1': '/public/audio/listening/cet4_L1.mp3',
    'L2': '/public/audio/listening/cet4_L2.mp3',
    'L3': '/public/audio/listening/cet4_L3.mp3'
};
var _listeningAudioEl = null; // HTML5 Audio element

function isSpeechSynthesisSupported"""

if old1 in code:
    code = code.replace(old1, new1, 1)
    changes.append("LISTENING_AUDIO_MAP + _listeningAudioEl")
else:
    print("ERROR: Could not find marker for LISTENING_AUDIO_MAP")

# 2. Replace stopListeningPlayback to also stop Audio element
old2 = """function stopListeningPlayback() {
    speechSynthesis.cancel();
    listeningPlayer.isPlaying = false;
    listeningPlayer.isPaused = false;
    listeningPlayer.currentIndex = 0;
    // 清除进度更新定时器
    if (listeningPlayer.progressInterval) {
        clearInterval(listeningPlayer.progressInterval);
        listeningPlayer.progressInterval = null;
    }
    updateListeningProgressUI(0, 0);
}"""

new2 = """function stopListeningPlayback() {
    speechSynthesis.cancel();
    if (_listeningAudioEl) {
        _listeningAudioEl.pause();
        _listeningAudioEl.currentTime = 0;
        _listeningAudioEl = null;
    }
    listeningPlayer.isPlaying = false;
    listeningPlayer.isPaused = false;
    listeningPlayer.currentIndex = 0;
    // 清除进度更新定时器
    if (listeningPlayer.progressInterval) {
        clearInterval(listeningPlayer.progressInterval);
        listeningPlayer.progressInterval = null;
    }
    updateListeningProgressUI(0, 0);
}"""

if old2 in code:
    code = code.replace(old2, new2, 1)
    changes.append("stopListeningPlayback + Audio stop")
else:
    print("ERROR: Could not find stopListeningPlayback")

# 3. Replace playListeningFull with hybrid version
old3 = """function playListeningFull(text, isConversation, onComplete) {
    stopListeningPlayback();
    
    if (!isSpeechSynthesisSupported()) {
        showToast('您的浏览器不支持语音播放，请使用Chrome浏览器');
        if (onComplete) onComplete();
        return;
    }
    
    listeningPlayer.isPlaying = true;
    listeningPlayer.round = 1;
    listeningPlayer.maxRounds = 1;  // 默认只播放1遍（模拟真题）
    listeningPlayer.currentText = text;
    listeningPlayer.totalDuration = Math.max(30, text.split(/\\s+/).length / 2); // 估算时长
    listeningPlayer.onComplete = onComplete;
    
    // 显示进度条
    showListeningProgressBar();
    updatePlayButtonState('playing');
    
    // 开始进度更新
    startProgressTimer();
    
    function doRound(roundNum) {
        if (roundNum > listeningPlayer.maxRounds) {
            listeningPlayer.isPlaying = false;
            updatePlayButtonState('ready');
            diagState.listeningPlayed = true;
            
            // 播放完成，显示提示
            updateListeningHint('✅ 播放结束，请答题');
            hideListeningProgressBar();
            
            // 清除进度定时器
            if (listeningPlayer.progressInterval) {
                clearInterval(listeningPlayer.progressInterval);
                listeningPlayer.progressInterval = null;
            }
            
            updateReplayButtonState();
            if (listeningPlayer.onComplete) {
                listeningPlayer.onComplete();
            }
            return;
        }
        
        updateRoundIndicator(roundNum);
        
        playListeningRound(text, isConversation, function(index, total) {
            listeningPlayer.currentIndex = index;
        }, function() {
            if (roundNum < listeningPlayer.maxRounds) {
                updateRoundIndicator(roundNum + 0.5);
                setTimeout(function() {
                    doRound(roundNum + 1);
                }, 3000);
            } else {
                doRound(roundNum + 1);
            }
        });
    }
    
    doRound(1);
}"""

new3 = """function playListeningFull(text, isConversation, onComplete, passageId) {
    stopListeningPlayback();
    
    // 检查是否有预生成的MP3音频（CosyVoice TTS，音质远超浏览器SpeechSynthesis）
    var audioUrl = passageId ? LISTENING_AUDIO_MAP[passageId] : null;
    
    if (audioUrl) {
        _listeningAudioEl = new Audio(audioUrl);
        _listeningAudioEl.preload = 'auto';
        
        listeningPlayer.isPlaying = true;
        listeningPlayer.round = 1;
        listeningPlayer.maxRounds = 1;
        listeningPlayer.currentText = text;
        listeningPlayer.onComplete = onComplete;
        
        showListeningProgressBar();
        updatePlayButtonState('playing');
        
        _listeningAudioEl.onloadedmetadata = function() {
            listeningPlayer.totalDuration = Math.floor(_listeningAudioEl.duration);
        };
        
        _listeningAudioEl.ontimeupdate = function() {
            if (_listeningAudioEl && _listeningAudioEl.duration) {
                updateListeningProgressUI(_listeningAudioEl.currentTime, _listeningAudioEl.duration);
            }
        };
        
        _listeningAudioEl.onended = function() {
            listeningPlayer.isPlaying = false;
            updatePlayButtonState('ready');
            diagState.listeningPlayed = true;
            updateListeningHint('✅ 播放结束，请答题');
            hideListeningProgressBar();
            
            if (listeningPlayer.progressInterval) {
                clearInterval(listeningPlayer.progressInterval);
                listeningPlayer.progressInterval = null;
            }
            
            updateReplayButtonState();
            if (listeningPlayer.onComplete) {
                listeningPlayer.onComplete();
            }
        };
        
        _listeningAudioEl.onerror = function() {
            console.warn('[音频加载失败] 回退到SpeechSynthesis, url:', audioUrl);
            _listeningAudioEl = null;
            playListeningFullFallback(text, isConversation, onComplete);
        };
        
        _listeningAudioEl.play().catch(function(e) {
            console.warn('[音频播放失败] 回退到SpeechSynthesis:', e);
            _listeningAudioEl = null;
            playListeningFullFallback(text, isConversation, onComplete);
        });
        
        return;
    }
    
    // 没有预生成音频，使用SpeechSynthesis回退
    playListeningFullFallback(text, isConversation, onComplete);
}

// SpeechSynthesis回退播放（当预生成MP3不可用时）
function playListeningFullFallback(text, isConversation, onComplete) {
    if (!isSpeechSynthesisSupported()) {
        showToast('您的浏览器不支持语音播放，请使用Chrome浏览器');
        if (onComplete) onComplete();
        return;
    }
    
    listeningPlayer.isPlaying = true;
    listeningPlayer.round = 1;
    listeningPlayer.maxRounds = 1;
    listeningPlayer.currentText = text;
    listeningPlayer.totalDuration = Math.max(30, text.split(/\\s+/).length / 2);
    listeningPlayer.onComplete = onComplete;
    
    showListeningProgressBar();
    updatePlayButtonState('playing');
    startProgressTimer();
    
    function doRound(roundNum) {
        if (roundNum > listeningPlayer.maxRounds) {
            listeningPlayer.isPlaying = false;
            updatePlayButtonState('ready');
            diagState.listeningPlayed = true;
            updateListeningHint('✅ 播放结束，请答题');
            hideListeningProgressBar();
            
            if (listeningPlayer.progressInterval) {
                clearInterval(listeningPlayer.progressInterval);
                listeningPlayer.progressInterval = null;
            }
            
            updateReplayButtonState();
            if (listeningPlayer.onComplete) {
                listeningPlayer.onComplete();
            }
            return;
        }
        
        updateRoundIndicator(roundNum);
        
        playListeningRound(text, isConversation, function(index, total) {
            listeningPlayer.currentIndex = index;
        }, function() {
            if (roundNum < listeningPlayer.maxRounds) {
                updateRoundIndicator(roundNum + 0.5);
                setTimeout(function() {
                    doRound(roundNum + 1);
                }, 3000);
            } else {
                doRound(roundNum + 1);
            }
        });
    }
    
    doRound(1);
}"""

if old3 in code:
    code = code.replace(old3, new3, 1)
    changes.append("playListeningFull hybrid + playListeningFullFallback")
else:
    print("ERROR: Could not find playListeningFull")

# 4. Update handlePlayClick to pass passageId
old4 = """function handlePlayClick() {
    var passage = diagState.listeningPassages[diagState.currentListeningPassageIndex];
    if (!passage) return;
    
    stopListeningPlayback();
    var isConversation = passage.type === 'conversation';
    
    playListeningFull(passage.text, isConversation, function() {
        console.log('[听力播放完成]');
    });
}"""

new4 = """function handlePlayClick() {
    var passage = diagState.listeningPassages[diagState.currentListeningPassageIndex];
    if (!passage) return;
    
    stopListeningPlayback();
    var isConversation = passage.type === 'conversation';
    var passageId = passage.passage_id || null;
    
    playListeningFull(passage.text, isConversation, function() {
        console.log('[听力播放完成]');
    }, passageId);
}"""

if old4 in code:
    code = code.replace(old4, new4, 1)
    changes.append("handlePlayClick + passageId")
else:
    print("ERROR: Could not find handlePlayClick")

# 5. Update handleReplayClick to pass passageId
old5 = """    playListeningFull(passage.text, isConversation, function() {
        console.log('[额外重播完成]');
        // 重播完成后更新按钮状态
        updateReplayButtonState();
    });"""

new5 = """    playListeningFull(passage.text, isConversation, function() {
        console.log('[额外重播完成]');
        updateReplayButtonState();
    }, passage.passage_id || null);"""

if old5 in code:
    code = code.replace(old5, new5, 1)
    changes.append("handleReplayClick + passageId")
else:
    print("ERROR: Could not find handleReplayClick call")

# 6. Update quiz mode playListeningFull call (add comment only, no passageId available in quiz mode)
old6 = "    // 使用SpeechSynthesis播放\n    playListeningFull(text, quizState.currentListeningIsConv, function() {"
new6 = "    // 使用预生成音频或SpeechSynthesis播放\n    playListeningFull(text, quizState.currentListeningIsConv, function() {"

if old6 in code:
    code = code.replace(old6, new6, 1)
    changes.append("quiz mode comment update")

with open('/opt/cet-tutor/public/js/main.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Changes applied:", changes)
