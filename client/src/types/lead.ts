export const LEAD_STATUSES = ["Pending", "Follow-up", "On Hold", "Final", "Working", "Completed", "Cancelled"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const LEAD_VIEWS = ["All", ...LEAD_STATUSES] as const;
export type LeadView = (typeof LEAD_VIEWS)[number];
export const LEAD_SOURCES = ["Phone", "WhatsApp", "Website", "Referral", "Walk-in", "Other"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];
export const LEAD_TYPES = ["Residential", "Commercial"] as const;
export type LeadType = (typeof LEAD_TYPES)[number];

export interface Assignee {
  id: string;
  fullName: string;
  email?: string;
  departmentId: string;
  department: string;
  demo?: boolean;
}
export interface Department { id: string; name: string; }

export interface LeadActivity {
  id: string;
  type: string;
  actionLabel: string;
  actorId: number | null;
  actorName: string | null;
  actorRoleLabel: string | null;
  actorAvatarPresetId: string | null;
  actorPhotoUrl: string | null;
  createdAt: string;
  text: string;
  metadata: Record<string, unknown> | null;
}
export interface LeadAssignment {
  id: number;
  userId: number;
  employeeName: string;
  employeeEmail: string;
  assignedById: number;
  assignedByName: string;
  departmentId: number;
  department: string;
  type: "sales" | "execution";
  instruction: string | null;
  startedAt: string;
  endedAt: string | null;
  endedReason: string | null;
  workStatus: "assigned" | "submitted" | "rework_requested" | "approved" | "ended";
  latestUpdate: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewInstruction: string | null;
  events: LeadActivity[];
}
export interface EmployeeAssignmentHistory {
  isHistoricalAssignment: true;
  leadId: number;
  leadReference: string;
  customerName: string;
  leadDate: string;
  overallLeadStatus: LeadStatus;
  assignment: {
    id: number;
    userId: number;
    type: "sales" | "execution";
    department: string;
    instruction: string | null;
    startedAt: string;
    endedAt: string;
    endedReason: string | null;
    workStatus: LeadAssignment["workStatus"];
    outcome: string;
  };
  submittedRemarks: LeadActivity[];
  managerFeedback: LeadActivity[];
  events: LeadActivity[];
}
export interface Lead {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  source: LeadSource | null;
  referredBy: string;
  referrerPhone: string;
  channelPartner: string | null;
  suryamitra: string | null;
  leadType: LeadType | "Not specified";
  department: string;
  initialDepartment: string;
  leadDate: string;
  status: LeadStatus;
  initialRemark: string;
  latestRemark: string;
  nextFollowUp: string | null;
  createdAt: string;
  createdBy: string;
  creatorId: number;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedDepartmentId: number | null;
  assignedDepartment: string | null;
  lastAssigneeName: string | null;
  nextActionOwnerId: number | null;
  nextActionOwnerName: string;
  needsCreatorReview: boolean;
  reviewKind: string | null;
  heldFromStatus: LeadStatus | null;
  finalizedAt: string | null;
  workStartedAt: string | null;
  workReviewPending: boolean;
  workReviewSubmittedAt?: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  completedBy: string | null;
  ageDays: number;
  version: number;
  currentAssignmentId: number | null;
  assignments: LeadAssignment[];
  executionProgress: { total: number; approved: number; unresolved: number; label: string };
  activities: LeadActivity[];
}

export interface CreateLeadInput {
  customerName: string;
  phone: string;
  address: string;
  source: LeadSource | null;
  leadType: LeadType;
  referredBy: string;
  referrerPhone: string;
  channelPartner: string;
  suryamitra: string;
  leadDate: string;
  nextFollowUp: string | null;
  initialRemark: string;
  assignedToId: string | null;
}
export interface LeadListQuery {
  view: LeadView;
  search: string;
  assignedTo: string;
  needsMyReview: boolean;
  page: number;
  pageSize: number;
  sortBy: "customerName" | "status" | "leadDate" | "nextFollowUp" | "assignedToName";
  sortDirection: "asc" | "desc";
}
export interface LeadListResponse { leads: Lead[]; total: number; page: number; pageSize: number; counts: Record<LeadView, number>; }
