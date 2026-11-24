const assert = require("node:assert/strict");
const test = require("node:test");

const dbPath = require.resolve("../src/config/db");
const servicePath = require.resolve("../src/services/leadService");

const loadServiceWithDb = (query) => {
  const calls = [];
  const connection = {
    async beginTransaction() {}, async commit() {}, async rollback() {}, release() {},
    async query(sql, params) { calls.push({ sql, params }); return [await query(sql, params)]; },
  };
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { promise: () => ({ getConnection: async () => connection }) } };
  delete require.cache[servicePath];
  return { service: require(servicePath), calls };
};

test("creation rejects an inactive or non-Sales assignee using employee profile membership", async () => {
  const { service, calls } = loadServiceWithDb(async (sql) => {
    if (sql.includes("SELECT id, name FROM departments")) return [{ id: 3, name: "Sales" }];
    if (sql.includes("FROM leads WHERE created_by_user_id")) return [];
    if (sql.includes("FROM users u") && sql.includes("LOWER(TRIM(d.name)) = 'sales'")) return [];
    throw new Error(`Unexpected query ${sql}`);
  });
  const input = { customerName: "Customer", phone: "9876543210", address: "Address", leadType: "Commercial", leadDate: require("../src/services/leadPolicy").todayInKolkata(), initialRemark: "Call", assignedToId: 77 };
  await assert.rejects(service.createLead(input, { id: 1, role: "manager" }, "request_123"), { code: "INVALID_ASSIGNEE" });
  const eligibilityQuery = calls.find(({ sql }) => sql.includes("LOWER(TRIM(d.name)) = 'sales'")).sql;
  assert.match(eligibilityQuery, /u\.role = 'employee'/);
  assert.match(eligibilityQuery, /u\.status\s*=\s*'approved'/);
  assert.match(eligibilityQuery, /u\.is_active\s*=\s*1/);
});

test("execution batch rejects an inactive employee without assigning anyone", async () => {
  const { service, calls } = loadServiceWithDb(async (sql) => {
    if (sql.includes("SELECT l.*")) return [{ id: 5, status: "Final", final_confirmed_at: null, assigned_to_user_id: null, current_department_id: 3 }];
    if (sql.includes("SELECT a.*")) return [];
    if (sql.includes("SELECT id FROM lead_activities")) return [];
    if (sql.includes("FROM users u") && sql.includes("WHERE u.id IN (?)")) return [];
    throw new Error(`Unexpected query ${sql}`);
  });
  await assert.rejects(service.startOrReassignExecution("5", { employeeIds: [88], instruction: "Start installation" }, { id: 1, role: "manager" }, "request_456"), { code: "INVALID_ASSIGNEES" });
  const eligibilityQuery = calls.find(({ sql }) => sql.includes("WHERE u.id IN (?)")).sql;
  assert.match(eligibilityQuery, /u\.status\s*=\s*'approved'/);
  assert.match(eligibilityQuery, /u\.is_active\s*=\s*1/);
  assert.match(eligibilityQuery, /u\.role='employee'/);
  assert.equal(calls.some(({ sql }) => sql.startsWith("INSERT INTO lead_assignments")), false);
});

test("employee update submission is current-assignment scoped and does not update business status", async () => {
  const leadRow = { id: 5, customer_name: "Customer", customer_phone: "9876543210", address: "Address", source: null, referred_by: null, referrer_phone: null, channel_partner: "CP", suryamitra: "SM", initial_department_name: "Sales", current_department_name: "Sales", department_id: 3, current_department_id: 3, lead_date: "2026-01-01", status: "Follow-up", initial_remark: "Initial", latest_remark: "Old", next_follow_up_date: null, created_at: new Date(), created_by_user_id: 1, creator_name: "Manager", assigned_to_user_id: 42, assignee_name: "Employee", assigned_department_id: 3, needs_creator_review: 0, review_kind: null, final_confirmed_at: null, version: 2 };
  const assignment = { id: 7, lead_id: 5, user_id: 42, department_id: 3, assignment_type: "sales", employee_name: "Employee", department_name: "Sales", started_at: new Date(Date.now() - 1000), ended_at: null };
  const calls = [];
  const { service } = loadServiceWithDb(async (sql, params) => {
    calls.push({ sql, params });
    if (sql.startsWith("UPDATE leads SET latest_remark")) { leadRow.latest_remark = params[0]; leadRow.needs_creator_review = 1; leadRow.review_kind = "manager_update"; }
    if (sql.includes("SELECT l.*") && sql.includes("FOR UPDATE")) return [{ ...leadRow, department_id: 3 }];
    if (sql.includes("SELECT a.*") && sql.includes("WHERE a.id = ? AND a.lead_id = ?")) return [{ ...assignment }];
    if (sql.includes("SELECT id FROM lead_activities")) return [];
    if (sql.includes("FROM users WHERE id = ?")) return [{ role: "manager" }];
    if (sql.includes("WHERE l.id = ? LIMIT 1")) return [leadRow];
    if (sql.includes("FROM lead_assignments a INNER JOIN users")) return [assignment];
    if (sql.includes("FROM lead_assignment_events e")) return [];
    if (sql.includes("FROM lead_activities a INNER JOIN users")) return [{ id: 18, actor_user_id: 42, actor_name: "Employee", event_type: "employee_update_submitted", message: "Called customer", metadata: JSON.stringify({ assignmentId: 7 }), created_at: new Date() }];
    return [];
  });
  const result = await service.submitEmployeeUpdate("5", { remark: "Called customer" }, { id: 42, role: "employee" }, "7", "request_789");
  assert.equal(result.status, "Follow-up");
  assert.equal(result.needsCreatorReview, true);
  assert.equal(result.reviewKind, "manager_update");
  assert.equal(Object.hasOwn(result, "creatorId"), false, "employee detail responses omit manager-only creator identity fields");
  assert.equal(result.assignments.length, 1, "employee detail responses include only the current assignment");
  await assert.rejects(service.submitEmployeeUpdate("5", { remark: "No status edits", status: "Final" }, { id: 42, role: "employee" }, "7", "request_790"), { code: "LEAD_INVALID" });
  const update = calls.find(({ sql }) => sql.startsWith("UPDATE leads SET latest_remark"));
  assert.ok(update);
  assert.doesNotMatch(update.sql, /status\s*=/i);
  assert.doesNotMatch(update.sql, /assigned_to_user_id\s*=/i);
  assert.ok(calls.some(({ sql }) => sql.includes("INSERT INTO notifications")));
});

test("employees cannot edit CP/SM through the service", async () => {
  const { service } = loadServiceWithDb(async () => { throw new Error("Employee must be rejected before database access"); });
  await assert.rejects(service.updateBusinessDetails("5", { channelPartner: "Changed" }, { id: 42, role: "employee" }, "request_123"), { code: "FORBIDDEN" });
});

test("employee history is scoped to an owned ended assignment and returns only its remarks and manager feedback", async () => {
  const assignment = { id: 7, lead_id: 5, user_id: 42, assignment_type: "execution", department_name: "Operations", instruction: "Install equipment", started_at: "2026-01-01 09:00:00", ended_at: "2026-01-03 10:00:00", ended_reason: "Reassigned to another employee", work_status: "ended", customer_name: "History customer", lead_date: "2025-12-01", lead_status: "Working" };
  const { service, calls } = loadServiceWithDb(async (sql) => {
    if (sql.includes("SELECT a.*, l.customer_name")) return [assignment];
    if (sql.includes("FROM lead_assignment_events e")) return [
      { id: 1, assignment_id: 7, actor_user_id: 42, actor_name: "Employee", event_type: "submitted", message: "My original work", created_at: "2026-01-02 09:00:00", metadata: null },
      { id: 2, assignment_id: 7, actor_user_id: 1, actor_name: "Manager", event_type: "reassigned", message: "Reassigned to balance workload", created_at: "2026-01-03 10:00:00", metadata: null },
    ];
    if (sql.includes("FROM lead_activities h")) return [];
    throw new Error(`Unexpected query ${sql}`);
  });
  const result = await service.getMyAssignmentHistory("5", "7", { id: 42, role: "employee" });
  assert.equal(result.assignment.outcome, "Reassigned (not completed)");
  assert.equal(result.overallLeadStatus, "Working");
  assert.equal(result.submittedRemarks[0].text, "My original work");
  assert.equal(result.managerFeedback[0].text, "Reassigned to balance workload");
  const ownedQuery = calls.find(({ sql }) => sql.includes("SELECT a.*, l.customer_name"));
  assert.deepEqual(ownedQuery.params, [42, 7, 5]);
});

test("another employee and manager cannot read an employee's assignment history", async () => {
  const { service } = loadServiceWithDb(async (sql) => {
    if (sql.includes("SELECT a.*, l.customer_name")) return [];
    throw new Error("No unrelated history query should be made");
  });
  await assert.rejects(service.getMyAssignmentHistory("5", "7", { id: 99, role: "employee" }), { code: "NOT_FOUND" });
  await assert.rejects(service.getMyAssignmentHistory("5", "7", { id: 1, role: "manager" }), { code: "FORBIDDEN" });
});
