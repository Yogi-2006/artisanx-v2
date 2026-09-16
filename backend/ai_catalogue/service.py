import json
from fastapi import HTTPException
from database import supabase_client
from ai.gemini_client import generate_content
from .schemas import CatalogueSaveRequest

def generate_catalogue(transcript: str, category: str, language: str):
    prompt = f"""
    You are a product catalogue assistant for Indian artisan crafts. 
    Given this voice description by an artisan: "{transcript}"
    And suggested category: "{category or 'unknown'}"
    
    Generate the following product details:
    1. Product title
    2. Product description
    3. Category
    4. Tags (array of strings)
    5. Suggested materials list (array of strings)
    6. Care instructions
    7. Estimated production time
    8. Dimensions and/or weight (if mentioned, otherwise empty string)
    
    Do not invent certifications, GI status, craft origin, authenticity claims, materials, 
    or other factual claims that are not supported by the artisan's description.
    
    Respond in JSON format EXACTLY matching this structure:
    {{
        "title": "...",
        "description": "...",
        "category": "...",
        "tags": ["...", "..."],
        "materials": ["...", "..."],
        "care_instructions": "...",
        "estimated_production_time": "...",
        "dimensions": "..."
    }}
    """
    
    try:
        response_json = generate_content(prompt, mime_type="application/json")
        
        # Clean up potential markdown formatting just in case
        clean_json = response_json.strip()
        if clean_json.startswith("```json"):
            clean_json = clean_json[7:]
        elif clean_json.startswith("```"):
            clean_json = clean_json[3:]
        if clean_json.endswith("```"):
            clean_json = clean_json[:-3]
        clean_json = clean_json.strip()
            
        data = json.loads(clean_json)
        
        # If Gemini API limit is reached and returns {}, provide a fallback
        if not data or "title" not in data:
            return {
                "title": "Artisan Craft Product (AI Unavailable)",
                "description": "A beautiful handmade product crafted with care. (Generated content temporarily unavailable due to API limits)",
                "category": category or "General",
                "tags": ["Handmade", "Artisan"],
                "materials": ["Mixed Materials"],
                "care_instructions": "Handle with care.",
                "estimated_production_time": "1 week",
                "dimensions": ""
            }
            
        return data
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Provide fallback on any exception
        return {
            "title": "Artisan Craft Product (AI Unavailable)",
            "description": "A beautiful handmade product crafted with care. (Generated content temporarily unavailable due to API limits)",
            "category": category or "General",
            "tags": ["Handmade", "Artisan"],
            "materials": ["Mixed Materials"],
            "care_instructions": "Handle with care.",
            "estimated_production_time": "1 week",
            "dimensions": ""
        }

def save_catalogue(product_id: str, artisan_id: str, catalogue_data: CatalogueSaveRequest):
    # Verify product ownership
    res = supabase_client.table("products").select("*").eq("id", product_id).execute()
    if not res.data or len(res.data) == 0:
        raise HTTPException(status_code=404, detail="Product not found")
        
    if res.data[0].get("artisan_id") != artisan_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    update_data = {
        "title": catalogue_data.title,
        "description": catalogue_data.description,
        "category": catalogue_data.category,
        "tags": catalogue_data.tags,
        "materials": catalogue_data.materials,
        "care_instructions": catalogue_data.care_instructions,
        "production_time": catalogue_data.estimated_production_time,
    }
    
    update_res = supabase_client.table("products").update(update_data).eq("id", product_id).execute()
    if update_res.data and len(update_res.data) > 0:
        return {"message": "Catalogue data saved successfully", "product": update_res.data[0]}
        
    raise HTTPException(status_code=500, detail="Failed to save catalogue data")
