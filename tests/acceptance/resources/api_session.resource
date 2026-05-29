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

Generate Claim Token
    [Documentation]    POST /admin/users/{id}/claim-token — admin mints a single-use
    ...    claim token for a member (FR-A2). Requires the session to be logged in as
    ...    admin first. Used to SEED the AC-11 UI flow before driving the browser.
    [Arguments]    ${user_id}
    ${response}=    POST On Session    ${API_SESSION}    /admin/users/${user_id}/claim-token
    ...    expected_status=any
    RETURN    ${response}

Set Chooser
    [Documentation]    PUT /weeks/{id}/chooser — admin sets the week's chooser (FR-W2,
    ...    BR-1). Requires the session to be logged in as admin. Used to SEED the
    ...    chooser before driving dish-permission checks in the browser.
    [Arguments]    ${week_id}    ${chooser_id}
    ${body}=    Create Dictionary    chooser_id=${chooser_id}
    ${response}=    PUT On Session    ${API_SESSION}    /weeks/${week_id}/chooser    json=${body}
    ...    expected_status=any
    RETURN    ${response}

Create Dish
    [Documentation]    POST /dishes — admin or week chooser creates a dish (FR-D1).
    ...    Used to SEED a dish (known block) before driving the signup UI.
    [Arguments]    ${week_id}    ${name}    ${start_date}    ${end_date}
    ${body}=    Create Dictionary    week_id=${week_id}    name=${name}
    ...    start_date=${start_date}    end_date=${end_date}
    ${response}=    POST On Session    ${API_SESSION}    /dishes    json=${body}    expected_status=any
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
