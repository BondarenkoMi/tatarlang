import { API_BASE_URL } from '../services/api';
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './CreateCourse.css';

export default function CreateCourse() {
    const { user, access } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: '',
        description: '',
        level: 1,
        start_date: '',
        end_date: '',
        photo: null,
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    if (!user || user.role !== 'organization') {
        return <main style={{ padding: 32 }}><h2>Только для организаций</h2></main>;
    }

    function handleChange(e) {
        const { name, value, files } = e.target;
        setForm(f => ({
            ...f,
            [name]: files ? files[0] : value
        }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => {
                if (value) formData.append(key, value);
            });
            const response = await fetch(`${API_BASE_URL}/course/create`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access}`,
                },
                body: formData,
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Ошибка создания курса');
            }
            navigate('/courses');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="create-course-page">
            <div className="create-course-card">
                <h1>Создать курс</h1>
                <form onSubmit={handleSubmit} className="create-course-form">
                    <label>
                        Название курса
                        <input name="name" value={form.name} onChange={handleChange} required />
                    </label>
                    <label>
                        Описание
                        <textarea name="description" value={form.description} onChange={handleChange} />
                    </label>
                    <label>
                        Уровень
                        <select name="level" value={form.level} onChange={handleChange}>
                            <option value={1}>A1</option>
                            <option value={2}>A2</option>
                            <option value={3}>B1</option>
                            <option value={4}>B2</option>
                            <option value={5}>C1</option>
                            <option value={6}>C2</option>
                        </select>
                    </label>
                    <label>
                        Дата начала
                        <input type="date" name="start_date" value={form.start_date} onChange={handleChange} />
                    </label>
                    <label>
                        Дата окончания
                        <input type="date" name="end_date" value={form.end_date} onChange={handleChange} />
                    </label>
                    <label>
                        Фото курса
                        <input type="file" name="photo" accept="image/*" onChange={handleChange} />
                    </label>
                    <button type="submit" disabled={loading}>{loading ? 'Создание...' : 'Создать курс'}</button>
                    {error && <p className="error">{error}</p>}
                </form>
            </div>
        </main>
    );
} 