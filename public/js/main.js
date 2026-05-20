        // ===== 考试类型：页面加载时确定，之后不变 =====
var EXAM_TYPE = (function() {
    try {
        var params = new URLSearchParams(window.location.search);
        return params.get('type') === 'cet6' ? 'cet6' : 'cet4';
    } catch(e) { return 'cet4'; }
})();
var IS_CET6 = EXAM_TYPE === 'cet6';
var EXAM_LABEL = IS_CET6 ? '六级' : '四级';

// ===== localStorage key辅助函数 =====
function examKey(base) {
    return (IS_CET6 ? 'cet6_' : 'cet4_') + base;
}

// ===== 做题技巧点拨配置 =====
var DIM_TIPS = {
    '细节理解': {
        tag: '📍 定位查找',
        tip: '先在题干找关键词（人名/数字/特殊词），回原文定位对应句子，仔细比对选项和原文。',
        wrongHint: '你是不是定位偏了？或者选项有细微差别没注意到？'
    },
    '推理判断': {
        tag: '🧠 逻辑推理',
        tip: '答案不在原文表面，需要根据上下文推断。重点关注转折词(but/however)和因果词(because/therefore)后面的内容。',
        wrongHint: '推理题别想太多，答案一定有原文依据，不要过度延伸。'
    },
    '同义替换': {
        tag: '🔄 同义替换',
        tip: '正确选项几乎不会照抄原文，而是用近义词或改写句表达相同意思。比如 decrease→drop，important→crucial。',
        wrongHint: '你是不是在找原文原词？正确答案往往是原文的同义转述！'
    },
    '主旨归纳': {
        tag: '🎯 主旨归纳',
        tip: '重点关注文章首段、尾段和各段首句。主旨题答案通常概括性强，不会是某个细节。',
        wrongHint: '主旨题别被某个细节带跑，答案要能覆盖全文。'
    },
    '态度判断': {
        tag: '💭 态度判断',
        tip: '关注带感情色彩的形容词、副词，特别注意转折词后的评价性语言，那里往往藏着作者真实态度。',
        wrongHint: '态度题的线索藏在评价性词汇里，别只看事实信息。'
    },
    // 四级旧标签兼容映射
    '细节定位': {
        tag: '📍 定位查找',
        tip: '先在题干找关键词（人名/数字/特殊词），回原文定位对应句子，仔细比对选项和原文。',
        wrongHint: '你是不是定位偏了？或者选项有细微差别没注意到？'
    },
    '关键信息捕捉': {
        tag: '📍 定位查找',
        tip: '先在题干找关键词（人名/数字/特殊词），回原文定位对应句子，仔细比对选项和原文。',
        wrongHint: '你是不是定位偏了？或者选项有细微差别没注意到？'
    },
    '主旨大意': {
        tag: '🎯 主旨归纳',
        tip: '重点关注文章首段、尾段和各段首句。主旨题答案通常概括性强，不会是某个细节。',
        wrongHint: '主旨题别被某个细节带跑，答案要能覆盖全文。'
    },
    '态度推断': {
        tag: '💭 态度判断',
        tip: '关注带感情色彩的形容词、副词，特别注意转折词后的评价性语言，那里往往藏着作者真实态度。',
        wrongHint: '态度题的线索藏在评价性词汇里，别只看事实信息。'
    },
    '词义推断': {
        tag: '🔄 同义替换',
        tip: '正确选项几乎不会照抄原文，而是用近义词或改写句表达相同意思。比如 decrease→drop，important→crucial。',
        wrongHint: '你是不是在找原文原词？正确答案往往是原文的同义转述！'
    }
};

// 获取技巧点拨（带兼容映射）
function getTipInfo(dimName) {
    if (DIM_TIPS[dimName]) return DIM_TIPS[dimName];
    // 未知标签默认映射到细节理解
    return DIM_TIPS['细节理解'];
}


// ===== 获取动态冲刺计划天数（根据距考试日期计算）=====
function getPlanDuration() {
    var examDate = new Date('2026-06-13');
    var now = new Date();
    var diff = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
    return Math.max(diff, 1);
}

var personalities = [
                { type:'佛系随缘选手', color:'#F5C6AA', emoji:'😌', img:'/cards/foxisuiyuan.png', honor:'佛系陪跑员', comment:'你很佛系，但四级不佛', scores:{"细节定位":95,"推理判断":33,"同义替换":66,"主旨归纳":77,"态度判断":93} },
                { type:'脑补大师', color:'#C4A8E0', emoji:'💭', img:'/cards/naobudashi.png', honor:'四级白日梦家', comment:'笔在卷子上，魂在银河系', scores:{"细节定位":40,"推理判断":75,"同义替换":50,"主旨归纳":30,"态度判断":60} },
                { type:'偏科大佬', color:'#FFB6C1', emoji:'📚', img:'/cards/piankedalao.png', honor:'阅读王者·翻译菜鸡', comment:'一半封神，一半白给', scores:{"细节定位":98,"推理判断":20,"同义替换":95,"主旨归纳":99,"态度判断":25} },
                { type:'摆烂冠军', color:'#A8C4D8', emoji:'🛋️', img:'/cards/bailanguanjun.png', honor:'四级陪跑一级选手', comment:'重在参与，随缘就好', scores:{"细节定位":10,"推理判断":15,"同义替换":5,"主旨归纳":20,"态度判断":80} },
                { type:'全对卷王', color:'#E8E8E8', emoji:'🏆', img:'/cards/quandaowang.png', honor:'四级人形标准答案', comment:'别人考四级，你考四级解析', scores:{"细节定位":100,"推理判断":98,"同义替换":100,"主旨归纳":100,"态度判断":95} },
                { type:'吗喽型选手', color:'#C4956A', emoji:'🐒', img:'/cards/malouxuanshou.png', honor:'熬夜硬肝特种兵', comment:'咖啡续着命，单词记不住', scores:{"细节定位":35,"推理判断":40,"同义替换":25,"主旨归纳":30,"态度判断":20} },
                { type:'临时抱佛脚选手', color:'#FFA500', emoji:'🙏', img:'/cards/linshibaifofojiao.png', honor:'考前突击大师', comment:'平时不烧香，考前抱佛脚', scores:{"细节定位":60,"推理判断":55,"同义替换":70,"主旨归纳":65,"态度判断":50} },
                { type:'资料囤积狂', color:'#4A7C8C', emoji:'📦', img:'/cards/ziliaodunjikuang.png', honor:'四级资料收藏家', comment:'收藏=学会，囤满=安心', scores:{"细节定位":85,"推理判断":70,"同义替换":80,"主旨归纳":75,"态度判断":60} }
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
        
// ===== 错题智能复习提醒函数（基于艾宾浩斯遗忘曲线）=====
// 艾宾浩斯复习间隔：1天→3天→7天→15天→30天
var REVIEW_INTERVALS = [1, 3, 7, 15, 30]; // 单位：天

// 计算下次复习时间
function getNextReviewTime(reviewCount, lastReviewAt) {
    reviewCount = reviewCount || 0;
    if (reviewCount >= REVIEW_INTERVALS.length) {
        return null; // 已掌握，不再提醒
    }
    var intervalDays = REVIEW_INTERVALS[reviewCount] || 30;
    if (!lastReviewAt) {
        return null;
    }
    var lastReview = new Date(lastReviewAt);
    var nextReview = new Date(lastReview.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    return nextReview;
}

// 检查是否为待复习状态
function isOverdueForReview(question) {
    var reviewCount = question.reviewCount || 0;
    if (reviewCount >= REVIEW_INTERVALS.length) {
        return false;
    }
    var lastReview = question.reviewedAt || question.createdAt;
    if (!lastReview) {
        var createdTime = question.createdAt ? new Date(question.createdAt) : new Date();
        var oneDayLater = new Date(createdTime.getTime() + 24 * 60 * 60 * 1000);
        return new Date() >= oneDayLater;
    }
    var nextReview = getNextReviewTime(reviewCount, lastReview);
    if (!nextReview) {
        var intervalDays = REVIEW_INTERVALS[REVIEW_INTERVALS.length - 1] || 30;
        var lastReviewDate = new Date(lastReview);
        var thirtyDaysLater = new Date(lastReviewDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
        return new Date() >= thirtyDaysLater;
    }
    return new Date() >= nextReview;
}

// 获取所有到期需要复习的错题
function getOverdueReviews() {
    var questions = getWrongQuestions();
    var overdue = [];
    questions.forEach(function(q) {
        if (isOverdueForReview(q)) {
            overdue.push(q);
        }
    });
    return overdue;
}

// 获取待复习数量
function getOverdueReviewCount() {
    return getOverdueReviews().length;
}

// 获取下次复习时间描述
function getReviewTimeDesc(question) {
    var reviewCount = question.reviewCount || 0;
    if (reviewCount >= REVIEW_INTERVALS.length) {
        return '已掌握';
    }
    var lastReview = question.reviewedAt || question.createdAt;
    if (!lastReview) {
        var createdTime = question.createdAt ? new Date(question.createdAt) : new Date();
        var oneDayLater = new Date(createdTime.getTime() + 24 * 60 * 60 * 1000);
        var daysLeft = Math.ceil((oneDayLater - new Date()) / (24 * 60 * 60 * 1000));
        return daysLeft <= 0 ? '今天' : daysLeft + '天后';
    }
    var intervalDays = REVIEW_INTERVALS[reviewCount] || 30;
    var nextReview = new Date(lastReview.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    var daysLeft = Math.ceil((nextReview - new Date()) / (24 * 60 * 60 * 1000));
    if (daysLeft <= 0) return '今天';
    if (daysLeft === 1) return '明天';
    return daysLeft + '天后';
}

// ===== 诊断分数对比功能 =====
// 获取上一次诊断记录
function getPreviousDiagnosis() {
    var history = getDiagnosisHistory();
    if (history.length < 2) {
        return null;
    }
    return history[1]; // 第二次诊断是上一次
}

// 计算分数变化
function calculateScoreDiff(current, previous, dimName) {
    var currentScore = current.dims[dimName] || 0;
    var previousScore = previous.scores[dimName] || 0;
    var diff = currentScore - previousScore;
    return {
        current: currentScore,
        previous: previousScore,
        diff: diff,
        improved: diff > 0,
        declined: diff < 0
    };
}

// 生成对比摘要
function generateCompareSummary(current, previous) {
    if (!previous) return null;
    
    // 确保totalScore有值（兜底计算）
    var currentTotal = current.totalScore || 0;
    if (currentTotal === 0 && current.dims && Object.keys(current.dims).length > 0) {
        var sum = 0, cnt = 0;
        Object.keys(current.dims).forEach(function(k) { sum += (current.dims[k] || 0); cnt++; });
        if (cnt > 0) currentTotal = Math.round(sum / cnt);
    }
    var previousTotal = previous.totalScore || 0;
    if (previousTotal === 0 && previous.scores && Object.keys(previous.scores).length > 0) {
        var sum2 = 0, cnt2 = 0;
        Object.keys(previous.scores).forEach(function(k) { sum2 += (previous.scores[k] || 0); cnt2++; });
        if (cnt2 > 0) previousTotal = Math.round(sum2 / cnt2);
    }
    var totalDiff = currentTotal - previousTotal;
    var improvements = [];
    var declines = [];
    
    Object.keys(current.dims).forEach(function(dim) {
        var diff = calculateScoreDiff(current, previous, dim);
        if (diff.diff > 0) {
            improvements.push({ dim: dim, diff: diff.diff });
        } else if (diff.diff < 0) {
            declines.push({ dim: dim, diff: Math.abs(diff.diff) });
        }
    });
    
    // 按进步幅度排序
    improvements.sort(function(a, b) { return b.diff - a.diff; });
    
    return {
        totalDiff: totalDiff,
        improvements: improvements,
        declines: declines,
        personalityChanged: current.personality !== previous.personality,
        previousPersonality: previous.personality
    };
}

// 获取进步提示文本
function getProgressHint(summary) {
    if (!summary) return '';
    
    var hints = [];
    
    if (summary.totalDiff > 0) {
        hints.push('比上次进步了' + summary.totalDiff + '分！');
    } else if (summary.totalDiff < 0) {
        hints.push('这次发挥不如上次，别灰心，继续练薄弱项');
    }
    
    // 检查是否有大幅进步（>=10分）
    if (summary.improvements.length > 0 && summary.improvements[0].diff >= 10) {
        hints.push(summary.improvements[0].dim + '提升' + summary.improvements[0].diff + '分，进步明显！');
    }
    
    return hints.join(' ');
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
            html += '<div class="diag-hero-sub">追踪学习进度，见证每一次进步</div>';
            html += '<div class="diag-hero-divider"></div>';
            html += '</div>';
            
            // 错题复习提醒
            var overdueCount = typeof getOverdueReviewCount === 'function' ? getOverdueReviewCount() : 0;
            if (overdueCount > 0) {
                html += '<div class="dashboard-review-tip" onclick="navigateToWrongBook()">';
                html += '<div class="dashboard-review-icon">📚</div>';
                html += '<div class="dashboard-review-info">';
                html += '<div class="dashboard-review-title">今天有' + overdueCount + '道错题到了复习时间</div>';
                html += '<div class="dashboard-review-count">艾宾浩斯记忆法，科学巩固薄弱点</div>';
                html += '</div>';
                html += '<div class="dashboard-review-arrow">›</div>';
                html += '</div>';
            }

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
                
                // 趋势对比（如果有2次以上诊断）
                if (history.length >= 2) {
                    html += '<div class="diag-trend-section">';
                    html += '<div class="diag-trend-title">📈 最近分数变化</div>';
                    html += '<div class="diag-trend-chart">';
                    // 取最近5次
                    var recentRecords = history.slice(0, Math.min(5, history.length));
                    recentRecords.forEach(function(rec, idx) {
                        var dateLabel = formatDateTime(rec.date).split(' ')[0].slice(5); // MM-DD格式
                        html += '<div class="diag-trend-bar-group">';
                        html += '<div class="diag-trend-bars">';
                        // 总分柱状
                        html += '<div class="diag-trend-bar" style="height:' + (rec.totalScore * 0.6) + 'px;background:#6C5CE7;" title="总分:' + rec.totalScore + '"></div>';
                        html += '</div>';
                        html += '<div class="diag-trend-label">' + dateLabel + '</div>';
                        html += '</div>';
                    });
                    html += '</div>';
                    html += '</div>';
                }

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
            // renderTodayTaskCard(); // 已移除今日待办卡片
            renderHomeReviewReminder();  // 渲染首页待复习提醒卡片
            setTimeout(checkReviewToastReminder, 100);  // 检查是否需要toast提醒
            initTabEvents();
            updateProfileStats();
            updateProfileUserId();
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

        // 根据URL参数初始化UI状态
        (function initExamTypeUI() {
            if (IS_CET6) {
                // 更新切换按钮状态
                var cet4Btn = document.getElementById('cet4-btn');
                var cet6Btn = document.getElementById('cet6-btn');
                if (cet4Btn) cet4Btn.classList.remove('active');
                if (cet6Btn) cet6Btn.classList.add('active');
                
                // 更新标题
                var examTitle = document.getElementById('exam-type-title');
                if (examTitle) examTitle.textContent = '六级';
                
                // 更新品牌名
                var brandEl = document.querySelector('.brand');
                if (brandEl) brandEl.textContent = '六级备考搭子';
                
                // 更新页脚
                var footerTexts = document.querySelectorAll('.profile-footer-text');
                footerTexts.forEach(function(el) {
                    if (el) el.textContent = el.textContent.replace('四级', '六级');
                });
                
                // 更新首页文案
                var socialSpan = document.querySelector('.home-social span');
                if (socialSpan) socialSpan.textContent = socialSpan.textContent.replace('四级', '六级');
                
                // 更新诊断描述
                var diagDesc = document.querySelector('.new-chat-option-desc');
                if (diagDesc && diagDesc.textContent.includes('四级')) diagDesc.textContent = diagDesc.textContent.replace('四级', '六级');
                
                // 更新聊天头部状态
                var chatStatus = document.querySelector('.custom-chat-header-status');
                if (chatStatus) chatStatus.textContent = chatStatus.textContent.replace('四级', '六级');
                
                // 更新输入框placeholder
                var chatInput = document.getElementById('chat-input');
                if (chatInput && chatInput.placeholder) chatInput.placeholder = chatInput.placeholder.replace('四级', '六级');
                
                // 更新备考人格名
                var profileName = document.getElementById('profile-name');
                if (profileName && profileName.textContent.includes('四级')) profileName.textContent = profileName.textContent.replace('四级', '六级');
                
                // 更新诊断标题
                var diagTitle = document.getElementById('diag-title');
                if (diagTitle) diagTitle.textContent = diagTitle.textContent.replace('四级', '六级');
                
                // 更新页面标题
                document.title = document.title.replace('四级', '六级');
            }
        })();

        function loadUserData() {
            try {
                var data = localStorage.getItem(examKey('user'));
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
        // 支持传入指定 userId 用于数据恢复
        async function syncUserDataFromCloud(targetUserId) {
            var userId;
            // 如果传入了指定的 userId，则使用该 ID 并替换本地存储
            if (targetUserId) {
                userId = targetUserId;
                state.userData = state.userData || {};
                state.userData.cloudUserId = userId;
            } else {
                userId = getCloudUserId();
            }
            try {
                var resp = await fetch('/api/progress?user_id=' + encodeURIComponent(userId), {
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
                    // 确保 cloudUserId 被正确保存
                    localData.cloudUserId = userId;
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
                var resp = await fetch('/api/progress', {
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
            safeSetItem(examKey('user'), JSON.stringify(data));
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
            fetch('/api/activate-with-code', {
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
            
            fetch('/api/activate-with-mbd-order', {
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
            updateProfileUserId();
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
                var cdText = diffDays > 0 ? (diffHours > 0 ? '距' + EXAM_LABEL + ' ' + diffDays + '天' + diffHours + '时' : '距' + EXAM_LABEL + ' ' + diffDays + '天') : EXAM_LABEL + '加油';
                homeCd.innerHTML = '<span class="cd-days">' + diffDays + '</span>天' + (diffHours > 0 ? diffHours + '时' : '');
            }
            var chatCd = document.getElementById('chat-countdown');
            if (chatCd) {
                chatCd.textContent = diffDays > 0 ? diffHours > 0 ? '距' + EXAM_LABEL + ' ' + diffDays + '天' + diffHours + '时' : '距' + EXAM_LABEL + ' ' + diffDays + '天' : EXAM_LABEL + '加油';
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
            if (tab === 'profile') {
                updateProfileUserId();
            }
        }

        // ===== 快捷操作函数 =====
        // ===== 考试类型切换函数 =====
        function switchExamType(type) {
            state.chatHistory = [];
            state.conversations = [];
            state.currentConversationId = null;
            var chatBox = document.getElementById('chat-messages');
            if (chatBox) chatBox.innerHTML = '';
            if (type === 'cet6') {
                window.location.href = window.location.pathname + '?type=cet6';
            } else {
                window.location.href = window.location.pathname;
            }
        }

        function handleQuickAction(mode) {
            // 开场白快捷按钮处理
            if (mode === 'diagnosis') {
                startNewDiagnosis();
            } else if (mode === 'companion') {
                createNewChat('companion');
            }
        }

        // ===== 更新模式说明 =====
        function updateModeDesc(mode) {
            var descEl = document.getElementById('mode-desc');
            if (!descEl) return;
            var textEl = descEl.querySelector('.mode-desc-text');
            if (!textEl) return;
            
            var descMap = {
                'diagnosis': '我将通过诊断测试分析你的薄弱维度，给出针对性备考建议',
                'companion': '我是你的AI陪练，随时解答问题、批改作文、讲解技巧'
            };
            
            textEl.textContent = descMap[mode] || descMap['companion'];
        }
        
        function handleCapsuleClick(text) {
            // 快捷胶囊按钮点击处理
            if (text === '练题' || text === '真题练习') {
                openQuiz();
                return;
            }
            if (text === '批改作文') {
                handleEssayClick();
                return;
            }
            // 新增6个快捷按钮处理
            if (text === '开始诊断') {
                // 切换到诊断模式
                updateModeDesc('diagnosis');
                startNewDiagnosis();
                return;
            }
            if (text === '翻译练习') {
                openChat('companion');
                setTimeout(function() { sendSuggestion('翻译练习'); }, 300);
                return;
            }
            if (text === '错题重做') {
                switchTab('wrongbook');
                return;
            }
            if (text === '今日任务') {
                openChat('companion');
                setTimeout(function() { sendSuggestion('今天练什么好'); }, 300);
                return;
            }
            if (text === '写作模板') {
                openChat('companion');
                setTimeout(function() { sendSuggestion('给我写作模板'); }, 300);
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
                'diagnosis': '我想做一个AI诊断，帮我分析' + EXAM_LABEL + '薄弱点',
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
            
            // 筛选标签 - 带数量统计
            html += '<div class="wrongbook-section">';
            html += '<div class="wrongbook-filter-bar">';
            var filterTypes = ['全部', '词汇', '语法', '阅读', '听力'];
            filterTypes.forEach(function(type) {
                var active = wrongbookFilterType === type ? 'active' : '';
                var count = 0;
                if (type === '全部') count = stats.total;
                else if (type === '词汇') count = stats.vocabulary;
                else if (type === '语法') count = stats.grammar;
                else if (type === '阅读') count = stats.reading;
                else if (type === '听力') count = stats.listening;
                html += '<div class="filter-tag ' + active + '" onclick="filterWrongbook(\'' + type + '\')">' + type + ' ' + count + '</div>';
            });
            // 添加待复习筛选
            var overdueCount = getOverdueReviewCount();
            if (overdueCount > 0) {
                var overdueActive = wrongbookFilterType === '待复习' ? 'active overdue-filter' : 'overdue-filter';
                html += '<div class="filter-tag ' + overdueActive + '" onclick="filterWrongbook(\'待复习\')">⏰ 待复习(' + overdueCount + ')</div>';
            }
            html += '</div>';
            html += '</div>';
            
            // 错题列表（待复习的排前面）
            if (wrongbookFilterType === '待复习') {
                questions = getOverdueReviews();
            } else if (wrongbookFilterType !== '全部') {
                questions = questions.filter(function(q) { return q.type === wrongbookFilterType; });
            }
            // 待复习的排前面
            questions.sort(function(a, b) {
                var aOverdue = isOverdueForReview(a);
                var bOverdue = isOverdueForReview(b);
                if (aOverdue && !bOverdue) return -1;
                if (!aOverdue && bOverdue) return 1;
                return (b.createdAt || 0) - (a.createdAt || 0);
            });
            
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
            var isOverdue = isOverdueForReview(q);
            var reviewTimeDesc = getReviewTimeDesc(q);
            
            var html = '<div class="wrong-card ' + typeClass + '" onclick="toggleWrongDetail(this)">';
            html += '<div class="wrong-card-header">';
            html += '<span class="wrong-type-tag ' + typeClass + '">' + (q.type || '词汇') + '</span>';
            if (isOverdue) {
                html += '<span class="wrong-overdue-badge"><span class="wrong-overdue-dot"></span>待复习</span>';
            } else if (isReviewed) {
                html += '<span class="wrong-reviewed-badge">已复习</span>';
            }
            html += '<span class="wrong-date">' + dateStr + '</span>';
            // 显示下次复习时间
            if (reviewTimeDesc && reviewTimeDesc !== '已掌握') {
                html += '<span class="wrong-review-time">' + reviewTimeDesc + '</span>';
            }
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
            html += '<button class="wrong-redo-btn" onclick="event.stopPropagation(); startRedo(\'' + q.id + '\')">';
            html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>';
            html += '重做</button>';
            html += '</div>';
            html += '</div>';
            html += '</div>';
            return html;
        }
        
        // 跳转到错题本
function navigateToWrongBook() {
    showWrongBook();
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
        
        

        // ===== 错题重做功能 =====
        var redoState = {
            questionId: null,
            question: null,
            mode: false
        };
        
        // 开始重做某道错题
        function startRedo(questionId) {
            var questions = getWrongQuestions();
            var q = questions.find(function(item) { return item.id === questionId; });
            if (!q) return;
            
            redoState = {
                questionId: questionId,
                question: q,
                mode: true
            };
            
            showRedoQuiz(q);
        }
        
        // 显示重做界面
        function showRedoQuiz(q) {
            var options = ['A', 'B', 'C', 'D'].map(function(key) {
                return {
                    key: key,
                    val: q['option' + key]
                };
            }).filter(function(opt) { return opt.val; });
            
            var html = '<div class="quiz-page" id="quiz-page" style="display:block">';
            html += '<div class="quiz-header">';
            html += '<button class="quiz-back" onclick="closeRedoQuiz()">';
            html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
            html += '</button>';
            html += '<div class="quiz-header-title">错题重做</div>';
            html += '<div class="quiz-header-spacer"></div>';
            html += '</div>';
            
            html += '<div class="quiz-content">';
            html += '<div class="quiz-type-tag">' + (q.type || '阅读') + '</div>';
            html += '<div class="quiz-question">' + escapeHtml(q.question || '') + '</div>';
            html += '<div class="quiz-options">';
            
            options.forEach(function(opt) {
                html += '<div class="quiz-option" onclick="selectRedoOption(\'' + opt.key + '\')" id="redo-opt-' + opt.key + '">';
                html += '<span class="option-letter">' + opt.key + '</span>';
                html += '<span class="option-text">' + escapeHtml(opt.val) + '</span>';
                html += '</div>';
            });
            
            html += '</div>';
            html += '</div>';
            
            html += '<div class="quiz-footer">';
            html += '<div class="quiz-hint">选择正确答案</div>';
            html += '</div>';
            
            html += '<div class="quiz-result" id="quiz-result" style="display:none"></div>';
            html += '</div>';
            
            // 关闭其他弹窗，显示重做界面
            closeAllModals();
            var quizPage = document.getElementById('quiz-page') || document.createElement('div');
            quizPage.innerHTML = html;
            quizPage.id = 'quiz-page';
            quizPage.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#fff;z-index:1000;overflow-y:auto';
            document.body.appendChild(quizPage);
            
            // 隐藏底部导航
            var nav = document.querySelector('.bottom-nav');
            if (nav) nav.style.display = 'none';
        }
        
        // 选择重做选项
        function selectRedoOption(selectedKey) {
            if (!redoState.question) return;
            var q = redoState.question;
            var correctAnswer = q.answer;
            var isCorrect = selectedKey === correctAnswer;
            
            // 禁用所有选项
            ['A', 'B', 'C', 'D'].forEach(function(key) {
                var optEl = document.getElementById('redo-opt-' + key);
                if (optEl) {
                    optEl.style.pointerEvents = 'none';
                    if (key === correctAnswer) {
                        optEl.classList.add('correct');
                    } else if (key === selectedKey && !isCorrect) {
                        optEl.classList.add('wrong');
                    }
                }
            });
            
            // 显示结果
            var resultDiv = document.getElementById('quiz-result');
            if (resultDiv) {
                resultDiv.style.display = 'block';
                
                if (isCorrect) {
                    // 答对了：从待复习列表移除，更新复习间隔
                    resultDiv.innerHTML = '<div class="quiz-result-correct">✅ 回答正确！</div>';
                    resultDiv.innerHTML += '<div class="quiz-result-tip" style="margin-top:12px">这道错题已从复习列表移除</div>';
                    resultDiv.innerHTML += '<button class="quiz-continue-btn" onclick="closeRedoQuiz(); renderWrongBook();">完成</button>';
                    
                    // 更新错题复习状态
                    var questions = getWrongQuestions();
                    var idx = questions.findIndex(function(item) { return item.id === q.id; });
                    if (idx !== -1) {
                        questions[idx].reviewedAt = new Date().toISOString();
                        questions[idx].reviewCount = (questions[idx].reviewCount || 0) + 1;
                        safeSetItem('cet_wrong_questions', questions);
                    }
                } else {
                    // 答错了：重置复习间隔
                    resultDiv.innerHTML = '<div class="quiz-result-wrong">❌ 回答错误</div>';
                    resultDiv.innerHTML += '<div class="quiz-result-tip">正确答案是 ' + correctAnswer + '：' + escapeHtml(q['option' + correctAnswer] || '') + '</div>';
                    resultDiv.innerHTML += '<div class="quiz-result-tip" style="margin-top:12px">复习间隔已重置为1天</div>';
                    resultDiv.innerHTML += '<button class="quiz-continue-btn" onclick="closeRedoQuiz(); renderWrongBook();">完成</button>';
                    
                    // 重置复习间隔
                    var questions = getWrongQuestions();
                    var idx = questions.findIndex(function(item) { return item.id === q.id; });
                    if (idx !== -1) {
                        questions[idx].reviewedAt = new Date().toISOString();
                        questions[idx].reviewCount = 0; // 重置为1天间隔
                        safeSetItem('cet_wrong_questions', questions);
                    }
                }
                
                // 显示解析
                resultDiv.innerHTML += '<div class="quiz-explanation" style="margin-top:16px;padding:12px;background:#f8f9fa;border-radius:8px;">';
                resultDiv.innerHTML += '<div style="font-weight:600;margin-bottom:8px;">解析</div>';
                resultDiv.innerHTML += '<div>' + escapeHtml(q.explanation || '暂无解析') + '</div>';
                resultDiv.innerHTML += '</div>';
            }
        }
        
        // 关闭重做界面
        function closeRedoQuiz() {
            var quizPage = document.getElementById('quiz-page');
            if (quizPage) {
                quizPage.remove();
            }
            redoState = {
                questionId: null,
                question: null,
                mode: false
            };
            // 恢复底部导航
            var nav = document.querySelector('.bottom-nav');
            if (nav) nav.style.display = '';
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

        
        // ===== 渲染数据页面 - 5个板块精简版 =====
        
function renderDashboard() {
            var icons={flame:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12c2-2.96 0-7-1-8 0 3.038-1.773 4.741-3 6-1.226 1.26-2 3.24-2 5a6 6 0 1 0 12 0c0-1.532-1.056-3.94-2-5-1.786 3-2.791 3-4 2z"/></svg>',target:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',pencil:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',alert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',trending:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'};
            try {
                var container = document.getElementById('dashboard-content');
                if (!container) return;
                
                var html = '';
                
                // ===== 变量准备 =====
                var userData = safeGetItem(examKey('user'), {});
                var streak = getStreakData();
                var todayCount=(state.userData&&state.userData.todayPracticeCount)||0;
                var accuracy=(state.userData&&state.userData.accuracy)||0;
                var totalPractice=(state.userData&&state.userData.totalPractice)||0;
                var sprintPlan = getSprintPlan();
                var planDays = getPlanDuration();
                var currentDay = sprintPlan && sprintPlan.startDay ? Math.ceil((Date.now() - new Date(sprintPlan.startDay).getTime()) / (1000 * 60 * 60 * 24)) : 1;
                currentDay = Math.max(1, Math.min(currentDay, planDays));
                var planProgress = Math.round((currentDay / planDays) * 100);
                var daysToExam = getPlanDuration();
                
                // 诊断数据
                var abilityData = getAbilityScores();
                var hasDimData = abilityData && abilityData.dims && Object.keys(abilityData.dims).length > 0;
                var dims = hasDimData ? abilityData.dims : {};
                var estimatedScore = hasDimData ? calculateScore(dims) : 0;
                var weakDims = hasDimData ? getWeakDims(dims) : [];
                var heatmapData = getHeatmapData();
                var abilityTrend = getAbilityTrend();
                
                // ===== 第1个板块: 学习进度 Hero =====
                html += '<div class="dashboard-hero glass-card">';
                html += '<div class="dashboard-hero-header">';
                html += '<div class="dashboard-hero-title">' + icons.flame + '学习进度</div>';
                html += '<div class="dashboard-hero-subtitle">距考试 ' + daysToExam + ' 天</div>';
                html += '</div>';
                // 环形进度条 - 加大 + 发光
                var circumference = 2 * Math.PI * 42;
                var offset = circumference - (planProgress / 100) * circumference;
                html += '<div class="dashboard-hero-circle-wrap">';
                html += '<div class="dashboard-hero-circle">';
                html += '<svg viewBox="0 0 100 100">';
                html += '<defs><linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#4F46E5"/><stop offset="100%" stop-color="#818CF8"/></linearGradient></defs>';
                html += '<circle class="dashboard-plan-circle-bg" cx="50" cy="50" r="42"/>';
                html += '<circle class="dashboard-plan-circle-progress" cx="50" cy="50" r="42" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '"/>';
                html += '</svg>';
                html += '<div class="dashboard-hero-circle-text">';
                html += '<div class="dashboard-hero-circle-day">' + planProgress + '%</div>';
                html += '<div class="dashboard-hero-circle-label">完成度</div>';
                html += '</div>';
                html += '</div>';
                html += '</div>';
                html += '<div class="dashboard-hero-footer">';
                html += '<span>第 ' + currentDay + ' 天 / ' + planDays + ' 天</span>';
                html += '<span class="dashboard-plan-end">开始于 ' + formatDate((function(){ var p=getSprintPlan(); return p&&p.startDay?new Date(p.startDay):new Date(); })()) + '</span>';
                html += '</div>';
                html += '</div>';
                
                // ===== 第2个板块: 核心数据（4格卡片）=====
                html += '<div class="dashboard-overview">';
                // 大卡片1: 连续学习天数
                html += '<div class="dashboard-overview-card large streak-card shimmer-card">';
                html += '<div class="overview-icon" style="background:rgba(255,255,255,0.15);color:white">' + icons.flame + '</div>';
                html += '<div class="overview-num">' + streak.count + '</div>';
                html += '<div class="overview-label">连续学习天数</div>';
                html += '</div>';
                // 大卡片2: 预估分数
                html += '<div class="dashboard-overview-card large score-card shimmer-card">';
                html += '<div class="overview-icon" style="background:rgba(255,255,255,0.15);color:white">' + icons.target + '</div>';
                if (hasDimData) {
                    var passLine = 425;
                    var diff = passLine - estimatedScore;
                    html += '<div class="overview-num">' + estimatedScore + '分</div>';
                    html += '<div class="overview-label score-label">';
                    html += '<span class="pass-line">及格线' + passLine + '分</span>';
                    html += '<span class="diff ' + (diff > 0 ? 'diff-warning' : 'diff-pass') + '">' + (diff > 0 ? '还差' + diff + '分' : '已过线✓') + '</span>';
                    html += '</div>';
                } else {
                    html += '<div class="overview-num">--</div>';
                    html += '<div class="overview-label">预估分数<span class="overview-label-hint">完成诊断后解锁</span></div>';
                }
                html += '</div>';
                // 小卡片1: 今日练习
                html += '<div class="dashboard-overview-card small practice">';
                html += '<div class="overview-icon" style="background:rgba(16,185,129,0.08);color:#10B981">' + icons.pencil + '</div>';
                html += '<div class="overview-num">' + todayCount + '</div>';
                html += '<div class="overview-label">今日练习</div>';
                html += '</div>';
                // 小卡片2: 正确率
                html += '<div class="dashboard-overview-card small accuracy">';
                html += '<div class="overview-icon" style="background:rgba(79,70,229,0.08);color:#4F46E5">' + icons.check + '</div>';
                html += '<div class="overview-num">' + accuracy + '%</div>';
                html += '<div class="overview-label">总正确率</div>';
                html += '</div>';
                html += '</div>';
                
                // ===== 第3个板块: 五维能力分析（雷达图+趋势+薄弱项）=====
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
                    // 维度标签（带趋势箭头）
                    html += '<div class="dashboard-radar-dims">';
                    var dimNames = ['细节定位', '推理判断', '同义替换', '主旨归纳', '态度判断'];
                    dimNames.forEach(function(dim) {
                        var score = dims[dim] || 0;
                        var isWeak = weakDims.indexOf(dim) !== -1;
                        var trend = abilityTrend && abilityTrend[dim] ? abilityTrend[dim] : null;
                        var trendArrow = trend ? trend.arrow : '';
                        var trendClass = trend ? (trend.trend === 'up' ? ' trend-up' : (trend.trend === 'down' ? ' trend-down' : '')) : '';
                        html += '<div class="dashboard-radar-dim-tag' + (isWeak ? ' weak' : '') + '"' + (isWeak ? ' onclick="startDimPractice(\'' + dim + '\')"' : '') + '>';
                        html += '<span class="dashboard-radar-dim-name">' + dim + '</span>';
                        html += '<span class="dashboard-radar-dim-score">' + score + '<span class="trend-arrow' + trendClass + '">' + trendArrow + '</span></span>';
                        html += '</div>';
                    });
                    html += '</div>';
                    if (weakDims.length > 0) {
                        html += '<div class="dashboard-radar-weak-hint">点击薄弱维度开始专项练习 ↑</div>';
                    }
                } else {
                    html += '<div class="dashboard-radar-empty">';
                    html += '<div class="dashboard-radar-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/><line x1="12" y1="22" x2="12" y2="15.5"/><polyline points="22 8.5 12 15.5 2 8.5"/></svg></div>';
                    html += '<div class="dashboard-radar-empty-text">完成首次诊断后解锁<br>AI将分析你的五维能力</div>';
                    html += '</div>';
                }
                html += '</div>';
                
                // ===== 第4个板块: 学习趋势（正确率折线图）=====
                var hasTrendData = totalPractice > 0;
                html += '<div class="dashboard-trend-section glass-card">';
                html += '<div class="dashboard-trend-header">';
                html += '<div class="dashboard-trend-title">' + icons.trending + '学习趋势</div>';
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
                
                // ===== 第5个板块: 诊断报告历史 =====
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
                    html += '<div class="dashboard-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div>';
                    html += '<div style="font-size:14px;font-weight:600;color:#1a1a2e">暂无诊断记录</div>';
                    html += '<div style="font-size:12px;margin-top:4px;color:#64748b">完成AI诊断后即可查看报告</div>';
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
                if(c) c.innerHTML = '<div style="padding:40px 20px;text-align:center"><div style="font-size:40px;margin-bottom:12px">📊</div><div style="font-size:16px;font-weight:600">数据页面加载失败</div><div style="font-size:13px;color:#64748B;margin-top:8px">请刷新页面重试</div><div style="font-size:11px;color:#94A3B8;margin-top:4px;word-break:break-all">' + (e && e.message ? e.message : '') + '</div></div>';
            }
        }


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
                var data = localStorage.getItem(examKey('diagnosis_reports'));
                if (data) return JSON.parse(data);
                
                // 兼容旧数据：从cet_user中读取诊断数据作为最近一次报告
                var userData = safeGetItem(examKey('user'), {});
                if (userData && userData.diagnosis && userData.diagnosis.type) {
                    // 估算一个诊断日期
                    var diagDate = userData.diagnosedAt ? new Date(userData.diagnosedAt) : new Date();
                    var dateStr = (diagDate.getMonth() + 1) + '月' + diagDate.getDate() + '日';
                    
                    // 计算综合水平
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
                var data = localStorage.getItem(examKey('practice_history'));
                if (data) return JSON.parse(data);
                // 兼容旧数据
                var oldData = localStorage.getItem('cet_practice_history');
                if (oldData) return JSON.parse(oldData);
            } catch(e) {}
            return [];
        }
        
        function getAbilityScores() {
            try {
                var data = localStorage.getItem(examKey('ability_scores'));
                if (data) return JSON.parse(data);
                // 兼容旧数据: 从cet_user中读取诊断数据
                var userData = safeGetItem(examKey('user'), {});
                if (userData && userData.diagnosis) {
                    return { dims: userData.diagnosis };
                }
            } catch(e) {}
            return null;
        }
        

// ===== 能力变化趋势系统 =====
// 获取能力历史
function getAbilityHistory() {
    try {
        var data = localStorage.getItem(examKey('ability_history'));
        if (data) return JSON.parse(data);
    } catch(e) {}
    return [];
}

// 保存能力历史记录
function saveAbilityRecord(scores) {
    if (!scores || Object.keys(scores).length === 0) return;
    
    var history = getAbilityHistory();
    var today = new Date();
    var dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    
    // 检查今天是否已有记录
    var todayIndex = -1;
    for (var i = 0; i < history.length; i++) {
        if (history[i].date === dateStr) {
            todayIndex = i;
            break;
        }
    }
    
    // 转换维度名称（诊断数据中的名称可能不同）
    var convertedScores = {};
    var dimMapping = {
        '细节定位': '细节理解',
        '推理判断': '推理判断',
        '同义替换': '同义替换',
        '主旨归纳': '主旨归纳',
        '态度判断': '态度判断'
    };
    
    for (var key in scores) {
        var mappedKey = dimMapping[key] || key;
        convertedScores[mappedKey] = scores[key];
    }
    
    var record = {
        date: dateStr,
        scores: convertedScores
    };
    
    if (todayIndex >= 0) {
        history[todayIndex] = record;
    } else {
        history.push(record);
    }
    
    // 只保留最近30天
    if (history.length > 30) {
        history = history.slice(-30);
    }
    
    try {
        localStorage.setItem(examKey('ability_history'), JSON.stringify(history));
    } catch(e) {}
}

// 计算能力变化趋势
function getAbilityTrend() {
    var history = getAbilityHistory();
    if (history.length < 2) return null;
    
    // 取最后7天的数据
    var recentHistory = history.slice(-7);
    var trends = {};
    
    var dimKeys = ['细节理解', '推理判断', '同义替换', '主旨归纳', '态度判断'];
    
    dimKeys.forEach(function(dim) {
        var values = [];
        recentHistory.forEach(function(day) {
            if (day.scores && day.scores[dim] !== undefined) {
                values.push({ date: day.date, score: day.scores[dim] });
            }
        });
        
        if (values.length >= 2) {
            var first = values[0].score;
            var last = values[values.length - 1].score;
            var diff = last - first;
            
            var trend = 'stable';
            var arrow = '→';
            if (diff > 5) { trend = 'up'; arrow = '↑'; }
            else if (diff < -5) { trend = 'down'; arrow = '↓'; }
            
            trends[dim] = {
                current: last,
                previous: first,
                diff: diff,
                trend: trend,
                arrow: arrow
            };
        } else if (values.length === 1) {
            trends[dim] = {
                current: values[0].score,
                previous: values[0].score,
                diff: 0,
                trend: 'stable',
                arrow: '→'
            };
        }
    });
    
    return trends;
}

// 在练习提交时记录正确率
// 需要在 showQuizStats 函数中添加调用


        function getUserProfile() {
            try {
                var data = localStorage.getItem(examKey('user_profile'));
                if (data) return JSON.parse(data);
                // 兼容旧数据
                var userData = safeGetItem(examKey('user'), {});
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
            if (dateStr instanceof Date) {
                return (dateStr.getMonth()+1) + '月' + dateStr.getDate() + '日';
            }
            var parts = String(dateStr).split('-');
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
            var data=state.userData||{};
            var data=state.userData||{};
            mode = mode || 'companion';
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
            
            // 更新模式说明
            updateModeDesc(mode);
            
            // 初始化快捷chips
            initChatChips(mode);
            
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
            
            // 更新模式说明
            updateModeDesc(mode);
            
            // 初始化快捷chips
            initChatChips(mode);
            
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
            
            // 更新模式说明
            updateModeDesc(mode);
            
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
                    '<div class="custom-chip-card" onclick="sendSuggestion(this.dataset.msg)" data-msg="我的阅读成绩很差怎么办"><span class="chip-card-icon" style="background:linear-gradient(135deg,#00B894,#55EFC4)">📖</span><span class="chip-card-text">阅读突破</span></div>' +
                    '<div class="custom-chip-card" onclick="sendSuggestion(this.dataset.msg)" data-msg="听力听不懂怎么练"><span class="chip-card-icon" style="background:linear-gradient(135deg,#FDCB6E,#F39C12)">🎧</span><span class="chip-card-text">听力技巧</span></div>' +
                    '<div class="custom-chip-card" onclick="sendSuggestion(this.dataset.msg)" data-msg="写作翻译怎么复习"><span class="chip-card-icon" style="background:linear-gradient(135deg,#E17055,#D63031)">✍️</span><span class="chip-card-text">写译方法</span></div>' +
                    '<div class="custom-chip-card" onclick="sendSuggestion(this.dataset.msg)" data-msg="高频词汇有哪些"><span class="chip-card-icon" style="background:linear-gradient(135deg,#FDCB6E,#E17055)">📚</span><span class="chip-card-text">高频词汇</span></div>' +
                    '<div class="custom-chip-card" onclick="sendSuggestion(this.dataset.msg)" data-msg="有什么高效的备考技巧"><span class="chip-card-icon" style="background:linear-gradient(135deg,#A29BFE,#6C5CE7)">💡</span><span class="chip-card-text">备考技巧</span></div>' +
                    '</div>';
                chips.style.display = '';
                return;
            }
            
            // 陪练模式：6个快捷按钮
            var chipsHtml = '' +
                '<div class="chip-grid">' +
                '<div class="custom-chip-card" onclick="sendSuggestion(this.dataset.msg)" data-msg="今天练什么好"><span class="chip-card-icon" style="background:linear-gradient(135deg,#6C5CE7,#A29BFE)">📋</span><span class="chip-card-text">今日练习</span></div>' +
                '<div class="custom-chip-card" onclick="sendSuggestion(this.dataset.msg)" data-msg="给我出一道听力题"><span class="chip-card-icon" style="background:linear-gradient(135deg,#E84393,#FD79A8)">🎧</span><span class="chip-card-text">听力训练</span></div>' +
                '<div class="custom-chip-card" onclick="sendSuggestion(this.dataset.msg)" data-msg="请帮我批改作文，请先让我发送作文题目"><span class="chip-card-icon" style="background:linear-gradient(135deg,#00B894,#55EFC4)">✍️</span><span class="chip-card-text">批改作文</span></div>' +
                '<div class="custom-chip-card" onclick="sendSuggestion(this.dataset.msg)" data-msg="请根据我的近期错题，分析我的薄弱模式和改进方向"><span class="chip-card-icon" style="background:linear-gradient(135deg,#FDCB6E,#F39C12)">📊</span><span class="chip-card-text">错题分析</span></div>' +
                '<div class="custom-chip-card" onclick="sendSuggestion(this.dataset.msg)" data-msg="给我一段中文，让我翻译成英文"><span class="chip-card-icon" style="background:linear-gradient(135deg,#00CEC9,#81ECEC)">📝</span><span class="chip-card-text">翻译练习</span></div>' +
                '<div class="custom-chip-card" onclick="sendSuggestion(this.dataset.msg)" data-msg="给我一个今天就能用上的四级考试具体技巧，要有操作步骤"><span class="chip-card-icon" style="background:linear-gradient(135deg,#A29BFE,#6C5CE7)">💡</span><span class="chip-card-text">今日技巧</span></div>' +
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
            // Use marked.js for full Markdown rendering
            if (typeof marked !== 'undefined') {
                try {
                    marked.setOptions({ breaks: true, gfm: true });
                    var html = marked.parse(text);
                    return html;
                } catch(e) {
                    console.warn('marked.js render failed, fallback', e);
                }
            }
            // Fallback: simple formatting
            var html = escapeHtml(text);
            html = html.replace(/\*\*(.+?)\*\*/g, '<strong></strong>');
            html = html.split('\n\n').map(function(p) { return '<p>' + p.replace(/\n/g, '<br>') + '</p>'; }).join('');
            if (!html.startsWith('<p>')) html = '<p>' + html + '</p>';
            return html;
        }


        // ===== 词汇诊断系统 =====
        var vocabData = null;

        // 加载词汇数据
        function loadVocabData() {
            return new Promise(function(resolve, reject) {
                if (vocabData) {
                    resolve(vocabData);
                    return;
                }
                var vocabFile = '/public/cet' + (IS_CET6 ? '6' : '4') + '_vocab.json';
                fetch(vocabFile + '?v=' + Date.now())
                    .then(function(response) { return response.json(); })
                    .then(function(data) {
                        vocabData = data;
                        resolve(data);
                    })
                    .catch(function(err) {
                        console.error('加载词汇数据失败:', err);
                        reject(err);
                    });
            });
        }

        // 从错题本提取高频词
        function extractWrongWords() {
            var wrongQuestions = safeGetItem(examKey('wrong_questions'), []);
            var wordFreq = {};
            
            wrongQuestions.forEach(function(q) {
                var words = (q.question || '').match(/[a-zA-Z]{4,}/g) || [];
                words.forEach(function(w) {
                    w = w.toLowerCase();
                    wordFreq[w] = (wordFreq[w] || 0) + 1;
                });
            });
            
            // 排序并取前20个
            var sorted = Object.keys(wordFreq)
                .map(function(w) { return { word: w, freq: wordFreq[w] }; })
                .sort(function(a, b) { return b.freq - a.freq; })
                .slice(0, 20);
            
            return sorted;
        }

        // 获取诊断报告中的薄弱维度
        function getWeakDimensions() {
            var profile = safeGetItem(examKey('user_profile'), {});
            var radar = profile.radar || { '细节定位': 0, '推理判断': 0, '同义替换': 0, '主旨归纳': 0, '态度判断': 0 };
            
            // 找出得分最低的维度
            var weakDims = Object.keys(radar)
                .filter(function(k) { return radar[k] < 70; })
                .sort(function(a, b) { return radar[a] - radar[b]; });
            
            return weakDims.slice(0, 3);
        }

        // 获取维度对应的高频词
        function getDimensionWords(dimension) {
            if (!vocabData) return [];
            var dimMap = {
                '细节定位': 'detail_words',
                '推理判断': 'inference_words',
                '同义替换': 'synonym_words',
                '主旨归纳': 'main_idea_words',
                '态度判断': 'attitude_words'
            };
            var key = dimMap[dimension];
            return key && vocabData[key] ? vocabData[key].slice(0, 15) : [];
        }

        // Web Speech API 发音
        function speakWord(word) {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                var utterance = new SpeechSynthesisUtterance(word);
                utterance.lang = 'en-US';
                utterance.rate = 0.85;
                utterance.pitch = 1;
                window.speechSynthesis.speak(utterance);
            }
        }

        // 渲染词汇诊断页面
        function renderVocab() {
            var container = document.getElementById('vocab-content');
            if (!container) return;
            
            container.innerHTML = '<div class="vocab-loading"><div class="vocab-loading-spinner"></div><div>正在分析...</div></div>';
            
            loadVocabData().then(function() {
                var wrongWords = extractWrongWords();
                var weakDims = getWeakDimensions();
                
                var html = '';
                
                // Hero区域
                html += '<div class="vocab-hero">';
                html += '<div class="vocab-hero-title">📖 词汇诊断</div>';
                html += '<div class="vocab-hero-subtitle">基于你的错题本，智能分析高频词汇</div>';
                html += '</div>';
                
                // 统计信息
                html += '<div class="vocab-section">';
                html += '<div class="vocab-stats">';
                html += '<div class="vocab-stat-item"><div class="vocab-stat-num">' + wrongWords.length + '</div><div class="vocab-stat-label">高频错题词</div></div>';
                html += '<div class="vocab-stat-item"><div class="vocab-stat-num">' + weakDims.length + '</div><div class="vocab-stat-label">薄弱维度</div></div>';
                html += '</div>';
                html += '</div>';
                
                // 薄弱维度标签
                if (weakDims.length > 0) {
                    html += '<div class="vocab-section">';
                    html += '<div class="vocab-section-title">💡 推荐强化 <span class="badge">薄弱项优先</span></div>';
                    html += '<div class="dimension-tags">';
                    weakDims.forEach(function(dim) {
                        html += '<div class="dimension-tag weak active" onclick="renderDimensionWords(\'' + dim + '\')">' + dim + '</div>';
                    });
                    html += '<div class="dimension-tag" onclick="renderAllDimensionWords()">全部维度</div>';
                    html += '</div>';
                    html += '<div id="dimension-words-list"></div>';
                    html += '</div>';
                }
                
                // 错题本高频词
                if (wrongWords.length > 0) {
                    html += '<div class="vocab-section">';
                    html += '<div class="vocab-section-title">📝 错题高频词 <span class="badge">Top ' + wrongWords.length + '</span></div>';
                    
                    wrongWords.forEach(function(item) {
                        html += '<div class="word-card">';
                        html += '<div class="word-header">';
                        html += '<div>';
                        html += '<span class="word-text">' + item.word + '</span>';
                        html += '</div>';
                        html += '<button class="word-speak-btn" onclick="speakWord(\'' + item.word + '\')">';
                        html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
                        html += '</button>';
                        html += '</div>';
                        html += '<div class="word-meaning">出现频次: ' + item.freq + ' 次</div>';
                        html += '<div class="word-source"><span>来自错题本</span></div>';
                        html += '</div>';
                    });
                    html += '</div>';
                } else {
                    html += '<div class="vocab-section">';
                    html += '<div class="vocab-empty">';
                    html += '<div class="vocab-empty-icon">📚</div>';
                    html += '<div class="vocab-empty-text">还没有错题记录<br>先去做几道题，我来帮你诊断</div>';
                    html += '</div>';
                    html += '</div>';
                }
                
                // 百词斩推荐
                html += '<a class="vocab-bai-link" href="https://www.baicizhan.com" target="_blank">';
                html += '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
                html += '推荐用百词斩巩固这些词 →';
                html += '</a>';
                
                container.innerHTML = html;
                
                // 渲染第一个薄弱维度的词
                if (weakDims.length > 0) {
                    renderDimensionWords(weakDims[0]);
                }
            }).catch(function(err) {
                container.innerHTML = '<div class="vocab-empty"><div class="vocab-empty-icon">⚠️</div><div class="vocab-empty-text">加载词汇数据失败，请刷新重试</div></div>';
            });
        }

        // 渲染特定维度的高频词
        function renderDimensionWords(dimension) {
            var container = document.getElementById('dimension-words-list');
            if (!container) return;
            
            // 更新标签状态
            document.querySelectorAll('.dimension-tag').forEach(function(tag) {
                tag.classList.remove('active');
                if (tag.textContent.trim() === dimension) {
                    tag.classList.add('active');
                }
            });
            
            var words = getDimensionWords(dimension);
            var html = '';
            
            words.forEach(function(item) {
                html += '<div class="word-card">';
                html += '<div class="word-header">';
                html += '<div>';
                html += '<span class="word-text">' + item.word + '</span>';
                html += '<span class="word-phonetic">' + item.phonetic + '</span>';
                html += '</div>';
                html += '<button class="word-speak-btn" onclick="speakWord(\'' + item.word + '\')">';
                html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
                html += '</button>';
                html += '</div>';
                html += '<div class="word-meaning">' + item.meaning + '</div>';
                html += '<div class="word-example">' + item.example + '</div>';
                html += '<div class="word-example-cn">' + item.example_cn + '</div>';
                html += '<div class="word-source"><span>' + dimension + '</span></div>';
                html += '</div>';
            });
            
            container.innerHTML = html;
        }

        // 渲染全部维度的高频词
        function renderAllDimensionWords() {
            var container = document.getElementById('dimension-words-list');
            if (!container || !vocabData) return;
            
            document.querySelectorAll('.dimension-tag').forEach(function(tag) {
                tag.classList.remove('active');
                if (tag.textContent.trim() === '全部维度') {
                    tag.classList.add('active');
                }
            });
            
            var dimensions = ['细节定位', '推理判断', '同义替换', '主旨归纳', '态度判断'];
            var dimMap = { '细节定位': 'detail_words', '推理判断': 'inference_words', '同义替换': 'synonym_words', '主旨归纳': 'main_idea_words', '态度判断': 'attitude_words' };
            var html = '';
            
            dimensions.forEach(function(dim) {
                var key = dimMap[dim];
                var words = vocabData[key] ? vocabData[key].slice(0, 5) : [];
                
                if (words.length > 0) {
                    html += '<div style="margin-bottom:12px;font-weight:600;color:#6C5CE7;font-size:13px;">' + dim + '</div>';
                    words.forEach(function(item) {
                        html += '<div class="word-card">';
                        html += '<div class="word-header">';
                        html += '<div>';
                        html += '<span class="word-text">' + item.word + '</span>';
                        html += '<span class="word-phonetic">' + item.phonetic + '</span>';
                        html += '</div>';
                        html += '<button class="word-speak-btn" onclick="speakWord(\'' + item.word + '\')">';
                        html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
                        html += '</button>';
                        html += '</div>';
                        html += '<div class="word-meaning">' + item.meaning + '</div>';
                        html += '</div>';
                    });
                }
            });
            
            container.innerHTML = html;
        }

        // 词汇诊断页面切换时渲染
        var _originalSwitchTab = switchTab;
        switchTab = function(tab) {
            if (tab === 'vocab') {
                renderVocab();
            }
            _originalSwitchTab(tab);
        };
        // 暴露关键函数到全局作用域（HTML onclick需要）
        window.switchTab = switchTab;

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
            // 记录打卡日期列表
            if (!streak.checkedDates) streak.checkedDates = [];
            if (streak.checkedDates.indexOf(today) === -1) {
                streak.checkedDates.push(today);
                // 只保留最近30天
                if (streak.checkedDates.length > 30) streak.checkedDates = streak.checkedDates.slice(-30);
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
                    var profile = safeGetItem(examKey('user_profile'), {});
                    if (!profile.startDate) {
                        profile.startDate = today;
                        localStorage.setItem(examKey('user_profile'), JSON.stringify(profile));
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
                // 使用打卡日期列表判断
                if (streak.checkedDates && streak.checkedDates.indexOf(dateStr) !== -1) isChecked = true;
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
            // 同步首页右上角和底部栏的streak数字
            var streakNum = document.getElementById('streak-num');
            if (streakNum) streakNum.textContent = streak.count;
            var homeBarStreak = document.getElementById('home-bar-streak');
            if (homeBarStreak) homeBarStreak.textContent = streak.count;
        }

        
        
        // ===== 每日任务卡系统 =====
        // 今日任务存储key
        function getDailyTasksKey() {
            var today = new Date();
            var dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            return examKey('daily_tasks_' + dateStr);
        }
        
        // 获取今日任务
        function getTodayTasks() {
            try {
                var data = localStorage.getItem(getDailyTasksKey());
                if (data) return JSON.parse(data);
            } catch(e) {}
            return null;
        }
        
        // 保存今日任务
        function saveTodayTasks(tasks) {
            try {
                localStorage.setItem(getDailyTasksKey(), JSON.stringify(tasks));
            } catch(e) {}
        }
        // ===== 今日待办卡片 - 从 cet_today_tasks 读取 =====
        function getTodayTaskData() {
            try {
                var data = localStorage.getItem('cet_today_tasks');
                if (!data) return null;
                var taskData = JSON.parse(data);
                var today = getTodayStr();
                // 如果日期不是今天，返回 null
                if (taskData.date !== today) return null;
                return taskData;
            } catch(e) {
                return null;
            }
        }
        
        // 获取任务类型图标
        function getTaskTypeIcon(type) {
            var icons = {
                'quiz': '📝',
                'essay': '✍️',
                'translation': '🔄',
                'review': '📖',
                'chat': '💬',
                'listening': '🎧',
                'vocab': '📚'
            };
            return icons[type] || '📋';
        }
        
        // 获取任务类型名称
        function getTaskTypeName(type) {
            var names = {
                'quiz': '练习',
                'essay': '作文',
                'translation': '翻译',
                'review': '复习',
                'chat': '对话',
                'listening': '听力',
                'vocab': '词汇'
            };
            return names[type] || '任务';
        }
        
        // 渲染今日待办卡片
        function renderTodayTaskCard() {
            var card = document.getElementById('today-task-card');
            if (!card) return;
            
            var taskData = getTodayTaskData();
            var listContainer = document.getElementById('today-task-list');
            var progressEl = document.getElementById('today-task-progress');
            var doneEl = document.getElementById('today-task-all-done');
            var emptyEl = document.getElementById('today-task-empty');
            
            if (!listContainer || !progressEl) return;
            
            // 如果没有任务数据，隐藏整个卡片（不占位）
            if (!taskData || !taskData.tasks || taskData.tasks.length === 0) {
                card.style.display = 'none';
                return;
            }
            
            // 显示卡片
            card.style.display = 'block';
            if (emptyEl) emptyEl.style.display = 'none';
            
            var tasks = taskData.tasks;
            var completedCount = tasks.filter(function(t) { return t.completed; }).length;
            var totalCount = tasks.length;
            var allCompleted = completedCount === totalCount;
            
            // 更新进度
            progressEl.textContent = completedCount + '/' + totalCount;
            
            // 渲染任务列表
            var html = '';
            tasks.forEach(function(task, idx) {
                var isCompleted = task.completed;
                var icon = getTaskTypeIcon(task.type);
                var typeName = getTaskTypeName(task.type);
                
                html += '<div class="today-task-item' + (isCompleted ? ' completed' : '') + '" ';
                html += 'data-task-id="' + task.id + '" ';
                html += 'data-task-type="' + task.type + '" ';
                html += 'data-task-dim="' + (task.dim || '') + '" ';
                html += 'onclick="handleTodayTaskClick(' + task.id + ', \'' + task.type + '\', \'' + (task.dim || '') + '\', ' + isCompleted + ')"';
                html += '>';
                html += '<div class="today-task-icon' + (isCompleted ? ' completed' : '') + '">' + (isCompleted ? '✓' : icon) + '</div>';
                html += '<div class="today-task-text' + (isCompleted ? ' completed' : '') + '">' + task.title + '</div>';
                if (task.dim) {
                    html += '<div class="today-task-dim">' + task.dim + '</div>';
                }
                html += '</div>';
            });
            
            listContainer.innerHTML = html;
            
            // 如果全部完成，显示鼓励文案
            if (doneEl) {
                doneEl.style.display = allCompleted ? 'block' : 'none';
            }
        }
        
        // ===== 首页待复习错题提醒 =====
        function renderHomeReviewReminder() {
            var reminder = document.getElementById('home-review-reminder');
            if (!reminder) return;
            
            var overdueCount = typeof getOverdueReviewCount === 'function' ? getOverdueReviewCount() : 0;
            var titleEl = document.getElementById('home-review-title');
            var descEl = document.getElementById('home-review-desc');
            
            if (overdueCount > 0) {
                reminder.style.display = 'flex';
                if (titleEl) titleEl.textContent = '📖 待复习错题';
                if (descEl) descEl.textContent = '有 ' + overdueCount + ' 道错题到了复习时间';
            } else {
                reminder.style.display = 'none';
            }
        }
        
        // 检查是否需要显示打开APP时的toast提醒
        function checkReviewToastReminder() {
            var overdueCount = typeof getOverdueReviewCount === 'function' ? getOverdueReviewCount() : 0;
            if (overdueCount <= 3) return; // 少于等于3道不提醒
            
            var today = new Date().toDateString();
            var lastRemindDate = localStorage.getItem('cet_review_remind_date');
            
            // 每天只提醒一次
            if (lastRemindDate === today) return;
            
            localStorage.setItem('cet_review_remind_date', today);
            
            setTimeout(function() {
                if (typeof showToast === 'function') {
                    showToast('📖 你有 ' + overdueCount + ' 道错题该复习了');
                }
            }, 1500);
        }
        
        // 处理今日任务点击
        function handleTodayTaskClick(taskId, taskType, taskDim, isCompleted) {
            // 如果已完成，无操作
            if (isCompleted) return;
            
            // 根据任务类型执行对应操作
            switch(taskType) {
                case 'quiz':
                    // 跳转到诊断页并开始练习
                    switchTab('diagnosis');
                    if (taskDim) {
                        setTimeout(function() {
                            if (typeof startPractice === 'function') {
                                startPractice([taskDim]);
                            }
                        }, 300);
                    }
                    break;
                case 'essay':
                    // 打开作文批改
                    if (typeof openEssayOverlay === 'function') {
                        openEssayOverlay();
                    } else {
                        switchTab('diagnosis');
                        setTimeout(function() {
                            if (typeof sendSuggestion === 'function') {
                                sendSuggestion('帮我批改作文');
                            }
                        }, 300);
                    }
                    break;
                case 'translation':
                    // 打开翻译练习
                    switchTab('diagnosis');
                    setTimeout(function() {
                        if (typeof sendSuggestion === 'function') {
                            sendSuggestion('翻译练习');
                        }
                    }, 300);
                    break;
                case 'review':
                    // 跳转到错题本
                    switchTab('wrongbook');
                    break;
                case 'chat':
                    // 打开聊天
                    switchTab('diagnosis');
                    if (taskDim) {
                        setTimeout(function() {
                            if (typeof sendSuggestion === 'function') {
                                sendSuggestion(taskDim);
                            }
                        }, 300);
                    }
                    break;
                case 'listening':
                    // 打开听力练习
                    switchTab('diagnosis');
                    setTimeout(function() {
                        if (typeof sendSuggestion === 'function') {
                            sendSuggestion('听力练习');
                        }
                    }, 300);
                    break;
                case 'vocab':
                    // 打开词汇诊断
                    switchTab('vocab');
                    break;
                default:
                    // 默认跳转到诊断页
                    switchTab('diagnosis');
            }
        }
        
        // 生成今日学习计划（跳转到聊天让AI生成）
        function generateTodayPlan() {
            switchTab('diagnosis');
            setTimeout(function() {
                if (typeof sendSuggestion === 'function') {
                    sendSuggestion('帮我生成今日学习计划');
                }
            }, 300);
        }

        
        // 生成每日任务
        function generateDailyTasks() {
            var data = state.userData || {};
            var hasDiag = data.personality || (data.diagnosis && data.diagnosis.type);
            var overdueCount = typeof getOverdueReviewCount === 'function' ? getOverdueReviewCount() : 0;
            
            var abilityScores = getAbilityScores();
            var dims = abilityScores && abilityScores.dims ? abilityScores.dims : {};
            
            var tasks = [];
            
            // 1. 未做过诊断 -> 完成AI诊断
            if (!hasDiag) {
                tasks.push({
                    id: 'diagnosis',
                    text: '完成3分钟AI诊断',
                    time: '3min',
                    action: "switchTab('diagnosis');setTimeout(function(){startNewDiagnosis();},300)",
                    checkType: 'diagnosis'
                });
                return tasks;
            }
            
            // 2. 有待复习错题 -> 复习错题
            if (overdueCount > 0) {
                tasks.push({
                    id: 'review',
                    text: '复习' + overdueCount + '道到期错题',
                    time: '5min',
                    action: 'showWrongBook()',
                    checkType: 'review'
                });
            }
            
            // 3. 某维度正确率<60% 或耗时过高 -> 专项练习
            var dimConfigs = {
                '细节定位': { label: '细节理解', score: dims['细节定位'] || 0 },
                '推理判断': { label: '推理判断', score: dims['推理判断'] || 0 },
                '同义替换': { label: '同义替换', score: dims['同义替换'] || 0 },
                '主旨归纳': { label: '主旨归纳', score: dims['主旨归纳'] || 0 },
                '态度判断': { label: '态度判断', score: dims['态度判断'] || 0 }
            };
            
            // 获取耗时数据
            var abilityScores = getAbilityScores();
            var dimTimes = abilityScores && abilityScores.dimTimes ? abilityScores.dimTimes : {};
            
            // 计算平均耗时
            var totalTime = 0;
            var timeCount = 0;
            Object.keys(dimTimes).forEach(function(dim) {
                totalTime += dimTimes[dim];
                timeCount++;
            });
            var avgTime = timeCount > 0 ? totalTime / timeCount : 60;
            
            var weakDims = [];
            for (var dim in dimConfigs) {
                var baseScore = dimConfigs[dim].score;
                var timeSpent = dimTimes[dim] || 0;
                
                // 如果耗时超过平均的1.5倍，也视为薄弱项
                var isTimeWeak = timeSpent > 0 && avgTime > 0 && timeSpent > avgTime * 1.5;
                
                if ((baseScore > 0 && baseScore < 60) || isTimeWeak) {
                    // 耗时过长的维度降低评分优先级
                    var adjustedScore = isTimeWeak && baseScore >= 60 ? baseScore - 10 : baseScore;
                    weakDims.push({ key: dim, label: dimConfigs[dim].label, score: adjustedScore, timeWeak: isTimeWeak });
                }
            }
            
            if (weakDims.length > 0) {
                var weakDim = weakDims[0];
                tasks.push({
                    id: 'dim_' + weakDim.key,
                    text: '专项练' + weakDim.label + '(' + weakDim.score + '%)',
                    time: '10min',
                    action: "openQuizWithDim('" + weakDim.key + "')",
                    checkType: 'quiz',
                    checkDim: weakDim.key
                });
            }
            
            // 4. 听力弱 -> 听力训练
            var listeningScore = dims['听力'] || 0;
            var hasListeningDim = Object.keys(dims).indexOf('听力') !== -1;
            if (hasListeningDim && listeningScore > 0 && listeningScore < 50) {
                tasks.push({
                    id: 'listening',
                    text: '听力训练1组',
                    time: '10min',
                    action: "switchTab('chat');setTimeout(function(){sendSuggestion('陪我练" + EXAM_LABEL + "听力');},300)",
                    checkType: 'listening'
                });
            }
            
            // 5. 作文未练 -> 写1篇作文
            var essayKey = examKey('essay_practiced_' + new Date().toISOString().split('T')[0]);
            var essayPracticed = localStorage.getItem(essayKey);
            if (!essayPracticed) {
                tasks.push({
                    id: 'essay',
                    text: '写1篇作文AI批改',
                    time: '15min',
                    action: 'openEssayOverlay()',
                    checkType: 'essay'
                });
            }
            
            // 默认：每日一练
            if (tasks.length === 0) {
                tasks.push({
                    id: 'daily',
                    text: '每日一练5道',
                    time: '10min',
                    action: 'openQuiz()',
                    checkType: 'quiz'
                });
            }
            
            return tasks.slice(0, 3); // 最多3个任务
        }
        
        // ===== CET每日任务系统（计划tab使用） =====
        function getCETTodayTasks() {
            try {
                var data = localStorage.getItem('cet_today_tasks');
                if (!data) return null;
                var parsed = JSON.parse(data);
                // 检查日期
                var today = new Date().toISOString().split('T')[0];
                if (parsed.date !== today) return null;
                return parsed;
            } catch(e) { return null; }
        }
        
        function saveCETTodayTasks(taskData) {
            localStorage.setItem('cet_today_tasks', JSON.stringify(taskData));
        }
        
        function markCETTaskComplete(taskId) {
            var data = getCETTodayTasks();
            if (!data || !data.tasks) return false;
            var found = false;
            data.tasks.forEach(function(task) {
                if (task.id === taskId && !task.completed) {
                    task.completed = true;
                    task.completedAt = Date.now();
                    found = true;
                }
            });
            if (found) saveCETTodayTasks(data);
            return found;
        }
        
        // 标记任务完成
        function markTaskComplete(taskId) {
            var tasks = getTodayTasks();
            if (!tasks) return;
            
            tasks.forEach(function(task) {
                if (task.id === taskId) {
                    task.completed = true;
                    task.completedAt = Date.now();
                }
            });
            
            saveTodayTasks(tasks);
            updateDailyTaskCard();
            
            // 同时标记CET任务系统中的任务完成
            // quiz类型任务 -> 找第一个quiz类型的未完成任务
            if (taskId === 'quiz' || (typeof taskId === 'string' && taskId.startsWith('dim_'))) {
                var cetTaskData = getCETTodayTasks();
                if (cetTaskData && cetTaskData.tasks) {
                    cetTaskData.tasks.forEach(function(task) {
                        if (task.type === 'quiz' && !task.completed) {
                            // 找到quiz类型任务，标记完成
                            var marked = markCETTaskComplete(task.id);
                            if (marked) {
                                console.log('[CET任务] 标记quiz任务完成:', task.title);
                            }
                        }
                    });
                }
            }
        }
        
        // 初始化或更新任务卡
        function initDailyTasks() {
            var tasks = getTodayTasks();
            if (!tasks) {
                tasks = generateDailyTasks();
                saveTodayTasks(tasks);
            }
            return tasks;
        }
        
        // 更新每日任务卡UI
        function updateDailyTaskCard() {
            var card = document.getElementById('daily-task-card');
            if (!card) return;
            
            var tasks = getTodayTasks() || generateDailyTasks();
            saveTodayTasks(tasks);
            
            var container = document.getElementById('daily-task-list');
            if (!container) return;
            
            var completedCount = tasks.filter(function(t) { return t.completed; }).length;
            var allCompleted = completedCount === tasks.length;
            
            // 更新完成状态
            var headerEl = card.querySelector('.daily-task-card-header');
            if (headerEl) {
                var badgeEl = headerEl.querySelector('.daily-task-complete-badge');
                if (badgeEl) {
                    if (allCompleted) {
                        badgeEl.textContent = '🎉';
                        badgeEl.style.display = 'inline-flex';
                    } else {
                        badgeEl.textContent = completedCount + '/' + tasks.length;
                        badgeEl.style.display = 'inline-flex';
                    }
                }
            }
            
            // 渲染任务列表
            var html = '';
            tasks.forEach(function(task, idx) {
                var checked = task.completed ? 'checked' : '';
                var opacity = task.completed ? 'style="opacity:0.6"' : '';
                html += '<div class="daily-task-item" ' + opacity + ' data-task-id="' + task.id + '" onclick="handleDailyTaskClick(\'' + task.id + '\')">';
                html += '<div class="daily-task-checkbox ' + checked + '">' + (task.completed ? '✓' : (idx + 1)) + '</div>';
                html += '<div class="daily-task-text' + (task.completed ? ' completed' : '') + '">' + task.text + '</div>';
                html += '<div class="daily-task-time">' + task.time + '</div>';
                html += '</div>';
            });
            
            container.innerHTML = html;
            
            // 如果全部完成，显示完成提示
            var doneEl = card.querySelector('.daily-task-all-done');
            if (doneEl) {
                doneEl.style.display = allCompleted ? 'block' : 'none';
            }
        }
        
        // 处理任务点击
        function handleDailyTaskClick(taskId) {
            var tasks = getTodayTasks() || [];
            var task = tasks.find(function(t) { return t.id === taskId; });
            if (!task || task.completed) return;
            
            // 执行任务动作
            eval(task.action);
        }


        // ===== 教练大脑 - 智能训练建议 =====
        // 返回值: { show: bool, title: string, sub: string, action: string, actionText: string, goto: string }
        function getCoachAdvice() {
            var data = state.userData || {};
            var examDate = new Date('2026-06-13');
            var now = new Date();
            var diffDays = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
            
            // 获取能力分数
            var abilityScores = getAbilityScores();
            var dims = abilityScores && abilityScores.dims ? abilityScores.dims : {};
            
            // 计算阅读相关维度平均分（细节定位+推理判断+同义替换+主旨归纳）
            var readingAvg = 0;
            var readingDims = ['细节定位', '推理判断', '同义替换', '主旨归纳'];
            var readingDimCount = 0;
            readingDims.forEach(function(dim) {
                if (dims[dim] !== undefined) {
                    readingAvg += dims[dim];
                    readingDimCount++;
                }
            });
            if (readingDimCount > 0) readingAvg = Math.round(readingAvg / readingDimCount);
            
            // 判断是否做过诊断
            var hasDiag = data.personality || (data.diagnosis && data.diagnosis.type);
            
            // 获取待复习错题数
            var overdueCount = typeof getOverdueReviewCount === 'function' ? getOverdueReviewCount() : 0;
            
            // 获取听力分数
            var listeningScore = dims['听力'] || 0;
            var isWeakListening = listeningScore > 0 && listeningScore < 50;
            
            // 优先级判断
            var examLabel = '四级';
            try { var userData = safeGetItem(examKey('user'), {}); if (userData.isCet6) examLabel = '六级'; } catch(e) {}
            
            // 1. 没做过诊断
            if (!hasDiag) {
                return {
                    show: true,
                    title: '3分钟看看你哪里弱',
                    sub: '找到' + examLabel + '备考的突破口',
                    action: "sendSuggestion('我想做一个AI诊断，帮我分析" + examLabel + "薄弱点')",
                    actionText: '开始诊断',
                    goto: 'diagnosis'
                };
            }
            
            // 2. 有待复习错题
            if (overdueCount > 0) {
                return {
                    show: true,
                    title: '你有' + overdueCount + '道错题到复习时间了',
                    sub: '艾宾浩斯记忆法，科学巩固薄弱点',
                    action: 'showWrongBook()',
                    actionText: '去复习',
                    goto: 'wrongbook'
                };
            }
            
            // 3. 距考试<7天 - 考前冲刺
            if (diffDays < 7 && diffDays > 0) {
                return {
                    show: true,
                    title: '考前冲刺！做一套限时训练',
                    sub: '模拟真实考试环境，提升应试能力',
                    action: 'openTimedPractice()',
                    actionText: '开始',
                    goto: 'timed'
                };
            }
            
            // 4. 距考试<30天 + 阅读正确率<60%
            if (diffDays < 30 && diffDays > 0 && readingAvg > 0 && readingAvg < 60) {
                return {
                    show: true,
                    title: '今天练限时阅读 ⚡ 正确率才' + readingAvg + '%',
                    sub: '阅读是你的薄弱项，需要重点突破',
                    action: 'openTimedReading()',
                    actionText: '开始训练',
                    goto: 'reading'
                };
            }
            
            // 5. 距考试<30天 + 听力弱
            if (diffDays < 30 && diffDays > 0 && isWeakListening) {
                return {
                    show: true,
                    title: '今天练听力 ⚡',
                    sub: '听力较弱，需要加强练习',
                    action: "sendSuggestion('陪我练" + examLabel + "听力')",
                    actionText: '听力训练',
                    goto: 'listening'
                };
            }
            
            // 6. 距考试>=30天
            if (diffDays >= 30) {
                return {
                    show: true,
                    title: '先做诊断，了解你的薄弱点',
                    sub: examLabel + '备考是个系统工程',
                    action: "sendSuggestion('我想做一个AI诊断，帮我分析" + examLabel + "薄弱点')",
                    actionText: '开始诊断',
                    goto: 'diagnosis'
                };
            }
            
            // 7. 默认
            return {
                show: true,
                title: '今天练一练',
                sub: '保持手感，持续进步',
                action: 'openDailyTask()',
                actionText: '开始练习',
                goto: 'practice'
            };
        }
        
        // 处理教练引导卡片点击
        function handleCoachGuideClick() {
            var advice = getCoachAdvice();
            if (advice && advice.goto) {
                switch(advice.goto) {
                    case 'diagnosis':
                        // 跳转到诊断页并触发诊断
                        switchTab('diagnosis');
                        setTimeout(function(){ sendSuggestion('我想做一个AI诊断，帮我分析' + EXAM_LABEL + '薄弱点'); }, 300);
                        break;
                    case 'wrongbook':
                        showWrongBook();
                        break;
                    case 'timed':
                        openTimedPractice();
                        break;
                    case 'reading':
                        openTimedReading();
                        break;
                    case 'listening':
                        switchTab('chat');
                        sendSuggestion('陪我练四级听力');
                        break;
                    case 'practice':
                    default:
                        openDailyTask();
                        break;
                }
            }
        }
        
function updateHomeStatus() {
            var data = state.userData || {};
            var homeCountdown = document.getElementById('home-countdown');
            var examDate = new Date('2026-06-13');
            var now = new Date();
            var diff = Math.ceil((examDate - now) / (1000*60*60*24));
            
            if (homeCountdown) {
                homeCountdown.textContent = '距考试' + diff + '天';
            }
            
            // 更新每日任务卡
            var dailyTaskCard = document.getElementById('daily-task-card');
            if (dailyTaskCard) {
                dailyTaskCard.style.display = 'none';
                initDailyTasks();
                updateDailyTaskCard();
            }
            
            // 隐藏旧的教练引导卡片（兼容旧代码）
            var coachCard = document.getElementById('coach-guide-card');
            if (coachCard) {
                coachCard.style.display = 'none';
            }
            
            var streakEl = document.getElementById('home-streak');
            var streak = getStreakData();
            var streakNum = document.getElementById('streak-num');
            if (streakNum) streakNum.textContent = streak.count > 0 ? streak.count : '0';
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
                { name: 'AI诊断+人格卡', free: true, sprint: true },
                { name: 'AI对话答疑', free: '20轮/天', sprint: '30天无限' },
                { name: '作文批改', free: '评分+问题标注', sprint: '逐句改写+建议' },
                { name: '翻译批改', free: '评分+踩分点', sprint: '参考译文' },
                { name: '每日一练', free: '通用轮换', sprint: '短板定制' },
                { name: '备考计划', free: '3条建议', sprint: '30天学习计划' }
            ];
            var html = '';
            benefits.forEach(function(b) {
                var val = b[selectedPlan];
                var isLimited = (typeof val === 'string' && val !== '30天无限');
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
            var parts = [];
            
            // 待复习错题提醒
            if (typeof getOverdueReviewCount === 'function') {
                var overdueCount = getOverdueReviewCount();
                if (overdueCount > 0) {
                    parts.push('有' + overdueCount + '道错题到了复习时间，建议复习后再开始新练习');
                }
            }
            
            // 今日计划提醒
            if (userData.plan_data) {
                var dayIdx = getPlanDayIndex();
                var todayKey = 'day' + dayIdx;
                if (userData.plan_data[todayKey] && !userData.plan_data[todayKey + '_done']) {
                    parts.push('今日计划: ' + userData.plan_data[todayKey]);
                }
            }
            
            return parts.length > 0 ? parts.join('；') : '';
        }

        async function sendMessage() {
    // 隐藏欢迎页
    var welcomeEl = document.getElementById('chat-welcome');
    if (welcomeEl) welcomeEl.style.display = 'none';
            var input = document.getElementById('chat-input');
            var text = input.value.trim();
            // 六级模式下添加标记
            if (IS_CET6 && text && !text.startsWith('[')) {
                text = '[当前模式：六级备考] ' + text;
            }
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

【' + EXAM_LABEL + '风险等级】高危/中危/低危
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
【字数】XX词(' + EXAM_LABEL + '要求120-180词）

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
                    // 检测薄弱项引导词，显示快捷入口
                    checkAndShowWeakDimQuickLink(fullText, aiDiv);
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
                        // 检测薄弱项引导词，显示快捷入口（fallback分支）
                        checkAndShowWeakDimQuickLink(fullText, aiDiv);
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

        // ===== 薄弱项快捷入口检测 =====
        var lastWeakDimPromptTime = 0;
        var WEAK_DIM_COOLDOWN = 3; // 每3轮对话最多提1次

        function checkAndShowWeakDimQuickLink(aiText, msgDiv) {
            if (!aiText || !msgDiv) return;
            // 非陪练模式不显示
            if (chatState.currentMode !== 'companion') return;
            
            // 冷却检测：每3轮最多提1次
            var rounds = chatState.chatRounds || 0;
            if (rounds - lastWeakDimPromptTime < WEAK_DIM_COOLDOWN) return;
            
            // 五维维度关键词
            var dimKeywords = [
                { dim: '同义替换', patterns: [/同义替换/g, /词汇替换/g, /paraphrase/gi] },
                { dim: '主旨归纳', patterns: [/主旨归纳/g, /主旨大意/g, /main idea/g, /中心思想/g] },
                { dim: '推理判断', patterns: [/推理判断/g, /推理题/g, /推断/g, /inference/gi] },
                { dim: '细节定位', patterns: [/细节定位/g, /细节题/g, /定位/g, /细节理解/g] },
                { dim: '态度判断', patterns: [/态度判断/g, /态度题/g, /作者态度/g, /attitude/gi] }
            ];
            
            var matchedDim = null;
            for (var i = 0; i < dimKeywords.length; i++) {
                var item = dimKeywords[i];
                for (var j = 0; j < item.patterns.length; j++) {
                    if (item.patterns[j].test(aiText)) {
                        matchedDim = item.dim;
                        break;
                    }
                }
                if (matchedDim) break;
            }
            
            // 同时检查是否有练习建议
            var hasPracticeSuggestion = /练习|做题|专项|强化|巩固/g.test(aiText);
            if (!matchedDim || !hasPracticeSuggestion) return;
            
            // 检查是否在推荐专项练习（只有提到薄弱项+练习建议才显示按钮）
            var dimPracticePatterns = [
                /同义替换.*练习|练习.*同义替换|做.*同义替换|同义替换.*题/,
                /主旨.*练习|练习.*主旨|做.*主旨|主旨.*题/,
                /推理.*练习|练习.*推理|做.*推理|推理.*题/,
                /细节.*练习|练习.*细节|做.*细节|细节.*题/,
                /态度.*练习|练习.*态度|做.*态度|态度.*题/
            ];
            
            var shouldShow = false;
            for (var k = 0; k < dimPracticePatterns.length; k++) {
                if (dimPracticePatterns[k].test(aiText)) {
                    shouldShow = true;
                    break;
                }
            }
            if (!shouldShow) return;
            
            // 更新冷却时间
            lastWeakDimPromptTime = rounds;
            
            // 获取维度对应的练习类型
            var dimTypeMap = {
                '同义替换': '阅读理解-仔细阅读',
                '主旨归纳': '阅读理解-仔细阅读',
                '推理判断': '阅读理解-仔细阅读',
                '细节定位': '阅读理解-仔细阅读',
                '态度判断': '阅读理解-仔细阅读'
            };
            
            var practiceType = dimTypeMap[matchedDim] || '阅读理解-仔细阅读';
            var btnText = '去练' + matchedDim;
            
            // 创建快捷入口按钮
            var quickLink = document.createElement('div');
            quickLink.className = 'weak-dim-quick-link';
            quickLink.innerHTML = '<button class="weak-dim-btn" onclick="startDimPractice(\'' + matchedDim + '\', \'' + practiceType + '\')">' + btnText + '</button>';
            
            // 插入到消息div后面
            var container = document.getElementById('chat-messages');
            if (container && msgDiv.parentNode === container) {
                var insertPos = Array.prototype.indexOf.call(container.children, msgDiv) + 1;
                if (insertPos < container.children.length) {
                    container.insertBefore(quickLink, container.children[insertPos]);
                } else {
                    container.appendChild(quickLink);
                }
                scrollChatToBottom();
            }
        }
        
        // 开始维度专项练习
        function startDimPractice(dimName, practiceType) {
            // 隐藏快捷入口
            var quickLinks = document.querySelectorAll('.weak-dim-quick-link');
            quickLinks.forEach(function(el) { el.remove(); });
            
            // 切换到练习模式
            if (typeof showQuizMode === 'function') {
                showQuizMode(practiceType, dimName);
            } else {
                // 如果没有练习模式，通过对话引导
                var input = document.getElementById('chat-input');
                if (input) {
                    input.value = '我要练习' + dimName;
                    sendMessage();
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
            fetch('/api/chat/messages?conversation_id=' + conversationId, {
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
            appendMessage('ai', '嗨！我是小过学长 👋\n基于真题数据精准分析你的薄弱点，随时问我任何备考问题');
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
                '<p><b>生效日期：2026年5月17日</b></p>' +
                '<p>本产品由' + EXAM_LABEL + '“备考搭子”团队（以下简称“我们”）运营。我们重视您的隐私保护，本政策说明我们如何收集、使用和保护您的信息。</p>' +
                '<p><b>一、我们收集的信息</b></p>' +
                '<p>1. 设备标识信息：用于生成唯一用户ID，实现数据恢复功能。</p>' +
                '<p>2. 学习数据：诊断结果、答题记录、打卡记录、自评数据等，用于提供个性化学习服务。</p>' +
                '<p>3. 用户输入内容：作文、翻译等文本，仅用于AI评分和批改服务。</p>' +
                '<p><b>二、信息存储与保护</b></p>' +
                '<p>1. 学习进度数据主要存储在您的本地浏览器中，诊断结果和设备标识加密存储在云端服务器用于恢复学习进度。</p>' +
                '<p>2. AI对话由第三方AI服务商处理，我们不会将对话内容用于其他用途。</p>' +
                '<p>3. 支付由面包多平台完成，我们不接触您的支付信息。</p>' +
                '<p>4. 我们采用加密存储、权限管控等技术保护您的信息安全。</p>' +
                '<p><b>三、信息共享</b></p>' +
                '<p>1. 除本政策说明的情形外，我们不会将您的个人信息分享给任何第三方。</p>' +
                '<p>2. 法律法规要求或政府部门依法要求披露的除外。</p>' +
                '<p><b>四、您的权利</b></p>' +
                '<p>1. 您可随时查看、导出或要求删除您的学习数据。</p>' +
                '<p>2. 您可随时停止使用本产品，停止使用后我们不再收集新的信息。</p>' +
                '<p><b>五、未成年人保护</b></p>' +
                '<p>如您未满18周岁，请在监护人指导下使用本产品。我们不会主动收集未成年人的身份证明信息。</p>' +
                '<p><b>六、政策更新</b></p>' +
                '<p>本政策可能适时更新，更新后将在产品内通知您。继续使用即视为同意更新后的政策。</p>' +
                '</div>' +
                '<button onclick="this.parentElement.parentElement.remove()" style="width:100%;margin-top:20px;padding:12px;border:none;border-radius:10px;background:#6C5CE7;color:#fff;font-size:15px;font-weight:500;cursor:pointer">我知道了</button>';
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
                '<p><b>生效日期：2026年5月17日</b></p>' +
                '<p><b>一、服务说明</b></p>' +
                '<p>1. 本产品为AI辅助学习工具，提供的评分、批改、建议仅供参考，可能与实际考试评分存在差异。</p>' +
                '<p>2. 本产品不保证考试成绩，不构成任何通过考试的承诺。请以官方考试评分标准为准。</p>' +
                '<p>3. 本产品不能替代正规教学，建议结合课堂学习使用。</p>' +
                '<p><b>二、用户行为规范</b></p>' +
                '<p>1. 您应合法合规使用本产品，禁止用于任何违法违规用途。</p>' +
                '<p>2. 禁止利用自动化工具批量访问、抓取本产品内容。</p>' +
                '<p>3. 禁止逆向工程、反编译或试图获取本产品的源代码。</p>' +
                '<p>4. 您对通过本产品提交的内容（作文、翻译等）拥有著作权，同时授权我们为提供服务之必要使用该内容。</p>' +
                '<p><b>三、付费服务</b></p>' +
                '<p>1. 付费服务通过面包多平台购买，支付信息由面包多处理。</p>' +
                '<p>2. 虚拟商品一经开通不支持退款，请先体验免费版确认功能满足需求。</p>' +
                '<p>3. 如有特殊情况，可通过面包多订单页与我们沟通。</p>' +
                '<p><b>四、知识产权</b></p>' +
                '<p>1. 本产品的界面设计、题库内容、AI生成内容等知识产权归我们所有。</p>' +
                '<p>2. 未经授权，禁止复制、传播本产品的任何内容用于商业目的。</p>' +
                '<p><b>五、免责声明</b></p>' +
                '<p>1. 因不可抗力（网络故障、服务器维护等）导致服务中断，我们不承担责任。</p>' +
                '<p>2. AI生成内容可能存在不准确之处，用户应自行判断，我们不对AI输出承担责任。</p>' +
                '<p><b>六、未成年人条款</b></p>' +
                '<p>如您未满18周岁，请在监护人指导下使用本产品。未成年人使用本产品即视为已获得监护人同意。</p>' +
                '<p><b>七、协议变更</b></p>' +
                '<p>我们保留修改本协议的权利，重大变更将在产品内通知。继续使用即视为同意变更后的协议。</p>' +
                '</div>' +
                '<button onclick="this.parentElement.parentElement.remove()" style="width:100%;margin-top:20px;padding:12px;border:none;border-radius:10px;background:#6C5CE7;color:#fff;font-size:15px;font-weight:500;cursor:pointer">我知道了</button>';
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
            if (e.target.closest('.tab-page, .diag-overlay, .report-overlay, .modal-sheet')) {
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

var currentSelectedPlan = 'sprint';  // 当前弹窗选中的套餐

function selectPlan(plan) {
    // 支持新旧两种卡片选择
    var cards = document.querySelectorAll('.coze-card, .coze-plan-card');
    cards.forEach(function(c) { c.classList.remove('selected'); });
    var target = document.querySelector('.coze-card[data-plan="' + plan + '"], .coze-plan-card[data-plan="' + plan + '"]');
    if (target) target.classList.add('selected');
    var ctaBtn = document.getElementById('plan-cta-btn');
    if (ctaBtn) {
        var prices = { free: '当前方案', sprint: '¥29.9 开始冲刺' };
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
    var planNames = { sprint: '冲刺营' };
    var planPrices = { sprint: 29.9 };
    var planFeatures = {
        sprint: ['AI五维诊断 | AI陪练(给答案+解析)','作文批改(评分+问题+方向)','翻译批改(参考译文)','学习计划 | 错题本+复习提醒']
    };
    // 面包多商品链接（冲刺营¥29.9）
    var mbdLinks = {
        sprint: 'https://mbd.pub/o/bread/YZaTk5tsbA=='
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
            '\u003cdiv class="pay-sheet-price"\u003e\u003csmall\u003e¥\u003c/small\u003e' + (planPrices[plan] || '') + '\u003c/div\u003e' +
            '<ul class="pay-feature-list">' + featureHtml + '</ul>' +
            '<div class="pay-tabs">' +
                '<div class="pay-tab active" onclick="switchPayTab(\'online\')">在线购买</div>' +
                '<div class="pay-tab" onclick="switchPayTab(\'order\')">订单号激活</div>' +
            '</div>' +
            '\u003cdiv class="pay-panel active" id="pay-panel-online"\u003e' +
                '\u003ca class="pay-mbd-link" href="' + (mbdLinks[plan] || '#') + '" target="_blank"\u003e立即购买 ¥' + (planPrices[plan] || '') + '\u003c/a\u003e' +
                '\u003cdiv style="margin-top:14px;padding:12px;background:#F8F9FA;border-radius:10px;font-size:12px;color:#64748B"\u003e' +
                    '\u003cdiv style="margin-bottom:8px;font-weight:600;color:#1a1a2e"\u003e激活流程：\u003c/div\u003e' +
                    '\u003cdiv style="margin-bottom:4px"\u003e\u003cspan style="color:#6C5CE7;font-weight:600"\u003e②\u003c/span\u003e 付款后，复制页面底部的\u003cstrong\u003e订单号\u003c/strong\u003e\u003c/div\u003e' +
                    '\u003cdiv\u003e\u003cspan style="color:#6C5CE7;font-weight:600"\u003e③\u003c/span\u003e 粘贴订单号到下方输入框，点击激活\u003c/div\u003e' +
                '\u003c/div\u003e' +
                '\u003cdiv class="pay-input-row" style="margin-top:12px"\u003e' +
                    '\u003cinput type="text" id="pay-order-input" placeholder="粘贴面包多订单号" autocomplete="off" spellcheck="false"\u003e' +
                    '\u003cbutton id="pay-activate-btn" onclick="activateWithOrderIdFromModal()"\u003e激活\u003c/button\u003e' +
                '\u003c/div\u003e' +
                '\u003cdiv id="pay-activate-msg" style="font-size:12px;margin-top:8px;min-height:18px;color:#64748B"\u003e\u003c/div\u003e' +
            '\u003c/div\u003e' +
            '\u003cdiv class="pay-panel" id="pay-panel-order"\u003e' +
                '\u003cdiv style="font-size:13px;color:#64748B;margin-bottom:4px"\u003e输入激活码开通\u003c/div\u003e' +
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
        t.classList.toggle('active', (tab === 'online' && i === 0) || (tab === 'order' && i === 1));
    });
    document.getElementById('pay-panel-online').classList.toggle('active', tab === 'online');
    document.getElementById('pay-panel-order').classList.toggle('active', tab === 'order');
}

function closePayModal() {
    var modal = document.getElementById('pay-modal');
    if (modal) modal.remove();
}

// 支付弹窗内的订单号激活
function activateWithOrderIdFromModal() {
    var input = document.getElementById('pay-order-input');
    var msgEl = document.getElementById('pay-activate-msg');
    var btn = document.getElementById('pay-activate-btn');
    if (!input || !input.value.trim()) {
        if (msgEl) { msgEl.style.color = '#E17055'; msgEl.textContent = '请输入订单号'; }
        return;
    }
    btn.disabled = true;
    btn.textContent = '验证中...';
    if (msgEl) { msgEl.style.color = '#64748B'; msgEl.textContent = ''; }

    fetch('/api/activate-with-mbd-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: input.value.trim(), plan: currentSelectedPlan })
    }).then(function(r) { return r.json(); }).then(function(resp) {
        btn.disabled = false;
        btn.textContent = '激活';
        if (resp.success) {
            if (msgEl) { msgEl.style.color = '#00B894'; msgEl.textContent = '激活成功！'; }
            state.userData = state.userData || {};
            state.userData.plan = resp.plan;
            state.userData.planToken = resp.token;
            state.userData.planOrderId = resp.orderId;
            state.userData.planActivatedAt = Date.now();
            saveUserData(state.userData);
            updateProfileStats();
            updateProfileUserId();
            updateHomeStatus();
            setTimeout(function() {
                closePayModal();
                showToast('🎉 ' + (resp.plan === 'flagship' ? '全程营' : '冲刺营') + ' 已开通！');
                switchTab('diagnosis');
                setTimeout(function() { openChat('companion'); }, 500);
            }, 800);
        } else {
            if (msgEl) { msgEl.style.color = '#E17055'; msgEl.textContent = resp.error || '订单号验证失败'; }
        }
    }).catch(function(e) {
        btn.disabled = false;
        btn.textContent = '激活';
        if (msgEl) { msgEl.style.color = '#E17055'; msgEl.textContent = '网络错误，请重试'; }
    });
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
            saveUserData(state.userData);
            updateProfileStats();
            updateProfileUserId();
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
            saveUserData(state.userData);
            updateProfileStats();
            updateProfileUserId();
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
    {type: 'vocab', name: '词汇积累', prompt: '背50个' + EXAM_LABEL + '高频词', icon: '📝'},
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
    wrongTypes: { '词汇': 0, '语法': 0, '阅读': 0, '听力': 0 },
    // 维度答题记录: {ability: '同义替换', correct: true/false}
    dimResults: [],
    // 限时训练相关
    timerActive: false,
    timerRemaining: 0,
    timerInterval: null,
    timerMode: 'default'
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

// 专项练习维度选择
var quizDimState = {
    selectedDim: '', // 选中的维度，为空表示全部
    dimList: [
        { key: '', label: '全部' },
        { key: '细节理解', label: '细节理解', abilityKey: '细节定位' },
        { key: '推理判断', label: '推理判断', abilityKey: '推理判断' },
        { key: '同义替换', label: '同义替换', abilityKey: '同义替换' },
        { key: '主旨归纳', label: '主旨归纳', abilityKey: '主旨归纳' },
        { key: '态度判断', label: '态度判断', abilityKey: '态度判断' }
    ]
};

// 打开带维度的quiz
function openQuizWithDim(dim) {
    if (dim) {
        var dimConfig = quizDimState.dimList.find(function(d) { return d.abilityKey === dim; });
        if (dimConfig) {
            quizDimState.selectedDim = dimConfig.key;
        }
    }
    openQuiz();
}

// 打开每日一练（带维度选择界面）
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
    quizState.dimResults = []; // 重置维度记录
    
    var overlay = document.getElementById('quiz-overlay');
    var body = document.getElementById('quiz-body');
    var title = document.getElementById('quiz-title');
    var subtitle = document.getElementById('quiz-subtitle');
    var progress = document.getElementById('quiz-progress-fill');
    var nextBtn = document.getElementById('quiz-next-btn');
    
    // 显示维度选择界面
    var dimHtml = '<div class="quiz-dim-selector">';
    dimHtml += '<div class="quiz-dim-title">选择训练类型</div>';
    dimHtml += '<div class="quiz-dim-tags">';
    
    quizDimState.dimList.forEach(function(dim) {
        var active = quizDimState.selectedDim === dim.key ? 'active' : '';
        dimHtml += '<div class="quiz-dim-tag ' + active + '" data-dim="' + dim.key + '" onclick="selectQuizDim(\'' + dim.key + '\')">' + dim.label + '</div>';
    });
    
    dimHtml += '</div>';
    dimHtml += '<div class="quiz-dim-actions">';
    dimHtml += '<button class="quiz-dim-start-btn" onclick="startQuizWithDim()">开始练习</button>';
    dimHtml += '</div>';
    dimHtml += '</div>';
    
    title.textContent = '每日一练';
    subtitle.textContent = '选择训练类型';
    progress.style.width = '0%';
    nextBtn.classList.remove('show', 'finish');
    
    body.innerHTML = dimHtml;
    overlay.classList.add('show');
}

// 选择维度
function selectQuizDim(dim) {
    quizDimState.selectedDim = dim;
    // 更新UI
    var tags = document.querySelectorAll('.quiz-dim-tag');
    tags.forEach(function(tag) {
        if (tag.dataset.dim === dim) {
            tag.classList.add('active');
        } else {
            tag.classList.remove('active');
        }
    });
}

// 开始练习
function startQuizWithDim() {
    var body = document.getElementById('quiz-body');
    var subtitle = document.getElementById('quiz-subtitle');
    
    subtitle.textContent = '正在出题...';
    
    // 显示loading
    body.innerHTML = '<div class="quiz-loading show"><div class="quiz-loading-spinner"></div><div class="quiz-loading-text">正在生成题目...</div></div>';
    
    // 初始化计时器
    initQuizTimer();
    
    // 请求第一题
    requestQuizQuestion();
}

// 请求题目（支持维度筛选）
// 批量题目缓存
var quizBatchCache = {
    questions: [],
    currentIdx: 0,
    dimDistribution: {},
    totalCount: 0
};

async function requestQuizQuestion() {
    var user = state.userData || {};
    var plan = user.plan || 'free';
    var types = ['词汇', '语法', '阅读', '听力'];
    
    // 如果缓存中有题目，直接取下一题
    if (quizBatchCache.questions && quizBatchCache.questions.length > 0 && quizBatchCache.currentIdx < quizBatchCache.questions.length) {
        var q = quizBatchCache.questions[quizBatchCache.currentIdx];
        quizBatchCache.currentIdx++;
        renderRealQuiz(q);
        return;
    }
    
    // 缓存用完或为空，需要获取新批次
    var subtitle = document.getElementById('quiz-subtitle');
    if (subtitle) subtitle.textContent = '正在加载题目...';
    
    // 构造批量获取URL
    var batchUrl = '/api/quiz/batch';
    var dimsParts = [];
    
    // 传递用户五维分数用于自适应推题
    var diag = user.diagnosis || {};
    if (diag['细节定位'] || diag['推理判断'] || diag['同义替换'] || diag['主旨归纳'] || diag['态度判断']) {
        if (diag['细节定位']) dimsParts.push('细节定位:' + diag['细节定位']);
        if (diag['推理判断']) dimsParts.push('推理判断:' + diag['推理判断']);
        if (diag['同义替换']) dimsParts.push('同义替换:' + diag['同义替换']);
        if (diag['主旨归纳']) dimsParts.push('主旨归纳:' + diag['主旨归纳']);
        if (diag['态度判断']) dimsParts.push('态度判断:' + diag['态度判断']);
    }
    
    if (dimsParts.length > 0) {
        batchUrl += '?dims=' + encodeURIComponent(dimsParts.join(','));
    }
    
    // 支持按维度筛选（专项练习）
    if (quizDimState.selectedDim) {
        var dimConfig = quizDimState.dimList.find(function(d) { return d.key === quizDimState.selectedDim; });
        if (dimConfig && dimConfig.abilityKey) {
            batchUrl += (dimsParts.length > 0 ? '&' : '?') + 'ability=' + encodeURIComponent(dimConfig.abilityKey);
        }
    }
    
    try {
        var resp = await fetch(batchUrl);
        var data = await resp.json();
        
        if (data.code === 0 && data.data && data.data.questions && data.data.questions.length > 0) {
            // 成功获取批量题目
            quizBatchCache.questions = data.data.questions;
            quizBatchCache.currentIdx = 1;
            quizBatchCache.dimDistribution = data.data.dimDistribution || {};
            quizBatchCache.totalCount = data.data.totalCount || data.data.questions.length;
            quizState.totalQuestions = quizBatchCache.totalCount;
            
            // 显示分配信息
            if (subtitle) {
                var dimInfo = Object.entries(quizBatchCache.dimDistribution)
                    .map(function(e) { return e[0] + ':' + e[1]; })
                    .join(' / ');
                subtitle.textContent = '已加载' + quizBatchCache.totalCount + '题';
            }
            
            // 渲染第一题
            var q = quizBatchCache.questions[0];
            renderRealQuiz(q);
        } else {
            // fallback: 单题获取
            console.warn('[批量获取失败，降级到单题模式]');
            requestQuizQuestionSingle();
        }
    } catch(e) {
        console.error('[批量获取题目失败]', e);
        requestQuizQuestionSingle();
    }
}

// 单题获取（降级方案）
async function requestQuizQuestionSingle() {
    var user = state.userData || {};
    var plan = user.plan || 'free';
    var types = ['词汇', '语法', '阅读', '听力'];
    var randomType = types[Math.floor(Math.random() * types.length)];
    
    // 确保每种题型都有机会被抽到
    var unansweredTypes = types.filter(function(t) { return quizState.answeredTypes[t] < 2; });
    if (unansweredTypes.length > 0) {
        randomType = unansweredTypes[Math.floor(Math.random() * unansweredTypes.length)];
    }
    
    // 从真题库获取题目（支持维度筛选）
    var realQuizUrl = '/api/quiz/random?type=' + encodeURIComponent(randomType);
    
    // 添加维度筛选参数
    if (quizDimState.selectedDim) {
        var dimConfig = quizDimState.dimList.find(function(d) { return d.key === quizDimState.selectedDim; });
        if (dimConfig && dimConfig.abilityKey) {
            realQuizUrl += '&ability=' + encodeURIComponent(dimConfig.abilityKey);
        }
    }
    
    // 传递用户五维分数用于自适应推题
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
    var prompt = '请出一道' + EXAM_LABEL + randomType + '选择题。请严格按照以下JSON格式返回（不要有任何其他内容）：\n{"type":"' + randomType + '","question":"题目内容","options":["选项A","选项B","选项C","选项D"],"answer":"A","explanation":"详细解析"}';
            startAiQuiz(prompt, randomType);
        }
    }).catch(function(){
        // fallback AI quiz
    var prompt = '请出一道' + EXAM_LABEL + randomType + '选择题。请严格按照以下JSON格式返回（不要有任何其他内容）：\n{"type":"' + randomType + '","question":"题目内容","options":["选项A","选项B","选项C","选项D"],"answer":"A","explanation":"详细解析"}';
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
        
        // 解析题目（尝试JSON格式）
        try {
            var jsonMatch = fullText.match(/\{[^{}]*"question"[^{}]*\}/);
            if (jsonMatch) {
                var question = JSON.parse(jsonMatch[0]);
                quizState.currentQuestion = question;
                quizState.answeredTypes[question.type] = (quizState.answeredTypes[question.type] || 0) + 1;
                renderQuizQuestion(question);
                return;
            }
        } catch(e) {}
        
        // 解析旧格式题目
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
        
        // 生成失败，显示提示
        showToast('出题失败，请重试');
        closeQuiz();
        
    } catch(e) {
        console.error('AI出题失败', e);
        showToast('出题失败，请重试');
        closeQuiz();
    }
}



// 限时训练计时器初始化
function initQuizTimer() {
    // 清除之前的计时器
    if (quizState.timerInterval) {
        clearInterval(quizState.timerInterval);
        quizState.timerInterval = null;
    }
    
    // 根据题型确定计时器模式
    // 默认混合模式30分钟
    var defaultTime = 30 * 60; // 30分钟
    var listeningTime = IS_CET6 ? 20 * 60 : 25 * 60; // 听力：四级25分钟，六级20分钟
    var readingTime = IS_CET6 ? 35 * 60 : 40 * 60; // 阅读：四级40分钟，六级35分钟
    
    quizState.timerMode = 'default';
    quizState.timerRemaining = defaultTime;
    quizState.timerActive = true;
    
    // 更新计时器显示
    updateTimerDisplay();
    
    // 启动计时器
    quizState.timerInterval = setInterval(function() {
        if (!quizState.timerActive) return;
        
        quizState.timerRemaining--;
        updateTimerDisplay();
        
        // 5分钟提醒
        if (quizState.timerRemaining === 5 * 60) {
            showToast('【限时训练】剩余5分钟！');
        }
        
        // 时间到
        if (quizState.timerRemaining <= 0) {
            clearInterval(quizState.timerInterval);
            quizState.timerInterval = null;
            quizState.timerActive = false;
            showTimerExpired();
        }
    }, 1000);
}

// 更新计时器显示
function updateTimerDisplay() {
    var timerEl = document.getElementById('quiz-timer');
    if (!timerEl) return;
    
    var minutes = Math.floor(quizState.timerRemaining / 60);
    var seconds = quizState.timerRemaining % 60;
    timerEl.textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    
    // 5分钟以内变红
    if (quizState.timerRemaining <= 5 * 60) {
        timerEl.classList.add('warning');
    } else {
        timerEl.classList.remove('warning');
    }
}

// 时间到处理
function showTimerExpired() {
    var body = document.getElementById('quiz-body');
    body.innerHTML = '<div class="quiz-stats show"><div class="quiz-stats-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="quiz-stats-title">时间到！</div><div class="quiz-stats-subtitle" style="font-size:14px;color:#666;margin-bottom:24px;">您已练习了 ' + quizState.currentIndex + ' 题，计' + quizState.correctCount + '题正确。</div><button class="quiz-stats-btn primary" onclick="submitQuizEarly()">查看结果</button><button class="quiz-stats-btn secondary" onclick="closeQuiz()">返回</button></div>';
}

// 提前交卷
function submitQuizEarly() {
    if (quizState.timerInterval) {
        clearInterval(quizState.timerInterval);
        quizState.timerInterval = null;
    }
    quizState.timerActive = false;
    quizState.currentIndex = quizState.totalQuestions; // 标记为已完成
    showQuizStats();
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
    var realQuizUrl = '/api/quiz/random?type=' + encodeURIComponent(randomType);
    
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
    var prompt = '请出一道' + EXAM_LABEL + randomType + '选择题。请严格按照以下格式返回（不要有任何其他内容）：\n[QUIZ:type=' + randomType + '|question=题目内容|optionA=选项A|optionB=选项B|optionC=选项C|optionD=选项D|answer=A|explanation=详细解析]';
            startAiQuiz(prompt, randomType);
        }
    }).catch(function(){
        // fallback AI quiz handled below
    var prompt = '请出一道' + EXAM_LABEL + randomType + '选择题。请严格按照以下格式返回（不要有任何其他内容）：\n[QUIZ:type=' + randomType + '|question=题目内容|optionA=选项A|optionB=选项B|optionC=选项C|optionD=选项D|answer=A|explanation=详细解析]';
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
    
    // 听力题：添加播放按钮
    var isListeningQuestion = (dimension === '听力' || question.type === '听力' || question.category === 'LC');
    if (isListeningQuestion && question.passage) {
        // 保存当前听力文本到quizState
        quizState.currentListeningText = question.passage;
        quizState.currentListeningIsConv = (question.passage_type === 'conversation');
        quizState.listeningPlayed = false;
        quizState.listeningReplayCount = 0;
        
        html += '<div class="quiz-listening-player">';
        html += '<div class="quiz-listening-wave" id="quiz-listening-wave">';
        html += '<span></span><span></span><span></span><span></span><span></span>';
        html += '</div>';
        html += '<button class="quiz-listening-play-btn" id="quiz-listening-play-btn" onclick="handleQuizPlayClick()">';
        html += '<span class="play-icon">▶</span>';
        html += '</button>';
        html += '<div class="quiz-listening-hint" id="quiz-listening-hint">点击播放听力</div>';
        html += '</div>';
        html += '<div class="quiz-listening-progress" id="quiz-listening-progress" style="display:none;">';
        html += '<div class="quiz-listening-progress-bar"></div>';
        html += '</div>';
        html += '<div class="quiz-listening-replay-hint" id="quiz-listening-replay-hint"></div>';
    }
    
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
// 每日一练听力播放处理
var quizListeningPlayer = {
    isPlaying: false,
    isPaused: false,
    text: '',
    onComplete: null
};

function handleQuizPlayClick() {
    var text = quizState.currentListeningText;
    if (!text) return;
    
    if (quizListeningPlayer.isPlaying) {
        // 停止播放
        stopQuizListening();
        return;
    }
    
    // 开始播放
    quizListeningPlayer.isPlaying = true;
    quizListeningPlayer.text = text;
    
    var playBtn = document.getElementById('quiz-listening-play-btn');
    var hint = document.getElementById('quiz-listening-hint');
    var progress = document.getElementById('quiz-listening-progress');
    
    if (playBtn) {
        playBtn.classList.add('playing');
        playBtn.innerHTML = '<span class="wave-container"><span></span><span></span><span></span></span>';
    }
    if (hint) hint.textContent = '听力播放中...';
    if (progress) progress.style.display = 'block';
    
    // 估算播放时长
    var duration = Math.max(15, text.split(/\s+/).length / 2);
    animateQuizProgress(duration);
    
    // 使用SpeechSynthesis播放
    playListeningFull(text, quizState.currentListeningIsConv, function() {
        stopQuizListening();
        quizState.listeningPlayed = true;
        var hint = document.getElementById('quiz-listening-hint');
        var replayHint = document.getElementById('quiz-listening-replay-hint');
        if (hint) hint.textContent = '✅ 播放完毕，请答题';
        if (replayHint) replayHint.textContent = '';
        quizListeningPlayer.isPlaying = false;
    });
}

function stopQuizListening() {
    stopListeningPlayback();
    quizListeningPlayer.isPlaying = false;
    quizListeningPlayer.isPaused = false;
    
    var playBtn = document.getElementById('quiz-listening-play-btn');
    var hint = document.getElementById('quiz-listening-hint');
    var progress = document.getElementById('quiz-listening-progress');
    
    if (playBtn) {
        playBtn.classList.remove('playing');
        playBtn.innerHTML = '<span class="play-icon">▶</span>';
    }
    if (progress) {
        progress.style.display = 'none';
        var bar = progress.querySelector('.quiz-listening-progress-bar');
        if (bar) bar.style.width = '0%';
    }
}

function animateQuizProgress(duration) {
    var progress = document.getElementById('quiz-listening-progress');
    if (!progress) return;
    
    var bar = progress.querySelector('.quiz-listening-progress-bar');
    if (!bar) return;
    
    var startTime = Date.now();
    var totalDuration = duration * 1000;
    
    function update() {
        if (!quizListeningPlayer.isPlaying) {
            bar.style.width = '0%';
            return;
        }
        
        var elapsed = Date.now() - startTime;
        var pct = Math.min(100, (elapsed / totalDuration) * 100);
        bar.style.width = pct + '%';
        
        if (elapsed < totalDuration && quizListeningPlayer.isPlaying) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

function selectQuizOption(el, option) {
    if (el.classList.contains('disabled')) return;
    
    var question = quizState.currentQuestion;
    var isCorrect = option === question.answer;
    
    // 记录维度答题结果（用于更新五维分数）
    var ability = question.ability || '细节理解'; // 题目中的能力维度
    quizState.dimResults.push({
        ability: ability,
        correct: isCorrect
    });
    
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
    
    // 生成维度分布HTML
    var dimDistHtml = '';
    var results = quizState.dimResults || [];
    if (results.length > 0) {
        // 统计每个维度的正确率
        var dimStats = {};
        results.forEach(function(r) {
            if (!dimStats[r.ability]) {
                dimStats[r.ability] = { correct: 0, total: 0 };
            }
            dimStats[r.ability].total++;
            if (r.correct) dimStats[r.ability].correct++;
        });
        
        // 生成维度条形图
        var dimBarsHtml = '';
        var weakDimList = [];
        var dimOrder = ['细节理解', '推理判断', '同义替换', '主旨归纳', '态度判断'];
        
        for (var i = 0; i < dimOrder.length; i++) {
            var dim = dimOrder[i];
            if (!dimStats[dim]) continue;
            
            var stat = dimStats[dim];
            var dimRate = Math.round((stat.correct / stat.total) * 100);
            var barWidth = dimRate;
            var barColor = 'green';
            if (dimRate < 40) {
                barColor = 'red';
                weakDimList.push(dim);
            } else if (dimRate < 60) {
                barColor = 'orange';
                weakDimList.push(dim);
            }
            
            dimBarsHtml += '<div class="quiz-dim-bar">';
            dimBarsHtml += '<div class="quiz-dim-bar-label">' + dim + '</div>';
            dimBarsHtml += '<div class="quiz-dim-bar-track"><div class="quiz-dim-bar-fill ' + barColor + '" style="width:' + barWidth + '%"></div></div>';
            dimBarsHtml += '<div class="quiz-dim-bar-rate">' + dimRate + '%（' + stat.correct + '/' + stat.total + '）</div>';
            dimBarsHtml += '</div>';
        }
        
        if (dimBarsHtml) {
            dimDistHtml = '<div class="quiz-stats-dims">' + dimBarsHtml + '</div>';
        }
    }
    
    // 生成能力值变化HTML
    var dimChangeHtml = '';
    var dimChanges = quizState.dimChanges || {};
    var dimChangeList = [];
    for (var dim in dimChanges) {
        var change = dimChanges[dim];
        if (change !== 0) {
            var arrow = change > 0 ? '↑' : '↓';
            var sign = change > 0 ? '+' : '';
            dimChangeList.push(dim + ' ' + sign + change + ' ' + arrow);
        }
    }
    if (dimChangeList.length > 0) {
        dimChangeHtml = '<div class="quiz-stats-change">' + dimChangeList.join(' &nbsp;|&nbsp; ') + '</div>';
    }
    
    // 生成推荐下一步HTML
    var recommendHtml = '';
    var dimChanges2 = quizState.dimChanges || {};
    var weakDims = [];
    for (var dim in dimChanges2) {
        // 找出变化为负或正确率低的维度
        if (dimChanges2[dim] < 0) {
            weakDims.push(dim);
        }
    }
    // 如果没有负变化但有薄弱项，使用薄弱项
    if (weakDims.length === 0 && weakDimList && weakDimList.length > 0) {
        weakDims = weakDimList.slice(0, 2); // 最多取2个
    }
    if (weakDims.length > 0) {
        var firstWeakDim = weakDims[0];
        recommendHtml = '<div class="quiz-stats-recommend">';
        recommendHtml += '<div class="quiz-stats-recommend-text">' + firstWeakDim + '正确率较低，建议做专项练习</div>';
        recommendHtml += '<button class="quiz-stats-btn recommend" onclick="startDimPractice(\'' + firstWeakDim + '\')">去练薄弱项</button>';
        recommendHtml += '</div>';
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
    html += dimDistHtml; // 新增：维度分布
    html += dimChangeHtml; // 新增：能力值变化
    html += recommendHtml; // 新增：推荐下一步
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
    
    // 记录能力变化趋势
    recordQuizAbility();
    
    // 更新五维能力分数（练习闭环）
    updateDimScoresFromQuiz();
    
    // 标记任务完成
    markTaskComplete('quiz');
    // 如果选择了维度，标记维度任务完成
    if (quizDimState.selectedDim) {
        markTaskComplete('dim_' + quizDimState.selectedDim);
    }
    
    // 清空能力值变化记录
    quizState.dimChanges = null;
}

// 开始薄弱维度练习
function startDimPractice(dim) {
    // 关闭当前练习结果
    closeQuiz();
    // 延迟打开新的练习
    setTimeout(function() {
        openQuizWithDim(dim);
    }, 300);
}

// === 五维能力分数更新系统 ===

// 统一更新维度分数的函数
// ability: 题目中的能力维度（如"细节理解"、"推理判断"等）
// delta: 分数变化（正数加分，负数减分）
// 维度映射：题目中的"细节理解"对应存储的"细节定位"
function updateDimScore(ability, delta) {
    // 维度名称映射（题目ability -> 存储key）
    var dimMapping = {
        '细节理解': '细节定位',
        '推理判断': '推理判断',
        '同义替换': '同义替换',
        '主旨归纳': '主旨归纳',
        '态度判断': '态度判断'
    };
    
    var dimKey = dimMapping[ability] || ability;
    
    // 获取当前分数
    var scores = {};
    try {
        var data = localStorage.getItem(examKey('ability_scores'));
        if (data) {
            scores = JSON.parse(data);
        }
    } catch(e) {}
    
    // 如果没有分数数据，从诊断数据中读取
    if (Object.keys(scores).length === 0) {
        var userData = safeGetItem(examKey('user'), {});
        if (userData && userData.diagnosis) {
            scores = userData.diagnosis;
        }
    }
    
    // 如果还是没有，初始化为50分
    if (Object.keys(scores).length === 0) {
        scores = { '细节定位': 50, '推理判断': 50, '同义替换': 50, '主旨归纳': 50, '态度判断': 50 };
    }
    
    // 计算新分数（0-100范围限制）
    var current = parseInt(scores[dimKey]) || 50;
    var newScore = Math.max(0, Math.min(100, current + delta));
    scores[dimKey] = newScore;
    
    // 记录能力值变化（用于报告显示）
    if (!quizState.dimChanges) quizState.dimChanges = {};
    var change = delta;
    // 由于分数限制，可能实际变化与delta不同
    if (current + delta !== newScore) {
        // 被限制在边界，实际变化可能更小
        change = newScore - current;
    }
    quizState.dimChanges[ability] = Math.round(change * 10) / 10; // 保留1位小数
    
    // 保存分数
    localStorage.setItem(examKey('ability_scores'), JSON.stringify(scores));
    
    // 如果在数据页，刷新显示
    if (document.getElementById('tab-progress') && document.getElementById('tab-progress').classList.contains('active')) {
        try { renderDashboard(); } catch(e) { console.error('renderDashboard error:', e); }
    }
    
    return newScore;
}

// 根据练习答题结果更新五维分数
function updateDimScoresFromQuiz() {
    var results = quizState.dimResults || [];
    if (results.length === 0) return;
    
    // 统计每个维度的正确率和答题数
    var dimStats = {};
    results.forEach(function(r) {
        if (!dimStats[r.ability]) {
            dimStats[r.ability] = { correct: 0, total: 0 };
        }
        dimStats[r.ability].total++;
        if (r.correct) {
            dimStats[r.ability].correct++;
        }
    });
    
    // 更新每个维度的分数
    var dimWeights = {
        '正确': 2.5,    // 答对+2.5分
        '错误': -1      // 答错-1分
    };
    
    for (var ability in dimStats) {
        var stat = dimStats[ability];
        var correctRate = stat.total > 0 ? stat.correct / stat.total : 0;
        
        // 每答对一题+2.5分，答错-1分
        var delta = stat.correct * 2.5 - (stat.total - stat.correct) * 1;
        updateDimScore(ability, delta);
    }
    
    // 清空答题记录
    quizState.dimResults = [];
}

// 记录练习后的能力数据
function recordQuizAbility() {
    var abilityScores = getAbilityScores();
    if (!abilityScores || !abilityScores.dims) return;
    
    var dims = abilityScores.dims;
    var newScores = {};
    
    // 转换维度名称
    var dimMapping = {
        '细节定位': '细节理解',
        '推理判断': '推理判断',
        '同义替换': '同义替换',
        '主旨归纳': '主旨归纳',
        '态度判断': '态度判断'
    };
    
    for (var key in dims) {
        var mappedKey = dimMapping[key] || key;
        newScores[mappedKey] = dims[key];
    }
    
    saveAbilityRecord(newScores);
}

// 重新开始
function restartQuiz() {
    quizState.currentIndex = 0;
    quizState.correctCount = 0;
    quizState.wrongCount = 0;
    quizState.answeredTypes = { '词汇': 0, '语法': 0, '阅读': 0, '听力': 0 };
    quizState.wrongTypes = { '词汇': 0, '语法': 0, '阅读': 0, '听力': 0 };
    quizState.dimResults = []; // 重置维度记录
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
    // 清除计时器
    if (quizState.timerInterval) {
        clearInterval(quizState.timerInterval);
        quizState.timerInterval = null;
    }
    quizState.timerActive = false;
    
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
            '<div class="upgrade-subtitle">明天恢复20轮免费对话<br>或升级冲刺营无限对话</div>' +
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
            return { limited: true, message: '今日免费陪练额度已用完（20轮/天），明天恢复。升级冲刺营即可无限对话+逐句批改～' };
        }
        return { limited: false, remaining: remaining };
    }
    
    // 无缓存，使用本地计算
    var usage = getChatUsage();
    var limit = 25;
    if (usage.count >= limit) {
        return { limited: true, message: '今日免费陪练额度已用完（20轮/天），明天恢复。升级冲刺营即可无限对话+逐句批改～' };
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
            ctx.fillText('📚 我的' + EXAM_LABEL + '备考人格', width / 2, 36);
            
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
            ctx.fillText(EXAM_LABEL + '备考搭子 · AI智能诊断', width / 2, 300);
            
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
    '听力': { icon: '🎧', color: '#A29BFE', desc: '能否准确理解听力材料内容' },
    '细节定位': { icon: '🔍', color: '#6C5CE7', desc: '能否快速定位原文关键信息' },
    '推理判断': { icon: '🧠', color: '#00B894', desc: '能否从原文正确推导隐含信息' },
    '同义替换': { icon: '🔄', color: '#FDCB6E', desc: '能否识别选项与原文的同义表达' },
    '主旨归纳': { icon: '📋', color: '#E17055', desc: '能否准确把握文章中心和结构' },
    '态度判断': { icon: '🎯', color: '#0984E3', desc: '能否判断作者的观点和态度' }
};

// 诊断数据（从Bot回复解析）
// 百分位映射表
var PERCENTILE_MAP = {
    90: 95,
    80: 80,
    70: 65,
    60: 50,
    50: 35,
    40: 20,
    0: 5
};

// 获取百分位排名
function getPercentile(score) {
    if (score >= 90) return 95;
    if (score >= 80) return 80;
    if (score >= 70) return 65;
    if (score >= 60) return 50;
    if (score >= 50) return 35;
    if (score >= 40) return 20;
    return 5;
}

// 错因分析映射
var ERROR_REASON_MAP = {
    '细节定位': {
        reason: '关键词定位不准，可能被干扰选项迷惑',
        fix: '练习划关键词回原文定位，注意时间、数字、绝对词等信号词'
    },
    '推理判断': {
        reason: '过度推断或推断不足，答案需从原文出发',
        fix: '所有推断必须有原文依据，避免主观臆测'
    },
    '同义替换': {
        reason: '同义替换识别能力弱，需积累高频替换词',
        fix: '背诵常见同义替换词组，注意词性和句式变化'
    },
    '主旨归纳': {
        reason: '抓不住文章主旨，注意首尾段和转折词',
        fix: '先看首尾句和每段首句，关注高频名词和主题词'
    },
    '态度判断': {
        reason: '作者态度题要区分事实和观点',
        fix: '积累态度词（skeptical、optimistic等），区分直接表态和引用观点'
    }
};

// 3日行动计划模板
var ACTION_PLANS = {
    '细节定位': {
        day1: { focus: '关键词定位突破', tasks: ['做3道细节定位题，练习划关键词', '背5组常见同义替换词'], tip: '重点关注时间、数字、绝对词' },
        day2: { focus: '干扰项识别', tasks: ['做3道含干扰项的题目', '对比正确选项和干扰项的区别'], tip: '警惕"不是...而是..."等转折陷阱' },
        day3: { focus: '综合巩固', tasks: ['做1套完整阅读（5题）', '对照错因分析查漏补缺'], tip: '限时15分钟完成' }
    },
    '推理判断': {
        day1: { focus: '原文依据训练', tasks: ['做3道推理题，标注每题原文依据', '总结推理词（therefore、suggest等）'], tip: '没有原文支持的不选' },
        day2: { focus: '推断程度把握', tasks: ['练习区分"可能"和"一定"', '做2道推断题检验'], tip: '过度推断是常见陷阱' },
        day3: { focus: '综合巩固', tasks: ['做1套完整阅读', '分析所有推理题的解题思路'], tip: '每题必须找到原文依据' }
    },
    '同义替换': {
        day1: { focus: '高频替换词积累', tasks: ['背诵20组高频同义替换', '做2道同义替换专项题'], tip: '如：increase → rise/grow/boost' },
        day2: { focus: '词性变换识别', tasks: ['练习识别名词↔动词↔形容词的替换', '做2道综合替换题'], tip: '词性变换是常见考法' },
        day3: { focus: '综合巩固', tasks: ['做1套完整阅读', '整理当天遇到的替换词'], tip: '建立自己的替换词本' }
    },
    '主旨归纳': {
        day1: { focus: '文章结构识别', tasks: ['分析3篇文章的首尾段结构', '总结常见主旨句位置'], tip: '主旨通常在首段末句或末段首句' },
        day2: { focus: '主题词抓取', tasks: ['练习圈画高频名词', '做2道主旨大意题'], tip: '主题词会在文中反复出现' },
        day3: { focus: '综合巩固', tasks: ['做1套完整阅读', '每篇试着用一句话概括主旨'], tip: '排除过于具体或宽泛的选项' }
    },
    '态度判断': {
        day1: { focus: '态度词积累', tasks: ['背诵10组常见态度词', '区分正面/负面/中立态度'], tip: 'positive、negative、neutral需分清' },
        day2: { focus: '事实vs观点', tasks: ['练习区分文中事实和作者观点', '做2道态度题'], tip: '作者观点可能与专家引用不同' },
        day3: { focus: '综合巩固', tasks: ['做1套完整阅读', '标注每篇文章的态度词'], tip: '注意文章末尾的态度转折' }
    }
};

// 生成3日行动计划
function generateActionPlan(weakDims) {
    if (!weakDims || weakDims.length === 0) {
        return { dim: '阅读综合', plans: ACTION_PLANS['细节定位'] };
    }
    var primaryWeak = weakDims[0].name || '细节定位';
    var plans = ACTION_PLANS[primaryWeak] || ACTION_PLANS['细节定位'];
    return { dim: primaryWeak, plans: plans };
}

// 提取写作反馈
function extractWritingFeedback() {
    if (!diagState.writingScore) return null;
    var score = diagState.writingScore;
    var issues = [];
    
    // 根据各维度分数判断问题
    if (score.vocabulary < 60) {
        issues.push({ from: '词汇单一', to: '使用更丰富的同义词和短语' });
    }
    if (score.grammar < 60) {
        issues.push({ from: '存在语法错误', to: '注意时态、主谓一致' });
    }
    if (score.logic < 60) {
        issues.push({ from: '逻辑衔接较弱', to: '使用Firstly、However等连接词' });
    }
    if (score.coherence < 60) {
        issues.push({ from: '段落连贯性不足', to: '每个段落一个中心思想' });
    }
    
    return {
        total: score.total,
        issues: issues.slice(0, 2),  // 最多展示2个问题
        comment: score.comment || ''
    };
}

// 提取翻译反馈
function extractTranslationFeedback() {
    if (!diagState.translationScore) return null;
    var score = diagState.translationScore;
    var keywords = score.keywords || [];
    
    var hit = [];
    var miss = [];
    if (keywords && keywords.length > 0) {
        keywords.forEach(function(k) {
            if (k.hit) {
                hit.push(k.word);
            } else if (k.missed) {
                miss.push(k.word);
            }
        });
    }
    
    return {
        total: score.total,
        hit: hit.slice(0, 3),
        miss: miss.slice(0, 3),
        comment: score.comment || ''
    };
}


// 计算各维度平均答题耗时
function calculateDimTimes() {
    var dimTimes = {};
    var dimCounts = {};
    
    // 处理阅读题
    if (diagState.answers && diagState.answers.length > 0) {
        diagState.answers.forEach(function(ans) {
            if (ans.timeSpent && ans.ability) {
                var dim = ans.ability;
                if (!dimTimes[dim]) {
                    dimTimes[dim] = 0;
                    dimCounts[dim] = 0;
                }
                dimTimes[dim] += ans.timeSpent;
                dimCounts[dim]++;
            }
        });
    }
    
    // 处理听力题
    if (diagState.listeningAnswers && diagState.listeningAnswers.length > 0) {
        diagState.listeningAnswers.forEach(function(ans) {
            if (ans.timeSpent && ans.dimension) {
                var dim = ans.dimension;
                if (!dimTimes[dim]) {
                    dimTimes[dim] = 0;
                    dimCounts[dim] = 0;
                }
                dimTimes[dim] += ans.timeSpent;
                dimCounts[dim]++;
            }
        });
    }
    
    // 计算平均值（转换为秒）
    var result = {};
    Object.keys(dimTimes).forEach(function(dim) {
        if (dimCounts[dim] > 0) {
            result[dim] = Math.round(dimTimes[dim] / dimCounts[dim] / 1000);
        }
    });
    
    return result;
}

// 提取错题数据
function extractWrongQuestions() {
    var wrongQuestions = [];
    if (!diagState.answers || diagState.answers.length === 0) return wrongQuestions;
    
    var count = 0;
    for (var i = 0; i < diagState.answers.length && count < 5; i++) {
        var answer = diagState.answers[i];
        if (!answer.isCorrect) {
            var question = null;
            for (var j = 0; j < diagState.questions.length; j++) {
                if (diagState.questions[j].id === answer.id) {
                    question = diagState.questions[j];
                    break;
                }
            }
            if (question) {
                var ability = answer.ability || '细节定位';
                var errorInfo = ERROR_REASON_MAP[ability] || {
                    reason: '解题方法有待提高',
                    fix: '加强相关训练'
                };
                wrongQuestions.push({
                    num: i + 1,
                    userAnswer: answer.userAnswer,
                    correctAnswer: answer.correctAnswer,
                    question: question.question,
                    ability: ability,
                    reason: errorInfo.reason,
                    fix: errorInfo.fix
                });
                count++;
            }
        }
    }
    return wrongQuestions;
}

var reportData = {
    riskLevel: 'mid',
    totalScore: 0,
    dims: {},
    weakDims: [],
    advice: '',
    tips: [],
    personality: '',
    botText: '',
    percentile: 50,
    wrongQuestions: [],
    actionPlan: null,
    writingFeedback: null,
    translationFeedback: null
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
        botText: text,
        percentile: 50,
        wrongQuestions: [],
        actionPlan: null,
        writingFeedback: null,
        translationFeedback: null
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
    
    // 提取错题数据
    reportData.wrongQuestions = extractWrongQuestions();
    
    // 生成行动计划
    reportData.actionPlan = generateActionPlan(reportData.weakDims);
    
    // 提取百分位
    var avgScore = 0;
    var scoreCount = 0;
    Object.keys(reportData.dims).forEach(function(k) {
        avgScore += reportData.dims[k];
        scoreCount++;
    });
    if (scoreCount > 0) {
        reportData.percentile = getPercentile(Math.round(avgScore / scoreCount));
    }
    
    // 获取对比信息（用于进步提示）
    reportData.previousDiagnosis = getPreviousDiagnosis();
    reportData.compareSummary = generateCompareSummary(reportData, reportData.previousDiagnosis);
    reportData.progressHint = getProgressHint(reportData.compareSummary);
    
    // 提取写作/翻译反馈（如果有）
    if (diagState.writingScore) {
        reportData.writingFeedback = extractWritingFeedback();
    }
    if (diagState.translationScore) {
        reportData.translationFeedback = extractTranslationFeedback();
    }
    
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
            // 计算各维度平均耗时
            var dimTimes = calculateDimTimes();
            localStorage.setItem(examKey('ability_scores'), JSON.stringify({ dims: reportData.dims, dimTimes: dimTimes }));
        } catch(e) {}
        
        // 写入cet4_user_profile的startDate（如果还没有）
        try {
            var profile = safeGetItem(examKey('user_profile'), {});
            if (!profile.startDate) {
                profile.startDate = getTodayStr();
                localStorage.setItem(examKey('user_profile'), JSON.stringify(profile));
            }
        } catch(e) {}
    }
    
    // 计算并保存各维度平均耗时到reportData
    reportData.dimTimes = calculateDimTimes();
    
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
    phase: 'loading', // loading, questions, listening, selfeval, writing, translation, generating, done
    writingScore: null,
    translationScore: null,
    writingPrompt: null,
    translationPrompt: null,
    // 听力相关状态
    listeningPlayed: false,
    listeningReplayCount: 0,
    listeningAnswers: [],
    listeningCorrectCount: 0,
    listeningPassages: [],
    currentListeningPassageIndex: 0,
    currentListeningQIndex: 0
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
        phase: 'loading',
        writingScore: null,
        translationScore: null,
        writingPrompt: null,
        translationPrompt: null,
        listeningPlayed: false,
        listeningReplayCount: 0,
        listeningAnswers: [],
        listeningCorrectCount: 0,
        listeningPassages: [],
        currentListeningPassageIndex: 0,
        currentListeningQIndex: 0
    };
    
    overlay.classList.add('active');
    document.getElementById('diag-progress-wrap').style.display = 'none';
    renderDiagLoading('正在加载题目...');
    
    try {
        // 从diagnosis_questions.json加载完整题目（含passage原文）
        var diagUrl = EXAM_TYPE === 'cet6' ? '/public/cet6_diagnosis_questions.json' : '/public/diagnosis_questions.json';
        diagUrl += '?t=' + Date.now();
        console.log('[诊断] 加载诊断题库:', diagUrl);
        var resp = await fetchWithTimeout(diagUrl);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var diagData = await resp.json();
        
        var passages = diagData.passages || [];
        var listeningPassages = diagData.listening_passages || [];
        
        if (passages.length === 0 && listeningPassages.length === 0) {
            throw new Error('题库为空');
        }
        
        // 从阅读passage中抽取题目，每道题附上_passageText
        var questions = [];
        var allReadingQs = [];
        passages.forEach(function(p) {
            var passageText = p.text || '';
            (p.questions || []).forEach(function(q) {
                // 确保选项格式统一
                if (!q.optionA && q.options) {
                    q.optionA = q.options[0] || '';
                    q.optionB = q.options[1] || '';
                    q.optionC = q.options[2] || '';
                    q.optionD = q.options[3] || '';
                    delete q.options;
                }
                q._passageText = passageText;
                allReadingQs.push(q);
            });
        });
        
        // 按维度分组，每维度抽2-3题
        var dimMapping = {
            '细节定位': ['细节定位', '细节理解', '关键信息捕捉'],
            '推理判断': ['推理判断'],
            '同义替换': ['同义替换', '词义推断'],
            '主旨归纳': ['主旨归纳', '主旨大意'],
            '态度判断': ['态度判断', '态度推断']
        };
        var questionPerDim = 3;
        
        Object.keys(dimMapping).forEach(function(dimName) {
            var abilities = dimMapping[dimName];
            var dimQs = allReadingQs.filter(function(q) {
                return q.answer && abilities.indexOf(q.ability) !== -1;
            });
            dimQs.sort(function() { return Math.random() - 0.5; });
            questions = questions.concat(dimQs.slice(0, questionPerDim));
        });
        
        // 不足15题时补充
        if (questions.length < 15) {
            var remaining = allReadingQs.filter(function(q) {
                return q.answer && questions.indexOf(q) === -1;
            });
            remaining.sort(function() { return Math.random() - 0.5; });
            questions = questions.concat(remaining.slice(0, 15 - questions.length));
        }
        
        // 随机打乱
        questions.sort(function() { return Math.random() - 0.5; });
        
        console.log('[诊断] 抽取阅读题:', questions.length, '维度:', questions.map(function(q){return q.ability}));
        
        // 写作和翻译题目（用diagData中的，如果没有则用内置的）
        if (diagData.writing_prompts && diagData.writing_prompts.length > 0) {
            diagState.writingPrompts = diagData.writing_prompts;
        } else {
            diagState.writingPrompts = [
                {topic: 'The Impact of Technology on Learning', desc: 'Directions: For this part, you are allowed 30 minutes to write a short essay on the impact of technology on learning. You should write at least 120 words but no more than 180 words.'},
                {topic: 'The Importance of Teamwork', desc: 'Directions: For this part, you are allowed 30 minutes to write a short essay on the importance of teamwork. You should write at least 120 words but no more than 180 words.'},
                {topic: 'How to Deal with Stress', desc: 'Directions: For this part, you are allowed 30 minutes to write a short essay on how to deal with stress. You should write at least 120 words but no more than 180 words.'}
            ];
        }
        if (EXAM_TYPE === 'cet6' && (!diagData.writing_prompts || diagData.writing_prompts.length === 0)) {
            diagState.writingPrompts = [
                {topic: 'The Value of Innovation', desc: 'Directions: For this part, you are allowed 30 minutes to write an essay on the value of innovation. You should write at least 150 words but no more than 200 words.'},
                {topic: 'Work-Life Balance', desc: 'Directions: For this part, you are allowed 30 minutes to write an essay on work-life balance. You should write at least 150 words but no more than 200 words.'},
                {topic: 'The Role of Artificial Intelligence', desc: 'Directions: For this part, you are allowed 30 minutes to write an essay on the role of artificial intelligence in modern society. You should write at least 150 words but no more than 200 words.'}
            ];
        }
        if (diagData.translation_prompts && diagData.translation_prompts.length > 0) {
            diagState.translationPrompts = diagData.translation_prompts;
        } else {
            diagState.translationPrompts = [
                {chinese: '中国是世界上最古老的文明之一，拥有五千多年的历史。中国文化对世界文化的发展做出了重要贡献。', reference: 'China is one of the oldest civilizations in the world, with a history of over five thousand years. Chinese culture has made important contributions to the development of world culture.'},
                {chinese: '随着经济的发展，越来越多的中国人有机会出国旅游。这不仅开阔了他们的眼界，也促进了文化交流。', reference: 'With the development of economy, more and more Chinese people have the opportunity to travel abroad. This not only broadens their horizons but also promotes cultural exchange.'},
                {chinese: '互联网的普及改变了人们的生活方式。现在，人们可以通过网络购物、学习、交流，这大大提高了生活效率。', reference: 'The popularity of the Internet has changed people\'s lifestyle. Nowadays, people can shop, study, and communicate online, which greatly improves the efficiency of life.'}
            ];
        }
        if (EXAM_TYPE === 'cet6' && (!diagData.translation_prompts || diagData.translation_prompts.length === 0)) {
            diagState.translationPrompts = [
                {chinese: '丝绸之路是古代连接中国与地中海地区的重要贸易通道。它不仅促进了商品的流通，也推动了不同文明之间的文化交流与融合。', reference: 'The Silk Road was an important trade route connecting China with the Mediterranean region in ancient times. It not only facilitated the flow of goods but also promoted cultural exchange and integration between different civilizations.'},
                {chinese: '人工智能技术的快速发展正在深刻改变各行各业。从医疗诊断到自动驾驶，AI的应用前景广阔，但也引发了关于就业和隐私的担忧。', reference: 'The rapid development of artificial intelligence technology is profoundly transforming various industries. From medical diagnosis to autonomous driving, AI has broad application prospects, but it has also raised concerns about employment and privacy.'},
                {chinese: '中国的高铁网络已成为世界上最发达的铁路系统之一，总里程超过四万公里。它不仅缩短了城市间的距离，也推动了区域经济的协调发展。', reference: "China's high-speed rail network has become one of the most developed railway systems in the world, with a total mileage exceeding 40,000 kilometers. It not only shortens the distance between cities but also promotes the coordinated development of regional economies."}
            ];
        }
        
        if (questions.length === 0) {
            closeDiagOverlay();
            showToast('诊断题库暂不可用，将使用AI对话诊断');
            openChat('chat');
            setTimeout(function(){ sendSuggestion('开始AI诊断，帮我找出' + EXAM_LABEL + '薄弱点'); }, 300);
            return;
        }
        
        diagState.questions = questions;
        diagState.phase = 'questions';
        document.getElementById('diag-progress-wrap').style.display = '';
        
        try {
            console.log('[诊断] 显示第1题, 阅读题:', diagState.questions.length);
            showCurrentQuestion();
            console.log('[诊断] 第1题显示成功');
        } catch(e) {
            console.error('[诊断] 显示题目失败:', e);
            showSelfEval();
        }
        
    } catch(err) {
        console.error('[诊断] 加载失败:', err);
        closeDiagOverlay();
        showToast('加载诊断题失败，请重试');
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


// ========== 听力实测功能 ==========

// 判断是否为六级用户
function isCET6User() {
    var userData = safeGetItem(examKey('user'), {});
    var uid = userData.uid || '';
    // 六级UID以CET6开头
    return uid.startsWith('CET6') || uid.startsWith('6');
}

// 获取CET级别标签
function getCETLevelLabel() {
    return isCET6User() ? '六级' : '四级';
}

// 听力播放器状态
var listeningPlayer = {
    isPlaying: false,
    isPaused: false,
    currentUtterances: [],
    currentIndex: 0,
    onComplete: null,
    round: 1,
    maxRounds: 1,  // 默认只播放1遍（模拟真题）
    extraRounds: 0,  // 额外重播次数
    maxExtraRounds: 1,  // 最多允许1次额外重播
    currentText: '',
    totalDuration: 0,
    startTime: 0,
    progressInterval: null
};

function isSpeechSynthesisSupported() {
    return 'speechSynthesis' in window;
}

var cachedVoices = null;
var voicePromise = null;

function loadVoices() {
    if (cachedVoices) return Promise.resolve(cachedVoices);
    if (voicePromise) return voicePromise;
    
    voicePromise = new Promise(function(resolve) {
        if (!isSpeechSynthesisSupported()) {
            resolve(null);
            return;
        }
        var voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
            cachedVoices = voices;
            resolve(voices);
        } else {
            speechSynthesis.onvoiceschanged = function() {
                cachedVoices = speechSynthesis.getVoices();
                resolve(cachedVoices);
            };
            setTimeout(function() {
                if (!cachedVoices) {
                    cachedVoices = speechSynthesis.getVoices();
                    resolve(cachedVoices || []);
                }
            }, 1000);
        }
    });
    return voicePromise;
}

function getVoiceByGender(isMale, lang) {
    return loadVoices().then(function(voices) {
        if (!voices || voices.length === 0) return null;
        var enVoices = voices.filter(function(v) { return v.lang.startsWith('en'); });
        
        if (isMale) {
            var maleVoice = enVoices.find(function(v) { 
                var name = v.name.toLowerCase();
                return (name.includes('male') || name.includes('daniel') || 
                        name.includes('alex') || name.includes('mark') ||
                        name.includes('david') || name.includes('tom')) && v.lang.includes('US');
            });
            return maleVoice || enVoices[0];
        } else {
            var femaleVoice = enVoices.find(function(v) { 
                var name = v.name.toLowerCase();
                return (name.includes('female') || name.includes('samantha') || 
                        name.includes('victoria') || name.includes('karen') ||
                        name.includes('susan') || name.includes('zira')) && v.lang.includes('US');
            });
            return femaleVoice || enVoices[0];
        }
    });
}

function parseListeningText(text, isConversation) {
    var segments = [];
    
    if (isConversation) {
        var lines = text.split('\n');
        var currentSpeaker = null;
        var currentText = '';
        
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;
            
            if (line.startsWith('M:') || line.startsWith('Man:') || line.startsWith('W:') || line.startsWith('Woman:')) {
                if (currentText && currentSpeaker) {
                    segments.push({
                        text: currentText.trim(),
                        isMale: currentSpeaker === 'M',
                        pauseAfter: 1000
                    });
                }
                
                var colonIndex = line.indexOf(':');
                currentSpeaker = line.substring(0, colonIndex) === 'W' || line.substring(0, colonIndex) === 'Woman' ? 'W' : 'M';
                currentText = line.substring(colonIndex + 1).trim();
            } else {
                currentText += ' ' + line;
            }
        }
        
        if (currentText && currentSpeaker) {
            segments.push({
                text: currentText.trim(),
                isMale: currentSpeaker === 'M',
                pauseAfter: 500
            });
        }
    } else {
        var sentences = text.split(/(?<=[.!?])\s+/);
        
        for (var i = 0; i < sentences.length; i++) {
            var s = sentences[i].trim();
            if (!s) continue;
            
            var lastChar = s.charAt(s.length - 1);
            var pauseAfter = 800;
            
            if (lastChar === ',') {
                pauseAfter = 300;
            } else if (lastChar === '?') {
                pauseAfter = 800;
            } else if (lastChar === '!') {
                pauseAfter = 800;
            }
            
            if (i === sentences.length - 1) {
                pauseAfter = 300;
            }
            
            segments.push({
                text: s,
                isMale: false,
                pauseAfter: pauseAfter
            });
        }
    }
    
    return segments;
}

function playListeningRound(text, isConversation, onSegmentStart, onComplete) {
    return loadVoices().then(function() {
        var segments = parseListeningText(text, isConversation);
        
        // 根据CET级别设置语速
        // 四级：约130词/分钟，rate设为1.0
        // 六级：约150词/分钟，rate设为1.15（适当加快）
        var cetRate = isCET6User() ? 1.15 : 1.0;
        
        function playSegment(index) {
            if (index >= segments.length) {
                return Promise.resolve();
            }
            
            var seg = segments[index];
            
            return getVoiceByGender(seg.isMale, 'en-US').then(function(voice) {
                return new Promise(function(resolve) {
                    if (onSegmentStart) onSegmentStart(index, segments.length);
                    
                    var utterance = new SpeechSynthesisUtterance(seg.text);
                    utterance.lang = 'en-US';
                    utterance.rate = cetRate;  // 使用CET级别对应的语速
                    utterance.pitch = seg.isMale ? 0.9 : 1.1;
                    
                    if (voice) {
                        utterance.voice = voice;
                    }
                    
                    utterance.onend = function() {
                        setTimeout(function() {
                            resolve();
                            playSegment(index + 1);
                        }, seg.pauseAfter);
                    };
                    
                    utterance.onerror = function(e) {
                        setTimeout(function() {
                            resolve();
                            playSegment(index + 1);
                        }, seg.pauseAfter);
                    };
                    
                    speechSynthesis.speak(utterance);
                });
            });
        }
        
        return playSegment(0);
    }.bind(this));
}

function stopListeningPlayback() {
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
}

// 更新听力进度UI
function updateListeningProgressUI(progress, totalSeconds) {
    var progressBar = document.getElementById('listening-progress-bar');
    var progressText = document.getElementById('listening-progress-text');
    var progressFill = document.getElementById('listening-progress-fill');
    
    if (progressBar) {
        var percentage = totalSeconds > 0 ? Math.round((progress / totalSeconds) * 100) : 0;
        progressBar.value = percentage;
        if (progressFill) {
            progressFill.style.width = percentage + '%';
        }
    }
    
    if (progressText) {
        var remaining = Math.max(0, Math.ceil(totalSeconds - progress));
        progressText.textContent = '剩余 ' + remaining + 's';
    }
}

// 开始进度更新定时器
function startProgressTimer() {
    if (listeningPlayer.progressInterval) {
        clearInterval(listeningPlayer.progressInterval);
    }
    
    var startTime = Date.now();
    var totalDuration = listeningPlayer.totalDuration || 60; // 默认60秒
    
    listeningPlayer.progressInterval = setInterval(function() {
        if (!listeningPlayer.isPlaying || listeningPlayer.isPaused) return;
        
        var elapsed = Math.floor((Date.now() - startTime) / 1000);
        var remaining = Math.max(0, totalDuration - elapsed);
        
        updateListeningProgressUI(elapsed, totalDuration);
        
        if (remaining <= 0) {
            clearInterval(listeningPlayer.progressInterval);
        }
    }, 500);
}

function playListeningFull(text, isConversation, onComplete) {
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
    listeningPlayer.totalDuration = Math.max(30, text.split(/\s+/).length / 2); // 估算时长
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
}

// 显示进度条
function showListeningProgressBar() {
    var container = document.getElementById('listening-progress-container');
    if (container) {
        container.style.display = 'block';
    }
}

// 隐藏进度条
function hideListeningProgressBar() {
    var container = document.getElementById('listening-progress-container');
    if (container) {
        setTimeout(function() {
            container.style.display = 'none';
        }, 1000);
    }
}

// 更新听力提示文本
function updateListeningHint(text) {
    var hint = document.getElementById('listening-hint');
    if (hint) {
        hint.textContent = text;
    }
}

function updatePlayButtonState(state) {
    var btn = document.getElementById('listening-play-btn');
    if (!btn) return;
    
    if (state === 'playing') {
        btn.classList.add('playing');
        btn.innerHTML = '<span class="wave-container"><span></span><span></span><span></span></span>';
    } else {
        btn.classList.remove('playing');
        btn.innerHTML = '<span class="play-icon">▶</span>';
    }
}

function updateRoundIndicator(round) {
    var indicator = document.getElementById('listening-round-indicator');
    if (!indicator) return;
    
    var cetLabel = getCETLevelLabel();
    
    if (round === 1) {
        indicator.textContent = '🎧 ' + cetLabel + '听力 第1遍播放中...';
        indicator.className = 'listening-round-indicator round-1';
    } else if (round === 1.5) {
        indicator.textContent = '⏳ 准备第2遍...';
        indicator.className = 'listening-round-indicator round-waiting';
    } else if (round === 2) {
        indicator.textContent = '🎧 ' + cetLabel + '听力 第2遍播放中...';
        indicator.className = 'listening-round-indicator round-2';
    }
}

function updateReplayButtonState() {
    var btn = document.getElementById('listening-replay-btn');
    var hint = document.getElementById('listening-hint');
    if (!btn) return;
    
    var isVip = isPathVipUser();
    var extraRounds = listeningPlayer.extraRounds || 0;
    var canReplay = isVip || extraRounds < listeningPlayer.maxExtraRounds;
    
    btn.disabled = !canReplay;
    
    if (hint) {
        if (diagState.listeningPlayed) {
            hint.innerHTML = '✅ 已播放完毕';
        } else if (extraRounds >= listeningPlayer.maxExtraRounds && !isVip) {
            hint.innerHTML = '⚠️ 真题听力只放一遍哦，习惯它';
        } else if (listeningPlayer.isPlaying) {
            hint.innerHTML = '🎧 听力播放中...';
        } else {
            hint.innerHTML = '点击播放听力';
        }
    }
    
    // 更新按钮文本
    if (btn) {
        if (extraRounds >= listeningPlayer.maxExtraRounds && !isVip) {
            btn.innerHTML = '🔇 再听一遍 <span class="replay-tip">(限2遍)</span>';
            btn.disabled = true;
        } else {
            btn.innerHTML = '🔄 再听一遍 <span class="replay-count">' + (extraRounds + 1) + '/2</span>';
        }
    }
}

function getCurrentListeningGlobalIndex() {
    var idx = 0;
    for (var i = 0; i < diagState.currentListeningPassageIndex; i++) {
        idx += diagState.listeningPassages[i].questions.length;
    }
    return idx + diagState.currentListeningQIndex;
}

function getTotalListeningQuestions() {
    var total = 0;
    for (var i = 0; i < diagState.listeningPassages.length; i++) {
        total += diagState.listeningPassages[i].questions.length;
    }
    return total;
}

function showCurrentListening() {
    var passage = diagState.listeningPassages[diagState.currentListeningPassageIndex];
    // 记录听力题目展示时间
    diagState.questionShowTime = Date.now();
    if (!passage) {
        showSelfEval();
        return;
    }
    
    var q = passage.questions[diagState.currentListeningQIndex];
    if (!q) {
        diagState.currentListeningPassageIndex++;
        diagState.currentListeningQIndex = 0;
        diagState.listeningPlayed = false;
        diagState.listeningReplayCount = 0;
        // 重置听力播放器状态
        listeningPlayer.extraRounds = 0;
        listeningPlayer.round = 1;
        listeningPlayer.maxRounds = 1;
        listeningPlayer.currentText = '';
        listeningPlayer.totalDuration = 0;
        showCurrentListening();
        return;
    }
    
    var globalIndex = getCurrentListeningGlobalIndex();
    var totalQuestions = getTotalListeningQuestions();
    var progress = Math.round((globalIndex / totalQuestions) * 100);
    var isConversation = passage.type === 'conversation';
    
    document.getElementById('diag-progress-fill').style.width = progress + '%';
    document.getElementById('diag-progress-text').textContent = '听力 第' + (globalIndex + 1) + '/' + totalQuestions + '题';
    
    var isVip = isPathVipUser();
    var extraRounds = listeningPlayer.extraRounds || 0;
    var canReplay = isVip || extraRounds < listeningPlayer.maxExtraRounds;
    var cetLabel = getCETLevelLabel();
    
    var html = '<div class="listening-section">';
    
    html += '<div class="listening-passage-card">';
    html += '<div class="listening-passage-type">';
    html += isConversation ? '🎧 短对话' : '📝 短文理解';
    html += '</div>';
    
    // 听力播放器区域
    html += '<div class="listening-player">';
    html += '<div class="listening-wave" id="listening-wave">';
    html += '<span></span><span></span><span></span><span></span><span></span>';
    html += '</div>';
    
    html += '<button class="listening-play-btn" id="listening-play-btn" onclick="handlePlayClick()">';
    html += '<span class="play-icon">▶</span>';
    html += '</button>';
    
    html += '<div class="listening-hint" id="listening-hint">点击播放听力</div>';
    html += '</div>';
    
    // 进度条容器
    html += '<div class="listening-progress-container" id="listening-progress-container" style="display:none;">';
    html += '<div class="listening-progress-bar-wrapper">';
    html += '<progress id="listening-progress-bar" value="0" max="100"></progress>';
    html += '<div class="listening-progress-fill" id="listening-progress-fill" style="width:0%;"></div>';
    html += '</div>';
    html += '<div class="listening-progress-text" id="listening-progress-text">剩余 0s</div>';
    html += '</div>';
    
    html += '<div class="listening-round-indicator" id="listening-round-indicator"></div>';
    
    // 重播按钮
    var replayBtnClass = 'listening-replay-btn';
    if (extraRounds >= listeningPlayer.maxExtraRounds && !isVip) {
        replayBtnClass += ' disabled';
    }
    html += '<button class="' + replayBtnClass + '" id="listening-replay-btn" onclick="handleReplayClick()" ' + (!canReplay ? 'disabled' : '') + '>';
    if (extraRounds >= listeningPlayer.maxExtraRounds && !isVip) {
        html += '🔇 再听一遍 <span class="replay-tip">(限2遍)</span>';
    } else {
        html += '🔄 再听一遍 <span class="replay-count">' + (extraRounds + 1) + '/2</span>';
    }
    html += '</button>';
    
    html += '<div class="listening-play-hint">📢 ' + cetLabel + '听力语速：' + (isCET6User() ? '约150词/分钟' : '约130词/分钟') + '</div>';
    
    html += '</div>';
    
    html += '<div class="listening-question-card">';
    html += '<div class="diag-question-num">第 ' + (globalIndex + 1) + ' / ' + totalQuestions + ' 题</div>';
    html += '<div class="diag-question-text">' + escapeHtml(q.question) + '</div>';
    html += '<div class="diag-options">';
    html += '<div class="diag-option-btn" onclick="selectListeningOption(this, \'A\')">' +
        '<div class="diag-option-letter">A</div>' +
        '<div class="diag-option-text">' + q.optionA + '</div>' +
    '</div>';
    html += '<div class="diag-option-btn" onclick="selectListeningOption(this, \'B\')">' +
        '<div class="diag-option-letter">B</div>' +
        '<div class="diag-option-text">' + q.optionB + '</div>' +
    '</div>';
    html += '<div class="diag-option-btn" onclick="selectListeningOption(this, \'C\')">' +
        '<div class="diag-option-letter">C</div>' +
        '<div class="diag-option-text">' + q.optionC + '</div>' +
    '</div>';
    html += '<div class="diag-option-btn" onclick="selectListeningOption(this, \'D\')">' +
        '<div class="diag-option-letter">D</div>' +
        '<div class="diag-option-text">' + q.optionD + '</div>' +
    '</div>';
    html += '</div>';
    html += '</div>';
    
    html += '</div>';
    
    document.getElementById('diag-body').innerHTML = html;
}

function handlePlayClick() {
    var passage = diagState.listeningPassages[diagState.currentListeningPassageIndex];
    if (!passage) return;
    
    stopListeningPlayback();
    var isConversation = passage.type === 'conversation';
    
    playListeningFull(passage.text, isConversation, function() {
        console.log('[听力播放完成]');
    });
}

function handleReplayClick() {
    var isVip = isPathVipUser();
    var extraRounds = listeningPlayer.extraRounds || 0;
    
    // 检查重播次数限制
    if (!isVip && extraRounds >= listeningPlayer.maxExtraRounds) {
        showToast('⚠️ 真题听力只放一遍哦，习惯它');
        return;
    }
    
    var passage = diagState.listeningPassages[diagState.currentListeningPassageIndex];
    if (!passage) return;
    
    // 增加重播次数
    if (!isVip) {
        listeningPlayer.extraRounds++;
        updateReplayButtonState();
    }
    
    var isConversation = passage.type === 'conversation';
    stopListeningPlayback();
    listeningPlayer.maxRounds = 1;  // 额外重播只播放1遍
    
    playListeningFull(passage.text, isConversation, function() {
        console.log('[额外重播完成]');
        // 重播完成后更新按钮状态
        updateReplayButtonState();
    });
}

function selectListeningOption(btn, selectedValue) {
    var passage = diagState.listeningPassages[diagState.currentListeningPassageIndex];
    var q = passage.questions[diagState.currentListeningQIndex];
    var correctAnswer = q.answer;
    var isCorrect = selectedValue === correctAnswer;
    
    stopListeningPlayback();
    
    var allBtns = document.querySelectorAll('.diag-option-btn');
    allBtns.forEach(function(b) { b.classList.add('disabled'); });
    
    diagState.listeningAnswers.push({
        id: q.question_id,
        passageId: passage.passage_id,
        userAnswer: selectedValue,
        correctAnswer: correctAnswer,
        isCorrect: isCorrect,
        dimension: q.dimension
    });
    // 记录听力答题耗时
    var lastListeningAnswer = diagState.listeningAnswers[diagState.listeningAnswers.length - 1];
    lastListeningAnswer.timeSpent = Date.now() - (diagState.questionShowTime || Date.now());
    
    if (isCorrect) {
        diagState.listeningCorrectCount++;
    }
    
    setTimeout(function() {
        diagState.currentListeningQIndex++;
        
        if (diagState.currentListeningQIndex >= passage.questions.length) {
            diagState.currentListeningPassageIndex++;
            diagState.currentListeningQIndex = 0;
            diagState.listeningPlayed = false;
            diagState.listeningReplayCount = 0;
        }
        
        // 重置听力播放器状态
        listeningPlayer.extraRounds = 0;
        listeningPlayer.round = 1;
        listeningPlayer.maxRounds = 1;
        listeningPlayer.currentText = '';
        listeningPlayer.totalDuration = 0;
        
        showCurrentListening();
    }, 500);
}

function startReadingPhase() {
    // 从统一题库加载阅读题
    var quizUrl = EXAM_TYPE === 'cet6' ? '/public/cet6_quiz_questions.json' : '/public/quiz_questions.json';
    quizUrl += '?t=' + Date.now();
    console.log('[阅读阶段] 加载题目:', quizUrl);
    fetchWithTimeout(quizUrl).then(function(resp) {
        return resp.json();
    }).then(function(allQuestions) {
        // 筛选阅读题
        var readingQuestions = allQuestions.filter(function(q) {
            return q.type && q.type.indexOf('阅读') !== -1 && q.answer;
        });
        
        // 按维度分配
        var targetAbilities = ['细节理解', '推理判断', '同义替换', '主旨归纳', '态度判断'];
        var questionPerDim = 2;
        var questions = [];
        
        targetAbilities.forEach(function(ability) {
            var dimQuestions = readingQuestions.filter(function(q) {
                return q.ability === ability;
            });
            dimQuestions.sort(function() { return Math.random() - 0.5; });
            var selected = dimQuestions.slice(0, questionPerDim);
            questions = questions.concat(selected);
        });
        
        if (questions.length === 0) {
            showSelfEval();
            return;
        }
        
        diagState.questions = questions;
        diagState.phase = 'questions';
        diagState.currentQIndex = 0;
        showCurrentQuestion();
    }).catch(function(e) {
        console.error('[加载阅读题目失败]', e);
        showSelfEval();
    });
}


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

// ========== 听力实测功能结束 ==========


// 显示当前题目
function showCurrentQuestion() {
    // 记录题目展示时间
    diagState.questionShowTime = Date.now();
    console.log('[诊断] showCurrentQuestion called, index:', diagState.currentQIndex, 'phase:', diagState.phase);
    var q = diagState.questions[diagState.currentQIndex];
    if (!q) {
        console.error('[诊断] 题目为空! index:', diagState.currentQIndex, 'total:', diagState.questions.length);
        showSelfEval();
        return;
    }
    console.log('[诊断] 题目:', q.id, q.question ? q.question.substring(0, 30) : 'NO QUESTION');
    
    var totalQuestions = diagState.questions.length;
    var progress = Math.round((diagState.currentQIndex / totalQuestions) * 100);
    document.getElementById('diag-progress-fill').style.width = progress + '%';
    document.getElementById('diag-progress-text').textContent = '阅读 第' + (diagState.currentQIndex + 1) + '题/共' + totalQuestions + '题';
    
    // 构建HTML
    var html = '<div class="diag-question-card">';
    
    // 显示可折叠的阅读原文
    if (q._passageText) {
        html += '<div class="diag-passage-wrap">' +
            '<div class="diag-passage-toggle" onclick="togglePassage(this)">📖 点击展开阅读原文 <span class="toggle-arrow">▼</span></div>' +
            '<div class="diag-passage-content" style="display:none">' +
            (function() {
                var parts = q._passageText.split('\n');
                var title = parts[0];
                var body = parts.slice(1).join('\n');
                var html = '<div class="diag-passage-title">' + escapeHtml(title) + '</div>';
                if (body.trim()) {
                    html += '<div class="diag-passage-divider"></div>';
                    html += '<div class="diag-passage-body">' + escapeHtml(body) + '</div>';
                }
                return html;
            })() +
            '</div>' +
        '</div>';
    }
    
    // 判断题目类型，显示对应的Part标题
    var qType = q.type || q.category || '';
    var dimName = q.ability || '细节理解';
    var isLC = qType.indexOf('LC') >= 0 || qType.indexOf('听力') >= 0 || dimName === '听力' || dimName === '听力理解';
    var isRD = qType.indexOf('RC') >= 0 || qType.indexOf('阅读') >= 0 || dimName === '阅读' || dimName === '阅读理解';
    var partTitle = isLC ? 'Part I Listening Comprehension' : (isRD ? 'Part II Reading Comprehension' : 'Part III Language Knowledge');
    var sectionLabel = isLC ? 'Section A' : '';
    
    // 试卷格式头部
    html += '<div class="exam-paper-header">' +
        '<div class="exam-part-title">' + partTitle + '</div>' +
        (sectionLabel ? '<div class="exam-section-label">' + sectionLabel + '</div>' : '') +
    '</div>';
    
    html += '<div class="exam-divider"></div>';
    
    var tipInfo = getTipInfo(dimName);
    html += '<div class="diag-dim-tag">' + tipInfo.tag + '</div>' +
        '<div class="diag-question-num">Q' + (diagState.currentQIndex + 1) + '</div>' +
        '<div class="diag-question-text">' + escapeHtml(q.question) + '</div>' +
        '<div class="diag-options">' +
            renderOptionBtn('A', q.optionA, 'A') +
            renderOptionBtn('B', q.optionB, 'B') +
            renderOptionBtn('C', q.optionC, 'C') +
            renderOptionBtn('D', q.optionD, 'D') +
        '</div>' +
        '<div class="exam-divider"></div>' +
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
// 选择选项（阅读阶段专用）
function selectOption(btn, selectedValue) {
    // 如果是听力阶段，跳转到听力处理函数
    if (diagState.phase === 'listening') {
        selectListeningOption(btn, selectedValue);
        return;
    }
    
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
    // 记录答题耗时
    var lastAnswer = diagState.answers[diagState.answers.length - 1];
    lastAnswer.timeSpent = Date.now() - (diagState.questionShowTime || Date.now());
    
    // 显示技巧点拨卡片
    var dimName = q.ability || '细节理解';
    var tipInfo = getTipInfo(dimName);
    var tipHtml = '<div class="diag-tip-card">' +
        '<div class="diag-tip-header">' + tipInfo.tag + '</div>' +
        '<div class="diag-tip-text">' + tipInfo.tip + '</div>' +
        (isCorrect ? '' : '<div class="diag-tip-wrong">' + tipInfo.wrongHint + '</div>') +
        '</div>';
    document.querySelector('.diag-question-card').insertAdjacentHTML('beforeend', tipHtml);
    
    // 1500ms后自动下一题（给用户时间看技巧点拨）
    setTimeout(function() {
        diagState.currentQIndex++;
        var totalQuestions = diagState.questions.length;
        if (diagState.currentQIndex >= totalQuestions) {
            // 阅读题做完，进入听力测试
            startListeningTest();
        } else {
            showCurrentQuestion();
        }
    }, 1500);
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
                        '<div class="eval-letter">A</div><div class="eval-desc">较好</div><div class="eval-sub">能听懂大部分对话和短文</div>' +
                    '</div>' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'听力\', \'B\')">' +
                        '<div class="eval-letter">B</div><div class="eval-desc">一般</div><div class="eval-sub">听懂大意，细节容易漏</div>' +
                    '</div>' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'听力\', \'C\')">' +
                        '<div class="eval-letter">C</div><div class="eval-desc">较弱</div><div class="eval-sub">只能抓住零散单词</div>' +
                    '</div>' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'听力\', \'D\')">' +
                        '<div class="eval-letter">D</div><div class="eval-desc">薄弱</div><div class="eval-sub">基本听不懂在说什么</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            
            '<div class="diag-eval-item">' +
                '<div class="diag-eval-label">📖 阅读能力</div>' +
                '<div class="diag-eval-options">' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'阅读\', \'A\')">' +
                        '<div class="eval-letter">A</div><div class="eval-desc">较好</div><div class="eval-sub">能读懂长文并准确答题</div>' +
                    '</div>' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'阅读\', \'B\')">' +
                        '<div class="eval-letter">B</div><div class="eval-desc">一般</div><div class="eval-sub">能理解大意，细节易错</div>' +
                    '</div>' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'阅读\', \'C\')">' +
                        '<div class="eval-letter">C</div><div class="eval-desc">较弱</div><div class="eval-sub">词汇量不够，读得很慢</div>' +
                    '</div>' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'阅读\', \'D\')">' +
                        '<div class="eval-letter">D</div><div class="eval-desc">薄弱</div><div class="eval-sub">基本读不懂文章内容</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            
            '<div class="diag-eval-item">' +
                '<div class="diag-eval-label">✍️ 写作能力</div>' +
                '<div class="diag-eval-options">' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'写作\', \'A\')">' +
                        '<div class="eval-letter">A</div><div class="eval-desc">较好</div><div class="eval-sub">能独立写出完整作文</div>' +
                    '</div>' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'写作\', \'B\')">' +
                        '<div class="eval-letter">B</div><div class="eval-desc">一般</div><div class="eval-sub">能写但常卡壳凑字数</div>' +
                    '</div>' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'写作\', \'C\')">' +
                        '<div class="eval-letter">C</div><div class="eval-desc">较弱</div><div class="eval-sub">只能写简单句，容易跑题</div>' +
                    '</div>' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'写作\', \'D\')">' +
                        '<div class="eval-letter">D</div><div class="eval-desc">薄弱</div><div class="eval-sub">不知道从哪下笔</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            
            '<div class="diag-eval-item">' +
                '<div class="diag-eval-label">🔄 翻译能力</div>' +
                '<div class="diag-eval-options">' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'翻译\', \'A\')">' +
                        '<div class="eval-letter">A</div><div class="eval-desc">较好</div><div class="eval-sub">能准确翻译中英段落</div>' +
                    '</div>' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'翻译\', \'B\')">' +
                        '<div class="eval-letter">B</div><div class="eval-desc">一般</div><div class="eval-sub">意思能翻出来，表达不地道</div>' +
                    '</div>' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'翻译\', \'C\')">' +
                        '<div class="eval-letter">C</div><div class="eval-desc">较弱</div><div class="eval-sub">只会逐字翻，句子不通顺</div>' +
                    '</div>' +
                    '<div class="diag-eval-btn" onclick="selectEval(this, \'翻译\', \'D\')">' +
                        '<div class="eval-letter">D</div><div class="eval-desc">薄弱</div><div class="eval-sub">很多词不知道怎么翻</div>' +
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
    
    // 更新按钮文字
    if (!btn.disabled) {
        btn.innerHTML = '<span>✨</span> 开始写作实测';
    }
}

// ===== 写作实测 =====
// 开始写作实测
function startWritingTest() {
    diagState.phase = 'writing';
    
    // 随机选择一个写作题目
    var prompts = diagState.writingPrompts || [];
    if (prompts.length === 0) {
        // 如果没有题目，直接跳过
        skipWritingTest();
        return;
    }
    var randomIndex = Math.floor(Math.random() * prompts.length);
    var prompt = prompts[randomIndex];
    diagState.writingPrompt = prompt;
    
    // 更新进度显示
    document.getElementById('diag-progress-fill').style.width = '80%';
    document.getElementById('diag-progress-text').textContent = '第 3/4 步';
    
    var html = 
        '<div class="diag-writing-section">' +
            '<div class="diag-writing-header">' +
                '<div class="diag-writing-title">✍️ 写作实测</div>' +
                '<div class="diag-writing-subtitle">请根据题目要求完成一篇英文作文</div>' +
            '</div>' +
            '<div class="diag-writing-prompt">' +
                '<div class="diag-prompt-title">' + escapeHtml(prompt.title) + '</div>' +
                '<div class="diag-prompt-desc">' + escapeHtml(prompt.description) + '</div>' +
            '</div>' +
            '<textarea class="diag-writing-textarea" id="writing-input" placeholder="请在这里输入你的作文..." oninput="updateWritingCount()"></textarea>' +
            '<div class="diag-word-count" id="writing-count">已写 0 字（至少30字）</div>' +
            '<div class="diag-writing-actions">' +
                '<button class="diag-writing-submit" id="writing-submit-btn" onclick="submitWritingTest()" disabled>提交评分</button>' +
                '<button class="diag-writing-skip" onclick="skipWritingTest()">跳过</button>' +
            '</div>' +
        '</div>';
    
    document.getElementById('diag-body').innerHTML = html;
}

// 更新写作字数统计
function updateWritingCount() {
    var input = document.getElementById('writing-input');
    var countDiv = document.getElementById('writing-count');
    var submitBtn = document.getElementById('writing-submit-btn');
    
    if (!input || !countDiv || !submitBtn) return;
    
    var count = input.value.length;
    
    if (count < 30) {
        countDiv.textContent = '已写 ' + count + ' 字（至少30字）';
        countDiv.className = 'diag-word-count error';
        submitBtn.disabled = true;
    } else if (count < 50) {
        countDiv.textContent = '已写 ' + count + ' 字';
        countDiv.className = 'diag-word-count warning';
        submitBtn.disabled = false;
    } else {
        countDiv.textContent = '已写 ' + count + ' 字';
        countDiv.className = 'diag-word-count';
        submitBtn.disabled = false;
    }
}

// 跳过写作实测
function skipWritingTest() {
    diagState.writingScore = null;
    startTranslationTest();
}

// 提交写作实测
async function submitWritingTest() {
    var input = document.getElementById('writing-input');
    if (!input || input.value.length < 30) {
        showToast('请至少写30个字');
        return;
    }
    
    var userText = input.value.trim();
    var prompt = diagState.writingPrompt;
    
    // 显示加载状态
    document.getElementById('diag-body').innerHTML = 
        '<div class="diag-ai-loading">' +
            '<div class="diag-ai-icon">🤖</div>' +
            '<div class="diag-ai-text">AI正在评分...</div>' +
            '<div class="diag-ai-subtext">请稍候，正在分析你的作文</div>' +
        '</div>';
    
    try {
        // 调用评分API
        var resp = await fetchWithTimeout('/api/diagnosis/writing-grade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: prompt.title,
                description: prompt.description,
                user_input: userText
            })
        });
        
        var result = await resp.json();
        
        if (result.code !== 0 || !result.data) {
            throw new Error(result.error || '评分失败');
        }
        
        // 保存评分结果
        diagState.writingScore = result.data;
        
        // 显示评分结果
        showWritingScoreResult(result.data);
        
    } catch(e) {
        console.error('[写作评分失败]', e);
        // 评分失败时跳过
        diagState.writingScore = null;
        startTranslationTest();
    }
}

// 显示写作评分结果
function showWritingScoreResult(score) {
    // 计算颜色等级
    var getLevel = function(val, max) {
        var percent = val / max;
        if (percent >= 0.8) return 'excellent';
        if (percent >= 0.6) return 'good';
        if (percent >= 0.4) return 'fair';
        return 'poor';
    };
    
    var html = 
        '<div class="diag-score-section">' +
            '<div class="diag-score-header">' +
                '<div class="diag-score-title">写作评分结果</div>' +
                '<div class="diag-score-total">' + score.total + '</div>' +
            '</div>' +
            '<div class="diag-score-dimensions">' +
                '<div class="diag-dimension-item">' +
                    '<div class="diag-dimension-label">' +
                        '<span class="diag-dimension-name">词汇运用</span>' +
                        '<span class="diag-dimension-score">' + score.vocabulary + '/25</span>' +
                    '</div>' +
                    '<div class="diag-dimension-bar">' +
                        '<div class="diag-dimension-fill ' + getLevel(score.vocabulary, 25) + '" style="width:' + (score.vocabulary / 25 * 100) + '%"></div>' +
                    '</div>' +
                '</div>' +
                '<div class="diag-dimension-item">' +
                    '<div class="diag-dimension-label">' +
                        '<span class="diag-dimension-name">语法正确</span>' +
                        '<span class="diag-dimension-score">' + score.grammar + '/25</span>' +
                    '</div>' +
                    '<div class="diag-dimension-bar">' +
                        '<div class="diag-dimension-fill ' + getLevel(score.grammar, 25) + '" style="width:' + (score.grammar / 25 * 100) + '%"></div>' +
                    '</div>' +
                '</div>' +
                '<div class="diag-dimension-item">' +
                    '<div class="diag-dimension-label">' +
                        '<span class="diag-dimension-name">逻辑结构</span>' +
                        '<span class="diag-dimension-score">' + score.logic + '/25</span>' +
                    '</div>' +
                    '<div class="diag-dimension-bar">' +
                        '<div class="diag-dimension-fill ' + getLevel(score.logic, 25) + '" style="width:' + (score.logic / 25 * 100) + '%"></div>' +
                    '</div>' +
                '</div>' +
                '<div class="diag-dimension-item">' +
                    '<div class="diag-dimension-label">' +
                        '<span class="diag-dimension-name">连贯衔接</span>' +
                        '<span class="diag-dimension-score">' + score.coherence + '/25</span>' +
                    '</div>' +
                    '<div class="diag-dimension-bar">' +
                        '<div class="diag-dimension-fill ' + getLevel(score.coherence, 25) + '" style="width:' + (score.coherence / 25 * 100) + '%"></div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="diag-score-comment">' +
                '<div class="diag-comment-text">💬 ' + (score.comment || '继续保持！') + '</div>' +
            '</div>' +
            '<button class="diag-score-continue" onclick="startTranslationTest()">继续翻译实测 →</button>' +
        '</div>';
    
    document.getElementById('diag-body').innerHTML = html;
}

// ===== 翻译实测 =====
// 开始翻译实测
function startTranslationTest() {
    diagState.phase = 'translation';
    
    // 随机选择一个翻译题目
    var prompts = diagState.translationPrompts || [];
    if (prompts.length === 0) {
        // 如果没有题目，直接生成报告
        generateDiagReport();
        return;
    }
    var randomIndex = Math.floor(Math.random() * prompts.length);
    var prompt = prompts[randomIndex];
    diagState.translationPrompt = prompt;
    
    // 更新进度显示
    document.getElementById('diag-progress-fill').style.width = '95%';
    document.getElementById('diag-progress-text').textContent = '第 4/4 步';
    
    var html = 
        '<div class="diag-translation-section">' +
            '<div class="diag-translation-header">' +
                '<div class="diag-translation-title">🔄 翻译实测</div>' +
                '<div class="diag-translation-subtitle">请将以下中文翻译成英文</div>' +
            '</div>' +
            '<div class="diag-translation-source">' +
                '<div class="diag-source-text">' + escapeHtml(prompt.chinese) + '</div>' +
            '</div>' +
            '<textarea class="diag-translation-textarea" id="translation-input" placeholder="请在这里输入你的英文翻译..." oninput="updateTranslationCount()"></textarea>' +
            '<div class="diag-char-count" id="translation-count">已写 0 字（至少10字）</div>' +
            '<div class="diag-translation-actions">' +
                '<button class="diag-translation-submit" id="translation-submit-btn" onclick="submitTranslationTest()" disabled>提交评分</button>' +
                '<button class="diag-translation-skip" onclick="skipTranslationTest()">跳过</button>' +
            '</div>' +
        '</div>';
    
    document.getElementById('diag-body').innerHTML = html;
}

// 更新翻译字数统计
function updateTranslationCount() {
    var input = document.getElementById('translation-input');
    var countDiv = document.getElementById('translation-count');
    var submitBtn = document.getElementById('translation-submit-btn');
    
    if (!input || !countDiv || !submitBtn) return;
    
    var count = input.value.length;
    
    if (count < 10) {
        countDiv.textContent = '已写 ' + count + ' 字（至少10字）';
        countDiv.className = 'diag-char-count warning';
        submitBtn.disabled = true;
    } else {
        countDiv.textContent = '已写 ' + count + ' 字';
        countDiv.className = 'diag-char-count';
        submitBtn.disabled = false;
    }
}

// 跳过翻译实测
function skipTranslationTest() {
    diagState.translationScore = null;
    showSelfEval();
}

// 提交翻译实测
async function submitTranslationTest() {
        // 保存练习记录前先标记CET任务
        var cetTaskData = getCETTodayTasks();
        if (cetTaskData && cetTaskData.tasks) {
            cetTaskData.tasks.forEach(function(task) {
                if (task.type === 'translation' && !task.completed) {
                    markCETTaskComplete(task.id);
                }
            });
        }
    
    var input = document.getElementById('translation-input');
    if (!input || input.value.length < 10) {
        showToast('请至少写10个字');
        return;
    }
    
    var userText = input.value.trim();
    var prompt = diagState.translationPrompt;
    
    // 显示加载状态
    document.getElementById('diag-body').innerHTML = 
        '<div class="diag-ai-loading">' +
            '<div class="diag-ai-icon">🤖</div>' +
            '<div class="diag-ai-text">AI正在评分...</div>' +
            '<div class="diag-ai-subtext">请稍候，正在分析你的翻译</div>' +
        '</div>';
    
    try {
        // 调用评分API
        var resp = await fetchWithTimeout('/api/diagnosis/translation-grade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chinese: prompt.chinese,
                reference: prompt.reference || '',
                user_input: userText
            })
        });
        
        var result = await resp.json();
        
        if (result.code !== 0 || !result.data) {
            throw new Error(result.error || '评分失败');
        }
        
        // 保存评分结果
        diagState.translationScore = result.data;
        
        // 显示评分结果
        showTranslationScoreResult(result.data);
        
    } catch(e) {
        console.error('[翻译评分失败]', e);
        // 评分失败时跳过翻译分数，继续自评
        diagState.translationScore = null;
        showSelfEval();
    }
}

// 显示翻译评分结果
function showTranslationScoreResult(score) {
    // 计算颜色等级
    var getLevel = function(val, max) {
        var percent = val / max;
        if (percent >= 0.8) return 'excellent';
        if (percent >= 0.6) return 'good';
        if (percent >= 0.4) return 'fair';
        return 'poor';
    };
    
    var html = 
        '<div class="diag-score-section">' +
            '<div class="diag-score-header">' +
                '<div class="diag-score-title">翻译评分结果</div>' +
                '<div class="diag-score-total translation">' + score.total + '</div>' +
            '</div>' +
            '<div class="diag-score-dimensions">' +
                '<div class="diag-dimension-item">' +
                    '<div class="diag-dimension-label">' +
                        '<span class="diag-dimension-name">关键词覆盖</span>' +
                        '<span class="diag-dimension-score">' + score.keywords + '/35</span>' +
                    '</div>' +
                    '<div class="diag-dimension-bar">' +
                        '<div class="diag-dimension-fill ' + getLevel(score.keywords, 35) + '" style="width:' + (score.keywords / 35 * 100) + '%"></div>' +
                    '</div>' +
                '</div>' +
                '<div class="diag-dimension-item">' +
                    '<div class="diag-dimension-label">' +
                        '<span class="diag-dimension-name">语法正确性</span>' +
                        '<span class="diag-dimension-score">' + score.grammar + '/35</span>' +
                    '</div>' +
                    '<div class="diag-dimension-bar">' +
                        '<div class="diag-dimension-fill ' + getLevel(score.grammar, 35) + '" style="width:' + (score.grammar / 35 * 100) + '%"></div>' +
                    '</div>' +
                '</div>' +
                '<div class="diag-dimension-item">' +
                    '<div class="diag-dimension-label">' +
                        '<span class="diag-dimension-name">表达地道度</span>' +
                        '<span class="diag-dimension-score">' + score.expression + '/30</span>' +
                    '</div>' +
                    '<div class="diag-dimension-bar">' +
                        '<div class="diag-dimension-fill ' + getLevel(score.expression, 30) + '" style="width:' + (score.expression / 30 * 100) + '%"></div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="diag-score-comment">' +
                '<div class="diag-comment-text">💬 ' + (score.comment || '继续保持！') + '</div>' +
            '</div>' +
            '<button class="diag-score-continue translation" onclick="showSelfEval()">📝 继续自评</button>' +
        '</div>';
    
    document.getElementById('diag-body').innerHTML = html;
}

// 将AI评分映射为A/B/C/D档
function mapScoreToLevel(score, max) {
    var percent = score / max * 100;
    if (percent >= 80) return 'A';
    if (percent >= 60) return 'B';
    if (percent >= 40) return 'C';
    return 'D';
}


// 生成诊断报告
async function generateDiagReport() {
    diagState.phase = 'generating';
    
    // 显示加载
    document.getElementById('diag-body').innerHTML = 
        '<div class="diag-loading">' +
            '<div class="diag-spinner"></div>' +
            '<div class="diag-loading-text">AI正在分析你的答题情况<span class="diag-loading-time">（预计1-2分钟）</span></div>' +
            '<div class="diag-loading-steps">' +
                '<div class="diag-loading-step" id="diag-step-1">📊 汇总答题数据...</div>' +
                '<div class="diag-loading-step" id="diag-step-2">🔍 分析薄弱维度...</div>' +
                '<div class="diag-loading-step" id="diag-step-3">🧠 生成个性化报告...</div>' +
            '</div>' +
        '</div>';
    
    try {
        // 加载步骤动画
        setTimeout(function() {
            var s1 = document.getElementById('diag-step-1');
            if (s1) { s1.classList.add('active'); }
        }, 500);
        setTimeout(function() {
            var s1 = document.getElementById('diag-step-1');
            var s2 = document.getElementById('diag-step-2');
            if (s1) { s1.classList.remove('active'); s1.classList.add('done'); }
            if (s2) { s2.classList.add('active'); }
        }, 3000);
        setTimeout(function() {
            var s2 = document.getElementById('diag-step-2');
            var s3 = document.getElementById('diag-step-3');
            if (s2) { s2.classList.remove('active'); s2.classList.add('done'); }
            if (s3) { s3.classList.add('active'); }
        }, 6000);

        // 构建自评数据
        var selfAssessment = {
            listening: '中等',
            writing: '中等',
            translation: '中等'
        };
        diagState.selfEval.forEach(function(item) {
            if (item.dimension === '听力') {
                selfAssessment.listening = item.answer === 'A' ? '较好' : item.answer === 'B' ? '一般' : item.answer === 'C' ? '较弱' : '薄弱';
            } else if (item.dimension === '写作') {
                selfAssessment.writing = item.answer === 'A' ? '较好' : item.answer === 'B' ? '一般' : item.answer === 'C' ? '较弱' : '薄弱';
            } else if (item.dimension === '翻译') {
                selfAssessment.translation = item.answer === 'A' ? '较好' : item.answer === 'B' ? '一般' : item.answer === 'C' ? '较弱' : '薄弱';
            }
        });
        
        // 将AI评分融入请求（如果有的话）
        var apiData = {
            answers: diagState.answers,
            selfAssessment: selfAssessment
        };
        
        // 如果有写作AI评分，加入请求
        if (diagState.writingScore) {
            apiData.writingScore = {
                vocabulary: diagState.writingScore.vocabulary,
                grammar: diagState.writingScore.grammar,
                logic: diagState.writingScore.logic,
                coherence: diagState.writingScore.coherence,
                total: diagState.writingScore.total
            };
        }
        
        // 如果有翻译AI评分，加入请求
        if (diagState.translationScore) {
            apiData.translationScore = {
                keywords: diagState.translationScore.keywords,
                grammar: diagState.translationScore.grammar,
                expression: diagState.translationScore.expression,
                total: diagState.translationScore.total
            };
        }
        
        var resp = await fetchWithTimeout('/api/diagnosis/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apiData)
        }, 60000);
        
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
                if (['细节定位', '推理判断', '同义替换', '主旨归纳', '态度判断', '听力'].indexOf(key) !== -1) {
                    dims[key] = val;
                }
            }
        });
    }
    
    // 添加听力统计
    if (data.listening_stats) {
        dims['听力'] = Math.round((data.listening_stats.correct / Math.max(data.listening_stats.total, 1)) * 100);
    }
    
    // 从dimension_scores补充
    if (data.dimension_scores) {
        Object.keys(data.dimension_scores).forEach(function(k) {
            if (['细节定位', '推理判断', '同义替换', '主旨归纳', '态度判断', '听力'].indexOf(k) !== -1) {
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
    var systemPrompt = '你是' + EXAM_LABEL + '备考规划专家。用户已完成能力诊断，五维分数如下：' + 
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
        var profile = safeGetItem(examKey('user_profile'), {});
        profile.learning_plan = plan;
        profile.plan_updated = getTodayStr();
        localStorage.setItem(examKey('user_profile'), JSON.stringify(profile));
    } catch(e) {}
}

function getLearningPlan() {
    try {
        var profile = safeGetItem(examKey('user_profile'), {});
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
    
    // 生成五维卡片HTML（带对比信息）
    var dimCardsHtml = '';
    Object.keys(DIM_CONFIGS).forEach(function(dim) {
        var score = d.dims[dim] || 0;
        var config = DIM_CONFIGS[dim];
        var color = score >= 70 ? '#00B894' : score >= 40 ? '#FDCB6E' : '#E17055';
        
        // 添加对比箭头
        var compareHtml = '';
        if (d.compareSummary) {
            var diff = calculateScoreDiff(d, d.previousDiagnosis, dim);
            if (diff.diff !== 0) {
                var arrow = diff.improved ? '↑' : '↓';
                var arrowColor = diff.improved ? '#00B894' : '#E17055';
                var arrowClass = diff.improved ? 'improved' : 'declined';
                compareHtml = '<span class="dim-compare ' + arrowClass + '">' + arrow + Math.abs(diff.diff) + '</span>';
            }
        }
        
        dimCardsHtml += 
            '<div class="report-dim-card">' +
                '<div class="report-dim-name">' + config.icon + ' ' + dim + compareHtml + '</div>' +
                '<div class="report-dim-score" style="color:' + color + '">' + score + '</div>' +
                '<div class="report-dim-bar">' +
                    '<div class="report-dim-fill" style="width:' + score + '%;background:' + color + '"></div>' +
                '</div>' +
                '<div class="report-dim-tip">' + config.desc + '</div>' +
                (d.dimTimes && d.dimTimes[dim] ? '<div class="report-dim-time">⏱ 平均' + d.dimTimes[dim] + '秒</div>' : '') +
            '</div>';
    });
    
    // 生成弱项建议卡片
    var weakAdviceHtml = '';
    var adviceMap = {
        '听力': { label: '听力强化专项', advice: '建议每天听一段VOA或BBC，先泛听抓大意，再精听记细节。考前集中练习真题听力，熟悉题型和语速。' },
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
        
        // 进步提示
        (d.progressHint ? '<div class="report-progress-hint">' + d.progressHint + '</div>' : '') +
        
        '<div class="report-radar-section">' +
            '<div class="report-radar-title">📊 五维能力雷达图</div>' +
            '<div class="report-radar-canvas-wrap">' +
                '<canvas id="report-radar-canvas" width="280" height="280"></canvas>' +
            '</div>' +
        '</div>' +
        
        '<div class="report-dims-grid">' + dimCardsHtml + '</div>' +
        
        (weakAdviceHtml ? '<div class="report-advice-section"><div class="report-section-title">💪 专项提升建议</div>' + weakAdviceHtml + '</div>' : '') +
        
        // 错题复盘区域
        buildWrongQuestionsSection() +
        
        // 3日行动计划区域
        buildActionPlanSection() +
        
        // 写作批改摘要（如果有）
        buildWritingFeedbackSection() +
        
        // 翻译批改摘要（如果有）
        buildTranslationFeedbackSection() +
        
        // 进步钩子
        buildProgressHookSection() +
        
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

// 构建错题复盘区域HTML
function buildWrongQuestionsSection() {
    if (!reportData.wrongQuestions || reportData.wrongQuestions.length === 0) {
        return '';
    }
    
    var html = '<div class="report-wrong-section">' +
        '<div class="report-section-title">📝 错题复盘</div>' +
        '<div class="report-wrong-subtitle">这些题做错了，看看问题出在哪</div>';
    
    reportData.wrongQuestions.forEach(function(q) {
        html += '<div class="report-wrong-card">' +
            '<div class="report-wrong-header">' +
                '<span class="report-wrong-num">第' + q.num + '题</span>' +
                '<span class="report-wrong-ability">' + q.ability + '</span>' +
            '</div>' +
            '<div class="report-wrong-answers">' +
                '<div class="report-wrong-answer wrong">' +
                    '<span class="answer-label">你的答案</span>' +
                    '<span class="answer-letter">' + q.userAnswer + '</span>' +
                '</div>' +
                '<div class="report-wrong-answer correct">' +
                    '<span class="answer-label">正确答案</span>' +
                    '<span class="answer-letter">' + q.correctAnswer + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="report-wrong-reason">' +
                '<div class="reason-title">❌ 错因分析</div>' +
                '<div class="reason-text">' + q.reason + '</div>' +
            '</div>' +
            '<div class="report-wrong-fix">' +
                '<div class="fix-title">💡 改进方法</div>' +
                '<div class="fix-text">' + q.fix + '</div>' +
            '</div>' +
        '</div>';
    });
    
    html += '</div>';
    return html;
}

// 构建3日行动计划区域HTML
function buildActionPlanSection() {
    if (!reportData.actionPlan || !reportData.actionPlan.plans) {
        return '';
    }
    
    var plan = reportData.actionPlan;
    var html = '<div class="report-plan-section">' +
        '<div class="report-section-title">📅 你的3日突破计划</div>' +
        '<div class="report-plan-subtitle">针对' + plan.dim + '的专项训练</div>';
    
    var days = [
        { key: 'day1', label: 'Day 1', icon: '1️⃣' },
        { key: 'day2', label: 'Day 2', icon: '2️⃣' },
        { key: 'day3', label: 'Day 3', icon: '3️⃣' }
    ];
    
    days.forEach(function(day) {
        var dayPlan = plan.plans[day.key];
        if (!dayPlan) return;
        
        html += '<div class="report-plan-day">' +
            '<div class="plan-day-header">' +
                '<span class="plan-day-icon">' + day.icon + '</span>' +
                '<span class="plan-day-label">' + day.label + '</span>' +
                '<span class="plan-day-focus">' + dayPlan.focus + '</span>' +
            '</div>' +
            '<ul class="plan-tasks">';
        
        dayPlan.tasks.forEach(function(task) {
            html += '<li class="plan-task-item">' + task + '</li>';
        });
        
        html += '</ul>' +
            '<div class="plan-tip">💡 ' + dayPlan.tip + '</div>' +
        '</div>';
    });
    
    html += '</div>';
    return html;
}

// 构建写作反馈区域HTML
function buildWritingFeedbackSection() {
    if (!reportData.writingFeedback) {
        return '';
    }
    
    var fb = reportData.writingFeedback;
    var html = '<div class="report-writing-section">' +
        '<div class="report-section-title">✍️ 写作批改</div>' +
        '<div class="report-writing-score">写作得分：<span class="score-num">' + fb.total + '</span></div>';
    
    if (fb.issues && fb.issues.length > 0) {
        html += '<div class="report-writing-issues">';
        fb.issues.forEach(function(issue) {
            html += '<div class="writing-issue">' +
                '<div class="issue-from">原文：' + issue.from + '</div>' +
                '<div class="issue-arrow">↓</div>' +
                '<div class="issue-to">建议：' + issue.to + '</div>' +
            '</div>';
        });
        html += '</div>';
    }
    
    if (fb.comment) {
        html += '<div class="report-writing-comment">💬 ' + fb.comment + '</div>';
    }
    
    html += '</div>';
    return html;
}

// 构建翻译反馈区域HTML
function buildTranslationFeedbackSection() {
    if (!reportData.translationFeedback) {
        return '';
    }
    
    var fb = reportData.translationFeedback;
    var html = '<div class="report-translation-section">' +
        '<div class="report-section-title">🌐 翻译批改</div>' +
        '<div class="report-translation-score">翻译得分：<span class="score-num">' + fb.total + '</span></div>';
    
    html += '<div class="keyword-results">';
    
    if (fb.hit && fb.hit.length > 0) {
        html += '<div class="keyword-hit">';
        fb.hit.forEach(function(word) {
            html += '<span class="keyword-tag hit">✅ ' + word + '</span>';
        });
        html += '</div>';
    }
    
    if (fb.miss && fb.miss.length > 0) {
        html += '<div class="keyword-miss">';
        fb.miss.forEach(function(word) {
            html += '<span class="keyword-tag miss">❌ ' + word + '</span>';
        });
        html += '</div>';
    }
    
    html += '</div>';
    
    if (fb.comment) {
        html += '<div class="report-translation-comment">💬 ' + fb.comment + '</div>';
    }
    
    html += '<button class="report-similar-btn" onclick="practiceSimilarTranslation()">🎯 练同类题（推理+态度）</button>';
    html += '</div>';
    return html;
}

// 构建进步钩子区域HTML（不说具体数字，遵守广告法）
function buildProgressHookSection() {
    var hookTexts = [
        '针对性练习，备考更高效',
        '坚持练习，薄弱项会有明显改善',
        '每天15分钟，4周覆盖全部考点',
        '找对方法，进步看得见'
    ];
    var hookText = hookTexts[Math.floor(Math.random() * hookTexts.length)];
    
    var html = '<div class="report-hook-section">' +
        '<div class="report-hook-icon">🎯</div>' +
        '<div class="report-hook-text">' + hookText + '</div>' +
        '<button class="report-hook-btn" onclick="startPracticeChallenge()">' +
            '开始7天挑战' +
        '</button>' +
    '</div>';
    return html;
}

// 开始7天挑战
function startPracticeChallenge() {
    closeReportPage();
    switchTab('diagnosis');
    setTimeout(function() {
        openChat('companion');
        setTimeout(function() {
            var msg = '我想开始7天提升挑战，帮我制定今天的练习计划';
            sendSuggestion(msg);
        }, 500);
    }, 350);
}

// 练同类题 - 翻译主要考推理判断和态度判断
function practiceSimilarTranslation() {
    closeReportPage();
    // 翻译主要考推理判断和态度判断，跳转到每日一练筛选推理判断维度
    if (typeof openQuizWithDim === 'function') {
        openQuizWithDim('推理判断');
    } else if (typeof openQuiz === 'function') {
        openQuiz();
    }
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
    ctx.fillText('📊 我的' + EXAM_LABEL + '诊断报告', 140, 40);
    
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
    ctx.fillText(EXAM_LABEL + '备考搭子 · AI智能诊断', 140, 385);
}

// ===== 免费AI对话限额逻辑 (GPT风格) =====
// 每日免费额度：3条AI对话消息
var CET4_DAILY_FREE_LIMIT = 20;
// replaced by examKey('chat_count_')

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
        var key = examKey('chat_count_') + getTodayDateStr();
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
        var key = examKey('chat_count_') + getTodayDateStr();
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
        input.placeholder = '问我任何' + EXAM_LABEL + '问题...';
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

    fetch('/api/activate-with-mbd-order', {
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
            updateProfileUserId();
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


// ===== 学习计划生成系统（动态分阶段版本）=====
// PLAN_DURATION 已改为 getPlanDuration() 函数动态计算

// 根据五维分数生成学习计划（动态分阶段）
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
    
    // 如果没有薄弱维度，取最低的2个
    if (weakDims.length === 0 && allDims.length > 0) {
        allDims.sort(function(a, b) { return a.score - b.score; });
        weakDims = allDims.slice(0, 2);
    }
    
    var duration = getPlanDuration();
    
    // ===== 动态计算各阶段天数 =====
    var phases = [];
    
    if (duration < 10) {
        // 少于10天：压缩阶段
        phases.push({ name: '诊断期', dayRange: [1, 1], ratio: 0.1 });
        var remainingDays = duration - 1;
        var weakDays = Math.ceil(remainingDays * 0.4);
        phases.push({ name: '弱项突破', dayRange: [2, 2 + weakDays - 1], ratio: 0.4 });
        phases.push({ name: '考前冲刺', dayRange: [2 + weakDays, duration], ratio: 0.5 });
    } else if (duration < 20) {
        // 10-20天：标准4阶段
        phases.push({ name: '诊断期', dayRange: [1, 2], ratio: 0.1 });
        var remainingDays = duration - 2;
        var weakDays = Math.ceil(remainingDays * 0.35);
        var normalDays = Math.ceil(remainingDays * 0.35);
        var sprintDays = remainingDays - weakDays - normalDays;
        phases.push({ name: '弱项突破', dayRange: [3, 3 + weakDays - 1], ratio: 0.35 });
        phases.push({ name: '全面提升', dayRange: [3 + weakDays, 3 + weakDays + normalDays - 1], ratio: 0.35 });
        phases.push({ name: '考前冲刺', dayRange: [3 + weakDays + normalDays, duration], ratio: 0.2 });
    } else {
        // 20天以上：完整5阶段
        phases.push({ name: '诊断期', dayRange: [1, 2], ratio: 0.08 });
        var remainingDays = duration - 2;
        var weakDays = Math.ceil(remainingDays * 0.30);
        var normalDays = Math.ceil(remainingDays * 0.30);
        var sprintDays = Math.ceil(remainingDays * 0.25);
        phases.push({ name: '弱项突破', dayRange: [3, 3 + weakDays - 1], ratio: 0.30, focusDims: weakDims.slice(0, 2).map(function(d) { return d.name; }) });
        phases.push({ name: '全面提升', dayRange: [3 + weakDays, 3 + weakDays + normalDays - 1], ratio: 0.30 });
        phases.push({ name: '冲刺巩固', dayRange: [3 + weakDays + normalDays, 3 + weakDays + normalDays + sprintDays - 1], ratio: 0.25 });
        phases.push({ name: '考前冲刺', dayRange: [3 + weakDays + normalDays + sprintDays, duration], ratio: 0.07 });
    }
    
    // ===== 任务模板 =====
    var dimTaskTemplates = {
        '细节定位': {
            focus: '细节定位',
            tasks: [
                { text: '专项练习：细节定位题10道', type: 'practice', dim: '细节定位', time: 15 },
                { text: '复习定位技巧：扫读法+关键词定位', type: 'review', time: 10 },
                { text: '完成1篇仔细阅读（限时8分钟）', type: 'reading', time: 12 }
            ]
        },
        '推理判断': {
            focus: '推理判断',
            tasks: [
                { text: '专项练习：推理判断题10道', type: 'practice', dim: '推理判断', time: 15 },
                { text: '分析因果关系与逻辑连接词', type: 'review', time: 10 },
                { text: '练习排除法与代入验证技巧', type: 'review', time: 10 }
            ]
        },
        '同义替换': {
            focus: '同义替换',
            tasks: [
                { text: '专项练习：同义替换题10道', type: 'practice', dim: '同义替换', time: 15 },
                { text: '背诵20个高频同义替换词组', type: 'vocab', time: 10 },
                { text: '整理易混淆词汇对比记忆', type: 'review', time: 8 }
            ]
        },
        '主旨归纳': {
            focus: '主旨归纳',
            tasks: [
                { text: '专项练习：主旨大意题8道', type: 'practice', dim: '主旨归纳', time: 12 },
                { text: '练习段落结构分析方法', type: 'review', time: 10 },
                { text: '总结文章框架速记技巧', type: 'review', time: 8 }
            ]
        },
        '态度判断': {
            focus: '态度判断',
            tasks: [
                { text: '专项练习：态度判断题8道', type: 'practice', dim: '态度判断', time: 12 },
                { text: '积累常见态度词库（正面/负面/中立）', type: 'vocab', time: 10 },
                { text: '分析作者观点与态度表达方式', type: 'review', time: 8 }
            ]
        }
    };
    
    // 通用任务
    var commonTasks = {
        vocabulary: [
            { text: '背诵30个核心词汇', type: 'vocab', time: 15 },
            { text: '复习昨日词汇+记忆新词20个', type: 'vocab', time: 10 }
        ],
        listening: [
            { text: '听力练习：短篇新闻2篇', type: 'listening', time: 10 },
            { text: '听力练习：长对话1篇', type: 'listening', time: 8 },
            { text: '听力练习：短文理解2篇', type: 'listening', time: 12 },
            { text: '听力填空专项训练10题', type: 'listening', time: 8 }
        ],
        writing: [
            { text: '背诵1篇范文精彩句型', type: 'writing', time: 10 },
            { text: '应用文写作练习1篇', type: 'writing', time: 15 },
            { text: '翻译练习：中译英5句', type: 'translation', time: 10 },
            { text: '段落翻译练习1篇', type: 'translation', time: 12 }
        ]
    };
    
    // ===== 生成冲刺计划 =====
    var plan = {
        createdAt: new Date().toISOString(),
        startDay: getTodayStr(),
        totalDays: duration,
        dims: dims,
        weakDims: weakDims.map(function(d) { return d.name; }),
        phases: phases,
        dailyPlan: {}
    };
    
    // 任务计数器
    var vocabIdx = 0;
    var listeningIdx = 0;
    var writingIdx = 0;
    
    for (var day = 1; day <= duration; day++) {
        var dayPlan = {
            day: day,
            focusDim: '',
            tasks: [],
            estimatedTime: 0,
            completed: false
        };
        
        // ===== 确定当天主攻维度 =====
        var currentPhase = null;
        for (var p = 0; p < phases.length; p++) {
            if (day >= phases[p].dayRange[0] && day <= phases[p].dayRange[1]) {
                currentPhase = phases[p];
                break;
            }
        }
        
        var phaseName = currentPhase ? currentPhase.name : '考前冲刺';
        
        // 根据阶段分配任务
        if (phaseName === '诊断期') {
            dayPlan.focusDim = weakDims.length > 0 ? weakDims[0].name : '细节定位';
            dayPlan.tasks = [
                { text: '词汇测试：核心词汇30个', type: 'vocab', time: 10 },
                { text: '阅读理解入门：仔细阅读1篇', type: 'reading', time: 10 },
                { text: commonTasks.listening[listeningIdx % commonTasks.listening.length], time: 8 }
            ];
            listeningIdx++;
            if (day === 2) {
                dayPlan.tasks.push({ text: '完成首次能力评估测试', type: 'test', time: 15 });
            }
        }
        else if (phaseName === '弱项突破') {
            var dimIdx = (day - 1) % Math.max(weakDims.length, 1);
            dayPlan.focusDim = weakDims.length > 0 ? weakDims[dimIdx].name : '细节定位';
            var template = dimTaskTemplates[dayPlan.focusDim] || dimTaskTemplates['细节定位'];
            
            dayPlan.tasks = [template.tasks[0]];
            if (day % 2 === 0) {
                dayPlan.tasks.push(template.tasks[1]);
            }
            dayPlan.tasks.push(commonTasks.listening[listeningIdx % commonTasks.listening.length]);
            listeningIdx++;
            if (day % 3 === 0) {
                dayPlan.tasks.push(commonTasks.writing[writingIdx % commonTasks.writing.length]);
                writingIdx++;
            }
        }
        else if (phaseName === '全面提升') {
            var dimIdx1 = (day - 1) % Math.max(weakDims.length, 1);
            var dimIdx2 = (day) % Math.max(weakDims.length, 1);
            var focusDim1 = weakDims.length > 0 ? weakDims[dimIdx1].name : '细节定位';
            var focusDim2 = weakDims.length > 0 ? weakDims[dimIdx2].name : '推理判断';
            dayPlan.focusDim = focusDim1;
            
            dayPlan.tasks = [
                { text: '专项练习：' + focusDim1 + '题8道', type: 'practice', dim: focusDim1, time: 12 },
                { text: '专项练习：' + focusDim2 + '题8道', type: 'practice', dim: focusDim2, time: 12 }
            ];
            dayPlan.tasks.push(commonTasks.listening[listeningIdx % commonTasks.listening.length]);
            listeningIdx++;
            if (day % 4 === 0) {
                dayPlan.tasks.push(commonTasks.writing[writingIdx % commonTasks.writing.length]);
                writingIdx++;
            }
        }
        else if (phaseName === '冲刺巩固') {
            var sprintDimIdx = (day - 1) % Math.max(weakDims.length, 1);
            dayPlan.focusDim = weakDims.length > 0 ? weakDims[sprintDimIdx].name : '细节定位';
            var sprintTemplate = dimTaskTemplates[dayPlan.focusDim] || dimTaskTemplates['细节定位'];
            
            dayPlan.tasks = [
                { text: commonTasks.vocabulary[vocabIdx % commonTasks.vocabulary.length], time: 10 },
                sprintTemplate.tasks[2],
                { text: '模拟阅读练习1套', type: 'reading', time: 15 }
            ];
            vocabIdx++;
            if (day % 2 === 0) {
                dayPlan.tasks.push(commonTasks.listening[listeningIdx % commonTasks.listening.length]);
                listeningIdx++;
            }
            if (day % 3 === 0) {
                dayPlan.tasks.push({ text: '写作/翻译练习30分钟', type: 'writing', time: 20 });
            }
        }
        else {
            dayPlan.focusDim = weakDims.length > 0 ? weakDims[0].name : '细节定位';
            dayPlan.tasks = [
                { text: '全科模拟测试1套', type: 'test', time: 30 },
                { text: '错题复习与薄弱点强化', type: 'review', time: 15 }
            ];
            if (day % 2 === 0) {
                dayPlan.tasks.push(commonTasks.listening[listeningIdx % commonTasks.listening.length]);
                listeningIdx++;
            } else {
                dayPlan.tasks.push({ text: '写作模板背诵+应用文练习', type: 'writing', time: 15 });
            }
        }
        
        // 计算预估时间
        for (var t = 0; t < dayPlan.tasks.length; t++) {
            dayPlan.estimatedTime += dayPlan.tasks[t].time || 10;
        }
        
        // 保存到dailyPlan
        plan.dailyPlan[day] = {
            focusDim: dayPlan.focusDim,
            tasks: dayPlan.tasks,
            estimatedTime: dayPlan.estimatedTime,
            completed: false,
            phase: phaseName
        };
        
        // 兼容旧的days数组
        plan.days = plan.days || [];
        plan.days.push({
            day: day,
            tasks: dayPlan.tasks.map(function(t) { return t.text; }),
            focusDim: dayPlan.focusDim,
            estimatedTime: dayPlan.estimatedTime,
            phase: phaseName
        });
    }
    
    // 保存到localStorage
    saveSprintPlan(plan);
    
    return plan;
}

// 保存冲刺计划到localStorage
function saveSprintPlan(plan) {
    try {
        localStorage.setItem(examKey('sprint_plan'), JSON.stringify(plan));
    } catch(e) {
        console.log('保存冲刺计划失败:', e);
    }
}

// 动态调整冲刺计划（根据最新能力数据）
function adjustSprintPlan() {
    var today = getTodayStr();
    
    // 检查今天是否已经调整过
    try {
        var lastAdjust = localStorage.getItem(examKey('sprint_plan_last_adjust'));
        if (lastAdjust === today) {
            return false; // 今天已经调整过
        }
    } catch(e) {}
    
    var plan = getSprintPlan();
    if (!plan || !plan.dailyPlan || plan.dailyPlan.length === 0) {
        return false;
    }
    
    var abilityScores = getAbilityScores();
    var dims = abilityScores && abilityScores.dims ? abilityScores.dims : {};
    var dimTimes = abilityScores && abilityScores.dimTimes ? abilityScores.dimTimes : {};
    
    if (Object.keys(dims).length === 0) {
        return false;
    }
    
    // 找出当前最弱的维度（得分最低）
    var weakDims = Object.keys(dims).map(function(k) {
        var score = dims[k];
        // 同时考虑耗时因素：耗时超过平均1.5倍的也视为薄弱
        var avgTime = 0;
        var timeCount = 0;
        Object.keys(dimTimes).forEach(function(t) {
            avgTime += dimTimes[t];
            timeCount++;
        });
        if (avgTime > 0 && dimTimes[k] && dimTimes[k] > avgTime / timeCount * 1.5) {
            score = Math.max(0, score - 20); // 耗时过长的维度降分处理
        }
        return { name: k, score: score };
    }).sort(function(a, b) {
        return a.score - b.score;
    });
    
    var currentWeakDim = weakDims.length > 0 ? weakDims[0].name : '细节定位';
    
    // 获取今天在计划中的索引
    var dayIdx = getPlanDayIndex();
    if (dayIdx < 0 || dayIdx >= plan.dailyPlan.length) {
        return false;
    }
    
    var adjusted = false;
    
    // 从今天开始遍历计划
    for (var i = dayIdx; i < plan.dailyPlan.length; i++) {
        var dayPlan = plan.dailyPlan[i];
        var focusDim = dayPlan.focusDim;
        
        // 如果该维度得分已>70%且仍是主攻维度，则调整为当前最弱维度
        if (dims[focusDim] && dims[focusDim] > 70) {
            // 检查后续是否仍以该维度为主攻
            var stillFocusing = false;
            for (var j = i; j < Math.min(i + 3, plan.dailyPlan.length); j++) {
                if (plan.dailyPlan[j].focusDim === focusDim) {
                    stillFocusing = true;
                    break;
                }
            }
            
            if (stillFocusing && focusDim !== currentWeakDim) {
                dayPlan.focusDim = currentWeakDim;
                // 更新任务描述
                var dimTaskMap = {
                    '细节定位': '细节定位强化练习',
                    '推理判断': '推理判断专项训练',
                    '同义替换': '同义替换技巧练习',
                    '主旨归纳': '主旨归纳能力提升',
                    '态度判断': '态度判断专项',
                    '听力': '听力强化训练'
                };
                dayPlan.tasks = dayPlan.tasks.map(function(task) {
                    if (task.type === 'dim' || dimTaskMap[focusDim] === task.text) {
                        return { text: dimTaskMap[currentWeakDim] || '专项强化练习', type: 'dim', time: task.time || 10 };
                    }
                    return task;
                });
                adjusted = true;
            }
        }
    }
    
    if (adjusted) {
        saveSprintPlan(plan);
        try {
            localStorage.setItem(examKey('sprint_plan_last_adjust'), today);
        } catch(e) {}
    }
    
    return adjusted;
}

// 从localStorage读取冲刺计划
function getSprintPlan() {
    try {
        var data = localStorage.getItem(examKey('sprint_plan'));
        if (data) return JSON.parse(data);
    } catch(e) {}
    return null;
}

// 获取冲刺计划当天数据
function getTodayPlan() {
    var plan = getSprintPlan();
    if (!plan) return null;
    
    var dayIdx = getPlanDayIndex();
    return plan.dailyPlan ? plan.dailyPlan[dayIdx] : null;
}

// 获取冲刺计划当前阶段
function getCurrentPhase() {
    var plan = getSprintPlan();
    if (!plan || !plan.phases) return null;
    
    var dayIdx = getPlanDayIndex();
    for (var i = 0; i < plan.phases.length; i++) {
        if (dayIdx >= plan.phases[i].dayRange[0] && dayIdx <= plan.phases[i].dayRange[1]) {
            return plan.phases[i];
        }
    }
    return plan.phases[plan.phases.length - 1];
}

// 标记当天任务完成
function markTodayTaskComplete() {
    var plan = getSprintPlan();
    if (!plan) return;
    
    var dayIdx = getPlanDayIndex();
    if (plan.dailyPlan && plan.dailyPlan[dayIdx]) {
        plan.dailyPlan[dayIdx].completed = true;
        saveSprintPlan(plan);
    }
}

// 检查当天是否有练习记录（用于计算完成度）
function hasTodayPracticeRecord() {
    var today = getTodayStr();
    
    // 检查ability_history中是否有今天的记录
    try {
        var history = JSON.parse(localStorage.getItem(examKey('ability_history')) || '[]');
        for (var i = 0; i < history.length; i++) {
            if (history[i].date === today) {
                return true;
            }
        }
    } catch(e) {}
    
    // 检查daily_task_done记录
    var data = state.userData || {};
    if (data.daily_task_done && data.daily_task_done_date === today) {
        return true;
    }
    
    // 检查practice_records
    try {
        var records = JSON.parse(localStorage.getItem(examKey('practice_records')) || '[]');
        for (var j = 0; j < records.length; j++) {
            if (records[j].date === today && (records[j].count || 0) > 0) {
                return true;
            }
        }
    } catch(e) {}
    
    return false;
}

// 计算冲刺计划实际完成度
function getSprintPlanProgress() {
    var plan = getSprintPlan();
    if (!plan) return { completedDays: 0, totalDays: getPlanDuration(), progress: 0, currentDay: 1 };
    
    var dayIdx = getPlanDayIndex();
    var completedDays = 0;
    var today = getTodayStr();
    var startDate = plan.startDay ? new Date(plan.startDay) : new Date();
    
    for (var day = 1; day <= plan.totalDays; day++) {
        var checkDate = new Date(startDate);
        checkDate.setDate(checkDate.getDate() + day - 1);
        var dateStr = checkDate.getFullYear() + '-' + 
                      String(checkDate.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(checkDate.getDate()).padStart(2, '0');
        
        // 如果是今天
        if (dateStr === today) {
            if (hasTodayPracticeRecord()) {
                completedDays++;
            }
            break;
        }
        
        // 检查历史完成记录
        try {
            var history = JSON.parse(localStorage.getItem(examKey('ability_history')) || '[]');
            for (var i = 0; i < history.length; i++) {
                if (history[i].date === dateStr) {
                    completedDays++;
                    break;
                }
            }
        } catch(e) {}
    }
    
    return {
        completedDays: completedDays,
        totalDays: plan.totalDays,
        progress: Math.round((completedDays / plan.totalDays) * 100),
        currentDay: dayIdx
    };
}
function getPlanDayIndex() {
    var data = state.userData || {};
    if (!data.plan_created_at) return 1;
    
    var start = new Date(data.plan_created_at);
    var today = new Date();
    var diff = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
    return Math.min(Math.max(diff, 1), getPlanDuration());
}

// 获取今天的日期字符串
function getTodayStr() {
    var now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
}

// 渲染学习计划Tab（优化展示版本）
function renderPlanTab() {
    // 首次调用时动态调整冲刺计划
    adjustSprintPlan();
    
    var data = state.userData || {};
    var plan = getSprintPlan() || data.study_plan;
    var dayIdx = getPlanDayIndex();
    var hasDiagnosis = data.diagnosis && Object.keys(data.diagnosis).length > 0;
    
    // 获取冲刺计划进度
    var sprintProgress = getSprintPlanProgress();
    
    // 更新标题
    var subEl = document.getElementById('plan-page-sub');
    if (subEl) {
        if (plan) {
            subEl.textContent = '第' + sprintProgress.currentDay + '天/共' + sprintProgress.totalDays + '天';
        } else {
            subEl.textContent = '完成诊断后自动生成';
        }
    }
    
    // 获取plan-page-content容器
    var pageContent = document.getElementById('plan-page-content');
    
    // 无诊断数据时显示空状态引导
    if (!hasDiagnosis) {
        if (pageContent) {
            pageContent.innerHTML = '<div class="plan-page-header">' +
                '<h1 class="plan-page-title">学习计划</h1>' +
                '<p class="plan-page-sub">完成诊断后自动生成</p>' +
            '</div>' +
            
            '<div class="plan-guide-card" onclick="switchTab(\'diagnosis\')">' +
                '<div class="plan-guide-icon">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                        '<rect x="3" y="4" width="18" height="18" rx="2"/>' +
                        '<line x1="16" y1="2" x2="16" y2="6"/>' +
                        '<line x1="8" y1="2" x2="8" y2="6"/>' +
                        '<line x1="3" y1="10" x2="21" y2="10"/>' +
                    '</svg>' +
                    '<svg class="plan-guide-pencil" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                        '<path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>' +
                    '</svg>' +
                '</div>' +
                '<div class="plan-guide-title">开始你的备考计划</div>' +
                '<div class="plan-guide-desc">完成5分钟AI诊断，系统将为你量身定制' + getPlanDuration() + '天冲刺计划</div>' +
                '<div class="plan-guide-cta">' +
                    '<span>开始诊断</span>' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                        '<polyline points="9 18 15 12 9 6"/>' +
                    '</svg>' +
                '</div>' +
                '<div class="plan-guide-features">' +
                    '<div class="plan-guide-feature">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' +
                        '<span>AI精准诊断薄弱点</span>' +
                    '</div>' +
                    '<div class="plan-guide-feature">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' +
                        '<span>个性化学习方案</span>' +
                    '</div>' +
                    '<div class="plan-guide-feature">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' +
                        '<span>每日任务智能推送</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            
            '<div class="plan-guide-disabled-hint">' +
                '<div class="plan-guide-disabled-card">' +
                    '<div class="plan-guide-disabled-icon">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
                    '</div>' +
                    '<div class="plan-guide-disabled-text">' +
                        '<div class="plan-guide-disabled-title">每日任务</div>' +
                        '<div class="plan-guide-disabled-desc">完成诊断后解锁</div>' +
                    '</div>' +
                '</div>' +
                '<div class="plan-guide-disabled-card">' +
                    '<div class="plan-guide-disabled-icon">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>' +
                    '</div>' +
                    '<div class="plan-guide-disabled-text">' +
                        '<div class="plan-guide-disabled-title">五维能力分析</div>' +
                        '<div class="plan-guide-disabled-desc">完成诊断后解锁</div>' +
                    '</div>' +
                '</div>' +
                '<div class="plan-guide-disabled-card">' +
                    '<div class="plan-guide-disabled-icon">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
                    '</div>' +
                    '<div class="plan-guide-disabled-text">' +
                        '<div class="plan-guide-disabled-title">' + getPlanDuration() + '天冲刺计划</div>' +
                        '<div class="plan-guide-disabled-desc">完成诊断后解锁</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }
        return;
    }
    
    // ===== 有诊断数据时的完整展示 =====
    var todayPlan = plan && plan.dailyPlan ? plan.dailyPlan[dayIdx] : null;
    var currentPhase = getCurrentPhase();
    var todayCompleted = hasTodayPracticeRecord();
    
    var html = '';
    
    // ===== 阶段总览卡片 =====
    if (plan && plan.phases) {
        html += '<div class="plan-phase-overview">';
        html += '<div class="plan-phase-title">冲刺阶段</div>';
        html += '<div class="plan-phase-progress">';
        for (var i = 0; i < plan.phases.length; i++) {
            var phase = plan.phases[i];
            var isActive = currentPhase && currentPhase.name === phase.name;
            var isPast = currentPhase && getPhaseIndex(phase.name) < getPhaseIndex(currentPhase.name);
            html += '<div class="plan-phase-item ' + (isActive ? 'active' : '') + ' ' + (isPast ? 'past' : '') + '">';
            html += '<div class="plan-phase-dot"></div>';
            html += '<div class="plan-phase-name">' + phase.name + '</div>';
            html += '<div class="plan-phase-days">第' + phase.dayRange[0] + '-' + phase.dayRange[1] + '天</div>';
            html += '</div>';
        }
        html += '</div></div>';
    }
    
    // ===== 今日任务卡片（最突出）=====
    html += '<div class="plan-today-card ' + (todayCompleted ? 'completed' : '') + '">';
    html += '<div class="plan-today-header">';
    html += '<div class="plan-today-label">今日任务</div>';
    html += '<div class="plan-today-badge ' + (todayCompleted ? 'done' : '') + '">' + 
            (todayCompleted ? '✓ 已完成' : '进行中') + '</div>';
    html += '</div>';
    
    if (todayPlan) {
        html += '<div class="plan-today-focus">';
        html += '<span class="plan-focus-tag">' + (todayPlan.focusDim || '综合训练') + '</span>';
        html += '<span class="plan-est-time">约' + (todayPlan.estimatedTime || 30) + '分钟</span>';
        html += '</div>';
        
        html += '<div class="plan-today-tasks">';
        var tasks = todayPlan.tasks || [];
        for (var t = 0; t < tasks.length; t++) {
            var task = tasks[t];
            var taskText = typeof task === 'string' ? task : task.text;
            var taskType = typeof task === 'object' ? task.type : '';
            var taskDim = typeof task === 'object' ? task.dim : '';
            
            var taskIcon = getTaskIcon(taskType);
            html += '<div class="plan-task-item" onclick="doTodayTask(\'' + (taskDim || taskType) + '\')">';
            html += '<div class="plan-task-icon">' + taskIcon + '</div>';
            html += '<div class="plan-task-text">' + taskText + '</div>';
            html += '<div class="plan-task-arrow">›</div>';
            html += '</div>';
        }
        html += '</div>';
    } else {
        html += '<div class="plan-today-empty">暂无今日任务安排</div>';
    }
    html += '</div>';
    
    // ===== 未来3天预览 =====
    if (plan && plan.dailyPlan) {
        html += '<div class="plan-future-section">';
        html += '<div class="plan-future-title">后续任务预览</div>';
        html += '<div class="plan-future-list">';
        
        for (var d = dayIdx + 1; d <= Math.min(dayIdx + 3, plan.totalDays); d++) {
            var futurePlan = plan.dailyPlan[d];
            if (futurePlan) {
                html += '<div class="plan-future-item">';
                html += '<div class="plan-future-day">Day ' + d + '</div>';
                html += '<div class="plan-future-info">';
                html += '<div class="plan-future-dim">' + (futurePlan.focusDim || '综合') + '</div>';
                html += '<div class="plan-future-phase">' + (futurePlan.phase || '') + '</div>';
                html += '</div>';
                html += '<div class="plan-future-time">约' + (futurePlan.estimatedTime || 30) + '分钟</div>';
                html += '</div>';
            }
        }
        html += '</div></div>';
    }
    
    // ===== 完成度统计 =====
    html += '<div class="plan-stats-card">';
    html += '<div class="plan-stat-item">';
    html += '<div class="plan-stat-value">' + sprintProgress.completedDays + '</div>';
    html += '<div class="plan-stat-label">已完成天数</div>';
    html += '</div>';
    html += '<div class="plan-stat-divider"></div>';
    html += '<div class="plan-stat-item">';
    html += '<div class="plan-stat-value">' + sprintProgress.progress + '%</div>';
    html += '<div class="plan-stat-label">计划完成度</div>';
    html += '</div>';
    html += '<div class="plan-stat-divider"></div>';
    html += '<div class="plan-stat-item">';
    html += '<div class="plan-stat-value">' + (sprintProgress.totalDays - sprintProgress.completedDays) + '</div>';
    html += '<div class="plan-stat-label">剩余天数</div>';
    html += '</div>';
    html += '</div>';
    
    // ===== 操作按钮 =====
    html += '<div class="plan-actions">';
    html += '<button class="plan-btn-secondary" onclick="regeneratePlan()">重新生成计划</button>';
    html += '</div>';
    
    if (pageContent) {
        pageContent.innerHTML = html;
    }
    
    // 渲染雷达图预览
    renderPlanRadarPreview();
    
    // 渲染计划列表（保留兼容）
    renderPlanList(plan, dayIdx);
}

// 获取阶段索引
function getPhaseIndex(phaseName) {
    var phaseOrder = ['诊断期', '弱项突破', '全面提升', '冲刺巩固', '考前冲刺'];
    return phaseOrder.indexOf(phaseName);
}

// 获取任务图标
function getTaskIcon(taskType) {
    var icons = {
        'practice': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
        'vocab': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
        'listening': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
        'reading': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>',
        'writing': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
        'translation': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/></svg>',
        'review': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>',
        'test': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        'default': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    };
    return icons[taskType] || icons['default'];
}

// 执行今日任务
function doTodayTask(taskType) {
    // 根据任务类型跳转到对应功能
    if (taskType === '细节定位' || taskType === '推理判断' || taskType === '同义替换' || 
        taskType === '主旨归纳' || taskType === '态度判断') {
        // 专项练习
        switchTab('practice');
        setTimeout(function() {
            if (typeof loadPracticeQuestions === 'function') {
                loadPracticeQuestions(taskType);
            }
        }, 300);
    } else if (taskType === 'listening') {
        showToast('听力练习功能开发中');
    } else if (taskType === 'writing' || taskType === 'translation') {
        switchTab('diagnosis');
        setTimeout(function() { startDiagChat('今天练习写作'); }, 300);
    } else if (taskType === 'vocab') {
        switchTab('diagnosis');
        setTimeout(function() { startDiagChat('今天背诵词汇'); }, 300);
    } else if (taskType === 'test') {
        switchTab('diagnosis');
        setTimeout(function() { startDiagChat('开始模拟测试'); }, 300);
    } else if (taskType === 'review') {
        switchTab('wrong');
    } else {
        // 默认跳转到每日一练
        switchTab('home');
        setTimeout(function() { startDailyTask(); }, 300);
    }
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

// 渲染每日任务卡片（与冲刺计划联动版本）
function renderDailyTaskCard() {
    var data = state.userData || {};
    var todayDone = hasTodayPracticeRecord();
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
    
    // 获取冲刺计划中的当日任务
    var todayPlan = getTodayPlan();
    var focusDim = todayPlan ? todayPlan.focusDim : '';
    var todayTasks = todayPlan ? todayPlan.tasks : [];
    var estimatedTime = todayPlan ? todayPlan.estimatedTime : 0;
    var taskCount = todayTasks.length || 3;
    
    // === 首页卡片 ===
    var homeBadge = document.getElementById('home-daily-badge');
    var homeProgress = document.getElementById('home-daily-progress');
    var homeDesc = document.getElementById('home-daily-desc');
    var homeTitle = document.getElementById('home-daily-title');
    
    if (homeBadge) {
        if (todayDone) {
            homeBadge.textContent = taskCount + '/' + taskCount;
            homeBadge.style.background = '#D1FAE5';
            homeBadge.style.color = '#059669';
        } else {
            homeBadge.textContent = '0/' + taskCount;
            homeBadge.style.background = '#F1F5F9';
            homeBadge.style.color = '#475569';
        }
    }
    
    if (homeTitle) {
        homeTitle.textContent = todayDone ? '今日任务已完成' : '今日任务';
    }
    
    if (homeDesc) {
        if (todayDone) {
            homeDesc.textContent = '继续加油，保持节奏！';
        } else if (focusDim) {
            homeDesc.textContent = focusDim + ' · 约' + estimatedTime + '分钟';
        } else {
            var weakDims = getWeakDims();
            if (weakDims.length > 0) {
                homeDesc.textContent = weakDims[0] + '强化训练';
            } else {
                homeDesc.textContent = '综合能力提升训练';
            }
        }
    }
    
    // === 计划页卡片 ===
    var planBadge = document.getElementById('plan-daily-badge');
    var planProgress = document.getElementById('plan-daily-progress-bar');
    var planDesc = document.getElementById('plan-daily-desc');
    
    if (planBadge) {
        if (todayDone) {
            planBadge.textContent = taskCount + '/' + taskCount;
            planBadge.style.background = '#D1FAE5';
            planBadge.style.color = '#059669';
        } else {
            planBadge.textContent = '0/' + taskCount;
            planBadge.style.background = '#F1F5F9';
            planBadge.style.color = '#475569';
        }
    }
    
    if (planProgress) {
        planProgress.style.width = todayDone ? '100%' : '0%';
    }
    
    if (planDesc) {
        if (todayDone) {
            planDesc.textContent = '已完成今日任务，继续加油！';
        } else if (focusDim) {
            planDesc.textContent = focusDim + ' · 约' + estimatedTime + '分钟';
        } else {
            planDesc.textContent = '今日薄弱点强化训练';
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

// 点击遮罩层关闭 + 下滑关闭
(function() {
    var modal = document.getElementById('daily-task-modal');
    if (!modal) return;
    // 点击遮罩关闭
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeDailyTaskModal();
    });
    // 下滑关闭
    var sheet = modal.querySelector('.modal-sheet');
    if (!sheet) return;
    var startY = 0, currentY = 0, isDragging = false;
    sheet.addEventListener('touchstart', function(e) {
        // 只在顶部handle区域触发
        var rect = sheet.getBoundingClientRect();
        if (e.touches[0].clientY - rect.top < 50) {
            startY = e.touches[0].clientY;
            isDragging = true;
        }
    }, {passive: true});
    sheet.addEventListener('touchmove', function(e) {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        var diff = currentY - startY;
        if (diff > 0) {
            sheet.style.transform = 'translateY(' + diff + 'px)';
            sheet.style.transition = 'none';
        }
    }, {passive: true});
    sheet.addEventListener('touchend', function() {
        if (!isDragging) return;
        isDragging = false;
        sheet.style.transition = 'transform 0.3s ease';
        var diff = currentY - startY;
        if (diff > 80) {
            closeDailyTaskModal();
            setTimeout(function() { sheet.style.transform = ''; }, 300);
        } else {
            sheet.style.transform = '';
        }
        startY = 0; currentY = 0;
    });
})();

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
            
            // 显示技巧点拨
            var dimName = q.dim || '细节理解';
            var tipInfo = getTipInfo(dimName);
            html += '<div class="diag-tip-card">' +
                '<div class="diag-tip-header">' + tipInfo.tag + '</div>' +
                '<div class="diag-tip-text">' + tipInfo.tip + '</div>' +
                (isCorrect ? '' : '<div class="diag-tip-wrong">' + tipInfo.wrongHint + '</div>') +
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
var originalSwitchTab = window.switchTab || function(){};
window.switchTab = function(tab) {
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

var VARIANT_HISTORY_KEY = examKey("variant_history");
var VARIANT_DAILY_COUNT_KEY = examKey("variant_daily_count");

// 获取变式训练历史
function getVariantHistory() {
    return safeGetItem(examKey('variant_history'), []);
}

// 获取今日变式训练次数
function getTodayVariantCount() {
    var today = getTodayStr();
    var counts = safeGetItem(examKey('variant_daily_count'), {});
    return counts[today] || 0;
}

// 增加今日变式训练次数
function incrementTodayVariantCount() {
    var today = getTodayStr();
    var counts = safeGetItem(examKey('variant_daily_count'), {});
    counts[today] = (counts[today] || 0) + 1;
    // 只保留最近7天的记录
    var weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    for (var k in counts) {
        if (k < weekAgo) delete counts[k];
    }
    safeSetItem(examKey('variant_daily_count'), counts);
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
    safeSetItem(examKey('variant_history'), history);
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

var DYNAMIC_SCORES_KEY = examKey("dynamic_scores");

// 获取动态分数
function getDynamicScores() {
    try {
        var data = localStorage.getItem(examKey('dynamic_scores'));
        if (data) {
            return JSON.parse(data);
        }
    } catch(e) {}
    return null;
}

// 保存动态分数
function saveDynamicScores(scores) {
    try {
        localStorage.setItem(examKey('dynamic_scores'), JSON.stringify(scores));
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
        localStorage.setItem(examKey('ability_scores'), JSON.stringify({ dims: abilityScores }));
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
    name: EXAM_LABEL + '备考',
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
                    desc: '掌握' + EXAM_LABEL + '考试必备的核心词汇',
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
        var data = localStorage.getItem(examKey('ability_scores'));
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
                html += '<defs><linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#4F46E5"/><stop offset="100%" stop-color="#818CF8"/></linearGradient></defs>';
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

// ===== 用户ID数据恢复功能 =====
// 复制用户ID到剪贴板
function copyUserId() {
    var userId = getCloudUserId();
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(userId).then(function() {
            showToast('已复制');
        }).catch(function() {
            // 降级方案
            var textarea = document.createElement('textarea');
            textarea.value = userId;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showToast('已复制');
            } catch(e) {
                showToast('复制失败，请手动复制');
            }
            document.body.removeChild(textarea);
        });
    } else {
        // 降级方案
        var textarea = document.createElement('textarea');
        textarea.value = userId;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('已复制');
        } catch(e) {
            showToast('复制失败，请手动复制');
        }
        document.body.removeChild(textarea);
    }
}

// 更新"我的"页面显示的用户ID
function updateProfileUserId() {
    var userIdElem = document.getElementById('profile-user-id');
    if (userIdElem) {
        var userId = getCloudUserId();
        userIdElem.textContent = userId.substring(0, 8) + '...';
    }
    // 更新使用帮助红点状态
    updateHelpGuideBadge();
}

// 更新使用帮助红点状态
function updateHelpGuideBadge() {
    var badge = document.getElementById('help-guide-badge');
    if (!badge) return;
    var hasSeenHelp = localStorage.getItem(examKey('has_seen_help_guide'));
    badge.style.display = hasSeenHelp ? 'none' : 'inline-block';
}

// 显示使用帮助页面
function showHelpGuide() {
    // 标记已看过
    localStorage.setItem(examKey('has_seen_help_guide'), '1');
    updateHelpGuideBadge();
    
    var overlay = document.getElementById('help-guide-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'help-guide-overlay';
        overlay.className = 'help-guide-overlay';
        
        var html = '<div class="help-guide-header">' +
            '<button class="help-guide-back" onclick="closeHelpGuide()">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>' +
            '</button>' +
            '<div class="help-guide-title">使用帮助</div>' +
            '<div style="width:36px"></div>' +
        '</div>' +
        '<div class="help-guide-content">' +
            '<div class="help-guide-list">' +
                '<div class="help-item" onclick="startNewDiagnosis();closeHelpGuide();">' +
                    '<div class="help-item-icon purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></div>' +
                    '<div class="help-item-content">' +
                        '<div class="help-item-title">🎯 AI智能诊断</div>' +
                        '<div class="help-item-desc">5分钟测出你的薄弱项，精准定位需要加强的能力</div>' +
                    '</div>' +
                    '<div class="help-item-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>' +
                '</div>' +
                '<div class="help-item" onclick="doHelpAction(\'diagnosis\');">' +
                    '<div class="help-item-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>' +
                    '<div class="help-item-content">' +
                        '<div class="help-item-title">📝 每日一练</div>' +
                        '<div class="help-item-desc">根据薄弱项智能推题，每天练最有价值的题</div>' +
                    '</div>' +
                    '<div class="help-item-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>' +
                '</div>' +
                '<div class="help-item" onclick="doHelpAction(\'companion\');">' +
                    '<div class="help-item-icon teal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>' +
                    '<div class="help-item-content">' +
                        '<div class="help-item-title">💬 AI陪练</div>' +
                        '<div class="help-item-desc">随时出题随时问，像私教一样1对1练习</div>' +
                    '</div>' +
                    '<div class="help-item-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>' +
                '</div>' +
                '<div class="help-item" onclick="openEssayOverlay();closeHelpGuide();">' +
                    '<div class="help-item-icon orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></div>' +
                    '<div class="help-item-content">' +
                        '<div class="help-item-title">✍️ 作文批改</div>' +
                        '<div class="help-item-desc">逐句精修+评分，不只给分数还给方法</div>' +
                    '</div>' +
                    '<div class="help-item-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>' +
                '</div>' +
                '<div class="help-item" onclick="doHelpAction(\'wrongbook\');">' +
                    '<div class="help-item-icon red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>' +
                    '<div class="help-item-content">' +
                        '<div class="help-item-title">📖 错题本</div>' +
                        '<div class="help-item-desc">自动归集+智能复习提醒，艾宾浩斯记忆法巩固</div>' +
                    '</div>' +
                    '<div class="help-item-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>' +
                '</div>' +
                '<div class="help-item" onclick="doHelpAction(\'progress\');">' +
                    '<div class="help-item-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg></div>' +
                    '<div class="help-item-content">' +
                        '<div class="help-item-title">📊 学习数据</div>' +
                        '<div class="help-item-desc">五维能力雷达图+进步趋势，一目了然</div>' +
                    '</div>' +
                    '<div class="help-item-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>' +
                '</div>' +
            '</div>' +
            '<div class="help-guide-footer">' +
                '<div class="help-guide-contact">遇到问题？联系我们</div>' +
                '<div class="help-guide-contact-info">微信：cet4fanyi</div>' +
            '</div>' +
        '</div>';
        
        overlay.innerHTML = html;
        document.body.appendChild(overlay);
    }
    
    overlay.style.display = 'flex';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s';
    requestAnimationFrame(function() {
        overlay.style.opacity = '1';
    });
}

// 帮助页面动作处理
function doHelpAction(type) {
    closeHelpGuide();
    if (type === 'diagnosis') {
        startPractice();
    } else if (type === 'companion') {
        createNewChat('companion');
    } else if (type === 'wrongbook') {
        switchTab('wrongbook');
        renderWrongBook();
    } else if (type === 'progress') {
        switchTab('progress');
    }
}

// 关闭使用帮助页面
function closeHelpGuide() {
    var overlay = document.getElementById('help-guide-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(function() {
            overlay.style.display = 'none';
        }, 300);
    }
}

// 打开恢复数据模态框
function openRestoreDataModal() {
    var existing = document.getElementById('restore-modal');
    if (existing) existing.remove();
    
    var modal = document.createElement('div');
    modal.className = 'pay-modal';
    modal.id = 'restore-modal';
    modal.onclick = function(e) { if (e.target === modal) closeRestoreModal(); };
    modal.innerHTML = 
        '<div class="pay-sheet" style="position:relative">' +
            '<div class="pay-sheet-handle"></div>' +
            '<button class="pay-close" onclick="closeRestoreModal()">' +
                '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">' +
                    '<line x1="1" y1="1" x2="13" y2="13"/>' +
                    '<line x1="13" y1="1" x2="1" y2="13"/>' +
                '</svg>' +
            '</button>' +
            '<div class="pay-sheet-title">恢复数据</div>' +
            '<div style="font-size:13px;color:#64748B;text-align:center;margin-bottom:16px">输入你的用户ID恢复云端数据</div>' +
            '<div class="pay-input-row">' +
                '<input type="text" id="restore-user-id-input" placeholder="输入用户ID，如 u_12345678_abc" autocomplete="off" spellcheck="false">' +
                '<button id="restore-btn" onclick="doRestoreData()">恢复</button>' +
            '</div>' +
            '<div id="restore-msg" style="font-size:12px;margin-top:8px;min-height:18px;color:#EF4444"></div>' +
            '<div style="font-size:11px;color:#94A3B8;text-align:center;margin-top:12px">可在"我的"页面顶部查看您的用户ID</div>' +
        '</div>';
    document.body.appendChild(modal);
}

// 关闭恢复数据模态框
function closeRestoreModal() {
    var modal = document.getElementById('restore-modal');
    if (modal) modal.remove();
}

// 执行数据恢复
async function doRestoreData() {
    var input = document.getElementById('restore-user-id-input');
    var msg = document.getElementById('restore-msg');
    var btn = document.getElementById('restore-btn');
    var userId = input.value.trim();
    
    if (!userId) {
        msg.textContent = '请输入用户ID';
        return;
    }
    
    btn.disabled = true;
    btn.textContent = '恢复中...';
    msg.textContent = '';
    
    try {
        var success = await syncUserDataFromCloud(userId);
        if (success) {
            msg.style.color = '#22C55E';
            msg.textContent = '数据恢复成功！';
            closeRestoreModal();
            showToast('数据恢复成功');
            // 刷新页面以更新所有数据
            setTimeout(function() {
                window.location.reload();
            }, 1000);
        } else {
            msg.textContent = '未找到该用户的数据';
        }
    } catch(e) {
        msg.textContent = '恢复失败：' + (e.message || '网络错误');
    }
    
    btn.disabled = false;
    btn.textContent = '恢复';
}

// ===== 暴露函数到全局作用域（HTML onclick需要）=====
window.switchExamType = switchExamType;
window.handleQuickAction = handleQuickAction;
window.handleHomeCta = handleHomeCta;
window.handleEssayClick = handleEssayClick;
window.handleReviewClick = handleReviewClick;
window.handleModeTag = handleModeTag;
window.openDailyTask = openDailyTask;
window.handleTodayTaskClick = handleTodayTaskClick;
window.generateTodayPlan = generateTodayPlan;
window.markTaskComplete = markTaskComplete;
window.handleCapsuleClick = handleCapsuleClick;
window.ensureChatOpen = ensureChatOpen;
window.createNewChat = createNewChat;
window.sendMessage = sendMessage;
window.handleChatBack = handleChatBack;
window.showNewChatModal = showNewChatModal;
window.hideNewChatModal = hideNewChatModal;
window.startPractice = startPractice;
window.closeQuiz = closeQuiz;
window.quizNextQuestion = quizNextQuestion;
window.submitQuizEarly = submitQuizEarly;
window.startNewDiagnosis = startNewDiagnosis;
window.showDiagHistory = showDiagHistory;
window.showShareCard = showShareCard;
window.closeShareCard = closeShareCard;
window.showRediagModal = showRediagModal;
window.showClearChatModal = showClearChatModal;
window.showPrivacyModal = showPrivacyModal;
window.showTermsModal = showTermsModal;
window.showToast = showToast;
window.toggleVoiceInput = toggleVoiceInput;
window.closePersonalityModal = closePersonalityModal;
window.closeDailyTaskModal = closeDailyTaskModal;
window.submitDailyTask = submitDailyTask;
window.selectPlan = selectPlan;
window.switchCozeTab = switchCozeTab;
window.openActivateCodeModal = openActivateCodeModal;
window.openReportPayModal = openReportPayModal;
window.closeReportPage = closeReportPage;
window.exitDiagnosis = exitDiagnosis;
window.closeReportShare = closeReportShare;
window.showLearningPlan = showLearningPlan;
window.closeSpecialPlan = closeSpecialPlan;
window.regeneratePlan = regeneratePlan;
window.openRestoreDataModal = openRestoreDataModal;
window.copyUserId = copyUserId;
window.toggleFaq = toggleFaq;
window.showStudyHistory = showStudyHistory;
window.doCheckIn = doCheckIn;
window.filterWrongbook = filterWrongbook;
window.speakWord = speakWord;
window.startDimPractice = startDimPractice;
window.showPersonalityDetail = showPersonalityDetail;
window.toggleDiagRecordDetail = toggleDiagRecordDetail;
window.confirmRediag = confirmRediag;
window.closeRediagModal = closeRediagModal;
window.closeDiagHistory = closeDiagHistory;
window.closeClearChatModal = closeClearChatModal;
window.openConversation = openConversation;
window.selectOption = selectOption;
window.selectQuizOption = selectQuizOption;
window.selectQuizDim = selectQuizDim;
window.selectRedoOption = selectRedoOption;
window.selectDailyTaskAnswer = selectDailyTaskAnswer;
window.navigateToWrongBook = navigateToWrongBook;
window.handlePlayClick = handlePlayClick;
window.handleReplayClick = handleReplayClick;
window.selectListeningOption = selectListeningOption;
window.startListeningTest = startListeningTest;
window.startQuizWithDim = startQuizWithDim;
window.startPathPractice = startPathPractice;
window.showSelfEval = showSelfEval;
window.selectEval = selectEval;
window.showNodeDetail = showNodeDetail;
window.toggleWrongDetail = toggleWrongDetail;
window.togglePassage = togglePassage;
window.toggleModule = toggleModule;
window.closePayModal = closePayModal;
window.closeModal = closeModal;
window.closeRestoreModal = closeRestoreModal;
window.closePlanOverlay = closePlanOverlay;
window.activateWithCode = activateWithCode;
window.switchPayTab = switchPayTab;
function closeEssayOverlay(){} window.closeEssayOverlay=closeEssayOverlay;
window.showEssayTemplate=showEssayTemplate;
window.submitEssay=submitEssay;
window.practiceSimilarTranslation = practiceSimilarTranslation;
window.closeUpgradeCard = closeUpgradeCard;
window.restartQuiz = restartQuiz;
window.generateDiagReport = generateDiagReport;
window.handleDailyTaskClick = handleDailyTaskClick;
window.doTodayTask = doTodayTask;
window.doHelpAction = doHelpAction;
window.doRestoreData = doRestoreData;
window.showReportShare = showReportShare;
window.showSpecialPlan = showSpecialPlan;
window.renderDimensionWords = renderDimensionWords;
window.renderAllDimensionWords = renderAllDimensionWords;
window.skipTranslationTest = skipTranslationTest;
window.skipWritingTest = skipWritingTest;
window.startTranslationTest = startTranslationTest;
window.submitTranslationTest = submitTranslationTest;
window.startPracticeChallenge = startPracticeChallenge;
window.submitWritingTest = submitWritingTest;
window.upgradeToUnlockPlan = upgradeToUnlockPlan;
window.openDayPlan = openDayPlan;
