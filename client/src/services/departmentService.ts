import api from "./api";

import type {
    Department,
} from "../types/department";

interface DepartmentsResponse {
    data: Department[];
}

export const getDepartments =
    async (): Promise<Department[]> => {
        const response =
            await api.get<DepartmentsResponse>(
                "/departments"
            );

        return response.data.data;
    };