
// Page navigation
function showPage(pageId) {
  const page = document.getElementById('page-' + pageId);
  if (!page) return;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  page.classList.add('active');

  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const activeLink = document.querySelector('[data-page="' + pageId + '"]');
  if (activeLink) activeLink.classList.add('active');

  // Hard scroll reset (works across mobile browsers/webviews)
  const root = document.documentElement;
  const prevBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  window.scrollTo(0, 0);
  root.scrollTop = 0;
  document.body.scrollTop = 0;
  requestAnimationFrame(() => {
    window.scrollTo(0, 0);
    root.scrollTop = 0;
    document.body.scrollTop = 0;
    const nav = document.getElementById('navbar');
    if (nav) nav.scrollIntoView({ block: 'start', behavior: 'auto' });
    root.style.scrollBehavior = prevBehavior;
  });

  if (history.replaceState) history.replaceState(null, '', '#' + pageId);
  closeMenu();
}

// Mobile menu
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    navLinks.classList.toggle('open');
    document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
  });
}
function closeMenu() {
  if (!menuToggle || !navLinks) return;
  menuToggle.classList.remove('active');
  navLinks.classList.remove('open');
  document.body.style.overflow = '';
}

// FAQ
function toggleFaq(item) {
  const wasActive = item.classList.contains('active');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
  if (!wasActive) item.classList.add('active');
}

// RSVP
let currentStep = 1;
let rsvpData = { attending: null, plusOne: null, shuttle: null };

function setAttendance(btn) {
  btn.parentElement.querySelectorAll('.attendance-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  rsvpData.attending = btn.dataset.value;
  document.getElementById('step1Next').disabled = false;
}
function setPlusOne(btn) {
  btn.parentElement.querySelectorAll('.attendance-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  rsvpData.plusOne = btn.dataset.value;
  document.getElementById('plusoneFields').classList.toggle('show', btn.dataset.value === 'yes');
  const dg = document.getElementById('plusOneDietaryGroup');
  if (dg) dg.style.display = btn.dataset.value === 'yes' ? 'block' : 'none';
}
function setToggle(btn) {
  btn.parentElement.querySelectorAll('.attendance-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  rsvpData[btn.dataset.group] = btn.dataset.value;
}
function updateProgress() {
  const dots = document.querySelectorAll('.rsvp-progress-dot');
  dots.forEach((d, i) => {
    d.classList.remove('active', 'done');
    if (i + 1 === currentStep) d.classList.add('active');
    else if (i + 1 < currentStep) d.classList.add('done');
  });
}
function nextStep() {
  if (currentStep === 1) {
    if (!document.getElementById('firstName').value.trim() || !document.getElementById('lastName').value.trim() || !document.getElementById('email').value.trim() || !rsvpData.attending) return;
    if (rsvpData.attending === 'no') { submitDecline(); return; }
  }
  if (currentStep < 4) {
    document.getElementById('step' + currentStep).classList.remove('active');
    currentStep++;
    document.getElementById('step' + currentStep).classList.add('active');
    updateProgress();
  }
}
function prevStep() {
  if (currentStep > 1) {
    document.getElementById('step' + currentStep).classList.remove('active');
    currentStep--;
    document.getElementById('step' + currentStep).classList.add('active');
    updateProgress();
  }
}
function collectFormData() {
  const events = [];
  document.querySelectorAll('input[name="events"]:checked').forEach(cb => events.push(cb.value));
  return {
    timestamp: new Date().toISOString(),
    firstName: document.getElementById('firstName').value.trim(),
    lastName: document.getElementById('lastName').value.trim(),
    email: document.getElementById('email').value.trim(),
    attending: rsvpData.attending,
    plusOne: rsvpData.plusOne || 'no',
    plusOneName: document.getElementById('plusOneName')?.value.trim() || '',
    events: events.join(', '),
    accommodation: document.getElementById('accommodation')?.value || '',
    arrivalDate: document.getElementById('arrivalDate')?.value || '',
    departureDate: document.getElementById('departureDate')?.value || '',
    shuttle: rsvpData.shuttle || '',
    airport: document.getElementById('airport')?.value || '',
    dietary: document.getElementById('dietary')?.value.trim() || '',
    plusOneDietary: document.getElementById('plusOneDietary')?.value.trim() || '',
    notes: document.getElementById('notes')?.value.trim() || ''
  };
}
function submitDecline() {
  sendToSheet(collectFormData());
  document.querySelectorAll('.rsvp-step').forEach(s => s.classList.remove('active'));
  document.querySelector('.rsvp-progress').style.display = 'none';
  document.getElementById('rsvpDecline').classList.add('show');
}
function submitRSVP() {
  const btn = document.getElementById('submitBtn');
  btn.textContent = 'Sending...'; btn.disabled = true;
  sendToSheet(collectFormData());
  setTimeout(() => {
    document.querySelectorAll('.rsvp-step').forEach(s => s.classList.remove('active'));
    document.querySelector('.rsvp-progress').style.display = 'none';
    document.getElementById('rsvpSuccess').classList.add('show');
  }, 800);
}
function sendToSheet(data) {
  const SHEET_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
  if (SHEET_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') { console.log('RSVP:', data); return; }
  fetch(SHEET_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).catch(e => console.log(e));
}

// Initialize page from URL hash if present
const initialPage = (window.location.hash || '').replace('#', '');
if (initialPage) showPage(initialPage);

// Navbar scroll effect
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  if (window.scrollY > 50) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
});

// language switcher removed
