import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import EmployeeDashboardLayout from "../components/layout/EmployeeDashboardLayout";
import UserAvatar from "../components/profile/UserAvatar";
import { getMyAssignmentHistory } from "../services/leadService";
import type { EmployeeAssignmentHistory } from "../types/lead";
import { getCurrentUser, getInitials } from "../utils/authStorage";
import { formatLeadDate, formatLeadTimestamp } from "../utils/leadDates";

export default function EmployeeAssignmentHistory() {
  const { leadId = "", assignmentId = "" } = useParams();
  const user = getCurrentUser();
  const [history, setHistory] = useState<EmployeeAssignmentHistory | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // Keep the detail in a loading state while changing assignment periods.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true); setError("");
    getMyAssignmentHistory(leadId, Number(assignmentId))
      .then((result) => { if (active) setHistory(result); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "This assignment history is unavailable."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [leadId, assignmentId]);

  if (!user) return null;
  return <EmployeeDashboardLayout employeeId={user.id} employeeName={user.full_name} employeeInitials={getInitials(user.full_name)}>
    <main className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <Link to="/employee-leads" className="text-sm font-semibold text-blue-700 hover:underline">← My Leads</Link>
      {loading ? <section className="rounded-xl border bg-white p-8 text-center text-slate-600">Loading assignment history…</section> : !history ? <section role="alert" className="rounded-xl border bg-white p-8 text-center text-slate-700">{error || "This assignment history is unavailable."}</section> : <>
        <header className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Read-only assignment history · {history.leadReference} · Assignment #{history.assignment.id}</p>
          <h1 className="mt-1 break-words text-2xl font-bold text-slate-900">{history.customerName}</h1>
          <p className="mt-2 text-sm text-slate-600">Lead date: {formatLeadDate(history.leadDate)} · {history.assignment.type === "execution" ? "Execution work" : "Sales follow-up"} · {history.assignment.department}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold uppercase text-slate-500">Assignment outcome</p><p className="mt-1 font-semibold text-slate-900">{history.assignment.outcome}</p></div>
            <div className="rounded-lg bg-blue-50 p-3"><p className="text-xs font-semibold uppercase text-blue-700">Overall lead status</p><p className="mt-1 font-semibold text-slate-900">{history.overallLeadStatus}</p></div>
          </div>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="assignment-period-title">
          <h2 id="assignment-period-title" className="font-bold text-slate-900">Assignment period</h2>
          <dl className="mt-3 grid gap-4 sm:grid-cols-2"><div><dt className="text-xs text-slate-500">Assigned</dt><dd className="mt-1 text-sm font-medium">{formatLeadTimestamp(history.assignment.startedAt)}</dd></div><div><dt className="text-xs text-slate-500">Ended</dt><dd className="mt-1 text-sm font-medium">{formatLeadTimestamp(history.assignment.endedAt)}</dd></div><div className="sm:col-span-2"><dt className="text-xs text-slate-500">Instructions</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{history.assignment.instruction || "Not recorded"}</dd></div>{history.assignment.endedReason && <div className="sm:col-span-2"><dt className="text-xs text-slate-500">End reason</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{history.assignment.endedReason}</dd></div>}</dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="submitted-remarks-title">
          <h2 id="submitted-remarks-title" className="font-bold text-slate-900">Your submitted remarks</h2>
          {history.submittedRemarks.length ? <ol className="mt-3 space-y-3">{history.submittedRemarks.map((entry) => <li key={entry.id} className="rounded-lg bg-slate-50 p-3"><time className="text-xs text-slate-500" dateTime={entry.createdAt}>{formatLeadTimestamp(entry.createdAt)}</time><p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{entry.text}</p></li>)}</ol> : <p className="mt-2 text-sm text-slate-500">No submitted remarks are recorded for this assignment.</p>}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="manager-feedback-title">
          <h2 id="manager-feedback-title" className="font-bold text-slate-900">Manager feedback for this assignment</h2>
          {history.managerFeedback.length ? <ol className="mt-3 space-y-4">{history.managerFeedback.map((entry) => <li key={entry.id} className="flex min-w-0 items-start gap-3"><UserAvatar userId={entry.actorId ?? 0} name={entry.actorName || "User unavailable"} presetId={entry.actorAvatarPresetId} photoUrl={entry.actorPhotoUrl} size={34} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-900">{entry.actorName || "User unavailable"}<span className="ml-2 font-medium text-slate-600">{entry.actionLabel}</span></p><time className="mt-0.5 block text-xs text-slate-500" dateTime={entry.createdAt}>{formatLeadTimestamp(entry.createdAt)}</time>{entry.text && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{entry.text}</p>}</div></li>)}</ol> : <p className="mt-2 text-sm text-slate-500">No manager feedback is recorded for this assignment.</p>}
        </section>
      </>}
    </main>
  </EmployeeDashboardLayout>;
}
