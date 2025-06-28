# 🧑‍⚖️ Adversarial Legal Argument Generator

An AI-powered legal debate platform designed in a pixel-art inspired interface, built for IEEE's "Pixel Palettes" hackathon, by **Team 17**. It allows users to enter a legal topic and receive **structured pro and con arguments**, grounded in law and logic, using classical ML models and a legal knowledge base.

"Because every argument deserves its day in court."

---

## 📽 Project Overview

The Adversarial Legal Argument Generator enables students, journalists, and legal researchers to instantly generate well-reasoned arguments on both sides of any legal issue. This helps simulate a virtual moot court scenario, saves research time, and sharpens critical thinking skills.

### Key Features:

- ✍️ Input legal topics like "UCC", "Ban on TikTok", "Abortion Rights"
- ⚖️ Split-screen layout: Pro vs Con arguments side-by-side
- 🧠 Uses **Scikit-learn ML models** + custom retrieval from legal_database.json
- 📚 Lightweight legal case knowledge base
- 💬 Typewriter animation & loading skeletons for smooth UX
- 🔐 Login/Signup authentication
- 📄 Export, Copy, Feedback buttons
- 🎨 Pixel-art inspired UI (Tailwind CSS + shadcn/ui)

---

## 🌐 Live Deployment

You can access the Adversarial Legal Argument Generator online here:

🔗 **[https://adversarial-ai.onrender.com/](https://adversarial-ai.onrender.com/)**

This live version is hosted on **Render** and fully supports all major features, including:
- Legal topic input
- Pro vs Con generation
- Split-screen display
- Case citation support
- User-friendly UI

Check it out and test the system with your own legal questions!

---



## 🛠 Tech Stack

### AI + Retrieval Layer

- **ML Model**: Classical models via Scikit-learn
- **Retriever**: Custom logic to fetch from `legal_database.json`
- **Knowledge Base**: `legal_database.json` (Indian legal summaries)

### Frontend

- **Languages**: HTML, CSS, JavaScript
- **Styling**: TailwindCSS
- **UI Kit**: shadcn/ui (used selectively)

### Backend

- **Framework**: Flask (Python)
- **Endpoints**:
  - `/generate`: Handles argument generation using legal knowledge base
  - `/embed`: Adds/updates legal cases
  - `/history`: Optional log of past user prompts

---

## 📂 Folder Structure

```
├── backend
│   ├── app.py
│   ├── routes/
│   ├── utils.py
│   └── legal_database.json
│
├── frontend
│   ├── pages/
│   ├── components/
│   ├── styles/
│   └── public/
│
├── README.md
└── requirements.txt
```

---

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Rishi-choudhary/Adversarial-AI.git
cd Adversarial-AI
```

### 2. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Add Your Gemini API Key (Optional, if LLM fallback is needed)

In `backend/app.py` or environment variables, set your Google Gemini API key:

```python
import google.generativeai as genai
genai.configure(api_key="<YOUR_API_KEY_HERE>")
```

### 4. Start Backend

```bash
python app.py
```


---

## ▶️ Usage

1. Open the frontend in your browser.
2. Enter a legal topic (e.g., "UCC" or "Right to Privacy").
3. Click **Generate**.
4. View the Pro and Con arguments side-by-side.
5. Optionally, copy, export, or submit feedback.

---

## 📽 Demo Video

Watch a walkthrough of our hackathon submission:

[▶️ Click to Watch](https://drive.google.com/file/d/1IwBsg6AehRwJcWybTnVTNIvsWplmXmAU/view?usp=sharing)

---

## 📚 Citation Format

- Inline citation tags like `[1]` open popovers showing sources.
- Citations are pulled from the knowledge base.

---

## 👨‍💻 Team Credits

**Team 17** – IEEE Pixel Palettes Hackathon

- Designed with law and code
- Pixel vibes powered by logic



