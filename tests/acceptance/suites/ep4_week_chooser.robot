*** Settings ***
Documentation       EP-4 · Week & chooser (FR-W) acceptance — AC-5 (T-4.1, tests-first).
...                 Endpoints land in T-4.2. Run acceptance with
...                 `--skiponfailure notready` until then.

Library             Collections
Resource            ../resources/api_session.resource

Suite Setup         Create API Session
Suite Teardown      Delete API Sessions


*** Variables ***
# A member who is NOT the current week's chooser (and not the admin).
${MEMBER_NAME}          non-chooser-member
${MEMBER_PASSWORD}      replace-with-member-password


*** Test Cases ***
Non-Chooser Member Cannot Create A Dish (AC-5)
    [Documentation]    AC-5 (FR-W4, BR-6): a logged-in member who is not the
    ...    week's chooser is refused when creating a dish.
    [Tags]    AC-5    FR-W4    BR-6    notready
    Login    ${MEMBER_NAME}    ${MEMBER_PASSWORD}
    ${dish}=    Generate Payload From Schema    dish.json
    ${response}=    POST On Session    ${API_SESSION}    /dishes    json=${dish}    expected_status=any
    Should Be Equal As Integers    ${response.status_code}    403
