"""
Comprehensive automated tests for Symbol Table Management and Scope Resolution System
"""

import json
from app import app

def run_tests():
    client = app.test_client()
    print("Running verification tests...\n" + "="*50)

    # Test 1: Frontend Homepage
    res_home = client.get("/")
    assert res_home.status_code == 200, f"Expected 200, got {res_home.status_code}"
    assert b"Symbol Table & Scope Resolution" in res_home.data
    print(" [PASS] Test 1: Web Interface loads successfully (HTTP 200)")

    # Test 2: Sample Programs API
    res_samples = client.get("/api/samples")
    assert res_samples.status_code == 200
    samples = res_samples.get_json()
    assert "python_basic" in samples and "python_shadowing" in samples and "c_nested_scopes" in samples
    print(f" [PASS] Test 2: Loaded {len(samples)} sample programs from backend")

    # Test 3: Python Scope & Symbol Analysis
    basic_code = samples["python_basic"]
    res_basic = client.post("/api/analyze", json={"code": basic_code, "language": "python"})
    assert res_basic.status_code == 200
    data_basic = res_basic.get_json()
    assert data_basic["success"] is True
    print(f" [PASS] Test 3: Basic Python Analysis")
    print(f"        - Scopes detected: {data_basic['stats']['total_scopes']}")
    print(f"        - Symbols registered: {data_basic['stats']['total_symbols']}")
    print(f"        - Lookups resolved: {data_basic['stats']['total_lookups']}")
    print(f"        - Errors: {data_basic['stats']['error_count']}")

    # Test 4: Variable Shadowing & Undeclared Error Diagnostics
    shadow_code = samples["python_shadowing"]
    res_shadow = client.post("/api/analyze", json={"code": shadow_code, "language": "python"})
    assert res_shadow.status_code == 200
    data_shadow = res_shadow.get_json()
    assert len(data_shadow["warnings"]) > 0, "Expected shadowing warning"
    assert len(data_shadow["errors"]) > 0, "Expected undeclared error"
    print(f" [PASS] Test 4: Semantic Error & Shadowing Diagnostics")
    print(f"        - Warning detected: {data_shadow['warnings'][0]['type']}: {data_shadow['warnings'][0]['message']}")
    print(f"        - Error detected: {data_shadow['errors'][0]['type']}: {data_shadow['errors'][0]['message']}")

    # Test 5: C/Java Style Typed Code Analysis
    c_code = samples["c_nested_scopes"]
    res_c = client.post("/api/analyze", json={"code": c_code, "language": "c"})
    assert res_c.status_code == 200
    data_c = res_c.get_json()
    assert data_c["success"] is True
    print(f" [PASS] Test 5: C/Java-style Code Analysis")
    print(f"        - Scopes: {data_c['stats']['total_scopes']}, Symbols: {data_c['stats']['total_symbols']}, Errors: {data_c['stats']['error_count']}")

    print("="*50 + "\n ALL 5 VERIFICATION TESTS PASSED SUCCESSFULLY! ")

if __name__ == "__main__":
    run_tests()

