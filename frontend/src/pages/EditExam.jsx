import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';

const LEVELS = [
    { value: 1, label: 'A1' },
    { value: 2, label: 'A2' },
    { value: 3, label: 'B1' },
    { value: 4, label: 'B2' },
    { value: 5, label: 'C1' },
    { value: 6, label: 'C2' },
];

export default function EditExam() {
    const { user, access } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const [form, setForm] = useState({
        title: '',
        description: '',
        level: 1,
        questions: [],
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        fetchExam();
    }, [id, access]);

    const fetchExam = async () => {
        try {
            const response = await fetch(`https://tataredu.test/api/v1/exam/${id}`, {
                headers: {
                    'Authorization': `Bearer ${access}`,
                },
            });
            if (!response.ok) {
                throw new Error('Тест не найден');
            }
            const exam = await response.json();
            setForm({
                title: exam.title || '',
                description: exam.description || '',
                level: exam.level || 1,
                questions: exam.questions?.map(q => ({
                    text: q.text || '',
                    number: q.number || 1,
                    point: q.point || 1,
                    choices: q.choices?.map(c => ({
                        text: c.text || '',
                        is_correct: c.is_correct || false
                    })) || []
                })) || []
            });
        } catch (err) {
            setError('Ошибка загрузки теста: ' + err.message);
        } finally {
            setInitialLoading(false);
        }
    };

    if (!user || user.role !== 'organization') {
        return <main style={{ padding: 32 }}><h2>Только для организаций</h2></main>;
    }

    if (initialLoading) {
        return <main style={{ padding: 32 }}><h2>Загрузка теста...</h2></main>;
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value }));
    };

    const handleQuestionChange = (idx, field, value) => {
        setForm(f => {
            const questions = [...f.questions];
            questions[idx][field] = value;
            return { ...f, questions };
        });
    };

    const handleChoiceChange = (qIdx, cIdx, value) => {
        setForm(f => {
            const questions = [...f.questions];
            const choices = [...questions[qIdx].choices];
            choices[cIdx] = { ...choices[cIdx], text: value };
            questions[qIdx].choices = choices;
            return { ...f, questions };
        });
    };

    const handleCorrectChange = (qIdx, cIdx) => {
        setForm(f => {
            const questions = [...f.questions];
            questions[qIdx].choices = questions[qIdx].choices.map((c, i) => ({ ...c, is_correct: i === cIdx }));
            return { ...f, questions };
        });
    };

    const addQuestion = () => {
        setForm(f => ({
            ...f,
            questions: [...f.questions, { text: '', number: f.questions.length + 1, point: 1, choices: [ { text: '', is_correct: true }, { text: '', is_correct: false } ] }]
        }));
    };

    const removeQuestion = (idx) => {
        setForm(f => ({
            ...f,
            questions: f.questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, number: i + 1 })),
        }));
    };

    const addChoice = (qIdx) => {
        setForm(f => {
            const questions = [...f.questions];
            questions[qIdx].choices = [...questions[qIdx].choices, { text: '', is_correct: false }];
            return { ...f, questions };
        });
    };

    const removeChoice = (qIdx, cIdx) => {
        setForm(f => {
            const questions = [...f.questions];
            let choices = questions[qIdx].choices.filter((_, i) => i !== cIdx);
            // Если удалили правильный, делаем первый вариант правильным
            if (!choices.some(c => c.is_correct)) {
                if (choices.length > 0) choices[0].is_correct = true;
            }
            questions[qIdx].choices = choices;
            return { ...f, questions };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            // Формируем payload согласно API
            const payload = {
                title: form.title,
                description: form.description,
                level: form.level,
                questions: form.questions.map(q => ({
                    text: q.text,
                    number: q.number,
                    point: Number(q.point) || 1,
                    choices: q.choices.filter(c => c.text).map(c => ({ text: c.text, is_correct: !!c.is_correct })),
                })),
            };
            const response = await fetch(`https://tataredu.test/api/v1/exam/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${access}`,
                },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || JSON.stringify(err) || 'Ошибка обновления теста');
            }
            navigate('/exams');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main style={{ maxWidth: 700, margin: '0 auto', padding: 32 }}>
            <h1>Редактировать тест</h1>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <label>
                    Название теста
                    <input name="title" value={form.title} onChange={handleChange} required className="form__input" />
                </label>
                <label>
                    Описание
                    <textarea name="description" value={form.description} onChange={handleChange} className="form__input" />
                </label>
                <label>
                    Уровень
                    <select name="level" value={form.level} onChange={handleChange} className="form__input">
                        {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                </label>
                <h3>Вопросы</h3>
                {form.questions.map((q, qIdx) => (
                    <div key={qIdx} style={{ background: '#f9f9f9', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <b>Вопрос {q.number}:</b>
                            <input
                                value={q.text}
                                onChange={e => handleQuestionChange(qIdx, 'text', e.target.value)}
                                required
                                placeholder="Текст вопроса"
                                className="form__input"
                                style={{ flex: 1 }}
                            />
                            <input
                                type="number"
                                min={1}
                                max={10}
                                value={q.point}
                                onChange={e => handleQuestionChange(qIdx, 'point', e.target.value)}
                                required
                                placeholder="Баллы"
                                className="form__input"
                                style={{ width: 80 }}
                            />
                            <span style={{ fontSize: 14, color: '#888' }}>баллов</span>
                            {form.questions.length > 1 && (
                                <button type="button" onClick={() => removeQuestion(qIdx)} style={{ color: 'red' }}>Удалить</button>
                            )}
                        </div>
                        <div style={{ marginTop: 8 }}>
                            <b>Варианты ответов:</b>
                            {q.choices.map((c, cIdx) => (
                                <div key={cIdx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                    <input
                                        value={c.text}
                                        onChange={e => handleChoiceChange(qIdx, cIdx, e.target.value)}
                                        required
                                        placeholder={`Вариант ${cIdx + 1}`}
                                        className="form__input"
                                        style={{ flex: 1 }}
                                    />
                                    <input
                                        type="radio"
                                        name={`correct_${qIdx}`}
                                        checked={!!c.is_correct}
                                        onChange={() => handleCorrectChange(qIdx, cIdx)}
                                        style={{ marginLeft: 8 }}
                                    />
                                    <span style={{ fontSize: 14, color: '#888' }}>Правильный</span>
                                    {q.choices.length > 2 && (
                                        <button type="button" onClick={() => removeChoice(qIdx, cIdx)} style={{ color: 'red' }}>Удалить</button>
                                    )}
                                </div>
                            ))}
                            <button type="button" onClick={() => addChoice(qIdx)} style={{ marginTop: 8, color: '#1976d2' }}>
                                + Добавить вариант
                            </button>
                        </div>
                    </div>
                ))}
                <button type="button" onClick={addQuestion} style={{ color: '#1976d2' }}>
                    + Добавить вопрос
                </button>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button type="submit" className="form__button" disabled={loading} style={{ flex: 1 }}>
                        {loading ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>
                    <button 
                        type="button" 
                        onClick={() => navigate('/exams')}
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