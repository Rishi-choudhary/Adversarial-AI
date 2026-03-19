# 🧑‍⚖️ Adversarial Legal Argument Generator

> *An AI-powered virtual moot court — instantly generate balanced Pro & Con arguments on any legal topic.*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-adversarial--ai.onrender.com-brightgreen?style=for-the-badge)](https://adversarial-ai.onrender.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.x-blue?style=for-the-badge&logo=python)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.1-black?style=for-the-badge&logo=flask)](https://flask.palletsprojects.com)

---

## 🚀 Overview

The **Adversarial Legal Argument Generator** is a full-stack AI application that produces structured, legally-grounded **Pro and Con arguments** for any legal topic in seconds. It combines a **TF-IDF retrieval engine** over a curated Indian legal knowledge base with **Google Gemini 2.5 Flash** to deliver arguments that cite relevant acts, constitutional articles, and case precedents.

Built for IEEE's **"Pixel Palettes" Hackathon (Team 17)**, the platform targets:

- 🎓 **Law students** preparing for moot courts and debates
- 📰 **Journalists & researchers** needing balanced legal perspectives
- 🧑‍💼 **Legal professionals** doing rapid pre-research
- 💡 **General users** curious about both sides of legal controversies

---

## ✨ Features

- ⚖️ **Dual-perspective generation** — structured Pro and Con arguments displayed side-by-side
- 🧠 **Hybrid AI pipeline** — TF-IDF semantic retrieval feeds relevant legal context into Gemini LLM
- 📚 **Curated knowledge base** — 50 entries across 39 Indian legal categories (constitutional law, criminal law, reproductive rights, cyber law, and more)
- 🔐 **User authentication** — sign up, log in, and manage sessions with hashed passwords
- 🕘 **Debate history** — all generated debates are stored and accessible per user
- 🎨 **Pixel-art UI** — retro-styled interface with typewriter effects, gavel animations, and smooth loading skeletons
- 📋 **Copy & print** — one-click copy and browser-native print support for each argument panel
- 📱 **Responsive design** — adapts from split-screen (desktop) to single-column (mobile)
- 🛡️ **Graceful fallbacks** — multi-level error handling ensures arguments are always returned, even if Gemini is unavailable
- 🚀 **Production-ready deployment** — Gunicorn + Render.com with ProxyFix middleware

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│           HTML/CSS/JS  ←→  Flask Jinja2 Templates       │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTP
┌───────────────────────────▼─────────────────────────────┐
│                    Flask Application                     │
│  routes.py  →  /generate  →  gemini_service.py          │
│                                │                        │
│          ┌─────────────────────▼──────────────────┐     │
│          │         simple_knowledge_base.py        │     │
│          │  TF-IDF Vectorizer (Scikit-learn)       │     │
│          │  Cosine Similarity Retrieval            │     │
│          │  legal_database.json (50 entries)       │     │
│          └─────────────────────┬──────────────────┘     │
│                                │ top-3 context docs      │
│          ┌─────────────────────▼──────────────────┐     │
│          │        Google Gemini 2.5 Flash          │     │
│          │  Structured JSON prompt (pro/con)       │     │
│          └─────────────────────────────────────────┘     │
│                                                         │
│  Flask-Login + SQLAlchemy  →  SQLite / PostgreSQL       │
└─────────────────────────────────────────────────────────┘
```

**Key design decisions:**
- **Retrieval-Augmented Generation (RAG)**: Legal context is retrieved from a curated knowledge base *before* calling the LLM, keeping outputs grounded and reducing hallucinations.
- **Multi-level fallback**: If the structured JSON response from Gemini fails to parse, a simpler prompt is re-tried; if that also fails, a safe template response is returned.
- **Monolithic Flask app**: All routes, models, and services live at the project root — intentionally simple for hackathon velocity and ease of deployment.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend Framework** | Flask 3.1 (Python) |
| **LLM** | Google Gemini 2.5 Flash (`google-generativeai`) |
| **ML / Retrieval** | Scikit-learn (TF-IDF + Cosine Similarity), NumPy, SciPy |
| **Database / ORM** | SQLAlchemy 2.0 + SQLite (dev) / PostgreSQL (prod) |
| **Authentication** | Flask-Login, Werkzeug password hashing |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| **CSS Libraries** | Bootstrap 5.3, TailwindCSS utilities, shadcn/ui (selective) |
| **Fonts & Icons** | Google Fonts (Press Start 2P, Pixelify Sans, VT323), FontAwesome 6.4 |
| **Web Server** | Gunicorn 21.2 (WSGI) |
| **Deployment** | Render.com |
| **Templating** | Jinja2 |

---

## 📦 Project Structure

```
Adversarial-AI/
├── app.py                    # Flask app factory, SQLAlchemy init, DB schema creation
├── main.py                   # Entry point for Gunicorn (exports `app`)
├── routes.py                 # All HTTP routes: /, /auth, /logout, /generate, /workplace, /history
├── models.py                 # SQLAlchemy ORM models: User, Debate
├── gemini_service.py         # Gemini API integration, JSON extraction, fallback logic
├── simple_knowledge_base.py  # TF-IDF retrieval engine over legal_database.json
├── legal_database.json       # 50 curated Indian legal topics (acts, keywords, summaries)
├── requirements.txt          # Python dependencies (48 packages)
├── render.yaml               # Render.com deployment manifest
├── SECURITY.md               # Security policy
│
├── templates/                # Jinja2 HTML templates
│   ├── base.html             # Shared layout: navbar, flash messages, footer
│   ├── index.html            # Home page: topic input, quick-start chips
│   ├── workplace.html        # Split-screen Pro vs Con debate view
│   ├── auth.html             # Tabbed Sign In / Sign Up page
│   ├── history.html          # User's past debate list
│   ├── 404.html              # Custom 404 error page
│   └── 500.html              # Custom 500 error page
│
├── static/
│   ├── css/
│   │   └── style.css         # Pixel-art theme, animations, responsive layout (666 lines)
│   └── js/
│       └── main.js           # Form validation, animations, clipboard, UX (431 lines)
│
└── instance/
    └── legal_debate.db       # SQLite database (auto-created on first run)
```

---

## ⚙️ Installation

### Prerequisites

- Python 3.9+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey) (free tier available)

### 1. Clone the Repository

```bash
git clone https://github.com/Rishi-choudhary/Adversarial-AI.git
cd Adversarial-AI
```

### 2. Create and Activate a Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate        # Linux / macOS
# or
venv\Scripts\activate           # Windows
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file in the project root (or export variables directly):

```bash
export SESSION_SECRET="your-secret-key-here"
export GEMINI_API_KEY="your-gemini-api-key-here"
export DATABASE_URL="sqlite:///legal_debate.db"   # or a PostgreSQL URI
```

### 5. Run the Application

```bash
python main.py
```

The app will be available at **http://localhost:5000**.

---

## 🔐 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | ✅ Yes | — | Google Generative AI API key for Gemini 2.5 Flash |
| `SESSION_SECRET` | ⚠️ Recommended | `pixel-legal-hackathon-secret-key` | Flask session signing secret — **change in production** |
| `DATABASE_URL` | ❌ No | `sqlite:///legal_debate.db` | SQLAlchemy connection string (SQLite for dev, PostgreSQL for prod) |
| `FLASK_ENV` | ❌ No | `production` | Set to `development` to enable debug mode and auto-reload |

> ⚠️ **Security note:** Never commit your `GEMINI_API_KEY` to version control. Use environment variables or a secrets manager.

---

## ▶️ Usage

1. **Sign up or log in** at `/auth` to create your account.
2. On the **home page**, type a legal topic (e.g., *"Right to Privacy"*, *"Uniform Civil Code"*, *"Ban on TikTok"*) or click a **quick-start chip** to auto-fill.
3. Click **Generate Arguments**.
4. View the **split-screen debate**: Pro arguments on the left, Con arguments on the right.
5. Use the **Copy** or **Print** buttons to export either side.
6. Visit **History** to review all your previous debates.

**Example topics to try:**
- Abortion Rights
- Uniform Civil Code (UCC)
- Death Penalty
- Right to Privacy
- Sedition Law
- Same-Sex Marriage

---

## 📽️ Demo

Watch a full walkthrough of the hackathon submission:

[▶️ Click to Watch Demo](https://drive.google.com/file/d/1IwBsg6AehRwJcWybTnVTNIvsWplmXmAU/view?usp=sharing)

🔗 **Live app**: [https://adversarial-ai.onrender.com/](https://adversarial-ai.onrender.com/)

---

## 🚀 Deployment

The project is pre-configured for **Render.com** via `render.yaml`.

### Deploy to Render

1. Fork this repository.
2. Connect the repo to a new **Web Service** on [Render](https://render.com).
3. Set the following environment variables in the Render dashboard:
   - `GEMINI_API_KEY`
   - `SESSION_SECRET`
   - `DATABASE_URL` (use a Render PostgreSQL instance for persistence)
4. Render will automatically detect `render.yaml` and deploy with:
   - **Start command**: `gunicorn main:app`
   - **Environment**: Python 3

### Manual / Self-Hosted

```bash
gunicorn main:app --bind 0.0.0.0:8000 --workers 2
```

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository and create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes, following existing code style.
3. Ensure the app runs locally without errors (`python main.py`).
4. **Submit a pull request** with a clear description of your changes.

**Good first contributions:**
- Expanding `legal_database.json` with more legal topics or jurisdictions
- Adding unit tests with `pytest`
- Improving mobile responsiveness
- Adding support for additional LLM providers

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 💡 Future Improvements

- [ ] **Multi-jurisdiction support** — extend knowledge base beyond Indian law to US, EU, and international law
- [ ] **Source citations** — inline `[1]`, `[2]` references linking arguments back to specific acts or cases
- [ ] **PDF/DOCX export** — downloadable debate briefs formatted for moot court use
- [ ] **Argument strength scoring** — ML model to rate the persuasiveness of each generated argument
- [ ] **Voice input** — speech-to-text for topic entry
- [ ] **Collaborative debates** — real-time multi-user debate rooms
- [ ] **PostgreSQL by default** — migrate away from SQLite for production deployments
- [ ] **Rate limiting & API key rotation** — protect the `/generate` endpoint from abuse

---

## 👨‍💻 Team

**Team 17** — IEEE Pixel Palettes Hackathon

> *"Because every argument deserves its day in court."*

