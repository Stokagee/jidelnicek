*** Settings ***
Documentation       EP-4 · Week & chooser (FR-W) acceptance — AC skeleton (T-2.3).
...                 Body lands in T-4.1; endpoints in T-4.2.

Resource            ../resources/api_session.resource

Suite Setup         Create API Session
Suite Teardown      Delete API Sessions


*** Test Cases ***
Non-Chooser Member Cannot Create A Dish (AC-5)
    [Tags]    AC-5    FR-W4    BR-6    skeleton
    Skip    skeleton — body lands in T-4.1, implementation in T-4.2
