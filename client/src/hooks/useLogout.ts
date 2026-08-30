import { useState } from "react";

import { useNavigate } from "react-router-dom";

import { logout } from "../services/authService";

import { clearCurrentUser } from "../utils/authStorage";

interface UseLogoutResult {
    handleLogout: () => Promise<void>;
    isLoggingOut: boolean;
}

export const useLogout =
    (): UseLogoutResult => {
        const navigate = useNavigate();

        const [
            isLoggingOut,
            setIsLoggingOut,
        ] = useState(false);

        const handleLogout = async () => {
            if (isLoggingOut) return;

            try {
                setIsLoggingOut(true);

                await logout();
            } catch (error) {
                console.error(
                    "Logout request failed:",
                    error
                );
            } finally {
                // Always remove the stored user
                // from the current browser.
                clearCurrentUser();

                navigate("/login", {
                    replace: true,
                });

                setIsLoggingOut(false);
            }
        };

        return {
            handleLogout,
            isLoggingOut,
        };
    };