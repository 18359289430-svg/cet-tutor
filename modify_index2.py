import re

# 读取修改后的文件
with open('/tmp/cet-tutor-deploy/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 修改首页"查看详情"按钮
old_home_data_cta = '''<div class="home-data-item" onclick="switchTab('study')">
                        <div class="home-data-cta">查看详情 →</div>
                    </div>'''

new_home_data_cta = '''<div class="home-data-item" onclick="openProgressOverlay()">
                        <div class="home-data-cta">查看详情 →</div>
                    </div>'''

content = content.replace(old_home_data_cta, new_home_data_cta)

# 2. 在学习页的打卡卡片后添加进度入口
old_streak_card = '''<div class="study-streak-card" id="study-streak-card">
                        <div class="streak-fire">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c.5 4-2 7-4 9.5C6 14 5.5 16 6 18c.7 3 3.5 4 6 4s5.3-1 6-4c.5-2 0-4-2-6.5C14 9 11.5 6 12 2z"/></svg>
                        </div>
                        <div class="streak-info">
                            <div class="streak-info-title">连续打卡中</div>
                            <div class="streak-info-sub">坚持就是胜利，不要断签！</div>
                        </div>
                        <div style="text-align:center">
                            <div class="streak-num-big" id="streak-num-big">0</div>
                            <div class="streak-num-label">天</div>
                        </div>
                    </div>'''

new_streak_card = '''<div class="study-streak-card" id="study-streak-card" onclick="openProgressOverlay()">
                        <div class="streak-fire">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c.5 4-2 7-4 9.5C6 14 5.5 16 6 18c.7 3 3.5 4 6 4s5.3-1 6-4c.5-2 0-4-2-6.5C14 9 11.5 6 12 2z"/></svg>
                        </div>
                        <div class="streak-info">
                            <div class="streak-info-title">连续打卡中</div>
                            <div class="streak-info-sub">坚持就是胜利，不要断签！</div>
                        </div>
                        <div style="text-align:center">
                            <div class="streak-num-big" id="streak-num-big">0</div>
                            <div class="streak-num-label">天</div>
                        </div>
                    </div>
                    
                    <!-- 学习进度入口卡 -->
                    <div class="study-plan-card" onclick="openProgressOverlay()" style="margin: 0 16px 8px;">
                        <div class="study-plan-left">
                            <div class="study-plan-icon" style="background: linear-gradient(135deg, #F0EEFF, #E8E4FF);">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#6C5CE7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                            </div>
                            <div class="study-plan-text">
                                <div class="study-plan-title">学习进度仪表盘</div>
                                <div class="study-plan-desc">查看详细数据分析</div>
                            </div>
                        </div>
                        <svg class="chat-suggest-arrow" viewBox="0 0 24 24" fill="none" stroke="#C0C0C8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>'''

content = content.replace(old_streak_card, new_streak_card)

# 3. 在作文overlay后添加进度仪表盘overlay
essay_overlay_end = '''    <!-- 作文批改界面 -->
    <div class="essay-overlay" id="essay-overlay">'''

progress_overlay_html = '''    <!-- 学习进度仪表盘 -->
    <div class="progress-overlay" id="progress-overlay">
        <div class="progress-sheet">
            <div class="progress-sheet-header">
                <div class="progress-sheet-title">📊 学习进度</div>
                <button class="progress-close-btn" onclick="closeProgressOverlay()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="progress-sheet-body" id="progress-sheet-body">
                <!-- 动态内容 -->
            </div>
        </div>
    </div>
    
    <!-- 作文批改界面 -->
    <div class="essay-overlay" id="essay-overlay">'''

content = content.replace(essay_overlay_end, progress_overlay_html)

# 保存
with open('/tmp/cet-tutor-deploy/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Step 2 done: Added HTML elements")
