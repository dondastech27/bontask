import React, { useState } from 'react';
import { X, Calendar, Tag, AlertCircle } from 'lucide-react';

export default function NewTaskModal({ isOpen, onClose, onSave }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');
    const [dueDate, setDueDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            await onSave({
                title,
                description,
                priority,
                dueDate,
                status: 'todo',
                tags: ['New'],
                attachments: 0
            });
            onClose();
            // Reset form
            setTitle('');
            setDescription('');
            setPriority('medium');
            setDueDate('');
            setError(null);
        } catch (err) {
            console.error(err);
            setError('Failed to create task. Is the backend server running?');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div className="modal-content" style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                width: '500px',
                boxShadow: 'var(--shadow-lg)',
                animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                <div className="modal-header flex justify-between items-center" style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--border)' }}>
                    <h2 className="text-xl font-bold">Create New Task</h2>
                    <button onClick={onClose} className="text-muted hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: 'var(--space-lg)' }}>
                    <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                        <label className="block text-sm font-medium text-muted mb-2">Task Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Redesign Homepage"
                            required
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                backgroundColor: 'var(--bg-app)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                        <label className="block text-sm font-medium text-muted mb-2">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add details about the task..."
                            rows={4}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                backgroundColor: 'var(--bg-app)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                color: 'white',
                                outline: 'none',
                                resize: 'none'
                            }}
                        />
                    </div>

                    <div className="flex gap-md mb-6">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-muted mb-2">Priority</label>
                            <div className="relative">
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        backgroundColor: 'var(--bg-app)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'white',
                                        outline: 'none',
                                        appearance: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                                <AlertCircle size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-muted mb-2">Due Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        backgroundColor: 'var(--bg-app)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'white',
                                        outline: 'none',
                                        colorScheme: 'dark'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid var(--danger)',
                            color: 'var(--danger)',
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--space-md)',
                            fontSize: '0.875rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-sm">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn"
                            style={{ color: 'var(--text-muted)' }}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting}
                            style={{ opacity: isSubmitting ? 0.7 : 1 }}
                        >
                            {isSubmitting ? 'Creating...' : 'Create Task'}
                        </button>
                    </div>
                </form>
            </div>
            <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
        </div>
    );
}
