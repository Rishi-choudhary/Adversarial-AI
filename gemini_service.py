import os
import logging
import google.generativeai as genai
import json
import chromadb
from chromadb.config import Settings        
# Import necessary libraries for LangChain and RAG
# Import LangChain components
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_community.vectorstores import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings # For embeddings if you want to use them

# Import your ChromaDB service to get the client/collection
from chroma_service import get_legal_knowledge_base # This gets your IndianLegalKnowledgeBase instance

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Gemini client (LangChain handles this internally)
# client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", "default_gemini_key")) # No longer needed directly

def generate_legal_arguments(topic):
    """
    Generate Pro and Con arguments for a legal topic using LangChain, RAG, and Gemini AI
    """
    print(f"Generating arguments for topic: from gemini_Service {topic}")
    try:
        # 1. Initialize LLM
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash", # Or "gemini-1.5-flash", "gemini-1.5-pro"
            temperature=0.7,
            google_api_key="AIzaSyCC6pSLGsaZqPRyM4y5b42LP1jy7kCFI-U"
        )

        # 2. Initialize Embeddings (optional, if you want to use a specific embedding model)
        # If you let ChromaDB handle embeddings, you don't need this here.
        # embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

        # 3. Get ChromaDB collection from your existing service
        legal_kb_instance = get_legal_knowledge_base()
        if not legal_kb_instance.is_initialized:
            logger.error("ChromaDB not initialized, cannot perform RAG.")
            return generate_fallback_arguments(topic)

        # LangChain's Chroma integration needs the client and collection name
        vectorstore = Chroma(
            client=legal_kb_instance.client,
            collection_name="indian_legal_knowledge",
            # embedding_function=embeddings # Uncomment if you use a specific embedding model
        )

        # 4. Create a retriever
        retriever = vectorstore.as_retriever(search_kwargs={"k": 3}) # Retrieve top 3 relevant documents

        # 5. Define the prompt template for the LLM
        # This prompt is designed to generate both pro and con arguments
        prompt_template = ChatPromptTemplate.from_messages([
            ("system", """You are a legal expert who provides balanced, well-researched arguments on legal topics.
            You must generate both Pro and Con arguments that are:
            1. Legally sound and well-reasoned
            2. Based on established legal principles
            3. Cite relevant precedents when possible
            4. Present compelling arguments for both sides
            5. Professional and objective in tone

            Use the following context to inform your arguments:
            {context}
            """),
            ("user", """Legal Topic: {input}

            Please provide comprehensive Pro and Con arguments for this legal topic. Each argument should be 3-4 paragraphs long and include:
            - Strong legal reasoning
            - Relevant case law or statutes where applicable
            - Policy considerations
            - Potential counterarguments acknowledgment

            Return your response as a JSON object with 'pro' and 'con' keys.
            """)
        ])

        # 6. Create the RAG chain
        # This chain first retrieves documents, then passes them to the LLM with the prompt
        document_chain = create_stuff_documents_chain(llm, prompt_template)
        retrieval_chain = create_retrieval_chain(retriever, document_chain)

        # 7. Invoke the chain
        response = retrieval_chain.invoke({"input": topic})

        # The response will contain 'answer' which is the LLM's output
        if response and response.get('answer'):
            try:
                arguments = json.loads(response['answer'])
                return {
                    'pro': arguments.get('pro', 'Unable to generate Pro argument'),
                    'con': arguments.get('con', 'Unable to generate Con argument')
                }
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON response from Gemini: {response['answer']}")
                return generate_fallback_arguments(topic)
        
        return generate_fallback_arguments(topic)

    except Exception as e:
        logger.error(f"Error in generate_legal_arguments: {e}")
        return generate_fallback_arguments(topic)

# The generate_fallback_arguments function can remain largely the same,
# but you might want to use LangChain's LLM directly for it too.
def generate_fallback_arguments(topic):
    """
    Generate simple fallback arguments when main generation fails
    """
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash", # Or "gemini-1.5-flash", "gemini-1.5-pro"
            temperature=0.7,
            google_api_key="AIzaSyCC6pSLGsaZqPRyM4y5b42LP1jy7kCFI-U" # Use your actual API key
        )
        
        prompt = f"Generate a Pro argument and a Con argument for the legal topic: {topic}. Keep each argument to 2-3 sentences."
        
        response = llm.invoke(prompt) # Use LangChain's invoke method
        
        if response.content: # Access content attribute for LangChain LLM output
            text = response.content
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
        logger.error(f"Error in fallback generation: {e}")
        return {
            'pro': f"Pro argument for {topic} could not be generated at this time.",
            'con': f"Con argument for {topic} could not be generated at this time."
        }

# Singleton wrapper (optional, for consistent reuse)
class LegalDebateGenerator:
    def generate_arguments(self, topic):
        return generate_legal_arguments(topic)

# Singleton instance
_legal_debate_generator_instance = LegalDebateGenerator()

def get_legal_debate_generator():
    return _legal_debate_generator_instance