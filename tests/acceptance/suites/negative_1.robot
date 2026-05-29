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

Logged without credentials
    [Documentation]    Attempt to log in without providing credentials. Expect 422.
    ${response}=    POST On Session    ${API_SESSION}    /auth/login    json={}    expected_status=any
    Should Be True    ${response.status_code} == 422
    VAR    ${json}    ${response.json()}
    Should Contain    ${json['detail'][0]['msg']}    Input should be a valid dictionary or object to extract fields from
    Should Contain    ${response.text}    Input should be a valid dictionary or object to extract fields from

Logged With One Word Password
    [Documentation]    Attempt to log in with a password that doesn't meet complexity requirements. Expect 422.
    ${response}=    Login    name=${EMPTY}    password=a
    Should Be True    ${response.status_code} == 422
    VAR    ${json}    ${response.json()}
    Dictionary Should Contain Key    ${json}    detail
    Should Contain    ${response.text}    String should have at least 1 character

