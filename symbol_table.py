"""
Symbol Table Management and Scope Resolution Engine
Author: Mini Project Team
Description: Core engine to manage nested scopes, symbol registration,
             lexical scope resolution, variable shadowing detection,
             and semantic error diagnostics.
"""

import ast
import re

class Symbol:
    def __init__(self, name, sym_type, line, scope_id, scope_name, value=None):
        self.name = name
        self.type = sym_type
        self.line = line
        self.scope_id = scope_id
        self.scope_name = scope_name
        self.value = value

    def to_dict(self):
        return {
            "name": self.name,
            "type": self.type,
            "line": self.line,
            "scope_id": self.scope_id,
            "scope_name": self.scope_name,
            "value": str(self.value) if self.value is not None else "-"
        }


class Scope:
    def __init__(self, scope_id, name, parent=None):
        self.id = scope_id
        self.name = name
        self.parent = parent
        self.symbols = {}          # name -> Symbol
        self.children = []

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "parent_id": self.parent.id if self.parent else None,
            "symbols": [s.to_dict() for s in self.symbols.values()],
            "children": [c.to_dict() for c in self.children]
        }


class SymbolTableManager:
    def __init__(self):
        self.scope_counter = 0
        self.global_scope = Scope(0, "Global Scope (0)")
        self.current_scope = self.global_scope
        self.all_scopes = [self.global_scope]
        self.errors = []
        self.warnings = []
        self.lookups = []

    def enter_scope(self, name):
        self.scope_counter += 1
        scope_name = f"{name} ({self.scope_counter})"
        new_scope = Scope(self.scope_counter, scope_name, parent=self.current_scope)
        self.current_scope.children.append(new_scope)
        self.current_scope = new_scope
        self.all_scopes.append(new_scope)
        return new_scope

    def exit_scope(self):
        if self.current_scope.parent is not None:
            self.current_scope = self.current_scope.parent

    def declare_symbol(self, name, sym_type, line, value=None, allow_redefine=False):
        # 1. Check for redeclaration within the SAME scope
        if name in self.current_scope.symbols and not allow_redefine:
            prev = self.current_scope.symbols[name]
            self.errors.append({
                "type": "Redeclaration Error",
                "message": f"Identifier '{name}' is already declared in {self.current_scope.name} (previously at line {prev.line}).",
                "line": line,
                "symbol": name
            })
            return None

        # 2. Check for variable shadowing in parent scopes
        ancestor = self.current_scope.parent
        while ancestor is not None:
            if name in ancestor.symbols:
                prev = ancestor.symbols[name]
                self.warnings.append({
                    "type": "Shadowing Warning",
                    "message": f"Identifier '{name}' shadows an outer declaration from {ancestor.name} (declared at line {prev.line}).",
                    "line": line,
                    "symbol": name
                })
                break
            ancestor = ancestor.parent

        sym = Symbol(name, sym_type, line, self.current_scope.id, self.current_scope.name, value)
        self.current_scope.symbols[name] = sym
        return sym

    def resolve_lookup(self, name, line):
        trace = []
        curr = self.current_scope
        found_symbol = None

        while curr is not None:
            trace.append(curr.name)
            if name in curr.symbols:
                found_symbol = curr.symbols[name]
                break
            curr = curr.parent

        if found_symbol:
            self.lookups.append({
                "symbol": name,
                "line": line,
                "status": "Resolved",
                "resolved_scope": found_symbol.scope_name,
                "declared_line": found_symbol.line,
                "type": found_symbol.type,
                "trace": " -> ".join(trace)
            })
            return found_symbol
        else:
            self.lookups.append({
                "symbol": name,
                "line": line,
                "status": "Unresolved",
                "resolved_scope": "None",
                "declared_line": "-",
                "type": "Unknown",
                "trace": " -> ".join(trace) + " (End of Chain)"
            })
            self.errors.append({
                "type": "Undeclared Identifier Error",
                "message": f"Identifier '{name}' referenced at line {line} is not declared in the current or any enclosing scope.",
                "line": line,
                "symbol": name
            })
            return None


def analyze_python_code(code_str):
    """
    Parses Python code using AST and builds the nested Symbol Table & Scope Resolution.
    """
    stm = SymbolTableManager()

    # Pre-register common built-in symbols in Global Scope
    builtins = ["print", "range", "len", "int", "str", "float", "list", "dict", "input", "sum"]
    for b in builtins:
        stm.global_scope.symbols[b] = Symbol(b, "builtin_func", 0, 0, "Global Scope (0)", None)

    try:
        parsed_ast = ast.parse(code_str)
    except SyntaxError as e:
        stm.errors.append({
            "type": "Syntax Error",
            "message": f"Syntax error at line {e.lineno}: {e.msg}",
            "line": e.lineno or 1,
            "symbol": "-"
        })
        return stm

    class ASTScopeVisitor(ast.NodeVisitor):
        def __init__(self, manager):
            self.mgr = manager

        def visit_FunctionDef(self, node):
            # Declare function in current scope
            self.mgr.declare_symbol(node.name, "function", node.lineno)
            
            # Enter new scope for the function body
            self.mgr.enter_scope(f"Function: {node.name}")
            
            # Add parameters to the function's local scope
            for arg in node.args.args:
                self.mgr.declare_symbol(arg.arg, "parameter", node.lineno)

            # Visit function body
            for item in node.body:
                self.visit(item)

            # Exit function scope
            self.mgr.exit_scope()

        def visit_Assign(self, node):
            # Handle target variables
            for target in node.targets:
                if isinstance(target, ast.Name):
                    var_name = target.id
                    val_str = None
                    val_type = "any"

                    if isinstance(node.value, ast.Constant):
                        val_str = node.value.value
                        val_type = type(node.value.value).__name__
                    
                    # If already in current scope, it's reassignment (allowed in Python)
                    allow_redef = var_name in self.mgr.current_scope.symbols
                    self.mgr.declare_symbol(var_name, val_type, node.lineno, val_str, allow_redefine=allow_redef)

            # Resolve variables on the right-hand side
            self.visit(node.value)

        def visit_Name(self, node):
            # If reading a variable (Load context)
            if isinstance(node.ctx, ast.Load):
                self.mgr.resolve_lookup(node.id, node.lineno)

        def visit_For(self, node):
            # Target variable in loop
            if isinstance(node.target, ast.Name):
                self.mgr.declare_symbol(node.target.id, "int", node.lineno, allow_redefine=True)
            self.visit(node.iter)
            for stmt in node.body:
                self.visit(stmt)

        def visit_If(self, node):
            self.visit(node.test)
            for stmt in node.body:
                self.visit(stmt)
            for stmt in node.orelse:
                self.visit(stmt)

    visitor = ASTScopeVisitor(stm)
    visitor.visit(parsed_ast)
    return stm


def analyze_c_like_code(code_str):
    """
    Parses C / Java style code with types: int, float, string, void, etc.
    """
    stm = SymbolTableManager()
    lines = code_str.split("\n")

    # Regular expressions for C-like syntax
    type_regex = r"(int|float|double|char|string|void|bool|auto)"
    var_decl_regex = re.compile(rf"^\s*{type_regex}\s+([a-zA-Z_]\w*)\s*(?:=\s*([^;]+))?\s*;")
    func_decl_regex = re.compile(rf"^\s*{type_regex}\s+([a-zA-Z_]\w*)\s*\((.*?)\)\s*\{{?")
    block_close_regex = re.compile(r"^\s*\}\s*")
    usage_regex = re.compile(r"\b([a-zA-Z_]\w*)\b")

    keywords = {"int", "float", "double", "char", "string", "void", "bool", "auto",
                 "if", "else", "while", "for", "return", "true", "false", "NULL", "print", "printf"}

    for line_num, raw_line in enumerate(lines, start=1):
        line = raw_line.strip()
        if not line or line.startswith("//"):
            continue

        # Check for block closing '}'
        if block_close_regex.match(line):
            stm.exit_scope()
            continue

        # Check for function declaration: e.g., void calculate(int a, float b) {
        func_match = func_decl_regex.match(line)
        if func_match:
            ret_type, func_name, params_str = func_match.groups()
            stm.declare_symbol(func_name, f"func({ret_type})", line_num)
            stm.enter_scope(f"Function: {func_name}")

            # Parse parameters
            if params_str and params_str.strip():
                for param in params_str.split(","):
                    p_parts = param.strip().split()
                    if len(p_parts) >= 2:
                        p_type, p_name = p_parts[0], p_parts[1]
                        stm.declare_symbol(p_name, p_type, line_num)
            continue

        # Check for variable declaration: e.g., int x = 10;
        var_match = var_decl_regex.match(line)
        if var_match:
            v_type, v_name, v_val = var_match.groups()
            stm.declare_symbol(v_name, v_type, line_num, value=v_val.strip() if v_val else None)
            
            # If there's an assignment value, check identifiers used in the expression
            if v_val:
                for token in usage_regex.findall(v_val):
                    if token not in keywords and not token.isdigit():
                        stm.resolve_lookup(token, line_num)
            continue

        # If it's a general statement (e.g. usage: x = y + z; or print(x);)
        tokens = usage_regex.findall(line)
        for token in tokens:
            if token not in keywords and not token.isdigit():
                # Avoid looking up assignment target if declaring
                stm.resolve_lookup(token, line_num)

    return stm

