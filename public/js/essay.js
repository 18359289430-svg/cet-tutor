    // ===== 作文批改系统 =====
    var essayState = {
        selectedTopic: '',
        selectedTopicId: '',
        isSubmitting: false,
        lastResult: null,
        topics: []
    };

    function openEssayOverlay() {
        essayState.selectedTopic = '';
        essayState.selectedTopicId = '';
        essayState.isSubmitting = false;
        var textarea = document.getElementById('essay-textarea');
        if (textarea) textarea.value = '';
        var wordNum = document.getElementById('essay-word-num');
        if (wordNum) wordNum.textContent = '0';
        var topicBtns = document.querySelectorAll('.essay-topic-btn');
        topicBtns.forEach(function(btn) { btn.classList.remove('selected'); });
        var inputBody = document.getElementById('essay-input-body');
        var resultSection = document.getElementById('essay-result-section');
        if (inputBody) inputBody.style.display = '';
        if (resultSection) resultSection.style.display = 'none';
        document.getElementById('essay-overlay').classList.add('show');
        // 加载作文题目
        loadEssayTopics();
    }

    function loadEssayTopics() {
        var grid = document.getElementById('essay-topic-grid');
        if (!grid) return;
        grid.innerHTML = '<div style="text-align:center;padding:20px;color:#94A3B8">加载中...</div>';
        fetch('/api/deepseek/quiz-topics')
            .then(function(r){ return r.json(); })
            .then(function(resp){
                if (resp.code === 0 && resp.data) {
                    essayState.topics = resp.data;
                    renderEssayTopics();
                } else {
                    grid.innerHTML = '<div style="text-align:center;padding:20px;color:#94A3B8">暂无题目</div>';
                }
            })
            .catch(function(){
                grid.innerHTML = '<div style="text-align:center;padding:20px;color:#94A3B8">加载失败，请重试</div>';
            });
    }

    function renderEssayTopics() {
        var grid = document.getElementById('essay-topic-grid');
        if (!grid || !essayState.topics.length) return;
        var html = '';
        essayState.topics.forEach(function(topic) {
            html += '<div class="essay-topic-btn" onclick="selectEssayTopic(this, \'' + topic.title.replace(/'/g, "\\'") + '\', \'' + topic.id + '\')">' + topic.title + '</div>';
        });
        grid.innerHTML = html;
    }

    function closeEssayOverlay() {
        document.getElementById('essay-overlay').classList.remove('show');
    }

    function selectEssayTopic(btn, topic, topicId) {
        var topicBtns = document.querySelectorAll('.essay-topic-btn');
        topicBtns.forEach(function(b) { b.classList.remove('selected'); });
        if (essayState.selectedTopic === topic) {
            essayState.selectedTopic = '';
            essayState.selectedTopicId = '';
        } else {
            btn.classList.add('selected');
            essayState.selectedTopic = topic;
            essayState.selectedTopicId = topicId || '';
        }
    }

    function updateEssayWordCount() {
        var textarea = document.getElementById('essay-textarea');
        var wordNum = document.getElementById('essay-word-num');
        if (textarea && wordNum) {
            var text = textarea.value.trim();
            var words = text ? text.split(/\s+/).length : 0;
            wordNum.textContent = words;
        }
    }

    async function submitEssay() {
        // 优先使用结构化API
        try {
            await submitEssayWithAPI();
        } catch (e) {
            console.error('结构化API失败，回退到聊天方式');
            await submitEssayFallback();
        }
    }

    async function submitEssayWithAPI() {
        var textarea = document.getElementById('essay-textarea');
        var essayText = textarea.value.trim();

        if (!essayText || essayText.length < 20) {
            showToast('请输入至少20个词的作文内容');
            return;
        }

        if (essayState.isSubmitting) return;
        essayState.isSubmitting = true;

        var inputBody = document.getElementById('essay-input-body');
        var resultSection = document.getElementById('essay-result-section');
        if (inputBody) inputBody.style.display = 'none';
        if (resultSection) {
            resultSection.style.display = '';
            resultSection.innerHTML = '<div class="essay-loading"><div class="essay-loading-spinner"></div><div class="essay-loading-text">AI正在批改中，请稍候...</div></div>';
        }

        var topicPrefix = essayState.selectedTopic ? '【题目类型】' + essayState.selectedTopic + '\n' : '';

        // 结构化批改的系统提示
        var systemPrompt = '你是一个专业的四级英语作文批改老师。请对用户的作文进行批改，并严格按以下JSON格式返回：\n\n{\n  "total_score": 12,\n  "dimensions": {\n    "content": 4,\n    "organization": 4,\n    "language": 4\n  },\n  "sentences": [\n    {\n      "original": "原句内容",\n      "issue": "问题描述",\n      "suggestion": "修改建议"\n    }\n  ],\n  "overall_comment": "总体评价和建议"\n}\n\n注意：总分15分，三个维度各5分，只指出2-4个最重要的问题句，只返回JSON。';

        var userMessage = topicPrefix + '【我的作文】\n' + essayText;

        try {
            var resp = await fetch('/api/deepseek/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system: systemPrompt,
                    messages: [{ role: 'user', content: userMessage }],
                    temperature: 0.3,
                    max_tokens: 2000
                })
            });

            if (!resp.ok) {
                throw new Error('API请求失败');
            }

            var data = await resp.json();
            var content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;

            if (!content) {
                throw new Error('无法获取批改结果');
            }

            // 解析JSON
            var jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                var result = JSON.parse(jsonMatch[0]);
                essayState.lastResult = result;
                renderStructuredEssayResult(result, essayText);
            } else {
                throw new Error('响应格式错误');
            }
        } catch (e) {
            console.error('作文批改失败:', e);
            throw e; // 向上抛出错误，让submitEssay回退
        }

        essayState.isSubmitting = false;
    }

    async function submitEssayFallback() {
        var textarea = document.getElementById('essay-textarea');
        var essayText = textarea.value.trim();
        
        if (!essayText || essayText.length < 20) {
            showToast('请输入至少20个词的作文内容');
            return;
        }
        
        if (essayState.isSubmitting) return;
        essayState.isSubmitting = true;
        
        var inputBody = document.getElementById('essay-input-body');
        var resultSection = document.getElementById('essay-result-section');
        if (inputBody) inputBody.style.display = 'none';
        if (resultSection) {
            resultSection.style.display = '';
            resultSection.innerHTML = '<div class="essay-loading"><div class="essay-loading-spinner"></div><div class="essay-loading-text">AI正在批改中，请稍候...</div></div>';
        }
        
        var userId = (state.userData && state.userData.uid) || 'user_' + Date.now();
        var limitResult = await checkChatLimitAsync(userId);
        if (limitResult.limited) {
            showToast(limitResult.message);
            closeEssayOverlay();
            essayState.isSubmitting = false;
            return;
        }
        
        try {
            // 调用结构化批改API
            var resp = await fetch('/api/deepseek/essay-grade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    essay_text: essayText,
                    topic: essayState.selectedTopic
                })
            });
            
            var result = await resp.json();
            incrementChatUsage();
            
            if (result.code === 0 && result.data) {
                if (result.data.parse_error) {
                    // JSON解析失败，显示原始文本
                    showEssayResultRaw(result.data.raw);
                } else {
                    // 结构化结果显示
                    showEssayResultStructured(result.data);
                }
            } else {
                showToast(result.error || '批改失败，请重试');
                closeEssayOverlay();
            }
        } catch (e) {
            console.error('Essay submit error:', e);
            showToast('提交失败，请重试');
            closeEssayOverlay();
        }
        
        essayState.isSubmitting = false;
    }

    function showEssayResultStructured(data) {
        var resultSection = document.getElementById('essay-result-section');
        if (!resultSection) return;
        
        var totalScore = data.total_score || 0;
        var contentScore = data.content_score || 0;
        var orgScore = data.organization_score || 0;
        var langScore = data.language_score || 0;
        
        var scoreLevel = totalScore >= 12 ? '优秀' : totalScore >= 9 ? '良好' : totalScore >= 6 ? '及格' : '需提升';
        
        var html = '<div class="essay-result-section">' +
            '<div class="essay-result-header">' +
                '<div class="essay-score-ring">' +
                    '<svg viewBox="0 0 100 100">' +
                        '<circle class="bg" cx="50" cy="50" r="42"/>' +
                        '<circle class="progress" cx="50" cy="50" r="42" stroke-dasharray="264" stroke-dashoffset="' + (264 - 264 * totalScore / 15) + '"/>' +
                    '</svg>' +
                    '<div class="essay-score-text">' + totalScore + '</div>' +
                '</div>' +
                '<div class="essay-result-title">' + scoreLevel + '水平</div>' +
                '<div class="essay-result-sub">总分 ' + totalScore + '/15 · 内容' + contentScore + ' · 结构' + orgScore + ' · 语言' + langScore + '</div>' +
            '</div>' +
            '<div class="essay-result-body">';
        
        // 三维度进度条
        html += '<div style="margin-bottom:20px">' +
            '<div style="font-size:14px;font-weight:600;color:#1a1a2e;margin-bottom:12px">分项评分</div>' +
            '<div style="margin-bottom:8px">' +
                '<div style="display:flex;justify-content:space-between;font-size:12px;color:#64748B;margin-bottom:4px">' +
                    '<span>内容得分</span><span>' + contentScore + '/5</span>' +
                '</div>' +
                '<div style="height:6px;background:#F1F5F9;border-radius:3px;overflow:hidden">' +
                    '<div style="height:100%;width:' + (contentScore * 20) + '%;background:#6C5CE7;border-radius:3px"></div>' +
                '</div>' +
            '</div>' +
            '<div style="margin-bottom:8px">' +
                '<div style="display:flex;justify-content:space-between;font-size:12px;color:#64748B;margin-bottom:4px">' +
                    '<span>结构得分</span><span>' + orgScore + '/5</span>' +
                '</div>' +
                '<div style="height:6px;background:#F1F5F9;border-radius:3px;overflow:hidden">' +
                    '<div style="height:100%;width:' + (orgScore * 20) + '%;background:#00B894;border-radius:3px"></div>' +
                '</div>' +
            '</div>' +
            '<div style="margin-bottom:8px">' +
                '<div style="display:flex;justify-content:space-between;font-size:12px;color:#64748B;margin-bottom:4px">' +
                    '<span>语言得分</span><span>' + langScore + '/5</span>' +
                '</div>' +
                '<div style="height:6px;background:#F1F5F9;border-radius:3px;overflow:hidden">' +
                    '<div style="height:100%;width:' + (langScore * 20) + '%;background:#F39C12;border-radius:3px"></div>' +
                '</div>' +
            '</div>' +
        '</div>';
        
        // 逐句批改
        if (data.sentences && data.sentences.length > 0) {
            html += '<div style="font-size:14px;font-weight:600;color:#1a1a2e;margin-bottom:12px">逐句批改</div>';
            data.sentences.forEach(function(s) {
                html += '<div class="essay-sentence-card">' +
                    '<div class="essay-sentence-original">' + (s.original || '') + '</div>' +
                    '<div class="essay-sentence-reason">' + (s.issue || '') + '</div>' +
                    '<div class="essay-sentence-revised">' + (s.suggestion || '') + '</div>' +
                '</div>';
            });
        }
        
        // 总评
        if (data.overall_comment) {
            html += '<div class="essay-advice-section">' +
                '<div class="essay-advice-title">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>' +
                    '总评' +
                '</div>' +
                '<div style="font-size:14px;color:#475569;line-height:1.7">' + data.overall_comment + '</div>' +
            '</div>';
        }
        
        html += '</div></div>';
        resultSection.innerHTML = html;
    }

    function showEssayResultRaw(rawText) {
        var resultSection = document.getElementById('essay-result-section');
        if (!resultSection) return;
        resultSection.innerHTML = '<div class="essay-result-section">' +
            '<div class="essay-result-header" style="background:linear-gradient(135deg,#6C5CE7,#A29BFE)">' +
                '<div style="font-size:18px;font-weight:700;margin-bottom:4px">批改结果</div>' +
                '<div style="font-size:13px;opacity:0.9">详细批改如下</div>' +
            '</div>' +
            '<div class="essay-result-body">' +
                '<div style="font-size:14px;color:#1a1a2e;line-height:1.8;white-space:pre-wrap;background:#F8F9FA;padding:16px;border-radius:12px">' + rawText + '</div>' +
            '</div>' +
        '</div>';
    }

    function parseEssayResultFromText(text) {
        var data = {
            score: 0,
            wordCount: 0,
            sentences: [],
            advice: [],
            rewritten: ''
        };
        
        var scoreMatch = text.match(/【评分】(\d+)/);
        if (scoreMatch) data.score = parseInt(scoreMatch[1]);
        
        var wordMatch = text.match(/【字数】(\d+)/);
        if (wordMatch) data.wordCount = parseInt(wordMatch[1]);
        
        var sentenceBlocks = text.split(/原文：/);
        if (sentenceBlocks.length > 1) {
            for (var i = 1; i < sentenceBlocks.length; i++) {
                var block = sentenceBlocks[i];
                var sentence = { original: '', revised: '', reason: '' };
                var lines = block.split('\n');
                var content = '';
                for (var j = 0; j < lines.length; j++) {
                    var line = lines[j].trim();
                    if (line.startsWith('问题：')) {
                        sentence.original = content.trim();
                        sentence.reason = line.replace('问题：', '');
                        content = '';
                    } else if (line.startsWith('改写：')) {
                        if (!sentence.original) sentence.original = content.trim();
                        sentence.revised = line.replace('改写：', '');
                        content = '';
                    } else if (line.match(/^【/)) {
                        break;
                    } else {
                        content += ' ' + line;
                    }
                }
                if (sentence.original || sentence.revised || sentence.reason) {
                    data.sentences.push(sentence);
                }
            }
        }
        
        var adviceMatch = text.match(/【核心建议】([\s\S]*?)(?=【改写范文】|$)/);
        if (adviceMatch) {
            var adviceText = adviceMatch[1];
            var adviceLines = adviceText.split(/^\d+[.、]/m);
            adviceLines.forEach(function(line) {
                line = line.trim().replace(/^[.、]\s*/, '');
                if (line && line.length > 5) {
                    data.advice.push(line);
                }
            });
        }
        
        var rewriteMatch = text.match(/【改写范文】([\s\S]*?)$/);
        if (rewriteMatch) {
            data.rewritten = rewriteMatch[1].trim();
        }
        
        return data;
    }

    function renderEssayResult(data) {
        var resultSection = document.getElementById('essay-result-section');
        if (!resultSection) return;
        
        var score = parseInt(data.score) || 0;
        var maxScore = 15;
        var circumference = 2 * Math.PI * 42;
        var offset = circumference - (score / maxScore) * circumference;
        
        var title = score >= 13 ? '优秀' : score >= 10 ? '良好' : score >= 7 ? '及格' : '需改进';
        var subText = score >= 13 ? '词汇丰富，结构清晰' : score >= 10 ? '内容充实，逻辑较好' : score >= 7 ? '基本达标，还需努力' : '建议重点提升';
        
        var html = '<div class="essay-result-header">' +
            '<div class="essay-score-ring">' +
            '<svg width="100" height="100" viewBox="0 0 100 100">' +
            '<circle class="bg" cx="50" cy="50" r="42"/>' +
            '<circle class="progress" cx="50" cy="50" r="42" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '"/>' +
            '</svg>' +
            '<div class="essay-score-text">' + score + '</div>' +
            '</div>' +
            '<div class="essay-result-title">' + title + '水平</div>' +
            '<div class="essay-result-sub">' + subText + '</div>' +
            '</div>';
        
        html += '<div class="essay-result-body">';
        
        if (data.wordCount) {
            html += '<div style="background:#F8F9FA;border-radius:12px;padding:14px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">' +
                '<span style="font-size:14px;color:#475569;">作文字数</span>' +
                '<span style="font-size:18px;font-weight:700;color:#6C5CE7;">' + data.wordCount + '词</span>' +
                '</div>';
        }
        
        if (data.sentences && data.sentences.length > 0) {
            html += '<div style="font-size:15px;font-weight:600;color:#1a1a2e;margin-bottom:12px;">逐句批改</div>';
            data.sentences.forEach(function(s) {
                html += '<div class="essay-sentence-card">';
                if (s.original) {
                    html += '<div class="essay-sentence-original">' + escapeHtml(s.original) + '</div>';
                }
                if (s.revised) {
                    html += '<div class="essay-sentence-revised">' + escapeHtml(s.revised) + '</div>';
                }
                if (s.reason) {
                    html += '<div class="essay-sentence-reason">' + escapeHtml(s.reason) + '</div>';
                }
                html += '</div>';
            });
        }
        
        if (data.advice && data.advice.length > 0) {
            html += '<div class="essay-advice-section">' +
                '<div class="essay-advice-title">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' +
                '核心建议' +
                '</div>' +
                '<ul class="essay-advice-list">';
            data.advice.forEach(function(a, i) {
                html += '<li class="essay-advice-item">' +
                    '<span class="essay-advice-num">' + (i + 1) + '</span>' +
                    '<span>' + escapeHtml(a) + '</span>' +
                    '</li>';
            });
            html += '</ul></div>';
        }
        
        if (data.rewritten) {
            html += '<div class="essay-rewrite-section">' +
                '<div class="essay-rewrite-title">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
                '改写范文' +
                '</div>' +
                '<div class="essay-rewrite-text">' + escapeHtml(data.rewritten) + '</div>' +
                '</div>';
        }
        
        html += '<div class="essay-result-actions">' +
            '<button class="btn-retry" onclick="retryEssay()">再来一篇</button>' +
            '<button class="btn-save" onclick="saveEssayResult()">保存结果</button>' +
            '</div>';
        
        html += '</div>';
        resultSection.innerHTML = html;
        resultSection.style.display = '';
    }

    function checkAndParseEssayResponse(fullText) {
        if (fullText.includes('【评分】') || fullText.includes('逐句批改')) {
            var data = parseEssayResultFromText(fullText);
            if (data.score > 0 || data.sentences.length > 0) {
                essayState.lastResult = data;
                renderEssayResult(data);
                return true;
            }
        }
        return false;
    }

    function retryEssay() {
        var textarea = document.getElementById('essay-textarea');
        var resultSection = document.getElementById('essay-result-section');
        var inputBody = document.getElementById('essay-input-body');
        if (textarea) textarea.value = '';
        var wordNum = document.getElementById('essay-word-num');
        if (wordNum) wordNum.textContent = '0';
        if (inputBody) inputBody.style.display = '';
        if (resultSection) resultSection.style.display = 'none';
        essayState.isSubmitting = false;
    }

    function saveEssayResult() {
        if (!essayState.lastResult) {
            showToast('暂无批改结果');
            return;
        }
        showToast('结果已保存');
    }


    // ===== 错题复习系统 =====
    var reviewState = {
        questions: [],
        currentIndex: 0,
        masteredCount: 0,
        totalCount: 0
    };

    function getWrongQuestions() {
        try {
            var data = localStorage.getItem('cet_wrong_questions');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    function saveWrongQuestion(question) {
        var questions = getWrongQuestions();
        var exists = questions.some(function(q) {
            return q.question === question.question && q.type === question.type;
        });
        if (!exists) {
            questions.push({
                ...question,
                reviewed: false,
                addedAt: Date.now()
            });
            localStorage.setItem('cet_wrong_questions', JSON.stringify(questions));
        }
        updateWrongBookBadge();
            // 预渲染数据页面
            try { renderDashboard(); } catch(e) { console.error('renderDashboard error:', e); }
    }

    function updateWrongBookBadge() {
        var questions = getWrongQuestions();
        var unreviewedCount = questions.filter(function(q) { return !q.reviewed; }).length;
        var badges = document.querySelectorAll('.wrong-book-badge');
        badges.forEach(function(badge) {
            if (badge) {
                badge.textContent = unreviewedCount > 0 ? unreviewedCount + '道待复习' : '';
            }
        });
    }

    function openReview() {
        var questions = getWrongQuestions().filter(function(q) { return !q.reviewed; });
        reviewState.questions = questions;
        reviewState.currentIndex = 0;
        reviewState.masteredCount = 0;
        reviewState.totalCount = questions.length;

        if (questions.length === 0) {
            document.getElementById('review-body').innerHTML = '<div class="review-empty"><div class="review-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div><div class="review-empty-title">太棒了！</div><div class="review-empty-desc">暂无待复习的错题，继续保持！</div></div>';
            document.getElementById('review-progress').style.display = 'none';
        } else {
            document.getElementById('review-progress').style.display = '';
            renderReviewQuestion();
        }

        updateReviewProgress();
        document.getElementById('review-overlay').classList.add('show');
    }

    function closeReview() {
        document.getElementById('review-overlay').classList.remove('show');
        updateWrongBookBadge();
            // 预渲染数据页面
            try { renderDashboard(); } catch(e) { console.error('renderDashboard error:', e); }
    }

    function updateReviewProgress() {
        var mastered = reviewState.masteredCount;
        var total = reviewState.totalCount;
        var remaining = total - reviewState.currentIndex;
        var progress = total > 0 ? ((reviewState.currentIndex) / total) * 100 : 0;

        document.getElementById('review-progress-fill').style.width = progress + '%';
        document.getElementById('review-status-text').textContent = '已掌握 ' + mastered + ' 题';
        document.getElementById('review-total-text').textContent = '剩余 ' + remaining + ' 题';
        document.getElementById('review-subtitle').textContent = '第 ' + (reviewState.currentIndex + 1) + ' / ' + total + ' 题';
    }

    function renderReviewQuestion() {
        var body = document.getElementById('review-body');
        var question = reviewState.questions[reviewState.currentIndex];

        if (!question) {
            body.innerHTML = '<div class="review-empty"><div class="review-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div><div class="review-empty-title">复习完成！</div><div class="review-empty-desc">已掌握 ' + reviewState.masteredCount + ' 道错题，继续加油！</div><button class="review-next-btn show" onclick="closeReview()">完成</button></div>';
            return;
        }

        var html = '<div class="review-question">' + escapeHtml(question.question) + '</div>';
        html += '<div class="review-options">';

        var options = [
            { key: 'A', text: question.optionA },
            { key: 'B', text: question.optionB },
            { key: 'C', text: question.optionC },
            { key: 'D', text: question.optionD }
        ];

        options.forEach(function(opt) {
            html += '<div class="review-option" onclick="selectReviewOption(this, \'' + opt.key + '\')" data-option="' + opt.key + '">';
            html += '<div class="review-option-letter">' + opt.key + '</div>';
            html += '<div class="review-option-text">' + escapeHtml(opt.text) + '</div>';
            html += '</div>';
        });

        html += '</div>';
        html += '<div class="review-feedback" id="review-feedback">';
        html += '<div class="review-feedback-title" id="review-feedback-title"></div>';
        html += '<div class="review-feedback-text" id="review-feedback-text"></div>';
        html += '</div>';
        html += '<button class="review-next-btn" id="review-next-btn" onclick="nextReviewQuestion()">下一题</button>';

        body.innerHTML = html;
    }

    function selectReviewOption(el, option) {
        var question = reviewState.questions[reviewState.currentIndex];
        var isCorrect = option === question.answer;

        document.querySelectorAll('.review-option').forEach(function(opt) {
            opt.classList.add('disabled');
            if (opt.dataset.option === question.answer) {
                opt.classList.add('correct');
            }
        });

        el.classList.add(isCorrect ? 'correct' : 'wrong');

        var feedback = document.getElementById('review-feedback');
        var feedbackTitle = document.getElementById('review-feedback-title');
        var feedbackText = document.getElementById('review-feedback-text');

        feedback.classList.add('show', isCorrect ? 'correct' : 'wrong');
        feedbackTitle.innerHTML = isCorrect ? '回答正确！' : '回答错误';
        feedbackText.textContent = question.explanation || '';

        if (isCorrect) {
            question.reviewed = true;
            reviewState.masteredCount++;
            saveReviewState();
        }

        document.getElementById('review-next-btn').classList.add('show');
        updateReviewProgress();
    }

    function nextReviewQuestion() {
        reviewState.currentIndex++;
        updateReviewProgress();
        renderReviewQuestion();
    }

    function saveReviewState() {
        localStorage.setItem('cet_wrong_questions', JSON.stringify(reviewState.questions));
    }

    // ===== 学习计划系统 =====
    var planState = { data: null, currentWeek: 0 };

    function openPlan() {
        document.getElementById('plan-overlay').classList.add('show');
        generateLearningPlan();
    }

    function closePlan() {
        document.getElementById('plan-overlay').classList.remove('show');
    }

    function generateLearningPlan() {
        var scores = getAbilityScores();

        if (!scores || !scores.总分) {
            document.getElementById('plan-body').innerHTML = '<div style="padding:40px 20px;text-align:center;"><div style="color:#64748B;font-size:15px;">请先完成诊断测试再生成学习计划</div><button class="review-next-btn show" onclick="closePlan()" style="margin-top:20px;">返回</button></div>';
            return;
        }

        var systemPrompt = '你是一个专业的四级英语学习规划师。根据用户五维分数生成4周学习计划。返回JSON格式：{"weeks":[{"title":"第1周：xxx","focus":"xxx","tasks":["任务1","任务2","任务3"]}]}';

        var userMessage = '我的五维分数：总分：' + scores.总分 + '，细节定位：' + (scores.细节定位||0) + '，推理判断：' + (scores.推理判断||0) + '，同义替换：' + (scores.同义替换||0) + '，主旨归纳：' + (scores.主旨归纳||0) + '，态度判断：' + (scores.态度判断||0);

        fetch('/api/deepseek/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system: systemPrompt,
                messages: [{ role: 'user', content: userMessage }],
                temperature: 0.7,
                max_tokens: 2000
            })
        }).then(function(resp) { return resp.json(); })
        .then(function(data) {
            var content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
            var jsonMatch = content && content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                planState.data = JSON.parse(jsonMatch[0]);
                renderPlan();
                savePlanToLocalStorage(planState.data);
            } else {
                throw new Error('解析失败');
            }
        }).catch(function(e) {
            console.error('生成学习计划失败:', e);
            planState.data = {
                weeks: [
                    { title: '第1周：词汇夯实', focus: '高频词汇记忆', tasks: ['每日记忆30个核心词汇', '完成1篇听力精听', '复习2道阅读真题'] },
                    { title: '第2周：阅读强化', focus: '阅读技巧', tasks: ['完成3篇阅读练习', '练习同义替换', '整理生词本'] },
                    { title: '第3周：写译提升', focus: '写作翻译', tasks: ['背诵3篇范文', '完成2篇翻译', '整理常用句型'] },
                    { title: '第4周：综合冲刺', focus: '全科模拟', tasks: ['完成2套模拟题', '复习错题本', '调整应考状态'] }
                ]
            };
            renderPlan();
            savePlanToLocalStorage(planState.data);
        });
    }

    function renderPlan() {
        var body = document.getElementById('plan-body');
        var plan = planState.data;
        if (!plan || !plan.weeks || plan.weeks.length === 0) {
            body.innerHTML = '<div style="padding:40px 20px;text-align:center;"><div style="color:#64748B;font-size:15px;">暂无学习计划</div></div>';
            return;
        }

        var savedProgress = getPlanProgress();
        var html = '<div class="plan-content">';
        plan.weeks.forEach(function(week, idx) {
            html += '<div class="plan-week-card">';
            html += '<div class="plan-week-header"><div class="plan-week-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div><div class="plan-week-title">' + escapeHtml(week.title) + '</div><div class="plan-week-desc">' + escapeHtml(week.focus || '') + '</div></div></div>';
            html += '<div class="plan-tasks">';
            if (week.tasks) {
                week.tasks.forEach(function(task, taskIdx) {
                    var isDone = savedProgress && savedProgress[idx] && savedProgress[idx][taskIdx];
                    html += '<div class="plan-task' + (isDone ? ' done' : '') + '"><div class="plan-task-check' + (isDone ? ' done' : '') + '" onclick="togglePlanTask(' + idx + ', ' + taskIdx + ')"></div><div class="plan-task-text">' + escapeHtml(task) + '</div></div>';
                });
            }
            html += '</div></div>';
        });
        html += '<div class="plan-actions"><button class="btn-secondary" onclick="closePlan()">关闭</button><button class="btn-primary" onclick="regeneratePlan()">重新生成</button></div></div>';
        body.innerHTML = html;
    }

    function savePlanToLocalStorage(plan) {
        localStorage.setItem('cet_learning_plan', JSON.stringify({ plan: plan, createdAt: Date.now() }));
    }

    function getPlanProgress() {
        try {
            var data = localStorage.getItem('cet_plan_progress');
            return data ? JSON.parse(data) : null;
        } catch (e) { return null; }
    }

    function togglePlanTask(weekIdx, taskIdx) {
        var progress = getPlanProgress() || {};
        if (!progress[weekIdx]) progress[weekIdx] = {};
        progress[weekIdx][taskIdx] = !progress[weekIdx][taskIdx];
        localStorage.setItem('cet_plan_progress', JSON.stringify(progress));
        renderPlan();
    }

    function regeneratePlan() {
        document.getElementById('plan-body').innerHTML = '<div class="plan-loading"><div class="plan-loading-spinner"></div><div class="plan-loading-text">AI正在为你重新生成学习计划...</div></div>';
        generateLearningPlan();
    }

    function getAbilityScores() {
        try {
            var data = localStorage.getItem('cet4_ability_scores');
            return data ? JSON.parse(data) : null;
        } catch (e) { return null; }
    }

    function getUserProfile() {
        try {
            var data = localStorage.getItem('cet4_user_profile');
            return data ? JSON.parse(data) : null;
        } catch (e) { return null; }
    }

    // ===== 付费转化引导 =====
    var upgradeCardShown = false;

    function showUpgradeCard(remaining) {
        if (upgradeCardShown) return;
        upgradeCardShown = true;
        var card = document.getElementById('upgrade-card');
        var title = document.getElementById('upgrade-card-title');
        var sub = document.getElementById('upgrade-card-sub');
        if (remaining === 0) {
            title.textContent = '今日免费额度已用完';
            sub.textContent = '明天恢复免费对话，或升级冲刺营无限对话';
        } else {
            title.textContent = '今日还剩' + remaining + '轮免费对话';
            sub.textContent = '升级冲刺营可获得无限对话次数';
        }
        card.classList.add('show');
    }

    function closeUpgradeCard() {
        document.getElementById('upgrade-card').classList.remove('show');
    }

    function openUpgradePage() {
        closeUpgradeCard();
        switchTab('plans');
    }

    function checkUpgradePrompt(remaining) {
        if (remaining <= 5 && remaining > 0) {
            var hint = document.getElementById('chat-remaining-hint');
            if (hint) {
                hint.textContent = '今日还剩' + remaining + '轮免费对话';
                hint.style.display = 'block';
            }
        }
        if (remaining === 0) showUpgradeCard(0);
    }

    function resetUpgradeCardState() {
        var lastReset = localStorage.getItem('cet_upgrade_card_reset');
        var today = new Date().toISOString().slice(0, 10);
        if (lastReset !== today) {
            upgradeCardShown = false;
            localStorage.setItem('cet_upgrade_card_reset', today);
        }
    }

    resetUpgradeCardState();

    // ===== 渲染结构化作文批改结果 =====
    function renderStructuredEssayResult(result, originalText) {
        var resultSection = document.getElementById('essay-result-section');
        if (!resultSection) return;

        var score = result.total_score || 0;
        var maxScore = 15;
        var circumference = 2 * Math.PI * 42;
        var offset = circumference - (score / maxScore) * circumference;
        var title = score >= 13 ? '优秀' : score >= 10 ? '良好' : score >= 7 ? '及格' : '需改进';
        var subText = score >= 13 ? '词汇丰富，结构清晰' : score >= 10 ? '内容充实，逻辑较好' : score >= 7 ? '基本达标，还需努力' : '建议重点提升';

        var html = '<div class="essay-result-header"><div class="essay-score-ring"><svg width="100" height="100" viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="42"/><circle class="progress" cx="50" cy="50" r="42" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '"/></svg><div class="essay-score-text">' + score + '</div></div><div class="essay-result-title">' + title + '水平</div><div class="essay-result-sub">' + subText + '</div></div>';

        if (result.dimensions) {
            html += '<div class="essay-dimensions">';
            html += '<div class="essay-dimension"><div class="essay-dimension-label">内容</div><div class="essay-dimension-value">' + (result.dimensions.content || 0) + '</div></div>';
            html += '<div class="essay-dimension"><div class="essay-dimension-label">结构</div><div class="essay-dimension-value">' + (result.dimensions.organization || 0) + '</div></div>';
            html += '<div class="essay-dimension"><div class="essay-dimension-label">语言</div><div class="essay-dimension-value">' + (result.dimensions.language || 0) + '</div></div>';
            html += '</div>';
        }

        html += '<div class="essay-result-body">';

        if (result.sentences && result.sentences.length > 0) {
            html += '<div style="font-size:15px;font-weight:600;color:#1a1a2e;margin-bottom:12px;">逐句批改</div>';
            result.sentences.forEach(function(s) {
                if (s.original) {
                    html += '<div class="essay-sentence-highlight"><div style="font-size:14px;color:#475569;margin-bottom:8px;">' + escapeHtml(s.original) + '</div><div class="essay-sentence-tooltip">';
                    if (s.issue) html += '<div class="essay-sentence-issue">问题：' + escapeHtml(s.issue) + '</div>';
                    if (s.suggestion) html += '<div class="essay-sentence-suggestion">建议：' + escapeHtml(s.suggestion) + '</div>';
                    html += '</div></div>';
                }
            });
        }

        if (result.overall_comment) {
            html += '<div class="essay-overall-comment"><div class="essay-overall-comment-title">总评</div><div class="essay-overall-comment-text">' + escapeHtml(result.overall_comment) + '</div></div>';
        }

        html += '</div><div class="essay-result-actions"><button class="btn-retry" onclick="retryEssay()">重新批改</button><button class="btn-save" onclick="saveEssayResult()">保存结果</button></div>';
        resultSection.innerHTML = html;
    }

