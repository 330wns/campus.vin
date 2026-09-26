(() => {
  'use strict';
  const KEY = 'campus.web.v1', TZ = 'Asia/Seoul', TRASH_DAYS = 30;
  const WEEK = 'https://kisj.powerschool.com/guardian/myschedule.html';
  const MATRIX = 'https://kisj.powerschool.com/guardian/myschedulematrix.html';
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const KEYS = PowerSchoolImport.dayKeys;
  const PRESETS = ['#D94C4C', '#E78335', '#D4A72C', '#4E9A65', '#3C82C4', '#735DB7', '#B25291'];
  const CATEGORIES = ['School', 'Academic', 'Activity', 'Holiday'];
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  const p2 = n => String(n).padStart(2, '0');

  // Line icons standing in for the SF Symbols used by the Mac app.
  const icons = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    checklist: '<path d="M10 6h11M10 12h11M10 18h11M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18"/>',
    fork: '<path d="M4 2v8a3 3 0 0 0 6 0V2M7 2v20M18 2c-4 4-4 11 0 12v8"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3m-9 0 1 14h10l1-14M10 11v6m4-6v6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8.5h.01"/>',
    gear: '<path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    sync: '<path d="M21 12a9 9 0 0 0-15-6.7L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/><path d="M16 16h5v5"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/>',
    warn: '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4m0 4h.01"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    checkCircleFill: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="m8 12 3 3 5-6" style="stroke:var(--campus-surface)"/>',
    checkmark: '<path d="m5 12 5 5L20 7"/>',
    photo: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    chevronRight: '<path d="m9 6 6 6-6 6"/>',
    chevronLeft: '<path d="m15 6-6 6 6 6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    scope: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
    tray: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5 5h14l2 8v6H3v-6z"/><path d="M7 9h10"/>',
    calClock: '<path d="M21 10V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"/><path d="M8 3v4m8-4v4M3 10h18"/><circle cx="17" cy="17" r="4"/><path d="M17 15.5V17l1 1"/>',
    calPlus: '<path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7"/><path d="M8 3v4m8-4v4M3 10h18M18 15v6m-3-3h6"/>',
    calMinus: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18M9 15.5h6"/>',
    calAlert: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18M12 13v3m0 2.5h.01"/>',
    books: '<path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="m16 5 3.5-1 3 15.5-3.5 1z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 0 0 0 20c1 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-1 .8-1.7 1.7-1.7H16a6 6 0 0 0 6-6C22 6 17.5 2 12 2z"/>',
    note: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    notePlus: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5"/><path d="M14 3v6h6v3"/><path d="M8 13h4M18 15v6m-3-3h6"/>',
    arrowUpRight: '<path d="M7 17 17 7M8 7h9v9"/>',
    arrowRight: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    xmark: '<path d="M18 6 6 18M6 6l12 12"/>',
    xFill: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="m9 9 6 6m0-6-6 6" style="stroke:var(--campus-surface)"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6z"/><rect x="9" y="11" width="6" height="5" rx="1"/><path d="M10 11V9.5a2 2 0 0 1 4 0V11"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    building: '<path d="M3 21h18M5 21V10m4 11V10m6 11V10m4 11V10M2 10h20L12 3z"/>',
    grad: '<path d="M22 9 12 4 2 9l10 5 10-5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6"/>',
    halfCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/>',
    transfer: '<path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/>',
    drive: '<rect x="2" y="13" width="20" height="8" rx="2"/><path d="M5.5 13 8 4h8l2.5 9M6 17h.01M10 17h.01"/>',
    pencil: '<path d="M12 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-7"/><path d="M18.4 2.6a2 2 0 0 1 3 3L12 15l-4 1 1-4z"/>',
    stack: '<rect x="3" y="8" width="13" height="13" rx="2"/><path d="M8 4h11a2 2 0 0 1 2 2v11"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M5 21h14"/>',
    upload: '<path d="M12 15V3M7 8l5-5 5 5M5 21h14"/>',
    dashed: '<circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/>',
    personPlus: '<circle cx="10" cy="8" r="4"/><path d="M2 21a8 8 0 0 1 13-6M19 14v6m-3-3h6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>'
  };
  const icon = (name, cls = '') => `<svg class="icon ${cls}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.info}</svg>`;

  const defaults = () => ({version: 1, setupComplete: false, setupStep: 0, division: 'MS', appearance: 'light', schedules: {}, rotation: null, homework: [], events: [], remoteEvents: [], remoteUpdated: null, eventOverrides: {}, club: {enabled: false, name: 'Club', days: [1, 3], start: '15:30', end: '16:00'}, customDays: {}, cafeteria: {}, trash: [], savedTemplates: [], dismissedClassroomKeys: [], googleReconnectRequired: false});
  let state, unreadableData = false;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    state = {...defaults(), ...(saved && typeof saved === 'object' ? saved : {})};
  } catch {
    // Keep the unreadable original instead of letting the next save overwrite it.
    try { localStorage.setItem(`${KEY}.unreadable`, localStorage.getItem(KEY)); } catch {}
    state = defaults();
    unreadableData = true;
  }
  if (!Array.isArray(state.trash)) state.trash = [];
  state.trash = state.trash.filter(t => Date.now() - new Date(t?.deletedAt).getTime() < TRASH_DAYS * 86400000);
  // Saved data means Campus was set up; never send someone with a schedule or homework back to Welcome.
  const hasSavedData = s => Boolean(s.rotation || Object.values(s.schedules || {}).some(list => list?.length) ||
    s.homework?.length || s.events?.length || Object.keys(s.customDays || {}).length);
  if (!state.setupComplete && hasSavedData(state)) state.setupComplete = true;

  const parts = (date = new Date()) => Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'}).formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  function dateKey(date = new Date()) { const p = parts(date); return `${p.year}-${p.month}-${p.day}`; }
  const dateObj = iso => new Date(`${iso}T12:00:00Z`);
  const monthDay = iso => new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', timeZone: 'UTC'}).format(dateObj(iso));
  const fullDate = (date = new Date()) => new Intl.DateTimeFormat('en-US', {timeZone: TZ, dateStyle: 'full'}).format(date);
  const shortDateTime = instant => { const d = new Date(instant); return `${new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', year: 'numeric', timeZone: TZ}).format(d)} at ${new Intl.DateTimeFormat('en-US', {hour: 'numeric', minute: '2-digit', timeZone: TZ}).format(d)}`; };
  const dayIndex = iso => PowerSchoolImport.weekdayIndex(iso);
  const plusDays = (iso, n) => PowerSchoolImport.addDays(iso, n);
  const minutes = t => Number(t?.slice(0, 2)) * 60 + Number(t?.slice(3, 5));
  const hex = s => /^#[\da-f]{6}$/i.test(s || '');
  const validDate = text => { const m = String(text || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if (!m) return null; const iso = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`; const date = dateObj(iso); return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : null; };
  const todayIndex = () => { const i = dayIndex(dateKey()); return i < 5 ? i : 0; };

  // View state, mirroring the @State values of the SwiftUI views.
  let page = (location.hash || '#today').slice(1);
  const pages = [['today', 'Today', 'sun'], ['schedule', 'Schedule', 'clock'], ['homework', 'Homework', 'checklist'], ['calendar', 'Calendar', 'calendar'], ['cafeteria', 'Cafeteria', 'fork'], ['trash', 'Trash', 'trash'], ['about', 'About', 'info']];
  const openSettingsOnLoad = page === 'settings';
  if (!pages.some(p => p[0] === page)) page = 'today';
  let scheduleSelection = 'A', weekday = todayIndex(), enteringManually = false, templateName = '';
  let overrideDate = dateKey(), customDraft = [], customTitle = 'Custom Day', customDirty = false;
  let showingCompleted = false, selecting = false, selection = new Set(), lastCompletedId = null, bulkColor = null;
  let monthView = dateKey().slice(0, 7), trashFilter = null;
  let draft = {week: null, matrix: null, error: ''}, fallbackWeekday = 0, fallbackDay = 'A';
  let cafeteriaError = '', cafeteriaLoading = false, calendarLoading = false, calendarError = '';
  let classroomStatus = '', classroomError = '', syncingClassroom = false;
  let hwDraft = null, eventDraft = null;
  let pendingTransfer = null, pendingTransferNonce = null;
  let layers = [];

  let toastTimer;
  function toast(message) { $('#toast-root').innerHTML = `<div class="toast">${esc(message)}</div>`; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast-root').innerHTML = '', 4200); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { toast('Browser storage is full. This change could not be saved.'); return false; } }

  // Schedule logic.
  const allEvents = () => [...state.remoteEvents.map(e => ({...e, ...(state.eventOverrides[e.id] || {})})), ...state.events];
  const covers = (e, iso) => e.start <= iso && (e.end || e.start) >= iso;
  const effect = (iso, type) => allEvents().some(e => e.type === type && covers(e, iso));
  function rotationAt(iso) { if (!state.rotation || dayIndex(iso) > 4) return null; let day = state.rotation.date, n = 0, dir = iso >= day ? 1 : -1, guard = 0; while (day !== iso && guard++ < 1400) { day = plusDays(day, dir); if (dayIndex(day) < 5) n++; } if (guard >= 1400) return null; return n % 2 ? (state.rotation.day === 'A' ? 'B' : 'A') : state.rotation.day; }
  function scheduleKey(iso) { const day = rotationAt(iso), index = dayIndex(iso); return day && index < 5 ? KEYS[index * 2 + (day === 'B' ? 1 : 0)] : null; }
  function lastFriday(iso) { return dayIndex(iso) === 4 && plusDays(iso, 7).slice(0, 7) !== iso.slice(0, 7); }
  const dayKind = iso => dayIndex(iso) !== 4 ? null : lastFriday(iso) ? 'Last Friday' : 'Friday';
  const lateTimes = [['10:00', '10:40'], ['10:45', '11:25'], ['11:30', '12:10'], ['12:10', '12:45'], ['12:45', '13:25'], ['13:30', '14:10'], ['14:15', '14:55'], ['15:00', '15:40']];
  const byStart = list => [...list].sort((a, b) => minutes(a.start) - minutes(b.start) || String(a.subject).localeCompare(String(b.subject)));
  function classesOn(iso, {ignoreCustom = false} = {}) {
    if (dayIndex(iso) > 4 || effect(iso, 'break')) return [];
    const custom = ignoreCustom ? null : state.customDays[iso];
    let list = byStart((custom?.classes || state.schedules[scheduleKey(iso)] || []).map(c => ({...c})));
    if (!custom && (effect(iso, 'late') || lastFriday(iso)) && list.length) {
      const lunch = list.find(c => /lunch/i.test(c.subject));
      const queue = list.filter(c => !/lunch/i.test(c.subject));
      list = lateTimes.flatMap(([start, end], i) => {
        const block = i === 3 ? lunch || {id: 'lunch', subject: 'Lunch', teacher: '', room: ''} : queue.shift();
        return block ? [{...block, start, end}] : [];
      });
    }
    if (!ignoreCustom && state.club.enabled && state.club.days.includes(dayIndex(iso))) list.push({id: 'club', subject: state.club.name || 'Club', teacher: '', room: '', start: state.club.start, end: state.club.end});
    list = byStart(list);
    if (effect(iso, 'half')) { const lunch = list.find(c => /lunch/i.test(c.subject)); return lunch ? list.filter(c => minutes(c.end) <= minutes(lunch.end)) : []; }
    return list;
  }
  const nowMinutes = () => { const p = parts(); return Number(p.hour) * 60 + Number(p.minute) + Number(p.second) / 60; };
  const currentClass = () => { const now = nowMinutes(); return classesOn(dateKey()).find(c => minutes(c.start) <= now && now < minutes(c.end)); };
  const nextClass = () => { const now = nowMinutes(); return classesOn(dateKey()).find(c => minutes(c.start) > now); };
  const needsScheduleSetup = () => !state.rotation?.lastSyncedAt && Object.values(state.schedules).every(list => !list?.length) && !Object.keys(state.customDays).length;
  const typeLabel = t => ({break: 'No school', half: 'Half day', info: 'Information', late: 'Late start'})[t] || 'Information';
  const eventCategory = e => e.remote ? typeLabel(e.type) : (e.category || typeLabel(e.type));
  const eventDateText = e => e.end && e.end !== e.start ? `${monthDay(e.start)} - ${monthDay(e.end)}` : monthDay(e.start);
  const sourceLabel = h => /google|classroom/i.test(h.source || '') ? 'Google Classroom' : 'Manual';
  const detailText = c => [c.room, c.teacher].filter(Boolean).join(' · ') || 'No room or teacher set';
  const dueSoon = () => state.homework.filter(h => !h.complete && new Date(h.due).getTime() >= Date.now() && new Date(h.due).getTime() <= Date.now() + 86400000).sort((a, b) => a.due.localeCompare(b.due));
  function countdownText(target) { const s = Math.max(0, Math.floor((target - nowMinutes()) * 60)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60; return h > 0 ? `${h}h ${m}m ${sec}s` : m > 0 ? `${m}m ${sec}s` : `${sec}s`; }

  function badgeInfo(h, now = Date.now()) {
    if (h.complete) return ['DONE', 'done'];
    const ms = new Date(h.due).getTime() - now;
    if (ms <= 0) return ['OVERDUE', 'overdue'];
    const t = Math.floor(ms / 1000);
    if (ms <= 48 * 3600000) return [`${p2(Math.floor(t / 3600))}:${p2(Math.floor(t % 3600 / 60))}:${p2(t % 60)}`, ms <= 3600000 ? 'red' : ms <= 86400000 ? 'orange' : 'yellow'];
    return [`${p2(Math.floor(t / 86400))}d ${p2(Math.floor(t % 86400 / 3600))}:${p2(Math.floor(t % 3600 / 60))}`, 'plain'];
  }
  const badge = h => { const [text, tone] = badgeInfo(h); return `<span class="deadline ${tone}" data-badge="${esc(h.id)}">${text}</span>`; };

  // Shared components (Theme.swift / Components.swift).
  const micro = t => `<span class="micro">${esc(t)}</span>`;
  const pill = (t, filled = false) => `<span class="pill ${filled ? 'filled' : ''}">${esc(t)}</span>`;
  const card = (title, symbol, content, cls = '', trailing = '') => `<section class="card ${cls}"><div class="card-head">${icon(symbol)}${micro(title)}${trailing}</div>${content}</section>`;
  const emptyState = (title, message, symbol) => `<div class="empty-state">${icon(symbol)}<strong>${esc(title)}</strong><p>${esc(message)}</p></div>`;
  const header = (title, subtitle, trailing = '') => `<header class="section-header"><div class="section-title"><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>${trailing}</header>`;
  const btn = (label, {action, kind = 'outline', sym, attrs = '', disabled = false, title} = {}) => `<button type="button" class="btn ${kind}" ${action ? `data-action="${action}"` : ''} ${title ? `title="${esc(title)}" aria-label="${esc(title)}"` : ''} ${attrs} ${disabled ? 'disabled' : ''}>${sym ? icon(sym) : ''}${label ? `<span>${esc(label)}</span>` : ''}</button>`;
  const iconButton = (title, sym, action, attrs = '') => `<button type="button" class="icon-button" data-action="${action}" title="${esc(title)}" aria-label="${esc(title)}" ${attrs}>${icon(sym)}</button>`;
  const segmented = (items, active, action, attrs = '') => `<div class="segmented" role="tablist" ${attrs}>${items.map(([value, label]) => `<button type="button" role="tab" aria-selected="${String(value) === String(active)}" class="${String(value) === String(active) ? 'active' : ''}" data-action="${action}" data-value="${esc(value)}">${esc(label)}</button>`).join('')}</div>`;
  const notice = (text, symbol = 'alert') => `<div class="inline-notice">${icon(symbol)}<span>${esc(text)}</span></div>`;
  const spinner = '<span class="spinner" aria-hidden="true"></span>';
  const activity = (title, active, symbol) => `${active ? spinner : symbol ? icon(symbol) : ''}${title ? `<span>${esc(title)}</span>` : ''}`;
  const progressBar = value => `<div class="thin-progress"><span style="width:${Math.max(0, Math.min(100, value * 100))}%"></span></div>`;
  function colorPicker(target, selection, label = 'Color') {
    return `<div class="color-picker"><span class="color-swatch" style="${hex(selection) ? `background:${selection}` : ''}"></span><span class="color-label"><strong>${esc(label)}</strong><small>${esc(hex(selection) ? selection.toUpperCase() : 'Default')}</small></span>${PRESETS.map(h => `<button type="button" class="color-preset ${String(selection).toUpperCase() === h ? 'selected' : ''}" style="--preset:${h}" data-action="pick-color" data-target="${esc(target)}" data-hex="${h}" title="Use this color" aria-label="Use ${h}"></button>`).join('')}<label class="color-custom" title="Choose a custom color"><input type="color" data-color-target="${esc(target)}" value="${hex(selection) ? selection : '#1a1a1c'}" aria-label="Custom color"></label>${hex(selection) ? `<button type="button" class="color-clear" data-action="pick-color" data-target="${esc(target)}" data-hex="" title="Use the default color" aria-label="Clear color">${icon('xFill')}</button>` : ''}</div>`;
  }
  function timeEditor(target, value, disabled = false) {
    const [h, m] = String(value || '00:00').split(':');
    const stepper = (part, v) => `<div class="stepper"><span>${esc(v)}</span><span class="stepper-arrows"><button type="button" data-action="time-step" data-target="${esc(target)}" data-part="${part}" data-delta="1" aria-label="Increase" ${disabled ? 'disabled' : ''}><svg viewBox="0 0 10 6"><path d="M1 5 5 1l4 4"/></svg></button><button type="button" data-action="time-step" data-target="${esc(target)}" data-part="${part}" data-delta="-1" aria-label="Decrease" ${disabled ? 'disabled' : ''}><svg viewBox="0 0 10 6"><path d="m1 1 4 4 4-4"/></svg></button></span></div>`;
    return `<div class="time-editor ${disabled ? 'disabled' : ''}">${stepper('h', h)}<span class="colon">:</span>${stepper('m', m)}</div>`;
  }
  const menu = (label, symbol, content, cls = '') => `<details class="menu ${cls}"><summary class="menu-button">${icon(symbol)}<span>${esc(label)}</span>${icon('chevronDown', 'menu-chevron')}</summary><div class="menu-panel">${content}</div></details>`;

  // Layers: sheets and alerts drawn above the window, like SwiftUI .sheet / .alert.
  function captureFocus() {
    const el = document.activeElement;
    const key = el?.dataset?.fk || el?.id;
    if (!key || !el.closest('#view,#modal-root')) return null;
    let start = null, end = null;
    try { start = el.selectionStart; end = el.selectionEnd; } catch {}
    return {key, start, end};
  }
  function restoreFocus(focus) {
    if (!focus) return;
    const el = document.querySelector(`[data-fk="${CSS.escape(focus.key)}"]`) || document.getElementById(focus.key);
    if (!el) return;
    el.focus({preventScroll: true});
    try { if (focus.start != null) el.setSelectionRange(focus.start, focus.end); } catch {}
  }
  function drawLayers() {
    const scrolls = [...document.querySelectorAll('#modal-root .sheet-scroll')].map(el => el.scrollTop);
    $('#modal-root').innerHTML = layers.map((layer, i) => `<div class="backdrop ${i < layers.length - 1 ? 'covered' : ''}"><section class="${layer.alert ? 'alert' : 'sheet'} ${layer.cls || ''}" role="${layer.alert ? 'alertdialog' : 'dialog'}" aria-modal="true">${layer.alert ? alertMarkup(layer) : layer.render()}</section></div>`).join('');
    document.querySelectorAll('#modal-root .sheet-scroll').forEach((el, i) => { el.scrollTop = scrolls[i] || 0; });
  }
  function openSheet(render, cls = '') { layers.push({render, cls}); drawLayers(); $('#modal-root .backdrop:last-child button, #modal-root .backdrop:last-child input')?.focus({preventScroll: true}); }
  function openAlert(title, message, buttons, cls = '') { layers.push({alert: true, title, message, buttons, cls}); drawLayers(); $('#modal-root .backdrop:last-child .alert-buttons .default, #modal-root .backdrop:last-child .alert-buttons button')?.focus({preventScroll: true}); }
  function alertMarkup(layer) {
    const buttons = layer.buttons || [];
    return `<img class="alert-icon" src="campus-icon-64.png" alt=""><h2>${esc(layer.title)}</h2>${layer.message ? `<p>${esc(layer.message)}</p>` : ''}${buttons.length ? `<div class="alert-buttons ${buttons.length > 2 ? 'stacked' : ''}">${buttons.map((b, i) => `<button type="button" class="${b.role || ''}" data-action="alert" data-index="${i}">${esc(b.label)}</button>`).join('')}</div>` : ''}`;
  }
  function closeLayer() { layers.pop(); drawLayers(); }
  function closeAllLayers() { layers = []; drawLayers(); }
  const sheetOpen = () => layers.length > 0;

  function theme() { document.body.dataset.theme = state.appearance === 'dark' || (state.appearance === 'system' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light'; }
  function nav() {
    const row = ([id, title, symbol]) => `<button class="nav-item ${page === id ? 'active' : ''}" data-nav="${id}">${icon(symbol, 'nav-icon')}<span>${title}</span>${id === 'trash' && state.trash.length ? `<span class="nav-badge">${state.trash.length}</span>` : ''}</button>`;
    $('#navigation').innerHTML = row(pages[0]) + `<div class="nav-heading">${micro('Plan')}</div>` + pages.slice(1, 4).map(row).join('') + `<div class="nav-heading">${micro('School')}</div>` + pages.slice(4).map(row).join('');
    $('#settings-button').innerHTML = icon('gear', 'nav-icon') + '<span>Settings</span>';
    $('#app-promo').innerHTML = appPromoHidden() ? '' : `<div class="app-promo"><a class="app-promo-link" href="${APP_DOWNLOAD}"><img src="campus-icon-64.png" alt=""><span><span class="app-promo-title">Campus for Mac</span><span class="app-promo-sub">Download the app for the menu bar, local calendar and more</span></span></a><button type="button" class="app-promo-close" data-action="hide-app-promo" aria-label="Don't show again">${icon('xmark')}</button></div>`;
  }
  // The Mac app promo stays hidden once someone closes it or already moves data to or from the app.
  const APP_DOWNLOAD = 'https://kisj.space/download', APP_PROMO_KEY = 'campus.web.appPromoHidden';
  function appPromoHidden() { try { return localStorage.getItem(APP_PROMO_KEY) === '1'; } catch { return false; } }
  function hideAppPromo() { try { localStorage.setItem(APP_PROMO_KEY, '1'); } catch {} if (state.setupComplete) nav(); }
  function render() {
    theme();
    const focus = captureFocus();
    document.body.classList.toggle('onboarding', !state.setupComplete);
    if (!state.setupComplete) $('#view').innerHTML = onboardingView();
    else { nav(); $('#view').innerHTML = ({today: todayView, schedule: scheduleView, homework: homeworkView, calendar: calendarView, cafeteria: cafeteriaView, trash: trashView, about: aboutView}[page] || todayView)(); }
    if (layers.length) drawLayers();
    restoreFocus(focus);
  }
  function go(name) { page = name; location.hash = name; render(); $('#view').scrollTop = 0; $('.sidebar').classList.remove('open'); }

  // Today
  function todayView() {
    const iso = dateKey(), now = nowMinutes(), current = currentClass(), next = nextClass(), due = dueSoon(), menuImage = state.cafeteria[state.division];
    const upcoming = allEvents().filter(e => (e.end || e.start) >= iso).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 4);
    const column = (title, c, {emptyTitle, emptyMessage, prefix, useEnd, progress, opens}) => `<div class="status-column">${micro(title)}${c ? `${opens ? `<button type="button" class="class-title-button" data-action="show-day" title="Show today's full schedule"><span class="class-title">${esc(c.subject)}</span>${icon('chevronRight')}</button>` : `<div class="class-title">${esc(c.subject)}</div>`}<div class="subheadline sub">${esc(detailText(c))}</div><div class="caption faint mono">${esc(c.start)} – ${esc(c.end)}</div><div class="countdown">${prefix} ${countdownText(minutes(useEnd ? c.end : c.start))}</div>${progress ? progressBar((now - minutes(c.start)) / (minutes(c.end) - minutes(c.start))) : ''}` : `<div class="empty-title">${esc(emptyTitle)}</div><div class="subheadline sub">${esc(emptyMessage)}</div>`}</div>`;
    const nowNext = card('Now / Next', 'clock', `<div class="now-next">${column('Right Now', current, {emptyTitle: 'No class', emptyMessage: 'Campus will watch for the next scheduled class.', prefix: 'Ends in', useEnd: true, progress: true, opens: true})}<span class="vertical-rule"></span>${column('Up Next', next, {emptyTitle: 'Done', emptyMessage: 'No more classes are scheduled today.', prefix: 'Begins in', useEnd: false})}</div>`);
    const dueCard = card('Due Next 24 Hours', 'alert', due.length ? `<div class="rows">${due.map(h => `<div class="due-row"><div class="grow"><div class="row-title">${esc(h.title)}</div><div class="caption faint one-line">${esc([h.subject, shortDateTime(h.due)].filter(Boolean).join(' · '))}</div></div>${badge(h)}</div>`).join('')}</div>` : `<div class="due-empty">${icon('checkCircle')}<span>Nothing due in the next 24 hours.</span></div>`);
    const cafeteria = card('Cafeteria', 'fork', `${menuImage?.image ? `<button type="button" class="menu-thumb" data-action="original-menu" title="Open cached menu image"><img src="${esc(menuImage.image)}" alt="Cached ${esc(state.division)} lunch menu"></button><div class="caption faint">Updated ${shortDateTime(menuImage.fetchedAt)}</div>` : emptyState('No cached menu image', cafeteriaError || 'Refresh Cafeteria once to cache the latest KIS menu image.', 'photo')}<div>${btn('Open Full Size', {action: 'original-menu', disabled: !menuImage?.image})}</div>`, 'cafeteria-card');
    const calendar = card('Calendar', 'calendar', upcoming.length ? `<div class="rows">${upcoming.map(e => `<div class="event-row"><div class="grow"><div class="event-title">${esc(e.title)}</div><div class="caption faint">${esc(eventDateText(e))} · ${esc(eventCategory(e))}</div></div>${e.type === 'break' ? pill('No school') : ''}</div>`).join('')}</div>` : emptyState('No upcoming events', 'Add school calendar items for breaks, exams, and no-school days.', 'calendar'), 'calendar-summary-card');
    return `<div class="page today-page">${header('Today', fullDate())}${nowNext}${dueCard}<div class="two-up">${cafeteria}${calendar}</div></div>`;
  }
  function daySchedule() {
    const iso = dateKey(), list = classesOn(iso), currentId = currentClass()?.id, day = rotationAt(iso);
    return `<div class="day-schedule"><div class="day-schedule-head"><div><h2 class="display-22">Today's Schedule</h2><div class="caption sub">${new Intl.DateTimeFormat('en-US', {timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric'}).format(new Date())}</div></div>${day ? pill(`${day} Day`) : ''}${iconButton('Close', 'xmark', 'close')}</div><div class="hairline"></div>${list.length ? `<div class="day-schedule-list">${list.map(c => { const now = c.id === currentId; return `<div class="day-row ${now ? 'now' : ''}"><div class="day-row-time">${esc(c.start)}<br>${esc(c.end)}</div><span class="day-row-bar"></span><div class="grow"><div class="day-row-subject">${esc(c.subject)}</div>${c.room || c.teacher ? `<div class="caption sub one-line">${esc([c.room, c.teacher].filter(Boolean).join(' · '))}</div>` : ''}</div>${now ? pill('Now') : ''}</div>`; }).join('')}</div>` : emptyState('No classes today', 'There is no schedule for this date.', 'calMinus')}</div>`;
  }
  function originalMenu() {
    const menuImage = state.cafeteria[state.division];
    return `<div class="original-menu"><div class="original-menu-head"><h2>Original Menu</h2>${btn('Done', {action: 'close', kind: 'prominent'})}</div><div class="hairline"></div>${menuImageView(menuImage)}</div>`;
  }
  const menuImageView = menuImage => `<div class="menu-image-view">${menuImage?.image ? `<div class="menu-zoom" data-zoom-view title="Click to zoom in"><div class="menu-zoom-inner"><img src="${esc(menuImage.image)}" alt="${esc(state.division)} cafeteria menu" draggable="false"></div></div>` : emptyState('No menu image', cafeteriaError || 'Refresh Cafeteria to load the latest KIS menu image.', 'photo')}</div>`;

  // Schedule
  const showsSetupPrompt = () => needsScheduleSetup() && !enteringManually;
  const selectedKey = () => KEYS[weekday * 2 + (scheduleSelection === 'B' ? 1 : 0)];
  function visibleSchedule() {
    if (scheduleSelection === 'custom') return customDraft;
    if (scheduleSelection === 'club') return state.club.enabled ? [{...state.club, subject: state.club.name || 'Club'}] : [];
    return byStart(state.schedules[selectedKey()] || []);
  }
  function listFor(listKey) { return listKey === 'draft' ? customDraft : (state.schedules[listKey] ??= []); }
  function isCurrent(block) {
    const today = dateKey(), now = nowMinutes(), inside = minutes(block.start) <= now && now < minutes(block.end);
    if (scheduleSelection === 'custom') return overrideDate === today && inside;
    return weekday === dayIndex(today) && scheduleSelection === rotationAt(today) && !state.customDays[today] && inside;
  }
  function loadCustomDraft() {
    const existing = state.customDays[overrideDate];
    if (existing) { customDraft = existing.classes.map(c => ({...c})); customTitle = existing.title; }
    else { customDraft = classesOn(overrideDate, {ignoreCustom: true}).filter(c => c.id !== 'club').map(c => ({...c, id: uid()})); customTitle = 'Custom Day'; }
    customDirty = false;
  }
  function saveCustomDraft() {
    state.customDays[overrideDate] = {title: customTitle.trim() || 'Custom Day', classes: byStart(customDraft).map(c => ({...c}))};
    save(); loadCustomDraft();
  }
  function markDirty() { const wasClean = !customDirty; customDirty = true; if (wasClean) render(); }
  function guardCustom(proceed, revert) {
    if (!(scheduleSelection === 'custom' && customDirty)) return proceed();
    openAlert('Unsaved custom day', 'Save or discard your edits before leaving this custom day.', [
      {label: 'Save & Continue', role: 'default', run: () => { saveCustomDraft(); proceed(); }},
      {label: 'Discard Changes', role: 'destructive', run: () => { customDirty = false; proceed(); }},
      {label: 'Cancel', run: () => revert?.()}
    ]);
  }
  function scheduleView() {
    if (showsSetupPrompt()) return `<div class="page schedule-page">${header('Schedule', 'Set up your school schedule.')}<div class="initial-setup">${btn('Automatically Sync Powerschool', {action: 'sync', kind: 'prominent large', sym: 'sync'})}<button type="button" class="plain-link" data-action="manual-start">or manually put everything</button></div></div>`;
    const today = dateKey(), day = rotationAt(today), kind = dayKind(today);
    const pills = day ? pill(`Today · ${day} Day`, true) + (kind ? pill(kind) : '') : pill('Weekend');
    const templates = state.savedTemplates || [];
    const templatesMenu = menu('Templates', 'tray', `<input class="text-field" id="template-name" data-bind="template-name" placeholder="Template name" value="${esc(templateName)}"><button type="button" data-action="template-save">Save visible schedule</button><hr>${templates.length ? templates.map(t => `<button type="button" data-action="template-load" data-id="${esc(t.id)}">Load ${esc(t.name)}</button>`).join('') + '<hr>' + templates.map(t => `<button type="button" class="destructive" data-action="template-delete" data-id="${esc(t.id)}">Delete ${esc(t.name)}</button>`).join('') : '<span class="menu-disabled">No saved templates</span>'}`);
    const controls = `<div class="schedule-controls">${segmented([['A', 'A Day'], ['B', 'B Day'], ['club', 'Club'], ['custom', 'Custom Day']], scheduleSelection, 'schedule-select', 'style="width:420px"')}${scheduleSelection !== 'club' ? templatesMenu : ''}<span class="spacer"></span>${btn('PowerSchool Sync', {action: 'sync', sym: 'sync'})}${scheduleSelection !== 'club' ? btn('Add Class', {action: 'class-add', kind: 'prominent', sym: 'plus'}) : ''}</div>`;
    const weekdayControls = scheduleSelection === 'A' || scheduleSelection === 'B' ? `<div class="weekday-controls">${micro('Weekday')}${segmented(SHORT.map((d, i) => [i, d]), weekday, 'weekday', 'style="width:360px"')}<span class="spacer"></span><span class="subheadline sub">${DAYS[weekday]} · ${scheduleSelection} Day</span></div>` : '';
    let content;
    if (scheduleSelection === 'club') content = clubSetup();
    else {
      const listKey = scheduleSelection === 'custom' ? 'draft' : selectedKey();
      content = `<div class="schedule-list">${visibleSchedule().map(c => editorRow(c, listKey)).join('')}</div>`;
    }
    const footerText = scheduleSelection === 'club' ? (state.club.enabled ? clubSummary() : 'Enable Club to choose its weekdays and time.') : scheduleSelection === 'custom' ? (customDirty ? 'This custom day has unsaved changes.' : 'Custom days override the normal A/B rotation only on their selected dates.') : state.rotation?.lastSyncedAt ? `PowerSchool synced ${shortDateTime(state.rotation.lastSyncedAt)}` : 'A/B rotation is calculated Monday–Friday from the current reference day.';
    return `<div class="page schedule-page">${header('Schedule', 'Manage weekday A/B schedules, Club, and custom days.', `<div class="header-pills">${pills}</div>`)}${controls}${weekdayControls}${scheduleSelection === 'custom' ? customDayBar() + customDateSummary() : ''}${content}<div class="schedule-footer"><span>${esc(footerText)}</span><span>The current class is highlighted automatically.</span></div></div>`;
  }
  function editorRow(c, listKey) {
    const current = isCurrent(c), field = (name, placeholder) => `<input class="row-field" data-bind="class" data-list="${esc(listKey)}" data-id="${esc(c.id)}" data-field="${name}" data-fk="class-${esc(c.id)}-${name}" value="${esc(c[name] || '')}" placeholder="${placeholder}" aria-label="${placeholder}">`;
    return `<div class="editor-row ${current ? 'current' : ''}"><div class="editor-head"><input class="subject-field" data-bind="class" data-list="${esc(listKey)}" data-id="${esc(c.id)}" data-field="subject" data-fk="class-${esc(c.id)}-subject" value="${esc(c.subject)}" placeholder="Subject" aria-label="Subject">${current ? pill('Now', true) : ''}<button type="button" class="row-delete" data-action="class-delete" data-list="${esc(listKey)}" data-id="${esc(c.id)}" title="Delete class" aria-label="Delete ${esc(c.subject)}">${icon('trash')}</button></div><div class="editor-grid"><span>Teacher</span>${field('teacher', 'Teacher')}<span>Room</span>${field('room', 'Room')}<span>Start</span>${timeEditor(`class|${listKey}|${c.id}|start`, c.start)}<span>End</span>${timeEditor(`class|${listKey}|${c.id}|end`, c.end)}</div></div>`;
  }
  function clubSummary() { const c = state.club, days = SHORT.filter((_, i) => c.days.includes(i)).join(', '); return `${c.name.trim() || 'Club'} · ${days || 'No days selected'} · ${c.start}–${c.end}`; }
  function clubSetup() {
    const c = state.club, off = c.enabled ? '' : 'disabled';
    return `<section class="card club-card"><div class="club-head"><div><div class="headline">Club schedule</div><div class="subheadline sub">Choose the weekdays and time for your club.</div></div><label class="checkbox"><input type="checkbox" data-bind="club-enabled" ${c.enabled ? 'checked' : ''}><span>Enable Club</span></label></div><div class="hairline"></div><div class="club-fields"><div class="field-group">${micro('Club name')}<input class="text-field" style="max-width:420px" data-bind="club-name" data-fk="club-name" placeholder="Enter club name" value="${esc(c.name)}" ${off}></div><div class="field-group">${micro('Days')}<div class="checkbox-row">${SHORT.map((d, i) => `<label class="checkbox"><input type="checkbox" data-bind="club-day" value="${i}" ${c.days.includes(i) ? 'checked' : ''} ${off}><span>${d}</span></label>`).join('')}</div></div><div class="club-times"><div class="field-group">${micro('Start')}${timeEditor('club|start', c.start, !c.enabled)}</div><div class="field-group">${micro('End')}${timeEditor('club|end', c.end, !c.enabled)}</div></div></div>${c.enabled ? `<div class="club-summary">${icon('checkCircleFill')}<span>${esc(clubSummary())}</span></div>` : ''}</section>`;
  }
  function customDayBar() {
    const existing = state.customDays[overrideDate];
    const status = existing ? (customDirty ? 'Unsaved changes' : `Saved · ${existing.classes.length} classes`) : customDirty ? 'Unsaved custom day' : customDraft.length ? 'Using the normal rotation as a starting point' : 'No regular classes on this date';
    const saved = Object.entries(state.customDays).sort(([a], [b]) => a.localeCompare(b));
    const savedMenu = menu('Saved Custom Days', 'calClock', saved.length ? saved.map(([iso, day]) => `<button type="button" data-action="override-pick" data-date="${iso}">${monthDay(iso)} · ${esc(day.title)}</button>`).join('') : '<span class="menu-disabled">No saved custom days</span>');
    return `<section class="card custom-bar"><div class="custom-fields"><div class="field-group">${micro('Date')}<input type="date" class="text-field" id="override-date" value="${esc(overrideDate)}" style="width:142px" aria-label="Override date"></div><div class="field-group">${micro('Name')}<input class="text-field" data-bind="custom-title" data-fk="custom-title" placeholder="Custom Day" value="${esc(customTitle)}" style="width:220px" aria-label="Custom day name"></div><div class="field-group">${micro('Status')}<span class="caption ${customDirty ? 'ink' : existing ? 'sub' : 'faint'}">${esc(status)}</span></div></div><div class="hairline"></div><div class="custom-actions">${btn('Today', {action: 'override-today', sym: 'scope'})}${savedMenu}<span class="spacer"></span>${existing ? btn('Delete Custom Day', {action: 'custom-delete', sym: 'trash', kind: 'outline destructive'}) : ''}${btn(existing ? 'Save Changes' : 'Save Custom Day', {action: 'custom-save', kind: 'prominent', sym: 'checkmark', disabled: !customDirty && Boolean(existing)})}</div></section>`;
  }
  function customDateSummary() {
    const existing = state.customDays[overrideDate];
    return `<div class="card custom-summary">${micro('Custom date')}${pill(monthDay(overrideDate), true)}${pill(existing ? existing.title : 'Not saved')}<span class="spacer"></span><span class="caption faint">Class times are stored exactly as shown below.</span></div>`;
  }

  // PowerSchool sync sheet
  const syncReady = () => Boolean(draft.matrix && (state.division === 'MS' || draft.week));
  const syncActionTitle = () => state.rotation?.lastSyncedAt ? 'Redo Sync' : 'Confirm & Sync';
  // The paste steps, status and preview shared by the sync sheet and the setup guide.
  function syncContent() {
    const ms = state.division === 'MS', ready = syncReady(), anchor = draft.week?.anchor || draft.matrix?.anchor, actionTitle = syncActionTitle();
    const pageStep = (kind, title, url, copy) => `<div class="paste-step"><div class="paste-step-head"><strong>${title}</strong>${draft[kind] ? pill(kind === 'week' ? `${Object.keys(draft.week.times).length} days of times` : '10 A/B schedules', true) : ''}</div><p class="caption sub">${copy}</p><div class="paste-actions"><a class="btn outline" href="${url}" target="_blank" rel="noopener noreferrer">${icon('compass')}<span>Open ${title}</span></a>${btn('Paste copied page', {action: 'read-clipboard', attrs: `data-kind="${kind}"`})}<label class="btn outline" for="file-${kind}"><span>Choose saved HTML</span></label><input class="sync-file" id="file-${kind}" type="file" data-kind="${kind}" accept=".html,.htm,text/html" hidden></div><textarea class="paste-zone ${draft[kind] ? 'ready' : ''}" data-paste="${kind}" aria-label="Paste ${title}" placeholder="${draft[kind] ? `${title} ready` : 'Click here and press ⌘V (or Ctrl+V)'}"></textarea></div>`;
    const status = ready ? 'Both pages were read. Review the schedules below, then sync.' : draft.matrix || draft.week ? 'Waiting for the remaining page.' : 'Copy the PowerSchool page with ⌘A then ⌘C, then paste it here.';
    const summary = ready ? `<div class="summary-grid card">${KEYS.map((k, i) => `<div class="summary-row"><span class="summary-day">${DAYS[Math.floor(i / 2)]}</span>${pill(k.endsWith('A') ? 'A' : 'B', true)}<span class="caption faint mono">${draft.matrix.schedules[k].length} classes</span></div>`).join('')}</div>` : '';
    const manual = ready && !anchor ? `<div class="manual-rotation"><div><div class="subheadline strong">Choose one known day from this week</div><div class="caption sub">PowerSchool sometimes omits the A/B label on weekends. Choose a Monday–Friday day from this week and its A/B rotation. On Saturday or Sunday, use the weekdays that just passed, not next week.</div></div><div class="manual-row"><span class="caption sub">Weekday</span>${segmented(DAYS.map((d, i) => [i, d]), fallbackWeekday, 'fallback-weekday')}</div><div class="manual-row"><span class="caption sub">Rotation</span>${segmented([['A', 'A Day'], ['B', 'B Day']], fallbackDay, 'fallback-day', 'style="width:190px"')}</div></div>` : '';
    return `<div class="card instructions">${instruction(1, `Open ${ms ? 'Matrix View' : 'Week View and Matrix View'} in PowerSchool. Sign in there if it asks.`)}${instruction(2, 'On each page, press ⌘A then ⌘C once the schedule has fully loaded.')}${instruction(3, `Paste below, then press ${actionTitle}.`)}<div class="hairline"></div>${ms ? '' : pageStep('week', 'Week View', WEEK, 'Class start and end times for Monday–Friday.')}${pageStep('matrix', 'Matrix View', MATRIX, ms ? 'Courses, rooms and teachers for all ten A/B days. MS times are filled in automatically.' : 'Courses, rooms and teachers for all ten A/B days.')}</div>${notice('Campus reads the copied page inside this browser. It never receives your PowerSchool password or cookies.', 'shield')}<div class="status-block">${micro('Status')}<div class="subheadline sub">${esc(status)}</div>${draft.error ? notice(draft.error, 'warn') : ''}${manual}${summary}</div>`;
  }
  const syncButton = (kind = 'outline') => btn(syncActionTitle(), {action: 'sync-save', kind, sym: state.rotation?.lastSyncedAt ? 'refresh' : 'checkCircle', disabled: !syncReady()});
  function syncSheet() {
    const ms = state.division === 'MS';
    return `<div class="sync-sheet"><div class="sheet-scroll">${header('PowerSchool Sync', 'Campus reads the schedule from the PowerSchool pages you copy into this browser.')}${syncContent()}</div><div class="sheet-footer"><a class="btn outline" href="${ms ? MATRIX : WEEK}" target="_blank" rel="noopener noreferrer">${icon('compass')}<span>Open PowerSchool</span></a><span class="spacer"></span>${syncButton()}${btn('Done', {action: 'close', kind: 'prominent'})}</div></div>`;
  }
  const instruction = (n, text) => `<div class="instruction"><span class="instruction-number">${n}</span><span class="subheadline sub">${esc(text)}</span></div>`;
  function openSync() { draft = {week: null, matrix: null, error: ''}; openSheet(syncSheet, 'wide'); }
  function parsePaste(kind, html) { try { draft[kind] = kind === 'week' ? PowerSchoolImport.parseWeek(html) : PowerSchoolImport.parseMatrix(html); draft.error = ''; render(); toast(`${kind === 'week' ? 'Week View' : 'Matrix View'} copied successfully.`); } catch (e) { draft.error = e.message; render(); } }
  function saveSync() {
    try {
      const monday = draft.week?.monday || plusDays(dateKey(), -dayIndex(dateKey()));
      const fallback = {date: plusDays(monday, Number(fallbackWeekday)), day: fallbackDay};
      const result = state.division === 'MS' ? PowerSchoolImport.buildMiddleSchool(draft.matrix, fallback) : PowerSchoolImport.build(draft.week, draft.matrix, fallback, state.schedules);
      state.schedules = result.schedules; state.rotation = result.rotation;
      if (!save()) return;
      if (layers.length) closeLayer();
      draft = {week: null, matrix: null, error: ''}; enteringManually = false; render();
      toast(`Synced all 10 A/B schedules.${result.recovered.length ? ' Previous times used for ' + result.recovered.join(', ') + '.' : ''}`);
    } catch (e) { draft.error = e.message; render(); }
  }

  // Homework
  const visibleAssignments = () => state.homework.filter(h => Boolean(h.complete) === showingCompleted).sort((a, b) => a.due.localeCompare(b.due));
  function classroomStatusText() {
    if (syncingClassroom) return 'Syncing Google Classroom...';
    if (classroomStatus) return classroomStatus;
    return CampusGoogle.connected() ? (state.googleLastSync ? `Synced ${shortDateTime(state.googleLastSync)}.` : '') : 'Google Classroom is not connected.';
  }
  function homeworkView() {
    const connected = CampusGoogle.connected(), list = visibleAssignments(), todo = state.homework.filter(h => !h.complete).length, done = state.homework.length - todo;
    const statusText = classroomStatusText();
    const panel = `<section class="card classroom-panel"><div class="card-head">${icon('books')}${micro('Google Classroom')}</div>${statusText ? `<div class="caption sub">${esc(statusText)}</div>` : ''}${connected ? `<button type="button" class="soft-capsule" data-action="google-switch">${icon('sync')}<span>Connect Google</span></button>` : btn('Connect Google', {action: 'google-connect', kind: 'prominent', sym: 'link'})}<div class="button-row">${btn(syncingClassroom ? 'Syncing…' : 'Sync', {action: 'google-sync', disabled: syncingClassroom || !connected})}${btn('Disconnect', {action: 'google-disconnect', disabled: !connected})}</div>${state.googleReconnectRequired && !connected ? notice('Google Classroom sign-in was not transferred from the Mac app. Connect Google here again to resume homework sync.', 'lock') : ''}${classroomError ? notice(classroomError, 'warn') : ''}</section>`;
    const toolbar = selecting
      ? `<div class="assignment-toolbar"><span class="caption sub mono">${selection.size} selected</span>${btn(selection.size === list.length ? 'Clear All' : 'Select All', {action: 'select-all'})}<span class="spacer"></span>${btn('Color', {action: 'bulk-color', sym: 'palette', disabled: !selection.size})}${btn('Delete', {action: 'bulk-trash', sym: 'trash', kind: 'outline destructive', disabled: !selection.size})}${btn('Done', {action: 'select-end', kind: 'prominent'})}</div>`
      : `<div class="assignment-toolbar"><span class="caption faint mono">${list.length} assignments</span><span class="spacer"></span>${btn('Select', {action: 'select-start', sym: 'checkCircle', disabled: !list.length})}${btn('Add Homework', {action: 'hw-new', kind: 'prominent', sym: 'plus'})}</div>`;
    const completed = !showingCompleted && state.homework.find(h => h.id === lastCompletedId && h.complete);
    const undo = completed ? `<div class="card undo-banner">${icon('checkCircleFill')}<span class="one-line">Completed: ${esc(completed.title)}</span><span class="spacer"></span>${btn('Undo', {action: 'hw-undo'})}</div>` : '';
    const rows = list.length ? `<div class="assignment-list">${list.map(assignmentRow).join('')}</div>` : emptyState(showingCompleted ? 'No completed homework' : 'No homework to do', showingCompleted ? 'Completed homework stays here. Uncheck it to move it back to To do.' : 'Connect Google Classroom or add an assignment manually.', 'checklist');
    return `<div class="page homework-page">${header('Homework', 'Assignments from Google Classroom and manual entries.')}<div class="homework-layout">${panel}<div class="assignments-panel">${segmented([['todo', `To do (${todo})`], ['done', `Completed (${done})`]], showingCompleted ? 'done' : 'todo', 'hw-status')}${toolbar}${undo}<div class="list-surface">${rows}</div></div></div></div>`;
  }
  function assignmentRow(h) {
    const color = hex(h.color) ? h.color : null, selected = selection.has(h.id);
    const lead = selecting
      ? `<button type="button" class="select-circle ${selected ? 'on' : ''}" data-action="hw-select" data-id="${esc(h.id)}" aria-label="${selected ? 'Deselect' : 'Select'} homework">${selected ? icon('checkmark') : ''}</button>`
      : `<button type="button" class="row-trash" data-action="hw-trash" data-id="${esc(h.id)}" title="Delete homework" aria-label="Delete ${esc(h.title)}">${icon('trash')}</button><button type="button" class="complete-circle ${h.complete ? 'on' : ''}" data-action="hw-toggle" data-id="${esc(h.id)}" aria-label="${h.complete ? 'Mark as not completed' : 'Mark as completed'}">${h.complete ? icon('checkmark') : ''}</button>`;
    const trailing = selecting ? '' : `<button type="button" class="note-button" data-action="hw-detail" data-id="${esc(h.id)}" title="Edit note" aria-label="Edit note">${icon(h.note ? 'note' : 'notePlus')}</button>${h.url ? `<a class="btn outline" href="${esc(h.url)}" target="_blank" rel="noopener noreferrer" title="Open assignment">${icon('arrowUpRight')}<span>Open</span></a>` : ''}`;
    return `<div class="assignment-row ${color ? 'tinted' : ''} ${h.complete ? 'complete' : ''}" ${color ? `style="--tint:${color}"` : ''}><span class="assignment-accent"></span>${lead}<div class="assignment-text"><div class="assignment-title">${esc(h.title)}</div><div class="caption faint one-line">${esc([h.subject, shortDateTime(h.due), sourceLabel(h)].filter(Boolean).join(' · '))}</div>${h.note ? `<div class="caption2 sub one-line">${esc(h.note)}</div>` : ''}</div>${badge(h)}${trailing}</div>`;
  }
  function assignmentDetail(id) {
    return () => {
      const h = state.homework.find(x => x.id === id);
      if (!h) return `<div class="detail-sheet">${emptyState('Homework missing', 'This assignment is no longer available.', 'warn')}<div class="sheet-actions"><span class="spacer"></span>${btn('Done', {action: 'close'})}</div></div>`;
      return `<div class="detail-sheet"><div class="detail-head"><div class="grow"><h2 class="display-24">${esc(h.title)}</h2><div class="subheadline sub">${esc(h.subject)}</div></div>${badge(h)}</div><div class="detail-grid">${micro('Due')}<span class="subheadline">${shortDateTime(h.due)}</span>${micro('Source')}<span class="subheadline">${sourceLabel(h)}</span>${micro('Status')}<span class="subheadline">${h.complete ? 'Completed' : 'Not completed'}</span></div>${colorPicker(`hw:${h.id}`, h.color, 'Homework color')}<div class="hairline"></div>${micro('Note')}<textarea class="note-editor" data-bind="hw-note" data-id="${esc(h.id)}" data-fk="hw-note" aria-label="Note">${esc(h.note || '')}</textarea><div class="sheet-actions">${h.url ? `<a class="btn prominent" href="${esc(h.url)}" target="_blank" rel="noopener noreferrer">${icon('arrowUpRight')}<span>Open Assignment</span></a>` : '<span class="caption faint">No shortcut attached</span>'}<span class="spacer"></span>${btn('Done', {action: 'close'})}</div></div>`;
    };
  }
  function shortcutURL(value) {
    const clean = String(value || '').trim();
    if (!clean) return null;
    try { const url = new URL(clean.includes('://') ? clean : `https://${clean}`); return /^https?:$/.test(url.protocol) && url.hostname ? url.href : false; } catch { return false; }
  }
  function manualEditor() {
    const d = hwDraft, url = shortcutURL(d.shortcut), invalid = url === false;
    return `<div class="manual-editor"><div><h2 class="display-24">Add Homework</h2><div class="subheadline sub">Create an assignment that is stored only in Campus.</div></div><div class="grouped-form"><label><span>Title</span><input data-bind="hw-draft" data-field="title" data-fk="hw-title" value="${esc(d.title)}"></label><label><span>Subject</span><input data-bind="hw-draft" data-field="subject" data-fk="hw-subject" value="${esc(d.subject)}"></label><label><span>Due</span><input type="datetime-local" data-bind="hw-draft" data-field="due" data-fk="hw-due" value="${esc(d.due)}"></label><label><span>Shortcut URL (optional)</span><input data-bind="hw-draft" data-field="shortcut" data-fk="hw-shortcut" value="${esc(d.shortcut)}"></label>${invalid ? '<div class="form-error">Enter a valid web address.</div>' : ''}<label class="tall"><span>Note (optional)</span><textarea data-bind="hw-draft" data-field="note" data-fk="hw-note-new" rows="3">${esc(d.note)}</textarea></label></div><div class="sheet-actions">${btn('Cancel', {action: 'close'})}<span class="spacer"></span>${btn('Add Homework', {action: 'hw-add', kind: 'prominent', sym: 'plus', disabled: !d.title.trim() || invalid || !d.due})}</div></div>`;
  }
  function bulkColorSheet() {
    return `<div class="bulk-color"><h2 class="display-20">Homework Color</h2>${colorPicker('bulk', bulkColor, 'Selected homework')}<div class="sheet-actions"><span class="caption faint">Default clears the custom color.</span><span class="spacer"></span>${btn('Cancel', {action: 'close'})}${btn('Apply', {action: 'bulk-color-apply', kind: 'prominent'})}</div></div>`;
  }

  // Calendar
  function calendarView() {
    const [year, month] = monthView.split('-').map(Number), first = new Date(Date.UTC(year, month - 1, 1, 12));
    const offset = first.getUTCDay(), count = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const cellCount = Math.ceil((offset + count) / 7) * 7, today = dateKey();
    const events = allEvents().filter(e => e.start <= `${monthView}-31` && (e.end || e.start) >= `${monthView}-01`);
    const cellHeight = Math.max(72, Math.min(118, (window.innerHeight - 150) / 6));
    const weeks = Array.from({length: cellCount / 7}, (_, week) => {
      const days = Array.from({length: 7}, (_, column) => { const iso = plusDays(`${monthView}-01`, week * 7 + column - offset); return iso.startsWith(monthView) ? iso : null; });
      const occupied = [], segments = [];
      events.filter(e => days.some(iso => iso && covers(e, iso))).sort((a, b) => a.start.localeCompare(b.start) || (b.end || b.start).localeCompare(a.end || a.start)).forEach(e => {
        const columns = days.map((iso, i) => iso && covers(e, iso) ? i : -1).filter(i => i >= 0), start = columns[0], end = columns.at(-1);
        let lane = occupied.findIndex(ranges => ranges.every(([a, b]) => end < a || start > b));
        if (lane < 0) { lane = occupied.length; occupied.push([]); }
        occupied[lane].push([start, end]);
        segments.push({event: e, start, end, lane, before: e.start < days[start], after: (e.end || e.start) > days[end]});
      });
      const eventHeight = occupied.length * 24, dueCounts = days.map(iso => iso ? state.homework.filter(h => dateKey(new Date(h.due)) === iso).length : 0), dueHeight = Math.max(...dueCounts.map(n => Math.min(n, 2) * 24 + (n > 2 ? 18 : 0))), height = Math.max(cellHeight, 48 + eventHeight + dueHeight);
      const cells = days.map(iso => {
        if (!iso) return `<div class="day-cell blank" style="height:${height}px"></div>`;
        const dayEvents = events.filter(e => covers(e, iso)), due = state.homework.filter(h => dateKey(new Date(h.due)) === iso), noSchool = dayEvents.some(e => e.type === 'break');
        return `<div class="day-cell ${noSchool ? 'no-school' : dayEvents.length || due.length ? 'busy' : ''}" style="height:${height}px"><span class="day-number ${iso === today ? 'today' : ''}">${Number(iso.slice(-2))}</span><div style="height:${eventHeight}px"></div>${due.slice(0, 2).map(h => { const tint = dueTint(h); return `<button type="button" class="due-chip ${h.complete ? 'complete' : ''}" style="--tint:${tint}" data-action="hw-detail" data-id="${esc(h.id)}" title="${esc(h.title)} · ${esc(shortDateTime(h.due))}">${icon(h.complete ? 'checkCircleFill' : 'pencil')}<span>${esc(h.title)} due</span></button>`; }).join('')}${due.length > 2 ? `<div class="caption2 faint">+${due.length - 2} due</div>` : ''}</div>`;
      }).join('');
      const bands = segments.map(({event, start, end, lane, before, after}) => { const tint = hex(event.color) ? event.color : 'var(--campus-ink)'; return `<button type="button" class="band ${before ? 'before' : ''} ${after ? 'after' : ''}" style="grid-column:${start + 1}/${end + 2};grid-row:${lane + 1};background:${tint};color:${hex(event.color) ? bandText(event.color) : 'var(--campus-on-ink)'}" data-action="event-edit" data-id="${esc(event.id)}" title="${esc(event.title)} · ${esc(eventDateText(event))}">${esc(event.title)}</button>`; }).join('');
      return `<div class="week-row">${cells}<div class="band-layer" style="grid-template-rows:repeat(${occupied.length || 1},21px)">${bands}</div></div>`;
    }).join('');
    const monthTitle = new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', month: 'long', year: 'numeric'}).format(first);
    const actions = `<div class="calendar-actions"><button type="button" class="btn outline icon-capsule" data-action="calendar-refresh" title="Refresh school calendar" aria-label="Refresh school calendar" ${calendarLoading ? 'disabled' : ''}>${calendarLoading ? spinner : icon('refresh')}</button>${iconButton('Previous month', 'chevronLeft', 'month-prev')}${iconButton('Jump to today', 'scope', 'month-today')}${iconButton('Next month', 'chevronRight', 'month-next')}${btn('Add', {action: 'event-new', kind: 'prominent', sym: 'plus'})}<a class="btn outline" href="https://kis.ac/school-calendar/" target="_blank" rel="noopener noreferrer">KIS</a></div>`;
    return `<div class="page calendar-page">${header(monthTitle, `Today is ${fullDate()}`, actions)}${calendarError ? `<div class="caption sub calendar-error" title="${esc(calendarError)}">${esc(calendarError)}</div>` : ''}<section class="card month-card"><div class="weekday-labels">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(micro).join('')}</div>${weeks}</section></div>`;
  }
  function bandText(s) { const v = s.slice(1), lum = (.2126 * parseInt(v.slice(0, 2), 16) + .7152 * parseInt(v.slice(2, 4), 16) + .0722 * parseInt(v.slice(4, 6), 16)) / 255; return lum > .55 ? '#000' : '#fff'; }
  function dueTint(h) {
    if (hex(h.color)) return h.color;
    const ms = new Date(h.due).getTime() - Date.now();
    return ms <= 0 ? '#ad1414' : ms <= 3600000 ? '#b80f0d' : ms <= 86400000 ? '#b84a05' : ms <= 172800000 ? '#8c6b05' : 'var(--campus-sub)';
  }
  function eventEditor() {
    const d = eventDraft, remote = d.remote, canSave = d.title.trim().length > 0;
    return `<div class="event-editor"><div class="event-editor-head"><span class="event-editor-icon">${icon('calPlus')}</span><div class="grow"><h2 class="display-22">${d.id ? 'Edit event' : 'New event'}</h2><div class="caption faint">Keep the date clear and add only the details you need.</div></div>${iconButton('Cancel', 'xmark', 'close')}</div><div class="sheet-scroll event-editor-body"><div class="field-group">${micro('Event')}<input class="event-title-field" data-bind="event" data-field="title" data-fk="event-title" placeholder="What is happening?" value="${esc(d.title)}"></div><div class="field-group">${micro('Date')}<div class="card editor-card ${remote ? 'disabled' : ''}"><div class="editor-line"><label class="inline-label">Starts <input type="date" class="text-field" data-bind="event-date" data-field="start" value="${esc(d.start)}" ${remote ? 'disabled' : ''}></label><span class="spacer"></span><label class="switch"><span>Date range</span><input type="checkbox" data-bind="event-range" ${d.end ? 'checked' : ''} ${remote ? 'disabled' : ''}><span class="switch-track"></span></label></div>${d.end ? `<div class="editor-line"><span class="sub">Ends</span><span class="spacer"></span><input type="date" class="text-field" data-bind="event-date" data-field="end" min="${esc(d.start)}" value="${esc(d.end)}" aria-label="Ends" ${remote ? 'disabled' : ''}></div>` : ''}</div></div><div class="field-group">${micro('Details')}<div class="card editor-card">${remote ? `<div class="subheadline">School calendar · ${typeLabel(d.type)}</div><div class="caption sub">Dates and schedule rules come from the school. Your name, color, and notes stay in this browser and survive refreshes.</div>` : `<div class="category-chips">${CATEGORIES.map(c => `<button type="button" class="${d.category === c ? 'active' : ''}" data-action="event-category" data-value="${c}">${c}</button>`).join('')}</div><input class="text-field" data-bind="event" data-field="category" data-fk="event-category" placeholder="Or enter a custom category" value="${esc(d.category)}">`}${colorPicker('event', d.color, 'Event color')}${remote ? '' : `<label class="switch toggle-row"><span><strong>No school</strong><small>Show this date as a school closure.</small></span><input type="checkbox" data-bind="event-noschool" ${d.type === 'break' ? 'checked' : ''}><span class="switch-track"></span></label>`}</div></div><div class="field-group">${micro('Notes · Optional')}<textarea class="notes-field" data-bind="event" data-field="note" data-fk="event-note" rows="3" placeholder="Add a location, reminder, or other details">${esc(d.note)}</textarea></div></div><div class="event-editor-actions">${d.id && !remote ? btn('Delete', {action: 'event-trash', sym: 'trash', kind: 'outline destructive'}) : ''}<span class="spacer"></span>${btn('Cancel', {action: 'close'})}${btn(d.id ? 'Save Changes' : 'Add Event', {action: 'event-save', kind: 'prominent', disabled: !canSave})}</div></div>`;
  }
  function openEventEditor(id) {
    const e = id && allEvents().find(x => x.id === id);
    const today = dateKey(), start = monthView === today.slice(0, 7) ? today : `${monthView}-01`;
    eventDraft = e ? {id: e.id, title: e.title, start: e.start, end: e.end || '', type: e.type, category: eventCategory(e), color: hex(e.color) ? e.color : null, note: e.note || '', remote: Boolean(e.remote)} : {id: null, title: '', start, end: '', type: 'info', category: 'School', color: null, note: '', remote: false};
    openSheet(eventEditor, 'event-sheet');
  }
  function saveEvent() {
    const d = eventDraft, title = d.title.trim(), note = d.note.trim();
    if (!title) return;
    if (d.remote) state.eventOverrides[d.id] = {title, color: d.color || '', note};
    else {
      const start = validDate(d.start), end = d.end ? validDate(d.end) : '';
      if (!start || (d.end && !end)) return toast('Check the event dates.');
      const item = {id: d.id || uid(), title, type: d.type, category: d.category.trim() || 'School', start, end: end && end > start ? end : '', color: d.color || '', note, remote: false};
      const index = state.events.findIndex(x => x.id === d.id);
      index >= 0 ? state.events[index] = item : state.events.push(item);
    }
    save(); closeLayer(); render();
  }

  // Cafeteria
  function cafeteriaView() {
    const menuImage = state.cafeteria[state.division];
    const controls = `<div class="cafeteria-controls">${segmented(['ES', 'MS', 'HS'].map(d => [d, d]), state.division, 'division', 'style="width:140px"')}<select class="popup" aria-label="Language" style="width:110px"><option>한국어</option></select><span class="spacer"></span>${btn(cafeteriaLoading ? 'Loading…' : 'Refresh', {action: 'cafe-refresh', kind: 'prominent', disabled: cafeteriaLoading})}${btn('Original', {action: 'original-menu'})}</div>`;
    const panel = `<section class="card menu-panel-card"><div class="card-head">${icon('photo')}${micro('Menu Image')}${cafeteriaLoading ? spinner : menuImage ? `<span class="caption faint one-line">Cached ${shortDateTime(menuImage.fetchedAt)}</span>` : ''}<span class="spacer"></span>${btn('Open Larger', {action: 'original-menu'})}</div>${menuImageView(menuImage)}</section>`;
    return `<div class="page cafeteria-page"><div class="cafeteria-header">${header('Cafeteria', 'Latest KIS menu image.')}${controls}</div>${panel}${cafeteriaError ? notice(cafeteriaError, 'warn') : ''}</div>`;
  }

  // Trash
  const trashKind = t => t.type === 'homework' ? ['Homework', 'checklist'] : t.type === 'event' ? ['Calendar event', 'calendar'] : t.type === 'template' ? ['Saved schedule', 'stack'] : t.item?.key?.startsWith('custom:') ? ['One-off class', 'calAlert'] : ['Class', 'clock'];
  function trashDetail(t) {
    const item = t.item || {};
    if (t.type === 'homework') return [item.subject, item.due && shortDateTime(item.due)].filter(Boolean).join(' · ');
    if (t.type === 'event') return `${eventDateText(item)} · ${eventCategory(item)}`;
    if (t.type === 'template') return `${item.classes?.length || 0} classes`;
    const {key = '', block = {}} = item, time = `${block.start} - ${block.end}`;
    if (key.startsWith('custom:')) return `${monthDay(key.slice(7))} · ${time}`;
    if (key.startsWith('all:')) return `${key.slice(4)} Day · ${time}`;
    const i = KEYS.indexOf(key);
    return i < 0 ? time : `${DAYS[Math.floor(i / 2)]} · ${key.endsWith('A') ? 'A' : 'B'} Day · ${time}`;
  }
  function agoText(iso) { const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000); if (s < 60) return 'just now'; const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`; }
  function trashView() {
    const items = [...state.trash].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt)).filter(t => !trashFilter || trashKind(t)[0] === trashFilter);
    const head = header('Trash', `Deleted items are kept for ${TRASH_DAYS} days, then removed automatically.`, state.trash.length ? btn('Empty Trash', {action: 'trash-clear', sym: 'trash'}) : '');
    if (!state.trash.length) return `<div class="page trash-page">${head}${emptyState('Trash is empty', `Classes, homework and calendar events you delete land here, and stay recoverable for ${TRASH_DAYS} days.`, 'trash')}</div>`;
    const kinds = ['Class', 'One-off class', 'Saved schedule', 'Homework', 'Calendar event'];
    const chip = (title, n, active, value) => `<button type="button" class="chip ${active ? 'active' : ''}" data-action="trash-filter" data-value="${esc(value)}"><span>${esc(title)}</span><small>${n}</small></button>`;
    const chips = `<div class="chips">${chip('All', state.trash.length, !trashFilter, '')}${kinds.map(k => { const n = state.trash.filter(t => trashKind(t)[0] === k).length; return n ? chip(k, n, trashFilter === k, k) : ''; }).join('')}</div>`;
    const rows = items.map(t => { const [kind, symbol] = trashKind(t); return `<div class="trash-row">${icon(symbol, 'trash-icon')}<div class="grow"><div class="row-title">${esc(t.title)}</div><div class="caption faint one-line">${esc(trashDetail(t))}</div></div>${pill(kind)}<span class="trash-ago" title="${esc(shortDateTime(t.deletedAt))}">${agoText(t.deletedAt)}</span><div class="trash-actions">${btn('Restore', {action: 'trash-restore', sym: 'undo', attrs: `data-id="${esc(t.id)}"`})}${iconButton('Delete forever', 'xmark', 'trash-delete', `data-id="${esc(t.id)}"`)}</div></div>`; }).join('');
    return `<div class="page trash-page">${head}${chips}<div class="list-surface trash-list">${rows}</div></div>`;
  }

  // About
  function aboutView() {
    return `<div class="page about-page">${icon('grad', 'about-icon')}<h1>Campus</h1><p class="about-tagline">School schedule management in one place.</p>${pill('KISJ')}<p>Developed by Jacob &amp; Jay</p><p>Thanks to Emil Kowalski, for apple-design</p><p class="caption faint">Questions or suggestions: jay@kisj.space · jacob@kisj.space</p><p class="caption2 faint mono">Campus Web</p></div>`;
  }

  // Import everything via the clipboard: Campus for Mac copies all of its data (nothing left out,
  // no link length limit), then the user pastes it here.
  let pasteError = '';
  function pasteSheet() {
    return `<div class="paste-sheet"><div class="paste-sheet-head"><h2 class="display-22">Import everything from Campus for Mac</h2>${iconButton('Close', 'xmark', 'close')}</div><p class="subheadline sub">Campus for Mac is copying all of your data, with nothing left out. Once it says it's copied, click the box below and press ⌘V (or Ctrl+V). You'll be asked before anything is replaced.</p><textarea class="paste-zone" data-paste-transfer data-fk="paste-transfer" aria-label="Paste Campus data" placeholder="Click here and press ⌘V"></textarea>${pasteError ? notice(pasteError, 'warn') : ''}<div class="sheet-actions"><button type="button" class="plain-link" data-action="import-via-clipboard">Campus for Mac didn't open? Try again</button></div></div>`;
  }
  function importViaClipboard() {
    CampusTransfer.requestAppCopy();
    if (layers.at(-1)?.render === pasteSheet) return;
    pasteError = '';
    openSheet(pasteSheet, 'paste');
    requestAnimationFrame(() => document.querySelector('[data-paste-transfer]')?.focus());
  }

  // Settings (CampusSettingsView)
  function settingsSheet() {
    return `<div class="settings-sheet"><div class="sheet-scroll settings-body"><div class="settings-head"><h2 class="display-24">Appearance</h2><div class="subheadline sub">Make Campus feel at home in your browser.</div></div><section class="card settings-card"><div class="settings-mode">${icon('halfCircle', 'settings-mode-icon')}<div><div class="headline">Color mode</div><div class="caption sub">Applies to every Campus page in this browser.</div></div></div>${segmented([['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], state.appearance, 'appearance')}<div class="caption sub">${state.appearance === 'system' ? 'Follows your device’s appearance automatically.' : 'Your choice is saved for the next time you open Campus.'}</div></section><section class="card settings-card"><div class="headline label-line">${icon('transfer')}Transfer with Campus for Mac</div><div class="caption sub">Move schedules, homework, Trash, custom days, club and personal calendar events between this browser and the Mac app. Each side asks before replacing anything. Google authorization and image caches stay on their original device.</div><div class="stacked-buttons">${btn('Import from Mac app…', {action: 'import-from-app', sym: 'download'})}${btn('Send to Mac app…', {action: 'send-to-app', sym: 'arrowUpRight'})}${btn('Import Everything via Clipboard…', {action: 'import-via-clipboard', sym: 'stack', title: 'Opens Campus for Mac to copy all of its data, with nothing left out, for you to paste here'})}</div></section><section class="card settings-card"><div class="headline label-line">${icon('drive')}Local Data</div><div class="caption sub">Permanently removes schedules, homework, calendar changes, cafeteria cache, Google Classroom authorization, Trash, and Campus preferences from this browser.</div><div class="stacked-buttons">${btn('Export Backup…', {action: 'export-data', sym: 'upload'})}<label class="btn outline" for="backup-file">${icon('download')}<span>Import Backup…</span></label><input id="backup-file" type="file" accept="application/json,.json" hidden></div>${btn('Delete All Data…', {action: 'reset-data', kind: 'bordered-destructive'})}</section></div><div class="sheet-footer"><span class="spacer"></span>${btn('Done', {action: 'close', kind: 'prominent'})}</div></div>`;
  }

  // Onboarding (CampusOnboardingView)
  const setupSteps = ['School', 'Schedule', 'Homework', 'Ready'];
  const setupStep = () => Math.max(0, Math.min(3, Number(state.setupStep) || 0));
  function onboardingView() {
    const step = setupStep(), connected = CampusGoogle.connected(), needsSetup = needsScheduleSetup();
    const progress = `<div class="setup-progress">${setupSteps.map((title, i) => `<div class="setup-progress-item ${i < 3 ? 'grow' : ''}"><span class="setup-dot ${i <= step ? 'on' : ''}">${i < step ? icon('checkmark') : i + 1}</span><span class="setup-progress-title ${i <= step ? 'on' : ''} ${i === step ? 'current' : ''}">${title}</span>${i < 3 ? `<span class="setup-line ${i < step ? 'on' : ''}"></span>` : ''}</div>`).join('')}</div>`;
    const heading = (symbol, title, subtitle) => `<div class="setup-heading"><span class="setup-heading-icon">${icon(symbol)}</span><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div></div>`;
    const descriptions = {ES: 'Elementary School calendar and cafeteria', MS: 'Middle School calendar and cafeteria', HS: 'High School calendar and cafeteria'};
    let body;
    if (step === 0) body = heading('building', 'Welcome to Campus', 'First, choose your school division. This controls the calendar and cafeteria information Campus loads.') + `<section class="card setup-card"><div class="headline label-line">${icon('download')}Already use Campus on Mac?</div><div class="caption sub">Choose Import from Mac app, then approve sending in the Mac app. Campus will ask before replacing browser data. Google sign-in is not transferred.</div><div>${btn('Import from Mac app…', {action: 'import-from-app', sym: 'download'})}</div></section><section class="card setup-card"><div class="headline">School division</div>${segmented(['ES', 'MS', 'HS'].map(d => [d, d]), state.division, 'setup-division')}<div class="caption sub">${descriptions[state.division]}</div></section>`;
    else if (step === 1) body = heading('calClock', 'Set up your schedule', 'Campus can import all ten Monday–Friday A/B schedules from the PowerSchool pages you copy into this browser.') + `${!needsSetup ? `<div class="success-banner">${icon('checkCircleFill')}<div><strong>All 10 schedules synced</strong><span class="subheadline sub">Monday–Friday A/B schedules are ready to use.</span></div></div>` : ''}${syncContent()}<div class="button-row">${syncButton('prominent')}</div>`;
    else if (step === 2) body = heading('books', 'Bring in your homework', 'Connect Google Classroom to show upcoming assignments in Today, Homework, and Calendar.') + `<section class="card setup-card"><div class="headline label-line">${icon(connected ? 'checkCircleFill' : 'personPlus')}${connected ? 'Google Classroom is connected' : 'Connect your school Google account'}</div><div class="caption sub">Campus requests access to your classes and coursework. Your Google password is entered only on Google’s sign-in page.</div>${connected ? '' : `<div>${btn('Connect Google Classroom', {action: 'google-connect', kind: 'prominent', sym: 'link'})}</div>`}</section><div class="caption sub">${esc(classroomStatusText())}</div>${classroomError ? notice(classroomError, 'warn') : ''}`;
    else {
      const row = (symbol, title, value, complete) => `<div class="summary-line">${icon(symbol, 'sub')}<span class="grow">${title}</span><span class="caption sub">${value}</span>${icon(complete ? 'checkCircleFill' : 'dashed', complete ? 'ink' : 'faint')}</div>`;
      body = heading('checkCircleFill', 'Campus is ready', 'You can change or finish anything you skipped later from its section in Campus.') + `<section class="card setup-summary">${row('building', 'School division', state.division, true)}${row('calClock', 'PowerSchool', needsSetup ? 'Not set up' : 'Schedule synced', !needsSetup)}${row('books', 'Google Classroom', connected ? 'Connected' : 'Not connected', connected)}</section>`;
    }
    const cont = (disabled = false) => btn('Continue', {action: 'setup-next', kind: 'prominent', sym: 'chevronRight', disabled});
    const footer = `<div class="setup-footer">${step > 0 ? btn('Back', {action: 'setup-back', sym: 'chevronLeft'}) : ''}<span class="spacer"></span>${step === 0 ? cont() : step === 1 ? `${needsSetup ? '<button type="button" class="plain-link" data-action="setup-next">Set up later</button>' : ''}${cont(needsSetup)}` : step === 2 ? `${connected ? '' : '<button type="button" class="plain-link" data-action="setup-next">Set up later</button>'}${cont(!connected)}` : btn('Start using Campus', {action: 'setup-finish', kind: 'prominent', sym: 'arrowRight'})}</div>`;
    return `<div class="setup">${progress}<div class="setup-scroll"><div class="setup-body">${body}</div></div>${footer}</div>`;
  }

  // Network refreshes
  const isOffline = () => navigator.onLine === false;
  function parseSet(text, source) { const rows = []; for (const obj of text.match(/\{[^{}]{0,1000}\}/g) || []) { const f = {}; for (const m of obj.matchAll(/['"]?(type|start|end|name|color|id)['"]?\s*:\s*(['"])(.*?)\2/g)) f[m[1]] = m[3]; const start = validDate(f.start), end = validDate(f.end || f.start); if (!start || !end || end < start || !['break', 'half', 'info', 'late'].includes(f.type) || !f.name) continue; rows.push({id: `remote:${source}:${f.id || `${f.type}:${start}:${end}:${f.name}`}`, title: f.name, type: f.type, start, end: end === start ? '' : end, color: hex(f.color) ? f.color : '#303234', note: '', remote: true}); } return rows; }
  async function refreshCalendar(silent = false) {
    calendarLoading = true; if (page === 'calendar') render();
    try {
      const sources = ['global', state.division.toLowerCase()], result = await Promise.all(sources.map(async source => { const r = await fetch(`https://kisj.space/${source}.set`, {cache: 'no-store'}); if (!r.ok) throw Error(`${source}.set: HTTP ${r.status}`); return parseSet(await r.text(), source); }));
      state.remoteEvents = result.flat(); state.remoteUpdated = new Date().toISOString(); calendarError = ''; save();
    } catch (e) { calendarError = isOffline() ? "You're offline. Saved dates are still shown." : `Calendar update failed: ${e.message}. Saved dates are still shown.`; if (!silent) toast(calendarError); }
    calendarLoading = false;
    if (['calendar', 'today', 'schedule'].includes(page) && !sheetOpen()) render();
  }
  let menuWorkerReady;
  function menuWorker() { if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return Promise.resolve(null); return menuWorkerReady ??= navigator.serviceWorker.register('./menu-sw.js').then(() => navigator.serviceWorker.ready).then(registration => registration.active).catch(() => null); }
  async function cacheMenuImage(url) { if (!/^https:\/\//i.test(url || '')) return; const worker = await menuWorker(); worker?.postMessage({type: 'cache-menu-image', url}); }
  async function refreshCafeteria(silent = false) {
    cafeteriaLoading = true; if (page === 'cafeteria') render();
    try {
      let r;
      try { r = await fetch(`https://kisj.kr/our/${state.division.toLowerCase()}crawl.php`, {cache: 'no-store'}); } catch { throw Error('The cafeteria API blocks browser access (CORS).'); }
      if (!r.ok) throw Error(`Cafeteria API returned HTTP ${r.status}.`);
      const data = await r.json(), urls = data.thisWeek?.length ? data.thisWeek : data.nextWeek || [];
      if (!urls.length) throw Error('No menu image is published for this week or next week.');
      const entry = urls.find(x => /kor|korean|kr|ko/i.test(JSON.stringify(x))) || urls[0], url = typeof entry === 'string' ? entry : Object.values(entry || {}).find(x => typeof x === 'string' && x.startsWith('http'));
      if (!url) throw Error('The cafeteria API returned no usable image URL.');
      const imageURL = new URL(url, 'https://kisj.kr/');
      if (imageURL.protocol !== 'https:') throw Error('The cafeteria API returned an insecure image URL.');
      state.cafeteria[state.division] = {image: imageURL.href, fetchedAt: new Date().toISOString()};
      cafeteriaError = ''; save(); cacheMenuImage(imageURL.href);
    } catch (error) { cafeteriaError = isOffline() ? "You're offline. The last saved menu is shown." : error.message; if (!silent) toast(cafeteriaError); }
    cafeteriaLoading = false;
    if (['cafeteria', 'today'].includes(page) && !sheetOpen()) render();
  }

  // Google Classroom
  const classroomKeys = item => {
    const keys = new Set();
    if (item?.classroomKey) keys.add(String(item.classroomKey));
    for (const key of item?.classroomKeys || []) if (key) keys.add(String(key));
    const course = item?.courseID || item?.courseId;
    const work = item?.courseworkID || item?.courseWorkId || item?.courseworkId;
    if (course && work) keys.add(`${course}:${work}`);
    if (item?.id) keys.add(`id:${item.id}`);
    if (item?.url) keys.add(`url:${item.url}`);
    return [...keys];
  };
  const classroomKey = item => classroomKeys(item)[0] || item?.id;
  function putTrash(type, item, title) {
    state.trash.unshift({id: uid(), type, item, title, deletedAt: new Date().toISOString()});
    if (type === 'homework') {
      state.dismissedClassroomKeys ||= [];
      for (const key of classroomKeys(item)) if (!state.dismissedClassroomKeys.includes(key)) state.dismissedClassroomKeys.push(key);
    }
    save();
  }
  async function syncGoogleHomework(silent = false) {
    if (!CampusGoogle.connected() || syncingClassroom) return;
    syncingClassroom = true; classroomError = ''; if (page === 'homework') render();
    try {
      const result = await CampusGoogle.homework();
      const incoming = new Map(result.homework.map(item => [classroomKey(item), item]));
      const deleted = new Set([...(state.dismissedClassroomKeys || []), ...state.trash.filter(t => t.type === 'homework').flatMap(t => classroomKeys(t.item))]);
      state.homework = state.homework.filter(item => {
        if (classroomKeys(item).some(candidate => deleted.has(candidate))) return false;
        return item.source !== 'google-classroom' || incoming.has(classroomKey(item));
      });
      for (const [key, item] of incoming) {
        if (!key || classroomKeys(item).some(candidate => deleted.has(candidate))) continue;
        const itemKeys = new Set(classroomKeys(item));
        const old = state.homework.find(h => classroomKeys(h).some(candidate => itemKeys.has(candidate)));
        if (old) Object.assign(old, item, {note: old.note || '', color: old.color || '#3c82c4', complete: old.complete});
        else state.homework.push({...item, note: '', color: '#3c82c4', complete: false});
      }
      state.googleLastSync = result.syncedAt || new Date().toISOString();
      classroomStatus = `Synced ${result.homework.length} Classroom assignments.`;
      save();
    } catch (error) { classroomError = isOffline() ? "You're offline. Classroom will sync when you're back online." : error.message || 'Google Classroom sync failed.'; classroomStatus = 'Google Classroom sync failed.'; if (!silent) toast(classroomError); }
    syncingClassroom = false;
    if (!sheetOpen()) render();
  }
  window.addEventListener('campus-google-connected', () => { state.googleReconnectRequired = false; classroomStatus = 'Connected. Syncing Google Classroom...'; save(); render(); syncGoogleHomework(); });
  window.addEventListener('campus-google-error', event => { classroomError = event.detail; classroomStatus = 'Google Classroom connection failed.'; render(); });
  function removeClassroomData() {
    const isClassroom = h => /google|classroom/i.test(h?.source || '');
    state.homework = state.homework.filter(h => !isClassroom(h));
    state.trash = state.trash.filter(t => !(t.type === 'homework' && isClassroom(t.item)));
    state.dismissedClassroomKeys = [];
    state.googleLastSync = null;
    CampusGoogle.disconnect(); save();
  }

  function restoreTrash(id) {
    const index = state.trash.findIndex(t => t.id === id); if (index < 0) return;
    const t = state.trash.splice(index, 1)[0];
    if (t.type === 'homework') {
      state.homework.push(t.item);
      const restoredKeys = new Set(classroomKeys(t.item));
      state.dismissedClassroomKeys = (state.dismissedClassroomKeys || []).filter(key => !restoredKeys.has(key));
    }
    if (t.type === 'event') state.events.push(t.item);
    if (t.type === 'template') { state.savedTemplates ||= []; state.savedTemplates.push(t.item); }
    if (t.type === 'class') {
      const {key, block} = t.item;
      if (key.startsWith('custom:')) { state.customDays[key.slice(7)] ??= {title: 'Custom Day', classes: []}; state.customDays[key.slice(7)].classes.push(block); if (key.slice(7) === overrideDate && !customDirty) loadCustomDraft(); }
      else if (key.startsWith('all:')) { for (const day of KEYS.filter(day => day.endsWith(key.slice(4)))) { state.schedules[day] ??= []; state.schedules[day].push({...block, id: uid()}); } }
      else { state.schedules[key] ??= []; state.schedules[key].push(block); }
    }
    save(); render();
  }

  function stepTime(target, part, delta) {
    const [kind, ...rest] = target.split('|');
    let obj, field;
    if (kind === 'club') { obj = state.club; field = rest[0]; }
    else { const [listKey, id, f] = rest; obj = listFor(listKey).find(c => c.id === id); field = f; }
    if (!obj) return;
    let [h, m] = String(obj[field] || '00:00').split(':').map(Number);
    if (part === 'h') h = Math.max(0, Math.min(23, h + delta)); else m = Math.max(0, Math.min(59, m + delta * 5));
    obj[field] = `${p2(h)}:${p2(m)}`;
    if (target.startsWith('class|draft|')) markDirty(); else save();
    render();
  }
  function setColor(target, value) {
    const color = value || null;
    if (target.startsWith('hw:')) { const h = state.homework.find(x => x.id === target.slice(3)); if (h) { h.color = color || ''; save(); } render(); }
    else if (target === 'event') { eventDraft.color = color; drawLayers(); }
    else if (target === 'bulk') { bulkColor = color; drawLayers(); }
  }

  // Menu image zoom: click zooms 3x into the clicked spot, drag pans, click again fits.
  // Same interaction as the KISJ cafeteria Chrome extension.
  const MENU_ZOOM = 3;
  let menuDrag = null;
  function toggleMenuZoom(view, event) {
    const inner = view.firstElementChild;
    if (view.classList.contains('zoomed')) {
      view.classList.remove('zoomed');
      inner.style.width = inner.style.height = '';
      view.title = 'Click to zoom in';
      view.scrollTo({top: 0, left: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
      return;
    }
    const rect = inner.getBoundingClientRect(), relX = (event.clientX - rect.left) / rect.width, relY = (event.clientY - rect.top) / rect.height;
    view.classList.add('zoomed');
    view.title = 'Drag to move · Click to zoom out';
    inner.style.width = `${rect.width * MENU_ZOOM}px`;
    inner.style.height = `${rect.height * MENU_ZOOM}px`;
    // Keep the clicked spot centered while the size transition runs.
    const started = performance.now();
    const follow = () => {
      const size = inner.getBoundingClientRect();
      view.scrollLeft = size.width * relX - view.clientWidth / 2;
      view.scrollTop = size.height * relY - view.clientHeight / 2;
      if (performance.now() - started < 320) requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
  }
  document.addEventListener('pointerdown', e => {
    const view = e.target.closest('[data-zoom-view]');
    if (!view || e.button !== 0) return;
    menuDrag = {view, x: e.clientX, y: e.clientY, left: view.scrollLeft, top: view.scrollTop, moved: false, zoomed: view.classList.contains('zoomed')};
  });
  document.addEventListener('pointermove', e => {
    if (!menuDrag || !menuDrag.zoomed || e.pointerType !== 'mouse') return;
    const dx = e.clientX - menuDrag.x, dy = e.clientY - menuDrag.y;
    if (!menuDrag.moved && Math.hypot(dx, dy) < 3) return;
    menuDrag.moved = true;
    menuDrag.view.classList.add('dragging');
    menuDrag.view.scrollLeft = menuDrag.left - dx;
    menuDrag.view.scrollTop = menuDrag.top - dy;
  });
  document.addEventListener('pointerup', e => {
    const drag = menuDrag;
    menuDrag = null;
    if (!drag) return;
    drag.view.classList.remove('dragging');
    // A drag that pans the image is not a click; touch scrolling is handled natively.
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6 && e.target.closest('[data-zoom-view]') === drag.view) toggleMenuZoom(drag.view, e);
  });
  document.addEventListener('pointercancel', () => { menuDrag?.view.classList.remove('dragging'); menuDrag = null; });

  // Events
  document.addEventListener('paste', e => {
    if (!e.target.closest('[data-paste-transfer]')) return;
    e.preventDefault();
    CampusTransfer.fromClipboardCode(e.clipboardData?.getData('text/plain') || '').then(snapshot => {
      closeLayer();
      presentTransfer({snapshot, error: null, unrequested: false, nonce: null});
    }, error => { pasteError = error.message; drawLayers(); });
  });
  document.addEventListener('paste', e => { const target = e.target.closest('[data-paste]'); if (!target) return; e.preventDefault(); parsePaste(target.dataset.paste, e.clipboardData?.getData('text/html') || e.clipboardData?.getData('text/plain') || ''); });
  document.addEventListener('input', e => {
    const t = e.target, bind = t.dataset.bind;
    if (t.dataset.colorTarget) return setColor(t.dataset.colorTarget, t.value.toUpperCase());
    switch (bind) {
      case 'class': { const c = listFor(t.dataset.list).find(x => x.id === t.dataset.id); if (!c) return; c[t.dataset.field] = t.value; if (t.dataset.list === 'draft') markDirty(); else save(); break; }
      case 'club-name': state.club.name = t.value; save(); render(); break;
      case 'custom-title': customTitle = t.value; markDirty(); break;
      case 'template-name': templateName = t.value; break;
      case 'hw-note': { const h = state.homework.find(x => x.id === t.dataset.id); if (h) { h.note = t.value; save(); } break; }
      case 'hw-draft': hwDraft[t.dataset.field] = t.value; drawLayers(); restoreFocus({key: t.dataset.fk, start: t.selectionStart, end: t.selectionEnd}); break;
      case 'event': { const wasSavable = Boolean(eventDraft.title.trim()); eventDraft[t.dataset.field] = t.value; if (t.dataset.field === 'category' || wasSavable !== Boolean(eventDraft.title.trim())) { drawLayers(); restoreFocus({key: t.dataset.fk, start: t.selectionStart, end: t.selectionEnd}); } break; }
    }
  });
  document.addEventListener('change', async e => {
    const t = e.target, bind = t.dataset.bind;
    if (t.classList.contains('sync-file')) { const file = t.files?.[0]; if (file) { if (file.size > 3_000_000) return toast('HTML file is too large.'); parsePaste(t.dataset.kind, await file.text()); } return; }
    if (t.id === 'override-date') {
      const next = validDate(t.value); if (!next) return render();
      guardCustom(() => { overrideDate = next; loadCustomDraft(); render(); }, render);
      return;
    }
    if (t.id === 'backup-file') {
      const file = t.files?.[0]; if (!file) return;
      try {
        const value = JSON.parse(await file.text());
        if (value.version !== 1 || !Array.isArray(value.homework) || !value.schedules || typeof value.schedules !== 'object') throw Error('Invalid Campus backup');
        openAlert('Replace all local Campus data?', 'This replaces everything saved in this browser with the backup file.', [{label: 'Replace Data', role: 'default destructive', run: () => { state = {...defaults(), ...value}; save(); closeAllLayers(); render(); toast('Backup restored.'); }}, {label: 'Cancel'}]);
      } catch (error) { toast(error.message); }
      return;
    }
    switch (bind) {
      case 'club-enabled': state.club.enabled = t.checked; save(); render(); break;
      case 'club-day': { const day = Number(t.value); state.club.days = t.checked ? [...new Set([...state.club.days, day])].sort() : state.club.days.filter(d => d !== day); save(); render(); break; }
      case 'event-date': { const v = validDate(t.value); if (!v) break; eventDraft[t.dataset.field] = v; if (eventDraft.end && eventDraft.end < eventDraft.start) eventDraft.end = eventDraft.start; drawLayers(); break; }
      case 'event-range': eventDraft.end = t.checked ? eventDraft.start : ''; drawLayers(); break;
      case 'event-noschool': eventDraft.type = t.checked ? 'break' : 'info'; drawLayers(); break;
    }
  });
  document.addEventListener('click', e => { for (const open of document.querySelectorAll('details.menu[open]')) if (!open.contains(e.target)) open.open = false; }, true);
  document.addEventListener('click', async e => {
    const t = e.target.closest('[data-nav],[data-action],#settings-button,#mobile-menu');
    if (!t || t.disabled) return;
    if (t.dataset.nav) { const target = t.dataset.nav; guardCustom(() => go(target)); return; }
    if (t.id === 'settings-button') { openSheet(settingsSheet, 'settings'); return; }
    if (t.id === 'mobile-menu') { $('.sidebar').classList.toggle('open'); return; }
    const a = t.dataset.action, id = t.dataset.id, value = t.dataset.value;
    t.closest('details.menu')?.removeAttribute('open');
    switch (a) {
      case 'close': closeLayer(); if (!layers.length) render(); break;
      case 'alert': { const layer = layers.at(-1); closeLayer(); layer.buttons[Number(t.dataset.index)]?.run?.(); break; }
      case 'import-from-app': try { CampusTransfer.requestAppExport(); } catch (error) { toast(error.message); } break;
      case 'hide-app-promo': hideAppPromo(); break;
      case 'send-to-app': hideAppPromo(); CampusTransfer.linkForApp(state).then(({url}) => { location.href = url; }, error => toast(error.message)); break;
      case 'import-via-clipboard': importViaClipboard(); break;

      case 'appearance': state.appearance = value; save(); render(); break;
      case 'setup-division': case 'division': state.division = value; if (a === 'setup-division') state.club.enabled = value === 'MS'; save(); render(); refreshCalendar(true); if (a === 'division') refreshCafeteria(true); break;
      case 'setup-next': if (setupStep() === 0) state.club.enabled = state.division === 'MS'; state.setupStep = Math.min(3, setupStep() + 1); save(); render(); break;
      case 'setup-back': state.setupStep = Math.max(0, setupStep() - 1); save(); render(); break;
      case 'setup-finish': state.setupComplete = true; state.setupStep = 3; save(); go('today'); refreshCafeteria(true); break;
      case 'show-day': openSheet(daySchedule, 'day-sheet'); break;
      case 'original-menu': openSheet(originalMenu, 'menu-sheet'); break;
      case 'sync': openSync(); break;
      case 'read-clipboard': try { const items = await navigator.clipboard.read(); let html = ''; for (const item of items) { if (item.types.includes('text/html')) { html = await (await item.getType('text/html')).text(); break; } if (item.types.includes('text/plain')) html = await (await item.getType('text/plain')).text(); } parsePaste(t.dataset.kind, html); } catch { toast('Clipboard access was blocked. Click the paste box and press ⌘V or Ctrl+V.'); } break;
      case 'fallback-weekday': fallbackWeekday = Number(value); render(); break;
      case 'fallback-day': fallbackDay = value; render(); break;
      case 'sync-save': saveSync(); break;
      case 'manual-start': enteringManually = true; render(); break;
      case 'schedule-select': { if (value === scheduleSelection) break; guardCustom(() => { scheduleSelection = value; if (value === 'custom') loadCustomDraft(); render(); }); break; }
      case 'weekday': weekday = Number(value); render(); break;
      case 'class-add': {
        const block = {id: uid(), subject: 'New Class', teacher: '', room: '', start: '09:00', end: '09:50', color: ''};
        if (scheduleSelection === 'custom') { customDraft.push(block); customDirty = true; }
        else { listFor(selectedKey()).push(block); save(); }
        render(); break;
      }
      case 'class-delete': {
        const listKey = t.dataset.list, list = listFor(listKey), index = list.findIndex(c => c.id === id);
        if (index < 0) break;
        const block = list.splice(index, 1)[0];
        if (listKey === 'draft') customDirty = true; else putTrash('class', {key: listKey, block}, block.subject);
        render(); break;
      }
      case 'time-step': stepTime(t.dataset.target, t.dataset.part, Number(t.dataset.delta)); break;
      case 'template-save': {
        state.savedTemplates ||= [];
        state.savedTemplates.unshift({id: uid(), name: templateName.trim() || 'Saved Schedule', classes: byStart(visibleSchedule()).map(c => ({...c, id: uid()}))});
        templateName = ''; save(); render(); break;
      }
      case 'template-load': {
        const template = state.savedTemplates.find(x => x.id === id); if (!template) break;
        const classes = template.classes.map(c => ({...c, id: uid()}));
        if (scheduleSelection === 'custom') { customDraft = classes; customTitle = template.name; customDirty = true; }
        else { state.schedules[selectedKey()] = classes; save(); }
        render(); break;
      }
      case 'template-delete': { const index = state.savedTemplates.findIndex(x => x.id === id); if (index >= 0) { const template = state.savedTemplates.splice(index, 1)[0]; putTrash('template', template, template.name); render(); } break; }
      case 'override-today': { const next = dateKey(); if (next === overrideDate) break; guardCustom(() => { overrideDate = next; loadCustomDraft(); render(); }); break; }
      case 'override-pick': { const next = t.dataset.date; if (next === overrideDate) break; guardCustom(() => { overrideDate = next; loadCustomDraft(); render(); }); break; }
      case 'custom-save': saveCustomDraft(); render(); break;
      case 'custom-delete': delete state.customDays[overrideDate]; save(); loadCustomDraft(); render(); break;
      case 'hw-status': showingCompleted = value === 'done'; selecting = false; selection.clear(); render(); break;
      case 'hw-new': { const due = new Date(Date.now() + 86400000), p = parts(due); hwDraft = {title: '', subject: '', due: `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`, shortcut: '', note: ''}; openSheet(manualEditor, 'manual-sheet'); break; }
      case 'hw-add': {
        const d = hwDraft, url = shortcutURL(d.shortcut);
        if (!d.title.trim() || url === false || !d.due) break;
        state.homework.push({id: uid(), title: d.title.trim(), subject: d.subject.trim(), due: new Date(`${d.due}:00+09:00`).toISOString(), url: url || '', note: d.note.trim(), color: '', complete: false, source: 'manual'});
        save(); closeLayer(); render(); break;
      }
      case 'hw-detail': openSheet(assignmentDetail(id), 'detail'); break;
      case 'hw-toggle': { const h = state.homework.find(x => x.id === id); if (!h) break; lastCompletedId = h.complete ? null : h.id; h.complete = !h.complete; save(); render(); break; }
      case 'hw-undo': { const h = state.homework.find(x => x.id === lastCompletedId); if (h) h.complete = false; lastCompletedId = null; save(); render(); break; }
      case 'hw-trash': { const index = state.homework.findIndex(h => h.id === id); if (index >= 0) { const item = state.homework.splice(index, 1)[0]; putTrash('homework', item, item.title); selection.delete(id); render(); } break; }
      case 'select-start': selecting = true; selection.clear(); render(); break;
      case 'select-end': selecting = false; selection.clear(); render(); break;
      case 'select-all': { const list = visibleAssignments(); if (selection.size === list.length) selection.clear(); else list.forEach(h => selection.add(h.id)); render(); break; }
      case 'hw-select': selection.has(id) ? selection.delete(id) : selection.add(id); render(); break;
      case 'bulk-color': bulkColor = null; openSheet(bulkColorSheet, 'bulk-sheet'); break;
      case 'bulk-color-apply': for (const h of state.homework) if (selection.has(h.id)) h.color = bulkColor || ''; save(); closeLayer(); render(); break;
      case 'bulk-trash': openAlert('Move selected homework to Trash?', 'You can restore these assignments from Trash.', [{label: 'Move to Trash', role: 'default destructive', run: () => { state.homework = state.homework.filter(h => { if (!selection.has(h.id)) return true; putTrash('homework', h, h.title); return false; }); selecting = false; selection.clear(); save(); render(); }}, {label: 'Cancel'}]); break;
      case 'google-connect': classroomError = ''; classroomStatus = 'Opening Google sign in...'; render(); CampusGoogle.connect(); break;
      case 'google-sync': syncGoogleHomework(); break;
      case 'google-disconnect': CampusGoogle.disconnect(); classroomStatus = ''; classroomError = ''; render(); break;
      case 'google-switch': openAlert('Connect a different Google account?', 'Campus will remove the current Google sign-in and imported Classroom homework, including Classroom items in Trash. Manual homework will stay.', [{label: 'Remove & Connect', role: 'default destructive', run: () => { removeClassroomData(); classroomStatus = 'Opening Google sign in...'; render(); CampusGoogle.connect(); }}, {label: 'Cancel'}]); break;
      case 'month-prev': case 'month-next': { const [year, month] = monthView.split('-').map(Number); monthView = new Date(Date.UTC(year, month - 1 + (a === 'month-next' ? 1 : -1), 1)).toISOString().slice(0, 7); render(); break; }
      case 'month-today': monthView = dateKey().slice(0, 7); render(); break;
      case 'calendar-refresh': refreshCalendar(); break;
      case 'event-new': openEventEditor(); break;
      case 'event-edit': openEventEditor(id); break;
      case 'event-category': eventDraft.category = value; drawLayers(); break;
      case 'event-save': saveEvent(); break;
      case 'event-trash': { const index = state.events.findIndex(x => x.id === eventDraft?.id); if (index >= 0) { const item = state.events.splice(index, 1)[0]; putTrash('event', item, item.title); } closeLayer(); render(); break; }
      case 'pick-color': setColor(t.dataset.target, t.dataset.hex); break;
      case 'cafe-refresh': refreshCafeteria(); break;
      case 'trash-filter': trashFilter = value || null; render(); break;
      case 'trash-restore': restoreTrash(id); break;
      case 'trash-delete': state.trash = state.trash.filter(x => x.id !== id); if (trashFilter && !state.trash.some(x => trashKind(x)[0] === trashFilter)) trashFilter = null; save(); render(); break;
      case 'trash-clear': openAlert('Empty the trash?', `${state.trash.length} items will be deleted permanently. This cannot be undone.`, [{label: 'Delete All Forever', role: 'default destructive', run: () => { state.trash = []; trashFilter = null; save(); render(); }}, {label: 'Cancel'}]); break;
      case 'reset-data': openAlert('Delete all Campus data?', 'This cannot be undone. The first-time setup guide will appear the next time you open Campus.', [{label: 'Delete Data', role: 'default destructive', run: () => { localStorage.removeItem(KEY); CampusGoogle.disconnect(); state = defaults(); closeAllLayers(); go('today'); }}, {label: 'Cancel'}]); break;
      case 'export-data': { const blob = new Blob([JSON.stringify(state, null, 2)], {type: 'application/json'}), url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `campus-backup-${dateKey()}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 5000); break; }
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && layers.length && !layers.at(-1).alert) { closeLayer(); render(); } });
  window.addEventListener('hashchange', () => { const next = location.hash.slice(1); if (pages.some(p => p[0] === next) && next !== page) { page = next; render(); } });
  window.addEventListener('resize', () => { if (page === 'calendar') render(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (state.appearance === 'system') theme(); });

  render();
  if (unreadableData) openAlert('Campus couldn\'t read its saved data', 'The data saved in this browser was damaged, so Campus started empty. The original was kept as a copy and will not be overwritten. You can bring your data back from Campus for Mac or a backup.', [{label: 'OK', role: 'default'}]);
  if (openSettingsOnLoad && state.setupComplete) { history.replaceState(null, '', '#today'); openSheet(settingsSheet, 'settings'); }
  function applyTransfer() {
    if (!pendingTransfer) return;
    try {
      const previous = state;
      state = CampusTransfer.toWebState(pendingTransfer, state);
      state.setupComplete = true; state.setupStep = 3;
      if (!save()) { state = previous; return; }
      CampusGoogle.disconnect();
      if (pendingTransferNonce) try { CampusTransfer.markUsed(pendingTransferNonce); } catch {}
      hideAppPromo();
      pendingTransfer = null; pendingTransferNonce = null; closeAllLayers(); go('homework'); toast('Mac data imported. Connect Google Classroom again to resume syncing.');
    } catch (error) { toast(error.message); }
  }
  function presentTransfer(receivedTransfer) {
    if (receivedTransfer?.error) {
      // A link cut short on the way here: the clipboard carries everything instead.
      if (/cut off/.test(receivedTransfer.error)) {
        openAlert('The transfer was cut off', `${receivedTransfer.error} Import everything through the clipboard instead? Nothing is left out that way.`,
          [{label: 'Import via Clipboard', role: 'default', run: importViaClipboard}, {label: 'Cancel'}]);
      } else openAlert('Campus transfer failed', receivedTransfer.error, [{label: 'OK', role: 'default'}]);
      return;
    }
    if (!receivedTransfer?.snapshot) return;
    pendingTransfer = receivedTransfer.snapshot;
    pendingTransferNonce = receivedTransfer.nonce;
    const snapshot = pendingTransfer;
    const count = Object.values(snapshot.schedules).reduce((total, classes) => total + classes.length, 0);
    const cancel = {label: 'Cancel', run: () => { pendingTransfer = null; pendingTransferNonce = null; }};
    const summary = `${count} classes, ${snapshot.homework.length} homework items, ${snapshot.trash?.length || 0} Trash items, ${snapshot.events.length} calendar events and ${Object.keys(snapshot.customDays).length} custom days`;
    const warning = receivedTransfer.unrequested ? 'This browser did not start the transfer. Continue only if you just approved sending from your Mac. ' : '';
    if (Number(snapshot.omitted) > 0) {
      // The link couldn't carry everything: recommend the clipboard, which leaves nothing out.
      openAlert('Some items didn\'t fit', `${warning}${snapshot.omitted} older items were left out to fit the transfer link. Import everything through the clipboard instead? Otherwise this browser's data is replaced with the ${summary} that fit. Google sign-in will be disconnected; sign in again here after import.`, [
        {label: 'Import Everything via Clipboard', role: 'default', run: () => { pendingTransfer = null; pendingTransferNonce = null; importViaClipboard(); }},
        {label: 'Replace Without Them', role: 'destructive', run: applyTransfer}, cancel]);
      return;
    }
    openAlert('Import from Campus for Mac?',
      `${warning}Replace this browser's schedules, homework, Trash, custom days, club and personal calendar events with ${summary}. Google sign-in will be disconnected; sign in again here after import.`,
      [{label: 'Replace Data', role: 'default destructive', run: applyTransfer}, cancel]);
  }
  CampusTransfer.receiveIncoming().then(presentTransfer);
  if (!state.remoteUpdated || Date.now() - new Date(state.remoteUpdated).getTime() > 3600000) refreshCalendar(true);
  menuWorker().then(worker => { if (worker) Object.values(state.cafeteria).forEach(menuImage => cacheMenuImage(menuImage?.image)); });
  if (state.setupComplete) refreshCafeteria(true);
  if (state.setupComplete && CampusGoogle.connected()) syncGoogleHomework(true);
  // Anything that failed while offline refreshes as soon as the connection is back.
  window.addEventListener('online', () => {
    refreshCalendar(true);
    if (!state.setupComplete) return;
    refreshCafeteria(true);
    if (CampusGoogle.connected()) syncGoogleHomework(true);
  });
  setInterval(() => {
    if (page === 'today' && state.setupComplete && !sheetOpen()) { render(); return; }
    for (const el of document.querySelectorAll('[data-badge]')) {
      const h = state.homework.find(x => x.id === el.dataset.badge); if (!h) continue;
      const [text, tone] = badgeInfo(h);
      if (el.textContent !== text) el.textContent = text;
      el.className = `deadline ${tone}`;
    }
  }, 1000);
  setInterval(() => { if (!state.remoteUpdated || Date.now() - new Date(state.remoteUpdated).getTime() > 3600000) refreshCalendar(true); }, 60000);
  setInterval(() => { if (CampusGoogle.connected()) syncGoogleHomework(true); }, 3600000);
  setInterval(() => { if (state.setupComplete) refreshCafeteria(true); }, 3600000);
})();
