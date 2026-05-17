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
            var overlay = document.getElementById('diag-history-overlay');
            if (!overlay) {
                // 创建诊断记录页面
                createDiagHistoryOverlay();
                overlay = document.getElementById('diag-history-overlay');
            }
            renderDiagnosisHistoryPage();
            overlay.style.display = 'flex';
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.3s';
            requestAnimationFrame(function() {
                overlay.style.opacity = '1';
            });
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
            var examDate = new Date('2026-06-14T09:00:00');
            var now = new Date();
            var diffMs = examDate - now;
            var diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            var diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            
            var text = document.getElementById('countdown-text');
            if (text) {
                if (diffDays > 0) {
                    text.textContent = diffHours > 0 ? diffDays + '天' + diffHours + '时' : diffDays + '天';
                } else {
                    text.textContent = diffHours > 0 ? diffHours + '小时' : '即将到来';
                }
            }
            var homeCd = document.getElementById('home-countdown');
            if (homeCd) {
                homeCd.textContent = diffDays > 0 ? diffHours > 0 ? '距四级 ' + diffDays + '天' + diffHours + '时' : '距四级 ' + diffDays + '天' : '四级加油';
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
        
        function renderWrongBook() {
            var container = document.getElementById('wrongbook-content');
            if (!container) return;
            
            var questions = getWrongQuestions();
            var stats = getWrongQuestionStats();
            
            if (wrongbookFilterType !== '全部') {
                questions = questions.filter(function(q) { return q.type === wrongbookFilterType; });
            }
            
            var html = '';
            
            // Hero区域
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
                html += '</div>';
            }
            
            // 底部间距
            html += '<div class="wrongbook-bottom-spacer"></div>';
            
            container.innerHTML = html;
        }
        
        
