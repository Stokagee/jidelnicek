*** Settings ***
Documentation       Page-object for the Claim / account-setup screen
...                 (§14.1, FR-A3, AC-11). Reached at /claim/<token>. Selectors are
...                 provisional until T-3.3 ships the screen.

Library             Browser
Resource            ../browser_session.resource


*** Variables ***
${CLAIM_NAME}       [data-testid="claim-name"]
${CLAIM_PASSWORD}   [data-testid="claim-password"]
${CLAIM_SUBMIT}     [data-testid="claim-submit"]
${CLAIM_ERROR}      [data-testid="claim-error"]


*** Keywords ***
Open Claim Page
    [Arguments]    ${token}
    Open App    /claim/${token}

Set Name And Password
    [Arguments]    ${name}    ${password}
    Fill Text    ${CLAIM_NAME}    ${name}
    Fill Text    ${CLAIM_PASSWORD}    ${password}
    Click    ${CLAIM_SUBMIT}

Claim Error Should Be Shown
    Get Element States    ${CLAIM_ERROR}    contains    visible
