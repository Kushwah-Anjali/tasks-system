import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table";
import { Plus, Search, X } from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { createLead, getLeadAssignees, listLeads } from "../services/leadService";
import type { Assignee, CreateLeadInput, Lead, LeadListResponse, LeadStatus, LeadView, LeadSource, LeadType, LeadListQuery } from "../types/lead";
import { LEAD_SOURCES, LEAD_TYPES, LEAD_VIEWS } from "../types/lead";
import { ageLabel, ageTone, formatLeadDate, isValidIndianPhone, todayInKolkata } from "../utils/leadDates";
import { getCurrentUser } from "../utils/authStorage";

const PAGE_SIZES = [10, 25, 50];
const toneClass = { neutral: "bg-slate-100 text-slate-700", amber: "bg-amber-100 text-amber-900", red: "bg-red-100 text-red-800" };
const statusClass: Record<LeadStatus, string> = { Pending: "bg-blue-50 text-blue-800", "Follow-up": "bg-indigo-50 text-indigo-800", "On Hold": "bg-amber-50 text-amber-900", Final: "bg-emerald-50 text-emerald-800", Working: "bg-violet-50 text-violet-800", Completed: "bg-slate-100 text-slate-700", Cancelled: "bg-rose-50 text-rose-800" };
const fieldClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900";

function containDialogKeyboard(event: React.KeyboardEvent<HTMLElement>, close: () => void) {
  if (event.key === "Escape") { event.preventDefault(); close(); return; }
  if (event.key !== "Tab") return;
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)'));
  const first = items[0]; const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
}

const CUSTOMER_PHONE_ERROR = "Enter a valid 10-digit customer mobile number";
const REFERRER_PHONE_ERROR = "Enter a valid 10-digit referrer mobile number, or leave it blank";
function changePhone(value: string, setValue: React.Dispatch<React.SetStateAction<string>>, field: "phone" | "referrerPhone", setPhoneErrors: React.Dispatch<React.SetStateAction<{ phone: string; referrerPhone: string }>>) {
  if (field === "referrerPhone" && value.trim() === "") { setValue(""); setPhoneErrors((current) => ({ ...current, referrerPhone: "" })); return; }
  if (/^[0-9]{0,10}$/.test(value)) {
    setValue(value);
    const invalidCompleteNumber = value.length === 10 && !isValidIndianPhone(value);
    setPhoneErrors((current) => ({ ...current, [field]: invalidCompleteNumber ? (field === "phone" ? CUSTOMER_PHONE_ERROR : REFERRER_PHONE_ERROR) : "" }));
  } else setPhoneErrors((current) => ({ ...current, [field]: field === "phone" ? CUSTOMER_PHONE_ERROR : REFERRER_PHONE_ERROR }));
}
function pastePhone(event: React.ClipboardEvent<HTMLInputElement>, current: string, setValue: React.Dispatch<React.SetStateAction<string>>, field: "phone" | "referrerPhone", setPhoneErrors: React.Dispatch<React.SetStateAction<{ phone: string; referrerPhone: string }>>) {
  const pasted = event.clipboardData.getData("text");
  if (field === "referrerPhone" && current.trim() === "" && pasted.trim() === "") {
    event.preventDefault(); setValue(""); setPhoneErrors((errors) => ({ ...errors, referrerPhone: "" })); return;
  }
  const input = event.currentTarget;
  const next = current.slice(0, input.selectionStart ?? current.length) + pasted + current.slice(input.selectionEnd ?? current.length);
  if (!/^[0-9]{1,10}$/.test(pasted) || !/^[0-9]{0,10}$/.test(next) || (next.length === 10 && !isValidIndianPhone(next))) {
    event.preventDefault(); setPhoneErrors((current) => ({ ...current, [field]: field === "phone" ? CUSTOMER_PHONE_ERROR : REFERRER_PHONE_ERROR })); return;
  }
  event.preventDefault(); setValue(next); setPhoneErrors((current) => ({ ...current, [field]: "" }));
}
function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  return year >= 1000 && month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function CreateLeadDialog({ employees, employeeError, onClose, onCreated }: { employees: Assignee[]; employeeError: string; onClose: () => void; onCreated: (lead: Lead) => void }) {
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [address, setAddress] = useState("");
  const [source, setSource] = useState<LeadSource | "">(""); const [referredBy, setReferredBy] = useState(""); const [referrerPhone, setReferrerPhone] = useState("");
  const [leadType, setLeadType] = useState<LeadType | "">("");
  const [channelPartner, setChannelPartner] = useState(""); const [suryamitra, setSuryamitra] = useState(""); const [assignedToId, setAssignedToId] = useState("");
  const [leadDate, setLeadDate] = useState(todayInKolkata()); const [followUp, setFollowUp] = useState(""); const [remark, setRemark] = useState("");
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const [phoneErrors, setPhoneErrors] = useState({ phone: "", referrerPhone: "" });
  const phoneRef = useRef<HTMLInputElement>(null); const referrerPhoneRef = useRef<HTMLInputElement>(null);
  const focusPhone = (field: "phone" | "referrerPhone") => requestAnimationFrame(() => {
    const input = field === "phone" ? phoneRef.current : referrerPhoneRef.current;
    input?.scrollIntoView({ behavior: "smooth", block: "center" }); input?.focus({ preventScroll: true });
  });
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (saving) return;
    if (!name.trim()) { setError("Customer name is required."); return; }
    const normalizedReferrerPhone = referrerPhone.trim();
    if (!isValidIndianPhone(phone)) { setPhoneErrors({ phone: CUSTOMER_PHONE_ERROR, referrerPhone: "" }); focusPhone("phone"); return; }
    if (normalizedReferrerPhone && !isValidIndianPhone(normalizedReferrerPhone)) { setPhoneErrors({ phone: "", referrerPhone: REFERRER_PHONE_ERROR }); focusPhone("referrerPhone"); return; }
    setPhoneErrors({ phone: "", referrerPhone: "" });
    if (!address.trim()) { setError("Address is required."); return; }
    if (!leadType) { setError("Choose a lead type."); return; }
    if (!remark.trim()) { setError("Initial remark is required."); return; }
    if (!isCalendarDate(leadDate)) { setError("Enter a valid lead date."); return; }
    if (leadDate > todayInKolkata()) { setError("Lead date cannot be in the future."); return; }
    if (followUp && !isCalendarDate(followUp)) { setError("Enter a valid next follow-up date."); return; }
    if (followUp && followUp < leadDate) { setError("Follow-up date cannot be before the lead date."); return; }
    setSaving(true); setError("");
    try {
      const input: CreateLeadInput = { customerName: name.trim(), phone, address: address.trim(), source: source || null, leadType, referredBy: referredBy.trim(), referrerPhone: normalizedReferrerPhone, channelPartner: channelPartner.trim(), suryamitra: suryamitra.trim(), leadDate, nextFollowUp: followUp || null, initialRemark: remark.trim(), assignedToId: assignedToId || null };
      onCreated(await createLead(input));
    } catch (cause) {
      const response = typeof cause === "object" && cause !== null && "response" in cause ? (cause as { response?: { data?: { field?: string; message?: string } } }).response?.data : undefined;
      if (response?.field === "phone" || response?.field === "referrerPhone") {
        const field = response.field;
        setPhoneErrors((current) => ({ ...current, [field]: field === "phone" ? CUSTOMER_PHONE_ERROR : REFERRER_PHONE_ERROR }));
        focusPhone(field);
      } else setError(response?.message || (cause instanceof Error ? cause.message : "Unable to create the lead."));
    }
    finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-labelledby="create-lead-title" onKeyDown={(event) => containDialogKeyboard(event, onClose)} className="app-modal max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6"><h2 id="create-lead-title">Create Lead</h2><button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={19} /></button></div>
    <form onSubmit={(event) => void submit(event)} className="space-y-4 p-5 sm:p-6"><div className="grid gap-4 sm:grid-cols-2">
      <label>Customer name <span className="text-red-600">*</span><input autoFocus required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} /></label>
      <label htmlFor="lead-customer-phone">Customer phone <span className="text-red-600">*</span><input ref={phoneRef} id="lead-customer-phone" type="tel" inputMode="numeric" maxLength={10} value={phone} aria-invalid={!!phoneErrors.phone} aria-describedby={phoneErrors.phone ? "lead-customer-phone-error" : undefined} onChange={(e) => changePhone(e.target.value, setPhone, "phone", setPhoneErrors)} onPaste={(e) => pastePhone(e, phone, setPhone, "phone", setPhoneErrors)} className={fieldClass} placeholder="10-digit mobile number" />{phoneErrors.phone && <span id="lead-customer-phone-error" className="mt-1 block text-sm text-red-700">{phoneErrors.phone}</span>}</label>
      <label className="sm:col-span-2">Address <span className="text-red-600">*</span><textarea required maxLength={500} rows={2} value={address} onChange={(e) => setAddress(e.target.value)} className={`${fieldClass} resize-y`} /></label>
      <label>Lead Type <span className="text-red-600">*</span><select required value={leadType} onChange={(e) => setLeadType(e.target.value as LeadType | "")} className={fieldClass}><option value="">Select type</option>{LEAD_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label>Source <span className="text-xs font-normal text-slate-500">(optional)</span><select value={source} onChange={(e) => setSource(e.target.value as LeadSource | "")} className={fieldClass}><option value="">Select source</option>{LEAD_SOURCES.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Referred by <span className="text-xs font-normal text-slate-500">(optional)</span><input maxLength={100} value={referredBy} onChange={(e) => setReferredBy(e.target.value)} className={fieldClass} /></label>
      <label htmlFor="lead-referrer-phone">Referrer phone <span className="text-xs font-normal text-slate-500">(optional)</span><input ref={referrerPhoneRef} id="lead-referrer-phone" type="tel" inputMode="numeric" maxLength={10} value={referrerPhone} aria-invalid={!!phoneErrors.referrerPhone} aria-describedby={phoneErrors.referrerPhone ? "lead-referrer-phone-error" : undefined} onChange={(e) => changePhone(e.target.value, setReferrerPhone, "referrerPhone", setPhoneErrors)} onPaste={(e) => pastePhone(e, referrerPhone, setReferrerPhone, "referrerPhone", setPhoneErrors)} className={fieldClass} />{phoneErrors.referrerPhone && <span id="lead-referrer-phone-error" className="mt-1 block text-sm text-red-700">{phoneErrors.referrerPhone}</span>}</label>
      <label>CP (Channel Partner) <span className="text-xs font-normal text-slate-500">(optional)</span><input maxLength={160} value={channelPartner} onChange={(e) => setChannelPartner(e.target.value)} className={fieldClass} /></label>
      <label>SM (Suryamitra) <span className="text-xs font-normal text-slate-500">(optional)</span><input maxLength={160} value={suryamitra} onChange={(e) => setSuryamitra(e.target.value)} className={fieldClass} /></label>
      <div><span className="block text-sm font-semibold text-slate-700">Initial department</span><p className={`${fieldClass} bg-slate-50 text-slate-600`}>Sales</p></div>
      <label>Assign to <span className="text-xs font-normal text-slate-500">(optional)</span><select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} className={fieldClass}><option value="">Unassigned</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}</select><span className="mt-1 block text-xs text-slate-500">{employeeError || "Active Sales employees only."}</span></label>
      <label>Lead date <span className="text-red-600">*</span><input type="date" required max={todayInKolkata()} value={leadDate} onChange={(e) => setLeadDate(e.target.value)} className={fieldClass} /></label>
      <label>Next follow-up date <span className="text-xs font-normal text-slate-500">(optional)</span><input type="date" min={leadDate} value={followUp} onChange={(e) => setFollowUp(e.target.value)} className={fieldClass} /></label>
      <label className="sm:col-span-2">Initial remark <span className="text-red-600">*</span><textarea required maxLength={1000} rows={3} value={remark} onChange={(e) => setRemark(e.target.value)} className={`${fieldClass} resize-y`} /></label>
    </div>
    {!employees.length && !employeeError && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">No active Sales employees are available. You can create this lead unassigned.</p>}
    {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
    <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Cancel</button><button type="submit" disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Creating…" : assignedToId ? "Create & Assign" : "Create Lead"}</button></div></form>
  </section></div>;
}

export default function Leads() {
  const user = getCurrentUser();
  const [employees, setEmployees] = useState<Assignee[]>([]); const [employeeError, setEmployeeError] = useState("");
  const [result, setResult] = useState<LeadListResponse>(); const [error, setError] = useState(""); const [settledKey, setSettledKey] = useState("");
  const [tab, setTab] = useState<LeadView>("All"); const [search, setSearch] = useState(""); const [assignedTo, setAssignedTo] = useState("all"); const [needsReview, setNeedsReview] = useState(false);
  const [pageIndex, setPageIndex] = useState(0); const [pageSize, setPageSize] = useState(10); const [sorting, setSorting] = useState<SortingState>([{ id: "leadDate", desc: true }]);
  const [createOpen, setCreateOpen] = useState(false); const [refreshKey, setRefreshKey] = useState(0);
  const sort = sorting[0] || { id: "leadDate", desc: true };
  const query = useMemo<LeadListQuery>(() => ({ view: tab, search: search.trim(), assignedTo, needsMyReview: needsReview, page: pageIndex + 1, pageSize, sortBy: (sort.id || "leadDate") as LeadListQuery["sortBy"], sortDirection: sort.desc ? "desc" : "asc" }), [assignedTo, needsReview, pageIndex, pageSize, search, sort.desc, sort.id, tab]);
  const queryKey = useMemo(() => JSON.stringify(query), [query]);
  useEffect(() => { let active = true; listLeads(query).then((data) => { if (active) { setResult(data); setError(""); } }).catch((cause: unknown) => { if (active) { setResult(undefined); setError(cause instanceof Error ? cause.message : "Unable to load leads."); } }).finally(() => { if (active) setSettledKey(queryKey); }); return () => { active = false; }; }, [query, queryKey, refreshKey]);
  useEffect(() => { let active = true; getLeadAssignees().then((items) => { if (active) { setEmployees(items); setEmployeeError(""); } }).catch(() => { if (active) { setEmployees([]); setEmployeeError("Assignee list unavailable."); } }); return () => { active = false; }; }, []);
  const counts = result?.counts;
  const columns = useMemo<ColumnDef<Lead>[]>(() => [
    { accessorKey: "customerName", header: "Customer", cell: ({ row }) => <div className="min-w-36"><Link className="font-semibold text-blue-700 hover:underline" to={`/leads/${row.original.id}`}>{row.original.customerName}</Link><p className="text-xs text-slate-500">{row.original.phone}</p></div> },
    { accessorKey: "leadType", header: "Lead type" },
    { accessorKey: "assignedToName", header: "Assignee / next owner", cell: ({ row }) => <span className="block max-w-48 truncate text-sm text-slate-700" title={row.original.nextActionOwnerName}>{row.original.nextActionOwnerName}</span> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[row.original.status]}`}>{row.original.status}</span> },
    { accessorKey: "latestRemark", header: "Latest remark", enableSorting: false, cell: ({ getValue }) => <span className="block max-w-64 truncate text-sm text-slate-600" title={String(getValue())}>{String(getValue())}</span> },
    { accessorKey: "ageDays", header: "Age / duration", enableSorting: false, cell: ({ row }) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.original.status === "Completed" ? "bg-slate-100 text-slate-700" : toneClass[ageTone(row.original.ageDays)]}`}>{row.original.status === "Completed" ? `${row.original.ageDays} day${row.original.ageDays === 1 ? "" : "s"} duration` : ageLabel(row.original.leadDate)}</span> },
    { accessorKey: "nextFollowUp", header: "Follow-up", cell: ({ row }) => { const date = row.original.nextFollowUp; const overdue = date && date < todayInKolkata() && ["Pending", "Follow-up", "On Hold"].includes(row.original.status); return <span className={overdue ? "font-semibold text-red-700" : "text-slate-600"}>{date === todayInKolkata() ? "Today" : formatLeadDate(date)}{overdue ? " · Overdue" : ""}</span>; } },
  ], []);
  const table = useReactTable({ data: result?.leads || [], columns, state: { sorting, pagination: { pageIndex, pageSize } }, manualPagination: true, manualSorting: true, pageCount: Math.max(1, Math.ceil((result?.total || 0) / pageSize)), onSortingChange: setSorting, onPaginationChange: (updater) => { const next = typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater; setPageIndex(next.pageSize !== pageSize ? 0 : next.pageIndex); setPageSize(next.pageSize); }, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel() });
  const resetPage = () => setPageIndex(0); const isLoading = settledKey !== queryKey; const rows = result?.leads || []; const first = result?.total ? pageIndex * pageSize + 1 : 0; const last = Math.min((pageIndex + 1) * pageSize, result?.total || 0);
  return <DashboardLayout user={user!}><div className="mx-auto max-w-[1500px] space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold text-slate-900">Leads</h1><button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"><Plus size={17} /> Create Lead</button></header>
    <div role="tablist" aria-label="Lead status views" className="flex flex-wrap gap-2">{LEAD_VIEWS.map((view, index) => <button key={view} role="tab" tabIndex={tab === view ? 0 : -1} aria-selected={tab === view} onKeyDown={(event) => { if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) { event.preventDefault(); const at = event.key === "Home" ? 0 : event.key === "End" ? LEAD_VIEWS.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + LEAD_VIEWS.length) % LEAD_VIEWS.length; const next = LEAD_VIEWS[at]; setTab(next); resetPage(); document.getElementById(`lead-view-${next.replaceAll(" ", "-")}`)?.focus(); } }} id={`lead-view-${view.replaceAll(" ", "-")}`} onClick={() => { setTab(view); resetPage(); }} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${tab === view ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{view}<span className="ml-1.5 rounded-full bg-white/80 px-1.5 py-0.5 text-xs">{counts?.[view] ?? 0}</span></button>)}</div>
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4" aria-label="Lead filters"><div className="flex flex-col gap-3 lg:flex-row lg:items-end">
      <label className="min-w-0 flex-1 text-sm font-semibold text-slate-700">Search customer or phone<span className="relative mt-1 block"><Search size={17} className="absolute left-3 top-3 text-slate-400"/><input value={search} onChange={(e) => { setSearch(e.target.value); resetPage(); }} placeholder="Name or phone" className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm font-normal" /></span></label>
      <label className="text-sm font-semibold text-slate-700 lg:w-56">Assigned to<select value={assignedTo} onChange={(e) => { setAssignedTo(e.target.value); resetPage(); }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal"><option value="all">All assignees</option><option value="unassigned">Unassigned</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}</select></label>
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700"><input type="checkbox" checked={needsReview} onChange={(e) => { setNeedsReview(e.target.checked); resetPage(); }} />Needs my review</label>
      <button type="button" onClick={() => { setSearch(""); setAssignedTo("all"); setNeedsReview(false); resetPage(); }} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Clear Filters</button>
    </div></section>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label={`${tab} leads`}>
      {isLoading ? <div className="p-12 text-center text-sm text-slate-600" role="status">Loading leads…</div> : error ? <div className="p-10 text-center"><p role="alert" className="text-sm text-red-700">{error}</p><button onClick={() => setRefreshKey((n) => n + 1)} className="mt-3 rounded-lg border px-4 py-2 text-sm font-semibold">Try again</button></div> : !rows.length ? <div className="p-10 text-center"><p className="font-semibold text-slate-800">{counts?.All === 0 ? "No leads yet." : "No leads match these filters."}</p><p className="mt-1 text-sm text-slate-500">{counts?.All === 0 ? "Create a lead to begin tracking customer follow-up." : "Clear filters or select another view."}</p></div> : <>
        <div className="hidden overflow-x-auto md:block"><table className="app-table w-full text-left"><thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id} className="px-3 py-3 first:pl-5 last:pr-5">{header.isPlaceholder ? null : <button type="button" onClick={header.column.getToggleSortingHandler()} disabled={!header.column.getCanSort()} className="inline-flex items-center gap-1 disabled:cursor-default">{flexRender(header.column.columnDef.header, header.getContext())}{header.column.getIsSorted() === "asc" ? "↑" : header.column.getIsSorted() === "desc" ? "↓" : ""}</button>}</th>)}</tr>)}</thead><tbody>{rows.map((lead) => <tr key={lead.id}><td className="px-3 py-3 first:pl-5"><div className="min-w-36"><Link className="font-semibold text-blue-700 hover:underline" to={`/leads/${lead.id}`}>{lead.customerName}</Link><p className="text-xs text-slate-500">{lead.phone}</p></div></td><td className="px-3 py-3"><span className="block max-w-48 truncate text-sm text-slate-700">{lead.nextActionOwnerName}</span></td><td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[lead.status]}`}>{lead.status}</span></td><td className="px-3 py-3"><span className="block max-w-64 truncate text-sm text-slate-600" title={lead.latestRemark}>{lead.latestRemark}</span></td><td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${lead.status === "Completed" ? "bg-slate-100 text-slate-700" : toneClass[ageTone(lead.ageDays)]}`}>{lead.status === "Completed" ? `${lead.ageDays} day${lead.ageDays === 1 ? "" : "s"} duration` : ageLabel(lead.leadDate)}</span></td><td className="px-3 py-3 last:pr-5"><span className={lead.nextFollowUp && lead.nextFollowUp < todayInKolkata() && ["Pending", "Follow-up", "On Hold"].includes(lead.status) ? "font-semibold text-red-700" : "text-slate-600"}>{lead.nextFollowUp === todayInKolkata() ? "Today" : formatLeadDate(lead.nextFollowUp)}{lead.nextFollowUp && lead.nextFollowUp < todayInKolkata() && ["Pending", "Follow-up", "On Hold"].includes(lead.status) ? " · Overdue" : ""}</span></td></tr>)}</tbody></table></div>
        <div className="divide-y divide-slate-200 md:hidden">{rows.map((lead) => <article key={lead.id} className="space-y-2.5 p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><Link className="font-semibold text-blue-700 hover:underline" to={`/leads/${lead.id}`}>{lead.customerName}</Link><p className="text-sm text-slate-600">{lead.phone} · {lead.leadType}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${statusClass[lead.status]}`}>{lead.status}</span></div><p className="text-xs text-slate-600">Next owner: {lead.nextActionOwnerName}</p><p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500"><span>Age ·</span><span className={`rounded-full px-2 py-0.5 font-semibold ${lead.status === "Completed" ? "bg-slate-100 text-slate-700" : toneClass[ageTone(lead.ageDays)]}`}>{lead.status === "Completed" ? `${lead.ageDays} days duration` : ageLabel(lead.leadDate)}</span><span>· Follow-up: {lead.nextFollowUp === todayInKolkata() ? "Today" : formatLeadDate(lead.nextFollowUp)}</span></p><p className="line-clamp-2 text-sm text-slate-700">{lead.latestRemark}</p>{lead.needsCreatorReview && <p className="text-xs font-semibold text-amber-800">Needs manager review</p>}</article>)}</div>
        <footer className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2">Rows per page<select aria-label="Rows per page" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPageIndex(0); }} className="rounded-md border border-slate-300 bg-white px-2 py-1">{PAGE_SIZES.map((size) => <option key={size}>{size}</option>)}</select></label><span>Showing {first}–{last} of {result?.total || 0}</span></div><div className="flex items-center justify-between gap-3 sm:justify-end"><button onClick={() => setPageIndex((n) => Math.max(0, n - 1))} disabled={pageIndex === 0} className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold disabled:opacity-50">Previous</button><span>Page {pageIndex + 1} of {Math.max(1, Math.ceil((result?.total || 0) / pageSize))}</span><button onClick={() => setPageIndex((n) => n + 1)} disabled={pageIndex + 1 >= Math.ceil((result?.total || 0) / pageSize)} className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold disabled:opacity-50">Next</button></div></footer>
      </>}
    </section>
  </div>{createOpen && <CreateLeadDialog employees={employees.filter((employee) => employee.department.trim().toLowerCase() === "sales")} employeeError={employeeError} onClose={() => setCreateOpen(false)} onCreated={(lead) => { setCreateOpen(false); setTab("All"); setSearch(""); setAssignedTo("all"); setNeedsReview(false); setPageIndex(0); setRefreshKey((n) => n + 1); setResult((old) => old ? { ...old, leads: [lead, ...old.leads], total: old.total + 1 } : old); }} />}</DashboardLayout>;
}
