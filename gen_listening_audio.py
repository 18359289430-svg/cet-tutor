#!/usr/bin/env python3
"""Generate listening passage MP3s using DashScope CosyVoice TTS API"""
import json, os, sys, time, urllib.request

DASHSCOPE_KEY = os.environ.get('DASHSCOPE_API_KEY', 'sk-66e1b4668f1c464d8981c7cfe255d438')
API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer'
OUTPUT_DIR = '/opt/cet-tutor/public/audio/listening'

def clean_conversation_text(text):
    """Strip M:/W: markers for TTS - keep natural dialogue flow"""
    lines = text.strip().split('\n')
    cleaned = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Remove M: or W: prefix
        if line.startswith('M: ') or line.startswith('W: '):
            line = line[3:]
        elif line.startswith('M:') or line.startswith('W:'):
            line = line[2:]
        cleaned.append(line)
    # Join with pauses between speakers
    return '. '.join(cleaned)

def call_tts(text, voice, rate, filename):
    """Call CosyVoice non-streaming TTS API"""
    payload = json.dumps({
        "model": "cosyvoice-v3-flash",
        "input": {
            "text": text,
            "voice": voice,
            "format": "mp3",
            "sample_rate": 22050,
            "rate": rate
        }
    }).encode('utf-8')
    
    req = urllib.request.Request(API_URL, data=payload, method='POST')
    req.add_header('Authorization', f'Bearer {DASHSCOPE_KEY}')
    req.add_header('Content-Type', 'application/json')
    
    print(f'  Calling TTS API for {filename} (text_len={len(text)})...')
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode('utf-8'))
        
        # Check for errors
        if result.get('code'):
            print(f'  ERROR: {result}')
            return False
        
        # Get audio URL from response
        output = result.get('output', {})
        audio = output.get('audio', {})
        audio_url = audio.get('url', '')
        
        if not audio_url:
            print(f'  ERROR: No audio URL in response: {result}')
            return False
        
        # Download the MP3
        print(f'  Downloading from {audio_url[:80]}...')
        filepath = os.path.join(OUTPUT_DIR, filename)
        urllib.request.urlretrieve(audio_url, filepath)
        
        size = os.path.getsize(filepath)
        print(f'  Saved {filepath} ({size} bytes)')
        return True
        
    except Exception as e:
        print(f'  ERROR: {e}')
        return False

def main():
    # Load CET4 diagnosis questions
    with open('/opt/cet-tutor/public/diagnosis_questions.json') as f:
        d4 = json.load(f)
    
    lp4 = d4.get('listening_passages', [])
    
    results = []
    for i, p in enumerate(lp4):
        text = p.get('text', '')
        if len(text) < 50:
            print(f'Skipping P{i} (id={p.get("passage_id","?")}) - no text')
            continue
        
        pid = p.get('passage_id', f'P{i}')
        ptype = p.get('type', '')
        nq = len(p.get('questions', []))
        
        # Clean text for TTS
        if ptype == 'conversation':
            tts_text = clean_conversation_text(text)
        else:
            tts_text = text
        
        # CET4 rate = 1.05 (matching 2026 new reform speed boost)
        rate = 1.05
        
        filename = f'cet4_{pid}.mp3'
        print(f'\nProcessing P{i} (id={pid}, type={ptype}, q={nq})...')
        success = call_tts(tts_text, 'longanyang', rate, filename)
        results.append({'id': pid, 'file': filename, 'success': success, 'type': ptype, 'questions': nq})
        
        # Small delay between API calls
        time.sleep(2)
    
    print('\n=== Results ===')
    for r in results:
        status = 'OK' if r['success'] else 'FAILED'
        print(f"  {r['id']}: {r['file']} [{status}] ({r['type']}, {r['questions']}q)")

if __name__ == '__main__':
    main()
