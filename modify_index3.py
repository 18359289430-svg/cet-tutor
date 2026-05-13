import re

# 读取文件
with open('/tmp/cet-tutor-deploy/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 添加JavaScript函数（在</script>之前，retryEssay函数之后）
js_functions = '''
    // ===== 学习进度仪表盘 =====
    function openProgressOverlay() {
        var overlay = document.getElementById('progress-overlay');
        if (overlay) {
            renderProgressDashboard();
            overlay.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }
    
    function closeProgressOverlay() {
        var overlay = document.getElementById('progress-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            document.body.style.overflow = '';
        }
    }
    
    // 点击遮罩关闭
    document.addEventListener('click', function(e) {
        var overlay = document.getElementById('progress-overlay');
        if (overlay && overlay.classList.contains('show')) {
            if (e.target === overlay) {
                closeProgressOverlay();
            }
        }
    });
    
    function renderProgressDashboard() {
        var body = document.getElementById('progress-sheet-body');
        if (!body) return;
        
        var streak = getStreakData();
        var todayCount = CET4Data.getTodayPracticeCount();
        var totalCount = CET4Data.getTotalPracticeCount();
        var accuracy = CET4Data.getTotalAccuracy();
        var hasAbilityData = CET4Data.hasAbilityData();
        var planProgress = CET4Data.getPlanProgress();
        var heatmapData = CET4Data.getHeatmapData();
        var weakestTwo = CET4Data.getWeakestTwoDimensions();
        var estimate = CET4Data.getEstimatedScore();
        
        // 考试倒计时
        var examDate = new Date('2026-06-13');
        var now = new Date();
        var daysToExam = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
        
        var html = '';
        
        // 1. 顶部概览卡片
        html += '<div class="progress-overview-grid">';
        html += '<div class="progress-overview-card">';
        html += '<div class="progress-overview-value">' + streak.count + '</div>';
        html += '<div class="progress-overview-label">连续学习天数</div>';
        html += '</div>';
        html += '<div class="progress-overview-card">';
        html += '<div class="progress-overview-value orange">' + todayCount + '</div>';
        html += '<div class="progress-overview-label">今日练习题数</div>';
        html += '</div>';
        html += '<div class="progress-overview-card">';
        html += '<div class="progress-overview-value green">' + totalCount + '</div>';
        html += '<div class="progress-overview-label">累计练习题数</div>';
        html += '</div>';
        html += '<div class="progress-overview-card">';
        html += '<div class="progress-overview-value">' + (accuracy > 0 ? accuracy + '%' : '—') + '</div>';
        html += '<div class="progress-overview-label">总正确率</div>';
        html += '</div>';
        html += '</div>';
        
        // 2. 五维能力雷达图
        html += '<div class="progress-card">';
        html += '<div class="progress-card-title">';
        html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
        html += '五维能力雷达图';
        html += '</div>';
        
        if (hasAbilityData) {
            html += '<div class="progress-radar-wrap">';
            html += '<canvas id="progress-radar-canvas" class="progress-radar-canvas"></canvas>';
            html += '</div>';
            // 最弱项提示
            var weakest = weakestTwo[0] || { name: '细节定位', score: 50 };
            html += '<div class="progress-radar-tip">💡 最薄弱项：' + weakest.name + '（' + weakest.score + '分），建议加强练习</div>';
        } else {
            html += '<div class="progress-radar-hint">完成首次诊断后解锁<br><span style="font-size:12px;margin-top:8px;display:inline-block">去和AI教练聊聊，完成诊断测试</span></div>';
        }
        html += '</div>';
        
        // 3. 45天计划进度条
        html += '<div class="progress-card">';
        html += '<div class="progress-card-title">';
        html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
        html += '45天备考计划';
        html += '</div>';
        
        if (planProgress) {
            html += '<div class="progress-plan-header">';
            html += '<span class="progress-plan-label">学习进度</span>';
            html += '<span class="progress-plan-value">第' + planProgress.daysPassed + '天/45天</span>';
            html += '</div>';
            html += '<div class="progress-plan-bar">';
            html += '<div class="progress-plan-fill" style="width:' + planProgress.progress + '%"></div>';
            html += '</div>';
            html += '<div class="progress-plan-footer">';
            html += '<span>开始于 ' + planProgress.startDate + '</span>';
            html += '<span>' + planProgress.progress + '%</span>';
            html += '</div>';
        } else {
            html += '<div class="progress-no-data">开始学习后自动记录</div>';
        }
        html += '<div class="progress-exam-countdown">距离四级考试还有 <strong>' + daysToExam + '</strong> 天</div>';
        html += '</div>';
        
        // 4. 近7天练习热力图
        html += '<div class="progress-card">';
        html += '<div class="progress-card-title">';
        html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>';
        html += '近7天练习热力图';
        html += '</div>';
        html += '<div class="progress-heatmap">';
        var dayLabels = ['日','一','二','三','四','五','六'];
        heatmapData.forEach(function(d, i) {
            var date = new Date(d.date);
            var dayLabel = dayLabels[date.getDay()];
            var level = 0;
            if (d.count >= 11) level = 3;
            else if (d.count >= 6) level = 2;
            else if (d.count >= 1) level = 1;
            html += '<div class="progress-heatmap-day">';
            html += '<div class="progress-heatmap-label">' + dayLabel + '</div>';
            html += '<div class="progress-heatmap-box level-' + level + '">';
            html += d.count;
            html += '<div class="progress-heatmap-tooltip">' + d.date + '<br>' + d.count + '道题</div>';
            html += '</div>';
            html += '</div>';
        });
        html += '</div>';
        html += '<div class="progress-heatmap-legend">';
        html += '<span>少</span>';
        html += '<div class="progress-heatmap-legend-item" style="background:#F0F0F5"></div>';
        html += '<div class="progress-heatmap-legend-item" style="background:#E8E4FF"></div>';
        html += '<div class="progress-heatmap-legend-item" style="background:#C4B5FD"></div>';
        html += '<div class="progress-heatmap-legend-item" style="background:#6C5CE7"></div>';
        html += '<span>多</span>';
        html += '</div>';
        html += '</div>';
        
        // 5. 薄弱项专项卡片（如果有数据）
        if (hasAbilityData && weakestTwo.length > 0) {
            html += '<div class="progress-card">';
            html += '<div class="progress-card-title">';
            html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
            html += '薄弱项专项训练';
            html += '</div>';
            
            weakestTwo.forEach(function(dim) {
                var icon = '🔍';
                var action = '开始练习';
                if (dim.name === '推理判断') { icon = '🧠'; }
                else if (dim.name === '同义替换') { icon = '✨'; }
                else if (dim.name === '主旨归纳') { icon = '📋'; }
                else if (dim.name === '态度判断') { icon = '🎯'; }
                
                html += '<div class="progress-weak-item">';
                html += '<div class="progress-weak-left">';
                html += '<div class="progress-weak-icon">' + icon + '</div>';
                html += '<div class="progress-weak-info">';
                html += '<div class="progress-weak-name">' + dim.name + '</div>';
                html += '<div class="progress-weak-score">当前 ' + dim.score + ' 分</div>';
                html += '</div>';
                html += '</div>';
                html += '<button class="progress-weak-btn" onclick="startWeakPractice(\'' + dim.name + '\')">' + action + '</button>';
                html += '</div>';
            });
            html += '</div>';
        }
        
        // 6. 预估分数（如果有数据）
        if (estimate !== null) {
            html += '<div class="progress-card">';
            html += '<div class="progress-card-title">';
            html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
            html += '预估分数';
            html += '</div>';
            html += '<div class="progress-estimate">';
            html += '<div class="progress-estimate-main">' + estimate + '<span>分</span></div>';
            html += '<div class="progress-estimate-sub">基于五维能力综合评估</div>';
            html += '<div class="progress-estimate-target">🎯 目标：425分（及格线）</div>';
            html += '</div>';
            html += '</div>';
        }
        
        body.innerHTML = html;
        
        // 绘制雷达图
        if (hasAbilityData) {
            setTimeout(function() {
                drawProgressRadar();
            }, 100);
        }
    }
    
    // 绘制仪表盘雷达图
    function drawProgressRadar() {
        var canvas = document.getElementById('progress-radar-canvas');
        if (!canvas) return;
        
        var ctx = canvas.getContext('2d');
        var dpr = window.devicePixelRatio || 1;
        var size = 200;
        
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
        ctx.scale(dpr, dpr);
        
        var centerX = size / 2;
        var centerY = size / 2;
        var maxRadius = 75;
        
        var scores = CET4Data.getAbilityScores();
        var dims = ['细节定位', '推理判断', '同义替换', '主旨归纳', '态度判断'];
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
            var score = scores[dimName] || 0;
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
            var score = scores[dimName] || 0;
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
        ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        for (var i = 0; i < n; i++) {
            var dimName = dims[i];
            var label = dimName;
            var angle = i * angleStep - Math.PI / 2;
            var labelR = maxRadius + 18;
            var x = centerX + Math.cos(angle) * labelR;
            var y = centerY + Math.sin(angle) * labelR;
            
            var score = scores[dimName] || 0;
            
            // 绘制标签
            ctx.fillStyle = '#64748B';
            ctx.fillText(label, x, y - 6);
            ctx.fillStyle = '#6C5CE7';
            ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText(score + '分', x, y + 8);
            ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
        }
    }
    
    // 开始薄弱项练习
    function startWeakPractice(dimension) {
        closeProgressOverlay();
        // 跳转到练习模式
        var typeMap = {
            '细节定位': 'reading',
            '推理判断': 'inference',
            '同义替换': 'words',
            '主旨归纳': 'mainidea',
            '态度判断': 'attitude'
        };
        var practiceType = typeMap[dimension] || 'reading';
        
        // 打开每日一练
        openQuiz();
        
        // 可以在这里添加针对特定维度的练习逻辑
        showToast('开始' + dimension + '专项练习');
    }
'''

# 找到 </script> 结束位置（在 saveEssayResult 函数之后）
script_end = content.rfind('</script>')
if script_end != -1:
    content = content[:script_end] + js_functions + '\n' + content[script_end:]

# 保存
with open('/tmp/cet-tutor-deploy/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Step 3 done: Added JavaScript functions")
