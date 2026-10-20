# Partner Mix

Independent Qloo hackathon project for assembling sponsorship portfolios. Work on
`main`; no remote is configured initially. Never modify Common Hours, TripRescue,
or any submitted artifact as part of this app.

- Follow `~/code/AGENTS.md`. No unsolicited browser or visual QA.
- `npm run check` runs formatting, domain/API tests, type checking and production build.
- Private local file storage lives in ignored `.data/`. A hosted release needs a
  dedicated app storage setup; do not borrow another app's database.
- Qloo only establishes cultural associations. Never imply verified reach, actual
  audience overlap, ROI, willingness to partner, prices, availability or endorsement.
- Sample partners, offers and rankings are fictional and must stay visibly labelled.
- Secrets stay server-side and out of source control. Production credentials belong
  in this app's Doppler project.
- This MVP uses a deterministic portfolio solver and bounded Qloo workflow, not an
  LLM agent. Do not misrepresent its capabilities in a submission.

## Docs

Read `docs/index.md` and `.context-map.json`. At session start inspect `docs/inbox/`
for open requests. Update affected Reference docs and `docs/log.md` in the same
change. Stamp `last_verified` only after checking claims against code.
