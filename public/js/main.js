        var personalities = [
                { type:'佛系随缘选手', color:'#F5C6AA', emoji:'😌', img:'imgs/foxi.webp', honor:'佛系陪跑员', comment:'你很佛系，但四级不佛', scores:{"细节定位":95,"推理判断":33,"同义替换":66,"主旨归纳":77,"态度判断":93} },
                { type:'脑补大师', color:'#C4A8E0', emoji:'💭', img:'imgs/naobu.webp', honor:'四级白日梦家', comment:'笔在卷子上，魂在银河系', scores:{"细节定位":40,"推理判断":75,"同义替换":50,"主旨归纳":30,"态度判断":60} },
                { type:'偏科大佬', color:'#FFB6C1', emoji:'📚', img:'imgs/pianke.webp', honor:'阅读王者·翻译菜鸡', comment:'一半封神，一半白给', scores:{"细节定位":98,"推理判断":20,"同义替换":95,"主旨归纳":99,"态度判断":25} },
                { type:'摆烂冠军', color:'#A8C4D8', emoji:'🛋️', img:'imgs/bailan.webp', honor:'四级陪跑一级选手', comment:'重在参与，随缘就好', scores:{"细节定位":10,"推理判断":15,"同义替换":5,"主旨归纳":20,"态度判断":80} },
                { type:'全对卷王', color:'#E8E8E8', emoji:'🏆', img:'imgs/juanzong.webp', honor:'四级人形标准答案', comment:'别人考四级，你考四级解析', scores:{"细节定位":100,"推理判断":98,"同义替换":100,"主旨归纳":100,"态度判断":95} },
                { type:'吗喽型选手', color:'#C4956A', emoji:'🐒', img:'imgs/malou.webp', honor:'熬夜硬肝特种兵', comment:'咖啡续着命，单词记不住', scores:{"细节定位":35,"推理判断":40,"同义替换":25,"主旨归纳":30,"态度判断":20} },
                { type:'临时抱佛脚选手', color:'#FFA500', emoji:'🙏', img:'imgs/linshi.webp', honor:'考前突击大师', comment:'平时不烧香，考前抱佛脚', scores:{"细节定位":60,"推理判断":55,"同义替换":70,"主旨归纳":65,"态度判断":50} },
                { type:'资料囤积狂', color:'#4A7C8C', emoji:'📦', img:'imgs/tunji.webp', honor:'四级资料收藏家', comment:'收藏=学会，囤满=稳过', scores:{"细节定位":85,"推理判断":70,"同义替换":80,"主旨归纳":75,"态度判断":60} }
            ];

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

            // 领取链接自动激活：/claim?sprint&code=CET4S-XXXXX-YYYY
            checkClaimUrl();
            
            // 初始化输入框placeholder（免费额度提示）
            updateChatInputPlaceholder();
        }

        function loadUserData() {
            try {
                var data = localStorage.getItem('cet_user');
                if (data) state.userData = JSON.parse(data);
            } catch(e) {}
        }

        function restoreLastState() {
            var lastTab = localStorage.getItem('cet_current_tab');
            var lastChatMode = localStorage.getItem('cet_last_chat_mode');
            // On refresh: always show chat list first, let user pick conversation
            if (lastTab === 'diagnosis') {
                switchTab('diagnosis');
                showChatList();
            }
        }

        function checkClaimUrl() {
            var params = new URLSearchParams(window.location.search);
            var claimCode = params.get('code');
            if (!claimCode) return;

            // 如果已经有套餐了就不重复激活
            if (state.userData && state.userData.plan && state.userData.plan !== 'free') {
                showToast('您已开通' + (state.userData.plan === 'flagship' ? '全程营' : '冲刺营') + '，无需重复激活');
                // 清除URL参数
                window.history.replaceState({}, '', '/');
                return;
            }

            // 自动激活
            fetch('/api/activate-with-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: claimCode.trim() })
            }).then(function(r) { return r.json(); }).then(function(resp) {
                if (resp.success) {
                    state.userData = state.userData || {};
                    state.userData.plan = resp.plan;
                    state.userData.planToken = resp.token;
                    state.userData.planOrderId = resp.orderId;
                    state.userData.planActivatedAt = Date.now();
                    localStorage.setItem('cet_user', JSON.stringify(state.userData));
                    updateProfileStats();
                    updateHomeStatus();
                    showToast('🎉 ' + (resp.plan === 'flagship' ? '全程营' : '冲刺营') + ' 已开通！');
                } else {
                    showToast('激活失败：' + (resp.error || '激活码无效'));
                }
                // 清除URL参数
                window.history.replaceState({}, '', '/');
            }).catch(function(e) {
                showToast('网络错误，请重试');
                window.history.replaceState({}, '', '/');
            });
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
            var diff = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
            var text = document.getElementById('countdown-text');
            if (text) text.textContent = diff > 0 ? '距考试 ' + diff + ' 天' : '考试季';
            var homeCd = document.getElementById('home-countdown');
            if (homeCd) homeCd.textContent = '距考试' + diff + '天';
            // 更新聊天页面倒计时药丸
            var chatCd = document.getElementById('chat-countdown');
            if (chatCd) chatCd.textContent = diff > 0 ? '距考试' + diff + '天' : '考试季';
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
            if (tab === 'diagnosis') {
                // Don't auto-init, let openChat handle it
            }
            if (tab === 'plans') {
                renderBenefits();
            }
            if (tab === 'progress') {
                renderDashboard();
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
            html += '<div class="dashboard-hero-countdown">';
            html += '<span class="dashboard-hero-countdown-dot"></span>';
            html += '距考试 ' + daysToExam + ' 天</div>';
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
            html += '<div class="overview-label">预估分数</div>';
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
            for (var i = 0; i < 7; i++) {
                var dayData = heatmapData[i] || { count: 0, label: '' };
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
            html += '<div class="dashboard-trend-section glass-card">';
            html += '<div class="dashboard-trend-header">';
            html += '<div class="dashboard-trend-title">' + icons.trending + '正确率趋势</div>';
            html += '<div class="dashboard-trend-period"><button class="active">近7天</button></div>';
            html += '</div>';
            html += '<div class="dashboard-trend-canvas-wrap">';
            html += '<canvas id="dashboard-trend-canvas"></canvas>';
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
                var userData = JSON.parse(localStorage.getItem('cet_user') || '{}');
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
                ctx.fillStyle = '#94a3b8';
                ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('暂无练习数据', width / 2, height / 2);
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
                
                // 绘制线条
                ctx.beginPath();
                validPoints.forEach(function(p, i) {
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                });
                ctx.strokeStyle = '#6C5CE7';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // 绘制数据点
                validPoints.forEach(function(p) {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                    ctx.fillStyle = '#6C5CE7';
                    ctx.fill();
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
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
                var userData = JSON.parse(localStorage.getItem('cet_user') || '{}');
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
                var userData = JSON.parse(localStorage.getItem('cet_user') || '{}');
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
            document.getElementById('detail-advice-text').textContent = '测出你的备考人格，获取专属备考方案！';
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
                    ? '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
                    : '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
                var modeTag = modeClass === 'diagnosis' ? '诊断' : '陪练';
                var preview = truncateText(item.lastMsg, 30) || '暂无消息';
                var timeStr = formatChatTime(item.lastMsgTime);
                
                html += '<div class="chat-card' + (isActive ? ' active' : '') + '" onclick="openConversation(\'\' + item.id + \'\')">' +
                    '<div class="chat-card-icon ' + modeClass + '">' + modeIcon + '</div>' +
                    '<div class="chat-card-content">' +
                    '<div class="chat-card-header">' +
                    '<div class="chat-card-title">' + truncateText(item.title, 20) + '</div>' +
                    '<div class="chat-card-tag ' + modeClass + '">' + modeTag + '</div>' +
                    '</div>' +
                    '<div class="chat-card-preview">' + preview + '</div>' +
                    '<div class="chat-card-time">' + timeStr + '</div>' +
                    '</div>' +
                    '<button class="chat-card-delete" onclick="event.stopPropagation();deleteConversation(\'\' + item.id + \'\')">' +
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
                
                html += '<div class="chat-card-doubao' + (isActive ? ' active' : '') + '" onclick="openConversation(\'\' + item.id + \'\')">' +
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
                    '<button class="chat-card-delete-new" onclick="event.stopPropagation();deleteConversation(\'\' + item.id + \'\')">' +
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
            
            // 清空消息显示 - 引导式开场白
            var container = document.getElementById('chat-messages');
            container.innerHTML = '<div class="custom-chat-msg ai">' +
                '<div class="custom-chat-avatar"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>' +
                '<div class="custom-chat-bubble">' +
                '<p>嗨！我是小过学长 👋</p>' +
                '<p style="margin-top:8px">我能帮你这些：</p>' +
                '<p style="margin-top:4px">📋 做个诊断测水平</p>' +
                '<p>💬 陪你刷真题练手</p>' +
                '<p>❌ 复习之前的错题</p>' +
                '<p>📝 批改你的作文</p>' +
                '<p style="margin-top:8px;color:#6C5CE7;font-weight:600">直接说就行！</p>' +
                '<div class="custom-chat-time">刚刚</div>' +
                '</div></div>';
            
            // 更新标题
            document.getElementById('chat-title').textContent = mode === 'diagnosis' ? '小过学长' : 'AI陪练';
            
            // 显示聊天界面，隐藏对话列表
            document.getElementById('chat-list-view').classList.remove('active');
            document.getElementById('chat-page').style.display = 'flex';
            
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
        function openConversation(convId) {
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
            
            // 更新标题
            document.getElementById('chat-title').textContent = mode === 'diagnosis' ? '小过学长' : 'AI陪练';
            
            // 显示聊天界面，隐藏对话列表
            document.getElementById('chat-list-view').classList.remove('active');
            document.getElementById('chat-page').style.display = 'flex';
            
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
                    // 更新最后一条消息
                    list[i].lastMsg = botMsg || userMsg;
                    list[i].lastMsgTime = Date.now();
                    // 自动生成标题（只在第一轮对话时）
                    if (chatState.chatRounds === 1 && userMsg) {
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
            // mode='chat' 表示默认模式：已诊断走陪练，未诊断走诊断
            // mode='diagnosis' 表示明确要诊断，不自动跳转（重新诊断用）
            // mode='companion' 表示明确要陪练
            if (mode === 'chat') {
                mode = hasDiagnosis ? 'companion' : 'diagnosis';
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
            container.innerHTML = '<div class="custom-chat-msg ai">' +
                '<div class="custom-chat-avatar"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>' +
                '<div class="custom-chat-bubble">' +
                '<p>嗨！我是小过学长 👋</p>' +
                '<p style="margin-top:8px">我能帮你这些：</p>' +
                '<p style="margin-top:4px">📋 做个诊断测水平</p>' +
                '<p>💬 陪你刷真题练手</p>' +
                '<p>❌ 复习之前的错题</p>' +
                '<p>📝 批改你的作文</p>' +
                '<p style="margin-top:8px;color:#6C5CE7;font-weight:600">直接说就行！</p>' +
                '<div class="custom-chat-time">刚刚</div>' +
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
            document.getElementById('chat-list-view').classList.remove('active');
            document.getElementById('chat-page').style.display = 'flex';
            switchTab('diagnosis');
            
            // 更新输入框placeholder（免费额度提示）
            updateChatInputPlaceholder();
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
                '<div class="custom-chip-card" onclick="openEssayOverlay()"><span class="chip-card-icon" style="background:linear-gradient(135deg,#00B894,#55EFC4)">✍️</span><span class="chip-card-text">批改作文</span></div>' +
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
            btn.disabled = !el.value.trim();
        }

        function handleInputKeydown(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (document.getElementById('chat-input').value.trim()) {
                    sendMessage();
                }
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
                msgDiv.innerHTML = '<div class="custom-chat-avatar"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>' +
                    '<div class="custom-chat-bubble">' + formatBotText(text) + '<div class="custom-chat-time">' + timeStr + '</div></div>';
            } else if (role === 'system') {
                msgDiv.innerHTML = '<div class="custom-chat-bubble">' + escapeHtml(text) + '</div>';
            } else {
                msgDiv.innerHTML = '<div class="custom-chat-bubble">' + escapeHtml(text) + '<div class="custom-chat-time">' + timeStr + '</div></div>';
            }

            container.appendChild(msgDiv);
            scrollChatToBottom();
            return msgDiv;
        }

        function appendTypingIndicator() {
            var container = document.getElementById('chat-messages');
            var msgDiv = document.createElement('div');
            msgDiv.className = 'custom-chat-msg ai';
            msgDiv.id = 'typing-indicator';
            msgDiv.innerHTML = '<div class="custom-chat-avatar"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>' +
                '<div class="custom-chat-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>';
            container.appendChild(msgDiv);
            scrollChatToBottom();
        }

        function removeTypingIndicator() {
            var el = document.getElementById('typing-indicator');
            if (el) el.remove();
        }

        function scrollChatToBottom() {
            var container = document.getElementById('chat-messages');
            setTimeout(function() { container.scrollTop = container.scrollHeight; }, 100);
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
                localStorage.setItem('cet_user', JSON.stringify(data));
                
                // 设置cet4_user_profile的startDate（如果还没有）
                try {
                    var profile = JSON.parse(localStorage.getItem('cet4_user_profile') || '{}');
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
            if (!text || chatState.isStreaming) return;

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
                    var createResp = await fetch('/api/chat/conversation', { method: 'POST' });
                    var createData = await createResp.json();
                    if (createData.data && createData.data.id) {
                        chatState.conversationId = createData.data.id;
                        // 新会话创建后，添加到对话列表
                        var mode = chatState.currentMode || 'diagnosis';
                        var botMap = {
                            'diagnosis': '7636289658620215331',
                            'companion': '7637702903679631395'
                        };
                        var list = getChatList();
                        // 检查是否已存在
                        var exists = false;
                        for (var i = 0; i < list.length; i++) {
                            if (list[i].id === chatState.conversationId) {
                                exists = true;
                                break;
                            }
                        }
                        if (!exists) {
                            // 获取用户的第一条消息作为标题
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
                    } else {
                        appendMessage('ai', '连接失败: ' + (createData.msg || '请刷新重试'));
                        chatState.isStreaming = false;
                        return;
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
                    
                    // 五维分数详情
                    var dimScores = {};
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
                    try { var sd = JSON.parse(localStorage.getItem('cet_streak') || '{}'); streak = sd.current || 0; } catch(e){}
                    
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

                var resp = await fetch(fetchUrl, {
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
                                        bubbleEl.innerHTML = formatBotMessage(fullText);
                                    }
                                }
                            } catch(e) {}
                        }
                    }
                    chatState.chatHistory.push({ role: 'assistant', content: fullText, content_type: 'text' });
                    chatState.chatRounds++;
                    updateChatListMeta(fullText);
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
                    buffer += decoder.decode(result.value, { stream: true });

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
                            // Coze stream format: evt.type === 'conversation.message.delta' for text chunks
                            if (evt.type === 'conversation.message.delta' && evt.data && evt.data.content && evt.data.type === 'answer') {
                                fullText += evt.data.content;
                                chatState.currentStreamText = fullText;
                                if (bubbleEl) {
                                    // Remove time element temporarily during streaming
                                    if (timeEl && timeEl.parentNode === bubbleEl) bubbleEl.removeChild(timeEl);
                                    bubbleEl.innerHTML = formatBotText(fullText);
                                    if (timeEl) bubbleEl.appendChild(timeEl);
                                }
                                scrollChatToBottom();
                            }
                            // Also capture conversation_id from conversation.chat.completed or message completed
                            if (evt.type === 'conversation.chat.created' || evt.type === 'conversation.chat.in_progress') {
                                if (evt.data && evt.data.conversation_id) {
                                    chatState.conversationId = evt.data.conversation_id;
                                }
                                if (evt.data && evt.data.id) {
                                    chatState.chatId = evt.data.id;
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
                            var pollResp = await fetch('/api/chat/messages?chat_id=' + chatState.chatId + '&conversation_id=' + chatState.conversationId);
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
                removeTypingIndicator();
                appendMessage('ai', '网络异常，请重试');
            }
            
            // 最后一条免费消息时追加轻提示
            if (willUseLastFree && typeof aiDiv !== 'undefined' && aiDiv) {
                appendLimitHintToMessage(aiDiv);
            }

            chatState.isStreaming = false;
        }

        function onBotReply() {
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

            var planTask = getPlanTodayTask();
            var userData = state.userData || {};
            var hasPlan = planTask && planTask.task && userData.plan && userData.plan !== 'free';

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
            fetch('/api/chat/messages?conversation_id=' + conversationId, {
                headers: { 'Content-Type': 'application/json' }
            }).then(function(r) { return r.json(); }).then(function(resp) {
                if (resp.code === 0 && resp.data) {
                    var container = document.getElementById('chat-messages');
                    container.innerHTML = '';
                    var msgs = resp.data.filter(function(m) { return m.type === 'answer' || m.type === 'question'; });
                    
                    // 隐藏chips，显示正常聊天
                    var chips = document.getElementById('input-chips');
                    if (chips && msgs.length > 0) chips.style.display = 'none';
                    
                    msgs.forEach(function(m) {
                        var content = m.content || '';
                        // 去掉注入的系统前缀，只显示用户真实消息
                        if (m.role === 'user') {
                            content = content.replace(/^\[系统信息\].*?\n\n/s, '').replace(/^\[进度\].*?\n\n/s, '');
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
                    // 滚动到底部
                    container.scrollTop = container.scrollHeight;
                }
            }).catch(function(e) {
                console.log('加载历史消息失败:', e);
            });
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
    var cards = document.querySelectorAll('.coze-card');
    cards.forEach(function(c) { c.classList.remove('selected'); });
    var target = document.querySelector('.coze-card[data-plan="' + plan + '"]');
    if (target) target.classList.add('selected');
    var ctaBtn = document.getElementById('plan-cta-btn');
    if (ctaBtn) {
        var prices = { free: '当前方案', sprint: '¥44.5 开始冲刺', flagship: '¥149.5 全程陪伴' };
        ctaBtn.textContent = prices[plan] || '选择方案';
    }
}

function showStudyHistory() { showToast('学习记录功能开发中'); }
function showDiagHistory() { showToast('诊断记录功能开发中'); }

function closeModal(id) { 
    var modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

function openPayment(plan) {
    var planNames = { sprint: '冲刺营', flagship: '全程营' };
    var planPrices = { sprint: 38, flagship: 148 };
    var planFeatures = {
        sprint: ['AI对话 无限','45天个性化学习计划','作文批改 每日1次（逐句改写）','翻译批改 每日1次（参考译文）','针对短板的每日一练'],
        flagship: ['AI对话 无限','45天个性化学习计划','作文/翻译批改 无限（逐句改写+精讲）','针对短板的每日一练','深度精讲（为什么错+怎么避坑）','六级衔接指导']
    };
    // 面包多商品链接（创建后替换）
    var mbdLinks = {
        sprint: 'https://mbd.pub/o/bread/YZaTk5tsbA==',
        flagship: 'https://mbd.pub/o/bread/YZaTk5ttbQ=='
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
            '<div class="pay-sheet-price"><small>¥</small>' + (planPrices[plan] || '') + '</div>' +
            '<ul class="pay-feature-list">' + featureHtml + '</ul>' +
            '<div class="pay-tabs">' +
                '<div class="pay-tab active" onclick="switchPayTab(\'online\')">在线购买</div>' +
                '<div class="pay-tab" onclick="switchPayTab(\'code\')">激活码</div>' +
            '</div>' +
            '<div class="pay-panel active" id="pay-panel-online">' +
                '<a class="pay-mbd-link" href="' + (mbdLinks[plan] || '#') + '" target="_blank">购买' + (planNames[plan] || '') + '</a>' +
                '<div class="pay-mbd-tip">购买后复制面包多订单号，粘贴到下方即可自动开通</div>' +
                '<div class="pay-coupon-tip">💡 付款时输入优惠码 <strong style="color:#6C5CE7">' + (plan === 'sprint' ? 'NGUPFC' : 'WPBWPS') + '</strong> 享5折</div>' +
                '<div class="pay-input-row" style="margin-top:14px">' +
                    '<input type="text" id="mbd-order-input" placeholder="粘贴面包多订单号" autocomplete="off" spellcheck="false">' +
                    '<button id="mbd-activate-btn" onclick="activateWithMbdOrder(\'' + plan + '\')">验证激活</button>' +
                '</div>' +
                '<div id="mbd-activate-msg" style="font-size:12px;margin-top:8px;min-height:18px"></div>' +
                '<div style="margin-top:16px;padding-top:16px;border-top:1px solid #F1F5F9">' +
                    '<div style="font-size:12px;color:#94a3b8;text-align:center;margin-bottom:8px">或微信扫码转账后联系客服获取激活码</div>' +
                    '<div class="pay-qr-box"><img src="/wechat-qr.jpg" alt="微信收款码"></div>' +
                    '<div class="pay-qr-tip">转账备注：' + (planNames[plan] || '') + '</div>' +
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

    fetch('/api/activate-with-code', {
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
            localStorage.setItem('cet_user', JSON.stringify(state.userData));
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

    fetch('/api/activate-with-mbd-order', {
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
            localStorage.setItem('cet_user', JSON.stringify(state.userData));
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
        '<button onclick="closePayModal();switchTab(\'diagnosis\');openChat(\'companion\')" style="width:100%;padding:14px;background:#6C5CE7;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer">开始AI陪练</button>' +
        '<button onclick="closePayModal()" style="width:100%;padding:12px;background:transparent;color:#94a3b8;border:none;font-size:13px;cursor:pointer;margin-top:4px">稍后再说</button>';
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
            localStorage.setItem('cet_user', JSON.stringify(state.userData));
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
        localStorage.setItem('cet_user', JSON.stringify(state.userData));
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
            localStorage.setItem('cet_user', JSON.stringify(state.userData));
        }
        // Trigger check-in
        var streak = JSON.parse(localStorage.getItem('cet_streak') || '{"count":0,"lastDate":""}');
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

// ====== 每日一练 Quiz System ======
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
    
    // 从真题库获取题目（不再用AI编题）
    var realQuizUrl = '/api/quiz/random?type=' + encodeURIComponent(randomType);
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
            var createResp = await fetch('/api/chat/conversation', { method: 'POST' });
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
        var resp = await fetch('/api/chat/send', {
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
    
    var typeLabels = { '词汇': '💬 词汇', '语法': '📝 语法', '阅读': '📖 阅读', '听力': '🎧 听力' };
    subtitle.textContent = '第 ' + (quizState.currentIndex + 1) + ' / ' + quizState.totalQuestions + ' 题';
    progress.style.width = ((quizState.currentIndex / quizState.totalQuestions) * 100) + '%';
    nextBtn.classList.remove('show', 'finish');
    
    var html = '<div class="quiz-type-badge">' + typeLabels[question.type] + '选择题</div>';
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
        var resp = await fetch('/api/chat/remaining', {
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
        function showShareCard() {
            var ptype = (state.userData && state.userData.personality) || '偏科大佬';
            document.getElementById('share-card-img').src = '/public/人格卡/人格卡-' + ptype + '.jpg';
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
        localStorage.setItem('cet_user', JSON.stringify(state.userData));
        
        // 同时写入cet4_ability_scores（供仪表盘使用）
        try {
            localStorage.setItem('cet4_ability_scores', JSON.stringify({ dims: reportData.dims }));
        } catch(e) {}
        
        // 写入cet4_user_profile的startDate（如果还没有）
        try {
            var profile = JSON.parse(localStorage.getItem('cet4_user_profile') || '{}');
            if (!profile.startDate) {
                profile.startDate = getTodayStr();
                localStorage.setItem('cet4_user_profile', JSON.stringify(profile));
            }
        } catch(e) {}
    }
    
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
        var resp = await fetch('/api/diagnosis/questions');
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
            // 提示用户使用旧模式
            showToast('新诊断模式暂不可用，将使用AI对话诊断');
            openChat('diagnosis');
            sendSuggestion('开始AI诊断，帮我找出四级薄弱点');
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
        
        var resp = await fetch('/api/diagnosis/report', {
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
    
    fetch('/api/deepseek/chat', {
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
        var profile = JSON.parse(localStorage.getItem('cet4_user_profile') || '{}');
        profile.learning_plan = plan;
        profile.plan_updated = getTodayStr();
        localStorage.setItem('cet4_user_profile', JSON.stringify(profile));
    } catch(e) {}
}

function getLearningPlan() {
    try {
        var profile = JSON.parse(localStorage.getItem('cet4_user_profile') || '{}');
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
}

// 关闭限额卡片（隐藏而非删除，保留位置）
function closeLimitCard(btn) {
    var card = btn.closest('.limit-card');
    if (card) card.style.display = 'none';
}

// 更新输入框placeholder
function updateChatInputPlaceholder() {
    var input = document.getElementById('chat-input');
    if (!input) return;
    
    if (isFreeLimitReached()) {
        input.placeholder = '今日免费额度已用完';
    } else {
        input.placeholder = '输入消息...';
    }
}

