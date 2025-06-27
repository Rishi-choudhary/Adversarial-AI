import os
import json
import logging
import chromadb
from chromadb.config import Settings
from typing import List, Dict, Any
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IndianLegalKnowledgeBase:
    """
    ChromaDB-based knowledge base for Indian Laws and Acts
    Using TF-IDF vectorization as a simple embedding approach
    """
    
    def __init__(self, persist_directory="./chroma_db"):
        """Initialize ChromaDB client and collection"""
        self.persist_directory = persist_directory
        self.client = None
        self.collection = None
        self.vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2)
        )
        self.is_initialized = False
        
        # Indian legal knowledge data
        self.legal_documents = self._load_indian_legal_knowledge()
        
        self._initialize_chromadb()
    
    def _initialize_chromadb(self):
        """Initialize ChromaDB client and collection"""
        try:
            # Create ChromaDB client
            self.client = chromadb.PersistentClient(
                path=self.persist_directory,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            # Get or create collection for Indian legal documents
            self.collection = self.client.get_or_create_collection(
                name="indian_legal_knowledge",
                metadata={"description": "Indian Laws, Acts, and Legal Precedents"}
            )
            
            # Check if collection is empty and populate it
            if self.collection.count() == 0:
                self._populate_knowledge_base()
            
            self.is_initialized = True
            logger.info(f"ChromaDB initialized with {self.collection.count()} documents")
            
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")
            self.is_initialized = False
    
    def _load_indian_legal_knowledge(self) -> List[Dict[str, Any]]:
        """Load comprehensive Indian legal knowledge"""
        return [
            {
                "id": "const_art_14",
                "title": "Article 14 - Right to Equality",
                "content": "The State shall not deny to any person equality before the law or the equal protection of the laws within the territory of India. This fundamental right ensures that all individuals are treated equally under the law regardless of their religion, race, caste, sex, or place of birth.",
                "category": "Constitutional Law",
                "act": "Indian Constitution",
                "keywords": ["equality", "fundamental rights", "discrimination", "equal protection"]
            },
            {
                "id": "const_art_19",
                "title": "Article 19 - Freedom of Speech and Expression",
                "content": "All citizens shall have the right to freedom of speech and expression, to assemble peaceably and without arms, to form associations or unions, to move freely throughout India, and to practice any profession or carry on any occupation, trade or business.",
                "category": "Constitutional Law",
                "act": "Indian Constitution",
                "keywords": ["freedom of speech", "expression", "fundamental rights", "assembly"]
            },
            {
                "id": "const_art_21",
                "title": "Article 21 - Right to Life and Personal Liberty",
                "content": "No person shall be deprived of his life or personal liberty except according to procedure established by law. This includes the right to live with human dignity and encompasses various aspects of life including privacy, health, and environment.",
                "category": "Constitutional Law",
                "act": "Indian Constitution",
                "keywords": ["right to life", "personal liberty", "due process", "human dignity"]
            },
            {
                "id": "ipc_sec_302",
                "title": "Section 302 - Punishment for Murder",
                "content": "Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine. Murder is defined as causing death intentionally with knowledge that the act is likely to cause death.",
                "category": "Criminal Law",
                "act": "Indian Penal Code, 1860",
                "keywords": ["murder", "punishment", "death penalty", "criminal law"]
            },
            {
                "id": "ipc_sec_376",
                "title": "Section 376 - Punishment for Rape",
                "content": "Whoever commits rape shall be punished with rigorous imprisonment for a term not less than ten years but may extend to imprisonment for life, and shall also be liable to fine. The burden of proof regarding consent lies with the accused.",
                "category": "Criminal Law",
                "act": "Indian Penal Code, 1860",
                "keywords": ["rape", "sexual assault", "consent", "punishment"]
            },
            {
                "id": "crpc_sec_154",
                "title": "Section 154 - Information in Cognizable Cases",
                "content": "Every information relating to the commission of a cognizable offence, if given orally to an officer in charge of a police station, shall be reduced to writing by him or under his direction. This is the foundation of FIR (First Information Report).",
                "category": "Criminal Procedure",
                "act": "Code of Criminal Procedure, 1973",
                "keywords": ["FIR", "cognizable offence", "police station", "information"]
            },
            {
                "id": "crpc_sec_482",
                "title": "Section 482 - Saving of Inherent Powers of High Court",
                "content": "Nothing in this Code shall be deemed to limit or affect the inherent powers of the High Court to make such orders as may be necessary to give effect to any order under this Code, or to prevent abuse of the process of any Court or otherwise to secure the ends of justice.",
                "category": "Criminal Procedure",
                "act": "Code of Criminal Procedure, 1973",
                "keywords": ["inherent powers", "high court", "abuse of process", "justice"]
            },
            {
                "id": "cpc_order_23",
                "title": "Order 23 - Withdrawal and Adjustment of Suits",
                "content": "A plaintiff may at any time after the institution of a suit withdraw his suit or abandon part of his claim with the permission of the Court. Such withdrawal may be with or without permission to bring a fresh suit on the same cause of action.",
                "category": "Civil Procedure",
                "act": "Code of Civil Procedure, 1908",
                "keywords": ["withdrawal", "suit", "plaintiff", "fresh suit"]
            },
            {
                "id": "contract_act_sec_10",
                "title": "Section 10 - What Agreements are Contracts",
                "content": "All agreements are contracts if they are made by the free consent of parties competent to contract, for a lawful consideration and with a lawful object, and are not hereby expressly declared to be void.",
                "category": "Contract Law",
                "act": "Indian Contract Act, 1872",
                "keywords": ["agreement", "contract", "free consent", "consideration"]
            },
            {
                "id": "evidence_act_sec_3",
                "title": "Section 3 - Interpretation Clause",
                "content": "In this Act the following words and expressions are used in the following senses: 'Court' includes all Judges and Magistrates, and all persons, except arbitrators, legally authorized to take evidence. 'Fact' means and includes any thing, state of things, or relation of things, capable of being perceived by the senses.",
                "category": "Evidence Law",
                "act": "Indian Evidence Act, 1872",
                "keywords": ["court", "fact", "evidence", "interpretation"]
            },
            {
                "id": "dowry_prohibition_act",
                "title": "Dowry Prohibition Act, 1961",
                "content": "The Dowry Prohibition Act prohibits the giving or taking of dowry. Dowry means any property or valuable security given or agreed to be given directly or indirectly by one party to the other in connection with the marriage.",
                "category": "Social Law",
                "act": "Dowry Prohibition Act, 1961",
                "keywords": ["dowry", "prohibition", "marriage", "property"]
            },
            {
                "id": "sc_st_act",
                "title": "Scheduled Castes and Scheduled Tribes (Prevention of Atrocities) Act",
                "content": "This Act provides for the prevention of atrocities against members of Scheduled Castes and Scheduled Tribes and for the establishment of Special Courts for the trial of such offences and for matters connected therewith.",
                "category": "Social Justice",
                "act": "SC/ST Act, 1989",
                "keywords": ["scheduled castes", "scheduled tribes", "atrocities", "special courts"]
            },
            {
                "id": "consumer_protection_act",
                "title": "Consumer Protection Act, 2019",
                "content": "The Act provides for protection of the interests of consumers and establishes authorities for timely and effective administration and settlement of consumers' disputes. It defines consumer rights and provides for product liability and class action suits.",
                "category": "Consumer Law",
                "act": "Consumer Protection Act, 2019",
                "keywords": ["consumer protection", "consumer rights", "product liability", "class action"]
            },
            {
                "id": "cyber_law_it_act",
                "title": "Information Technology Act, 2000",
                "content": "The IT Act provides legal framework for electronic governance by giving recognition to electronic records and digital signatures. It also defines cyber crimes and prescribes penalties for them including hacking, identity theft, and cyber terrorism.",
                "category": "Cyber Law",
                "act": "Information Technology Act, 2000",
                "keywords": ["cyber law", "electronic records", "digital signature", "cyber crimes"]
            },
            {
                "id": "workplace_harassment",
                "title": "Sexual Harassment of Women at Workplace Act, 2013",
                "content": "This Act provides protection against sexual harassment of women at workplace and for the prevention and redressal of complaints of sexual harassment. It mandates constitution of Internal Complaints Committee in every workplace.",
                "category": "Employment Law",
                "act": "Sexual Harassment Act, 2013",
                "keywords": ["sexual harassment", "workplace", "women", "internal complaints committee"]
            },
            {
                "id": "rte_act",
                "title": "Right to Education Act, 2009",
                "content": "The RTE Act makes free and compulsory education a fundamental right of every child between the ages of 6-14 years. It provides for 25% reservation for economically weaker sections in private schools and prohibits screening procedures for admission.",
                "category": "Educational Law",
                "act": "Right to Education Act, 2009",
                "keywords": ["right to education", "free education", "compulsory education", "reservation"]
            },
            {
                "id": "rti_act",
                "title": "Right to Information Act, 2005",
                "content": "The RTI Act provides citizens the right to access information from public authorities, promoting transparency and accountability in government functioning. Every citizen has the right to request information from public authorities and receive it within 30 days.",
                "category": "Transparency Law",
                "act": "Right to Information Act, 2005",
                "keywords": ["right to information", "transparency", "public authorities", "accountability"]
            },
            {
                "id": "matrimonial_hindu_marriage",
                "title": "Hindu Marriage Act, 1955",
                "content": "This Act codifies the law relating to marriage among Hindus, Buddhists, Sikhs, and Jains. It lays down conditions for valid Hindu marriage, grounds for divorce, and provisions for judicial separation, nullity, and restitution of conjugal rights.",
                "category": "Family Law",
                "act": "Hindu Marriage Act, 1955",
                "keywords": ["hindu marriage", "divorce", "judicial separation", "conjugal rights"]
            },
            {
                "id": "environment_protection",
                "title": "Environment Protection Act, 1986",
                "content": "The Act provides for the protection and improvement of environment and for matters connected therewith. It empowers the Central Government to take measures for protecting and improving the quality of the environment and preventing, controlling and abating environmental pollution.",
                "category": "Environmental Law",
                "act": "Environment Protection Act, 1986",
                "keywords": ["environment protection", "pollution control", "environmental quality", "central government"]
            },
            {
                "id": "labour_minimum_wages",
                "title": "Minimum Wages Act, 1948",
                "content": "The Act provides for fixing minimum rates of wages in certain employments. It empowers appropriate governments to fix, review and revise minimum wages for scheduled employments. Non-payment of minimum wages is a criminal offence.",
                "category": "Labour Law",
                "act": "Minimum Wages Act, 1948",
                "keywords": ["minimum wages", "scheduled employment", "wage fixation", "labour rights"]
            }
        ]
    
    def _populate_knowledge_base(self):
        """Populate ChromaDB with Indian legal documents"""
        if not self.is_initialized:
            logger.error("ChromaDB not initialized")
            return
        
        try:
            # Prepare documents for ChromaDB (let ChromaDB handle embeddings)
            documents = [doc["content"] for doc in self.legal_documents]
            ids = [doc["id"] for doc in self.legal_documents]
            metadatas = [
                {
                    "title": doc["title"],
                    "category": doc["category"],
                    "act": doc["act"],
                    "keywords": ",".join(doc["keywords"])
                }
                for doc in self.legal_documents
            ]
            
            # Add documents to ChromaDB (let it generate embeddings automatically)
            self.collection.add(
                ids=ids,
                documents=documents,
                metadatas=metadatas
            )
            
            logger.info(f"Successfully populated knowledge base with {len(self.legal_documents)} documents")
            
        except Exception as e:
            logger.error(f"Failed to populate knowledge base: {e}")
    
    def query_legal_knowledge(self, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """Query the legal knowledge base for relevant documents"""
        if not self.is_initialized:
            logger.error("ChromaDB not initialized")
            return []
        
        try:
            # Query ChromaDB using text query (let ChromaDB handle embeddings)
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results,
                include=["documents", "metadatas", "distances"]
            )
            
            # Format results
            formatted_results = []
            if results and results["documents"] and results["documents"][0]:
                for i, doc in enumerate(results["documents"][0]):
                    formatted_results.append({
                        "content": doc,
                        "metadata": results["metadatas"][0][i],
                        "similarity": 1.0 - results["distances"][0][i] if results["distances"] and results["distances"][0] else 0.0
                    })
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Failed to query knowledge base: {e}")
            return []
    
    def get_legal_context_for_topic(self, topic: str, max_results: int = 3) -> str:
        """Get relevant legal context for a given topic"""
        try:
            results = self.query_legal_knowledge(topic, n_results=max_results)
            
            if not results:
                return "No relevant legal precedents found in the knowledge base."
            
            context_parts = []
            for result in results:
                metadata = result["metadata"]
                content = result["content"]
                
                context_part = f"""
**{metadata.get('title', 'Legal Provision')}**
*{metadata.get('act', 'Legal Act')} - {metadata.get('category', 'Legal Category')}*

{content[:500]}...

---
"""
                context_parts.append(context_part)
            
            return "\n".join(context_parts)
            
        except Exception as e:
            logger.error(f"Failed to get legal context: {e}")
            return "Error retrieving legal context from knowledge base."
    
    def search_by_category(self, category: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """Search legal documents by category"""
        if not self.is_initialized:
            return []
        
        try:
            results = self.collection.get(
                where={"category": category},
                limit=n_results,
                include=["documents", "metadatas"]
            )
            
            formatted_results = []
            if results and results["documents"]:
                for i, doc in enumerate(results["documents"]):
                    formatted_results.append({
                        "content": doc,
                        "metadata": results["metadatas"][i]
                    })
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Failed to search by category: {e}")
            return []
    
    def get_categories(self) -> List[str]:
        """Get all available legal categories"""
        try:
            return list(set(doc["category"] for doc in self.legal_documents))
        except Exception as e:
            logger.error(f"Failed to get categories: {e}")
            return []
    
    def reset_knowledge_base(self):
        """Reset and repopulate the knowledge base"""
        if not self.is_initialized:
            return False
        
        try:
            # Delete and recreate collection
            self.client.delete_collection("indian_legal_knowledge")
            self.collection = self.client.create_collection(
                name="indian_legal_knowledge",
                metadata={"description": "Indian Laws, Acts, and Legal Precedents"}
            )
            
            # Repopulate
            self._populate_knowledge_base()
            
            logger.info("Knowledge base reset and repopulated successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to reset knowledge base: {e}")
            return False

# Global instance
legal_kb = None

def get_legal_knowledge_base():
    """Get or create the legal knowledge base instance"""
    global legal_kb
    if legal_kb is None:
        legal_kb = IndianLegalKnowledgeBase()
    return legal_kb

def initialize_legal_knowledge():
    """Initialize the legal knowledge base"""
    return get_legal_knowledge_base()