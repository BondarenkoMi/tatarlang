import { API_BASE_URL } from '../services/api';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './ProfilePage.css';

export default function OrganizationProfile() {
    const { access } = useAuth();
    const [organization, setOrganization] = useState(null);
    const [form, setForm] = useState({
        name: '',
        description: '',
        addres: {}
    });
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchOrganization = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/organization/me`, {
                headers: {
                    'Authorization': `Bearer ${access}`,
                },
            });
            if (response.ok) {
                const data = await response.json();
                setOrganization(data);
                setForm({
                    name: data.name || '',
                    description: data.description || '',
                    addres: data.addres || {}
                });
            }
        } catch (error) {
            console.error('Ошибка загрузки профиля организации:', error);
        } finally {
            setLoading(false);
        }
    }, [access]);

    useEffect(() => {
        fetchOrganization();
    }, [fetchOrganization]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'city' || name === 'street' || name === 'building') {
            setForm(prev => ({
                ...prev,
                addres: {
                    ...prev.addres,
                    [name]: value
                }
            }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch(`${API_BASE_URL}/organization/me`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${access}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(form),
            });
            
            if (response.ok) {
                const updatedOrg = await response.json();
                setOrganization(updatedOrg);
                setEditing(false);
            } else {
                const error = await response.json();
                alert('Ошибка сохранения: ' + JSON.stringify(error));
            }
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            alert('Ошибка сохранения данных');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className='ivents-page'>
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    Загрузка профиля организации...
                </div>
            </div>
        );
    }

    if (!organization) {
        return (
            <div className='ivents-page'>
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <h2>Профиль организации не найден</h2>
                    <p>Возможно, у вас нет прав доступа или организация не создана.</p>
                </div>
            </div>
        );
    }

    return (
        <div className='ivents-page'>
            <h1 className='ivents-title'>Профиль организации</h1>
            
            <div style={{ 
                background: '#fff', 
                borderRadius: 12, 
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)', 
                padding: 24, 
                margin: '20px 0' 
            }}>
                <div style={{ marginBottom: 20 }}>
                    <label style={{ 
                        display: 'block', 
                        marginBottom: 8, 
                        fontWeight: 'bold',
                        color: '#333'
                    }}>
                        Название организации
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        disabled={!editing}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: 6,
                            fontSize: '16px',
                            backgroundColor: editing ? '#fff' : '#f9f9f9'
                        }}
                    />
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label style={{ 
                        display: 'block', 
                        marginBottom: 8, 
                        fontWeight: 'bold',
                        color: '#333'
                    }}>
                        Описание
                    </label>
                    <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        disabled={!editing}
                        rows={4}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: 6,
                            fontSize: '16px',
                            backgroundColor: editing ? '#fff' : '#f9f9f9',
                            resize: 'vertical'
                        }}
                    />
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label style={{ 
                        display: 'block', 
                        marginBottom: 8, 
                        fontWeight: 'bold',
                        color: '#333'
                    }}>
                        Город
                    </label>
                    <input
                        type="text"
                        name="city"
                        value={form.addres.city || ''}
                        onChange={handleChange}
                        disabled={!editing}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: 6,
                            fontSize: '16px',
                            backgroundColor: editing ? '#fff' : '#f9f9f9'
                        }}
                    />
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label style={{ 
                        display: 'block', 
                        marginBottom: 8, 
                        fontWeight: 'bold',
                        color: '#333'
                    }}>
                        Улица
                    </label>
                    <input
                        type="text"
                        name="street"
                        value={form.addres.street || ''}
                        onChange={handleChange}
                        disabled={!editing}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: 6,
                            fontSize: '16px',
                            backgroundColor: editing ? '#fff' : '#f9f9f9'
                        }}
                    />
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label style={{ 
                        display: 'block', 
                        marginBottom: 8, 
                        fontWeight: 'bold',
                        color: '#333'
                    }}>
                        Дом/Здание
                    </label>
                    <input
                        type="text"
                        name="building"
                        value={form.addres.building || ''}
                        onChange={handleChange}
                        disabled={!editing}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: 6,
                            fontSize: '16px',
                            backgroundColor: editing ? '#fff' : '#f9f9f9'
                        }}
                    />
                </div>

                <div style={{ marginTop: 30 }}>
                    {editing ? (
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                style={{
                                    padding: '12px 24px',
                                    backgroundColor: '#1e88e5',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 6,
                                    fontSize: '16px',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    opacity: saving ? 0.7 : 1
                                }}
                            >
                                {saving ? 'Сохранение...' : 'Сохранить'}
                            </button>
                            <button 
                                onClick={() => {
                                    setEditing(false);
                                    setForm({
                                        name: organization.name || '',
                                        description: organization.description || '',
                                        addres: organization.addres || {}
                                    });
                                }}
                                style={{
                                    padding: '12px 24px',
                                    backgroundColor: '#f5f5f5',
                                    color: '#333',
                                    border: 'none',
                                    borderRadius: 6,
                                    fontSize: '16px',
                                    cursor: 'pointer'
                                }}
                            >
                                Отмена
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setEditing(true)}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#1e88e5',
                                color: 'white',
                                border: 'none',
                                borderRadius: 6,
                                fontSize: '16px',
                                cursor: 'pointer'
                            }}
                        >
                            Редактировать
                        </button>
                    )}
                </div>
            </div>

            <div style={{ 
                background: '#fff', 
                borderRadius: 12, 
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)', 
                padding: 24, 
                margin: '20px 0' 
            }}>
                <h3 style={{ marginBottom: 16, color: '#333' }}>Информация об организации</h3>
                <p><strong>Дата создания:</strong> {new Date(organization.created_at).toLocaleDateString()}</p>
                <p><strong>ID организации:</strong> {organization.id}</p>
            </div>
        </div>
    );
}
