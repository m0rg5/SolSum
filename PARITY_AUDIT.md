# Sol Sum Parity Audit - mm_1.6

## Current Working State
- [x] **Chat Protocol**: Uses JSON `{ summary, expanded }`. Distinct versions for brief vs detailed answers.
- [x] **Persistence**: Items, Charging, Battery, and Chat history persist via localStorage in `App.tsx`.
- [x] **Spec Asst**: Auto-triggers technical spec lookup via tool-calling.
- [x] **Management Items**: MPPTs and Inverters are identified, visually greyed out, and excluded from energy totals.
- [x] **Font Standards**: Standardized `font-black` and tracking across all major UI headers to match ChatBox title style.

## UI Requirements
- [x] **Battery Life**: Renamed "0% SOLAR" to "0%".
- [x] **Battery Life**: Replaced "Sustained" text with "∞".
- [x] **Battery Life**: Digits are now placed on a new line below the label.
- [x] **ChatBox**: "READ MORE" renamed to "MORE..." and "LESS..." to match user request.
