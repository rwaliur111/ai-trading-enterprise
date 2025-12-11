export default function Dashboard() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Trading Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-bold">Active Signals</h3>
          <p className="text-3xl">12</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-bold">Portfolio Value</h3>
          <p className="text-3xl">$125,430</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-bold">Today's P&L</h3>
          <p className="text-3xl text-green-600">+$2,450</p>
        </div>
      </div>
    </div>
  );
}
