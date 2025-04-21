// src/App.jsx
import React from 'react';
import GanttChart from './components/GanttChartD3';

function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-8">
    <div className="w-full max-w-7xl">
      <h1 className="text-2xl font-bold mb-6">Project Timeline Gantt Chart</h1>
      <GanttChart />
    </div>
  </main>
  );
}

export default App;
