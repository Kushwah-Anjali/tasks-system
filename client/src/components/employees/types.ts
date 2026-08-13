export type EmployeeStatus = "Active" | "Inactive" | "On Leave"; 
export interface Employee {
  id: number;
  fullName: string;
  email: string;
  registrationNumber: string;
  department: string | null;
  designation: string | null;
  joiningDate: string | null;
  status: EmployeeStatus;
}