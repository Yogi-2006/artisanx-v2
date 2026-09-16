import sys
import os
import json
import time
from dotenv import load_dotenv

load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from ai.gemini_client import generate_content

locales_dir = r"c:\Users\YOGI\OneDrive\Desktop\artisanx\frontend\src\i18n"
languages = {
    'ta': 'Tamil',
    'hi': 'Hindi',
    'te': 'Telugu',
    'kn': 'Kannada',
    'ml': 'Malayalam',
    'bn': 'Bengali',
    'mr': 'Marathi',
    'ur': 'Urdu'
}

keys_to_translate = {
    "title": "Buy Now",
    "quantity": "Quantity",
    "total": "Total",
    "notes": "Order Notes (Optional)",
    "notes_placeholder": "Add any specific instructions for the artisan...",
    "confirm": "Confirm Purchase",
    "cancel": "Cancel",
    "no_stock_warning": "Quantity is capped at 1 because stock tracking is not yet enabled for this product. This is a known limitation to be revisited in Phase 23.",
    "success": "Order placed successfully!",
    "error": "Failed to place order"
}

for lang_code, lang_name in languages.items():
    filepath = os.path.join(locales_dir, f"{lang_code}.json")
    
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    else:
        data = {}

    if "buy_now" not in data:
        data["buy_now"] = {}
        
    # Check if already translated (keys present)
    if "title" in data["buy_now"] and data["buy_now"]["title"] != "Buy Now":
        print(f"Skipping {lang_name}, already translated.")
        continue

    print(f"Translating for {lang_name}...")
    
    success = False
    retries = 10
    while not success and retries > 0:
        prompt = f"""
Translate the following English strings into {lang_name}.
Keep the same JSON keys. Only return the JSON object, nothing else.

{json.dumps(keys_to_translate, indent=2)}
"""
        response = generate_content(prompt, mime_type="application/json")
        try:
            translations = json.loads(response)
            if not translations:
                raise Exception("Empty translations returned.")
            for k, v in translations.items():
                data["buy_now"][k] = v
            success = True
            print(f"Success for {lang_name}!")
        except Exception as e:
            print(f"Error for {lang_name}: {e}. Retrying in 15 seconds...")
            time.sleep(15)
            retries -= 1
            
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("Finished translating remaining Buy Now strings.")
