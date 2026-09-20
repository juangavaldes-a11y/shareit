const AUTH_USER_KEY = 'shareit.auth.user';

export const authStorage = {
  getUser() {
    const raw = sessionStorage.getItem(AUTH_USER_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      sessionStorage.removeItem(AUTH_USER_KEY);
      return null;
    }
  },
  setUser(user) {
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  },
  clearUser() {
    sessionStorage.removeItem(AUTH_USER_KEY);
  },
  clearAll() {
    this.clearUser();
  },
};
