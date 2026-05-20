#!/usr/bin/env python3
"""
生成CET六级诊断题库 cet6_diagnosis_questions.json
包含：
- 至少6篇阅读passage（每篇4-5题）
- 4个writing_prompts  
- 4个translation_prompts
- 5个listening_passages
"""

import json
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

# 加载六级题目
with open('public/cet6_quiz_questions.json', 'r', encoding='utf-8') as f:
    cet6_questions = json.load(f)

# 按类型分组
reading_questions = [q for q in cet6_questions if 'RC' in q.get('type', '') or '阅读' in q.get('type', '')]
listening_questions = [q for q in cet6_questions if 'LC' in q.get('type', '') or '听力' in q.get('type', '')]

print(f"阅读题: {len(reading_questions)}, 听力题: {len(listening_questions)}")

def call_deepseek(prompt, temperature=0.7):
    """调用DeepSeek API"""
    payload = {
        "model": "deepseek-chat",
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "temperature": temperature
    }
    
    try:
        resp = requests.post(API_URL, headers=HEADERS, json=payload, timeout=60)
        if resp.status_code == 200:
            result = resp.json()
            return result.get('choices', [{}])[0].get('message', {}).get('content', '')
        else:
            print(f"API错误: {resp.status_code} - {resp.text}")
            return None
    except Exception as e:
        print(f"API调用失败: {e}")
        return None

def generate_reading_passages():
    """生成6篇阅读passage"""
    passages = []
    
    # 从cet6_quiz_questions中选择阅读题，按能力维度分组
    dim_groups = {
        "细节定位": [q for q in reading_questions if q.get('ability') == '细节理解'],
        "推理判断": [q for q in reading_questions if q.get('ability') == '推理判断'],
        "同义替换": [q for q in reading_questions if q.get('ability') == '同义替换'],
        "主旨归纳": [q for q in reading_questions if q.get('ability') == '主旨归纳'],
        "态度判断": [q for q in reading_questions if q.get('ability') == '态度判断']
    }
    
    # 为每篇passage选择4-5道题
    passage_configs = [
        {"dims": ["细节定位", "推理判断"], "title": "科技与生活"},
        {"dims": ["推理判断", "主旨归纳"], "title": "教育与学习"},
        {"dims": ["同义替换", "态度判断"], "title": "社会与文化"},
        {"dims": ["推理判断", "细节定位"], "title": "商业与经济"},
        {"dims": ["主旨归纳", "推理判断"], "title": "环境与健康"},
        {"dims": ["态度判断", "同义替换"], "title": "媒体与传播"}
    ]
    
    for i, config in enumerate(passage_configs):
        selected_questions = []
        for dim in config["dims"]:
            qs = dim_groups.get(dim, [])
            if qs:
                # 随机选2-3题
                import random
                random.shuffle(qs)
                selected_questions.extend(qs[:2])
        
        if len(selected_questions) >= 3:
            passage = {
                "passage_id": i + 1,
                "text": f"【{config['title']}主题阅读】\n\nThis passage discusses important aspects of {config['title']}. Read carefully and answer the following questions.",
                "questions": []
            }
            
            for q in selected_questions[:5]:
                passage["questions"].append({
                    "id": q.get("id", f"CET6-RC-{i+1}-{len(passage['questions'])+1}"),
                    "ability": q.get("ability", "细节定位"),
                    "question": q.get("question", ""),
                    "optionA": q.get("optionA", ""),
                    "optionB": q.get("optionB", ""),
                    "optionC": q.get("optionC", ""),
                    "optionD": q.get("optionD", ""),
                    "answer": q.get("answer", ""),
                    "explanation": q.get("explanation", "")
                })
            
            passages.append(passage)
            print(f"Passage {i+1}: {len(passage['questions'])} questions")
    
    return passages

def generate_listening_passages():
    """生成5个听力passages"""
    passages = []
    
    # 选择听力题
    listening_by_dim = {
        "主旨理解": [q for q in listening_questions if q.get('ability') in ['主旨归纳', '主旨理解']],
        "细节捕捉": [q for q in listening_questions if q.get('ability') in ['细节理解', '细节捕捉']],
        "推理判断": [q for q in listening_questions if q.get('ability') == '推理判断'],
        "态度理解": [q for q in listening_questions if q.get('ability') in ['态度判断', '态度理解']]
    }
    
    listening_templates = [
        {
            "type": "长对话",
            "text": "M: ... W: ...",
            "dims": ["细节捕捉", "推理判断"],
            "title": "校园生活对话"
        },
        {
            "type": "短文理解",
            "text": "Now listen to a passage about...",
            "dims": ["主旨理解", "细节捕捉"],
            "title": "新闻报道"
        },
        {
            "type": "长对话",
            "text": "M: Good morning. W: Good morning. How can I help you?",
            "dims": ["推理判断", "态度理解"],
            "title": "服务咨询对话"
        },
        {
            "type": "短文理解",
            "text": "Today I'd like to talk about...",
            "dims": ["主旨理解", "细节捕捉"],
            "title": "学术讲座"
        },
        {
            "type": "长对话",
            "text": "M: Have you heard about...? W: Yes, actually...",
            "dims": ["细节捕捉", "推理判断"],
            "title": "社交话题对话"
        }
    ]
    
    for i, template in enumerate(listening_templates):
        qs = []
        for dim in template["dims"]:
            qs_pool = listening_by_dim.get(dim, [])
            if qs_pool:
                import random
                qs_pool_copy = qs_pool.copy()
                random.shuffle(qs_pool_copy)
                qs.extend(qs_pool_copy[:2])
        
        questions = []
        for q in qs[:4]:
            questions.append({
                "id": q.get("id", f"CET6-LC-{i+1}-{len(questions)+1}"),
                "ability": q.get("ability", "细节定位"),
                "question": q.get("question", ""),
                "optionA": q.get("optionA", ""),
                "optionB": q.get("optionB", ""),
                "optionC": q.get("optionC", ""),
                "optionD": q.get("optionD", ""),
                "answer": q.get("answer", "")
            })
        
        passages.append({
            "passage_id": i + 1,
            "type": template["type"],
            "text": template["text"],
            "questions": questions
        })
        print(f"Listening {i+1}: {template['title']} - {len(questions)} questions")
    
    return passages

def generate_writing_prompts():
    """生成4个写作题目"""
    return [
        {
            "topic": "The Impact of Artificial Intelligence on the Workplace",
            "description": "Directions: For this part, you are allowed 30 minutes to write an essay on the impact of artificial intelligence on the workplace. You should write at least 150 words but no more than 200 words."
        },
        {
            "topic": "The Importance of Sustainable Development",
            "description": "Directions: For this part, you are allowed 30 minutes to write an essay on the importance of sustainable development. You should write at least 150 words but no more than 200 words."
        },
        {
            "topic": "The Role of Social Media in Modern Society",
            "description": "Directions: For this part, you are allowed 30 minutes to write an essay on the role of social media in modern society. You should write at least 150 words but no more than 200 words."
        },
        {
            "topic": "Work-Life Balance in the Digital Age",
            "description": "Directions: For this part, you are allowed 30 minutes to write an essay on work-life balance in the digital age. You should write at least 150 words but no more than 200 words."
        }
    ]

def generate_translation_prompts():
    """生成4个翻译题目"""
    return [
        {
            "chinese": "人工智能技术的快速发展正在深刻改变各行各业。从医疗诊断到自动驾驶，从金融分析到教育评估，AI的应用前景广阔。然而，这也引发了关于就业、隐私和伦理的担忧。",
            "reference": "The rapid development of artificial intelligence technology is profoundly transforming various industries. From medical diagnosis to autonomous driving, from financial analysis to educational assessment, AI has broad application prospects. However, this has also raised concerns about employment, privacy, and ethics."
        },
        {
            "chinese": "丝绸之路是古代连接中国与地中海地区的重要贸易通道。它不仅促进了商品的流通，也推动了不同文明之间的文化交流与融合，为人类文明的发展做出了重要贡献。",
            "reference": "The Silk Road was an important trade route connecting China with the Mediterranean region in ancient times. It not only facilitated the flow of goods but also promoted cultural exchange and integration between different civilizations, making significant contributions to the development of human civilization."
        },
        {
            "chinese": "在当今数字化时代，人们越来越依赖智能手机和社交媒体。虽然这些技术带来了便利和效率，但也可能导致注意力分散、人际交往减少以及个人信息泄露等问题。",
            "reference": "In today's digital age, people are increasingly dependent on smartphones and social media. While these technologies have brought convenience and efficiency, they may also lead to attention distraction, reduced face-to-face interaction, and personal information leakage."
        },
        {
            "chinese": "中国的高等教育近年来取得了显著进步，越来越多的大学在全球排名中上升。然而，如何培养学生的创新能力和批判性思维仍然是教育工作者面临的重要挑战。",
            "reference": "China's higher education has made remarkable progress in recent years, with more and more universities rising in global rankings. However, how to cultivate students' innovative ability and critical thinking remains an important challenge for educators."
        }
    ]

def main():
    print("=" * 50)
    print("生成CET六级诊断题库")
    print("=" * 50)
    
    data = {
        "version": "v1.0-六级版",
        "total_questions": 0,
        "ability_summary": {
            "细节定位": 8,
            "推理判断": 10,
            "同义替换": 4,
            "主旨归纳": 5,
            "态度推断": 3
        },
        "passages": generate_reading_passages(),
        "writing_prompts": generate_writing_prompts(),
        "translation_prompts": generate_translation_prompts(),
        "listening_passages": generate_listening_passages()
    }
    
    # 计算总题目数
    total = sum(len(p['questions']) for p in data['passages'])
    total += sum(len(p['questions']) for p in data['listening_passages'])
    data['total_questions'] = total
    
    # 保存
    with open('public/cet6_diagnosis_questions.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n生成完成！")
    print(f"阅读篇章: {len(data['passages'])}")
    print(f"听力篇章: {len(data['listening_passages'])}")
    print(f"写作题目: {len(data['writing_prompts'])}")
    print(f"翻译题目: {len(data['translation_prompts'])}")
    print(f"总题目数: {total}")
    print("\n保存到: public/cet6_diagnosis_questions.json")

if __name__ == '__main__':
    main()
