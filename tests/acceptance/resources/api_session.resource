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

Login As Admin
    ${response}=    Login    name=admin    password=change-me-strong-admin-password
    RETURN    ${response}
    
Get Current Week
    ${response}=    GET On Session    ${API_SESSION}    /weeks/current    expected_status=any
    RETURN    ${response}

Delete The Dish
    [Documentation]    DELETE /dishes/{id} — admin or week chooser deletes a dish (FR-D3).
    ...    Used to CLEANUP a dish after a test creates it.
    [Arguments]    ${dish_id}
    ${response}=    DELETE On Session    ${API_SESSION}    /dishes/${dish_id}    expected_status=any
    RETURN    ${response}

Signup For Dish
    [Documentation]    POST /dishes/{id}/signup — member signs up for a dish (FR-D2).
    ...    Used to SEED a signup (known block) before driving the UI.
    [Arguments]    ${dish_id}    ${day}    ${portions}
    ${body}=    Create Dictionary    dish_id=${dish_id}    day=${day}    portions=${portions}
    ${response}=    POST On Session    ${API_SESSION}    /signups    json=${body}    expected_status=any
    RETURN    ${response}

New Count Of Portions For Dish Signup
    [Documentation]    GET /dishes/{id} — get the dish's current total signup portions. Used
    ...    to verify that a signup actually changed the total.
    [Arguments]    ${signup_id}    ${portions}
    ${response}=    PATCH On Session   ${API_SESSION}    /signups/${signup_id}    json=${portions}    expected_status=any
    RETURN    ${response}

Get Summary
    [Documentation]    GET /summary — get the chef's summary of the week's dishes and signups.
    ...    Admin only (the cook's view). Sums every active signup — including the admin's own 
    ...    and excludes soft-deleted rows
    ${response}=    GET On Session    ${API_SESSION}    /summary    expected_status=any
    RETURN    ${response}


