import api from "./api";
import type { Assignee, CreateLeadInput, EmployeeAssignmentHistory, Lead, LeadListQuery, LeadListResponse } from "../types/lead";

const key = () => crypto.randomUUID();
const mutationConfig = (assignmentId?: number) => ({ headers: { "Idempotency-Key": key(), ...(assignmentId ? { "X-Lead-Assignment-Id": String(assignmentId) } : {}) } });

// Leads always use the authenticated backend. Failures are surfaced to the UI without mock fallback.
export const listLeads = async (query: LeadListQuery): Promise<LeadListResponse> =>
  (await api.get<LeadListResponse>("/leads", { params: query })).data;
export const getLead = async (id: string): Promise<Lead> =>
  (await api.get<Lead>(`/leads/${id}`)).data;
export const getMyLead = async (id: string, assignmentId?: number): Promise<Lead | EmployeeAssignmentHistory> =>
  (await api.get<Lead | EmployeeAssignmentHistory>(`/leads/${id}`, { params: assignmentId ? { assignmentId } : undefined })).data;
export const listMyLeads = async (): Promise<Lead[]> => (await api.get<Lead[]>("/leads/mine")).data;
export const listMyAssignmentHistory = async (): Promise<EmployeeAssignmentHistory[]> => (await api.get<EmployeeAssignmentHistory[]>("/leads/mine/history")).data;
export const getMyAssignmentHistory = async (leadId: string, assignmentId: number): Promise<EmployeeAssignmentHistory> =>
  (await api.get<EmployeeAssignmentHistory>(`/leads/${leadId}/history/${assignmentId}`)).data;
export const submitEmployeeLeadUpdate = async (lead: Lead, remark: string): Promise<Lead> =>
  (await api.post<Lead>(`/leads/${lead.id}/update-submission`, { remark }, mutationConfig(lead.currentAssignmentId || undefined))).data;
export const getSalesAssignees = async (): Promise<Assignee[]> =>
  (await api.get<{ employees: Assignee[] }>("/leads/sales-assignees")).data.employees;
export const getLeadAssignees = async (): Promise<Assignee[]> =>
  (await api.get<{ employees: Assignee[] }>("/leads/assignees")).data.employees;
export const getExecutionAssignees = async (): Promise<Assignee[]> =>
  (await api.get<{ employees: Assignee[] }>("/leads/execution-assignees")).data.employees;
export const createLead = async (input: CreateLeadInput): Promise<Lead> =>
  (await api.post<Lead>("/leads", input, mutationConfig())).data;
export const updateBusinessDetails = async (id: string, input: { channelPartner?: string; suryamitra?: string }): Promise<Lead> =>
  (await api.patch<Lead>(`/leads/${id}/business-details`, input, mutationConfig())).data;
export const assignSalesLead = async (id: string, assigneeId: string): Promise<Lead> =>
  (await api.post<Lead>(`/leads/${id}/sales-assignment`, { assigneeId }, mutationConfig())).data;
export const addManagerRemark = async (id: string, input: { remark: string; nextFollowUp?: string | null }): Promise<Lead> =>
  (await api.post<Lead>(`/leads/${id}/manager-remark`, input, mutationConfig())).data;
export const startOrReassignExecution = async (id: string, input: { employeeIds: string[]; instruction: string; instructionOverrides?: Record<string, string> }): Promise<Lead> =>
  (await api.post<Lead>(`/leads/${id}/execution`, input, mutationConfig())).data;
export const returnFinalToSales = async (id: string, assigneeId: string, instruction: string): Promise<Lead> =>
  (await api.post<Lead>(`/leads/${id}/return-to-sales`, { assigneeId, instruction }, mutationConfig())).data;
export const reviewExecutionAssignment = async (id: string, assignmentId: number, input: { decision: "approve" | "rework"; remark?: string }): Promise<Lead> =>
  (await api.post<Lead>(`/leads/${id}/assignments/${assignmentId}/review`, input, mutationConfig())).data;
export const reassignExecutionAssignment = async (id: string, assignmentId: number, input: { employeeId: string; instruction: string; reason: string }): Promise<Lead> =>
  (await api.post<Lead>(`/leads/${id}/assignments/${assignmentId}/reassign`, input, mutationConfig())).data;
export const endExecutionAssignment = async (id: string, assignmentId: number, reason: string): Promise<Lead> =>
  (await api.post<Lead>(`/leads/${id}/assignments/${assignmentId}/end`, { reason }, mutationConfig())).data;
export const completeLead = async (id: string, completionRemark: string): Promise<Lead> =>
  (await api.post<Lead>(`/leads/${id}/complete`, { completionRemark }, mutationConfig())).data;
export const setManagerLeadStatus = async (id: string, status: "On Hold" | "Cancelled" | "Final", remark: string): Promise<Lead> =>
  (await api.post<Lead>(`/leads/${id}/status`, { status, remark }, mutationConfig())).data;
export const reviewEmployeeLeadUpdate = async (id: string, input: { decision: "acknowledge" | "return"; remark?: string }): Promise<Lead> =>
  (await api.post<Lead>(`/leads/${id}/update-review`, input, mutationConfig())).data;

