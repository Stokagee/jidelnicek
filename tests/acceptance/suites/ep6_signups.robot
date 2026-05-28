*** Settings ***
Documentation       EP-6 · Signups (FR-S) acceptance — AC skeleton (T-2.3).
...                 Body lands in T-6.1; endpoints in T-6.2.

Resource            ../resources/api_session.resource

Suite Setup         Create API Session
Suite Teardown      Delete API Sessions


*** Test Cases ***
Signup For A Day Outside The Dish Block Is Rejected (AC-1)
    [Tags]    AC-1    FR-S1    BR-2    skeleton
    Skip    skeleton — body lands in T-6.1, implementation in T-6.2
