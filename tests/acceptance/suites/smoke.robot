*** Settings ***
Documentation       EP-2 acceptance smoke (T-2.2): proves the Robot + TalosForge
...                 harness works and the api is reachable. AC-* suites land in
...                 EP-3+ (tests-first).

Library             Collections
Resource            ../resources/api_session.resource

Suite Setup         Create API Session
Suite Teardown      Delete API Sessions


*** Test Cases ***
TalosForge Generates A Claim Payload
    [Documentation]    Offline check: the data generator + schemas are wired up.
    [Tags]    smoke    talosforge    offline
    ${data}=    Generate Payload From Schema    claim.json
    Dictionary Should Contain Key    ${data}    name
    Dictionary Should Contain Key    ${data}    password

TalosForge Generates A Signup Payload With Portions In Range
    [Documentation]    Generated portions honour the schema (BR-4: >= 1).
    [Tags]    smoke    talosforge    offline
    ${data}=    Generate Payload From Schema    signup.json
    Dictionary Should Contain Key    ${data}    day
    Should Be True    ${data}[portions] >= 1

API Healthz Is OK
    [Documentation]    Requires a running api (uv run api / docker compose).
    [Tags]    smoke    api
    ${response}=    Health Check
    Status Should Be    200    ${response}
    Should Be Equal    ${response.json()}[status]    ok
