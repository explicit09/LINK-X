export default function TestLayoutPage() {
  return (
    <div className="min-h-screen bg-blue-500 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">Test Layout Page</h1>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-gray-800">
            If you can see this with a blue background, white card, and proper styling, then Tailwind CSS is working.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-red-500 text-white p-4 rounded">Red Box</div>
            <div className="bg-green-500 text-white p-4 rounded">Green Box</div>
            <div className="bg-yellow-500 text-white p-4 rounded">Yellow Box</div>
          </div>
        </div>
      </div>
    </div>
  );
}