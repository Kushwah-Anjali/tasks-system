# Task schema migration

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
