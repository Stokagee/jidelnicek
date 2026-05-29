*** Settings ***
Documentation       Frontend acceptance harness proof-of-life (EP-10 / T-10.0). Confirms
...                 Browser Library + the browser_session/page-object resources load and
...                 that the cookies-only assertions are wired. Tagged `notready` so it
...                 reports SKIPPED (not failed) until the screens land and a running
...                 web (5173) + api (8000) are available — the FE analogue of the
...                 backend's `notready` acceptance pattern. Run with:
...                 `robot --skiponfailure notready tests/acceptance/suites/fe_*.robot`.

Resource            ../resources/browser_session.resource
Resource            ../resources/pages/login_page.resource

Suite Teardown      Close App


*** Test Cases ***
Web App Loads On A Mobile Viewport
    [Documentation]    Opens the app root in a 360px context and asserts the cookies-only
    ...    invariant holds before login (no session cookie absent of auth, empty storage).
    [Tags]    smoke    notready    FR-A5
    Open App    /
    Local Storage Should Be Empty
