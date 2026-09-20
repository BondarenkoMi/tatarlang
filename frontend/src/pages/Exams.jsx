import { API_BASE_URL } from '../services/api';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ExamCard from '../components/ExamCard/ExamCard';
import './Exams.css';

// Статические данные тестов
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
  },
  {
    id: 4,
    title: 'Тест B2 - Выше среднего',
    description: 'Сложные тексты и абстрактные темы',
    level: 4
  },
  {
    id: 5,
    title: 'Тест C1 - Продвинутый уровень',
    description: 'Сложные длинные тексты с подтекстом',
    level: 5
  },
  {
    id: 6,
    title: 'Тест C2 - Владение в совершенстве',
    description: 'Свободное владение татарским языком',
    level: 6
  }
];


export default function Exams() {
  const { user, access } = useAuth();
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const examsRes = await fetch(`${API_BASE_URL}/exam/`, {
          headers: access ? { 'Authorization': `Bearer ${access}` } : {},
        });
        let examsData = await examsRes.json();
        examsData = Array.isArray(examsData) ? examsData : examsData.results || [];
        setExams(examsData.length ? examsData : staticExams);
        // Загружаем результаты пользователя
        if (access) {
          const resultsRes = await fetch(`${API_BASE_URL}/result/`, {
            headers: { 'Authorization': `Bearer ${access}` },
          });
          let resultsData = await resultsRes.json();
          resultsData = Array.isArray(resultsData) ? resultsData : resultsData.results || [];
          setResults(resultsData);
        } else {
          setResults([]);
        }
      } catch (e) {
        setError('Ошибка загрузки тестов');
        setExams(staticExams);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [access]);

  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот тест? Это действие необратимо.')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/exam/${examId}`, {
        method: 'DELETE',
        headers: access ? { 'Authorization': `Bearer ${access}` } : {},
      });
      if (!response.ok) throw new Error('Ошибка удаления теста');
      setExams(prev => prev.filter(e => e.id !== examId));
    } catch (e) {
      alert('Ошибка при удалении теста: ' + (e.message || 'Неизвестная ошибка'));
    }
  };

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         exam.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getExamTitle = (examId) => {
    const exam = exams.find(e => e.id === examId);
    return exam ? exam.title : 'Тест';
  };

  if (loading) {
    return <div style={{textAlign: 'center', padding: 40}}>Загрузка тестов...</div>;
  }
  if (error) {
    return <div style={{textAlign: 'center', color: 'red', padding: 40}}>{error}</div>;
  }

  return (
    <div className="modern-exams-page">
      <div className="modern-exams-header">
        <div className="header-content">
          <h1 className="modern-exams-title">
            Система тестирования
            <span className="title-accent">  знаний</span>
          </h1>
          <p className="modern-exams-subtitle">
            Проверьте свои знания татарского языка с помощью наших тестов
          </p>
        </div>
        
        {user?.role === 'organization' && (
          <Link to="/create-exam" className="modern-create-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Создать тест
          </Link>
        )}
      </div>

      <div className="modern-controls">
        <div className="modern-tabs">
          <button
            className={`modern-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
            </svg>
            Все тесты
          </button>
          
          {user?.role !== 'organization' && (
            <button
              className={`modern-tab ${activeTab === 'completed' ? 'active' : ''}`}
              onClick={() => setActiveTab('completed')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              Пройденные
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
              placeholder="Поиск тестов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="modern-search-input"
            />
          </div>
        </div>
      </div>

      <div className="modern-content">
        {activeTab === 'all' && (
          <div className="modern-exams-grid">
            {filteredExams.length === 0 ? (
              <div className="modern-empty-state">
                <div className="empty-icon">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                </div>
                <h3>Тесты не найдены</h3>
                <p>Попробуйте изменить поисковый запрос</p>
              </div>
            ) : (
              filteredExams.map((exam) => (
                <div key={exam.id} className="exam-card-wrapper">
                  <ExamCard 
                    id={exam.id}
                    title={exam.title}
                    description={exam.description}
                    level={exam.level}
                  />
                  {user?.role === 'organization' && (
                    <div className="exam-admin-actions">
                      <Link to={`/edit-exam/${exam.id}`} className="edit-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </Link>
                      <button
                        onClick={() => handleDeleteExam(exam.id)}
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
        )}

        {activeTab === 'completed' && user?.role !== 'organization' && (
          <div className="modern-results-section">
            <h2 className="results-title">История результатов</h2>
            {results.length === 0 ? (
              <div className="modern-empty-state">
                <div className="empty-icon">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                <h3>Пройденных тестов нет</h3>
                <p>Начните проходить тесты, чтобы увидеть свои результаты</p>
              </div>
            ) : (
              <div className="modern-results-grid">
                {results.map((result) => (
                  <div key={result.id} className="modern-result-card">
                    <div className="result-header">
                      <h4>{getExamTitle(result.exam)}</h4>
                      <div className={`result-score ${result.score >= 80 ? 'excellent' : result.score >= 60 ? 'good' : 'needs-improvement'}`}>
                        {result.score} баллов
                      </div>
                    </div>
                    <div className="result-date">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      Пройден: {new Date(result.completed_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
