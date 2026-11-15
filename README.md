# Symbol Table Management and Scope Resolution System

An interactive web-based simulator and visualizer for **Compiler Design / Semantic Analysis**, built with **Python (Flask)** on the backend and **HTML, CSS, and JavaScript** on the frontend.

---

## 🌟 Key Features

1. **Symbol Table Generation**:
   - Tracks all identifiers (variables, functions, parameters).
   - Records data types, scope IDs, declared line numbers, and values.
   - Filter and search symbols in real-time.

2. **Scope Resolution Engine**:
   - Implements **Lexical Scoping** rules.
   - Traces variable resolution path step-by-step from inner scopes to enclosing/global scopes (e.g., `Local -> Function -> Global`).

3. **Semantic Error & Warning Detection**:
   - ❌ **Undeclared Variables**: Detects usage of variables never declared in the current or outer scopes.
   - ❌ **Redeclaration Errors**: Flags variables declared multiple times in the same scope.
   - ⚠️ **Variable Shadowing**: Warns when a local identifier overrides/shadows an outer scope variable.

4. **Visual Scope Tree**:
   - Displays the hierarchical tree of nested program scopes.

5. **Multi-Language Support & Preloaded Demos**:
   - Supports both **Python** and **C/Java-style** typed syntax.
   - Comes with pre-loaded demo buttons for immediate evaluation.

---

## 📁 Project Structure

```
majima_manda/
├── app.py                 # Flask web server & REST API
├── symbol_table.py        # Core symbol table & scope resolution engine
├── requirements.txt       # Dependencies (Flask, gunicorn)
├── Procfile               # Cloud deployment configuration
├── templates/
│   └── index.html         # User interface (HTML)
├── static/
│   ├── style.css          # Modern dark-mode styling (CSS)
│   └── script.js          # Interactive frontend logic (JavaScript)
└── README.md              # Project documentation
```

---

## 🚀 How to Run Locally

1. Open your terminal in this directory:
   ```bash
   cd d:\majima_manda
   ```

2. Run the Python application:
   ```bash
   python app.py
   ```

3. Open your browser and go to:
   ```
   http://localhost:5000
   ```

---

## 🌐 How to Host & Get a Public Shareable Link

You can easily host this project for free and get a public URL (`https://...`) to share with your professors or classmates. Here are the easiest methods:

### Method 1: Render.com (Recommended - 100% Free Public Web Service)

1. Put your project on GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Symbol Table project"
   # Push to your GitHub account repository
   ```
2. Go to [https://render.com](https://render.com) and sign up for a free account.
3. Click **New +** → **Web Service**.
4. Connect your GitHub repository.
5. In the settings:
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
6. Click **Deploy Web Service**.
7. In ~2 minutes, Render gives you a live public link like:
   `https://symbol-table-management.onrender.com`

---

### Method 2: PythonAnywhere (Free Academic Python Hosting)

1. Sign up at [https://www.pythonanywhere.com](https://www.pythonanywhere.com).
2. Go to the **Web** tab and click **Add a new web app**.
3. Choose **Flask** and **Python 3.10+**.
4. Upload your files (`app.py`, `symbol_table.py`, `templates/`, `static/`).
5. Your live link will be:
   `https://<your-username>.pythonanywhere.com`

---

### Method 3: Instant 30-Second Public Link with LocalTunnel (No Sign-Up)

While running `python app.py` on your machine, open another terminal and run:
```bash
npx localtunnel --port 5000
```
It will instantly generate a public link (e.g., `https://smart-river-42.loca.lt`) that anyone in the world can access!

