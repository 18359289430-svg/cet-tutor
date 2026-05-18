#!/usr/bin/env python3
"""
六级题库能力维度重标注 - 单批执行版本
"""
import json
import time
import random
import re
from collections import Counter
import urllib.request
import urllib.error
import sys

API_KEY = "sk-63db9eb4f770446b890d21f5b1a8eddd"
API_URL = "https://api.deepseek.com/v1/chat/completions"

STANDARD_ABILITIES = ["细节理解", "推理判断", "同义替换", "主旨归纳", "态度判断"]
ABILITY_MAPPING = {
    "细节定位": "细节理解",
    "关键信息捕捉": "细节理解",
    "词义推断": "同义替换"
}

PROMPT_TEMPLATE = """你是六级考试阅读理解出题专家。请为以下{count}道阅读理解题目判断能力维度。

## 严格分类标准：
- 推理判断：题干含 implies/suggests/indicates/why/infer/inferred/conclude 等，或选项需整合多句推断
- 同义替换：选项3-4个关键词与原文词汇/短语替换（词、短语级）
- 主旨归纳：问 main idea/best title/purpose/conclusion，或选项为概括性描述
- 态度判断：问 attitude/tone/opinion/perspective，明显情感倾向词
- 细节理解：其他所有（定位原文中某一句的具体信息）

## 重要要求：
1. 共{count}道题，尽量均匀分布（每维约20%）
2. 禁止过度归类到细节理解
3. 问why/how/what原因结果 → 推理判断
4. 选项是原文同义替换 → 同义替换

返回JSON数组（严格JSON）：
```json
[
  {{"id": "题目id", "ability": "维度名"}}
]
```

## 题目列表：
{questions}
"""

def call_deepseek(messages, temperature=0.6, max_tokens=4000):
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

def normalize_ability(ability):
    if ability in STANDARD_ABILITIES:
        return ability
    if ability in ABILITY_MAPPING:
        return ABILITY_MAPPING[ability]
    return "细节理解"

def relabel_batch(batch, batch_num):
    count = len(batch)
    print(f"批次 {batch_num}: 处理 {count} 道题...")
    
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
            response = call_deepseek(messages, temperature=0.6)
            results = extract_json(response)
            if results and isinstance(results, list):
                return {r["id"]: r["ability"] for r in results}
            print(f"  解析失败，重试...")
        except Exception as e:
            print(f"  错误: {str(e)[:50]}，重试...")
        time.sleep(2)
    return None

# 读取题库
with open('data/cet6_quiz_questions.json', 'r') as f:
    questions = json.load(f)

print(f"共 {len(questions)} 道题")

# 获取批次参数
batch_idx = int(sys.argv[1]) if len(sys.argv) > 1 else 0
batch_size = 30

total_batches = (len(questions) + batch_size - 1) // batch_size
start = batch_idx * batch_size
end = min(start + batch_size, len(questions))
batch = questions[start:end]

print(f"批次 {batch_idx+1}/{total_batches}: 索引 {start}-{end}")

result = relabel_batch(batch, batch_idx+1)

if result:
    # 应用结果到questions
    for q in batch:
        if q["id"] in result:
            q["ability"] = normalize_ability(result[q["id"]])
    
    # 统计这批的分布
    dist = Counter(q["ability"] for q in batch)
    print(f"  本批分布: {dict(dist)}")
    
    # 保存
    with open('data/cet6_quiz_questions.json', 'w') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"  已保存")
else:
    print("  失败!")
