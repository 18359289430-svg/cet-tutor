#!/usr/bin/env python3
"""
六级题库能力维度重标注 - 关键词规则强制版本
"""
import json
import time
import random
import re
from collections import Counter
import urllib.request
import sys

API_KEY = "sk-63db9eb4f770446b890d21f5b1a8eddd"
API_URL = "https://api.deepseek.com/v1/chat/completions"

STANDARD_ABILITIES = ["细节理解", "推理判断", "同义替换", "主旨归纳", "态度判断"]

PROMPT_TEMPLATE = """你是六级考试阅读理解出题专家。请严格按以下规则为{count}道题判断能力维度。

## 强制规则（必须100%遵守）：
根据题干关键词直接判定维度：
1. 含 WHY/HOW/CAUSE/BECAUSE → 推理判断
2. 含 IMPLY/IMPLIES/SUGGEST/SUGGESTS/INDICATE/INFER/INFERRED/CONCLUDE → 推理判断
3. 含 MAIN IDEA/BEST TITLE/PURPOSE OF PASSAGE/CONCLUSION/SUMMARY → 主旨归纳
4. 含 ATTITUDE/TONE/OPINION/PERSPECTIVE → 态度判断
5. 含 MEANING OF WORD/PHRASE/REFER TO/STANDS FOR → 同义替换
6. 其他所有 → 细节理解

## 注意事项：
- 优先判断关键词，即使选项看起来像同义替换
- 若题干无关键词但选项是原文原词 → 细节理解
- 若题干无关键词但选项是同义替换 → 同义替换

## 输出格式（严格JSON数组）：
```json
[{{"id":"题目id","ability":"维度名"}}]
```

## 题目：
{questions}
"""

def call_deepseek(messages, temperature=0.5, max_tokens=4000):
    data = {
        "model": "deepseek-chat",
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    req = urllib.request.Request(
        API_URL,
        data=json.dumps(data).encode('utf-8'),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result["choices"][0]["message"]["content"]
    except Exception as e:
        raise Exception(f"API Error: {e}")

def extract_json(response_text):
    match = re.search(r'\[[\s\S]*?"id"[\s\S]*?"ability"[\s\S]*?\]', response_text)
    if match:
        try:
            return json.loads(match.group(0))
        except:
            pass
    try:
        return json.loads(response_text)
    except:
        return None

def keyword_classify(question):
    """基于关键词分类"""
    q_lower = question.lower()
    if any(kw in q_lower for kw in ['why', 'how', 'cause', 'because']):
        return "推理判断"
    if any(kw in q_lower for kw in ['imply', 'suggests', 'indicate', 'infer', 'conclude']):
        return "推理判断"
    if any(kw in q_lower for kw in ['main idea', 'best title', 'purpose of passage', 'conclusion', 'summary']):
        return "主旨归纳"
    if any(kw in q_lower for kw in ['attitude', 'tone', 'opinion', 'perspective']):
        return "态度判断"
    if any(kw in q_lower for kw in ['meaning of', 'refer to', 'stands for', 'word "', 'phrase "']):
        return "同义替换"
    return "细节理解"

def relabel_batch(batch, batch_num):
    count = len(batch)
    print(f"批次 {batch_num}: 处理 {count} 道题")
    
    questions_text = []
    for q in batch:
        q_text = f"题目{q['id']}: {q['question']}"
        if q.get('optionA'):
            q_text += f" | A.{q['optionA']} B.{q['optionB']} C.{q['optionC']} D.{q['optionD']}"
        questions_text.append(q_text)
    
    prompt = PROMPT_TEMPLATE.format(count=count, questions="\n".join(questions_text))
    messages = [{"role": "user", "content": prompt}]
    
    for attempt in range(3):
        try:
            response = call_deepseek(messages, temperature=0.5)
            results = extract_json(response)
            if results and isinstance(results, list):
                actual_dist = Counter(r["ability"] for r in results)
                print(f"  实际分布: {dict(actual_dist)}")
                return {r["id"]: r["ability"] for r in results}
            print(f"  解析失败，重试...")
        except Exception as e:
            print(f"  错误: {str(e)[:80]}，重试...")
        time.sleep(2)
    return None

with open('data/cet6_quiz_questions.json', 'r') as f:
    questions = json.load(f)

batch_size = 25

# 需要重标的批次
batch_indices = [int(x) for x in sys.argv[1].split(',')] if len(sys.argv) > 1 else []

for batch_idx in batch_indices:
    start = batch_idx * batch_size
    end = min(start + batch_size, len(questions))
    batch = questions[start:end]
    
    print(f"\n=== 批次 {batch_idx+1}: 索引 {start}-{end} ===")
    result = relabel_batch(batch, batch_idx+1)
    
    if result:
        for q in batch:
            if q["id"] in result:
                q["ability"] = result[q["id"]]
        with open('data/cet6_quiz_questions.json', 'w') as f:
            json.dump(questions, f, ensure_ascii=False, indent=2)
        print("已保存")
    else:
        print("失败!")
    
    time.sleep(3)

# 最终统计
abilities = Counter(q["ability"] for q in questions)
print(f"\n最终分布:")
for k, v in sorted(abilities.items(), key=lambda x: -x[1]):
    print(f"  {k}: {v} ({v*100/len(questions):.1f}%)")
