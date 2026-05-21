#!/usr/bin/env python3
"""v108: 限时训练 + prompt优化 + 模板分解读 + 中式英语具体指正"""

with open('/opt/cet-tutor/public/js/main.js', 'r', encoding='utf-8') as f:
    js = f.read()

with open('/opt/cet-tutor/server.js', 'r', encoding='utf-8') as f:
    server = f.read()

changes = []

# ===== 1. 中式英语prompt - 加具体指正要求 =====
old_chinglish = "训练方法：2026新规重点！给5个典型中式英语表达(如open the light/people mountain people sea)，让用户改成地道英文。重点练思维转换。"
new_chinglish = "训练方法：2026新规重点！给5个典型中式英语表达(如open the light/developing fast/every coin has two sides)，让用户改成地道英文。每次纠错必须给出：1.为什么这是中式英语 2.地道说法是什么 3.这个替换为什么更自然。重点练思维转换，不是简单给答案。"
if old_chinglish in js:
    js = js.replace(old_chinglish, new_chinglish, 1)
    changes.append("中式英语prompt加具体指正")

# ===== 2. 写作完整写作prompt - 加模板分解读 =====
old_writing_full = "训练方法：给话题，30分钟限时写作。AI批改时重点看：1.模板化程度(超30%压分) 2.逻辑连贯性 3.语法错误。给出改进建议。"
new_writing_full = "训练方法：给话题，30分钟限时写作。AI批改时必须：1.给出模板化分数(0-100)，>70分警告'新规会压分'并标出模板化句子 2.评价逻辑连贯性 3.标出语法错误 4.每个模板化句子给出自然替代写法。"
if old_writing_full in js:
    js = js.replace(old_writing_full, new_writing_full, 1)
    changes.append("写作完整写作prompt加模板分解读")

# ===== 3. 推理判断prompt强化 =====
old_inference = "训练方法：2026新规重点！出推理判断题，答案藏在but/however之后或段首段尾。引导用户找推理链：原文信息→逻辑推导→正确选项。出3道推理题，逐步讲解推理思路。"
new_inference = "训练方法：2026新规重点！推理判断现在占阅读50%(以前30%)。出推理判断题，答案藏在but/however/although/desite之后或段首段尾。引导用户找推理链：原文信息→逻辑推导→正确选项。出3道推理题，逐步讲解推理思路。每道题讲完告诉用户'这种题在新规中占比最大'。"
if old_inference in js:
    js = js.replace(old_inference, new_inference, 1)
    changes.append("推理判断prompt强化50%占比")

# ===== 4. 限时训练 - 在训练模式AI消息中加入限时提醒 =====
# 找到训练模式检测的地方，在system prompt中加入限时
old_training_detect = "// 检测训练模式"
idx = js.find(old_training_detect)
if idx > 0:
    print(f"Found training detect at {idx}")
    start = idx
    end = min(len(js), idx + 500)
    print(f"Context: {js[start:end]}")
else:
    print("No training detect marker found, searching alternatives...")
    for marker in ["训练模式", "training_mode", "trainingMode"]:
        idx = js.find(marker)
        if idx > 0:
            start = max(0, idx - 100)
            end = min(len(js), idx + 300)
            print(f"Found '{marker}' at {idx}: {js[start:end]}")
            break

with open('/opt/cet-tutor/public/js/main.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("\nJS changes:", changes)
