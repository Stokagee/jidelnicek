*** Settings ***
Documentation       Page-object for the Cook summary screen, admin-only (§14.5,
...                 FR-K1/FR-K2/FR-K3, FR-W2; AC-4): per-day "cook N portions of dish X",
...                 plus create-dish / set-chooser actions. Selectors provisional until
...                 T-7.3 ships the screen.

Library             Browser
Resource            ../browser_session.resource


*** Variables ***
${SUMMARY_ROOT}         [data-testid="cook-summary"]
# Per-day, per-dish total: [data-testid="summary-<iso_date>-<dish_id>"].
${SUMMARY_CELL}         [data-testid="summary-%s-%s"]
${CREATE_DISH_ACTION}   [data-testid="action-create-dish"]
${SET_CHOOSER_ACTION}   [data-testid="action-set-chooser"]


*** Keywords ***
Open Cook Summary
    Open App    /cook-summary

Summary Should Be Visible
    Get Element States    ${SUMMARY_ROOT}    contains    visible

Summary Cell Should Show Portions
    [Arguments]    ${iso_date}    ${dish_id}    ${expected}
    Get Text    ${SUMMARY_CELL % (${iso_date}, ${dish_id})}    contains    ${expected}

Admin Actions Should Be Visible
    [Documentation]    Admin-only controls (FR-W2): create dish, set chooser.
    Get Element States    ${CREATE_DISH_ACTION}    contains    visible
    Get Element States    ${SET_CHOOSER_ACTION}    contains    visible
