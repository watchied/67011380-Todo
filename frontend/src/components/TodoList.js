// frontend/src/components/TodoList.js
import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5001/api';

function TodoList({ username, onLogout }) {
    const [todos, setTodos] = useState([]);
    const [newTask, setNewTask] = useState('');

    useEffect(() => {
        


        fetchTodos();
    }, [username]); // Refetch when username changes (e.g., after login)

    // 1. READ: Fetch all todos for the current user
    const fetchTodos = async () => {
        try {
            const response = await fetch(`${API_URL}/todos/${username}`);
            
            if (!response.ok) {
                console.error('Failed to fetch todos:', response.statusText);
                return;
            }

            const data = await response.json();
            setTodos(data);
        } catch (err) {
            console.error('Error fetching todos:', err);
        }
    };

    // 2. CREATE: Add a new todo
    const handleAddTodo = async (e) => {
        e.preventDefault();
        if (!newTask.trim()) return;

        try {
            const response = await fetch(`${API_URL}/todos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, task: newTask }),
            });

            if (!response.ok) {
                console.error('Failed to add todo:', response.statusText);
                return;
            }

            const newTodo = await response.json();
            // Add the new item to the beginning of the list
            setTodos([newTodo, ...todos]); 
            setNewTask('');
        } catch (err) {
            console.error('Error adding todo:', err);
        }
    };

    // 3. UPDATE: Toggle the 'done' status
    const handleToggleDone = async (id, currentDoneStatus) => {
        const newDoneStatus = !currentDoneStatus;
        try {
            const response = await fetch(`${API_URL}/todos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ done: newDoneStatus }),
            });

            if (!response.ok) {
                console.error('Failed to update todo:', response.statusText);
                return;
            }

            // Update the status in the local state immediately
            setTodos(todos.map(todo => 
                todo.id === id ? { ...todo, done: newDoneStatus } : todo
            ));
        } catch (err) {
            console.error('Error toggling done status:', err);
        }
    };

    // 4. DELETE: Remove a todo item
    const handleDeleteTodo = async (id) => {
        try {
            const response = await fetch(`${API_URL}/todos/${id}`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                 console.error('Failed to delete todo:', response.statusText);
                return;
            }

            // Filter out the deleted item from the state
            setTodos(todos.filter(todo => todo.id !== id));
        } catch (err) {
            console.error('Error deleting todo:', err);
        }
    };

    const handleLogout = () => {
        // Clear storage and trigger state change in App.js
        localStorage.removeItem('todo_username');
        onLogout();
    };

    return (
        <div className="w-full max-w-sm sm:max-w-md mx-auto">
    <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-700">
            Todo List for: <span className="text-orange-500">{username}</span>
        </h2>
        <button 
            onClick={handleLogout}
            className="text-sm font-medium text-gray-400 hover:text-red-500 transition-colors"
        >
            Logout
        </button>
    </div>

    <form onSubmit={handleAddTodo} className="mb-8">
        <div className="flex border border-gray-200 rounded-xl overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-orange-500 transition-all">
            <input
                type="text"
                placeholder="New Task"
                className="flex-1 px-4 py-3 outline-none text-sm"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
            />
            <button 
                type="submit"
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors"
            >
                Add Task
            </button>
        </div>
    </form>

    <ul className="space-y-3">
        {todos.map(todo => (
            <li 
                key={todo.id} 
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 group hover:border-orange-200 transition-all"
            >
                <div className="flex items-center gap-3 flex-1">
                    <input
                        type="checkbox"
                        className="w-5 h-5 accent-orange-400 cursor-pointer"
                        checked={!!todo.done}
                        onChange={() => handleToggleDone(todo.id, todo.done)}
                    />
                    <div className="flex flex-col">
                        <span className={`text-sm font-medium ${todo.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                            {todo.task}
                        </span>
                        <small className="text-[10px] text-gray-400">
                            Updated: {new Date(todo.updated).toLocaleString()}
                        </small>
                    </div>
                </div>
                
                <button 
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors opacity-0 group-hover:opacity-100"
                >
                    Delete
                </button>
            </li>
        ))}
    </ul>
</div>
    );
}

export default TodoList;