# MultipleFiles/chroma_service.py

import os
import json
import logging
from typing import List, Dict, Any

# LangChain imports for vector store and embeddings
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document # Corrected import for Document

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IndianLegalKnowledgeBase:
    """
    ChromaDB-based knowledge base for Indian Laws and Acts, integrated with LangChain.
    Uses SentenceTransformerEmbeddings for creating document embeddings.
    """
    def __init__(self, persist_directory="./chroma_db", json_path="legal_knowledge.json"):
        """
        Initializes the knowledge base.
        Args:
            persist_directory (str): Directory to store ChromaDB data.
            json_path (str): Path to the JSON file containing legal documents.
        """
        self.persist_directory = persist_directory
        self.json_path = json_path
        
        # Initialize the embedding model
        # 'all-MiniLM-L6-v2' is a good general-purpose sentence transformer model.
        self.embedding_model = SentenceTransformerEmbeddings(model_name="all-MiniLM-L6-v2")
        
        self.vectorstore = None
        self.documents_data = [] # Renamed to avoid conflict with langchain.schema.Document

        self._load_documents_from_json()
        self._initialize_vectorstore()

    def _load_documents_from_json(self):
        """
        Load legal knowledge base from a JSON file.
        The JSON file should be a list of dictionaries, each representing a document.
        Expected keys in each dictionary: 'id', 'title', 'summary', 'category', 'act', 'keywords'.
        """
        try:
            if not os.path.exists(self.json_path):
                logger.warning(f"JSON file not found at {self.json_path}. Initializing with empty data.")
                self.documents_data = []
                return

            with open(self.json_path, "r", encoding="utf-8") as f:
                self.documents_data = json.load(f)
            logger.info(f"Loaded {len(self.documents_data)} legal documents from {self.json_path}.")
        except json.JSONDecodeError as e:
            logger.error(f"Error decoding JSON from {self.json_path}: {e}")
            self.documents_data = []
        except Exception as e:
            logger.error(f"Error loading legal knowledge JSON from {self.json_path}: {e}")
            self.documents_data = []

    def _initialize_vectorstore(self):
        """
        Creates or connects to the ChromaDB vector store using LangChain.
        Documents are loaded from the JSON file and converted into LangChain Document objects.
        """
        if not os.path.exists(self.persist_directory):
            os.makedirs(self.persist_directory)
            logger.info(f"Created persistence directory: {self.persist_directory}")

        # Check if the vectorstore already exists and has data
        try:
            # Attempt to load existing vectorstore
            self.vectorstore = Chroma(
                persist_directory=self.persist_directory,
                embedding_function=self.embedding_model
            )
            # Check if it contains any documents
            if self.vectorstore._collection.count() > 0:
                logger.info(f"Loaded existing Chroma vectorstore with {self.vectorstore._collection.count()} documents.")
                return # If data exists, no need to re-add
            else:
                logger.info("Existing Chroma vectorstore is empty. Populating it now.")
        except Exception as e:
            logger.warning(f"Could not load existing Chroma vectorstore: {e}. Creating a new one.")
            self.vectorstore = None # Reset to ensure new creation

        # If vectorstore is not loaded or is empty, populate it
        if not self.documents_data:
            logger.warning("No documents loaded from JSON to populate the vectorstore.")
            # Create an empty vectorstore if no documents are available
            self.vectorstore = Chroma(
                persist_directory=self.persist_directory,
                embedding_function=self.embedding_model
            )
            return

        # Convert loaded data into LangChain Document objects
        formatted_docs = []
        for item in self.documents_data:
            # Ensure 'summary' is used for page_content
            content = item.get("summary", "")
            if not content:
                logger.warning(f"Document with ID '{item.get('id', 'N/A')}' has no 'summary' content. Skipping.")
                continue

            metadata = {
                "id": item.get("id", ""),
                "title": item.get("title", ""),
                "act": item.get("act", ""),
                "category": item.get("category", ""),
                "keywords": ", ".join(item.get("keywords", [])) # Join keywords for better metadata string
            }
            formatted_docs.append(
                Document(page_content=content, metadata=metadata)
            )

        if not formatted_docs:
            logger.warning("No valid documents found to add to the vectorstore.")
            # Create an empty vectorstore if no valid documents are available
            self.vectorstore = Chroma(
                persist_directory=self.persist_directory,
                embedding_function=self.embedding_model
            )
            return

        # Create Chroma vectorstore from documents
        self.vectorstore = Chroma.from_documents(
            documents=formatted_docs,
            embedding=self.embedding_model,
            persist_directory=self.persist_directory
        )
        self.vectorstore.persist() # Save the vectorstore to disk
        logger.info(f"Chroma vectorstore initialized and populated with {len(formatted_docs)} documents.")

    def query(self, query_text: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Performs a semantic search on the knowledge base.
        Args:
            query_text (str): The query string.
            top_k (int): The number of top relevant documents to retrieve.
        Returns:
            List[Dict[str, Any]]: A list of dictionaries, each containing 'content' and 'metadata'.
        """
        if not self.vectorstore:
            logger.error("Vectorstore not initialized. Cannot perform query.")
            return []

        try:
            # Use the vectorstore's as_retriever method to get relevant documents
            retriever = self.vectorstore.as_retriever(search_kwargs={"k": top_k})
            docs = retriever.get_relevant_documents(query_text)
            
            results = []
            for doc in docs:
                results.append({
                    "content": doc.page_content,
                    "metadata": doc.metadata
                })
            logger.info(f"Query '{query_text}' returned {len(results)} results.")
            return results
        except Exception as e:
            logger.error(f"Error during query '{query_text}': {e}")
            return []

    def get_legal_context(self, topic: str, top_k: int = 3) -> str:
        """
        Retrieves relevant legal context for a given topic and formats it into a string.
        This string is suitable for use as context in an LLM prompt.
        Args:
            topic (str): The legal topic to search for.
            top_k (int): The number of top relevant documents to include in the context.
        Returns:
            str: A formatted string containing the legal context.
        """
        try:
            results = self.query(topic, top_k)
            if not results:
                return "No relevant legal context found in the knowledge base."

            context_parts = []
            for result in results:
                meta = result["metadata"]
                # Truncate content to avoid excessively long context, adjust as needed
                content_preview = result['content'][:500] + "..." if len(result['content']) > 500 else result['content']
                
                context_part = f"""
**{meta.get('title', 'Legal Provision')}**
*{meta.get('act', 'Legal Act')} – {meta.get('category', 'Legal Category')}*

{content_preview}

---
"""
                context_parts.append(context_part)
            return "\n".join(context_parts)
        except Exception as e:
            logger.error(f"Failed to retrieve legal context for topic '{topic}': {e}")
            return "Error retrieving legal context from knowledge base."

# Global instance management
legal_kb = None

def get_legal_knowledge_base():
    """
    Returns the singleton instance of IndianLegalKnowledgeBase.
    Initializes it if it hasn't been initialized yet.
    """
    global legal_kb
    if legal_kb is None:
        legal_kb = IndianLegalKnowledgeBase()
    return legal_kb

