export default function Custom500() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-gray-900">500</h1>
        <p className="mb-6 text-gray-600">Server-side error occurred</p>
        <a href="/dashboard" className="text-blue-600 hover:underline">
          Go to dashboard
        </a>
      </div>
    </div>
  );
}
