import { API_BASE_URL, mediaUrl } from '../../services/api';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './CourseCard.module.css';

function getLevelLabel(level) {
  const levels = {
    1: 'A1',
    2: 'A2',
    3: 'B1',
    4: 'B2',
    5: 'C1',
    6: 'C2'
  };
  return levels[level] || level;
}

function getLevelColor(level) {
  const colors = {
    1: '#10b981',
    2: '#3b82f6', 
    3: '#f59e0b',
    4: '#ef4444',
    5: '#8b5cf6',
    6: '#ec4899'
  };
  return colors[level] || '#6b7280';
}

function getCategoryIcon(category) {
  const icons = {
    grammar: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10,9 9,9 8,9"/>
      </svg>
    ),
    vocabulary: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
    speaking: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    ),
    listening: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
      </svg>
    ),
    culture: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    )
  };
  return icons[category] || icons.grammar;
}

export default function CourseCard({ 
  id, 
  name, 
  description, 
  level, 
  organization_name, 
  start_date, 
  end_date, 
  photo,
  category = 'грамматика',
  isEnrolled = false
}) {
  const { access } = useAuth();
  const navigate = useNavigate();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const levelColor = getLevelColor(level);

  const handleEnroll = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!access) {
      navigate('/login');
      return;
    }

    setIsEnrolling(true);
    try {
      const response = await fetch(`${API_BASE_URL}/enrollments/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access}`,
        },
        body: JSON.stringify({
          course: id
        }),
      });

      if (response.ok) {
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(errorData.detail || 'Ошибка при записи на курс');
      }
    } catch (error) {
      console.error('Ошибка записи на курс:', error);
      alert('Ошибка при записи на курс');
    } finally {
      setIsEnrolling(false);
    }
  };
  
  return (
    <Link to={`/course/${id}`} className={styles.courseCardContainer}>
      <div className={styles.courseCardGlow}></div>
      
      <div className={styles.courseCardPreview}>
        {photo ? (
          <img src={mediaUrl(photo)} alt={name} className={styles.courseCardImg} />
        ) : (
          <div className={styles.coursePlaceholder}>
            <div className={styles.placeholderIcon}>
              {getCategoryIcon(category)}
            </div>
            <div className={styles.placeholderText}>Курс</div>
          </div>
        )}
        
        <div className={styles.imageOverlay}>
          <div 
            className={styles.courseLevelBadge}
            style={{ '--level-color': levelColor }}
          >
            {getLevelLabel(level)}
          </div>
          
          {isEnrolled && (
            <div className={styles.enrolledBadge}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              Записан
            </div>
          )}
        </div>
      </div>

      <div className={styles.courseCardInfo}>
        <div className={styles.courseCardInfoTop}>
          <div className={styles.courseHeader}>
            <h3 className={styles.courseCardInfoTopTitle}>{name}</h3>
            <div className={styles.categoryBadge}>
              {getCategoryIcon(category)}
              <span>{category}</span>
            </div>
          </div>
          
          {organization_name && (
            <div className={styles.courseCardInfoOrg}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              {organization_name}
            </div>
          )}
          
          <p className={styles.courseCardInfoDesc}>{description}</p>
        </div>

        <div className={styles.courseCardInfoBottom}>
          {(start_date || end_date) && (
            <div className={styles.courseCardInfoDates}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>
                {start_date && `${new Date(start_date).toLocaleDateString()}`}
                {start_date && end_date && ' — '}
                {end_date && `${new Date(end_date).toLocaleDateString()}`}
              </span>
            </div>
          )}
          
          <div className={styles.courseActions}>
            <button className={styles.viewBtn}>
              <span>Подробнее</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>

            {!isEnrolled && (
              <button 
                className={styles.enrollBtn}
                onClick={handleEnroll}
                disabled={isEnrolling}
              >
                {isEnrolling ? (
                  <>
                    <div className={styles.enrollSpinner}></div>
                    <span>Записываемся...</span>
                  </>
                ) : (
                  <>
                    <span>Записаться</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
