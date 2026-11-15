/**
 * Frontend JavaScript for Symbol Table Management & Scope Resolution
 */

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const codeEditor = document.getElementById("codeEditor");
    const languageSelect = document.getElementById("languageSelect");
    const sampleSelect = document.getElementById("sampleSelect");
    const analyzeBtn = document.getElementById("analyzeBtn");
    const clearBtn = document.getElementById("clearBtn");
    const symbolFilter = document.getElementById("symbolFilter");

    // Stat Elements
    const statScopes = document.getElementById("statScopes");
    const statSymbols = document.getElementById("statSymbols");
    const statLookups = document.getElementById("statLookups");
    const statErrors = document.getElementById("statErrors");
    const statWarnings = document.getElementById("statWarnings");
    const diagBadge = document.getElementById("diagBadge");

    // Display Containers
    const symbolsTableBody = document.querySelector("#symbolsTable tbody");
    const lookupsTableBody = document.querySelector("#lookupsTable tbody");
    const scopeTreeDisplay = document.getElementById("scopeTreeDisplay");
    const diagnosticsList = document.getElementById("diagnosticsList");

    let currentSymbols = [];
    let samplesCache = {};

    // 1. Tab Navigation
    const tabButtons = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            tabButtons.forEach(b => b.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));

            btn.classList.add("active");
            const tabId = btn.getAttribute("data-tab");
            const targetContent = document.getElementById(tabId);
            if (targetContent) targetContent.classList.add("active");
        });
    });

    // 2. Fetch Sample Programs from Backend
    fetch("/api/samples")
        .then(res => res.json())
        .then(data => {
            samplesCache = data;
            // Preload basic python sample
            if (samplesCache.python_basic) {
                codeEditor.value = samplesCache.python_basic;
                runAnalysis();
            }
        })
        .catch(err => console.error("Could not load samples:", err));

    // 3. Handle Sample Selection Change
    sampleSelect.addEventListener("change", (e) => {
        const val = e.target.value;
        if (samplesCache[val]) {
            codeEditor.value = samplesCache[val];
            if (val.startsWith("c_")) {
                languageSelect.value = "c";
            } else {
                languageSelect.value = "python";
            }
            runAnalysis();
        }
    });

    // 4. Handle Clear Button
    clearBtn.addEventListener("click", () => {
        codeEditor.value = "";
        sampleSelect.value = "";
        resetOutputs();
    });

    // 5. Handle Analyze Button Click
    analyzeBtn.addEventListener("click", runAnalysis);

    // 6. Filter Symbol Table
    symbolFilter.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        renderSymbolsTable(currentSymbols.filter(s => s.name.toLowerCase().includes(query)));
    });

    function resetOutputs() {
        statScopes.textContent = "0";
        statSymbols.textContent = "0";
        statLookups.textContent = "0";
        statErrors.textContent = "0";
        statWarnings.textContent = "0";
        diagBadge.textContent = "0";

        symbolsTableBody.innerHTML = `<tr><td colspan="5" class="empty-state">No code analyzed yet.</td></tr>`;
        lookupsTableBody.innerHTML = `<tr><td colspan="6" class="empty-state">No lookups recorded.</td></tr>`;
        scopeTreeDisplay.innerHTML = `<p class="empty-state">Run analysis to view the scope tree.</p>`;
        diagnosticsList.innerHTML = `<p class="empty-state">No errors or warnings.</p>`;
        currentSymbols = [];
    }

    async function runAnalysis() {
        const code = codeEditor.value;
        const language = languageSelect.value;

        if (!code.trim()) {
            alert("Please enter or select some code first!");
            return;
        }

        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = `<span>⏳</span> Analyzing...`;

        try {
            const response = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, language })
            });

            const data = await response.json();

            if (!data.success) {
                alert(data.error || "Failed to analyze code.");
                return;
            }

            // Update stats
            statScopes.textContent = data.stats.total_scopes;
            statSymbols.textContent = data.stats.total_symbols;
            statLookups.textContent = data.stats.total_lookups;
            statErrors.textContent = data.stats.error_count;
            statWarnings.textContent = data.stats.warning_count;
            diagBadge.textContent = data.stats.error_count + data.stats.warning_count;

            // Render Views
            currentSymbols = data.symbols;
            renderSymbolsTable(currentSymbols);
            renderLookupsTable(data.lookups);
            renderScopeTree(data.scope_tree);
            renderDiagnostics(data.errors, data.warnings);

        } catch (error) {
            console.error("Analysis error:", error);
            alert("Failed to communicate with the Python backend.");
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = `<span class="btn-icon">▶</span> Analyze Code`;
        }
    }

    function renderSymbolsTable(symbols) {
        if (!symbols || symbols.length === 0) {
            symbolsTableBody.innerHTML = `<tr><td colspan="5" class="empty-state">No matching symbols found.</td></tr>`;
            return;
        }

        symbolsTableBody.innerHTML = symbols.map(s => `
            <tr>
                <td><strong>${escapeHtml(s.name)}</strong></td>
                <td><span class="type-badge">${escapeHtml(s.type)}</span></td>
                <td>${escapeHtml(s.scope_name)}</td>
                <td>Line ${s.line}</td>
                <td><code>${escapeHtml(s.value)}</code></td>
            </tr>
        `).join("");
    }

    function renderLookupsTable(lookups) {
        if (!lookups || lookups.length === 0) {
            lookupsTableBody.innerHTML = `<tr><td colspan="6" class="empty-state">No variable lookups found in code.</td></tr>`;
            return;
        }

        lookupsTableBody.innerHTML = lookups.map(l => {
            const isResolved = l.status === "Resolved";
            const badgeClass = isResolved ? "status-resolved" : "status-unresolved";
            return `
                <tr>
                    <td>Line ${l.line}</td>
                    <td><strong>${escapeHtml(l.symbol)}</strong></td>
                    <td><span class="status-badge ${badgeClass}">${l.status}</span></td>
                    <td>${escapeHtml(l.resolved_scope)}</td>
                    <td>${l.declared_line !== "-" ? `Line ${l.declared_line}` : "-"}</td>
                    <td><small style="color: #94a3b8;">${escapeHtml(l.trace)}</small></td>
                </tr>
            `;
        }).join("");
    }

    function renderScopeTree(rootNode) {
        if (!rootNode) {
            scopeTreeDisplay.innerHTML = `<p class="empty-state">No scope tree available.</p>`;
            return;
        }

        function buildNodeHTML(node) {
            const symNames = node.symbols.map(s => `${s.name} (${s.type})`).join(", ");
            const symbolsInfo = symNames ? `<div class="tree-node-symbols">Identifiers: ${escapeHtml(symNames)}</div>` : "";

            let childrenHTML = "";
            if (node.children && node.children.length > 0) {
                childrenHTML = node.children.map(c => buildNodeHTML(c)).join("");
            }

            return `
                <div class="tree-node">
                    <span class="tree-node-title">📁 ${escapeHtml(node.name)}</span>
                    ${symbolsInfo}
                    ${childrenHTML}
                </div>
            `;
        }

        scopeTreeDisplay.innerHTML = buildNodeHTML(rootNode);
    }

    function renderDiagnostics(errors, warnings) {
        const total = (errors ? errors.length : 0) + (warnings ? warnings.length : 0);

        if (total === 0) {
            diagnosticsList.innerHTML = `
                <div class="diag-item diag-success">
                    ✓ All identifiers and scopes successfully resolved with zero errors or warnings!
                </div>
            `;
            return;
        }

        let html = "";
        if (errors && errors.length > 0) {
            errors.forEach(err => {
                html += `
                    <div class="diag-item diag-error">
                        <span>❌</span>
                        <div>
                            <strong>${escapeHtml(err.type)}</strong> [Line ${err.line}]<br>
                            ${escapeHtml(err.message)}
                        </div>
                    </div>
                `;
            });
        }

        if (warnings && warnings.length > 0) {
            warnings.forEach(w => {
                html += `
                    <div class="diag-item diag-warning">
                        <span>⚠️</span>
                        <div>
                            <strong>${escapeHtml(w.type)}</strong> [Line ${w.line}]<br>
                            ${escapeHtml(w.message)}
                        </div>
                    </div>
                `;
            });
        }

        diagnosticsList.innerHTML = html;
    }

    function escapeHtml(text) {
        if (text === null || text === undefined) return "";
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});

