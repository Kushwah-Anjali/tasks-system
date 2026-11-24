# Task schema migration

## Initial IT admin setup

Copy `backend/.env.example` to `backend/.env`, then fill in the local database connection and `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. The example file contains placeholders only. The bootstrap script resolves `backend/.env` relative to its own location, hashes the password with the app's bcrypt settings, and is safe to rerun: an existing admin is left unchanged, while an email owned by another role stops with an error.

If `users.role` is an `ENUM` that does not already include `admin`, apply the additive role migration first. If it is a `VARCHAR`, no role migration is needed. The app already uses `users.is_active`; no activation-field migration is needed.

From the repository root, run the migration and then the admin bootstrap:

```sh
mysql --host="$DB_HOST" --user="$DB_USER" --password "$DB_NAME" < backend/migrations/20261121_admin_role.sql
node backend/scripts/createAdmin.js
```

The SQL client prompts for the database password. Do not put real credentials in source control. The bootstrap is a local setup step and is not run by the app or its deployment process.

`20261117_task_priority_optional_due_date.sql` adds the High/Medium/Low priority field and makes the existing task due date optional. Existing rows receive `medium` from the new column default; existing due dates are preserved. The migration checks the schema and is safe to rerun.

Apply it to the same database configured for the backend, after taking a database backup:

```sh
mysql --host="$DB_HOST" --user="$DB_USER" --password "$DB_NAME" < backend/migrations/20261117_task_priority_optional_due_date.sql
```

The SQL client prompts for the password. Verify the migration with `SHOW COLUMNS FROM tasks LIKE 'priority';` and `SHOW COLUMNS FROM tasks LIKE 'due_date';`. The migration is not run automatically by the application.

`20261118_task_timeline.sql` adds `task_events` for assignment, response, reassignment, progress, submission, review, and completion events. It does not backfill guessed history or change existing `task_handoffs`; forwarding replies and outcomes continue to use those existing records. Apply it to the backend's configured database:

```sh
mysql --host="$DB_HOST" --user="$DB_USER" --password "$DB_NAME" < backend/migrations/20261118_task_timeline.sql
```

This migration creates an empty table and is safe to rerun.

`20261123_manager_leads.sql` additively creates the Leads, assignment-history, and activity tables, referencing the existing `users` and `departments` records. It does not alter tasks, attendance, users, employees, or department records. It was applied to the configured local development database after verifying the connection was `localhost:3306/employee_management` on the local workstation and checking that none of the Leads tables existed. No migration is applied automatically by the app.

`20261124_leads_suryamitra.sql` adds the nullable `leads.suryamitra` text field for the SM (Suryamitra) name. The initial Leads migration had already been applied locally and created a legacy `commission` field. This migration preserves that field and all its values, does not copy them into Suryamitra, and is safe to rerun. The configured local database was inspected on 2026-11-24: `commission` existed and `suryamitra` did not. The additive migration was then applied to that verified local database; both columns now exist. No hosted database was accessed or changed.

For another local or hosted database with the initial Leads migration applied, apply this migration after verifying the database identity and following the appropriate backup procedure:

```powershell
Get-Content backend/migrations/20261124_leads_suryamitra.sql | mysql --host=$env:DB_HOST --user=$env:DB_USER --password $env:DB_NAME
```

The SQL client prompts for the password. The application does not run migrations automatically. The same additive migration is required for a hosted database that has the initial Leads migration; do not import a dump or drop the legacy column.

For a local database that has not yet received it, after verifying the configured host/database and backing up local data, apply only this migration:

```powershell
Get-Content backend/migrations/20261123_manager_leads.sql | mysql --host=$env:DB_HOST --user=$env:DB_USER --password $env:DB_NAME
```

For a future hosted release, verify and back up the hosted database, then apply this one SQL migration through the approved hosting connection before deploying the backend and frontend. Do not replace a hosted database with a full dump.

`20261124_lead_type_final_decisions.sql` adds nullable `leads.lead_type` and `leads.held_from_status`. Existing rows remain unclassified (`NULL`, displayed as “Not specified”). Its guarded reconciliation clears the obsolete confirmation flags only for Final records with a manager-authored `manager_status_changed` history event whose recorded destination is Final. It leaves original actors, event timestamps, `finalized_at`, and all historical confirmation events intact. Ambiguous or employee-proposed Final records are not changed. Verify the database identity before applying; this change was applied only to the verified local development database. It has not been applied to hosted data.

`20261124_multi_execution_assignments.sql` additively extends `lead_assignments` with per-assignment execution progress and review fields, an active execution employee generated key with a unique `(lead_id, employee)` constraint, and the append-only `lead_assignment_events` history table. Existing assignment rows remain in place. Legacy pending execution reviews and assignment-linked activities are copied into the new per-assignment history. It was applied to the verified local MySQL `localhost:3306/employee_management` database after confirming no duplicate active execution assignments; three preexisting assignment rows remained. No hosted database was accessed or changed. Apply this migration only after verifying the target database and resolving any duplicate active execution assignment rows; the application does not run migrations automatically.

`20261124_profile_avatars.sql` adds nullable `users.avatar_preset_id`. Existing accounts remain `NULL` and receive a deterministic preset in the UI; no appearance is inferred from account names. It is additive and safe to rerun. The profile API requires this column. It was applied to the verified local MySQL `localhost:3306/employee_management` database on `DESKTOP-RG6D58M` after confirming `@@read_only = 0`; no hosted database was accessed or changed. No photo key or local upload directory is added: uploads stay disabled until durable object storage and its backend delivery/configuration are selected.
