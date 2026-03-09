// src/app/components/Logo.tsx

export function Logo() {
  return (
    <div className="flex flex-col items-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-label="Do Tasks App Logo"
        role="img"
      >
        <path d="M12 2a10 10 0 0 1 10 10c0 2.757-1.12 5.248-2.93 7.048M12 2a10 10 0 0 0-10 10c0 2.757 1.12 5.248 2.93 7.048M12 2v2m0 16v2" />
        <path d="M12 6a6 6 0 0 0-6 6c0 1.657.672 3.157 1.757 4.243M12 6a6 6 0 0 1 6 6c0 1.657-.672 3.157-1.757 4.243" />
        <circle cx="12" cy="12" r="2" />
      </svg>
      <h2
        className="text-xl font-semibold text-center mt-2"
        data-testid="app-name"
      >
        Do Tasks App
      </h2>
    </div>
  );
}
