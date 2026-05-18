#!/usr/bin/env python3
"""
六级题库能力维度重标注脚本 - 一次性搞定
使用DeepSeek API，精确prompt控制分布
"""

import json
import time
import random
import re
from collections import Counter
import urllib.request
import urllib.error

# DeepSeek API配置
API_KEY = "sk-63db9eb4f770446b890d21f5b1a8eddd"
API_URL = "https://api.deepseek.com/v1/chat/completions"

# 标准维度
STANDARD_ABILITIES = ["细节理解", "推理判断", "同义替换", "主旨归纳", "态度判断"]

# 维度映射（非标准名 → 标准名）
ABILITY_MAPPING = {
    "细节定位": "细节理解",
    "关键信息捕捉": "细节理解",
    "词义推断": "同义替换"
}

# 精确prompt模板
PROMPT_TEMPLATE = """你是六级考试阅读理解出题专家。请为以下{count}道阅读理解题目判断能力维度。

## 严格分类标准：

**推理判断**：题干含 implies/suggests/indicates/why/infer/inferred/conclude/imply 等关键词，或选项需整合多句信息推断
**同义替换**：四个选项中3-4个关键词与原文对应位置的词汇/短语进行替换（词、短语级别）
**主旨归纳**：问 main idea/best title/purpose/conclusion/summary，或选项为概括性描述
**态度判断**：问 attitude/tone/opinion/perspective/view，或有明显情感倾向词
**细节理解**：其他所有题目（定位原文中某一句的具体信息）

## 当前任务要求：
1. 共{count}道题
2. 必须严格按照上述标准分类
3. 每批尽量均匀分布（约20%每维度）
4. 禁止随意归类到"细节理解"

## 判断依据优先级：
1. 看题干关键词 → 推理判断/主旨归纳/态度判断
2. 看选项是否原文同义替换 → 同义替换
3. 其他 → 细节理解

请返回JSON数组（严格JSON格式，不要任何解释）：
```json
[
  {{"id": "题目id", "ability": "维度名"}}
]
```

## 题目列表：
{questions}
"""

def call_deepseek(messages, temperature=0.6, max_tokens=4000):
    """调用DeepSeek API"""
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
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else ""
        raise Exception(f"HTTP {e.code}: {error_body}")
    except Exception as e:
        raise Exception(str(e))

def extract_json_from_response(response_text):
    """从响应中提取JSON"""
    # 尝试多种JSON提取方式
    patterns = [
        r'\[[\s\S]*"id"[\s\S]*"ability"[\s\S]*\]',
        r'```json\s*([\s\S]*?)\s*```',
        r'```\s*([\s\S]*?)\s*```',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, response_text)
        if match:
            json_str = match.group(1) if '```' in pattern else match.group(0)
            try:
                return json.loads(json_str)
            except:
                pass
    
    # 尝试整个响应解析
    try:
        return json.loads(response_text)
    except:
        return None

def batch_relabel(questions_batch, batch_num, total_batches):
    """对一批题目进行重标注"""
    print(f"\n处理批次 {batch_num}/{total_batches} ({len(questions_batch)}道题)...")
    
    # 构建题目列表
    questions_text = []
    for q in questions_batch:
        q_text = f"题目{q['id']}: {q['question']}"
        if q.get('optionA'):
            q_text += f" | A.{q['optionA']} B.{q['optionB']} C.{q['optionC']} D.{q['optionD']}"
        questions_text.append(q_text)
    
    prompt = PROMPT_TEMPLATE.format(
        count=len(questions_batch),
        questions="\n".join(questions_text)
    )
    
    messages = [{"role": "user", "content": prompt}]
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = call_deepseek(messages, temperature=0.6)
            results = extract_json_from_response(response)
            
            if results and isinstance(results, list):
                print(f"  成功解析 {len(results)} 条结果")
                return {r["id"]: r["ability"] for r in results}
            else:
                print(f"  尝试 {attempt+1}: 解析失败，响应: {response[:200]}...")
                
        except Exception as e:
            print(f"  尝试 {attempt+1} 失败: {str(e)[:100]}")
            if attempt < max_retries - 1:
                time.sleep(5 + random.random() * 5)
    
    return None

def normalize_ability(ability):
    """标准化维度名"""
    if ability in STANDARD_ABILITIES:
        return ability
    if ability in ABILITY_MAPPING:
        return ABILITY_MAPPING[ability]
    # 未知维度默认为细节理解
    print(f"  警告: 未知维度 '{ability}'，映射为 '细节理解'")
    return "细节理解"

def main():
    # 读取题库
    print("读取题库...")
    with open('data/cet6_quiz_questions.json', 'r') as f:
        questions = json.load(f)
    
    print(f"共 {len(questions)} 道题")
    
    # 构建id到题目的映射
    q_by_id = {q["id"]: q for q in questions}
    
    # 分批处理
    batch_size = 30  # 每批30道
    batches = [questions[i:i+batch_size] for i in range(0, len(questions), batch_size)]
    total_batches = len(batches)
    
    print(f"分为 {total_batches} 批处理")
    
    # 存储重标注结果
    relabeled = {}
    failed_ids = []
    
    for i, batch in enumerate(batches):
        # 重标注这批
        result = batch_relabel(batch, i+1, total_batches)
        
        if result:
            relabeled.update(result)
        else:
            # 失败的保留原标注
            for q in batch:
                failed_ids.append(q["id"])
                relabeled[q["id"]] = q.get("ability", "细节理解")
        
        # API限流保护
        if i < total_batches - 1:
            wait_time = 2 + random.random() * 2
            print(f"  等待 {wait_time:.1f}秒...")
            time.sleep(wait_time)
    
    # 应用重标注结果
    print("\n应用重标注结果...")
    updated_count = 0
    for q in questions:
        q_id = q["id"]
        if q_id in relabeled:
            new_ability = normalize_ability(relabeled[q_id])
            q["ability"] = new_ability
            updated_count += 1
    
    print(f"更新了 {updated_count} 道题的维度")
    
    if failed_ids:
        print(f"失败 {len(failed_ids)} 道: {failed_ids[:5]}...")
    
    # 统计最终分布
    print("\n最终维度分布:")
    abilities = Counter(q["ability"] for q in questions)
    for k, v in sorted(abilities.items(), key=lambda x: -x[1]):
        print(f"  {k}: {v} ({v*100/len(questions):.1f}%)")
    
    # 检查是否只有5个标准维度
    non_standard = [k for k in abilities.keys() if k not in STANDARD_ABILITIES]
    if non_standard:
        print(f"\n警告: 存在非标准维度: {non_standard}")
    
    # 保存结果
    output_path = 'data/cet6_quiz_questions.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"\n保存到 {output_path}")
    
    # 同时保存到public目录
    public_path = 'public/cet6_quiz_questions.json'
    with open(public_path, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"保存到 {public_path}")

if __name__ == "__main__":
    main()
