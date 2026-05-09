#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
升级导航栏为Stripe风格的脚本
"""

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# ========== 1. 替换导航CSS部分 ==========
# 找到导航CSS的开始和结束位置
nav_css_start = content.find('/* ========== 导航 ========== */')
nav_css_end = content.find('/* ========== Hero区 ========== */')

if nav_css_start == -1 or nav_css_end == -1:
    print("错误：找不到导航CSS位置")
    exit(1)

# Stripe风格的导航CSS
new_nav_css = '''/* ========== 导航（Stripe风格） ========== */
        .nav {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 64px;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(0, 0, 0, 0.06);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 40px;
            z-index: 100;
            transition: all 0.3s ease;
        }

        /* 底部渐变条 - Stripe标志性设计 */
        .nav::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, #635BFF, #7C3AED, #06B6D4, #f97316);
            opacity: 0.6;
            transition: opacity 0.3s ease;
        }

        /* 滚动后加阴影 */
        .nav.scrolled {
            background: rgba(255, 255, 255, 0.98);
            box-shadow: 0 1px 12px rgba(0, 0, 0, 0.08);
        }

        .nav.scrolled::after {
            opacity: 0.8;
        }

        .nav-left {
            display: flex;
            align-items: center;
            gap: 48px;
        }

        .nav-logo {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            font-weight: 700;
            font-size: 18px;
            color: #0a2540;
            letter-spacing: -0.02em;
        }

        .nav-logo-icon {
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #635BFF, #7C3AED);
            border-radius: 8px;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 700;
        }

        .nav-links {
            display: flex;
            align-items: center;
            gap: 32px;
        }

        .nav-link {
            color: #4a5568;
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            position: relative;
            transition: color 0.2s;
        }

        .nav-link:hover {
            color: #0a2540;
        }

        /* 下划线hover动画 */
        .nav-link::after {
            content: '';
            position: absolute;
            bottom: -4px;
            left: 0;
            width: 0;
            height: 2px;
            background: #635BFF;
            transition: width 0.3s ease;
        }

        .nav-link:hover::after {
            width: 100%;
        }

        .nav-link.active {
            color: #0a2540;
        }

        .nav-link.active::after {
            width: 100%;
        }

        .nav-right {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        /* 登录按钮 - 浅灰风格 */
        .nav-link-user {
            padding: 8px 16px;
            border-radius: 8px;
            color: #4a5568;
            font-size: 14px;
            font-weight: 500;
            text-decoration: none;
            transition: all 0.2s;
            background: transparent;
        }

        .nav-link-user:hover {
            background: rgba(0, 0, 0, 0.04);
            color: #0a2540;
        }

        /* CTA按钮 - 渐变风格 */
        .btn-primary {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, #635BFF, #7C3AED);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(99, 91, 255, 0.25);
        }

        .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 16px rgba(99, 91, 255, 0.4);
        }

        .btn-primary.nav-cta {
            padding: 8px 20px;
        }

        /* 汉堡菜单按钮 */
        .nav-hamburger {
            display: none;
            flex-direction: column;
            justify-content: center;
            gap: 5px;
            width: 40px;
            height: 40px;
            padding: 8px;
            background: transparent;
            border: none;
            cursor: pointer;
            border-radius: 8px;
            transition: background 0.2s;
        }

        .nav-hamburger:hover {
            background: rgba(0, 0, 0, 0.04);
        }

        .nav-hamburger span {
            display: block;
            width: 20px;
            height: 2px;
            background: #0a2540;
            border-radius: 1px;
            transition: all 0.3s ease;
        }

        .nav-hamburger.active span:nth-child(1) {
            transform: rotate(45deg) translate(5px, 5px);
        }

        .nav-hamburger.active span:nth-child(2) {
            opacity: 0;
        }

        .nav-hamburger.active span:nth-child(3) {
            transform: rotate(-45deg) translate(5px, -5px);
        }

        /* 移动端菜单 */
        .nav-mobile-menu {
            display: none;
            position: fixed;
            top: 64px;
            left: 0;
            right: 0;
            bottom: 0;
            background: white;
            padding: 20px;
            z-index: 99;
            flex-direction: column;
            gap: 8px;
            animation: slideDown 0.3s ease;
        }

        .nav-mobile-menu.active {
            display: flex;
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .nav-mobile-menu .nav-link {
            padding: 12px 16px;
            font-size: 16px;
            border-radius: 8px;
        }

        .nav-mobile-menu .nav-link:hover {
            background: rgba(99, 91, 255, 0.08);
        }

        .nav-mobile-menu .nav-link::after {
            display: none;
        }

        .nav-mobile-menu .nav-cta {
            margin-top: 16px;
            padding: 14px 24px;
            font-size: 16px;
            width: 100%;
            justify-content: center;
        }

'''

# 替换导航CSS
content = content[:nav_css_start] + new_nav_css + content[nav_css_end:]

# ========== 2. 替换导航HTML部分 ==========
# 找到导航HTML的开始和结束
nav_html_start = content.find('<!-- 导航 -->')
nav_html_end = content.find('<!-- 首页视图 -->')

if nav_html_start == -1 or nav_html_end == -1:
    print("错误：找不到导航HTML位置")
    exit(1)

# Stripe风格的导航HTML
new_nav_html = '''<!-- 导航（Stripe风格） -->
    <nav class="nav" id="nav">
        <div class="nav-left">
            <div class="nav-logo" onclick="switchView('home')">
                <div class="nav-logo-icon">CET</div>
                <span>四级备考搭子</span>
            </div>
            <div class="nav-links">
                <a href="#features" class="nav-link">功能</a>
                <a href="#personalities" class="nav-link">人格</a>
                <a href="#pricing" class="nav-link">定价</a>
                <a href="#faq" class="nav-link">FAQ</a>
            </div>
        </div>
        <div class="nav-right">
            <a href="#" class="nav-link-user" onclick="switchView('user'); return false;">登录</a>
            <button class="btn-primary nav-cta" onclick="openChat('diagnosis')">开始诊断</button>
            <button class="nav-hamburger" id="navHamburger" onclick="toggleMobileMenu()">
                <span></span>
                <span></span>
                <span></span>
            </button>
        </div>
    </nav>

    <!-- 移动端菜单 -->
    <div class="nav-mobile-menu" id="navMobileMenu">
        <a href="#features" class="nav-link" onclick="closeMobileMenu()">功能</a>
        <a href="#personalities" class="nav-link" onclick="closeMobileMenu()">人格</a>
        <a href="#pricing" class="nav-link" onclick="closeMobileMenu()">定价</a>
        <a href="#faq" class="nav-link" onclick="closeMobileMenu()">FAQ</a>
        <a href="#" class="nav-link-user" onclick="switchView('user'); closeMobileMenu(); return false;">我的</a>
        <button class="btn-primary nav-cta" onclick="openChat('diagnosis'); closeMobileMenu();">开始诊断</button>
    </div>

'''

# 替换导航HTML
content = content[:nav_html_start] + new_nav_html + content[nav_html_end:]

# ========== 3. 更新响应式CSS ==========
# 找到响应式CSS位置并更新
responsive_css = '''
        /* ========== 响应式 ========== */
        @media (max-width: 768px) {
            .nav {
                padding: 0 20px;
            }

            .nav-links {
                display: none;
            }

            .nav-hamburger {
                display: flex;
            }

            .nav-link-user {
                display: none;
            }

            .nav-cta {
                display: none;
            }

            .nav-right {
                gap: 8px;
            }

            .hero {
                padding: 100px 20px 60px;
            }

            .hero-title {
                font-size: 32px;
            }

            .hero-subtitle {
                font-size: 16px;
            }

            .features-section {
                padding: 60px 20px;
            }

            .features-title {
                font-size: 28px;
            }

            .section {
                padding: 60px 20px;
            }

            .section-title {
                font-size: 24px;
            }
        }
'''

# 找到旧的响应式CSS并替换
old_responsive_start = content.find('/* ========== 响应式 ========== */')
if old_responsive_start != -1:
    old_responsive_end = content.find('@media', old_responsive_start + 30)
    if old_responsive_end == -1:
        # 找到下一个主要section
        next_section = content.find('/* ==========', old_responsive_start + 30)
        old_responsive_end = next_section if next_section != -1 else len(content)
    
    content = content[:old_responsive_start] + responsive_css + content[old_responsive_end:]

# ========== 4. 添加移动端菜单JS ==========
# 在</script>标签之前添加JS
js_code = '''
        // 移动端菜单控制
        function toggleMobileMenu() {
            const menu = document.getElementById('navMobileMenu');
            const hamburger = document.getElementById('navHamburger');
            menu.classList.toggle('active');
            hamburger.classList.toggle('active');
            document.body.style.overflow = menu.classList.contains('active') ? 'hidden' : '';
        }

        function closeMobileMenu() {
            const menu = document.getElementById('navMobileMenu');
            const hamburger = document.getElementById('navHamburger');
            menu.classList.remove('active');
            hamburger.classList.remove('active');
            document.body.style.overflow = '';
        }

        // 点击菜单外部关闭
        document.addEventListener('click', function(e) {
            const menu = document.getElementById('navMobileMenu');
            const hamburger = document.getElementById('navHamburger');
            if (menu && hamburger && 
                !menu.contains(e.target) && 
                !hamburger.contains(e.target) && 
                menu.classList.contains('active')) {
                closeMobileMenu();
            }
        });

'''

# 找到</script>标签并在其前插入JS
script_close = content.rfind('</script>')
if script_close != -1:
    content = content[:script_close] + js_code + content[script_close:]

# 保存修改后的文件
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("导航栏升级完成！")
