import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './CreateExam.css';

const LEVELS = [
    { value: 1, label: 'A1' },
    { value: 2, label: 'A2' },
    { value: 3, label: 'B1' },
    { value: 4, label: 'B2' },
    { value: 5, label: 'C1' },
    { value: 6, label: 'C2' },
];

export default function CreateExam() {
    const { user, access } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        title: '',
        description: '',
        level: 1,
        questions: [
            { text: '', number: 1, point: 1, choices: [ { text: '', is_correct: true }, { text: '', is_correct: false } ] }
        ],
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    if (!user || user.role !== 'organization') {
        return <main style={{ padding: 32 }}><h2>Только для организаций</h2></main>;
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
        setForm(f => {
            const questions = [...f.questions, { text: '', number: f.questions.length + 1, point: 1, choices: [ { text: '', is_correct: true }, { text: '', is_correct: false } ] }];
            // Пересчитываем номера у всех вопросов
            return { ...f, questions: questions.map((q, i) => ({ ...q, number: i + 1 })) };
        });
    };

    const removeQuestion = (idx) => {
        setForm(f => {
            const questions = f.questions.filter((_, i) => i !== idx);
            // Пересчитываем номера у всех вопросов
            return { ...f, questions: questions.map((q, i) => ({ ...q, number: i + 1 })) };
        });
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
            const response = await fetch('https://tataredu.test/api/v1/exam/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${access}`,
                },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || JSON.stringify(err) || 'Ошибка создания теста');
            }
            navigate('/exams');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="create-exam-page">
            <div className="create-exam-card">
                <h1>Создать тест</h1>
                <form onSubmit={handleSubmit} className="create-exam-form">
                    <label>
                        Название теста
                        <input name="title" value={form.title} onChange={handleChange} required />
                    </label>
                    <label>
                        Описание
                        <textarea name="description" value={form.description} onChange={handleChange} />
                    </label>
                    <label>
                        Уровень
                        <select name="level" value={form.level} onChange={handleChange}>
                            {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>
                    </label>
                    <h3 style={{marginTop: '1.5rem', marginBottom: '0.5rem'}}>Вопросы</h3>
                    {form.questions.map((q, qIdx) => (
                        <div key={qIdx} className="exam-question-block">
                            <div className="question-header" style={{marginBottom: '1rem'}}>
                                <div style={{fontWeight: 600, fontSize: '1.1rem', color: '#1e293b'}}>Вопрос {q.number}</div>
                                {form.questions.length > 1 && (
                                    <button type="button" onClick={() => removeQuestion(qIdx)} className="remove-btn">Удалить вопрос</button>
                                )}
                            </div>
                            <div className="question-fields">
                                <input
                                    value={q.text}
                                    onChange={e => handleQuestionChange(qIdx, 'text', e.target.value)}
                                    required
                                    placeholder="Текст вопроса"
                                />
                                <div style={{display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem'}}>
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={q.point}
                                        onChange={e => handleQuestionChange(qIdx, 'point', e.target.value)}
                                        required
                                        placeholder="Баллы"
                                        style={{ width: 80 }}
                                    />
                                    <span style={{ fontSize: 14, color: '#888' }}>баллов</span>
                                </div>
                            </div>
                            <div className="exam-choices" style={{marginTop: '1rem'}}>
                                <div style={{fontWeight: 500, marginBottom: '0.5rem'}}>Варианты ответов:</div>
                                {q.choices.map((c, cIdx) => (
                                    <div key={cIdx} className="exam-choice-row">
                                        <input
                                            value={c.text}
                                            onChange={e => handleChoiceChange(qIdx, cIdx, e.target.value)}
                                            required
                                            placeholder={`Вариант ${cIdx + 1}`}
                                        />
                                        <label style={{display: 'flex', alignItems: 'center', gap: 4}}>
                                            <input
                                                type="radio"
                                                name={`correct_${qIdx}`}
                                                checked={!!c.is_correct}
                                                onChange={() => handleCorrectChange(qIdx, cIdx)}
                                            />
                                            <span style={{fontSize: '0.95rem'}}>правильный</span>
                                        </label>
                                        {q.choices.length > 2 && (
                                            <button type="button" onClick={() => removeChoice(qIdx, cIdx)} className="remove-btn">Удалить</button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={() => addChoice(qIdx)} className="add-btn">Добавить вариант</button>
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={addQuestion} className="add-btn" style={{marginBottom: '1rem'}}>Добавить вопрос</button>
                    <button type="submit" disabled={loading} className="submit-btn">
                        {loading ? 'Создание...' : 'Создать тест'}
                    </button>
                    {error && <p className="error">{error}</p>}
                </form>
            </div>
        </main>
    );
} 