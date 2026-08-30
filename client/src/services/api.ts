import axios from "axios";

import {
    clearCurrentUser,
} from "../utils/authStorage";

const api = axios.create({
    baseURL:
        import.meta.env.VITE_API_URL ||
        "http://localhost:5000/api",

    withCredentials: true,

    headers: {
        "Content-Type":
            "application/json",
    },
});

api.interceptors.response.use(
    (response) => response,

    (error: unknown) => {
        if (
            typeof error === "object" &&
            error !== null &&
            "response" in error
        ) {
            const responseError = error as {
                response?: {
                    status?: number;
                };
            };

            if (
                responseError.response
                    ?.status === 401
            ) {
                clearCurrentUser();

                const isLoginPage =
                    window.location.pathname ===
                    "/login";

                if (!isLoginPage) {
                    window.location.replace(
                        "/login"
                    );
                }
            }
        }

        return Promise.reject(error);
    }
);

export default api;