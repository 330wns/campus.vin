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
  // Calls Google Classroom directly and loads every course in parallel, like the Mac app.
  const CLASSROOM = 'https://classroom.googleapis.com/v1/courses';
  const SUBMITTED = new Set(['TURNED_IN', 'RETURNED', 'STUDENT_EDITED_AFTER_TURN_IN']);
  class ExpiredToken extends Error {}
  async function pages(url, token, field, params) {
    const items = [];
    let pageToken = '';
    for (let page = 0; page < 10; page++) {
      const query = new URLSearchParams({...params, pageSize:'100'});
      if (pageToken) query.set('pageToken', pageToken);
      const response = await fetch(`${url}?${query}`, {headers:{Authorization:`Bearer ${token}`}, cache:'no-store'});
      if (response.status === 401) throw new ExpiredToken();
      if (!response.ok) throw Error('Could not load Google Classroom homework.');
      const body = await response.json();
      items.push(...(body[field] || []));
      pageToken = body.nextPageToken || '';
      if (!pageToken) break;
    }
    return items;
  }
  async function courseHomework(course, token) {
    const id = String(course.id || '');
    if (!/^\d+$/.test(id)) return [];
    const base = `${CLASSROOM}/${id}/courseWork`;
    const [coursework, submissions] = await Promise.all([
      pages(base, token, 'courseWork', {courseWorkStates:'PUBLISHED'}),
      pages(`${base}/-/studentSubmissions`, token, 'studentSubmissions', {userId:'me'})
    ]);
    const submitted = new Set(submissions.filter(item => SUBMITTED.has(item.state)).map(item => String(item.courseWorkId)));
    return coursework.flatMap(item => {
      const workId = String(item.id || ''), date = item.dueDate, time = item.dueTime || {};
      if (!workId || submitted.has(workId) || !date?.year || !date?.month || !date?.day) return [];
      const due = new Date(Date.UTC(date.year, date.month - 1, date.day, time.hours ?? 0, time.minutes ?? 0, time.seconds ?? 0));
      if (Number.isNaN(due.getTime())) return [];
      return [{id:`google:${id}:${workId}`, title:String(item.title || ''), subject:String(course.name || ''),
        due:due.toISOString(), url:String(item.alternateLink || ''), source:'google-classroom'}];
    });
  }
  async function homework() {
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await accessToken(Boolean(attempt));
      try {
        const courses = await pages(CLASSROOM, token, 'courses', {studentId:'me', courseStates:'ACTIVE'});
        const lists = await Promise.all(courses.map(course => courseHomework(course, token)));
        return {homework:lists.flat(), syncedAt:new Date().toISOString()};
      } catch (error) {
        if (error instanceof ExpiredToken && !attempt) continue;
        throw error instanceof ExpiredToken ? Error('Google sign-in expired. Reconnect Google Classroom.') : error;
      }
    }
  }
  window.CampusGoogle = {connected, connect, homework, disconnect:() => save(null)};
})();
