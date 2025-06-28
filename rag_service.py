# MultipleFiles/rag_service.py

import os
import logging
from typing import Dict
# LangChain components
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain

# Import your ChromaDB service to get the initialized knowledge base
from chroma_service import get_legal_knowledge_base

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LegalDebateGenerator:
    """
    Generates pro and con legal arguments using LangChain, Gemini, and a ChromaDB knowledge base.
    """
    def __init__(self):
        # 1. Initialize the LLM (Gemini)
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash", # Or "gemini-1.5-flash", "gemini-1.5-pro"
            temperature=0.7,
            google_api_key="AIzaSyCC6pSLGsaZqPRyM4y5b42LP1jy7kCFI-U" # Ensure GEMINI_API_KEY is set in your environment
        )
        
        # 2. Get the initialized legal knowledge base (ChromaDB)
        self.legal_kb = get_legal_knowledge_base()
        if not self.legal_kb.vectorstore:
            logger.error("ChromaDB vectorstore not initialized in chroma_service.py. RAG will not function.")
            # Handle this case, perhaps raise an error or use a fallback
            raise RuntimeError("Legal knowledge base (ChromaDB) not initialized.")

        # 3. Create a retriever from the vectorstore
        # This will fetch the top 3 most relevant documents for a given query
        self.retriever = self.legal_kb.vectorstore.as_retriever(search_kwargs={"k": 3})

        # 4. Define the prompt template for the LLM
        # This prompt guides the LLM to generate pro and con arguments based on the retrieved context.
        self.prompt_template = ChatPromptTemplate.from_messages([
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

        # 5. Create the RAG chain
        # This chain first retrieves documents, then passes them to the LLM with the prompt
        self.document_chain = create_stuff_documents_chain(self.llm, self.prompt_template)
        self.retrieval_chain = create_retrieval_chain(self.retriever, self.document_chain)

    def generate_arguments(self, topic: str) -> Dict[str, str]:
        """
        Generates Pro and Con arguments for a given legal topic using the RAG chain.
        Args:
            topic (str): The legal topic for which to generate arguments.
        Returns:
            Dict[str, str]: A dictionary with 'pro' and 'con' keys containing the generated arguments.
        """
        try:
            logger.info(f"Generating arguments for topic: '{topic}'")
            response = self.retrieval_chain.invoke({"input": topic})

            # The response will contain 'answer' which is the LLM's output
            if response and response.get('answer'):
                import json
                try:
                    arguments = json.loads(response['answer'])
                    logger.info("Successfully generated and parsed arguments.")
                    return {
                        'pro': arguments.get('pro', 'Unable to generate Pro argument'),
                        'con': arguments.get('con', 'Unable to generate Con argument')
                    }
                except json.JSONDecodeError:
                    logger.error(f"Failed to parse JSON response from Gemini: {response['answer']}")
                    return self._generate_fallback_arguments(topic)
            else:
                logger.warning("No answer received from Gemini. Falling back.")
                return self._generate_fallback_arguments(topic)
        except Exception as e:
            logger.error(f"Error in generate_arguments for topic '{topic}': {e}")
            return self._generate_fallback_arguments(topic)

    def _generate_fallback_arguments(self, topic: str) -> Dict[str, str]:
        """
        Generates simple fallback arguments when the main generation fails.
        """
        print(f"Generating fallback arguments for topic: from rag service{topic}")
        logger.info(f"Generating fallback arguments for topic: '{topic}'")
        try:
            prompt = f"Generate a Pro argument and a Con argument for the legal topic: {topic}. Keep each argument to 2-3 sentences."
            
            response = self.llm.invoke(prompt) # Use LangChain's invoke method
            
            if response.content: # Access content attribute for LangChain LLM output
                text = response.content
                # Attempt to parse simple "Pro:" and "Con:" format
                if "Pro:" in text and "Con:" in text:
                    parts = text.split("Con:")
                    pro_part = parts[0].replace("Pro:", "").strip()
                    con_part = parts[1].strip()
                    return {'pro': pro_part, 'con': con_part}
                else:
                    # Fallback to splitting by paragraphs
                    paragraphs = text.split('\n\n')
                    if len(paragraphs) >= 2:
                        return {'pro': paragraphs[0], 'con': paragraphs[1]}
            
            # Ultimate fallback if LLM response is unparseable or empty
            return {
                'pro': f"There are several compelling arguments in favor of the position on {topic}, including constitutional protections, policy benefits, and legal precedent that supports this viewpoint.",
                'con': f"However, there are also strong arguments against this position on {topic}, including potential constitutional concerns, policy drawbacks, and competing legal interpretations."
            }
            
        except Exception as e:
            logger.error(f"Error in fallback generation for topic '{topic}': {e}")
            return {
                'pro': f"Pro argument for {topic} could not be generated at this time.",
                'con': f"Con argument for {topic} could not be generated at this time."
            }

# Global instance for easy access
legal_debate_generator = None

def get_legal_debate_generator():
    """
    Returns the singleton instance of LegalDebateGenerator.
    Initializes it if it hasn't been initialized yet.
    """
    global legal_debate_generator
    if legal_debate_generator is None:
        legal_debate_generator = LegalDebateGenerator()
    return legal_debate_generator

