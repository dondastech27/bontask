import React, { useState } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { TaskColumn } from './TaskColumn';
import { TaskCard } from './TaskCard';
import { Search, Filter } from 'lucide-react';

const columns = [
    { id: 'todo', title: 'To Do', color: '#6366f1' },
    { id: 'in-progress', title: 'In Progress', color: '#f59e0b' },
    { id: 'review', title: 'Review', color: '#ec4899' },
    { id: 'done', title: 'Done', color: '#10b981' },
];

export default function TaskBoard({ tasks, setTasks }) {
    const [activeId, setActiveId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const getTasksByStatus = (status) => tasks.filter(task => task.status === status);

    const findContainer = (id) => {
        if (columns.find(col => col.id === id)) return id;
        const task = tasks.find(t => t.id === id);
        return task ? task.status : null;
    };

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragOver = (event) => {
        const { active, over } = event;
        const overId = over?.id;

        if (!overId || active.id === overId) return;

        const activeContainer = findContainer(active.id);
        const overContainer = findContainer(overId);

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            return;
        }

        setTasks((prev) => {
            const activeItems = prev.filter(t => t.status === activeContainer);
            const overItems = prev.filter(t => t.status === overContainer);
            const activeIndex = activeItems.findIndex(t => t.id === active.id);
            const overIndex = overItems.findIndex(t => t.id === overId);

            let newIndex;
            if (columns.find(c => c.id === overId)) {
                newIndex = overItems.length + 1;
            } else {
                const isBelowOverItem =
                    over &&
                    active.rect.current.translated &&
                    active.rect.current.translated.top > over.rect.top + over.rect.height;

                const modifier = isBelowOverItem ? 1 : 0;
                newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
            }

            return prev.map(t => {
                if (t.id === active.id) {
                    return { ...t, status: overContainer };
                }
                return t;
            });
        });
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        const activeContainer = findContainer(active.id);
        const overContainer = findContainer(over?.id);

        if (activeContainer && overContainer && activeContainer === overContainer) {
            const activeIndex = tasks.findIndex(t => t.id === active.id);
            const overIndex = tasks.findIndex(t => t.id === over.id);

            if (activeIndex !== overIndex) {
                setTasks((items) => arrayMove(items, activeIndex, overIndex));
            }
        }

        const updated = tasks.find(t => t.id === active.id);
        if (updated) {
            fetch(`${import.meta.env.VITE_API_URL}/tasks/${active.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated),
            }).catch(() => {});
        }
        setActiveId(null);
    };

    const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

    return (
        <div className="task-board h-full flex flex-col">
            <div className="board-header flex justify-between items-center" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="flex items-center gap-md">
                    <div className="search-bar" style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            style={{
                                padding: '0.5rem 1rem 0.5rem 2.5rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--bg-surface)',
                                color: 'var(--text-main)',
                                width: '300px',
                                outline: 'none'
                            }}
                        />
                        <Search
                            size={16}
                            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                        />
                    </div>
                    <div className="filters flex gap-sm">
                        <button className="btn" style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', gap: '0.5rem' }}>
                            <Filter size={16} />
                            Filter
                        </button>
                    </div>
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="board-columns" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 'var(--space-md)',
                    height: 'calc(100vh - 220px)',
                    overflowX: 'auto'
                }}>
                    {columns.map(column => (
                        <TaskColumn
                            key={column.id}
                            column={column}
                            tasks={getTasksByStatus(column.id)}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeTask ? <TaskCard task={activeTask} /> : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
