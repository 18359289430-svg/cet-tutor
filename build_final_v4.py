import json
import re
import os

def read_parsed_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read()

def clean_text(text):
    text = re.sub(r'[_\\]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def get_ability_for_listening(question):
    q_lower = question.lower()
    if 'why' in q_lower:
        return "推理判断"
    elif 'what' in q_lower and ('main' in q_lower or 'purpose' in q_lower or 'topic' in q_lower):
        return "主旨归纳"
    elif 'suggest' in q_lower or 'imply' in q_lower or 'infer' in q_lower or 'learn' in q_lower:
        return "推理判断"
    elif 'attitude' in q_lower or 'feel' in q_lower:
        return "态度推断"
    elif 'how' in q_lower:
        return "细节理解"
    else:
        return "关键信息捕捉"

def get_ability_for_reading(question):
    q_lower = question.lower()
    if 'why' in q_lower:
        return "推理判断"
    elif 'main' in q_lower or 'purpose' in q_lower or 'topic' in q_lower or 'mainly' in q_lower:
        return "主旨归纳"
    elif 'suggest' in q_lower or 'imply' in q_lower or 'infer' in q_lower or 'can be inferred' in q_lower:
        return "推理判断"
    elif 'attitude' in q_lower or 'tone' in q_lower:
        return "态度推断"
    elif 'mean' in q_lower or 'refer to' in q_lower or 'paraphrase' in q_lower:
        return "同义替换"
    else:
        return "细节定位"

def extract_all_answers(content):
    """从内容中提取所有答案和解析"""
    answer_map = {}
    
    # 分割答案详解部分
    sections = content.split('答案详解')
    
    q_num = 0
    for section in sections[1:]:
        lines = section.split('\n')
        
        for line in lines:
            line = line.strip()
            
            # 匹配答案行 - 听力格式
            ans_match = re.match(r'([A-D])\)\s*【精析】(.*)', line)
            if ans_match:
                opt = ans_match.group(1)
                explanation = ans_match.group(2).strip()
                
                if q_num > 0 and q_num <= 55:
                    answer_map[str(q_num)] = {
                        'answer': opt,
                        'explanation': explanation[:200]
                    }
            
            # 匹配答案行 - 阅读格式: 46.【定位】... D)【精析】...
            ans_match_reading = re.search(r'([A-D])\)\s*【(?:精|解)析】(.*)', line)
            if ans_match_reading:
                opt = ans_match_reading.group(1)
                explanation = ans_match_reading.group(2).strip()
                
                # 向前查找题号
                for prev_line in lines:
                    prev = prev_line.strip()
                    q_match = re.match(r'(\d{1,2})\.\s*【定位|考点】', prev)
                    if q_match:
                        q_num = int(q_match.group(1))
                        break
                
                if q_num > 0 and q_num <= 55:
                    answer_map[str(q_num)] = {
                        'answer': opt,
                        'explanation': explanation[:200]
                    }
            
            # 匹配听力题目行
            q_match = re.match(r'(\d+)\.\s*((?:What|Why|How|Where|When|Who|Which|Whose|Whom)[^?\n]*?\?)', line)
            if q_match:
                q_num = int(q_match.group(1))
            
            # 匹配阅读题目行: 46.【定位】
            q_match_reading = re.match(r'(\d{1,2})\.\s*【定位|考点】', line)
            if q_match_reading:
                q_num = int(q_match_reading.group(1))
    
    return answer_map

def extract_long_conversations(content, year, month, set_num, passage_offset=0):
    passages = []
    
    section_a = re.search(r'Section A\s*Questions \d+ to \d+.*?(?=Section B|$)', content, re.DOTALL)
    
    if section_a:
        text = clean_text(section_a.group())
        
        q_pattern = r'(\d+)\.\s*((?:What|Why|How|Where|When|Who|Which|Whose|Whom)[^?\n]{5,100}\?)'
        q_matches = re.findall(q_pattern, text)
        
        script_pattern = r'M:.*?(?=Questions \d+|$)'
        scripts = re.findall(script_pattern, text, re.DOTALL)
        script = ' '.join(scripts)[:2000]
        
        questions = []
        for q_num, q_text in q_matches:
            qid = f"{year}-{month:02d}-S{set_num}-LC-{int(q_num):02d}"
            ability = get_ability_for_listening(q_text)
            
            questions.append({
                "id": qid,
                "ability": ability,
                "question": q_text.strip(),
                "answer": "",
                "explanation": ""
            })
        
        if questions:
            passages.append({
                "passage_id": passage_offset + 1,
                "type": "long_conversation",
                "text": script.strip(),
                "questions": questions
            })
    
    return passages

def extract_passages(content, year, month, set_num, passage_offset=0):
    passages = []
    
    section_b = re.search(r'Section B\s*Questions \d+ to \d+.*?(?=Section C|$)', content, re.DOTALL)
    
    if section_b:
        text = clean_text(section_b.group())
        parts = re.split(r'Questions \d+ to \d+', text)
        
        passage_id = passage_offset
        for part in parts[1:]:
            if len(part) > 100:
                script = re.split(r'\d+\.\s*(?:What|Why|How|Where|When|Who|Which)', part)[0]
                
                q_pattern = r'(\d+)\.\s*((?:What|Why|How|Where|When|Who|Which|Whose|Whom)[^?\n]{5,100}\?)'
                q_matches = re.findall(q_pattern, part)
                
                questions = []
                for q_num, q_text in q_matches:
                    qid = f"{year}-{month:02d}-S{set_num}-PASS-{int(q_num):02d}"
                    ability = get_ability_for_listening(q_text)
                    
                    questions.append({
                        "id": qid,
                        "ability": ability,
                        "question": q_text.strip(),
                        "answer": "",
                        "explanation": ""
                    })
                
                if questions:
                    passages.append({
                        "passage_id": passage_id,
                        "type": "passage",
                        "text": script.strip()[:1500],
                        "questions": questions
                    })
                    passage_id += 1
    
    return passages

def extract_lectures(content, year, month, set_num, passage_offset=0):
    passages = []
    
    section_c = re.search(r'Section C\s*Questions \d+ to \d+.*?(?=Part III|Part IV|$)', content, re.DOTALL)
    
    if section_c:
        text = clean_text(section_c.group())
        parts = re.split(r'Questions \d+ to \d+', text)
        
        passage_id = passage_offset
        for part in parts[1:]:
            if len(part) > 100:
                script = re.split(r'\d+\.\s*(?:What|Why|How|Where|When|Who|Which)', part)[0]
                
                q_pattern = r'(\d+)\.\s*((?:What|Why|How|Where|When|Who|Which|Whose|Whom)[^?\n]{5,100}\?)'
                q_matches = re.findall(q_pattern, part)
                
                questions = []
                for q_num, q_text in q_matches:
                    qid = f"{year}-{month:02d}-S{set_num}-LEC-{int(q_num):02d}"
                    ability = get_ability_for_listening(q_text)
                    
                    questions.append({
                        "id": qid,
                        "ability": ability,
                        "question": q_text.strip(),
                        "answer": "",
                        "explanation": ""
                    })
                
                if questions:
                    passages.append({
                        "passage_id": passage_id,
                        "type": "lecture",
                        "text": script.strip()[:1500],
                        "questions": questions
                    })
                    passage_id += 1
    
    return passages

def extract_reading(content, year, month, set_num, passage_offset=0):
    passages = []
    
    # 查找阅读部分
    section_c = re.search(r'(?:Section C|Passage One|Passage Two).*?(?=Part IV|Part V|$)', content, re.DOTALL)
    
    if section_c:
        text = section_c.group()
        
        # 提取文章
        article_pattern = r'Passage (?:One|Two)\s*(?:Questions \d+ to \d+ are based on.*?)?\s*([A-Z][^.!?]{100,}[.!?])'
        articles = re.findall(article_pattern, text)
        
        # 提取题目 - 阅读格式: 46.【定位】
        q_pattern = r'(\d{2})\.\s*【定位|考点】(.*?)(?=\n\s*\d{2}\.\s*【|$)'
        q_matches = re.findall(q_pattern, text, re.DOTALL)
        
        passage_id = passage_offset
        questions = []
        
        for q_num, q_text in q_matches:
            qid = f"{year}-{month:02d}-S{set_num}-RC-{q_num}"
            ability = get_ability_for_reading(q_text)
            questions.append({
                "id": qid,
                "ability": ability,
                "question": q_text.strip(),
                "answer": "",
                "explanation": ""
            })
        
        if questions:
            article_text = articles[0] if articles else ""
            passages.append({
                "passage_id": passage_id,
                "type": "reading_comprehension",
                "text": clean_text(article_text)[:2000],
                "questions": questions
            })
    
    return passages

def fill_answers(content, passages):
    answer_map = extract_all_answers(content)
    
    for passage in passages:
        for q in passage['questions']:
            q_parts = q['id'].split('-')
            q_num = q_parts[-1].lstrip('0') or q_parts[-1]
            
            if q_num in answer_map:
                q['answer'] = answer_map[q_num]['answer']
                q['explanation'] = answer_map[q_num]['explanation']
            elif q_num.zfill(2) in answer_map:
                q['answer'] = answer_map[q_num.zfill(2)]['answer']
                q['explanation'] = answer_map[q_num.zfill(2)]['explanation']
    
    return passages

def process_pdf(pdf_path, year, month, set_num, passage_offset):
    passages = []
    try:
        content = read_parsed_file(pdf_path)
        
        lc = extract_long_conversations(content, year, month, set_num, passage_offset)
        passages.extend(lc)
        
        p = extract_passages(content, year, month, set_num, passage_offset + 10)
        passages.extend(p)
        
        lec = extract_lectures(content, year, month, set_num, passage_offset + 20)
        passages.extend(lec)
        
        rc = extract_reading(content, year, month, set_num, passage_offset + 30)
        passages.extend(rc)
        
        passages = fill_answers(content, passages)
        
    except Exception as e:
        print(f"Error processing {pdf_path}: {e}")
    
    return passages

def build_complete_questionnaire():
    all_passages = []
    
    pdfs = [
        ('/app/data/cet6_pdfs/2023.06六级真题第1套详解_1779029574716_0_ac1s.pdf.parsed.md', 2023, 6, 1, 0),
        ('/app/data/cet6_pdfs/2023.06六级真题第2套详解_1779029574716_1_qbh3.pdf.parsed.md', 2023, 6, 2, 100),
        ('/app/data/cet6_pdfs/2023.06六级真题第3套详解_1779029574717_2_h162.pdf.parsed.md', 2023, 6, 3, 200),
        ('/app/data/cet6_pdfs/2023.12英语六级解析第1套_1779029774064_0_inq8.pdf.parsed.md', 2023, 12, 1, 300),
        ('/app/data/cet6_pdfs/2023.12英语六级解析第2套_1779029774065_1_a1kd.pdf.parsed.md', 2023, 12, 2, 400),
        ('/app/data/cet6_pdfs/2024.12英语六级解析第1套_1779029774065_8_18tv.pdf.parsed.md', 2024, 12, 1, 500),
        ('/app/data/cet6_pdfs/2024.12英语六级解析第2套_1779029774066_9_e5f2.pdf.parsed.md', 2024, 12, 2, 600),
        ('/app/data/cet6_pdfs/2025.06英语六级解析第1套_1779029977678_0_9yxp.pdf.parsed.md', 2025, 6, 1, 700),
        ('/app/data/cet6_pdfs/2025.06英语六级解析第2套_1779029977678_1_mykd.pdf.parsed.md', 2025, 6, 2, 800),
    ]
    
    for pdf_path, year, month, set_num, offset in pdfs:
        if os.path.exists(pdf_path):
            passages = process_pdf(pdf_path, year, month, set_num, offset)
            all_passages.extend(passages)
            q_count = sum(len(p['questions']) for p in passages)
            answered = sum(1 for p in passages for q in p['questions'] if q['answer'])
            print(f"Processed {year}.{month:02d} Set {set_num}: {len(passages)} passages, {q_count} questions, {answered} answered")
        else:
            print(f"File not found: {pdf_path}")
    
    return all_passages

def save_questionnaire(passages, output_path):
    total_q = len([q for p in passages for q in p['questions']])
    answered_q = len([q for p in passages for q in p['questions'] if q['answer']])
    
    ability_count = {}
    for p in passages:
        for q in p['questions']:
            ability = q['ability']
            ability_count[ability] = ability_count.get(ability, 0) + 1
    
    questionnaire = {
        "version": "v2-真题版（听力+阅读）",
        "total_questions": total_q,
        "answered_questions": answered_q,
        "ability_summary": ability_count,
        "passages": passages
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(questionnaire, f, ensure_ascii=False, indent=2)
    
    print(f"\nSaved to {output_path}")
    print(f"Total: {total_q} questions, {answered_q} with answers")
    print(f"Ability summary: {ability_count}")

if __name__ == '__main__':
    passages = build_complete_questionnaire()
    
    output_path = '/tmp/cet-revert/data/cet6_diagnosis_questions.json'
    save_questionnaire(passages, output_path)
    
    public_path = '/tmp/cet-revert/public/cet6_diagnosis_questions.json'
    save_questionnaire(passages, public_path)
