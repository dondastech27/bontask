
import { useState, useEffect } from 'react';
import './App.css';
import TaskBoard from './components/TaskBoard';
import NewTaskModal from './components/NewTaskModal';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load tasks from backend
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/tasks`)
      .then(res => {
        if (!res.ok) {
          console.error('Failed to fetch tasks, status:', res.status);
          return [];
        }
        return res.json();
      })
      .then(data => setTasks(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Failed to load tasks', err);
        setTasks([]);
      });
  }, []);

  const addTask = async (newTask) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    });
    if (!res.ok) {
      throw new Error(`Failed to create task: ${res.statusText}`);
    }
    const created = await res.json();
    setTasks(prev => [created, ...prev]);
  };

  // Ensure tasks is always an array for filter/map operations
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span>TaskFlow</span>
        </div>

        <nav>
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            Dashboard
          </button>
          <button
            className={`nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            Tasks
          </button>
          <button
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Settings
          </button>
        </nav>
      </aside>

      <main className="main-content">
        <header className="flex justify-between items-center" style={{ marginBottom: 'var(--space-xl)' }}>
          <div>
            <h1 className="text-2xl font-bold">
              {activeTab === 'dashboard' ? 'Dashboard' :
                activeTab === 'tasks' ? 'Task Board' :
                  'Settings'}
            </h1>
            <p className="text-muted">Welcome back, User</p>
          </div>
          <div className="flex items-center gap-md">
            <button
              className="btn btn-primary"
              onClick={() => setIsModalOpen(true)}
            >
              + New Task
            </button>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              U
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
            <div className="card">
              <h3 className="text-muted mb-2">Total Tasks</h3>
              <p className="text-2xl font-bold">{tasks.length}</p>
            </div>
            <div className="card">
              <h3 className="text-muted mb-2">In Progress</h3>
              <p className="text-2xl font-bold" style={{ color: 'var(--primary)' }}>
                {tasks.filter(t => t.status === 'in-progress').length}
              </p>
            </div>
            <div className="card">
              <h3 className="text-muted mb-2">Completed</h3>
              <p className="text-2xl font-bold" style={{ color: '#10b981' }}>
                {tasks.filter(t => t.status === 'done').length}
              </p>
            </div>
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
              <div className="flex flex-col gap-sm">
                {tasks.slice(0, 3).map(task => (
                  <div key={task.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-800 transition-colors">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted">Status: {task.status}</p>
                    </div>
                    <span className="text-xs text-muted">Just now</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <TaskBoard tasks={tasks} setTasks={setTasks} />
        )}

        {activeTab === 'settings' && (
          <div className="card">
            <h2 className="text-xl font-bold" style={{ marginBottom: 'var(--space-md)' }}>
              Settings
            </h2>
            <p className="text-muted">
              User settings will be implemented here.
            </p>
          </div>
        )}
      </main>

      <NewTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={addTask}
      />
    </div>
  )
}

export default App
