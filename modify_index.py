import re

# 读取原文件
with open('/tmp/cet-tutor-deploy/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 在CET4Data模块中添加辅助方法
# 找到 saveUserProfile 结束的位置
old_cet4data_end = '''saveUserProfile: function(profile) {
                localStorage.setItem('cet4_user_profile', JSON.stringify(profile));
            }
        };'''

new_cet4data_end = '''saveUserProfile: function(profile) {
                localStorage.setItem('cet4_user_profile', JSON.stringify(profile));
            },
            
            // 获取今日练习题数
            getTodayPracticeCount: function() {
                var history = this.getPracticeHistory();
                var today = getTodayStr();
                var todayRecords = history.filter(function(r) { return r.date === today; });
                var count = 0;
                todayRecords.forEach(function(r) {
                    count += (r.correct || 0) + (r.wrong || 0);
                });
                return count;
            },
            
            // 获取总练习题数
            getTotalPracticeCount: function() {
                var history = this.getPracticeHistory();
                var total = 0;
                history.forEach(function(r) {
                    total += (r.correct || 0) + (r.wrong || 0);
                });
                return total;
            },
            
            // 获取总正确率
            getTotalAccuracy: function() {
                var history = this.getPracticeHistory();
                var totalCorrect = 0;
                var totalQuestions = 0;
                history.forEach(function(r) {
                    totalCorrect += r.correct || 0;
                    totalQuestions += (r.correct || 0) + (r.wrong || 0);
                });
                if (totalQuestions === 0) return 0;
                return Math.round((totalCorrect / totalQuestions) * 100);
            },
            
            // 获取近7天练习热力图数据
            getHeatmapData: function() {
                var history = this.getPracticeHistory();
                var result = [];
                var today = new Date();
                for (var i = 6; i >= 0; i--) {
                    var d = new Date(today);
                    d.setDate(d.getDate() - i);
                    var dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
                    var dayRecords = history.filter(function(r) { return r.date === dateStr; });
                    var count = 0;
                    dayRecords.forEach(function(r) {
                        count += (r.correct || 0) + (r.wrong || 0);
                    });
                    result.push({ date: dateStr, count: count });
                }
                return result;
            },
            
            // 获取45天计划进度
            getPlanProgress: function() {
                var profile = this.getUserProfile();
                if (!profile.startDate) return null;
                var start = new Date(profile.startDate);
                var now = new Date();
                var daysPassed = Math.floor((now - start) / (1000 * 60 * 60 * 24));
                var progress = Math.min(100, Math.round((daysPassed / 45) * 100));
                return {
                    daysPassed: daysPassed,
                    progress: progress,
                    startDate: profile.startDate
                };
            },
            
            // 获取预估分数
            getEstimatedScore: function() {
                var scores = this.getAbilityScores();
                // 检查是否有非默认值
                var hasCustomScore = false;
                for (var k in scores) {
                    if (scores[k] !== 50) {
                        hasCustomScore = true;
                        break;
                    }
                }
                if (!hasCustomScore) return null;
                
                var formula = scores['细节定位'] * 0.25 + 
                              scores['推理判断'] * 0.25 + 
                              scores['同义替换'] * 0.2 + 
                              scores['主旨归纳'] * 0.15 + 
                              scores['态度判断'] * 0.15;
                var estimate = Math.round(formula * 7.1);
                // 限制在425-710区间
                estimate = Math.max(425, Math.min(710, estimate));
                return estimate;
            },
            
            // 获取最弱的两项
            getWeakestTwoDimensions: function() {
                var scores = this.getAbilityScores();
                var arr = Object.keys(scores).map(function(k) {
                    return { name: k, score: scores[k] };
                }).sort(function(a, b) { return a.score - b.score; });
                return arr.slice(0, 2);
            },
            
            // 检查是否有能力数据（不是默认50分）
            hasAbilityData: function() {
                var scores = this.getAbilityScores();
                for (var k in scores) {
                    if (scores[k] !== 50) return true;
                }
                return false;
            }
        };'''

content = content.replace(old_cet4data_end, new_cet4data_end)

# 2. 修改showDiagnosisReport函数，添加诊断联动
old_show_report = '''// 显示诊断报告页
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
    }
    
    renderReportPage();'''

new_show_report = '''// 显示诊断报告页
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
        
        // 诊断联动：写入CET4Data五维能力和开始日期
        CET4Data.saveAbilityScores(reportData.dims);
        var profile = CET4Data.getUserProfile();
        if (!profile.startDate) {
            profile.startDate = getTodayStr();
            CET4Data.saveUserProfile(profile);
        }
    }
    
    renderReportPage();'''

content = content.replace(old_show_report, new_show_report)

# 3. 添加CSS样式（在</style>之前）
css_addition = '''
        /* ===== 学习进度仪表盘 ===== */
        .progress-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
            display: none;
            align-items: flex-end;
            justify-content: center;
        }
        .progress-overlay.show {
            display: flex;
        }
        .progress-sheet {
            width: 100%;
            max-width: 430px;
            max-height: 90vh;
            background: #F8F9FA;
            border-radius: 24px 24px 0 0;
            overflow: hidden;
            animation: slideUp 0.3s ease;
        }
        @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
        }
        .progress-sheet-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            background: white;
            border-bottom: 1px solid #F0F0F5;
        }
        .progress-sheet-title {
            font-size: 17px;
            font-weight: 700;
            color: #1a1a2e;
        }
        .progress-close-btn {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #F5F5F7;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }
        .progress-close-btn svg {
            width: 18px;
            height: 18px;
            stroke: #666;
        }
        .progress-sheet-body {
            padding: 16px;
            max-height: calc(90vh - 60px);
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        }
        
        /* 顶部概览卡片 */
        .progress-overview-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 16px;
        }
        .progress-overview-card {
            background: white;
            border-radius: 16px;
            padding: 16px;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .progress-overview-value {
            font-size: 28px;
            font-weight: 800;
            color: #6C5CE7;
            line-height: 1.2;
        }
        .progress-overview-value.orange { color: #F39C12; }
        .progress-overview-value.green { color: #00B894; }
        .progress-overview-label {
            font-size: 12px;
            color: #94a3b8;
            margin-top: 4px;
        }
        
        /* 卡片通用样式 */
        .progress-card {
            background: white;
            border-radius: 16px;
            padding: 16px;
            margin-bottom: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .progress-card-title {
            font-size: 15px;
            font-weight: 700;
            color: #1a1a2e;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .progress-card-title svg {
            width: 18px;
            height: 18px;
            stroke: #6C5CE7;
        }
        
        /* 雷达图区域 */
        .progress-radar-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .progress-radar-canvas {
            width: 200px;
            height: 200px;
        }
        .progress-radar-hint {
            text-align: center;
            padding: 32px 0;
            color: #94a3b8;
            font-size: 14px;
        }
        .progress-radar-tip {
            font-size: 12px;
            color: #F39C12;
            margin-top: 8px;
            text-align: center;
        }
        
        /* 45天计划进度条 */
        .progress-plan-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        .progress-plan-label {
            font-size: 14px;
            font-weight: 600;
            color: #1a1a2e;
        }
        .progress-plan-value {
            font-size: 14px;
            font-weight: 700;
            color: #6C5CE7;
        }
        .progress-plan-bar {
            height: 10px;
            background: #F0EEFF;
            border-radius: 5px;
            overflow: hidden;
            margin-bottom: 8px;
        }
        .progress-plan-fill {
            height: 100%;
            background: linear-gradient(90deg, #6C5CE7, #A29BFE);
            border-radius: 5px;
            transition: width 0.5s ease;
        }
        .progress-plan-footer {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #94a3b8;
        }
        .progress-exam-countdown {
            font-size: 13px;
            color: #64748b;
            text-align: center;
            margin-top: 12px;
        }
        .progress-exam-countdown strong {
            color: #E17055;
        }
        .progress-no-data {
            text-align: center;
            padding: 20px;
            color: #94a3b8;
            font-size: 13px;
        }
        
        /* 热力图 */
        .progress-heatmap {
            display: flex;
            justify-content: space-between;
            gap: 6px;
        }
        .progress-heatmap-day {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
        }
        .progress-heatmap-label {
            font-size: 11px;
            color: #94a3b8;
        }
        .progress-heatmap-box {
            width: 100%;
            aspect-ratio: 1;
            border-radius: 6px;
            background: #F0F0F5;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #666;
            cursor: pointer;
            transition: transform 0.15s;
            position: relative;
        }
        .progress-heatmap-box:hover {
            transform: scale(1.1);
        }
        .progress-heatmap-box.level-0 { background: #F0F0F5; }
        .progress-heatmap-box.level-1 { background: #E8E4FF; color: #6C5CE7; }
        .progress-heatmap-box.level-2 { background: #C4B5FD; color: white; }
        .progress-heatmap-box.level-3 { background: #6C5CE7; color: white; }
        .progress-heatmap-tooltip {
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: #1a1a2e;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            white-space: nowrap;
            display: none;
            z-index: 10;
        }
        .progress-heatmap-box:hover .progress-heatmap-tooltip {
            display: block;
        }
        .progress-heatmap-legend {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            margin-top: 12px;
            font-size: 11px;
            color: #94a3b8;
        }
        .progress-heatmap-legend-item {
            width: 12px;
            height: 12px;
            border-radius: 3px;
        }
        
        /* 薄弱项卡片 */
        .progress-weak-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px;
            background: #F8F9FA;
            border-radius: 12px;
            margin-bottom: 8px;
        }
        .progress-weak-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .progress-weak-icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            background: #FFF5F3;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
        }
        .progress-weak-info {}
        .progress-weak-name {
            font-size: 14px;
            font-weight: 600;
            color: #1a1a2e;
        }
        .progress-weak-score {
            font-size: 12px;
            color: #E17055;
        }
        .progress-weak-btn {
            padding: 6px 12px;
            background: linear-gradient(135deg, #6C5CE7, #8B7CF7);
            color: white;
            border: none;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
        }
        
        /* 预估分数 */
        .progress-estimate {
            text-align: center;
            padding: 8px 0;
        }
        .progress-estimate-main {
            font-size: 36px;
            font-weight: 800;
            color: #6C5CE7;
        }
        .progress-estimate-main span {
            font-size: 20px;
        }
        .progress-estimate-sub {
            font-size: 13px;
            color: #94a3b8;
            margin-top: 4px;
        }
        .progress-estimate-target {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            background: #E8F8F0;
            border-radius: 12px;
            font-size: 12px;
            color: #00B894;
            margin-top: 8px;
        }
'''

# 找到 </style> 位置添加CSS
style_end = content.find('</style>')
if style_end != -1:
    content = content[:style_end] + css_addition + '\n' + content[style_end:]

# 保存修改后的文件
with open('/tmp/cet-tutor-deploy/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Step 1 done: Added CSS and CET4Data methods")
