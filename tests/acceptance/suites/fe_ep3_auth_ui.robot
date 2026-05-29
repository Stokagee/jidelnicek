*** Settings ***
Documentation       EP-3 · Claim + Login UI (FR-A3/FR-A4/FR-A5) acceptance — AC-11
...                 (T-3.4, tests-first). The screens land in T-3.3; until then run with
...                 `--skiponfailure notready` so this reports SKIPPED, not FAILED.
...                 Pattern: SEED a claim token over HTTP (admin), DRIVE the claim +
...                 login through the browser on a 360px mobile context.

Library             Collections
Resource            ../resources/browser_session.resource
Resource            ../resources/pages/claim_page.resource
Resource            ../resources/pages/login_page.resource

Suite Setup         Create API Session
Suite Teardown      Run Keywords    Close App    AND    Delete API Sessions


*** Variables ***
${ADMIN_NAME}           admin
${ADMIN_PASSWORD}       change-me
${MEMBER_USER_ID}       ${2}
${NEW_NAME}             nora
${NEW_PASSWORD}         sufficiently-long-pw


*** Test Cases ***
Valid Claim Token Sets Up The Account Then Logs In, And Cannot Be Reused (AC-11)
    [Documentation]    AC-11 (FR-A3): a valid claim token sets name+password and logs the
    ...    user in via the UI; the cookies-only session holds (FR-A5); the same token
    ...    cannot be used a second time.
    [Tags]    AC-11    FR-A3    FR-A5    notready
    # SEED over HTTP: admin mints a fresh single-use token for a member.
    Login    ${ADMIN_NAME}    ${ADMIN_PASSWORD}
    ${minted}=    Generate Claim Token    ${MEMBER_USER_ID}
    Status Should Be    200    ${minted}
    ${token}=    Set Variable    ${minted.json()}[token]
    # DRIVE over the browser: claim the account through the screen.
    Open Claim Page    ${token}
    Set Name And Password    ${NEW_NAME}    ${NEW_PASSWORD}
    Cookie Session Should Be Set
    Local Storage Should Be Empty
    # FR-A3 single-use: re-claiming with the same token must be rejected by the UI.
    Open Claim Page    ${token}
    Set Name And Password    ${NEW_NAME}    ${NEW_PASSWORD}
    Claim Error Should Be Shown

Logging In With The New Credentials Reaches The App (AC-11)
    [Documentation]    AC-11 (FR-A4/FR-A5): the claimed credentials log in through the
    ...    login screen and the session cookie is set.
    [Tags]    AC-11    FR-A4    FR-A5    notready
    Open Login Page
    Log In As    ${NEW_NAME}    ${NEW_PASSWORD}
    Cookie Session Should Be Set
    Local Storage Should Be Empty
