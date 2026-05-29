*** Settings ***
Library    String
Library    Dotenv
Resource    ../resources/api_session.resource

Suite Setup    Create API Session
Suite Teardown    Delete API Sessions

*** Variables ***
${dish_name}    Test Dish

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

Logged With Correct Name But Wrong Password
    [Documentation]    Attempt to log in with a correct name but wrong password. Expect 401.
    ${response}=    Login    name=admin    password=wrong-password
    Should Be True    ${response.status_code} == 401
    VAR    ${json}    ${response.json()}
    Dictionary Should Contain Key    ${json}    detail
    Dictionary Should Contain Value    ${json}    Invalid credentials

Create Dish With Max Length Name
    [Documentation]    Attempt to create a dish with a name that exceeds the maximum length. Expect 422.
    ${long_name}=    Generate Random String    256
    Login As Admin
    ${response}=    Create Dish    week_id=1    name=${long_name}    start_date=2026-05-29    end_date=2026-06-01
    Should Be True    ${response.status_code} == 422
    VAR    ${json}    ${response.json()}
    Dictionary Should Contain Key    ${json}    detail
    Should Contain    ${response.text}    String should have at most 200 characters

Create Dish Without Authorization    
    [Documentation]    Attempt to create a dish without being logged in. Expect 401.
    [Setup]    Create API Session
    ${response}=    Create Dish    week_id=1    name=${dish_name}    start_date=2026-05-29    end_date=2026-06-01
    Should Be True    ${response.status_code} == 401
    VAR    ${json}    ${response.json()}
    Dictionary Should Contain Key    ${json}    detail
    Dictionary Should Contain Value    ${json}    Not authenticated

Name Length Validation Empty Name
    [Documentation]    Attempt to create a dish with an empty name. Expect 422.
    Login As Admin
    ${response}=    Create Dish    week_id=1    name=${EMPTY}    start_date=2026-05-29    end_date=2026-06-01
    Should Be True    ${response.status_code} == 422
    VAR    ${json}    ${response.json()}
    Dictionary Should Contain Key    ${json}    detail
    Should Contain    ${response.text}    String should have at least 1 character

Incorrect date formats Invalid date
    [Documentation]    Attempt to create a dish with incorrectly formatted dates. Expect 422.
    Login As Admin
    ${response}=    Create Dish    week_id=1    name=${dish_name}    start_date=2026-05-32    end_date=2026-06-01
    Should Be True    ${response.status_code} == 422
    VAR    ${json}    ${response.json()}
    Dictionary Should Contain Key    ${json}    detail
    Should Contain    ${response.text}    Input should be a valid date or datetime, day value is outside expected range

Missing required field
    [Documentation]    Attempt to create a dish without providing all required fields. Expect 422.
    Login As Admin
    ${response}=    Create Dish    week_id=1    name=${dish_name}   start_date=2026-05-29    end_date=${EMPTY}
    Should Be True    ${response.status_code} == 422
    VAR    ${json}    ${response.json()}
    Dictionary Should Contain Key    ${json}    detail
    Should Contain    ${response.text}    Input should be a valid date or datetime, input is too short

Unauthorized user
    [Documentation]    Attempt to create a dish while logged in as a non-admin user. Expect 403.
    [Setup]    Create API Session
    ${response}=    Login    name=%{USER2_NAME}    password=%{USER2_PASSWORD}
    Should Be True    ${response.status_code} == 200    msg=Failed to log in as non-admin user
    ${response}=    Create Dish    week_id=1    name=${dish_name}   start_date=2026-05-29    end_date=2026-06-01
    Should Be True    ${response.status_code} == 403
    VAR    ${json}    ${response.json()}
    Dictionary Should Contain Key    ${json}    detail
    Dictionary Should Contain Value    ${json}    Not enough permissions