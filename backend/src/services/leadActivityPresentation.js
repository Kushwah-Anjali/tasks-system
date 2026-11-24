const MANAGER_EVENT_TYPES = new Set([
  "created", "sales_assigned", "business_details_updated", "manager_finalized", "manager_status_changed",
  "final_returned_to_sales", "execution_started", "execution_assignments_added", "execution_reassigned",
  "execution_assignment_approved", "execution_assignment_rework_requested", "execution_assignment_ended",
  "manager_update_returned", "manager_update_acknowledged", "completed", "manager_remark",
  "assigned", "approved", "rework_requested", "reassigned", "ended", "lead_completed",
  "execution_review_returned", "execution_review_acknowledged",
]);
const EMPLOYEE_EVENT_TYPES = new Set(["employee_update_submitted", "execution_submitted", "submitted"]);

const cleanName = (value) => typeof value === "string" && value.trim() ? value.trim().slice(0, 100) : null;
const assignedNames = (metadata) => Array.isArray(metadata?.assignees)
  ? metadata.assignees.map((item) => cleanName(item?.fullName || item?.employeeName)).filter(Boolean)
  : [];

const eventRoleLabel = (eventType) => {
  if (eventType?.startsWith("system_")) return "System";
  if (MANAGER_EVENT_TYPES.has(eventType)) return "Manager";
  if (EMPLOYEE_EVENT_TYPES.has(eventType)) return "Employee";
  return null;
};

const actionLabel = (eventType, metadata) => {
  const recipient = cleanName(metadata?.assigneeName || metadata?.employeeName || metadata?.newEmployeeName);
  const recipients = assignedNames(metadata);
  switch (eventType) {
    case "created": return "Created lead";
    case "manager_remark": return "Added a remark";
    case "employee_update_submitted": return "Submitted an update for review";
    case "execution_submitted": case "submitted": return "Submitted work for review";
    case "manager_update_acknowledged": return "Reviewed an update";
    case "manager_update_returned": return "Returned an update with instructions";
    case "execution_assignment_approved": case "approved": case "execution_review_acknowledged": return "Approved submitted work";
    case "execution_assignment_rework_requested": case "rework_requested": case "execution_review_returned": return "Requested rework";
    case "business_details_updated": return "Updated CP / SM";
    case "sales_assigned": return recipient ? `Assigned Sales follow-up to ${recipient}` : "Assigned Sales follow-up";
    case "final_returned_to_sales": return recipient ? `Returned lead to Sales with ${recipient}` : "Returned lead to Sales follow-up";
    case "execution_started": case "execution_assignments_added":
      if (recipients.length === 1) return `Assigned work to ${recipients[0]}`;
      if (recipients.length > 1) return `Assigned work to ${recipients.join(", ")}`;
      return "Assigned work";
    case "assigned": return recipient ? `Assigned work to ${recipient}` : "Assigned work";
    case "execution_reassigned": case "reassigned": return recipient ? `Reassigned work to ${recipient}` : "Reassigned work";
    case "execution_assignment_ended": case "ended": return recipient ? `Ended work assignment for ${recipient}` : "Ended work assignment";
    case "manager_finalized": case "manager_status_changed": {
      const from = cleanName(metadata?.from); const to = cleanName(metadata?.to);
      return from && to ? `Changed status from ${from} to ${to}` : to ? `Changed status to ${to}` : "Changed lead status";
    }
    case "completed": case "lead_completed": return "Completed lead";
    default: return "Activity update";
  }
};

const parseMetadata = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return null; }
};

const presentActivity = (row, idPrefix = "") => {
  const metadata = parseMetadata(row.metadata);
  const type = row.event_type || row.type || "";
  const actorRoleLabel = eventRoleLabel(type);
  const actorName = cleanName(row.actor_name) || (actorRoleLabel === "System" ? "System" : null);
  return {
    id: `${idPrefix}${row.id}`,
    type,
    actionLabel: actionLabel(type, metadata),
    actorId: row.actor_user_id === null || row.actor_user_id === undefined ? null : Number(row.actor_user_id),
    actorName,
    actorRoleLabel,
    actorAvatarPresetId: row.actor_avatar_preset_id || null,
    actorPhotoUrl: null,
    createdAt: row.created_at,
    text: row.message || "",
    metadata,
  };
};

module.exports = { actionLabel, eventRoleLabel, parseMetadata, presentActivity };
