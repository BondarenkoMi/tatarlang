import axios from 'axios';

const api = axios.create({ baseURL: 'https://tataredu.test/api/v1' });

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
    return api.patch('/organization/me/', data, {
        headers: { Authorization: `Bearer ${access}` },
    });
}