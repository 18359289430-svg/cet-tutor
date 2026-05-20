#!/usr/bin/env python3
"""
修复CET四级诊断题库：
1. 将旧格式（options数组）转换为新格式（optionA/B/C/D）
2. 为缺失ability的题目添加分类
3. 保存修复后的JSON
"""

import json
import re
import requests
import time

# 加载配置
with open('.env.local', 'r') as f:
    for line in f:
        if line.startswith('DEEPSEEK_API_KEY'):
            DEEPSEEK_API_KEY = line.split('=')[1].strip()
            break

API_URL = "https://api.deepseek.com/chat/completions"
HEADERS = {
    "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
    "Content-Type": "application/json"
}

# 能力维度列表
ABILITY_DIMENSIONS = ["细节定位", "推理判断", "同义替换", "主旨归纳", "态度推断"]

def load_questions():
    with open('public/diagnosis_questions.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def save_questions(data):
    with open('public/diagnosis_questions.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def convert_options_array(options_array):
    """将选项数组转换为单独的optionA/B/C/D字段"""
    result = {}
    for i, opt in enumerate(options_array):
        key = f"option{chr(65 + i)}"  # A, B, C, D
        # 去除选项前缀（如 "A. "）
        if opt and len(opt) > 1:
            result[key] = re.sub(r'^[A-D]\)\s*', '', opt).strip()
        else:
            result[key] = opt or ""
    return result

def classify_ability_by_keyword(question_text, passage_text=""):
    """
    基于关键词规则快速分类能力维度
    """
    q = question_text.lower()
    p = passage_text.lower()
    
    # 态度推断：询问态度、观点、看法
    if any(w in q for w in ['attitude', 'opinion', 'view', 'think', 'believe', 'feel', 'tone', '立场', '态度', '观点']):
        return "态度推断"
    
    # 主旨归纳：询问主题、主要观点、主要内容
    if any(w in q for w in ['main idea', 'main point', 'main purpose', 'mainly discuss', 'central theme', 'primary purpose', '主旨', '主题', '主要内容', '中心思想']):
        return "主旨归纳"
    
    # 同义替换：询问特定词/短语的含义，或paraphrase
    if any(w in q for w in ['most nearly mean', 'closest in meaning', 'paraphrase', 'phrase', 'word', 'term', 'interpret', '解释', '含义', '同义']):
        return "同义替换"
    
    # 推理判断：询问推断、暗示、can be inferred/learned/concluded
    if any(w in q for w in ['infer', 'imply', 'suggest', 'conclude', 'learn from', 'can be learned', '推断', '暗示']):
        return "推理判断"
    
    # 细节定位：询问具体事实、信息
    if any(w in q for w in ['what', 'why', 'how', 'when', 'where', 'who', 'which', 'according to', '原因', '时间', '地点']):
        return "细节定位"
    
    return "细节定位"  # 默认

def classify_with_deepseek(question_text, passage_text=""):
    """
    使用DeepSeek API进行能力维度分类
    """
    prompt = f"""请分析以下英语阅读题目的能力维度，只能返回以下5个选项之一：细节定位、推理判断、同义替换、主旨归纳、态度推断

题目：{question_text}

请只返回一个词，例如：细节定位

"""
    
    # 先尝试规则分类
    rule_result = classify_ability_by_keyword(question_text, passage_text)
    
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "stream": False,
        "temperature": 0.1
    }
    
    try:
        resp = requests.post(API_URL, headers=HEADERS, json=payload, timeout=30)
        if resp.status_code == 200:
            result = resp.json()
            ability = result.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
            # 验证返回的是有效的能力维度
            for dim in ABILITY_DIMENSIONS:
                if dim in ability:
                    return dim
            print(f"  DeepSeek返回异常: {ability}，使用规则结果: {rule_result}")
            return rule_result
        else:
            print(f"  DeepSeek API错误: {resp.status_code}，使用规则结果: {rule_result}")
            return rule_result
    except Exception as e:
        print(f"  API调用失败: {e}，使用规则结果: {rule_result}")
        return rule_result

def fix_old_format_questions(data):
    """修复旧格式题目"""
    fixed_count = 0
    total_passages = len(data.get('passages', []))
    
    for passage in data.get('passages', []):
        for q in passage.get('questions', []):
            # 检查是否是旧格式（有options数组）
            if 'options' in q and 'optionA' not in q:
                # 转换格式
                options = q.pop('options', [])
                converted = convert_options_array(options)
                q.update(converted)
                fixed_count += 1
            
            # 检查是否缺少ability
            if 'ability' not in q or not q['ability'] or q['ability'] == '?':
                # 获取题目文本和原文
                question_text = q.get('question', '')
                passage_text = passage.get('text', '')
                
                # 调用API分类
                print(f"正在分类题目 {q.get('id', 'unknown')}: {question_text[:50]}...")
                ability = classify_with_deepseek(question_text, passage_text)
                q['ability'] = ability
                print(f"  分类结果: {ability}")
                
                # API调用间隔
                time.sleep(0.3)
    
    print(f"\n修复完成：转换了 {fixed_count} 道题的格式")
    return data

def update_ability_summary(data):
    """更新能力维度统计"""
    summary = {}
    total = 0
    for passage in data.get('passages', []):
        for q in passage.get('questions', []):
            ability = q.get('ability', '未知')
            if ability not in summary:
                summary[ability] = 0
            summary[ability] += 1
            total += 1
    
    data['ability_summary'] = summary
    data['total_questions'] = total
    print(f"能力维度统计: {summary}")
    print(f"总题目数: {total}")
    return data

def main():
    print("=" * 50)
    print("开始修复CET四级诊断题库")
    print("=" * 50)
    
    # 加载题目
    data = load_questions()
    print(f"加载完成，共 {len(data.get('passages', []))} 个passages")
    
    # 修复题目格式和分类
    data = fix_old_format_questions(data)
    
    # 更新统计
    data = update_ability_summary(data)
    
    # 保存
    save_questions(data)
    print("\n保存完成: public/diagnosis_questions.json")

if __name__ == '__main__':
    main()
