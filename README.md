# 🧑‍⚖️ Adversarial Legal Argument Generator

> *Because every argument deserves its day in court.*

An AI-powered legal debate platform that generates balanced, well-researched **Pro and Con arguments** for any legal topic — built for IEEE's **Pixel Palettes Hackathon** by Team 17.

🔗 **Live Demo**: [adversarial-ai.onrender.com](https://adversarial-ai.onrender.com/)  
🎥 **Demo Video**: [Watch on Google Drive](https://drive.google.com/file/d/1IwBsg6AehRwJcWybTnVTNIvsWplmXmAU/view?usp=sharing)

---

## 🚀 Overview

The **Adversarial Legal Argument Generator** lets users enter any legal topic or constitutional question and instantly receive structured arguments from both sides. It simulates a **virtual moot court experience**, combining Google's Gemini generative AI with a TF-IDF retrieval engine over a curated Indian legal knowledge base.

Whether you're a student prepping for a moot court, a journalist researching a legal issue, or a researcher exploring constitutional debates — this tool saves hours of research and sharpens critical thinking.

---

## ✨ Features

- ⚖️ **Adversarial Arguments** — Structured Pro vs. Con arguments rendered side-by-side
- 🧠 **Hybrid AI Engine** — Google Gemini 2.5-Flash + Scikit-learn TF-IDF retrieval for grounded, context-aware outputs
- 📚 **Legal Knowledge Base** — 15+ curated Indian legal topics (UCC, abortion rights, reservations, capital punishment, etc.)
- 🔐 **User Authentication** — Secure login/signup with hashed passwords via Flask-Login
- 🕓 **Debate History** — Persistent per-user history of all generated debates
- 📋 **Export & Copy** — One-click copy and export of arguments
- 💬 **Typewriter Animation** — Smooth UX with loading skeletons and typewriter effects
- 🎨 **Pixel-Art UI** — Unique retro pixel-art aesthetic using custom CSS, Tailwind, and Google Fonts
- 📱 **Responsive Design** — Works across desktop and mobile browsers
- ☁️ **Production Ready** — Deployed on Render with Gunicorn and PostgreSQL support

---

## 🏗️ Architecture

```
┌────────────────────────────────────────┐
│          Browser (HTML/CSS/JS)         │
│    Jinja2 Templates + Bootstrap 5      │
└──────────────┬─────────────────────────┘
               │  HTTP
┌──────────────▼─────────────────────────┐
│         Flask Application              │
│  routes.py  │  models.py  │  app.py    │
│  Flask-Login Authentication            │
└──────┬───────────────────┬─────────────┘
       │                   │
┌──────▼──────┐   ┌────────▼────────────┐
│ Gemini API  │   │  SQLAlchemy ORM     │
│ (Generative │   │  SQLite / PostgreSQL│
│    AI)      │   └─────────────────────┘
└──────┬──────┘
       │
┌──────▼──────────────────────────────┐
│  simple_knowledge_base.py           │
│  TF-IDF Vectorizer (scikit-learn)   │
│  Cosine Similarity Search           │
└──────┬──────────────────────────────┘
       │
┌──────▼──────────────┐
│  legal_database.json│
│  (15+ legal topics) │
└─────────────────────┘
```

**Request Flow:**
1. User submits a legal topic via the web form
2. Flask (`routes.py`) calls `generate_legal_arguments(topic)`
3. `simple_knowledge_base.py` retrieves the top-3 most relevant legal entries using TF-IDF cosine similarity against `legal_database.json`
4. The retrieved context is injected into a structured prompt sent to **Gemini 2.5-Flash**
5. Gemini returns a JSON object with `pro` and `con` fields
6. The debate is persisted to the database and rendered in a split-screen view
7. Users can revisit past debates via their history page

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3, Flask 3.1.1, Gunicorn 21.2.0 |
| **Authentication** | Flask-Login 0.6.3, Werkzeug 3.1.3 |
| **Database ORM** | SQLAlchemy 2.0.41, Flask-SQLAlchemy 3.1.1 |
| **AI / LLM** | Google Generative AI SDK 0.8.5 (Gemini 2.5-Flash) |
| **ML / Retrieval** | Scikit-learn 1.7.0 (TF-IDF + Cosine Similarity) |
| **Frontend** | HTML5, CSS3, JavaScript (ES6+) |
| **CSS Framework** | Tailwind CSS, Bootstrap 5, custom pixel-art styles |
| **UI Components** | shadcn/ui (selective use), Font Awesome 6 |
| **Fonts** | Press Start 2P, Pixelify Sans, VT323 (Google Fonts) |
| **Database** | SQLite (development), PostgreSQL (production) |
| **Deployment** | Render.com |
| **Templating** | Jinja2 |

---

## 📦 Project Structure

```
Adversarial-AI/
├── app.py                    # Flask app factory, DB setup, middleware config
├── main.py                   # Gunicorn entry point (exports `app`)
├── routes.py                 # All route handlers (auth, generate, history)
├── models.py                 # SQLAlchemy models: User, Debate
├── gemini_service.py         # Gemini API integration + fallback logic
├── simple_knowledge_base.py  # TF-IDF retrieval engine over legal_database.json
├── legal_database.json       # Curated knowledge base (15+ Indian legal topics)
├── requirements.txt          # Python dependencies (48 packages)
├── render.yaml               # Render.com deployment configuration
├── LICENSE                   # MIT License
├── SECURITY.md               # Security policy
├── static/
│   ├── css/
│   │   └── style.css         # Pixel-art theme, animations, responsive layout
│   └── js/
│       └── main.js           # Client-side interactivity, animations, export
├── templates/
│   ├── base.html             # Shared navbar, footer, asset imports
│   ├── index.html            # Landing page with topic input and quick chips
│   ├── auth.html             # Login/Signup forms
│   ├── workplace.html        # Split-screen Pro vs Con debate display
│   ├── history.html          # User's debate history
│   ├── 404.html              # Custom 404 error page
│   └── 500.html              # Custom 500 error page
└── instance/
    └── legal_debate.db       # SQLite database (auto-created on first run)
```

---

## ⚙️ Installation

### Prerequisites

- Python 3.9+
- A [Google AI Studio](https://aistudio.google.com/) account with a Gemini API key

### 1. Clone the Repository

```bash
git clone https://github.com/Rishi-choudhary/Adversarial-AI.git
cd Adversarial-AI
```

### 2. Create a Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate      # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file (or export variables in your shell):

```bash
GEMINI_API_KEY=your_google_gemini_api_key_here
SESSION_SECRET=your_random_secret_key_here
DATABASE_URL=sqlite:///legal_debate.db   # optional, SQLite used by default
```

> See [Environment Variables](#-environment-variables) for full details.

### 5. Run the Application

```bash
python main.py
```

The app will be available at `http://localhost:5000`.

---

## 🔐 Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | — | Google Gemini API key for AI argument generation |
| `SESSION_SECRET` | ✅ Yes | `pixel-legal-hackathon-secret-key` | Flask session signing secret (change in production) |
| `DATABASE_URL` | ❌ No | `sqlite:///legal_debate.db` | Full database URI; use a PostgreSQL URL for production |
| `FLASK_ENV` | ❌ No | `development` | Set to `production` on deployment |

> ⚠️ **Never commit your `GEMINI_API_KEY` to version control.**

---

## ▶️ Usage

1. **Register or log in** at `/auth`
2. **Enter a legal topic** on the home page — e.g., *"Right to Privacy"*, *"Uniform Civil Code"*, *"Capital Punishment"*
3. Click **Generate** and wait for the AI to process your query
4. View **Pro** and **Con** arguments displayed side-by-side in the debate workspace
5. Use the **Copy** or **Export** buttons to save the arguments
6. Visit **History** to revisit any previous debate you've generated

### Quick-Start Topic Chips

The home page includes pre-defined topic chips for common Indian legal debates:
- Uniform Civil Code (UCC)
- Right to Privacy
- Capital Punishment
- Reservation Policy
- Abortion Rights
- Article 370

---

## 🚀 Deployment

The application is configured for deployment on **[Render.com](https://render.com)** via `render.yaml`.

### Render (Recommended)

1. Fork this repository and connect it to your Render account
2. Set the following environment variables in the Render dashboard:
   - `GEMINI_API_KEY`
   - `SESSION_SECRET`
   - `DATABASE_URL` (use a PostgreSQL connection string for persistence)
3. Render will automatically use the `render.yaml` config:
   ```yaml
   startCommand: gunicorn main:app
   ```
4. Your app will be live at `https://<your-app-name>.onrender.com`

### Manual / Self-Hosted

```bash
gunicorn main:app --bind 0.0.0.0:5000 --workers 4
```

> The app uses `ProxyFix` middleware to correctly handle `X-Forwarded-*` headers from reverse proxies.

---

## 🤝 Contributing

Contributions are welcome! To get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit: `git commit -m "feat: add your feature"`
4. Push to your fork: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please ensure your code is clean, well-commented, and follows existing conventions.

---

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](./LICENSE) for details.

---

## 💡 Future Improvements

- 🌐 **Multi-jurisdiction support** — Expand knowledge base beyond Indian law to include US, UK, and EU legal frameworks
- 🔍 **Semantic search** — Replace TF-IDF with vector embeddings (e.g., sentence-transformers) for more accurate retrieval
- 📊 **Argument scoring** — Rate argument quality and legal soundness using a secondary AI pass
- 🗣️ **Debate mode** — Turn-based adversarial debate simulator between two AI agents
- 🧪 **Test coverage** — Add unit and integration tests (pytest)
- 🔑 **OAuth login** — Support Google/GitHub SSO for easier onboarding
- 📥 **PDF export** — Generate formatted PDF debate reports

---

## 👨‍💻 Team Credits

**Team 17** — IEEE Pixel Palettes Hackathon

> Designed with law and code. Pixel vibes powered by logic.

