*** Settings ***
Documentation       EP-4/EP-5 · Dish creation UI (FR-D1/FR-D2/FR-W4) acceptance — AC-5.
...                 The add-dish action + form shipped in T-5.3, so this runs for real.
...                 Pattern: SEED the week's chooser over HTTP (admin), DRIVE the
...                 visibility check through the browser. Members must be claimed first;
...                 pass their creds via -v (the defaults match the seed member names in
...                 .env.example) and admin creds via -v ADMIN_NAME / -v ADMIN_PASSWORD.

Library             Collections
Resource            ../resources/browser_session.resource
Resource            ../resources/pages/login_page.resource
Resource            ../resources/pages/chooser_propose_page.resource

Suite Setup         Create API Session
Suite Teardown      Run Keywords    Close App    AND    Delete API Sessions


*** Variables ***
${ADMIN_NAME}           admin
${ADMIN_PASSWORD}       change-me
# A claimed member who is NOT made the chooser below.
${MEMBER_NAME}          Kateřina
${MEMBER_PASSWORD}      katka123
# The user id made chooser of the current week (someone other than the member above).
${CHOOSER_USER_ID}      ${3}


*** Test Cases ***
Non-Chooser Member Is Not Offered The Add-Dish Action (AC-5)
    [Documentation]    AC-5 (FR-W4/BR-6): a member who is not the week's chooser does not
    ...    see the add-dish action, so they cannot create a dish through the UI.
    [Tags]    AC-5    FR-W4
    # SEED over HTTP: admin makes another user the chooser of the current week.
    Login    ${ADMIN_NAME}    ${ADMIN_PASSWORD}
    ${week}=    GET On Session    ${API_SESSION}    /weeks/current    expected_status=200
    ${set}=    Set Chooser    ${week.json()}[id]    ${CHOOSER_USER_ID}
    Status Should Be    200    ${set}
    # DRIVE over the browser: the non-chooser member logs in; the action must be absent.
    Open Login Page
    Log In As    ${MEMBER_NAME}    ${MEMBER_PASSWORD}
    Propose Action Should Be Absent
