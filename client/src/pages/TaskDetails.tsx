import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { ArrowLeft, ArrowRightLeft, CalendarDays, CheckCircle2, ClipboardList, Clock3, Info, UserRound, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import DashboardLayout from "../components/layout/DashboardLayout";
import TaskStatusBadge, { ResponseStatusBadge } from "../components/tasks/TaskStatusBadge";
import { TaskAgingBadge, TaskPriorityBadge } from "../components/tasks/TaskIndicators";
import { TaskOverviewField, TaskOverviewGrid } from "../components/tasks/TaskOverviewGrid";
import { formatTaskDate } from "../components/tasks/taskDateUtils";
import { getTaskDetails } from "../services/taskService";
import type { TaskDetailsResponse, TaskTimelineEvent } from "../types/task";
import { getCurrentUser } from "../utils/authStorage";

const formatDate = (value: string, includeTime = false): string => {
    const date = new Date(includeTime ? value : value.slice(0, 10) + "T00:00:00");
    if (Number.isNaN(date.getTime())) return value;

    const options: Intl.DateTimeFormatOptions = {
        day: "2-digit",
        month: "short",
        year: "numeric",
    };

    return includeTime
        ? date.toLocaleString("en-IN", { ...options, hour: "2-digit", minute: "2-digit" })
        : date.toLocaleDateString("en-IN", options);
};

const eventPerson = (id: number | null, name: string | null): string =>
    name || (id !== null ? `User #${id}` : "Unknown user");

const describeTimelineEvent = (event: TaskTimelineEvent): string => {
    const actor = eventPerson(event.actor_user_id, event.actor_name);
    const recipient = eventPerson(event.recipient_user_id, event.recipient_name);
    const previousAssignee = eventPerson(event.previous_assignee_user_id, event.previous_assignee_name);

    switch (event.event_type) {
        case "assigned": return `${actor} assigned the task to ${recipient}.`;
        case "accepted": return `${actor} accepted the task.`;
        case "assignment_rejected": return `${actor} rejected the assignment.`;
        case "forward_requested": return `${actor} requested forwarding to ${recipient}.`;
        case "forward_accepted": return `${actor} accepted the forwarded task.`;
        case "forward_rejected": return `${actor} rejected the forwarding request.`;
        case "forward_cancelled": return event.actor_user_id === null && !event.actor_name
            ? "The forwarding request was cancelled after reassignment."
            : `${actor} cancelled the forwarding request.`;
        case "reassigned": return `${actor} reassigned the task from ${previousAssignee} to ${recipient}.`;
        case "progress_updated": return `${actor} updated task progress.`;
        case "submitted": return `${actor} submitted the task.`;
        case "changes_requested": return `${actor} requested changes.`;
        case "completed": return `${actor} approved completion.`;
    }
};

export default function TaskDetails() {
    const { taskId } = useParams<{ taskId: string }>();
    const user = getCurrentUser();
    const id = Number(taskId);
    const isValidId = /^\d+$/.test(taskId ?? "") && Number.isSafeInteger(id) && id > 0;
    const [result, setResult] = useState<{
        taskId: string;
        details?: TaskDetailsResponse;
        error?: string;
        notFound?: boolean;
    } | null>(null);

    useEffect(() => {
        if (!isValidId || !taskId) return;

        let active = true;
        getTaskDetails(Number(taskId))
            .then((details) => {
                if (active) {
                    setResult(details.task
                        ? { taskId, details }
                        : { taskId, error: "Task not found.", notFound: true });
                }
            })
            .catch((error: unknown) => {
                if (!active) return;
                const notFound = isAxiosError(error) && error.response?.status === 404;
                setResult({
                    taskId,
                    notFound,
                    error: notFound
                        ? "Task not found. It may have been deleted."
                        : "Unable to load task details. Please try again.",
                });
            });

        return () => { active = false; };
    }, [taskId, isValidId]);

    if (!user) return null;

    const current = result?.taskId === taskId ? result : null;
    const details = current?.details;
    const task = details?.task;
    const error = !isValidId ? "Invalid task id." : current?.error;

    return (
        <DashboardLayout user={user}>
            <Link to="/tasks" className="app-back-link mb-6">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Tasks
            </Link>

            <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Task details</p>
                    <h1 className="break-words text-slate-800">{task?.title ?? "Task Details"}</h1>
                    {task ? (
                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                            <p>Created by <strong className="font-semibold text-slate-800">{task.created_by_name || "User #" + task.created_by}</strong></p>
                            <p>Assigned to <strong className="font-semibold text-slate-800">{task.assigned_to_name || "User #" + task.assigned_to}</strong></p>
                            <p className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Due <strong className="font-semibold text-slate-800">{formatTaskDate(task.due_date)}</strong></p>
                            <TaskPriorityBadge priority={task.priority} />
                        </div>
                    ) : <p className="mt-2 text-slate-600">Current task information and forwarding history.</p>}
                </div>
                {task ? (
                    <div className="flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white p-4">
                        <div><p className="mb-2 text-xs font-medium text-slate-500">Task status</p><TaskStatusBadge status={task.status} prominent /></div>
                        <div><p className="mb-2 text-xs font-medium text-slate-500">Assignment</p><ResponseStatusBadge status={task.assignment_status} prominent /></div>
                    </div>
                ) : null}
            </div>

            {error ? (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 font-medium text-red-700">
                    {error}
                    {isValidId && !current?.notFound ? <button type="button" onClick={() => window.location.reload()} className="ml-3 font-semibold underline">Retry</button> : null}
                </div>
            ) : !task || !details ? (
                <div role="status" className="app-panel p-8 text-center text-slate-600">Loading task details...</div>
            ) : (
                <div className="flex flex-col gap-6">
                    {[
                        { show: task.pending_assignee_id !== null, title: "Forward pending", text: "Waiting for " + (task.pending_assignee_name || "the next assignee") + " to respond. The current assignee remains responsible.", style: "border-amber-200 border-l-amber-400 bg-amber-50 text-amber-900", icon: ArrowRightLeft },
                        { show: task.assignment_status === "pending" && task.pending_assignee_id === null, title: "Waiting for acceptance", text: "The assigned employee has not accepted or rejected this assignment yet.", style: "border-amber-200 border-l-amber-400 bg-amber-50 text-amber-900", icon: Clock3 },
                        { show: task.assignment_status === "rejected", title: "Assignment rejected", text: task.rejection_reason || "The assigned employee rejected this assignment.", style: "border-red-200 border-l-red-400 bg-red-50 text-red-800", icon: Info },
                        { show: task.status === "changes_required", title: "Changes requested", text: task.review_note || "The work needs changes before it can be completed.", style: "border-orange-200 border-l-orange-400 bg-orange-50 text-orange-900", icon: Info },
                        { show: task.status === "submitted" || task.status === "under_review", title: task.status === "submitted" ? "Submitted for review" : "Under review", text: "The work is awaiting a review decision.", style: "border-violet-200 border-l-violet-400 bg-violet-50 text-violet-900", icon: ClipboardList },
                        { show: task.status === "completed", title: "Task completed", text: task.completed_at ? "Completed on " + formatDate(task.completed_at, true) + "." : "This task has been completed.", style: "border-green-200 border-l-green-400 bg-green-50 text-green-900", icon: CheckCircle2 },
                    ].filter(alert => alert.show).map(({ title, text, style, icon: Icon }) => (
                        <div key={title} className={"flex items-start gap-3 rounded-xl border border-l-4 p-5 " + style}>
                            <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                            <div><h3 className="font-bold">{title}</h3><p className="mt-1 whitespace-pre-wrap text-sm">{text}</p></div>
                        </div>
                    ))}

                    <section aria-labelledby="task-overview" className="app-panel">
                        <div className="app-panel-header"><h2 id="task-overview" className="app-section-title"><ClipboardList aria-hidden="true" />Task Overview</h2></div>
                        <TaskOverviewGrid>
                            <TaskOverviewField label={<><UserRound aria-hidden="true" />Creator</>}>
                                {task.created_by_name || "User #" + task.created_by}
                            </TaskOverviewField>
                            <TaskOverviewField label={<><Users aria-hidden="true" />Current Assignee</>}>
                                {task.assigned_to_name || "User #" + task.assigned_to}
                            </TaskOverviewField>
                            <TaskOverviewField label={<><CalendarDays aria-hidden="true" />Due Date</>}>
                                <span className="block">{task.due_date ? formatTaskDate(task.due_date) : null}</span>
                                <span className="mt-1 flex flex-col items-start">
                                    <TaskAgingBadge task={task} wrap />
                                </span>
                            </TaskOverviewField>
                            <TaskOverviewField label={<><CalendarDays aria-hidden="true" />Assigned Date</>}>
                                {formatDate(task.assigned_date)}
                            </TaskOverviewField>
                            <TaskOverviewField label={<><ClipboardList aria-hidden="true" />Task Status</>}>
                                <TaskStatusBadge status={task.status} wrap />
                            </TaskOverviewField>
                            <TaskOverviewField label={<><ClipboardList aria-hidden="true" />Priority</>}>
                                <TaskPriorityBadge priority={task.priority} />
                            </TaskOverviewField>
                            <TaskOverviewField label={<><CheckCircle2 aria-hidden="true" />Assignment Status</>}>
                                <ResponseStatusBadge status={task.assignment_status} wrap />
                            </TaskOverviewField>
                            {task.pending_assignee_id !== null ? (
                                <TaskOverviewField label={<><ArrowRightLeft aria-hidden="true" />Forward pending with</>}>
                                    {task.pending_assignee_name || "User #" + task.pending_assignee_id}
                                </TaskOverviewField>
                            ) : null}
                            {task.completed_at ? (
                                <TaskOverviewField label={<><CheckCircle2 aria-hidden="true" />Completed Date</>}>
                                    {formatDate(task.completed_at, true)}
                                </TaskOverviewField>
                            ) : null}
                        </TaskOverviewGrid>
                    </section>

                    {task.rejection_reason && task.assignment_status !== "rejected" ? <section className="rounded-xl border border-red-200 bg-red-50 p-5"><h3 className="font-semibold text-red-800">Rejection reason</h3><p className="mt-2 whitespace-pre-wrap text-red-700">{task.rejection_reason}</p></section> : null}
                    {task.review_note && task.status !== "changes_required" ? <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-5"><h3 className="font-semibold text-indigo-900">Review note</h3><p className="mt-2 whitespace-pre-wrap text-indigo-800">{task.review_note}</p></section> : null}

                    <section aria-labelledby="task-timeline" className="app-panel">
                        <div className="app-panel-header">
                            <h2 id="task-timeline" className="app-section-title"><Clock3 aria-hidden="true" />Task Timeline</h2>
                            <p className="mt-1 text-sm text-slate-600">Recorded task activity, replies, and decisions in chronological order.</p>
                        </div>
                        <div className="p-4 sm:p-6">
                            {details.timeline.length === 0 ? (
                                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-slate-600">No recorded timeline events are available for this task.</p>
                            ) : (
                                <ol className="ml-2 border-l-2 border-slate-200 sm:ml-3">
                                    {details.timeline.map((event) => (
                                        <li key={event.id} className="relative pb-5 pl-5 last:pb-0 sm:pl-7">
                                            <span aria-hidden="true" className="absolute -left-[7px] top-7 h-3 w-3 rounded-full bg-blue-500 ring-4 ring-white" />
                                            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <h3 className="flex min-w-0 items-start gap-2 font-semibold text-slate-800">
                                                        <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" aria-hidden="true" />
                                                        <span>{describeTimelineEvent(event)}</span>
                                                    </h3>
                                                    <time className="shrink-0 text-xs text-slate-500" dateTime={event.created_at}>{formatDate(event.created_at, true)}</time>
                                                </div>
                                                {event.message ? (
                                                    <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-4">
                                                        <p className="text-xs font-semibold text-slate-500">
                                                            {event.event_type === "forward_requested" ? "Reply" : event.event_type === "forward_rejected" || event.event_type === "assignment_rejected" ? "Reason" : event.event_type === "changes_requested" || event.event_type === "completed" ? "Review note" : "Details"}
                                                        </p>
                                                        <p className="mt-2 whitespace-pre-wrap break-words leading-7 text-slate-800">{event.message}</p>
                                                    </div>
                                                ) : null}
                                            </article>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </DashboardLayout>
    );
}
