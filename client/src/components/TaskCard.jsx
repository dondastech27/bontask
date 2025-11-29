import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal, Calendar, Paperclip } from 'lucide-react';

export function TaskCard({ task }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id, data: { type: 'Task', task } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    const priorityColors = {
        high: { bg: 'rgba(236, 72, 153, 0.15)', text: '#ec4899' },
        medium: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
        low: { bg: 'rgba(99, 102, 241, 0.15)', text: '#6366f1' },
    };
    const p = task.priority || 'medium';
    const attachmentsCount = Number(task.attachments) || 0;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="task-card"
        >
            <div className="card-header flex justify-between items-start" style={{ marginBottom: '0.5rem' }}>
                <span
                    className="priority-badge"
                    style={{
                        backgroundColor: priorityColors[p].bg,
                        color: priorityColors[p].text,
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 500
                    }}
                >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                </span>
                <button className="icon-btn text-muted">
                    <MoreHorizontal size={16} />
                </button>
            </div>

            <h4 className="font-bold text-main" style={{ marginBottom: '0.25rem', fontSize: '0.9rem' }}>{task.title}</h4>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {task.description}
            </p>

            <div className="card-footer flex justify-between items-center">
                <div className="meta-info flex gap-sm text-muted">
                    {attachmentsCount > 0 && (
                        <div className="flex items-center gap-xs" style={{ fontSize: '0.75rem' }}>
                            <Paperclip size={12} />
                            <span>{attachmentsCount}</span>
                        </div>
                    )}
                    {task.dueDate && (
                        <div className="flex items-center gap-xs" style={{ fontSize: '0.75rem' }}>
                            <Calendar size={12} />
                            <span>{task.dueDate}</span>
                        </div>
                    )}
                </div>

                <div className="avatars">
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', border: '2px solid var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                        U
                    </div>
                </div>
            </div>
        </div>
    );
}
