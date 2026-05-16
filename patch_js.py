# 读取JS文件
with open('/tmp/cet-plans/public/js/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 更新selectPlan函数以支持新卡片
old_selectPlan = '''function selectPlan(plan) {
    var cards = document.querySelectorAll('.coze-card');
    cards.forEach(function(c) { c.classList.remove('selected'); });
    var target = document.querySelector('.coze-card[data-plan="' + plan + '"]');
    if (target) target.classList.add('selected');
    var ctaBtn = document.getElementById('plan-cta-btn');
    if (ctaBtn) {
        var prices = { free: '当前方案', sprint: '¥44.5 开始冲刺', flagship: '¥149.5 全程陪伴' };
        ctaBtn.textContent = prices[plan] || '选择方案';
    }
}'''

new_selectPlan = '''function selectPlan(plan) {
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
}'''

content = content.replace(old_selectPlan, new_selectPlan)

# 在selectPlan函数后面添加switchPlanTab和initPlanTabs函数
insert_after = '''function selectPlan(plan) {
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
}'''

new_functions = '''function selectPlan(plan) {
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
}'''

content = content.replace(insert_after, new_functions)

# 写入文件
with open('/tmp/cet-plans/public/js/main.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("JS updated successfully!")
