"""
Flask Application for Symbol Table Management & Scope Resolution System
Author: Mini Project Team
"""

import os
from flask import Flask, render_template, request, jsonify
from symbol_table import analyze_python_code, analyze_c_like_code

app = Flask(__name__)

# Preloaded sample programs for easy demonstration
DEMO_SAMPLES = {
    "python_basic": """# Sample 1: Basic Python Scopes & Variable Access
x = 100
name = "Antigravity"

def calculate(multiplier):
    bonus = 25
    total = (x * multiplier) + bonus
    print(total)

calculate(2)
""",
    "python_shadowing": """# Sample 2: Variable Shadowing & Undeclared Error
count = 10

def process_data():
    count = 99        # Shadowing: overrides global count
    temp = count * 2
    print(undefined_var) # Error: undeclared variable

process_data()
""",
    "c_nested_scopes": """// Sample 3: C/Java Style Nested Scopes
int globalCount = 50;

void runProcess(int factor) {
    int localVal = 10;
    int result = localVal * factor;
    print(globalCount);
    print(missingVar); // Error: not declared
}
"""
}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/samples", methods=["GET"])
def get_samples():
    return jsonify(DEMO_SAMPLES)

@app.route("/api/analyze", methods=["POST"])
def analyze():
    data = request.get_json() or {}
    code = data.get("code", "")
    language = data.get("language", "python").lower()

    if not code.strip():
        return jsonify({
            "success": False,
            "error": "No code provided. Please type or paste code to analyze."
        }), 400

    if language == "c" or language == "c_like":
        manager = analyze_c_like_code(code)
    else:
        manager = analyze_python_code(code)

    all_symbols = []
    scopes_data = []
    for sc in manager.all_scopes:
        sc_dict = sc.to_dict()
        scopes_data.append({
            "id": sc.id,
            "name": sc.name,
            "parent_id": sc.parent.id if sc.parent else None,
            "symbol_count": len(sc.symbols)
        })
        for sym in sc.symbols.values():
            all_symbols.append(sym.to_dict())

    response = {
        "success": True,
        "language": language,
        "scope_tree": manager.global_scope.to_dict(),
        "scopes": scopes_data,
        "symbols": all_symbols,
        "lookups": manager.lookups,
        "errors": manager.errors,
        "warnings": manager.warnings,
        "stats": {
            "total_scopes": len(manager.all_scopes),
            "total_symbols": len(all_symbols),
            "total_lookups": len(manager.lookups),
            "error_count": len(manager.errors),
            "warning_count": len(manager.warnings)
        }
    }

    return jsonify(response)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting Symbol Table Management server on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=True)

