const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");
const test = require("node:test");

require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });
const mysql = require("mysql2/promise");
const db = require("../src/config/db");
const policy = require("../src/services/leadPolicy");
const app = require("../src/app");

const enabled = process.env.LEADS_DB_INTEGRATION === "1";

test("authenticated local Leads API persists lifecycle, access, history, counts, filters, and notifications", { skip: !enabled }, async () => {
  const host = String(process.env.DB_HOST || "").toLowerCase();
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(host), "integration test only runs against a loopback database host");
  assert.equal(process.env.DB_NAME, "employee_management", "integration test requires the configured local development database");

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, connectTimeout: 5000,
  });
  const leadIds = [];
  const customerNames = [];
  const sessionHashes = [];
  const unique = `LOCAL-LEADS-TEST-${Date.now()}`;
  let managerUserId;
  let managerOriginalAvatar;
  let server;
  try {
    const [[identity]] = await connection.query("SELECT DATABASE() AS databaseName, @@hostname AS hostname, @@read_only AS readOnly");
    assert.equal(identity.databaseName, "employee_management");
    assert.equal(Number(identity.readOnly), 0);
    assert.match(identity.hostname, /^DESKTOP-/i, "database server should identify as this Windows development host");

    const [[manager]] = await connection.query("SELECT id FROM users WHERE role = 'manager' AND status = 'approved' AND is_active = 1 ORDER BY id LIMIT 1");
    managerUserId = manager?.id;
    const [[sales]] = await connection.query(
      `SELECT u.id, d.id AS department_id FROM users u
       JOIN employees e ON e.user_id = u.id JOIN departments d ON d.id = e.department_id
       WHERE u.role = 'employee' AND u.status = 'approved' AND u.is_active = 1
         AND LOWER(TRIM(d.name)) = 'sales' ORDER BY u.id LIMIT 1`
    );
    const [allEmployeeRows] = await connection.query(
      `SELECT u.id, d.id AS department_id, d.name AS department FROM users u
       JOIN employees e ON e.user_id = u.id JOIN departments d ON d.id = e.department_id
       WHERE u.role = 'employee' AND u.status = 'approved' AND u.is_active = 1 ORDER BY d.id, u.id`
    );
    const firstExecutionEmployee = allEmployeeRows.find((item) => Number(item.id) !== Number(sales.id));
    const secondExecutionEmployee = allEmployeeRows.find((item) => Number(item.id) !== Number(sales.id) && item.department_id !== firstExecutionEmployee?.department_id);
    const thirdExecutionEmployee = allEmployeeRows.find((item) => ![Number(sales.id), Number(firstExecutionEmployee?.id), Number(secondExecutionEmployee?.id)].includes(Number(item.id)));
    const executionEmployees = [firstExecutionEmployee, secondExecutionEmployee, thirdExecutionEmployee].filter(Boolean);
    const [[otherEmployee]] = await connection.query(
      "SELECT id FROM users WHERE role = 'employee' AND status = 'approved' AND is_active = 1 AND id <> ? ORDER BY id LIMIT 1", [sales.id]
    );
    assert.ok(manager && sales && executionEmployees.length === 3 && otherEmployee, "the local database needs an active manager, a Sales employee, three employee accounts across departments, and another employee");

    const managerToken = await createSession(connection, manager.id, sessionHashes);
    const salesToken = await createSession(connection, sales.id, sessionHashes);
    const executionToken = await createSession(connection, executionEmployees[0].id, sessionHashes);
    const nextExecutionToken = await createSession(connection, executionEmployees[1].id, sessionHashes);
    const thirdExecutionToken = await createSession(connection, executionEmployees[2].id, sessionHashes);
    const unrelatedToken = await createSession(connection, otherEmployee.id, sessionHashes);

    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const managerApi = (url, options = {}) => apiRequest(origin, url, managerToken, options);
    const salesApi = (url, options = {}) => apiRequest(origin, url, salesToken, options);
    const executionApi = (url, options = {}) => apiRequest(origin, url, executionToken, options);
    const nextExecutionApi = (url, options = {}) => apiRequest(origin, url, nextExecutionToken, options);
    const thirdExecutionApi = (url, options = {}) => apiRequest(origin, url, thirdExecutionToken, options);
    const unrelatedApi = (url, options = {}) => apiRequest(origin, url, unrelatedToken, options);

    const [[profileBefore]] = await connection.query("SELECT avatar_preset_id FROM users WHERE id = ?", [manager.id]);
    managerOriginalAvatar = profileBefore.avatar_preset_id;
    const savedProfile = await managerApi("/api/profile/avatar", { method: "PATCH", body: { avatarPresetId: "face-12" }, mutation: true });
    assert.equal(savedProfile.profile.avatarPresetId, "face-12");
    assert.equal((await managerApi("/api/profile")).profile.avatarPresetId, "face-12", "preset selection persists after refresh");
    const [[otherAvatarBefore]] = await connection.query("SELECT avatar_preset_id FROM users WHERE id = ?", [sales.id]);
    await expectStatus(managerApi("/api/profile/avatar", { method: "PATCH", body: { userId: sales.id, avatarPresetId: "face-02" }, mutation: true }), 400);
    const [[otherAvatarAfter]] = await connection.query("SELECT avatar_preset_id FROM users WHERE id = ?", [sales.id]);
    assert.equal(otherAvatarAfter.avatar_preset_id, otherAvatarBefore.avatar_preset_id, "body account IDs cannot change another user's preset");
    await managerApi("/api/profile/avatar", { method: "PATCH", body: { avatarPresetId: managerOriginalAvatar || "face-01" }, mutation: true });

    const [untypedLeads] = await connection.query("SELECT id FROM leads WHERE lead_type IS NULL ORDER BY id LIMIT 1");
    if (untypedLeads.length) {
      const legacyLead = await managerApi(`/api/leads/${untypedLeads[0].id}`);
      assert.equal(legacyLead.leadType, "Not specified", "legacy records are not guessed into a Lead Type");
    }

    const salesAssignees = await managerApi("/api/leads/sales-assignees");
    assert.ok(salesAssignees.employees.some((item) => Number(item.id) === Number(sales.id)));
    const eligibleWorkforce = await managerApi("/api/leads/execution-assignees");
    assert.ok(eligibleWorkforce.employees.some((item) => Number(item.id) === Number(sales.id)), "execution workforce includes employee accounts in Sales too");
    assert.ok(executionEmployees.every((employee) => eligibleWorkforce.employees.some((item) => Number(item.id) === Number(employee.id))));

    const createBody = {
      customerName: unique, phone: "9876543210", address: "Temporary local integration test record",
      source: "Other", leadType: "Residential", referredBy: "", referrerPhone: " \t ", channelPartner: "", suryamitra: "",
      leadDate: policy.todayInKolkata(), nextFollowUp: null, initialRemark: "Temporary local API integration test.", assignedToId: null,
    };
    const invalidPhones = [undefined, "", "987654321", "98765432101", "1234567890", "abcdefghij", "98765 43210", "+91-9876543210", "987654321099"];
    for (const phone of invalidPhones) {
      const body = { ...createBody, customerName: `${unique}-INVALID`, phone };
      if (phone === undefined) delete body.phone;
      const error = await managerApi("/api/leads", { method: "POST", body, mutation: true, expectedStatus: 400 });
      assert.match(error.message, phone === undefined || phone === "" ? /Customer phone is required/ : /Enter a valid 10-digit customer mobile number/);
      assert.equal(error.code, "LEAD_INVALID");
      assert.equal(error.field, "phone");
    }
    const missingLeadType = { ...createBody, customerName: `${unique}-NO-TYPE` }; delete missingLeadType.leadType;
    const missingTypeError = await managerApi("/api/leads", { method: "POST", body: missingLeadType, mutation: true, expectedStatus: 400 });
    assert.equal(missingTypeError.field, "leadType");
    const invalidTypeError = await managerApi("/api/leads", { method: "POST", body: { ...createBody, customerName: `${unique}-BAD-TYPE`, leadType: "Industrial" }, mutation: true, expectedStatus: 400 });
    assert.equal(invalidTypeError.field, "leadType");
    const invalidReferrer = await managerApi("/api/leads", { method: "POST", body: { ...createBody, referrerPhone: "98765 43210" }, mutation: true, expectedStatus: 400 });
    assert.equal(invalidReferrer.message, "Enter a valid 10-digit referrer mobile number, or leave it blank");
    assert.equal(invalidReferrer.field, "referrerPhone");
    customerNames.push(unique);
    const pending = await managerApi("/api/leads", { method: "POST", body: createBody, mutation: true, expectedStatus: 201 });
    leadIds.push(pending.id);
    assert.equal(pending.status, "Pending");
    assert.equal(pending.referrerPhone, "", "whitespace-only optional phone is normalized to blank");
    customerNames.push(`${unique}-REFERRER`);
    const validReferrer = await managerApi("/api/leads", { method: "POST", body: { ...createBody, customerName: `${unique}-REFERRER`, leadType: "Commercial", referrerPhone: "6789012345" }, mutation: true, expectedStatus: 201 });
    leadIds.push(validReferrer.id);
    assert.equal(validReferrer.referrerPhone, "6789012345");
    assert.equal(validReferrer.leadType, "Commercial");
    assert.equal((await managerApi(`/api/leads/${validReferrer.id}`)).leadType, "Commercial", "Commercial lead type persists after a fresh read");
    assert.equal(pending.creatorId, Number(manager.id));
    assert.equal(pending.assignedToId, null);

    const assigned = await managerApi(`/api/leads/${pending.id}/sales-assignment`, { method: "POST", body: { assigneeId: String(sales.id) }, mutation: true });
    assert.equal(assigned.status, "Follow-up");
    assert.equal(Number(assigned.assignedToId), Number(sales.id));
    assert.equal(assigned.assignments.length, 1);
    const salesAssignmentId = assigned.currentAssignmentId;

    const filtered = await managerApi(`/api/leads?view=Follow-up&search=${encodeURIComponent(unique)}&assignedTo=${sales.id}&page=1&pageSize=10&sortBy=leadDate&sortDirection=desc`);
    assert.equal(filtered.total, 1);
    assert.equal(filtered.leads[0].id, pending.id);
    assert.ok(filtered.counts.All >= 1);

    const freshDetail = await managerApi(`/api/leads/${pending.id}`);
    assert.equal(freshDetail.status, "Follow-up", "a fresh API read must retrieve the persisted assignment after a simulated page refresh");
    assert.equal(freshDetail.leadType, "Residential", "lead type persists and reloads from the real API");
    assert.equal(freshDetail.assignments.length, 1);

    const commercialFinal = await managerApi(`/api/leads/${validReferrer.id}/status`, { method: "POST", body: { status: "Final", remark: "Commercial lead finalized." }, mutation: true });
    const commercialFinalizedAt = commercialFinal.finalizedAt;
    const heldFinal = await managerApi(`/api/leads/${validReferrer.id}/status`, { method: "POST", body: { status: "On Hold", remark: "Customer requested a pause." }, mutation: true });
    assert.equal(heldFinal.heldFromStatus, "Final");
    assert.equal(heldFinal.finalizedAt, commercialFinalizedAt);
    const returnedToSales = await managerApi(`/api/leads/${validReferrer.id}/return-to-sales`, { method: "POST", body: { assigneeId: String(sales.id), instruction: "Customer wants another Sales discussion." }, mutation: true });
    assert.equal(returnedToSales.status, "Follow-up");
    assert.equal(Number(returnedToSales.assignedToId), Number(sales.id));
    assert.equal(returnedToSales.finalizedAt, commercialFinalizedAt);
    assert.ok(returnedToSales.activities.some((item) => item.type === "final_returned_to_sales"));

    const termEdit = await managerApi(`/api/leads/${pending.id}/business-details`, { method: "PATCH", body: { channelPartner: "Local CP test", suryamitra: "Local SM test" }, mutation: true });
    assert.equal(termEdit.channelPartner, "Local CP test");
    assert.equal(termEdit.suryamitra, "Local SM test");
    assert.ok(termEdit.activities.some((item) => item.type === "business_details_updated"));
    const persistedTerms = await managerApi(`/api/leads/${pending.id}`);
    assert.equal(persistedTerms.suryamitra, "Local SM test", "SM must persist and reload from the database");
    await expectStatus(salesApi(`/api/leads/${pending.id}/business-details`, { method: "PATCH", body: { suryamitra: "Sales edited SM" }, mutation: true }), 403);
    await expectStatus(managerApi(`/api/leads/${pending.id}/business-details`, { method: "PATCH", body: { customerName: "Must remain locked" }, mutation: true }), 400);
    const immutable = await managerApi(`/api/leads/${pending.id}`);
    assert.equal(immutable.customerName, unique);
    assert.equal(immutable.phone, "9876543210");
    assert.equal(immutable.channelPartner, "Local CP test");
    const unrelatedRead = await unrelatedApi(`/api/leads/${pending.id}`, { expectedStatus: 403 });
    assert.ok(unrelatedRead.message);
    await expectStatus(unrelatedApi(`/api/leads/${pending.id}/sales-follow-up`, { method: "POST", body: { remark: "Wrong employee" }, assignmentId: salesAssignmentId, mutation: true }), 404);

    const employeeUpdate = await salesApi(`/api/leads/${pending.id}/update-submission`, { method: "POST", body: { remark: "Customer agreed in temporary test." }, assignmentId: salesAssignmentId, mutation: true });
    assert.equal(employeeUpdate.status, "Follow-up", "employee remarks do not change business status");
    assert.equal(employeeUpdate.needsCreatorReview, true);
    assert.equal(employeeUpdate.currentAssignmentId, salesAssignmentId);
    await expectStatus(salesApi(`/api/leads/${pending.id}/update-submission`, { method: "POST", body: { remark: "Try to set Final", status: "Final" }, assignmentId: salesAssignmentId, mutation: true }), 400);
    const final = await managerApi(`/api/leads/${pending.id}/status`, { method: "POST", body: { status: "Final", remark: "Customer agreement reviewed by manager." }, mutation: true });
    await expectStatus(salesApi(`/api/leads/${pending.id}/status`, { method: "POST", body: { status: "Cancelled", remark: "Employee cannot cancel." }, mutation: true }), 403);
    assert.equal(final.status, "Final");
    assert.equal(final.assignedToId, null);
    assert.equal(final.needsCreatorReview, false);
    assert.equal(final.leadType, "Residential");
    assert.ok(final.activities.some((item) => item.type === "manager_finalized" && item.actorId === Number(manager.id) && item.text === "Customer agreement reviewed by manager."));
    await expectStatus(managerApi(`/api/leads/${pending.id}/final-review`, { method: "POST", body: { decision: "confirm" }, mutation: true }), 404);
    const finalRemark = await managerApi(`/api/leads/${pending.id}/manager-remark`, { method: "POST", body: { remark: "Manager remark after Final." }, mutation: true });
    assert.equal(finalRemark.status, "Final");
    assert.equal(finalRemark.assignedToId, null);
    assert.equal(finalRemark.finalizedAt, final.finalizedAt);
    const invalidBatch = await managerApi(`/api/leads/${pending.id}/execution`, { method: "POST", body: { employeeIds: [String(executionEmployees[0].id), String(manager.id)], instruction: "This whole batch must be rejected." }, mutation: true, expectedStatus: 422 });
    assert.equal(invalidBatch.code, "INVALID_ASSIGNEES");
    const repeatedEmployee = await managerApi(`/api/leads/${pending.id}/execution`, { method: "POST", body: { employeeIds: [String(executionEmployees[0].id), String(executionEmployees[0].id)], instruction: "Duplicate selection." }, mutation: true, expectedStatus: 422 });
    assert.equal(repeatedEmployee.code, "DUPLICATE_ASSIGNEE");

    const working = await managerApi(`/api/leads/${pending.id}/execution`, {
      method: "POST", body: { employeeIds: [String(executionEmployees[0].id), String(executionEmployees[1].id)], instruction: "Begin local execution work.", instructionOverrides: { [executionEmployees[1].id]: "Inspect and report measurements." } }, mutation: true,
    });
    assert.equal(working.status, "Working");
    const firstWork = working.assignments.find((item) => item.type === "execution" && item.userId === Number(executionEmployees[0].id));
    const secondWork = working.assignments.find((item) => item.type === "execution" && item.userId === Number(executionEmployees[1].id));
    assert.ok(firstWork && secondWork, "one lead has independent execution assignments across departments");
    assert.equal(firstWork.instruction, "Begin local execution work.");
    assert.equal(secondWork.instruction, "Inspect and report measurements.");
    assert.equal(working.executionProgress.label, "0 of 2 approved");
    const employeeOneLead = await executionApi(`/api/leads/${pending.id}`);
    assert.equal(employeeOneLead.assignments.length, 1);
    assert.equal(employeeOneLead.assignments[0].id, firstWork.id);
    assert.equal(employeeOneLead.assignments[0].instruction, firstWork.instruction);
    const formerSalesHistory = await salesApi(`/api/leads/${pending.id}`);
    assert.equal(formerSalesHistory.isHistoricalAssignment, true, "a lead with no current assignment opens the employee's own read-only history");
    assert.equal(formerSalesHistory.assignment.id, salesAssignmentId);
    await expectStatus(salesApi(`/api/leads/${pending.id}/update-submission`, { method: "POST", body: { remark: "Historical work cannot be changed." }, assignmentId: salesAssignmentId, mutation: true }), 409);
    await expectStatus(executionApi(`/api/leads/${pending.id}/update-submission`, { method: "POST", body: { remark: "Cross-assignment attempt." }, assignmentId: secondWork.id, mutation: true }), 409);
    const employeeTwoLead = await nextExecutionApi(`/api/leads/${pending.id}`);
    assert.equal(employeeTwoLead.assignments[0].id, secondWork.id);
    assert.equal(employeeTwoLead.assignments[0].instruction, "Inspect and report measurements.");
    await expectStatus(executionApi(`/api/leads/${pending.id}/status`, { method: "POST", body: { status: "Cancelled", remark: "Unauthorized" }, mutation: true }), 403);
    await expectStatus(executionApi(`/api/leads/${pending.id}/complete`, { method: "POST", body: { completionRemark: "Employee cannot close lead." }, mutation: true }), 403);
    const assignedCounts = await managerApi(`/api/leads?view=Working&search=${encodeURIComponent(unique)}&assignedTo=${executionEmployees[0].id}&page=1&pageSize=10&sortBy=leadDate&sortDirection=desc`);
    assert.equal(assignedCounts.total, 1, "assignment filters count a lead only once");

    const submitted = await executionApi(`/api/leads/${pending.id}/update-submission`, { method: "POST", body: { remark: "First employee's work is ready." }, assignmentId: firstWork.id, mutation: true });
    assert.equal(submitted.status, "Working");
    assert.equal(submitted.assignments[0].workStatus, "submitted");
    const afterOneSubmit = await managerApi(`/api/leads/${pending.id}`);
    assert.equal(afterOneSubmit.assignments.find((item) => item.id === secondWork.id).workStatus, "assigned", "one employee's submission does not change another assignment");
    const rework = await managerApi(`/api/leads/${pending.id}/assignments/${firstWork.id}/review`, { method: "POST", body: { decision: "rework", remark: "Add a photo of the site." }, mutation: true });
    assert.equal(rework.assignments.find((item) => item.id === firstWork.id).workStatus, "rework_requested");
    assert.equal(rework.assignments.find((item) => item.id === secondWork.id).workStatus, "assigned");
    assert.ok(rework.assignments.find((item) => item.id === firstWork.id).events.some((item) => item.type === "rework_requested"));
    const resubmitted = await executionApi(`/api/leads/${pending.id}/update-submission`, { method: "POST", body: { remark: "Photo added." }, assignmentId: firstWork.id, mutation: true });
    assert.equal(resubmitted.status, "Working");
    const approvedFirst = await managerApi(`/api/leads/${pending.id}/assignments/${firstWork.id}/review`, { method: "POST", body: { decision: "approve", remark: "First work approved." }, mutation: true });
    assert.equal(approvedFirst.assignments.find((item) => item.id === firstWork.id).workStatus, "approved");
    const secondSubmitted = await nextExecutionApi(`/api/leads/${pending.id}/update-submission`, { method: "POST", body: { remark: "Second employee report." }, assignmentId: secondWork.id, mutation: true });
    assert.equal(secondSubmitted.assignments[0].workStatus, "submitted");
    const approvedSecond = await managerApi(`/api/leads/${pending.id}/assignments/${secondWork.id}/review`, { method: "POST", body: { decision: "approve" }, mutation: true });
    assert.equal(approvedSecond.executionProgress.label, "2 of 2 approved");

    const concurrentAssignments = await Promise.allSettled([
      managerApi(`/api/leads/${pending.id}/execution`, { method: "POST", body: { employeeIds: [String(executionEmployees[2].id)], instruction: "New independent assignment." }, mutation: true }),
      managerApi(`/api/leads/${pending.id}/execution`, { method: "POST", body: { employeeIds: [String(executionEmployees[2].id)], instruction: "Concurrent duplicate request." }, mutation: true }),
    ]);
    assert.equal(concurrentAssignments.filter((item) => item.status === "fulfilled").length, 1, "concurrent requests create one active assignment");
    assert.equal(concurrentAssignments.filter((item) => item.status === "rejected").length, 1);
    const withThird = await managerApi(`/api/leads/${pending.id}`);
    const thirdWork = withThird.assignments.find((item) => item.type === "execution" && item.userId === Number(executionEmployees[2].id) && !item.endedAt);
    assert.ok(thirdWork);
    assert.equal(withThird.assignments.find((item) => item.id === firstWork.id).workStatus, "approved", "adding a person does not overwrite existing work");
    assert.equal(withThird.assignments.find((item) => item.id === secondWork.id).workStatus, "approved");
    assert.equal(withThird.executionProgress.label, "2 of 3 approved");

    const reassigned = await managerApi(`/api/leads/${pending.id}/assignments/${firstWork.id}/reassign`, { method: "POST", body: { employeeId: String(sales.id), instruction: "Check the final customer sign-off.", reason: "The first assignee is unavailable." }, mutation: true });
    const replacementWork = reassigned.assignments.find((item) => item.type === "execution" && item.userId === Number(sales.id) && !item.endedAt);
    assert.ok(replacementWork);
    assert.equal(reassigned.assignments.find((item) => item.id === firstWork.id).workStatus, "ended");
    assert.equal(reassigned.assignments.find((item) => item.id === secondWork.id).workStatus, "approved");
    assert.equal(reassigned.assignments.find((item) => item.id === thirdWork.id).workStatus, "assigned");
    const formerExecutionDefault = await executionApi(`/api/leads/${pending.id}`);
    assert.equal(formerExecutionDefault.isHistoricalAssignment, true);
    assert.equal(formerExecutionDefault.assignment.id, firstWork.id);
    const formerWorkHistory = await executionApi(`/api/leads/${pending.id}/history/${firstWork.id}`);
    assert.equal(formerWorkHistory.assignment.outcome, "Reassigned (not completed)");
    assert.ok(formerWorkHistory.submittedRemarks.some((item) => item.text === "Photo added."), "former assignee retains their submitted remark");
    assert.ok(formerWorkHistory.managerFeedback.some((item) => item.type === "rework_requested"), "former assignee retains assignment-specific manager feedback");
    assert.ok((await executionApi("/api/leads/mine/history")).some((item) => item.assignment.id === firstWork.id));
    await thirdExecutionApi(`/api/leads/${pending.id}/history/${firstWork.id}`, { expectedStatus: 404 });
    await expectStatus(executionApi(`/api/leads/${pending.id}/update-submission`, { method: "POST", body: { remark: "Former employee mutation attempt." }, assignmentId: firstWork.id, mutation: true }), 409);
    assert.equal((await salesApi(`/api/leads/${pending.id}`)).assignments[0].id, replacementWork.id, "Sales employee can receive execution work after the original Sales assignment ended");
    assert.ok((await salesApi("/api/leads/mine")).some((item) => Number(item.id) === Number(pending.id)), "the lead appears in Current Assignments for a new active assignment");
    assert.ok((await salesApi("/api/leads/mine/history")).some((item) => item.assignment.id === salesAssignmentId), "the earlier Sales period remains in My History while a new period is active");
    const replacementSubmitted = await salesApi(`/api/leads/${pending.id}/update-submission`, { method: "POST", body: { remark: "Customer sign-off confirmed." }, assignmentId: replacementWork.id, mutation: true });
    assert.equal(replacementSubmitted.status, "Working");
    await managerApi(`/api/leads/${pending.id}/assignments/${replacementWork.id}/review`, { method: "POST", body: { decision: "approve" }, mutation: true });
    const unresolved = await managerApi(`/api/leads/${pending.id}/complete`, { method: "POST", body: { completionRemark: "Too early." }, mutation: true, expectedStatus: 409 });
    assert.equal(unresolved.code, "ASSIGNMENTS_UNRESOLVED");
    const endedThird = await managerApi(`/api/leads/${pending.id}/assignments/${thirdWork.id}/end`, { method: "POST", body: { reason: "No longer needed after scope change." }, mutation: true });
    assert.equal(endedThird.assignments.find((item) => item.id === thirdWork.id).workStatus, "ended");
    const endedThirdHistory = await thirdExecutionApi(`/api/leads/${pending.id}`);
    assert.equal(endedThirdHistory.isHistoricalAssignment, true);
    assert.equal(endedThirdHistory.assignment.id, thirdWork.id);
    assert.equal(endedThird.executionProgress.label, "2 of 2 approved");

    const completed = await managerApi(`/api/leads/${pending.id}/complete`, { method: "POST", body: { completionRemark: "Temporary integration work completed." }, mutation: true });
    assert.equal(completed.status, "Completed");
    const completedAssignmentHistory = await nextExecutionApi(`/api/leads/${pending.id}/history/${secondWork.id}`);
    assert.equal(completedAssignmentHistory.assignment.outcome, "Approved", "assignment outcome is separate from overall completion");
    assert.equal(completedAssignmentHistory.overallLeadStatus, "Completed");
    assert.ok(completed.completedAt);
    assert.equal(completed.assignments.at(-1).endedAt !== null, true);
    assert.equal(completed.customerName, unique, "customer fields remain unchanged");
    assert.equal(completed.channelPartner, "Local CP test");
    assert.equal(completed.suryamitra, "Local SM test");
    assert.equal(completed.assignments.length, 5);
    const completionTime = completed.completedAt;
    const completedRemark = await managerApi(`/api/leads/${pending.id}/manager-remark`, { method: "POST", body: { remark: "Additional manager note after completion." }, mutation: true });
    assert.equal(completedRemark.status, "Completed");
    assert.equal(completedRemark.completedAt, completionTime);
    assert.ok(completedRemark.activities.some((item) => item.type === "manager_remark" && item.text === "Additional manager note after completion." && item.actorId === Number(manager.id)));
    assert.equal(completed.activities.some((item) => item.type === "sales_on_hold"), false);
    assert.ok(completed.activities.some((item) => item.type === "manager_finalized"));

    const counts = await managerApi(`/api/leads?view=Completed&search=${encodeURIComponent(unique)}&page=1&pageSize=10&sortBy=leadDate&sortDirection=desc`);
    assert.equal(counts.total, 1);
    assert.ok(counts.counts.Completed >= 1);

    const [notifications] = await connection.query(
      "SELECT user_id, type, link FROM notifications WHERE reference_id = ? AND type LIKE 'lead_%' ORDER BY id", [pending.id]
    );
    assert.ok(notifications.some((item) => Number(item.user_id) === Number(sales.id) && item.type === "lead_assigned" && item.link === `/employee-leads/${pending.id}`));
    assert.ok(notifications.some((item) => Number(item.user_id) === Number(manager.id) && item.type === "lead_manager_review" && item.link === `/leads/${pending.id}`));
    assert.ok(notifications.some((item) => Number(item.user_id) === Number(executionEmployees[0].id) && item.type === "lead_execution_assigned" && item.link === `/employee-leads/${pending.id}`));
    assert.ok(notifications.some((item) => Number(item.user_id) === Number(executionEmployees[1].id) && item.type === "lead_execution_assigned"));
    assert.ok(notifications.some((item) => Number(item.user_id) === Number(executionEmployees[2].id) && item.type === "lead_execution_assigned"));
    assert.ok(notifications.some((item) => Number(item.user_id) === Number(sales.id) && item.type === "lead_execution_assigned"));
    assert.ok(notifications.some((item) => Number(item.user_id) === Number(executionEmployees[0].id) && item.type === "lead_work_returned"));
    for (const employee of executionEmployees) {
      const [countRows] = await connection.query("SELECT COUNT(*) AS count FROM notifications WHERE reference_id=? AND user_id=? AND type='lead_execution_assigned'", [pending.id, employee.id]);
      assert.equal(Number(countRows[0].count), 1, "existing assignees are not notified again when another employee is added");
    }
    const assignmentNotification = await thirdExecutionApi("/api/notifications");
    assert.ok(assignmentNotification.notifications.some((item) => item.type === "lead_execution_assigned" && item.reference_id === Number(pending.id) && item.link === `/employee-leads/${pending.id}/history/${thirdWork.id}`), "employee notification resolves to the assignment period owned by its recipient");
    const creatorNotification = await managerApi("/api/notifications");
    assert.ok(creatorNotification.notifications.some((item) => item.type === "lead_manager_review" && item.reference_id === Number(pending.id)), "creator notification is available to the polling notification UI");

    customerNames.push(`${unique}-ASSIGNED`);
    const createdWithAssignee = await managerApi("/api/leads", { method: "POST", body: { ...createBody, customerName: `${unique}-ASSIGNED`, assignedToId: String(sales.id) }, mutation: true, expectedStatus: 201 });
    leadIds.push(createdWithAssignee.id);
    assert.equal(createdWithAssignee.status, "Follow-up", "creation with Sales assignee begins Follow-up, never Working");
    assert.equal(createdWithAssignee.assignments.length, 1);
    const cancelledFinal = await managerApi(`/api/leads/${createdWithAssignee.id}/status`, { method: "POST", body: { status: "Final", remark: "Final decision before cancellation." }, mutation: true });
    const cancelledFinalizedAt = cancelledFinal.finalizedAt;
    const cancelledLead = await managerApi(`/api/leads/${createdWithAssignee.id}/status`, { method: "POST", body: { status: "Cancelled", remark: "Customer cancelled the request." }, mutation: true });
    assert.equal(cancelledLead.status, "Cancelled");
    assert.equal(cancelledLead.finalizedAt, cancelledFinalizedAt);
    assert.equal(cancelledLead.assignments.at(-1).endedAt !== null, true);
    await expectStatus(salesApi(`/api/leads/${createdWithAssignee.id}/update-submission`, { method: "POST", body: { remark: "Former Sales assignee." }, assignmentId: createdWithAssignee.currentAssignmentId, mutation: true }), 409);

    customerNames.push(`${unique}-WORK-CANCELLED`);
    const workingCancelledLead = await managerApi("/api/leads", { method: "POST", body: { ...createBody, customerName: `${unique}-WORK-CANCELLED`, assignedToId: String(sales.id) }, mutation: true, expectedStatus: 201 });
    leadIds.push(workingCancelledLead.id);
    const workCancelledFinal = await managerApi(`/api/leads/${workingCancelledLead.id}/status`, { method: "POST", body: { status: "Final", remark: "Ready for execution." }, mutation: true });
    const workCancelled = await managerApi(`/api/leads/${workingCancelledLead.id}/execution`, { method: "POST", body: { employeeIds: [String(executionEmployees[0].id), String(executionEmployees[1].id)], instruction: "Begin installation." }, mutation: true });
    const workCancelledResult = await managerApi(`/api/leads/${workingCancelledLead.id}/status`, { method: "POST", body: { status: "Cancelled", remark: "Customer cancelled during execution." }, mutation: true });
    assert.equal(workCancelledResult.status, "Cancelled");
    assert.equal(workCancelledResult.finalizedAt, workCancelledFinal.finalizedAt);
    assert.equal(workCancelledResult.assignments.at(-1).endedAt !== null, true);
    await expectStatus(executionApi(`/api/leads/${workingCancelledLead.id}/update-submission`, { method: "POST", body: { remark: "Former execution assignee." }, assignmentId: workCancelled.currentAssignmentId, mutation: true }), 409);
  } finally {
    if (managerUserId && managerOriginalAvatar !== undefined) await connection.query("UPDATE users SET avatar_preset_id = ? WHERE id = ?", [managerOriginalAvatar, managerUserId]);
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    if (customerNames.length) {
      const placeholders = customerNames.map(() => "?").join(",");
      const [rows] = await connection.query(
        `SELECT id FROM leads WHERE created_by_user_id = ? AND initial_remark = ? AND customer_name IN (${placeholders})`,
        [managerUserId, "Temporary local API integration test.", ...customerNames]
      );
      for (const row of rows) if (!leadIds.some((id) => Number(id) === Number(row.id))) leadIds.push(row.id);
    }
    for (const leadId of leadIds) {
      await connection.query("DELETE FROM notifications WHERE reference_id = ? AND type LIKE 'lead_%'", [leadId]);
      await connection.query("DELETE FROM lead_assignment_events WHERE lead_id = ?", [leadId]);
      await connection.query("DELETE FROM lead_activities WHERE lead_id = ?", [leadId]);
      await connection.query("DELETE FROM lead_assignments WHERE lead_id = ?", [leadId]);
      await connection.query("DELETE FROM leads WHERE id = ?", [leadId]);
    }
    for (const hash of sessionHashes) await connection.query("DELETE FROM sessions WHERE session_token = ?", [hash]);
    if (sessionHashes.length) {
      const [remaining] = await connection.query(`SELECT COUNT(*) AS count FROM sessions WHERE session_token IN (${sessionHashes.map(() => "?").join(",")})`, sessionHashes);
      assert.equal(Number(remaining[0].count), 0, "temporary test sessions must be removed");
    }
    if (leadIds.length) {
      const placeholders = leadIds.map(() => "?").join(",");
      const [[remainingActivities]] = await connection.query(`SELECT COUNT(*) AS count FROM lead_activities WHERE lead_id IN (${placeholders})`, leadIds);
      const [[remainingAssignmentEvents]] = await connection.query(`SELECT COUNT(*) AS count FROM lead_assignment_events WHERE lead_id IN (${placeholders})`, leadIds);
      const [[remainingAssignments]] = await connection.query(`SELECT COUNT(*) AS count FROM lead_assignments WHERE lead_id IN (${placeholders})`, leadIds);
      const [[remainingNotifications]] = await connection.query(`SELECT COUNT(*) AS count FROM notifications WHERE reference_id IN (${placeholders}) AND type LIKE ?`, [...leadIds, "lead_%"]);
      assert.equal(Number(remainingActivities.count) + Number(remainingAssignmentEvents.count) + Number(remainingAssignments.count) + Number(remainingNotifications.count), 0, "temporary lead and assignment history and notifications must be removed");
    }
    await connection.end();
    await db.promise().end();
  }
});

async function createSession(connection, userId, createdHashes) {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  await connection.query("INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))", [userId, hash]);
  createdHashes.push(hash);
  return token;
}

async function apiRequest(origin, url, token, options = {}) {
  const headers = { Cookie: `session=${token}` };
  if (options.mutation) {
    headers.Origin = "http://localhost:5173";
    headers["Idempotency-Key"] = crypto.randomUUID();
  }
  if (options.assignmentId) headers["X-Lead-Assignment-Id"] = String(options.assignmentId);
  if (options.body) headers["Content-Type"] = "application/json";
  const response = await fetch(`${origin}${url}`, { method: options.method || "GET", headers, body: options.body ? JSON.stringify(options.body) : undefined });
  const data = await response.json();
  assert.equal(response.status, options.expectedStatus || 200, `${options.method || "GET"} ${url} returned ${response.status}: ${data.message || ""}`);
  return data;
}

async function expectStatus(promise, expectedStatus) {
  await assert.rejects(promise, new RegExp(`returned ${expectedStatus}`));
}
