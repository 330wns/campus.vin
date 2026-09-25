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
  const validNativeClass = block => {
    if (!block || !bounded(block.subject, 300) || !block.subject.trim() ||
        !bounded(block.teacher, 300) || !bounded(block.room, 200) ||
        ![block.startHour, block.endHour].every(n => Number.isInteger(n) && n >= 0 && n <= 23) ||
        ![block.startMinute, block.endMinute].every(n => Number.isInteger(n) && n >= 0 && n <= 59) ||
        block.startHour * 60 + block.startMinute >= block.endHour * 60 + block.endMinute ||
        !isColor(block.colorHex)) fail();
  };
  const validNativeTrash = item => {
    if (!item || !['classBlock', 'overrideClass', 'scheduleTemplate', 'assignment', 'calendarEvent'].includes(item.kind) ||
        !bounded(item.id, 40) || !bounded(item.title, 500) ||
        typeof item.deletedAt !== 'string' || Number.isNaN(Date.parse(item.deletedAt))) fail();
    if (item.kind === 'classBlock' || item.kind === 'overrideClass') {
      validNativeClass(item.classBlock);
      if (item.kind === 'overrideClass' && (!item.overrideDate || Number.isNaN(Date.parse(item.overrideDate)))) fail();
    } else if (item.kind === 'assignment') {
      const h = item.assignment;
      if (!h || !bounded(h.id, 40) || !bounded(h.title, 500) || !h.title.trim() ||
          !bounded(h.subject, 300) || !bounded(h.source, 100) ||
          !bounded(h.note || '', 20000) || typeof h.isComplete !== 'boolean' ||
          typeof h.dueDate !== 'string' || Number.isNaN(Date.parse(h.dueDate)) ||
          !isColor(h.colorHex) || !isHttpURL(h.url) ||
          (h.courseID != null && !bounded(h.courseID, 200)) ||
          (h.courseworkID != null && !bounded(h.courseworkID, 200))) fail();
    } else if (item.kind === 'calendarEvent') {
      const e = item.calendarEvent;
      if (!e || !bounded(e.id, 40) || !bounded(e.title, 500) || !e.title.trim() ||
          !bounded(e.notes, 20000) || typeof e.date !== 'string' || Number.isNaN(Date.parse(e.date)) ||
          (e.endDate != null && (typeof e.endDate !== 'string' || Number.isNaN(Date.parse(e.endDate)))) ||
          (e.scheduleEffect != null && !['break','half','info','late'].includes(e.scheduleEffect)) ||
          !isColor(e.colorHex)) fail();
    } else {
      const template = item.scheduleTemplate;
      if (!template || !bounded(template.id, 40) || !bounded(template.name, 300) ||
          !Array.isArray(template.classes) || template.classes.length > 50) fail();
      template.classes.forEach(validNativeClass);
    }
  };
  function validate(snapshot) {
    if (!snapshot || snapshot.version !== 1 || !['ES', 'MS', 'HS'].includes(snapshot.division) ||
        !snapshot.schedules || typeof snapshot.schedules !== 'object' ||
        !Array.isArray(snapshot.homework) || snapshot.homework.length > 2000 ||
        !Array.isArray(snapshot.events) || snapshot.events.length > 1000 ||
        !snapshot.club || !snapshot.customDays || typeof snapshot.customDays !== 'object') fail();
    if (snapshot.trash != null) {
      if (!Array.isArray(snapshot.trash) || snapshot.trash.length > 2000) fail();
      snapshot.trash.forEach(validNativeTrash);
    }
    if (snapshot.dismissedClassroomKeys != null && (!Array.isArray(snapshot.dismissedClassroomKeys) ||
        snapshot.dismissedClassroomKeys.length > 2000 ||
        snapshot.dismissedClassroomKeys.some(key => typeof key !== 'string' || key.length > 401 || !key.includes(':')))) fail();
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
    const pad = number => String(number).padStart(2, '0');
    const schoolDate = instant => {
      const fields = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Seoul',
        year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(new Date(instant))
        .filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
      return `${fields.year}-${fields.month}-${fields.day}`;
    };
    const nativeClass = block => ({id:block.id, subject:block.subject, teacher:block.teacher,
      room:block.room, start:`${pad(block.startHour)}:${pad(block.startMinute)}`,
      end:`${pad(block.endHour)}:${pad(block.endMinute)}`, color:block.colorHex || '#e0e0df'});
    const nativeHomework = item => ({id:item.id, title:item.title, subject:item.subject,
      due:item.dueDate, complete:item.isComplete, note:item.note || '',
      color:item.colorHex || '#3c82c4', url:item.url || '',
      source:item.source === 'Google Classroom' ? 'transferred-google-classroom' : 'manual',
      classroomKey:item.courseID && item.courseworkID ? `${item.courseID}:${item.courseworkID}` : null});
    const nativeEvent = item => ({id:item.id, title:item.title,
      type:item.scheduleEffect || (item.isNoSchool ? 'break' : 'info'),
      start:schoolDate(item.date), end:item.endDate ? schoolDate(item.endDate) : '',
      color:item.colorHex || '#303234', note:item.notes || '', remote:false});
    const weekdayPrefixes = {2:'M', 3:'T', 4:'W', 5:'Th', 6:'F'};
    const trash = (snapshot.trash || []).map(entry => {
      const common = {id:entry.id || crypto.randomUUID(), title:entry.title,
        deletedAt:entry.deletedAt};
      if (entry.kind === 'assignment' && entry.assignment) {
        return {...common, type:'homework', item:nativeHomework(entry.assignment)};
      }
      if (entry.kind === 'calendarEvent' && entry.calendarEvent) {
        return {...common, type:'event', item:nativeEvent(entry.calendarEvent)};
      }
      if (entry.kind === 'scheduleTemplate' && entry.scheduleTemplate) {
        return {...common, type:'template', item:{id:entry.scheduleTemplate.id,
          name:entry.scheduleTemplate.name,
          classes:entry.scheduleTemplate.classes.map(nativeClass)}};
      }
      if (entry.classBlock) {
        const day = entry.rotationDay === 'B Day' ? 'B' : 'A';
        const key = entry.kind === 'overrideClass' && entry.overrideDate
          ? `custom:${schoolDate(entry.overrideDate)}`
          : entry.scheduleWeekday == null ? `all:${day}`
            : `${weekdayPrefixes[entry.scheduleWeekday]}${day}`;
        return {...common, type:'class', item:{key, block:nativeClass(entry.classBlock)}};
      }
      fail();
    });
    return {...existing,
      setupComplete: true, setupStep: 2, division: snapshot.division, schedules,
      googleLastSync: null,
      rotation: snapshot.rotation ? {...snapshot.rotation} : null,
      homework: snapshot.homework.map(item => ({
        id: item.id || crypto.randomUUID(), title: item.title, subject: item.subject,
        due: item.due, complete: item.complete, note: item.note, color: item.color || '#3c82c4',
        url: item.url || '', source: item.source === 'google-classroom'
          ? 'transferred-google-classroom' : 'manual',
        classroomKey:item.courseID && item.courseworkID ? `${item.courseID}:${item.courseworkID}` : null
      })),
      events: snapshot.events.map(item => ({id: item.id || crypto.randomUUID(),
        title: item.title, type: item.type, start: item.start, end: item.end || '',
        color: item.color || '#303234', note: item.note, remote: false})),
      club: {...snapshot.club}, customDays, trash,
      dismissedClassroomKeys:snapshot.dismissedClassroomKeys || [],
      savedTemplates:[],
      googleReconnectRequired:true};
  }

  function hasTransferableData(snapshot) {
    return Boolean(snapshot.rotation || Object.values(snapshot.schedules).some(classes => classes.length) ||
      snapshot.homework.length || snapshot.events.length || snapshot.club.enabled ||
      snapshot.trash?.length ||
      Object.keys(snapshot.customDays).length);
  }

  let incoming = null;
  let remotePending = null;
  if (location.hash.startsWith('#campus-transfer-id=')) {
    const values = new URLSearchParams(location.hash.slice(1));
    remotePending = {id:values.get('campus-transfer-id'), key:values.get('key'),
      nonce:values.get('nonce')};
    history.replaceState(null, '', `${location.pathname}${location.search}#settings`);
  }
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

  async function receivePending() {
    const transfer = remotePending;
    remotePending = null;
    if (!transfer) return null;
    try {
      if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(transfer.id || '') ||
          !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(transfer.nonce || '') ||
          !/^[A-Za-z0-9_-]{43}$/.test(transfer.key || '')) fail();
      const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
      localStorage.removeItem(PENDING_KEY);
      const activeRequest = pending && Date.now() >= pending.createdAt &&
        Date.now() - pending.createdAt <= 300000;
      if (activeRequest && pending.nonce !== transfer.nonce) {
        throw Error('This transfer does not match the current request in this browser. Start again.');
      }
      let used = [];
      try { used = JSON.parse(localStorage.getItem(USED_KEY) || '[]'); } catch { used = []; }
      if (Array.isArray(used) && used.includes(transfer.nonce)) {
        throw Error('This Campus transfer has already been imported in this browser.');
      }
      let payload;
      for (let attempt = 0; attempt < 25; attempt++) {
        const response = await fetch('/api/transfer', {method:'POST', cache:'no-store',
          credentials:'omit', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({action:'claim', id:transfer.id})});
        if (response.status === 404 && attempt < 24) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }
        if (!response.ok) {
          throw Error(response.status === 404 ? 'Transfer expired or could not be found. Try again from the Mac app.' :
            'Campus Web could not receive the Mac transfer. Check the site setup and try again.');
        }
        payload = (await response.json()).payload;
        break;
      }
      const bytes = value => {
        if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) fail();
        const text = atob(value.replace(/-/g, '+').replace(/_/g, '/') +
          '='.repeat((4 - value.length % 4) % 4));
        return Uint8Array.from(text, char => char.charCodeAt(0));
      };
      const key = bytes(transfer.key);
      const sealed = bytes(payload);
      if (key.length !== 32 || sealed.length < 29 || sealed.length > 2_000_028) fail();
      const cryptoKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']);
      const plaintext = await crypto.subtle.decrypt({name:'AES-GCM', iv:sealed.slice(0, 12)},
        cryptoKey, sealed.slice(12));
      return {snapshot:validate(JSON.parse(textDecoder.decode(plaintext))), error:null,
        unrequested:!activeRequest, nonce:transfer.nonce};
    } catch (error) {
      return {snapshot:null, error:error.message || 'Campus transfer failed.'};
    }
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
    takeIncoming, receivePending, hasPending:() => Boolean(remotePending),
    markUsed, requestAppExport, sendToApp};
})();
