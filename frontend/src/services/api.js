import axios from 'axios';

export const API_BASE_URL = (process.env.REACT_APP_API_URL || '/api/v1').replace(/\/$/, '');

const api = axios.create({ baseURL: API_BASE_URL });

export function loginRequest(data) {
    return api.post('/jwt/create/', data);
}

export function registerRequest(data) {
    return api.post('/users/', data, {
        headers: { 'Content-Type': 'application/json' },
    });
}

export function refreshToken(refresh) {
    return api.post('/jwt/refresh/', { refresh });
}

export function getUserMe(access) {
    return api.get('/users/me/', {
        headers: { Authorization: `Bearer ${access}` },
    });
}

export function updateUserMe(data, access) {
    return api.patch('/users/me/', data, {
        headers: { Authorization: `Bearer ${access}` },
    });
}

export function updateOrgMe(data, access) {
    return api.patch('/organization/me', data, {
        headers: { Authorization: `Bearer ${access}` },
    });
}
export function mediaUrl(path) {
    if (!path) return path;
    return new URL(path, new URL(API_BASE_URL, window.location.origin).origin).href;
}
