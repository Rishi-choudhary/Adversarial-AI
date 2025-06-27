import os
import logging
import google.generativeai as genai
from google.generativeai import types
from simple_knowledge_base import get_simple_legal_knowledge_base

# Initialize Gemini client
# client = genai.Client(api_key="AIzaSyCC6pSLGsaZqPRyM4y5b42LP1jy7kCFI-U")

client = genai.configure(api_key="YOUR_API_KEY_HERE")

def generate_legal_arguments(topic):
    """
    Generate Pro and Con arguments for a legal topic using RAG and Gemini AI
    """
    try:
        # Get relevant legal context from knowledge base
        legal_kb = get_simple_legal_knowledge_base()
        context = legal_kb.get_legal_context_for_topic(topic, max_results=3)
        
        # Create structured prompt
        system_prompt = """You are a legal expert who provides balanced, well-researched arguments on legal topics. 
        You must generate both Pro and Con arguments that are:
        1. Legally sound and well-reasoned
        2. Based on established legal principles
        3. Cite relevant precedents when possible
        4. Present compelling arguments for both sides
        5. Professional and objective in tone
        
        Format your response as JSON with 'pro' and 'con' keys."""
        
        user_prompt = f"""
        Legal Topic: {topic}
        
        Relevant Legal Context:
        {context}
        
        Please provide comprehensive Pro and Con arguments for this legal topic. Each argument should be 3-4 paragraphs long and include:
        - Strong legal reasoning
        - Relevant case law or statutes where applicable
        - Policy considerations
        - Potential counterarguments acknowledgment
        
        Return in JSON format with 'pro' and 'con' keys.
        """
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Content(role="user", parts=[types.Part(text=user_prompt)])
            ],
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                temperature=0.7,
                max_output_tokens=2000
            )
        )
        
        if response.text:
            import json
            try:
                arguments = json.loads(response.text)
                return {
                    'pro': arguments.get('pro', 'Unable to generate Pro argument'),
                    'con': arguments.get('con', 'Unable to generate Con argument')
                }
            except json.JSONDecodeError:
                # Fallback: try to parse manually or return error
                logging.error("Failed to parse JSON response from Gemini")
                return generate_fallback_arguments(topic)
        
        return generate_fallback_arguments(topic)
        
    except Exception as e:
        logging.error(f"Error in generate_legal_arguments: {e}")
        return generate_fallback_arguments(topic)

def generate_fallback_arguments(topic):
    """
    Generate simple fallback arguments when main generation fails
    """
    try:
        prompt = f"Generate a Pro argument and a Con argument for the legal topic: {topic}. Keep each argument to 2-3 sentences."
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        
        if response.text:
            # Simple text parsing
            text = response.text
            if "Pro:" in text and "Con:" in text:
                parts = text.split("Con:")
                pro_part = parts[0].replace("Pro:", "").strip()
                con_part = parts[1].strip()
                return {'pro': pro_part, 'con': con_part}
            else:
                # Split by paragraphs
                paragraphs = text.split('\n\n')
                if len(paragraphs) >= 2:
                    return {'pro': paragraphs[0], 'con': paragraphs[1]}
        
        # Ultimate fallback
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
