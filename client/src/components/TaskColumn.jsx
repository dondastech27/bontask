import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { TaskCard } from './TaskCard';
import { Plus, MoreHorizontal } from 'lucide-react';

export function TaskColumn({ column, tasks }) {
    const { setNodeRef } = useDroppable({
        id: column.id,
        data: { type: 'Column', column },
    });

    return (
        <div className="task-column flex flex-col" style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            height: '100%',
            minWidth: '280px'
        }}>
            <div className="column-header flex justify-between items-center" style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-sm">
                    <div
                        style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: column.color, boxShadow: `0 0 8px ${column.color}` }}
                    />
                    <h3 className="font-bold text-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {column.title}
                    </h3>
                    <span className="text-muted text-sm" style={{ backgroundColor: 'var(--bg-surface-hover)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem' }}>
                        {tasks.length}
                    </span>
                </div>
                <div className="flex gap-xs">
                    <button className="icon-btn text-muted hover:text-main">
                        <Plus size={16} />
                    </button>
                    <button className="icon-btn text-muted hover:text-main">
                        <MoreHorizontal size={16} />
                    </button>
                </div>
            </div>

            <div ref={setNodeRef} className="column-content flex-col gap-md" style={{ padding: 'var(--space-md)', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                    ))}
                </SortableContext>
            </div>
        </div>
    );
}
