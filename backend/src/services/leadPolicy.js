const LEAD_STATUSES = ["Pending", "Follow-up", "On Hold", "Final", "Working", "Completed", "Cancelled"];
const LEAD_SOURCES = ["Phone", "WhatsApp", "Website", "Referral", "Walk-in", "Other"];
const LEAD_TYPES = ["Residential", "Commercial"];
const LEAD_VIEWS = ["All", ...LEAD_STATUSES];

class LeadError extends Error {
  constructor(message, statusCode = 400, code = "LEAD_INVALID", field = null) {
    super(message);
    this.name = "LeadError";
    this.statusCode = statusCode;
    this.code = code;
    this.field = field;
  }
}

const todayInKolkata = (date = new Date()) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
}).format(date);

const isCalendarDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  return year >= 1000 && month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
};

const cleanText = (value, field, { required = false, max = 1000 } = {}) => {
  if (typeof value !== "string") {
    if (!required && (value === undefined || value === null)) return "";
    throw new LeadError(`${field} must be text.`);
  }
  const trimmed = value.trim();
  if (required && !trimmed) throw new LeadError(`${field} is required.`);
  if (trimmed.length > max) throw new LeadError(`${field} must be ${max} characters or fewer.`);
  return trimmed;
};

const isValidIndianPhone = (value) => typeof value === "string" && /^[6-9][0-9]{9}$/.test(value);

const validateCreateLead = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new LeadError("Lead details are required.");
  const allowed = new Set(["customerName", "phone", "address", "source", "referredBy", "referrerPhone", "channelPartner", "suryamitra", "leadType", "leadDate", "nextFollowUp", "initialRemark", "assignedToId"]);
  if (Object.keys(body).some((key) => !allowed.has(key))) throw new LeadError("Lead details contain unsupported fields.");
  const customerName = cleanText(body.customerName, "Customer name", { required: true, max: 100 });
  if (typeof body.phone !== "string" || !body.phone) throw new LeadError("Customer phone is required.", 400, "LEAD_INVALID", "phone");
  const phone = body.phone;
  if (!isValidIndianPhone(phone)) throw new LeadError("Enter a valid 10-digit customer mobile number", 400, "LEAD_INVALID", "phone");
  const address = cleanText(body.address, "Address", { required: true, max: 500 });
  const source = body.source ?? null;
  if (source !== null && (typeof source !== "string" || !LEAD_SOURCES.includes(source))) throw new LeadError("Choose a valid lead source.");
  const referredBy = cleanText(body.referredBy, "Referred by", { max: 100 });
  const rawReferrerPhone = body.referrerPhone === undefined || body.referrerPhone === null ? "" : body.referrerPhone;
  if (typeof rawReferrerPhone !== "string") throw new LeadError("Referrer phone must be text.", 400, "LEAD_INVALID", "referrerPhone");
  const referrerPhone = rawReferrerPhone.trim();
  if (referrerPhone && !isValidIndianPhone(referrerPhone)) throw new LeadError("Enter a valid 10-digit referrer mobile number, or leave it blank", 400, "LEAD_INVALID", "referrerPhone");
  const channelPartner = cleanText(body.channelPartner, "Channel partner", { max: 160 });
  const suryamitra = cleanText(body.suryamitra, "Suryamitra", { max: 160 });
  const leadType = body.leadType;
  if (!LEAD_TYPES.includes(leadType)) throw new LeadError("Choose Residential or Commercial for lead type.", 400, "LEAD_INVALID", "leadType");
  const leadDate = body.leadDate;
  if (!isCalendarDate(leadDate)) throw new LeadError("Enter a valid lead date.");
  if (leadDate > todayInKolkata()) throw new LeadError("Lead date cannot be in the future.");
  const nextFollowUp = body.nextFollowUp === "" || body.nextFollowUp === undefined ? null : body.nextFollowUp;
  if (nextFollowUp !== null && !isCalendarDate(nextFollowUp)) throw new LeadError("Enter a valid next follow-up date.");
  if (nextFollowUp && nextFollowUp < leadDate) throw new LeadError("Follow-up date cannot be before the lead date.");
  const initialRemark = cleanText(body.initialRemark, "Initial remark", { required: true, max: 1000 });
  const assignedToId = body.assignedToId === "" || body.assignedToId === undefined || body.assignedToId === null ? null : Number(body.assignedToId);
  if (assignedToId !== null && (!Number.isSafeInteger(assignedToId) || assignedToId <= 0)) throw new LeadError("Choose a valid Sales employee.");
  return { customerName, phone, address, source, referredBy, referrerPhone, channelPartner, suryamitra, leadType, leadDate, nextFollowUp, initialRemark, assignedToId };
};

const validateId = (value, label = "Lead id") => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new LeadError(`${label} is invalid.`, 400, "INVALID_ID");
  return id;
};

const validateRequestKey = (value) => {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{8,54}$/.test(value)) throw new LeadError("A valid Idempotency-Key header is required.", 400, "INVALID_REQUEST_KEY");
  return value;
};

const validateFollowUp = (value, leadDate) => {
  const nextFollowUp = value === "" || value === undefined ? null : value;
  if (nextFollowUp !== null && !isCalendarDate(nextFollowUp)) throw new LeadError("Enter a valid follow-up date.");
  if (nextFollowUp && nextFollowUp < leadDate) throw new LeadError("Follow-up date cannot be before the lead date.");
  return nextFollowUp;
};

const validateAssignmentId = (value, label = "Assignment id") => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new LeadError(`${label} is required.`, 409, "STALE_ASSIGNMENT");
  return id;
};

const ensureManager = (user) => {
  if (user?.role !== "manager") throw new LeadError("Manager access required.", 403, "FORBIDDEN");
};

const ensureEmployee = (user) => {
  if (user?.role !== "employee") throw new LeadError("Employee access required.", 403, "FORBIDDEN");
};

const ensureActiveAssignment = (lead, assignment, userId, expectedAssignmentId, assignmentType) => {
  if (!assignment || Number(assignment.id) !== Number(expectedAssignmentId) || Number(assignment.user_id) !== Number(userId) || assignment.assignment_type !== assignmentType || assignment.ended_at) {
    throw new LeadError("This assignment is no longer current. Refresh the lead before submitting.", 409, "STALE_ASSIGNMENT");
  }
};

const ensureCurrentSalesAssignment = (lead, assignment, userId, expectedAssignmentId) => {
  ensureActiveAssignment(lead, assignment, userId, expectedAssignmentId, "sales");
  if (lead.status !== "Follow-up") throw new LeadError("Sales follow-up is only available while the lead is in Follow-up.", 409, "INVALID_TRANSITION");
};

const ensureExecutionAssignment = (lead, assignment, userId, expectedAssignmentId) => {
  ensureActiveAssignment(lead, assignment, userId, expectedAssignmentId, "execution");
  if (lead.status !== "Working") throw new LeadError("Execution updates are only available while work is Working.", 409, "INVALID_TRANSITION");
};

const ensureTermsAccess = (lead, assignment, user) => {
  if (user?.role === "manager") return;
  ensureEmployee(user);
  if (!assignment || assignment.assignment_type !== "sales" || assignment.ended_at || Number(assignment.user_id) !== Number(user.id) || Number(lead.assigned_to_user_id) !== Number(user.id)) {
    throw new LeadError("Only managers and the currently assigned Sales employee can edit these details.", 403, "FORBIDDEN");
  }
};

const ensureCanAssignSales = (lead, assignment) => {
  if (!["Pending", "On Hold", "Cancelled"].includes(lead.status) || assignment || ["Final", "Working"].includes(lead.held_from_status)) {
    throw new LeadError("Only unassigned Pending, On Hold, or Cancelled leads can be assigned to Sales.", 409, "INVALID_TRANSITION");
  }
};

const ensureCanStartExecution = (lead, assignment) => {
  const mayStartFromFinal = lead.status === "Final";
  const mayResumeHeldExecution = lead.status === "On Hold" && ["Final", "Working"].includes(lead.held_from_status);
  if ((!mayStartFromFinal && !mayResumeHeldExecution) || assignment) {
    throw new LeadError("Execution can start from Final or from a held execution phase.", 409, "INVALID_TRANSITION");
  }
};

const ensureCanReassignExecution = (lead, assignment) => {
  if (lead.status !== "Working" || !assignment || assignment.assignment_type !== "execution" || assignment.ended_at) {
    throw new LeadError("Only active Working assignments can be reassigned.", 409, "INVALID_TRANSITION");
  }
};

const ensureCanComplete = (lead, assignment) => {
  if (lead.status !== "Working") throw new LeadError("Only a Working lead can be completed.", 409, "INVALID_TRANSITION");
};

const validateTermsBody = (body) => {
  const allowed = new Set(["channelPartner", "suryamitra"]);
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !allowed.has(key))) throw new LeadError("Only channelPartner and suryamitra may be changed.");
  if (!Object.keys(body).length) throw new LeadError("No business-detail changes were provided.");
  return {
    channelPartner: Object.hasOwn(body, "channelPartner") ? cleanText(body.channelPartner, "Channel partner", { max: 160 }) : undefined,
    suryamitra: Object.hasOwn(body, "suryamitra") ? cleanText(body.suryamitra, "Suryamitra", { max: 160 }) : undefined,
  };
};

const assertLeadStatus = (value) => {
  if (!LEAD_STATUSES.includes(value)) throw new LeadError("Lead status is invalid.");
  return value;
};

module.exports = {
  LEAD_STATUSES, LEAD_SOURCES, LEAD_TYPES, LEAD_VIEWS, LeadError,
  todayInKolkata, isCalendarDate, cleanText, isValidIndianPhone,
  validateCreateLead, validateId, validateRequestKey, validateFollowUp,
  validateAssignmentId, ensureManager, ensureEmployee, ensureActiveAssignment,
  ensureCurrentSalesAssignment, ensureExecutionAssignment, ensureTermsAccess,
  ensureCanAssignSales, ensureCanStartExecution,
  ensureCanReassignExecution, ensureCanComplete, validateTermsBody,
  assertLeadStatus,
};
