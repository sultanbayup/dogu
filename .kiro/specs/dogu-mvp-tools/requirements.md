# Requirements Document

## Introduction

This document specifies the five MVP tools for the Dogu platform: Team Splitter, Spin Wheel, Split Bill, QR Generator, and Random Picker. Each tool is a self-contained React component registered in the tool registry at `src/tools/registry.ts` and mounted under `src/tools/{slug}/`. All tools are client-side only (no backend), mobile-first, and follow the Japanese utility minimalism design philosophy. They integrate with the existing `useLocalStorage` hook for input persistence, the `useUrlHashState` hook for shareable URL state, the `ToolLayout` wrapper, and shared components (`CopyButton`, `ResultCard`).

---

## Glossary

- **Tool_Registry**: The read-only array exported from `src/tools/registry.ts` that holds all `ToolMetadata` entries.
- **ToolMetadata**: The interface `{ slug, name, description, category, icon, popular, component }` defined in `registry.ts`.
- **Tool_Layout**: The `ToolLayout` component from `src/layouts/ToolLayout.tsx` that wraps every tool page with the shared header, back link, and title.
- **URL_State_Encoder**: The `encodeState` / `decodeState` utilities in `src/utils/urlState.ts` used by `useUrlHashState`.
- **LocalStorage_Hook**: The `useLocalStorage` hook from `src/hooks/useLocalStorage.ts`.
- **Hash_State_Hook**: The `useUrlHashState` hook from `src/hooks/useUrlHashState.ts`.
- **Copy_Button**: The `CopyButton` shared component from `src/components/CopyButton.tsx`.
- **Result_Card**: The `ResultCard` shared component from `src/components/ResultCard.tsx`.
- **Team_Splitter**: The tool at slug `team-splitter` that randomly divides a list of names into teams.
- **Spin_Wheel**: The tool at slug `spin-wheel` that animates a spinning wheel and picks a random item.
- **Split_Bill**: The tool at slug `split-bill` that calculates per-person amounts from a shared bill.
- **QR_Generator**: The tool at slug `qr-generator` that generates QR codes client-side.
- **Random_Picker**: The tool at slug `random-picker` that picks random items or numbers from a user-defined list.
- **Balanced_Mode**: A Team_Splitter mode where all teams differ in size by at most one member.
- **Weighted_Spin**: A Spin_Wheel mode where each item carries a numeric weight that proportionally affects its probability of being selected.
- **Service_Charge**: A percentage added to the subtotal in Split_Bill before dividing among people.
- **Tax**: A percentage added to the subtotal in Split_Bill before dividing among people.
- **WiFi_QR**: A QR code encoding a WiFi network credential string in the format `WIFI:T:{auth};S:{ssid};P:{password};;`.
- **Slug**: A lowercase alphanumeric-and-hyphen identifier matching `^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$`.

---

## Requirements

### Requirement 1: Tool Registry Integration

**User Story:** As a platform maintainer, I want all five MVP tools registered in the Tool_Registry, so that the homepage, routing, and search features discover them automatically.

#### Acceptance Criteria

1. THE Tool_Registry SHALL contain exactly one entry for each of the five slugs: `team-splitter`, `spin-wheel`, `split-bill`, `qr-generator`, and `random-picker`.
2. WHEN `validateRegistry` is called with the Tool_Registry array, THE Tool_Registry SHALL pass validation without throwing an error.
3. THE Tool_Registry entry for `team-splitter` SHALL have `category: 'random'` and `popular: true`.
4. THE Tool_Registry entry for `spin-wheel` SHALL have `category: 'random'` and `popular: true`.
5. THE Tool_Registry entry for `split-bill` SHALL have `category: 'calculator'` and `popular: true`.
6. THE Tool_Registry entry for `qr-generator` SHALL have `category: 'generator'` and `popular: false`.
7. THE Tool_Registry entry for `random-picker` SHALL have `category: 'random'` and `popular: false`.
8. WHEN a user navigates to a tool's route, THE Tool_Registry SHALL load that tool's component code via a dynamic `import()` such that the component code is not included in the initial bundle loaded by the Homepage.
9. WHEN a tool slug is looked up via `findTool` and the slug matches a registered entry, THE Tool_Registry SHALL return the matching `ToolMetadata` entry; IF the slug does not match any registered entry, THEN `findTool` SHALL return `undefined`.

---

### Requirement 2: Team Splitter — Input

**User Story:** As a Mobile Legends player or friend-group organizer, I want to enter a list of names and configure team settings, so that I can generate balanced random teams quickly on my phone.

#### Acceptance Criteria

1. THE Team_Splitter SHALL render inside a `Tool_Layout` with the title "Team Splitter".
2. THE Team_Splitter SHALL provide a multi-line text input where each non-empty, non-whitespace-only line is treated as one participant name; the input SHALL accept up to 100 participant names and each name SHALL be at most 50 characters.
3. WHEN the text input is empty, contains fewer than two non-empty lines, or the number of participants is less than the number of teams, THE Team_Splitter SHALL disable the generate button.
4. THE Team_Splitter SHALL provide a numeric input for the number of teams, accepting integer values from 2 to 20 inclusive.
5. IF the number of teams entered is less than 2 or greater than 20, THEN THE Team_Splitter SHALL display an inline validation message stating the value must be between 2 and 20, and SHALL disable the generate button.
6. THE Team_Splitter SHALL provide a toggle for Balanced_Mode that is enabled by default.
7. THE Team_Splitter SHALL persist the names input, team count, and Balanced_Mode toggle state to localStorage via the LocalStorage_Hook using the key `team-splitter`.
8. WHEN the page loads with a non-empty URL hash, THE Team_Splitter SHALL decode the hash via the Hash_State_Hook and populate the result display with the decoded team assignment.

---

### Requirement 3: Team Splitter — Generation and Output

**User Story:** As a user, I want to generate random teams and share or copy the result, so that I can distribute it to my group instantly.

#### Acceptance Criteria

1. WHEN the generate button is activated, THE Team_Splitter SHALL randomly assign all participant names to the specified number of teams.
2. WHILE Balanced_Mode is enabled, THE Team_Splitter SHALL assign teams such that no two teams differ in size by more than one member.
3. WHEN a result is generated, THE Team_Splitter SHALL display the result in a `Result_Card` showing each team labeled "Team 1", "Team 2", etc., with its assigned members listed below the label.
4. WHEN the generate button is activated and a result is already displayed, THE Team_Splitter SHALL provide a reroll button in the result area that, when activated, generates a new random assignment from the same input without requiring the user to re-enter names.
5. WHEN a result is generated, THE Team_Splitter SHALL encode the team assignment into the URL hash via the Hash_State_Hook so the result is shareable via URL.
6. THE `Result_Card` copy payload SHALL be a plain-text representation of all teams and their members, with each team on its own line and members listed as a comma-separated sequence on that line.
7. WHEN the URL hash contains a valid encoded team assignment, THE Team_Splitter SHALL display that assignment in the result area on page load without requiring the user to press generate.
8. IF the URL hash cannot be decoded, THEN THE Team_Splitter SHALL display the input form in its default state.

---

### Requirement 4: Team Splitter — Correctness Properties

**User Story:** As a developer, I want the team-splitting algorithm to be provably correct, so that results are always fair and complete.

#### Acceptance Criteria

1. FOR ALL valid inputs of N names (2 ≤ N ≤ 100) split into K teams (2 ≤ K ≤ 20, K ≤ N), THE Team_Splitter algorithm SHALL assign every name to exactly one team (no name is omitted or duplicated).
2. FOR ALL valid inputs where N ≥ K, THE Team_Splitter algorithm SHALL produce exactly K teams, each containing at least one member.
3. WHILE Balanced_Mode is enabled, FOR ALL valid inputs of N names split into K teams, THE Team_Splitter algorithm SHALL produce teams where `max(team sizes) - min(team sizes) ≤ 1`.
4. FOR ALL valid team assignments encoded then decoded via the URL_State_Encoder, THE Team_Splitter SHALL recover an assignment with the same number of teams and the same set of members in each team (order-insensitive within teams).
5. IF the number of participants N is less than the number of teams K, THEN THE Team_Splitter SHALL not attempt generation and SHALL display an inline validation message.

---

### Requirement 5: Spin Wheel — Input and Configuration

**User Story:** As a user, I want to configure a list of items on a spin wheel, so that I can randomly pick one with a satisfying animation.

#### Acceptance Criteria

1. THE Spin_Wheel SHALL render inside a `Tool_Layout` with the title "Spin Wheel".
2. THE Spin_Wheel SHALL provide a list editor where users can add, edit, and remove text items; the list SHALL support between 2 and 50 non-empty, non-whitespace-only items, each at most 100 characters.
3. IF the item list contains fewer than 2 valid items, THEN THE Spin_Wheel SHALL disable the spin button.
4. THE Spin_Wheel SHALL persist the item list, Weighted_Spin toggle state, and all item weights to localStorage via the LocalStorage_Hook using the key `spin-wheel`.
5. WHERE Weighted_Spin is enabled, THE Spin_Wheel SHALL display a numeric weight input (integer from 1 to 1000 inclusive) alongside each item.
6. WHERE Weighted_Spin is enabled, THE Spin_Wheel SHALL select items with probability proportional to each item's weight relative to the total weight of all items.
7. WHERE Weighted_Spin is disabled, THE Spin_Wheel SHALL treat all items as having equal weight.
8. THE Spin_Wheel SHALL provide a toggle to enable or disable Weighted_Spin; the toggle SHALL default to disabled.
9. IF a weight input value is outside the range 1–1000 or is not a valid integer, THEN THE Spin_Wheel SHALL display an inline validation message for that item and SHALL disable the spin button.

---

### Requirement 6: Spin Wheel — Animation and Result

**User Story:** As a user, I want a smooth spinning animation and a clear result display, so that the experience feels engaging and the outcome is unambiguous.

#### Acceptance Criteria

1. WHEN the spin button is activated, THE Spin_Wheel SHALL animate the wheel for a minimum of 2 seconds and a maximum of 8 seconds before displaying the result.
2. WHILE the wheel is spinning, THE Spin_Wheel SHALL disable the spin button to prevent concurrent spins.
3. WHEN the spin animation completes, THE Spin_Wheel SHALL visually align the wheel's pointer or indicator with the winning segment so the selected item is unambiguous.
4. WHEN the spin animation completes, THE Spin_Wheel SHALL trigger a confetti animation unless the user's `prefers-reduced-motion` media query is active.
5. THE Spin_Wheel SHALL provide a fullscreen toggle that expands the wheel canvas to fill the viewport; activating the toggle again SHALL collapse the wheel back to its default size.
6. IF `prefers-reduced-motion` is active, THEN THE Spin_Wheel SHALL skip the spin animation and display the result immediately without motion.
7. THE Spin_Wheel SHALL render the wheel using an HTML `<canvas>` element or CSS-based segments, with each item displayed as a labeled segment.
8. WHEN a result is produced, THE Spin_Wheel SHALL display the winning item in a `Result_Card`.
9. WHEN a new spin begins, THE Spin_Wheel SHALL clear the previous `Result_Card` result before the new animation starts.

---

### Requirement 7: Spin Wheel — Correctness Properties

**User Story:** As a developer, I want the wheel selection logic to be provably correct, so that results are statistically fair.

#### Acceptance Criteria

1. FOR ALL item lists with equal weights, THE Spin_Wheel selection function SHALL return an index within `[0, items.length - 1]`, and each index SHALL be selected with probability 1/N where N is the number of items.
2. WHERE Weighted_Spin is enabled, FOR ALL item lists with valid weights (integers 1–1000), THE Spin_Wheel selection function SHALL return an index within `[0, items.length - 1]` with probability proportional to that item's weight divided by the total weight.
3. FOR ALL item lists, THE Spin_Wheel selection function SHALL never return an index outside `[0, items.length - 1]`.
4. IF any item has a weight of 0, a negative value, or a non-integer value, THEN THE Spin_Wheel selection function SHALL not be invoked and the spin button SHALL remain disabled.

---

### Requirement 8: Split Bill — Input

**User Story:** As someone splitting a restaurant bill, I want to enter the total amount, number of people, and optional tax and service charge, so that I can instantly see how much each person owes.

#### Acceptance Criteria

1. THE Split_Bill SHALL render inside a `Tool_Layout` with the title "Split Bill".
2. THE Split_Bill SHALL provide a numeric input for the bill subtotal, accepting positive decimal values greater than 0 and at most 999,999,999.99; the field SHALL start empty with no default value.
3. THE Split_Bill SHALL provide a numeric input for the number of people, accepting integer values from 1 to 100 inclusive; the field SHALL default to 1.
4. THE Split_Bill SHALL provide a numeric input for tax percentage, accepting decimal values from 0 to 100 inclusive; the field SHALL default to 0.
5. THE Split_Bill SHALL provide a numeric input for Service_Charge percentage, accepting decimal values from 0 to 100 inclusive; the field SHALL default to 0.
6. IF the subtotal field is blank, zero, or negative, THEN THE Split_Bill SHALL display an inline validation message and disable the calculate button.
7. IF the number of people is less than 1 or greater than 100, THEN THE Split_Bill SHALL display an inline validation message and disable the calculate button.
8. THE Split_Bill SHALL persist all input fields to localStorage via the LocalStorage_Hook using the key `split-bill`.

---

### Requirement 9: Split Bill — Calculation and Output

**User Story:** As a user, I want to see a clear breakdown of the total and per-person amount, so that I can share it with my group.

#### Acceptance Criteria

1. WHILE all inputs are valid, THE Split_Bill SHALL compute the total as `subtotal × (1 + tax/100) × (1 + serviceCharge/100)`.
2. WHILE all inputs are valid, THE Split_Bill SHALL compute the per-person amount as `total / numberOfPeople`, rounded to 2 decimal places using half-up rounding.
3. THE Split_Bill SHALL display the result in a `Result_Card` showing: subtotal, tax amount, service charge amount, total, and per-person amount; the `Result_Card` SHALL be hidden until at least one valid calculation has been performed.
4. THE `Result_Card` copy payload SHALL be a plain-text summary listing all five values from criterion 3.
5. WHEN any input field changes and all inputs are valid, THE Split_Bill SHALL recalculate and update the result display within 100 milliseconds without requiring the user to press a button.
6. THE Split_Bill SHALL display all monetary values formatted to 2 decimal places.
7. IF any input becomes invalid after a result is displayed, THEN THE Split_Bill SHALL hide the `Result_Card` and show the relevant inline validation message.

---

### Requirement 10: Split Bill — Correctness Properties

**User Story:** As a developer, I want the bill calculation to be provably correct, so that rounding and arithmetic are always accurate.

#### Acceptance Criteria

1. FOR ALL valid inputs (subtotal > 0 and ≤ 999,999,999.99, numberOfPeople ∈ [1,100], tax ∈ [0,100], serviceCharge ∈ [0,100]), THE Split_Bill calculation SHALL satisfy: `perPerson × numberOfPeople` is within ±`0.01 × numberOfPeople` of the computed total (rounding tolerance).
2. FOR ALL valid inputs where tax is 0 and serviceCharge is 0, THE Split_Bill calculation SHALL produce a total that equals the subtotal within floating-point precision (difference < 0.001).
3. FOR ALL valid inputs, THE Split_Bill calculation SHALL produce a perPerson amount greater than 0.00 after rounding to 2 decimal places.

---

### Requirement 11: QR Generator — Input

**User Story:** As a user, I want to generate a QR code for a URL or WiFi network, so that I can share it instantly without any server round-trip.

#### Acceptance Criteria

1. THE QR_Generator SHALL render inside a `Tool_Layout` with the title "QR Generator".
2. THE QR_Generator SHALL provide a mode selector with two options: "URL" and "WiFi"; the mode SHALL default to "URL" on first load.
3. WHILE the "URL" mode is selected, THE QR_Generator SHALL display a single text input for the URL.
4. WHILE the "WiFi" mode is selected, THE QR_Generator SHALL display inputs for: SSID (network name), password, and authentication type (WPA/WEP/nopass); the authentication type SHALL default to "WPA".
5. THE QR_Generator SHALL generate the QR code entirely client-side using a JavaScript QR library with no network requests during QR generation.
6. THE QR_Generator SHALL persist the last-used mode, URL value, SSID value, password value, and authentication type to localStorage via the LocalStorage_Hook using the key `qr-generator`.
7. WHEN the URL input is empty or contains only whitespace, THE QR_Generator SHALL disable QR generation and display a visible prompt indicating a URL must be entered.
8. WHEN the SSID input is empty or contains only whitespace in WiFi mode, THE QR_Generator SHALL disable QR generation and display a visible prompt indicating an SSID must be entered.
9. WHEN the user switches between URL and WiFi modes, THE QR_Generator SHALL preserve the previously entered values for each mode independently.

---

### Requirement 12: QR Generator — Output and Download

**User Story:** As a user, I want to see the QR code immediately and download it as a PNG, so that I can use it in documents or share it as an image.

#### Acceptance Criteria

1. WHEN valid input of at least 1 non-whitespace character is provided, THE QR_Generator SHALL render the QR code as an image within 300 milliseconds of the last input change event.
2. THE QR_Generator SHALL render the QR code at a minimum size of 256 × 256 CSS pixels.
3. THE QR_Generator SHALL provide a download button that saves the QR code as a PNG file named `dogu-qr.png`; the download button SHALL be disabled when no QR code is currently rendered.
4. WHILE the URL mode is active and the URL input is non-empty, THE QR_Generator SHALL encode the URL value directly as the QR code data.
5. WHILE the WiFi mode is active and SSID is non-empty, THE QR_Generator SHALL encode the WiFi_QR string `WIFI:T:{auth};S:{ssid};P:{password};;` as the QR code data; for `nopass` auth type, the password field SHALL be omitted (empty string in the `P:` field).
6. IF QR encoding fails for any reason in either URL or WiFi mode, THEN THE QR_Generator SHALL display an inline error message, SHALL remove the previously rendered QR image, and SHALL disable the download button.

---

### Requirement 13: QR Generator — Correctness Properties

**User Story:** As a developer, I want the WiFi QR string encoding to be provably correct, so that generated codes are always scannable.

#### Acceptance Criteria

1. FOR ALL non-empty SSID values and valid auth types (WPA, WEP, nopass), THE QR_Generator WiFi string encoder SHALL produce a string matching the pattern `WIFI:T:{auth};S:{ssid};P:{password};;` where special characters (`;`, `\`, `"`, `,`) in SSID and password values are escaped with a preceding backslash.
2. FOR ALL WiFi QR strings produced by the encoder, THE QR_Generator SHALL be able to re-parse the string and recover the original SSID, password (with escape sequences resolved), and auth type (round-trip property).
3. FOR ALL WiFi QR strings where auth type is `nopass`, THE QR_Generator encoder SHALL produce a string where the `P:` field contains an empty string.

---

### Requirement 14: Random Picker — Input

**User Story:** As a user, I want to enter a list of names or items and pick one at random, so that I can make quick decisions without bias.

#### Acceptance Criteria

1. THE Random_Picker SHALL render inside a `Tool_Layout` with the title "Random Picker".
2. THE Random_Picker SHALL provide a multi-line text input where each non-empty, non-whitespace-only line is treated as one item; the input SHALL accept up to 200 items and each item SHALL be at most 200 characters.
3. IF the item list contains fewer than 1 valid item, THEN THE Random_Picker SHALL disable the pick button.
4. THE Random_Picker SHALL provide a "Pick Random" button that selects one item uniformly at random from the list.
5. THE Random_Picker SHALL provide a "Shuffle List" button that reorders all items in a random permutation and displays the shuffled list.
6. THE Random_Picker SHALL provide a random number generator section with inputs for minimum and maximum integer values (both inclusive), each accepting integers in the range −999,999,999 to 999,999,999.
7. IF the minimum value is greater than or equal to the maximum value in the number generator, THEN THE Random_Picker SHALL disable the generate number button and display an inline validation message stating the minimum must be less than the maximum.
8. THE Random_Picker SHALL persist the item list and number generator bounds to localStorage via the LocalStorage_Hook using the key `random-picker`.

---

### Requirement 15: Random Picker — Output

**User Story:** As a user, I want to see the picked item or number clearly and be able to reroll instantly, so that the tool feels fast and fun.

#### Acceptance Criteria

1. WHEN the pick button is activated, THE Random_Picker SHALL display the selected item in a `Result_Card`.
2. WHEN the generate number button is activated, THE Random_Picker SHALL display the generated integer in a `Result_Card`.
3. WHEN a result is displayed, THE Random_Picker SHALL show a reroll button in the result area; WHEN the reroll button is activated, THE Random_Picker SHALL perform a new pick or number generation of the same type (item pick or number generation) from the current inputs without requiring re-entry; IF the current inputs are invalid at reroll time, THE reroll button SHALL be disabled.
4. THE `Result_Card` copy payload for a picked item SHALL be the item text.
5. THE `Result_Card` copy payload for a generated number SHALL be the number as a decimal string with no leading zeros.
6. WHEN the shuffle button is activated, THE Random_Picker SHALL display the shuffled list in the input area, replacing the original order.

---

### Requirement 16: Random Picker — Correctness Properties

**User Story:** As a developer, I want the random selection and shuffle logic to be provably correct, so that all items have a fair chance of being selected.

#### Acceptance Criteria

1. FOR ALL item lists of length N ≥ 1, THE Random_Picker pick function SHALL return an index within `[0, N - 1]`.
2. FOR ALL item lists, THE Random_Picker shuffle function SHALL return a permutation containing exactly the same items as the input (no items added or removed), and every possible permutation of the input SHALL be reachable.
3. FOR ALL valid min/max pairs where min < max and both values are integers in [−999,999,999, 999,999,999], THE Random_Picker number generator SHALL return an integer within `[min, max]` inclusive and SHALL never return a value outside that range.

---

### Requirement 17: Shared UX — Mobile-First and Accessibility

**User Story:** As a mobile user, I want all tools to be fully usable on a small screen with touch targets large enough to tap accurately, so that I can use Dogu comfortably from my phone.

#### Acceptance Criteria

1. THE Tool_Layout SHALL render all five tools within a single-column layout on viewports narrower than 640 CSS pixels.
2. THE Team_Splitter, Spin_Wheel, Split_Bill, QR_Generator, and Random_Picker SHALL each provide all interactive controls — including buttons, text inputs, numeric inputs, selects, and toggles — with a minimum tap target size of 44 × 44 CSS pixels.
3. WHEN a tool produces a result, THE tool SHALL display the result within the visible viewport without requiring any scrolling on a 375 × 667 CSS pixel viewport (iPhone SE size).
4. THE Team_Splitter, Spin_Wheel, Split_Bill, QR_Generator, and Random_Picker SHALL each ensure every interactive control has either a non-empty `aria-label` attribute or an associated `<label>` element with non-empty text.
5. IF `prefers-reduced-motion` is active, THEN THE Spin_Wheel SHALL skip all CSS animations, canvas spin animations, and confetti animations, and SHALL display the result immediately.

---

### Requirement 18: Shared UX — Performance and Instant Interaction

**User Story:** As a user, I want every tool to respond instantly to my input, so that the experience feels fast and lightweight.

#### Acceptance Criteria

1. WHEN valid input of at least 1 non-whitespace character is entered in the QR_Generator, THE QR_Generator SHALL produce a visible QR code within 300 milliseconds of the last input change event, with no network requests made during QR generation.
2. THE Split_Bill SHALL update the result display within 100 milliseconds of any input field change when all inputs are valid.
3. WHEN the user activates the action button in Team_Splitter, Random_Picker, or Spin_Wheel (after the spin animation completes), THE tool SHALL display its result within 100 milliseconds of the activation event.
4. WHEN a user navigates to a tool's route, THE Dogu_Platform SHALL fetch that tool's component code at that point and SHALL not include that tool's code in the bundle loaded by the Homepage.
