#!/usr/bin/env python3
"""
六级题库能力维度重标注 - 分布均衡版本
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

PROMPT_TEMPLATE = """你是六级考试阅读理解出题专家。请为以下{count}道题判断能力维度。

## 严格分配规则（必须遵守）：
每批{count}道题，必须严格按以下数量分配：
{distribution}

## 分类标准：
1. 推理判断（关键词：implies/suggests/indicates/why/infer/conclude/imply/how...）
2. 同义替换（选项3-4个关键词与原文词汇/短语一一对应替换）
3. 主旨归纳（问main idea/best title/purpose/summary/conclusion）
4. 态度判断（问attitude/tone/opinion/perspective）
5. 细节理解（定位原文某一句具体信息）

## 判断技巧：
- 选项含原文原词 → 很可能是细节理解（但也可能是陷阱）
- 选项用同义词/短语替换 → 同义替换
- 问原因/结果/隐含 → 推理判断
- 概括性选项 → 主旨归纳

## 输出格式（严格JSON）：
```json
[
  {{"id": "题目id", "ability": "维度名"}}
]
```
不要输出任何其他内容。

## 题目：
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
    # 提取JSON数组
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

def get_distribution(count):
    """计算每批的分布目标"""
    # 均匀分配
    base = count // 5
    remainder = count % 5
    dist = {}
    abilities = ["细节理解", "推理判断", "同义替换", "主旨归纳", "态度判断"]
    for i, ab in enumerate(abilities):
        dist[ab] = base + (1 if i < remainder else 0)
    return dist

def format_distribution(dist):
    """格式化分布描述"""
    return "\n".join([f"- {k}: {v}道" for k, v in dist.items()])

def relabel_batch(batch, batch_num):
    count = len(batch)
    dist = get_distribution(count)
    
    print(f"批次 {batch_num}: 处理 {count} 道题，分布: {dist}")
    
    questions_text = []
    for q in batch:
        q_text = f"题目{q['id']}: {q['question']}"
        if q.get('optionA'):
            q_text += f" | A.{q['optionA']} B.{q['optionB']} C.{q['optionC']} D.{q['optionD']}"
        questions_text.append(q_text)
    
    prompt = PROMPT_TEMPLATE.format(
        count=count,
        distribution=format_distribution(dist),
        questions="\n".join(questions_text)
    )
    messages = [{"role": "user", "content": prompt}]
    
    for attempt in range(3):
        try:
            response = call_deepseek(messages, temperature=0.6)
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

# 读取题库
with open('data/cet6_quiz_questions.json', 'r') as f:
    questions = json.load(f)

print(f"共 {len(questions)} 道题")

batch_idx = int(sys.argv[1]) if len(sys.argv) > 1 else 0
batch_size = 25

total_batches = (len(questions) + batch_size - 1) // batch_size
start = batch_idx * batch_size
end = min(start + batch_size, len(questions))
batch = questions[start:end]

print(f"批次 {batch_idx+1}/{total_batches}: 索引 {start}-{end}")

result = relabel_batch(batch, batch_idx+1)

if result:
    for q in batch:
        if q["id"] in result:
            q["ability"] = result[q["id"]]
    
    with open('data/cet6_quiz_questions.json', 'w') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"已保存")
else:
    print("失败!")
