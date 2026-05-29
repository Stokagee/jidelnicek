*** Settings ***
Documentation       Page-object for the chooser's "propose dish" / create-edit dish form
...                 (§14.5 extra, FR-D1/FR-D2/FR-W4; AC-5, AC-6): name + day block inside
...                 the current week. Visible to admin always, to the chooser only for
...                 their week. Selectors provisional until T-4.3/T-5.3 ship the screen.

Library             Browser
Resource            ../browser_session.resource


*** Variables ***
${PROPOSE_ACTION}   [data-testid="action-propose-dish"]
${DISH_NAME}        [data-testid="dish-name"]
${DISH_START}       [data-testid="dish-start-date"]
${DISH_END}         [data-testid="dish-end-date"]
${DISH_SUBMIT}      [data-testid="dish-submit"]


*** Keywords ***
Propose Action Should Be Visible
    [Documentation]    AC-5/AC-6: the chooser (or admin) sees the propose action.
    Get Element States    ${PROPOSE_ACTION}    contains    visible

Propose Action Should Be Absent
    [Documentation]    AC-5/FR-W4: a non-chooser member must not see the propose action.
    Get Element Count    ${PROPOSE_ACTION}    ==    0

Propose Dish
    [Arguments]    ${name}    ${start_date}    ${end_date}
    Click    ${PROPOSE_ACTION}
    Fill Text    ${DISH_NAME}    ${name}
    Fill Text    ${DISH_START}    ${start_date}
    Fill Text    ${DISH_END}    ${end_date}
    Click    ${DISH_SUBMIT}
