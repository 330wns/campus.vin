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

  // Transfers travel inside the link itself: JSON, raw-deflated, base64url encoded. Links are
  // kept to MAX_LINK_CHARS so browsers and macOS pass them to the other app intact.
  const MAX_LINK_CHARS = 24000;
  const TRUNCATED = 'The transfer link was cut off before it reached Campus. Nothing was changed. Try sending again.';
  const toBase64Url = bytes => {
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 8192) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const fromBase64Url = value => {
    if (typeof value !== 'string' || !value || value.length > MAX_LINK_CHARS * 2 || !/^[A-Za-z0-9_-]+$/.test(value)) throw Error(TRUNCATED);
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  };
  async function deflate(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  async function inflate(bytes) {
    const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
      let result;
      try { result = await reader.read(); } catch { throw Error(TRUNCATED); }
      if (result.done) break;
      size += result.value.length;
      if (size > MAX_BYTES) { reader.cancel(); throw Error('This Campus transfer is too large. Nothing was changed.'); }
      chunks.push(result.value);
    }
    const output = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
    return output;
  }
  // Each day travels as separate course and time lists; a list identical to an earlier day's is
  // sent as that day's key, e.g. days.TA = {c: 'MA', t: [['10:00', '10:40'], …]}. Class IDs are
  // not sent; the receiver makes new ones.
  function compactDays(snapshot) {
    const schedules = {...snapshot.schedules}, days = {}, seenCourses = [], seenTimes = [];
    for (const key of DAY_KEYS) {
      const classes = snapshot.schedules[key];
      if (!classes?.length) continue;
      const courses = classes.map(block => [block.subject, block.teacher, block.room, block.color || null]);
      const times = classes.map(block => [block.start, block.end]);
      const courseSignature = JSON.stringify(courses), timeSignature = JSON.stringify(times);
      const courseSource = seenCourses.find(([, signature]) => signature === courseSignature)?.[0];
      const timeSource = seenTimes.find(([, signature]) => signature === timeSignature)?.[0];
      if (!courseSource) seenCourses.push([key, courseSignature]);
      if (!timeSource) seenTimes.push([key, timeSignature]);
      days[key] = {c: courseSource || courses, t: timeSource || times};
      delete schedules[key];
    }
    return Object.keys(days).length ? {...snapshot, schedules, days} : snapshot;
  }
  function expandDays(snapshot) {
    if (snapshot?.days == null) return snapshot;
    const {days, ...rest} = snapshot;
    if (typeof days !== 'object' || !rest.schedules || typeof rest.schedules !== 'object') fail();
    const resolve = (key, part) => {
      const value = days[key]?.[part];
      if (Array.isArray(value)) return value;
      const origin = typeof value === 'string' ? days[value]?.[part] : null;
      if (!Array.isArray(origin)) fail();
      return origin;
    };
    const schedules = {...rest.schedules};
    for (const key of Object.keys(days)) {
      const courses = resolve(key, 'c'), times = resolve(key, 't');
      if (!DAY_KEYS.includes(key) || courses.length !== times.length || courses.length > 50) fail();
      schedules[key] = courses.map((course, index) => {
        const time = times[index];
        if (!Array.isArray(course) || course.length !== 4 || !Array.isArray(time) || time.length !== 2) fail();
        const [subject, teacher, room, color] = course;
        return {id: crypto.randomUUID(), subject, teacher, room, start: time[0], end: time[1], color};
      });
    }
    return {...rest, schedules};
  }
  async function pack(snapshot) {
    const bytes = textEncoder.encode(JSON.stringify(compactDays(snapshot)));
    return bytes.length > MAX_BYTES ? null : toBase64Url(await deflate(bytes));
  }
  const schoolDay = (instant = new Date()) => {
    const fields = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Seoul',
      year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(instant)
      .filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
    return `${fields.year}-${fields.month}-${fields.day}`;
  };

  // Items in the order they are left out when a transfer is too large: least useful first,
  // so whatever still fits is the most recent and relevant data. Schedules, rotation and club
  // always travel.
  function dropOrder(snapshot, now = new Date()) {
    const today = schoolDay(now), nowTime = now.getTime();
    const due = snapshot.homework.map(item => Date.parse(item.due) || 0);
    const eventEnd = snapshot.events.map(item => item.end || item.start);
    const homework = snapshot.homework.map((item, index) => index);
    const events = snapshot.events.map((item, index) => index);
    const days = Object.keys(snapshot.customDays);
    return [
      ...homework.filter(i => snapshot.homework[i].complete).sort((a, b) => due[a] - due[b]).map(i => ['homework', i]),
      ...events.filter(i => eventEnd[i] < today).sort((a, b) => eventEnd[a].localeCompare(eventEnd[b])).map(i => ['events', i]),
      ...days.filter(day => day < today).sort().map(day => ['customDays', day]),
      ...homework.filter(i => !snapshot.homework[i].complete && due[i] < nowTime).sort((a, b) => due[a] - due[b]).map(i => ['homework', i]),
      ...homework.filter(i => !snapshot.homework[i].complete && due[i] >= nowTime).sort((a, b) => due[b] - due[a]).map(i => ['homework', i]),
      ...events.filter(i => eventEnd[i] >= today).sort((a, b) => snapshot.events[b].start.localeCompare(snapshot.events[a].start)).map(i => ['events', i]),
      ...days.filter(day => day >= today).sort().reverse().map(day => ['customDays', day])
    ];
  }
  function without(snapshot, drops) {
    const gone = {homework: new Set(), events: new Set(), customDays: new Set()};
    for (const [group, key] of drops) gone[group].add(key);
    return {...snapshot,
      homework: snapshot.homework.filter((item, index) => !gone.homework.has(index)),
      events: snapshot.events.filter((item, index) => !gone.events.has(index)),
      customDays: Object.fromEntries(Object.entries(snapshot.customDays).filter(([day]) => !gone.customDays.has(day)))};
  }

  // Returns {payload, omitted}; leaves out the oldest items when everything won't fit a link.
  async function encode(snapshot, now = new Date()) {
    validate(snapshot);
    const full = await pack(snapshot);
    if (full && full.length <= MAX_LINK_CHARS) return {payload: full, omitted: 0};
    const drops = dropOrder(snapshot, now);
    let low = 1, high = drops.length, best = null;
    while (low <= high) {
      const mid = (low + high) >> 1;
      const packed = await pack({...without(snapshot, drops.slice(0, mid)), omitted: mid});
      if (packed && packed.length <= MAX_LINK_CHARS) { best = {payload: packed, omitted: mid}; high = mid - 1; }
      else low = mid + 1;
    }
    if (!best) throw Error('Too much data for a transfer link, even after leaving out older items.');
    return best;
  }

  async function decode(payload) {
    const json = await inflate(fromBase64Url(payload));
    let snapshot;
    try { snapshot = JSON.parse(textDecoder.decode(json)); } catch { throw Error(TRUNCATED); }
    return validate(expandDays(snapshot));
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
        source: /google|classroom/i.test(item.source || '') ? 'google-classroom' : 'manual',
        courseID: item.courseID || item.courseId || null,
        courseworkID: item.courseworkID || item.courseWorkId || item.courseworkId || null
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
      source:/google|classroom/i.test(item.source || '') ? 'transferred-google-classroom' : 'manual',
      courseID:item.courseID || null, courseworkID:item.courseworkID || null,
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
        courseID:item.courseID || null, courseworkID:item.courseworkID || null,
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

  let incomingLink = null;
  if (location.hash.startsWith('#campus-transfer-z=')) {
    const values = new URLSearchParams(location.hash.slice(1));
    incomingLink = {payload: values.get('campus-transfer-z'), nonce: values.get('nonce')};
    history.replaceState(null, '', `${location.pathname}${location.search}#settings`);
  } else if (location.hash.startsWith('#campus-transfer-id=') || location.hash.startsWith('#campus-transfer=')) {
    // Older Mac apps uploaded transfers to a server that no longer exists.
    incomingLink = {legacy: true};
    history.replaceState(null, '', `${location.pathname}${location.search}#settings`);
  }

  async function receiveIncoming() {
    const link = incomingLink;
    incomingLink = null;
    if (!link) return null;
    if (link.legacy) return {snapshot: null, error: 'This transfer came from an older version of Campus for Mac. Update the Mac app and send it again.'};
    try {
      const nonce = link.nonce;
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
      return {snapshot: await decode(link.payload), error: null, unrequested: !activeRequest, nonce};
    } catch (error) {
      return {snapshot: null, error: error.message || 'Campus transfer failed.'};
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

  async function sendToApp(state) {
    const snapshot = fromWebState(state);
    if (!hasTransferableData(snapshot)) throw Error('There is no Campus data in this browser to send yet. Add a schedule, homework, event or club first.');
    const {payload} = await encode(snapshot);
    location.href = `campus://import?z=${payload}`;
  }

  window.CampusTransfer = {encode, decode, validate, fromWebState, toWebState,
    receiveIncoming, markUsed, requestAppExport, sendToApp};
})();
