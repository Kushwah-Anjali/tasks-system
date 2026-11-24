const leadService = require("../services/leadService");
const policy = require("../services/leadPolicy");

const sendError = (res, error) => {
  const status = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  if (status >= 500) console.error("Lead request failed:", error?.code || "INTERNAL_ERROR");
  return res.status(status).json({
    message: status >= 500 ? "Unable to process the lead request." : error.message,
    code: error?.code || (status >= 500 ? "INTERNAL_ERROR" : undefined),
    ...(status < 500 && error?.field ? { field: error.field } : {}),
  });
};

const wrap = (handler, successStatus = 200) => async (req, res) => {
  try {
    const result = await handler(req);
    return res.status(successStatus).json(result === undefined ? { message: "Lead updated." } : result);
  } catch (error) { return sendError(res, error); }
};

const requestKey = (req) => policy.validateRequestKey(req.get("Idempotency-Key"));
const list = wrap((req) => leadService.listLeads(req.query, req.user.id));
const mine = wrap((req) => leadService.listMyLeads(req.user));
const mineHistory = wrap((req) => leadService.listMyAssignmentHistory(req.user));
const mineHistoryDetail = wrap((req) => leadService.getMyAssignmentHistory(req.params.id, req.params.assignmentId, req.user));
const details = wrap((req) => leadService.getLead(req.params.id, req.user, req.query.assignmentId ?? null));
const salesAssignees = wrap(() => leadService.getSalesAssignees().then((employees) => ({ employees })));
const assignees = wrap(() => leadService.getLeadAssignees().then((employees) => ({ employees })));
const executionAssignees = wrap(() => leadService.getExecutionAssignees().then((employees) => ({ employees })));
const create = wrap((req) => leadService.createLead(req.body, req.user, requestKey(req)), 201);
const businessDetails = wrap((req) => leadService.updateBusinessDetails(req.params.id, req.body, req.user, requestKey(req)));
const salesAssignment = wrap((req) => leadService.assignSalesLead(req.params.id, req.body, req.user, requestKey(req)));
const execution = wrap((req) => leadService.startOrReassignExecution(req.params.id, req.body, req.user, requestKey(req)));
const assignmentReview = wrap((req) => leadService.reviewExecutionAssignment(req.params.id, req.params.assignmentId, req.body, req.user, requestKey(req)));
const assignmentReassign = wrap((req) => leadService.reassignExecutionAssignment(req.params.id, req.params.assignmentId, req.body, req.user, requestKey(req)));
const assignmentEnd = wrap((req) => leadService.endExecutionAssignment(req.params.id, req.params.assignmentId, req.body, req.user, requestKey(req)));
const complete = wrap((req) => leadService.completeLead(req.params.id, req.body, req.user, requestKey(req)));
const managerRemark = wrap((req) => leadService.addManagerRemark(req.params.id, req.body, req.user, requestKey(req)));
const employeeSubmission = wrap((req) => leadService.submitEmployeeUpdate(req.params.id, req.body, req.user, req.get("X-Lead-Assignment-Id"), requestKey(req)));
const employeeUpdateReview = wrap((req) => leadService.reviewEmployeeUpdate(req.params.id, req.body, req.user, requestKey(req)));
const managerStatus = wrap((req) => leadService.setManagerLeadStatus(req.params.id, req.body, req.user, requestKey(req)));
const returnFinalToSales = wrap((req) => leadService.returnFinalToSales(req.params.id, req.body, req.user, requestKey(req)));

module.exports = {
  list, mine, mineHistory, mineHistoryDetail, details, assignees, salesAssignees, executionAssignees,
  create, businessDetails, salesAssignment, execution, assignmentReview, assignmentReassign, assignmentEnd, complete, managerRemark, employeeSubmission, employeeUpdateReview, managerStatus, returnFinalToSales,
};
