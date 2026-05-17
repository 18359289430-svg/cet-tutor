        var personalities = [
                { type:'佛系随缘选手', color:'#F5C6AA', emoji:'😌', img:'/cards/foxisuiyuan.png', honor:'佛系陪跑员', comment:'你很佛系，但四级不佛', scores:{"细节定位":95,"推理判断":33,"同义替换":66,"主旨归纳":77,"态度判断":93} },
                { type:'脑补大师', color:'#C4A8E0', emoji:'💭', img:'/cards/naobudashi.png', honor:'四级白日梦家', comment:'笔在卷子上，魂在银河系', scores:{"细节定位":40,"推理判断":75,"同义替换":50,"主旨归纳":30,"态度判断":60} },
                { type:'偏科大佬', color:'#FFB6C1', emoji:'📚', img:'/cards/piankedalao.png', honor:'阅读王者·翻译菜鸡', comment:'一半封神，一半白给', scores:{"细节定位":98,"推理判断":20,"同义替换":95,"主旨归纳":99,"态度判断":25} },
                { type:'摆烂冠军', color:'#A8C4D8', emoji:'🛋️', img:'/cards/bailanguanjun.png', honor:'四级陪跑一级选手', comment:'重在参与，随缘就好', scores:{"细节定位":10,"推理判断":15,"同义替换":5,"主旨归纳":20,"态度判断":80} },
                { type:'全对卷王', color:'#E8E8E8', emoji:'🏆', img:'/cards/quandaowang.png', honor:'四级人形标准答案', comment:'别人考四级，你考四级解析', scores:{"细节定位":100,"推理判断":98,"同义替换":100,"主旨归纳":100,"态度判断":95} },
                { type:'吗喽型选手', color:'#C4956A', emoji:'🐒', img:'/cards/malouxuanshou.png', honor:'熬夜硬肝特种兵', comment:'咖啡续着命，单词记不住', scores:{"细节定位":35,"推理判断":40,"同义替换":25,"主旨归纳":30,"态度判断":20} },
                { type:'临时抱佛脚选手', color:'#FFA500', emoji:'🙏', img:'/cards/linshibaifofojiao.png', honor:'考前突击大师', comment:'平时不烧香，考前抱佛脚', scores:{"细节定位":60,"推理判断":55,"同义替换":70,"主旨归纳":65,"态度判断":50} },
                { type:'资料囤积狂', color:'#4A7C8C', emoji:'📦', img:'/cards/ziliaodunjikuang.png', honor:'四级资料收藏家', comment:'收藏=学会，囤满=稳过', scores:{"细节定位":85,"推理判断":70,"同义替换":80,"主旨归纳":75,"态度判断":60} }
            ];

        // ===== localStorage 安全读取辅助函数 =====
        function safeGetItem(key, defaultValue) {
            try {
                var data = localStorage.getItem(key);
                if (data === null) return defaultValue;
                return JSON.parse(data);
            } catch(e) {
                return defaultValue;
            }
        }

        function safeSetItem(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch(e) {}
        }
        // ===== 错题本函数 =====
        var WRONG_QUESTIONS_KEY = 'cet_wrong_questions';
        var MAX_WRONG_QUESTIONS = 200;
        
        function getWrongQuestions() {
            var questions = safeGetItem(WRONG_QUESTIONS_KEY, []);
            questions.sort(function(a, b) {
                return (b.createdAt || 0) - (a.createdAt || 0);
            });
            return questions;
        }
        
        function saveWrongQuestion(data) {
            if (!data || !data.id) return;
            var questions = getWrongQuestions();
            var existingIndex = -1;
            for (var i = 0; i < questions.length; i++) {
                if (questions[i].id === data.id) {
                    existingIndex = i;
                    break;
                }
            }
            var now = Date.now();
            var questionData = {
                id: data.id,
                type: data.type || '词汇',
                question: data.question || '',
                optionA: data.optionA || '',
                optionB: data.optionB || '',
                optionC: data.optionC || '',
                optionD: data.optionD || '',
                answer: data.answer || '',
                userAnswer: data.userAnswer || '',
                explanation: data.explanation || '',
                difficulty: data.difficulty || 'Medium',
                createdAt: existingIndex >= 0 ? questions[existingIndex].createdAt : now,
                updatedAt: now,
                reviewedAt: existingIndex >= 0 ? questions[existingIndex].reviewedAt : null,
                reviewCount: existingIndex >= 0 ? questions[existingIndex].reviewCount : 0
            };
            if (existingIndex >= 0) {
                questions[existingIndex] = questionData;
            } else {
                questions.unshift(questionData);
            }
            while (questions.length > MAX_WRONG_QUESTIONS) {
                questions.pop();
            }
            safeSetItem(WRONG_QUESTIONS_KEY, questions);
            updateWrongCount();
        }
        
        function deleteWrongQuestion(id) {
            var questions = getWrongQuestions();
            var filtered = questions.filter(function(q) { return q.id !== id; });
            safeSetItem(WRONG_QUESTIONS_KEY, filtered);
            updateWrongCount();
        }
        
        function markQuestionReviewed(id) {
            var questions = getWrongQuestions();
            for (var i = 0; i < questions.length; i++) {
                if (questions[i].id === id) {
                    questions[i].reviewedAt = Date.now();
                    questions[i].reviewCount = (questions[i].reviewCount || 0) + 1;
                    break;
                }
            }
            safeSetItem(WRONG_QUESTIONS_KEY, questions);
        }
        
        function updateWrongCount() {
            var questions = getWrongQuestions();
            var unreviewedCount = questions.filter(function(q) {
                return !q.reviewedAt || q.reviewedAt < q.updatedAt;
            }).length;
            var badge = document.getElementById('wrong-book-badge');
            if (badge) {
                if (unreviewedCount > 0) {
                    badge.textContent = unreviewedCount > 99 ? '99+' : unreviewedCount;
                    badge.style.display = 'inline-block';
                } else {
                    badge.textContent = '';
                    badge.style.display = 'none';
                }
            }
        }
        
        function updateWrongBookBadge() {
            updateWrongCount();
        }

        function getWrongQuestionStats() {
            var questions = getWrongQuestions();
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            var todayStart = today.getTime();
            var stats = {
                total: questions.length,
                vocabulary: 0,
                grammar: 0,
                reading: 0,
                listening: 0,
                todayNew: 0
            };
            questions.forEach(function(q) {
                switch(q.type) {
                    case '词汇': stats.vocabulary++; break;
                    case '语法': stats.grammar++; break;
                    case '阅读': stats.reading++; break;
                    case '听力': stats.listening++; break;
                    default: stats.vocabulary++;
                }
                if (q.createdAt >= todayStart) {
                    stats.todayNew++;
                }
            });
            return stats;
        }

        // ===== 诊断历史记录函数 =====
        var DIAGNOSIS_HISTORY_KEY = 'cet_diagnosis_history';
        var MAX_DIAGNOSIS_HISTORY = 50;

        function getDiagnosisHistory() {
            return safeGetItem(DIAGNOSIS_HISTORY_KEY, []);
        }

        function saveDiagnosisRecord(diagnosisData) {
            if (!diagnosisData || !diagnosisData.dims || Object.keys(diagnosisData.dims).length === 0) return;

            var history = getDiagnosisHistory();
            var now = Date.now();

            // 获取当前套餐
            var currentPlan = '免费版';
            if (state.userData && state.userData.plan) {
                var planNames = { sprint: '冲刺版', flagship: '旗舰版' };
                currentPlan = planNames[state.userData.plan] || '免费版';
            }

            var record = {
                id: 'diag_' + now + '_' + Math.random().toString(36).substr(2, 6),
                date: now,
                dateStr: formatDateTime(now),
                scores: JSON.parse(JSON.stringify(diagnosisData.dims)),
                personality: diagnosisData.personality || '',
                riskLevel: diagnosisData.riskLevel || 'mid',
                totalScore: diagnosisData.totalScore || 0,
                plan: currentPlan,
                weakDims: diagnosisData.weakDims || []
            };

            // 添加到历史记录开头
            history.unshift(record);

            // 限制最大记录数
            while (history.length > MAX_DIAGNOSIS_HISTORY) {
                history.pop();
            }

            safeSetItem(DIAGNOSIS_HISTORY_KEY, history);
        }

        function formatDateTime(timestamp) {
            var d = new Date(timestamp);
            var year = d.getFullYear();
            var month = (d.getMonth() + 1).toString().padStart(2, '0');
            var day = d.getDate().toString().padStart(2, '0');
            var hour = d.getHours().toString().padStart(2, '0');
            var minute = d.getMinutes().toString().padStart(2, '0');
            return year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
        }

        function getDiagnosisHistoryStats() {
            var history = getDiagnosisHistory();
            if (history.length === 0) {
                return { total: 0, lastDate: null };
            }
            return {
                total: history.length,
                lastDate: history[0].date
            };
        }
        // 渲染诊断记录页面
                function renderDiagnosisHistoryPage() {
            var history = getDiagnosisHistory();
            var stats = getDiagnosisHistoryStats();
            var container = document.getElementById('diag-history-content');
            if (!container) return;

            var html = '';

            // Hero区域 - 和数据页一致
            html += '<div class="diag-hero">';
            html += '<div class="diag-hero-title">诊断记录</div>';
            html += '<div class="diag-hero-sub">追踪学习进度，见证每一次进步</div>';
            html += '<div class="diag-hero-divider"></div>';
            html += '</div>';

            // 主卡 - 大数字
            html += '<div class="diag-hero-card">';
            html += '<div class="diag-hero-number">' + stats.total + '</div>';
            html += '<div class="diag-hero-label">诊断次数</div>';
            html += '<div class="diag-sub-stats">';
            html += '<div class="diag-sub-item"><span class="sub-dot"></span><span class="sub-num">' + (stats.lastDate ? formatDateTime(stats.lastDate).split(' ')[0] : '--') + '</span> 最近诊断</div>';
            html += '</div>';
            html += '</div>';

            // 人格类型分布
            if (history.length > 0) {
                var personalityCount = {};
                history.forEach(function(r) {
                    if (r.personality) {
                        personalityCount[r.personality] = (personalityCount[r.personality] || 0) + 1;
                    }
                });
                var personalities = Object.keys(personalityCount);
                if (personalities.length > 0) {
                    html += '<div class="diag-section">';
                    html += '<div class="diag-personalities-section">';
                    html += '<div class="diag-section-header">';
                    html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>';
                    html += '<div class="diag-section-title">人格类型分布</div>';
                    html += '</div>';
                    html += '<div class="diag-personality-tags">';
                    personalities.forEach(function(p) {
                        html += '<span class="diag-personality-tag">' + p + ' <span class="diag-personality-count">x' + personalityCount[p] + '</span></span>';
                    });
                    html += '</div>';
                    html += '</div>';
                    html += '</div>';
                }
            }

            // 空状态
            if (history.length === 0) {
                html += '<div class="diag-empty-state">';
                html += '<div class="diag-empty-icon">';
                html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h6"/></svg>';
                html += '</div>';
                html += '<div class="diag-empty-title">还没有诊断记录</div>';
                html += '<div class="diag-empty-desc">完成AI诊断后可查看诊断历史<br>了解你的五维能力和薄弱项</div>';

                html += '</div>';
            } else {
                // 记录列表标题
                html += '<div class="diag-section">';
                html += '<div class="diag-section-header">';
                html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>';
                html += '<div class="diag-section-title">诊断历史</div>';
                html += '</div>';

                // 记录列表
                html += '<div class="diag-list">';

                history.forEach(function(record, index) {
                    html += '<div class="diag-record-card" onclick="toggleDiagRecordDetail(this)">';

                    // 卡片顶部
                    html += '<div class="diag-card-top">';
                    html += '<div class="diag-card-badges">';
                    if (record.personality) {
                        html += '<span class="diag-personality-badge">' + record.personality + '</span>';
                    }
                    html += '<span class="diag-risk-badge ' + record.riskLevel + '">' + getRiskLabel(record.riskLevel) + '</span>';
                    html += '</div>';
                    html += '<span class="diag-card-date">' + formatDateTime(record.date) + '</span>';
                    html += '</div>';

                    // 分数预览
                    html += '<div class="diag-scores-preview">';
                    var dims = Object.keys(record.scores);
                    var previewDims = dims.slice(0, 3);
                    previewDims.forEach(function(dim) {
                        html += '<div class="diag-score-item">';
                        html += '<span class="diag-score-value">' + record.scores[dim] + '</span>';
                        html += '<span class="diag-score-label">' + dim + '</span>';
                        html += '</div>';
                    });
                    if (dims.length > 3) {
                        html += '<span class="diag-more-hint">+' + (dims.length - 3) + '项 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></span>';
                    }
                    html += '</div>';

                    // 展开详情
                    html += '<div class="diag-record-detail">';

                    // 完整五维分析
                    html += '<div class="diag-detail-section">';
                    html += '<div class="diag-detail-title">';
                    html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5"/></svg>';
                    html += '完整五维分析';
                    html += '</div>';
                    html += '<div class="diag-radar-wrap">';
                    html += '<canvas class="diag-radar-canvas" width="200" height="200" data-record-id="' + record.id + '"></canvas>';
                    html += '</div>';
                    html += '<div class="diag-scores-list">';
                    dims.forEach(function(dim) {
                        var config = DIM_CONFIGS[dim] || { color: '#6C5CE7', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/></svg>' };
                        var isWeak = record.weakDims && record.weakDims.some(function(w) { return w.name === dim; });
                        html += '<div class="diag-score-row' + (isWeak ? ' weak' : '') + '">';
                        html += '<div class="diag-score-row-icon">' + config.icon + '</div>';
                        html += '<div class="diag-score-row-name">' + dim + '</div>';
                        html += '<div class="diag-score-row-value">' + record.scores[dim] + '</div>';
                        html += '<div class="diag-score-bar"><div class="diag-score-bar-fill" style="width:' + record.scores[dim] + '%"></div></div>';
                        if (isWeak) html += '<span class="diag-weak-tag">弱项</span>';
                        html += '</div>';
                    });
                    html += '</div>';
                    html += '</div>';

                    // 弱项分析
                    if (record.weakDims && record.weakDims.length > 0) {
                        html += '<div class="diag-detail-section">';
                        html += '<div class="diag-detail-title">';
                        html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
                        html += '弱项分析';
                        html += '</div>';
                        html += '<div class="diag-weak-list">';
                        record.weakDims.forEach(function(weak) {
                            var config = DIM_CONFIGS[weak.name] || { icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/></svg>', desc: '' };
                            html += '<div class="diag-weak-card">';
                            html += '<div class="diag-weak-header">';
                            html += '<div class="diag-weak-icon">' + config.icon + '</div>';
                            html += '<div class="diag-weak-name">' + weak.name + '</div>';
                            html += '<div class="diag-weak-score">' + weak.score + '分</div>';
                            html += '</div>';
                            html += '<div class="diag-weak-desc">' + config.desc + '</div>';
                            html += '</div>';
                        });
                        html += '</div>';
                        html += '</div>';
                    }

                    // 诊断信息
                    html += '<div class="diag-detail-section">';
                    html += '<div class="diag-info-grid">';
                    html += '<div class="diag-info-row"><span class="diag-info-label">诊断时间</span><span class="diag-info-value">' + formatDateTime(record.date) + '</span></div>';
                    html += '<div class="diag-info-row"><span class="diag-info-label">综合评分</span><span class="diag-info-value">' + record.totalScore + '分</span></div>';
                    html += '<div class="diag-info-row"><span class="diag-info-label">当前套餐</span><span class="diag-info-value">' + record.plan + '</span></div>';
                    html += '</div>';
                    html += '</div>';

                    html += '</div>'; // end diag-record-detail
                    html += '</div>'; // end diag-record-card
                });

                html += '</div>'; // end diag-list
                html += '</div>'; // end diag-section
            }

            // 底部间距
            html += '<div class="diag-bottom-spacer"></div>';

            container.innerHTML = html;

            // 渲染雷达图
            setTimeout(function() {
                history.forEach(function(record) {
                    var canvas = document.querySelector('canvas[data-record-id="' + record.id + '"]');
                    if (canvas) {
                        renderDiagRadarChart(canvas, record.scores);
                    }
                });
            }, 100);
        }
        
        function getRiskLabel(level) {
            var labels = { high: '高危风险', mid: '中危风险', low: '低危风险' };
            return labels[level] || '中危风险';
        }

        function toggleDiagRecordDetail(card) {
            var detail = card.querySelector('.diag-record-detail');
            if (!detail) return;

            var isOpen = card.classList.contains('expanded');
            if (isOpen) {
                card.classList.remove('expanded');
                detail.style.display = 'none';
            } else {
                card.classList.add('expanded');
                detail.style.display = 'block';
            }
        }

        function renderDiagRadarChart(canvas, scores) {
            var ctx = canvas.getContext('2d');
            var w = canvas.width;
            var h = canvas.height;
            var centerX = w / 2;
            var centerY = h / 2;
            var radius = Math.min(w, h) / 2 - 30;

            var dims = Object.keys(scores);
            var n = dims.length;
            var angleStep = (Math.PI * 2) / n;

            ctx.clearRect(0, 0, w, h);

            // 绘制背景多边形
            for (var level = 1; level <= 5; level++) {
                var r = radius * (level / 5);
                ctx.beginPath();
                for (var i = 0; i <= n; i++) {
                    var angle = i * angleStep - Math.PI / 2;
                    var x = centerX + r * Math.cos(angle);
                    var y = centerY + r * Math.sin(angle);
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.strokeStyle = '#E2E8F0';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // 绘制轴线
            for (var i = 0; i < n; i++) {
                var angle = i * angleStep - Math.PI / 2;
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
                ctx.strokeStyle = '#E2E8F0';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // 绘制数据区域
            ctx.beginPath();
            for (var i = 0; i < n; i++) {
                var dim = dims[i];
                var score = scores[dim] || 0;
                var r = radius * (score / 100);
                var angle = i * angleStep - Math.PI / 2;
                var x = centerX + r * Math.cos(angle);
                var y = centerY + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fillStyle = 'rgba(108, 92, 231, 0.3)';
            ctx.fill();
            ctx.strokeStyle = '#6C5CE7';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 绘制数据点
            for (var i = 0; i < n; i++) {
                var dim = dims[i];
                var score = scores[dim] || 0;
                var r = radius * (score / 100);
                var angle = i * angleStep - Math.PI / 2;
                var x = centerX + r * Math.cos(angle);
                var y = centerY + r * Math.sin(angle);

                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#6C5CE7';
                ctx.fill();
            }

            // 绘制标签
            ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillStyle = '#64748B';
            ctx.textAlign = 'center';
            for (var i = 0; i < n; i++) {
                var dim = dims[i];
                var score = scores[dim] || 0;
                var angle = i * angleStep - Math.PI / 2;
                var labelR = radius + 18;
                var x = centerX + labelR * Math.cos(angle);
                var y = centerY + labelR * Math.sin(angle);
                ctx.fillText(dim, x, y);
                ctx.fillStyle = '#1E293B';
                ctx.fillText(score, x, y + 14);
                ctx.fillStyle = '#64748B';
            }
        }

        function showDiagHistory() {
            try {
                var overlay = document.getElementById('diag-history-overlay');
                if (!overlay) {
                    createDiagHistoryOverlay();
                    overlay = document.getElementById('diag-history-overlay');
                }
                if (!overlay) { console.error('diag-history-overlay not found'); return; }
                renderDiagnosisHistoryPage();
                overlay.style.display = 'flex';
                overlay.style.opacity = '0';
                overlay.style.transition = 'opacity 0.3s';
                requestAnimationFrame(function() {
                    overlay.style.opacity = '1';
                });
            } catch(e) { console.error('showDiagHistory error:', e); alert('打开诊断记录失败: ' + e.message); }
        }

        function closeDiagHistory() {
            var overlay = document.getElementById('diag-history-overlay');
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(function() {
                    overlay.style.display = 'none';
                }, 300);
            }
        }

                function createDiagHistoryOverlay() {
            var overlay = document.createElement('div');
            overlay.id = 'diag-history-overlay';
            overlay.className = 'diag-history-overlay';
            overlay.innerHTML = '<div class="diag-history-header">' +
                '<button class="diag-history-back" onclick="closeDiagHistory()">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>' +
                '</button>' +
                '<div class="diag-history-title">诊断记录</div>' +
                '<div style="width:36px"></div>' +
                '</div>' +
                '<div class="diag-history-content" id="diag-history-content"></div>';
            document.body.appendChild(overlay);
        }


        // ===== fetch超时处理 =====
        function fetchWithTimeout(url, options, timeout) {
            timeout = timeout || 15000;
            return Promise.race([
                fetch(url, options),
                new Promise(function(_, reject) {
                    setTimeout(function() { reject(new Error('请求超时，请重试')); }, timeout);
                })
            ]);
        }


        var state = {
            currentTab: 'home',
            userData: null,
            chatRounds: 0,
            resultObserver: null,
            selectedPersonality: null
        }
        
        // 对话列表状态在用户进入diagnosis tab时初始化

        if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initApp); } else { initApp(); }

        // ===== CountUp动画函数 =====
        function animateCountUp(element, target, duration, suffix) {
            if (!element) return;
            suffix = suffix || '';
            var start = 0;
            var startTime = performance.now();
            
            // 检查是否启用减少动画
            var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (prefersReducedMotion) {
                element.textContent = target + suffix;
                return;
            }
            
            function update(currentTime) {
                var elapsed = currentTime - startTime;
                var progress = Math.min(elapsed / duration, 1);
                // 使用easeOutQuart缓动
                var easeProgress = 1 - Math.pow(1 - progress, 4);
                var current = Math.round(easeProgress * target);
                element.textContent = current + suffix;
                
                if (progress < 1) {
                    requestAnimationFrame(update);
                }
            }
            requestAnimationFrame(update);
        }

function initApp() {
            // Fix mobile 100vh issue - set real viewport height
            function setAppHeight() {
                document.querySelector('.app').style.height = window.innerHeight + 'px';
            }
            setAppHeight();
            window.addEventListener('resize', setAppHeight);
            loadUserData();
            // 从云端同步用户数据（异步，不阻塞页面加载）
            setTimeout(function() { syncUserDataFromCloud(); }, 1000);
            // 预获取限流信息（页面加载时）
            setTimeout(preloadLimitInfo, 500);
            initGreeting();
            initCountdown();
            renderPersonalities();
            renderHomePersonalityPreview();
            initTabEvents();
            updateProfileStats();
            updateHomeStatus();
            updatePlanDisplay();
            updateWrongBookBadge();
            // 预渲染数据页面
            try { renderDashboard(); } catch(e) { console.error('renderDashboard error:', e); }

            // 恢复上次的tab和聊天状态
            restoreLastState();
            
            // 处理URL hash路由（不与?uid=&?code=冲突）
            handleHashNavigation();

            // 领取链接自动激活：/claim?sprint&code=CET4S-XXXXX-YYYY
            checkClaimUrl();
            
            // 初始化输入框placeholder（免费额度提示）
            updateChatInputPlaceholder();
            setTimeout(initChatPadding, 200);
            setTimeout(initPlanScrollSync, 100);
        }

        function loadUserData() {
            try {
                var data = localStorage.getItem('cet_user');
                if (data) state.userData = JSON.parse(data);
            } catch(e) {}
        }


        // ===== 用户数据上云 =====
        // 获取用户ID（优先使用已有的user_id，否则生成一个临时ID）
        function getCloudUserId() {
            var data = state.userData || {};
            if (!data.cloudUserId) {
                data.cloudUserId = 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
                state.userData = data;
                saveUserData(state.userData);
            }
            return data.cloudUserId;
        }

        // 从云端同步用户数据（优先API，失败降级localStorage）
        async function syncUserDataFromCloud() {
            var userId = getCloudUserId();
            try {
                var resp = await fetch('http://8.218.88.15:8080/api/progress?user_id=' + encodeURIComponent(userId), {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                var result = await resp.json();
                if (result.success && result.data) {
                    var cloudData = result.data;
                    var localData = state.userData || {};
                    if (cloudData.personality && !localData.personality) localData.personality = cloudData.personality;
                    if (cloudData.diagnosis && !localData.diagnosis) localData.diagnosis = cloudData.diagnosis;
                    if (cloudData.plan && !localData.plan) localData.plan = cloudData.plan;
                    if (cloudData.planToken) localData.planToken = cloudData.planToken;
                    if (cloudData.planOrderId) localData.planOrderId = cloudData.planOrderId;
                    if (cloudData.streak !== undefined) localData.streak = cloudData.streak;
                    if (cloudData.abilityScores && !localData.abilityScores) localData.abilityScores = cloudData.abilityScores;
                    if (cloudData.chatList && cloudData.chatList.length > 0) {
                        var localChat = localData.chatList || [];
                        var mergedChat = [...cloudData.chatList];
                        localChat.forEach(function(chat) {
                            var exists = mergedChat.some(function(c) { return c.id === chat.id; });
                            if (!exists) mergedChat.push(chat);
                        });
                        mergedChat.sort(function(a, b) { return (b.lastMsgTime || 0) - (a.lastMsgTime || 0); });
                        localData.chatList = mergedChat;
                    }
                    state.userData = localData;
                    saveUserData(state.userData);
                    console.log('[Cloud] 数据同步成功');
                    return true;
                }
            } catch(e) {
                console.log('[Cloud] 从云端同步失败，使用本地数据:', e.message);
            }
            return false;
        }

        // 保存用户数据到云端
        async function saveUserDataToCloud(data) {
            var userId = getCloudUserId();
            try {
                var resp = await fetch('http://8.218.88.15:8080/api/progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId, data: data })
                });
                var result = await resp.json();
                if (result.success) console.log('[Cloud] 数据已保存到云端');
                return result.success;
            } catch(e) {
                console.log('[Cloud] 保存到云端失败:', e.message);
                return false;
            }
        }

        // 统一保存函数：同时保存到localStorage和云端
        function saveUserData(data) {
            state.userData = data;
            saveUserData(state.userData);
            saveUserDataToCloud(data).catch(function() {});
        }

        function restoreLastState() {
            // 每次打开都回到首页，不自动跳转到聊天页
            localStorage.removeItem('cet_current_tab');
            switchTab('home');
        }

        // ===== URL hash路由处理 =====
        var _switchingTab = false; // 防止switchTab设hash触发hashchange循环

        function handleHashNavigation() {
            // 如果是switchTab主动设的hash，不重复处理
            if (_switchingTab) return;
            var hash = window.location.hash.slice(1); // 去掉#
            if (!hash) return;
            
            var tabMap = {
                'home': 'home',
                'practice': 'diagnosis',
                'data': 'data',
                'profile': 'profile',
                'chat': 'diagnosis'
            };
            
            var targetTab = tabMap[hash];
            if (targetTab) {
                switchTab(targetTab);
                // hash导航只切tab+显示列表，不自动打开聊天
                if (hash === 'chat' || hash === 'practice') {
                    showChatList();
                }
            }
        }

        // 监听hash变化
        window.addEventListener('hashchange', handleHashNavigation);

        function checkClaimUrl() {
            var params = new URLSearchParams(window.location.search);
            var claimCode = params.get('code');
            var orderId = params.get('order_id') || params.get('orderId');

            // 没有激活参数就不检查，直接返回
            if (!claimCode && !orderId) return;

            // 如果已经有套餐了就不重复激活
            if (state.userData && state.userData.plan && state.userData.plan !== 'free') {
                showToast('您已开通' + (state.userData.plan === 'flagship' ? '全程营' : '冲刺营') + '，无需重复激活');
                window.history.replaceState({}, '', '/');
                return;
            }

            // 优先处理order_id参数（面包多订单号自动激活）
            if (orderId) {
                activateWithOrderIdDirect(orderId.trim());
                return;
            }

            // 处理激活码
            if (!claimCode) return;
            fetch('http://8.218.88.15:8080/api/activate-with-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: claimCode.trim() })
            }).then(function(r) { return r.json(); }).then(function(resp) {
                if (resp.success) {
                    activateSuccess(resp.plan, resp.token, resp.orderId);
                    showToast('🎉 ' + (resp.plan === 'flagship' ? '全程营' : '冲刺营') + ' 已开通！');
                } else {
                    showToast('激活失败：' + (resp.error || '激活码无效'));
                }
                window.history.replaceState({}, '', '/');
            }).catch(function(e) {
                showToast('网络错误，请重试');
                window.history.replaceState({}, '', '/');
            });
        }

        // 面包多订单号直接激活（从URL参数进入）
        function activateWithOrderIdDirect(orderId) {
            var plan = 'sprint';
            var msgEl = document.getElementById('activate-msg') || document.createElement('div');
            
            fetch('http://8.218.88.15:8080/api/activate-with-mbd-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, plan: plan })
            }).then(function(r) { return r.json(); }).then(function(resp) {
                if (resp.success) {
                    activateSuccess(resp.plan, resp.token, resp.orderId);
                    showToast('🎉 ' + (resp.plan === 'flagship' ? '全程营' : '冲刺营') + ' 已开通！');
                    // 激活成功后自动跳转到聊天页面开始使用
                    switchTab('diagnosis');
                    setTimeout(function() { openChat('companion'); }, 500);
                } else {
                    showToast('激活失败：' + (resp.error || '订单验证失败'));
                }
                window.history.replaceState({}, '', '/');
            }).catch(function(e) {
                showToast('网络错误，请重试');
                window.history.replaceState({}, '', '/');
            });
        }

        // 统一的激活成功处理
        function activateSuccess(plan, token, orderId) {
            state.userData = state.userData || {};
            state.userData.plan = plan;
            state.userData.planToken = token;
            state.userData.planOrderId = orderId;
            state.userData.planActivatedAt = Date.now();
            saveUserData(state.userData);
            updateProfileStats();
            updateHomeStatus();
        }

        function initGreeting() {
            var hour = new Date().getHours();
            var greeting = '晚上好';
            if (hour < 12) greeting = '早上好';
            else if (hour < 18) greeting = '下午好';
            document.getElementById('greeting-text').textContent = greeting;
        }

        function initCountdown() {
            var examDate = new Date('2026-06-13');
            var now = new Date();
            var diffMs = examDate - now;
            var diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            var diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            
            var text = document.getElementById('countdown-text');
            if (text) {
                if (diffDays > 0) {
                    text.innerHTML = diffHours > 0 ? diffDays + '天' + diffHours + '时' : diffDays + '天';
                } else {
                    text.textContent = diffHours > 0 ? diffHours + '小时' : '即将到来';
                }
            }
            var homeCd = document.getElementById('home-countdown');
            if (homeCd) {
                var cdText = diffDays > 0 ? (diffHours > 0 ? '距四级 ' + diffDays + '天' + diffHours + '时' : '距四级 ' + diffDays + '天') : '四级加油';
                homeCd.innerHTML = '<span class="cd-days">' + diffDays + '</span>天' + (diffHours > 0 ? diffHours + '时' : '');
            }
            var chatCd = document.getElementById('chat-countdown');
            if (chatCd) {
                chatCd.textContent = diffDays > 0 ? diffHours > 0 ? '距四级 ' + diffDays + '天' + diffHours + '时' : '距四级 ' + diffDays + '天' : '四级加油';
            }
        }

        function initTabEvents() {
            document.querySelectorAll('.tab-item').forEach(function(item) {
                item.addEventListener('click', function() {
                    var tab = this.dataset.tab;
                    switchTab(tab);
                });
            });
        }

        function switchTab(tab) {
            state.currentTab = tab;
            document.querySelectorAll('.tab-page').forEach(function(page) {
                page.classList.toggle('active', page.id === 'tab-' + tab);
            });
            document.querySelectorAll('.tab-item').forEach(function(item) {
                item.classList.toggle('active', item.dataset.tab === tab);
            });
            // 确保tab-bar可见（从聊天页返回时）
            var tabBar = document.querySelector('.tab-bar');
            if (tabBar) tabBar.style.display = '';
            // URL hash路由（设置标志防止hashchange循环）
            var hashName = tab === 'diagnosis' ? 'practice' : tab;
            _switchingTab = true;
            window.location.hash = hashName;
            setTimeout(function() { _switchingTab = false; }, 50);
            localStorage.setItem('cet_current_tab', tab);
            if (tab === 'diagnosis') {
                // 切换到练习tab时显示对话列表
                showChatList();
            }
            if (tab === 'plans') {
                renderBenefits();
            }
            if (tab === 'progress') {
                renderDashboard();
            }
            if (tab === 'wrongbook') {
                renderWrongBook();
            }
            if (tab === 'path') {
                renderLearningPath();
            }
        }

        // ===== 快捷操作函数 =====
        function handleQuickAction(mode) {
            // 开场白快捷按钮处理
            if (mode === 'diagnosis') {
                startNewDiagnosis();
            } else if (mode === 'companion') {
                createNewChat('companion');
            }
        }

        function handleCapsuleClick(text) {
            // 快捷胶囊按钮点击处理
            if (text === '练题' || text === '做真题') {
                openQuiz();
                return;
            }
            if (text === '批改作文') {
                handleEssayClick();
                return;
            }
            var input = document.getElementById('chat-input');
            if (input) {
                input.value = text;
                sendMessage();
            }
        }
        
        function handleEssayClick() {
            openChat('companion');
            setTimeout(function(){ sendSuggestion('帮我批改作文'); }, 300);
        }
        
        var _reviewClickLock = false;
        function handleReviewClick() {
            switchTab('wrongbook');
            renderWrongBook();
        }

        function handleModeTag(mode) {
            // 快捷标签切换模式
            var tag = document.querySelector('.quick-tag-pill[data-mode="' + mode + '"]');
            if (!tag) return;

            // 切换激活状态
            document.querySelectorAll('.quick-tag-pill').forEach(function(t) {
                t.classList.remove('active');
            });
            tag.classList.add('active');

            // 设置Bot ID和模式（根据mode选择对应的Bot）
            var botMap = {
                'diagnosis': '7636289658620215331',
                'companion': '7637702903679631395',
                'wrongbook': '7637702903679631395',  // 错题复习使用陪练Bot
                'essay': '7637702903679631395'       // 作文批改使用陪练Bot
            };
            chatState.botId = botMap[mode] || '7637702903679631395';
            chatState.currentMode = mode;

            // 发送对应消息
            var messages = {
                'diagnosis': '我想做一个AI诊断，帮我分析四级薄弱点',
                'companion': '继续陪我练习，帮我针对薄弱点强化训练',
                'wrongbook': '复习我之前的错题',
                'essay': '我想批改作文'
            };

            var msg = messages[mode];
            if (msg) {
                sendSuggestion(msg);
            }
        }

        // ===== 进度仪表盘函数 =====

        // ===== 错题本渲染函数 =====
        var wrongbookFilterType = '全部';

        function filterWrongbook(type) {
            wrongbookFilterType = type;
            renderWrongBook();
        }
        
        function renderWrongBook() {
            var container = document.getElementById('wrongbook-content');
            if (!container) return;
            
            var questions = getWrongQuestions();
            var stats = getWrongQuestionStats();
            
            if (wrongbookFilterType !== '全部') {
                questions = questions.filter(function(q) { return q.type === wrongbookFilterType; });
            }
            
            var html = '';
            
            // Hero区域 - 和数据页一致
            html += '<div class="wrongbook-hero">';
            html += '<h2>错题本</h2>';
            html += '<div class="wrongbook-hero-sub">记录每一次失误，让进步更有方向</div>';
            html += '<div class="wrongbook-hero-divider"></div>';
            html += '</div>';
            
            // 主卡 - 大数字
            html += '<div class="wrongbook-hero-card">';
            html += '<div class="wrongbook-hero-number">' + stats.total + '</div>';
            html += '<div class="wrongbook-hero-label">错题总数</div>';
            html += '<div class="wrongbook-sub-stats">';
            html += '<div class="wrongbook-sub-item"><span class="sub-dot"></span><span class="sub-num">' + stats.todayNew + '</span> 今日新增</div>';
            html += '<div class="wrongbook-sub-item"><span class="sub-dot" style="background:#10B981"></span><span class="sub-num">' + (stats.total - stats.todayNew >= 0 ? stats.total - stats.todayNew : 0) + '</span> 待复习</div>';
            html += '</div>';
            html += '</div>';
            
            // 分类分布 - 紧凑一行
            html += '<div class="wrongbook-section">';
            html += '<div class="wrongbook-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>错题分布</div>';
            html += '<div class="wrongbook-distribution">';
            html += '<div class="dist-item" onclick="filterWrongbook(\'词汇\')"><span class="dist-count">' + stats.vocabulary + '</span><span class="dist-label vocab">词汇</span></div>';
            html += '<div class="dist-item" onclick="filterWrongbook(\'语法\')"><span class="dist-count">' + stats.grammar + '</span><span class="dist-label grammar">语法</span></div>';
            html += '<div class="dist-item" onclick="filterWrongbook(\'阅读\')"><span class="dist-count">' + stats.reading + '</span><span class="dist-label reading">阅读</span></div>';
            html += '<div class="dist-item" onclick="filterWrongbook(\'听力\')"><span class="dist-count">' + stats.listening + '</span><span class="dist-label listening">听力</span></div>';
            html += '</div>';
            html += '</div>';
            
            // 筛选标签
            html += '<div class="wrongbook-section">';
            html += '<div class="wrongbook-filter-bar">';
            var filterTypes = ['全部', '词汇', '语法', '阅读', '听力'];
            filterTypes.forEach(function(type) {
                var active = wrongbookFilterType === type ? 'active' : '';
                html += '<div class="filter-tag ' + active + '" onclick="filterWrongbook(\'' + type + '\')">' + type + '</div>';
            });
            html += '</div>';
            html += '</div>';
            
            // 错题列表
            if (questions.length === 0) {
                html += '<div class="wrongbook-section">';
                html += '<div class="wrongbook-empty">';
                html += '<div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg></div>';
                html += '<div class="empty-title">还没有错题</div>';
                html += '<div class="empty-desc">继续保持，做题全对的感觉太棒了！</div>';

                html += '</div>';
                html += '</div>';
            } else {
                html += '<div class="wrongbook-section">';
                html += '<div class="wrongbook-list">';
                questions.forEach(function(q, index) {
                    html += renderWrongQuestionCard(q, index);
                });
                html += '</div>';
                html += '</div>';
            }
            
            // 底部间距
            html += '<div class="wrongbook-bottom-spacer"></div>';
            
            container.innerHTML = html;
        }
        
        function renderWrongQuestionCard(q, index) {
            var typeMap = {
                '词汇': 'vocab',
                '语法': 'grammar',
                '阅读': 'reading',
                '听力': 'listening'
            };
            var typeClass = typeMap[q.type] || 'vocab';
            var date = new Date(q.createdAt);
            var dateStr = (date.getMonth() + 1) + '月' + date.getDate() + '日 ' + date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
            var isReviewed = q.reviewedAt && q.reviewedAt >= q.updatedAt;
            
            var html = '<div class="wrong-card ' + typeClass + '" onclick="toggleWrongDetail(this)">';
            html += '<div class="wrong-card-header">';
            html += '<span class="wrong-type-tag ' + typeClass + '">' + (q.type || '词汇') + '</span>';
            if (isReviewed) {
                html += '<span class="wrong-reviewed-badge">已复习</span>';
            }
            html += '<span class="wrong-date">' + dateStr + '</span>';
            html += '</div>';
            html += '<div class="wrong-question">' + escapeHtml(q.question || '') + '</div>';
            html += '<div class="wrong-answer-compare">';
            html += '<span class="your-answer wrong">你的: ' + (q.userAnswer || '-') + '</span>';
            html += '<span class="correct-answer right">正确: ' + (q.answer || '-') + '</span>';
            html += '</div>';
            html += '<div class="wrong-detail">';
            html += '<div class="wrong-options">';
            var options = [
                {key: 'A', val: q.optionA},
                {key: 'B', val: q.optionB},
                {key: 'C', val: q.optionC},
                {key: 'D', val: q.optionD}
            ];
            options.forEach(function(opt) {
                if (opt.val) {
                    var optClass = opt.key === q.answer ? 'option-correct' : (opt.key === q.userAnswer ? 'option-wrong' : '');
                    html += '<div class="wrong-option ' + optClass + '"><span class="opt-key">' + opt.key + '</span>' + escapeHtml(opt.val) + '</div>';
                }
            });
            html += '</div>';
            html += '<div class="wrong-explanation">';
            html += '<div class="exp-label">解析</div>';
            html += '<div class="exp-content">' + escapeHtml(q.explanation || '暂无解析') + '</div>';
            html += '</div>';
            html += '<div class="wrong-actions">';
            html += '<button class="action-btn ai-btn" onclick="event.stopPropagation(); explainWithAI(\'' + q.id + '\')">';
            html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
            html += 'AI讲解</button>';
            html += '<button class="action-btn master-btn" onclick="event.stopPropagation(); markAsMastered(\'' + q.id + '\')">';
            html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
            html += '已掌握</button>';
            html += '</div>';
            html += '</div>';
            html += '</div>';
            return html;
        }
        
        function toggleWrongDetail(card) {
            var detail = card.querySelector('.wrong-detail');
            if (detail) {
                if (detail.style.display === 'none' || detail.style.display === '') {
                    detail.style.display = 'block';
                    detail.classList.add('show');
                    card.classList.add('expanded');
                } else {
                    detail.style.display = 'none';
                    detail.classList.remove('show');
                    card.classList.remove('expanded');
                }
            }
        }
        
        function escapeHtml(text) {
            if (!text) return '';
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        function explainWithAI(id) {
            var questions = getWrongQuestions();
            var q = questions.find(function(item) { return item.id === id; });
            if (!q) return;
            markQuestionReviewed(id);
            switchTab('diagnosis');
            setTimeout(function() {
                var context = '请帮我讲解这道' + (q.type || '词汇') + '题：\n\n' + 
                    '题目：' + q.question + '\n\n' +
                    'A. ' + q.optionA + '\n' +
                    'B. ' + q.optionB + '\n' +
                    'C. ' + q.optionC + '\n' +
                    'D. ' + q.optionD + '\n\n' +
                    '正确答案：' + q.answer + '\n' +
                    '解析：' + q.explanation;
                sendSuggestion(context);
            }, 300);
        }
        
        function markAsMastered(id) {
            deleteWrongQuestion(id);
            renderWrongBook();
            showToast('已从错题本移除');
        }

        function renderDashboard() {
            try {
            var container = document.getElementById('dashboard-content');
            if (!container) return;
            
            var userData = state.userData || {};
            var streak = getStreakData();
            var practiceHistory = getPracticeHistory();
            var abilityScores = getAbilityScores();
            var userProfile = getUserProfile() || {};
            
            // 计算今日练习题数
            var today = getTodayStr();
            var todayCount = 0;
            if (practiceHistory && practiceHistory.length) {
                practiceHistory.forEach(function(item) {
                    if (item.date === today) todayCount += (item.count || 1);
                });
            }
            
            // 计算累计练习和正确率
            var totalPractice = 0;
            var totalCorrect = 0;
            if (practiceHistory && practiceHistory.length) {
                practiceHistory.forEach(function(item) {
                    totalPractice += (item.count || 1);
                    totalCorrect += (item.correct || 0);
                });
            }
            var accuracy = totalPractice > 0 ? Math.round((totalCorrect / totalPractice) * 100) : 0;
            
            // 计算距考试天数
            var examDate = new Date('2026-06-13');
            var now = new Date();
            var daysToExam = Math.max(0, Math.ceil((examDate - now) / (1000 * 60 * 60 * 24)));
            
            // 计算45天计划进度
            var planDays = 45;
            var startDate = userProfile.startDate || getTodayStr();
            var daysSinceStart = getDaysDiff(startDate, today);
            var planProgress = Math.min(100, Math.round((daysSinceStart / planDays) * 100));
            var currentDay = Math.min(planDays, daysSinceStart + 1);
            
            // 获取五维分数
            var dims = abilityScores && abilityScores.dims ? abilityScores.dims : {};
            var hasDimData = Object.keys(dims).length > 0;
            
            // 计算预估分数
            var estimatedScore = 0;
            if (hasDimData) {
                var weights = {
                    '细节定位': 0.25,
                    '推理判断': 0.25,
                    '同义替换': 0.2,
                    '主旨归纳': 0.15,
                    '态度判断': 0.15
                };
                var weightedSum = 0;
                var weightSum = 0;
                Object.keys(weights).forEach(function(key) {
                    if (dims[key]) {
                        weightedSum += dims[key] * weights[key];
                        weightSum += weights[key];
                    }
                });
                if (weightSum > 0) {
                    estimatedScore = Math.round((weightedSum / weightSum) * 7.1);
                    estimatedScore = Math.max(425, Math.min(710, estimatedScore));
                }
            }
            
            // 生成热力图数据
            var heatmapData = getHeatmapData();
            
            // 找到薄弱项
            var weakDims = [];
            if (hasDimData) {
                var sortedDims = Object.keys(dims).sort(function(a, b) {
                    return (dims[a] || 100) - (dims[b] || 100);
                });
                weakDims = sortedDims.slice(0, 2);
            }
            
            // SVG图标定义
            var icons = {
                chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 21H3V3"/><path d="M21 9l-6 6-4-4-6 6"/></svg>',
                flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/></svg>',
                target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
                alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
                calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
                trending: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
                list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
                stats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
                search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
                pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',
                book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
                check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
                arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'
            };
            
            var html = '';
            
            // 添加渐变光晕背景
            html += '<div class="dashboard-glow"></div>';
            html += '<div class="dashboard-glow-2"></div>'; 
            
            // ===== Hero区域 - 优雅简洁 =====
            html += '<div class="dashboard-hero">';
            html += '<div class="dashboard-hero-title">学习进度</div>';
            html += '<div class="dashboard-hero-sub">让你的进步看得见</div>';
            html += '<div class="dashboard-hero-divider"></div>';

            html += '</div>';
            
            // ===== 概览卡片 - 2大+2小布局 =====
            html += '<div class="dashboard-overview">';
            // 大卡片1: 连续学习天数
            html += '<div class="dashboard-overview-card large streak-card shimmer-card">';
            html += '<div class="overview-icon" style="background:rgba(255,255,255,0.2)">' + icons.flame + '</div>';
            html += '<div class="overview-num">' + streak.count + '</div>';
            html += '<div class="overview-label">连续学习天数</div>';
            html += '</div>';
            // 大卡片2: 预估分数
            html += '<div class="dashboard-overview-card large score-card shimmer-card">';
            html += '<div class="overview-icon" style="background:rgba(255,255,255,0.2)">' + icons.target + '</div>';
            html += '<div class="overview-num">' + (hasDimData ? estimatedScore : '--') + '</div>';
            html += '<div class="overview-label">预估分数' + (hasDimData ? '' : '<span class="overview-label-hint">完成诊断后解锁</span>') + '</div>';
            html += '</div>';
            // 小卡片1: 今日练习
            html += '<div class="dashboard-overview-card small practice">';
            html += '<div class="overview-icon" style="background:rgba(0,184,148,0.1)">' + icons.pencil + '</div>';
            html += '<div class="overview-num">' + todayCount + '</div>';
            html += '<div class="overview-label">今日练习</div>';
            html += '</div>';
            // 小卡片2: 正确率
            html += '<div class="dashboard-overview-card small accuracy">';
            html += '<div class="overview-icon" style="background:rgba(108,92,231,0.1)">' + icons.check + '</div>';
            html += '<div class="overview-num">' + accuracy + '%</div>';
            html += '<div class="overview-label">总正确率</div>';
            html += '</div>';
            html += '</div>';
            
            // ===== 五维能力雷达图区域 =====
            html += '<div class="dashboard-radar-section glass-card">';
            html += '<div class="dashboard-radar-header">';
            html += '<div class="dashboard-radar-title">' + icons.chart + '五维能力分析</div>';
            if (weakDims.length > 0) {
                html += '<div class="dashboard-radar-tip">' + icons.alert + '最弱项: ' + weakDims[0] + '</div>';
            }
            html += '</div>';
            if (hasDimData) {
                html += '<div class="dashboard-radar-canvas-wrap">';
                html += '<canvas id="dashboard-radar-canvas" width="260" height="260"></canvas>';
                html += '</div>';
                // 维度标签
                html += '<div class="dashboard-radar-dims">';
                var dimNames = ['细节定位', '推理判断', '同义替换', '主旨归纳', '态度判断'];
                dimNames.forEach(function(dim) {
                    var score = dims[dim] || 0;
                    var isWeak = weakDims.indexOf(dim) !== -1;
                    html += '<div class="dashboard-radar-dim-tag' + (isWeak ? ' weak' : '') + '">';
                    html += '<span class="dashboard-radar-dim-name">' + dim + '</span>';
                    html += '<span class="dashboard-radar-dim-score">' + score + '</span>';
                    html += '</div>';
                });
                html += '</div>';
            } else {
                html += '<div class="dashboard-radar-empty">';
                html += '<div class="dashboard-radar-empty-icon">' + icons.search + '</div>';
                html += '<div class="dashboard-radar-empty-text">完成首次诊断后解锁<br>AI将分析你的五维能力</div>';
                html += '</div>';
            }
            html += '</div>';
            
            // ===== 45天计划进度 - 环形进度条 =====
            html += '<div class="dashboard-plan-section glass-card">';
            html += '<div class="dashboard-plan-header">';
            html += '<div class="dashboard-plan-title">' + icons.calendar + '45天冲刺计划</div>';
            html += '<div class="dashboard-plan-day">第 ' + currentDay + ' 天 / 45天</div>';
            html += '</div>';
            // SVG环形进度
            var circumference = 2 * Math.PI * 42;
            var offset = circumference - (planProgress / 100) * circumference;
            html += '<div class="dashboard-plan-circle-wrap">';
            html += '<div class="dashboard-plan-circle">';
            html += '<svg viewBox="0 0 100 100">';
            html += '<defs><linearGradient id="planGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#6C5CE7"/><stop offset="100%" stop-color="#A29BFE"/></linearGradient></defs>';
            html += '<circle class="dashboard-plan-circle-bg" cx="50" cy="50" r="42"/>';
            html += '<circle class="dashboard-plan-circle-progress" cx="50" cy="50" r="42" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '"/>';
            html += '</svg>';
            html += '<div class="dashboard-plan-circle-text">';
            html += '<div class="dashboard-plan-circle-day">' + planProgress + '%</div>';
            html += '<div class="dashboard-plan-circle-label">完成度</div>';
            html += '</div>';
            html += '</div>';
            html += '</div>';
            html += '<div class="dashboard-plan-footer">';
            html += '<span>开始于 ' + formatDate(startDate) + '</span>';
            html += '<span class="dashboard-plan-end">距考试 ' + daysToExam + ' 天</span>';
            html += '</div>';
            html += '</div>';
            
            // ===== 近7天热力图 =====
            html += '<div class="dashboard-heatmap-section glass-card">';
            html += '<div class="dashboard-heatmap-title">' + icons.trending + '近7天练习热力图</div>';
            html += '<div class="dashboard-heatmap-grid">';
            var dayLabels = ['一', '二', '三', '四', '五', '六', '日'];
            var hasHeatmapData = false;
            for (var i = 0; i < 7; i++) {
                var dayData = heatmapData[i] || { count: 0, label: '' };
                if (dayData.count > 0) hasHeatmapData = true;
                var level = dayData.count === 0 ? '' : (dayData.count <= 3 ? 'level-1' : (dayData.count <= 7 ? 'level-2' : (dayData.count <= 12 ? 'level-3' : 'level-4')));
                html += '<div class="dashboard-heatmap-cell ' + level + '">';
                html += '<div class="dashboard-heatmap-tooltip">' + dayData.label + '<br>' + dayData.count + ' 题</div>';
                html += '</div>';
            }
            html += '</div>';
            html += '<div class="dashboard-heatmap-labels">';
            for (var j = 0; j < 7; j++) {
                html += '<div class="dashboard-heatmap-label">' + dayLabels[j] + '</div>';
            }
            html += '</div>';
            // 全0时显示提示
            if (!hasHeatmapData) {
                html += '<div class="dashboard-heatmap-empty-tip">开始练习后记录你的学习轨迹</div>';
            }
            html += '</div>';
            
            // ===== 薄弱项卡片 - 左侧彩色竖条 =====
            if (weakDims.length > 0) {
                html += '<div class="dashboard-weak-section">';
                html += '<div class="dashboard-section-title">' + icons.alert + '薄弱项专项提升</div>';
                weakDims.forEach(function(dim) {
                    var config = DIM_CONFIGS[dim] || {};
                    var score = dims[dim] || 0;
                    var actionText = getWeakActionText(dim, score);
                    html += '<div class="dashboard-weak-card" onclick="doCheckIn()">';
                    html += '<div class="dashboard-weak-icon" style="background:' + (config.color || '#6C5CE7') + '15">';
                    html += '<svg viewBox="0 0 24 24" fill="none" stroke="' + (config.color || '#6C5CE7') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
                    html += '</div>';
                    html += '<div class="dashboard-weak-info">';
                    html += '<div class="dashboard-weak-name">' + dim + '</div>';
                    html += '<div class="dashboard-weak-score">当前分数: ' + score + '分</div>';
                    html += '<div class="dashboard-weak-bar"><div class="dashboard-weak-bar-fill" style="width:' + score + '%"></div></div>';
                    html += '<div class="dashboard-weak-action">' + actionText + '</div>';
                    html += '</div>';
                    html += '<div class="dashboard-weak-arrow">' + icons.arrow + '</div>';
                    html += '</div>';
                });
                html += '</div>';
            }
            
            // ===== 预估分数卡 - 深色高亮 =====
            if (hasDimData) {
                var targetScore = 500;
                var diff = targetScore - estimatedScore;
                var scorePercent = Math.round(((estimatedScore - 425) / (710 - 425)) * 100);
                html += '<div class="dashboard-score-section">';
                html += '<div class="dashboard-score-header">';
                html += '<div class="dashboard-score-title">' + icons.target + '预估分数</div>';
                html += '<div class="dashboard-score-target">目标: ' + targetScore + ' 分</div>';
                html += '</div>';
                html += '<div class="dashboard-score-main">';
                html += '<span class="dashboard-score-num">' + estimatedScore + '</span>';
                html += '<span class="dashboard-score-unit">分</span>';
                html += '</div>';
                html += '<div class="dashboard-score-bar">';
                html += '<div class="dashboard-score-bar-fill" style="width:' + Math.min(100, scorePercent) + '%"></div>';
                html += '</div>';
                html += '<div class="dashboard-score-footer">';
                html += '<span>及格线 425分</span>';
                if (diff > 0) {
                    html += '<span class="dashboard-score-diff">还差 ' + diff + ' 分</span>';
                } else {
                    html += '<span style="color:#00B894">已超过目标</span>';
                }
                html += '</div>';
                html += '</div>';
            }
            
            // ===== 学习记录统计 =====
            html += '<div class="dashboard-stats-section glass-card">';
            html += '<div class="dashboard-stats-title">' + icons.stats + '学习数据统计</div>';
            html += '<div class="dashboard-stats-grid">';
            html += '<div class="dashboard-stat-item">';
            html += '<div class="dashboard-stat-num">' + streak.count + '</div>';
            html += '<div class="dashboard-stat-label">连续学习天数</div>';
            html += '</div>';
            html += '<div class="dashboard-stat-item">';
            html += '<div class="dashboard-stat-num">' + totalPractice + '</div>';
            html += '<div class="dashboard-stat-label">累计练习题数</div>';
            html += '</div>';
            html += '<div class="dashboard-stat-item">';
            html += '<div class="dashboard-stat-num">' + accuracy + '%</div>';
            html += '<div class="dashboard-stat-label">总正确率</div>';
            html += '</div>';
            html += '<div class="dashboard-stat-item">';
            html += '<div class="dashboard-stat-num">' + (userData.studyDays || 0) + '</div>';
            html += '<div class="dashboard-stat-label">学习总天数</div>';
            html += '</div>';
            html += '</div>';
            html += '</div>';
            
            // ===== 正确率趋势图 =====
            var hasTrendData = totalPractice > 0;
            html += '<div class="dashboard-trend-section glass-card">';
            html += '<div class="dashboard-trend-header">';
            html += '<div class="dashboard-trend-title">' + icons.trending + '正确率趋势</div>';
            html += '<div class="dashboard-trend-period"><button class="active">近7天</button></div>';
            html += '</div>';
            html += '<div class="dashboard-trend-canvas-wrap">';
            if (hasTrendData) {
                html += '<canvas id="dashboard-trend-canvas"></canvas>';
            } else {
                html += '<div class="dashboard-trend-empty">';
                html += '<div class="dashboard-trend-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div>';
                html += '<div class="dashboard-trend-empty-text">完成练习后查看正确率趋势</div>';
                html += '</div>';
            }
            html += '</div>';
            html += '</div>';
            
            // ===== 诊断报告历史 - 时间线样式 =====
            html += '<div class="dashboard-report-section">';
            html += '<div class="dashboard-section-title">' + icons.list + '诊断报告历史</div>';
            html += '<div class="dashboard-report-timeline">';
            var reportHistory = getDiagnosisReports();
            if (reportHistory && reportHistory.length > 0) {
                reportHistory.forEach(function(report) {
                    html += '<div class="dashboard-report-card glass-card">';
                    html += '<div class="dashboard-report-header">';
                    html += '<div class="dashboard-report-date">' + report.date + '</div>';
                    html += '<div class="dashboard-report-score">' + report.score + '分</div>';
                    html += '</div>';
                    html += '<div class="dashboard-report-dims">';
                    var dimNames = ['细节定位', '推理判断', '同义替换', '主旨归纳', '态度判断'];
                    dimNames.forEach(function(dim) {
                        var dimScore = report.dims && report.dims[dim] ? report.dims[dim] : '--';
                        var isWeak = weakDims.indexOf(dim) !== -1;
                        html += '<div class="dashboard-report-dim">';
                        html += '<div class="dashboard-report-dim-name">' + dim + '</div>';
                        html += '<div class="dashboard-report-dim-score' + (isWeak ? ' weak' : '') + '">' + (typeof dimScore === 'number' ? dimScore + '分' : dimScore) + '</div>';
                        html += '</div>';
                    });
                    html += '</div>';
                    if (report.personality) {
                        html += '<div class="dashboard-report-personality">' + report.personality + '</div>';
                    }
                    html += '</div>';
                });
            } else {
                html += '<div class="dashboard-report-empty">';
                html += '<div class="dashboard-empty-icon">' + icons.pencil + '</div>';
                html += '<div>暂无诊断记录</div>';
                html += '<div style="font-size:12px;margin-top:4px">完成AI诊断后即可查看报告</div>';
                html += '</div>';
            }
            html += '</div>'; // end timeline
            html += '</div>';
            
            // ===== 底部安全区域 =====
            html += '<div class="dashboard-bottom-spacer"></div>';
            
            container.innerHTML = html;
            
            // 启动CountUp数字动画
            setTimeout(function() {
                animateCountUp();
            }, 300);
            
            // 启动环形进度条动画
            setTimeout(function() {
                animateRingProgress();
            }, 500);
            
            
            
            // 绘制雷达图
            if (hasDimData) {
                setTimeout(function() {
                    drawDashboardRadar(dims);
                }, 100);
            }
            
            // 绘制正确率趋势图
            setTimeout(function() {
                drawDashboardTrend();
            }, 150);
            } catch(e) { 
                console.error('renderDashboard error:', e); 
                var c = document.getElementById('dashboard-content');
                if(c) c.innerHTML = '<div style="padding:40px 20px;text-align:center"><div style="font-size:40px;margin-bottom:12px">📊</div><div style="font-size:16px;font-weight:600">数据页面加载失败</div><div style="font-size:13px;color:#64748B;margin-top:8px">请刷新页面重试</div></div>';
            }
        }


        // ===== CountUp数字滚动动画 =====
        function animateCountUp() {
            var elements = document.querySelectorAll('.dashboard-overview-card.large .overview-num, .dashboard-overview-card.small .overview-num, .dashboard-stat-num, .dashboard-score-num');
            elements.forEach(function(el) {
                var text = el.textContent;
                var num = parseInt(text.replace(/[^0-9]/g, ''));
                var suffix = text.replace(/[0-9]/g, '');
                
                if (isNaN(num) || num === 0) return;
                
                var duration = 800;
                var startTime = performance.now();
                
                function update(currentTime) {
                    var elapsed = currentTime - startTime;
                    var progress = Math.min(elapsed / duration, 1);
                    // ease-out cubic
                    var easeOut = 1 - Math.pow(1 - progress, 3);
                    var current = Math.round(num * easeOut);
                    el.textContent = current + suffix;
                    
                    if (progress < 1) {
                        requestAnimationFrame(update);
                    }
                }
                
                // 初始为0
                el.textContent = '0' + suffix;
                requestAnimationFrame(update);
            });
        }
        
        // ===== 环形进度条动画 =====
        function animateRingProgress() {
            var progress = document.querySelector('.dashboard-plan-circle-progress');
            if (!progress) return;
            
            var dashOffset = progress.getAttribute('stroke-dashoffset');
            if (!dashOffset) return;
            
            var targetOffset = parseFloat(dashOffset);
            var circumference = 263.89; // 2 * PI * 42
            
            // 重置为0
            progress.style.strokeDashoffset = circumference;
            
            // 触发重排
            progress.offsetHeight;
            
            // 动画到目标值
            progress.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)';
            progress.style.strokeDashoffset = targetOffset;
        }

        function drawDashboardRadar(data) {
            var canvas = document.getElementById('dashboard-radar-canvas');
            if (!canvas) return;
            
            var ctx = canvas.getContext('2d');
            var dpr = window.devicePixelRatio || 1;
            var size = 240;
            
            canvas.width = size * dpr;
            canvas.height = size * dpr;
            canvas.style.width = size + 'px';
            canvas.style.height = size + 'px';
            ctx.scale(dpr, dpr);
            
            var centerX = size / 2;
            var centerY = size / 2;
            var maxRadius = 85;
            
            var dims = Object.keys(DIM_CONFIGS);
            var n = dims.length;
            var angleStep = (Math.PI * 2) / n;
            
            // 背景网格
            ctx.strokeStyle = '#F1F5F9';
            ctx.lineWidth = 1;
            for (var r = 1; r <= 5; r++) {
                ctx.beginPath();
                for (var i = 0; i <= n; i++) {
                    var angle = i * angleStep - Math.PI / 2;
                    var x = centerX + Math.cos(angle) * (r * maxRadius / 5);
                    var y = centerY + Math.sin(angle) * (r * maxRadius / 5);
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.stroke();
            }
            
            // 径向线
            for (var i = 0; i < n; i++) {
                var angle = i * angleStep - Math.PI / 2;
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(centerX + Math.cos(angle) * maxRadius, centerY + Math.sin(angle) * maxRadius);
                ctx.stroke();
            }
            
            // 数据区域
            var gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
            gradient.addColorStop(0, 'rgba(108,92,231,0.3)');
            gradient.addColorStop(1, 'rgba(108,92,231,0.1)');
            
            ctx.beginPath();
            for (var i = 0; i <= n; i++) {
                var idx = i % n;
                var dimName = dims[idx];
                var score = data[dimName] || 0;
                var r = (score / 100) * maxRadius;
                var angle = i * angleStep - Math.PI / 2;
                var x = centerX + Math.cos(angle) * r;
                var y = centerY + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.strokeStyle = '#6C5CE7';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 数据点
            for (var i = 0; i < n; i++) {
                var dimName = dims[i];
                var score = data[dimName] || 0;
                var r = (score / 100) * maxRadius;
                var angle = i * angleStep - Math.PI / 2;
                var x = centerX + Math.cos(angle) * r;
                var y = centerY + Math.sin(angle) * r;
                
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#6C5CE7';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
            // 标签
            ctx.fillStyle = '#475569';
            ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            for (var i = 0; i < n; i++) {
                var dimName = dims[i];
                var config = DIM_CONFIGS[dimName] || {};
                var angle = i * angleStep - Math.PI / 2;
                var labelR = maxRadius + 22;
                var x = centerX + Math.cos(angle) * labelR;
                var y = centerY + Math.sin(angle) * labelR;
                
                var score = data[dimName] || 0;
                
                ctx.fillStyle = '#64748B';
                ctx.fillText(dimName, x, y);
                ctx.fillStyle = '#475569';
                ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
                ctx.fillText(score + '', x, y + 16);
                ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
            }
        }
        
        function getDiagnosisReports() {
            // 从localStorage获取诊断报告历史
            try {
                var data = localStorage.getItem('cet4_diagnosis_reports');
                if (data) return JSON.parse(data);
                
                // 兼容旧数据：从cet_user中读取诊断数据作为最近一次报告
                var userData = safeGetItem('cet_user', {});
                if (userData && userData.diagnosis && userData.diagnosis.type) {
                    // 估算一个诊断日期
                    var diagDate = userData.diagnosedAt ? new Date(userData.diagnosedAt) : new Date();
                    var dateStr = (diagDate.getMonth() + 1) + '月' + diagDate.getDate() + '日';
                    
                    // 计算预估分数
                    var dims = userData.diagnosis;
                    var weights = {
                        '细节定位': 0.25, '推理判断': 0.25, '同义替换': 0.2,
                        '主旨归纳': 0.15, '态度判断': 0.15
                    };
                    var weightedSum = 0, weightSum = 0;
                    Object.keys(weights).forEach(function(key) {
                        if (dims[key]) {
                            weightedSum += dims[key] * weights[key];
                            weightSum += weights[key];
                        }
                    });
                    var estimatedScore = weightSum > 0 ? Math.round((weightedSum / weightSum) * 7.1) : 0;
                    estimatedScore = Math.max(425, Math.min(710, estimatedScore));
                    
                    return [{
                        date: dateStr,
                        score: estimatedScore,
                        dims: dims
                    }];
                }
            } catch(e) {}
            return [];
        }
        
        function drawDashboardTrend() {
            var canvas = document.getElementById('dashboard-trend-canvas');
            if (!canvas) return;
            
            var ctx = canvas.getContext('2d');
            var dpr = window.devicePixelRatio || 1;
            var width = canvas.offsetWidth || 300;
            var height = 160;
            
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            ctx.scale(dpr, dpr);
            
            // 获取近7天的正确率数据
            var trendData = [];
            var practiceHistory = getPracticeHistory();
            var today = new Date();
            
            for (var i = 6; i >= 0; i--) {
                var d = new Date(today);
                d.setDate(d.getDate() - i);
                var dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                
                var dayTotal = 0;
                var dayCorrect = 0;
                practiceHistory.forEach(function(item) {
                    if (item.date === dateStr) {
                        dayTotal += (item.count || 1);
                        dayCorrect += (item.correct || 0);
                    }
                });
                
                var accuracy = dayTotal > 0 ? Math.round((dayCorrect / dayTotal) * 100) : null;
                trendData.push({ date: dateStr, accuracy: accuracy, total: dayTotal });
            }
            
            // 检查是否有数据
            var hasData = trendData.some(function(d) { return d.accuracy !== null; });
            if (!hasData) {
                // 绘制空状态背景
                ctx.fillStyle = '#FAFBFC';
                ctx.fillRect(0, 0, width, height);
                
                // 绘制虚线引导
                ctx.setLineDash([4, 4]);
                ctx.strokeStyle = '#E2E8F0';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(40, 80);
                ctx.lineTo(width - 20, 80);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // 空状态文字
                ctx.fillStyle = '#94A3B8';
                ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('暂无练习数据', width / 2, height / 2 + 4);
                return;
            }
            
            var padding = { top: 20, right: 20, bottom: 30, left: 40 };
            var chartWidth = width - padding.left - padding.right;
            var chartHeight = height - padding.top - padding.bottom;
            
            // Y轴范围 0-100
            var yMin = 0, yMax = 100;
            
            // 绘制Y轴网格线
            ctx.strokeStyle = '#F1F5F9';
            ctx.lineWidth = 1;
            for (var y = 0; y <= 100; y += 25) {
                var yPos = padding.top + chartHeight - (y - yMin) / (yMax - yMin) * chartHeight;
                ctx.beginPath();
                ctx.moveTo(padding.left, yPos);
                ctx.lineTo(width - padding.right, yPos);
                ctx.stroke();
                
                // Y轴标签
                ctx.fillStyle = '#94a3b8';
                ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(y + '%', padding.left - 8, yPos + 4);
            }
            
            // 绘制折线
            var points = [];
            var validPoints = [];
            trendData.forEach(function(d, i) {
                if (d.accuracy !== null) {
                    var x = padding.left + (i / 6) * chartWidth;
                    var y = padding.top + chartHeight - (d.accuracy - yMin) / (yMax - yMin) * chartHeight;
                    points.push({ x: x, y: y, accuracy: d.accuracy });
                    validPoints.push({ x: x, y: y });
                }
            });
            
            // 绘制线和数据点
            if (validPoints.length > 0) {
                // 渐变填充
                ctx.beginPath();
                validPoints.forEach(function(p, i) {
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                });
                
                // 填充到X轴
                var lastPoint = validPoints[validPoints.length - 1];
                var firstPoint = validPoints[0];
                ctx.lineTo(lastPoint.x, padding.top + chartHeight);
                ctx.lineTo(firstPoint.x, padding.top + chartHeight);
                ctx.closePath();
                
                var gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
                gradient.addColorStop(0, 'rgba(108,92,231,0.3)');
                gradient.addColorStop(1, 'rgba(108,92,231,0.05)');
                ctx.fillStyle = gradient;
                ctx.fill();
                
                // 使用贝塞尔曲线绘制平滑线条
                ctx.beginPath();
                if (validPoints.length === 1) {
                    // 只有一个点，绘制一个小圆
                    ctx.arc(validPoints[0].x, validPoints[0].y, 1, 0, Math.PI * 2);
                } else {
                    ctx.moveTo(validPoints[0].x, validPoints[0].y);
                    for (var i = 0; i < validPoints.length - 1; i++) {
                        var p0 = i > 0 ? validPoints[i - 1] : validPoints[i];
                        var p1 = validPoints[i];
                        var p2 = validPoints[i + 1];
                        var p3 = i < validPoints.length - 2 ? validPoints[i + 2] : p2;
                        
                        var cp1x = p1.x + (p2.x - p0.x) / 6;
                        var cp1y = p1.y + (p2.y - p0.y) / 6;
                        var cp2x = p2.x - (p3.x - p1.x) / 6;
                        var cp2y = p2.y - (p3.y - p1.y) / 6;
                        
                        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
                    }
                }
                ctx.strokeStyle = '#6C5CE7';
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.stroke();
                
                // 绘制数据点和数值标签
                validPoints.forEach(function(p, idx) {
                    // 外圈白色背景
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
                    ctx.fillStyle = '#fff';
                    ctx.fill();
                    
                    // 内圈紫色点
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                    ctx.fillStyle = '#6C5CE7';
                    ctx.fill();
                    
                    // 数值标签（在点上方的气泡）
                    if (points[idx]) {
                        var accuracy = points[idx].accuracy;
                        var labelText = accuracy + '%';
                        ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
                        var textWidth = ctx.measureText(labelText).width;
                        
                        // 标签背景
                        ctx.fillStyle = '#6C5CE7';
                        roundRect(ctx, p.x - textWidth/2 - 4, p.y - 18, textWidth + 8, 14, 4);
                        ctx.fill();
                        
                        // 标签文字
                        ctx.fillStyle = '#fff';
                        ctx.textAlign = 'center';
                        ctx.fillText(labelText, p.x, p.y - 8);
                    }
                });
            }
            
            // X轴标签
            var dayLabels = ['一', '二', '三', '四', '五', '六', '日'];
            trendData.forEach(function(d, i) {
                var x = padding.left + (i / 6) * chartWidth;
                var date = new Date(d.date);
                var label = dayLabels[date.getDay() === 0 ? 6 : date.getDay() - 1];
                
                ctx.fillStyle = '#94a3b8';
                ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(label, x, height - 8);
            });
        }
        
        function getPracticeHistory() {
            try {
                var data = localStorage.getItem('cet4_practice_history');
                if (data) return JSON.parse(data);
                // 兼容旧数据
                var oldData = localStorage.getItem('cet_practice_history');
                if (oldData) return JSON.parse(oldData);
            } catch(e) {}
            return [];
        }
        
        function getAbilityScores() {
            try {
                var data = localStorage.getItem('cet4_ability_scores');
                if (data) return JSON.parse(data);
                // 兼容旧数据: 从cet_user中读取诊断数据
                var userData = safeGetItem('cet_user', {});
                if (userData && userData.diagnosis) {
                    return { dims: userData.diagnosis };
                }
            } catch(e) {}
            return null;
        }
        
        function getUserProfile() {
            try {
                var data = localStorage.getItem('cet4_user_profile');
                if (data) return JSON.parse(data);
                // 兼容旧数据
                var userData = safeGetItem('cet_user', {});
                if (userData && userData.startDate) {
                    return { startDate: userData.startDate };
                }
            } catch(e) {}
            return {};
        }
        
        function getHeatmapData() {
            var result = [];
            var today = new Date();
            var practiceHistory = getPracticeHistory();
            
            for (var i = 6; i >= 0; i--) {
                var d = new Date(today);
                d.setDate(d.getDate() - i);
                var dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                var dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                var label = dayNames[d.getDay()];
                
                var count = 0;
                practiceHistory.forEach(function(item) {
                    if (item.date === dateStr) {
                        count += (item.count || 1);
                    }
                });
                
                result.push({ date: dateStr, count: count, label: label });
            }
            return result;
        }
        
        function getDaysDiff(startDate, endDate) {
            var start = new Date(startDate);
            var end = new Date(endDate);
            return Math.floor((end - start) / (1000 * 60 * 60 * 24));
        }
        
        function formatDate(dateStr) {
            var parts = dateStr.split('-');
            if (parts.length === 3) {
                return parseInt(parts[1]) + '月' + parseInt(parts[2]) + '日';
            }
            return dateStr;
        }
        
        function getWeakActionText(dim, score) {
            var actions = {
                '细节定位': '做5道细节定位题强化训练',
                '推理判断': '练习推理判断专项突破',
                '同义替换': '积累同义替换词汇短语',
                '主旨归纳': '练习段落主旨概括技巧',
                '态度判断': '分析作者态度词练习'
            };
            return actions[dim] || '针对性练习提升';
        }

        function renderPersonalities() {
            var scroll = document.getElementById('personality-grid');
            var grid = document.getElementById('personality-grid');
            var html = '';
            for (var i = 0; i < personalities.length; i++) {
                var p = personalities[i];
                html += '<div class="personality-card" onclick="showPersonalityDetail(\'' + p.type + '\')">';
                html += '<div class="personality-avatar"><img src="' + p.img + '" alt="' + p.type + '" onerror="this.style.display=\'none\'"></div>';
                html += '<div class="personality-type">' + p.type + '</div>';
                html += '<span class="personality-honor" style="background:' + p.color + ';color:#fff">' + p.honor + '</span>';
                html += '</div>';
            }
            if (scroll) scroll.innerHTML = html;
            if (grid) grid.innerHTML = html;
        }

        function renderHomePersonalityPreview() {
            var container = document.getElementById('home-personality-preview');
            if (!container) return;
            var html = '';
            for (var i = 0; i < Math.min(6, personalities.length); i++) {
                var p = personalities[i];
                html += '<div class="home-preview-card" onclick="switchTab(\'personality\');setTimeout(function(){showPersonalityDetail(\'' + p.type + '\')},300)">';
                html += '<div class="home-preview-avatar"><img src="' + p.img + '" alt="' + p.type + '" onerror="this.style.display=\'none\'"></div>';
                html += '<div class="home-preview-name">' + p.type + '</div>';
                html += '</div>';
            }
            container.innerHTML = html;
        }

        function showPersonalityDetail(type) {
            var p = null;
            for (var i = 0; i < personalities.length; i++) {
                if (personalities[i].type === type) { p = personalities[i]; break; }
            }
            if (!p) return;
            state.selectedPersonality = p;
            // 用scores生成能力标签
            var scoresHtml = '';
            if (p.scores) {
                for (var key in p.scores) {
                    var val = p.scores[key];
                    var level = val >= 80 ? '强' : val >= 50 ? '中' : '弱';
                    var color = val >= 80 ? '#00B894' : val >= 50 ? '#FDCB6E' : '#E17055';
                    scoresHtml += '<div class="detail-score-item"><span class="detail-score-name">' + key + '</span><div class="detail-score-bar"><div class="detail-score-fill" style="width:' + val + '%;background:' + color + '"></div></div><span class="detail-score-val" style="color:' + color + '">' + val + '%</span></div>';
                }
            }
            document.getElementById('detail-card').innerHTML = 
                '<div class="detail-avatar"><img src="' + p.img + '" alt="' + p.type + '" onerror="this.style.display=\'none\'"></div>' +
                '<div class="detail-type">' + p.type + '</div>' +
                '<span class="detail-honor" style="background:' + p.color + ';color:#fff">' + p.honor + '</span>' +
                '<p class="detail-desc" style="font-style:italic;color:#6C5CE7;margin:8px 0 16px">"' + p.comment + '"</p>' +
                '<div class="detail-scores">' + scoresHtml + '</div>';
            document.getElementById('detail-advice-text').innerHTML = '根据你的备考人格，建议从薄弱项开始针对性练习 👇';
            document.getElementById('personality-modal').classList.add('show');
        }

        function closePersonalityModal() {
            document.getElementById('personality-modal').classList.remove('show');
        }

        function startPractice() {
            closePersonalityModal();
            openChat('chat');
        }

        // ===== 对话列表管理 =====
        var currentConversationId = null; // 当前活跃对话ID
        var chatListView = null; // 是否显示对话列表

        // 获取对话列表
        function getChatList() {
            try {
                var list = localStorage.getItem('cet_chat_list');
                return list ? JSON.parse(list) : [];
            } catch (e) {
                return [];
            }
        }

        // 保存对话列表
        function saveChatList(list) {
            localStorage.setItem('cet_chat_list', JSON.stringify(list));
        }

        // 格式化时间
        function formatChatTime(timestamp) {
            if (!timestamp) return '';
            var now = Date.now();
            var diff = now - timestamp;
            var minutes = Math.floor(diff / 60000);
            var hours = Math.floor(diff / 3600000);
            var days = Math.floor(diff / 86400000);
            
            if (minutes < 1) return '刚刚';
            if (minutes < 60) return minutes + '分钟前';
            if (hours < 24) return hours + '小时前';
            if (days === 1) return '昨天';
            if (days < 7) return days + '天前';
            
            var d = new Date(timestamp);
            var month = d.getMonth() + 1;
            var day = d.getDate();
            return month + '月' + day + '日';
        }

        // 截断文本
        function truncateText(text, maxLen) {
            if (!text) return '';
            text = text.replace(/<[^>]+>/g, ''); // 去掉HTML标签
            if (text.length <= maxLen) return text;
            return text.substring(0, maxLen) + '...';
        }

        // 渲染对话列表
        function renderChatList() {
            var list = getChatList();
            var container = document.getElementById('chat-list-body');
            if (!container) return;

            if (list.length === 0) {
                container.innerHTML = '<div class="chat-list-empty">' +
                    '<div class="chat-list-empty-icon">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
                    '</div>' +
                    '<div class="chat-list-empty-text">开始你的第一次对话吧</div>' +
                    '<div class="chat-list-empty-sub">点击右上角"新建对话"开始</div>' +
                    '</div>';
                return;
            }

            var html = '';
            for (var i = 0; i < list.length; i++) {
                var item = list[i];
                var isActive = currentConversationId === item.id;
                var modeClass = item.mode || 'diagnosis';
                var modeIcon = modeClass === 'diagnosis' 
                    ? '<svg viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
                    : '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
                var modeTag = modeClass === 'diagnosis' ? '诊断' : '陪练';
                var preview = truncateText(item.lastMsg, 30) || '暂无消息';
                var timeStr = formatChatTime(item.lastMsgTime);
                
                html += '<div class="chat-card' + (isActive ? ' active' : '') + '" onclick="openConversation(\'' + item.id + '\')">' +
                    '<div class="chat-card-icon ' + modeClass + '">' + modeIcon + '</div>' +
                    '<div class="chat-card-content">' +
                    '<div class="chat-card-header">' +
                    '<div class="chat-card-title">' + truncateText(item.title, 20) + '</div>' +
                    '<div class="chat-card-tag ' + modeClass + '">' + modeTag + '</div>' +
                    '</div>' +
                    '<div class="chat-card-preview">' + preview + '</div>' +
                    '<div class="chat-card-time">' + timeStr + '</div>' +
                    '</div>' +
                    '<button class="chat-card-delete" onclick="event.stopPropagation();deleteConversation(\'' + item.id + '\')">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
                    '</button>' +
                    '</div>';
            }
            container.innerHTML = html;
        }

        // 搜索过滤对话列表
        function filterChatList(keyword) {
            var list = getChatList();
            var container = document.getElementById('chat-list-body');
            if (!container) return;
            keyword = keyword.trim().toLowerCase();
            
            if (keyword === '') {
                renderChatList();
                return;
            }
            
            var filtered = list.filter(function(item) {
                var title = (item.title || '').toLowerCase();
                var lastMsg = (item.lastMsg || '').toLowerCase();
                return title.indexOf(keyword) !== -1 || lastMsg.indexOf(keyword) !== -1;
            });
            
            if (filtered.length === 0) {
                container.innerHTML = '<div class="chat-list-empty-new">' +
                    '<div class="chat-list-empty-illustration">' +
                    '<svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="38" fill="#F5F5FA" stroke="#E0E0EA" stroke-width="1"/><circle cx="40" cy="36" r="14" stroke="#CBD5E1" stroke-width="2" fill="none"/><line x1="50" y1="46" x2="58" y2="54" stroke="#CBD5E1" stroke-width="2.5" stroke-linecap="round"/></svg>' +
                    '</div>' +
                    '<div class="chat-list-empty-title">没有找到相关对话</div>' +
                    '<div class="chat-list-empty-desc">试试其他关键词</div>' +
                    '</div>';
                return;
            }
            
            // Build cards directly (skip grouping for search results)
            var html = '';
            for (var i = 0; i < filtered.length; i++) {
                var item = filtered[i];
                var isActive = currentConversationId === item.id;
                var modeClass = item.mode || 'diagnosis';
                var modeGrad = modeClass === 'diagnosis' 
                    ? 'background:linear-gradient(135deg,#6C5CE7,#A29BFE);' 
                    : 'background:linear-gradient(135deg,#00B894,#55EFC4);';
                var modeTag = modeClass === 'diagnosis' ? '诊断' : '陪练';
                var preview = truncateText(item.lastMsg, 28) || '暂无消息预览';
                var timeStr = formatChatTime(item.lastMsgTime);
                
                html += '<div class="chat-card-doubao' + (isActive ? ' active' : '') + '" onclick="openConversation(\'' + item.id + '\')">' +
                    '<div class="chat-card-avatar" style="' + modeGrad + '">' +
                    '<svg viewBox="0 0 24 24" fill="white" opacity="0.9"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
                    '</div>' +
                    '<div class="chat-card-body">' +
                    '<div class="chat-card-top-row">' +
                    '<div class="chat-card-title-doubao">' + escapeHtml(truncateText(item.title, 18)) + '</div>' +
                    '<div class="chat-card-time-doubao">' + timeStr + '</div>' +
                    '</div>' +
                    '<div class="chat-card-preview-doubao">' + escapeHtml(preview) + '</div>' +
                    '<div class="chat-card-footer">' +
                    '<div class="chat-card-tag-doubao ' + modeClass + '">' + modeTag + '</div>' +
                    '</div>' +
                    '</div>' +
                    '<button class="chat-card-delete-new" onclick="event.stopPropagation();deleteConversation(\'' + item.id + '\')">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
                    '</button>' +
                    '</div>';
            }
            container.innerHTML = '<div class="chat-group-label">搜索结果</div>' + html;
        }

        // 显示新建对话弹窗
        function showNewChatModal() {
            var modal = document.getElementById('new-chat-modal');
            var companionOpt = document.getElementById('companion-option');
            var data = state.userData || {};
            var hasDiagnosis = data.personality || (data.diagnosis && data.diagnosis.type);
            
            // 如果没有诊断过，禁用陪练选项
            if (!hasDiagnosis) {
                companionOpt.classList.add('disabled');
                companionOpt.querySelector('.new-chat-option-icon').classList.add('disabled');
            } else {
                companionOpt.classList.remove('disabled');
                companionOpt.querySelector('.new-chat-option-icon').classList.remove('disabled');
            }
            
            modal.classList.add('show');
        }

        // 隐藏新建对话弹窗
        function hideNewChatModal() {
            var modal = document.getElementById('new-chat-modal');
            modal.classList.remove('show');
        }

        // 创建新对话
        function createNewChat(mode) {
            mode = mode || 'diagnosis';
            hideNewChatModal();
            
            // 重置聊天状态（新建对话）
            var botMap = {
                'diagnosis': '7636289658620215331',
                'companion': '7637702903679631395'
            };
            
            chatState.botId = botMap[mode];
            chatState.conversationId = null; // 新对话，等待API返回ID
            chatState.chatId = null;
            chatState.chatRounds = 0;
            chatState.messages = [];
            chatState.chatHistory = [];
            chatState.isStreaming = false;
            chatState.currentStreamText = '';
            chatState.currentMode = mode; // 保存当前模式
            chatState.hasReplied = false; // 重置回复状态，确保AI回复后能更新对话元数据
            
            // 清空消息显示 - 引导式开场白
            var container = document.getElementById('chat-messages');
            container.innerHTML = '<div class="custom-chat-msg ai welcome-msg">' +
                '<div class="custom-chat-avatar"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>' +
                '<div class="welcome-bubble-card">' +
                '<p style="font-size:17px;font-weight:700;color:#1E293B;margin-bottom:12px">嗨！我是小过学长 👋</p>' +
                '<p style="margin-bottom:12px;color:#64748B">我能帮你这些：</p>' +
                '<div style="display:flex;flex-direction:column;gap:10px">' +
                '<div style="display:flex;align-items:center;gap:10px"><span style="width:6px;height:6px;border-radius:50%;background:#6C5CE7;flex-shrink:0"></span><span style="color:#475569;font-size:15px">做个诊断测水平</span></div>' +
                '<div style="display:flex;align-items:center;gap:10px"><span style="width:6px;height:6px;border-radius:50%;background:#6C5CE7;flex-shrink:0"></span><span style="color:#475569;font-size:15px">陪你刷真题练手</span></div>' +
                '<div style="display:flex;align-items:center;gap:10px"><span style="width:6px;height:6px;border-radius:50%;background:#6C5CE7;flex-shrink:0"></span><span style="color:#475569;font-size:15px">复习之前的错题</span></div>' +
                '<div style="display:flex;align-items:center;gap:10px"><span style="width:6px;height:6px;border-radius:50%;background:#6C5CE7;flex-shrink:0"></span><span style="color:#475569;font-size:15px">批改你的作文</span></div>' +
                '</div>' +
                '<p style="margin-top:16px;color:#6C5CE7;font-weight:600;font-size:15px">直接说就行！</p>' +
                '</div></div>';
            
            // 更新标题
            document.getElementById('chat-title').textContent = mode === 'diagnosis' ? '小过学长' : 'AI陪练';
            
            // 显示聊天界面，隐藏对话列表
            console.log('[DEBUG] openConversation: 准备切换视图');
            document.getElementById('chat-list-view').classList.remove('active');
            console.log('[DEBUG] openConversation: 已隐藏chat-list-view');
            
            // 确保tab-page正确显示
            var tabPage = document.getElementById('tab-diagnosis');
            if (tabPage) {
                tabPage.classList.add('active');
                console.log('[DEBUG] openConversation: tab-diagnosis已添加active');
            }
            
            // 显示chat-page
            var chatPage = document.getElementById('chat-page');
            if (chatPage) {
                chatPage.style.display = 'flex';
                console.log('[DEBUG] openConversation: chat-page已设置为flex, offsetHeight:', chatPage.offsetHeight);
            } else {
                console.error('[DEBUG] openConversation: chat-page元素未找到!');
            }
            // 立即清空消息区域，显示加载中（避免闪现欢迎语）
            var msgContainer = document.getElementById('chat-messages');
            if (msgContainer) {
                msgContainer.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#94A3B8;font-size:14px;">加载中...</div>';
            }
            
            // 更新tab状态
            state.currentTab = 'diagnosis';
            document.querySelectorAll('.tab-page').forEach(function(page) {
                page.classList.toggle('active', page.id === 'tab-diagnosis');
            });
            document.querySelectorAll('.tab-item').forEach(function(item) {
                item.classList.toggle('active', item.dataset.tab === 'diagnosis');
            });
            // 确保tab-bar可见
            var tabBar = document.querySelector('.tab-bar');
            if (tabBar) tabBar.style.display = '';
            window.location.hash = 'practice';
            localStorage.setItem('cet_current_tab', 'diagnosis');
            
            // 隐藏/显示重新诊断按钮
            var rediagBtn = document.getElementById('btn-rediag');
            if (rediagBtn) {
                var hasDiag = data.personality || (data.diagnosis && data.diagnosis.type);
                rediagBtn.style.display = (mode === 'companion' && hasDiag) ? 'flex' : 'none';
            }
            
            // 初始化快捷chips
            initChatChips(mode);
            
            // 显示chips
            var chips = document.getElementById('input-chips');
            if (chips) chips.style.display = '';
            
            chatListView = false;
            currentConversationId = null;
        }

        // 打开已有对话
        function openConversation(convId) { console.log("[DEBUG] openConversation called, convId:", convId);
            var list = getChatList();
            var item = null;
            for (var i = 0; i < list.length; i++) {
                if (list[i].id === convId) {
                    item = list[i];
                    break;
                }
            }
            if (!item) {
                showToast('对话不存在');
                return;
            }
            
            var mode = item.mode || 'diagnosis';
            var botMap = {
                'diagnosis': '7636289658620215331',
                'companion': '7637702903679631395'
            };
            
            // 重置聊天状态
            chatState.botId = botMap[mode];
            chatState.conversationId = convId;
            chatState.chatId = null;
            chatState.chatRounds = 0;
            chatState.messages = [];
            chatState.chatHistory = [];
            chatState.isStreaming = false;
            chatState.currentStreamText = '';
            chatState.currentMode = mode;
            chatState.hasReplied = false; // 重置回复状态，确保继续对话时能更新元数据
            
            // 更新标题
            document.getElementById('chat-title').textContent = mode === 'diagnosis' ? '小过学长' : 'AI陪练';
            
            // 显示聊天界面，隐藏对话列表
            document.getElementById('chat-list-view').classList.remove('active');
            document.getElementById('chat-page').style.display = 'flex';
            // 立即清空消息区域，显示加载中（避免闪现欢迎语）
            var msgContainer = document.getElementById('chat-messages');
            if (msgContainer) {
                msgContainer.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#94A3B8;font-size:14px;">加载中...</div>';
            }
            // 立即清空消息区域，显示加载中（避免闪现欢迎语）
            var msgContainer = document.getElementById('chat-messages');
            if (msgContainer) {
                msgContainer.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#94A3B8;font-size:14px;">加载中...</div>';
            }
            
            // 更新tab状态
            state.currentTab = 'diagnosis';
            document.querySelectorAll('.tab-page').forEach(function(page) {
                page.classList.toggle('active', page.id === 'tab-diagnosis');
            });
            document.querySelectorAll('.tab-item').forEach(function(item) {
                item.classList.toggle('active', item.dataset.tab === 'diagnosis');
            });
            // 确保tab-bar可见
            var tabBar = document.querySelector('.tab-bar');
            if (tabBar) tabBar.style.display = '';
            window.location.hash = 'practice';
            localStorage.setItem('cet_current_tab', 'diagnosis');
            
            // 隐藏/显示重新诊断按钮
            var rediagBtn = document.getElementById('btn-rediag');
            if (rediagBtn) {
                var data = state.userData || {};
                var hasDiag = data.personality || (data.diagnosis && data.diagnosis.type);
                rediagBtn.style.display = (mode === 'companion' && hasDiag) ? 'flex' : 'none';
            }
            
            // 隐藏chips（已有历史消息）
            var chips = document.getElementById('input-chips');
            if (chips) chips.style.display = 'none';
            
            chatListView = false;
            currentConversationId = convId;
            
            // 加载历史消息
            loadChatHistory(convId);
            
            // 初始化聊天页面padding
            setTimeout(initChatPadding, 100);
        }

        // 删除对话
        function deleteConversation(convId) {
            var list = getChatList();
            var newList = [];
            for (var i = 0; i < list.length; i++) {
                if (list[i].id !== convId) {
                    newList.push(list[i]);
                }
            }
            saveChatList(newList);
            
            // 如果删除的是当前对话，切换到对话列表
            if (currentConversationId === convId) {
                currentConversationId = null;
                showChatList();
            }
            
            renderChatList();
            showToast('对话已删除');
        }

        // 更新对话元数据
        function updateConversationMeta(userMsg, botMsg) {
            if (!chatState.conversationId) return;
            
            var list = getChatList();
            var found = false;
            
            for (var i = 0; i < list.length; i++) {
                if (list[i].id === chatState.conversationId) {
                    found = true;
                    // 更新最后一条消息（优先使用AI回复作为预览）
                    list[i].lastMsg = botMsg || userMsg;
                    list[i].lastMsgTime = Date.now();
                    // 自动生成标题（第一轮对话时，userMsg是用户消息，botMsg是AI回复）
                    // chatRounds在onBotReply被调用时是2（sendMessage开始++后=1，AI回复完成++后=2）
                    // 所以条件用 <= 2 来判断是第一轮对话
                    if (chatState.chatRounds <= 2 && userMsg && !list[i].title) {
                        list[i].title = truncateText(userMsg, 20);
                    }
                    // 移到列表头部
                    var item = list.splice(i, 1)[0];
                    list.unshift(item);
                    break;
                }
            }
            
            if (!found && chatState.conversationId) {
                // 新对话，添加到列表
                var mode = chatState.currentMode || 'diagnosis';
                var botMap = {
                    'diagnosis': '7636289658620215331',
                    'companion': '7637702903679631395'
                };
                var newItem = {
                    id: chatState.conversationId,
                    title: truncateText(userMsg, 20),
                    mode: mode,
                    botId: botMap[mode],
                    lastMsg: userMsg,
                    lastMsgTime: Date.now(),
                    createdAt: Date.now()
                };
                list.unshift(newItem);
            }
            
            saveChatList(list);
            renderChatList();
        }

        // 显示对话列表
        function showChatList() {
            document.getElementById('chat-list-view').classList.add('active');
            document.getElementById('chat-page').style.display = 'none';
            chatListView = true;
            currentConversationId = null;
            renderChatList();
        }

        // 修改返回按钮逻辑
        function handleChatBack() {
            if (chatListView) {
                // 已经在对话列表，返回首页
                switchTab('home');
            } else {
                // 切换到对话列表
                showChatList();
            }
        }


        // 保存消息到本地localStorage（作为Coze API的fallback）
        function saveMessagesToLocal(convId) {
            if (!convId) return;
            try {
                var key = 'cet_msg_' + convId;
                // 优先使用chatHistory（流式消息存这里），fallback到messages
                var source = chatState.chatHistory.length > 0 ? chatState.chatHistory : chatState.messages;
                var msgs = source.map(function(m) {
                    return { role: m.role, content: m.content || '', type: m.type || '' };
                });
                localStorage.setItem(key, JSON.stringify(msgs));
            } catch(e) { console.error('[saveMessagesToLocal]', e); }
        }
        
        // 从本地localStorage读取消息（Coze API返回空时的fallback）
        function loadMessagesFromLocal(convId) {
            if (!convId) return [];
            try {
                var key = 'cet_msg_' + convId;
                var data = localStorage.getItem(key);
                return data ? JSON.parse(data) : [];
            } catch(e) { return []; }
        }

        // 对话列表在用户进入diagnosis tab时由openChat/showChatList初始化

        // ===== Custom Chat UI Logic =====
        var chatState = {
            conversationId: null,
            botId: null,
            chatId: null,
            isStreaming: false,
            messages: [],
            chatRounds: 0,
            currentStreamText: '',
            chatHistory: [],
            currentMode: 'diagnosis',
            hasReplied: false
        };

        function openChat(mode) {
            mode = mode || 'diagnosis';
            var data = state.userData || {};
            var hasDiagnosis = data.personality || (data.diagnosis && data.diagnosis.type);
            // mode='chat' 统一走companion（DeepSeek），不再走Coze诊断
            // mode='diagnosis' 已废弃，也走companion
            // mode='companion' 表示陪练
            if (mode === 'chat' || mode === 'diagnosis') {
                mode = 'companion';
            }
            var botMap = {
                'diagnosis': '7636289658620215331',
                'companion': '7637702903679631395'
            };
            
            chatState.botId = botMap[mode];
            chatState.conversationId = null;
            chatState.chatId = null;
            chatState.chatRounds = 0;
            chatState.messages = [];
            chatState.chatHistory = [];
            chatState.isStreaming = false;
            chatState.currentStreamText = '';
            chatState.currentMode = mode;
            chatState.hasReplied = false;
            
            // 清空消息显示 - 引导式开场白
            var container = document.getElementById('chat-messages');
            container.innerHTML = '<div class="custom-chat-msg ai welcome-msg">' +
                '<div class="custom-chat-avatar"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>' +
                '<div class="welcome-bubble-card">' +
                '<p style="font-size:17px;font-weight:700;color:#1E293B;margin-bottom:12px">嗨！我是小过学长 👋</p>' +
                '<p style="margin-bottom:12px;color:#64748B">我能帮你这些：</p>' +
                '<div style="display:flex;flex-direction:column;gap:10px">' +
                '<div style="display:flex;align-items:center;gap:10px"><span style="width:6px;height:6px;border-radius:50%;background:#6C5CE7;flex-shrink:0"></span><span style="color:#475569;font-size:15px">做个诊断测水平</span></div>' +
                '<div style="display:flex;align-items:center;gap:10px"><span style="width:6px;height:6px;border-radius:50%;background:#6C5CE7;flex-shrink:0"></span><span style="color:#475569;font-size:15px">陪你刷真题练手</span></div>' +
                '<div style="display:flex;align-items:center;gap:10px"><span style="width:6px;height:6px;border-radius:50%;background:#6C5CE7;flex-shrink:0"></span><span style="color:#475569;font-size:15px">复习之前的错题</span></div>' +
                '<div style="display:flex;align-items:center;gap:10px"><span style="width:6px;height:6px;border-radius:50%;background:#6C5CE7;flex-shrink:0"></span><span style="color:#475569;font-size:15px">批改你的作文</span></div>' +
                '</div>' +
                '<p style="margin-top:16px;color:#6C5CE7;font-weight:600;font-size:15px">直接说就行！</p>' +
                '</div></div>';
            
            // 更新标题
            document.getElementById('chat-title').textContent = mode === 'diagnosis' ? '小过学长' : 'AI陪练';
            
            // 隐藏/显示重新诊断按钮
            var rediagBtn = document.getElementById('btn-rediag');
            if (rediagBtn) {
                rediagBtn.style.display = (mode === 'companion' && hasDiagnosis) ? 'flex' : 'none';
            }
            
            // 初始化快捷chips
            initChatChips(mode);
            
            // 切换到诊断tab，显示聊天界面
            // 注意：直接操作DOM而不是调用switchTab，避免showChatList覆盖聊天页面显示
            document.getElementById('chat-list-view').classList.remove('active');
            document.getElementById('chat-page').style.display = 'flex';
            // 更新tab状态
            state.currentTab = 'diagnosis';
            document.querySelectorAll('.tab-page').forEach(function(page) {
                page.classList.toggle('active', page.id === 'tab-diagnosis');
            });
            document.querySelectorAll('.tab-item').forEach(function(item) {
                item.classList.toggle('active', item.dataset.tab === 'diagnosis');
            });
            // 确保tab-bar可见
            var tabBar = document.querySelector('.tab-bar');
            if (tabBar) tabBar.style.display = '';
            window.location.hash = 'practice';
            localStorage.setItem('cet_current_tab', 'diagnosis');
            
            // 更新输入框placeholder（免费额度提示）
            updateChatInputPlaceholder();
            setTimeout(initChatPadding, 200);
            setTimeout(initPlanScrollSync, 100);
            // 如果有初始消息，延迟发送
            if (arguments[1]) {
                setTimeout(function() { sendSuggestion(arguments[1]); }, 300);
            }
        }
        
        function initChatChips(mode) {
            var chips = document.getElementById('input-chips');
            if (!chips) return;
            var userPlan = (state.userData && state.userData.plan) || 'free';
            var isFlagship = userPlan === 'flagship';
            
            // 诊断模式：显示开始诊断快捷建议
            if (mode === 'diagnosis') {
                chips.innerHTML = '' +
                    '<div class="chip-grid">' +
                    '<div class="custom-chip-card" onclick="startNewDiagnosis()" style="background:linear-gradient(135deg,#6C5CE7,#A29BFE);color:white"><span class="chip-card-icon" style="background:rgba(255,255,255,0.2)">🔍</span><span class="chip-card-text">开始诊断</span></div>' +
                    '<div class="custom-chip-card" onclick="sendSuggestion(this.dataset.msg)" data-msg="我的阅读成绩很差怎么办"><span class="chip-card-icon" style="background:linear-gradient(135deg,#00B894,#55EFC4)">📖</span><span class="chip-card-text">阅读提分</span></div>' +
                    '<div class="custom-chip-card" onclick="sendSuggestion(this.dataset.msg)" data-msg="听力听不懂怎么练"><span class="chip-card-icon" style="background:linear-gradient(135deg,#FDCB6E,#F39C12)">🎧</span><span class="chip-card-text">听力技巧</span></div>' +
                    '<div class="custom-chip-card" onclick="sendSuggestion(this.dataset.msg)" data-msg="写作翻译怎么复习"><span class="chip-card-icon" style="background:linear-gradient(135deg,#E17055,#D63031)">✍️</span><span class="chip-card-text">写译方法</span></div>' +
                    '<div class="custom-chip-card" onclick="sendSuggestion(this.dataset.msg)" data-msg="高频词汇有哪些"><span class="chip-card-icon" style="background:linear-gradient(135deg,#FDCB6E,#E17055)">📚</span><span class="chip-card-text">高频词汇</span></div>' +
                    '<div class="custom-chip-card" onclick="sendSuggestion(this.dataset.msg)" data-msg="有什么高效的备考技巧"><span class="chip-card-icon" style="background:linear-gradient(135deg,#A29BFE,#6C5CE7)">💡</span><span class="chip-card-text">备考技巧</span></div>' +
                    '</div>';
                chips.style.display = '';
                return;
            }
            
            // 陪练模式：显示豆包风格快捷建议
            var chipsHtml = '' +
                '<div class="chip-grid">' +
                '<div class="custom-chip-card" onclick="sendSuggestion(this.dataset.msg)" data-msg="今天练什么好"><span class="chip-card-icon" style="background:linear-gradient(135deg,#6C5CE7,#A29BFE)">📋</span><span class="chip-card-text">今日练习</span></div>' +
                '<div class="custom-chip-card" onclick="sendSuggestion(this.dataset.msg)" data-msg="帮我制定一个月的冲刺计划"><span class="chip-card-icon" style="background:linear-gradient(135deg,#0984E3,#74B9FF)">📅</span><span class="chip-card-text">冲刺计划</span></div>' +
                '<div class="custom-chip-card" onclick="handleEssayClick()"><span class="chip-card-icon" style="background:linear-gradient(135deg,#00B894,#55EFC4)">✍️</span><span class="chip-card-text">批改作文</span></div>' +
                '<div class="custom-chip-card" onclick="sendSuggestion(this.dataset.msg)" data-msg="最近做了一套题，帮我分析"><span class="chip-card-icon" style="background:linear-gradient(135deg,#FDCB6E,#F39C12)">📊</span><span class="chip-card-text">错题分析</span></div>' +
                '<div class="custom-chip-card" onclick="sendSuggestion(this.dataset.msg)" data-msg="高频词汇有哪些"><span class="chip-card-icon" style="background:linear-gradient(135deg,#E17055,#D63031)">📚</span><span class="chip-card-text">高频词汇</span></div>' +
                '<div class="custom-chip-card" onclick="sendSuggestion(this.dataset.msg)" data-msg="有什么高效的备考技巧"><span class="chip-card-icon" style="background:linear-gradient(135deg,#A29BFE,#6C5CE7)">💡</span><span class="chip-card-text">备考技巧</span></div>' +
                '</div>';
            
            // Flagship专属
            if (isFlagship) {
                chipsHtml += '<div class="chip-flagship-row">' +
                    '<div class="custom-chip-pill flagship-chip" data-msg="请对我最近的练习进行深度精讲，告诉我为什么错以及怎么避坑" onclick="sendSuggestion(this.dataset.msg)">⭐ 深度精讲</div>' +
                    '<div class="custom-chip-pill flagship-chip" data-msg="我已经考完四级了，帮我规划六级备考衔接方案" onclick="sendSuggestion(this.dataset.msg)">⭐ 六级衔接</div>' +
                    '</div>';
            }
            
            chips.innerHTML = chipsHtml;
            chips.style.display = '';
        }
        
        function startDiagChat(initialMsg) {
            // 'chat'模式：已诊断→陪练，未诊断→诊断
            openChat('chat');
            if (initialMsg) {
                setTimeout(function() { sendSuggestion(initialMsg); }, 300);
            }
        }

        function closeDiagChat() {
            // No-op: chat is always visible in the tab now
        }

        var thinkModeEnabled = false;
        
        function toggleThinkMode() {
            thinkModeEnabled = !thinkModeEnabled;
            var btn = document.getElementById('btn-think');
            if (btn) {
                btn.classList.toggle('active', thinkModeEnabled);
            }
            showToast(thinkModeEnabled ? '🔍 深度思考模式已开启' : '深度思考模式已关闭');
        }
        
        function copyLastMessage() {
            var msgs = document.querySelectorAll('#chat-messages .custom-chat-msg.ai .custom-chat-bubble');
            if (msgs.length === 0) { showToast('暂无回复可复制'); return; }
            var last = msgs[msgs.length - 1];
            var text = (last.innerText || last.textContent || '').trim();
            if (!text) { showToast('内容为空'); return; }
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(function() {
                    showToast('已复制到剪贴板');
                }).catch(function() {
                    showToast('复制失败，请手动复制');
                });
            } else {
                showToast('复制失败');
            }
        }
        
        function regenerateLastResponse() {
            var userMsgs = document.querySelectorAll('#chat-messages .custom-chat-msg.user');
            if (userMsgs.length === 0) { showToast('没有可重新生成的对话'); return; }
            var lastUserBubble = userMsgs[userMsgs.length - 1].querySelector('.custom-chat-bubble');
            if (!lastUserBubble) return;
            var text = (lastUserBubble.innerText || lastUserBubble.textContent || '').trim();
            if (!text) return;
            
            var aiMsgs = document.querySelectorAll('#chat-messages .custom-chat-msg.ai');
            if (aiMsgs.length > 0) {
                aiMsgs[aiMsgs.length - 1].remove();
            }
            
            var input = document.getElementById('chat-input');
            if (input) {
                input.value = text;
                autoResizeInput(input);
                sendMessage();
            }
        }
        
        function sendSuggestion(text) {
            var input = document.getElementById('chat-input');
            if (input) {
                input.value = text;
                autoResizeInput(input);
                sendMessage();
            }
        }

        function autoResizeInput(el) {
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 100) + 'px';
            var btn = document.getElementById('chat-send-btn');
            if (btn) btn.disabled = !el.value.trim();
            // 安全检查：如果isStreaming卡住了（超过30秒），强制重置
            if (chatState.isStreaming && chatState._streamStart && Date.now() - chatState._streamStart > 30000) {
                console.log('[Safety] isStreaming stuck for 30s, force resetting');
                chatState.isStreaming = false;
            }
        }

        function handleInputKeydown(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (document.getElementById('chat-input').value.trim()) {
                    sendMessage();
                }
            }
        }
        
        // 确保发送按钮状态同步（移动端兼容）
        function ensureSendButtonState() {
            var input = document.getElementById('chat-input');
            var btn = document.getElementById('chat-send-btn');
            if (input && btn) {
                btn.disabled = !input.value.trim();
            }
        }

        function getNowTime() {
            var d = new Date();
            return (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
        }

        function appendMessage(role, text) {
    // 隐藏欢迎页
    var welcomeEl = document.getElementById('chat-welcome');
    if (welcomeEl) welcomeEl.style.display = 'none';
            var container = document.getElementById('chat-messages');
            var msgDiv = document.createElement('div');
            msgDiv.className = 'custom-chat-msg ' + role;
            var timeStr = getNowTime();

            if (role === 'ai') {
                msgDiv.innerHTML = '<div class="custom-chat-avatar"><svg viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>' +
                    '<div class="custom-chat-bubble">' + formatBotText(text) + '<div class="custom-chat-time">' + timeStr + '</div></div>';
            } else if (role === 'system') {
                msgDiv.innerHTML = '<div class="custom-chat-bubble">' + escapeHtml(text) + '</div>';
            } else {
                msgDiv.innerHTML = '<div class="custom-chat-bubble">' + escapeHtml(text) + '<div class="custom-chat-time">' + timeStr + '</div></div>';
            }

            container.appendChild(msgDiv);
            scrollChatToBottom();
            updateChatPadding();
            return msgDiv;
        }

        function appendTypingIndicator() {
            var container = document.getElementById('chat-messages');
            var msgDiv = document.createElement('div');
            msgDiv.className = 'custom-chat-msg ai';
            msgDiv.id = 'typing-indicator';
            msgDiv.innerHTML = '<div class="custom-chat-avatar"><svg viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>' +
                '<div class="custom-chat-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>';
            container.appendChild(msgDiv);
            scrollChatToBottom();
            updateChatPadding();
        }

        function removeTypingIndicator() {
            var el = document.getElementById('typing-indicator');
            if (el) el.remove();
        }

        function scrollChatToBottom() {
            var container = document.getElementById('chat-messages');
            setTimeout(function() { container.scrollTop = container.scrollHeight; }, 100);
        }
        function updateChatPadding() {
            var container = document.getElementById('chat-messages');
            var inputArea = document.getElementById('chat-input-area');
            if (!container || !inputArea) return;
            // chat-page bottom已经停在tab-bar上方，不需要再给tab-bar留空间
            var inputHeight = inputArea.offsetHeight || 0;
            var paddingBottom = inputHeight + 8;
            container.style.paddingBottom = paddingBottom + 'px';
        }

        // Update padding on load and resize
        var chatPaddingObserver = null;
        function initChatPadding() {
            updateChatPadding();
            window.addEventListener('resize', updateChatPadding);
            // Observe input area height changes (quick tags show/hide)
            var inputArea = document.getElementById('chat-input-area');
            if (inputArea && window.ResizeObserver) {
                chatPaddingObserver = new ResizeObserver(updateChatPadding);
                chatPaddingObserver.observe(inputArea);
            }
        }


        function formatBotText(text) {
            // Parse markdown-like formatting
            var html = escapeHtml(text);
            // Bold: **text**
            html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            // Line breaks to paragraphs
            html = html.split('\n\n').map(function(p) { return '<p>' + p.replace(/\n/g, '<br>') + '</p>'; }).join('');
            if (!html.startsWith('<p>')) html = '<p>' + html + '</p>';
            return html;
        }

        function escapeHtml(text) {
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // ===== 打卡/Streak 系统 =====
        function getStreakData() {
            try {
                var d = localStorage.getItem('cet_streak');
                return d ? JSON.parse(d) : { count: 0, lastDate: '', todayChecked: false };
            } catch(e) {
                return { count: 0, lastDate: '', todayChecked: false };
            }
        }

        function saveStreakData(d) {
            localStorage.setItem('cet_streak', JSON.stringify(d));
        }

        function getTodayStr() {
            var now = new Date();
            return now.getFullYear() + '-' + (now.getMonth()+1) + '-' + now.getDate();
        }

        function doCheckIn() {
            var streak = getStreakData();
            var today = getTodayStr();
            if (streak.todayChecked && streak.lastDate === today) {
                return false;
            }
            if (streak.lastDate !== today) {
                if (streak.lastDate) {
                    var last = new Date(streak.lastDate);
                    var now = new Date(today);
                    var diff = Math.floor((now - last) / 86400000);
                    if (diff > 1) streak.count = 0;
                }
                streak.count++;
                streak.lastDate = today;
                streak.todayChecked = true;
            }
            saveStreakData(streak);
            var data = state.userData || {};
            var lastStudyDay = data.lastStudyDay || '';
            if (lastStudyDay !== today) {
                data.studyDays = (data.studyDays || 0) + 1;
                data.lastStudyDay = today;
                data.chatCount = (data.chatCount || 0) + 1;
                state.userData = data;
                saveUserData(data);
                
                // 设置cet4_user_profile的startDate（如果还没有）
                try {
                    var profile = safeGetItem('cet4_user_profile', {});
                    if (!profile.startDate) {
                        profile.startDate = today;
                        localStorage.setItem('cet4_user_profile', JSON.stringify(profile));
                    }
                } catch(e) {}
            }
            return true;
        }

        function renderStreakCalendar() {
            var container = document.getElementById('streak-cal-days');
            if (!container) return;
            var streak = getStreakData();
            var today = new Date();
            var dayNames = ['日','一','二','三','四','五','六'];
            var html = '';
            for (var i = 6; i >= 0; i--) {
                var d = new Date(today);
                d.setDate(d.getDate() - i);
                var dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
                var isToday = (i === 0);
                var isChecked = false;
                if (streak.lastDate === dateStr) isChecked = true;
                if (streak.count > 0 && i > 0 && i <= streak.count) isChecked = true;
                if (isToday && streak.todayChecked) isChecked = true;
                var cls = 'streak-day';
                if (isToday) cls += ' today';
                if (isChecked) cls += ' checked';
                html += '<div class="' + cls + '">' +
                    '<div class="streak-day-label">' + dayNames[d.getDay()] + '</div>' +
                    '<div class="streak-day-dot">' +
                        (isChecked ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : '') +
                    '</div>' +
                '</div>';
            }
            container.innerHTML = html;
            var calStreakNum = document.getElementById('cal-streak-num');
            if (calStreakNum) calStreakNum.textContent = streak.count;
        }

        function updateHomeStatus() {
            var data = state.userData || {};
            var homeCountdown = document.getElementById('home-countdown');
            if (homeCountdown) {
                var examDate = new Date('2026-06-13');
                var now = new Date();
                var diff = Math.ceil((examDate - now) / (1000*60*60*24));
                homeCountdown.textContent = '距考试' + diff + '天';
            }
            var streakEl = document.getElementById('home-streak');
            var streak = getStreakData();
            if (streakEl) streakEl.textContent = streak.count > 0 ? '🔥' + streak.count : '打卡';
            var ctaText = document.getElementById('home-cta-text');
            if (ctaText) {
                var hasDiag = data.personality || (data.diagnosis && data.diagnosis.type);
                ctaText.textContent = hasDiag ? '继续AI陪练' : '开始AI诊断';
            }
            updateDailyTask();
        }

        function updateProfileStats() {
            var data = state.userData || {};
            // 更新套餐标签
            var tagEl = document.getElementById('profile-plan-tag');
            if (tagEl) {
                var planNames = { sprint: '冲刺营', flagship: '全程营' };
                var plan = data.plan || 'free';
                tagEl.textContent = planNames[plan] || '免费版';
                tagEl.className = 'profile-plan-tag ' + (plan !== 'free' ? 'paid' : 'free');
            }
            // 更新统计
            var streak = getStreakData();
            var daysEl = document.getElementById('stat-days');
            if (daysEl) daysEl.textContent = streak.count || 0;
            var chatsEl = document.getElementById('stat-chats');
            if (chatsEl) chatsEl.textContent = (data.chatCount || 0);
            var persEl = document.getElementById('stat-personality');
            if (persEl) persEl.textContent = data.personality || '—';
        }

        function renderBenefits(selectedPlan) {
            selectedPlan = selectedPlan || 'free';
            var benefits = [
                { name: 'AI诊断+人格卡', free: true, sprint: true, flagship: true },
                { name: 'AI对话答疑', free: '25轮/天', sprint: '45天无限', flagship: '45天无限' },
                { name: '作文批改', free: '评分+问题标注', sprint: '逐句改写', flagship: '改写+精讲' },
                { name: '翻译批改', free: '评分+踩分点', sprint: '参考译文', flagship: '译文+思路精讲' },
                { name: '每日一练', free: '通用轮换', sprint: '短板定制', flagship: '短板定制' },
                { name: '备考计划', free: '3条建议', sprint: '45天计划', flagship: '45天计划+随时调' }
            ];
            var html = '';
            benefits.forEach(function(b) {
                var val = b[selectedPlan];
                var isLimited = (typeof val === 'string' && val !== '45天无限');
                html += '<div class="coze-benefit-item"><span>' + b.name + '</span><span class="coze-benefit-val' + (isLimited ? ' limited' : '') + '">' + (val === true ? '✓' : val === false ? '—' : val) + '</span></div>';
            });
            var el = document.getElementById('benefits-content');
            if (el) el.innerHTML = html;
        }

        // 辅助函数：获取对话摘要（给Bot传入最近对话上下文）
        function getChatSummary() {
            if (!chatState.messages || chatState.messages.length === 0) return '';
            var recent = chatState.messages.slice(-6);
            var parts = recent.map(function(m) {
                if (m.role === 'assistant') return 'AI:' + (m.content || '').substring(0, 50);
                if (m.role === 'user') return '用户:' + (m.content || '').substring(0, 50);
                return '';
            }).filter(function(s) { return s; });
            return parts.join('|').substring(0, 300);
        }

        // 辅助函数：获取待完成任务
        function getPendingTask() {
            var userData = state.userData || {};
            if (!userData.plan_data) return '';
            var dayIdx = getPlanDayIndex();
            var todayKey = 'day' + dayIdx;
            if (userData.plan_data[todayKey] && !userData.plan_data[todayKey + '_done']) {
                return 'daily|' + userData.plan_data[todayKey] + '|1|0';
            }
            return '';
        }

        async function sendMessage() {
    // 隐藏欢迎页
    var welcomeEl = document.getElementById('chat-welcome');
    if (welcomeEl) welcomeEl.style.display = 'none';
            var input = document.getElementById('chat-input');
            var text = input.value.trim();
            if (!text || chatState.isStreaming) {
                console.log('[sendMessage] blocked: empty=' + !text + ' streaming=' + chatState.isStreaming);
                return;
            }

            // GPT风格免费限额检查（本地检查，优先于后端检查）
            var plan = (state.userData && state.userData.plan) || 'free';
            if (plan === 'free' && isFreeLimitReached()) {
                appendLimitSystemCard();
                return;
            }

            // Chat limit check - 从后端获取（异步）- 付费用户使用
            var userId = (state.userData && state.userData.uid) || 'user_' + Date.now();
            var limitResult = await checkChatLimitAsync(userId);
            if (limitResult.limited) {
                appendMessage('system', limitResult.message);
                return;
            }

            // 标记是否发送后将达到免费限额（用于AI回复后追加轻提示）
            var willUseLastFree = plan === 'free' && isLastFreeMessage();

            appendMessage('user', text);
            input.value = '';
            autoResizeInput(input);
            // 隐藏快捷chips（用户已经开始对话了）
            var chips = document.getElementById('input-chips');
            if (chips) chips.style.display = 'none';
            chatState.isStreaming = true;
            chatState._streamStart = Date.now();
            chatState.chatRounds++;
            
            // 付费用户使用原有计数，免费用户使用新的本地计数
            if (plan === 'free') {
                incrementDailyChatUsed();
            } else {
                incrementChatUsage();
            }

            // Create conversation if needed
            if (!chatState.conversationId) {
                try {
                    // 所有模式都用前端UUID，不走Coze创建对话
                    chatState.conversationId = 'ds_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    
                    // 新会话创建后，添加到对话列表
                    var mode = chatState.currentMode || 'diagnosis';
                    var botMap = {
                        'diagnosis': '7636289658620215331',
                        'companion': '7637702903679631395'
                    };
                    var list = getChatList();
                    var exists = false;
                    for (var i = 0; i < list.length; i++) {
                        if (list[i].id === chatState.conversationId) {
                            exists = true;
                            break;
                        }
                    }
                    if (!exists) {
                        var firstMsg = text.substring(0, 20);
                        var newItem = {
                            id: chatState.conversationId,
                            title: firstMsg,
                            mode: mode,
                            botId: botMap[mode],
                            lastMsg: text,
                            lastMsgTime: Date.now(),
                            createdAt: Date.now()
                        };
                        list.unshift(newItem);
                        saveChatList(list);
                        renderChatList();
                    }
                } catch (e) {
                    appendMessage('ai', '网络错误，请检查网络');
                    chatState.isStreaming = false;
                    return;
                }
            }

            appendTypingIndicator();

            var userId = (state.userData && state.userData.uid) || 'user_' + Date.now();
            // 构建用户上下文信息，注入到消息中让Bot读取
            var userPlan = (state.userData && state.userData.plan) || 'free';
            var userPersonality = (state.userData && state.userData.diagnosis && state.userData.diagnosis.type) || '';
            var studyDays = (state.userData && state.userData.studyDays) || 0;
            var isDiagBot = chatState.botId === '7636289658620215331';
            var contextPrefix = '';
            
            if (chatState.chatRounds <= 1 || !chatState.conversationId) {
                // 首次对话时注入完整上下文
                contextPrefix = '[系统信息] user_plan=' + userPlan + ', personality=' + userPersonality + ', study_days=' + studyDays + '\n\n';
            }
            
            // 诊断Bot：注入进度计数，帮助Bot知道当前第几题
            if (isDiagBot && chatState.chatRounds > 1) {
                var answeredCount = chatState.chatRounds - 1; // 用户已答题数（第1轮是开场白，不计数）
                var nextQ = answeredCount + 1;
                if (nextQ <= 18) {
                    contextPrefix = '[进度] 用户已回答' + answeredCount + '题，请出第' + nextQ + '题。不要重复出已答过的题。\n\n';
                } else if (answeredCount === 18) {
                    contextPrefix = `[进度] 用户已答完全部18题，请生成诊断报告。报告必须严格按以下格式输出：

【四级风险等级】高危/中危/低危
【综合评分】XX/100

【五维诊断】
- 细节定位：XX分 - 一句话诊断
- 推理判断：XX分 - 一句话诊断
- 同义替换：XX分 - 一句话诊断
- 主旨归纳：XX分 - 一句话诊断
- 态度判断：XX分 - 一句话诊断

【最弱两项】
1. XXX：具体建议（2-3句话）
2. XXX：具体建议（2-3句话）

【备考建议】3条具体可执行的建议

【推荐套餐】根据风险等级推荐冲刺营或全程营
\n\n`;
                }
            }
            
            // 陪练Bot：批改作文时注入结构化批改格式
            if (!isDiagBot) {
                var textLower = text.toLowerCase();
                if (textLower.includes('批改作文') || textLower.includes('帮我改作文') || textLower.includes('作文批改')) {
                    contextPrefix = `[批改模式] 请按以下格式批改四级作文：

【评分】X/15分
【字数】XX词（四级要求120-180词）

【逐句批改】
原文：xxx
问题：xxx
改写：xxx
（每句都标注）

【核心建议】3条最重要的改进建议

【改写范文】完整的改写后版本
\n\n`;
                } else if (textLower.includes('批改翻译') || textLower.includes('帮我改翻译') || textLower.includes('翻译批改')) {
                    contextPrefix = `[批改模式] 请按以下格式批改四级翻译：

【评分】X/15分

【踩分点分析】列出关键踩分点及用户是否命中

【参考译文】标准参考译文

【逐句对比】
原文：xxx
用户翻译：xxx
参考翻译：xxx
问题：xxx

【核心建议】3条改进建议
\n\n`;
                }
            }
            var payload = {
                bot_id: chatState.botId,
                user_id: userId,
                conversation_id: chatState.conversationId,
                messages: chatState.chatHistory.concat([{ role: 'user', content: contextPrefix + text, content_type: 'text' }]),
                stream: true,
                auto_save_history: true,
                custom_variables: {
                    user_plan: userPlan,
                    user_personality: userPersonality,
                    study_days: String(studyDays),
                    today_task: getPlanTodayTaskText() || '',
                    plan_summary: getPlanSummary() || '',
                    last_context: getChatSummary() || '',
                    pending_task: getPendingTask() || ''
                },
                // 后端验证付费身份用（token不可伪造）
                plan_token: (state.userData && state.userData.planToken) || '',
                plan_order_id: (state.userData && state.userData.planOrderId) || ''
            };

            try {
                // 陪练模式用DeepSeek直连，诊断模式用Coze
                var isCompanion = chatState.currentMode === 'companion';
                var fetchUrl = isCompanion ? '/api/deepseek/chat' : '/api/chat/send';
                var fetchPayload = payload;
                
                if (isCompanion) {
                    // DeepSeek用OpenAI格式，带完整用户画像+RAG上下文
                    var ud = state.userData || {};
                    var personality = ud.personality || (ud.diagnosis && ud.diagnosis.type) || '';
                    
                    
            // 五维分数（新增）
            var dimScores = {};
            if (ud.diagnosis && ud.diagnosis.dims) {
                dimScores = ud.diagnosis.dims;
            } else if (ud.diagnosis) {
                dimScores = ud.diagnosis;
            }
            
            if (Object.keys(dimScores).length > 0) {
                var scoreParts = [];
                for (var k in dimScores) {
                    scoreParts.push(k + ':' + dimScores[k]);
                }
                var dimContext = '\n[用户五维能力] ' + scoreParts.join(', ') + '。\n';
                // 添加到每条消息中
                fetchPayload.messages = fetchPayload.messages.map(function(m) {
                    if (m.role === 'user') {
                        m.content = dimContext + m.content;
                    }
                    return m;
                });
            }

            // 五维分数详情（复用上方dimScores）
                    if (ud.diagnosis && ud.diagnosis.dims) {
                        dimScores = ud.diagnosis.dims;
                    }
                    
                    // 薄弱维度（按分数排序，最弱的排前面）
                    var weakDims = [];
                    if (ud.diagnosis && ud.diagnosis.dims) {
                        var dimArr = [];
                        for (var k in ud.diagnosis.dims) { dimArr.push({name: k, score: ud.diagnosis.dims[k]}); }
                        dimArr.sort(function(a,b){return a.score - b.score;});
                        weakDims = dimArr.filter(function(d){return d.score < 60;}).map(function(d){return d.name + '(' + d.score + '分)';});
                    }
                    
                    // 近期错题统计
                    var wrongQs = getWrongQuestions();
                    var wrongStats = {};
                    for (var i = 0; i < Math.min(wrongQs.length, 30); i++) {
                        var t = wrongQs[i].type || '未知';
                        wrongStats[t] = (wrongStats[t] || 0) + 1;
                    }
                    var wrongSummary = '';
                    for (var t in wrongStats) { wrongSummary += t + ':' + wrongStats[t] + '题  '; }
                    
                    // 练习天数
                    var streak = 0;
                    try { var sd = safeGetItem('cet_streak', {current: 0}); streak = sd.current || 0; } catch(e){}
                    
                    fetchPayload = {
                        user_id: userId,
                        messages: chatState.chatHistory.concat([{ role: 'user', content: contextPrefix + text }]),
                        stream: true,
                        personality: personality,
                        weak_dims: weakDims,
                        dim_scores: JSON.stringify(dimScores),
                        wrong_summary: wrongSummary,
                        study_days: streak,
                        plan_token: (state.userData && state.userData.planToken) || '',
                        plan_order_id: (state.userData && state.userData.planOrderId) || ''
                    };
                }

                var resp = await fetchWithTimeout(fetchUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(fetchPayload)
                });

                if (!resp.ok) {
                    var errText = await resp.text();
                    removeTypingIndicator();
                    appendMessage('ai', '请求失败(' + resp.status + ')，请重试');
                    chatState.isStreaming = false;
                    return;
                }

                // Stream SSE: read chunks and display in real-time
                removeTypingIndicator();
                var aiDiv = appendMessage('ai', '');
                var bubbleEl = aiDiv.querySelector('.custom-chat-bubble');
                var timeEl = aiDiv.querySelector('.custom-chat-time');
                var fullText = '';
                chatState.currentStreamText = '';

                var reader = resp.body.getReader();
                var decoder = new TextDecoder();
                var buffer = '';

                var streamStartTime = Date.now();
                
                // DeepSeek流式SSE解析（与Coze流式共享同一个reader循环）
                if (isCompanion) {
                    var companionDone = false;
                    while (!companionDone) {
                        var result = await reader.read();
                        if (result.done) { companionDone = true; break; }
                        if (!firstChunkReceived) {
                            firstChunkReceived = true;
                            console.log('[DeepSeek Stream] First chunk in', Date.now() - streamStartTime, 'ms');
                        }
                        buffer += decoder.decode(result.value, { stream: true });
                        var lines = buffer.split('\n');
                        buffer = lines.pop() || '';
                        for (var i = 0; i < lines.length; i++) {
                            var line = lines[i].trim();
                            if (!line || line.startsWith(':') || line.startsWith('event:')) continue;
                            if (!line.startsWith('data:')) continue;
                            var dataStr = line.substring(5).trim();
                            if (dataStr === '[DONE]') { companionDone = true; break; }
                            try {
                                var evt = JSON.parse(dataStr);
                                // OpenAI/DeepSeek stream format
                                if (evt.choices && evt.choices[0]) {
                                    var delta = evt.choices[0].delta;
                                    if (delta && delta.content) {
                                        fullText += delta.content;
                                        chatState.currentStreamText = fullText;
                                        bubbleEl.innerHTML = formatBotText(fullText);
                                    }
                                }
                            } catch(e) {}
                        }
                    }
                    // 先push用户消息，再push AI回复，与Coze模式保持一致
                    chatState.chatHistory.push({ role: 'user', content: contextPrefix + text, content_type: 'text' });
                    chatState.chatHistory.push({ role: 'assistant', content: fullText, content_type: 'text' });
                    // 保留最近20条，避免token超限
                    if (chatState.chatHistory.length > 20) {
                        chatState.chatHistory = chatState.chatHistory.slice(-20);
                    }
                    saveMessagesToLocal(chatState.conversationId);
                    chatState.chatRounds++;
                    updateConversationMeta(text, fullText);
                    savePracticeRecord();
                    checkStreakOnChat();
                    // 最后一条免费消息时追加轻提示
                    if (willUseLastFree && aiDiv) {
                        appendLimitHintToMessage(aiDiv);
                    }
                    chatState.isStreaming = false;
                    return;
                }
                var firstChunkReceived = false;
                while (true) {
                    var result = await reader.read();
                    if (result.done) break;
                    if (!firstChunkReceived) {
                        firstChunkReceived = true;
                        console.log('[Stream] First chunk received in', Date.now() - streamStartTime, 'ms');
                    }
                    var chunkText = decoder.decode(result.value, { stream: true });
                    buffer += chunkText;

                    // Parse SSE events
                    var lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // keep incomplete line

                    for (var i = 0; i < lines.length; i++) {
                        var line = lines[i].trim();
                        if (!line || line.startsWith(':')) continue; // skip empty/comments
                        if (line.startsWith('event:')) continue; // skip event type
                        if (!line.startsWith('data:')) continue;

                        var dataStr = line.substring(5).trim();
                        if (dataStr === '[DONE]') continue;

                        try {
                            var evt = JSON.parse(dataStr);
                            // Coze stream format: delta events have type='answer' and content directly
                            if (evt.type === 'answer' && evt.content) {
                                fullText += evt.content;
                                chatState.currentStreamText = fullText;
                                if (bubbleEl) {
                                    if (timeEl && timeEl.parentNode === bubbleEl) bubbleEl.removeChild(timeEl);
                                    bubbleEl.innerHTML = formatBotText(fullText);
                                    if (timeEl) bubbleEl.appendChild(timeEl);
                                }
                                scrollChatToBottom();
            updateChatPadding();
                            }
                            // Also capture conversation_id from conversation.chat.created or message completed
                            if (evt.type === 'conversation.chat.created' || evt.type === 'conversation.chat.in_progress' || evt.type === 'conversation.chat.completed') {
                                if (evt.conversation_id) {
                                    chatState.conversationId = evt.conversation_id;
                                }
                                if (evt.id) {
                                    chatState.chatId = evt.id;
                                }
                            }
                        } catch(e) {
                            // skip non-JSON lines
                        }
                    }
                }

                // Stream done - save conversation ID to localStorage
                if (chatState.conversationId) {
                    var botMap2 = { '7636289658620215331': 'diagnosis', '7637702903679631395': 'companion' };
                    var currentBot = botMap2[chatState.botId];
                    if (currentBot === 'companion') localStorage.setItem('cet_companion_conv', chatState.conversationId);
                    if (currentBot === 'diagnosis') localStorage.setItem('cet_diagnosis_conv', chatState.conversationId);
                }

                // Stream done - finalize
                if (fullText) {
                    // Update final text with time
                    if (bubbleEl && timeEl) {
                        if (timeEl.parentNode === bubbleEl) bubbleEl.removeChild(timeEl);
                        bubbleEl.innerHTML = formatBotText(fullText);
                        bubbleEl.appendChild(timeEl);
                    }
                    // Save to chat history for context continuity
                    chatState.chatHistory.push({ role: 'user', content: contextPrefix + text, content_type: 'text' });
                    chatState.chatHistory.push({ role: 'assistant', content: fullText, content_type: 'text' });
                    // Keep only last 20 messages (10 rounds) to avoid token limit
                    if (chatState.chatHistory.length > 20) {
                        chatState.chatHistory = chatState.chatHistory.slice(-20);
                    }
                    saveMessagesToLocal(chatState.conversationId);
                    // Parse markers
                    var resultMatch = fullText.match(/\[RESULT:(.+?)\]/);
                    if (resultMatch) {
                        parseDiagnosisResult(resultMatch[1]);
                        // 诊断完成，显示报告页
                        setTimeout(function() { showDiagnosisReport(fullText); }, 500);
                    }
                    var planMatch = fullText.match(/\[PLAN:(.+?)\]/);
                    if (planMatch) parsePlanResult(planMatch[1]);
                    var taskMatch = fullText.match(/\[TASK:(.+?)\]/);
                    if (taskMatch) parseTaskDone(taskMatch[1]);
                    // 检查作文批改结果
                    if (typeof essayState !== 'undefined' && essayState.pendingResponse) {
                        essayState.pendingResponse = false;
                        checkAndParseEssayResponse(fullText);
                    }
                    onBotReply();
                } else {
                    // Fallback: stream produced nothing, try polling for the message
                    console.log('[Stream] fullText is empty, falling back to message polling...');
                    if (chatState.chatId && chatState.conversationId) {
                        try {
                            var pollResp = await fetchWithTimeout('/api/chat/messages?chat_id=' + chatState.chatId + '&conversation_id=' + chatState.conversationId);
                            if (pollResp.ok) {
                                var pollData = await pollResp.json();
                                if (pollData.data && pollData.data.length > 0) {
                                    for (var pi = pollData.data.length - 1; pi >= 0; pi--) {
                                        if (pollData.data[pi].type === 'answer' && pollData.data[pi].content) {
                                            fullText = pollData.data[pi].content;
                                            break;
                                        }
                                    }
                                }
                            }
                        } catch(pollErr) {
                            console.log('[Stream] Poll fallback failed:', pollErr);
                        }
                    }
                    if (fullText) {
                        if (bubbleEl && timeEl) {
                            if (timeEl.parentNode === bubbleEl) bubbleEl.removeChild(timeEl);
                            bubbleEl.innerHTML = formatBotText(fullText);
                            bubbleEl.appendChild(timeEl);
                        }
                        chatState.chatHistory.push({ role: 'user', content: contextPrefix + text, content_type: 'text' });
                        chatState.chatHistory.push({ role: 'assistant', content: fullText, content_type: 'text' });
                        if (chatState.chatHistory.length > 20) chatState.chatHistory = chatState.chatHistory.slice(-20);
                        saveMessagesToLocal(chatState.conversationId);
                        var resultMatch2 = fullText.match(/\[RESULT:(.+?)\]/);
                        if (resultMatch2) {
                            parseDiagnosisResult(resultMatch2[1]);
                            // 诊断完成，显示报告页
                            setTimeout(function() { showDiagnosisReport(fullText); }, 500);
                        }
                        var planMatch2 = fullText.match(/\[PLAN:(.+?)\]/);
                        if (planMatch2) parsePlanResult(planMatch2[1]);
                        var taskMatch2 = fullText.match(/\[TASK:(.+?)\]/);
                        if (taskMatch2) parseTaskDone(taskMatch2[1]);
                        // 检查作文批改结果（fallback分支）
                        if (typeof essayState !== 'undefined' && essayState.pendingResponse) {
                            essayState.pendingResponse = false;
                            checkAndParseEssayResponse(fullText);
                        }
                        onBotReply();
                    } else {
                        removeTypingIndicator();
                        if (aiDiv && aiDiv.parentNode) aiDiv.remove();
                        appendMessage('ai', 'AI未返回内容，请重试');
                    }
                }
            } catch (e) {
                console.error('[Stream] Exception:', e.message, e.stack);
                // 如果流式已经有内容显示，不再添加错误消息
                if (fullText && bubbleEl && bubbleEl.textContent.trim()) {
                    console.log('[Stream] Already has content, skipping error message');
                    chatState.chatHistory.push({ role: 'user', content: contextPrefix + text, content_type: 'text' });
                    chatState.chatHistory.push({ role: 'assistant', content: fullText, content_type: 'text' });
                    saveMessagesToLocal(chatState.conversationId);
                    try { onBotReply(); } catch(e2) { console.error('[Stream] onBotReply error in catch:', e2.message); }
                } else {
                    removeTypingIndicator();
                    appendMessage('ai', '网络异常，请重试');
                }
            }
            
            // 最后一条免费消息时追加轻提示
            if (willUseLastFree && typeof aiDiv !== 'undefined' && aiDiv) {
                appendLimitHintToMessage(aiDiv);
            }

            chatState.isStreaming = false;
        }

        function onBotReply() {
            try {
                // 标记已回复（用于对话元数据更新）
                if (!chatState.hasReplied) {
                    chatState.hasReplied = true;
                    var lastBotMsg = chatState.currentStreamText || '';
                    updateConversationMeta('', lastBotMsg);
                }
                
                var streak = getStreakData();
                var today = getTodayStr();
                var todayChecked = streak.todayChecked && streak.lastDate === today;
                if (todayChecked) return;

                var planTask = getPlanTodayTaskText();
                var userData = state.userData || {};
                var hasPlan = planTask && userData.plan && userData.plan !== 'free';

                if (hasPlan) {
                    if (chatState.chatRounds >= 2) {
                        showToast('继续完成今日任务，Bot确认后自动打卡');
                    }
                } else {
                    if (chatState.chatRounds >= 2) {
                        var daily = getDailyTaskInfo();
                        if (daily.completed.length === 0) {
                            var task = dailyTasks[daily.taskIndex];
                            daily.completed.push(task.type);
                            saveDailyTaskData(daily);
                        }
                        var justCheckedIn = doCheckIn();
                        if (justCheckedIn) {
                            showToast('学习完成！连续打卡' + getStreakData().count + '天');
                            renderStreakCalendar();
                            var streakNumBig = document.getElementById('streak-num-big');
                            var studyEnStreak = document.getElementById('study-en-streak');
                            var s = getStreakData();
                            if (streakNumBig) streakNumBig.textContent = s.count;
                            if (studyEnStreak) studyEnStreak.textContent = s.count;
                        }
                        updateDailyTask();
                        updateHomeStatus();
                        updatePlanDisplay();
                    } else {
                        var remaining = 2 - chatState.chatRounds;
                        showToast('再聊' + remaining + '轮即可打卡');
                    }
                }
            } catch(e) {
                console.error('[onBotReply] Error (non-fatal):', e.message);
            }
        }

        function updateRoundInfo() {}

        // ===== 语音输入 =====
        var voiceRecognition = null;
        var isRecording = false;

        function toggleVoiceInput() {
            if (isRecording) {
                stopVoiceInput();
                return;
            }
            var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                showToast('浏览器不支持语音输入');
                return;
            }
            voiceRecognition = new SpeechRecognition();
            voiceRecognition.lang = 'zh-CN';
            voiceRecognition.continuous = false;
            voiceRecognition.interimResults = true;

            var btn = document.getElementById('voice-btn');
            var input = document.getElementById('chat-input');
            isRecording = true;
            btn.classList.add('recording');

            // Show listening indicator
            var indicator = document.createElement('div');
            indicator.className = 'mic-listening';
            indicator.id = 'mic-indicator';
            indicator.innerHTML = '<div class="pulse"></div>正在听...';
            document.body.appendChild(indicator);

            voiceRecognition.onresult = function(e) {
                var transcript = '';
                for (var i = 0; i < e.results.length; i++) {
                    transcript += e.results[i][0].transcript;
                }
                input.value = transcript;
                autoResizeInput(input);
            };

            voiceRecognition.onend = function() {
                stopVoiceInput();
                // Auto-send if there's text
                if (input.value.trim()) {
                    sendMessage();
                }
            };

            voiceRecognition.onerror = function(e) {
                stopVoiceInput();
                if (e.error === 'no-speech') {
                    showToast('没听到声音，请再试一次');
                } else if (e.error !== 'aborted') {
                    showToast('语音识别失败');
                }
            };

            voiceRecognition.start();
        }

        function stopVoiceInput() {
            isRecording = false;
            var btn = document.getElementById('voice-btn');
            if (btn) btn.classList.remove('recording');
            var indicator = document.getElementById('mic-indicator');
            if (indicator) indicator.remove();
            if (voiceRecognition) {
                try { voiceRecognition.stop(); } catch(e) {}
                voiceRecognition = null;
            }
        }

        
        function loadChatHistory(conversationId) {
            console.log('[loadChatHistory] loading for convId:', conversationId);
            
            // 优先从本地localStorage读取（更可靠，不依赖Coze API）
            var localMsgs = loadMessagesFromLocal(conversationId);
            if (localMsgs.length > 0) {
                console.log('[loadChatHistory] found local msgs:', localMsgs.length);
                var container = document.getElementById('chat-messages');
                container.innerHTML = '';
                var chips = document.getElementById('input-chips');
                if (chips) chips.style.display = 'none';
                localMsgs.forEach(function(m) {
                    var c = cleanUserPrefix(m.content || '');
                    if (m.role === 'assistant' && c.trim()) {
                        appendMessage('ai', c);
                    } else if (m.role === 'user' && c.trim()) {
                        appendMessage('user', c);
                    }
                });
                chatState.chatHistory = localMsgs;
                chatState.chatRounds = localMsgs.filter(function(m) { return m.role === 'user'; }).length;
                chatState.conversationId = conversationId;
                container.scrollTop = container.scrollHeight;
                return;
            }
            
            // 本地没有数据，尝试从Coze API获取
            fetch('http://8.218.88.15:8080/api/chat/messages?conversation_id=' + conversationId, {
                headers: { 'Content-Type': 'application/json' }
            }).then(function(r) { return r.json(); }).then(function(resp) {
                console.log('[loadChatHistory] API response:', JSON.stringify(resp).substring(0, 500));
                if (resp.code === 0 && resp.data) {
                    var container = document.getElementById('chat-messages');
                    container.innerHTML = '';
                    var msgs = resp.data.filter(function(m) { return m.type === 'answer' || m.type === 'question'; });
                    console.log('[loadChatHistory] filtered msgs count:', msgs.length);
                    
                    // 隐藏chips，显示正常聊天
                    var chips = document.getElementById('input-chips');
                    if (chips && msgs.length > 0) chips.style.display = 'none';
                    
                    msgs.forEach(function(m) {
                        var content = m.content || '';
                        // 去掉注入的系统前缀，只显示用户真实消息
                        if (m.role === 'user') {
                            content = cleanUserPrefix(content);
                        }
                        if (m.role === 'assistant') {
                            appendMessage('ai', content);
                        } else if (m.role === 'user' && content.trim()) {
                            appendMessage('user', content);
                        }
                    });
                    chatState.messages = msgs;
                    chatState.chatRounds = msgs.filter(function(m) { return m.role === 'user'; }).length;
                    // 重建chatHistory数组，保证刷新后Bot仍能获得对话上下文
                    chatState.chatHistory = msgs.filter(function(m) { return m.role === 'user' || m.role === 'assistant'; }).map(function(m) {
                        return { role: m.role, content: m.content || '', content_type: 'text' };
                    });
                    // 保留最近20条，避免token超限
                    if (chatState.chatHistory.length > 20) {
                        chatState.chatHistory = chatState.chatHistory.slice(-20);
                    }
                    // 设置conversationId并保存到localStorage
                    chatState.conversationId = conversationId;
                    // 保存消息到本地localStorage
                    saveMessagesToLocal(conversationId);
                    // 获取最后一条用户消息和AI回复，用于更新对话列表
                    var userMsgs = msgs.filter(function(m) { return m.role === 'user'; });
                    var lastUserMsg = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].content : '';
                    var aiMsgs = msgs.filter(function(m) { return m.role === 'assistant'; });
                    var lastBotMsg = aiMsgs.length > 0 ? aiMsgs[aiMsgs.length - 1].content : '';
                    // 如果对话列表中已有此conversationId，更新它；如果没有（历史对话），则添加
                    updateConversationMeta(lastUserMsg, lastBotMsg);
                    // 滚动到底部
                    container.scrollTop = container.scrollHeight;
                } else {
                    // API也没有数据，本地也没有（前面已检查过）
                    var container2 = document.getElementById('chat-messages');
                    if (container2 && container2.innerHTML.trim() === '') {
                        container2.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#94A3B8;font-size:14px;">对话已过期，请开始新对话</div>';
                    }
                }
            }).catch(function(e) {
                console.log('加载历史消息失败:', e);
                // 加载失败时显示提示，而不是空白
                var container = document.getElementById('chat-messages');
                if (container && container.innerHTML.trim() === '') {
                    container.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#94A3B8;font-size:14px;">消息加载失败，请重新开始对话</div>';
                }
            });
        }
        
        // 清理用户消息中的系统前缀（兼容所有浏览器，不用/s flag）
        function cleanUserPrefix(content) {
            return content.replace(/^\[系统信息\][\s\S]*?\n\n/, '').replace(/^\[进度\][\s\S]*?\n\n/, '');
        }

function showRediagModal() {
            var overlay = document.createElement('div');
            overlay.className = 'chat-clear-modal';
            overlay.id = 'rediag-modal';
            overlay.innerHTML = '<div class="chat-clear-dialog"><h4>重新诊断</h4><p>重新做18题，更新你的五维分数。诊断完后回来，陪练记录还在</p><div class="btn-row"><button class="btn-cancel" onclick="closeRediagModal()">取消</button><button class="btn-confirm" onclick="confirmRediag()">开始诊断</button></div></div>';
            document.body.appendChild(overlay);
        }

        function closeRediagModal() {
            var modal = document.querySelector('#rediag-modal');
            if (modal) modal.remove();
        }

        function confirmRediag() {
            closeRediagModal();
            // 保存陪练会话状态（不清空陪练记录）
            // 保存陪练会话ID到localStorage
            if (chatState.conversationId && chatState.botId === '7637702903679631395') {
                localStorage.setItem('cet_companion_conv', chatState.conversationId);
            }
            var savedCompanionConv = localStorage.getItem('cet_companion_conv');
            if (savedCompanionConv) {
                localStorage.setItem('cet_companion_conv_backup', savedCompanionConv);
            }
            // 切换到诊断Bot，开新会话
            chatState.botId = '7636289658620215331';
            chatState.conversationId = null;
            chatState.chatId = null;
            chatState.chatRounds = 0;
            chatState.messages = [];
            chatState.chatHistory = [];
            chatState.isStreaming = false;
            document.getElementById('chat-title').textContent = '小过学长';
            var rediagBtn = document.getElementById('btn-rediag');
            if (rediagBtn) rediagBtn.style.display = 'none';
            // 清空消息区，显示诊断开场
            var container = document.getElementById('chat-messages');
            container.innerHTML = '';
            appendMessage('ai', '嗨，来重新测一下你的备考水平吧！\n准备好了就说「开始」，我给你出18道题 🔍');
            var chips = document.getElementById('input-chips');
            if (chips) chips.style.display = '';
        }

function showClearChatModal() {
            var overlay = document.createElement('div');
            overlay.className = 'chat-clear-modal';
            overlay.id = 'clear-modal';
            overlay.innerHTML = '<div class="chat-clear-dialog"><h4>清空对话</h4><p>确认清空所有聊天记录？此操作不可恢复</p><div class="btn-row"><button class="btn-cancel" onclick="closeClearChatModal()">取消</button><button class="btn-confirm" onclick="confirmClearChat()">清空</button></div></div>';
            document.body.appendChild(overlay);
        }

        function closeClearChatModal() {
            var modal = document.querySelector('#clear-modal');
            if (modal) modal.remove();
        }

        function confirmClearChat() {
            closeClearChatModal();
            // 清空当前Bot的localStorage会话ID
            var botMap = {'7636289658620215331': 'diagnosis', '7637702903679631395': 'companion'};
            var mode = botMap[chatState.botId] || 'diagnosis';
            if (mode === 'companion') {
                localStorage.removeItem('cet_companion_conv');
            } else {
                localStorage.removeItem('cet_diagnosis_conv');
            }
            var container = document.getElementById('chat-messages');
            container.innerHTML = '';
            appendMessage('ai', '嗨！我是小过学长 👋\n基于**海量**真题数据分析你的薄弱点，随时问我任何备考问题');
            // Show chips again
            var chips = document.getElementById('input-chips');
            if (chips) chips.style.display = '';
            chatState.conversationId = null;
            chatState.chatId = null;
            chatState.chatRounds = 0;
            chatState.messages = [];
            chatState.chatHistory = [];
            chatState.isStreaming = false;
        }

        function toggleFaq(el) { el.parentElement.classList.toggle('open'); }
        function showPrivacyModal() {
            var overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:flex-end;justify-content:center;';
            var sheet = document.createElement('div');
            sheet.style.cssText = 'background:#fff;border-radius:16px 16px 0 0;width:100%;max-width:480px;max-height:70vh;padding:24px;overflow-y:auto;';
            sheet.innerHTML = '<div style="font-size:16px;font-weight:600;margin-bottom:16px">隐私政策</div>' +
                '<div style="font-size:13px;color:#64748b;line-height:1.8">' +
                '<p>1. 本产品为辅助学习工具，不收集、不存储、不上传您的个人信息。</p>' +
                '<p>2. 您的学习数据（诊断结果、打卡记录等）仅保存在您的浏览器本地存储中。</p>' +
                '<p>3. 与AI的对话内容仅用于提供辅导服务，对话内容不会被保存至我们的服务器。</p>' +
                '<p>4. 支付通过面包多平台完成，我们不接触您的支付信息。</p>' +
                '<p>5. 我们不会将您的数据分享给任何第三方。</p>' +
                '</div>' +
                '<button onclick="this.closest("div[style*=fixed]").remove()" style="width:100%;margin-top:20px;padding:12px;border:none;border-radius:10px;background:#6C5CE7;color:#fff;font-size:15px;font-weight:500;cursor:pointer">我知道了</button>';
            overlay.appendChild(sheet);
            overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
            document.body.appendChild(overlay);
        }

        function showTermsModal() {
            var overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:flex-end;justify-content:center;';
            var sheet = document.createElement('div');
            sheet.style.cssText = 'background:#fff;border-radius:16px 16px 0 0;width:100%;max-width:480px;max-height:70vh;padding:24px;overflow-y:auto;';
            sheet.innerHTML = '<div style="font-size:16px;font-weight:600;margin-bottom:16px">用户协议</div>' +
                '<div style="font-size:13px;color:#64748b;line-height:1.8">' +
                '<p>1. 本产品为AI辅助学习工具，提供的评分、批改、建议仅供参考，可能与实际考试评分存在差异。</p>' +
                '<p>2. 本产品不保证考试成绩，不构成任何通过考试的承诺。</p>' +
                '<p>3. 请以官方考试评分标准为准，本产品不能替代正规教学。</p>' +
                '<p>4. 付费服务购买后7天内可协商退款，已使用超过3天或批改超过5次的服务不支持退款。</p>' +
                '<p>5. 禁止将本产品用于任何违法违规用途。</p>' +
                '<p>6. 我们保留在不提前通知的情况下修改服务内容的权利。</p>' +
                '</div>' +
                '<button onclick="this.closest("div[style*=fixed]").remove()" style="width:100%;margin-top:20px;padding:12px;border:none;border-radius:10px;background:#6C5CE7;color:#fff;font-size:15px;font-weight:500;cursor:pointer">我知道了</button>';
            overlay.appendChild(sheet);
            overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
            document.body.appendChild(overlay);
        }

        function showToast(msg) {
            var toast = document.getElementById('toast');
            toast.textContent = msg;
            toast.classList.add('show');
            setTimeout(function() { toast.classList.remove('show'); }, 2500);
        }
        function showLoading(msg) {
            var loading = document.getElementById('loading');
            loading.querySelector('.loading-text').textContent = msg || '加载中...';
            loading.classList.add('show');
        }
        function hideLoading() { document.getElementById('loading').classList.remove('show'); }

        // 禁止整体滚动，只允许内部滚动
        document.body.addEventListener('touchmove', function(e) {
            if (e.target.closest('.tab-page')) {
                // 内部页面可以滚动
            } else {
                e.preventDefault();
            }
        }, { passive: false });

        // 初始化打卡日历和学习页streak
        (function() {
            setTimeout(function() {
                renderStreakCalendar();
                // 学习页streak同步
                var streak = getStreakData();
                var streakNumBig = document.getElementById('streak-num-big');
                var studyEnStreak = document.getElementById('study-en-streak');
                var studyEnTasks = document.getElementById('study-en-tasks');
                var studyEnChats = document.getElementById('study-en-chats');
                if (streakNumBig) streakNumBig.textContent = streak.count;
                if (studyEnStreak) studyEnStreak.textContent = streak.count;
                var data = state.userData || {};
                if (studyEnTasks) studyEnTasks.textContent = data.studyDays || 0;
                if (studyEnChats) studyEnChats.textContent = data.chatCount || 0;
            }, 100);
        })();
    
function handleHomeCta() {
    // 使用新的前端诊断模式
    startNewDiagnosis();
}

function selectPlan(plan) {
    // 支持新旧两种卡片选择
    var cards = document.querySelectorAll('.coze-card, .coze-plan-card');
    cards.forEach(function(c) { c.classList.remove('selected'); });
    var target = document.querySelector('.coze-card[data-plan="' + plan + '"], .coze-plan-card[data-plan="' + plan + '"]');
    if (target) target.classList.add('selected');
    var ctaBtn = document.getElementById('plan-cta-btn');
    if (ctaBtn) {
        var prices = { free: '当前方案', sprint: '¥44.5 开始冲刺', flagship: '¥149.5 全程陪伴' };
        ctaBtn.textContent = prices[plan] || '选择方案';
    }
}

// 切换套餐标签


// 切换Coze风格套餐标签
function switchCozeTab(el, plan) {
    document.querySelectorAll('.coze-tab').forEach(function(t) { t.classList.remove('active'); });
    el.classList.add('active');
    var targetCard = document.querySelector('.coze-card[data-plan="' + plan + '"]');
    if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
    selectPlan(plan);
}

function switchPlanTab(plan) {
    var tabs = document.querySelectorAll('.coze-plan-tab');
    var indicator = document.querySelector('.coze-plan-tab-indicator');
    
    tabs.forEach(function(tab) {
        tab.classList.remove('active');
        if (tab.dataset.plan === plan) {
            tab.classList.add('active');
        }
    });
    
    // 移动指示器
    if (indicator && tabs.length > 0) {
        var activeIndex = 0;
        tabs.forEach(function(tab, i) {
            if (tab.dataset.plan === plan) activeIndex = i;
        });
        var tabWidth = tabs[0].offsetWidth;
        indicator.style.transform = 'translateX(' + (activeIndex * tabWidth) + 'px)';
    }
    
    // 滚动到对应卡片
    var scrollContainer = document.getElementById('coze-card-scroll');
    var targetCard = document.querySelector('.coze-plan-card[data-plan="' + plan + '"]');
    if (scrollContainer && targetCard) {
        var scrollLeft = targetCard.offsetLeft - (scrollContainer.offsetWidth - targetCard.offsetWidth) / 2;
        scrollContainer.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
    
    // 选中卡片
    selectPlan(plan);
}

// 初始化套餐卡片滚动监听
function initPlanScrollSync() {
    var scrollContainer = document.getElementById('coze-card-scroll');
    if (!scrollContainer) return;
    
    var tabs = document.querySelectorAll('.coze-plan-tab');
    var indicator = document.querySelector('.coze-plan-tab-indicator');
    var cardWidth = 180 + 12; // 卡片宽度 + gap
    
    scrollContainer.addEventListener('scroll', function() {
        var scrollLeft = scrollContainer.scrollLeft;
        var index = Math.round(scrollLeft / cardWidth);
        index = Math.max(0, Math.min(index, tabs.length - 1));
        
        tabs.forEach(function(tab, i) {
            tab.classList.toggle('active', i === index);
        });
        
        if (indicator && tabs.length > 0) {
            var tabWidth = tabs[0].offsetWidth;
            indicator.style.transform = 'translateX(' + (index * tabWidth) + 'px)';
        }
    });
}

function showStudyHistory() { switchTab('progress'); }

function closeModal(id) { 
    var modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

function openPayment(plan) {
    var planNames = { sprint: '冲刺营', flagship: '全程营' };
    var planPrices = { sprint: 89, flagship: 299 };
    var planSalePrices = { sprint: 44.5, flagship: 149.5 }; // 5折后
    var planFeatures = {
        sprint: ['AI对话 无限','45天个性化学习计划','作文批改 每日1次（逐句改写）','翻译批改 每日1次（参考译文）','针对短板的每日一练'],
        flagship: ['AI对话 无限','45天个性化学习计划','作文/翻译批改 无限（逐句改写+精讲）','针对短板的每日一练','深度精讲（为什么错+怎么避坑）','六级衔接指导']
    };
    // 面包多商品链接（创建后替换）
    var mbdLinks = {
        sprint: 'https://mbd.pub/o/bread/YZaTk5tsbA==?discount_code=NGUPFC',
        flagship: 'https://mbd.pub/o/bread/YZaTk5ttbQ==?discount_code=WPBWPS'
    };

    var existing = document.getElementById('pay-modal');
    if (existing) existing.remove();

    var featureHtml = (planFeatures[plan] || []).map(function(f) {
        return '<li>' + f + '</li>';
    }).join('');

    var modal = document.createElement('div');
    modal.className = 'pay-modal';
    modal.id = 'pay-modal';
    modal.onclick = function(e) { if (e.target === modal) closePayModal(); };
    modal.innerHTML =
        '<div class="pay-sheet" style="position:relative">' +
            '<div class="pay-sheet-handle"></div>' +
            '<button class="pay-close" onclick="closePayModal()"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg></button>' +
            '<div class="pay-sheet-title">' + (planNames[plan] || plan) + '</div>' +
            '<div class="pay-sheet-price"><small>¥</small>' + (planSalePrices[plan] || '') + '<span style="font-size:14px;color:#94A3B8;text-decoration:line-through;margin-left:8px;font-weight:400">¥' + (planPrices[plan] || '') + '</span></div>' +
            '<ul class="pay-feature-list">' + featureHtml + '</ul>' +
            '<div class="pay-tabs">' +
                '<div class="pay-tab active" onclick="switchPayTab(\'online\')">在线购买</div>' +
                '<div class="pay-tab" onclick="switchPayTab(\'code\')">激活码</div>' +
            '</div>' +
            '<div class="pay-panel active" id="pay-panel-online">' +
                '<a class="pay-mbd-link" href="' + (mbdLinks[plan] || '#') + '" target="_blank" onclick="setTimeout(function(){document.getElementById(\'mbd-activate-section\').style.display=\'block\';},500)">去面包多购买 ¥' + (planPrices[plan] || '') + '</a>' +
                '<div class="pay-coupon-tip">💡 付款时输入优惠码 <strong style="color:#6C5CE7">' + (plan === 'sprint' ? 'NGUPFC' : 'WPBWPS') + '</strong> 享5折</div>' +
                '<div id="mbd-activate-section" style="margin-top:16px;padding-top:16px;border-top:1px solid #F1F5F9">' +
                    '<div style="font-size:13px;color:#64748B;margin-bottom:8px">购买完成后，粘贴面包多订单号即可自动开通</div>' +
                    '<div class="pay-input-row">' +
                        '<input type="text" id="mbd-order-input" placeholder="粘贴面包多订单号" autocomplete="off" spellcheck="false">' +
                        '<button id="mbd-activate-btn" onclick="activateWithMbdOrder(\'' + plan + '\')">验证激活</button>' +
                    '</div>' +
                    '<div id="mbd-activate-msg" style="font-size:12px;margin-top:8px;min-height:18px"></div>' +
                '</div>' +
            '</div>' +
            '<div class="pay-panel" id="pay-panel-code">' +
                '<div style="font-size:13px;color:#64748B;margin-bottom:4px">输入激活码开通</div>' +
                '<div class="pay-input-row">' +
                    '<input type="text" id="activate-code-input" placeholder="如 CET4S-A1B2C3-D4E5F6" autocomplete="off" spellcheck="false">' +
                    '<button id="activate-btn" onclick="activateWithCode()">激活</button>' +
                '</div>' +
                '<div id="activate-msg" style="font-size:12px;margin-top:8px;min-height:18px"></div>' +
            '</div>' +
        '</div>';
    document.body.appendChild(modal);
}

function switchPayTab(tab) {
    document.querySelectorAll('#pay-modal .pay-tab').forEach(function(t, i) {
        t.classList.toggle('active', (tab === 'online' && i === 0) || (tab === 'code' && i === 1));
    });
    document.getElementById('pay-panel-online').classList.toggle('active', tab === 'online');
    document.getElementById('pay-panel-code').classList.toggle('active', tab === 'code');
}

function closePayModal() {
    var modal = document.getElementById('pay-modal');
    if (modal) modal.remove();
}

function activateWithCode() {
    var input = document.getElementById('activate-code-input');
    var msgEl = document.getElementById('activate-msg');
    var btn = document.getElementById('activate-btn');
    if (!input || !input.value.trim()) {
        if (msgEl) { msgEl.style.color = '#E17055'; msgEl.textContent = '请输入激活码'; }
        return;
    }
    btn.disabled = true;
    btn.textContent = '激活中...';
    if (msgEl) { msgEl.style.color = '#64748B'; msgEl.textContent = ''; }

    fetch('http://8.218.88.15:8080/api/activate-with-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: input.value.trim() })
    }).then(function(r) { return r.json(); }).then(function(resp) {
        btn.disabled = false;
        btn.textContent = '激活';
        if (resp.success) {
            state.userData = state.userData || {};
            state.userData.plan = resp.plan;
            state.userData.planToken = resp.token;
            state.userData.planOrderId = resp.orderId;
            state.userData.planActivatedAt = Date.now();
            saveUserData(state.userData);
            updateProfileStats();
            updateHomeStatus();
            showPaySuccess(resp.plan);
        } else {
            if (msgEl) { msgEl.style.color = '#E17055'; msgEl.textContent = resp.error || '激活码无效'; }
        }
    }).catch(function(e) {
        btn.disabled = false;
        btn.textContent = '激活';
        if (msgEl) { msgEl.style.color = '#E17055'; msgEl.textContent = '网络错误，请重试'; }
    });
}

function activateWithMbdOrder(plan) {
    var input = document.getElementById('mbd-order-input');
    var msgEl = document.getElementById('mbd-activate-msg');
    var btn = document.getElementById('mbd-activate-btn');
    if (!input || !input.value.trim()) {
        if (msgEl) { msgEl.style.color = '#E17055'; msgEl.textContent = '请输入面包多订单号'; }
        return;
    }
    btn.disabled = true;
    btn.textContent = '验证中...';
    if (msgEl) { msgEl.style.color = '#64748B'; msgEl.textContent = '正在验证订单...'; }

    fetch('http://8.218.88.15:8080/api/activate-with-mbd-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: input.value.trim(), plan: plan })
    }).then(function(r) { return r.json(); }).then(function(resp) {
        btn.disabled = false;
        btn.textContent = '验证激活';
        if (resp.success) {
            state.userData = state.userData || {};
            state.userData.plan = resp.plan;
            state.userData.planToken = resp.token;
            state.userData.planOrderId = resp.orderId;
            state.userData.planActivatedAt = Date.now();
            saveUserData(state.userData);
            updateProfileStats();
            updateHomeStatus();
            if (resp.alreadyActivated) {
                if (msgEl) { msgEl.style.color = '#6C5CE7'; msgEl.textContent = '此订单已激活过'; }
            }
            showPaySuccess(resp.plan);
        } else {
            if (msgEl) { msgEl.style.color = '#E17055'; msgEl.textContent = resp.error || '验证失败'; }
        }
    }).catch(function(e) {
        btn.disabled = false;
        btn.textContent = '验证激活';
        if (msgEl) { msgEl.style.color = '#E17055'; msgEl.textContent = '网络错误，请重试'; }
    });
}

function showPaySuccess(plan) {
    var planNames = { sprint: '冲刺营', flagship: '全程营' };
    var sheet = document.querySelector('#pay-modal .pay-sheet');
    if (!sheet) return;
    sheet.innerHTML =
        '<div class="pay-sheet-handle"></div>' +
        '<div class="pay-success-icon"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>' +
        '<div class="pay-sheet-title" style="margin-bottom:4px">激活成功</div>' +
        '<div style="font-size:14px;color:#6C5CE7;font-weight:700;margin-bottom:16px">' + (planNames[plan] || plan) + ' 已开通</div>' +
        '<div style="font-size:13px;color:#64748B;margin-bottom:16px">正在跳转到AI陪练...</div>';
    // 自动跳转到聊天页面开始使用
    setTimeout(function() {
        closePayModal();
        switchTab('diagnosis');
        setTimeout(function() { openChat('companion'); }, 300);
    }, 1500);
}

function openActivateCodeModal() {
    var existing = document.getElementById('pay-modal');
    if (existing) existing.remove();
    var modal = document.createElement('div');
    modal.className = 'pay-modal';
    modal.id = 'pay-modal';
    modal.onclick = function(e) { if (e.target === modal) closePayModal(); };
    modal.innerHTML =
        '<div class="pay-sheet" style="position:relative">' +
            '<div class="pay-sheet-handle"></div>' +
            '<button class="pay-close" onclick="closePayModal()"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg></button>' +
            '<div class="pay-sheet-title">兑换码</div>' +
            '<div style="font-size:13px;color:#64748B;text-align:center;margin-bottom:16px">输入购买后获得的激活码开通套餐</div>' +
            '<div class="pay-input-row">' +
                '<input type="text" id="activate-code-input" placeholder="如 CET4S-A1B2C3-D4E5F6" autocomplete="off" spellcheck="false">' +
                '<button id="activate-btn" onclick="activateWithCode()">激活</button>' +
            '</div>' +
            '<div id="activate-msg" style="font-size:12px;margin-top:8px;min-height:18px"></div>' +
        '</div>';
    document.body.appendChild(modal);
}


// === 计划系统核心函数 ===

function parseDiagnosisResult(resultStr) {
    try {
        var parts = resultStr.split('|');
        var diagData = {};
        parts.forEach(function(p) {
            var kv = p.split('=');
            if (kv.length === 2) diagData[kv[0].trim()] = kv[1].trim();
        });
        if (diagData.type) {
            state.userData.diagnosis = diagData;
            state.userData.personality = diagData.type;
            saveUserData(state.userData);
            showToast('诊断完成！你是「' + diagData.type + '」');
        }
    } catch(e) { console.error('parseDiagnosisResult error', e); }
}

function parsePlanResult(planStr) {
    try {
        var days = planStr.split('|');
        var planData = {};
        days.forEach(function(d) {
            var kv = d.split('=');
            if (kv.length === 2) planData[kv[0].trim()] = kv[1].trim();
        });
        state.userData.plan_data = planData;
        state.userData.plan_created = new Date().toISOString().split('T')[0];
        saveUserData(state.userData);
        showToast('备考计划已生成！');
        // Update study page
        updatePlanDisplay();
            updateDailyTask();
    } catch(e) { console.error('parsePlanResult error', e); }
}

function parseTaskDone(taskStr) {
    try {
        // Mark today's task as done
        var todayKey = 'day' + getPlanDayIndex();
        if (state.userData.plan_data && state.userData.plan_data[todayKey]) {
            state.userData.plan_data[todayKey + '_done'] = true;
            saveUserData(state.userData);
        }
        // Trigger check-in
        var streak = safeGetItem('cet_streak', {count:0,lastDate:""});
        var today = new Date().toISOString().split('T')[0];
        if (streak.lastDate !== today) {
            streak.count = (streak.count || 0) + 1;
            streak.lastDate = today;
            localStorage.setItem('cet_streak', JSON.stringify(streak));
        }
        showToast('任务完成，已打卡！🔥');
    } catch(e) { console.error('parseTaskDone error', e); }
}

function getPlanDayIndex() {
    if (!state.userData || !state.userData.plan_created) return 1;
    var created = new Date(state.userData.plan_created);
    var now = new Date();
    var diff = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    return Math.min(diff + 1, 30); // max 30 days
}

function getPlanTodayTaskText() {
    if (!state.userData || !state.userData.plan_data) return '';
    var dayIdx = getPlanDayIndex();
    var todayKey = 'day' + dayIdx;
    return state.userData.plan_data[todayKey] || '';
}

function getPlanSummary() {
    if (!state.userData || !state.userData.plan_data) return '';
    var parts = [];
    for (var key in state.userData.plan_data) {
        if (key.indexOf('_done') === -1) {
            parts.push(key + '=' + state.userData.plan_data[key]);
        }
    }
    return parts.join('|');
}


function handlePlanCardClick() {
    var todayTask = getPlanTodayTaskText();
    if (todayTask) {
        // Has plan, go to AI coach to do today's task
        switchTab('diagnosis');
        setTimeout(function(){ startDiagChat('今天我该做什么？帮我安排今日任务'); }, 300);
    } else {
        // No plan, create one
        switchTab('diagnosis');
        setTimeout(function(){ startDiagChat('帮我制定冲刺计划'); }, 300);
    }
}

function updatePlanDisplay() {
    var titleEl = document.getElementById('study-plan-title');
    var descEl = document.getElementById('study-plan-desc');
    var todayTask = getPlanTodayTaskText();
    var dayIdx = getPlanDayIndex();
    
    if (todayTask && titleEl && descEl) {
        titleEl.textContent = 'Day ' + dayIdx + ' · 今日计划';
        descEl.textContent = todayTask;
    } else if (titleEl && descEl) {
        titleEl.textContent = 'AI备考计划';
        descEl.textContent = '定制你的专属冲刺方案';
    }
}


// === 每日一练系统 ===
var dailyTasks = [
    {type: 'reading', name: '阅读理解', prompt: '练1篇阅读理解', icon: '📖'},
    {type: 'vocab', name: '词汇积累', prompt: '背50个四级高频词', icon: '📝'},
    {type: 'translate', name: '翻译练习', prompt: '练1段中译英', icon: '🔄'},
    {type: 'attitude', name: '态度判断', prompt: '练3道态度判断题', icon: '🎯'},
    {type: 'inference', name: '推理判断', prompt: '练3道推理判断题', icon: '🧠'},
    {type: 'mainidea', name: '主旨归纳', prompt: '练3道主旨归纳题', icon: '📋'},
    {type: 'words', name: '核心词替换', prompt: '练10组同义替换', icon: '✨'}
];

// 根据诊断短板生成个性化每日任务
function getPersonalizedTasks() {
    var user = state.userData || {};
    var diag = user.diagnosis || {};
    var dims = {
        '细节定位': parseInt(diag['细节定位']) || 50,
        '推理判断': parseInt(diag['推理判断']) || 50,
        '同义替换': parseInt(diag['同义替换']) || 50,
        '主旨归纳': parseInt(diag['主旨归纳']) || 50,
        '态度判断': parseInt(diag['态度判断']) || 50
    };
    // 找最弱的2个维度
    var sorted = Object.keys(dims).sort(function(a, b) { return dims[a] - dims[b]; });
    var weak1 = sorted[0];
    var weak2 = sorted[1];
    var dimToTask = {
        '细节定位': {type: 'reading', name: '细节定位专项', prompt: '练3道细节定位题，学会回原文找线索', icon: '🔍'},
        '推理判断': {type: 'inference', name: '推理判断专项', prompt: '练3道推理判断题，学会从原文推导', icon: '🧠'},
        '同义替换': {type: 'words', name: '同义替换专项', prompt: '练10组同义替换，识别替换陷阱', icon: '🔄'},
        '主旨归纳': {type: 'mainidea', name: '主旨归纳专项', prompt: '练3道主旨归纳题，抓住文章核心', icon: '📋'},
        '态度判断': {type: 'attitude', name: '态度判断专项', prompt: '练3道态度判断题，识别作者态度', icon: '🎯'}
    };
    return [dimToTask[weak1], dimToTask[weak2]];
}

function getDailyTaskInfo() {
    try {
        var data = localStorage.getItem('cet_daily');
        if (!data) {
            var today = new Date();
            var dayIdx = (today.getDay() + 6) % 7; // Mon=0
            return { taskIndex: dayIdx, completed: [], date: getTodayStr() };
        }
        var info = JSON.parse(data);
        if (info.date !== getTodayStr()) {
            var today = new Date();
            var dayIdx = (today.getDay() + 6) % 7;
            return { taskIndex: dayIdx, completed: [], date: getTodayStr() };
        }
        return info;
    } catch(e) {
        var today = new Date();
        var dayIdx = (today.getDay() + 6) % 7;
        return { taskIndex: dayIdx, completed: [], date: getTodayStr() };
    }
}

function saveDailyTaskData(data) {
    data.date = getTodayStr();
    localStorage.setItem('cet_daily', JSON.stringify(data));
}

function updateDailyTask() {
    var user = state.userData || {};
    var plan = user.plan || 'free';
    var titleEl = document.getElementById('daily-task-title');
    var descEl = document.getElementById('daily-task-desc');
    var badgeEl = document.getElementById('daily-task-badge');
    if (!titleEl) return;

    if (plan !== 'free' && user.personality) {
        // 付费用户：针对短板的个性化任务
        var pTasks = getPersonalizedTasks();
        var today = new Date();
        var dayIdx = today.getDate() % 2; // 交替练2个弱项
        var task = pTasks[dayIdx] || pTasks[0];
        titleEl.textContent = task.icon + ' ' + task.name;
        descEl.textContent = task.prompt;
    } else {
        // 免费用户：通用7种轮换
        var info = getDailyTaskInfo();
        var task = dailyTasks[info.taskIndex];
        if (task) {
            titleEl.textContent = task.icon + ' ' + task.name;
            descEl.textContent = task.prompt;
        }
    }

    // 更新badge
    var info = getDailyTaskInfo();
    if (info.completed && info.completed.length > 0) {
        if (badgeEl) { badgeEl.textContent = '✓'; badgeEl.style.background = 'var(--success)'; badgeEl.style.color = '#fff'; }
    } else {
        if (badgeEl) { badgeEl.textContent = 'GO'; badgeEl.style.background = ''; badgeEl.style.color = ''; }
    }
}

function handleDailyTask() {
    var user = state.userData || {};
    var plan = user.plan || 'free';
    var msg = '';

    if (plan !== 'free' && user.personality) {
        var pTasks = getPersonalizedTasks();
        var today = new Date();
        var dayIdx = today.getDate() % 2;
        var task = pTasks[dayIdx] || pTasks[0];
        msg = task.prompt;
    } else {
        var info = getDailyTaskInfo();
        var task = dailyTasks[info.taskIndex];
        msg = task ? task.prompt : '帮我练一下英语';
    }

    openChat('companion');
    setTimeout(function() { sendSuggestion(msg); }, 300);
}

var quizState = {
    isActive: false,
    currentQuestion: null,
    currentIndex: 0,
    totalQuestions: 5,
    correctCount: 0,
    wrongCount: 0,
    typeStats: { '词汇': 0, '语法': 0, '阅读': 0, '听力': 0 },
    weakTypes: [],
    startTime: null,
    answeredTypes: { '词汇': 0, '语法': 0, '阅读': 0, '听力': 0 },
    wrongTypes: { '词汇': 0, '语法': 0, '阅读': 0, '听力': 0 }
};

// 解析[QUIZ:xxx]格式的题目
function parseQuizQuestion(quizStr) {
    try {
        var parts = quizStr.split('|');
        var q = {};
        parts.forEach(function(p) {
            var kv = p.split('=');
            if (kv.length === 2) {
                q[kv[0].trim()] = kv[1].trim();
            }
        });
        return q;
    } catch(e) {
        console.error('parseQuizQuestion error', e);
        return null;
    }
}

// 打开每日一练
function openQuiz() {
    quizState.isActive = true;
    quizState.currentIndex = 0;
    quizState.correctCount = 0;
    quizState.wrongCount = 0;
    quizState.typeStats = { '词汇': 0, '语法': 0, '阅读': 0, '听力': 0 };
    quizState.weakTypes = [];
    quizState.answeredTypes = { '词汇': 0, '语法': 0, '阅读': 0, '听力': 0 };
    quizState.wrongTypes = { '词汇': 0, '语法': 0, '阅读': 0, '听力': 0 };
    quizState.startTime = Date.now();
    
    var overlay = document.getElementById('quiz-overlay');
    var body = document.getElementById('quiz-body');
    var title = document.getElementById('quiz-title');
    var subtitle = document.getElementById('quiz-subtitle');
    var progress = document.getElementById('quiz-progress-fill');
    var nextBtn = document.getElementById('quiz-next-btn');
    
    title.textContent = '每日一练';
    subtitle.textContent = '正在出题...';
    progress.style.width = '0%';
    nextBtn.classList.remove('show', 'finish');
    
    // 显示loading状态
    body.innerHTML = '<div class="quiz-loading show"><div class="quiz-loading-spinner"></div><div class="quiz-loading-text">正在生成题目...</div></div>';
    
    overlay.classList.add('show');
    
    // 请求第一题
    requestQuizQuestion();
}

// 请求题目
async function requestQuizQuestion() {
    var user = state.userData || {};
    var plan = user.plan || 'free';
    var types = ['词汇', '语法', '阅读', '听力'];
    var randomType = types[Math.floor(Math.random() * types.length)];
    
    // 确保每种题型都有机会被抽到
    var unansweredTypes = types.filter(function(t) { return quizState.answeredTypes[t] < 2; });
    if (unansweredTypes.length > 0) {
        randomType = unansweredTypes[Math.floor(Math.random() * unansweredTypes.length)];
    }
    
    // 从真题库获取题目（不再用AI编题，支持自适应推题）
    var realQuizUrl = 'http://8.218.88.15:8080/api/quiz/random?type=' + encodeURIComponent(randomType);
    
    // 传递用户五维分数用于自适应推题
    var user = state.userData || {};
    var diag = user.diagnosis || {};
    if (diag['细节定位'] || diag['推理判断'] || diag['同义替换'] || diag['主旨归纳'] || diag['态度判断']) {
        var dimsParts = [];
        if (diag['细节定位']) dimsParts.push('细节定位:' + diag['细节定位']);
        if (diag['推理判断']) dimsParts.push('推理判断:' + diag['推理判断']);
        if (diag['同义替换']) dimsParts.push('同义替换:' + diag['同义替换']);
        if (diag['主旨归纳']) dimsParts.push('主旨归纳:' + diag['主旨归纳']);
        if (diag['态度判断']) dimsParts.push('态度判断:' + diag['态度判断']);
        if (dimsParts.length > 0) {
            realQuizUrl += '&dims=' + encodeURIComponent(dimsParts.join(','));
        }
    }
    
    fetch(realQuizUrl).then(function(r){return r.json()}).then(function(resp){
        if(resp.code===0 && resp.data){
            var q = resp.data;
            renderRealQuiz(q);
        } else {
            // fallback: 用AI生成
            // fallback AI quiz handled below
    var prompt = '请出一道四级' + randomType + '选择题。请严格按照以下格式返回（不要有任何其他内容）：\n[QUIZ:type=' + randomType + '|question=题目内容|optionA=选项A|optionB=选项B|optionC=选项C|optionD=选项D|answer=A|explanation=详细解析]';
            startAiQuiz(prompt, randomType);
        }
    }).catch(function(){
        // fallback AI quiz handled below
    var prompt = '请出一道四级' + randomType + '选择题。请严格按照以下格式返回（不要有任何其他内容）：\n[QUIZ:type=' + randomType + '|question=题目内容|optionA=选项A|optionB=选项B|optionC=选项C|optionD=选项D|answer=A|explanation=详细解析]';
        startAiQuiz(prompt, randomType);
    });
    
    // 切换到陪练Bot
    var botMap = { 'diagnosis': '7636289658620215331', 'companion': '7637702903679631395' };
    var currentBot = botMap[chatState.botId];
    if (currentBot !== 'companion') {
        // 保存当前会话
        if (chatState.conversationId && chatState.botId === botMap['companion']) {
            localStorage.setItem('cet_companion_conv', chatState.conversationId);
        }
        // 切换到陪练
        chatState.botId = botMap['companion'];
        chatState.conversationId = null;
        chatState.chatId = null;
    }
    
    // 确保有会话
    if (!chatState.conversationId) {
        try {
            var createResp = await fetchWithTimeout('/api/chat/conversation', { method: 'POST' });
            var createData = await createResp.json();
            if (createData.data && createData.data.id) {
                chatState.conversationId = createData.data.id;
                localStorage.setItem('cet_companion_conv', chatState.conversationId);
            }
        } catch(e) {
            console.error('创建会话失败', e);
        }
    }
    
    // 发送请求
    try {
        var resp = await fetchWithTimeout('/api/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                conversation_id: chatState.conversationId,
                bot_id: chatState.botId,
                user_id: (state.userData && state.userData.uid) || 'user_' + Date.now(),
                query: prompt,
                chat_history: []
            })
        });
        
        // 读取流式响应
        var reader = resp.body.getReader();
        var decoder = new TextDecoder();
        var fullText = '';
        
        while (true) {
            var result = await reader.read();
            if (result.done) break;
            
            var chunk = decoder.decode(result.value, { stream: true });
            var lines = chunk.split('\n');
            
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (!line || line.startsWith(':')) continue;
                if (line.startsWith('event:')) continue;
                if (!line.startsWith('data:')) continue;
                
                var dataStr = line.substring(5).trim();
                if (dataStr === '[DONE]') continue;
                
                try {
                    var evt = JSON.parse(dataStr);
                    if (evt.type === 'conversation.message.delta' && evt.data && evt.data.content && evt.data.type === 'answer') {
                        fullText += evt.data.content;
                    }
                    if (evt.type === 'conversation.chat.created' || evt.type === 'conversation.chat.in_progress') {
                        if (evt.data && evt.data.conversation_id) {
                            chatState.conversationId = evt.data.conversation_id;
                        }
                    }
                } catch(e) {}
            }
        }
        
        // 解析题目
        var quizMatch = fullText.match(/\[QUIZ:(.+?)\]/);
        if (quizMatch) {
            var question = parseQuizQuestion(quizMatch[1]);
            if (question) {
                quizState.currentQuestion = question;
                quizState.answeredTypes[question.type] = (quizState.answeredTypes[question.type] || 0) + 1;
                renderQuizQuestion(question);
                return;
            }
        }
        
        // 如果没解析到题目，尝试直接渲染原始文本
        if (fullText) {
            var cleanText = fullText.replace(/\[QUIZ:(.+?)\]/g, '').trim();
            if (cleanText) {
                showQuizError('题目生成失败，请重试');
                return;
            }
        }
        
        showQuizError('获取题目失败，请重试');
        
    } catch(e) {
        console.error('请求题目失败', e);
        showQuizError('网络错误，请重试');
    }
}

// 渲染题目
function renderQuizQuestion(question) {
    var body = document.getElementById('quiz-body');
    var subtitle = document.getElementById('quiz-subtitle');
    var progress = document.getElementById('quiz-progress-fill');
    var nextBtn = document.getElementById('quiz-next-btn');
    
    var typeLabels = { '词汇': '词汇', '语法': '语法', '阅读': '阅读', '听力': '听力' };
    subtitle.textContent = '第 ' + (quizState.currentIndex + 1) + ' / ' + quizState.totalQuestions + ' 题';
    progress.style.width = ((quizState.currentIndex / quizState.totalQuestions) * 100) + '%';
    nextBtn.classList.remove('show', 'finish');
    
    // 获取维度（从dimension_cn或dimension字段）
    var dimension = question.dimension_cn || question.dimension || question.type || '';
    // 获取难度（从level_cn或level字段）
    var level = question.level_cn || question.level || 2;
    var levelLabels = { 1: '基础', 2: '提高', 3: '冲刺' };
    var levelDisplay = typeof level === 'number' ? levelLabels[level] || '提高' : level;
    
    // 维度标签颜色映射
    var dimColors = { '听力': '#6C5CE7', '阅读': '#00B894', '写作': '#E17055', '翻译': '#FDCB6E', '词汇': '#74B9FF' };
    var dimColor = dimColors[dimension] || '#6C5CE7';
    var levelColors = { '基础': '#00B894', '提高': '#6C5CE7', '冲刺': '#E17055' };
    var levelColor = levelColors[levelDisplay] || '#6C5CE7';
    
    // 构建标签HTML
    var tagHtml = '<div class="quiz-tags">';
    tagHtml += '<span class="quiz-dim-tag" style="background:' + dimColor + '1a;color:' + dimColor + '">' + dimension + '</span>';
    tagHtml += '<span class="quiz-level-tag" style="background:' + levelColor + '1a;color:' + levelColor + '">' + levelDisplay + '</span>';
    tagHtml += '</div>';
    
    var html = '<div class="quiz-type-badge">' + tagHtml + '</div>';
    html += '<div class="quiz-question">' + question.question + '</div>';
    html += '<div class="quiz-options">';
    
    var options = ['A', 'B', 'C', 'D'];
    var optionKeys = ['optionA', 'optionB', 'optionC', 'optionD'];
    
    options.forEach(function(opt, idx) {
        html += '<div class="quiz-option" onclick="selectQuizOption(this, \'' + opt + '\')" data-option="' + opt + '">';
        html += '<div class="quiz-option-letter">' + opt + '</div>';
        html += '<div class="quiz-option-text">' + question[optionKeys[idx]] + '</div>';
        html += '<div class="quiz-option-icon">';
        if (opt === question.answer) {
            html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
        } else {
            html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        }
        html += '</div></div>';
    });
    
    html += '</div>';
    html += '<div class="quiz-feedback" id="quiz-feedback">';
    html += '<div class="quiz-feedback-title" id="quiz-feedback-title"></div>';
    html += '<div class="quiz-explanation" id="quiz-explanation"></div>';
    html += '</div>';
    
    body.innerHTML = html;
}

// 选择答案
function selectQuizOption(el, option) {
    if (el.classList.contains('disabled')) return;
    
    var question = quizState.currentQuestion;
    var isCorrect = option === question.answer;
    
    // 禁用所有选项
    var options = document.querySelectorAll('.quiz-option');
    options.forEach(function(opt) {
        opt.classList.add('disabled');
    });
    
    // 标记选择
    el.classList.add(isCorrect ? 'correct' : 'wrong');
    
    // 显示正确答案
    if (!isCorrect) {
        options.forEach(function(opt) {
            if (opt.dataset.option === question.answer) {
                opt.classList.add('correct');
            }
        });
    }
    
    // 更新统计
    if (isCorrect) {
        quizState.correctCount++;
    } else {
        quizState.wrongCount++;
        quizState.wrongTypes[question.type] = (quizState.wrongTypes[question.type] || 0) + 1;
        // 保存到错题本
        saveWrongQuestion({id: question.id || ('q_'+Date.now()), type: question.type, question: question.question, optionA: question.optionA, optionB: question.optionB, optionC: question.optionC, optionD: question.optionD, answer: question.answer, userAnswer: option, explanation: question.explanation, difficulty: question.difficulty || 'Medium'});
        updateWrongCount();
    }
    
    // 显示反馈
    var feedback = document.getElementById('quiz-feedback');
    var feedbackTitle = document.getElementById('quiz-feedback-title');
    var explanation = document.getElementById('quiz-explanation');
    
    feedback.classList.add('show', isCorrect ? 'correct' : 'wrong');
    feedbackTitle.innerHTML = isCorrect 
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> 回答正确！'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> 回答错误';
    explanation.textContent = question.explanation;
    
    // 显示下一题按钮
    var nextBtn = document.getElementById('quiz-next-btn');
    if (quizState.currentIndex >= quizState.totalQuestions - 1) {
        nextBtn.textContent = '查看结果';
        nextBtn.classList.add('show', 'finish');
    } else {
        nextBtn.textContent = '下一题';
        nextBtn.classList.add('show');
    }
}

// 下一题
function quizNextQuestion() {
    quizState.currentIndex++;
    
    if (quizState.currentIndex >= quizState.totalQuestions) {
        // 显示统计页
        showQuizStats();
    } else {
        // 请求下一题
        var body = document.getElementById('quiz-body');
        var subtitle = document.getElementById('quiz-subtitle');
        var nextBtn = document.getElementById('quiz-next-btn');
        
        subtitle.textContent = '正在加载...';
        nextBtn.classList.remove('show', 'finish');
        
        body.innerHTML = '<div class="quiz-loading show"><div class="quiz-loading-spinner"></div><div class="quiz-loading-text">正在生成下一题...</div></div>';
        
        requestQuizQuestion();
    }
}

// 显示统计
function showQuizStats() {
    var body = document.getElementById('quiz-body');
    var subtitle = document.getElementById('quiz-subtitle');
    var title = document.getElementById('quiz-title');
    var progress = document.getElementById('quiz-progress-fill');
    var nextBtn = document.getElementById('quiz-next-btn');
    
    title.textContent = '练习完成';
    subtitle.textContent = '';
    progress.style.width = '100%';
    nextBtn.classList.remove('show', 'finish');
    
    var rate = Math.round((quizState.correctCount / quizState.totalQuestions) * 100);
    var duration = Math.round((Date.now() - quizState.startTime) / 1000);
    var minutes = Math.floor(duration / 60);
    var seconds = duration % 60;
    var timeStr = minutes > 0 ? minutes + '分' + seconds + '秒' : seconds + '秒';
    
    // 找出薄弱项
    var weakTypes = [];
    for (var type in quizState.wrongTypes) {
        if (quizState.wrongTypes[type] > 0) {
            weakTypes.push(type);
        }
    }
    
    var weakHtml = '';
    if (weakTypes.length > 0) {
        weakHtml = '<div class="quiz-stats-weak"><div class="quiz-stats-weak-title">💪 薄弱项</div><div class="quiz-stats-weak-text">' + weakTypes.join('、') + '需要加强练习</div></div>';
    }
    
    var statsTitles = {
        100: '太棒了！',
        80: '很不错！',
        60: '继续加油！',
        40: '还需努力',
        0: '多加练习'
    };
    
    var titleText = '完成了！';
    for (var t in statsTitles) {
        if (rate >= parseInt(t)) {
            titleText = statsTitles[t];
            break;
        }
    }
    
    var html = '<div class="quiz-stats show">';
    html += '<div class="quiz-stats-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>';
    html += '<div class="quiz-stats-title">' + titleText + '</div>';
    html += '<div class="quiz-stats-rate"><span id="quiz-stats-rate-num">' + rate + '</span><span>%</span></div>';
    html += '<div class="quiz-stats-grid">';
    html += '<div class="quiz-stats-item"><div class="quiz-stats-item-value">' + quizState.correctCount + '</div><div class="quiz-stats-item-label">正确</div></div>';
    html += '<div class="quiz-stats-item"><div class="quiz-stats-item-value">' + quizState.wrongCount + '</div><div class="quiz-stats-item-label">错误</div></div>';
    html += '<div class="quiz-stats-item"><div class="quiz-stats-item-value">' + timeStr + '</div><div class="quiz-stats-item-label">用时</div></div>';
    html += '</div>';
    html += weakHtml;
    html += '<button class="quiz-stats-btn primary" onclick="restartQuiz()">再练一组</button>';
    html += '<button class="quiz-stats-btn secondary" onclick="closeQuiz()">返回</button>';
    html += '</div>';
    
    body.innerHTML = html;
    
    // CountUp动画 - 正确率从0滚动到实际值
    setTimeout(function() {
        var rateNumEl = document.getElementById('quiz-stats-rate-num');
        if (rateNumEl) {
            animateCountUp(rateNumEl, rate, 1500);
        }
    }, 300);

    // 更新打卡
    var daily = getDailyTaskInfo();
    if (!daily.completed.includes('quiz')) {
        daily.completed.push('quiz');
        saveDailyTaskData(daily);
        updateDailyTask();
        updateHomeStatus();
    }
}

// 重新开始
function restartQuiz() {
    quizState.currentIndex = 0;
    quizState.correctCount = 0;
    quizState.wrongCount = 0;
    quizState.answeredTypes = { '词汇': 0, '语法': 0, '阅读': 0, '听力': 0 };
    quizState.wrongTypes = { '词汇': 0, '语法': 0, '阅读': 0, '听力': 0 };
    quizState.startTime = Date.now();
    
    var body = document.getElementById('quiz-body');
    var subtitle = document.getElementById('quiz-subtitle');
    var progress = document.getElementById('quiz-progress-fill');
    
    subtitle.textContent = '正在出题...';
    progress.style.width = '0%';
    
    body.innerHTML = '<div class="quiz-loading show"><div class="quiz-loading-spinner"></div><div class="quiz-loading-text">正在生成题目...</div></div>';
    
    requestQuizQuestion();
}

// 关闭Quiz
function closeQuiz() {
    var overlay = document.getElementById('quiz-overlay');
    overlay.classList.remove('show');
    quizState.isActive = false;
}

// 显示错误
function showQuizError(msg) {
    var body = document.getElementById('quiz-body');
    var subtitle = document.getElementById('quiz-subtitle');
    subtitle.textContent = '';
    
    body.innerHTML = '<div class="quiz-stats show"><div class="quiz-stats-title" style="color:#E17055">' + msg + '</div><button class="quiz-stats-btn primary" onclick="restartQuiz()">重试</button><button class="quiz-stats-btn secondary" onclick="closeQuiz()">返回</button></div>';
}

// 处理Bot返回的QUIZ标签
function handleBotQuizResponse(fullText) {
    var quizMatch = fullText.match(/\[QUIZ:(.+?)\]/);
    if (quizMatch) {
        var question = parseQuizQuestion(quizMatch[1]);
        if (question) {
            quizState.isActive = true;
            quizState.currentQuestion = question;
            quizState.answeredTypes[question.type] = (quizState.answeredTypes[question.type] || 0) + 1;
            renderQuizQuestion(question);
            return true;
        }
    }
    return false;
}

// === Chat limit system (后端为准，前端同步) ===
// 修复问题1：前端不再自己计数，而是调用后端API获取剩余次数

// 缓存后端返回的限流信息，避免每次发消息都请求
var _cachedLimitInfo = null;
var _cachedLimitTime = 0;
const LIMIT_CACHE_TTL = 5000; // 缓存5秒

// 从后端获取剩余对话次数（异步）
async function fetchRemainingFromBackend(userId) {
    try {
        var resp = await fetchWithTimeout('/api/chat/remaining', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                plan_token: (state.userData && state.userData.planToken) || '',
                plan_order_id: (state.userData && state.userData.planOrderId) || ''
            })
        });
        if (resp.ok) {
            var data = await resp.json();
            return data;
        }
    } catch (e) {
        console.error('获取限流信息失败:', e);
    }
    return null;
}

// 检查聊天限流（现在会先尝试从后端获取）
async function checkChatLimitAsync(userId) {
    var now = Date.now();
    
    // 优先使用缓存
    if (_cachedLimitInfo && (now - _cachedLimitTime) < LIMIT_CACHE_TTL) {
        var plan = _cachedLimitInfo.plan || 'free';
        if (plan !== 'free') {
            updateQuotaHint(-1); // 付费用户不显示
            return { limited: false };
        }
        var remaining = _cachedLimitInfo.remaining;
        updateQuotaHint(remaining);
        if (remaining <= 0) {
            showUpgradeCard();
            return { limited: true, message: '' };
        }
        return { limited: false, remaining: remaining };
    }
    
    // 从后端获取最新数据
    var backendData = await fetchRemainingFromBackend(userId);
    
    if (backendData) {
        // 更新缓存
        _cachedLimitInfo = backendData;
        _cachedLimitTime = now;
        
        var verifiedPlan = backendData.plan || 'free';
        if (verifiedPlan !== 'free') {
            updateQuotaHint(-1);
            return { limited: false };
        }
        var remaining = backendData.remaining;
        updateQuotaHint(remaining);
        if (remaining <= 0) {
            showUpgradeCard();
            return { limited: true, message: '' };
        }
        return { limited: false, remaining: remaining };
    }
    
    // 后端请求失败，使用本地降级
    var user = state.userData || {};
    var plan = user.plan || 'free';
    if (plan !== 'free') {
        updateQuotaHint(-1);
        return { limited: false };
    }
    var usage = getChatUsage();
    var limit = 25;
    var remaining = Math.max(0, limit - usage.count);
    updateQuotaHint(remaining);
    if (remaining <= 0) {
        showUpgradeCard();
        return { limited: true, message: '' };
    }
    return { limited: false, remaining: remaining };
}

// 更新额度提示
function updateQuotaHint(remaining) {
    var hint = document.getElementById('chat-quota-hint');
    if (!hint) return;
    if (remaining < 0) {
        hint.style.display = 'none';
        return;
    }
    if (remaining <= 5) {
        hint.textContent = '今日还剩' + remaining + '轮免费对话';
        hint.style.display = '';
    } else {
        hint.style.display = 'none';
    }
}

// 显示升级卡片
function showUpgradeCard() {
    var overlay = document.getElementById('upgrade-overlay');
    if (!overlay) {
        var div = document.createElement('div');
        div.id = 'upgrade-overlay';
        div.className = 'upgrade-overlay';
        div.innerHTML = '<div class="upgrade-card" style="position:relative">' +
            '<button class="upgrade-close" onclick="closeUpgradeCard()">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
            '</button>' +
            '<div class="upgrade-icon">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>' +
            '</div>' +
            '<div class="upgrade-title">今日免费额度已用完</div>' +
            '<div class="upgrade-subtitle">明天恢复25轮免费对话<br>或升级冲刺营无限对话</div>' +
            '<a class="upgrade-btn" href="#" onclick="event.preventDefault();closeUpgradeCard();openPayment(\'sprint\')">了解冲刺营</a>' +
        '</div>';
        document.body.appendChild(div);
    }
    document.getElementById('upgrade-overlay').style.display = 'flex';
}

function closeUpgradeCard() {
    var overlay = document.getElementById('upgrade-overlay');
    if (overlay) overlay.style.display = 'none';
}

// 同步版本（用于UI显示等不需要最新数据的场景）
function checkChatLimit() {
    var user = state.userData || {};
    var plan = user.plan || 'free';
    
    // Paid users: unlimited chat
    if (plan !== 'free') {
        return { limited: false };
    }
    
    // 如果有缓存，使用缓存
    if (_cachedLimitInfo) {
        var remaining = _cachedLimitInfo.remaining;
        if (remaining <= 0) {
            return { limited: true, message: '今日免费陪练额度已用完（25轮/天），明天恢复。升级冲刺营即可无限对话+逐句批改～' };
        }
        return { limited: false, remaining: remaining };
    }
    
    // 无缓存，使用本地计算
    var usage = getChatUsage();
    var limit = 25;
    if (usage.count >= limit) {
        return { limited: true, message: '今日免费陪练额度已用完（25轮/天），明天恢复。升级冲刺营即可无限对话+逐句批改～' };
    }
    return { limited: false, remaining: limit - usage.count };
}

// 获取本地使用量（降级用）
function getChatUsage() {
    try {
        var data = localStorage.getItem('cet_chat_usage');
        if (!data) return { count: 0, date: '' };
        var usage = JSON.parse(data);
        var today = new Date().toISOString().split('T')[0];
        // Reset if new day
        if (usage.date !== today) {
            return { count: 0, date: today };
        }
        return usage;
    } catch(e) {
        return { count: 0, date: '' };
    }
}

// 本地计数递增（降级用，不再是主要计数方式）
function incrementChatUsage() {
    var usage = getChatUsage();
    usage.count++;
    usage.date = new Date().toISOString().split('T')[0];
    localStorage.setItem('cet_chat_usage', JSON.stringify(usage));
}

// 页面加载时预获取限流信息
function preloadLimitInfo() {
    var userId = (state.userData && state.userData.uid) || 'user_' + Date.now();
    fetchRemainingFromBackend(userId).then(function(data) {
        if (data) {
            _cachedLimitInfo = data;
            _cachedLimitTime = Date.now();
        }
    });
}


        // 人格卡分享
        // 绘制人格卡分享图（Canvas绘制确保高清晰度）
        function drawShareCardImage(canvas, personality) {
            var ctx = canvas.getContext('2d');
            var dpr = window.devicePixelRatio || 2; // 使用2倍分辨率确保清晰
            var width = 320;
            var height = 400;
            
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            ctx.scale(dpr, dpr);
            
            // 渐变背景
            var gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, personality.color || '#6C5CE7');
            gradient.addColorStop(1, '#A29BFE');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            
            // 顶部装饰圆
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.beginPath();
            ctx.arc(width - 40, 40, 80, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(-20, height - 60, 60, 0, Math.PI * 2);
            ctx.fill();
            
            // 标题
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('📚 我的四级备考人格', width / 2, 36);
            
            // 人格图标（大圆角矩形卡片）
            var cardX = 60;
            var cardY = 60;
            var cardW = 200;
            var cardH = 200;
            
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.beginPath();
            roundRect(ctx, cardX, cardY, cardW, cardH, 16);
            ctx.fill();
            
            // 人格头像
            var avatarSize = 100;
            var avatarX = cardX + (cardW - avatarSize) / 2;
            var avatarY = cardY + 20;
            ctx.fillStyle = personality.color || '#6C5CE7';
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
            ctx.fill();
            
            // 加载并绘制人格图片
            var img = new Image();
            img.onload = function() {
                ctx.save();
                ctx.beginPath();
                ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2 - 2, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(img, avatarX + 2, avatarY + 2, avatarSize - 4, avatarSize - 4);
                ctx.restore();
            };
            img.src = personality.img;
            
            // 人格类型名称
            ctx.fillStyle = '#1a1a2e';
            ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText(personality.type, width / 2, cardY + 140);
            
            // 荣誉称号
            ctx.fillStyle = personality.color || '#6C5CE7';
            ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText(personality.honor, width / 2, cardY + 162);
            
            // 签名语
            ctx.fillStyle = '#64748b';
            ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
            // 签名语换行处理
            var comment = personality.comment || '';
            if (comment.length > 16) {
                ctx.fillText(comment.substring(0, 16), width / 2, cardY + 185);
                ctx.fillText(comment.substring(16), width / 2, cardY + 202);
            } else {
                ctx.fillText(comment, width / 2, cardY + 185);
            }
            
            // 底部信息
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText('四级备考搭子 · AI智能诊断', width / 2, 300);
            
            // 底部提示
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText('长按保存图片分享到小红书', width / 2, 325);
        }
        
        // 圆角矩形辅助函数
        function roundRect(ctx, x, y, width, height, radius) {
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
        }
        
        function showShareCard() {
            var ptype = (state.userData && state.userData.personality) || '偏科大佬';
            var currentPersonality = null;
            for (var i = 0; i < personalities.length; i++) {
                if (personalities[i].type === ptype) { 
                    currentPersonality = personalities[i]; 
                    break; 
                }
            }
            if (!currentPersonality) {
                currentPersonality = personalities[0]; // 默认偏科大佬
            }
            
            // 绘制Canvas分享图
            var canvas = document.getElementById('share-card-canvas');
            if (canvas) {
                drawShareCardImage(canvas, currentPersonality);
            }
            
            document.getElementById('share-card-modal').style.display = 'flex';
        }
        
        function closeShareCard() {
            document.getElementById('share-card-modal').style.display = 'none';
        }
        

// 五维维度配置
const DIM_CONFIGS = {
    '细节定位': { icon: '🔍', color: '#6C5CE7', desc: '能否快速定位原文关键信息' },
    '推理判断': { icon: '🧠', color: '#00B894', desc: '能否从原文正确推导隐含信息' },
    '同义替换': { icon: '🔄', color: '#FDCB6E', desc: '能否识别选项与原文的同义表达' },
    '主旨归纳': { icon: '📋', color: '#E17055', desc: '能否准确把握文章中心和结构' },
    '态度判断': { icon: '🎯', color: '#0984E3', desc: '能否判断作者的观点和态度' }
};

// 诊断数据（从Bot回复解析）
var reportData = {
    riskLevel: 'mid',
    totalScore: 0,
    dims: {},
    weakDims: [],
    advice: '',
    tips: [],
    personality: '',
    botText: ''
};

// 解析诊断结果
function parseDiagnosisReport(text) {
    var data = {
        riskLevel: 'mid',
        totalScore: 0,
        dims: {},
        weakDims: [],
        advice: '',
        tips: [],
        personality: '',
        botText: text
    };
    
    // 尝试解析结构化数据 [RESULT:xxx]
    var resultMatch = text.match(/\[RESULT:(.+?)\]/);
    if (resultMatch) {
        var parts = resultMatch[1].split('|');
        parts.forEach(function(p) {
            var kv = p.split('=');
            if (kv.length === 2) {
                var key = kv[0].trim();
                var val = kv[1].trim();
                if (key === 'type' || key === 'personality') {
                    data.personality = val;
                } else if (key === 'risk' || key === 'riskLevel') {
                    if (val.includes('高')) data.riskLevel = 'high';
                    else if (val.includes('低')) data.riskLevel = 'low';
                    else data.riskLevel = 'mid';
                } else if (key === 'score' || key === 'total' || key === '综合评分') {
                    data.totalScore = parseInt(val) || 0;
                } else if (DIM_CONFIGS[key]) {
                    data.dims[key] = parseInt(val) || 0;
                }
            }
        });
    }
    
    // 尝试解析五维数据（五维诊断块）
    var dimMatch = text.match(/【五维诊断】([\s\S]*?)(?=【|$)/);
    if (dimMatch) {
        var dimBlock = dimMatch[1];
        Object.keys(DIM_CONFIGS).forEach(function(dim) {
            var m = dimBlock.match(new RegExp(dim + '[：:]?\\s*(\\d+)'));
            if (m) data.dims[dim] = parseInt(m[1]);
        });
    }
    
    // 尝试解析综合评分
    var scoreMatch = text.match(/综合[评分得分]：?\\s*(\\d+)/);
    if (scoreMatch) data.totalScore = parseInt(scoreMatch[1]);
    
    // 尝试解析风险等级
    var riskMatch = text.match(/风险[等级]：?\\s*([高低中危]+)/);
    if (riskMatch) {
        var r = riskMatch[1];
        if (r.includes('高')) data.riskLevel = 'high';
        else if (r.includes('低')) data.riskLevel = 'low';
        else data.riskLevel = 'mid';
    }
    
    // 尝试解析人格类型
    var typeMatch = text.match(/你是[「"](.+?)[」"]|备考人格[：:]\\s*([^\\s【]+)/);
    if (typeMatch) {
        data.personality = typeMatch[1] || typeMatch[2] || data.personality;
    }
    
    // 如果没有结构化数据，尝试从 state.userData.diagnosis 获取
    if (Object.keys(data.dims).length === 0 && state.userData && state.userData.diagnosis) {
        var diag = state.userData.diagnosis;
        Object.keys(DIM_CONFIGS).forEach(function(dim) {
            if (diag[dim]) data.dims[dim] = parseInt(diag[dim]);
        });
        if (diag.type) data.personality = diag.type;
        if (diag.risk) {
            if (diag.risk.includes('高')) data.riskLevel = 'high';
            else if (diag.risk.includes('低')) data.riskLevel = 'low';
        }
    }
    
    // 计算综合评分（如果未解析到）
    if (data.totalScore === 0 && Object.keys(data.dims).length > 0) {
        var sum = 0, count = 0;
        Object.keys(data.dims).forEach(function(k) { sum += data.dims[k]; count++; });
        data.totalScore = Math.round(sum / count);
    }
    
    // 找出最弱两项
    var dimArr = Object.keys(data.dims).map(function(k) {
        return { name: k, score: data.dims[k] };
    }).sort(function(a, b) { return a.score - b.score; });
    data.weakDims = dimArr.slice(0, 2);
    
    return data;
}

// 显示诊断报告页
function showDiagnosisReport(text) {
    reportData = parseDiagnosisReport(text);
    
    // 保存到 userData
    if (state.userData) {
        state.userData.diagnosis = state.userData.diagnosis || {};
        Object.keys(reportData.dims).forEach(function(k) {
            state.userData.diagnosis[k] = reportData.dims[k];
        });
        if (reportData.personality) {
            state.userData.personality = reportData.personality;
            state.userData.diagnosis.type = reportData.personality;
        }
        saveUserData(state.userData);
        
        // 同时写入cet4_ability_scores（供仪表盘使用）
        try {
            localStorage.setItem('cet4_ability_scores', JSON.stringify({ dims: reportData.dims }));
        } catch(e) {}
        
        // 写入cet4_user_profile的startDate（如果还没有）
        try {
            var profile = safeGetItem('cet4_user_profile', {});
            if (!profile.startDate) {
                profile.startDate = getTodayStr();
                localStorage.setItem('cet4_user_profile', JSON.stringify(profile));
            }
        } catch(e) {}
    }
    
    // 保存到诊断历史记录
    saveDiagnosisRecord(reportData);
    
    renderReportPage();
    
    var overlay = document.getElementById('report-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        // 动画效果
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s';
        requestAnimationFrame(function() {
            overlay.style.opacity = '1';
        });
    }
}

// ===== 新诊断模式 =====
// 诊断状态
var diagState = {
    questions: [],
    currentQIndex: 0,
    answers: [],
    selfEval: [],
    correctCount: 0,
    phase: 'loading' // loading, questions, selfeval, generating, done
};

// 开始新诊断流程
async function startNewDiagnosis() {
    var overlay = document.getElementById('diag-overlay');
    if (!overlay) return;
    
    // 重置状态
    diagState = {
        questions: [],
        currentQIndex: 0,
        answers: [],
        selfEval: [],
        correctCount: 0,
        phase: 'loading'
    };
    
    // 显示界面
    overlay.classList.add('active');
    document.getElementById('diag-progress-wrap').style.display = 'none';
    
    // 显示加载
    renderDiagLoading('正在加载题目...');
    
    try {
        // 调用API获取题目
        var resp = await fetchWithTimeout('/public/diagnosis_questions.json');
        var result = await resp.json();
        
        // 解析新版JSON格式（包含passages数组）
        var questions = [];
        if (result && result.passages) {
            // 新版格式：从passages中提取所有题目
            result.passages.forEach(function(passage) {
                if (passage.questions) {
                    passage.questions.forEach(function(q) {
                        // 存储passage_text供折叠展示（如果需要）
                        q._passageText = passage.text;
                        questions.push(q);
                    });
                }
            });
        }
        
        if (questions.length === 0) {
            // fallback到旧模式
            closeDiagOverlay();
            // 提示用户使用AI对话诊断
            showToast('新诊断模式暂不可用，将使用AI对话诊断');
            openChat('chat');
            setTimeout(function(){ sendSuggestion('开始AI诊断，帮我找出四级薄弱点'); }, 300);
            return;
        }
        
        diagState.questions = questions;
        diagState.phase = 'questions';
        document.getElementById('diag-progress-wrap').style.display = '';
        
        // 开始答题
        showCurrentQuestion();
        
    } catch(e) {
        console.error('[诊断加载失败]', e);
        closeDiagOverlay();
        showToast('加载题目失败，请重试');
    }
}

// 渲染加载状态
function renderDiagLoading(text) {
    var body = document.getElementById('diag-body');
    body.innerHTML = 
        '<div class="diag-loading">' +
            '<div class="diag-spinner"></div>' +
            '<div class="diag-loading-text">' + text + '</div>' +
        '</div>';
}

// 显示当前题目
function showCurrentQuestion() {
    var q = diagState.questions[diagState.currentQIndex];
    if (!q) {
        showSelfEval();
        return;
    }
    
    var progress = Math.round((diagState.currentQIndex / 15) * 100);
    document.getElementById('diag-progress-fill').style.width = progress + '%';
    document.getElementById('diag-progress-text').textContent = '第' + (diagState.currentQIndex + 1) + '题/共15题';
    
    // 构建HTML
    var html = '<div class="diag-question-card">';
    
    // 显示可折叠的阅读原文
    if (q._passageText) {
        html += '<div class="diag-passage-wrap">' +
            '<div class="diag-passage-toggle" onclick="togglePassage(this)">📖 点击展开阅读原文 <span class="toggle-arrow">▼</span></div>' +
            '<div class="diag-passage-content" style="display:none">' +
            '<div class="diag-passage-text">' + escapeHtml(q._passageText) + '</div>' +
            '</div>' +
        '</div>';
    }
    
    html += '<div class="diag-question-num">第 ' + (diagState.currentQIndex + 1) + ' / 15 题</div>' +
        '<div class="diag-question-text">' + escapeHtml(q.question) + '</div>' +
        '<div class="diag-options">' +
            renderOptionBtn('A', q.optionA, 'A') +
            renderOptionBtn('B', q.optionB, 'B') +
            renderOptionBtn('C', q.optionC, 'C') +
            renderOptionBtn('D', q.optionD, 'D') +
        '</div>' +
    '</div>';
    
    document.getElementById('diag-body').innerHTML = html;
}

// 切换原文折叠/展开
function togglePassage(btn) {
    var content = btn.nextElementSibling;
    var arrow = btn.querySelector('.toggle-arrow');
    if (content.style.display === 'none') {
        content.style.display = '';
        arrow.textContent = '▲';
        btn.innerHTML = '📖 收起阅读原文 <span class="toggle-arrow">▲</span>';
    } else {
        content.style.display = 'none';
        arrow.textContent = '▼';
        btn.innerHTML = '📖 点击展开阅读原文 <span class="toggle-arrow">▼</span>';
    }
}

// 渲染选项按钮
function renderOptionBtn(letter, text, value) {
    return '<div class="diag-option-btn" onclick="selectOption(this, \'' + value + '\')">' +
        '<div class="diag-option-letter">' + letter + '</div>' +
        '<div class="diag-option-text">' + text + '</div>' +
    '</div>';
}

// 选择选项
function selectOption(btn, selectedValue) {
    var q = diagState.questions[diagState.currentQIndex];
    var correctAnswer = q.answer || q.correct_answer;
    var isCorrect = selectedValue === correctAnswer;
    
    // 禁用所有按钮
    var allBtns = document.querySelectorAll('.diag-option-btn');
    allBtns.forEach(function(b) { b.classList.add('disabled'); });
    
    // 记录答案（不显示对错）
    diagState.answers.push({
        id: q.id,
        userAnswer: selectedValue,
        correctAnswer: correctAnswer,
        isCorrect: isCorrect,
        ability: q.ability || '细节定位'
    });
    
    // 500ms后自动下一题（快速但不突兀）
    setTimeout(function() {
        diagState.currentQIndex++;
        if (diagState.currentQIndex >= 15) {
            showSelfEval();
        } else {
            showCurrentQuestion();
        }
    }, 500);
}

// 显示自评问卷
function showSelfEval() {
    diagState.phase = 'selfeval';
    
    var progress = 100;
    document.getElementById('diag-progress-fill').style.width = progress + '%';
    document.getElementById('diag-progress-text').textContent = '自评问卷';
    document.getElementById('diag-self-eval-hint').style.display = 'inline';
    
    var html = 
        '<div class="diag-eval-section">' +
            '<div class="diag-eval-title">📋 自我评估</div>' +
            '<div class="diag-eval-subtitle">根据你的实际情况选择</div>' +
            
            '<div class="diag-eval-item">' +
                '<div class="diag-eval-label">🎧 听力能力</div>' +
                '<div class="diag-eval-options">' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'听力\', \'A\')">' +
                        '<div class="eval-letter">A</div><div class="eval-desc">中等水平</div>' +
                    '</div>' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'听力\', \'B\')">' +
                        '<div class="eval-letter">B</div><div class="eval-desc">较弱</div>' +
                    '</div>' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'听力\', \'C\')">' +
                        '<div class="eval-letter">C</div><div class="eval-desc">比较薄弱</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            
            '<div class="diag-eval-item">' +
                '<div class="diag-eval-label">✍️ 写作能力</div>' +
                '<div class="diag-eval-options">' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'写作\', \'A\')">' +
                        '<div class="eval-letter">A</div><div class="eval-desc">中等水平</div>' +
                    '</div>' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'写作\', \'B\')">' +
                        '<div class="eval-letter">B</div><div class="eval-desc">较弱</div>' +
                    '</div>' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'写作\', \'C\')">' +
                        '<div class="eval-letter">C</div><div class="eval-desc">比较薄弱</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            
            '<div class="diag-eval-item">' +
                '<div class="diag-eval-label">🔄 翻译能力</div>' +
                '<div class="diag-eval-options">' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'翻译\', \'A\')">' +
                        '<div class="eval-letter">A</div><div class="eval-desc">中等水平</div>' +
                    '</div>' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'翻译\', \'B\')">' +
                        '<div class="eval-letter">B</div><div class="eval-desc">较弱</div>' +
                    '</div>' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'翻译\', \'C\')">' +
                        '<div class="eval-letter">C</div><div class="eval-desc">比较薄弱</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            
            '<button class="diag-generate-btn" id="diag-generate-btn" onclick="generateDiagReport()" disabled>' +
                '<span>✨</span> 生成诊断报告' +
            '</button>' +
        '</div>';
    
    document.getElementById('diag-body').innerHTML = html;
}

// 选择自评选项
function selectEval(btn, dimension, value) {
    // 取消该维度的其他选择
    var siblings = btn.parentElement.querySelectorAll('.diag-eval-btn');
    siblings.forEach(function(s) { s.classList.remove('selected'); });
    btn.classList.add('selected');
    
    // 更新状态
    var found = false;
    for (var i = 0; i < diagState.selfEval.length; i++) {
        if (diagState.selfEval[i].dimension === dimension) {
            diagState.selfEval[i].answer = value;
            found = true;
            break;
        }
    }
    if (!found) {
        diagState.selfEval.push({ dimension: dimension, answer: value });
    }
    
    // 检查是否所有选项都已选择
    checkEvalComplete();
}

// 检查自评是否完成
function checkEvalComplete() {
    var btn = document.getElementById('diag-generate-btn');
    if (!btn) return;
    
    var evalDims = ['听力', '写作', '翻译'];
    var allSelected = evalDims.every(function(dim) {
        return diagState.selfEval.some(function(e) { return e.dimension === dim; });
    });
    
    btn.disabled = !allSelected;
}

// 生成诊断报告
async function generateDiagReport() {
    diagState.phase = 'generating';
    
    // 显示加载
    document.getElementById('diag-body').innerHTML = 
        '<div class="diag-loading">' +
            '<div class="diag-spinner"></div>' +
            '<div class="diag-loading-text">AI正在分析你的答题情况...</div>' +
        '</div>';
    
    try {
        // 构建自评数据
        var selfAssessment = {
            listening: '中等',
            writing: '中等',
            translation: '中等'
        };
        diagState.selfEval.forEach(function(item) {
            if (item.dimension === '听力') {
                selfAssessment.listening = item.answer === 'A' ? '中等' : item.answer === 'B' ? '较弱' : '薄弱';
            } else if (item.dimension === '写作') {
                selfAssessment.writing = item.answer === 'A' ? '中等' : item.answer === 'B' ? '较弱' : '薄弱';
            } else if (item.dimension === '翻译') {
                selfAssessment.translation = item.answer === 'A' ? '中等' : item.answer === 'B' ? '较弱' : '薄弱';
            }
        });
        
        var resp = await fetchWithTimeout('/api/diagnosis/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                answers: diagState.answers,
                selfAssessment: selfAssessment
            })
        });
        
        var result = await resp.json();
        
        if (result.code !== 0 || !result.data) {
            throw new Error(result.error || '生成报告失败');
        }
        
        // 构建报告文本（兼容旧格式）
        var reportText = buildReportText(result.data);
        
        // 显示报告
        diagState.phase = 'done';
        showDiagnosisReport(reportText);
        
        // 关闭诊断界面
        closeDiagOverlay();
        
    } catch(e) {
        console.error('[生成报告失败]', e);
        document.getElementById('diag-body').innerHTML = 
            '<div class="diag-loading">' +
                '<div class="diag-loading-text">生成报告失败: ' + e.message + '</div>' +
                '<button class="diag-submit-btn" onclick="startNewDiagnosis()" style="margin-top:20px">重新诊断</button>' +
            '</div>';
    }
}

// 构建报告文本（兼容旧格式）
function buildReportText(data) {
    // 提取result_tag中的维度分数
    var dims = {};
    if (data.result_tag) {
        var parts = data.result_tag.split('|');
        parts.forEach(function(p) {
            var kv = p.split('=');
            if (kv.length === 2) {
                var key = kv[0].trim();
                var val = parseInt(kv[1]) || 0;
                if (['细节定位', '推理判断', '同义替换', '主旨归纳', '态度判断'].indexOf(key) !== -1) {
                    dims[key] = val;
                }
            }
        });
    }
    
    // 从dimension_scores补充
    if (data.dimension_scores) {
        Object.keys(data.dimension_scores).forEach(function(k) {
            if (['细节定位', '推理判断', '同义替换', '主旨归纳', '态度判断'].indexOf(k) !== -1) {
                dims[k] = data.dimension_scores[k] || dims[k] || 0;
            }
        });
    }
    
    // 计算总评分
    var totalScore = 0;
    var count = 0;
    Object.keys(dims).forEach(function(k) {
        totalScore += dims[k];
        count++;
    });
    if (count > 0) totalScore = Math.round(totalScore / count);
    
    // 构建兼容格式
    var text = '【五维诊断】\n';
    Object.keys(dims).forEach(function(k) {
        text += k + ': ' + dims[k] + '\n';
    });
    text += '\n综合评分: ' + totalScore + '\n';
    text += '\n你是"' + (data.personality || '佛系随缘') + '"！\n';
    text += '\n' + (data.roast || '') + '\n';
    text += '\n[RESULT:type=' + (data.personality || '佛系随缘') + '|score=' + totalScore;
    Object.keys(dims).forEach(function(k) {
        text += '|' + k + '=' + dims[k];
    });
    text += ']';
    
    // 保存到reportData
    reportData = {
        riskLevel: totalScore >= 60 ? 'low' : totalScore >= 40 ? 'mid' : 'high',
        totalScore: totalScore,
        dims: dims,
        weakDims: buildWeakDims(dims),
        advice: (data.suggestions || []).join('\n'),
        tips: data.suggestions || [],
        personality: data.personality || '佛系随缘',
        roast: data.roast || '',
        shareText: data.share_text || '',
        correctCount: data.correct_count || diagState.correctCount,
        totalCount: data.total_count || 15,
        accuracy: data.accuracy || Math.round(diagState.correctCount / 15 * 100)
    };
    
    return text;
}

// 构建弱维度列表
function buildWeakDims(dims) {
    var arr = Object.keys(dims).map(function(k) {
        return { name: k, score: dims[k] };
    }).sort(function(a, b) {
        return a.score - b.score;
    });
    return arr.slice(0, 2);
}

// 退出诊断
function exitDiagnosis() {
    if (diagState.phase === 'generating') {
        if (!confirm('报告生成中，确定要退出吗？')) return;
    }
    closeDiagOverlay();
}

// 关闭诊断界面
function closeDiagOverlay() {
    var overlay = document.getElementById('diag-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// 关闭报告页
function closeReportPage() {
    var overlay = document.getElementById('report-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(function() {
            overlay.style.display = 'none';
            overlay.style.opacity = '';
        }, 300);
    }
}

// 继续陪练
function continuePractice() {
    closeReportPage();
    switchTab('diagnosis');
    setTimeout(function() {
        openChat('companion');
    }, 350);
}

// 免费弱项训练 - 跳转到AI陪练并发送弱项练习指令
function startWeakDimPractice() {
    var weakName = '';
    if (reportData && reportData.weakDims && reportData.weakDims.length > 0) {
        weakName = reportData.weakDims[0].name || '';
    }
    closeReportPage();
    switchTab('diagnosis');
    setTimeout(function() {
        openChat('companion');
        setTimeout(function() {
            var msg = weakName ? 
                '我' + weakName + '比较薄弱，给我出几道' + weakName + '的真题练练' : 
                '给我出几道阅读理解真题练练';
            sendSuggestion(msg);
        }, 500);
    }, 350);
}

// ===== 学习计划系统 =====
var planState = {
    data: null,
    dims: null
};

function generateLearningPlan() {
    var dims = reportData ? reportData.dims : null;
    if (!dims) {
        showToast('请先完成诊断测试');
        return;
    }
    
    planState.dims = dims;
    showPlanOverlay();
    
    // 调用API生成计划
    var systemPrompt = '你是四级备考规划专家。用户已完成能力诊断，五维分数如下：' + 
        JSON.stringify(dims) + '。请根据这些分数生成4周学习计划，返回JSON格式：{"weeks":[{"week":1,"focus":"本周重点","tasks":["任务1","任务2"]},{"week":2,"focus":"本周重点","tasks":["任务1","任务2"]},{"week":3,"focus":"本周重点","tasks":["任务1","任务2"]},{"week":4,"focus":"本周重点","tasks":["任务1","任务2"]}]} 只返回JSON。';
    
    fetch('http://8.218.88.15:8080/api/deepseek/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: '请根据我的诊断报告生成4周学习计划' }
            ],
            stream: false
        })
    })
    .then(function(r){ return r.json(); })
    .then(function(resp){
        if (resp.code === 0 && resp.data && resp.data.content) {
            try {
                var jsonMatch = resp.data.content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    planState.data = JSON.parse(jsonMatch[0]);
                } else {
                    planState.data = { weeks: generateDefaultPlan(dims) };
                }
            } catch(e) {
                planState.data = { weeks: generateDefaultPlan(dims) };
            }
        } else {
            planState.data = { weeks: generateDefaultPlan(dims) };
        }
        saveLearningPlan(planState.data);
        renderPlanContent();
    })
    .catch(function(){
        planState.data = { weeks: generateDefaultPlan(dims) };
        saveLearningPlan(planState.data);
        renderPlanContent();
    });
}

function generateDefaultPlan(dims) {
    var tasks = [];
    var weekTasks = [
        { focus: '听力强化', tasks: ['完成2篇听力练习', '背诵30个高频词汇', '练习1套真题'] },
        { focus: '阅读提升', tasks: ['完成3篇阅读练习', '整理高频同义替换', '分析长难句结构'] },
        { focus: '写译突破', tasks: ['背诵5个写作模板', '练习1篇作文', '整理翻译高频词组'] },
        { focus: '综合冲刺', tasks: ['完成1套全真模拟', '复习错题本', '查漏补缺'] }
    ];
    return weekTasks;
}

function saveLearningPlan(plan) {
    try {
        var profile = safeGetItem('cet4_user_profile', {});
        profile.learning_plan = plan;
        profile.plan_updated = getTodayStr();
        localStorage.setItem('cet4_user_profile', JSON.stringify(profile));
    } catch(e) {}
}

function getLearningPlan() {
    try {
        var profile = safeGetItem('cet4_user_profile', {});
        return profile.learning_plan || null;
    } catch(e) { return null; }
}

function showPlanOverlay() {
    var overlay = document.getElementById('plan-overlay');
    if (!overlay) {
        var div = document.createElement('div');
        div.id = 'plan-overlay';
        div.className = 'plan-overlay';
        div.innerHTML = '<div class="plan-header">' +
            '<button class="plan-back" onclick="closePlanOverlay()">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>' +
            '</button>' +
            '<div class="plan-title">4周学习计划</div>' +
        '</div>' +
        '<div class="plan-body" id="plan-body">' +
            '<div class="plan-loading" id="plan-loading">' +
                '<div class="plan-loading-spinner"></div>' +
                '<div class="plan-loading-text">AI正在生成学习计划...</div>' +
            '</div>' +
        '</div>';
        document.body.appendChild(div);
    }
    document.getElementById('plan-loading').style.display = '';
    document.getElementById('plan-body').innerHTML = '<div class="plan-loading" id="plan-loading"><div class="plan-loading-spinner"></div><div class="plan-loading-text">AI正在生成学习计划...</div></div>';
    document.getElementById('plan-overlay').style.display = 'flex';
}

function closePlanOverlay() {
    var overlay = document.getElementById('plan-overlay');
    if (overlay) overlay.style.display = 'none';
}

function renderPlanContent() {
    var body = document.getElementById('plan-body');
    if (!body || !planState.data || !planState.data.weeks) return;
    
    var html = '';
    planState.data.weeks.forEach(function(week) {
        html += '<div class="plan-week-card">' +
            '<div class="plan-week-header">' +
                '<div class="plan-week-title">第' + week.week + '周</div>' +
                '<div class="plan-week-badge">Week ' + week.week + '</div>' +
            '</div>';
        if (week.focus) {
            html += '<div class="plan-focus">重点：' + week.focus + '</div>';
        }
        html += '<ul class="plan-tasks">';
        if (week.tasks && week.tasks.length) {
            week.tasks.forEach(function(task) {
                html += '<li class="plan-task"><span class="plan-task-dot"></span>' + task + '</li>';
            });
        }
        html += '</ul></div>';
    });
    
    body.innerHTML = html;
}

// 打开报告支付弹窗
function openReportPayModal() {
    openPayment('sprint');
}

// 渲染报告页面
function renderReportPage() {
    var content = document.getElementById('report-content');
    if (!content) return;
    
    var d = reportData;
    var riskLabels = { high: '高危风险', mid: '中危风险', low: '低危风险' };
    var riskIcons = { high: '⚠️', mid: '📊', low: '✅' };
    
    // 生成五维卡片HTML
    var dimCardsHtml = '';
    Object.keys(DIM_CONFIGS).forEach(function(dim) {
        var score = d.dims[dim] || 0;
        var config = DIM_CONFIGS[dim];
        var color = score >= 70 ? '#00B894' : score >= 40 ? '#FDCB6E' : '#E17055';
        dimCardsHtml += 
            '<div class="report-dim-card">' +
                '<div class="report-dim-name">' + config.icon + ' ' + dim + '</div>' +
                '<div class="report-dim-score" style="color:' + color + '">' + score + '</div>' +
                '<div class="report-dim-bar">' +
                    '<div class="report-dim-fill" style="width:' + score + '%;background:' + color + '"></div>' +
                '</div>' +
                '<div class="report-dim-tip">' + config.desc + '</div>' +
            '</div>';
    });
    
    // 生成弱项建议卡片
    var weakAdviceHtml = '';
    var adviceMap = {
        '细节定位': { label: '细节定位专项', advice: '建议每天练习3道细节题，学会用关键词回原文定位。重点关注时间、数字、绝对词等信号词。' },
        '推理判断': { label: '推理判断专项', advice: '练习从原文信息推导隐含含义，重点关注转折词和因果词。一切答案从原文出发，避免主观推测。' },
        '同义替换': { label: '同义替换专项', advice: '留意选项和原文的改写方式，重点关注词性变换和近义替换。积累高频同义替换词组有助于解题。' },
        '主旨归纳': { label: '主旨归纳专项', advice: '先看首尾句和转折词，关注高频出现的名词和主题词。文章主旨通常在首段末句或末段首句。' },
        '态度判断': { label: '态度判断专项', advice: '积累常见的态度词（如skeptical、optimistic等），注意作者是否直接表态还是引用他人观点。' }
    };
    d.weakDims.forEach(function(weak) {
        var advice = adviceMap[weak.name] || { label: weak.name + '专项', advice: '建议针对性练习，提高' + weak.name + '能力。' };
        weakAdviceHtml += 
            '<div class="report-advice-card">' +
                '<div class="report-advice-label">' + weak.score + '分 · 最薄弱项</div>' +
                '<div class="report-advice-dim">' + advice.label + '</div>' +
                '<div class="report-advice-text">' + advice.advice + '</div>' +
            '</div>';
    });
    
    // 生成备考建议
    var tipsHtml = '';
    var tips = [
        { icon: '', text: '每天投入30分钟针对性训练，重点巩固薄弱维度' },
        { icon: '', text: '做完题及时复盘错题，记录考点和错误原因' },
        { icon: '', text: '定期重新诊断，追踪各维度能力变化' }
    ];
    tips.forEach(function(tip) {
        tipsHtml += 
            '<div class="report-tip-item">' +
                '<div class="report-tip-icon">' + tip.icon + '</div>' +
                '<div class="report-tip-text">' + tip.text + '</div>' +
            '</div>';
    });
    
    // 组装完整HTML
    content.innerHTML = 
        '<div style="text-align:center;margin-bottom:20px">' +
            '<div class="report-risk-badge report-risk-' + d.riskLevel + '">' +
                '<span class="report-risk-dot"></span>' +
                riskIcons[d.riskLevel] + ' ' + riskLabels[d.riskLevel] +
            '</div>' +
        '</div>' +
        
        '<div class="report-score-section">' +
            '<div class="report-score-num">' + d.totalScore + '<span class="report-score-denom">/100</span></div>' +
            '<div class="report-score-label">综合能力评分' + (d.personality ? ' · ' + d.personality : '') + '</div>' +
        '</div>' +
        
        '<div class="report-radar-section">' +
            '<div class="report-radar-title">📊 五维能力雷达图</div>' +
            '<div class="report-radar-canvas-wrap">' +
                '<canvas id="report-radar-canvas" width="280" height="280"></canvas>' +
            '</div>' +
        '</div>' +
        
        '<div class="report-dims-grid">' + dimCardsHtml + '</div>' +
        
        (weakAdviceHtml ? '<div class="report-advice-section"><div class="report-section-title">💪 专项提升建议</div>' + weakAdviceHtml + '</div>' : '') +
        
        '<div class="report-tips-section">' +
            '<div class="report-section-title">📚 备考建议</div>' +
            tipsHtml +
        '</div>' +
        
        '<div style="text-align:center;padding:16px 0;">' +
            '<button style="padding:10px 20px;background:#F8F9FA;border:1px solid #E2E8F0;border-radius:8px;font-size:13px;color:#64748B;cursor:pointer" onclick="showReportShare()">📱 分享报告</button>' +
        '</div>' +
        
        '<div style="margin-top:16px">' +
            '<button style="padding:12px 20px;background:linear-gradient(135deg,#6C5CE7,#A29BFE);border:none;border-radius:10px;font-size:14px;color:white;cursor:pointer;width:100%;font-weight:600;box-shadow:0 4px 12px rgba(108,92,231,0.3)" onclick="showSpecialPlan()">📋 生成我的专项计划</button>' +
        '</div>';
    
    // 简洁CTA提示：一行文字点一下弱项
    try {
        var ctaHint = document.getElementById('report-cta-hint');
        if (ctaHint && d.weakDims && d.weakDims.length > 0) {
            var weakName = d.weakDims[0].name || '';
            if (weakName) {
                ctaHint.textContent = '你的' + weakName + '较弱，冲刺营有专项训练';
            }
        }
    } catch(e) {}

    // 绘制雷达图
    setTimeout(function() {
        drawReportRadar();
    }, 100);
}

// 绘制报告页雷达图
function drawReportRadar() {
    var canvas = document.getElementById('report-radar-canvas');
    if (!canvas) return;
    
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var size = 260;
    
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);
    
    var centerX = size / 2;
    var centerY = size / 2;
    var maxRadius = 100;
    
    var dims = Object.keys(DIM_CONFIGS);
    var n = dims.length;
    var angleStep = (Math.PI * 2) / n;
    
    // 背景网格
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1;
    for (var r = 1; r <= 5; r++) {
        ctx.beginPath();
        for (var i = 0; i <= n; i++) {
            var angle = i * angleStep - Math.PI / 2;
            var x = centerX + Math.cos(angle) * (r * maxRadius / 5);
            var y = centerY + Math.sin(angle) * (r * maxRadius / 5);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
    }
    
    // 径向线
    for (var i = 0; i < n; i++) {
        var angle = i * angleStep - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + Math.cos(angle) * maxRadius, centerY + Math.sin(angle) * maxRadius);
        ctx.stroke();
    }
    
    // 数据区域
    var data = reportData.dims;
    var gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    gradient.addColorStop(0, 'rgba(108,92,231,0.3)');
    gradient.addColorStop(1, 'rgba(108,92,231,0.1)');
    
    ctx.beginPath();
    for (var i = 0; i <= n; i++) {
        var idx = i % n;
        var dimName = dims[idx];
        var score = data[dimName] || 0;
        var r = (score / 100) * maxRadius;
        var angle = i * angleStep - Math.PI / 2;
        var x = centerX + Math.cos(angle) * r;
        var y = centerY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#6C5CE7';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 数据点
    for (var i = 0; i < n; i++) {
        var dimName = dims[i];
        var score = data[dimName] || 0;
        var r = (score / 100) * maxRadius;
        var angle = i * angleStep - Math.PI / 2;
        var x = centerX + Math.cos(angle) * r;
        var y = centerY + Math.sin(angle) * r;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#6C5CE7';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // 标签
    ctx.fillStyle = '#475569';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (var i = 0; i < n; i++) {
        var dimName = dims[i];
        var label = DIM_CONFIGS[dimName] ? dimName : dimName;
        var angle = i * angleStep - Math.PI / 2;
        var labelR = maxRadius + 20;
        var x = centerX + Math.cos(angle) * labelR;
        var y = centerY + Math.sin(angle) * labelR;
        
        var score = data[dimName] || 0;
        var labelText = score + '分';
        
        // 绘制标签
        ctx.fillStyle = '#64748B';
        ctx.fillText(label, x, y);
        ctx.fillStyle = '#475569';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(labelText, x, y + 16);
        ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    }
}

// 显示报告分享
function showReportShare() {
    var modal = document.getElementById('report-share-modal');
    if (modal) modal.style.display = 'flex';
    
    setTimeout(function() {
        drawReportShareImage();
    }, 100);
}

// 关闭报告分享
function closeReportShare() {
    var modal = document.getElementById('report-share-modal');
    if (modal) modal.style.display = 'none';
}

// 绘制分享图片
function drawReportShareImage() {
    var canvas = document.getElementById('report-share-canvas');
    if (!canvas) return;
    
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    
    canvas.width = 280 * dpr;
    canvas.height = 400 * dpr;
    ctx.scale(dpr, dpr);
    
    // 背景
    var gradient = ctx.createLinearGradient(0, 0, 280, 400);
    gradient.addColorStop(0, '#6C5CE7');
    gradient.addColorStop(1, '#A29BFE');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 280, 400);
    
    // 标题
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📊 我的四级诊断报告', 140, 40);
    
    // 风险等级
    var riskLabels = { high: '⚠️ 高危风险', mid: '📊 中危风险', low: '✅ 低危风险' };
    ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(riskLabels[reportData.riskLevel] || '📊 中危风险', 140, 70);
    
    // 综合评分
    ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(reportData.totalScore, 140, 130);
    ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('/100 综合能力评分', 140, 155);
    
    // 人格类型
    if (reportData.personality) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText('你是「' + reportData.personality + '」', 140, 180);
    }
    
    // 五维分数条
    var dims = Object.keys(DIM_CONFIGS);
    var barStartY = 210;
    var barHeight = 28;
    
    dims.forEach(function(dim, i) {
        var y = barStartY + i * barHeight;
        var score = reportData.dims[dim] || 0;
        var color = score >= 70 ? '#00B894' : score >= 40 ? '#FDCB6E' : '#E17055';
        
        // 维度名
        ctx.fillStyle = '#fff';
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(DIM_CONFIGS[dim].icon + ' ' + dim, 20, y + 12);
        
        // 分数
        ctx.textAlign = 'right';
        ctx.fillText(score + '分', 260, y + 12);
        
        // 进度条背景
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(20, y + 18, 240, 6);
        
        // 进度条填充
        ctx.fillStyle = color;
        ctx.fillRect(20, y + 18, 240 * score / 100, 6);
    });
    
    // 底部提示
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('四级备考搭子 · AI智能诊断', 140, 385);
}

// ===== 免费AI对话限额逻辑 (GPT风格) =====
// 每日免费额度：3条AI对话消息
var CET4_DAILY_FREE_LIMIT = 20;
var CET4_CHAT_COUNT_KEY_PREFIX = 'cet4_chat_count_';

// 获取今天的日期字符串 YYYYMMDD
function getTodayDateStr() {
    var d = new Date();
    return d.getFullYear() + '' + 
        String(d.getMonth() + 1).padStart(2, '0') + '' + 
        String(d.getDate()).padStart(2, '0');
}

// 获取当天已用免费次数
function getDailyChatUsed() {
    try {
        var key = CET4_CHAT_COUNT_KEY_PREFIX + getTodayDateStr();
        var used = localStorage.getItem(key);
        return used ? parseInt(used, 10) : 0;
    } catch(e) {
        return 0;
    }
}

// 获取当天剩余免费次数
function getDailyChatRemaining() {
    return Math.max(0, CET4_DAILY_FREE_LIMIT - getDailyChatUsed());
}

// 检查是否已用完免费额度（仅本地检查，不涉及付费用户）
function isFreeLimitReached() {
    // 付费用户不受限制
    var plan = (state.userData && state.userData.plan) || 'free';
    if (plan !== 'free') return false;
    
    return getDailyChatUsed() >= CET4_DAILY_FREE_LIMIT;
}

// 增加免费额度使用次数
function incrementDailyChatUsed() {
    try {
        var key = CET4_CHAT_COUNT_KEY_PREFIX + getTodayDateStr();
        var used = getDailyChatUsed();
        localStorage.setItem(key, String(used + 1));
    } catch(e) {
        console.error('incrementDailyChatUsed error:', e);
    }
}

// 检查是否是最后一条免费消息（发送后会达到限额）
function isLastFreeMessage() {
    var plan = (state.userData && state.userData.plan) || 'free';
    if (plan !== 'free') return false;
    
    var used = getDailyChatUsed();
    return used === CET4_DAILY_FREE_LIMIT - 1; // 当前是第 0,1,2 条，用完3条后是最后一条
}

// 追加轻提示到AI消息末尾（最后一条免费消息时）
function appendLimitHintToMessage(aiDiv) {
    if (!aiDiv) return;
    var bubbleEl = aiDiv.querySelector('.custom-chat-bubble');
    if (!bubbleEl) return;
    
    var hintHtml = '<div class="limit-hint-inline">这是你今天的最后1次免费对话啦，明天再来或升级冲刺营解锁无限对话</div>';
    bubbleEl.insertAdjacentHTML('beforeend', hintHtml);
    
    // 同时更新输入框placeholder
    updateChatInputPlaceholder();
            setTimeout(initChatPadding, 200);
            setTimeout(initPlanScrollSync, 100);
}

// 渲染限额系统消息卡片
function appendLimitSystemCard() {
    var container = document.getElementById('chat-messages');
    if (!container) return;
    
    var used = getDailyChatUsed();
    var msgDiv = document.createElement('div');
    msgDiv.className = 'custom-chat-msg limit-card';
    msgDiv.innerHTML = '<div class="limit-card-inner">' +
        '<div class="limit-card-icon">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                '<circle cx="12" cy="12" r="10"/>' +
                '<path d="M12 6v6l4 2"/>' +
            '</svg>' +
        '</div>' +
        '<div class="limit-card-text">' +
            '<div class="limit-card-title">今日免费额度已用完</div>' +
            '<div class="limit-card-desc">（' + used + '/' + CET4_DAILY_FREE_LIMIT + '）</div>' +
        '</div>' +
        '<a class="limit-card-btn" href="#" onclick="event.preventDefault();closeLimitCard(this);openPayment(\'sprint\')">升级冲刺营</a>' +
    '</div>';
    
    container.appendChild(msgDiv);
    scrollChatToBottom();
            updateChatPadding();
}

// 关闭限额卡片（隐藏而非删除，保留位置）
function closeLimitCard(btn) {
    var card = btn.closest('.limit-card');
    if (card) card.style.display = 'none';
}

// 更新输入框placeholder
function updateChatInputPlaceholder() {
    var input = document.getElementById('chat-input');
    var hint = document.getElementById('chat-quota-hint');
    if (!input) return;
    
    if (isFreeLimitReached()) {
        input.placeholder = '升级解锁无限对话...';
        if (hint) {
            hint.innerHTML = '今日免费对话已用完 <a href="#" onclick="event.preventDefault();switchTab(\'plans\')" style="color:#6C5CE7;font-weight:600;text-decoration:none">升级无限聊 →</a>';
            hint.style.display = '';
        }
    } else {
        input.placeholder = '问我任何四级问题...';
        if (hint) {
            hint.style.display = 'none';
        }
    }
}


function activateWithMbdOrderFromPlans() {
    var input = document.getElementById('plan-mbd-order-input');
    var msgEl = document.getElementById('plan-mbd-activate-msg');
    if (!input || !input.value.trim()) {
        if (msgEl) { msgEl.style.color = '#E17055'; msgEl.textContent = '请输入面包多订单号'; }
        return;
    }
    if (msgEl) { msgEl.style.color = '#64748B'; msgEl.textContent = '正在验证订单...'; }

    fetch('http://8.218.88.15:8080/api/activate-with-mbd-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: input.value.trim() })
    }).then(function(r) { return r.json(); }).then(function(resp) {
        if (resp.success) {
            state.userData = state.userData || {};
            state.userData.plan = resp.plan;
            state.userData.planToken = resp.token;
            state.userData.planOrderId = resp.orderId;
            state.userData.planActivatedAt = Date.now();
            saveUserData(state.userData);
            updateProfileStats();
            updateHomeStatus();
            if (msgEl) { msgEl.style.color = '#10B981'; msgEl.textContent = '激活成功！刷新页面即可使用'; }
            setTimeout(function(){ switchTab('home'); }, 1500);
        } else {
            if (msgEl) { msgEl.style.color = '#E17055'; msgEl.textContent = resp.error || '验证失败'; }
        }
    }).catch(function(e) {
        if (msgEl) { msgEl.style.color = '#E17055'; msgEl.textContent = '网络错误，请重试'; }
    });
}


// ===== 学习计划生成系统 =====
const PLAN_DURATION = 30;

// 根据五维分数生成学习计划
function generateStudyPlan(abilityScores) {
    if (!abilityScores) return null;
    
    var dims = abilityScores.dims || abilityScores || {};
    
    // 计算薄弱维度（分数低于60的）
    var weakDims = [];
    var allDims = [];
    
    for (var key in dims) {
        var score = parseInt(dims[key]) || 0;
        allDims.push({ name: key, score: score });
        if (score < 60) {
            weakDims.push({ name: key, score: score });
        }
    }
    
    // 按分数从低到高排序，最弱的排前面
    weakDims.sort(function(a, b) { return a.score - b.score; });
    
    // 计划数据结构
    var plan = {
        createdAt: new Date().toISOString(),
        startDay: getTodayStr(),
        dims: dims,
        weakDims: weakDims.map(function(d) { return d.name; }),
        days: []
    };
    
    // 每天的任务模板
    var taskTemplates = {
        '细节定位': ['做5道细节定位题', '复习定位技巧', '练习扫读法'],
        '推理判断': ['做5道推理判断题', '分析因果关系', '练习排除法'],
        '同义替换': ['背20个同义替换词组', '做10道同义替换题', '整理易混词汇'],
        '主旨归纳': ['做3篇主旨大意题', '练习段落结构分析', '总结文章框架'],
        '态度判断': ['做5道态度判断题', '积累态度词库', '分析作者观点']
    };
    
    // 听力任务模板
    var listeningTasks = [
        '听力练习：短篇新闻2篇',
        '听力练习：长对话1篇',
        '听力练习：短文理解2篇',
        '听力练习：听力填空10题'
    ];
    
    // 写作翻译任务
    var writingTasks = [
        '背诵1篇范文精彩句型',
        '练习1篇应用文',
        '翻译练习：中译英5句',
        '翻译练习：段落翻译1篇'
    ];
    
    // 生成30天计划
    for (var day = 1; day <= PLAN_DURATION; day++) {
        var dayPlan = {
            day: day,
            tasks: []
        };
        
        // 第1-3天：打基础
        if (day <= 3) {
            dayPlan.tasks.push('背30个核心词汇');
            dayPlan.tasks.push(listeningTasks[(day - 1) % listeningTasks.length]);
            dayPlan.tasks.push('做3道阅读理解题');
            dayPlan.tasks.push('抄写并背诵10个句子');
        }
        // 第4-7天：薄弱强化
        else if (day <= 7) {
            if (weakDims.length > 0) {
                var dimIdx = (day - 4) % weakDims.length;
                var dimName = weakDims[dimIdx].name;
                dayPlan.tasks.push(taskTemplates[dimName][0]);
                dayPlan.tasks.push(taskTemplates[dimName][1]);
            } else {
                dayPlan.tasks.push('词汇复习30个');
            }
            dayPlan.tasks.push(listeningTasks[day % listeningTasks.length]);
            dayPlan.tasks.push('做5道阅读题');
            dayPlan.tasks.push(writingTasks[(day - 4) % writingTasks.length]);
        }
        // 第8-15天：全面提升
        else if (day <= 15) {
            // 每天覆盖2个维度
            var dim1 = weakDims[(day - 8) % weakDims.length].name;
            var dim2 = weakDims[(day - 8 + 1) % weakDims.length].name;
            dayPlan.tasks.push(taskTemplates[dim1][0]);
            dayPlan.tasks.push(taskTemplates[dim2][0]);
            dayPlan.tasks.push(listeningTasks[day % listeningTasks.length]);
            dayPlan.tasks.push('做1篇仔细阅读');
            if (day % 3 === 0) {
                dayPlan.tasks.push(writingTasks[Math.floor(day / 3) % writingTasks.length]);
            }
        }
        // 第16-22天：冲刺巩固
        else if (day <= 22) {
            // 轮转薄弱维度
            var focusDim = weakDims[(day - 16) % weakDims.length].name;
            dayPlan.tasks.push(taskTemplates[focusDim][2]); // 综合练习
            dayPlan.tasks.push('做1套模拟阅读题');
            dayPlan.tasks.push(listeningTasks[(day - 16) % listeningTasks.length]);
            dayPlan.tasks.push('写作练习30分钟');
            if (day % 4 === 0) {
                dayPlan.tasks.push('翻译练习1篇');
            }
        }
        // 第23-30天：考前冲刺
        else {
            dayPlan.tasks.push('全科模拟测试');
            dayPlan.tasks.push('错题复习整理');
            dayPlan.tasks.push('薄弱维度强化训练');
            if (day % 2 === 0) {
                dayPlan.tasks.push('听力强化练习');
            } else {
                dayPlan.tasks.push('写作模板背诵');
            }
        }
        
        plan.days.push(dayPlan);
    }
    
    return plan;
}

// 获取当前计划第几天
function getPlanDayIndex() {
    var data = state.userData || {};
    if (!data.plan_created_at) return 1;
    
    var start = new Date(data.plan_created_at);
    var today = new Date();
    var diff = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
    return Math.min(Math.max(diff, 1), PLAN_DURATION);
}

// 获取今天的日期字符串
function getTodayStr() {
    var now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
}

// 渲染学习计划Tab
function renderPlanTab() {
    var data = state.userData || {};
    var plan = data.study_plan;
    var dayIdx = getPlanDayIndex();
    var hasDiagnosis = data.diagnosis && Object.keys(data.diagnosis).length > 0;
    
    // 更新标题
    var subEl = document.getElementById('plan-page-sub');
    if (subEl) {
        if (plan) {
            subEl.textContent = '已生成' + PLAN_DURATION + '天冲刺计划';
        } else {
            subEl.textContent = '完成诊断后自动生成';
        }
    }
    
    // 获取plan-page-content容器
    var pageContent = document.getElementById('plan-page-content');
    
    // 无诊断数据时显示空状态引导
    if (!hasDiagnosis) {
        if (pageContent) {
            pageContent.innerHTML = `<div class="plan-page-header">
                <h1 class="plan-page-title">学习计划</h1>
                <p class="plan-page-sub">完成诊断后自动生成</p>
            </div>
            
            <div class="plan-guide-card" onclick="switchTab('diagnosis')">
                <div class="plan-guide-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <svg class="plan-guide-pencil" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                    </svg>
                </div>
                <div class="plan-guide-title">开始你的备考计划</div>
                <div class="plan-guide-desc">完成5分钟AI诊断，系统将为你量身定制30天冲刺计划</div>
                <div class="plan-guide-cta">
                    <span>开始诊断</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                    </svg>
                </div>
                <div class="plan-guide-features">
                    <div class="plan-guide-feature">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>AI精准诊断薄弱点</span>
                    </div>
                    <div class="plan-guide-feature">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>个性化学习方案</span>
                    </div>
                    <div class="plan-guide-feature">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>每日任务智能推送</span>
                    </div>
                </div>
            </div>
            
            <div class="plan-guide-disabled-hint">
                <div class="plan-guide-disabled-card">
                    <div class="plan-guide-disabled-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <div class="plan-guide-disabled-text">
                        <div class="plan-guide-disabled-title">每日任务</div>
                        <div class="plan-guide-disabled-desc">完成诊断后解锁</div>
                    </div>
                </div>
                <div class="plan-guide-disabled-card">
                    <div class="plan-guide-disabled-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
                    </div>
                    <div class="plan-guide-disabled-text">
                        <div class="plan-guide-disabled-title">五维能力分析</div>
                        <div class="plan-guide-disabled-desc">完成诊断后解锁</div>
                    </div>
                </div>
                <div class="plan-guide-disabled-card">
                    <div class="plan-guide-disabled-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </div>
                    <div class="plan-guide-disabled-text">
                        <div class="plan-guide-disabled-title">30天冲刺计划</div>
                        <div class="plan-guide-disabled-desc">完成诊断后解锁</div>
                    </div>
                </div>
            </div>
            `;
        }
        return;
    }
    
    // 有诊断数据时，渲染正常内容
    // 渲染雷达图预览
    renderPlanRadarPreview();
    
    // 渲染每日任务
    renderDailyTaskCard();
    
    // 渲染计划列表
    renderPlanList(plan, dayIdx);
}

// 渲染计划雷达图预览
function renderPlanRadarPreview() {
    var canvas = document.getElementById('plan-radar-canvas');
    if (!canvas) return;
    
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var size = 160;
    
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);
    
    var centerX = size / 2;
    var centerY = size / 2;
    var maxRadius = 55;
    
    var dims = Object.keys(DIM_CONFIGS);
    var n = dims.length;
    var angleStep = (Math.PI * 2) / n;
    
    // 获取数据
    var data = state.userData || {};
    var scores = data.diagnosis || data.abilityScores || {};
    
    // 背景网格
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1;
    for (var r = 1; r <= 5; r++) {
        ctx.beginPath();
        for (var i = 0; i <= n; i++) {
            var angle = i * angleStep - Math.PI / 2;
            var x = centerX + Math.cos(angle) * (r * maxRadius / 5);
            var y = centerY + Math.sin(angle) * (r * maxRadius / 5);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
    }
    
    // 数据区域
    var gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    gradient.addColorStop(0, 'rgba(108,92,231,0.3)');
    gradient.addColorStop(1, 'rgba(108,92,231,0.1)');
    
    ctx.beginPath();
    for (var i = 0; i <= n; i++) {
        var idx = i % n;
        var dimName = dims[idx];
        var score = parseInt(scores[dimName]) || 0;
        var r = (score / 100) * maxRadius;
        var angle = i * angleStep - Math.PI / 2;
        var x = centerX + Math.cos(angle) * r;
        var y = centerY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#6C5CE7';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 标签
    ctx.fillStyle = '#64748B';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (var i = 0; i < n; i++) {
        var dimName = dims[i];
        var config = DIM_CONFIGS[dimName] || {};
        var angle = i * angleStep - Math.PI / 2;
        var labelR = maxRadius + 16;
        var x = centerX + Math.cos(angle) * labelR;
        var y = centerY + Math.sin(angle) * labelR;
        
        var score = parseInt(scores[dimName]) || 0;
        ctx.fillText(dimName.substring(0, 3), x, y);
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(score, x, y + 12);
        ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = '#64748B';
    }
}

// 渲染每日任务卡片
function renderDailyTaskCard() {
    var data = state.userData || {};
    var todayDone = data.daily_task_done || false;
    var todayDate = getTodayStr();
    var lastDoneDate = data.daily_task_done_date || '';
    
    // 如果日期变了，重置
    if (lastDoneDate !== todayDate) {
        todayDone = false;
        data.daily_task_done = false;
        data.daily_task_done_date = todayDate;
        state.userData = data;
        saveUserData(data);
    }
    
    // 更新徽章
    var badgeEl = document.getElementById('daily-task-badge');
    var progressEl = document.getElementById('daily-task-progress-bar');
    
    if (badgeEl) {
        if (todayDone) {
            badgeEl.textContent = '4/4';
            badgeEl.style.background = '#D1FAE5';
            badgeEl.style.color = '#059669';
        } else {
            badgeEl.textContent = '0/4';
            badgeEl.style.background = '#F1F5F9';
            badgeEl.style.color = '#475569';
        }
    }
    
    if (progressEl) {
        progressEl.style.width = todayDone ? '100%' : '0%';
    }
    
    // 更新描述
    var descEl = document.getElementById('daily-task-desc');
    if (descEl) {
        if (todayDone) {
            descEl.textContent = '已完成，明日继续加油';
        } else {
            var weakDims = getWeakDims();
            if (weakDims.length > 0) {
                descEl.textContent = weakDims[0] + '强化训练';
            } else {
                descEl.textContent = '综合能力提升训练';
            }
        }
    }
}

// 获取薄弱维度
function getWeakDims() {
    var data = state.userData || {};
    var dims = data.diagnosis || {};
    
    var arr = [];
    for (var key in dims) {
        arr.push({ name: key, score: parseInt(dims[key]) || 0 });
    }
    arr.sort(function(a, b) { return a.score - b.score; });
    
    return arr.filter(function(d) { return d.score < 60; }).map(function(d) { return d.name; });
}

// 渲染计划列表
function renderPlanList(plan, dayIdx) {
    var container = document.getElementById('plan-list');
    if (!container) return;
    
    if (!plan || !plan.days || plan.days.length === 0) {
        container.innerHTML = '<div class="plan-empty">' +
            '<div class="plan-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>' +
            '<div class="plan-empty-text">完成诊断后自动生成学习计划</div>' +
            '<button class="plan-empty-btn" onclick="startNewDiagnosis();">立即诊断</button>' +
            '</div>';
        return;
    }
    
    var html = '';
    var today = getTodayStr();
    var startDate = plan.startDay ? new Date(plan.startDay) : new Date();
    
    for (var i = 0; i < plan.days.length; i++) {
        var dayPlan = plan.days[i];
        var dayDate = new Date(startDate);
        dayDate.setDate(dayDate.getDate() + i);
        var dateStr = (dayDate.getMonth() + 1) + '月' + dayDate.getDate() + '日';
        
        var isCurrent = dayPlan.day === dayIdx;
        var isDone = dayPlan.day < dayIdx;
        
        var statusClass = isDone ? 'done' : 'pending';
        var statusText = isDone ? '已完成' : (isCurrent ? '进行中' : '待开始');
        
        var itemClass = '';
        if (isCurrent) itemClass = 'current';
        if (isDone) itemClass += ' done';
        
        var tasks = dayPlan.tasks.slice(0, 2).join(' · ');
        if (dayPlan.tasks.length > 2) {
            tasks += ' 等' + dayPlan.tasks.length + '项';
        }
        
        html += '<div class="plan-day-item ' + itemClass + '" onclick="openDayPlan(' + dayPlan.day + ')">' +
            '<div class="plan-day-header">' +
            '<div>' +
            '<div class="plan-day-num">Day ' + dayPlan.day + '</div>' +
            '<div class="plan-day-date">' + dateStr + '</div>' +
            '</div>' +
            '<div class="plan-day-status ' + statusClass + '">' + statusText + '</div>' +
            '</div>' +
            '<div class="plan-day-tasks">' + tasks + '</div>' +
            '</div>';
    }
    
    container.innerHTML = html;
}

// 打开某一天的计划详情
function openDayPlan(day) {
    var data = state.userData || {};
    var plan = data.study_plan;
    
    if (!plan || !plan.days) {
        showToast('请先完成诊断获取学习计划');
        return;
    }
    
    var dayPlan = plan.days[day - 1];
    if (!dayPlan) return;
    
    var html = '<div style="padding:20px">' +
        '<div style="font-size:20px;font-weight:700;color:#1E293B;margin-bottom:16px">Day ' + dayPlan.day + ' 学习任务</div>';
    
    dayPlan.tasks.forEach(function(task, idx) {
        html += '<div style="display:flex;align-items:flex-start;gap:10px;padding:12px 0;border-bottom:1px solid #F1F5F9">' +
            '<div style="width:24px;height:24px;background:#F1F5F9;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#64748B;flex-shrink:0">' + (idx + 1) + '</div>' +
            '<div style="font-size:15px;color:#475569;line-height:1.5">' + task + '</div>' +
            '</div>';
    });
    
    html += '<button onclick="closeModal()" style="width:100%;margin-top:20px;padding:14px;background:#6C5CE7;color:white;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer">关闭</button>';
    
    showModal(html);
}

// 重新生成学习计划
function regeneratePlan() {
    var data = state.userData || {};
    var scores = data.diagnosis || {};
    
    if (Object.keys(scores).length === 0) {
        showToast('请先完成诊断');
        startNewDiagnosis();
        return;
    }
    
    var plan = generateStudyPlan(scores);
    data.study_plan = plan;
    data.plan_created_at = new Date().toISOString();
    state.userData = data;
    saveUserData(data);
    
    showToast('学习计划已重新生成');
    renderPlanTab();
}

// ===== 每日任务题库 =====
const DAILY_TASK_QUESTIONS = [
    // 细节定位
    {
        id: 1,
        dim: '细节定位',
        difficulty: 'easy',
        question: 'According to the passage, what is the main cause of climate change?',
        options: ['Natural variations', 'Human activities', 'Solar radiation', 'Volcanic eruptions'],
        correct: 1,
        analysis: '根据文章第二段..."Human activities"是正确答案。文章明确指出人类活动是气候变化的主要原因。'
    },
    {
        id: 2,
        dim: '细节定位',
        difficulty: 'medium',
        question: 'The author mentions all the following EXCEPT _____.',
        options: ['Air pollution', 'Water contamination', 'Soil erosion', 'Deforestation'],
        correct: 2,
        analysis: '文章中提到了空气污染(A)、水污染(B)和森林砍伐(D)，但没有提到土壤侵蚀(C)。'
    },
    {
        id: 3,
        dim: '细节定位',
        difficulty: 'medium',
        question: 'When did the experiment begin?',
        options: ['In 2015', 'In 2018', 'In 2020', 'In 2022'],
        correct: 2,
        analysis: '根据第三段第一句"The experiment began in 2020"，正确答案是在2020年。'
    },
    // 推理判断
    {
        id: 4,
        dim: '推理判断',
        difficulty: 'medium',
        question: 'It can be inferred from the passage that _____.',
        options: ['Young people are more affected by social media', 'Elderly people use less social media', 'Social media has no impact on mental health', 'All generations use social media equally'],
        correct: 0,
        analysis: '根据文章第三段，研究表明年轻人使用社交媒体的时间更长，受到的影响更大。这支持了A选项。'
    },
    {
        id: 5,
        dim: '推理判断',
        difficulty: 'hard',
        question: 'The author\'s attitude toward AI can be described as _____.',
        options: ['Extremely negative', 'Cautiously optimistic', 'Completely indifferent', 'Overly enthusiastic'],
        correct: 1,
        analysis: '文章既提到了AI的优势也提到了潜在风险，最后建议合理使用。这表明作者态度是"谨慎乐观"的。'
    },
    {
        id: 6,
        dim: '推理判断',
        difficulty: 'medium',
        question: 'Which of the following can be concluded from the passage?',
        options: ['Remote work will completely replace office work', 'Remote work has both advantages and disadvantages', 'All companies prefer remote work', 'Remote work reduces productivity'],
        correct: 1,
        analysis: '文章讨论了远程工作的利弊，包括灵活性和可能的沟通问题，因此B是最合适的结论。'
    },
    // 同义替换
    {
        id: 7,
        dim: '同义替换',
        difficulty: 'easy',
        question: 'The phrase "come up with" in the passage is closest in meaning to _____.',
        options: ['Discover', 'Invent', 'Create or think of', 'Find by chance'],
        correct: 2,
        analysis: '"Come up with"意为"想出、提出"，与"Create or think of"同义。'
    },
    {
        id: 8,
        dim: '同义替换',
        difficulty: 'medium',
        question: '"Substantial" in the passage is closest in meaning to _____.',
        options: ['Small', 'Significant', 'Temporary', 'Obvious'],
        correct: 1,
        analysis: '"Substantial"意为"大量的、重要的"，与"Significant"同义。'
    },
    {
        id: 9,
        dim: '同义替换',
        difficulty: 'hard',
        question: 'The word "ubiquitous" in the passage means _____.',
        options: ['Rare', 'Expensive', 'Everywhere', 'Advanced'],
        correct: 2,
        analysis: '"Ubiquitous"是一个高级词汇，意为"无处不在的"，与"Everywhere"同义。'
    },
    // 主旨归纳
    {
        id: 10,
        dim: '主旨归纳',
        difficulty: 'medium',
        question: 'What is the main idea of the passage?',
        options: ['The benefits of exercise', 'How to maintain a healthy lifestyle', 'The relationship between diet and health', 'Tips for improving work efficiency'],
        correct: 2,
        analysis: '文章主要讨论了饮食与健康的各个方面，包括营养、饮食习惯等，C选项最能概括主旨。'
    },
    {
        id: 11,
        dim: '主旨归纳',
        difficulty: 'medium',
        question: 'The passage is primarily about _____.',
        options: ['The history of the internet', 'Cybersecurity threats and solutions', 'How to use social media', 'Online shopping trends'],
        correct: 1,
        analysis: '文章从多个角度讨论了网络安全问题及其解决方案，B选项准确概括了文章主旨。'
    },
    {
        id: 12,
        dim: '主旨归纳',
        difficulty: 'hard',
        question: 'The best title for this passage would be _____.',
        options: ['The Future of Technology', 'Balancing Screen Time in the Digital Age', 'The Benefits of Digital Devices', 'Children and the Internet'],
        correct: 1,
        analysis: '文章讨论了如何在数字时代平衡屏幕使用时间，既有正面也有负面影响，B选项最合适。'
    },
    // 态度判断
    {
        id: 13,
        dim: '态度判断',
        difficulty: 'easy',
        question: 'The author\'s tone in the passage is _____.',
        options: ['Humorous', 'Serious', 'Indifferent', 'Sarcastic'],
        correct: 1,
        analysis: '文章讨论的是严肃的教育话题，使用了正式的语言风格，因此语气是"严肃的"。'
    },
    {
        id: 14,
        dim: '态度判断',
        difficulty: 'medium',
        question: 'How does the author feel about the new policy?',
        options: ['Strongly supportive', 'Critical', 'Neutral and objective', 'Confused'],
        correct: 2,
        analysis: '文章客观地分析了新政策的利弊，没有明显偏向任何一方，体现了中立客观的态度。'
    },
    {
        id: 15,
        dim: '态度判断',
        difficulty: 'hard',
        question: 'The word "advocates" in the passage carries a _____ connotation.',
        options: ['Negative', 'Neutral', 'Positive', 'Sarcastic'],
        correct: 2,
        analysis: '"Advocates"意为"倡导者、支持者"，是一个褒义词，带有积极色彩。'
    },
    // 听力相关（模拟选择题）
    {
        id: 16,
        dim: '听力',
        difficulty: 'easy',
        question: 'Where does this conversation most likely take place?',
        options: ['At a restaurant', 'At a library', 'At a hospital', 'At an airport'],
        correct: 3,
        analysis: '从关键词"flight"、"boarding"、"departure"等可以推断对话发生在机场。'
    },
    {
        id: 17,
        dim: '听力',
        difficulty: 'medium',
        question: 'What is the woman\'s problem?',
        options: ['She lost her wallet', 'She missed her train', 'She forgot her password', 'She can\'t find her phone'],
        correct: 1,
        analysis: '女生提到她错过了火车，要等下一班，这是她的问题所在。'
    },
    {
        id: 18,
        dim: '听力',
        difficulty: 'medium',
        question: 'What does the professor mainly talk about?',
        options: ['The causes of WWI', 'The Treaty of Versailles', 'The economic impact of war', 'Post-war reconstruction'],
        correct: 1,
        analysis: '讲座主要讨论了凡尔赛条约的内容及其对德国的影响，B选项最准确。'
    },
    // 综合练习
    {
        id: 19,
        dim: '细节定位',
        difficulty: 'hard',
        question: 'According to the passage, which country has the highest renewable energy usage?',
        options: ['China', 'Germany', 'United States', 'Japan'],
        correct: 1,
        analysis: '根据第五段，德国的可再生能源使用率最高，达到46%，领先于其他国家。'
    },
    {
        id: 20,
        dim: '推理判断',
        difficulty: 'hard',
        question: 'The author implies that traditional education methods _____.',
        options: ['Are completely outdated', 'Need to be combined with technology', 'Are more effective than online learning', 'Should be abolished'],
        correct: 1,
        analysis: '文章最后一段指出传统教育需要与技术结合，而非完全取代或废除，B选项最符合。'
    }
];

// 每日任务状态
var dailyTaskState = {
    questions: [],
    answers: {},
    submitted: false
};

// 打开每日任务
function openDailyTask() {
    var data = state.userData || {};
    var todayDate = getTodayStr();
    
    // 检查是否已完成
    if (data.daily_task_done && data.daily_task_done_date === todayDate) {
        showToast('今日任务已完成');
        return;
    }
    
    // 根据薄弱维度筛选题目
    var weakDims = getWeakDims();
    var selectedQuestions = [];
    
    if (weakDims.length >= 3) {
        // 选3个薄弱维度的题 + 1个听力
        weakDims.slice(0, 3).forEach(function(dim) {
            var dimQuestions = DAILY_TASK_QUESTIONS.filter(function(q) { return q.dim === dim; });
            if (dimQuestions.length > 0) {
                selectedQuestions.push(dimQuestions[Math.floor(Math.random() * dimQuestions.length)]);
            }
        });
        
        // 添加1道听力
        var listeningQuestions = DAILY_TASK_QUESTIONS.filter(function(q) { return q.dim === '听力'; });
        if (listeningQuestions.length > 0) {
            selectedQuestions.push(listeningQuestions[Math.floor(Math.random() * listeningQuestions.length)]);
        }
    } else {
        // 不足3个薄弱维度，随机选4道
        var shuffled = DAILY_TASK_QUESTIONS.slice().sort(function() { return 0.5 - Math.random(); });
        selectedQuestions = shuffled.slice(0, 4);
    }
    
    dailyTaskState = {
        questions: selectedQuestions,
        answers: {},
        submitted: false
    };
    
    renderDailyTaskModal();
    
    // 显示modal
    var modal = document.getElementById('daily-task-modal');
    if (modal) modal.classList.add('show');
}

// 关闭每日任务Modal
function closeDailyTaskModal() {
    var modal = document.getElementById('daily-task-modal');
    if (modal) modal.classList.remove('show');
}

// 渲染每日任务Modal内容
function renderDailyTaskModal() {
    var questionsEl = document.getElementById('daily-task-questions');
    var actionsEl = document.getElementById('daily-task-actions');
    var doneEl = document.getElementById('daily-task-done');
    
    if (!questionsEl) return;
    
    var html = '';
    
    dailyTaskState.questions.forEach(function(q, idx) {
        var selectedAnswer = dailyTaskState.answers[q.id];
        var letters = ['A', 'B', 'C', 'D'];
        
        var optionClass = function(optIdx) {
            var cls = 'daily-task-option';
            if (dailyTaskState.submitted) {
                if (optIdx === q.correct) cls += ' correct';
                else if (optIdx === selectedAnswer) cls += ' wrong';
            } else if (selectedAnswer === optIdx) {
                cls += ' selected';
            }
            return cls;
        };
        
        html += '<div class="daily-task-question">' +
            '<div class="daily-task-question-num">第' + (idx + 1) + '题 · ' + q.dim + '</div>' +
            '<div class="daily-task-question-text">' + q.question + '</div>' +
            '<div class="daily-task-options">';
        
        q.options.forEach(function(opt, optIdx) {
            html += '<div class="' + optionClass(optIdx) + '" onclick="selectDailyTaskAnswer(' + q.id + ', ' + optIdx + ')">' +
                '<div class="daily-task-option-letter">' + letters[optIdx] + '</div>' +
                '<div class="daily-task-option-text">' + opt + '</div>' +
                '</div>';
        });
        
        html += '</div>';
        
        // 显示解析（如果已提交）
        if (dailyTaskState.submitted && selectedAnswer !== undefined) {
            var isCorrect = selectedAnswer === q.correct;
            html += '<div class="daily-task-analysis">' +
                '<strong>' + (isCorrect ? '✓ 回答正确' : '✗ 回答错误') + '</strong><br>' +
                q.analysis +
                '</div>';
        }
        
        html += '</div>';
    });
    
    questionsEl.innerHTML = html;
    
    // 显示/隐藏按钮
    if (actionsEl) actionsEl.style.display = dailyTaskState.submitted ? 'none' : 'block';
    if (doneEl) doneEl.style.display = 'none';
}

// 选择答案
function selectDailyTaskAnswer(questionId, answerIdx) {
    if (dailyTaskState.submitted) return;
    
    dailyTaskState.answers[questionId] = answerIdx;
    renderDailyTaskModal();
    
    // 检查是否可以提交（至少回答了1题）
    var answeredCount = Object.keys(dailyTaskState.answers).length;
    var actionsEl = document.getElementById('daily-task-actions');
    if (actionsEl) {
        actionsEl.style.display = answeredCount > 0 ? 'block' : 'none';
    }
}

// 提交每日任务
function submitDailyTask() {
    if (dailyTaskState.submitted) return;
    
    var answeredCount = Object.keys(dailyTaskState.answers).length;
    if (answeredCount === 0) {
        showToast('请至少回答一题');
        return;
    }
    
    dailyTaskState.submitted = true;
    renderDailyTaskModal();
    
    // 计算正确数并更新分数
    var correctCount = 0;
    var dimCorrect = {};
    
    dailyTaskState.questions.forEach(function(q) {
        var userAnswer = dailyTaskState.answers[q.id];
        if (userAnswer === q.correct) {
            correctCount++;
            dimCorrect[q.dim] = (dimCorrect[q.dim] || 0) + 1;
        }
    });
    
    // 更新五维分数
    var data = state.userData || {};
    var dims = data.diagnosis || {};
    
    // 答对的维度+4分（满分100，封顶）
    for (var dim in dimCorrect) {
        if (dim !== '听力') { // 听力单独处理
            dims[dim] = Math.min(100, (parseInt(dims[dim]) || 50) + dimCorrect[dim] * 4);
        }
    }
    
    // 听力
    if (dimCorrect['听力']) {
        dims['听力'] = Math.min(100, (parseInt(dims['听力']) || 50) + dimCorrect['听力'] * 4);
    }
    
    data.diagnosis = dims;
    data.daily_task_done = true;
    data.daily_task_done_date = getTodayStr();
    data.daily_task_correct = correctCount;
    
    state.userData = data;
    saveUserData(data);
    
    // 更新任务状态
    var badgeEl = document.getElementById('daily-task-badge');
    var progressEl = document.getElementById('daily-task-progress-bar');
    if (badgeEl) {
        badgeEl.textContent = answeredCount + '/' + dailyTaskState.questions.length;
    }
    if (progressEl) {
        var pct = Math.round((correctCount / dailyTaskState.questions.length) * 100);
        progressEl.style.width = pct + '%';
    }
    
    // 更新描述
    var descEl = document.getElementById('daily-task-desc');
    if (descEl) {
        descEl.textContent = '今日正确率' + Math.round((correctCount / dailyTaskState.questions.length) * 100) + '%';
    }
    
    // 显示完成状态
    var actionsEl = document.getElementById('daily-task-actions');
    var doneEl = document.getElementById('daily-task-done');
    if (actionsEl) actionsEl.style.display = 'none';
    if (doneEl) {
        var descEl2 = document.getElementById('daily-task-done-desc');
        if (descEl2) {
            descEl2.textContent = '答对' + correctCount + '题，' + getWeakDims()[0] + '+4分';
        }
        doneEl.style.display = 'block';
    }
    
    // 刷新雷达图
    setTimeout(function() {
        if (typeof drawDashboardRadar === 'function') {
            var scores = data.diagnosis || {};
            drawDashboardRadar(scores);
        }
        renderPlanTab();
    }, 500);
    
    showToast('分数已更新，继续加油！');
}

// ===== Bot注入历史分数 =====
function getUserScoresForBot() {
    var data = state.userData || {};
    var dims = data.diagnosis || {};
    
    if (Object.keys(dims).length === 0) {
        return '';
    }
    
    var scores = [];
    for (var key in dims) {
        scores.push(key + dims[key]);
    }
    
    return '当前用户五维分数：' + scores.join('、') + '，请根据这些数据个性化指导。';
}

// 修改sendMessage中的contextPrefix
var originalSendMessage = sendMessage;

// 已有的sendMessage中已经有了用户上下文注入，让我添加五维分数

// ===== 学习计划Tab初始化 =====
function initPlanTab() {
    renderPlanTab();
    
    // 如果没有计划，自动生成
    var data = state.userData || {};
    var scores = data.diagnosis || {};
    
    if (Object.keys(scores).length > 0 && !data.study_plan) {
        var plan = generateStudyPlan(scores);
        data.study_plan = plan;
        data.plan_created_at = new Date().toISOString();
        state.userData = data;
        saveUserData(data);
    }
}

// showLearningPlan函数（从菜单触发）
function showLearningPlan() {
    switchTab('plan');
}

// 确保switchTab支持plan tab
var originalSwitchTab = switchTab;
switchTab = function(tab) {
    originalSwitchTab(tab);
    
    if (tab === 'plan') {
        initPlanTab();
    }
};

// 每日任务样式注入
var styleInjected = false;
function injectDailyTaskStyles() {
    if (styleInjected) return;
    styleInjected = true;
    
    var style = document.createElement('style');
    style.textContent = `
        .plan-empty {
            text-align: center;
            padding: 40px 20px;
        }
        .plan-empty-icon {
            width: 60px;
            height: 60px;
            background: #F1F5F9;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
        }
        .plan-empty-icon svg {
            width: 28px;
            height: 28px;
            stroke: #94A3B8;
        }
        .plan-empty-text {
            font-size: 14px;
            color: #64748B;
            margin-bottom: 16px;
        }
        .plan-empty-btn {
            padding: 10px 20px;
            background: linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
        }
    `;
    document.head.appendChild(style);
}

// 在initApp中调用
var originalInitApp = initApp;
initApp = function() {
    originalInitApp();
    injectDailyTaskStyles();
    updateWrongCount();
};





// ====== 专项突破计划系统 ======
var specialPlanState = {
    data: null,
    weakDims: []
};

// 薄弱点对应的学习内容模板
var PLAN_TEMPLATES = {
    '细节定位': {
        'key_points': ['关键词定位技巧', '时间/数字信号词识别', '排除法解题'],
        'practice': ['15道细节定位专项练习', '真题细节题精讲', '信号词速记'],
        'daily_goal': '完成10道细节题，正确率达80%'
    },
    '推理判断': {
        'key_points': ['因果关系推理', '转折词信号识别', '隐含信息提取'],
        'practice': ['10道推理判断练习', '转折词专项训练', '推断题技巧课'],
        'daily_goal': '完成8道推理题，学会从原文推导'
    },
    '同义替换': {
        'key_points': ['高频同义替换词组', '词性变换规律', '意译与直译'],
        'practice': ['20组同义替换速记', '真题替换题专项', '词汇积累法'],
        'daily_goal': '背诵30组核心替换词'
    },
    '主旨归纳': {
        'key_points': ['首尾句法则', '高频词抓取', '文章结构分析'],
        'practice': ['8道主旨大意练习', '段落结构分析', '主题词归纳训练'],
        'daily_goal': '完成6道主旨题，掌握三段式结构'
    },
    '态度判断': {
        'key_points': ['态度词分类汇总', '作者观点识别', '引用vs观点区分'],
        'practice': ['10道态度题专项', '常见态度词表', '观点判断技巧'],
        'daily_goal': '背诵20个态度词，正确率达75%'
    }
};

// 显示专项计划
// 从localStorage加载已保存的专项计划
function loadSavedSpecialPlan() {
    try {
        var saved = localStorage.getItem('cet_special_plan');
        if (saved) {
            var planData = JSON.parse(saved);
            if (planData && planData.dims && planData.data) {
                specialPlanState.weakDims = planData.dims;
                specialPlanState.data = planData.data;
                return true;
            }
        }
    } catch(e) {}
    return false;
}

function showSpecialPlan() {
    // 优先从localStorage加载已有计划
    if (loadSavedSpecialPlan()) {
        // 有已保存的计划，直接显示
        renderSpecialPlanOverlay();
        showSpecialPlanOverlay();
        return;
    }
    
    // 没有已保存的计划，需要生成新计划
    if (!reportData || !reportData.weakDims || reportData.weakDims.length === 0) {
        showToast('请先完成诊断测试');
        return;
    }
    
    // 获取薄弱点
    specialPlanState.weakDims = reportData.weakDims.map(function(w) { return w.name; });
    
    // 生成计划
    specialPlanState.data = generateSpecialPlanData();
    
    // 保存到localStorage
    try {
        localStorage.setItem('cet_special_plan', JSON.stringify({
            dims: specialPlanState.weakDims,
            data: specialPlanState.data,
            createdAt: Date.now()
        }));
    } catch(e) {}
    
    // 渲染并显示
    renderSpecialPlanOverlay();
    showSpecialPlanOverlay();
}

// 显示专项计划overlay的通用函数
function showSpecialPlanOverlay() {
    var overlay = document.getElementById('special-plan-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s';
        requestAnimationFrame(function() {
            overlay.style.opacity = '1';
        });
    }
}

// 生成专项计划数据
function generateSpecialPlanData() {
    var weakDims = specialPlanState.weakDims;
    var plan = {
        title: '你的3日专项突破计划',
        subtitle: '针对薄弱点定制的短期冲刺方案',
        days: []
    };
    
    // 获取每个薄弱点的学习内容
    var dimContents = weakDims.map(function(dim) {
        return PLAN_TEMPLATES[dim] || {
            'key_points': [dim + '技巧训练', '真题专项练习'],
            'practice': ['10道练习', dim + '方法课'],
            'daily_goal': '完成基础训练'
        };
    });
    
    // 分配到3天
    for (var day = 1; day <= 3; day++) {
        var dayPlan = {
            day: day,
            title: 'Day' + day,
            focus: [],
            tasks: [],
            goal: ''
        };
        
        if (day === 1) {
            // Day1: 理论入门
            dimContents.forEach(function(content, i) {
                if (content.key_points && content.key_points[0]) {
                    dayPlan.focus.push({
                        name: weakDims[i],
                        point: content.key_points[0],
                        icon: getDimIcon(weakDims[i])
                    });
                }
            });
            dayPlan.tasks = [
                { type: 'video', text: '各薄弱项入门技巧课（各15分钟）', icon: '🎬' },
                { type: 'practice', text: '每个薄弱项完成3道入门练习', icon: '✏️' },
                { type: 'note', text: '整理个人薄弱点笔记', icon: '📝' }
            ];
            dayPlan.goal = dimContents[0].daily_goal || '完成入门训练';
        } else if (day === 2) {
            // Day2: 强化训练
            dimContents.forEach(function(content, i) {
                if (content.key_points && content.key_points[1]) {
                    dayPlan.focus.push({
                        name: weakDims[i],
                        point: content.key_points[1],
                        icon: getDimIcon(weakDims[i])
                    });
                }
            });
            dayPlan.tasks = [
                { type: 'practice', text: '各薄弱项10道强化练习', icon: '✏️' },
                { type: 'review', text: 'Day1错题复习', icon: '🔄' },
                { type: 'summary', text: '整理技巧要点', icon: '📋' }
            ];
            dayPlan.goal = dimContents[1] ? dimContents[1].daily_goal : '强化薄弱环节';
        } else {
            // Day3: 综合冲刺
            dimContents.forEach(function(content, i) {
                if (content.key_points && content.key_points[2]) {
                    dayPlan.focus.push({
                        name: weakDims[i],
                        point: content.key_points[2],
                        icon: getDimIcon(weakDims[i])
                    });
                }
            });
            dayPlan.tasks = [
                { type: 'test', text: '综合测试（20道）', icon: '📊' },
                { type: 'review', text: '全题型错题回顾', icon: '🔍' },
                { type: 'plan', text: '制定后续学习计划', icon: '🎯' }
            ];
            dayPlan.goal = '综合正确率达到75%以上';
        }
        
        plan.days.push(dayPlan);
    }
    
    return plan;
}

// 获取维度图标
function getDimIcon(dim) {
    var icons = {
        '细节定位': '🔍',
        '推理判断': '🧠',
        '同义替换': '🔄',
        '主旨归纳': '📌',
        '态度判断': '💭'
    };
    return icons[dim] || '📚';
}

// 关闭专项计划
function closeSpecialPlan() {
    var overlay = document.getElementById('special-plan-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(function() {
            overlay.style.display = 'none';
            overlay.style.opacity = '';
        }, 300);
    }
}

// 渲染专项计划overlay
function renderSpecialPlanOverlay() {
    var container = document.getElementById('special-plan-content');
    if (!container) return;
    
    var plan = specialPlanState.data;
    if (!plan) return;
    
    // 检测付费用户
    var isPaid = (state.userData && state.userData.plan && state.userData.plan !== 'free');
    
    var html = '<div class="sp-plan-header">';
    html += '<div class="sp-plan-title">' + plan.title + '</div>';
    html += '<div class="sp-plan-subtitle">' + plan.subtitle + '</div>';
    html += '</div>';
    
    // 渲染每天的计划
    plan.days.forEach(function(day, index) {
        var isLocked = !isPaid && index > 0;
        
        html += '<div class="sp-day-card' + (isLocked ? ' sp-locked' : '') + '">';
        html += '<div class="sp-day-header">';
        html += '<span class="sp-day-badge">' + day.title + '</span>';
        html += '</div>';
        
        if (!isLocked) {
            // 可见的Day
            html += '<div class="sp-day-content">';
            
            // 重点攻克
            html += '<div class="sp-section-title">🎯 重点攻克</div>';
            html += '<div class="sp-focus-list">';
            day.focus.forEach(function(f) {
                html += '<div class="sp-focus-item">';
                html += '<span class="sp-focus-icon">' + f.icon + '</span>';
                html += '<span class="sp-focus-dim">' + f.name + '</span>';
                html += '<span class="sp-focus-point">' + f.point + '</span>';
                html += '</div>';
            });
            html += '</div>';
            
            // 推荐练习
            html += '<div class="sp-section-title">📚 推荐练习</div>';
            html += '<div class="sp-task-list">';
            day.tasks.forEach(function(t) {
                html += '<div class="sp-task-item">';
                html += '<span class="sp-task-icon">' + t.icon + '</span>';
                html += '<span class="sp-task-text">' + t.text + '</span>';
                html += '</div>';
            });
            html += '</div>';
            
            // 今日目标
            html += '<div class="sp-goal-section">';
            html += '<span class="sp-goal-label">🎯 今日目标</span>';
            html += '<span class="sp-goal-text">' + day.goal + '</span>';
            html += '</div>';
            
            html += '</div>';
        } else {
            // 锁定的Day
            html += '<div class="sp-locked-content">';
            html += '<div class="sp-locked-icon">🔒</div>';
            html += '<div class="sp-locked-title">Day' + (index + 1) + ' 已锁定</div>';
            html += '<div class="sp-locked-hint">升级解锁完整计划</div>';
            html += '</div>';
        }
        
        html += '</div>';
    });
    
    // 底部CTA
    if (!isPaid) {
        html += '<div class="sp-upgrade-cta">';
        html += '<div class="sp-upgrade-hint">💡 解锁完整3日计划，获取更多练习</div>';
        html += '<button class="sp-upgrade-btn" onclick="upgradeToUnlockPlan()">';
        html += '升级冲刺营解锁全部 →';
        html += '</button>';
        html += '</div>';
    } else {
        html += '<div class="sp-paid-tip">';
        html += '✅ 您已解锁完整计划，加油冲刺！';
        html += '</div>';
    }
    
    container.innerHTML = html;
}

// 升级解锁计划
function upgradeToUnlockPlan() {
    closeSpecialPlan();
    switchTab('plans');
    setTimeout(function() {
        var sprintCard = document.querySelector('[data-plan="sprint"]');
        if (sprintCard) {
            sprintCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            sprintCard.classList.add('highlight');
            setTimeout(function() { sprintCard.classList.remove('highlight'); }, 2000);
        }
    }, 300);
}


// ==================== 变式训练功能 ====================

var CET4_VARIANT_KEY = 'cet4_variant_history';
var CET4_VARIANT_DAILY_KEY = 'cet4_variant_daily_count';

// 获取变式训练历史
function getVariantHistory() {
    return safeGetItem(CET4_VARIANT_KEY, []);
}

// 获取今日变式训练次数
function getTodayVariantCount() {
    var today = getTodayStr();
    var counts = safeGetItem(CET4_VARIANT_DAILY_KEY, {});
    return counts[today] || 0;
}

// 增加今日变式训练次数
function incrementTodayVariantCount() {
    var today = getTodayStr();
    var counts = safeGetItem(CET4_VARIANT_DAILY_KEY, {});
    counts[today] = (counts[today] || 0) + 1;
    // 只保留最近7天的记录
    var weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    for (var k in counts) {
        if (k < weekAgo) delete counts[k];
    }
    safeSetItem(CET4_VARIANT_DAILY_KEY, counts);
}

// 检查是否可以进行变式训练
function canDoVariantTraining() {
    var plan = (state.userData && state.userData.plan) || 'free';
    if (plan !== 'free') return { allowed: true, remaining: -1 }; // 付费用户不限
    var todayCount = getTodayVariantCount();
    var remaining = Math.max(0, 2 - todayCount);
    return { allowed: remaining > 0, remaining: remaining };
}

// 保存变式训练历史
function saveVariantRecord(questions, originalQuestion) {
    var history = getVariantHistory();
    history.unshift({
        id: 'var_' + Date.now(),
        date: getTodayStr(),
        originalId: originalQuestion.id,
        originalQuestion: originalQuestion.question,
        variants: questions,
        createdAt: Date.now()
    });
    // 只保留最近50条
    while (history.length > 50) history.pop();
    safeSetItem(CET4_VARIANT_KEY, history);
}

// 显示变式训练入口（在错题本页面调用）
function showVariantTrainingButton() {
    var check = canDoVariantTraining();
    var questions = getWrongQuestions();
    
    if (questions.length === 0) {
        showToast('暂无错题可训练');
        return;
    }
    
    if (!check.allowed) {
        showToast('今日变式训练次数已用完，明天恢复');
        return;
    }
    
    // 生成变式题
    generateVariants();
}

// 变式训练核心函数：调用AI生成同考点变式题
async function generateVariants() {
    var questions = getWrongQuestions();
    if (questions.length === 0) {
        showToast('暂无错题');
        return;
    }
    
    // 选择最近3道错题作为变式训练素材
    var recentWrong = questions.slice(0, Math.min(3, questions.length));
    
    // 显示加载状态
    showVariantLoading();
    
    // 构建AI prompt
    var dimLabels = {
        '细节定位': '细节定位（能在原文中找到明确答案的题目）',
        '推理判断': '推理判断（需要根据原文信息进行逻辑推理的题目）',
        '同义替换': '同义替换（考察近义词、反义词、同义表达的题目）',
        '主旨归纳': '主旨归纳（需要概括文章大意或段落主旨的题目）',
        '态度判断': '态度判断（判断作者或文中人物态度、观点的题目）'
    };
    
    var dim = recentWrong[0].type || '阅读';
    var dimDesc = dimLabels[dim] || dim;
    
    var prompt = '【变式训练生成器】\n\n请根据以下错题，生成2道同考点但不同语境的变式题。\n\n【考点类型】' + dimDesc + '\n\n【原题示例】\n' + recentWrong.map(function(q, i) {
        return (i+1) + '. ' + q.question + '\n   A. ' + q.optionA + '\n   B. ' + q.optionB + '\n   C. ' + q.optionC + '\n   D. ' + q.optionD + '\n   正确答案：' + q.answer;
    }).join('\n\n') + '\n\n【生成要求】\n1. 保持相同考点类型' + dimDesc + '\n2. 难度与原题一致\n3. 换用不同的语境和话题（避免与原题过于相似）\n4. 选项设置要有区分度\n\n【输出格式】严格按以下JSON格式输出，不要添加任何解释：\n[{"question":"题干内容","options":["A选项","B选项","C选项","D选项"],"answer":"B","explanation":"解析内容","difficulty":"Medium"}]\n\n只输出JSON，不要任何其他文字。';
    
    try {
        var userId = (state.userData && state.userData.uid) || 'user_' + Date.now();
        var plan = (state.userData && state.userData.plan) || 'free';
        
        // 使用DeepSeek API
        var response = await fetch('/api/deepseek/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                messages: [{ role: 'user', content: prompt }],
                stream: false,
                plan_token: (state.userData && state.userData.planToken) || '',
                plan_order_id: (state.userData && state.userData.planOrderId) || ''
            })
        });
        
        var result = await response.json();
        var content = '';
        
        if (result.data && result.data.content) {
            content = result.data.content;
        } else if (result.choices && result.choices[0] && result.choices[0].message) {
            content = result.choices[0].message.content;
        } else if (result.content) {
            content = result.content;
        } else if (typeof result === 'string') {
            content = result;
        }
        
        // 解析JSON
        var variants = parseVariantResponse(content);
        
        if (variants && variants.length > 0) {
            // 保存记录
            saveVariantRecord(variants, recentWrong[0]);
            incrementTodayVariantCount();
            
            // 显示变式训练界面
            showVariantTrainingUI(variants, recentWrong[0]);
        } else {
            showToast('生成变式题失败，请重试');
            hideVariantLoading();
        }
    } catch(e) {
        console.error('生成变式题失败:', e);
        showToast('生成变式题失败，请重试');
        hideVariantLoading();
    }
}

// 解析AI返回的JSON
function parseVariantResponse(content) {
    try {
        // 尝试提取JSON数组
        var jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            var parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map(function(item) {
                    return {
                        question: item.question || '',
                        optionA: item.options && item.options[0] || '',
                        optionB: item.options && item.options[1] || '',
                        optionC: item.options && item.options[2] || '',
                        optionD: item.options && item.options[3] || '',
                        answer: item.answer || '',
                        explanation: item.explanation || '暂无解析',
                        difficulty: item.difficulty || 'Medium'
                    };
                });
            }
        }
    } catch(e) {
        console.error('解析变式题JSON失败:', e);
    }
    return null;
}

// 显示加载状态
function showVariantLoading() {
    var overlay = document.getElementById('variant-overlay');
    if (!overlay) {
        createVariantOverlay();
        overlay = document.getElementById('variant-overlay');
    }
    
    overlay.innerHTML = '<div class="variant-loading">' +
        '<div class="wb-variant-loading-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></div>' +
        '<div class="wb-variant-loading-text">AI正在生成变式题...</div>' +
        '<div class="wb-variant-loading-dots"><span></span><span></span><span></span></div>' +
        '</div>';
    overlay.style.display = 'flex';
}

function hideVariantLoading() {
    var overlay = document.getElementById('variant-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// 创建变式训练弹窗DOM
function createVariantOverlay() {
    var overlay = document.createElement('div');
    overlay.id = 'variant-overlay';
    overlay.className = 'wb-variant-overlay';
    document.body.appendChild(overlay);
}

// 显示变式训练界面
function showVariantTrainingUI(variants, originalQuestion) {
    var overlay = document.getElementById('variant-overlay');
    if (!overlay) {
        createVariantOverlay();
        overlay = document.getElementById('variant-overlay');
    }
    
    var currentIndex = 0;
    var userAnswers = {};
    var completed = false;
    
    renderVariantQuestion();
    
    function renderVariantQuestion() {
        var q = variants[currentIndex];
        var answered = userAnswers[currentIndex] !== undefined;
        
        var html = '<div class="wb-variant-modal">' +
            '<div class="wb-variant-header">' +
            '<div class="wb-variant-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>变式训练</div>' +
            '<div class="wb-variant-progress">' +
            '<span class="wb-variant-current">' + (currentIndex + 1) + '</span>/' + variants.length +
            '</div>' +
            '<button class="wb-variant-close" onclick="closeVariantTraining()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M6 18L18 6M6 6l12 12"/></svg></button>' +
            '</div>' +
            
            '<div class="wb-variant-origin">' +
            '<div class="wb-variant-origin-label">同考点训练 · ' + (originalQuestion.type || '阅读') + '</div>' +
            '<div class="wb-variant-origin-text">' + escapeHtml(originalQuestion.question.substring(0, 50)) + '...</div>' +
            '</div>' +
            
            '<div class="wb-variant-question">' +
            '<div class="wb-variant-q-text">' + escapeHtml(q.question) + '</div>' +
            
            '<div class="wb-variant-options">' +
            ['A', 'B', 'C', 'D'].map(function(key, i) {
                var opt = q['option' + key];
                if (!opt) return '';
                var selected = userAnswers[currentIndex] === key;
                var correct = answered && key === q.answer;
                var wrong = answered && selected && key !== q.answer;
                var cls = selected ? 'selected' : (answered ? '' : '');
                if (correct) cls = 'correct';
                if (wrong) cls = 'wrong';
                return '<div class="wb-variant-opt ' + cls + '" onclick="selectVariantOption(\'' + key + '\')">' +
                    '<span class="wb-variant-opt-key">' + key + '</span>' +
                    '<span class="wb-variant-opt-text">' + escapeHtml(opt) + '</span>' +
                    '</div>';
            }).join('') +
            '</div>' +
            '</div>';
        
        if (answered) {
            html += '<div class="wb-variant-exp">' +
                '<div class="wb-variant-exp-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>解析</div>' +
                '<div class="wb-variant-exp-content">' + escapeHtml(q.explanation) + '</div>' +
                '</div>';
        }
        
        // 底部按钮
        html += '<div class="wb-variant-footer">';
        if (!answered) {
            html += '<button class="wb-variant-btn primary" onclick="confirmVariantAnswer()">确认答案</button>';
        } else {
            if (currentIndex < variants.length - 1) {
                html += '<button class="wb-variant-btn primary" onclick="nextVariantQuestion()">下一题<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;margin-left:4px"><path d="M9 5l7 7-7 7"/></svg></button>';
            } else {
                html += '<button class="wb-variant-btn primary" onclick="finishVariantTraining()">查看结果</button>';
            }
        }
        html += '</div>';
        
        html += '</div>';
        
        overlay.innerHTML = html;
        overlay.style.display = 'flex';
        
        // 动画
        overlay.style.opacity = '0';
        setTimeout(function() { overlay.style.opacity = '1'; }, 10);
    }
    
    // 暴露给全局
    window.selectVariantOption = function(key) {
        if (completed) return;
        userAnswers[currentIndex] = key;
        renderVariantQuestion();
    };
    
    window.confirmVariantAnswer = function() {
        if (completed) return;
        // 触发动态评分
        var q = variants[currentIndex];
        var isCorrect = userAnswers[currentIndex] === q.answer;
        var dim = mapTypeToDim(originalQuestion.type || '阅读');
        updateDynamicScore(dim, isCorrect, getDifficultyScore(q.difficulty));
        renderVariantQuestion();
    };
    
    window.nextVariantQuestion = function() {
        currentIndex++;
        renderVariantQuestion();
    };
    
    window.finishVariantTraining = function() {
        completed = true;
        var correct = 0;
        variants.forEach(function(q, i) {
            if (userAnswers[i] === q.answer) correct++;
        });
        
        overlay.innerHTML = '<div class="wb-variant-modal wb-variant-result">' +
            '<div class="wb-variant-result-icon">' + (correct === variants.length ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:64px;height:64px;color:#10B981"><path d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:64px;height:64px;color:#6C5CE7"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>') + '</div>' +
            '<div class="wb-variant-result-title">变式训练完成</div>' +
            '<div class="wb-variant-result-score">' + correct + '/' + variants.length + ' 正确</div>' +
            '<div class="wb-variant-result-rate">' + Math.round(correct / variants.length * 100) + '%正确率</div>' +
            '<div class="wb-variant-result-tip">五维分数已更新，继续加油！</div>' +
            '<button class="wb-variant-btn primary" onclick="closeVariantTraining()">完成</button>' +
            '</div>';
    };
    
    window.closeVariantTraining = function() {
        overlay.style.opacity = '0';
        setTimeout(function() {
            overlay.style.display = 'none';
            // 刷新雷达图
            if (typeof drawDashboardRadar === 'function') {
                var scores = getAbilityScores();
                if (scores && scores.dims) {
                    drawDashboardRadar(scores.dims);
                }
            }
        }, 300);
    };
}

// 将题型映射到维度
function mapTypeToDim(type) {
    var map = {
        '词汇': '同义替换',
        '语法': '推理判断',
        '阅读': '细节定位',
        '听力': '推理判断'
    };
    return map[type] || '细节定位';
}


// ==================== 动态测评功能 ====================

var CET4_DYNAMIC_SCORES_KEY = 'cet4_dynamic_scores';

// 获取动态分数
function getDynamicScores() {
    try {
        var data = localStorage.getItem(CET4_DYNAMIC_SCORES_KEY);
        if (data) {
            return JSON.parse(data);
        }
    } catch(e) {}
    return null;
}

// 保存动态分数
function saveDynamicScores(scores) {
    try {
        localStorage.setItem(CET4_DYNAMIC_SCORES_KEY, JSON.stringify(scores));
    } catch(e) {}
}

// 初始化动态分数（如果不存在）
function initDynamicScores() {
    var existing = getDynamicScores();
    if (existing) return existing;
    
    // 从诊断分数初始化
    var data = state.userData || {};
    var dims = data.diagnosis || {};
    
    var scores = {};
    var defaultDims = ['细节定位', '推理判断', '同义替换', '主旨归纳', '态度判断'];
    
    defaultDims.forEach(function(dim) {
        scores[dim] = {
            value: dims[dim] || 50,
            history: []
        };
    });
    
    saveDynamicScores(scores);
    return scores;
}

// 核心动态评分函数（简化ELO算法）
function updateDynamicScore(dimension, isCorrect, difficulty) {
    // 难度系数：Easy=0.5, Medium=1.0, Hard=1.5
    var diffCoef = difficulty || 1.0;
    
    var scores = getDynamicScores() || initDynamicScores();
    
    if (!scores[dimension]) {
        scores[dimension] = { value: 50, history: [] };
    }
    
    var current = scores[dimension].value;
    var change = 0;
    
    if (isCorrect) {
        // 答对：加分，越接近100加分越少
        // 基础分5-10，难度系数加成
        var maxBonus = 10 * diffCoef;
        var proximityFactor = 1 - (current / 100);
        change = Math.round(maxBonus * proximityFactor);
        change = Math.max(1, Math.min(10, change)); // 最小1，最大10
    } else {
        // 答错：扣分，越接近0扣分越少
        // 基础分8-15，难度系数加成
        var maxPenalty = 15 * diffCoef;
        var proximityFactor = current / 100;
        change = Math.round(maxPenalty * proximityFactor);
        change = Math.max(2, Math.min(15, change)); // 最小2，最大15
        change = -change;
    }
    
    // 更新分数
    var newValue = Math.max(0, Math.min(100, current + change));
    scores[dimension].value = newValue;
    
    // 记录历史
    scores[dimension].history.push({
        date: Date.now(),
        isCorrect: isCorrect,
        change: change,
        newValue: newValue
    });
    
    // 只保留最近100条历史
    if (scores[dimension].history.length > 100) {
        scores[dimension].history = scores[dimension].history.slice(-100);
    }
    
    // 保存
    saveDynamicScores(scores);
    
    // 同步到userData（保持兼容）
    syncToUserData(scores);
    
    // 更新localStorage的cet4_ability_scores
    var abilityScores = {};
    for (var dim in scores) {
        abilityScores[dim] = scores[dim].value;
    }
    try {
        localStorage.setItem('cet4_ability_scores', JSON.stringify({ dims: abilityScores }));
    } catch(e) {}
    
    // 触发雷达图更新（如果函数存在）
    if (typeof drawDashboardRadar === 'function') {
        setTimeout(function() {
            drawDashboardRadar(abilityScores);
        }, 100);
    }
    
    return { dimension: dimension, change: change, newValue: newValue };
}

// 同步到userData
function syncToUserData(scores) {
    var data = state.userData || {};
    if (!data.diagnosis) data.diagnosis = {};
    
    for (var dim in scores) {
        data.diagnosis[dim] = scores[dim].value;
    }
    
    state.userData = data;
    saveUserData(data);
}

// 获取难度分数
function getDifficultyScore(difficulty) {
    var map = { 'Easy': 0.5, 'Medium': 1.0, 'Hard': 1.5 };
    return map[difficulty] || 1.0;
}

// 获取薄弱维度（用于推荐练习）
function getWeakDimensions(threshold) {
    threshold = threshold || 60;
    var scores = getDynamicScores() || initDynamicScores();
    var weakDims = [];
    
    for (var dim in scores) {
        if (scores[dim].value < threshold) {
            weakDims.push({
                name: dim,
                value: scores[dim].value,
                priority: threshold - scores[dim].value // 越低优先级越高
            });
        }
    }
    
    // 按优先级排序
    weakDims.sort(function(a, b) { return b.priority - a.priority; });
    
    return weakDims;
}

// 获取练习推荐（优先推荐薄弱维度）
function getRecommendedPractice() {
    var weakDims = getWeakDimensions(60);
    
    if (weakDims.length === 0) {
        return { type: 'balanced', message: '各维度表现均衡，可全面提升' };
    }
    
    var topWeak = weakDims.slice(0, 2);
    var typeMap = {
        '细节定位': '阅读细节题',
        '推理判断': '推理判断题',
        '同义替换': '词汇替换题',
        '主旨归纳': '主旨大意题',
        '态度判断': '态度观点题'
    };
    
    return {
        type: 'focus',
        dims: topWeak,
        message: '建议优先练习：' + topWeak.map(function(d) {
            return typeMap[d.name] || d.name;
        }).join('、')
    };
}


// ==================== 每日任务使用动态评分 ====================

// 重写submitDailyTask函数使用动态评分
var originalSubmitDailyTask = submitDailyTask;

submitDailyTask = function() {
    if (dailyTaskState.submitted) return;
    
    var answeredCount = Object.keys(dailyTaskState.answers).length;
    if (answeredCount === 0) {
        showToast('请至少回答一题');
        return;
    }
    
    dailyTaskState.submitted = true;
    renderDailyTaskModal();
    
    var correctCount = 0;
    var dimResults = {};
    
    dailyTaskState.questions.forEach(function(q) {
        var userAnswer = dailyTaskState.answers[q.id];
        var isCorrect = userAnswer === q.correct;
        if (isCorrect) correctCount++;
        
        // 使用动态评分
        var dim = mapTypeToDim(q.type || '阅读');
        var result = updateDynamicScore(dim, isCorrect, getDifficultyScore(q.difficulty || 'Medium'));
        
        dimResults[dim] = dimResults[dim] || { correct: 0, total: 0, improved: false };
        dimResults[dim].total++;
        if (isCorrect) dimResults[dim].correct++;
    });
    
    // 更新任务状态
    var badgeEl = document.getElementById('daily-task-badge');
    var progressEl = document.getElementById('daily-task-progress-bar');
    if (badgeEl) {
        badgeEl.textContent = answeredCount + '/' + dailyTaskState.questions.length;
    }
    if (progressEl) {
        var pct = Math.round((correctCount / dailyTaskState.questions.length) * 100);
        progressEl.style.width = pct + '%';
    }
    
    // 更新描述
    var descEl = document.getElementById('daily-task-desc');
    if (descEl) {
        descEl.textContent = '今日正确率' + Math.round((correctCount / dailyTaskState.questions.length) * 100) + '%';
    }
    
    // 显示完成状态
    var actionsEl = document.getElementById('daily-task-actions');
    var doneEl = document.getElementById('daily-task-done');
    if (actionsEl) actionsEl.style.display = 'none';
    if (doneEl) {
        var descEl2 = document.getElementById('daily-task-done-desc');
        if (descEl2) {
            // 找出提升最大的维度
            var bestDim = '';
            var bestChange = 0;
            for (var dim in dimResults) {
                if (dim !== '听力') {
                    var ds = getDynamicScores();
                    if (ds && ds[dim] && ds[dim].history.length > 0) {
                        var last = ds[dim].history[ds[dim].history.length - 1];
                        if (last && last.change > bestChange) {
                            bestChange = last.change;
                            bestDim = dim;
                        }
                    }
                }
            }
            if (bestDim && bestChange > 0) {
                descEl2.textContent = '答对' + correctCount + '题，' + bestDim + '+' + bestChange + '分';
            } else {
                descEl2.textContent = '答对' + correctCount + '题，继续加油！';
            }
        }
        doneEl.style.display = 'block';
    }
    
    // 刷新雷达图
    setTimeout(function() {
        if (typeof drawDashboardRadar === 'function') {
            var ds = getDynamicScores();
            if (ds) {
                var dims = {};
                for (var k in ds) dims[k] = ds[k].value;
                drawDashboardRadar(dims);
            }
        }
        renderPlanTab();
    }, 500);
    
    showToast('分数已更新，继续加油！');
};


// ==================== 在错题本页面添加变式训练按钮 ====================

// 在错题本统计区后添加变式训练入口
var originalRenderWrongBook = renderWrongBook;

renderWrongBook = function() {
    originalRenderWrongBook();
    
    // 添加变式训练按钮
    var container = document.getElementById('wrongbook-content');
    if (!container) return;
    
    var questions = getWrongQuestions();
    if (questions.length === 0) return;
    
    var check = canDoVariantTraining();
    var remaining = check.remaining;
    
    // 创建变式训练入口卡片
    var variantCard = document.createElement('div');
    variantCard.className = 'wb-variant-card';
    variantCard.onclick = function() { showVariantTrainingButton(); };
    
    var html = '<div class="wb-variant-icon">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>' +
        '</div>' +
        '<div class="wb-variant-content">' +
        '<div class="wb-variant-title">变式训练</div>' +
        '<div class="wb-variant-desc">AI生成同考点变式题，举一反三</div>' +
        '</div>' +
        '<div class="wb-variant-count">';
    
    if (remaining > 0) {
        html += '<span class="wb-variant-badge">今日' + remaining + '次</span>';
    } else if (check.allowed) {
        html += '<span class="wb-variant-badge unlimited">不限次数</span>';
    } else {
        html += '<span class="wb-variant-badge used">已用完</span>';
    }
    
    html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M9 5l7 7-7 7"/></svg></div>';
    variantCard.innerHTML = html;
    
    // 插入到统计区后
    var statsEl = container.querySelector('.wb-stats');
    if (statsEl) {
        statsEl.parentNode.insertBefore(variantCard, statsEl.nextSibling);
    }
};

// ===== 学习路径可视化 =====

// 考点树数据结构
var CET_PATH_TREE = {
    name: '四级备考',
    icon: '📚',
    children: [
        {
            name: '阅读',
            icon: '📖',
            children: [
                {
                    name: '细节定位',
                    scoreKey: '细节定位',
                    desc: '在原文中准确定位题目所对应的信息点，包括时间、地点、人物、数字等具体细节',
                    tips: ['先读题干划关键词', '回原文定位同义替换', '注意时间顺序和因果关系', '排除绝对化表述'],
                    children: [
                        { name: '关键词定位', desc: '通过题干关键词快速定位原文' },
                        { name: '同义替换定位', desc: '识别题干与原文的同义改写' },
                        { name: '数字时间定位', desc: '关注数字、年份等时间信息' }
                    ]
                },
                {
                    name: '推理判断',
                    scoreKey: '推理判断',
                    desc: '根据文章内容进行合理推断，包括因果推理、态度推断和主旨推理',
                    tips: ['区分事实与观点', '注意作者的言外之意', '警惕过度推理', '紧扣原文信息'],
                    children: [
                        { name: '因果推理', desc: '根据原因推断结果或根据结果推断原因' },
                        { name: '态度推断', desc: '推断文中人物或作者的态度倾向' },
                        { name: '主旨推理', desc: '通过细节推断段落或文章主旨' }
                    ]
                },
                {
                    name: '同义替换',
                    scoreKey: '同义替换',
                    desc: '识别题目与原文在表达上的同义改写，包括词汇替换和句式转换',
                    tips: ['积累高频同义替换词', '注意词性转换', '关注句式结构变化', '练习快速识别能力'],
                    children: [
                        { name: '词汇替换', desc: '同义词、近义词的替换' },
                        { name: '句式转换', desc: '主动被动、肯定否定等句式变化' }
                    ]
                },
                {
                    name: '主旨归纳',
                    scoreKey: '主旨归纳',
                    desc: '概括段落或文章的主要意思，包括段落主旨和全文主旨',
                    tips: ['关注首尾句', '注意高频出现的词', '排除细节干扰', '把握文章整体结构'],
                    children: [
                        { name: '段落主旨', desc: '概括单个段落的核心内容' },
                        { name: '全文主旨', desc: '把握整篇文章的中心思想' }
                    ]
                },
                {
                    name: '态度判断',
                    scoreKey: '态度判断',
                    desc: '判断作者或文中人物的态度倾向，包括积极、消极、中立等',
                    tips: ['关注情感词', '注意语气强度', '识别观点引用', '区分主观与客观'],
                    children: [
                        { name: '作者态度', desc: '判断文章作者对事件的态度' },
                        { name: '观点倾向', desc: '识别文中人物的观点和立场' }
                    ]
                }
            ]
        },
        {
            name: '听力',
            icon: '🎧',
            children: [
                {
                    name: '关键信息捕捉',
                    desc: '在听力过程中快速捕捉关键信息，包括数字、时间、地点、人物等',
                    tips: ['提前预览选项', '做好笔记符号', '注意转折词后信息', '数字要格外留意'],
                    children: [
                        { name: '数字信息捕捉', desc: '练习快速记录数字和日期' },
                        { name: '地点场景识别', desc: '根据对话场景判断地点' },
                        { name: '人物关系推断', desc: '通过对话内容判断人物关系' }
                    ]
                },
                {
                    name: '对话理解',
                    desc: '理解短对话和长对话的含义，把握对话的主旨和细节',
                    tips: ['注意问答对应', '关注建议和请求', '警惕语音陷阱', '培养预判能力'],
                    children: [
                        { name: '短对话技巧', desc: '简短对话的快速理解策略' },
                        { name: '长对话技巧', desc: '长对话的信息整合方法' }
                    ]
                },
                {
                    name: '短文理解',
                    desc: '理解听力短文的主要内容，把握文章结构和重要细节',
                    tips: ['首尾句很关键', '注意重复出现的词', '把握文章逻辑', '做好速记'],
                    children: [
                        { name: '主旨把握', desc: '快速抓住短文中心思想' },
                        { name: '细节记忆', desc: '有效记录关键细节信息' }
                    ]
                }
            ]
        },
        {
            name: '写作',
            icon: '✍️',
            children: [
                {
                    name: '结构框架',
                    desc: '掌握各类作文的基本结构，包括引言、主体和结尾',
                    tips: ['熟记模板句型', '段落要分明', '开头要吸引人', '结尾要有力'],
                    children: [
                        { name: '引言段写法', desc: '如何开头引出主题' },
                        { name: '主体段展开', desc: '主体段落的组织方法' },
                        { name: '结尾段总结', desc: '如何有力收尾' }
                    ]
                },
                {
                    name: '论点展开',
                    desc: '学习如何展开和支撑论点，使文章论证充分',
                    tips: ['论点要明确', '论据要充分', '逻辑要清晰', '例子要贴切'],
                    children: [
                        { name: '因果论证', desc: '通过原因结果展开论述' },
                        { name: '举例论证', desc: '通过具体例子支撑观点' },
                        { name: '对比论证', desc: '通过对比突出论点' }
                    ]
                },
                {
                    name: '语言表达',
                    desc: '提升语言的准确性和多样性，使用恰当的词汇和句式',
                    tips: ['避免重复用词', '使用高级词汇', '句式要多样', '注意语法正确'],
                    children: [
                        { name: '词汇升级', desc: '使用更高级的词汇替换' },
                        { name: '句式多样', desc: '长短句结合，避免单一' },
                        { name: '衔接词使用', desc: '恰当使用过渡连接词' }
                    ]
                }
            ]
        },
        {
            name: '翻译',
            icon: '🌐',
            children: [
                {
                    name: '词汇翻译',
                    desc: '掌握中英文词汇的对应翻译，特别是中国特色词汇',
                    tips: ['积累中国特色词汇', '注意词性转换', '避免生硬翻译', '联系上下文'],
                    children: [
                        { name: '中国文化词汇', desc: '传统文化词汇的英文表达' },
                        { name: '时事热词', desc: '当代热点话题词汇' }
                    ]
                },
                {
                    name: '句式转换',
                    desc: '进行中英文句式的灵活转换',
                    tips: ['注意语序调整', '拆合句子', '注意主被动', '增删要得当'],
                    children: [
                        { name: '主动转被动', desc: '中英文被动表达差异' },
                        { name: '合并拆分句', desc: '长句的处理技巧' }
                    ]
                },
                {
                    name: '文化表达',
                    desc: '准确表达中国文化特色内容',
                    tips: ['理解文化内涵', '意译为主', '必要时加注', '保持简洁'],
                    children: [
                        { name: '传统节日', desc: '传统节日相关翻译' },
                        { name: '文化特色', desc: '中国特有文化表达' }
                    ]
                }
            ]
        },
        {
            name: '词汇',
            icon: '📝',
            children: [
                {
                    name: '核心词汇',
                    desc: '掌握四级考试必备的核心词汇',
                    tips: ['每天定量背诵', '结合例句记忆', '复习艾宾浩斯', '多场景运用'],
                    children: [
                        { name: '高频词汇', desc: '考试中出现频率最高的词汇' },
                        { name: '一词多义', desc: '常见词的不同含义' }
                    ]
                },
                {
                    name: '固定搭配',
                    desc: '掌握常用短语和固定搭配',
                    tips: ['注意介词搭配', '积累词组短语', '区分相似搭配', '语境中记忆'],
                    children: [
                        { name: '动词短语', desc: '常见动词搭配' },
                        { name: '介词短语', desc: '常用介词词组' }
                    ]
                },
                {
                    name: '词根词缀',
                    desc: '通过词根词缀记忆法扩大词汇量',
                    tips: ['认识常见词根', '了解常见词缀', '举一反三', '构建词汇网络'],
                    children: [
                        { name: '常见词根', desc: '高频词根汇总' },
                        { name: '词缀记忆', desc: '前缀后缀的用法' }
                    ]
                }
            ]
        }
    ]
};

// 获取用户能力分数
function getPathAbilityScores() {
    try {
        var data = localStorage.getItem('cet4_ability_scores');
        if (data) {
            var parsed = JSON.parse(data);
            return parsed.dims || {};
        }
    } catch(e) {}
    return {};
}

// 判断用户是否为付费用户
function isPathVipUser() {
    var userData = state.userData || {};
    var plan = userData.plan;
    return plan && plan !== 'free';
}

// 获取节点状态
function getNodeLevel(score) {
    if (score === null || score === undefined || isNaN(score)) return 'none';
    if (score >= 75) return 'master';
    if (score >= 40) return 'weak';
    return 'urgent';
}

// 获取分数显示
function getScoreDisplay(score) {
    if (score === null || score === undefined || isNaN(score)) return '--';
    return Math.round(score);
}

// 渲染学习路径页面
function renderLearningPath() {
    var container = document.getElementById('learning-path-content');
    if (!container) return;
    
    var dims = getPathAbilityScores();
    var isVip = isPathVipUser();
    var tree = CET_PATH_TREE;
    
    // 计算统计数据
    var totalNodes = 0;
    var masteredNodes = 0;
    var treeNodes = tree.children || [];
    
    treeNodes.forEach(function(module) {
        var moduleScore = dims[module.name] !== undefined ? dims[module.name] : null;
        if (moduleScore !== null) {
            totalNodes++;
            if (moduleScore >= 75) masteredNodes++;
        }
        var children = module.children || [];
        children.forEach(function(child) {
            if (child.scoreKey && dims[child.scoreKey] !== undefined) {
                totalNodes++;
                if (dims[child.scoreKey] >= 75) masteredNodes++;
            }
        });
    });
    
    var masterRate = totalNodes > 0 ? Math.round((masteredNodes / totalNodes) * 100) : 0;
    
    // 生成HTML
    var html = '';
    
    // 顶部统计卡片
    html += '<div class="path-stats-card">';
    html += '<div class="path-stats-header">';
    html += '<div class="path-stats-title">📍 学习路径</div>';
    html += '<div class="path-stats-badge">' + (isVip ? '⭐ Pro会员' : '免费版') + '</div>';
    html += '</div>';
    html += '<div class="path-stats-body">';
    html += '<div class="path-stats-main">';
    html += '<div class="path-stats-num">' + masteredNodes + '/' + totalNodes + '</div>';
    html += '<div class="path-stats-label">已掌握考点 / 总考点数</div>';
    html += '</div>';
    html += '<div class="path-stats-ring">';
    html += '<svg viewBox="0 0 100 100">';
    html += '<circle class="path-stats-ring-circle" cx="50" cy="50" r="42" stroke-dasharray="' + (2 * Math.PI * 42) + '" stroke-dashoffset="0"/>';
    html += '<circle class="path-stats-ring-progress" cx="50" cy="50" r="42" stroke-dasharray="' + (2 * Math.PI * 42) + '" stroke-dashoffset="' + (2 * Math.PI * 42 * (1 - masterRate / 100)) + '"/>';
    html += '</svg>';
    html += '<div class="path-stats-percent">' + masterRate + '%</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    
    // 考点树
    html += '<div class="path-tree-container">';
    
    if (Object.keys(dims).length === 0) {
        // 空状态
        html += '<div class="path-empty">';
        html += '<div class="path-empty-icon">🗺️</div>';
        html += '<div class="path-empty-title">还没有学习数据</div>';
        html += '<div class="path-empty-desc">完成能力诊断后，你的学习路径将会生成</div>';
        html += '<button class="path-action-btn" onclick="startNewDiagnosis()">';
        html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
        html += '开始能力诊断';
        html += '</button>';
        html += '</div>';
    } else {
        // 渲染考点树
        treeNodes.forEach(function(module, moduleIdx) {
            var moduleScore = dims[module.name] !== undefined ? dims[module.name] : null;
            var moduleLevel = getNodeLevel(moduleScore);
            
            // 找到最需要提升的子节点
            var weakestChild = null;
            var weakestScore = 100;
            var children = module.children || [];
            children.forEach(function(child) {
                if (child.scoreKey && dims[child.scoreKey] !== undefined && dims[child.scoreKey] < weakestScore) {
                    weakestScore = dims[child.scoreKey];
                    weakestChild = child;
                }
            });
            
            html += '<div class="path-module" data-level="' + moduleLevel + '">';
            html += '<div class="path-module-header" onclick="toggleModule(this)">';
            html += '<div class="path-module-icon">' + module.icon + '</div>';
            html += '<div class="path-module-info">';
            html += '<div class="path-module-name">' + module.name + '</div>';
            html += '<div class="path-module-sub">' + (children.length) + '个考点</div>';
            html += '</div>';
            html += '<div class="path-module-score">';
            html += '<div class="path-module-score-num">' + getScoreDisplay(moduleScore) + '</div>';
            html += '<div class="path-module-score-label">掌握度</div>';
            html += '</div>';
            html += '<div class="path-module-toggle">';
            html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
            html += '</div>';
            html += '</div>';
            
            html += '<div class="path-children">';
            children.forEach(function(child, childIdx) {
                var childScore = child.scoreKey ? dims[child.scoreKey] : moduleScore;
                var childLevel = getNodeLevel(childScore);
                var isRecommended = weakestChild && child.name === weakestChild.name;
                
                html += '<div class="path-node' + (isRecommended ? ' recommended' : '') + '">';
                html += '<div class="path-node-header" onclick="showNodeDetail(\'' + escapeHtml(module.name) + '\', \'' + escapeHtml(child.name) + '\')">';
                html += '<div class="path-node-dot ' + childLevel + '"></div>';
                html += '<div class="path-node-name">' + child.name + '</div>';
                html += '<div class="path-node-score ' + childLevel + '">' + getScoreDisplay(childScore) + '</div>';
                html += '<div class="path-node-arrow">';
                html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
                html += '</div>';
                html += '</div>';
                
                // 三级节点
                var subChildren = child.children || [];
                if (subChildren.length > 0) {
                    html += '<div class="path-subnodes">';
                    subChildren.forEach(function(sub) {
                        var isLocked = !isVip;
                        html += '<div class="path-subnode' + (isLocked ? ' locked' : '') + '" onclick="event.stopPropagation();' + (isLocked ? 'showVipTip()' : 'showNodeDetail(\'' + escapeHtml(module.name) + '\', \'' + escapeHtml(child.name) + '\', \'' + escapeHtml(sub.name) + '\')') + '">';
                        html += '<div class="path-subnode-dot ' + childLevel + '"></div>';
                        html += '<div class="path-subnode-name">' + sub.name + '</div>';
                        html += '<div class="path-subnode-score ' + childLevel + '">' + getScoreDisplay(childScore) + '</div>';
                        html += '</div>';
                    });
                    html += '</div>';
                }
                
                html += '</div>';
            });
            html += '</div>';
            html += '</div>';
        });
    }
    
    html += '</div>';
    
    // VIP提示（免费用户）
    if (!isVip && Object.keys(dims).length > 0) {
        html += '<div class="path-vip-tip">';
        html += '<div class="path-vip-tip-icon">👑</div>';
        html += '<div class="path-vip-tip-text">解锁全部考点详情</div>';
        html += '<div class="path-vip-tip-sub">升级Pro会员查看所有考点并跳转练习</div>';
        html += '</div>';
    }
    
    // 底部提示
    html += '<div class="path-footer-tip">';
    html += '数据来源于你的诊断和练习记录 · ';
    html += '<a href="javascript:void(0)" onclick="switchTab(\"progress\")">查看详情</a>';
    html += '</div>';
    
    container.innerHTML = html;
    
    // 默认展开第一个模块
    setTimeout(function() {
        var firstModule = document.querySelector('.path-module-header');
        if (firstModule) toggleModule(firstModule);
    }, 100);
}

// 展开/折叠模块
function toggleModule(header) {
    var module = header.closest('.path-module');
    module.classList.toggle('expanded');
}

// 显示节点详情弹窗
function showNodeDetail(moduleName, nodeName, subName) {
    var dims = getPathAbilityScores();
    var isVip = isPathVipUser();
    
    // 查找节点数据
    var module = null;
    var node = null;
    var sub = null;
    
    var tree = CET_PATH_TREE;
    for (var i = 0; i < tree.children.length; i++) {
        if (tree.children[i].name === moduleName) {
            module = tree.children[i];
            for (var j = 0; j < module.children.length; j++) {
                if (module.children[j].name === nodeName) {
                    node = module.children[j];
                    if (subName) {
                        for (var k = 0; k < node.children.length; k++) {
                            if (node.children[k].name === subName) {
                                sub = node.children[k];
                                break;
                            }
                        }
                    }
                    break;
                }
            }
            break;
        }
    }
    
    if (!node) return;
    
    var targetDesc = sub ? sub.desc : node.desc;
    var targetTips = node.tips || [];
    var targetScore = node.scoreKey ? dims[node.scoreKey] : dims[moduleName];
    var targetLevel = getNodeLevel(targetScore);
    
    // 创建弹窗
    var modal = document.createElement('div');
    modal.className = 'path-node-modal active';
    modal.id = 'path-node-modal';
    modal.onclick = function(e) {
        if (e.target === modal) closeNodeModal();
    };
    
    var levelText = { master: '已掌握', weak: '薄弱', urgent: '亟需提升', none: '未测评' };
    var levelColor = { master: '#00B894', weak: '#F39C12', urgent: '#D63031', none: '#94A3B8' };
    
    modal.innerHTML = '<div class="path-node-sheet">' +
        '<div class="path-node-sheet-handle"></div>' +
        '<div class="path-node-sheet-header">' +
            '<div class="path-node-sheet-title">' + (sub ? subName + ' · ' : '') + nodeName + '</div>' +
            '<div class="path-node-sheet-desc">' + targetDesc + '</div>' +
        '</div>' +
        '<div class="path-node-sheet-content">' +
            '<div class="path-node-sheet-section">' +
                '<div class="path-node-sheet-section-title">掌握度</div>' +
                '<div class="path-mastery-bar">' +
                    '<div class="path-mastery-progress ' + targetLevel + '" style="width: ' + (targetScore || 0) + '%"></div>' +
                '</div>' +
                '<div class="path-mastery-labels">' +
                    '<span style="color:' + levelColor[targetLevel] + '">' + levelText[targetLevel] + '</span>' +
                    '<span>' + getScoreDisplay(targetScore) + '分</span>' +
                '</div>' +
            '</div>' +
            '<div class="path-node-sheet-section">' +
                '<div class="path-node-sheet-section-title">练习建议</div>' +
                '<div class="path-tips">' +
                    targetTips.map(function(tip) {
                        return '<div class="path-tip-item">' +
                            '<div class="path-tip-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>' +
                            '<div class="path-tip-text">' + tip + '</div>' +
                        '</div>';
                    }).join('') +
                '</div>' +
            '</div>';
    
    if (isVip) {
        modal.innerHTML += '<button class="path-action-btn" onclick="startPathPractice(\'' + escapeHtml(moduleName) + '\', \'' + escapeHtml(nodeName) + '\')">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>' +
            '开始练习' +
        '</button>';
    } else {
        modal.innerHTML += '<div class="path-vip-tip">' +
            '<div class="path-vip-tip-icon">👑</div>' +
            '<div class="path-vip-tip-text">升级Pro解锁练习功能</div>' +
            '<div class="path-vip-tip-sub">专属练习+详细解析</div>' +
        '</div>';
    }
    
    modal.innerHTML += '</div></div>';
    
    document.body.appendChild(modal);
}

// 关闭节点详情弹窗
function closeNodeModal() {
    var modal = document.getElementById('path-node-modal');
    if (modal) modal.remove();
}

// 显示VIP提示
function showVipTip() {
    showToast('👑 升级Pro会员解锁全部考点');
}

// 开始路径练习
function startPathPractice(moduleName, nodeName) {
    closeNodeModal();
    // 切换到练习tab并开始相关练习
    switchTab('diagnosis');
    setTimeout(function() {
        showNewChatModal();
    }, 300);
}

// 辅助函数：转义HTML
function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
