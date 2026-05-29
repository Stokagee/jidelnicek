*** Settings ***
Documentation       Page-object for the Login screen (§14.2, FR-A4/FR-A5). Intent
...                 keywords only; selectors use data-testid so suites don't depend on
...                 Czech copy. Selectors are provisional until T-3.3 ships the screen.

Library             Browser
Resource            ../browser_session.resource


*** Variables ***
${LOGIN_NAME}       [data-testid="login-name"]
${LOGIN_PASSWORD}   [data-testid="login-password"]
${LOGIN_SUBMIT}     [data-testid="login-submit"]
${LOGIN_ERROR}      [data-testid="login-error"]


*** Keywords ***
Open Login Page
    Open App    /login

Log In As
    [Arguments]    ${name}    ${password}
    Fill Text    ${LOGIN_NAME}    ${name}
    Fill Text    ${LOGIN_PASSWORD}    ${password}
    Click    ${LOGIN_SUBMIT}

Login Error Should Be Shown
    Get Element States    ${LOGIN_ERROR}    contains    visible
