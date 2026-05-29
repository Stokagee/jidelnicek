*** Settings ***
Documentation       EP-7 · Cook summary UI (FR-K1/FR-K2/FR-K3) acceptance — AC-4.
...                 The admin cook-summary screen shipped in T-7.3, so this runs for
...                 real. Pattern: SEED a dish + a signup over HTTP in the current week,
...                 DRIVE the admin cook summary through the browser and assert the
...                 per-dish portion total for that day. Admin creds via
...                 -v ADMIN_NAME / -v ADMIN_PASSWORD.

Library             Collections
Resource            ../resources/browser_session.resource
Resource            ../resources/pages/login_page.resource
Resource            ../resources/pages/cook_summary_page.resource

Suite Setup         Seed A Dish And A Signup In The Current Week
Suite Teardown      Run Keywords    Close App    AND    Delete API Sessions


*** Variables ***
${ADMIN_NAME}           admin
${ADMIN_PASSWORD}       change-me
${PORTIONS}             ${2}


*** Keywords ***
Seed A Dish And A Signup In The Current Week
    [Documentation]    Admin creates a single-day dish on the current week's Monday and
    ...    signs up for ${PORTIONS} portions, so /summary has a known total for that day.
    Create API Session
    Login    ${ADMIN_NAME}    ${ADMIN_PASSWORD}
    ${week}=    GET On Session    ${API_SESSION}    /weeks/current    expected_status=200
    Set Suite Variable    ${WEEK_START}    ${week.json()}[start_date]
    ${dish}=    Create Dish    ${week.json()}[id]    Guláš    ${WEEK_START}    ${WEEK_START}
    Status Should Be    201    ${dish}
    Set Suite Variable    ${DISH_ID}    ${dish.json()}[id]
    ${body}=    Create Dictionary    dish_id=${DISH_ID}    day=${WEEK_START}    portions=${PORTIONS}
    ${signup}=    POST On Session    ${API_SESSION}    /signups    json=${body}    expected_status=any
    Should Be True    ${signup.status_code} in (200, 201)


*** Test Cases ***
Cook Summary Shows The Per-Dish Portion Total For A Day (AC-4)
    [Documentation]    AC-4 (FR-K1/FR-K2): the admin cook summary sums active portions
    ...    per dish for the selected day, including the admin's own signup.
    [Tags]    AC-4    FR-K1    FR-K2
    Open Login Page
    Log In As    ${ADMIN_NAME}    ${ADMIN_PASSWORD}
    Open Cook Summary
    Summary Should Be Visible
    Summary Cell Should Show Portions    ${WEEK_START}    ${DISH_ID}    ${PORTIONS}
