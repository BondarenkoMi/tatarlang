import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CourseCard from '../components/CourseCard/CourseCard';
import './Courses.css';

// Статические данные курсов
const staticCourses = [
  {
    id: 1,
    name: 'Основы татарского языка',
    description: 'Изучите алфавит, базовую грамматику и простые фразы для ежедневного общения на татарском языке',
    level: 1,
    organization_name: 'Языковой центр Казани',
    start_date: '2025-07-01',
    end_date: '2025-12-01',
    photo: null,
    category: 'грамматика'
  },
  {
    id: 2,
    name: 'Татарская разговорная речь',
    description: 'Практикуйте устную речь и развивайте навыки общения в повседневных ситуациях',
    level: 2,
    organization_name: 'КФУ',
    start_date: '2025-06-15',
    end_date: '2025-11-15',
    photo: null,
    category: 'разговорный'
  },
  {
    id: 3,
    name: 'Татарская литература и культура',
    description: 'Погрузитесь в богатое наследие татарской культуры через изучение литературных произведений',
    level: 3,
    organization_name: 'Татарский культурный центр',
    start_date: '2025-08-01',
    end_date: '2025-12-31',
    photo: null,
    category: 'культура'
  },
  {
    id: 4,
    name: 'Продвинутая татарская грамматика',
    description: 'Углубленное изучение сложных грамматических конструкций и стилистики',
    level: 4,
    organization_name: 'Институт татарского языка',
    start_date: '2025-09-01',
    end_date: '2026-01-31',
    photo: null,
    category: 'грамматика'
  },
  {
    id: 5,
    name: 'Татарский для бизнеса',
    description: 'Профессиональная лексика и деловая переписка на татарском языке',
    level: 5,
    organization_name: 'Бизнес-школа Татарстана',
    start_date: '2025-07-15',
    end_date: '2025-10-15',
    photo: null,
    category: 'лексика'
  },
  {
    id: 6,
    name: 'Мастерство татарского языка',
    description: 'Совершенствование навыков для достижения уровня носителя языка',
    level: 6,
    organization_name: 'Академия татарского языка',
    start_date: '2025-08-15',
    end_date: '2026-02-15',
    photo: null,
    category: 'аудирование'
  }
];

// Статические записи на курсы
const staticEnrollments = [
  { id: 1, course: 1, enrollment_date: '2025-06-01T00:00:00Z' },
  { id: 2, course: 3, enrollment_date: '2025-05-25T00:00:00Z' }
];

export default function Courses() {
  const { user, access } = useAuth();
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Получить курсы
        const coursesRes = await fetch('https://tataredu.test/api/v1/course/', {
          headers: access ? { 'Authorization': `Bearer ${access}` } : {},
        });
        let coursesData = await coursesRes.json();
        coursesData = Array.isArray(coursesData) ? coursesData : coursesData.results || [];
        setCourses(coursesData.length ? coursesData : staticCourses);
        // Получить записи на курсы (если пользователь залогинен)
        if (access) {
          const enrollRes = await fetch('https://tataredu.test/api/v1/enrollments/', {
            headers: { 'Authorization': `Bearer ${access}` },
          });
          let enrollData = await enrollRes.json();
          enrollData = Array.isArray(enrollData) ? enrollData : enrollData.results || [];
          setEnrollments(enrollData.length ? enrollData : staticEnrollments);
        } else {
          setEnrollments([]);
        }
      } catch (e) {
        setError('Ошибка загрузки данных');
        setCourses(staticCourses);
        setEnrollments(staticEnrollments);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [access]);

  const handleDeleteCourse = (courseId) => {
    alert('Функция удаления будет доступна после подключения к API');
  };

  const enrolledCourseIds = enrollments.map(enrollment => enrollment.course);

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'enrolled') {
      return matchesSearch && enrolledCourseIds.includes(course.id);
    }
    return matchesSearch;
  });

  if (loading) {
    return <div style={{textAlign: 'center', padding: 40}}>Загрузка курсов...</div>;
  }
  if (error) {
    return <div style={{textAlign: 'center', color: 'red', padding: 40}}>{error}</div>;
  }

  return (
    <div className="modern-courses-page">
      <div className="modern-courses-header">
        <div className="header-content">
          <h1 className="modern-courses-title">
            Обучающие
            <span className="title-accent">  курсы</span>
          </h1>
          <p className="modern-courses-subtitle">
            Изучайте татарский язык с помощью материалов
          </p>
        </div>
        
        {user?.role === 'organization' && (
          <Link to="/create-course" className="modern-create-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Создать курс
          </Link>
        )}
      </div>

      <div className="modern-stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-number">{courses.length}</div>
            <div className="stat-label">Всего курсов</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-number">{enrollments.length}</div>
            <div className="stat-label">Записей на курсы</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-number">6</div>
            <div className="stat-label">Уровней сложности</div>
          </div>
        </div>
      </div>

      <div className="modern-controls">
        <div className="modern-tabs">
          <button
            className={`modern-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            Все курсы
          </button>
          
          {user?.role !== 'organization' && (
            <button
              className={`modern-tab ${activeTab === 'enrolled' ? 'active' : ''}`}
              onClick={() => setActiveTab('enrolled')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              Мои курсы
            </button>
          )}
        </div>

        <div className="modern-filters">
          <div className="search-container">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Поиск курсов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="modern-search-input"
            />
          </div>
        </div>
      </div>

      <div className="modern-content">
        <div className="modern-courses-grid">
          {filteredCourses.length === 0 ? (
            <div className="modern-empty-state">
              <div className="empty-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
              </div>
              <h3>Курсы не найдены</h3>
              <p>Попробуйте изменить поисковый запрос</p>
            </div>
          ) : (
            filteredCourses.map((course) => (
              <div key={course.id} className="course-card-wrapper">
                <CourseCard 
                  id={course.id}
                  name={course.name}
                  description={course.description}
                  level={course.level}
                  organization_name={course.organization_name}
                  start_date={course.start_date}
                  end_date={course.end_date}
                  photo={course.photo}
                  category={course.category}
                  isEnrolled={enrolledCourseIds.includes(course.id)}
                />
                {user?.role === 'organization' && (
                  <div className="course-admin-actions">
                    <Link to={`/edit-course/${course.id}`} className="edit-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </Link>
                    <button
                      onClick={() => handleDeleteCourse(course.id)}
                      className="delete-btn"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}