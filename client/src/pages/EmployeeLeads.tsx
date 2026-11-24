import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import EmployeeDashboardLayout from "../components/layout/EmployeeDashboardLayout";
import { listMyAssignmentHistory, listMyLeads } from "../services/leadService";
import type { EmployeeAssignmentHistory, Lead } from "../types/lead";
import { getCurrentUser, getInitials } from "../utils/authStorage";
import { formatLeadDate, formatLeadTimestamp } from "../utils/leadDates";

type LeadsTab = "current" | "history";
const PAGE_SIZE = 10;
const workLabels: Record<string, string> = { submitted: "Awaiting manager review", rework_requested: "Rework requested", approved: "Approved", assigned: "In progress", ended: "Ended" };

export default function EmployeeLeads() {
  const user = getCurrentUser();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [history, setHistory] = useState<EmployeeAssignmentHistory[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<LeadsTab>("current");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true); setError("");
    Promise.all([listMyLeads(), listMyAssignmentHistory()])
      .then(([current, past]) => { setLeads(current); setHistory(past); })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load your assignments."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    // Loading is asynchronous; the initial loading state is already true.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  const currentRows = useMemo(() => leads.filter((lead) => `${lead.customerName} ${lead.id} ${lead.status} ${lead.assignments[0]?.instruction || ""}`.toLowerCase().includes(search.trim().toLowerCase())), [leads, search]);
  const historyRows = useMemo(() => history.filter((item) => `${item.customerName} ${item.leadReference} ${item.assignment.instruction || ""} ${item.assignment.outcome}`.toLowerCase().includes(search.trim().toLowerCase())), [history, search]);
  const visibleRows = tab === "current" ? currentRows : historyRows;
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const pageRows = visibleRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  if (!user) return null;

  return <EmployeeDashboardLayout employeeId={user.id} employeeName={user.full_name} employeeInitials={getInitials(user.full_name)}>
    <main className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <header><h1 className="text-2xl font-bold text-slate-900">My Leads</h1><p className="mt-1 text-sm text-slate-600">Your assigned leads and work history.</p></header>
      <div role="tablist" aria-label="My Leads" className="flex gap-2 border-b border-slate-200">
        <button id="current-assignments-tab" role="tab" aria-selected={tab === "current"} onClick={() => { setTab("current"); setPage(1); }} className={`rounded-t-lg px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${tab === "current" ? "border-b-2 border-blue-700 text-blue-800" : "text-slate-600"}`}>Current Assignments <span className="ml-1 rounded-full bg-slate-100 px-1.5 text-xs">{leads.length}</span></button>
        <button id="my-history-tab" role="tab" aria-selected={tab === "history"} onClick={() => { setTab("history"); setPage(1); }} className={`rounded-t-lg px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${tab === "history" ? "border-b-2 border-blue-700 text-blue-800" : "text-slate-600"}`}>My History <span className="ml-1 rounded-full bg-slate-100 px-1.5 text-xs">{history.length}</span></button>
      </div>
      <label className="block max-w-md text-sm font-medium text-slate-700">Search {tab === "current" ? "current assignments" : "my history"}<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Customer, lead reference, or instructions" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" /></label>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}<button type="button" onClick={load} className="ml-3 font-semibold underline">Retry</button></div>}
      {loading ? <div className="rounded-xl border bg-white p-8 text-center text-slate-600">Loading your assignments…</div> : visibleRows.length === 0 ? <div className="rounded-xl border bg-white p-8 text-center text-slate-600">{tab === "current" ? "You have no current assignments." : "You have no ended assignments in your history."}</div> : tab === "current" ? <CurrentAssignments rows={pageRows as Lead[]} /> : <HistoryAssignments rows={pageRows as EmployeeAssignmentHistory[]} />}
      {!loading && visibleRows.length > 0 && <nav aria-label="Assignment pages" className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-600">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, visibleRows.length)} of {visibleRows.length}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Previous</button><span className="self-center">Page {page} of {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Next</button></div></nav>}
    </main>
  </EmployeeDashboardLayout>;
}

function CurrentAssignments({ rows }: { rows: Lead[] }) {
  const statusFor = (lead: Lead) => {
    const assignment = lead.assignments[0];
    return assignment?.type === "execution" ? (workLabels[assignment.workStatus] || assignment.workStatus) : lead.needsCreatorReview && lead.reviewKind === "manager_update" ? "Awaiting manager review" : "In progress";
  };
  return <>
    <div className="space-y-3 md:hidden">{rows.map((lead) => { const assignment = lead.assignments[0]; const status = statusFor(lead); return <article key={lead.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link className="break-words font-semibold text-blue-700 hover:underline" to={`/employee-leads/${lead.id}`}>{lead.customerName}</Link><p className="mt-0.5 text-xs text-slate-500">Lead #{lead.id} · {assignment?.department || lead.department}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${status === "Awaiting manager review" ? "bg-violet-100 text-violet-900" : status === "Rework requested" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"}`}>{status}</span></div><p className="mt-3 text-xs text-slate-600">Lead status: <strong>{lead.status}</strong> · Lead date: {formatLeadDate(lead.leadDate)}</p>{assignment?.instruction && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{assignment.instruction}</p>}</article>; })}</div>
    <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Customer / reference</th><th className="p-3">Department</th><th className="p-3">Lead status</th><th className="p-3">My assignment</th><th className="p-3">Lead date</th></tr></thead><tbody>{rows.map((lead) => { const assignment = lead.assignments[0]; const status = statusFor(lead); return <tr key={lead.id} className="border-t border-slate-100"><td className="p-3"><Link className="font-semibold text-blue-700 hover:underline" to={`/employee-leads/${lead.id}`}>{lead.customerName}</Link><div className="text-xs text-slate-500">Lead #{lead.id}</div></td><td className="p-3">{assignment?.department || lead.department}</td><td className="p-3">{lead.status}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status === "Awaiting manager review" ? "bg-violet-100 text-violet-900" : status === "Rework requested" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"}`}>{status}</span></td><td className="p-3">{formatLeadDate(lead.leadDate)}</td></tr>; })}</tbody></table></div>
  </>;
}

function HistoryAssignments({ rows }: { rows: EmployeeAssignmentHistory[] }) {
  return <>
    <div className="space-y-3 md:hidden">{rows.map((item) => <article key={item.assignment.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link className="break-words font-semibold text-blue-700 hover:underline" to={`/employee-leads/${item.leadId}/history/${item.assignment.id}`}>{item.customerName}</Link><p className="mt-0.5 text-xs text-slate-500">{item.leadReference} · {item.assignment.type === "execution" ? "Execution" : "Sales follow-up"}</p></div><span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.assignment.outcome}</span></div><p className="mt-3 text-xs text-slate-600">Assigned {formatLeadTimestamp(item.assignment.startedAt)} · Ended {formatLeadTimestamp(item.assignment.endedAt)}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">Instructions: {item.assignment.instruction || "Not recorded"}</p><p className="mt-2 text-xs text-slate-600">Overall lead status: <strong>{item.overallLeadStatus}</strong></p><Link className="mt-3 inline-flex text-sm font-semibold text-blue-700" to={`/employee-leads/${item.leadId}/history/${item.assignment.id}`}>Open read-only history</Link></article>)}</div>
    <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Customer / lead reference</th><th className="p-3">Instructions</th><th className="p-3">Assigned / ended</th><th className="p-3">Assignment outcome</th><th className="p-3">Overall lead status</th><th className="p-3">History</th></tr></thead><tbody>{rows.map((item) => <tr key={item.assignment.id} className="border-t border-slate-100 align-top"><td className="p-3"><Link className="font-semibold text-blue-700 hover:underline" to={`/employee-leads/${item.leadId}/history/${item.assignment.id}`}>{item.customerName}</Link><div className="text-xs text-slate-500">{item.leadReference} · Assignment #{item.assignment.id}</div></td><td className="max-w-xs whitespace-pre-wrap break-words p-3">{item.assignment.instruction || "Not recorded"}</td><td className="p-3 text-xs">{formatLeadTimestamp(item.assignment.startedAt)}<br />{formatLeadTimestamp(item.assignment.endedAt)}</td><td className="p-3">{item.assignment.outcome}</td><td className="p-3">{item.overallLeadStatus}</td><td className="p-3"><Link className="font-semibold text-blue-700 hover:underline" to={`/employee-leads/${item.leadId}/history/${item.assignment.id}`}>Open read-only history</Link></td></tr>)}</tbody></table></div>
  </>;
}
