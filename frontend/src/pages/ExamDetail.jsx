import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './ExamDetail.css';

export default function ExamDetail() {
  const { id } = useParams();
  const { access } = useAuth();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: choiceId }
  const [timeLeft, setTimeLeft] = useState(3600); // 60 минут
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const response = await fetch(`https://tataredu.test/api/v1/exam/${id}`, {
          headers: { 'Authorization': `Bearer ${access}` },
        });
        if (!response.ok) throw new Error('Ошибка загрузки теста');
        const data = await response.json();
        setExam(data);
        setQuestions(data.questions || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [id, access]);

  useEffect(() => {
    if (loading) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChoiceSelect = (questionId, choiceId) => {
    setAnswers(prev => ({ ...prev, [questionId]: choiceId }));
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    // Формируем payload для API
    const payload = {
      exam_id: exam.id,
      answers: questions.map(q => {
        const selectedChoice = q.choices.find(c => c.id === answers[q.id]);
        return {
          question_number: q.number,
          text: selectedChoice ? selectedChoice.text : ''
        };
      })
    };
    try {
      const response = await fetch('https://tataredu.test/api/v1/exam/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Ошибка отправки результатов');
      const result = await response.json();
      navigate('/exam-result', { state: { result, exam } });
    } catch (err) {
      setError(err.message);
    }
  };

  const getProgress = () => {
    return ((currentQuestion + 1) / questions.length) * 100;
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
  };

  const handleExitExam = () => {
    if (window.confirm('Вы уверены, что хотите выйти из теста? Прогресс будет потерян.')) {
      navigate('/exams');
    }
  };

  if (loading) return <div className="exam-loading">Загрузка теста...</div>;
  if (error) return <div className="exam-error">{error}</div>;
  if (!exam) return <div className="exam-error">Тест не найден</div>;
  if (!questions.length) return <div className="exam-error">В этом тесте нет ни одного вопроса</div>;

  const currentQ = questions[currentQuestion];
  if (!currentQ || !Array.isArray(currentQ.choices)) {
    return <div className="exam-error">Ошибка: вопрос не содержит вариантов ответа</div>;
  }

  return (
    <div className="modern-exam-test">
      <div className="modern-exam-header">
        <div className="modern-exam-info">
          <div className="modern-exam-meta">
            <button className="modern-exit-btn" onClick={handleExitExam}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Выйти
            </button>
            <h1 className="modern-exam-title">{exam.title}</h1>
          </div>
          <div className="modern-exam-progress">
            <div className="progress-info">
              <span>Вопрос {currentQuestion + 1} из {questions.length}</span>
              <span>Отвечено: {getAnsweredCount()}/{questions.length}</span>
            </div>
            <div className="modern-progress-bar">
              <div 
                className="modern-progress-fill" 
                style={{ width: `${getProgress()}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="modern-exam-timer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
          <span>{formatTime(timeLeft)}</span>
        </div>
      </div>

      <div className="modern-exam-content">
        <div className="modern-question-card">
          <div className="modern-question-header">
            <div className="modern-question-meta">
              <span className="modern-question-number">
                Вопрос {currentQuestion + 1} из {questions.length}
              </span>
            </div>
          </div>

          <div className="modern-question-content">
            <h2 className="modern-question-text">{currentQ.text}</h2>
            
            {currentQ.image && (
              <div className="modern-question-image">
                <img src={currentQ.image} alt="Вопрос" loading="lazy" />
              </div>
            )}

            <div className="modern-options-list">
              {currentQ.choices.map(choice => {
                const isSelected = answers[currentQ.id] === choice.id;
                return (
                  <button
                    key={choice.id}
                    className={`modern-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleChoiceSelect(currentQ.id, choice.id)}
                  >
                    {choice.text}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="modern-exam-navigation">
        <button 
          className="modern-nav-btn modern-nav-btn--secondary"
          onClick={prevQuestion}
          disabled={currentQuestion === 0}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Назад
        </button>

        <div className="modern-question-indicators">
          {questions.map((_, index) => (
            <button
              key={index}
              className={`modern-question-indicator ${
                index === currentQuestion ? 'active' : ''
              } ${
                answers[questions[index].id] ? 'answered' : ''
              }`}
              onClick={() => setCurrentQuestion(index)}
              title={`Вопрос ${index + 1}${answers[questions[index].id] ? ' (отвечен)' : ''}`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {currentQuestion === questions.length - 1 ? (
          <button 
            className="modern-nav-btn modern-nav-btn--primary modern-submit-btn"
            onClick={() => setShowConfirmDialog(true)}
          >
            Завершить тест
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </button>
        ) : (
          <button 
            className="modern-nav-btn modern-nav-btn--primary"
            onClick={nextQuestion}
          >
            Далее
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        )}
      </div>

      {showConfirmDialog && (
        <div className="modern-confirm-dialog">
          <div className="dialog-backdrop" onClick={() => setShowConfirmDialog(false)}></div>
          <div className="dialog-content">
            <h3>Завершить тест?</h3>
            <p>Вы ответили на {getAnsweredCount()} из {questions.length} вопросов.</p>
            <p>После завершения вы не сможете вернуться к тесту.</p>
            <div className="dialog-buttons">
              <button 
                className="modern-nav-btn modern-nav-btn--secondary"
                onClick={() => setShowConfirmDialog(false)}
              >
                Отмена
              </button>
              <button 
                className="modern-nav-btn modern-nav-btn--primary"
                onClick={() => {
                  setShowConfirmDialog(false);
                  handleSubmit();
                }}
              >
                Завершить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
