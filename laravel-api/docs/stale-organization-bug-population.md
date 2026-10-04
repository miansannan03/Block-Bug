# Local September 2026 demo activity

This one-off dataset adds bug history to active, non-deleted organizations whose
latest bug report, activity, successful audit, and proof are all before September
15, 2026, midnight Asia/Karachi. Organizations with no history are included.
Organizations created after that cutoff or lacking an active developer, tester,
and administrator/manager are skipped. Admins and managers are never substituted
for developer or tester roles. Testers report, verify, and reopen; developers
work on and resolve; administrators/managers assign.

Preview without writes:

```sh
php artisan blockbug:populate-stale-bugs
```

Apply locally:

```sh
php artisan blockbug:populate-stale-bugs --apply
```

Alternatively, explicitly run `StaleOrganizationBugActivitySeeder` with `db:seed
--class=StaleOrganizationBugActivitySeeder`. It is not in an automatic seeder or
deployment workflow. Both entry points reject non-local/non-testing environments.

Totals vary reproducibly between 4 and 9, never remove existing bugs, and add at
least one bug to eligible organizations with fewer than 9 existing bugs. Existing
9+ totals are skipped rather than changed. Recent organizations remain unchanged,
even when their existing totals exceed 9. Dates are September 16–October 3, 2026.

Each new bug gets reported, assigned, and moved through a consistent workflow;
some are resolved, verified/closed, or reopened. Every activity has a matching
proof and audit with the same date and actor. New projects are added only when no
active project exists, and those projects also receive audit entries. Only new
bugs and new project records are written; existing records are preserved.

All writes are transactional. Re-running finds the populated organizations have
newer activity and does not add duplicates. Proofs use `BugProofRecorder` and are
**database-backed hashes, not real blockchain transactions** (`actualBlockchain:
false`). Metadata labels this dataset as `seeded_bug_population` with `seeded:
true`; the audit UI displays “Seeded history.” No credentials, IPs, or request IDs
are invented.
