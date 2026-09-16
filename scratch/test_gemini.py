import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend'))
from ai.gemini_client import get_gemini_client
from google.genai import types

def check_gemini():
    client = get_gemini_client()
    try:
        print("Sending request to Gemini API...")
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents="Hello! Are you there?",
            config=types.GenerateContentConfig(
                response_mime_type="text/plain",
            ),
        )
        print("Response received:", response.text)
        print("API is working fine.")
    except Exception as e:
        print("Error encountered:", type(e).__name__)
        print(e)

if __name__ == "__main__":
    check_gemini()
