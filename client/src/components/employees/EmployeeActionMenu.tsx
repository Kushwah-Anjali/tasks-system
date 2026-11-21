import { Eye, Pencil, UserRoundX } from "lucide-react";
import type { Employee } from "../../types/employee";

interface EmployeeActionsMenuProps {
    employee: Employee;
    onView: (employee: Employee) => void;
    onEdit: (employee: Employee) => void;
    onDeactivate: (employee: Employee) => void;
}

export default function EmployeeActionsMenu({ employee, onView, onEdit, onDeactivate }: EmployeeActionsMenuProps) {
    return (
        <div className="flex min-w-[110px] flex-col items-stretch gap-2" role="group" aria-label={"Actions for " + employee.fullName}>
            <button type="button" onClick={() => onView(employee)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"><Eye className="h-4 w-4" />View</button>
            <button type="button" onClick={() => onEdit(employee)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Pencil className="h-4 w-4" />Edit</button>
            {employee.status === "Active" ? (
                <button type="button" onClick={() => onDeactivate(employee)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"><UserRoundX className="h-4 w-4" />Deactivate</button>
            ) : null}
        </div>
    );
}
