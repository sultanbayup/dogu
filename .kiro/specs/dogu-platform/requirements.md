# Requirements Document

## Introduction

Dogu (道具 — Japanese for "tools/utility") is a collection of tiny, fast, daily-use web tools. This specification covers the **platform foundation only** — the homepage, tool catalog system, routing, shared components, theme system, PWA shell, and shared utilities (localStorage, URL hash state, clipboard, analytics) that every individual tool will depend on.

Individual tools (Team Splitter, Spin Wheel, Split Bill, etc.) are out of scope and will be authored as separate specs that register against this platform.

The product feel is "Japanese utility minimalism": dark, calm, fast, mobile-first, instantly usable. The platform must be installable as a PWA, work offline, ship as a static site, and require no backend.

## Glossary

- **Dogu_Platform**: The static React + Vite web application that hosts the tool catalog and shared infrastructure described in this document.
- **Tool_Registry**: An in-source typed list of all tools available in the platform; the single source of truth for tool metadata.
- **Tool_Metadata**: A record describing a single tool, containing at minimum a slug, display name, short description, category, icon reference, popular flag, and lazy-loaded component reference.
- **Homepage**: The page rendered at the "/" route, containing the wordmark, tagline, Search_Bar, Popular section, and All Tools grid.
- **Tool_Page**: The page rendered at "/tools/{slug}" that hosts an individual tool inside the Tool_Layout.
- **Router**: The client-side router responsible for matching URL paths to pages.
- **Tool_Layout**: The shared page layout wrapping every Tool_Page with a Header, a back-to-home link, the tool title, and a content area.
- **Header**: The shared top-of-page component containing the Dogu logo and a link back to the Homepage.
- **Tool_Card**: The card component representing a single tool in the All Tools grid and Popular section.
- **Search_Bar**: The input component used to filter tools on the Homepage.
- **Copy_Button**: The button component that writes a supplied text payload to the system clipboard.
- **Empty_State**: The component rendered when a section has no content to show.
- **Result_Card**: The card component used by tools to present their output, with a built-in Copy_Button.
- **Theme_System**: The token-based set of colors, typography, radii, and motion timings applied across the platform.
- **LocalStorage_Hook**: A React hook that reads and writes JSON-serializable values to `localStorage` under the `dogu:` namespace.
- **URL_State_Encoder**: A utility that encodes and decodes JSON-serializable state to and from a base64url string suitable for the URL hash.
- **Service_Worker**: The script that caches the application shell and previously visited routes for offline use.
- **Manifest**: The Web App Manifest declaring the installable PWA.
- **Analytics_Module**: The Plausible Analytics integration that records page-view events.
- **Not_Found_Page**: The page rendered when no route matches the current URL.

## Requirements

### Requirement 1: Tool Registry

**User Story:** As a developer adding a new tool, I want to register the tool's metadata in a single registry, so that the tool automatically appears in the homepage catalog and is routable without further wiring.

#### Acceptance Criteria

1. THE Tool_Registry SHALL store one Tool_Metadata entry per tool containing a slug (1–64 characters, lowercase a–z, digits 0–9, and hyphens only), a display name (1–60 characters), a short description (1–160 characters), a category drawn from a predefined enumeration, an icon reference, a popular flag (boolean), and a lazy-loaded component reference.
2. WHEN a tool entry is added to the Tool_Registry, THE Dogu_Platform SHALL include the tool in the All Tools grid on the Homepage with no edits required outside that registry entry.
3. WHERE a Tool_Metadata entry has its popular flag set to true, THE Dogu_Platform SHALL include that tool in the Popular section on the Homepage.
4. WHEN a tool is registered with a slug that matches the defined slug format, THE Router SHALL serve the tool at "/tools/{slug}" using that slug.
5. IF two or more tools are registered with the same slug, THEN THE Tool_Registry SHALL fail the build with an error that names the duplicate slug and identifies each conflicting Tool_Metadata entry.
6. IF a Tool_Metadata entry has a slug that does not match the defined format, or has any required field missing or empty, THEN THE Tool_Registry SHALL fail the build with an error that identifies the offending entry and the violated field.
7. THE Tool_Registry SHALL expose a typed read-only list of all registered tools, ordered lexicographically by slug, to the Homepage and the Router.

### Requirement 2: Routing

**User Story:** As a user, I want stable URLs for the homepage and each tool, so that I can bookmark, share, and revisit tools directly.

#### Acceptance Criteria

1. WHEN a user navigates to "/", THE Router SHALL render the Homepage within 1 second of the navigation event.
2. WHEN a user navigates to "/tools/{slug}" where {slug} is a string of 1–64 characters consisting of lowercase a–z, digits 0–9, and hyphens that matches a registered Tool_Metadata slug, THE Router SHALL render that tool inside the Tool_Layout within 1 second of the navigation event.
3. IF a user navigates to a path that does not match "/" or "/tools/{slug}" with a registered slug, including malformed slugs that do not satisfy the defined slug format, THEN THE Router SHALL render the Not_Found_Page.
4. WHEN the Dogu_Platform is served as a static site, THE Router SHALL resolve direct browser navigations and reloads to "/tools/{slug}" without the host returning an HTTP 404 status.
5. WHEN a user activates a Tool_Card via mouse click, tap, or keyboard activation (Enter or Space while the Tool_Card has focus), THE Router SHALL navigate to the corresponding "/tools/{slug}" route using client-side navigation and SHALL push a new entry onto the browser history stack.
6. WHEN a user invokes the browser back or forward control after client-side navigation, THE Router SHALL render the corresponding previous or next page without triggering a full document reload.

### Requirement 3: Homepage

**User Story:** As a visitor, I want a homepage that immediately shows me what tools are available, so that I can pick one without thinking.

#### Acceptance Criteria

1. WHEN the Homepage is loaded, THE Homepage SHALL display the Dogu wordmark, the tagline "Tiny tools that just work.", a Search_Bar, and an All Tools grid.
2. WHEN the Homepage is loaded, THE Homepage SHALL list every tool from the Tool_Registry in the All Tools grid using one Tool_Card per tool, ordered lexicographically by slug.
3. WHEN the Homepage is loaded and the Tool_Registry contains at least one tool whose popular flag is true, THE Homepage SHALL display a Popular section listing each such tool using one Tool_Card per tool, ordered lexicographically by slug.
4. WHILE the Tool_Registry contains zero tools whose popular flag is true, THE Homepage SHALL omit the Popular section.
5. WHEN the Homepage is loaded on a viewport at least 320 pixels wide and at least 568 pixels tall, THE Homepage SHALL render the Dogu wordmark, the tagline, the Search_Bar, and at least one Tool_Card without requiring the visitor to scroll.
6. IF the Tool_Registry contains zero tools, THEN THE Homepage SHALL render the Empty_State with a message indicating that no tools are available.
7. IF retrieving the Tool_Registry fails, THEN THE Homepage SHALL render the Empty_State with a message indicating that tools could not be loaded and SHALL provide a control that retries retrieval.

### Requirement 4: Tool Search and Filtering

**User Story:** As a user, I want to filter tools by typing a keyword, so that I can find a tool faster than scanning the grid.

#### Acceptance Criteria

1. WHEN a user types a non-whitespace character in the Search_Bar, THE Homepage SHALL filter the All Tools grid to tools whose display name or short description contains the trimmed query as a case-insensitive substring.
2. WHEN a user types a character in the Search_Bar, THE Homepage SHALL update the filtered results within 100 milliseconds of the keystroke.
3. WHILE the trimmed Search_Bar query contains at least one non-whitespace character, THE Homepage SHALL hide the Popular section.
4. IF the trimmed Search_Bar query contains at least one non-whitespace character and no tool's display name or short description contains it as a case-insensitive substring, THEN THE Homepage SHALL render the Empty_State indicating no tools match the current query.
5. WHEN the trimmed Search_Bar query becomes empty (whether by user clearing input or deleting all non-whitespace characters), THE Homepage SHALL restore the full All Tools grid.
6. WHEN the trimmed Search_Bar query becomes empty, THE Homepage SHALL restore the Popular section subject to the rules in Requirement 3.
7. THE Search_Bar SHALL accept queries up to 200 characters in length and SHALL ignore further input beyond that bound.

### Requirement 5: Theme System

**User Story:** As a user, I want a calm, dark, modern visual style, so that the app feels fast and unobtrusive on my phone at night.

#### Acceptance Criteria

1. THE Theme_System SHALL apply a dark theme by default with background color #09090B, surface color #18181B, accent color #2563EB, primary text color #FAFAFA, and secondary text color #A1A1AA.
2. THE Theme_System SHALL apply Geist as the primary UI typeface, Inter as the first fallback, and the system sans-serif as the final fallback across all pages and components.
3. THE Theme_System SHALL apply a corner radius of `rounded-2xl` to card components and `rounded-xl` to button components, as defined by the Tailwind default scale.
4. THE Theme_System SHALL expose its color, typography, radius, and motion-timing values as design tokens such that updating a token's value in a single source-of-truth file propagates to every page and component that uses the token.
5. WHEN a user moves pointer focus onto, presses, releases, or moves keyboard focus onto a button, card, or link, THE Theme_System SHALL animate the visual response with a duration of at most 200 milliseconds using an ease-out curve.
6. WHILE the user agent reports the `prefers-reduced-motion: reduce` media query as true, THE Theme_System SHALL disable transition animations on buttons, cards, and links and SHALL apply state changes instantaneously.
7. WHEN the Dogu_Platform is loaded, THE Theme_System SHALL apply the dark theme on first paint with no visible flash of an alternative theme.

### Requirement 6: Shared Components

**User Story:** As a tool developer, I want a set of shared layout and interaction components, so that tools look consistent and I do not reimplement basics.

#### Acceptance Criteria

1. THE Dogu_Platform SHALL provide a Header component that renders the Dogu logo and a link to the "/" route.
2. THE Dogu_Platform SHALL provide a Tool_Layout component that wraps Tool_Pages with the Header, a back-to-home link, a caller-supplied tool title, and a caller-supplied content slot.
3. THE Dogu_Platform SHALL provide a Tool_Card component that renders the caller-supplied tool icon, display name, and short description, and links to the exact "/tools/{slug}" route for the supplied slug.
4. WHEN the user changes the input value of the Search_Bar (including clearing it to empty), THE Search_Bar SHALL emit the current query string to its parent.
5. WHEN a user activates the Copy_Button via mouse click, tap, or keyboard activation (Enter or Space while focused), THE Copy_Button SHALL copy the supplied text payload byte-for-byte to the system clipboard.
6. THE Empty_State component SHALL accept a non-empty message and SHALL accept an optional action element that, when supplied, is rendered below the message.
7. THE Result_Card component SHALL render the caller-supplied output and SHALL embed a Copy_Button bound to a caller-supplied text payload.
8. IF the Copy_Button's clipboard write fails, THEN the Copy_Button SHALL display a visible failure indication and SHALL leave the system clipboard contents unchanged.

### Requirement 7: Copy to Clipboard

**User Story:** As a user, I want a one-tap button to copy a tool's result, so that I can paste it into Discord or WhatsApp.

#### Acceptance Criteria

1. WHEN a user activates the Copy_Button via tap, mouse click, or keyboard (Enter or Space key), THE Copy_Button SHALL write the supplied text payload (up to 100,000 characters) to the system clipboard within 1 second.
2. WHEN a clipboard write succeeds, THE Copy_Button SHALL replace its visible label with a "Copied" confirmation indicator for at least 1 second and at most 3 seconds, then SHALL restore the original button label.
3. IF the clipboard write fails for any reason (including clipboard API unavailable, insecure context, or permission denied), THEN THE Copy_Button SHALL display an error indicator stating that the copy operation failed for at least 2 seconds and at most 4 seconds, SHALL leave the system clipboard contents unchanged, AND SHALL restore the original button label after the error indicator clears.
4. WHILE the supplied text payload is empty or null, THE Copy_Button SHALL remain disabled and SHALL not respond to activation attempts.
5. THE Copy_Button SHALL render with a minimum tap target of 44 by 44 CSS pixels.

### Requirement 8: localStorage Hook

**User Story:** As a tool developer, I want a typed hook to persist state in localStorage, so that I can remember user inputs across sessions without a backend.

#### Acceptance Criteria

1. THE LocalStorage_Hook SHALL accept a non-empty string key (1–128 characters) and a default value, and SHALL return the current value and a setter function.
2. WHEN a tool calls the setter returned by the LocalStorage_Hook, THE LocalStorage_Hook SHALL serialize the new value as JSON, SHALL write the value under the supplied key in localStorage within 50 milliseconds, AND SHALL update the value returned by the hook on the next render.
3. WHEN a tool initializes the LocalStorage_Hook with a key that already exists in localStorage, THE LocalStorage_Hook SHALL parse the stored JSON value and SHALL return the parsed value.
4. WHEN a tool initializes the LocalStorage_Hook with a key that does not exist in localStorage, THE LocalStorage_Hook SHALL return the supplied default value and SHALL NOT write to localStorage until the setter is called.
5. THE LocalStorage_Hook SHALL prefix every key it reads from or writes to localStorage with the namespace "dogu:".
6. IF the value stored under a key cannot be parsed as JSON, THEN THE LocalStorage_Hook SHALL return the supplied default value AND SHALL emit a console warning that includes the offending key.
7. IF localStorage is unavailable, throws a SecurityError, or exceeds quota when the setter is called, THEN THE LocalStorage_Hook SHALL retain the value in memory for the current session, SHALL emit a console warning that includes the offending key and the failure reason, AND SHALL NOT throw an exception to the calling component.
8. IF the value supplied to the setter cannot be serialized as JSON (for example, contains a circular reference or a non-serializable type), THEN THE LocalStorage_Hook SHALL retain the prior value, SHALL emit a console warning that includes the offending key, AND SHALL NOT throw an exception to the calling component.

### Requirement 9: URL Hash State Encoding

**User Story:** As a user, I want a tool's state encoded into the URL, so that I can share a link that reproduces the same result without a backend.

#### Acceptance Criteria

1. THE URL_State_Encoder SHALL accept a JSON-serializable state value of at most 64 KB serialized size and SHALL return a base64url-encoded string of at most 2,048 characters.
2. THE URL_State_Encoder SHALL accept a base64url-encoded string of at most 2,048 characters and SHALL return either the decoded JSON-serializable state value or a typed decode-error result.
3. THE URL_State_Encoder SHALL guarantee that for every JSON-serializable state value within the size bound, decoding the result of encoding that value yields a byte-identical re-serialization of the original value (round-trip property).
4. WHEN a tool writes encoded state to the URL hash, THE Router SHALL preserve the hash on subsequent client-side navigations within the same Tool_Page route and SHALL clear the hash on navigation to a different route.
5. IF the input string is not valid base64url, does not decode to a valid UTF-8 sequence, or does not parse as valid JSON, THEN THE URL_State_Encoder SHALL return a typed decode-error result identifying which of the three failure categories occurred, SHALL leave the URL hash unchanged, AND SHALL NOT throw an unhandled exception.
6. WHEN a Tool_Page is loaded with a non-empty URL hash, THE Tool_Page SHALL initialize its state from the decoded value if decoding succeeds.
7. IF decoding the URL hash fails on Tool_Page load, THEN THE Tool_Page SHALL initialize its state from the tool's defined default state, SHALL emit a console warning that includes the failure category, AND SHALL continue rendering the tool.

### Requirement 10: PWA Shell

**User Story:** As a mobile user, I want to install Dogu to my home screen and use it offline, so that it feels like a native utility app.

#### Acceptance Criteria

1. THE Dogu_Platform SHALL ship a Manifest containing the app name "Dogu", a short name "Dogu", the description "Tiny tools that just work.", a start URL of "/", a maskable icon set including 192×192 and 512×512 PNG icons, the theme color #09090B, the background color #09090B, and a display mode of "standalone".
2. WHEN the Dogu_Platform is loaded for the first time on a device, THE Dogu_Platform SHALL register the Service_Worker AND THE Service_Worker SHALL pre-cache the application shell — defined as the entry HTML, the initial JavaScript bundle, the platform stylesheet, the logo asset, and the manifest — within 30 seconds of registration.
3. IF Service_Worker registration fails, THEN THE Dogu_Platform SHALL continue to operate using direct network requests AND SHALL emit a console warning identifying the failure reason.
4. WHILE the device is offline, THE Service_Worker SHALL serve the cached application shell, the Homepage, and any previously visited Tool_Page within 2 seconds of the navigation event.
5. WHILE the device is offline AND the user navigates to a Tool_Page that has not been previously visited, THE Service_Worker SHALL serve a cached offline fallback page that explains the page is unavailable offline and provides a link back to the Homepage.
6. WHEN a new application version is deployed, THE Service_Worker SHALL fetch the updated assets in the background within 60 seconds of the next page load.
7. WHEN the user performs a full navigation after the Service_Worker has fetched a new application version, THE Service_Worker SHALL activate the new version for that navigation.
8. IF the background fetch of updated assets fails, THEN THE Service_Worker SHALL retain the prior cached version, SHALL retry the fetch on the subsequent page load, AND SHALL NOT interrupt the user's session.
9. THE Dogu_Platform SHALL satisfy the installability criteria required by Chromium-based browsers, including being served over HTTPS, registering a fetch handler in the Service_Worker, and referencing the Manifest from the entry HTML.

### Requirement 11: Analytics

**User Story:** As the operator, I want privacy-friendly usage analytics, so that I can see which tools are popular without showing a cookie banner.

#### Acceptance Criteria

1. WHERE the Dogu_Platform is running in a production build, THE Dogu_Platform SHALL load the Plausible Analytics script in the served HTML for the Homepage and every Tool_Page route.
2. WHEN a user opens the Homepage or any Tool_Page (whether by initial page load or by client-side route change within the same session), THE Analytics_Module SHALL record exactly one page-view event for that route within 2 seconds of the navigation completing.
3. THE Analytics_Module SHALL NOT set any browser cookies.
4. THE Analytics_Module SHALL NOT collect personally identifiable information such as IP addresses, email addresses, names, or tool input data.
5. WHILE the Dogu_Platform is running in development or preview mode, THE Analytics_Module SHALL NOT send events to Plausible.
6. IF the Plausible script fails to load or its event endpoint is unreachable, THEN THE Dogu_Platform SHALL continue to operate without interruption AND SHALL NOT block page rendering or user interaction.

### Requirement 12: Not Found Page

**User Story:** As a user who follows a stale link, I want a clear 404 page that helps me get back, so that I am not stuck.

#### Acceptance Criteria

1. WHEN the Router renders the Not_Found_Page, THE Not_Found_Page SHALL display a "404" indicator, a one-line explanation that the requested page does not exist, and a link labeled in a way that makes its destination clear that navigates to the "/" route.
2. WHEN the Not_Found_Page is rendered, THE Not_Found_Page SHALL render with the same Header and Theme_System styling as the Homepage and every Tool_Page.
3. WHEN the user activates the link to the Homepage from the Not_Found_Page via mouse click, tap, or keyboard activation, THE Router SHALL navigate to the "/" route using client-side navigation.

### Requirement 13: Mobile-first Responsive Layout

**User Story:** As a user on a phone, I want the layout to fit my screen and be tappable, so that I can complete a tool in one screen.

#### Acceptance Criteria

1. THE Dogu_Platform SHALL render every primary action — defined as buttons, links, form controls, and interactive cards — with a minimum tap target size of 44 by 44 CSS pixels and a minimum spacing of 8 CSS pixels between adjacent tap targets.
2. THE Dogu_Platform SHALL render the Homepage and every Tool_Page without horizontal scrolling on viewports between 320 and 1920 CSS pixels wide.
3. WHILE the viewport width is below 768 CSS pixels, THE Homepage SHALL render the All Tools grid in one or two columns.
4. WHILE the viewport width is 768 CSS pixels or wider, THE Homepage SHALL render the All Tools grid in three or four columns.
5. WHEN the Homepage or a Tool_Page is rendered, THE Dogu_Platform SHALL display all primary actions and primary content visibly within the viewport without requiring layout overflow handling that hides content.
6. WHILE the viewport width is below 320 CSS pixels, THE Dogu_Platform SHALL retain the 320 CSS pixel minimum layout and SHALL allow horizontal scrolling rather than truncating content.

### Requirement 14: Performance

**User Story:** As a user, I want the app to feel instant, so that opening a tool is faster than scrolling through a folder of phone apps.

#### Acceptance Criteria

1. WHEN a user opens the Homepage from a cold cache under the Lighthouse mobile throttling profile (4× CPU slowdown, simulated 4G), THE Dogu_Platform SHALL achieve a 75th-percentile Largest Contentful Paint within 2.5 seconds across at least 5 measurement runs.
2. WHEN a user activates a Tool_Card on the Homepage within the same session, THE Router SHALL achieve First Contentful Paint of the corresponding Tool_Page within 200 milliseconds when the tool's chunk is already cached, and within 1 second when the chunk must be fetched over the network under simulated 4G conditions.
3. THE Dogu_Platform SHALL ship an initial JavaScript bundle for the Homepage — defined as the entry chunk plus the vendor and runtime chunks loaded by the Homepage, excluding any tool-specific chunks — of at most 150 kilobytes gzipped.
4. WHEN a user opens a Tool_Page route, THE Router SHALL fetch that tool's implementation chunk only at that point AND THE chunk SHALL not be included in the Homepage initial bundle.
5. IF a tool implementation chunk fails to load due to network error or fetch timeout exceeding 10 seconds, THEN THE Router SHALL render an error message identifying the failure, SHALL provide a retry control, AND SHALL retain the user's prior Homepage state.
6. WHILE a tool implementation chunk fetch exceeds 200 milliseconds, THE Router SHALL display a loading indicator until the chunk is loaded or the fetch fails.

### Requirement 15: Branding

**User Story:** As a user, I want a consistent recognizable mark, so that Dogu feels like a finished product.

#### Acceptance Criteria

1. THE Dogu_Platform SHALL ship a logo composed of four squares arranged in a 2×2 grid with uniform spacing between squares, identical corner radii on all squares, a single foreground color, and a transparent background.
2. WHEN any page of the Dogu_Platform is rendered, THE Header SHALL display the logo with accessible alt text identifying it as the Dogu logo.
3. THE Dogu_Platform SHALL ship a favicon and PWA icon set derived from the logo, including 32×32 and 192×192 PNG icons, a 512×512 PNG icon, and at least one 512×512 maskable icon.
4. WHEN the Homepage is rendered, THE Homepage SHALL display the tagline "Tiny tools that just work." as visible text within the hero region.
5. WHEN a user activates the Header logo via mouse click, tap, or keyboard activation, THE Router SHALL navigate to the "/" route using client-side navigation.

### Requirement 16: Folder Structure

**User Story:** As a developer, I want a defined folder structure, so that I know where to put each kind of code.

#### Acceptance Criteria

1. THE Dogu_Platform SHALL organize all source code under the "src/" directory containing the subdirectories "components/", "tools/", "pages/", "layouts/", "hooks/", "utils/", and "styles/", and SHALL not place source code files directly in "src/" outside these subdirectories except for application entry-point files.
2. THE Dogu_Platform SHALL place layout components reused by two or more pages under "src/layouts/".
3. THE Dogu_Platform SHALL place each tool's implementation under "src/tools/{slug}/", where {slug} is that tool's defined slug identifier, and SHALL contain that tool's tool-specific components, hooks, utilities, and styles within that tool's directory.
4. THE Dogu_Platform SHALL place hooks reused by two or more tools or pages, including the LocalStorage_Hook, under "src/hooks/".
5. THE Dogu_Platform SHALL place interaction components reused by two or more tools or pages under "src/components/".
6. THE Dogu_Platform SHALL place utility modules reused by two or more tools or pages, including the URL_State_Encoder, under "src/utils/".
7. THE Dogu_Platform SHALL place page-level route components under "src/pages/" and global stylesheet files under "src/styles/".

### Requirement 17: Localization Strategy

**User Story:** As a tool developer, I want all platform UI in English while letting individual tools embed locale-specific data, so that the platform stays portfolio-friendly without limiting tools.

#### Acceptance Criteria

1. THE Dogu_Platform SHALL render all platform-level UI text — defined as text rendered by the Homepage, Header, Search_Bar placeholder, Empty_State, Not_Found_Page, and Tool_Layout — in English.
2. THE Dogu_Platform SHALL allow tools registered in the Tool_Registry to render locale-specific data such as currency formats, rank labels, and share text without requiring changes to platform-level source code.
3. THE Dogu_Platform SHALL NOT bundle a translation framework for platform-level UI text in this MVP.
