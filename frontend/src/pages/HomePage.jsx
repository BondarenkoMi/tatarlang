import { API_BASE_URL } from '../services/api';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EventCard from '../components/EventCard/EventCard';
import ExamCard from '../components/ExamCard/ExamCard';
import CourseCard from '../components/CourseCard/CourseCard';
import { useAuth } from '../contexts/AuthContext';
import './HomePage.css';

// Статические данные для курсов (как fallback)
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
  }
];

// Статические данные для тестов (как fallback)
const staticExams = [
  {
    id: 1,
    title: 'Тест A1 - Начальный уровень',
    description: 'Базовые знания татарского языка для начинающих',
    level: 1
  },
  {
    id: 2,
    title: 'Тест A2 - Элементарный уровень',
    description: 'Простые повседневные ситуации и фразы',
    level: 2
  },
  {
    id: 3,
    title: 'Тест B1 - Средний уровень',
    description: 'Знакомые темы и ситуации из работы и учебы',
    level: 3
  }
];

function getRandomItems(arr, n) {
    if (!arr || arr.length === 0) return [];
    const shuffled = arr.slice().sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
}

export default function HomePage() {
    const [allEvents, setAllEvents] = useState([]);
    const [events, setEvents] = useState([]);
    const [exams, setExams] = useState([]);
    const [courses, setCourses] = useState([]);
    const { access } = useAuth();

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/course/`, {
                    headers: access ? { 'Authorization': `Bearer ${access}` } : {},
                });
                if (!response.ok) throw new Error('Ошибка загрузки курсов');
                const data = await response.json();
                setCourses(Array.isArray(data) ? data : data.results || []);
            } catch (err) {
                setCourses(staticCourses); // Используем статические данные как fallback
            }
        };
        fetchCourses();
    }, [access]);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/events/`, {
                    headers: access ? { 'Authorization': `Bearer ${access}` } : {},
                });
                if (!response.ok) throw new Error('Ошибка загрузки мероприятий');
                const data = await response.json();
                let list = Array.isArray(data) ? data : data.results || [];
                setAllEvents(list);
                list = list.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 6);
                setEvents(list);
            } catch (err) {
                setAllEvents([]);
                setEvents([]);
            }
        };
        fetchEvents();
    }, [access]);

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/exam/`, {
                    headers: access ? { 'Authorization': `Bearer ${access}` } : {},
                });
                if (!response.ok) throw new Error('Ошибка загрузки тестов');
                const data = await response.json();
                setExams(Array.isArray(data) ? data : data.results || []);
            } catch (err) {
                setExams(staticExams); // Используем статические данные как fallback
            }
        };
        fetchExams();
    }, [access]);

    const randomCourses = getRandomItems(courses, 3);
    const randomExams = getRandomItems(exams, 3);

    return (
        <main className="homepage">
            {/* Hero секция */}
            <section className="hero-section">
                <div className="hero-content">
                    <h1 className="hero-title">
                        Татар Теле — проект для изучения 
                        <span className="hero-accent"> татарского языка</span>
                    </h1>
                    <p className="hero-description">
                        Татар Теле — это современная образовательная платформа для всех, кто хочет изучать татарский язык с нуля или совершенствовать свои знания. Участвуйте в онлайн-курсах, проходите тесты, посещайте мероприятия и становитесь частью сообщества!
                    </p>
                    <div className="hero-actions">
                        <Link to="/courses" className="hero-btn hero-btn--primary">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                            </svg>
                            Начать обучение
                        </Link>
                        <Link to="/exams" className="hero-btn hero-btn--secondary">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14,2 14,8 20,8"/>
                            </svg>
                            Пройти тест
                        </Link>
                    </div>
                </div>
                <div className="hero-stats">
                    <div className="stat-item">
                        <div className="stat-number">{courses.length}</div>
                        <div className="stat-label">Курсов</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-number">{exams.length}</div>
                        <div className="stat-label">Тестов</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-number">{allEvents.length}</div>
                        <div className="stat-label">Мероприятий</div>
                    </div>
                </div>
            </section>

            {/* Курсы */}
            <section className="content-section">
                <div className="section-header">
                    <h2 className="section-title">Запишитесь на курсы <span style={{fontSize: '1rem', color: '#888'}}></span></h2>
                    <p className="section-description">Изучайте татарский язык</p>
                </div>
                <div className="cards-grid">
                    {randomCourses.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                                </svg>
                            </div>
                            <p>Нет доступных курсов</p>
                        </div>
                    ) : (
                        randomCourses.map(course => (
                            <div key={course.id} className="card-wrapper">
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
                                />
                            </div>
                        ))
                    )}
                </div>
                <div className="section-footer">
                    <Link to="/courses" className="section-btn">
                        <span>Все курсы</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </Link>
                </div>
            </section>

            {/* Мероприятия */}
            <section className="content-section">
                <div className="section-header">
                    <h2 className="section-title">Ближайшие мероприятия</h2>
                    <p className="section-description">Присоединяйтесь к нашим культурным событиям</p>
                </div>
                <div className="events-scroll">
                    {events.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                    <line x1="16" y1="2" x2="16" y2="6"/>
                                    <line x1="8" y1="2" x2="8" y2="6"/>
                                    <line x1="3" y1="10" x2="21" y2="10"/>
                                </svg>
                            </div>
                            <p>Нет ближайших мероприятий</p>
                        </div>
                    ) : (
                        events.map(event => (
                            <div key={event.id} className="event-card-wrapper">
                                <EventCard
                                    title={event.title}
                                    place={event.venue}
                                    event_type={event.event_type}
                                    date={event.date.split('T')[0]}
                                    time={event.date.split('T')[1]?.slice(0, 5) || ''}
                                    image={event['image_url']}
                                    url={event['source_url']}
                                />
                            </div>
                        ))
                    )}
                </div>
                <div className="section-footer">
                    <Link to="/events" className="section-btn">
                        <span>Все мероприятия</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </Link>
                </div>
            </section>

            {/* Тесты */}
            <section className="content-section">
                <div className="section-header">
                    <h2 className="section-title">Проверьте свои знания</h2>
                    <p className="section-description">Пройдите тесты и оцените уровень татарского языка</p>
                </div>
                <div className="cards-grid">
                    {randomExams.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14,2 14,8 20,8"/>
                                </svg>
                            </div>
                            <p>Нет доступных тестов</p>
                        </div>
                    ) : (
                        randomExams.map(exam => (
                            <div key={exam.id} className="card-wrapper">
                                <ExamCard
                                    id={exam.id}
                                    title={exam.title}
                                    description={exam.description}
                                    level={exam.level}
                                />
                            </div>
                        ))
                    )}
                </div>
                <div className="section-footer">
                    <Link to="/exams" className="section-btn">
                        <span>Все тесты</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </Link>
                </div>
            </section>
        </main>
    );
}
