import Leaderboard from '../components/Leaderboard';

return (
  <div className="min-h-screen bg-gray-100 p-8">
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main content */}
        <div className="lg:col-span-3">
          {/* Existing dashboard content */}
          // ... existing code ...
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Leaderboard />
        </div>
      </div>
    </div>
  </div>
); 