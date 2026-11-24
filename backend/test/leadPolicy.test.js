const assert = require("node:assert/strict");
const test = require("node:test");
const policy = require("../src/services/leadPolicy");

const lead = (overrides = {}) => ({ status: "Follow-up", assigned_to_user_id: 42, final_confirmed_at: null, needs_creator_review: 0, review_kind: null, ...overrides });
const salesAssignment = (overrides = {}) => ({ id: 7, user_id: 42, assignment_type: "sales", ended_at: null, ...overrides });

test("lead dates reject impossible calendar dates and future Kolkata dates", () => {
  assert.equal(policy.isCalendarDate("2026-02-29"), false);
  assert.equal(policy.isCalendarDate("2024-02-29"), true);
  assert.throws(() => policy.validateCreateLead({
    customerName: "A", phone: "9876543210", address: "Somewhere", leadType: "Residential", leadDate: "2999-01-01", initialRemark: "Call",
  }), /future/);
});

test("create validation requires complete Indian mobile numbers and accepts optional referrer phone", () => {
  const create = { customerName: "A", phone: "9876543210", address: "Somewhere", leadType: "Residential", leadDate: policy.todayInKolkata(), initialRemark: "Call" };
  assert.equal(policy.validateCreateLead(create).leadType, "Residential");
  assert.throws(() => policy.validateCreateLead({ ...create, leadType: "" }), { field: "leadType" });
  assert.throws(() => policy.validateCreateLead({ ...create, leadType: "Industrial" }), { field: "leadType" });
  assert.deepEqual(policy.validateCreateLead({ ...create, referrerPhone: "" }).referrerPhone, "");
  assert.throws(() => policy.validateCreateLead({ ...create, phone: "" }), { field: "phone", message: "Customer phone is required." });
  for (const phone of ["987654321", "98765432101", "1234567890", "abcdefghij", "98765 43210", "+919876543210"]) {
    assert.throws(() => policy.validateCreateLead({ ...create, phone }), { field: "phone", message: "Enter a valid 10-digit customer mobile number" });
  }
  assert.equal(policy.validateCreateLead({ ...create, referrerPhone: " \t " }).referrerPhone, "");
  for (const referrerPhone of ["987654321", "98765432101", "1234567890", "letters", "98765-4321"]) {
    assert.throws(() => policy.validateCreateLead({ ...create, referrerPhone }), { field: "referrerPhone", message: "Enter a valid 10-digit referrer mobile number, or leave it blank" });
  }
  assert.throws(() => policy.validateCreateLead({ ...create, category: "Residential" }), /unsupported fields/i);
});

test("required create text is trimmed and blank values, invalid dates, and unsupported options are rejected", () => {
  const create = { customerName: " A ", phone: "9876543210", address: " Somewhere ", source: "Other", leadType: "Commercial", leadDate: "2026-11-23", initialRemark: " Call " };
  const cleaned = policy.validateCreateLead(create);
  assert.equal(cleaned.customerName, "A"); assert.equal(cleaned.address, "Somewhere"); assert.equal(cleaned.initialRemark, "Call");
  for (const field of ["customerName", "address", "initialRemark"]) {
    assert.throws(() => policy.validateCreateLead({ ...create, [field]: "  \t " }), /is required/);
  }
  assert.throws(() => policy.validateCreateLead({ ...create, leadDate: "" }), /valid lead date/);
  assert.throws(() => policy.validateCreateLead({ ...create, leadDate: "2026-02-30" }), /valid lead date/);
  assert.throws(() => policy.validateCreateLead({ ...create, source: "A made up source" }), /valid lead source/);
  assert.throws(() => policy.validateCreateLead({ ...create, referredBy: "x".repeat(101) }), /100 characters/);
  assert.throws(() => policy.validateCreateLead({ ...create, channelPartner: "x".repeat(161) }), /160 characters/);
  assert.throws(() => policy.validateCreateLead({ ...create, nextFollowUp: "2026-02-30" }), /valid next follow-up date/);
  assert.throws(() => policy.validateCreateLead({ ...create, nextFollowUp: "2026-11-22" }), /before the lead date/);
});

test("locked customer fields and actor IDs are rejected by the CP/SM allowlist", () => {
  assert.deepEqual(policy.validateTermsBody({ channelPartner: " Partner ", suryamitra: " Suryamitra " }), { channelPartner: "Partner", suryamitra: "Suryamitra" });
  assert.throws(() => policy.validateTermsBody({ customerName: "Changed" }), /Only channelPartner and suryamitra/);
  assert.throws(() => policy.validateTermsBody({ channelPartner: "Partner", actorId: 42 }), /Only channelPartner and suryamitra/);
  assert.throws(() => policy.validateTermsBody({ channelPartner: "x".repeat(161) }), /160 characters/);
});

test("employee role and current assignment checks reject another employee and stale assignments", () => {
  assert.throws(() => policy.ensureCurrentSalesAssignment(lead(), salesAssignment(), 99, 7), { code: "STALE_ASSIGNMENT" });
  assert.throws(() => policy.ensureCurrentSalesAssignment(lead(), salesAssignment(), 42, 6), { code: "STALE_ASSIGNMENT" });
  assert.throws(() => policy.ensureCurrentSalesAssignment(lead(), salesAssignment({ ended_at: new Date() }), 42, 7), { code: "STALE_ASSIGNMENT" });
  assert.throws(() => policy.ensureEmployee({ id: 1, role: "manager" }), { code: "FORBIDDEN" });
});

test("manager Final is the finalization decision and execution starts without a second approval", () => {
  assert.doesNotThrow(() => policy.ensureCanStartExecution(lead({ status: "Final", final_confirmed_at: null }), null));
  assert.throws(() => policy.ensureCanStartExecution(lead({ status: "Final", final_confirmed_at: new Date() }), salesAssignment()), { code: "INVALID_TRANSITION" });
  assert.doesNotThrow(() => policy.ensureCanStartExecution(lead({ status: "On Hold", held_from_status: "Final" }), null));
  assert.doesNotThrow(() => policy.ensureCanStartExecution(lead({ status: "On Hold", held_from_status: "Working" }), null));
  assert.throws(() => policy.ensureCanStartExecution(lead({ status: "On Hold", held_from_status: "Follow-up" }), null), { code: "INVALID_TRANSITION" });
});

test("only managers may complete a Working lead", () => {
  const executionLead = lead({ status: "Working", assigned_to_user_id: 50 });
  const assignment = { id: 11, user_id: 50, assignment_type: "execution", ended_at: null };
  assert.throws(() => policy.ensureManager({ id: 50, role: "employee" }), { code: "FORBIDDEN" });
  assert.doesNotThrow(() => policy.ensureCanComplete(executionLead));
});

test("Sales assignment cannot turn held Final or execution work into fresh follow-up", () => {
  assert.throws(() => policy.ensureCanAssignSales(lead({ status: "On Hold", held_from_status: "Final" }), null), { code: "INVALID_TRANSITION" });
  assert.throws(() => policy.ensureCanAssignSales(lead({ status: "On Hold", held_from_status: "Working" }), null), { code: "INVALID_TRANSITION" });
  assert.doesNotThrow(() => policy.ensureCanAssignSales(lead({ status: "On Hold", held_from_status: "Follow-up" }), null));
  assert.throws(() => policy.ensureCanComplete(lead({ status: "Completed" }), null), { code: "INVALID_TRANSITION" });
});
