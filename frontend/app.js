/* ==========================================================================
   SENTINEL — Application Logic (prototype, no backend)
   ========================================================================== */

/* ---------- Boot loader ---------- */
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('bootLoader').classList.add('done');
    animateStats();
  }, 1400);
});

/* ---------- View routing (landing / auth / app) ---------- */
const views = {
  landing: document.getElementById('view-landing'),
  auth: document.getElementById('view-auth'),
  app: document.getElementById('view-app'),
};
let pendingRedirect = null;

function showView(name){
  Object.values(views).forEach(v => v.classList.add('hidden'));
  views[name].classList.remove('hidden');
  window.scrollTo({top:0, behavior:'instant'});
}

document.querySelectorAll('[data-nav]').forEach(el => {
  el.addEventListener('click', () => {
    const target = el.getAttribute('data-nav');
    const tab = el.getAttribute('data-tab');
    const redirect = el.getAttribute('data-redirect');
    if(tab) setAuthTab(tab);
    if(redirect) pendingRedirect = redirect;
    showView(target);
  });
});

/* ---------- Auth tabs ---------- */
function setAuthTab(tab){
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.authtab === tab));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.toggle('hidden', f.dataset.authpanel !== tab));
}
document.querySelectorAll('[data-authtab]').forEach(el => {
  el.addEventListener('click', (e) => { e.preventDefault(); setAuthTab(el.dataset.authtab); });
});
document.querySelectorAll('.role-card').forEach(card => {
  card.addEventListener('click', () => {
    card.parentElement.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    card.querySelector('input').checked = true;
  });
});

['loginForm','registerForm','forgotForm'].forEach(id => {
  document.getElementById(id).addEventListener('submit', (e) => {
    e.preventDefault();
    if(id === 'loginForm'){
      showView('app');
      if(pendingRedirect){ switchScreen(pendingRedirect); pendingRedirect = null; }
      if(!window._appBooted) bootApp();
      showToast('Welcome back, Ananya — session started.');
    } else if(id === 'registerForm'){
      showToast('Access request submitted for authority verification.');
      setAuthTab('login');
    } else {
      showToast('Password reset link sent to your official email.');
      setAuthTab('login');
    }
  });
});

/* ---------- Stat counters (landing) ---------- */
function animateStats(){
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    let cur = 0;
    const step = Math.max(1, Math.round(target / 60));
    const timer = setInterval(() => {
      cur += step;
      if(cur >= target){ cur = target; clearInterval(timer); }
      el.textContent = cur + suffix;
    }, 20);
  });
}

/* ---------- Sidebar navigation ---------- */
function switchScreen(name){
  document.querySelectorAll('.nav-item[data-screen]').forEach(n => n.classList.toggle('active', n.dataset.screen === name));
  document.querySelectorAll('.screen[data-screen-panel]').forEach(s => s.classList.toggle('active', s.dataset.screenPanel === name));
  const labelMap = {
    dashboard:'Dashboard', simulation:'Simulation', map:'GIS Map', command:'Command Center',
    warehouses:'Warehouses', shelters:'Shelters', volunteers:'Volunteers', allocation:'Relief Allocation',
    analytics:'Analytics', reports:'Reports', settings:'Settings'
  };
  document.querySelector('.bc-current').textContent = labelMap[name] || name;
  document.getElementById('screenArea').scrollTo({top:0, behavior:'smooth'});
  // lazy init per-screen widgets
  if(name === 'map') setTimeout(() => gisMap && gisMap.invalidateSize(), 80);
  if(name === 'simulation') setTimeout(() => simMap && simMap.invalidateSize(), 80);
}
document.querySelectorAll('.nav-item[data-screen]').forEach(item => {
  item.addEventListener('click', () => switchScreen(item.dataset.screen));
});

document.getElementById('collapseBtn').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
});
document.getElementById('mobileMenuBtn').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('mobile-open');
});

/* ---------- Dark mode ---------- */
function setDark(on){
  document.documentElement.classList.toggle('dark', on);
  document.getElementById('darkToggleIcon').textContent = on ? 'light_mode' : 'dark_mode';
  document.getElementById('toggleMiniDark').classList.toggle('on', on);
  document.getElementById('segLight').classList.toggle('active', !on);
  document.getElementById('segDark').classList.toggle('active', on);
}
document.getElementById('darkToggleBtn').addEventListener('click', () => setDark(!document.documentElement.classList.contains('dark')));
document.getElementById('darkToggleDD').addEventListener('click', () => setDark(!document.documentElement.classList.contains('dark')));
document.getElementById('segLight')?.addEventListener('click', () => setDark(false));
document.getElementById('segDark')?.addEventListener('click', () => setDark(true));

/* ---------- Dropdowns / panels ---------- */
function toggleEl(id, on){ document.getElementById(id).classList.toggle('open', on); }
document.getElementById('profileBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  toggleEl('profileDropdown', !document.getElementById('profileDropdown').classList.contains('open'));
  toggleEl('notifPanel', false);
});
document.getElementById('notifBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  toggleEl('notifPanel', !document.getElementById('notifPanel').classList.contains('open'));
  toggleEl('profileDropdown', false);
});
document.addEventListener('click', () => { toggleEl('profileDropdown', false); toggleEl('notifPanel', false); });

/* ---------- AI Assistant panel ---------- */
document.getElementById('aiAssistBtn').addEventListener('click', () => document.getElementById('aiPanel').classList.add('open'));
document.getElementById('aiCloseBtn').addEventListener('click', () => document.getElementById('aiPanel').classList.remove('open'));

/* ---------- Toasts ---------- */
function showToast(msg, isError=false){
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast' + (isError ? ' error' : '');
  t.innerHTML = `<span class="material-symbols-outlined">${isError ? 'error' : 'check_circle'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(30px)'; t.style.transition = 'all .3s ease'; setTimeout(() => t.remove(), 300); }, 3500);
}

/* ==========================================================================
   App boot — charts, maps, tables (deferred until first login)
   ========================================================================== */
let gisMap, simMap;

function bootApp(){
  window._appBooted = true;
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.color = getCSS('--ink-500');
  Chart.defaults.borderColor = getCSS('--border');

  buildDashboardCharts();
  buildAnalyticsCharts();
  buildGISMap();
  buildSimMap();
  buildWarehouseTable();
  buildShelterGrid();
  buildVolunteerTable();
}

function getCSS(varName){ return getComputedStyle(document.documentElement).getPropertyValue(varName).trim(); }

/* ---------- Dashboard charts ---------- */
function buildDashboardCharts(){
  const blue = '#1552F0';
  new Chart(document.getElementById('chartPopTrend'), {
    type:'line',
    data:{ labels:['Day 1','Day 2','Day 3','Day 4','Day 5','Day 6','Day 7'],
      datasets:[{ label:'Affected Population', data:[12000,18500,26800,34200,41500,50100,58400], borderColor:blue, backgroundColor:'rgba(21,82,240,0.1)', fill:true, tension:.4, pointRadius:0, borderWidth:2.5 }]},
    options:{ plugins:{legend:{display:false}}, scales:{ y:{ grid:{ display:true }, ticks:{ callback:v=>(v/1000)+'k' } }, x:{ grid:{ display:false } } }, maintainAspectRatio:false }
  });

  new Chart(document.getElementById('chartReliefDist'), {
    type:'doughnut',
    data:{ labels:['Food','Water','Medicine','Shelter Kits','Fuel'], datasets:[{ data:[34,28,16,14,8], backgroundColor:['#1552F0','#2E68FF','#5CE0A8','#E8A33D','#94A3B8'], borderWidth:0 }]},
    options:{ plugins:{legend:{position:'bottom', labels:{boxWidth:10, padding:14, font:{size:11.5}}}}, cutout:'68%', maintainAspectRatio:false }
  });

  new Chart(document.getElementById('chartWarehouseInv'), {
    type:'bar',
    data:{ labels:['Food','Water','Medicine','Tents','Fuel'], datasets:[{ data:[82500,240000,14000,9200,68000], backgroundColor:'#1552F0', borderRadius:6, maxBarThickness:28 }]},
    options:{ plugins:{legend:{display:false}}, scales:{ x:{grid:{display:false}}, y:{grid:{display:true}} }, maintainAspectRatio:false }
  });

  new Chart(document.getElementById('chartVolAvail'), {
    type:'pie',
    data:{ labels:['Available','Deployed','Off-duty'], datasets:[{ data:[812,318,120], backgroundColor:['#1C9E6E','#1552F0','#CBD5E1'], borderWidth:0 }]},
    options:{ plugins:{legend:{position:'bottom', labels:{boxWidth:10, padding:12, font:{size:11.5}}}}, maintainAspectRatio:false }
  });

  new Chart(document.getElementById('chartResConsumption'), {
    type:'line',
    data:{ labels:['06:00','09:00','12:00','15:00','18:00','21:00'], datasets:[
      { label:'Food', data:[10,22,38,54,66,80], borderColor:'#1552F0', tension:.4, pointRadius:0, borderWidth:2 },
      { label:'Water', data:[8,19,33,49,60,74], borderColor:'#0EA5B7', tension:.4, pointRadius:0, borderWidth:2 }
    ]},
    options:{ plugins:{legend:{position:'bottom', labels:{boxWidth:10, padding:12, font:{size:11}}}}, scales:{ y:{grid:{display:true}}, x:{grid:{display:false}} }, maintainAspectRatio:false }
  });
}

/* ---------- Analytics charts ---------- */
function buildAnalyticsCharts(){
  new Chart(document.getElementById('chartRespTime'), {
    type:'bar',
    data:{ labels:['Nagapattinam','Cuddalore','Thanjavur','Karaikal','Mayiladuthurai'], datasets:[{ data:[38,45,52,33,60], backgroundColor:'#1552F0', borderRadius:6, maxBarThickness:30 }]},
    options:{ plugins:{legend:{display:false}}, scales:{x:{grid:{display:false}}, y:{grid:{display:true}, title:{display:true,text:'minutes'}}}, maintainAspectRatio:false }
  });
  new Chart(document.getElementById('chartHeat'), {
    type:'radar',
    data:{ labels:['Warehouses','Shelters','Trucks','Volunteers','Medical','Comms'], datasets:[{ label:'Efficiency %', data:[84,76,90,65,71,58], borderColor:'#1552F0', backgroundColor:'rgba(21,82,240,0.15)', pointBackgroundColor:'#1552F0' }]},
    options:{ plugins:{legend:{display:false}}, scales:{ r:{ suggestedMin:0, suggestedMax:100 } }, maintainAspectRatio:false }
  });
  new Chart(document.getElementById('chartCost'), {
    type:'doughnut',
    data:{ labels:['Logistics','Supplies','Medical','Shelter','Personnel'], datasets:[{ data:[32,26,18,14,10], backgroundColor:['#1552F0','#2E68FF','#5CE0A8','#E8A33D','#94A3B8'], borderWidth:0 }]},
    options:{ plugins:{legend:{position:'bottom', labels:{boxWidth:10, padding:12, font:{size:11}}}}, cutout:'62%', maintainAspectRatio:false }
  });
  new Chart(document.getElementById('chartAccuracy'), {
    type:'line',
    data:{ labels:['Sim 1','Sim 2','Sim 3','Sim 4','Sim 5','Sim 6'], datasets:[{ data:[78,82,85,88,90,91], borderColor:'#1C9E6E', backgroundColor:'rgba(28,158,110,0.12)', fill:true, tension:.4, pointRadius:3, borderWidth:2.5 }]},
    options:{ plugins:{legend:{display:false}}, scales:{ y:{ min:60, max:100, grid:{display:true} }, x:{grid:{display:false}} }, maintainAspectRatio:false }
  });
}

/* ---------- GIS Map (Leaflet) ---------- */
const CHENNAI = [11.85, 79.85];
function buildGISMap(){
  gisMap = L.map('gisMap', { zoomControl:false }).setView(CHENNAI, 8);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution:'&copy; OpenStreetMap &copy; CARTO', maxZoom:19 }).addTo(gisMap);
  L.control.zoom({ position:'bottomright' }).addTo(gisMap);

  const warehouses = [
    ['WH-01 Chennai Central',13.08,80.27],['WH-03 Villupuram',11.94,79.49],['WH-07 Cuddalore',11.75,79.77],
    ['WH-09 Nagapattinam',10.77,79.84],['WH-12 Thanjavur',10.79,79.14],['WH-14 Karaikal',10.92,79.83]
  ];
  const shelters = [
    ['Govt. School Shelter, Karaikal',10.92,79.85],['Community Hall, Nagapattinam',10.76,79.85],
    ['Relief Camp 4, Cuddalore',11.74,79.75],['Panchayat Union School, Thanjavur',10.80,79.16],
    ['St. Marys Shelter, Mayiladuthurai',11.10,79.65]
  ];
  const floodZoneCoords = [[10.6,79.6],[10.6,80.1],[11.0,80.2],[11.2,79.9],[11.0,79.5]];
  const cyclonePath = [[9.8,81.5],[10.3,80.8],[10.9,80.1],[11.4,79.6]];

  const layers = {};
  layers.warehouses = L.layerGroup(warehouses.map(w => makeMarker(w,'#1552F0','warehouse'))).addTo(gisMap);
  layers.shelters = L.layerGroup(shelters.map(s => makeMarker(s,'#1C9E6E','holiday_village'))).addTo(gisMap);
  layers.flood = L.polygon(floodZoneCoords, { color:'#3b82f6', fillOpacity:.22, weight:1.5 }).addTo(gisMap);
  layers.cyclone = L.polyline(cyclonePath, { color:'#8b5cf6', weight:3, dashArray:'6 6' });
  layers.quake = L.circle([10.5,79.9], { radius:15000, color:'#ef4444', fillOpacity:.3 });
  layers.landslide = L.circle([11.6,79.3], { radius:20000, color:'#a16207', fillOpacity:.18 });
  layers.blockedroads = L.layerGroup([
    L.polyline([[11.75,79.77],[11.70,79.80]], {color:'#E0433D', weight:4}),
    L.polyline([[10.79,79.14],[10.85,79.20]], {color:'#E0433D', weight:4})
  ]);
  layers.roads = L.layerGroup([ L.polyline([[13.08,80.27],[11.94,79.49],[10.79,79.14]], {color:'#94A3B8', weight:2}) ]).addTo(gisMap);

  document.querySelectorAll('.layer-toggle input[data-layer]').forEach(cb => {
    cb.addEventListener('change', () => {
      const key = cb.dataset.layer;
      if(!layers[key]) return;
      if(cb.checked) gisMap.addLayer(layers[key]); else gisMap.removeLayer(layers[key]);
    });
  });

  document.querySelectorAll('.gis-tool').forEach(btn => {
    btn.addEventListener('click', () => { document.querySelectorAll('.gis-tool').forEach(b => b.classList.remove('active')); btn.classList.add('active'); });
  });
}
function makeMarker([label,lat,lng], color, icon){
  const html = `<div style="background:${color};width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.3);border:2px solid white;"><span class="material-symbols-outlined" style="transform:rotate(45deg);color:white;font-size:14px;">${icon}</span></div>`;
  const divIcon = L.divIcon({ html, className:'', iconSize:[26,26], iconAnchor:[13,26] });
  return L.marker([lat,lng], { icon:divIcon }).bindPopup(`<b>${label}</b>`);
}

/* ---------- Simulation preview map ---------- */
let hazardCircle;
function buildSimMap(){
  simMap = L.map('simMap', { zoomControl:false }).setView(CHENNAI, 8);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom:19 }).addTo(simMap);
  L.control.zoom({ position:'bottomright' }).addTo(simMap);
  hazardCircle = L.circle(CHENNAI, { radius: 35000, color:'#1552F0', fillOpacity:.22, weight:2 }).addTo(simMap);
}

/* ---------- Simulation controls ---------- */
const simInputs = { severity:'p-severity', duration:'p-duration', rainfall:'p-rainfall', height:'p-height', radius:'p-radius', density:'p-density', vuln:'p-vuln' };
const densityLabels = ['Low','Medium','High'];
const vulnLabels = ['Low','Moderate','High'];

document.getElementById('p-severity')?.addEventListener('input', e => document.getElementById('pv-severity').textContent = `${e.target.value} / 10`);
document.getElementById('p-duration')?.addEventListener('input', e => document.getElementById('pv-duration').textContent = e.target.value);
document.getElementById('p-rainfall')?.addEventListener('input', e => document.getElementById('pv-rainfall').textContent = e.target.value);
document.getElementById('p-height')?.addEventListener('input', e => document.getElementById('pv-height').textContent = parseFloat(e.target.value).toFixed(1));
document.getElementById('p-radius')?.addEventListener('input', e => {
  document.getElementById('pv-radius').textContent = e.target.value;
  if(hazardCircle) hazardCircle.setRadius(e.target.value * 1000);
});
document.getElementById('p-density')?.addEventListener('input', e => document.getElementById('pv-density').textContent = densityLabels[e.target.value-1]);
document.getElementById('p-vuln')?.addEventListener('input', e => document.getElementById('pv-vuln').textContent = vulnLabels[e.target.value-1]);

document.querySelectorAll('.dtype-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.dtype-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    card.querySelector('input').checked = true;
  });
});

let simPlaying = false, simTimer = null;
document.getElementById('simPlay')?.addEventListener('click', () => {
  simPlaying = true; document.getElementById('simStatusTag').textContent = 'Running';
  const slider = document.getElementById('simTimeSlider');
  clearInterval(simTimer);
  simTimer = setInterval(() => {
    let v = parseInt(slider.value,10) + 2;
    if(v >= 100){ v = 100; clearInterval(simTimer); document.getElementById('simStatusTag').textContent = 'Complete'; }
    slider.value = v; updateSimTimeLabel(v);
  }, 200);
});
document.getElementById('simPause')?.addEventListener('click', () => { clearInterval(simTimer); document.getElementById('simStatusTag').textContent = 'Paused'; });
document.getElementById('simStep')?.addEventListener('click', () => {
  const slider = document.getElementById('simTimeSlider');
  slider.value = Math.min(100, parseInt(slider.value,10) + 10);
  updateSimTimeLabel(slider.value);
});
document.getElementById('simRestart')?.addEventListener('click', () => {
  clearInterval(simTimer);
  const slider = document.getElementById('simTimeSlider');
  slider.value = 0; updateSimTimeLabel(0);
  document.getElementById('simStatusTag').textContent = 'Configuring';
  document.getElementById('predictionPanel').style.display = 'none';
});
document.getElementById('simTimeSlider')?.addEventListener('input', e => updateSimTimeLabel(e.target.value));
function updateSimTimeLabel(v){
  const dur = parseInt(document.getElementById('p-duration').value,10);
  document.getElementById('simTimeLabel').textContent = `T+${Math.round(dur * v/100)}h`;
}

document.getElementById('genResultsBtn')?.addEventListener('click', () => {
  document.getElementById('predictionPanel').style.display = 'block';
  document.getElementById('simStatusTag').textContent = 'Complete';
  document.getElementById('predictionPanel').scrollIntoView({ behavior:'smooth', block:'nearest' });
  showToast('Simulation complete — AI damage prediction generated.');
});

/* ---------- Warehouses table ---------- */
const warehouseData = [
  ['WH-01','Chennai Central Depot','120,000 units',92,58,12,'Operational'],
  ['WH-03','Villupuram Regional Hub','85,000 units',64,34,8,'Operational'],
  ['WH-07','Cuddalore Coastal Store','60,000 units',15,21,5,'Critical Stock'],
  ['WH-09','Nagapattinam Port Warehouse','95,000 units',48,29,9,'Operational'],
  ['WH-12','Thanjavur District Store','70,000 units',71,18,4,'Operational'],
  ['WH-14','Karaikal Relief Depot','50,000 units',33,15,3,'Low Stock'],
  ['WH-16','Mayiladuthurai Store','55,000 units',5,9,2,'Under Maintenance'],
  ['WH-18','Pondicherry Border Hub','78,000 units',82,26,7,'Operational'],
];
function buildWarehouseTable(){
  const body = document.getElementById('warehouseTableBody');
  body.innerHTML = warehouseData.map(([id,name,cap,stock,trucks,med,status]) => {
    const color = stock < 20 ? '#E0433D' : stock < 50 ? '#E8A33D' : '#1552F0';
    const badgeClass = status === 'Operational' ? 'green' : status === 'Critical Stock' ? 'red' : status === 'Low Stock' ? 'amber' : 'red';
    return `<tr>
      <td><div class="cell-primary">${id}</div><div class="cell-sub">${name}</div></td>
      <td>${name.split(',')[0].split(' ').slice(-2).join(' ')}</td>
      <td>${cap}</td>
      <td><span class="bar-cell"><div style="width:${stock}%;background:${color}"></div></span>${stock}%</td>
      <td>${trucks}</td>
      <td>${med}</td>
      <td><span class="badge ${badgeClass}">${status}</span></td>
      <td><button class="btn btn-sm btn-secondary">View</button></td>
    </tr>`;
  }).join('');
}

/* ---------- Shelters grid ---------- */
const shelterData = [
  ['Govt. School Shelter','Karaikal',1200,1200,'Full',['Medical','Food','Water']],
  ['Community Hall','Nagapattinam',800,612,'Open',['Food','Electricity']],
  ['Relief Camp 4','Cuddalore',1000,845,'Open',['Medical','Food','Water','Electricity']],
  ['Panchayat Union School','Thanjavur',600,180,'Open',['Water']],
  ['St. Marys Shelter','Mayiladuthurai',450,450,'Full',['Food','Electricity']],
  ['Municipal Stadium','Villupuram',2000,940,'Open',['Medical','Food','Water','Electricity']],
];
function buildShelterGrid(){
  const grid = document.getElementById('shelterGrid');
  grid.innerHTML = shelterData.map(([name,loc,cap,occ,status,fac]) => {
    const pct = Math.round((occ/cap)*100);
    const badgeClass = status === 'Full' ? 'red' : 'green';
    const facIcons = { Medical:'medical_services', Food:'restaurant', Water:'water_drop', Electricity:'bolt' };
    return `<div class="shelter-card">
      <div class="shelter-card-head"><div><h4>${name}</h4><span>${loc}</span></div><span class="badge ${badgeClass}">${status}</span></div>
      <div class="shelter-occ-bar"><div style="width:${pct}%"></div></div>
      <div class="shelter-occ-label"><span>${occ} / ${cap} occupants</span><span>${pct}%</span></div>
      <div class="shelter-facilities">${fac.map(f => `<span class="fac-chip"><span class="material-symbols-outlined">${facIcons[f]}</span>${f}</span>`).join('')}</div>
    </div>`;
  }).join('');
}

/* ---------- Volunteers table ---------- */
const volunteerData = [
  ['Ravi Kumar','Medical','8 yrs','Nagapattinam','Available','—'],
  ['Priya Sundaram','Search & Rescue','5 yrs','Cuddalore','Deployed','Relief Camp 4'],
  ['Arjun Das','Engineering','6 yrs','Thanjavur','Available','—'],
  ['Meena Iyer','Logistics','3 yrs','Karaikal','Deployed','Warehouse WH-14'],
  ['Suresh Babu','Communication','4 yrs','Villupuram','Available','—'],
  ['Kavitha R.','Medical','10 yrs','Nagapattinam','Deployed','Community Hall'],
  ['Naveen T.','Search & Rescue','2 yrs','Mayiladuthurai','Off-duty','—'],
  ['Deepa Shankar','Logistics','7 yrs','Chennai','Available','—'],
];
function buildVolunteerTable(){
  const body = document.getElementById('volunteerTableBody');
  const skillIcons = { Medical:'medical_services', 'Search & Rescue':'emergency', Engineering:'construction', Logistics:'local_shipping', Communication:'cell_tower' };
  body.innerHTML = volunteerData.map(([name,skill,exp,loc,avail,assign]) => {
    const badgeClass = avail === 'Available' ? 'green' : avail === 'Deployed' ? 'blue' : 'amber';
    const initials = name.split(' ').map(n=>n[0]).slice(0,2).join('');
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:10px;"><div class="avatar sm">${initials}</div><span class="cell-primary">${name}</span></div></td>
      <td><span class="skill-chip"><span class="material-symbols-outlined" style="font-size:14px">${skillIcons[skill]}</span>${skill}</span></td>
      <td>${exp}</td>
      <td>${loc}</td>
      <td><span class="badge ${badgeClass}">${avail}</span></td>
      <td>${assign}</td>
      <td><button class="btn btn-sm btn-secondary">Assign</button></td>
    </tr>`;
  }).join('');
}

/* ---------- Relief Allocation optimizer (simulated) ---------- */
const allocPlan = [
  [1,'Zone A — Nagapattinam Coastal','WH-09','TRK-114','12','1,200','3,000 L','300 kits','42 min'],
  [2,'Zone B — Cuddalore','WH-07','TRK-088','8','900','2,200 L','220 kits','35 min'],
  [3,'Zone C — Karaikal','WH-14','TRK-021','10','1,050','2,600 L','260 kits','51 min'],
  [4,'Zone D — Thanjavur','WH-12','TRK-057','6','700','1,800 L','180 kits','28 min'],
  [5,'Zone E — Mayiladuthurai','WH-16','TRK-133','5','560','1,400 L','140 kits','39 min'],
];
document.getElementById('runOptBtn')?.addEventListener('click', () => {
  document.getElementById('optEmpty').classList.add('hidden');
  document.getElementById('optResults').classList.remove('hidden');
  document.getElementById('optStatusTag').textContent = 'Optimized';
  document.querySelectorAll('.ring').forEach(r => { r.style.setProperty('--val', r.dataset.val); });

  const flowSteps = [
    ['warehouse','WH-09 Nagapattinam Port Warehouse selected — highest inventory + shortest safe route'],
    ['local_shipping','12 trucks allocated across 5 priority zones'],
    ['groups','41 volunteers assigned to distribution points'],
    ['route','Fastest safe route computed avoiding 37 blocked road segments'],
    ['task_alt','Priority ranking finalized — Zone A first (highest population density)'],
  ];
  document.getElementById('allocFlow').innerHTML = flowSteps.map(([icon,text],i) =>
    `<div class="flow-row"><span class="material-symbols-outlined">${icon}</span><span>${text}</span>${i<flowSteps.length-1 ? '' : ''}</div>`
  ).join('');

  document.getElementById('allocTablePanel').style.display = 'block';
  document.getElementById('allocTableBody').innerHTML = allocPlan.map(row => `
    <tr>
      <td><span class="badge blue">P${row[0]}</span></td>
      <td>${row[1]}</td><td>${row[2]}</td><td>${row[3]}</td><td>${row[4]}</td>
      <td>${row[5]}</td><td>${row[6]}</td><td>${row[7]}</td><td>${row[8]}</td>
    </tr>`).join('');

  showToast('Optimization complete — allocation plan generated.');
});

/* ---------- Settings nav ---------- */
document.querySelectorAll('.settings-nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
  });
});

/* ---------- Global search shortcut ---------- */
document.addEventListener('keydown', (e) => {
  if((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'){
    e.preventDefault();
    if(!views.app.classList.contains('hidden')) document.getElementById('globalSearch').focus();
  }
});