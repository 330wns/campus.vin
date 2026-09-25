(() => {
  'use strict';
  const API = 'https://kisj.pythonanywhere.com';
  const KEY = 'campus.web.google.v1';
  let popup = null;
  let tokens;
  try { tokens = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { tokens = null; }
  const save = value => { tokens = value; value ? localStorage.setItem(KEY, JSON.stringify(value)) : localStorage.removeItem(KEY); };
  const connected = () => Boolean(tokens?.refresh_token);
  const connect = () => {
    popup = window.open(`${API}/v1/web/oauth/start`, 'campus-google-oauth', 'width=570,height=750');
    if (!popup) window.dispatchEvent(new CustomEvent('campus-google-error', {detail:'Allow the Google sign-in popup and try again.'}));
  };
  window.addEventListener('message', event => {
    if (event.origin !== API || event.source !== popup || event.data?.type !== 'campus-google-auth') return;
    popup = null;
    if (event.data.error) return window.dispatchEvent(new CustomEvent('campus-google-error', {detail:event.data.error}));
    const value = event.data.tokens;
    if (!value?.access_token || !value?.refresh_token) return window.dispatchEvent(new CustomEvent('campus-google-error', {detail:'Google did not provide the required tokens.'}));
    save({...value, expires_at:Date.now() + Number(value.expires_in || 3600) * 1000});
    window.dispatchEvent(new Event('campus-google-connected'));
  });
  async function accessToken(force = false) {
    if (!connected()) throw Error('Connect Google Classroom first.');
    if (!force && tokens.access_token && Date.now() < Number(tokens.expires_at || 0) - 60000) return tokens.access_token;
    const response = await fetch(`${API}/v1/web/oauth/refresh`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({refresh_token:tokens.refresh_token})});
    const data = await response.json();
    if (!response.ok || !data.access_token) throw Error(data.error_description || 'Google sign-in expired. Reconnect Google Classroom.');
    save({...tokens, ...data, refresh_token:data.refresh_token || tokens.refresh_token, expires_at:Date.now() + Number(data.expires_in || 3600) * 1000});
    return tokens.access_token;
  }
  async function homework() {
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await accessToken(Boolean(attempt));
      const response = await fetch(`${API}/v1/web/classroom/homework`, {headers:{Authorization:`Bearer ${token}`}});
      if (response.status === 401 && !attempt) continue;
      const data = await response.json();
      if (!response.ok) throw Error(data.error_description || 'Could not sync Google Classroom.');
      return data;
    }
  }
  window.CampusGoogle = {connected, connect, homework, disconnect:() => save(null)};
})();
