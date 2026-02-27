import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateUserMe } from '../services/api';
import { Link } from 'react-router-dom';
import './ProfilePage.css';

// Моковые данные для тестов (на случай если API недоступен)
const mockTestResults = [
  {
    id: 1,
    exam: 1,
    score: 85,
    completed_at: '2025-06-15T10:30:00Z'
  },
  {
    id: 2,
    exam: 2,
    score: 92,
    completed_at: '2025-06-10T14:20:00Z'
  },
  {
    id: 3,
    exam: 3,
    score: 67,
    completed_at: '2025-06-05T16:45:00Z'
  }
];

const mockExamTitles = {
  1: 'Тест A1 - Начальный уровень',
  2: 'Тест A2 - Элементарный уровень', 
  3: 'Тест B1 - Средний уровень'
};

const mockCourses = [
  {
    id: 1,
    name: 'Основы татарского языка',
    organization_name: 'Языковой центр Казани',
    level: 1,
    photo: null,
    enrollment_date: '2025-06-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Татарская грамматика',
    organization_name: 'КФУ',
    level: 2,
    photo: null,
    enrollment_date: '2025-05-25T00:00:00Z'
  }
];

export default function ProfilePage() {
  const { user, access } = useAuth();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    org_name: '',
    org_socials: '',
  });
  const [editing, setEditing] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [testResults, setTestResults] = useState([]);
  const [examTitles, setExamTitles] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        org_name: user.org_name || '',
        org_socials: user.org_socials || '',
      });
      if (user.role !== 'organization') {
        fetchUserData();
      } else {
        setLoading(false);
      }
    }
  }, [user, access]);

  const fetchUserData = async () => {
    try {
      // Пытаемся загрузить данные с API, если не получается - fallback
      const [coursesResult, testsResult] = await Promise.allSettled([
        fetchEnrolledCourses(),
        fetchTestResults()
      ]);
      if (coursesResult.status === 'rejected') {
        setEnrolledCourses(mockCourses);
      }
      if (testsResult.status === 'rejected') {
        setTestResults(mockTestResults);
        setExamTitles(mockExamTitles);
      }
    } catch (error) {
      setEnrolledCourses(mockCourses);
      setTestResults(mockTestResults);
      setExamTitles(mockExamTitles);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrolledCourses = async () => {
    const response = await fetch('https://tataredu.test/api/v1/enrollments/', {
      headers: { 'Authorization': `Bearer ${access}` },
    });
    if (!response.ok) throw new Error('Ошибка загрузки записей на курсы');
    
    const enrollments = await response.json();
    const enrollmentsList = Array.isArray(enrollments) ? enrollments : enrollments.results || [];
    
    // Получаем детали курсов
    const coursesDetails = await Promise.all(
      enrollmentsList.map(async (enrollment) => {
        try {
          const courseResponse = await fetch(`https://tataredu.test/api/v1/course/${enrollment.course}`, {
            headers: { 'Authorization': `Bearer ${access}` },
          });
          if (courseResponse.ok) {
            const courseData = await courseResponse.json();
            return { ...courseData, enrollment_date: enrollment.enrollment_date };
          }
        } catch (err) {
          console.error('Ошибка загрузки курса:', err);
        }
        return null;
      })
    );
    
    setEnrolledCourses(coursesDetails.filter(course => course !== null));
  };

  const fetchTestResults = async () => {
    const response = await fetch('https://tataredu.test/api/v1/result/', {
      headers: { 'Authorization': `Bearer ${access}` },
    });
    if (!response.ok) throw new Error('Ошибка загрузки результатов тестов');
    const results = await response.json();
    const resultsList = Array.isArray(results) ? results : results.results || [];
    setTestResults(resultsList);
    // Получаем названия тестов
    const titles = {};
    for (const result of resultsList) {
      if (result.exam && !titles[result.exam]) {
        try {
          const examResponse = await fetch(`https://tataredu.test/api/v1/exam/${result.exam}`, {
            headers: { 'Authorization': `Bearer ${access}` },
          });
          if (examResponse.ok) {
            const examData = await examResponse.json();
            titles[result.exam] = examData.title;
          }
        } catch (err) {
          titles[result.exam] = 'Тест';
        }
      }
    }
    setExamTitles(titles);
  };

  const getLevelLabel = (level) => {
    const levels = { 1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C1', 6: 'C2' };
    return levels[level] || level;
  };

  const getLevelColor = (level) => {
    const colors = {
      1: '#10b981', 2: '#3b82f6', 3: '#f59e0b',
      4: '#ef4444', 5: '#8b5cf6', 6: '#ec4899'
    };
    return colors[level] || '#6b7280';
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreText = (score) => {
    if (score >= 80) return 'Отлично';
    if (score >= 60) return 'Хорошо';
    return 'Нужно улучшить';
  };

  if (!user) return null;

  const isOrg = user.role === 'organization';

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function save() {
    try {
      await updateUserMe(form, access);
      window.location.reload();
    } catch (error) {
      console.error('Ошибка сохранения профиля:', error);
    }
  }

  return (
    <div className="modern-profile-page">
      <div className="profile-container">
        {/* Шапка профиля */}
        <div className="profile-header">
          <div className="profile-avatar">
            <div className="avatar-circle">
              {user.first_name ? user.first_name[0]?.toUpperCase() : 'U'}
            </div>
          </div>
          <div className="profile-info">
            <h1 className="profile-name">
              {user.first_name} {user.last_name} 
              {!user.first_name && !user.last_name && user.email}
            </h1>
            <div className="profile-role">
              {isOrg ? 'Организация' : ' '}
            </div>
            <div className="profile-email">{user.email}</div>
          </div>
        </div>

        {/* Основная информация */}
        <div className="profile-section">
          <div className="section-header">
            <h2 className="section-title">Личная информация</h2>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="edit-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Редактировать
              </button>
            ) : null}
          </div>

          <div className="profile-form">
            {isOrg ? (
              <>
                <div className="form-group">
                  <label className="form-label">Название организации</label>
                  <input
                    type="text"
                    name="org_name"
                    value={form.org_name}
                    onChange={handleChange}
                    disabled={!editing}
                    className="form-input"
                    placeholder="Введите название организации"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Социальные сети</label>
                  <input
                    type="text"
                    name="org_socials"
                    value={form.org_socials}
                    onChange={handleChange}
                    disabled={!editing}
                    className="form-input"
                    placeholder="Ссылки на социальные сети"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Имя</label>
                    <input
                      type="text"
                      name="first_name"
                      value={form.first_name}
                      onChange={handleChange}
                      disabled={!editing}
                      className="form-input"
                      placeholder="Введите имя"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Фамилия</label>
                    <input
                      type="text"
                      name="last_name"
                      value={form.last_name}
                      onChange={handleChange}
                      disabled={!editing}
                      className="form-input"
                      placeholder="Введите фамилию"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Номер телефона</label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    disabled={!editing}
                    className="form-input"
                    placeholder="Введите номер телефона"
                  />
                </div>
              </>
            )}

            {editing && (
              <div className="form-actions">
                <button onClick={() => setEditing(false)} className="cancel-btn">
                  Отменить
                </button>
                <button onClick={save} className="save-btn">
                  Сохранить изменения
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Курсы и тесты только для пользователей */}
        {!isOrg && (
          <>
            {/* Записанные курсы */}
            <div className="profile-section">
              <div className="section-header">
                <h2 className="section-title">Мои курсы</h2>
                <Link to="/courses" className="view-all-btn">
                  Все курсы
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
              </div>

              {loading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Загрузка курсов...</p>
                </div>
              ) : enrolledCourses.length > 0 ? (
                <div className="courses-grid">
                  {enrolledCourses.map((course) => (
                    <Link key={course.id} to={`/course/${course.id}`} className="course-card">
                      <div className="course-image">
                        {course.photo ? (
                          <img src={course.photo} alt={course.name} />
                        ) : (
                          <div className="course-placeholder">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                            </svg>
                          </div>
                        )}
                        <div className="course-level" style={{ '--level-color': getLevelColor(course.level) }}>
                          {getLevelLabel(course.level)}
                        </div>
                      </div>
                      <div className="course-info">
                        <h3 className="course-title">{course.name}</h3>
                        <p className="course-org">{course.organization_name}</p>
                        <div className="course-enrollment">
                          Записан: {new Date(course.enrollment_date).toLocaleDateString()}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                    </svg>
                  </div>
                  <h3>Нет записей на курсы</h3>
                  <p>Запишитесь на курсы, чтобы они появились здесь</p>
                  <Link to="/courses" className="empty-action-btn">Найти курсы</Link>
                </div>
              )}
            </div>

            {/* Результаты тестов */}
            <div className="profile-section">
              <div className="section-header">
                <h2 className="section-title">Мои тесты</h2>
                <Link to="/exams" className="view-all-btn">
                  Все тесты
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
              </div>

              {loading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Загрузка результатов...</p>
                </div>
              ) : testResults.length > 0 ? (
                <div className="tests-grid">
                  {testResults.map(result => (
                    <div key={result.id} className="test-card">
                      <div className="test-header">
                        <h3 className="test-title">{examTitles[result.exam] || 'Тест'}</h3>
                        <div className="test-score" style={{ color: '#222', background: 'none' }}>{result.score} баллов</div>
                      </div>
                      <div className="test-date" style={{ color: '#222' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        {new Date(result.completed_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                  </div>
                  <h3>Нет пройденных тестов</h3>
                  <p>Пройдите тесты, чтобы отследить свой прогресс</p>
                  <Link to="/exams" className="empty-action-btn">Начать тестирование</Link>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
