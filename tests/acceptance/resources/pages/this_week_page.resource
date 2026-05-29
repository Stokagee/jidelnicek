*** Settings ***
Documentation       Page-object for the "This week" screen (§14.3, FR-W1/FR-D1/FR-D2/
...                 FR-K3): the week's dishes with who signed up and the per-dish portion
...                 total. Selectors are provisional until T-7.3 ships the screen.

Library             Browser
Resource            ../browser_session.resource


*** Variables ***
${WEEK_ROOT}        [data-testid="this-week"]
# A dish card is addressed by its id: [data-testid="dish-<id>"].
${DISH_CARD}        [data-testid="dish-%s"]
${DISH_TOTAL}       [data-testid="dish-%s-total"]


*** Keywords ***
Open This Week
    Open App    /

Dish Card Should Be Visible
    [Arguments]    ${dish_id}
    Get Element States    ${DISH_CARD % ${dish_id}}    contains    visible

Dish Portion Total Should Be
    [Arguments]    ${dish_id}    ${expected}
    Get Text    ${DISH_TOTAL % ${dish_id}}    contains    ${expected}
