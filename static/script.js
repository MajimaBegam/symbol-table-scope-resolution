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
    const treeAsciiContent = document.getElementById("treeAsciiContent");
    const diagnosticsList = document.getElementById("diagnosticsList");
    const toggleBuiltinsCheckbox = document.getElementById("toggleBuiltinsCheckbox");
    const copyTreeBtn = document.getElementById("copyTreeBtn");

    let currentSymbols = [];
    let samplesCache = {};
    let currentRootNode = null;
    let currentPlainAsciiTree = "";

    // Toggle Builtins Checkbox
    if (toggleBuiltinsCheckbox) {
        toggleBuiltinsCheckbox.addEventListener("change", () => {
            if (currentRootNode) {
                renderScopeTree(currentRootNode);
            }
        });
    }

    // Copy ASCII Tree to Clipboard
    if (copyTreeBtn) {
        copyTreeBtn.addEventListener("click", () => {
            if (!currentPlainAsciiTree.trim()) {
                return;
            }
            navigator.clipboard.writeText(currentPlainAsciiTree).then(() => {
                const originalText = copyTreeBtn.innerHTML;
                copyTreeBtn.innerHTML = `✓ Copied!`;
                copyTreeBtn.classList.add("btn-primary");
                copyTreeBtn.classList.remove("btn-secondary");
                setTimeout(() => {
                    copyTreeBtn.innerHTML = originalText;
                    copyTreeBtn.classList.add("btn-secondary");
                    copyTreeBtn.classList.remove("btn-primary");
                }, 1800);
            }).catch(err => {
                console.error("Copy failed", err);
            });
        });
    }

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
        if (treeAsciiContent) {
            treeAsciiContent.innerHTML = `<span class="empty-state">Run analysis to view the scope tree.</span>`;
        }
        diagnosticsList.innerHTML = `<p class="empty-state">No errors or warnings.</p>`;
        currentSymbols = [];
        currentRootNode = null;
        currentPlainAsciiTree = "";
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
        currentRootNode = rootNode;
        if (!rootNode || !treeAsciiContent) {
            if (treeAsciiContent) {
                treeAsciiContent.innerHTML = `<span class="empty-state">No scope tree available.</span>`;
            }
            currentPlainAsciiTree = "";
            return;
        }

        const showBuiltins = toggleBuiltinsCheckbox ? toggleBuiltinsCheckbox.checked : false;

        function buildAscii(node, prefix = "", isLast = true, isRoot = true) {
            let html = "";
            let plain = "";

            if (isRoot) {
                html += `<span class="tree-scope">📁 ${escapeHtml(node.name)}</span>\n`;
                plain += `${node.name}\n`;
            } else {
                const branchChar = isLast ? "└── " : "├── ";
                html += `<span class="tree-branch">${prefix}${branchChar}</span><span class="tree-scope">📁 ${escapeHtml(node.name)}</span>\n`;
                plain += `${prefix}${branchChar}${node.name}\n`;
            }

            const childPrefix = isRoot ? "" : prefix + (isLast ? "    " : "│   ");

            // Filter out builtin functions unless user checked "Include Built-in Functions"
            const symbols = (node.symbols || []).filter(s => showBuiltins || s.type !== "builtin_func");
            const children = node.children || [];

            const hasSymbols = symbols.length > 0;
            const hasChildren = children.length > 0;

            if (hasSymbols || hasChildren) {
                // Leading spacer line (vertical branch)
                html += `<span class="tree-branch">${childPrefix}│</span>\n`;
                plain += `${childPrefix}│\n`;

                // Render symbols in this scope
                symbols.forEach((sym, idx) => {
                    const isLastSym = (idx === symbols.length - 1) && !hasChildren;
                    const branchChar = isLastSym ? "└── " : "├── ";

                    html += `<span class="tree-branch">${childPrefix}${branchChar}</span><span class="tree-ident">${escapeHtml(sym.name)}</span> <span class="tree-type">(${escapeHtml(sym.type)})</span>\n`;
                    plain += `${childPrefix}${branchChar}${sym.name}\n`;
                });

                // Vertical separator between symbols and child scopes
                if (hasSymbols && hasChildren) {
                    html += `<span class="tree-branch">${childPrefix}│</span>\n`;
                    plain += `${childPrefix}│\n`;
                }

                // Render child scopes recursively
                children.forEach((child, idx) => {
                    const isLastChild = idx === children.length - 1;
                    const sub = buildAscii(child, childPrefix, isLastChild, false);
                    html += sub.html;
                    plain += sub.plain;
                });
            }

            return { html, plain };
        }

        const treeOutput = buildAscii(rootNode);
        treeAsciiContent.innerHTML = treeOutput.html;
        currentPlainAsciiTree = treeOutput.plain;
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

