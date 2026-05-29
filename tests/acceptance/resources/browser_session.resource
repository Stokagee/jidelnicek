*** Settings ***
Documentation       Shared browser-acceptance keywords (Browser Library / Playwright):
...                 app lifecycle on a 360px mobile context (mobile-first is a spec
...                 rule), plus assertions for the cookies-only session model (FR-A5):
...                 the httpOnly session cookie is present and localStorage stays empty.
...                 Pattern across the fe_* suites: SEED over HTTP (api_session.resource),
...                 DRIVE over the browser. Requires a running web (5173) and api (8000),
...                 and a one-time `rfbrowser init`. Page-objects live under pages/.

Library             Browser
Resource            api_session.resource


*** Variables ***
${WEB_BASE_URL}         http://127.0.0.1:5173
${HEADLESS}             ${True}
${SESSION_COOKIE}       jidelnicek_session


*** Keywords ***
Open App
    [Documentation]    Launch a headless browser on a 360x800 mobile viewport and open
    ...    the web app. One context per suite keeps cookies/localStorage isolated.
    [Arguments]    ${path}=/
    New Browser    chromium    headless=${HEADLESS}
    New Context    viewport={'width': 360, 'height': 800}
    New Page    ${WEB_BASE_URL}${path}

Close App
    [Documentation]    Tear down all browser state between suites.
    Close Browser    ALL

Cookie Session Should Be Set
    [Documentation]    The httpOnly session cookie exists after login (FR-A5).
    ${cookie}=    Get Cookie    ${SESSION_COOKIE}
    Should Not Be Empty    ${cookie.value}

Local Storage Should Be Empty
    [Documentation]    No tokens persisted in localStorage — cookies-only rule (FR-A5).
    ${count}=    Evaluate JavaScript    ${None}    () => window.localStorage.length
    Should Be Equal As Integers    ${count}    0
