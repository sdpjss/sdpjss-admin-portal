const testEnvironmentNames = new Set(["test", "testing"]);

const EnvironmentBanner = () => {
  const environmentName = (
    import.meta.env.VITE_APP_ENV || import.meta.env.MODE
  )
    .trim()
    .toLowerCase();

  if (!testEnvironmentNames.has(environmentName)) {
    return null;
  }

  return (
    <div
      aria-label="Test environment"
      className="pointer-events-none fixed left-0 top-0 z-[9999] h-44 w-44 overflow-hidden print:hidden"
    >
      <div className="absolute left-[-58px] top-[48px] w-[260px] -rotate-45 animate-pulse border-y-4 border-yellow-300 bg-red-600 py-3 text-center text-2xl font-black tracking-[0.25em] text-white shadow-[0_6px_20px_rgba(0,0,0,0.55)] motion-reduce:animate-none">
        TEST
      </div>
    </div>
  );
};

export default EnvironmentBanner;
