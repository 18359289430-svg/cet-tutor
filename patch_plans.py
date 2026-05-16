import re

# 读取文件
with open('/tmp/cet-plans/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 找到tab-plans部分并替换
old_plans = '''            <!-- 套餐页 -->
            <div class="tab-page" id="tab-plans">
                <div class="plans-header">
                    <h1 class="plans-title">选择方案</h1>
                    <p class="plans-subtitle">解锁更多能力，提升备考效率</p>
                </div>
                <div class="current-plan-bar" id="current-plan-bar">
                    <span class="current-plan-label">当前套餐</span>
                    <span class="current-plan-name" id="current-plan-name">免费版</span>
                </div>
                <div class="coze-cards" id="coze-cards">
                    <div class="coze-card" data-plan="free" onclick="selectPlan('free')">
                        <div class="coze-card-top">
                            <span class="coze-card-name">免费版</span>
                            <div class="coze-card-price"><span class="coze-price-num">免费</span></div>
                        </div>
                        <div class="coze-card-tag">诊断+基础答疑</div>
                        <ul class="coze-card-features">
                            <li>✓ AI诊断+人格卡</li>
                            <li>✓ AI诊断不限次+陪练25轮/天</li>
                            <li>✓ 每日一练+打卡</li>
                            <li>✓ 作文/翻译 评分+问题标注</li>
                        </ul>
                        <button class="coze-card-btn outline" onclick="event.stopPropagation();openChat('chat')">开始诊断</button>
                    </div>
                    <div class="coze-card recommended" data-plan="sprint" onclick="selectPlan('sprint')">
                        <div class="coze-card-badge">推荐</div>
                        <div class="coze-card-top">
                            <span class="coze-card-name">冲刺营</span>
                            <div class="coze-card-price"><span class="coze-price-sign">¥</span><span class="coze-price-num">44.5</span><span class="coze-price-original">¥89</span></div>
                        </div>
                        <div class="coze-card-tag">限时5折 · 45天高效冲刺</div>
                        <ul class="coze-card-features">
                            <li>✓ AI对话 无限</li>
                            <li>✓ 45天个性化学习计划</li>
                            <li>✓ 作文批改 每日1次（逐句改写）</li>
                            <li>✓ 翻译批改 每日1次（参考译文）</li>
                            <li>✓ 针对短板的每日一练</li>
                        </ul>
                        <button class="coze-card-btn primary" onclick="event.stopPropagation();window.open('https://mbd.pub/o/bread/YZaTk5tsbA==?discount_code=NGUPFC')">立即购买</button>
                    </div>
                    <div class="coze-card" data-plan="flagship" onclick="selectPlan('flagship')">
                        <div class="coze-card-top">
                            <span class="coze-card-name">全程营</span>
                            <div class="coze-card-price"><span class="coze-price-sign">¥</span><span class="coze-price-num">149.5</span><span class="coze-price-original">¥299</span></div>
                        </div>
                        <div class="coze-card-tag">限时5折 · 45天全程陪伴</div>
                        <ul class="coze-card-features">
                            <li>✓ AI对话 无限</li>
                            <li>✓ 45天个性化学习计划</li>
                            <li>✓ 作文/翻译批改 无限（逐句改写+精讲）</li>
                            <li>✓ 针对短板的每日一练</li>
                            <li>✓ 深度精讲（为什么错+怎么避坑）</li>
                            <li>✓ 六级衔接指导</li>
                        </ul>
                        <button class="coze-card-btn primary" onclick="event.stopPropagation();window.open('https://mbd.pub/o/bread/YZaTk5ttbQ==?discount_code=WPBWPS')">立即购买</button>
                    </div>
                </div>'''

new_plans = '''            <!-- 套餐页 - Coze风格 -->
            <div class="tab-page" id="tab-plans">
                <!-- 顶部状态条 -->
                <div class="coze-status-bar">
                    <div class="coze-status-dot"></div>
                    <span class="coze-status-text">当前套餐</span>
                    <span class="coze-status-plan" id="coze-status-plan">免费版</span>
                    <span class="coze-status-hint">点击卡片切换查看</span>
                </div>
                
                <!-- 标签切换栏 -->
                <div class="coze-plan-tabs">
                    <div class="coze-plan-tab active" data-plan="free" onclick="switchPlanTab('free')">体验版</div>
                    <div class="coze-plan-tab" data-plan="sprint" onclick="switchPlanTab('sprint')">冲刺版</div>
                    <div class="coze-plan-tab" data-plan="flagship" onclick="switchPlanTab('flagship')">旗舰版</div>
                    <div class="coze-plan-tab-indicator"></div>
                </div>
                
                <!-- 横滑卡片容器 -->
                <div class="coze-card-scroll" id="coze-card-scroll">
                    <!-- 体验版卡片 -->
                    <div class="coze-plan-card" data-plan="free" onclick="selectPlan('free')">
                        <div class="coze-card-inner">
                            <div class="coze-plan-name">体验版</div>
                            <div class="coze-plan-price">
                                <span class="coze-price-main">免费</span>
                            </div>
                            <div class="coze-plan-desc">诊断+基础答疑</div>
                            <div class="coze-plan-features">
                                <div class="coze-feature-item">✓ AI诊断+人格卡</div>
                                <div class="coze-feature-item">✓ 每日一练+打卡</div>
                                <div class="coze-feature-item">✓ 作文/翻译 评分</div>
                            </div>
                            <button class="coze-plan-btn outline" onclick="event.stopPropagation();openChat('chat')">开始诊断</button>
                        </div>
                    </div>
                    
                    <!-- 冲刺版卡片 -->
                    <div class="coze-plan-card recommended" data-plan="sprint" onclick="selectPlan('sprint')">
                        <div class="coze-card-badge">推荐</div>
                        <div class="coze-card-inner">
                            <div class="coze-plan-name">冲刺版</div>
                            <div class="coze-plan-price">
                                <span class="coze-price-sign">¥</span>
                                <span class="coze-price-main">44.5</span>
                                <span class="coze-price-original">¥89</span>
                            </div>
                            <div class="coze-plan-tag">限时5折 · 45天</div>
                            <div class="coze-plan-features">
                                <div class="coze-feature-item">✓ AI对话 无限</div>
                                <div class="coze-feature-item">✓ 45天学习计划</div>
                                <div class="coze-feature-item">✓ 作文/翻译批改</div>
                                <div class="coze-feature-item">✓ 每日一练</div>
                            </div>
                            <button class="coze-plan-btn primary" onclick="event.stopPropagation();window.open('https://mbd.pub/o/bread/YZaTk5tsbA==?discount_code=NGUPFC')">立即购买</button>
                        </div>
                    </div>
                    
                    <!-- 旗舰版卡片 -->
                    <div class="coze-plan-card" data-plan="flagship" onclick="selectPlan('flagship')">
                        <div class="coze-card-inner">
                            <div class="coze-plan-name">旗舰版</div>
                            <div class="coze-plan-price">
                                <span class="coze-price-sign">¥</span>
                                <span class="coze-price-main">149.5</span>
                                <span class="coze-price-original">¥299</span>
                            </div>
                            <div class="coze-plan-tag">限时5折 · 45天</div>
                            <div class="coze-plan-features">
                                <div class="coze-feature-item">✓ AI对话 无限</div>
                                <div class="coze-feature-item">✓ 批改服务无限</div>
                                <div class="coze-feature-item">✓ 深度精讲</div>
                                <div class="coze-feature-item">✓ 六级衔接指导</div>
                            </div>
                            <button class="coze-plan-btn primary" onclick="event.stopPropagation();window.open('https://mbd.pub/o/bread/YZaTk5ttbQ==?discount_code=WPBWPS')">立即购买</button>
                        </div>
                    </div>
                </div>'''

content = content.replace(old_plans, new_plans)

# 写入文件
with open('/tmp/cet-plans/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("HTML updated successfully!")
