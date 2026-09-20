import { API_BASE_URL, mediaUrl } from '../services/api';
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function CourseDetail() {
    const location = useLocation();
    const { id } = useParams();
    const { access } = useAuth();
    const [course, setCourse] = useState(location.state || {});
    const [enrolled, setEnrolled] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(!location.state);
    const [checkingEnrollment, setCheckingEnrollment] = useState(false);

    const fetchCourse = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/course/${id}`, {
                headers: {
                    'Authorization': `Bearer ${access}`,
                },
            });
            if (!response.ok) {
                throw new Error('Курс не найден');
            }
            const courseData = await response.json();
            setCourse(courseData);
        } catch (err) {
            setError('Ошибка загрузки курса: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [access, id]);

    const checkEnrollment = useCallback(async () => {
        try {
            setCheckingEnrollment(true);
            const response = await fetch(`${API_BASE_URL}/enrollments/`, {
                headers: {
                    'Authorization': `Bearer ${access}`,
                },
            });
            if (response.ok) {
                const enrollments = await response.json();
                const enrollmentData = Array.isArray(enrollments) ? enrollments : enrollments.results || [];
                // Проверяем, есть ли запись на текущий курс
                const isEnrolled = enrollmentData.some(enrollment => enrollment.course === course.id);
                setEnrolled(isEnrolled);
            }
        } catch (err) {
            console.error('Ошибка проверки записи:', err);
        } finally {
            setCheckingEnrollment(false);
        }
    }, [access, course.id]);

    useEffect(() => {
        if (!location.state && id) {
            fetchCourse();
        }
    }, [fetchCourse, id, location.state]);

    useEffect(() => {
        if (course.id) {
            checkEnrollment();
        }
    }, [checkEnrollment, course.id]);

    const handleEnroll = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/enrollments/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${access}`,
                },
                body: JSON.stringify({ course: id }),
            });
            if (!response.ok) {
                throw new Error('Ошибка при записи на курс');
            }
            setEnrolled(true);
        } catch (err) {
            setError(err.message);
        }
    };

    // Добавляю функцию для отображения уровня
    function getLevelLabel(level) {
        const levels = { 1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C1', 6: 'C2' };
        return levels[level] || level;
    }

    if (loading) {
        return (
            <main style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    Загрузка курса...
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
                <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
                    {error}
                </div>
            </main>
        );
    }

    if (!course.name) {
        return (
            <main style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    Курс не найден
                </div>
            </main>
        );
    }

    return (
        <main style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
            <div style={{ display: 'flex', gap: 32 }}>
                {course.photo && (
                    <img src={mediaUrl(course.photo)} alt={course.name} style={{ width: 220, height: 220, objectFit: 'cover', borderRadius: 12 }} />
                )}
                <div style={{ flex: 1 }}>
                    <h1>{course.name}</h1>
                    {course.organization_name && (
                        <p style={{ 
                            fontSize: '1.1rem', 
                            color: '#1976d2', 
                            fontWeight: '500',
                            marginBottom: '16px'
                        }}>
                            <b>Организация:</b> {course.organization_name}
                        </p>
                    )}
                    <p><b>Описание:</b> {course.description}</p>
                    <p><b>Уровень:</b> {getLevelLabel(course.level)}</p>
                    <p><b>Даты:</b> {course.start_date} — {course.end_date}</p>
                    
                    {enrolled ? (
                        <div style={{ 
                            marginTop: 16, 
                            padding: '12px 20px', 
                            backgroundColor: '#e8f5e8', 
                            border: '2px solid #4caf50',
                            borderRadius: 8,
                            color: '#2e7d32',
                            fontWeight: 'bold',
                            textAlign: 'center'
                        }}>
                            ✓ Вы уже записаны на этот курс
                        </div>
                    ) : (
                        <button 
                            onClick={handleEnroll} 
                            disabled={checkingEnrollment}
                            style={{ 
                                marginTop: 16, 
                                padding: '8px 24px', 
                                fontSize: 18,
                                backgroundColor: '#1e88e5',
                                color: 'white',
                                border: 'none',
                                borderRadius: 6,
                                cursor: checkingEnrollment ? 'not-allowed' : 'pointer',
                                opacity: checkingEnrollment ? 0.7 : 1
                            }}
                        >
                            {checkingEnrollment ? 'Проверка...' : 'Записаться на курс'}
                        </button>
                    )}
                    
                    {error && <p style={{ color: 'red', marginTop: 16 }}>{error}</p>}
                </div>
            </div>
        </main>
    );
}
