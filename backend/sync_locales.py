import json
import os
import sys
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    print("GEMINI_API_KEY not found in .env")
    sys.exit(1)

client = genai.Client(api_key=API_KEY)

def get_missing_keys(en_obj, target_obj, prefix=''):
    missing = []
    for k, v in en_obj.items():
        if k not in target_obj:
            missing.append({
                "key_path": f"{prefix}{k}",
                "english_text": v if isinstance(v, str) else v
            })
        elif isinstance(v, dict) and isinstance(target_obj.get(k), dict):
            missing.extend(get_missing_keys(v, target_obj[k], f"{prefix}{k}."))
    return missing

def set_nested_value(obj, path, value):
    keys = path.split('.')
    current = obj
    for i, key in enumerate(keys[:-1]):
        if key not in current:
            current[key] = {}
        current = current[key]
    current[keys[-1]] = value

LANG_NAMES = {
    'hi': 'Hindi',
    'ta': 'Tamil',
    'te': 'Telugu',
    'kn': 'Kannada',
    'ml': 'Malayalam',
    'bn': 'Bengali',
    'mr': 'Marathi',
    'ur': 'Urdu'
}

def translate_batch(target_lang_code, items):
    target_lang_name = LANG_NAMES.get(target_lang_code, target_lang_code)
    
    flat_input = {}
    
    def flatten(item_list):
        for item in item_list:
            if isinstance(item["english_text"], dict):
                def flatten_dict(d, p):
                    for dk, dv in d.items():
                        if isinstance(dv, dict):
                            flatten_dict(dv, f"{p}.{dk}")
                        else:
                            flat_input[f"{p}.{dk}"] = dv
                flatten_dict(item["english_text"], item["key_path"])
            else:
                flat_input[item["key_path"]] = item["english_text"]
                
    flatten(items)
    
    if not flat_input:
        return {}
        
    prompt = f"""
Translate the following English strings into {target_lang_name}. 
Return a JSON object with the EXACT SAME KEYS, but with the translated values.
Keep any placeholders, markdown, or variables intact.
Do not add any other text or markdown formatting around the output. Just return the valid JSON.
Input JSON:
{json.dumps(flat_input, indent=2)}
"""
    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        try:
            return json.loads(response.text)
        except json.JSONDecodeError:
            print(f"Failed to parse JSON for {target_lang_code}. Raw: {response.text}")
            return None
    except Exception as e:
        print(f"API Error for {target_lang_code}: {e}")
        return None

def main():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../frontend/src/i18n'))
    en_path = os.path.join(base_dir, 'en.json')
    
    with open(en_path, 'r', encoding='utf-8') as f:
        en_data = json.load(f)
        
    for lang in LANG_NAMES.keys():
        lang_path = os.path.join(base_dir, f'{lang}.json')
        if not os.path.exists(lang_path):
            print(f"Missing {lang_path}")
            continue
            
        with open(lang_path, 'r', encoding='utf-8') as f:
            target_data = json.load(f)
            
        missing_items = get_missing_keys(en_data, target_data)
        if not missing_items:
            print(f"[{lang}] No missing keys.")
            continue
            
        print(f"[{lang}] Found missing keys. Requesting translation...")
        
        translated_flat = translate_batch(lang, missing_items)
        
        auto_translated_count = 0
        fallback_count = 0
        fallbacks = []
        
        flat_input = {}
        def flatten(item_list):
            for item in item_list:
                if isinstance(item["english_text"], dict):
                    def flatten_dict(d, p):
                        for dk, dv in d.items():
                            if isinstance(dv, dict):
                                flatten_dict(dv, f"{p}.{dk}")
                            else:
                                flat_input[f"{p}.{dk}"] = dv
                    flatten_dict(item["english_text"], item["key_path"])
                else:
                    flat_input[item["key_path"]] = item["english_text"]
        flatten(missing_items)

        for k, en_val in flat_input.items():
            trans_val = translated_flat.get(k) if translated_flat else None
            if trans_val and isinstance(trans_val, str) and trans_val.strip():
                set_nested_value(target_data, k, trans_val)
                auto_translated_count += 1
            else:
                set_nested_value(target_data, k, en_val)
                fallback_count += 1
                fallbacks.append(k)
                
        with open(lang_path, 'w', encoding='utf-8') as f:
            json.dump(target_data, f, ensure_ascii=False, indent=2)
            
        print(f"[{lang}] Auto-translated: {auto_translated_count} | Fell back to English: {fallback_count}")
        if fallbacks:
            print(f"[{lang}] Fallback keys: {', '.join(fallbacks)}")

if __name__ == "__main__":
    main()
