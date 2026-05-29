*** Settings ***
Documentation       EP-6 · Signup UI (FR-S1/FR-S2) acceptance — AC-1, AC-2, AC-6.
...                 The signup screen shipped in T-6.3, so this runs for real. Pattern:
...                 SEED a dish with a known block over HTTP (admin), DRIVE the signup
...                 through the browser as a member. A claimed member is required; pass
...                 creds via -v (defaults match the seed member names in .env.example)
...                 and admin creds via -v ADMIN_NAME / -v ADMIN_PASSWORD.

Library             Collections
Resource            ../resources/browser_session.resource
Resource            ../resources/pages/login_page.resource
Resource            ../resources/pages/dish_signup_page.resource
Resource            ../resources/api_session.resource

Suite Setup         Seed A Dish With A Known Block
Suite Teardown      Run Keywords    Close App    AND    Delete API Sessions


*** Variables ***
${ADMIN_NAME}           admin
${ADMIN_PASSWORD}       change-me-strong-admin-password
${MEMBER_NAME}          Kateřina
${MEMBER_PASSWORD}      katka123
${BLOCK_START}          2026-01-05
${BLOCK_MID}            2026-01-06
${BLOCK_END}            2026-01-07
${OUT_OF_BLOCK}         2026-01-09
${DISH_ID}              None


*** Keywords ***
Seed A Dish With A Known Block
    [Documentation]    Admin creates a dish in the current week so the signup screen
    ...    offers a known block. Exposes ${DISH_ID} to the tests.
    Create API Session
    Login    ${ADMIN_NAME}    ${ADMIN_PASSWORD}
    ${week}=    GET On Session    ${API_SESSION}    /weeks/current    expected_status=200
    ${dish}=    Create Dish    ${week.json()}[id]    Guláš    ${BLOCK_START}    ${BLOCK_END}
    Status Should Be    201    ${dish}
    Set Suite Variable    ${DISH_ID}    ${dish.json()}[id]

Member Opens The Dish Signup
    Open Login Page
    Log In As    ${MEMBER_NAME}    ${MEMBER_PASSWORD}
    Open Dish Signup    ${DISH_ID}


*** Test Cases ***
A Day Outside The Dish Block Is Not Offered (AC-1)
    [Documentation]    AC-1 (BR-2): only days inside the block are selectable, so a
    ...    member cannot sign up for a day outside it.
    [Tags]    AC-1    BR-2
    Member Opens The Dish Signup
    Day Outside Block Should Not Be Selectable    ${OUT_OF_BLOCK}

Portions Below One Are Rejected (AC-2)
    [Documentation]    AC-2 (BR-4): the form does not submit a signup with < 1 portions.
    [Tags]    AC-2    BR-4
    Member Opens The Dish Signup
    Select Block Day    ${BLOCK_MID}
    Set Portions    0
    Submit Signup
    Signup Error Should Be Shown

A Member Signs Up For A Dish On A Day In The Block (AC-6)
    [Documentation]    AC-6 (FR-S3): a member signs up for a day inside the block and
    ...    the signup is confirmed.
    [Tags]    AC-6    FR-S3
    Member Opens The Dish Signup
    Select Block Day    ${BLOCK_MID}
    Set Portions    2
    Submit Signup
    Get Element States    [data-testid="signup-confirmed"]    contains    visible
