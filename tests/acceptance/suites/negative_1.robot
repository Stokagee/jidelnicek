*** Settings ***
Resource    ../resources/api_session.resource

Suite Setup    Create API Session
Suite Teardown    Delete API Sessions

*** Test Cases ***

Logged in with the wrong name
    [Documentation]    Attempt to log in with a name that doesn't exist. Expect 401.
    ${response}=    Login    non-existent-name    any-password
    Should Be True    ${response.status_code} == 401
    VAR    ${json}    ${response.json()}
    Dictionary Should Contain Key    ${json}    detail
    Dictionary Should Contain Value    ${json}    Invalid credentials