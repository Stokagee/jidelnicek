*** Settings ***
Documentation       EP-3 · Account & login (FR-A) acceptance — AC-11 (T-3.1, tests-first).
...                 The endpoints land in T-3.2. Until then run acceptance with
...                 `--skiponfailure notready` so this reports as skipped, not failed.

Library             Collections
Resource            ../resources/api_session.resource

Suite Setup         Create API Session
Suite Teardown      Delete API Sessions


*** Variables ***
# A valid one-time claim token, provisioned by the admin (FR-A2). Supply for a
# real run with: robot -v CLAIM_TOKEN:<token> ...
${CLAIM_TOKEN}      replace-with-a-valid-claim-token


*** Test Cases ***
Valid Claim Token Activates Account And Cannot Be Reused (AC-11)
    [Documentation]    AC-11 (FR-A3): claim sets name+password and consumes the
    ...    token; the account then logs in and the token cannot be reused.
    [Tags]    AC-11    FR-A3    notready
    ${creds}=    Generate Payload From Schema    claim.json

    ${first}=    Claim Account    ${CLAIM_TOKEN}    ${creds}[name]    ${creds}[password]
    Status Should Be    200    ${first}

    ${reuse}=    Claim Account    ${CLAIM_TOKEN}    ${creds}[name]    ${creds}[password]
    Should Be True    ${reuse.status_code} in (400, 401, 409)

    ${login}=    Login    ${creds}[name]    ${creds}[password]
    Status Should Be    200    ${login}
