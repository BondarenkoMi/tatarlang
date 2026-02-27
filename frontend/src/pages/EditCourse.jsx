import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

export default function EditCourse() {
    const { user, access } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
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
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        fetchCourse();
    }, [id, access]);

    const fetchCourse = async () => {
        try {
            const response = await fetch(`https://tataredu.test/api/v1/course/${id}`, {
                headers: {
                    'Authorization': `Bearer ${access}`,
                },
            });
            if (!response.ok) {
                throw new Error('Курс не найден');
            }
            const course = await response.json();
            setForm({
                name: course.name || '',
                description: course.description || '',
                level: course.level || 1,
                start_date: course.start_date || '',
                end_date: course.end_date || '',
                photo: null, // Не загружаем существующее фото в форму
            });
        } catch (err) {
            setError('Ошибка загрузки курса: ' + err.message);
        } finally {
            setInitialLoading(false);
        }
    };

    if (!user || user.role !== 'organization') {
        return <main style={{ padding: 32 }}><h2>Только для организаций</h2></main>;
    }

    if (initialLoading) {
        return <main style={{ padding: 32 }}><h2>Загрузка курса...</h2></main>;
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
            
            const response = await fetch(`https://tataredu.test/api/v1/course/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${access}`,
                },
                body: formData,
            });
            
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Ошибка обновления курса');
            }
            
            navigate('/courses');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
            <h1>Редактировать курс</h1>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label>
                    Название курса
                    <input 
                        name="name" 
                        value={form.name} 
                        onChange={handleChange} 
                        required 
                        className="form__input" 
                    />
                </label>
                <label>
                    Описание
                    <textarea 
                        name="description" 
                        value={form.description} 
                        onChange={handleChange} 
                        className="form__input" 
                    />
                </label>
                <label>
                    Уровень
                    <select name="level" value={form.level} onChange={handleChange} className="form__input">
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
                    <input 
                        type="date" 
                        name="start_date" 
                        value={form.start_date} 
                        onChange={handleChange} 
                        className="form__input" 
                    />
                </label>
                <label>
                    Дата окончания
                    <input 
                        type="date" 
                        name="end_date" 
                        value={form.end_date} 
                        onChange={handleChange} 
                        className="form__input" 
                    />
                </label>
                <label>
                    Новое фото курса (оставьте пустым, чтобы не изменять)
                    <input 
                        type="file" 
                        name="photo" 
                        accept="image/*" 
                        onChange={handleChange} 
                        className="form__input" 
                    />
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button 
                        type="submit" 
                        className="form__button" 
                        disabled={loading}
                        style={{ flex: 1 }}
                    >
                        {loading ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>
                    <button 
                        type="button" 
                        onClick={() => navigate('/courses')}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#f5f5f5',
                            color: '#333',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: '16px',
                            cursor: 'pointer',
                            flex: 1
                        }}
                    >
                        Отмена
                    </button>
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
            </form>
        </main>
    );
} 