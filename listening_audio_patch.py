#!/usr/bin/env python3
"""Patch main.js to use pre-generated MP3 audio for listening passages"""

import re

with open('/opt/cet-tutor/public/js/main.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add audio URL mapping after the listeningPlayer object definition
# Find the listeningPlayer object and add the audio map after it
audio_map_code = '''
// 预生成听力音频文件映射 (CosyVoice TTS)
var LISTENING_AUDIO_MAP = {
    'L1': '/audio/listening/cet4_L1.mp3',
    'L2': '/audio/listening/cet4_L2.mp3',
    'L3': '/audio/listening/cet4_L3.mp3'
};
var _listeningAudioEl = null; // HTML5 Audio element for pre-generated MP3

'''

# Insert after listeningPlayer definition
old_marker = "listeningPlayer.progressInterval = null\n};"
new_marker = "listeningPlayer.progressInterval = null\n};" + audio_map_code

if old_marker in code:
    code = code.replace(old_marker, new_marker, 1)
    print("✅ Added LISTENING_AUDIO_MAP and _listeningAudioEl")
else:
    print("❌ Could not find listeningPlayer marker")
    # Try alternative
    old_marker2 = "listeningPlayer.progressInterval = null\n};\n\nfunction isSpeechSynthesisSupported"
    if old_marker2 in code:
        code = code.replace(old_marker2, "listeningPlayer.progressInterval = null\n};" + audio_map_code + "\nfunction isSpeechSynthesisSupported", 1)
        print("✅ Added LISTENING_AUDIO_MAP (alt marker)")

# 2. Replace playListeningFull function with hybrid version
old_playFull = '''function playListeningFull(text, isConversation, onComplete) {
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
}'''

new_playFull = '''function playListeningFull(text, isConversation, onComplete, passageId) {
    stopListeningPlayback();
    
    // 检查是否有预生成的MP3音频
    var audioUrl = passageId ? LISTENING_AUDIO_MAP[passageId] : null;
    
    if (audioUrl) {
        // 使用预生成的MP3音频（CosyVoice TTS，音质更好）
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
            startAudioProgressTimer();
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
}

function startAudioProgressTimer() {
    if (listeningPlayer.progressInterval) {
        clearInterval(listeningPlayer.progressInterval);
    }
    listeningPlayer.progressInterval = setInterval(function() {
        if (!listeningPlayer.isPlaying || listeningPlayer.isPaused) return;
        // Audio element handles its own timeupdate, this is just a safety timer
        if (_listeningAudioEl && _listeningAudioEl.ended) {
            clearInterval(listeningPlayer.progressInterval);
        }
    }, 1000);
}'''

if old_playFull in code:
    code = code.replace(old_playFull, new_playFull, 1)
    print("✅ Replaced playListeningFull with hybrid version")
else:
    print("❌ Could not find playListeningFull function to replace")

# 3. Update stopListeningPlayback to also stop Audio element
old_stop = '''function stopListeningPlayback() {
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
}'''

new_stop = '''function stopListeningPlayback() {
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
}'''

if old_stop in code:
    code = code.replace(old_stop, new_stop, 1)
    print("✅ Updated stopListeningPlayback to stop Audio element")
else:
    print("❌ Could not find stopListeningPlayback")

# 4. Update handlePlayClick and handleReplayClick to pass passageId
old_playClick = '''function handlePlayClick() {
    var passage = diagState.listeningPassages[diagState.currentListeningPassageIndex];
    if (!passage) return;
    
    stopListeningPlayback();
    var isConversation = passage.type === 'conversation';
    
    playListeningFull(passage.text, isConversation, function() {
        console.log('[听力播放完成]');
    });
}'''

new_playClick = '''function handlePlayClick() {
    var passage = diagState.listeningPassages[diagState.currentListeningPassageIndex];
    if (!passage) return;
    
    stopListeningPlayback();
    var isConversation = passage.type === 'conversation';
    var passageId = passage.passage_id || null;
    
    playListeningFull(passage.text, isConversation, function() {
        console.log('[听力播放完成]');
    }, passageId);
}'''

if old_playClick in code:
    code = code.replace(old_playClick, new_playClick, 1)
    print("✅ Updated handlePlayClick with passageId")
else:
    print("❌ Could not find handlePlayClick")

old_replayClick = '''    playListeningFull(passage.text, isConversation, function() {
        console.log('[额外重播完成]');
        // 重播完成后更新按钮状态
        updateReplayButtonState();
    });'''

new_replayClick = '''    playListeningFull(passage.text, isConversation, function() {
        console.log('[额外重播完成]');
        // 重播完成后更新按钮状态
        updateReplayButtonState();
    }, passage.passage_id || null);'''

if old_replayClick in code:
    code = code.replace(old_replayClick, new_replayClick, 1)
    print("✅ Updated handleReplayClick with passageId")
else:
    print("❌ Could not find handleReplayClick call site")

# 5. Also check for other playListeningFull calls
# The one at line 7111
old_7111 = '''    // 使用SpeechSynthesis播放
    playListeningFull(text, quizState.currentListeningIsConv, function() {'''

new_7111 = '''    // 使用预生成音频或SpeechSynthesis播放
    playListeningFull(text, quizState.currentListeningIsConv, function() {'''

if old_7111 in code:
    code = code.replace(old_7111, new_7111, 1)
    print("✅ Updated quiz mode playListeningFull call")

# Write back
with open('/opt/cet-tutor/public/js/main.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("\n✅ All patches applied!")
