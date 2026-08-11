# PRD — NODEA UX / Information Architecture Rebuild

**Status:** Draft for implementation approval  
**Owner:** Rezki / NODEA  
**Product:** Nodea — digital identity from approved activity  
**Repository:** `/home/ubuntu/nodea`  
**Primary objective:** Make Nodea easier to understand and use without replacing its established visual identity.

---

## 1. Executive Summary

Nodea currently combines marketing content, source connection, result viewing, and application navigation in one experience. This rebuild separates those concerns into clear product areas:

1. **Landing / Discover** — explain Nodea and show the outcome.
2. **Connect / Sources** — centralize account connection and management.
3. **Nodea / App** — show the user's score, identity, and insights.
4. **Settings / Privacy** — manage permissions, data, connections, and optional persistence.

The intended journey is:

```text
Landing → Connect one source → Analyze → See Nodea result → Optionally add sources → Optional persistence
```

The rebuild is an **information architecture and UX-flow project**, not a visual redesign. Existing colors, typography, buttons, cards, animations, icons, and Nodea visual personality must be preserved wherever possible.

---

## 2. Problem Statement

New users need to understand three things quickly:

- What Nodea produces.
- How to start.
- What happens after connecting a source.

The current structure makes these concerns compete for attention. Multiple sections and connection actions can make Nodea feel like a large system that must be understood before it can be used.

This creates risks:

- Users may think they must connect every platform.
- The product result may appear too late.
- Marketing and application navigation are mixed.
- Connection state can become difficult to understand.
- Vana/on-chain concepts may appear too early.
- Source cards can feel like competing CTAs instead of optional inputs.

---

## 3. Goals

### Primary goals

- Clarify the product value before asking for complex understanding.
- Make connecting one source the obvious first action.
- Centralize all connection workflows in `/connect`.
- Show value immediately after the first successful connection.
- Separate public marketing content from the actual Nodea application.
- Make additional sources optional enrichment, not onboarding requirements.
- Preserve the existing Nodea visual identity.
- Keep Vana and persistence available as an optional advanced layer.
- Provide clear loading, success, failure, cancel, retry, connected, and empty states.
- Ensure the complete journey works on desktop, tablet, and mobile.

### Secondary goals

- Make the application feel like an identity product, not a generic analytics dashboard.
- Reduce repeated explanation without deleting important functionality.
- Create a foundation for future authenticated or persistent user sessions.
- Make source state consistent across all views.

---

## 4. Non-Goals

This project will not:

- Replace the Nodea color palette.
- Replace the existing font stack.
- Introduce a generic SaaS dashboard style.
- Rebuild Vana backend APIs unnecessarily.
- Create a fake OAuth or fake connection system.
- Force users to connect multiple accounts.
- Make wallet or on-chain persistence mandatory.
- Remove important Nodea functionality merely to shorten the page.
- Replace existing button, card, icon, loading, or animation systems without a concrete UX reason.
- Turn Insights into a generic AI chat interface.
- Change the core Nodea Score model.

---

## 5. Product Principles

### 5.1 Progressive disclosure

Do not require users to understand the entire Nodea system before trying it.

```text
First: Connect one source
Then: Show value
Then: Explain deeper scoring and insights
Then: Offer additional sources
Then: Offer optional persistence
```

### 5.2 One source is enough to start

The product must communicate:

> Start with one. Add more whenever you want.

Additional sources enrich the identity; they are not prerequisites.

### 5.3 Result before complexity

Users should see a credible example of the output early on the landing page and see their actual result after the first analysis.

### 5.4 One connection workflow

Every Connect action must use the same existing connection functions, state model, polling, error handling, and data-reading path.

### 5.5 Identity over analytics

Score, Identity, and Insights are views into one Nodea identity. They must not feel like unrelated products or separate dashboards.

### 5.6 Honest privacy and Web3 positioning

Use language that matches the real implementation:

- `connect`, not `link`.
- `approve`, not `authorize`.
- No wallet is required for the basic experience.
- Only approved data is read.
- Users can disconnect or revoke access.
- Persistence/Vana is optional and should not block the basic journey.

---

## 6. Target User Journey

### 6.1 First-time user

```text
Landing
  ↓
Click “Connect your accounts”
  ↓
/connect
  ↓
Choose one source, e.g. GitHub
  ↓
Existing OAuth / approval flow
  ↓
Success state: “GitHub connected.”
  ↓
Analysis/loading state
  ↓
/app overview
  ↓
See Nodea Score, Grade, Identity, and key signals
  ↓
Optionally inspect Identity and Insights
  ↓
Optionally click “Add source”
  ↓
/connect
```

### 6.2 Cancelled connection

```text
/connect → Choose source → Cancel → Remain on /connect
```

Expected result: pending state is cleared, no partial connected state is shown, and the user can try again.

### 6.3 Failed connection

```text
/connect → Choose source → Failure → “Try again” or “Cancel”
```

Expected result: no stuck spinner, no corrupted source state, and retry uses the same existing handler.

### 6.4 Existing connection

```text
/connect → Existing source shows “✓ Connected” → Manage or Disconnect
```

### 6.5 Additional source

```text
/app → “Want a deeper picture?” → Add source → /connect → Connect source → Re-analyze → Updated Nodea
```

The UI should explain what the added source contributes where practical.

---

## 7. Information Architecture

### 7.1 Public routes

| Route | Purpose | Primary action |
|---|---|---|
| `/` | Landing / Discover | Connect your accounts |
| `/connect` | Central source connection | Connect one source |

### 7.2 Application routes

| Route | Purpose |
|---|---|
| `/app` | Nodea Overview |
| `/app/identity` | Identity interpretation and evidence |
| `/app/insights` | Structured cross-source discoveries |
| `/settings` | Account, privacy, data, connections, persistence |

### 7.3 Existing implementation constraint

Before introducing new route-level logic, inspect and reuse the current implementation in:

- `src/app/page-client.tsx`
- `src/app/api/vana/*`
- `src/lib/vana-sources.ts`
- `src/lib/soul-score.ts`
- `src/lib/recommendations/*`
- Existing source and identity components

The current application already contains connection state and connection workflow logic. The rebuild should move or expose that logic, not duplicate it.

---

## 8. Landing Page Requirements

### 8.1 Content hierarchy

The landing page should follow this order:

1. Header
2. Hero
3. Nodea result preview
4. What Nodea does
5. Source showcase
6. How it works
7. Why Nodea Score is different
8. Privacy
9. FAQ
10. Final CTA

### 8.2 Header

Recommended public navigation:

```text
NODEA | How it works | Privacy | FAQ | [Connect]
```

Requirements:

- Logo links to `/`.
- Do not expose Overview, Identity, Insights, or Sources in public navigation.
- Keep the existing header visual style and responsive behavior.
- Preserve branding and connected-status behavior where applicable.

### 8.3 Hero

Headline:

> You're more interesting than your bio.

Primary CTA:

> Connect your accounts

Requirements:

- Use the existing Nodea button component.
- Keep supporting copy concise.
- Preserve the existing hero visual language.
- Maintain sufficient spacing between the header and tagline.
- Do not add competing large CTAs.

### 8.4 Result preview

Heading:

> See yourself in your data.

The preview should show the existing Nodea identity/result design, including where available:

- Nodea Score
- Grade
- Identity/personality interpretation
- Evidence
- Insights

The preview must be clearly labelled as demo/example data. It must not imply that it is the current visitor's result.

Suggested label:

> Example preview

### 8.5 Source showcase

Keep these sources:

- GitHub
- Spotify
- Instagram
- YouTube
- LinkedIn
- Steam
- ChatGPT

The cards should communicate that each source reveals a different side of the user:

| Source | Example meaning |
|---|---|
| GitHub | Build / Create |
| Spotify | Listen / Discover |
| Instagram | Express / Connect |
| YouTube | Explore / Consume |
| Steam | Strategize / Play |
| LinkedIn | Work / Grow |
| ChatGPT | Think / Explore |

These cards are primarily a showcase. They must not look like seven competing primary CTAs. Use one primary CTA near the section:

> Connect your accounts

### 8.6 How it works

Use the progressive flow:

```text
01 — CONNECT
Connect the accounts you already use.

02 — DISCOVER
Nodea analyzes your approved activity and finds meaningful patterns.

03 — UNDERSTAND
Get your Nodea Score, identity, and insights.

04 — OWN
Optionally preserve your Nodea identity.
```

The final step must visibly feel optional.

### 8.7 Privacy section

The public version should communicate only the key principles:

- Only approved data is read.
- No passwords are needed.
- Private messages are not read.
- Users control access.
- Users can disconnect or revoke.
- Privacy/data handling is explained honestly.

Detailed technical information belongs on `/settings` or a dedicated privacy detail view.

### 8.8 FAQ

Keep the FAQ concise. Prioritize:

1. What is Nodea?
2. What data does Nodea read?
3. Is my data stored?
4. Do I need a wallet?
5. How is Nodea Score calculated?
6. Why connect multiple accounts?

### 8.9 Final CTA

Use one strong final CTA:

```text
Discover your Nodea.
[ Connect your accounts ]
```

It must navigate to `/connect`.

---

## 9. Connect Page Requirements

### 9.1 Page purpose

`/connect` is the single source of truth for connection management.

The page should not behave like a marketing page.

Recommended header:

```text
NODEA                                      [Back]
```

### 9.2 Page copy

Title:

> Connect your accounts

Supporting copy:

> Start with one. Add more whenever you want.

### 9.3 Sections

#### Connected sources

Show already-connected sources first.

Example:

```text
GitHub
✓ Connected
[Manage] [Disconnect]
```

#### Available sources

Show sources that are not yet connected:

```text
GitHub       [Connect]
Spotify      [Connect]
Instagram    [Connect]
YouTube      [Connect]
LinkedIn     [Connect]
Steam        [Connect]
ChatGPT      [Connect]
```

Already-connected sources must not continue to show a misleading primary `Connect` state.

### 9.4 Connection state model

Reuse the existing connection state model. The expected conceptual states are:

```text
idle
requesting
awaiting_approval
checking
reading
analyzing
 done
error
cancelled
```

The implementation may map to existing names, but the user-facing behavior must cover every state.

### 9.5 User-facing states

| State | Required behavior |
|---|---|
| Idle | Show Connect action |
| Requesting | Explain that the connection is starting |
| Awaiting approval | Explain that approval is required |
| Reading | Explain that approved activity is being read |
| Analyzing | Explain that patterns are being found |
| Success | Show source connected and continue to result |
| Failure | Show clear error + Try again + Cancel |
| Cancel | Return to idle on `/connect` |
| Connected | Show connected state + Manage/Disconnect |

### 9.6 First successful connection

After the first source is connected:

1. Show a clear success message.
2. Start analysis using existing data and scoring logic.
3. Show the existing loading/analysis experience where possible.
4. Navigate to `/app` after analysis completes.
5. Do not force the user to connect another source.

Recommended copy:

```text
GitHub connected.
We're finding patterns in your activity…
```

### 9.7 Empty states

No connected sources:

> Your Nodea starts with one source.

> Connect an account to discover your digital identity.

One connected source:

> Your Nodea is taking shape.

Multiple connected sources:

> Your Nodea is becoming richer.

---

## 10. Application Requirements

### 10.1 App navigation

Inside the Nodea application:

```text
NODEA | Overview | Identity | Insights | [Profile / Settings]
```

On mobile, keep the existing Nodea mobile language. A compact header or bottom navigation may be used, but the top branding/header must not disappear entirely.

### 10.2 Overview

Purpose: answer “What did Nodea discover about me?” at a glance.

Recommended hierarchy:

```text
YOUR NODEA
[Existing Nodea Score Card]

Nodea Score: 87
Grade: A
Identity: Builder

“You don't just consume. You create.”

YOUR SIGNALS
Depth · Breadth · Standing · Corroboration · Age
```

Requirements:

- Reuse the existing score and card components.
- Do not create a generic analytics dashboard.
- Avoid duplicating the full Identity and Insights content.
- Include a clear `Add source` action.

### 10.3 Identity

Purpose: answer “Who does Nodea think I am based on my activity?”

Include:

- Identity title
- Explanation
- Evidence
- Supporting signals
- Relevant source context

The view should feel like a deeper identity interpretation, not a second overview page.

### 10.4 Insights

Purpose: show structured discoveries from connected activity.

Include where available:

- Cross-source behavioral patterns
- Strengths
- Unique combinations
- Interesting observations
- Evidence supporting each insight

Do not implement this as a generic open-ended AI chat.

### 10.5 Add source

The application must provide an optional enrichment CTA:

> Want a deeper picture?

```text
[+ Add source]
```

This navigates to `/connect`.

After a new source is connected, the UI should explain the new contribution where practical, for example:

> Spotify added. Your Nodea now includes listening behavior.

---

## 11. Settings / Privacy Requirements

Suggested route: `/settings`

Sections:

### Account

- Basic account/session information if applicable.

### Connected accounts

- List connected sources.
- Show status.
- Provide Manage/Disconnect actions.

### Privacy

- Explain data permissions.
- Show what is read and what is not read.
- Link to detailed privacy information if available.

### Data

- Manage Nodea data.
- Delete local or stored data according to actual implementation.
- Do not claim server-side deletion unless the backend supports it.

### Connections

- Disconnect individual sources.
- Clear related local state correctly.

### Optional persistence

- Explain Vana/on-chain persistence as an advanced optional capability.
- Do not make this required for basic Nodea usage.

---

## 12. Technical Architecture Requirements

### 12.1 Existing logic to reuse

Before implementation, audit the current codebase for:

- Existing `ConnectState` and related state.
- `openLinkCheck`.
- `handleConnect`.
- Polling/status logic.
- Data-reading logic.
- Cancel and cleanup logic.
- Retry behavior.
- `onboardedSources` persistence.
- Score generation.
- Identity generation.
- Insights generation.
- Existing Vana routes.
- Existing loading and error components.

The current primary implementation is concentrated in `src/app/page-client.tsx`; extract shared functions/components only when necessary and preserve behavior.

### 12.2 Single source of truth for connection state

All connection entry points must call one shared workflow. No route may maintain an independent duplicate connection state.

Conceptually:

```text
openLinkCheck
  → handleConnect
  → pollStatus
  → readData
  → analyze
  → update shared Nodea state
```

### 12.3 Route behavior

Routes should be thin presentation shells over shared Nodea state and existing APIs. Avoid duplicating Vana SDK calls or OAuth logic inside page files.

### 12.4 Data contract

The dashboard views should consume a common Nodea result model containing, at minimum:

- Connected sources.
- Nodea Score.
- Grade.
- Identity title/type.
- Identity explanation.
- Evidence.
- Signals: Depth, Breadth, Standing, Corroboration, Age.
- Structured insights.
- Analysis status.
- Last updated/source metadata where supported.

The model must support one-source and multi-source results.

### 12.5 Visual-preservation contract

Reuse:

- Existing `globals.css` tokens.
- Existing font stack: Inter, Azeret Mono, EB Garamond where currently used.
- Existing `AppLogo` and brand icon components.
- Existing buttons.
- Existing cards.
- Existing Nodea Score card.
- Existing identity card.
- Existing `InsightsPanel`.
- Existing loading animations.
- Existing source orbit and motion language.

Do not introduce a new design system unless the existing system cannot support the required layout.

---

## 13. Responsive Requirements

Validate on desktop, tablet, and mobile.

Check specifically:

- Header height and fixed positioning.
- Hero top spacing.
- Mobile header branding remains visible.
- Navigation does not overlap content.
- Source card widths and equal heights.
- Long source names and descriptions.
- Dashboard cards.
- Modal/dialog sizes.
- Button wrapping and minimum tap targets.
- Loading/error states.
- Bottom navigation if used.
- No horizontal overflow.
- No unexpected header movement while scrolling.

---

## 14. Implementation Phases

### Phase 0 — Audit, no patch

Map existing components, routes, handlers, state, APIs, and data contracts. Confirm which current view contains each required feature.

**Deliverable:** implementation mapping and identified risks.

### Phase 1 — Route and shell structure

Create or restructure route shells for `/`, `/connect`, `/app`, `/app/identity`, `/app/insights`, and `/settings` without changing the visual system.

### Phase 2 — Centralize connection workflow

Move or extract existing connection logic into shared code where necessary. Ensure `/connect` becomes the central management view.

### Phase 3 — First-source journey

Implement and verify:

```text
Landing → /connect → one source → analysis → /app
```

This is the first acceptance milestone.

### Phase 4 — Dashboard views

Implement Overview, Identity, and Insights over the shared Nodea result model.

### Phase 5 — Add source and settings

Add enrichment flow, connected states, disconnect behavior, privacy/data settings, and optional persistence entry point.

### Phase 6 — Landing refinement

Reorder landing content, move the result preview higher, consolidate CTA hierarchy, and reduce repetition without deleting important functionality.

### Phase 7 — Responsive QA

Validate desktop, tablet, and mobile behavior.

### Phase 8 — Full journey regression

Run all acceptance scenarios in Section 15 and verify TypeScript/build before deployment.

---

## 15. Acceptance Criteria

### Landing

- [ ] Hero contains the approved headline and one obvious primary CTA.
- [ ] Primary CTA navigates to `/connect`.
- [ ] Example Nodea result appears before excessive technical explanation.
- [ ] Example result is clearly labelled as demo/example data.
- [ ] Source cards showcase supported platforms without becoming competing primary CTAs.
- [ ] Privacy copy is concise and matches real implementation.
- [ ] FAQ remains concise and relevant.
- [ ] Final CTA navigates to `/connect`.
- [ ] Existing visual identity remains recognizable and intact.

### Connect

- [ ] `/connect` is a dedicated route/page.
- [ ] Connected sources appear separately from available sources.
- [ ] One source can be connected without requiring others.
- [ ] Existing OAuth/connection logic is reused.
- [ ] Loading, approval, reading, analysis, success, failure, retry, and cancel states work.
- [ ] Failed connection does not leave the UI stuck.
- [ ] Cancel returns the user to an idle `/connect` state.
- [ ] Already-connected sources show `✓ Connected` and appropriate management actions.
- [ ] Disconnect removes the source correctly from shared state.

### First connection

- [ ] Successful first connection shows a clear success state.
- [ ] Analysis begins automatically after success.
- [ ] User is not forced to connect another source.
- [ ] User reaches `/app` after analysis completes.
- [ ] Score, identity, and at least the primary result are visible.

### Application

- [ ] `/app` shows the main Nodea overview.
- [ ] `/app/identity` shows identity interpretation and evidence.
- [ ] `/app/insights` shows structured discoveries, not a generic chat UI.
- [ ] Score, Identity, and Insights feel like views of one identity.
- [ ] Add source navigates back to `/connect`.
- [ ] Existing connected data remains visible after navigation and refresh where supported.

### Settings / privacy

- [ ] `/settings` exposes connected accounts.
- [ ] Disconnect behavior is functional.
- [ ] Data/permission copy matches the actual implementation.
- [ ] Optional persistence is clearly optional.

### Responsive

- [ ] Desktop layout works without overlap or horizontal overflow.
- [ ] Tablet layout preserves hierarchy.
- [ ] Mobile header still contains branding and necessary status/context.
- [ ] Buttons remain usable and do not overflow.
- [ ] Cards and dialogs fit the viewport.

### Quality gates

- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run build` or the project-standard build command passes.
- [ ] Existing APIs and connection flows are regression-tested.
- [ ] No visual component was replaced without an explicit reason.
- [ ] A design backup exists before implementation changes.
- [ ] Production verification is completed only after the user approves deployment.

---

## 16. Test Matrix

| Scenario | Expected result |
|---|---|
| New user opens `/` | Understands Nodea and sees Connect CTA |
| Click primary CTA | Navigates to `/connect` |
| No connected sources | Empty state and one-source CTA shown |
| Connect GitHub | Existing approval flow starts |
| Cancel GitHub | Remains on `/connect`, idle state restored |
| GitHub fails | Error + Try again + Cancel shown |
| Retry GitHub | Existing workflow restarts correctly |
| GitHub succeeds | Success state, analysis starts, user reaches `/app` |
| Open Overview | Score, grade, identity, signals visible |
| Open Identity | Interpretation and evidence visible |
| Open Insights | Structured discoveries visible |
| Add source | Returns to `/connect` |
| Add Spotify | Shared state updates and Nodea is enriched |
| Refresh app route | Result/state behavior follows the defined persistence model |
| Disconnect source | Source removed and empty/partial state updates correctly |
| Open Settings | Privacy and connection controls available |
| Mobile viewport | No overlap, hidden content, or overflow |

---

## 17. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Rewriting `page-client.tsx` breaks shared logic | Audit first; extract incrementally; preserve existing handlers |
| Duplicate connection state across routes | One shared state/workflow source |
| New routes lose current source data | Define common Nodea result model and persistence boundary |
| Landing page becomes too empty | Reorganize and improve spacing; do not remove sections wholesale |
| Visual drift from existing Nodea | Reuse current components and design tokens |
| Privacy claims become inaccurate | Audit API/data flow before writing claims |
| Vana is perceived as mandatory | Keep persistence as optional advanced action |
| Mobile header disappears | Keep top branding/header; simplify individual elements instead of removing the whole header |
| Analysis feels like an unexplained spinner | Use explicit status copy and existing loading components |
| Scope expands into backend rewrite | Keep this project focused on IA, routes, and existing workflow integration |

---

## 18. Definition of Done

The rebuild is complete when a new user can:

1. Open the landing page and understand the product without reading the entire page.
2. Click one primary CTA and reach `/connect`.
3. Connect exactly one source using the existing real workflow.
4. See explicit success and analysis states.
5. Reach `/app` and understand their first Nodea result.
6. Navigate between Overview, Identity, and Insights.
7. Optionally add another source without being forced.
8. Disconnect a source successfully.
9. Find privacy and data controls in `/settings`.
10. Complete the same journey on mobile without layout breakage.
11. Use the product without needing a wallet for the basic experience.
12. See the existing Nodea visual identity preserved throughout.

---

## 19. Recommended Next Step

Before implementation, perform **Phase 0 only**:

- Inspect the current routes and `page-client.tsx`.
- Map existing handlers and state to the target routes.
- Identify which components can be reused directly.
- Confirm the minimal extraction needed for shared connection state.
- Create a design backup/tag before modifications.

Do not patch or deploy until the audit mapping is reviewed and approved.

---

**Document status:** Ready for implementation planning; implementation itself should begin only after the Phase 0 audit is approved.
