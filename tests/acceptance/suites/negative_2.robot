*** Settings ***
Documentation     Negative test cases for the API
Resource    ../resources/api_session.resource
Variables    env_loader.py

Suite Setup    Create API Session
Suite Teardown   Delete All Sessions

*** Variables ***
${dish_name}    Test Dish
${portions}    2
${start_day}   2026-06-02
${end_day}     2026-06-09

*** Test Cases ***

IDOR Insecure Direct Object Reference
    [Documentation]    Here, we are testing whether a user can modify another user's data simply by guessing or forging the record ID.
    ${response_admin_login}=    Login    ${ADMIN_NAME}    ${ADMIN_PASSWORD}
    Should Be True    ${response_admin_login.status_code} == 200    msg=Admin login failed with status code ${response_admin_login.status_code}

    VAR    ${json}    ${response_admin_login.json()}

    Should Be True    ${json}[is_admin]    msg=Admin login did not return is_admin=True

    ${response_current_week}=    Get Current Week
    Should Be True    ${response_current_week.status_code} == 200    msg=Get current week failed with status code ${response_current_week.status_code}

    VAR    ${json}    ${response_current_week.json()}


    ${response_create_dish}=    Create Dish    week_id=${json}[id]    name=${dish_name}    start_date=${start_day}    end_date=${end_day}
    Should Be True    ${response_create_dish.status_code} == 201    msg=Create dish failed with status code ${response_create_dish.status_code}

    VAR   ${dish_json}    ${response_create_dish.json()}

    Should Be Equal As Strings   ${dish_json}[name]    ${dish_name}    msg=Dish name in response does not match request
    Should Be Equal As Strings   ${dish_json}[start_date]    ${start_day}    msg=Dish start date in response does not match request

    Logout

    ${user_2_response}=    Login    ${USER_2_NAME}    ${USER_2_PASSWORD}
    Should Be True    ${user_2_response.status_code} == 200    msg=User 2 login failed with status code ${user_2_response.status_code}

    VAR    ${json_user_2}    ${user_2_response.json()}

    Should Be Equal As Strings    ${json_user_2}[name]    Kateřina    msg=User 2 login did not return expected name
    Should Be True    ${json_user_2}[is_admin] == False    msg=User 2 login did not return is_admin=False

    ${signup_response}=    Signup For Dish    dish_id=${dish_json}[id]    day=${start_day}   portions=${portions}


    Should Be True    ${signup_response.status_code} == 201    msg=Signup for dish failed with status code ${signup_response.status_code}
    VAR    ${signup_json}    ${signup_response.json()}
    

    Should Be Equal As Numbers    ${signup_json}[portions]    ${portions}
    Should Be Equal As Numbers    ${signup_json}[dish_id]    ${dish_json}[id]

    Logout

    ${user_3_response}=    Login    ${USER_3_NAME}    ${USER_3_PASSWORD}
    Should Be True    ${user_3_response.status_code} == 200    msg=User 3 login failed with status code ${user_3_response.status_code}

    VAR    ${json_user_3}    ${user_3_response.json()}

    ${patch_count_response}=    New Count Of Portions For Dish Signup    ${signup_json}[id]    ${portions}=3
    Should Not Be True    ${patch_count_response.status_code} == 200    msg=Patch count of portions succeeded with status code ${patch_count_response.status_code}, but should have failed due to lack of permissions

    Logout

    Login As Admin
    ${delete_dish_response}=    Delete The Dish    ${dish_json}[id]
    Should Be True    ${delete_dish_response.status_code} == 200    msg=Delete dish failed with status code ${delete_dish_response.status_code}

Deleting a dish by an external selector (DELETE /dishes/{dish_id})
    [Documentation]    Here, we are testing whether a user can delete a dish that they did not create simply by guessing or forging the dish ID.
    ${response_admin_login}=    Login    ${ADMIN_NAME}    ${ADMIN_PASSWORD}
    Should Be True    ${response_admin_login.status_code} == 200    msg=Admin login failed with status code ${response_admin_login.status_code}

    VAR    ${json}    ${response_admin_login.json()}

    Should Be True    ${json}[is_admin]    msg=Admin login did not return is_admin=True

    ${response_current_week}=    Get Current Week
    Should Be True    ${response_current_week.status_code} == 200    msg=Get current week failed with status code ${response_current_week.status_code}

    VAR    ${json}    ${response_current_week.json()}

    ${set_chooser_response}=    Set Chooser    week_id=${json}[id]    chooser_id=2
    Should Be True    ${set_chooser_response.status_code} == 200    msg=Set chooser failed with status code ${set_chooser_response.status_code}

    ${user_2_response}=    Login    ${USER_2_NAME}    ${USER_2_PASSWORD}
    Should Be True    ${user_2_response.status_code} == 200    msg=User 2 login failed with status code ${user_2_response.status_code}

    VAR    ${json_user_2}    ${user_2_response.json()}

    Should Be Equal As Strings    ${json_user_2}[name]    Kateřina    msg=User 2 login did not return expected name
    Should Be True    ${json_user_2}[is_admin] == False    msg=User 2 login did not return is_admin=False

    ${response_create_dish}=    Create Dish    week_id=${json}[id]    name=${dish_name}    start_date=${start_day}    end_date=${end_day}
    Should Be True    ${response_create_dish.status_code} == 201    msg=Create dish failed with status code ${response_create_dish.status_code}

    VAR   ${dish_json}    ${response_create_dish.json()}
    Should Be Equal As Strings   ${dish_json}[name]    ${dish_name}    msg=Dish name in response does not match request
    Should Be Equal As Strings   ${dish_json}[start_date]    ${start_day}    msg=Dish start date in response does not match request

    Logout

    ${user_3_response}=    Login    ${USER_3_NAME}    ${USER_3_PASSWORD}
    Should Be True    ${user_3_response.status_code} == 200    msg=User 3 login failed with status code ${user_3_response.status_code}

    VAR    ${json_user_3}    ${user_3_response.json()}

    ${delete_dish_response}=    Delete The Dish    ${dish_json}[id]
    Should Not Be True    ${delete_dish_response.status_code} == 200    msg=Delete dish succeeded with status code ${delete_dish_response.status_code}, but should have failed due to lack of permissions
    Logout

A member cannot view the chef's summary (GET /summary)
    [Documentation]    Here, we are testing whether a regular member can access the chef's summary endpoint, which should be restricted to admins and choosers.

    ${user_4_response}=    Login    ${USER_4_NAME}    ${USER_4_PASSWORD}
    Should Be True    ${user_4_response.status_code} == 200    msg=User 4 login failed with status code ${user_4_response.status_code}

    VAR    ${json_user_4}    ${user_4_response.json()}

    Should Be Equal As Strings    ${json_user_4}[name]    Mia    msg=User 4 login did not return expected name
    Should Be True    ${json_user_4}[is_admin] == False    msg=User 4 login did not return is_admin=False

    ${summary_response}=    Get Summary
    Should Not Be True    ${summary_response.status_code} == 200    msg=Get summary succeeded with status code ${summary_response.status_code}, but should have failed due to lack of permissions

A member is not allowed to modify permissions (PUT /weeks/{week_id}/chooser)
    [Documentation]    Here, we are testing whether a regular member can change the chooser for a week, which should be restricted to admins.
    ${user_4_response}=    Login    ${USER_4_NAME}    ${USER_4_PASSWORD}
    Should Be True    ${user_4_response.status_code} == 200    msg=User 4 login failed with status code ${user_4_response.status_code}

    VAR    ${json_user_4}    ${user_4_response.json()}
    Should Be Equal As Strings    ${json_user_4}[name]    Mia    msg=User 4 login did not return expected name
    Should Be True    ${json_user_4}[is_admin] == False    msg=User 4 login did not return is_admin=False

    ${response_current_week}=    Get Current Week
    Should Be True    ${response_current_week.status_code} == 200    msg=Get current week failed with status code ${response_current_week.status_code}

    VAR    ${json}    ${response_current_week.json()}

    ${set_chooser_response}=    Set Chooser    week_id=${json}[id]    chooser_id=2
    Should Not Be True    ${set_chooser_response.status_code} == 200    msg=Set chooser succeeded with status code ${set_chooser_response.status_code}, but should have failed due to lack of permissions
    Logout

The exact structure of error 422 (Validation Error)
    [Documentation]    Here, we are testing whether the API returns a 422 status code with a specific error message structure when a request fails validation.
    ${response_admin_login}=    Login    ${ADMIN_NAME}    ${ADMIN_PASSWORD}
    Should Be True    ${response_admin_login.status_code} == 200    msg=Admin login failed with status code ${response_admin_login.status_code}
    VAR    ${json}    ${response_admin_login.json()}
    Should Be True    ${json}[is_admin]    msg=Admin login did not return is_admin=True
    ${response_current_week}=    Get Current Week
    Should Be True    ${response_current_week.status_code} == 200    msg=Get current week failed with status code ${response_current_week.status_code}
    VAR    ${json}    ${response_current_week.json()}
    ${response_create_dish}=    Create Dish    week_id=${json}[id]    name=${dish_name}    start_date=invalid-date    end_date=${end_day}
    Should Be True    ${response_create_dish.status_code} == 422    msg=Create dish with invalid date did not return status code 422, but ${response_create_dish.status_code}
    VAR   ${error_json}    ${response_create_dish.json()}
    Dictionary Should Contain Key    ${error_json}    detail    msg=Error response does not contain 'detail' key
    Should Be True    ${error_json}[detail]    msg=Error response 'detail'
