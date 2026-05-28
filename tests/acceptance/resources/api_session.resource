*** Settings ***
Documentation       Shared acceptance keywords: a cookie-backed API session, the
...                 auth/session flow exactly as the browser uses it (FR-A), and
...                 TalosForge helpers for schema-driven payloads and strict
...                 response validation. Used by every AC-* suite under suites/.

Library             RequestsLibrary
Library             Collections
Library             TalosForge


*** Variables ***
${API_BASE_URL}     http://127.0.0.1:8000
${API_SESSION}      jidelnicek
${SCHEMA_DIR}       ${CURDIR}/../schemas


*** Keywords ***
Create API Session
    [Documentation]    A persistent requests Session so httpOnly session cookies
    ...    survive across calls (login → protected call → logout).
    Create Session    ${API_SESSION}    ${API_BASE_URL}

Delete API Sessions
    Delete All Sessions

Health Check
    ${response}=    GET On Session    ${API_SESSION}    /healthz    expected_status=any
    RETURN    ${response}

Claim Account
    [Documentation]    POST /auth/claim — set name+password from a claim token (FR-A3).
    [Arguments]    ${token}    ${name}    ${password}
    ${body}=    Create Dictionary    token=${token}    name=${name}    password=${password}
    ${response}=    POST On Session    ${API_SESSION}    /auth/claim    json=${body}    expected_status=any
    RETURN    ${response}

Login
    [Documentation]    POST /auth/login — name+password (FR-A4).
    [Arguments]    ${name}    ${password}
    ${body}=    Create Dictionary    name=${name}    password=${password}
    ${response}=    POST On Session    ${API_SESSION}    /auth/login    json=${body}    expected_status=any
    RETURN    ${response}

Logout
    ${response}=    POST On Session    ${API_SESSION}    /auth/logout    expected_status=any
    RETURN    ${response}

Get Me
    [Documentation]    GET /me — who am I + am I admin (FR-A6).
    ${response}=    GET On Session    ${API_SESSION}    /me    expected_status=any
    RETURN    ${response}

Generate Payload From Schema
    [Documentation]    Realistic happy-path request body via TalosForge. Boundary /
    ...    negative AC values are set explicitly by the test, not generated.
    [Arguments]    ${schema_file}
    ${data}=    Generate Data From Schema    schema_path=${SCHEMA_DIR}/${schema_file}
    RETURN    ${data}

Response Should Match Schema
    [Documentation]    Strict (additionalProperties:false) contract check of a JSON body.
    [Arguments]    ${data}    ${schema_file}
    Validate Data Against Schema    data=${data}    schema_path=${SCHEMA_DIR}/${schema_file}
