import type { ReactNode } from "react";

interface AuthLayoutProps {
  banner?: ReactNode;
  children: ReactNode;
  maxWidthClassName?: string;
}

export default function AuthLayout({
  banner,
  children,
  maxWidthClassName = "max-w-sm",
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col lg:flex-row">
      {banner}

      <div
        className={`flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 md:px-16 lg:px-12 xl:px-24 ${
          banner ? "lg:w-1/2" : ""
        }`}
      >
        <div className={`mx-auto flex w-full ${maxWidthClassName} flex-col`}>{children}</div>
      </div>
    </div>
  );
}