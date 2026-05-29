*** Settings ***
Documentation       Page-object for the Dish signup flow (§14.4, FR-S1/FR-S2/FR-S4;
...                 AC-1, AC-2, AC-3): pick days inside the dish block and set portions
...                 per day, change or cancel. Selectors are provisional until T-6.3.

Library             Browser
Resource            ../browser_session.resource


*** Variables ***
# A selectable day is addressed by ISO date: [data-testid="day-2026-01-05"].
${SIGNUP_DAY}       [data-testid="day-%s"]
${SIGNUP_PORTIONS}  [data-testid="signup-portions"]
${SIGNUP_SUBMIT}    [data-testid="signup-submit"]
${SIGNUP_CANCEL}    [data-testid="signup-cancel"]
${SIGNUP_ERROR}     [data-testid="signup-error"]


*** Keywords ***
Open Dish Signup
    [Arguments]    ${dish_id}
    Open App    /dishes/${dish_id}/signup

Select Block Day
    [Arguments]    ${iso_date}
    Click    ${SIGNUP_DAY % ${iso_date}}

Day Outside Block Should Not Be Selectable
    [Documentation]    AC-1/BR-2: a day outside the dish block is not offered.
    [Arguments]    ${iso_date}
    Get Element Count    ${SIGNUP_DAY % ${iso_date}}    ==    0

Set Portions
    [Arguments]    ${count}
    Fill Text    ${SIGNUP_PORTIONS}    ${count}

Submit Signup
    Click    ${SIGNUP_SUBMIT}

Cancel Signup
    Click    ${SIGNUP_CANCEL}

Signup Error Should Be Shown
    Get Element States    ${SIGNUP_ERROR}    contains    visible
