# Content validation audit

Inspected live source: https://raw.githubusercontent.com/j-gagne/MiloApprend-Content/refs/heads/main/program.json (2026-11-12). No remote file was modified. The local sibling content checkout has only eight weeks and was left untouched.

## Genuine errors

Repeated identical introductions create ambiguous references, not duplicate visible answer labels. Keep each earliest introduction and existing ID/display; record later occurrences as review:

- Week 6: tool-word-il ? reviewedUnitIds
- Week 7: syllable-iv ? reviewedUnitIds
- Week 7: syllable-ach ? reviewedUnitIds
- Week 7: tool-word-il ? reviewedUnitIds
- Week 7: tool-word-elle ? reviewedUnitIds
- Week 7: tool-word-est ? reviewedUnitIds
- Week 8: tool-word-il ? reviewedUnitIds
- Week 8: tool-word-elle ? reviewedUnitIds
- Week 8: tool-word-est ? reviewedUnitIds
- Week 8: tool-word-et ? reviewedUnitIds
- Week 10: tool-word-un ? reviewedUnitIds
- Week 10: tool-word-une ? reviewedUnitIds
- Week 10: tool-word-est ? reviewedUnitIds
- Week 10: tool-word-j’ai ? reviewedUnitIds
- Week 10: tool-word-et ? reviewedUnitIds
- Week 10: tool-word-il ? reviewedUnitIds
- Week 10: tool-word-elle ? reviewedUnitIds

- weeks[7].words[2] (practice-bonbon), completeWord[0].answerPosition: 2 ? 1. One distractor allows positions 0?1; both missing answers remain on. The bundled fallback has the same correction.
- weeks[6].words[7] (practice-foret), segmentations[0].segments[2].literal: letter-t ? t. Keep the literal and its note; do not turn it into an eligible answer.

remote-content-corrections.json is an RFC 6902 JSON Patch for the inspected live program, with test operations before replacements/removals. Apply to a freshly fetched copy in MiloApprend-Content, validate, review the diff, then publish separately. Abort on a failed test; do not apply partially or force it onto the older local checkout. Removals are ordered from the end so indexes remain valid. This artifact is not loaded by the application.

Corrected in-memory remote validation: zero errors; 27 unconfirmed-content warnings remain. No literals were confirmed, visible labels changed, math definitions changed, or new taught units added.

## Application diagnostics

- Runtime completion selection skips disabled activities before adaptation. Full program validation still checks their contents but omits the expected disabled-exercise status. Direct exercise validation continues to reject disabled exercises.
- Console reports retain severity, code, path and message, once per source and identical diagnostic per page lifetime. Errors use console.error; warnings use console.warn. Logging does not change returned diagnostics.
- Unconfirmed segments remain visible-only; unconstructed words remain non-completable.
- Parent overrides flow through effectiveProgram into catalogs. No connected browser profile was available: actual saved customizations could not be inspected. No storage was changed. Parent constructions can independently reintroduce errors.

## PWA

Added mobile-web-app-capable alongside Apple compatibility metadata. Retained standalone manifest, Apple title, status bar and icon settings to preserve installed iPhone behavior. Physical installed-app verification remains necessary.

Apple documents its compatibility tag in [Safari HTML Reference](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html); [WebKit's current standalone behavior](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/) also supports manifest-based installation.

## Validation

- 63 focused tests passed: content-diagnostics, remote-program, math-exercises, mathematics, reading-catalog, reading-program-session.
- Existing session.test.ts: 3 passed, 9 failed. Isolated committed HEAD: 2 passed, 10 failed. The bonbon correction resolves one failure; all nine remaining failures also occur on HEAD. No unrelated test changes.
- Typecheck and production build passed; git diff --check passed.
- Applied the JSON Patch with every test guard to a fresh live download: zero effective-program validation errors and zero active-week completion errors. Mathematics catalogs are identical before/after for every configured week.
- No commits, pushes, remote updates, or Parent storage changes.
