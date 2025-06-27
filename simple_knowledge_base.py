import os
import json
import logging
from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SimpleIndianLegalKnowledgeBase:
    """
    Simple knowledge base for Indian Laws and Acts using TF-IDF similarity
    """
    
    def __init__(self):
        """Initialize the knowledge base"""
        self.vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2),
            lowercase=True
        )
        self.legal_documents = self._load_indian_legal_knowledge()
        self.document_vectors = None
        self.is_initialized = False
        
        self._initialize_knowledge_base()
    
    def _initialize_knowledge_base(self):
        """Initialize the knowledge base with TF-IDF vectors"""
        try:
            # Prepare documents for vectorization
            documents = [doc["content"] for doc in self.legal_documents]
            
            # Create TF-IDF vectors
            self.document_vectors = self.vectorizer.fit_transform(documents)
            self.is_initialized = True
            
            logger.info(f"Simple knowledge base initialized with {len(self.legal_documents)} documents")
            
        except Exception as e:
            logger.error(f"Failed to initialize knowledge base: {e}")
            self.is_initialized = False
    
    def _load_indian_legal_knowledge(self) -> List[Dict[str, Any]]:
        """Load comprehensive Indian legal knowledge"""
        return [
            {
                "id": "const_art_14",
                "title": "Article 14 - Right to Equality",
                "content": "The State shall not deny to any person equality before the law or the equal protection of the laws within the territory of India. This fundamental right ensures that all individuals are treated equally under the law regardless of their religion, race, caste, sex, or place of birth. Article 14 applies to both Indian citizens and foreigners. It prohibits arbitrary discrimination by the state and requires that similar cases be treated similarly.",
                "category": "Constitutional Law",
                "act": "Indian Constitution",
                "keywords": ["equality", "fundamental rights", "discrimination", "equal protection", "arbitrary"]
            },
            {
                "id": "const_art_19",
                "title": "Article 19 - Freedom of Speech and Expression",
                "content": "All citizens shall have the right to freedom of speech and expression, to assemble peaceably and without arms, to form associations or unions, to move freely throughout India, and to practice any profession or carry on any occupation, trade or business. However, reasonable restrictions can be imposed in the interests of sovereignty, integrity, security, public order, decency, morality, contempt of court, defamation, or incitement to offense.",
                "category": "Constitutional Law",
                "act": "Indian Constitution",
                "keywords": ["freedom of speech", "expression", "fundamental rights", "assembly", "reasonable restrictions"]
            },
            {
                "id": "const_art_21",
                "title": "Article 21 - Right to Life and Personal Liberty",
                "content": "No person shall be deprived of his life or personal liberty except according to procedure established by law. This includes the right to live with human dignity and encompasses various aspects of life including privacy, health, environment, education, and livelihood. The Supreme Court has expanded the scope of Article 21 to include many unenumerated rights through judicial interpretation.",
                "category": "Constitutional Law",
                "act": "Indian Constitution",
                "keywords": ["right to life", "personal liberty", "due process", "human dignity", "privacy"]
            },
            {
                "id": "ipc_sec_302",
                "title": "Section 302 - Punishment for Murder",
                "content": "Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine. Murder is defined under Section 300 as causing death intentionally with knowledge that the act is likely to cause death. The distinction between culpable homicide and murder is crucial in determining the punishment. Courts consider various factors including premeditation, motive, and circumstances while awarding punishment.",
                "category": "Criminal Law",
                "act": "Indian Penal Code, 1860",
                "keywords": ["murder", "punishment", "death penalty", "criminal law", "culpable homicide"]
            },
            {
                "id": "ipc_sec_376",
                "title": "Section 376 - Punishment for Rape",
                "content": "Whoever commits rape shall be punished with rigorous imprisonment for a term not less than ten years but may extend to imprisonment for life, and shall also be liable to fine. The Criminal Law Amendment Act 2013 enhanced penalties and introduced new offenses. Consent is the key element, and the burden of proof regarding consent lies with the accused in certain circumstances.",
                "category": "Criminal Law",
                "act": "Indian Penal Code, 1860",
                "keywords": ["rape", "sexual assault", "consent", "punishment", "criminal law amendment"]
            },
            {
                "id": "crpc_sec_154",
                "title": "Section 154 - Information in Cognizable Cases",
                "content": "Every information relating to the commission of a cognizable offence, if given orally to an officer in charge of a police station, shall be reduced to writing by him or under his direction. This is the foundation of FIR (First Information Report). The FIR is the first step in criminal law proceedings and must be registered immediately upon receiving information about a cognizable offense.",
                "category": "Criminal Procedure",
                "act": "Code of Criminal Procedure, 1973",
                "keywords": ["FIR", "cognizable offence", "police station", "information", "criminal procedure"]
            },
            {
                "id": "consumer_protection_act",
                "title": "Consumer Protection Act, 2019",
                "content": "The Act provides for protection of the interests of consumers and establishes authorities for timely and effective administration and settlement of consumers' disputes. It defines consumer rights including right to safety, right to be informed, right to choose, and right to be heard. The Act provides for product liability and class action suits, and establishes a three-tier mechanism for redressal of consumer complaints.",
                "category": "Consumer Law",
                "act": "Consumer Protection Act, 2019",
                "keywords": ["consumer protection", "consumer rights", "product liability", "class action", "consumer disputes"]
            },
            {
                "id": "cyber_law_it_act",
                "title": "Information Technology Act, 2000",
                "content": "The IT Act provides legal framework for electronic governance by giving recognition to electronic records and digital signatures. It defines cyber crimes and prescribes penalties including hacking, identity theft, cyber terrorism, and data protection violations. The Act has been amended several times to address emerging cyber threats and privacy concerns in the digital age.",
                "category": "Cyber Law",
                "act": "Information Technology Act, 2000",
                "keywords": ["cyber law", "electronic records", "digital signature", "cyber crimes", "data protection"]
            },
            {
                "id": "rti_act",
                "title": "Right to Information Act, 2005",
                "content": "The RTI Act provides citizens the right to access information from public authorities, promoting transparency and accountability in government functioning. Every citizen has the right to request information from public authorities and receive it within 30 days. The Act mandates appointment of Public Information Officers and establishes Information Commissions for appeals and complaints.",
                "category": "Transparency Law",
                "act": "Right to Information Act, 2005",
                "keywords": ["right to information", "transparency", "public authorities", "accountability", "public information officer"]
            },
            {
                "id": "workplace_harassment",
                "title": "Sexual Harassment of Women at Workplace Act, 2013",
                "content": "This Act provides protection against sexual harassment of women at workplace and for the prevention and redressal of complaints of sexual harassment. It mandates constitution of Internal Complaints Committee in every workplace having 10 or more employees. The Act defines sexual harassment broadly and provides for inquiry procedures and penalties for non-compliance.",
                "category": "Employment Law",
                "act": "Sexual Harassment Act, 2013",
                "keywords": ["sexual harassment", "workplace", "women", "internal complaints committee", "prevention"]
            },
            {
                "id": "rte_act",
                "title": "Right to Education Act, 2009",
                "content": "The RTE Act makes free and compulsory education a fundamental right of every child between the ages of 6-14 years. It provides for 25% reservation for economically weaker sections in private schools and prohibits screening procedures for admission. The Act prescribes norms for teacher qualifications, infrastructure, and teacher-student ratios.",
                "category": "Educational Law",
                "act": "Right to Education Act, 2009",
                "keywords": ["right to education", "free education", "compulsory education", "reservation", "child rights"]
            },
            {
                "id": "environment_protection",
                "title": "Environment Protection Act, 1986",
                "content": "The Act provides for the protection and improvement of environment and for matters connected therewith. It empowers the Central Government to take measures for protecting and improving the quality of the environment and preventing, controlling and abating environmental pollution. The Act was enacted following the Bhopal Gas Tragedy to address environmental concerns.",
                "category": "Environmental Law",
                "act": "Environment Protection Act, 1986",
                "keywords": ["environment protection", "pollution control", "environmental quality", "central government", "bhopal tragedy"]
            },
            {
                "id": "labour_minimum_wages",
                "title": "Minimum Wages Act, 1948",
                "content": "The Act provides for fixing minimum rates of wages in certain employments. It empowers appropriate governments to fix, review and revise minimum wages for scheduled employments. Non-payment of minimum wages is a criminal offence. The Act aims to prevent exploitation of workers and ensure decent living standards.",
                "category": "Labour Law",
                "act": "Minimum Wages Act, 1948",
                "keywords": ["minimum wages", "scheduled employment", "wage fixation", "labour rights", "worker exploitation"]
            },
            {
                "id": "hindu_marriage_act",
                "title": "Hindu Marriage Act, 1955",
                "content": "This Act codifies the law relating to marriage among Hindus, Buddhists, Sikhs, and Jains. It lays down conditions for valid Hindu marriage, grounds for divorce including cruelty, desertion, conversion, mental disorder, and adultery. The Act provides for judicial separation, nullity, and restitution of conjugal rights. It also addresses maintenance and custody of children.",
                "category": "Family Law",
                "act": "Hindu Marriage Act, 1955",
                "keywords": ["hindu marriage", "divorce", "judicial separation", "conjugal rights", "maintenance"]
            },
            {
                "id": "dowry_prohibition_act",
                "title": "Dowry Prohibition Act, 1961",
                "content": "The Dowry Prohibition Act prohibits the giving or taking of dowry. Dowry means any property or valuable security given or agreed to be given directly or indirectly by one party to the other in connection with the marriage. The Act prescribes punishment for giving, taking, or abetting the giving or taking of dowry. It also provides for penalties for demanding dowry.",
                "category": "Social Law",
                "act": "Dowry Prohibition Act, 1961",
                "keywords": ["dowry", "prohibition", "marriage", "property", "social evil"]
            },
            {
                "id": "sc_st_act",
                "title": "Scheduled Castes and Scheduled Tribes (Prevention of Atrocities) Act, 1989",
                "content": "This Act provides for the prevention of atrocities against members of Scheduled Castes and Scheduled Tribes and for the establishment of Special Courts for the trial of such offences. The Act defines various offenses as atrocities and prescribes stringent punishments. It also provides for special investigation procedures and victim compensation.",
                "category": "Social Justice",
                "act": "SC/ST Act, 1989",
                "keywords": ["scheduled castes", "scheduled tribes", "atrocities", "special courts", "social justice"]
            },
            {
                "id": "contract_act_sec_10",
                "title": "Section 10 - What Agreements are Contracts",
                "content": "All agreements are contracts if they are made by the free consent of parties competent to contract, for a lawful consideration and with a lawful object, and are not hereby expressly declared to be void. The essential elements of a valid contract include offer and acceptance, free consent, competent parties, lawful consideration, lawful object, and intention to create legal relations.",
                "category": "Contract Law",
                "act": "Indian Contract Act, 1872",
                "keywords": ["agreement", "contract", "free consent", "consideration", "lawful object"]
            },
            {
                "id": "evidence_act_sec_3",
                "title": "Section 3 - Interpretation Clause",
                "content": "This section defines key terms used in the Evidence Act. 'Court' includes all Judges and Magistrates, and all persons legally authorized to take evidence. 'Fact' means anything capable of being perceived by the senses or any mental condition. The Act distinguishes between facts in issue and relevant facts, and prescribes rules for admissibility of evidence.",
                "category": "Evidence Law",
                "act": "Indian Evidence Act, 1872",
                "keywords": ["court", "fact", "evidence", "interpretation", "admissibility"]
            },
            {
                "id": "cpc_order_23",
                "title": "Order 23 - Withdrawal and Adjustment of Suits",
                "content": "A plaintiff may at any time after the institution of a suit withdraw his suit or abandon part of his claim with the permission of the Court. Such withdrawal may be with or without permission to bring a fresh suit on the same cause of action. The Court may permit withdrawal on such terms as it deems fit, including payment of costs to the defendant.",
                "category": "Civil Procedure",
                "act": "Code of Civil Procedure, 1908",
                "keywords": ["withdrawal", "suit", "plaintiff", "fresh suit", "civil procedure"]
            },
            {
                "id": "crpc_sec_482",
                "title": "Section 482 - Saving of Inherent Powers of High Court",
                "content": "Nothing in this Code shall be deemed to limit or affect the inherent powers of the High Court to make such orders as may be necessary to give effect to any order under this Code, or to prevent abuse of the process of any Court or otherwise to secure the ends of justice. This section preserves the inherent jurisdiction of High Courts to prevent miscarriage of justice.",
                "category": "Criminal Procedure",
                "act": "Code of Criminal Procedure, 1973",
                "keywords": ["inherent powers", "high court", "abuse of process", "justice", "jurisdiction"]
            }
        ]
    
    def query_legal_knowledge(self, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """Query the legal knowledge base for relevant documents"""
        if not self.is_initialized:
            logger.error("Knowledge base not initialized")
            return []
        
        try:
            # Create query vector
            query_vector = self.vectorizer.transform([query])
            
            # Calculate similarities
            similarities = cosine_similarity(query_vector, self.document_vectors).flatten()
            
            # Get top results
            top_indices = similarities.argsort()[-n_results:][::-1]
            
            # Format results
            results = []
            for idx in top_indices:
                if similarities[idx] > 0.05:  # Minimum similarity threshold
                    doc = self.legal_documents[idx]
                    results.append({
                        "content": doc["content"],
                        "metadata": {
                            "title": doc["title"],
                            "category": doc["category"],
                            "act": doc["act"],
                            "keywords": ",".join(doc["keywords"])
                        },
                        "similarity": float(similarities[idx])
                    })
            
            return results
            
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
                similarity = result["similarity"]
                
                context_part = f"""
**{metadata.get('title', 'Legal Provision')}** (Relevance: {similarity:.2f})
*{metadata.get('act', 'Legal Act')} - {metadata.get('category', 'Legal Category')}*

{content[:600]}...

---
"""
                context_parts.append(context_part)
            
            return "\n".join(context_parts)
            
        except Exception as e:
            logger.error(f"Failed to get legal context: {e}")
            return "Error retrieving legal context from knowledge base."
    
    def search_by_category(self, category: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """Search legal documents by category"""
        try:
            results = []
            for doc in self.legal_documents:
                if doc["category"].lower() == category.lower():
                    results.append({
                        "content": doc["content"],
                        "metadata": {
                            "title": doc["title"],
                            "category": doc["category"],
                            "act": doc["act"],
                            "keywords": ",".join(doc["keywords"])
                        }
                    })
                    
                    if len(results) >= n_results:
                        break
            
            return results
            
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

# Global instance
simple_legal_kb = None

def get_simple_legal_knowledge_base():
    """Get or create the simple legal knowledge base instance"""
    global simple_legal_kb
    if simple_legal_kb is None:
        simple_legal_kb = SimpleIndianLegalKnowledgeBase()
    return simple_legal_kb

def initialize_simple_legal_knowledge():
    """Initialize the simple legal knowledge base"""
    return get_simple_legal_knowledge_base()