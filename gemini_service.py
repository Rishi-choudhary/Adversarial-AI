import os
import logging
import google.generativeai as genai
from google.generativeai import types
from simple_knowledge_base import get_simple_legal_knowledge_base
import json
genai.configure(api_key="YOUR_GEMINI_KEY")
import json
import logging
import os
import logging
import google.generativeai as genai
from google.generativeai import types
from simple_knowledge_base import get_simple_legal_knowledge_base
import json
import re
genai.configure(api_key="AIzaSyCC6pSLGsaZqPRyM4y5b42LP1jy7kCFI-U")

import os
import logging
import json
import re
import google.generativeai as genai
from google.generativeai import types
from simple_knowledge_base import get_simple_legal_knowledge_base

genai.configure(api_key="AIzaSyCC6pSLGsaZqPRyM4y5b42LP1jy7kCFI-U")


def extract_json_from_text(text):
    """Extract and clean JSON string from Gemini output, handling Markdown fences."""
    try:
        
        text = text.strip()
        if text.startswith("```json") or text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)

        
        text = text.replace("“", '"').replace("”", '"').replace("’", "'")

        
        json_match = re.search(r'{.*}', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())

        return json.loads(text)  
    except json.JSONDecodeError as e:
        logging.error(f"JSON decode error: {e}")
        return None

def generate_legal_arguments(topic):
    try:
        
        legal_kb = get_simple_legal_knowledge_base()
        context = legal_kb.get_legal_context_for_topic(topic, max_results=3)
        print(f"Context for topic '{topic}': {context}")

        
        user_prompt = f"""
You are a legal expert who provides balanced, well-researched arguments on legal topics.

Generate both Pro and Con arguments that are:
- Legally sound and well-reasoned
- Based on established legal principles
- Cite relevant precedents when possible
- Professional and objective in tone

Legal Topic: {topic}

Relevant Legal Context:
{context}

Return only a JSON object in this format:
{{
  "pro": "Your multi-paragraph pro argument...",
  "con": "Your multi-paragraph con argument..."
}}
"""

        #toGemini
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content([user_prompt])

        
        if response.candidates:
            parts = response.candidates[0].content.parts
            if parts:
                content_text = parts[0].text
                print("Raw response from Gemini:\n", repr(content_text))
                arguments = extract_json_from_text(content_text)
                if arguments:
                    return {
                        'pro': arguments.get('pro', 'Missing Pro argument'),
                        'con': arguments.get('con', 'Missing Con argument')
                    }

        logging.error("Unable to parse Gemini response as JSON.")
        return generate_fallback_arguments(topic)

    except Exception as e:
        logging.exception("Exception in generate_legal_arguments")
        return generate_fallback_arguments(topic)



def generate_fallback_arguments(topic):
    """
    Generate simple fallback arguments when main generation fails
    """
    try:
        prompt = f"Generate a Pro argument and a Con argument for the legal topic: {topic}. Keep each argument to 2-3 sentences."
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        print(f"Fallback response: {response.text}")
        if response.text:
            
            text = response.text
            if "Pro:" in text and "Con:" in text:
                parts = text.split("Con:")
                pro_part = parts[0].replace("Pro:", "").strip()
                con_part = parts[1].strip()
                return {'pro': pro_part, 'con': con_part}
            else:
                
                paragraphs = text.split('\n\n')
                if len(paragraphs) >= 2:
                    return {'pro': paragraphs[0], 'con': paragraphs[1]}
        
        
        return {
            'pro': f"There are several compelling arguments in favor of the position on {topic}, including constitutional protections, policy benefits, and legal precedent that supports this viewpoint.",
            'con': f"However, there are also strong arguments against this position on {topic}, including potential constitutional concerns, policy drawbacks, and competing legal interpretations."
        }
        
    except Exception as e:
        logging.error(f"Error in fallback generation: {e}")
        return {
            'pro': f"Pro argument for {topic} could not be generated at this time.",
            'con': f"Con argument for {topic} could not be generated at this time."
        }
