
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
  if (pageId === 'rsvp') preloadGuestIndex();
  closeMenu();
}

// Mobile menu
var menuToggle = document.getElementById('menuToggle');
var navLinks = document.getElementById('navLinks');

function setMenu(open) {
  menuToggle = menuToggle || document.getElementById('menuToggle');
  navLinks = navLinks || document.getElementById('navLinks');
  if (!menuToggle || !navLinks) return;

  menuToggle.classList.toggle('active', !!open);
  navLinks.classList.toggle('open', !!open);
  menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  document.body.style.overflow = open ? 'hidden' : '';
}

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    var willOpen = !navLinks.classList.contains('open');
    setMenu(willOpen);
  });

  // Close when tapping outside nav on mobile
  document.addEventListener('click', function(e) {
    if (!navLinks.classList.contains('open')) return;
    var insideNav = navLinks.contains(e.target);
    var onToggle = menuToggle.contains(e.target);
    if (!insideNav && !onToggle) setMenu(false);
  });
}

function closeMenu() {
  setMenu(false);
}

// FAQ
function toggleFaq(item) {
  const wasActive = item.classList.contains('active');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
  if (!wasActive) item.classList.add('active');
}

// ═══════════════════════════════════════════════════════════
// RSVP — Google Sheets Integration
// ═══════════════════════════════════════════════════════════

window.SHEET_URL = 'https://script.google.com/macros/s/AKfycbyeOp2H4i3iNh6GTDD_vJupY8rNqIkzCX97NdHwoWb-iv9ywAaUyLnHzFzljH8pudVj/exec';
var SHEET_URL = window.SHEET_URL;

let currentStep = 1;
let totalSteps = 5;
let currentParty = null;
let guestAttendance = {};
let guestIndexData = null;
let guestIndexLoaded = false;

// ─── STEP 1: LOOKUP (live from Google Sheet) ───

function normalizeLookupText(v) {
  return String(v || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function preloadGuestIndex() {
  if (guestIndexLoaded) return Promise.resolve(guestIndexData);
  guestIndexLoaded = true;
  return fetch('/guest-index.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('guest-index-http-' + r.status); return r.json(); })
    .then(function (data) { guestIndexData = data; return data; })
    .catch(function () { guestIndexData = null; return null; });
}

function lookupFromGuestIndex(first, last) {
  if (!guestIndexData || !guestIndexData.lookup || !guestIndexData.parties) return null;
  var f = normalizeLookupText(first);
  var l = normalizeLookupText(last);
  var candidates = [
    { first: f, last: l },
    { first: l, last: f }
  ];
  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i];
    var row = guestIndexData.lookup.find(function (x) {
      return normalizeLookupText(x.first) === c.first && normalizeLookupText(x.last) === c.last;
    });
    if (!row) continue;
    var party = guestIndexData.parties.find(function (p) { return String(p.partyId) === String(row.partyId); });
    if (!party) continue;
    return { found: true, partyId: party.partyId, partyName: party.partyName, guests: party.guests };
  }
  return null;
}

function lookupGuest() {
  var firstRaw = (document.getElementById('lookupFirst').value || '');
  var lastRaw = (document.getElementById('lookupLast').value || '');
  var errorEl = document.getElementById('lookupError');
  var btn = document.querySelector('#step1 .rsvp-nav-btn');
  var defaultErr = "We couldn't find that name on our guest list. Please try the name as it appears on your invitation, or reach out to Chang & John directly.";

  function cleanName(v) {
    return (v || '').replace(/\s+/g, ' ').trim();
  }
  function titleCase(v) {
    return cleanName(v).toLowerCase().replace(/\b\w/g, function(c) { return c.toUpperCase(); });
  }
  function showLookupError(reason) {
    var detail = reason ? (' (debug: ' + reason + ')') : '';
    if (errorEl) {
      errorEl.textContent = defaultErr + detail;
      errorEl.classList.add('show');
    }
  }

  var first = cleanName(firstRaw);
  var last = cleanName(lastRaw);

  if (!first || !last) {
    showLookupError('missing-first-or-last-name');
    return;
  }

  // Show loading state
  var originalText = btn.textContent;
  btn.textContent = 'Searching...';
  btn.disabled = true;
  if (errorEl) {
    errorEl.textContent = defaultErr;
    errorEl.classList.remove('show');
  }

  // Fast local lookup from guest-index.json (near-instant)
  var local = lookupFromGuestIndex(first, last);
  if (local && local.found) {
    btn.textContent = originalText;
    btn.disabled = false;
    currentParty = {
      partyName: local.partyName,
      guests: local.guests
    };
    guestAttendance = {};
    buildGuestCards();
    goToStep(2);
    return;
  }

  // Resolve active URL defensively at runtime
  var ACTIVE_SHEET_URL = SHEET_URL || window.SHEET_URL || 'https://script.google.com/macros/s/AKfycbyeOp2H4i3iNh6GTDD_vJupY8rNqIkzCX97NdHwoWb-iv9ywAaUyLnHzFzljH8pudVj/exec';
  window.SHEET_URL = ACTIVE_SHEET_URL;
  SHEET_URL = ACTIVE_SHEET_URL;

  if (!ACTIVE_SHEET_URL) {
    showLookupError('sheet-url-not-configured');
    btn.textContent = originalText;
    btn.disabled = false;
    return;
  }

  function queryGuest(f, l, label) {
    var fClean = cleanName(f);
    var lClean = cleanName(l);
    var cacheKey = (fClean + '|' + lClean).toLowerCase();

    // Fast client-side cache for repeat lookups
    try {
      var cachedRaw = sessionStorage.getItem('rsvp_lookup_' + cacheKey);
      if (cachedRaw) {
        var cached = JSON.parse(cachedRaw);
        return Promise.resolve({ data: cached, label: label + '-cache', first: fClean, last: lClean });
      }
    } catch (e) {}

    var url = ACTIVE_SHEET_URL + '?first=' + encodeURIComponent(fClean) + '&last=' + encodeURIComponent(lClean);
    return fetch(url, { redirect: 'follow' })
      .then(function(res) {
        if (!res.ok) throw new Error('http-' + res.status + ' via ' + label);
        return res.json();
      })
      .then(function(data) {
        try {
          if (data && data.found) sessionStorage.setItem('rsvp_lookup_' + cacheKey, JSON.stringify(data));
        } catch (e) {}
        return { data: data, label: label, first: fClean, last: lClean };
      });
  }

  // Fast path: exact input first. If not found, fan out fallback attempts in parallel.
  queryGuest(first, last, 'original')
    .then(function(r1) {
      if (r1.data && r1.data.found) return r1;

      var attempts = [
        queryGuest(last, first, 'swapped'),
        queryGuest(titleCase(first), titleCase(last), 'titlecase'),
        queryGuest(titleCase(last), titleCase(first), 'titlecase-swapped')
      ];

      return Promise.allSettled(attempts).then(function(results) {
        for (var i = 0; i < results.length; i++) {
          if (results[i].status === 'fulfilled' && results[i].value && results[i].value.data && results[i].value.data.found) {
            return results[i].value;
          }
        }
        return r1;
      });
    })
    .then(function(result) {
      btn.textContent = originalText;
      btn.disabled = false;

      var data = result && result.data;
      if (!data || !data.found) {
        var reason = 'found=false after attempts: original, swapped, titlecase, titlecase-swapped';
        if (data && data.reason) reason += '; api-reason=' + data.reason;
        showLookupError(reason);
        return;
      }

      currentParty = {
        partyName: data.partyName,
        guests: data.guests
      };
      guestAttendance = {};
      buildGuestCards();
      goToStep(2);
    })
    .catch(function(err) {
      console.error('Lookup error:', err);
      btn.textContent = originalText;
      btn.disabled = false;
      showLookupError(err && err.message ? err.message : 'lookup-fetch-error');
    });
}

// Enter key UX: submit RSVP guest lookup from first/last name fields
function bindLookupEnterHandlers() {
  var firstEl = document.getElementById('lookupFirst');
  var lastEl = document.getElementById('lookupLast');
  [firstEl, lastEl].forEach(function(el) {
    if (!el || el.dataset.enterBound === '1') return;
    el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        lookupGuest();
      }
    });
    el.dataset.enterBound = '1';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    bindLookupEnterHandlers();
    preloadGuestIndex();
  });
} else {
  bindLookupEnterHandlers();
  preloadGuestIndex();
}


// Mock lookup for testing without Google Sheets
function mockLookup(first, last, btn, originalText, errorEl) {
  var MOCK_GUESTS = {
    'sarah-johnson': {
      partyName: 'The Johnson Family',
      guests: [
        { name: 'Sarah Johnson', type: 'adult' },
        { name: 'Tom Johnson', type: 'adult' },
        { name: 'Emma Johnson', type: 'child' },
        { name: 'Liam Johnson', type: 'child' }
      ]
    },
    'tom-johnson': { redirect: 'sarah-johnson' },
    'mike-chen': {
      partyName: 'Mike Chen & Guest',
      guests: [
        { name: 'Mike Chen', type: 'adult' },
        { name: 'Plus One', type: 'adult' }
      ]
    },
    'david-kim': {
      partyName: 'David Kim',
      guests: [{ name: 'David Kim', type: 'adult' }]
    }
  };

  setTimeout(function() {
    btn.textContent = originalText;
    btn.disabled = false;

    var key = first.toLowerCase() + '-' + last.toLowerCase();
    var party = MOCK_GUESTS[key];
    if (party && party.redirect) party = MOCK_GUESTS[party.redirect];

    if (!party) { errorEl.classList.add('show'); return; }

    currentParty = party;
    guestAttendance = {};
    buildGuestCards();
    goToStep(2);
  }, 500);
}

// ─── STEP 2: BUILD GUEST CARDS ───

function buildGuestCards() {
  var summary = document.getElementById('partySummary');
  var adults = currentParty.guests.filter(function(g) { return g.type === 'adult'; }).length;
  var children = currentParty.guests.filter(function(g) { return g.type === 'child'; }).length;
  var countText = adults + ' adult' + (adults !== 1 ? 's' : '');
  if (children > 0) countText += ', ' + children + ' child' + (children !== 1 ? 'ren' : '');

  summary.innerHTML =
    '<div class="party-summary-name">' + currentParty.partyName + '</div>' +
    '<div class="party-summary-count">' + countText + ' in your party</div>';

  var container = document.getElementById('guestCards');
  container.innerHTML = '';

  currentParty.guests.forEach(function(guest, i) {
    var isChild = guest.type === 'child';
    var card = document.createElement('div');
    card.className = 'guest-card';
    card.id = 'guestCard' + i;

    var detailsHTML = '';
    if (isChild) {
      detailsHTML =
        '<div class="form-group">' +
          '<label class="form-label">Age at time of wedding (Sep 2, 2026)</label>' +
          '<input type="number" class="form-input" id="childAge' + i + '" placeholder="Age" min="0" max="17" style="max-width:120px;">' +
        '</div>' +
        '<div class="form-group">' +
          '<label class="form-label">Dietary Restrictions / Allergies</label>' +
          '<input type="text" class="form-input" id="dietary' + i + '" placeholder="e.g. no dairy, nut allergy...">' +
        '</div>' +
        '<div class="form-group" style="margin-bottom:0;">' +
          '<label class="babysit-check">' +
            '<input type="checkbox" id="babysit' + i + '">' +
            '<span class="babysit-box">&#10003;</span>' +
            '<span class="babysit-text">Requires babysitting during the ceremony or reception</span>' +
          '</label>' +
        '</div>';
    } else {
      detailsHTML =
        '<div class="form-row">' +
          '<div class="form-group">' +
            '<label class="form-label">Phone</label>' +
            '<input type="tel" class="form-input" id="phone' + i + '" placeholder="Phone number">' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">Email</label>' +
            '<input type="email" class="form-input" id="email' + i + '" placeholder="Email address">' +
          '</div>' +
        '</div>' +
        '<div class="form-group" style="margin-bottom:0;">' +
          '<label class="form-label">Dietary Restrictions / Allergies</label>' +
          '<input type="text" class="form-input" id="dietary' + i + '" placeholder="e.g. vegetarian, gluten-free, nut allergy...">' +
        '</div>';
    }

    card.innerHTML =
      '<div class="guest-card-header">' +
        '<div class="guest-name">' + guest.name + '</div>' +
        '<span class="guest-type ' + guest.type + '">' + (isChild ? 'Child' : 'Adult') + '</span>' +
      '</div>' +
      '<div class="attend-toggle">' +
        '<button type="button" class="attend-btn" data-guest="' + i + '" data-attend="yes">&#129346; Will Attend</button>' +
        '<button type="button" class="attend-btn" data-guest="' + i + '" data-attend="no">&#128546; Can\'t Make It</button>' +
      '</div>' +
      '<div class="guest-details" id="guestDetails' + i + '">' +
        detailsHTML +
      '</div>';

    container.appendChild(card);

    // Attach click handlers directly after appending
    card.querySelectorAll('.attend-btn').forEach(function(button) {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var gIdx = parseInt(this.getAttribute('data-guest'));
        var val = this.getAttribute('data-attend');
        setGuestAttend(gIdx, val, this);
      });
    });
  });
}

// ─── GUEST ATTENDANCE TOGGLE ───

function setGuestAttend(index, value, btn) {
  guestAttendance[index] = value;
  var card = document.getElementById('guestCard' + index);
  var details = document.getElementById('guestDetails' + index);
  var buttons = card.querySelectorAll('.attend-btn');

  buttons.forEach(function(b) {
    b.classList.remove('selected-yes', 'selected-no');
  });
  card.classList.remove('attending-yes', 'attending-no');

  if (value === 'yes') {
    btn.classList.add('selected-yes');
    card.classList.add('attending-yes');
    details.classList.add('show');
  } else {
    btn.classList.add('selected-no');
    card.classList.add('attending-no');
    details.classList.remove('show');
  }

  // Enable continue only when all guests have answered
  var allAnswered = currentParty.guests.every(function(_, i) {
    return guestAttendance[i] !== undefined;
  });
  document.getElementById('step2Next').disabled = !allAnswered;
}

// ─── STEP 2 → 3 TRANSITION (or decline) ───

function handleStep2Next() {
  var anyAttending = Object.values(guestAttendance).some(function(v) { return v === 'yes'; });
  if (!anyAttending) {
    document.querySelectorAll('.rsvp-step').forEach(function(s) { s.classList.remove('active'); });
    document.querySelector('.rsvp-progress').style.display = 'none';
    document.getElementById('rsvpDecline').classList.add('show');
  } else {
    nextStep();
  }
}

// ─── STEP 3: GRAPE STOMPING TOGGLE ───

function toggleGrape(checkbox) {
  var pref = document.getElementById('grapePref');
  var check = document.getElementById('explorationCheck');
  if (checkbox.checked) {
    pref.classList.add('show');
    check.style.borderRadius = '6px 6px 0 0';
    check.style.marginBottom = '0';
  } else {
    pref.classList.remove('show');
    check.style.borderRadius = '6px';
    check.style.marginBottom = '8px';
  }
}

// ─── NAVIGATION ───

function goToStep(step) {
  document.getElementById('step' + currentStep).classList.remove('active');
  currentStep = step;
  document.getElementById('step' + currentStep).classList.add('active');
  updateProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextStep() {
  if (currentStep < totalSteps) goToStep(currentStep + 1);
}

function prevStep() {
  if (currentStep > 1) goToStep(currentStep - 1);
}

function updateProgress() {
  var dots = document.querySelectorAll('.rsvp-progress-dot');
  dots.forEach(function(d, i) {
    d.classList.remove('active', 'done');
    if (i + 1 === currentStep) d.classList.add('active');
    else if (i + 1 < currentStep) d.classList.add('done');
  });
}

// ─── COLLECT ALL FORM DATA ───

function collectFormData() {
  // Gather checked events
  var eventChecks = {
    exploration: false,
    welcome: false,
    brunch: false,
    beach: false,
    farewell: false
  };
  document.querySelectorAll('input[name="events"]:checked').forEach(function(cb) {
    eventChecks[cb.value] = true;
  });

  var grapePrefEl = document.querySelector('input[name="grapePref"]:checked');
  var grapePref = grapePrefEl ? grapePrefEl.value : '';

  // Shared party-level fields
  var shared = {
    accommodation: (document.getElementById('accommodation') || {}).value || '',
    arrivalDate: (document.getElementById('arrivalDate') || {}).value || '',
    departureDate: (document.getElementById('departureDate') || {}).value || '',
    transportTo: (document.getElementById('transportTo') || {}).value || '',
    transferToDetails: (document.getElementById('transferToDetails') || {}).value.trim() || '',
    transportFrom: (document.getElementById('transportFrom') || {}).value || '',
    transferFromDetails: (document.getElementById('transferFromDetails') || {}).value.trim() || '',
    specialNeeds: (document.getElementById('specialNeeds') || {}).value.trim() || '',
    sweetNote: (document.getElementById('sweetNote') || {}).value.trim() || ''
  };

  // Build one row per guest
  var rows = [];
  if (currentParty) {
    currentParty.guests.forEach(function(guest, i) {
      var attending = guestAttendance[i] === 'yes';
      var nameParts = guest.name.split(' ');
      var firstName = nameParts[0] || '';
      var lastName = nameParts.slice(1).join(' ') || '';
      var row = {
        timestamp: new Date().toISOString(),
        partyName: currentParty.partyName,
        firstName: firstName,
        lastName: lastName,
        guestType: guest.type,
        attending: attending ? 'Yes' : 'No',
        phone: '',
        email: '',
        dietary: '',
        childAge: '',
        babysitting: '',
        wedding: attending ? 'Yes' : 'No',
        exploration: attending && eventChecks.exploration ? 'Yes' : 'No',
        grapePref: attending && eventChecks.exploration ? grapePref : '',
        welcomePizza: attending && eventChecks.welcome ? 'Yes' : 'No',
        brunch: attending && eventChecks.brunch ? 'Yes' : 'No',
        beachPool: attending && eventChecks.beach ? 'Yes' : 'No',
        farewellDinner: attending && eventChecks.farewell ? 'Yes' : 'No'
      };

      if (attending) {
        if (guest.type === 'child') {
          var ageEl = document.getElementById('childAge' + i);
          var babysitEl = document.getElementById('babysit' + i);
          row.childAge = ageEl ? ageEl.value : '';
          row.babysitting = babysitEl && babysitEl.checked ? 'Yes' : 'No';
        } else {
          var phoneEl = document.getElementById('phone' + i);
          var emailEl = document.getElementById('email' + i);
          row.phone = phoneEl ? phoneEl.value.trim() : '';
          row.email = emailEl ? emailEl.value.trim() : '';
        }
        var dietEl = document.getElementById('dietary' + i);
        row.dietary = dietEl ? dietEl.value.trim() : '';
      }

      // Attach shared fields to every row
      row.accommodation = shared.accommodation;
      row.arrivalDate = shared.arrivalDate;
      row.departureDate = shared.departureDate;
      row.transportTo = shared.transportTo;
      row.transferToDetails = shared.transferToDetails;
      row.transportFrom = shared.transportFrom;
      row.transferFromDetails = shared.transferFromDetails;
      row.specialNeeds = shared.specialNeeds;
      row.sweetNote = shared.sweetNote;
      row.declineNote = '';

      rows.push(row);
    });
  }

  return rows;
}

// ─── SUBMIT ───

function submitRSVP() {
  var btn = document.getElementById('submitBtn');
  btn.textContent = 'Sending...';
  btn.disabled = true;

  var rows = collectFormData();
  sendToSheet(rows, function() {
    document.querySelectorAll('.rsvp-step').forEach(function(s) { s.classList.remove('active'); });
    document.querySelector('.rsvp-progress').style.display = 'none';
    document.getElementById('rsvpSuccess').classList.add('show');
  });
}


function submitDeclineMessage() {
  var rows = collectFormData();
  var declineNote = (document.getElementById('declineNote') || {}).value.trim() || '';
  rows.forEach(function(row) { row.declineNote = declineNote; });

  sendToSheet(rows, function() {
    document.getElementById('rsvpDecline').classList.remove('show');
    document.getElementById('rsvpDeclineSent').classList.add('show');
  });
}

function sendToSheet(rows, callback) {
  var ACTIVE_SHEET_URL = SHEET_URL || window.SHEET_URL || 'https://script.google.com/macros/s/AKfycbyeOp2H4i3iNh6GTDD_vJupY8rNqIkzCX97NdHwoWb-iv9ywAaUyLnHzFzljH8pudVj/exec';
  window.SHEET_URL = ACTIVE_SHEET_URL;
  SHEET_URL = ACTIVE_SHEET_URL;

  if (!ACTIVE_SHEET_URL) {
    console.log('RSVP data (no Sheet URL configured):', rows);
    if (callback) setTimeout(callback, 500);
    return;
  }

  fetch(ACTIVE_SHEET_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows: rows })
  })
  .then(function() { if (callback) callback(); })
  .catch(function(e) {
    console.error('Submit error:', e);
    if (callback) callback();
  });
}

// ─── EXPLORE PAGE COLLAPSIBLES ───

function toggleExploreZone(header) {
  var content = header.nextElementSibling;
  var icon = header.querySelector('.zone-toggle-icon');
  if (!content) return;
  var isOpen = content.style.display === 'block';
  content.style.display = isOpen ? 'none' : 'block';
  if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
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
