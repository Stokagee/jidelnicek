*** Settings ***
Documentation       EP-6 · Signups (FR-S) acceptance — AC-1 (T-6.1, tests-first).
...                 Endpoints land in T-6.2. Run acceptance with
...                 `--skiponfailure notready` until then.

Library             Collections
Resource            ../resources/api_session.resource

Suite Setup         Create API Session
Suite Teardown      Delete API Sessions


*** Variables ***
${MEMBER_NAME}          member
${MEMBER_PASSWORD}      replace-with-member-password
# A dish whose block does NOT include ${OUT_OF_BLOCK_DAY} (e.g. block Mon-Wed, day = Thu).
${DISH_ID}              1
${OUT_OF_BLOCK_DAY}     2026-01-08


*** Test Cases ***
Signup For A Day Outside The Dish Block Is Rejected (AC-1)
    [Documentation]    AC-1 (FR-S1, BR-2): signing up for a day outside the dish
    ...    block is rejected (422).
    [Tags]    AC-1    FR-S1    BR-2    notready
    Login    ${MEMBER_NAME}    ${MEMBER_PASSWORD}
    ${body}=    Create Dictionary    dish_id=${DISH_ID}    day=${OUT_OF_BLOCK_DAY}    portions=${1}
    ${response}=    POST On Session    ${API_SESSION}    /signups    json=${body}    expected_status=any
    Should Be Equal As Integers    ${response.status_code}    422
