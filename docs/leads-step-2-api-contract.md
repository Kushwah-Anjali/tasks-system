# Leads API and workflow

The Leads frontend uses the authenticated `/api/leads` backend directly. The API derives actor identity from the session, checks role and current assignment on each employee request, and does not fall back to fixture data.

## Access

- Managers have the company-wide list, status tabs, creation, assignment and reassignment, CP/SM editing, status decisions, execution review, and completion actions.
- Employees in Sales and other departments use the same **My Leads** workspace. List, detail, history, and update submission expose only leads currently assigned to the authenticated employee. Ending or transferring an assignment removes the lead and blocks former-assignee detail/update access.
- Employee lead/customer details, Lead Type, CP/SM, department, and status are read-only. Employees can submit a remark/update for manager review; direct attempts to change customer data, CP/SM, Lead Type, status, department, or assignee are rejected by backend allowlists.
- Employee submissions preserve business status and assignment, notify the lead creator, and set the manager-review indicator. The current assignee continues to see the lead with “Awaiting manager review.” Managers retain historical remarks and assignment/activity history.

## Lead creation and type

Create Lead requires an explicit Lead Type: `Residential` or `Commercial`. The form starts at “Select type”; the backend validates the same enum and persists it in `leads.lead_type`. It is returned in authorized details and is locked after creation. Existing rows are left `NULL` and display “Not specified”; no type is inferred. The removed Category field is not part of the API or UI.

Other required fields continue to be validated by the API: customer name, address, initial remark, phone, lead date, supported source, and eligible active Sales assignee. See `backend/src/services/leadPolicy.js` for current limits and formats.

## Manager decisions

Only a manager can change business status. Marking a lead Final is the finalization decision and requires a remark; actor, timestamp, and remark are recorded in history. There is no separate Confirm Final step or confirmation-flag transition gate. A Final lead can immediately start execution with an eligible assignee, which changes it to Working.

Managers can add remarks in every status, including Completed. A remark appends an authenticated activity and does not change status, assignment, or `completed_at`. Completed leads are not reopened by this workflow.

Final leads can be put On Hold or Cancelled with a required reason, or returned to Sales follow-up with an eligible Sales assignee and required instructions. Working execution can also be held or cancelled with a reason; the current assignment is ended so that employee loses mutation access. Resuming held Sales or execution work requires an explicit appropriate assignee. The held phase is stored in `held_from_status`, and original lead date, finalization time, and full history are retained.

## Multi-employee execution

Sales follow-up remains a single assignment stored in the existing lead assignment history and `assigned_to_user_id`. Execution work after Final is stored as independent `lead_assignments` rows; `assigned_to_user_id` is cleared for Working execution and never contains a list. Managers can batch-assign one or more active employee accounts from any department, with required shared instructions and optional per-employee overrides. The manager API validates the whole batch before inserting any row. A stored generated column and unique key enforce one active execution assignment per employee per lead; the lead row is locked during assignment changes to serialize concurrent requests.

Each execution assignment stores its own work state (`assigned`, `submitted`, `rework_requested`, `approved`, or `ended`), latest update, instructions, assigned-by identity, and timestamps. `lead_assignment_events` preserves append-only submission, review, reassignment, and end history with the authenticated actor. Managers approve or request rework on a specific assignment. Assigning additional people preserves existing rows and sends notifications only to the newly assigned employees. Employee notifications link to `/employee-leads/:id`; creator notifications are persisted when work is submitted, and affected employees are notified on rework.

Employee lead list/detail access checks for a current assignment row and returns only that employee’s current assignment and assignment history. Execution submission uses the assignment ID from the authenticated request; one employee cannot submit against another employee’s assignment. Manager details include all assignments and histories, with progress based on active/required execution rows. Completion remains a separate manager action and is rejected while any active assignment is unresolved; managers can explicitly end an unnecessary assignment with a reason. Holding or cancelling ends all actionable assignments, and resuming creates new rows instead of reviving old assignments. Manager list filters use `EXISTS`, so multi-assignee leads do not inflate totals or duplicate rows.

Employees can also read each of their own ended assignment periods through `GET /api/leads/mine/history` and `GET /api/leads/:id/history/:assignmentId`. Authorization uses `lead_assignments.user_id` on every request; history responses contain only that assignment, its instructions and dates, the overall lead status as a separate field, submitted remarks, and manager feedback linked by assignment ID or the explicit ended-assignment metadata. Historical assignment responses are read-only and cannot be used for submission. The My Leads workspace separates current assignments from history, counts the complete result sets, and keeps separate rows when the same employee receives a lead again.

Assignment notification links are resolved for the authenticated recipient against the assignment period active at the notification timestamp. If that period has ended, the notification opens its read-only history detail; if it is still active, it opens the current assignment. Old notification rows remain unchanged.

Historical approval activities remain in history. The additive migration clears stale confirmation flags only for Final records with a manager-authored history event recording the Final decision. It does not invent confirmation events or change ambiguous or employee-proposed records.

## Local database and migration

The configured backend database was verified as local MySQL `localhost:3306/employee_management` on workstation `DESKTOP-RG6D58M` (MySQL 8.4.11, read-write). The migrations `backend/migrations/20261124_lead_type_final_decisions.sql` and `backend/migrations/20261124_multi_execution_assignments.sql` were applied only there. The multi-execution migration adds per-assignment work/review fields, a generated active-employee key and unique constraint, plus the append-only `lead_assignment_events` table. It backfills legacy pending execution submissions and assignment-linked activity without deleting or replacing existing assignment rows. Three existing assignment rows were preserved. It does not reset/import the database or touch hosted data.

The earlier Final reconciliation was also applied only to this local database: its existing Final record (ID 18) had a manager-authored Final event and stale `final_confirmation` flags. The migration cleared those flags, preserved `finalized_at` and activity history, and did not fabricate a confirmation. No ambiguous Final records were found in the inspected local data.

Apply the migration only after verifying the target database and following its backup procedure. The application does not run migrations automatically. Do not import a database dump. Hosted data was not accessed or modified in this work.

## Verification

- Backend unit tests, TypeScript project build, targeted ESLint, and production Vite build were run locally.
- The authenticated database integration test exercised create/type persistence, missing and invalid type rejection, initial single-assignee Sales flow, batch execution assignment across departments, employee-specific instructions and notifications, isolated submissions and approve/rework decisions, addition without overwrite, concurrent duplicate prevention, reassignment, former-assignee read-only history and mutation denial, cross-employee denial, completion gating, accurate lead counts, and persisted notifications. It ran against the verified local development database and cleaned up the test-created rows, assignment history, notifications, and sessions.
- The same isolated integration test now also exercises preset update and fresh-read persistence through the profile API, verifies the session owns the target account, rejects a client-supplied other account ID, and restores the manager's original preset.
- It also verifies reassigned and completed assignment history, submitted remarks and manager rework feedback after refresh, a new active period coexisting with the same employee's past period, and notification links opening the authorized ended assignment.
- A read-only inspection of the verified local database found three ended assignments (two Sales and one execution); all three have assignment-specific event history, with four preserved submission events total. No unmatched ended assignment event records were found. This inspection reported no specific submission or review event that lacked assignment attribution; the implementation never fills missing historical text by inference.
- The local integration test is available as `LEADS_DB_INTEGRATION=1 node --test test/leadsDatabase.integration.test.js` from `backend`.
- Browser-based visual checks and hosted database tests were not run. No push or deployment was performed.

## Profile avatars and activity presentation

Authenticated admin, manager, and employee accounts can read `GET /api/profile` and update their own preset with `PATCH /api/profile/avatar` using `{ "avatarPresetId": "face-01" }`. The service derives the account ID from the session and accepts no account identifier or other profile fields. Preset IDs are checked against the bundled allowlist and stored in nullable `users.avatar_preset_id`; existing null values use a deterministic preset based on account ID. The local additive migration is `backend/migrations/20261124_profile_avatars.sql`.

Activity history remains append-only. Activity presentation labels are derived from stored event types and available structured metadata; unknown legacy events use “Activity update”. Actor role labels are emitted only for event types with a reliable actor role, and removed actors remain visible as “User unavailable”. Lead and assignment histories load actor display name and preset with one left join per history table. Activity timestamps render in Asia/Kolkata, and remarks retain line breaks and original text.

The repository has no configured durable object storage and the client is deployed as static Vercel assets while backend deployment storage persistence is unspecified. For that reason photo upload and removal are visibly disabled; no app-directory file storage is used. Enabling photos requires a configured durable object store (for example S3-compatible storage), backend credentials kept server-side, bounded image decoding/re-encoding, and authenticated or signed media delivery. No production photo persistence is claimed.
