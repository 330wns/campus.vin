(() => {
  'use strict';

  const MAX_BYTES = 256000;
  const PENDING_KEY = 'campus.web.transfer.pending.v1';
  const USED_KEY = 'campus.web.transfer.used.v1';
  const DAY_KEYS = ['MA', 'MB', 'TA', 'TB', 'WA', 'WB', 'ThA', 'ThB', 'FA', 'FB'];
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder('utf-8', {fatal: true});
  const isDate = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  const isTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const isColor = value => value == null || /^#[\da-f]{6}$/i.test(value);
  const isHttpURL = value => {
    if (value == null || value === '') return true;
    try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
  };
  const bounded = (value, size) => typeof value === 'string' && value.length <= size;
  const fail = () => { throw Error('This Campus transfer is incomplete or invalid. Nothing was changed.'); };
  const validClass = block => {
    if (!block || !bounded(block.subject, 300) || !block.subject.trim() ||
        !bounded(block.teacher, 300) || !bounded(block.room, 200) ||
        !isTime(block.start) || !isTime(block.end) || block.start >= block.end ||
        !isColor(block.color)) fail();
  };
  function validate(snapshot) {
    if (!snapshot || snapshot.version !== 1 || !['ES', 'MS', 'HS'].includes(snapshot.division) ||
        !snapshot.schedules || typeof snapshot.schedules !== 'object' ||
        !Array.isArray(snapshot.homework) || snapshot.homework.length > 2000 ||
        !Array.isArray(snapshot.events) || snapshot.events.length > 1000 ||
        !snapshot.club || !snapshot.customDays || typeof snapshot.customDays !== 'object') fail();
    const keys = Object.keys(snapshot.schedules);
    if (keys.length > 10 || keys.some(key => !DAY_KEYS.includes(key))) fail();
    for (const blocks of Object.values(snapshot.schedules)) {
      if (!Array.isArray(blocks) || blocks.length > 50) fail();
      blocks.forEach(validClass);
    }
    if (snapshot.rotation != null && (!isDate(snapshot.rotation.date) ||
        !['A', 'B'].includes(snapshot.rotation.day) ||
        (snapshot.rotation.lastSyncedAt != null && Number.isNaN(Date.parse(snapshot.rotation.lastSyncedAt))))) fail();
    for (const item of snapshot.homework) {
      if (!item || !bounded(item.title, 500) || !item.title.trim() ||
          !bounded(item.subject, 300) || !bounded(item.note, 20000) ||
          typeof item.due !== 'string' || Number.isNaN(Date.parse(item.due)) ||
          typeof item.complete !== 'boolean' || !isColor(item.color) || !isHttpURL(item.url)) fail();
    }
    for (const item of snapshot.events) {
      if (!item || !bounded(item.title, 500) || !item.title.trim() ||
          !['break', 'half', 'info', 'late'].includes(item.type) ||
          !isDate(item.start) || (item.end != null && (!isDate(item.end) || item.end < item.start)) ||
          !isColor(item.color) || !bounded(item.note, 20000)) fail();
    }
    const club = snapshot.club;
    if (typeof club.enabled !== 'boolean' || !bounded(club.name, 300) ||
        !Array.isArray(club.days) || club.days.some(day => !Number.isInteger(day) || day < 0 || day > 4) ||
        !isTime(club.start) || !isTime(club.end) || club.start >= club.end) fail();
    const customDays = Object.entries(snapshot.customDays);
    if (customDays.length > 366) fail();
    for (const [date, day] of customDays) {
      if (!isDate(date) || !day || !bounded(day.title, 300) ||
          !Array.isArray(day.classes) || day.classes.length > 50) fail();
      day.classes.forEach(validClass);
    }
    return snapshot;
  }

  function encode(snapshot) {
    const bytes = textEncoder.encode(JSON.stringify(validate(snapshot)));
    if (bytes.length > MAX_BYTES) throw Error('Too much data for a one-click link. Remove old items before trying again.');
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 8192) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decode(payload) {
    if (typeof payload !== 'string' || payload.length > MAX_BYTES * 2 || !/^[A-Za-z0-9_-]+$/.test(payload)) fail();
    const binary = atob(payload.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - payload.length % 4) % 4));
    if (binary.length > MAX_BYTES) fail();
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return validate(JSON.parse(textDecoder.decode(bytes)));
  }

  function fromWebState(state) {
    const schedules = {};
    for (const key of DAY_KEYS) {
      schedules[key] = (state.schedules?.[key] || []).map(block => ({
        id: String(block.id || ''), subject: block.subject || '', teacher: block.teacher || '',
        room: block.room || '', start: block.start, end: block.end, color: block.color || null
      }));
    }
    const customDays = {};
    for (const [date, day] of Object.entries(state.customDays || {})) {
      customDays[date] = {title: day.title || 'Custom Day', classes: (day.classes || []).map(block => ({
        id: String(block.id || ''), subject: block.subject || '', teacher: block.teacher || '',
        room: block.room || '', start: block.start, end: block.end, color: block.color || null
      }))};
    }
    const club = state.club || {};
    return validate({
      version: 1,
      division: state.division,
      schedules,
      rotation: state.rotation ? {date: state.rotation.date, day: state.rotation.day,
        lastSyncedAt: state.rotation.lastSyncedAt || null} : null,
      homework: (state.homework || []).map(item => ({
        id: String(item.id || ''), title: item.title || '', subject: item.subject || '',
        due: item.due, complete: Boolean(item.complete), note: item.note || '',
        color: item.color || null, url: item.url || null,
        source: /google/i.test(item.source || '') ? 'google-classroom' : 'manual'
      })),
      events: (state.events || []).filter(item => !item.remote).map(item => ({
        id: String(item.id || ''), title: item.title || '', type: item.type,
        start: item.start, end: item.end || null, color: item.color || null, note: item.note || ''
      })),
      club: {enabled: Boolean(club.enabled), name: club.name || '', days: club.days || [],
        start: club.start || '15:30', end: club.end || '16:00'},
      customDays
    });
  }

  function toWebState(snapshot, existing) {
    validate(snapshot);
    const copyClass = block => ({id: block.id || crypto.randomUUID(), subject: block.subject,
      teacher: block.teacher, room: block.room, start: block.start, end: block.end,
      color: block.color || '#e0e0df'});
    const schedules = Object.fromEntries(Object.entries(snapshot.schedules).map(([key, blocks]) => [key, blocks.map(copyClass)]));
    const customDays = Object.fromEntries(Object.entries(snapshot.customDays).map(([date, day]) =>
      [date, {title: day.title, classes: day.classes.map(copyClass)}]));
    return {...existing,
      setupComplete: true, setupStep: 2, division: snapshot.division, schedules,
      googleLastSync: null,
      rotation: snapshot.rotation ? {...snapshot.rotation} : null,
      homework: snapshot.homework.map(item => ({
        id: item.id || crypto.randomUUID(), title: item.title, subject: item.subject,
        due: item.due, complete: item.complete, note: item.note, color: item.color || '#3c82c4',
        url: item.url || '', source: item.source === 'google-classroom'
          ? 'transferred-google-classroom' : 'manual'
      })),
      events: snapshot.events.map(item => ({id: item.id || crypto.randomUUID(),
        title: item.title, type: item.type, start: item.start, end: item.end || '',
        color: item.color || '#303234', note: item.note, remote: false})),
      club: {...snapshot.club}, customDays};
  }

  function hasTransferableData(snapshot) {
    return Boolean(snapshot.rotation || Object.values(snapshot.schedules).some(classes => classes.length) ||
      snapshot.homework.length || snapshot.events.length || snapshot.club.enabled ||
      Object.keys(snapshot.customDays).length);
  }

  let incoming = null;
  if (location.hash.startsWith('#campus-transfer=')) {
    const values = new URLSearchParams(location.hash.slice(1));
    const payload = values.get('campus-transfer');
    const nonce = values.get('nonce');
    history.replaceState(null, '', `${location.pathname}${location.search}#settings`);
    try {
      const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
      localStorage.removeItem(PENDING_KEY);
      if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(nonce || '')) fail();
      let used = [];
      try { used = JSON.parse(localStorage.getItem(USED_KEY) || '[]'); } catch { used = []; }
      if (Array.isArray(used) && used.includes(nonce)) throw Error('This Campus transfer has already been imported in this browser.');
      const activeRequest = pending && Date.now() >= pending.createdAt &&
        Date.now() - pending.createdAt <= 300000;
      if (activeRequest && pending.nonce !== nonce) {
        throw Error('This transfer does not match the current request in this browser. Start again.');
      }
      incoming = {snapshot: decode(payload), error: null, unrequested: !activeRequest, nonce};
    } catch (error) {
      incoming = {snapshot: null, error: error.message || 'Campus transfer failed.'};
    }
  }

  function takeIncoming() {
    const value = incoming;
    incoming = null;
    return value;
  }

  function markUsed(nonce) {
    let used = [];
    try { used = JSON.parse(localStorage.getItem(USED_KEY) || '[]'); } catch { used = []; }
    if (!Array.isArray(used)) used = [];
    localStorage.setItem(USED_KEY, JSON.stringify([...used.filter(value => value !== nonce), nonce].slice(-20)));
  }

  function requestAppExport() {
    const hosted = location.protocol === 'https:' &&
      ['campus.vin', 'www.campus.vin'].includes(location.hostname) &&
      ['/', '/index.html'].includes(location.pathname);
    const local = location.protocol === 'http:' &&
      ['127.0.0.1', 'localhost'].includes(location.hostname) &&
      ['/', '/index.html'].includes(location.pathname);
    if (!hosted && !local) throw Error('Open Campus Web on campus.vin, or use a local development server with a Debug Mac app.');
    const nonce = crypto.randomUUID();
    localStorage.setItem(PENDING_KEY, JSON.stringify({nonce, createdAt: Date.now()}));
    const callback = hosted ? `${location.origin}/` : `${location.origin}${location.pathname}`;
    location.href = `campus://export?callback=${encodeURIComponent(callback)}&nonce=${encodeURIComponent(nonce)}`;
  }

  function sendToApp(state) {
    const snapshot = fromWebState(state);
    if (!hasTransferableData(snapshot)) throw Error('There is no Campus data in this browser to send yet. Add a schedule, homework, event or club first.');
    const payload = encode(snapshot);
    location.href = `campus://import?data=${payload}`;
  }

  window.CampusTransfer = {encode, decode, validate, fromWebState, toWebState,
    takeIncoming, markUsed, requestAppExport, sendToApp};
})();
