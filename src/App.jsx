import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  ArrowRight, Check, CheckCircle2, ChevronRight, Clock3,
  FileSpreadsheet, Flag, KeyRound, LockKeyhole, LogOut, Search, ShieldCheck,
  Smartphone, Upload, Users, UserRoundCheck, X, AlertCircle, Download,
} from 'lucide-react';

const COLUMNS = ['Company / Sponsor', 'Full Name', 'VIP', 'Shirt Size', 'Email', 'Cell', 'Notes'];
const STORAGE_KEY = 'golf-legacy-roster-v1';
const ADMIN_SESSION_KEY = 'golf-legacy-admin-session';
// Demo-only password gate. Replace with server-side authentication before public deployment.
const DEMO_ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME || 'admin';
const DEMO_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'LegacyDemo!4827';

function normalizePhone(value = '') { return String(value).replace(/\D/g, ''); }
function clean(value) { return value == null ? '' : String(value).trim(); }
function isVip(value) { return /^(yes|y|true|vip|1)$/i.test(clean(value)); }
function makeId() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function readRoster() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function mapSheetRows(rows) {
  return rows.map((row) => {
    const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), value]));
    const get = (heading) => normalized[heading.toLowerCase()];
    const name = clean(get('Full Name'));
    if (!name) return null;
    return {
      id: makeId(), company: clean(get('Company / Sponsor')), name,
      vip: isVip(get('VIP')), vipLabel: clean(get('VIP')), shirtSize: clean(get('Shirt Size')),
      email: clean(get('Email')), cell: clean(get('Cell')), notes: clean(get('Notes')),
      checkedIn: false, checkedInAt: null,
    };
  }).filter(Boolean);
}
function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function Brand({ compact = false }) {
  return <div className={`brand ${compact ? 'brand-compact' : ''}`}>
    <div className="brand-mark"><Flag size={28} strokeWidth={1.7} /></div>
    <div className="brand-copy"><div className="brand-name">MICHAEL FINLEY</div><div className="brand-sub">FOUNDATION</div></div>
    {!compact && <><div className="brand-divider" /><div className="brand-system"><strong>LEGACY INVITATIONAL</strong><span>PLAYER CHECK-IN</span></div></>}
  </div>;
}

function Header({ admin, onAdmin, onExit }) {
  return <header className="topbar"><Brand /><div className="topbar-right">
    <div className="event-chip"><span className="live-dot" /> CHECK-IN OPEN</div>
    {admin ? <button className="top-action" onClick={onExit}><LogOut size={16} /> Sign out</button> : <button className="top-action" onClick={onAdmin}><LockKeyhole size={16} /> Admin</button>}
  </div></header>;
}

const FORM_STORAGE_KEY = 'golf-legacy-contact-forms-v1';

const GUEST_TYPES = [
  { id: 'celebrity', label: 'Celebrity / Guest', short: 'CELEBRITY', description: 'For celebrities and invited guests' },
  { id: 'vip', label: 'VIP', short: 'VIP', description: 'For VIP guests and their representatives' },
  { id: 'general', label: 'General Admission', short: 'GENERAL ADMISSION', description: 'For golfers and general guests' },
];

function GuestContactForm({ players, setPlayers, guestType, setGuestType, onContinue }) {
  const [values, setValues] = useState({});
  const [error, setError] = useState('');
  const update = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const selectedType = GUEST_TYPES.find((type) => type.id === guestType) || GUEST_TYPES[2];
  const contactMethodOptions = guestType === 'celebrity'
    ? ['Manager', 'Agent', 'Assistant', 'Publicist', 'Self', 'Other']
    : guestType === 'vip'
      ? ['Me', 'My manager or agent', 'My assistant or representative', 'Someone else']
      : ['Email', 'Call or text', 'Through my team captain or company'];

  const submit = (event) => {
    event.preventDefault();
    setError('');
    const guestName = values.guestName?.trim();
    const email = values.email?.trim();
    const consent = values.consent === true;
    if (!guestName || !email || !consent) {
      setError('Please complete all required fields and check the permission box.');
      return;
    }
    if (guestType === 'celebrity' && (!values.contactPerson?.trim() || !values.contactRelationship)) {
      setError('Please add the best contact person and their relationship.'); return;
    }
    if (guestType === 'vip' && (!values.invitationRecipient || !values.contactPerson?.trim())) {
      setError('Please choose who should receive invitations and enter the contact person’s name.'); return;
    }
    if (guestType === 'general' && !values.contactPreference) {
      setError('Please choose how you would prefer to be contacted.'); return;
    }

    const company = guestType === 'vip' ? (values.organization || '') : guestType === 'general' ? (values.companyTeam || '') : '';
    const notes = JSON.stringify({ guestType: selectedType.label, ...values });
    const key = `${guestName.toLowerCase()}|${normalizePhone(values.phone || '')}`;
    let player = players.find((p) => `${p.name.toLowerCase()}|${normalizePhone(p.cell || '')}` === key);
    if (player) {
      player = { ...player, company: company || player.company, email: email || player.email, cell: values.phone || player.cell, guestType: selectedType.label, vip: guestType === 'vip' || player.vip, vipLabel: guestType === 'vip' ? 'Yes' : (player.vipLabel || ''), contactForm: values };
      setPlayers((current) => current.map((p) => p.id === player.id ? player : p));
    } else {
      player = { id: makeId(), company, name: guestName, vip: guestType === 'vip', vipLabel: guestType === 'vip' ? 'Yes' : '', shirtSize: '', email, cell: values.phone || '', notes, guestType: selectedType.label, contactForm: values, checkedIn: false, checkedInAt: null };
      setPlayers((current) => [...current, player]);
    }
    try {
      const submissions = JSON.parse(localStorage.getItem(FORM_STORAGE_KEY) || '[]');
      submissions.push({ id: makeId(), guestType: selectedType.label, submittedAt: new Date().toISOString(), ...values });
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(submissions));
    } catch { /* The roster record still allows this guest to continue. */ }
    onContinue(player);
  };

  const field = (label, key, options = {}) => <label className="contact-field" key={key}>
    <span>{label}{options.required && <b> *</b>}</span>
    {options.options ? <select value={values[key] || ''} required={options.required} onChange={(e) => update(key, e.target.value)}>
      <option value="">Select an option</option>{options.options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select> : <input type={options.type || 'text'} value={values[key] || ''} required={options.required} placeholder={options.placeholder || ''} autoComplete={options.autoComplete || 'on'} onChange={(e) => update(key, e.target.value)} />}
  </label>;

  return <main className="public-main contact-main">
    <section className="welcome-copy"><div className="eyebrow"><span className="eyebrow-line" /> THE MICHAEL FINLEY FOUNDATION <span className="eyebrow-line" /></div>
      <h1>Stay <em>connected.</em></h1><p>Choose your guest type and share the best contact information for future Foundation invitations. Then you can check in for today’s event.</p>
    </section>
    <section className="contact-card">
      <div className="guest-tabs" role="tablist" aria-label="Guest type">
        {GUEST_TYPES.map((type) => <button type="button" role="tab" aria-selected={guestType === type.id} className={`guest-tab ${guestType === type.id ? 'guest-tab-active' : ''}`} key={type.id} onClick={() => { setGuestType(type.id); setValues({}); setError(''); }}>
          <strong>{type.label}</strong><span>{type.description}</span>
        </button>)}
      </div>
      <div className="contact-form-heading"><span className="form-step">STEP 1 OF 2</span><h2>{guestType === 'celebrity' ? 'Celebrity & invited guest' : guestType === 'vip' ? 'VIP contact information' : 'Golfer & general admission'}</h2><p>Fields marked <b>*</b> are required. This takes about one minute.</p></div>
      <form className="contact-form" onSubmit={submit}>
        {guestType === 'celebrity' ? <>
          {field('Your name (celebrity or invited guest)', 'guestName', { required: true, autoComplete: 'name' })}
          {field('Best person to contact for future event invitations', 'contactPerson', { required: true, placeholder: 'You, manager, agent, assistant, or publicist' })}
          {field('This person is my…', 'contactRelationship', { required: true, options: contactMethodOptions })}
          {field('Best email address for invitations', 'email', { required: true, type: 'email', autoComplete: 'email' })}
          {field('Phone number (optional)', 'phone', { type: 'tel', autoComplete: 'tel' })}
        </> : guestType === 'vip' ? <>
          {field('Your name', 'guestName', { required: true, autoComplete: 'name' })}
          {field('Organization or affiliation (optional)', 'organization')}
          {field('Who should receive future invitations?', 'invitationRecipient', { required: true, options: contactMethodOptions })}
          {field('Name of the best contact person', 'contactPerson', { required: true, placeholder: 'You or your representative' })}
          {field('Best email for future invitations', 'email', { required: true, type: 'email', autoComplete: 'email' })}
          {field('Contact phone number (optional)', 'phone', { type: 'tel', autoComplete: 'tel' })}
          {field('Preferred way to receive an invitation', 'contactPreference', { options: ['Email', 'Call or text', 'Through my representative'] })}
        </> : <>
          {field('Full name', 'guestName', { required: true, autoComplete: 'name' })}
          {field('Company or golf team (optional)', 'companyTeam')}
          {field('Best email address', 'email', { required: true, type: 'email', autoComplete: 'email' })}
          {field('Phone number (optional)', 'phone', { type: 'tel', autoComplete: 'tel' })}
          {field('How would you prefer we contact you?', 'contactPreference', { required: true, options: contactMethodOptions })}
          {field('Team captain or company contact (optional)', 'teamContact')}
          <fieldset className="interest-field"><legend>Which future opportunities would interest you? (optional)</legend>
            {['Legacy Golf Invitational', 'Poker Challenge and other fundraisers', 'Sponsorship opportunities', 'Volunteering and supporting G.I.F.T.4.S. Academy'].map((item) => <label key={item} className="checkbox-option"><input type="checkbox" checked={(values.interests || []).includes(item)} onChange={(e) => update('interests', e.target.checked ? [...(values.interests || []), item] : (values.interests || []).filter((value) => value !== item))} /><span>{item}</span></label>)}
          </fieldset>
        </>}
        <label className="consent-box"><input type="checkbox" checked={values.consent === true} onChange={(e) => update('consent', e.target.checked)} /><span>{guestType === 'celebrity' ? 'I confirm this is the appropriate contact and The Michael Finley Foundation may reach out about future event invitations.' : 'Yes, The Michael Finley Foundation may contact me or my designated representative about future events.'} <b>*</b></span></label>
        {error && <div className="inline-error"><AlertCircle size={16} /> {error}</div>}
        <button className="primary-button wide-button" type="submit">Submit form & continue to check-in <ArrowRight size={17} /></button>
        <p className="form-privacy"><ShieldCheck size={15} /> Your details will be used for Foundation invitations and related event communication.</p>
      </form>
    </section>
  </main>;
}

function CheckInApp({ players, setPlayers, initialPlayer, onBackToForm }) {
  const [query, setQuery] = useState(initialPlayer?.name || '');
  const [selected, setSelected] = useState(initialPlayer || null);
  const [success, setSuccess] = useState(null);
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { if (initialPlayer) { setQuery(initialPlayer.name); setSelected(initialPlayer); } }, [initialPlayer]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const phoneQuery = normalizePhone(q);
    return players.filter((player) => {
      const nameMatch = player.name.toLowerCase().includes(q);
      const companyMatch = player.company.toLowerCase().includes(q);
      const phone = normalizePhone(player.cell);
      const phoneMatch = phoneQuery.length >= 3 && phone.includes(phoneQuery);
      return nameMatch || companyMatch || phoneMatch;
    }).slice(0, 8);
  }, [players, query]);
  const selectPlayer = (player) => { setSelected(player); setMessage(''); setSuccess(null); };
  const confirmCheckIn = () => {
    if (!selected) return;
    const latest = players.find((p) => p.id === selected.id) || selected;
    if (latest.checkedIn) { setMessage('This guest is already checked in. Please see an event team member if you need help.'); return; }
    const stamp = new Date().toISOString();
    const updated = players.map((p) => p.id === latest.id ? { ...p, checkedIn: true, checkedInAt: stamp } : p);
    setPlayers(updated); setSuccess(updated.find((p) => p.id === latest.id)); setSelected(null); setQuery(''); setMessage('');
  };
  const startOver = () => { setSuccess(null); setSelected(null); setQuery(''); setMessage(''); onBackToForm(); };
  return <main className="public-main">
    <section className="welcome-copy"><div className="eyebrow"><span className="eyebrow-line" /> WELCOME TO THE INVITATIONAL <span className="eyebrow-line" /></div>
      <h1>{success ? <>You're on<br /><em>the list.</em></> : <>Let's get you<br /><em>checked in.</em></>}</h1>
      <p>{success ? 'Your arrival has been recorded. Enjoy the day.' : 'Your contact form is saved. Confirm your registration below to finish check-in.'}</p>
    </section>
    {success ? <section className="success-card" aria-live="polite"><div className="success-icon"><Check size={34} /></div><div className="success-kicker">CHECK-IN CONFIRMED</div><h2>Welcome, {success.name.split(' ')[0]}!</h2><p>Your check-in is complete.</p>{success.company && <div className="success-detail">{success.company}</div>}<div className="success-time"><Clock3 size={16} /> Checked in at {formatTime(success.checkedInAt)}</div><button className="primary-button wide-button" onClick={startOver}>Start another check-in <ArrowRight size={17} /></button></section> : <section className="lookup-card">
      <div className="checkin-step-label"><span className="form-step">STEP 2 OF 2</span><button type="button" className="text-button" onClick={onBackToForm}>← Back to contact form</button></div>
      <label htmlFor="player-search" className="field-label">FIND YOUR REGISTRATION</label>
      <div className="lookup-input-wrap"><Search size={21} /><input ref={inputRef} id="player-search" value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null); setMessage(''); }} placeholder="Enter your name or cell number" autoComplete="off" /><button className="clear-search" onClick={() => { setQuery(''); setSelected(null); inputRef.current?.focus(); }} aria-label="Clear search">{query && <X size={17} />}</button></div>
      {selected ? <div className="selected-player"><div className="player-avatar">{selected.name.split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase()}</div><div className="selected-copy"><strong>{selected.name}</strong><span>{selected.company || selected.guestType || 'Registered guest'}{selected.vip ? ' · VIP' : ''}</span></div><button className="change-button" onClick={() => setSelected(null)}>Change</button>{selected.checkedIn && <div className="already-notice"><CheckCircle2 size={17} /> Already checked in at {formatTime(selected.checkedInAt)}</div>}{message && <div className="inline-error"><AlertCircle size={16} /> {message}</div>}<button className="primary-button wide-button" onClick={confirmCheckIn} disabled={selected.checkedIn}>{selected.checkedIn ? 'Already checked in' : 'Confirm my check-in'} {!selected.checkedIn && <ArrowRight size={17} />}</button></div> : !query.trim() ? <div className="lookup-hint"><Smartphone size={17} /><span>Search by name or mobile number to select your registration.</span></div> : <div className="results-list">{matches.length ? <><div className="results-label">{matches.length === 1 ? '1 MATCH FOUND' : `${matches.length} MATCHES FOUND`} <span>SELECT YOUR NAME</span></div>{matches.map((player) => <button className="result-row" key={player.id} onClick={() => selectPlayer(player)}><div className="player-avatar">{player.name.split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase()}</div><div className="result-copy"><strong>{player.name}</strong><span>{player.company || player.guestType || 'Registered guest'}{player.vip ? ' · VIP' : ''}</span></div>{player.checkedIn ? <span className="checked-pill"><CheckCircle2 size={14} /> Checked in</span> : <ChevronRight size={20} className="result-chevron" />}</button>)}</> : <div className="no-results"><Search size={22} /><strong>No registration found yet</strong><span>Try a different spelling or your full mobile number.</span></div>}</div>}
    </section>}
    <div className="privacy-note"><ShieldCheck size={16} /><span>Your contact details are used for Foundation communication and event check-in.</span></div>
  </main>;
}

function AdminLogin({ onLogin, onBack }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (username.trim() === DEMO_ADMIN_USERNAME && password === DEMO_ADMIN_PASSWORD) onLogin();
    else setError('That username or password didn’t match. Please try again.');
  };
  return <main className="admin-login-wrap"><section className="admin-login-card"><div className="admin-lock"><KeyRound size={25} /></div><div className="eyebrow">RESTRICTED ACCESS</div><h1>Admin <em>sign in.</em></h1><p>Sign in to manage the player roster and attendance.</p><form onSubmit={submit}><label htmlFor="admin-username" className="field-label">USERNAME</label><input id="admin-username" type="text" value={username} onChange={(e) => { setUsername(e.target.value); setError(''); }} placeholder="Enter username" autoComplete="username" /><label htmlFor="admin-password" className="field-label">PASSWORD</label><input id="admin-password" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} placeholder="Enter admin password" autoComplete="current-password" />{error && <div className="inline-error"><AlertCircle size={16} /> {error}</div>}<button className="primary-button wide-button" type="submit">Open admin dashboard <ArrowRight size={17} /></button></form><button className="text-button" onClick={onBack}>← Back to player check-in</button><div className="demo-note">Demo username: <code>admin</code><br />Demo password: <code>LegacyDemo!4827</code><br />Set <code>VITE_ADMIN_USERNAME</code> and <code>VITE_ADMIN_PASSWORD</code> to change them locally.</div></section></main>;
}

function AdminDashboard({ players, setPlayers }) {
  const fileRef = useRef(null); const [search, setSearch] = useState(''); const [contactSubmissions] = useState(() => { try { return JSON.parse(localStorage.getItem(FORM_STORAGE_KEY) || '[]'); } catch { return []; } }); const [notice, setNotice] = useState(''); const [error, setError] = useState(''); const [importSummary, setImportSummary] = useState(null);
  const checkedCount = players.filter((p) => p.checkedIn).length;
  const filtered = players.filter((p) => [p.name, p.company, p.cell, p.email].some((v) => clean(v).toLowerCase().includes(search.toLowerCase())));
  const handleFile = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    setNotice(''); setError(''); setImportSummary(null);
    try {
      const bytes = await file.arrayBuffer();
      const workbook = XLSX.read(bytes, { type: 'array', cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '', raw: false });
      if (!rawRows.length) throw new Error('This spreadsheet appears to be empty.');
      const headers = Object.keys(rawRows[0]).map((h) => h.trim().toLowerCase());
      const missing = COLUMNS.filter((c) => !headers.includes(c.toLowerCase()));
      if (missing.length) throw new Error(`Missing required column headings: ${missing.join(', ')}. Please use the seven headings from your template.`);
      const imported = mapSheetRows(rawRows);
      if (!imported.length) throw new Error('No rows with a Full Name were found.');
      const existingCheckedByKey = new Map(players.filter((p) => p.checkedIn).map((p) => [`${p.name.toLowerCase()}|${normalizePhone(p.cell)}`, p]));
      const finalRows = imported.map((p) => { const old = existingCheckedByKey.get(`${p.name.toLowerCase()}|${normalizePhone(p.cell)}`); return old ? { ...p, checkedIn: true, checkedInAt: old.checkedInAt } : p; });
      const dupes = new Set(); const unique = finalRows.filter((p) => { const key = `${p.name.toLowerCase()}|${normalizePhone(p.cell)}`; if (dupes.has(key)) return false; dupes.add(key); return true; });
      setPlayers(unique); setImportSummary({ count: unique.length, checked: unique.filter((p) => p.checkedIn).length, duplicates: finalRows.length - unique.length, filename: file.name });
      setNotice(`Imported ${unique.length} player${unique.length === 1 ? '' : 's'} successfully.`);
    } catch (err) { setError(err.message || 'Could not read that spreadsheet.'); }
    event.target.value = '';
  };
  const toggleCheckIn = (id) => setPlayers((current) => current.map((p) => p.id === id ? { ...p, checkedIn: !p.checkedIn, checkedInAt: p.checkedIn ? null : new Date().toISOString() } : p));
  const exportReport = () => {
    const data = players.map((p) => ({ 'Company / Sponsor': p.company, 'Full Name': p.name, 'Guest Type': p.guestType || '', VIP: p.vipLabel || (p.vip ? 'Yes' : ''), 'Shirt Size': p.shirtSize, Email: p.email, Cell: p.cell, Notes: p.notes, 'Check-In Status': p.checkedIn ? 'Checked In' : 'Not Yet', 'Check-In Time': p.checkedIn ? new Date(p.checkedInAt).toLocaleString() : '' }));
    const forms = contactSubmissions.map((form) => ({ 'Guest Type': form.guestType, 'Submitted At': form.submittedAt ? new Date(form.submittedAt).toLocaleString() : '', 'Guest Name': form.guestName || '', 'Company / Organization': form.companyTeam || form.organization || '', 'Contact Person': form.contactPerson || '', 'Relationship / Recipient': form.contactRelationship || form.invitationRecipient || '', Email: form.email || '', Phone: form.phone || '', 'Contact Preference': form.contactPreference || '', 'Team / Company Contact': form.teamContact || '', 'Future Interests': Array.isArray(form.interests) ? form.interests.join('; ') : '', 'Permission to Contact': form.consent ? 'Yes' : 'No' }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(data), 'Attendance');
    if (forms.length) XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(forms), 'Contact Forms');
    XLSX.writeFile(book, 'golf-legacy-attendance.xlsx');
  };
  const resetRoster = () => { if (window.confirm('Remove the current roster from this browser? Export your attendance report first if you need it.')) { setPlayers([]); setImportSummary(null); setNotice('Roster cleared from this browser.'); } };
  return <main className="admin-main"><div className="admin-heading"><div><div className="eyebrow">EVENT MANAGEMENT</div><h1>Admin <em>dashboard.</em></h1><p>Manage the roster and keep track of arrivals.</p></div><div className="admin-heading-actions"><button className="outline-button" onClick={exportReport} disabled={!players.length}><Download size={16} /> Export Excel</button><button className="primary-button" onClick={() => fileRef.current?.click()}><Upload size={16} /> Upload roster</button><input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleFile} /></div></div>
    {notice && <div className="notice success-notice"><CheckCircle2 size={17} /> {notice}</div>}{error && <div className="notice error-notice"><AlertCircle size={17} /> {error}</div>}
    <div className="stats-grid"><div className="stat-card"><div className="stat-icon"><Users size={21} /></div><span>Total registered</span><strong>{players.length}</strong></div><div className="stat-card"><div className="stat-icon"><UserRoundCheck size={21} /></div><span>Checked in</span><strong>{checkedCount}</strong><small>{players.length ? Math.round(checkedCount / players.length * 100) : 0}% of roster</small></div><div className="stat-card"><div className="stat-icon"><Clock3 size={21} /></div><span>Still expected</span><strong>{players.length - checkedCount}</strong></div><div className="stat-card"><div className="stat-icon"><ShieldCheck size={21} /></div><span>VIP guests</span><strong>{players.filter((p) => p.vip).length}</strong></div></div>
    <section className="admin-panel"><div className="panel-header"><div><h2>Player roster</h2><p>Upload your spreadsheet with these exact column headings:</p></div><button className="text-button" onClick={resetRoster} disabled={!players.length}>Clear roster</button></div><div className="column-chips">{COLUMNS.map((column) => <span key={column}>{column}</span>)}</div>
      {importSummary && <div className="import-summary"><FileSpreadsheet size={18} /><div><strong>{importSummary.filename}</strong><span>{importSummary.count} players loaded{importSummary.checked ? ` · ${importSummary.checked} previous check-ins preserved` : ''}{importSummary.duplicates ? ` · ${importSummary.duplicates} duplicate rows skipped` : ''}</span></div></div>}
      <div className="roster-toolbar"><div className="admin-search"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, company, phone, or email" /></div><span className="roster-count">{filtered.length} {filtered.length === 1 ? 'player' : 'players'}</span></div>
      <div className="roster-table-wrap"><table className="roster-table"><thead><tr><th>Player</th><th>Guest type</th><th>Company / Sponsor</th><th>VIP</th><th>Shirt</th><th>Cell</th><th>Status</th><th>Check-in time</th><th>Action</th></tr></thead><tbody>{filtered.length ? filtered.map((p) => <tr key={p.id}><td><strong>{p.name}</strong><span className="email-cell">{p.email}</span></td><td>{p.guestType || 'Roster upload'}</td><td>{p.company || '—'}</td><td>{p.vip ? <span className="vip-pill">VIP</span> : '—'}</td><td>{p.shirtSize || '—'}</td><td>{p.cell || '—'}</td><td><span className={p.checkedIn ? 'status-pill status-in' : 'status-pill status-out'}>{p.checkedIn ? 'Checked in' : 'Not yet'}</span></td><td>{p.checkedIn ? formatTime(p.checkedInAt) : '—'}</td><td><button className={p.checkedIn ? 'row-action row-action-muted' : 'row-action'} onClick={() => toggleCheckIn(p.id)}>{p.checkedIn ? 'Undo' : 'Check in'}</button></td></tr>) : <tr><td colSpan="9"><div className="empty-roster"><FileSpreadsheet size={28} /><strong>{search ? 'No players match that search' : 'Your roster is ready for upload'}</strong><span>{search ? 'Try another name or phone number.' : 'Upload the Excel file when you are ready. No player records are needed yet.'}</span>{!search && <button className="primary-button" onClick={() => fileRef.current?.click()}><Upload size={16} /> Upload Excel roster</button>}</div></td></tr>}</tbody></table></div>
    </section><section className="admin-panel forms-panel"><div className="panel-header"><div><h2>Contact form submissions</h2><p>Responses collected from the celebrity, VIP, and general admission forms.</p></div><span className="roster-count">{contactSubmissions.length} submissions</span></div>
      {contactSubmissions.length ? <div className="roster-table-wrap"><table className="roster-table"><thead><tr><th>Guest type</th><th>Guest name</th><th>Contact person</th><th>Email</th><th>Phone</th><th>Permission</th></tr></thead><tbody>{[...contactSubmissions].reverse().map((form, index) => <tr key={form.id || index}><td>{form.guestType}</td><td><strong>{form.guestName || '—'}</strong></td><td>{form.contactPerson || '—'}</td><td>{form.email || '—'}</td><td>{form.phone || '—'}</td><td><span className="status-pill status-in">{form.consent ? 'Granted' : 'Not granted'}</span></td></tr>)}</tbody></table></div> : <div className="empty-roster"><FileSpreadsheet size={25} /><strong>No contact forms submitted yet</strong><span>Guest submissions will appear here on this browser. Export Excel includes a separate Contact Forms worksheet.</span></div>}
    </section><div className="admin-footnote"><ShieldCheck size={16} /> This prototype stores contact forms in this browser only. Use secure shared storage before collecting real guest information publicly.</div></main>;
}

export default function App() {
  const [players, setPlayersState] = useState(readRoster);
  const [admin, setAdmin] = useState(() => sessionStorage.getItem(ADMIN_SESSION_KEY) === '1');
  const [showLogin, setShowLogin] = useState(false);
  const [guestType, setGuestType] = useState('general');
  const [flowStep, setFlowStep] = useState('form');
  const [formPlayer, setFormPlayer] = useState(null);
  const setPlayers = (next) => setPlayersState((current) => { const value = typeof next === 'function' ? next(current) : next; localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); return value; });
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(players)); }, [players]);
  const login = () => { sessionStorage.setItem(ADMIN_SESSION_KEY, '1'); setAdmin(true); setShowLogin(false); };
  const exit = () => { sessionStorage.removeItem(ADMIN_SESSION_KEY); setAdmin(false); setShowLogin(false); };
  const backToForm = () => { setFlowStep('form'); setFormPlayer(null); };
  return <div className="app-shell"><Header admin={admin} onAdmin={() => setShowLogin(true)} onExit={exit} />
    {admin ? <AdminDashboard players={players} setPlayers={setPlayers} /> : showLogin ? <AdminLogin onLogin={login} onBack={() => setShowLogin(false)} /> : flowStep === 'form' ? <GuestContactForm players={players} setPlayers={setPlayers} guestType={guestType} setGuestType={setGuestType} onContinue={(player) => { setFormPlayer(player); setFlowStep('checkin'); }} /> : <CheckInApp players={players} setPlayers={setPlayers} initialPlayer={formPlayer} onBackToForm={backToForm} />}
    <footer className="site-footer"><Brand compact /><div className="footer-tagline">GREAT PEOPLE <span>✦</span> LASTING IMPACT</div><div className="footer-small">MICHAEL FINLEY FOUNDATION · LEGACY INVITATIONAL</div></footer>
  </div>;
}
