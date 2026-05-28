*** Settings ***
Documentation       EP-3 · Account & login (FR-A) acceptance — AC skeleton (T-2.3).
...                 Body lands in T-3.1; endpoints in T-3.2.

Resource            ../resources/api_session.resource

Suite Setup         Create API Session
Suite Teardown      Delete API Sessions


*** Test Cases ***
Valid Claim Token Activates Account And Cannot Be Reused (AC-11)
    [Tags]    AC-11    FR-A3    skeleton
    Skip    skeleton — body lands in T-3.1, implementation in T-3.2
