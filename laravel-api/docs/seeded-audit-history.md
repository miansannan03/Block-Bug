# Seeded bug audit history

Super Admin Audit Logs read `audit_logs`, not `activities` or `bug_blockchain_events`.
After a successful `php artisan db:seed`, missing audit entries are automatically
backfilled for seeded bug activities with IDs such as `act-sky-001` or
`activity-cts-001`. Keep this numeric-suffix convention in new dataset seeders.

Backfills preserve the activity's original date, bug, actor, and message. They
only add missing audit rows, mark their metadata source as
`seeded_activity_backfill`, and do not replace organizations or overwrite logs.
Existing activity-linked audits and matching legacy events are not duplicated.
Live activities (`act-<random>`), non-bug activities, and deleted organizations
are excluded. Unsupported activity types are skipped.

For an existing local dataset:

```sh
php artisan blockbug:backfill-seeded-audits --dry-run
php artisan blockbug:backfill-seeded-audits
```

Use `--organization=org-code-tech-studio` to limit the repair, or `--database=...`
to explicitly select a Laravel database connection. Refresh the Audit Logs page
afterward; it shows 25 records per page, sorted by the original event date.
Use the organization dropdown to see older organizations' histories directly.
The table shows organization names and activity messages, while the header's
audit-event badge remains the platform-wide total regardless of filters.
