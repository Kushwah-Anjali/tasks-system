const db = require("../config/db");
const policy = require("./leadPolicy");
const { presentActivity } = require("./leadActivityPresentation");

const SORT_COLUMNS = {
  customerName: "l.customer_name",
  status: "l.status",
  leadDate: "l.lead_date",
  nextFollowUp: "l.next_follow_up_date",
  assignedToName: "COALESCE((SELECT GROUP_CONCAT(assigned_user.full_name ORDER BY assigned_user.full_name SEPARATOR ', ') FROM lead_assignments assigned_work INNER JOIN users assigned_user ON assigned_user.id = assigned_work.user_id WHERE assigned_work.lead_id = l.id AND assigned_work.ended_at IS NULL), creator.full_name, '')",
};

const withTransaction = async (work) => {
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try { await connection.rollback(); } catch { /* Keep the original failure. */ }
    throw error;
  } finally { connection.release(); }
};

const lockLead = async (connection, leadId) => {
  const [rows] = await connection.query(
    `SELECT l.*, initial_department.name AS initial_department_name,
            current_department.name AS current_department_name
     FROM leads l
     INNER JOIN departments initial_department ON initial_department.id = l.department_id
     LEFT JOIN departments current_department ON current_department.id = l.current_department_id
     WHERE l.id = ? LIMIT 1 FOR UPDATE`, [leadId]
  );
  if (!rows.length) throw new policy.LeadError("Lead not found.", 404, "NOT_FOUND");
  return rows[0];
};

const lockCurrentAssignment = async (connection, leadId) => {
  const [rows] = await connection.query(
    `SELECT a.*, d.name AS department_name
     FROM lead_assignments a
     INNER JOIN departments d ON d.id = a.department_id
     WHERE a.lead_id = ? AND a.ended_at IS NULL
     ORDER BY a.id DESC LIMIT 1 FOR UPDATE`, [leadId]
  );
  return rows[0] || null;
};

const lockCurrentAssignments = async (connection, leadId) => {
  const [rows] = await connection.query(
    `SELECT a.*, d.name AS department_name
     FROM lead_assignments a INNER JOIN departments d ON d.id = a.department_id
     WHERE a.lead_id = ? AND a.ended_at IS NULL ORDER BY a.id ASC FOR UPDATE`, [leadId]
  );
  return rows;
};

const lockAssignment = async (connection, leadId, assignmentId) => {
  const [rows] = await connection.query(
    `SELECT a.*, d.name AS department_name FROM lead_assignments a
     INNER JOIN departments d ON d.id = a.department_id
     WHERE a.id = ? AND a.lead_id = ? LIMIT 1 FOR UPDATE`, [assignmentId, leadId]
  );
  if (!rows.length) throw new policy.LeadError("Assignment not found.", 404, "NOT_FOUND");
  return rows[0];
};

const ensureUnusedRequest = async (connection, requestKey) => {
  const [rows] = await connection.query("SELECT id FROM lead_activities WHERE request_key = ? LIMIT 1 FOR UPDATE", [requestKey]);
  if (rows.length) throw new policy.LeadError("This request was already processed. Refresh the lead.", 409, "DUPLICATE_REQUEST");
};

const addActivity = async (connection, { leadId, actorId, type, message, metadata = null, requestKey }) => {
  await connection.query(
    `INSERT INTO lead_activities (lead_id, actor_user_id, event_type, message, metadata, request_key)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [leadId, actorId, type, message, metadata === null ? null : JSON.stringify(metadata), requestKey]
  );
};

const notify = async (connection, { recipientId, actorId, leadId, type, title, message }) => {
  if (!recipientId || Number(recipientId) === Number(actorId)) return;
  const [recipients] = await connection.query("SELECT role FROM users WHERE id = ? LIMIT 1", [recipientId]);
  if (!recipients.length) return;
  const link = recipients[0].role === "manager" ? `/leads/${leadId}` : `/employee-leads/${leadId}`;
  await connection.query(
    `INSERT INTO notifications (user_id, type, title, message, reference_id, link)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [recipientId, type, title, String(message || "").slice(0, 255), leadId, link]
  );
};

const addAssignmentEvent = async (connection, { assignmentId, leadId, actorId, type, message, metadata = null, requestKey }) => {
  await connection.query(
    `INSERT INTO lead_assignment_events
       (assignment_id, lead_id, actor_user_id, event_type, message, metadata, request_key)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [assignmentId, leadId, actorId, type, message, metadata === null ? null : JSON.stringify(metadata), requestKey]
  );
};

const salesDepartment = async (connection, lock = false) => {
  const [rows] = await connection.query(`SELECT id, name FROM departments WHERE LOWER(TRIM(name)) = 'sales' LIMIT 1${lock ? " FOR UPDATE" : ""}`);
  if (!rows.length) throw new policy.LeadError("Sales department is not configured.", 409, "SALES_DEPARTMENT_MISSING");
  return rows[0];
};

const getActiveSalesEmployee = async (connection, userId, lock = false) => {
  const [rows] = await connection.query(
    `SELECT u.id, u.full_name, e.department_id, d.name AS department_name
     FROM users u
     INNER JOIN employees e ON e.user_id = u.id
     INNER JOIN departments d ON d.id = e.department_id
     WHERE u.id = ? AND u.role = 'employee' AND u.status = 'approved' AND u.is_active = 1
       AND LOWER(TRIM(d.name)) = 'sales'
     LIMIT 1${lock ? " FOR UPDATE" : ""}`, [userId]
  );
  if (!rows.length) throw new policy.LeadError("Choose an active employee in Sales.", 422, "INVALID_ASSIGNEE");
  return rows[0];
};

const getActiveEmployee = async (connection, userId, lock = false) => {
  const [rows] = await connection.query(
    `SELECT u.id, u.full_name, u.email, e.department_id, d.name AS department_name
     FROM users u INNER JOIN employees e ON e.user_id = u.id
     INNER JOIN departments d ON d.id = e.department_id
     WHERE u.id = ? AND u.role = 'employee' AND u.status = 'approved' AND u.is_active = 1
     LIMIT 1${lock ? " FOR UPDATE" : ""}`, [userId]
  );
  if (!rows.length) throw new policy.LeadError(`Employee account ${userId} is inactive or unavailable.`, 422, "INVALID_ASSIGNEE");
  return rows[0];
};

const insertAssignment = async (connection, { leadId, employee, departmentId, type, actorId, instruction }) => {
  const [result] = await connection.query(
    `INSERT INTO lead_assignments
       (lead_id, user_id, department_id, assignment_type, assigned_by_user_id, instruction)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [leadId, employee.id, departmentId, type, actorId, instruction || null]
  );
  return result.insertId;
};

const endAssignment = async (connection, assignment, reason) => {
  if (!assignment) return;
  await connection.query("UPDATE lead_assignments SET ended_at = NOW(), ended_reason = ? WHERE id = ? AND ended_at IS NULL", [reason || null, assignment.id]);
};

const parseMetadata = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return null; }
};

const mapLead = (row, assignments, activities, assignmentEvents = []) => ({
  id: String(row.id), customerName: row.customer_name, phone: row.customer_phone, address: row.address,
  source: row.source, referredBy: row.referred_by || "", referrerPhone: row.referrer_phone || "",
  channelPartner: row.channel_partner, suryamitra: row.suryamitra, leadType: row.lead_type || "Not specified", department: row.current_department_name || row.initial_department_name,
  initialDepartment: row.initial_department_name, leadDate: row.lead_date,
  status: row.status, initialRemark: row.initial_remark, latestRemark: row.latest_remark,
  nextFollowUp: row.next_follow_up_date, createdAt: row.created_at, createdBy: row.creator_name,
  creatorId: Number(row.created_by_user_id), assignedToId: row.status === "Working" ? null : (row.assigned_to_user_id === null ? null : String(row.assigned_to_user_id)),
  assignedToName: assignments.filter((item) => !item.ended_at).map((item) => item.employee_name).join(", ") || row.assignee_name || null,
  assignedDepartmentId: row.status === "Working" ? null : (row.assigned_department_id === null ? null : Number(row.assigned_department_id)),
  assignedDepartment: [...new Set(assignments.filter((item) => !item.ended_at).map((item) => item.department_name))].join(", ") || row.current_department_name || null,
  lastAssigneeName: row.last_assignee_name || null,
  nextActionOwnerId: row.needs_creator_review || !assignments.some((item) => !item.ended_at) ? Number(row.created_by_user_id) : null,
  nextActionOwnerName: row.needs_creator_review || !assignments.some((item) => !item.ended_at) ? row.creator_name : assignments.filter((item) => !item.ended_at).map((item) => item.employee_name).join(", "),
  needsCreatorReview: Boolean(Number(row.needs_creator_review)), reviewKind: row.review_kind, heldFromStatus: row.held_from_status || null,
  finalizedAt: row.finalized_at,
  workStartedAt: row.work_started_at, workReviewPending: assignments.some((item) => item.assignment_type === "execution" && !item.ended_at && item.work_status === "submitted"),
  cancelledAt: row.cancelled_at, completedAt: row.completed_at, completedBy: row.completer_name || null,
  ageDays: Math.max(0, Math.floor((Date.parse(`${row.status === "Completed" && row.completed_at ? kolkataDate(row.completed_at) : policy.todayInKolkata()}T00:00:00Z`) - Date.parse(`${row.lead_date}T00:00:00Z`)) / 86400000)),
  executionProgress: (() => {
    const active = assignments.filter((item) => item.assignment_type === "execution" && item.work_status !== "ended");
    const approved = active.filter((item) => item.work_status === "approved").length;
    return { total: active.length, approved, unresolved: active.length - approved, label: `${approved} of ${active.length} approved` };
  })(),
  version: Number(row.version), currentAssignmentId: assignments.find((item) => !item.ended_at)?.id ? Number(assignments.find((item) => !item.ended_at).id) : null,
  assignments: assignments.map((item) => ({
    id: Number(item.id), userId: Number(item.user_id), employeeName: item.employee_name, employeeEmail: item.employee_email,
    assignedById: Number(item.assigned_by_user_id), assignedByName: item.assigned_by_name,
    departmentId: Number(item.department_id), department: item.department_name, type: item.assignment_type,
    instruction: item.instruction, startedAt: item.started_at, endedAt: item.ended_at, endedReason: item.ended_reason,
    workStatus: item.work_status, latestUpdate: item.latest_update, submittedAt: item.submitted_at,
    reviewedAt: item.reviewed_at, reviewedBy: item.reviewed_by_name || null, reviewInstruction: item.review_instruction,
    events: assignmentEvents.filter((event) => Number(event.assignment_id) === Number(item.id)).map((event) => presentActivity(event, `assignment-${item.id}-`)),
  })),
  activities: activities.map((item) => presentActivity(item, "lead-")),
});

const kolkataDate = (value) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date(`${String(value).replace(" ", "T")}Z`));

const leadDetailSql = `SELECT l.*, initial_department.name AS initial_department_name,
  current_department.name AS current_department_name, creator.full_name AS creator_name,
  assignee.full_name AS assignee_name, completer.full_name AS completer_name,
  (SELECT last_user.full_name FROM lead_assignments last_assignment
   INNER JOIN users last_user ON last_user.id = last_assignment.user_id
   WHERE last_assignment.lead_id = l.id ORDER BY last_assignment.id DESC LIMIT 1) AS last_assignee_name
  FROM leads l
  INNER JOIN departments initial_department ON initial_department.id = l.department_id
  LEFT JOIN departments current_department ON current_department.id = l.current_department_id
  INNER JOIN users creator ON creator.id = l.created_by_user_id
  LEFT JOIN users assignee ON assignee.id = l.assigned_to_user_id
  LEFT JOIN users completer ON completer.id = l.completed_by_user_id`;

const loadLeadDetail = async (connection, leadId) => {
  const [rows] = await connection.query(`${leadDetailSql} WHERE l.id = ? LIMIT 1`, [leadId]);
  if (!rows.length) throw new policy.LeadError("Lead not found.", 404, "NOT_FOUND");
  const [assignments] = await connection.query(
    `SELECT a.*, u.full_name AS employee_name, u.email AS employee_email,
            d.name AS department_name, assigner.full_name AS assigned_by_name,
            reviewer.full_name AS reviewed_by_name
     FROM lead_assignments a INNER JOIN users u ON u.id = a.user_id
     INNER JOIN departments d ON d.id = a.department_id
     INNER JOIN users assigner ON assigner.id = a.assigned_by_user_id
     LEFT JOIN users reviewer ON reviewer.id = a.reviewed_by_user_id
     WHERE a.lead_id = ? ORDER BY a.id ASC`, [leadId]
  );
  const [assignmentEvents] = await connection.query(
    `SELECT e.*, actor.full_name AS actor_name, actor.avatar_preset_id AS actor_avatar_preset_id FROM lead_assignment_events e
     LEFT JOIN users actor ON actor.id = e.actor_user_id
     WHERE e.lead_id = ? ORDER BY e.created_at ASC, e.id ASC`, [leadId]
  );
  const [activities] = await connection.query(
    `SELECT a.*, u.full_name AS actor_name, u.avatar_preset_id AS actor_avatar_preset_id FROM lead_activities a
     LEFT JOIN users u ON u.id = a.actor_user_id
     WHERE a.lead_id = ? ORDER BY a.created_at ASC, a.id ASC`, [leadId]
  );
  return mapLead(rows[0], assignments, activities, assignmentEvents);
};

const employeeLeadView = (lead, userId) => {
  const current = lead.assignments.filter((item) => !item.endedAt && Number(item.userId) === Number(userId));
  const currentIds = new Set(current.map((item) => item.id));
  const executionIds = new Set(current.filter((item) => item.type === "execution").map((item) => item.id));
  const ownActivities = lead.activities.filter((item) => {
    const assignmentId = Number(item.metadata?.assignmentId);
    if (item.type.startsWith("execution_")) return false;
    if (!assignmentId) return true;
    return currentIds.has(assignmentId) && !executionIds.has(assignmentId);
  });
  return {
    id: lead.id, customerName: lead.customerName, phone: lead.phone, address: lead.address, source: lead.source,
    channelPartner: lead.channelPartner, suryamitra: lead.suryamitra, leadType: lead.leadType, department: lead.department,
    leadDate: lead.leadDate, status: lead.status, initialRemark: lead.initialRemark, latestRemark: lead.latestRemark,
    nextFollowUp: lead.nextFollowUp, assignedToName: lead.assignedToName, assignedDepartment: lead.assignedDepartment,
    needsCreatorReview: lead.needsCreatorReview, reviewKind: lead.reviewKind, workReviewPending: current.some((item) => item.workStatus === "submitted"),
    currentAssignmentId: current[0]?.id || null, assignments: current, activities: ownActivities,
    executionProgress: lead.executionProgress,
  };
};

const loadEmployeeAssignmentHistory = async (connection, userId, assignmentId = null, leadId = null) => {
  const filters = ["a.user_id = ?", "a.ended_at IS NOT NULL"];
  const params = [userId];
  if (assignmentId !== null) { filters.push("a.id = ?"); params.push(assignmentId); }
  if (leadId !== null) { filters.push("a.lead_id = ?"); params.push(leadId); }
  const [rows] = await connection.query(
    `SELECT a.*, l.customer_name, l.lead_date, l.status AS lead_status,
            d.name AS department_name, u.full_name AS employee_name
     FROM lead_assignments a
     INNER JOIN leads l ON l.id = a.lead_id
     INNER JOIN departments d ON d.id = a.department_id
     INNER JOIN users u ON u.id = a.user_id
     WHERE ${filters.join(" AND ")} ORDER BY a.ended_at DESC, a.id DESC`, params
  );
  if (!rows.length) return [];
  const ids = rows.map((row) => Number(row.id));
  const placeholders = ids.map(() => "?").join(",");
  const [events] = await connection.query(
    `SELECT e.*, actor.full_name AS actor_name, actor.avatar_preset_id AS actor_avatar_preset_id
     FROM lead_assignment_events e LEFT JOIN users actor ON actor.id = e.actor_user_id
     WHERE e.assignment_id IN (${placeholders}) ORDER BY e.created_at ASC, e.id ASC`, ids
  );
  const [activities] = await connection.query(
    `SELECT h.*, actor.full_name AS actor_name, actor.avatar_preset_id AS actor_avatar_preset_id,
            a.id AS matched_assignment_id
     FROM lead_activities h
     INNER JOIN lead_assignments a ON a.lead_id = h.lead_id AND a.user_id = ? AND a.ended_at IS NOT NULL
     LEFT JOIN users actor ON actor.id = h.actor_user_id
     WHERE a.id IN (${placeholders}) AND (
       CAST(JSON_UNQUOTE(JSON_EXTRACT(h.metadata, '$.assignmentId')) AS UNSIGNED) = a.id
       OR CAST(JSON_UNQUOTE(JSON_EXTRACT(h.metadata, '$.endedAssignmentId')) AS UNSIGNED) = a.id
       OR JSON_CONTAINS(JSON_EXTRACT(h.metadata, '$.endedAssignmentIds'), JSON_ARRAY(a.id))
     ) ORDER BY h.created_at ASC, h.id ASC`, [userId, ...ids]
  );
  return rows.map((row) => {
    const assignmentEvents = events.filter((event) => Number(event.assignment_id) === Number(row.id)).map((event) => presentActivity(event, `assignment-${row.id}-`));
    const linkedActivities = activities.filter((activity) => Number(activity.matched_assignment_id) === Number(row.id)).map((activity) => presentActivity(activity, "lead-"));
    const allEvents = [...assignmentEvents, ...linkedActivities].sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
    const submittedRemarks = allEvents.filter((event) => event.type === "submitted" || event.type === "employee_update_submitted");
    const uniqueRemarks = submittedRemarks.filter((event, index, list) => !list.slice(0, index).some((prior) => prior.text === event.text && prior.createdAt === event.createdAt));
    const managerFeedback = allEvents.filter((event) => ["rework_requested", "approved", "ended", "reassigned", "lead_completed", "manager_update_returned", "manager_update_acknowledged", "manager_status_changed", "manager_finalized", "execution_assignment_approved", "execution_assignment_rework_requested", "execution_assignment_ended", "execution_review_returned", "execution_review_acknowledged", "execution_reassigned"].includes(event.type));
    const reassigned = allEvents.some((event) => event.type === "reassigned" || event.type === "execution_reassigned");
    const leadEndDecision = linkedActivities.find((event) => ["manager_status_changed", "manager_finalized"].includes(event.type) && ["On Hold", "Cancelled", "Final"].includes(String(event.metadata?.to || "")));
    const assignmentOutcome = reassigned
      ? "Reassigned (not completed)"
      : row.work_status === "approved" ? "Approved"
        : leadEndDecision ? `Ended when lead moved to ${leadEndDecision.metadata.to}`
          : "Ended";
    return {
      leadId: Number(row.lead_id),
      leadReference: `Lead #${row.lead_id}`,
      customerName: row.customer_name,
      leadDate: row.lead_date,
      overallLeadStatus: row.lead_status,
      assignment: {
        id: Number(row.id), userId: Number(row.user_id), type: row.assignment_type,
        department: row.department_name, instruction: row.instruction, startedAt: row.started_at,
        endedAt: row.ended_at, endedReason: row.ended_reason, workStatus: row.work_status,
        outcome: assignmentOutcome,
      },
      submittedRemarks: uniqueRemarks,
      managerFeedback,
      events: allEvents,
    };
  });
};

const listMyAssignmentHistory = async (user) => {
  policy.ensureEmployee(user);
  return withTransaction((connection) => loadEmployeeAssignmentHistory(connection, user.id));
};

const getMyAssignmentHistory = async (leadIdValue, assignmentIdValue, user) => {
  policy.ensureEmployee(user);
  const leadId = policy.validateId(leadIdValue);
  const assignmentId = policy.validateAssignmentId(assignmentIdValue);
  const result = await withTransaction((connection) => loadEmployeeAssignmentHistory(connection, user.id, assignmentId, leadId));
  if (!result.length) throw new policy.LeadError("Assignment history not found.", 404, "NOT_FOUND");
  return result[0];
};

const requireManager = (user) => policy.ensureManager(user);
const requiredRemark = (value, label = "Remark") => policy.cleanText(value, label, { required: true, max: 1000 });
const allowBodyFields = (body, fields) => {
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !fields.includes(key))) {
    throw new policy.LeadError("Request contains unsupported fields.");
  }
  return body;
};

const createLead = async (input, user, requestKey) => {
  requireManager(user);
  const data = policy.validateCreateLead(input);
  return withTransaction(async (connection) => {
    const [dupes] = await connection.query("SELECT id FROM leads WHERE created_by_user_id = ? AND create_request_key = ? LIMIT 1 FOR UPDATE", [user.id, requestKey]);
    if (dupes.length) throw new policy.LeadError("This create request was already processed.", 409, "DUPLICATE_REQUEST");
    const sales = await salesDepartment(connection, true);
    let employee = null;
    if (data.assignedToId !== null) employee = await getActiveSalesEmployee(connection, data.assignedToId, true);
    const status = employee ? "Follow-up" : "Pending";
    const [result] = await connection.query(
      `INSERT INTO leads
        (customer_name, customer_phone, address, source, referred_by, referrer_phone,
         channel_partner, suryamitra, lead_type, department_id, current_department_id, lead_date,
         initial_remark, latest_remark, next_follow_up_date, status, created_by_user_id,
         assigned_to_user_id, assigned_department_id, create_request_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.customerName, data.phone, data.address, data.source, data.referredBy || null, data.referrerPhone || null,
        data.channelPartner || null, data.suryamitra || null, data.leadType, sales.id, employee ? sales.id : null, data.leadDate,
        data.initialRemark, data.initialRemark, data.nextFollowUp, status, user.id,
        employee?.id || null, employee ? sales.id : null, requestKey]
    );
    const leadId = result.insertId;
    if (employee) await insertAssignment(connection, { leadId, employee, departmentId: sales.id, type: "sales", actorId: user.id, instruction: "New Sales follow-up." });
    await connection.query(
      `INSERT INTO lead_activities (lead_id, actor_user_id, event_type, message, metadata, request_key)
       VALUES (?, ?, 'created', ?, ?, ?)`,
      [leadId, user.id, "Lead created in Sales.", JSON.stringify({ initialRemark: data.initialRemark, status }), requestKey]
    );
    if (employee) await notify(connection, { recipientId: employee.id, actorId: user.id, leadId, type: "lead_assigned", title: "Lead assigned", message: "A Sales lead is ready for follow-up." });
    return loadLeadDetail(connection, leadId);
  });
};

const getSalesAssignees = async () => {
  const [rows] = await db.promise().query(
    `SELECT u.id, u.full_name AS fullName, d.id AS departmentId, d.name AS department
     FROM users u INNER JOIN employees e ON e.user_id = u.id
     INNER JOIN departments d ON d.id = e.department_id
     WHERE u.role = 'employee' AND u.status = 'approved' AND u.is_active = 1
       AND LOWER(TRIM(d.name)) = 'sales' ORDER BY u.full_name ASC`
  );
  return rows;
};

const getLeadAssignees = async () => {
  const [rows] = await db.promise().query(
    `SELECT u.id, u.full_name AS fullName, d.id AS departmentId, d.name AS department
     FROM users u INNER JOIN employees e ON e.user_id = u.id
     INNER JOIN departments d ON d.id = e.department_id
     WHERE u.role = 'employee' AND u.status = 'approved' AND u.is_active = 1
     ORDER BY u.full_name ASC`
  );
  return rows;
};

const getExecutionAssignees = async () => {
  const [rows] = await db.promise().query(
    `SELECT u.id, u.full_name AS fullName, u.email AS email, d.id AS departmentId, d.name AS department
     FROM users u INNER JOIN employees e ON e.user_id = u.id
     INNER JOIN departments d ON d.id = e.department_id
     WHERE u.role = 'employee' AND u.status = 'approved' AND u.is_active = 1
     ORDER BY u.full_name ASC, u.email ASC, u.id ASC`
  );
  return rows;
};

const listLeads = async (query, userId) => {
  const page = Number(query.page ?? 1); const pageSize = Number(query.pageSize ?? 10);
  if (!Number.isSafeInteger(page) || page < 1 || ![10, 25, 50].includes(pageSize)) throw new policy.LeadError("Invalid pagination values.");
  const view = query.view || "All";
  if (!policy.LEAD_VIEWS.includes(view)) throw new policy.LeadError("Lead view is invalid.");
  const sortBy = query.sortBy || "leadDate"; const sortDirection = query.sortDirection || "desc";
  if (!Object.hasOwn(SORT_COLUMNS, sortBy) || !["asc", "desc"].includes(sortDirection)) throw new policy.LeadError("Sort options are invalid.");
  if (query.search !== undefined && (typeof query.search !== "string" || query.search.length > 100)) throw new policy.LeadError("Search must be 100 characters or fewer.");
  const search = (query.search || "").trim();
  const conditions = []; const params = [];
  if (view !== "All") { conditions.push("l.status = ?"); params.push(view); }
  if (search) { conditions.push("(l.customer_name LIKE ? OR l.customer_phone LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
  if (query.assignedTo && query.assignedTo !== "all") {
    if (query.assignedTo === "unassigned") conditions.push("NOT EXISTS (SELECT 1 FROM lead_assignments active_assignment WHERE active_assignment.lead_id = l.id AND active_assignment.ended_at IS NULL)");
    else { const assignedTo = policy.validateId(query.assignedTo, "Assignee id"); conditions.push("EXISTS (SELECT 1 FROM lead_assignments active_assignment WHERE active_assignment.lead_id = l.id AND active_assignment.user_id = ? AND active_assignment.ended_at IS NULL)"); params.push(assignedTo); }
  }
  if (query.needsMyReview !== undefined && !["true", "false", true, false].includes(query.needsMyReview)) throw new policy.LeadError("Needs my review must be true or false.");
  const needsMyReview = query.needsMyReview === "true" || query.needsMyReview === true;
  if (needsMyReview) { conditions.push("l.created_by_user_id = ? AND l.needs_creator_review = 1"); params.push(userId); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [[countRows], [statusRows], [leadRows]] = await Promise.all([
    db.promise().query(`SELECT COUNT(*) AS total FROM leads l ${where}`, params),
    db.promise().query("SELECT status, COUNT(*) AS total FROM leads GROUP BY status"),
    db.promise().query(
      `${leadDetailSql} ${where}
       ORDER BY ${SORT_COLUMNS[sortBy]} ${sortDirection.toUpperCase()}, l.id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    ),
  ]);
  const counts = Object.fromEntries(["All", ...policy.LEAD_STATUSES].map((status) => [status, status === "All" ? statusRows.reduce((sum, item) => sum + Number(item.total), 0) : Number(statusRows.find((item) => item.status === status)?.total || 0)]));
  const leads = await Promise.all(leadRows.map(async (row) => {
    const detail = await loadLeadDetail(db.promise(), row.id);
    return detail;
  }));
  return { leads, total: Number(countRows[0]?.total || 0), page, pageSize, counts };
};

const getLead = async (id, user, assignmentIdValue = null) => {
  const leadId = policy.validateId(id);
  if (!["manager", "employee"].includes(user?.role)) throw new policy.LeadError("You do not have permission to access Leads.", 403, "FORBIDDEN");
  if (user.role === "employee") {
    return withTransaction(async (connection) => {
      if (assignmentIdValue !== null) {
        const assignmentId = policy.validateAssignmentId(assignmentIdValue);
        const [owned] = await connection.query("SELECT id, ended_at FROM lead_assignments WHERE id = ? AND lead_id = ? AND user_id = ? LIMIT 1", [assignmentId, leadId, user.id]);
        if (!owned.length) throw new policy.LeadError("This assignment is unavailable.", 404, "NOT_FOUND");
        if (owned[0].ended_at) {
          const history = await loadEmployeeAssignmentHistory(connection, user.id, assignmentId, leadId);
          if (!history.length) throw new policy.LeadError("Assignment history not found.", 404, "NOT_FOUND");
          return { isHistoricalAssignment: true, ...history[0] };
        }
        const detail = employeeLeadView(await loadLeadDetail(connection, leadId), user.id);
        return { ...detail, assignments: detail.assignments.filter((assignment) => assignment.id === assignmentId), currentAssignmentId: assignmentId };
      }
      const [current] = await connection.query("SELECT a.id FROM lead_assignments a WHERE a.lead_id = ? AND a.user_id = ? AND a.ended_at IS NULL ORDER BY a.id DESC LIMIT 1", [leadId, user.id]);
      if (current.length) return employeeLeadView(await loadLeadDetail(connection, leadId), user.id);
      const [ended] = await connection.query("SELECT a.id FROM lead_assignments a WHERE a.lead_id = ? AND a.user_id = ? AND a.ended_at IS NOT NULL ORDER BY a.ended_at DESC, a.id DESC LIMIT 1", [leadId, user.id]);
      if (!ended.length) throw new policy.LeadError("This lead is not assigned to you.", 403, "FORBIDDEN");
      const history = await loadEmployeeAssignmentHistory(connection, user.id, ended[0].id, leadId);
      return { isHistoricalAssignment: true, ...history[0] };
    });
  }
  return loadLeadDetail(db.promise(), leadId);
};

const listMyLeads = async (user) => {
  policy.ensureEmployee(user);
  return withTransaction(async (connection) => {
    const [rows] = await connection.query(
      `SELECT l.id FROM leads l WHERE EXISTS (
         SELECT 1 FROM lead_assignments current_assignment
          WHERE current_assignment.lead_id = l.id AND current_assignment.user_id = ? AND current_assignment.ended_at IS NULL
       ) ORDER BY l.updated_at DESC, l.id DESC`, [user.id]
    );
    return Promise.all(rows.map(async (row) => employeeLeadView(await loadLeadDetail(connection, row.id), user.id)));
  });
};

const updateBusinessDetails = async (id, body, user, requestKey) => {
  requireManager(user);
  const leadId = policy.validateId(id); const { channelPartner, suryamitra } = policy.validateTermsBody(body);
  return withTransaction(async (connection) => {
    const lead = await lockLead(connection, leadId); const assignment = await lockCurrentAssignment(connection, leadId);
    policy.ensureTermsAccess(lead, assignment, user);
    if (lead.status === "Completed") throw new policy.LeadError("Completed leads are read-only.", 409, "INVALID_TRANSITION");
    await ensureUnusedRequest(connection, requestKey);
    const changes = {};
    if (channelPartner !== undefined && channelPartner !== (lead.channel_partner || "")) changes.channelPartner = { oldValue: lead.channel_partner, newValue: channelPartner || null };
    if (suryamitra !== undefined && suryamitra !== (lead.suryamitra || "")) changes.suryamitra = { oldValue: lead.suryamitra, newValue: suryamitra || null };
    if (!Object.keys(changes).length) throw new policy.LeadError("No values changed.", 409, "NO_CHANGE");
    const nextCp = changes.channelPartner ? changes.channelPartner.newValue : lead.channel_partner;
    const nextSm = changes.suryamitra ? changes.suryamitra.newValue : lead.suryamitra;
    await connection.query("UPDATE leads SET channel_partner = ?, suryamitra = ?, version = version + 1 WHERE id = ?", [nextCp, nextSm, leadId]);
    await addActivity(connection, { leadId, actorId: user.id, type: "business_details_updated", message: "Channel Partner or Suryamitra details updated.", metadata: changes, requestKey });
    return loadLeadDetail(connection, leadId);
  });
};

const submitEmployeeUpdate = async (id, body, user, assignmentId, requestKey) => {
  policy.ensureEmployee(user); allowBodyFields(body, ["remark"]);
  const leadId = policy.validateId(id); const expectedId = policy.validateAssignmentId(assignmentId);
  const remark = requiredRemark(body.remark, "Update");
  return withTransaction(async (connection) => {
    const lead = await lockLead(connection, leadId); const current = await lockAssignment(connection, leadId, expectedId);
    policy.ensureActiveAssignment(lead, current, user.id, expectedId, current.assignment_type);
    if (lead.status === "Completed") throw new policy.LeadError("Completed leads are read-only.", 409, "INVALID_TRANSITION");
    if (current.assignment_type === "execution") {
      policy.ensureExecutionAssignment(lead, current, user.id, expectedId);
      if (! ["assigned", "rework_requested"].includes(current.work_status)) throw new policy.LeadError("This assignment is not ready for another submission.", 409, "INVALID_TRANSITION");
      await ensureUnusedRequest(connection, requestKey);
      await connection.query("UPDATE lead_assignments SET work_status = 'submitted', latest_update = ?, submitted_at = NOW(), review_instruction = NULL WHERE id = ?", [remark, current.id]);
      await addAssignmentEvent(connection, { assignmentId: current.id, leadId, actorId: user.id, type: "submitted", message: remark, requestKey });
      await addActivity(connection, { leadId, actorId: user.id, type: "execution_submitted", message: "Execution work submitted for manager review.", metadata: { assignmentId: current.id }, requestKey });
      await notify(connection, { recipientId: lead.created_by_user_id, actorId: user.id, leadId, type: "lead_manager_review", title: "Execution work needs review", message: "An assigned employee submitted execution work for review." });
      return employeeLeadView(await loadLeadDetail(connection, leadId), user.id);
    }
    if (Number(lead.needs_creator_review) && lead.review_kind === "manager_update") throw new policy.LeadError("This update is already awaiting manager review.", 409, "DUPLICATE_SUBMISSION");
    await ensureUnusedRequest(connection, requestKey);
    await connection.query("UPDATE leads SET latest_remark = ?, needs_creator_review = 1, review_kind = 'manager_update', version = version + 1 WHERE id = ?", [remark, leadId]);
    await addActivity(connection, { leadId, actorId: user.id, type: "employee_update_submitted", message: remark, metadata: { assignmentId: current.id }, requestKey });
    await notify(connection, { recipientId: lead.created_by_user_id, actorId: user.id, leadId, type: "lead_manager_review", title: "Lead update needs review", message: "An assigned employee submitted a lead update." });
    const updated = await loadLeadDetail(connection, leadId);
    return employeeLeadView(updated, user.id);
  });
};

const reviewEmployeeUpdate = async (id, body, user, requestKey) => {
  requireManager(user); allowBodyFields(body, ["decision", "remark"]);
  const leadId = policy.validateId(id); const decision = body.decision;
  if (!["acknowledge", "return"].includes(decision)) throw new policy.LeadError("Choose acknowledge or return.");
  const remark = decision === "return" ? requiredRemark(body.remark, "Return instruction") : policy.cleanText(body.remark, "Review remark", { max: 1000 });
  return withTransaction(async (connection) => {
    const lead = await lockLead(connection, leadId); const current = (await lockCurrentAssignments(connection, leadId))[0] || null;
    if (!Number(lead.needs_creator_review) || lead.review_kind !== "manager_update") throw new policy.LeadError("This lead has no employee update awaiting review.", 409, "INVALID_TRANSITION");
    await ensureUnusedRequest(connection, requestKey);
    const message = remark || "Employee update reviewed by manager.";
    await connection.query("UPDATE leads SET needs_creator_review = 0, review_kind = NULL, version = version + 1 WHERE id = ?", [leadId]);
    await addActivity(connection, { leadId, actorId: user.id, type: decision === "return" ? "manager_update_returned" : "manager_update_acknowledged", message, metadata: { decision, assignmentId: current?.id || null }, requestKey });
    if (current) await notify(connection, { recipientId: current.user_id, actorId: user.id, leadId, type: decision === "return" ? "lead_update_returned" : "lead_update_reviewed", title: decision === "return" ? "Manager instructions" : "Update reviewed", message });
    return loadLeadDetail(connection, leadId);
  });
};

const setManagerLeadStatus = async (id, body, user, requestKey) => {
  requireManager(user); allowBodyFields(body, ["status", "remark"]);
  const leadId = policy.validateId(id); const status = body.status;
  if (!["On Hold", "Cancelled", "Final"].includes(status)) throw new policy.LeadError("Choose On Hold, Cancelled, or Final.");
  const remark = requiredRemark(body.remark, "Manager decision remark");
  return withTransaction(async (connection) => {
    const lead = await lockLead(connection, leadId); const currentAssignments = await lockCurrentAssignments(connection, leadId);
    if (lead.status === "Completed") throw new policy.LeadError("Completed leads can only receive manager remarks.", 409, "INVALID_TRANSITION");
    if (lead.status === status) throw new policy.LeadError("The lead already has this status.", 409, "NO_CHANGE");
    if (status === "Final" && (lead.status === "Working" || lead.held_from_status === "Working")) throw new policy.LeadError("An execution lead cannot be finalized again.", 409, "INVALID_TRANSITION");
    await ensureUnusedRequest(connection, requestKey);
    for (const current of currentAssignments) {
      if (current.assignment_type === "execution") {
        await connection.query("UPDATE lead_assignments SET work_status = 'ended' WHERE id = ?", [current.id]);
        await addAssignmentEvent(connection, { assignmentId: current.id, leadId, actorId: user.id, type: "ended", message: remark, metadata: { status }, requestKey });
      }
      await endAssignment(connection, current, remark);
    }
    const final = status === "Final";
    const heldFromStatus = status === "On Hold" ? (lead.status === "On Hold" ? lead.held_from_status : lead.status) : null;
    await connection.query(
      `UPDATE leads SET status = ?, assigned_to_user_id = NULL, assigned_department_id = NULL,
       latest_remark = ?, needs_creator_review = 0, review_kind = NULL, held_from_status = ?,
       finalized_at = CASE WHEN ? = 'Final' THEN NOW() ELSE finalized_at END,
       cancelled_at = CASE WHEN ? = 'Cancelled' THEN NOW() ELSE cancelled_at END,
       version = version + 1 WHERE id = ?`,
      [status, remark, heldFromStatus, status, status, leadId]
    );
    await addActivity(connection, { leadId, actorId: user.id, type: final ? "manager_finalized" : "manager_status_changed", message: remark, metadata: { from: lead.status, to: status, heldFromStatus, endedAssignmentIds: currentAssignments.map((assignment) => assignment.id) }, requestKey });
    for (const current of currentAssignments) await notify(connection, { recipientId: current.user_id, actorId: user.id, leadId, type: "lead_assignment_ended", title: "Lead assignment ended", message: `The manager changed this lead to ${status}.` });
    if (final) await notify(connection, { recipientId: lead.created_by_user_id, actorId: user.id, leadId, type: "lead_finalized", title: "Lead finalized", message: "A manager marked this lead Final." });
    return loadLeadDetail(connection, leadId);
  });
};

const createSalesAssignment = async (connection, lead, employee, userId, instruction, requestKey) => {
  const sales = await salesDepartment(connection, true);
  await insertAssignment(connection, { leadId: lead.id, employee, departmentId: sales.id, type: "sales", actorId: userId, instruction });
  await connection.query(
    `UPDATE leads SET status = 'Follow-up', assigned_to_user_id = ?, assigned_department_id = ?, current_department_id = ?,
       needs_creator_review = 0, review_kind = NULL, held_from_status = NULL, version = version + 1 WHERE id = ?`,
    [employee.id, sales.id, sales.id, lead.id]
  );
  await addActivity(connection, { leadId: lead.id, actorId: userId, type: "sales_assigned", message: `Sales follow-up assigned to ${employee.full_name}.`, metadata: { userId: employee.id, assigneeName: employee.full_name, departmentId: sales.id, instruction: instruction || null }, requestKey });
  await notify(connection, { recipientId: employee.id, actorId: userId, leadId: lead.id, type: "lead_assigned", title: "Lead assigned", message: "A Sales lead is ready for follow-up." });
};

const assignSalesLead = async (id, body, user, requestKey) => {
  requireManager(user); allowBodyFields(body, ["assigneeId", "instruction"]); const leadId = policy.validateId(id); const assigneeId = policy.validateId(body.assigneeId, "Assignee id");
  return withTransaction(async (connection) => {
    const lead = await lockLead(connection, leadId); const current = await lockCurrentAssignment(connection, leadId);
    await ensureUnusedRequest(connection, requestKey);
    policy.ensureCanAssignSales(lead, current);
    const employee = await getActiveSalesEmployee(connection, assigneeId, true);
    await createSalesAssignment(connection, lead, employee, user.id, body.instruction ? policy.cleanText(body.instruction, "Instruction", { max: 1000 }) : "Sales follow-up", requestKey);
    return loadLeadDetail(connection, leadId);
  });
};

const returnFinalToSales = async (id, body, user, requestKey) => {
  requireManager(user); allowBodyFields(body, ["assigneeId", "instruction"]);
  const leadId = policy.validateId(id); const assigneeId = policy.validateId(body.assigneeId, "Sales assignee id");
  const instruction = requiredRemark(body.instruction, "Sales instruction");
  return withTransaction(async (connection) => {
    const lead = await lockLead(connection, leadId); const current = await lockCurrentAssignment(connection, leadId);
    if (current || !(lead.status === "Final" || (lead.status === "On Hold" && lead.held_from_status === "Final"))) {
      throw new policy.LeadError("Only a Final lead without an active assignment can be returned to Sales.", 409, "INVALID_TRANSITION");
    }
    await ensureUnusedRequest(connection, requestKey);
    const employee = await getActiveSalesEmployee(connection, assigneeId, true);
    await createSalesAssignment(connection, lead, employee, user.id, instruction, requestKey);
    await addActivity(connection, { leadId, actorId: user.id, type: "final_returned_to_sales", message: instruction, metadata: { assigneeId: employee.id, assigneeName: employee.full_name }, requestKey: `${requestKey}_sales` });
    return loadLeadDetail(connection, leadId);
  });
};

const startOrReassignExecution = async (id, body, user, requestKey) => {
  requireManager(user); allowBodyFields(body, ["employeeIds", "instruction", "instructionOverrides"]);
  const leadId = policy.validateId(id);
  if (!Array.isArray(body.employeeIds) || body.employeeIds.length < 1 || body.employeeIds.length > 50) throw new policy.LeadError("Select between one and 50 employees.", 422, "INVALID_ASSIGNEES");
  const employeeIds = body.employeeIds.map((value) => policy.validateId(value, "Employee id"));
  if (new Set(employeeIds).size !== employeeIds.length) throw new policy.LeadError("An employee can only be selected once.", 422, "DUPLICATE_ASSIGNEE");
  const instruction = requiredRemark(body.instruction, "Work instructions");
  const overrides = body.instructionOverrides ?? {};
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides) || Object.keys(overrides).some((key) => !employeeIds.includes(Number(key)))) throw new policy.LeadError("Instruction overrides must belong to selected employees.", 422, "INVALID_INSTRUCTION_OVERRIDE");
  return withTransaction(async (connection) => {
    const lead = await lockLead(connection, leadId);
    const current = await lockCurrentAssignments(connection, leadId);
    const canStart = lead.status === "Final" || (lead.status === "On Hold" && ["Final", "Working"].includes(lead.held_from_status));
    if (lead.status !== "Working" && !canStart) throw new policy.LeadError("Execution can only be assigned to a Final, Working, or held execution lead.", 409, "INVALID_TRANSITION");
    if (canStart && current.length) throw new policy.LeadError("Held or Final leads cannot have active work assignments.", 409, "INVALID_TRANSITION");
    await ensureUnusedRequest(connection, requestKey);
    const [employees] = await connection.query(
      `SELECT u.id,u.full_name,u.email,e.department_id,d.name AS department_name
       FROM users u INNER JOIN employees e ON e.user_id=u.id
       INNER JOIN departments d ON d.id=e.department_id
       WHERE u.id IN (?) AND u.role='employee' AND u.status='approved' AND u.is_active=1
       ORDER BY u.id FOR UPDATE`, [employeeIds]
    );
    const found = new Set(employees.map((employee) => Number(employee.id)));
    const invalid = employeeIds.filter((employeeId) => !found.has(employeeId));
    if (invalid.length) throw new policy.LeadError(`These employee accounts are inactive or unavailable: ${invalid.join(", ")}. No work was assigned.`, 422, "INVALID_ASSIGNEES");
    const [duplicates] = await connection.query(
      `SELECT user_id FROM lead_assignments WHERE lead_id=? AND assignment_type='execution' AND ended_at IS NULL AND user_id IN (?)`, [leadId, employeeIds]
    );
    if (duplicates.length) throw new policy.LeadError(`Already assigned: ${duplicates.map((item) => item.user_id).join(", ")}. No work was assigned.`, 409, "DUPLICATE_ACTIVE_ASSIGNMENT");
    const created = [];
    for (const employee of employees) {
      const override = Object.hasOwn(overrides, String(employee.id)) ? policy.cleanText(overrides[String(employee.id)], "Instruction override", { max: 1000 }) : "";
      const employeeInstruction = override || instruction;
      const assignmentId = await insertAssignment(connection, { leadId, employee, departmentId: employee.department_id, type: "execution", actorId: user.id, instruction: employeeInstruction });
      await addAssignmentEvent(connection, { assignmentId, leadId, actorId: user.id, type: "assigned", message: employeeInstruction, metadata: { employeeName: employee.full_name }, requestKey });
      created.push({ ...employee, assignmentId, instruction: employeeInstruction });
    }
    if (canStart) {
      await connection.query(
        `UPDATE leads SET status='Working', current_department_id=?, assigned_to_user_id=NULL,
         assigned_department_id=NULL, work_started_at=COALESCE(work_started_at,NOW()),
         work_review_pending=0, work_review_submitted_at=NULL, needs_creator_review=0,
         held_from_status=NULL, review_kind=NULL, version=version+1 WHERE id=?`, [employees[0].department_id, leadId]
      );
    } else {
      await connection.query("UPDATE leads SET version=version+1 WHERE id=?", [leadId]);
    }
    const eventType = canStart ? "execution_started" : "execution_assignments_added";
    const eventMessage = canStart ? `Execution started with ${created.length} employee assignment${created.length === 1 ? "" : "s"}.` : `Added ${created.length} execution assignment${created.length === 1 ? "" : "s"}.`;
    await addActivity(connection, { leadId, actorId: user.id, type: eventType, message: eventMessage, metadata: { assignmentCount: created.length, assignees: created.map((employee) => ({ userId: employee.id, fullName: employee.full_name })) }, requestKey });
    for (const employee of created) await notify(connection, { recipientId: employee.id, actorId: user.id, leadId, type: "lead_execution_assigned", title: "Execution work assigned", message: "Execution work is assigned to you." });
    return loadLeadDetail(connection, leadId);
  });
};

const reviewExecutionAssignment = async (id, assignmentIdValue, body, user, requestKey) => {
  requireManager(user); allowBodyFields(body, ["decision", "remark"]);
  const leadId = policy.validateId(id); const assignmentId = policy.validateAssignmentId(assignmentIdValue);
  const decision = body.decision;
  if (!["approve", "rework"].includes(decision)) throw new policy.LeadError("Choose approve or request rework.");
  const remark = decision === "rework" ? requiredRemark(body.remark, "Rework instructions") : policy.cleanText(body.remark, "Review remark", { max: 1000 });
  return withTransaction(async (connection) => {
    const lead = await lockLead(connection, leadId); const assignment = await lockAssignment(connection, leadId, assignmentId);
    if (lead.status !== "Working" || assignment.assignment_type !== "execution" || assignment.ended_at || assignment.work_status !== "submitted") throw new policy.LeadError("This assignment has no submission awaiting review.", 409, "INVALID_TRANSITION");
    await ensureUnusedRequest(connection, requestKey);
    const status = decision === "approve" ? "approved" : "rework_requested";
    const message = remark || "Execution work approved by manager.";
    await connection.query("UPDATE lead_assignments SET work_status=?, reviewed_at=NOW(), reviewed_by_user_id=?, review_instruction=? WHERE id=?", [status, user.id, decision === "rework" ? remark : null, assignmentId]);
    await addAssignmentEvent(connection, { assignmentId, leadId, actorId: user.id, type: status, message, requestKey });
    await addActivity(connection, { leadId, actorId: user.id, type: decision === "approve" ? "execution_assignment_approved" : "execution_assignment_rework_requested", message, metadata: { assignmentId }, requestKey });
    await connection.query("UPDATE leads SET version=version+1 WHERE id=?", [leadId]);
    await notify(connection, { recipientId: assignment.user_id, actorId: user.id, leadId, type: decision === "rework" ? "lead_work_returned" : "lead_work_approved", title: decision === "rework" ? "Work needs another update" : "Work approved", message });
    return loadLeadDetail(connection, leadId);
  });
};

const reassignExecutionAssignment = async (id, assignmentIdValue, body, user, requestKey) => {
  requireManager(user); allowBodyFields(body, ["employeeId", "instruction", "reason"]);
  const leadId = policy.validateId(id); const assignmentId = policy.validateAssignmentId(assignmentIdValue);
  const employeeId = policy.validateId(body.employeeId, "Employee id");
  const instruction = requiredRemark(body.instruction, "Work instructions");
  const reason = requiredRemark(body.reason, "Reassignment reason");
  return withTransaction(async (connection) => {
    const lead = await lockLead(connection, leadId); const old = await lockAssignment(connection, leadId, assignmentId);
    if (lead.status !== "Working" || old.assignment_type !== "execution" || old.ended_at) throw new policy.LeadError("Only an active Working assignment can be reassigned.", 409, "INVALID_TRANSITION");
    if (Number(old.user_id) === employeeId) throw new policy.LeadError("Choose a different employee for reassignment.", 409, "DUPLICATE_ACTIVE_ASSIGNMENT");
    await ensureUnusedRequest(connection, requestKey);
    const employee = await getActiveEmployee(connection, employeeId, true);
    const [duplicate] = await connection.query("SELECT id FROM lead_assignments WHERE lead_id=? AND assignment_type='execution' AND user_id=? AND ended_at IS NULL LIMIT 1", [leadId, employeeId]);
    if (duplicate.length) throw new policy.LeadError("This employee already has active work on the lead.", 409, "DUPLICATE_ACTIVE_ASSIGNMENT");
    await connection.query("UPDATE lead_assignments SET ended_at=NOW(),ended_reason=?,work_status='ended' WHERE id=?", [reason, assignmentId]);
    await addAssignmentEvent(connection, { assignmentId, leadId, actorId: user.id, type: "reassigned", message: reason, requestKey });
    const newAssignmentId = await insertAssignment(connection, { leadId, employee, departmentId: employee.department_id, type: "execution", actorId: user.id, instruction });
    await addAssignmentEvent(connection, { assignmentId: newAssignmentId, leadId, actorId: user.id, type: "assigned", message: instruction, metadata: { replacedAssignmentId: assignmentId }, requestKey });
    await addActivity(connection, { leadId, actorId: user.id, type: "execution_reassigned", message: reason, metadata: { endedAssignmentId: assignmentId, newAssignmentId, assigneeName: employee.full_name }, requestKey });
    await connection.query("UPDATE leads SET version=version+1 WHERE id=?", [leadId]);
    await notify(connection, { recipientId: old.user_id, actorId: user.id, leadId, type: "lead_assignment_ended", title: "Work reassigned", message: "Your execution assignment has ended." });
    await notify(connection, { recipientId: employee.id, actorId: user.id, leadId, type: "lead_execution_assigned", title: "Execution work assigned", message: "Execution work is assigned to you." });
    return loadLeadDetail(connection, leadId);
  });
};

const endExecutionAssignment = async (id, assignmentIdValue, body, user, requestKey) => {
  requireManager(user); allowBodyFields(body, ["reason"]);
  const leadId = policy.validateId(id); const assignmentId = policy.validateAssignmentId(assignmentIdValue);
  const reason = requiredRemark(body.reason, "Reason");
  return withTransaction(async (connection) => {
    const lead = await lockLead(connection, leadId); const assignment = await lockAssignment(connection, leadId, assignmentId);
    if (lead.status !== "Working" || assignment.assignment_type !== "execution" || assignment.ended_at) throw new policy.LeadError("Only an active Working assignment can be ended.", 409, "INVALID_TRANSITION");
    await ensureUnusedRequest(connection, requestKey);
    await connection.query("UPDATE lead_assignments SET ended_at=NOW(),ended_reason=?,work_status='ended' WHERE id=?", [reason, assignmentId]);
    await addAssignmentEvent(connection, { assignmentId, leadId, actorId: user.id, type: "ended", message: reason, requestKey });
    await addActivity(connection, { leadId, actorId: user.id, type: "execution_assignment_ended", message: reason, metadata: { assignmentId }, requestKey });
    await connection.query("UPDATE leads SET version=version+1 WHERE id=?", [leadId]);
    await notify(connection, { recipientId: assignment.user_id, actorId: user.id, leadId, type: "lead_assignment_ended", title: "Work assignment ended", message: reason });
    return loadLeadDetail(connection, leadId);
  });
};

const completeLead = async (id, body, user, requestKey) => {
  requireManager(user); allowBodyFields(body, ["completionRemark"]); const leadId = policy.validateId(id); const remark = requiredRemark(body.completionRemark, "Completion remark");
  return withTransaction(async (connection) => {
    const lead = await lockLead(connection, leadId); const currentAssignments = await lockCurrentAssignments(connection, leadId);
    await ensureUnusedRequest(connection, requestKey);
    policy.ensureCanComplete(lead);
    const unresolved = currentAssignments.filter((assignment) => assignment.assignment_type === "execution" && assignment.work_status !== "approved");
    if (unresolved.length) throw new policy.LeadError(`Approve or explicitly end all active assignments before completing this lead (${unresolved.length} unresolved).`, 409, "ASSIGNMENTS_UNRESOLVED");
    for (const assignment of currentAssignments) {
      await endAssignment(connection, assignment, "Lead completed.");
      if (assignment.assignment_type === "execution") await addAssignmentEvent(connection, { assignmentId: assignment.id, leadId, actorId: user.id, type: "lead_completed", message: "Lead completed.", requestKey });
      await notify(connection, { recipientId: assignment.user_id, actorId: user.id, leadId, type: "lead_completed", title: "Lead completed", message: "The manager completed this lead." });
    }
    await connection.query(
      `UPDATE leads SET status = 'Completed', completed_at = NOW(), completed_by_user_id = ?,
       assigned_to_user_id = NULL, assigned_department_id = NULL, work_review_pending = 0,
       needs_creator_review = 0, review_kind = NULL,
       latest_remark = ?, version = version + 1 WHERE id = ?`, [user.id, remark, leadId]
    );
    await addActivity(connection, { leadId, actorId: user.id, type: "completed", message: remark, metadata: { completedBy: user.id }, requestKey });
    return loadLeadDetail(connection, leadId);
  });
};

const addManagerRemark = async (id, body, user, requestKey) => {
  requireManager(user); allowBodyFields(body, ["remark", "nextFollowUp"]); const leadId = policy.validateId(id); const remark = requiredRemark(body.remark);
  return withTransaction(async (connection) => {
    const lead = await lockLead(connection, leadId); await ensureUnusedRequest(connection, requestKey);
    if (lead.status === "Completed" && body.nextFollowUp !== undefined) throw new policy.LeadError("Completed leads can only receive remarks.", 409, "INVALID_TRANSITION");
    const nextFollowUp = body.nextFollowUp === undefined ? lead.next_follow_up_date : policy.validateFollowUp(body.nextFollowUp, lead.lead_date);
    await connection.query("UPDATE leads SET latest_remark = ?, next_follow_up_date = ?, version = version + 1 WHERE id = ?", [remark, nextFollowUp, leadId]);
    await addActivity(connection, { leadId, actorId: user.id, type: "manager_remark", message: remark, metadata: { nextFollowUp }, requestKey });
    return loadLeadDetail(connection, leadId);
  });
};

module.exports = {
  createLead, listLeads, getLead, listMyLeads, listMyAssignmentHistory, getMyAssignmentHistory, submitEmployeeUpdate, reviewEmployeeUpdate, setManagerLeadStatus, getSalesAssignees, getLeadAssignees,
  getExecutionAssignees, updateBusinessDetails, assignSalesLead, returnFinalToSales,
  startOrReassignExecution,
  reviewExecutionAssignment, reassignExecutionAssignment, endExecutionAssignment,
  completeLead, addManagerRemark,
};
