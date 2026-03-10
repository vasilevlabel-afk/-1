function pulse(el) {
  if (!el) return;
  el.classList.add('pulse');
  setTimeout(() => el.classList.remove('pulse'), 350);
}
//* === GLOBAL EUR ONLY (Вече без делене и левове) === */
(function () {
  // Тъй като вече сме в еврозоната, курсът е 1:1
  var RATE = 1.0; 

  if (typeof window !== "undefined") {
    window.BGN_TO_EUR = RATE;

    // Вече не умножаваме по курс, връщаме директно числото
    if (typeof window.eur !== "function") {
      window.eur = function (v) { return Number(v || 0); };
    }
    
    // Форматирането остава същото – добавяме символа €
    if (typeof window.fmtEUR !== "function") {
      window.fmtEUR = function (n) { return Number(n || 0).toFixed(2) + " €"; };
    }
    
    // fmtBGN вече е идентичен с fmtEUR, за да не се чупи логиката на други места
    if (typeof window.fmtBGN !== "function") {
      window.fmtBGN = function (n) { return window.fmtEUR(n); };
    }
  }
})();

window.onerror = function (msg, url, line, col, error) {
  alert("⚠️ Грешка в JS:\n" + msg + "\nРед: " + line + "\nФайл: " + url);
  return false;
};

/* === SAFARI-PROOF SPLASH KILLER === */
(function () {
  function hideSplash() {
    const el = document.getElementById("splash-screen");
    if (!el) return;

    document.body.classList.add("loaded");

    el.style.pointerEvents = "none";
    el.style.transition = "opacity 0.6s ease, visibility 0.6s ease";
    el.style.opacity = "0";
    el.style.visibility = "hidden";

    setTimeout(() => {
      try { el.remove(); } catch (_) {}
    }, 700);
  }

  if (document.readyState === "complete") {
    hideSplash();
  } else {
    window.addEventListener("load", hideSplash, { once: true });
    document.addEventListener("DOMContentLoaded", () => setTimeout(hideSplash, 400), { once: true });
    setTimeout(hideSplash, 1500);
  }
})();
/******************************************************************
 * ОБЩА СМЕТКА (поправена версия – само евро, без грешки)
 ******************************************************************/
const bill = (() => {
  try {
    return JSON.parse(localStorage.getItem('km_bill') || '[]');
  } catch {
    return [];
  }
})();

let elsBill = {
  body: document.getElementById('billBody'),
  grandBGN: document.getElementById('grandBGN'),
  savePDF: document.getElementById('savePDF'),
  sendOffer: document.getElementById('sendOffer'),
  clearBill: document.getElementById('clearBill')
};

function saveBill() {
  localStorage.setItem('km_bill', JSON.stringify(bill));
}

function renderBill() {
  if (!elsBill.body) return;

  elsBill.body.innerHTML = '';
  let sumEUR = 0;

  bill.forEach((r, i) => {
    sumEUR += r.priceEUR;
    const tr = document.createElement('tr');
    tr.innerHTML = `
  <td>${i + 1}</td>
  <td>${r.service}</td>
  <td>${r.details}</td>
  <td>${r.priceEUR.toFixed(2)} €</td>
  <td><button class="btn danger btn-del" data-i="${i}">❌</button></td>
`;
    elsBill.body.appendChild(tr);
  });

  if (elsBill.grandBGN) elsBill.grandBGN.textContent = `${sumEUR.toFixed(2)} €`;

  elsBill.body.querySelectorAll('.btn-del').forEach(b => {
    b.addEventListener('click', e => {
      const i = +e.currentTarget.dataset.i;
      const removed = bill[i]?.service || "Ред";
      bill.splice(i, 1);
      saveBill();
      renderBill();
      updateFinalTotals?.();
      showToast?.(`🗑️ ${removed} е премахнатo от сметката!`);
    });
  });
}

renderBill();

/* === Изчистване на сметката === */
elsBill.clearBill?.addEventListener('click', () => {
  if (confirm('Сигурни ли сте, че искате да изчистите сметката?')) {
    bill.length = 0;
    saveBill();
    renderBill();
    updateFinalTotals?.();
  }
});

/* === Добавяне на ред === */
function pushRow(r) {
  bill.push(r);
  saveBill();
  renderBill();
  updateFinalTotals?.();
}

/******************************************************************
 * СКРИВАНЕ НА "ОБЩА СМЕТКА" ПРИ ТАБ "ЗА НАС"
 ******************************************************************/
const summarySection = document.getElementById("summary");
const allTabs = document.querySelectorAll(".main-tabs .tab");

function toggleSummaryVisibility(activeTabKey) {
  if (!summarySection) return;
  summarySection.style.display = (activeTabKey === "about") ? "none" : "";
}

// Първоначална проверка
const activeStartTab = document.querySelector(".main-tabs .tab.active");
if (activeStartTab) toggleSummaryVisibility(activeStartTab.dataset.tab);

// Слушаме кликовете върху табовете
allTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    toggleSummaryVisibility(tab.dataset.tab);
  });
});

/******************************************************************
 * ТАБОВЕ: показване/скриване на секциите + активен бутон
 ******************************************************************/
(function tabsController() {
  const tabs = [...document.querySelectorAll('.main-tabs .tab')];
  const sections = [...document.querySelectorAll('.panel.section')];
  const summary = document.getElementById('summary');

  function toggleSummaryVisibility(activeKey) {
    if (!summary) return;
    summary.style.display = (activeKey === 'about') ? 'none' : '';
  }

  function showTab(key) {
    tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === key));
    sections.forEach(sec => {
      const isMatch = sec.dataset.section === key;
      sec.classList.toggle('hidden', !isMatch);
      sec.setAttribute('aria-hidden', String(!isMatch));
    });
    toggleSummaryVisibility(key);
    try { history.replaceState(null, '', `#${key}`); } catch(_) {}
  }

  tabs.forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });

  const fromHash = (location.hash || '').replace('#', '');
  const initialKey =
    (fromHash && sections.some(s => s.dataset.section === fromHash)) ?
      fromHash :
      (tabs.find(b => b.classList.contains('active'))?.dataset.tab || 'about');

  showTab(initialKey);
})();

/******************************************************************
 * КОПИРАНЕ — ЦЕНИ ИЗЦЯЛО В ЕВРО (0.08 € * 100 = 8.00 €)
 ******************************************************************/

// Цени в ЕВРО за копиране
function unitCopyPriceEUR(format, color, qty) {
  if (format === "A4") {
    if (color === "color") return 0.51; // твоята цветна цена в евро
    return qty <= 50 ? 0.08 : 0.06;      // Ч/Б в евро
  } else {
    if (color === "color") return 1.02;
    return qty <= 50 ? 0.15 : 0.12;
  }
}

// Медия — добавка в евро, НИКАКВИ лева
const MEDIA_A4 = [
  { name:"Хартия 80 гр.", addEUR:0.00 },
  { name:"Цветен лист", addEUR:0.04 },
  { name:"Картон 160 гр.", addEUR:0.10 },
  { name:"Картон 250 гр.", addEUR:0.20 },
  { name:"Картон 350 гр.", addEUR:0.20 },
  { name:"Фото Картон 300 гр.", addEUR:0.30 },
  { name:"Магнитен лист", addEUR:1.53 },
  { name:"Перлен картон 250 гр.", addEUR:0.61 },
  { name:"Цветен картон 160 гр.", addEUR:0.10 },
  { name:"(С.З.Л.) Самозалепващ лист", addEUR: 0.20 },
  { name:"(С.З.Л.) Водоустойчив, Некъсащ се", addEUR:0.35 },
  { name:"(С.З.Л.) Прозрачен", addEUR:0.30 },
  { name:"Паус", addEUR:0.15 },
  { name:"ПВЦ лист", addEUR:1.53 }
];

const MEDIA_A3 = [
  { name:"Хартия 80 гр.", addEUR:0.00 },
  { name:"Картон 160 гр.", addEUR:0.36 },
  { name:"Картон 250 гр.", addEUR:0.41 },
  { name:"Картон 350 гр.", addEUR:0.41 },
  { name:"Фото Картон 230 гр.", addEUR:0.60 },
  { name:"Самозалепващ лист", addEUR:0.41 },
  { name:"Паус", addEUR:0.31 },
  { name:"ПВЦ лист", addEUR:3.06 }
];

const copy = {
  format: document.getElementById("format"),
  color: document.getElementById("colorMode"),
  qty: document.getElementById("qty"),
  media: document.getElementById("media"),
  rowBGN: document.getElementById("rowTotalBGN"), // тук ще пишем EURO
  add: document.getElementById("addBtn"),
  clear: document.getElementById("clearCopy")
};

// Попълване на медията в ЕВРО
function fillCopy() {
  const list = copy.format.value === "A4" ? MEDIA_A4 : MEDIA_A3;
  copy.media.innerHTML = "";

  list.forEach((m, i) => {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = `${m.name} (+${m.addEUR.toFixed(2)} €)`;
    copy.media.appendChild(o);
  });
}
fillCopy();

// Основно изчисление — ИЗЦЯЛО В ЕВРО
function calcCopy(pulseOn = true) {
  const f = copy.format.value;
  const c = copy.color.value;
  const q = Math.max(1, Number(copy.qty.value || 1));

  const list = f === "A4" ? MEDIA_A4 : MEDIA_A3;
  const m = list[Number(copy.media.value)] || list[0];

  // ЕВРО цена на 1 брой
  const unitEUR = unitCopyPriceEUR(f, c, q) + m.addEUR;

  // ОБЩА СУМА — директно в евро
  const totalEUR = +(unitEUR * q).toFixed(2);

  copy.rowBGN.textContent = totalEUR.toFixed(2) + " €";

  if (pulseOn) pulse(copy.rowBGN);

  return {
    service: "Копиране",
    details: `${f}, ${c === "color" ? "Цветно" : "Ч/Б"}, ${q} бр., ${m.name}`,
    priceEUR: totalEUR
  };
}

["input", "change"].forEach(ev =>
  [copy.format, copy.color, copy.qty, copy.media].forEach(el =>
    el && el.addEventListener(ev, () => {
      if (el === copy.format) fillCopy();
      calcCopy();
    })
  )
);

copy.add?.addEventListener("click", () => {
  const r = calcCopy(false);
  if (r) {
    pushRow(r);
    showToast("✅ Копиране е добавено към сметката!");
  }
});

copy.clear?.addEventListener("click", () => {
  copy.format.value = "A4";
  copy.color.value = "bw";
  copy.qty.value = "1";
  fillCopy();
  calcCopy();
});

calcCopy(false);


/******************************************************************
 * ШИРОКОФОРМАТЕН ПЕЧАТ (с капси и динамична визуализация)
 ******************************************************************/
const wf = {
  width: document.getElementById('wfWidth'),
  height: document.getElementById('wfHeight'),
  color: document.getElementById('wfColor'),
  media: document.getElementById('wfMedia'),
  canvas: document.getElementById('wfCanvas'),
  rowBGN: document.getElementById('wfRowBGN'),
  rowEUR: document.getElementById('wfRowEUR'),
  area: document.getElementById('wfArea'),
  unit: document.getElementById('wfUnit'),
  add: document.getElementById('wfAdd'),
  clear: document.getElementById('wfClear'),
  grommets: document.getElementById('wfGrommets'),
  capsCount: document.getElementById('wfCapsCount'),
  capsClear: document.getElementById('wfCapsClear'),
  previewWrap: document.getElementById('wfPreviewWrap'),
  download: document.getElementById('wfDownload')
};

const WF_MEDIA = [
  { name: "Хартия 80гр.", addEUR: 0.00 },
  { name: "Картон 180гр.", addEUR: 5.22 }, // 10.21 лв. -> 5.22 €
  { name: "Лепящо фолио", addEUR: 12.99 }, // 25.41 лв. -> 12.99 €
  { name: "Канава", addEUR: 14.92 }         // 29.18 лв. -> 14.92 €
];

(function fillWFMedia() {
  if (!wf.media) return;
  wf.media.innerHTML = "";

  WF_MEDIA.forEach((m, i) => {
    const o = document.createElement("option");
    o.value = i;
    
    // Взимаме директно addEUR, без да делим на курса
    const price = Number(m.addEUR || 0).toFixed(2);
    
    o.textContent = `${m.name} (+${price} €/м²)`;
    wf.media.appendChild(o);
  });
})();

const ctx = wf.canvas?.getContext("2d");

// Капси (0..1 координати)
let grommets = [];
const CAP_PRICE_EUR = 0.50;

function drawWF() {
  if (!ctx) return;
  const W = wf.canvas.width, H = wf.canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);

  const w = Number(wf.width.value || 500),
        h = Number(wf.height.value || 700);
  const pad = 20;
  const s = Math.min((W - 2 * pad) / w, (H - 2 * pad) / h);
  const rw = w * s, rh = h * s;
  const ox = (W - rw) / 2, oy = (H - rh) / 2;

  ctx.fillStyle = "#f8fafc";
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2;
  ctx.fillRect(ox, oy, rw, rh);
  ctx.strokeRect(ox, oy, rw, rh);

  if (wf.grommets?.checked) {
    ctx.fillStyle = "#1f2937";
    grommets.forEach(pt => {
      const x = ox + pt.x * rw;
      const y = oy + pt.y * rh;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

/******************************************************************
 * ШИРОКОФОРМАТЕН ПЕЧАТ (ИЗЦЯЛО В ЕВРО - FINAL)
 ******************************************************************/
function updateWFMeta() {
  const w = Number(wf.width.value || 500),
        h = Number(wf.height.value || 700);
  const area = (w / 1000) * (h / 1000);

  // ✅ Директни нови цени в ЕВРО
  const baseEUR = wf.color.value === "color" ? 15.35 : 6.00;

  // ✅ Взимаме добавката директно от addEUR
  const addEUR = WF_MEDIA[Number(wf.media.value)]?.addEUR || 0;

  const unitEUR = baseEUR + addEUR;

  // Капсите също са в евро (0.50 €)
  const capsCostEUR = wf.grommets?.checked
    ? grommets.length * CAP_PRICE_EUR
    : 0;

  const totalEUR = area * unitEUR + capsCostEUR;

  // Обновяване на дисплея - само евро
  wf.area.textContent = `${area.toFixed(3)} м²`;
  wf.unit.textContent = `${unitEUR.toFixed(2)} €/м²`;
  wf.rowBGN.textContent = `${totalEUR.toFixed(2)} €`;

  if (wf.rowEUR) wf.rowEUR.textContent = "";
}

function calcWF(pulseOn = true) {
  updateWFMeta();
  if (pulseOn) pulse(wf.rowBGN);

  const w = Number(wf.width.value || 500),
        h = Number(wf.height.value || 700);
  const area = (w / 1000) * (h / 1000);

  // ✅ Директни цени и тук
  const baseEUR = wf.color.value === "color" ? 15.35 : 6.00;
  const addEUR = WF_MEDIA[Number(wf.media.value)]?.addEUR || 0;

  const unitEUR = baseEUR + addEUR;

  const capsCostEUR = wf.grommets?.checked
    ? grommets.length * CAP_PRICE_EUR
    : 0;

  const totalEUR = area * unitEUR + capsCostEUR;

  return {
    service: "Широкоформатен печат",
    details: `${w}×${h} мм${wf.grommets?.checked ? `, Капси: ${grommets.length} бр.` : ""}`,
    priceEUR: +totalEUR.toFixed(2)
  };
}

// === ОСТАНАЛАТА ЛОГИКА (СЪБИТИЯ И ИЗЧИСТВАНЕ) ОСТАВА СЪЩАТА ===
["input", "change"].forEach(ev =>
  [wf.width, wf.height, wf.color, wf.media].forEach(el =>
    el && el.addEventListener(ev, () => {
      drawWF();
      calcWF();
    })
  )
);

wf.clear?.addEventListener("click", () => {
  wf.width.value = "500";
  wf.height.value = "700";
  wf.color.value = "color";
  wf.media.value = "0";
  grommets = [];
  if (wf.capsCount) wf.capsCount.textContent = "0";
  drawWF();
  calcWF();
});

wf.add?.addEventListener("click", () => {
  const r = calcWF(false);
  if (r) {
    pushRow(r);
    showToast("✅ Широкоформатен печат е добавен към сметката!");
  }
});

wf.grommets?.addEventListener("change", () => {
  if (wf.previewWrap)
    wf.previewWrap.classList.toggle("hidden", !wf.grommets.checked);
  drawWF();
  calcWF();
});

wf.capsClear?.addEventListener("click", () => {
  grommets = [];
  if (wf.capsCount) wf.capsCount.textContent = "0";
  drawWF();
  calcWF();
});

wf.canvas?.addEventListener("click", (e) => {
  if (!wf.grommets.checked) return;
  const rect = wf.canvas.getBoundingClientRect();
  const scaleX = wf.canvas.width / rect.width;
  const scaleY = wf.canvas.height / rect.height;
  const cx = (e.clientX - rect.left) * scaleX;
  const cy = (e.clientY - rect.top) * scaleY;
  const W = wf.canvas.width, H = wf.canvas.height;
  const w = Number(wf.width.value || 500), h = Number(wf.height.value || 700);
  const pad = 20;
  const s = Math.min((W - 2 * pad) / w, (H - 2 * pad) / h);
  const rw = w * s, rh = h * s;
  const ox = (W - rw) / 2, oy = (H - rh) / 2;
  if (cx < ox || cx > ox + rw || cy < oy || cy > oy + rh) return;
  const nx = (cx - ox) / rw;
  const ny = (cy - oy) / rh;
  const idx = grommets.findIndex(p => Math.hypot(p.x - nx, p.y - ny) < 0.04);
  if (idx > -1) grommets.splice(idx, 1);
  else grommets.push({ x: nx, y: ny });
  if (wf.capsCount) wf.capsCount.textContent = String(grommets.length);
  drawWF();
  calcWF();
});

wf.download?.addEventListener("click", () =>
  downloadCanvas("wfCanvas", "wide-format.png")
);

drawWF();
calcWF(false);

/******************************************************************
 * СКАНИРАНЕ — точно пресмятане по евро цените от текста
 ******************************************************************/
const scan = {
  size:  document.getElementById('scanSize'),
  qty:   document.getElementById('scanQty'),
  dpi:   document.getElementById('scanDPI'),
  color: document.getElementById('scanColor'),
  fmt:   document.getElementById('scanFormat'),
  rowBGN:document.getElementById('scanRowBGN'),
  rowEUR:document.getElementById('scanRowEUR'),
  add:   document.getElementById('scanAdd'),
  clear: document.getElementById('scanClear')
};

// 🟢 Взимаме ЕВРО цената от текста "(0.26 €)"
function getScanEuroPrice() {
  const text = scan.size?.selectedOptions?.[0]?.textContent || "";
  const match = text.match(/([\d.]+)\s*€/); 
  return match ? Number(match[1]) : 0;
}

function calcScan(pulseOn=true){
  if (!scan.size) return null;

  const unitEUR = getScanEuroPrice();  // ← ВЗИМАМЕ ИСТИНСКАТА € ЦЕНА
  const q = Math.max(1, Number(scan.qty?.value || 1));
  const totEUR = unitEUR * q;

  scan.rowBGN.textContent = `${totEUR.toFixed(2)} €`;
  if (scan.rowEUR) scan.rowEUR.textContent = "";

  if (pulseOn) pulse(scan.rowBGN);

  const details = `${scan.size?.selectedOptions?.[0]?.textContent||''}, ${scan.dpi?.value||''}, ${scan.color?.value||''}, ${scan.fmt?.value||''}, ${q} бр.`;

  return { service:'Сканиране', details, priceEUR:+totEUR.toFixed(2) };
}

['input','change'].forEach(ev=>{
  [scan.size,scan.qty,scan.dpi,scan.color,scan.fmt].forEach(el=> 
    el && el.addEventListener(ev, ()=> calcScan())
  );
});

scan.clear?.addEventListener('click', ()=>{
  scan.size.value='0.50';
  scan.qty.value='1';
  scan.dpi.value='300 DPI';
  scan.color.value='Цветно';
  scan.fmt.value='PDF';
  calcScan();
});

scan.add?.addEventListener("click", () => {
  const r = calcScan(false);
  if (r) {
    pushRow(r);
    showToast("✅ Сканиране е добавено към сметката!");
  }
});

calcScan(false);

/******************************************************************
 * ПОДВЪРЗВАНЕ — поправено, работи САМО в евро
 ******************************************************************/

// ЦЕНИТЕ ВЕЧЕ СА В ЕВРО (без левове, без конвертиране)
const BIND_TYPES = {
  A4: [
    { name: "Подвързване с пластмасова спирала (гребен)", priceEUR: 2.50 },
    { name: "Подвързване с метална спирала (гребен)",     priceEUR: 2.80 },
    { name: "Подвързване с лепене",                       priceEUR: 3.50 },
    { name: "Подвързване тип папка лукс",                 priceEUR: 15.00 },
    { name: "Подвързване на учебник с точен размер",      priceEUR: 1.49 }
  ],
  A3: [
    { name: "Подвързване с пластмасова спирала (гребен)", priceEUR: 2.50 },
    { name: "Подвързване с метална спирала (гребен)",     priceEUR: 2.80 }
  ]
};

const bind = {
  format: document.getElementById('bindFormat'),
  type:   document.getElementById('bindType'),
  qty:    document.getElementById('bindQty'),
  note:   document.getElementById('bindNote'),
  rowBGN: document.getElementById('bindRowBGN'),
  rowEUR: document.getElementById('bindRowEUR'),
  add:    document.getElementById('bindAdd'),
  clear:  document.getElementById('bindClear')
};

// Попълва падащото меню с евро цени
function fillBindTypes() {
  if (!bind.type || !bind.format) return;
  const list = BIND_TYPES[bind.format.value] || [];

  bind.type.innerHTML = "";

  list.forEach((t, i) => {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = `${t.name} (${t.priceEUR.toFixed(2)} €)`;
    bind.type.appendChild(o);
  });

  bind.note.style.display = bind.format.value === "A3" ? "inline-block" : "none";
}

fillBindTypes();

// основно изчисление — САМО в евро
function calcBind(pulseOn = true) {
  const list = BIND_TYPES[bind.format.value] || [];
  const t = list[Number(bind.type.value)] || list[0];
  if (!t) return;

  const qty = Math.max(1, Number(bind.qty.value || 1));

  // 🟢 тотал в ЕВРО (без левове)
  let totalEUR = t.priceEUR * qty;
  totalEUR = Math.round(totalEUR * 100) / 100;

  bind.rowBGN.textContent = totalEUR.toFixed(2) + " €";
  bind.rowEUR.textContent = "";

  if (pulseOn) pulse(bind.rowBGN);

  return {
    service: "Подвързване",
    details: `${bind.format.value}, ${t.name}, Количество: ${qty} бр.` 
              + (bind.format.value === 'A3' ? " (по късата страна)" : ""),
    priceEUR: +totalEUR.toFixed(2)
  };
}

// следене на промени
["input", "change"].forEach(ev => {
  [bind.format, bind.type, bind.qty].forEach(el =>
    el && el.addEventListener(ev, () => {
      if (el === bind.format) fillBindTypes();
      calcBind();
    })
  );
});

// изчистване
bind.clear?.addEventListener("click", () => {
  bind.format.value = "A4";
  fillBindTypes();
  bind.type.value = "0";
  bind.qty.value = "1";
  calcBind();
});

// добавяне към сметката
bind.add?.addEventListener("click", () => {
  const result = calcBind(false);
  if (result) {
    pushRow(result);
    showToast("✅ Подвързване е добавено към сметката!");
  }
});

calcBind(false);
/******************************************************************
 * ЛАМИНИРАНЕ
 ******************************************************************/
const lam = {
  size: document.getElementById("lamSize"),
  mic: document.getElementById("lamMic"),
  qty: document.getElementById("lamQty"),
  rowBGN: document.getElementById("lamRowBGN"),
  rowEUR: document.getElementById("lamRowEUR"),
  add: document.getElementById("lamAdd"),
  clear: document.getElementById("lamClear")
};

function calcLam(pulseOn = true) {
  if (!lam.size) return null;

  const unitBGN = Number(lam.size.value || 0);        // 0.70, 1.00, 2.00 (в ЛЕВА)
  const unitEUR = +(eur(unitBGN).toFixed(2));         // конвертираме в евро и закръгляме

  const q = Math.max(1, Number(lam.qty?.value || 1)); // количество

  // 🔵 ОБЩА СУМА В ЕВРО: единична € цена × бройки
  const totalEUR = +(unitEUR * q).toFixed(2);

  // Показваме само евро (както искаш)
  lam.rowBGN.textContent = fmtEUR(totalEUR);
  if (lam.rowEUR) lam.rowEUR.textContent = "";

  if (pulseOn) {
    pulse(lam.rowBGN);
  }

  return {
    service: "Ламиниране",
    details: `${lam.size?.selectedOptions?.[0]?.textContent || ''}, ${lam.mic?.value || ''} mic, ${q} бр.`,
    priceEUR: totalEUR
  };
}

['input', 'change'].forEach(ev =>
  [lam.size, lam.mic, lam.qty].forEach(el =>
    el && el.addEventListener(ev, () => calcLam())
  )
);

lam.clear?.addEventListener('click', () => {
  if (lam.size) lam.size.value = '1.00';
  if (lam.mic) lam.mic.value = '80';
  if (lam.qty) lam.qty.value = '1';
  calcLam();
});

/* Добавяне + toast известие */
lam.add?.addEventListener('click', () => {
  const r = calcLam(false);
  if (r) {
    pushRow(r);
    showToast("✅ Ламиниране е добавено към сметката!");
  }
});

calcLam(false);

/******************************************************************
 * ВИЗИТКИ — коректни евро суми + запазени цени в менюто
 ******************************************************************/
const CARD_PRICES = {
  "350":  { color:{ single:17, double:25 }, bw:{ single:9,  double:13 } },
  "pearl":{ color:{ single:23, double:31 }, bw:{ single:13, double:18 } },
  "pvc":  { color:{ single:35, double:47 }, bw:{ single:29, double:34 } }
};

const cards = {
  packs: document.getElementById('cardsPacks'),
  color: document.getElementById('cardsColor'),
  size:  document.getElementById('cardsSize'),
  sides: document.getElementById('cardsSides'),
  paper: document.getElementById('cardsPaper'),
  rowBGN:document.getElementById('cardsRowBGN'),
  rowEUR:document.getElementById('cardsRowEUR'),
  add:   document.getElementById('cardsAdd'),
  clear: document.getElementById('cardsClear')
};

/* 🔥 Обновяване на визуалните цени в падащото меню (без махане!) */
function updatePaperMenuPrices() {
  [...cards.paper.options].forEach(opt => {
    const key = opt.value;
    const table = CARD_PRICES[key];
    if (!table) return;

    const color = cards.color.value;
    const side  = cards.sides.value;

    const priceBGN = table[color][side];     // цена за 100 бр. в ЛЕВА
    const priceEUR = (priceBGN / 1.95583).toFixed(2);

    // връщаме пълния оригинален текст + цена
    const baseName = opt.textContent.split("(")[0].trim();
    opt.textContent = `${baseName} (${priceEUR} €)`;
  });
}

/* цена за 100 бр. (BGN) */
function baseCardUnitBGN() {
  if(cards.size.value !== "90x50") return 0;
  return CARD_PRICES[cards.paper.value][cards.color.value][cards.sides.value];
}

function calcCards(pulseOn = true) {
  const packs = Math.max(1, Math.round(cards.packs.value / 100));
  const unitBGN = baseCardUnitBGN();

  // 🔥 конвертираме единичната цена към евро и ЗАКЛЮЧВАМЕ до 2 знака
  const unitEUR = +(unitBGN / 1.95583).toFixed(2);

  // 🔥 тотал — без повторна конверсия
  const totalEUR = +(unitEUR * packs).toFixed(2);

  cards.rowBGN.textContent = totalEUR.toFixed(2) + " €";
  if (cards.rowEUR) cards.rowEUR.textContent = "";

  if (pulseOn) pulse(cards.rowBGN);

  const details =
    `Размер: 90×50 мм, ` +
    `${cards.color.value === "color" ? "Цветни" : "Черно-бели"}, ` +
    `${cards.sides.value === "single" ? "Едностранни" : "Двустранни"}, ` +
    `${cards.paper.selectedOptions[0].textContent}, ` +
    `Комплекти: ${packs * 100} бр.`;

  return {
    service: "Визитки",
    details,
    priceEUR: totalEUR
  };
}

/*** Слушатели ***/
["input", "change"].forEach(ev => {
  [cards.packs, cards.color, cards.sides, cards.paper].forEach(el => {
    el?.addEventListener(ev, () => {
      updatePaperMenuPrices();
      calcCards();
    });
  });
});

/*** Начално зареждане ***/
updatePaperMenuPrices();
calcCards(false);

/*** Изчистване ***/
cards.clear?.addEventListener("click", () => {
  cards.packs.value = "100";
  cards.color.value = "color";
  cards.sides.value = "single";
  cards.paper.value = "350";
  updatePaperMenuPrices();
  calcCards();
});

/*** Добавяне в сметката ***/
cards.add?.addEventListener("click", () => {
  const r = calcCards(false);
  if (r) {
    pushRow(r);
    showToast("✅ Визитки са добавени към сметката!");
  }
});


/******************************************************************
 * ЕТИКЕТИ (визуализация само при „Напечатани“) — БАЗОВО В ЕВРО
 ******************************************************************/
const LABEL_SIZES_SEMI = ["20x30","50x30","58x43","100x40","100x70","100x90"];
const LABEL_SIZES_TH   = ["100x90","100x150"];
// 💶 всички стойности вече са в евро
const LABEL_PRICES = {
  printed: {
    semi:   {"20x30":4.60,"50x30":5.11,"58x43":6.14,"100x40":10.22,"100x70":12.79,"100x90":15.34},
    thermal:{"100x90":17.90,"100x150":20.45}
  },
  blank: {
    semi:   {"20x30":3.07,"50x30":3.58,"58x43":4.09,"100x40":10.22,"100x70":10.22,"100x90":12.79},
    thermal:{"100x90":3.84,"100x150":4.60}
  }
};

const labels = {
  printRadios:   [...document.querySelectorAll('input[name="lblPrint"]')],
  materialRadios:[...document.querySelectorAll('input[name="lblMaterial"]')],
  size:          document.getElementById('lblSize'),
  rolls:         document.getElementById('lblRolls'),
  text:          document.getElementById('lblText'),
  canvas:        document.getElementById('lblCanvas'),
  rowBGN:        document.getElementById('lblRowBGN'),
  rowEUR:        document.getElementById('lblRowEUR'),
  add:           document.getElementById('lblAdd'),
  clear:         document.getElementById('lblClear'),
  download:      document.getElementById('lblDownload'),
  previewWrap:   document.querySelector('#sec-labels .preview-wrap'),
  textFieldWrap: document.getElementById('lblText') ? document.getElementById('lblText').closest('.field') : null
};
const lctx = labels.canvas ? labels.canvas.getContext('2d') : null;

function lblPrintType(){return(labels.printRadios.find(x=>x.checked)?.value)||'printed';}
function lblMaterial(){return(labels.materialRadios.find(x=>x.checked)?.value)||'semi';}

/* === Падащо меню с евро цени === */
function fillLabelSizes(){
  if(!labels.size)return;
  const p=lblPrintType(),m=lblMaterial();
  const pool=m==='semi'?LABEL_SIZES_SEMI:LABEL_SIZES_TH;
  labels.size.innerHTML='';
  pool.forEach(sz=>{
    const priceEUR = LABEL_PRICES[p][m][sz];
    if(typeof priceEUR!=='number')return;
    const o=document.createElement('option');
    o.value=sz;
    o.textContent=`${sz.replace('x','×')} мм – ${priceEUR.toFixed(2)} € / 1000 бр.`;
    labels.size.appendChild(o);
  });
  labels.size.value = labels.size.querySelector('option')?.value || '';
}

/* === Визуализация === */
function drawLabelPreview(){
  if(!lctx||!labels.canvas)return;
  const W=labels.canvas.width,H=labels.canvas.height;
  lctx.clearRect(0,0,W,H);
  lctx.fillStyle='#fff';lctx.fillRect(0,0,W,H);

  const sel = labels.size?.value || '20x30';
  let [wmm, hmm] = sel.split('x').map(Number);
  if (sel === "20x30") [wmm, hmm] = [hmm, wmm];
  const pad=20;
  const s=Math.min((W-2*pad)/wmm,(H-2*pad)/hmm);
  const rw=wmm*s,rh=hmm*s,ox=(W-rw)/2,oy=(H-rh)/2;
  lctx.fillStyle='#f8fafc';lctx.strokeStyle='#94a3b8';lctx.lineWidth=2;
  lctx.fillRect(ox,oy,rw,rh);lctx.strokeRect(ox,oy,rw,rh);

  if(lblPrintType()!=='printed')return;
  const text=(labels.text?.value||'').trim();if(!text)return;

  const maxW=rw-16;let fs=22;let lines;
  const wrap=(txt,f)=>{
    lctx.font=`bold ${f}px Arial`;
    const words=txt.split(/\s+/);
    const out=[''];
    words.forEach(w=>{
      const trial = out[out.length-1] ? out[out.length-1] + ' ' + w : w;
      if(lctx.measureText(trial).width > maxW){
        out.push(w);
      }else{
        out[out.length-1] = trial;
      }
    });
    return out;
  };
  do{
    lines = wrap(text, fs);
    const h = lines.length * fs * 1.15;
    if(h <= rh - 16 && lctx.measureText(lines.reduce((a,b)=>a.length>b.length?a:b,'')).width <= maxW) break;
    fs--;
  }while(fs>=8);

  lctx.fillStyle='#111';lctx.textAlign='center';lctx.textBaseline='middle';
  lctx.font=`bold ${fs}px Arial`;
  const lh=fs*1.15;
  let y=oy + (rh - lines.length*lh)/2 + lh/2;
  lines.forEach(line=>{
    lctx.fillText(line, ox + rw/2, y);
    y += lh;
  });
}

/* === Изчисление и обща сума (в евро) === */
function calcLabels(p=true){
  const pType=lblPrintType(),m=lblMaterial(),sz=labels.size.value;
  const unitEUR = LABEL_PRICES[pType][m][sz]||0;
  const rolls=Math.max(1,Number(labels.rolls.value||1));
  const totEUR=unitEUR*rolls;

  labels.rowBGN.textContent=fmtEUR(totEUR);
  if (labels.rowEUR) labels.rowEUR.textContent="";
  if(p){pulse(labels.rowBGN);}

  const txt=(labels.text?.value||'').trim();
  const extra=(pType==='printed'&&txt)?`, Текст: "${txt}"`:'';
  return{
    service:'Етикети',
    details:`${pType==='printed'?'Напечатани':'Ненапечатани'}, ${m==='semi'?'Полугланц':'Термо'}, Размер: ${sz.replace('x','×')} мм, ${rolls} ролки${extra}`,
    priceEUR:+totEUR.toFixed(2)
  };
}

/* === Обновяване на UI === */
function refreshLabelsUI(){
  const printed=lblPrintType()==='printed';
  if(labels.previewWrap)labels.previewWrap.style.display=printed?'block':'none';
  if(labels.textFieldWrap)labels.textFieldWrap.style.display=printed?'block':'none';
  if(!printed&&labels.text)labels.text.value='';
  if(printed)drawLabelPreview();
  calcLabels();
}

/* === Събития === */
labels.printRadios.forEach(r=>r.addEventListener('change',()=>{fillLabelSizes();refreshLabelsUI();}));
labels.materialRadios.forEach(r=>r.addEventListener('change',()=>{fillLabelSizes();refreshLabelsUI();}));
labels.text?.addEventListener('input',()=>{if(lblPrintType()==='printed')drawLabelPreview();});
labels.rolls?.addEventListener('input',()=>calcLabels());
labels.size?.addEventListener('change',()=>{drawLabelPreview();calcLabels();});
labels.clear?.addEventListener('click',()=>{
  labels.printRadios.forEach(r=>r.checked=r.value==='printed');
  labels.materialRadios.forEach(r=>r.checked=r.value==='semi');
  if(labels.text)labels.text.value='';
  if(labels.rolls)labels.rolls.value='1';
  fillLabelSizes();
  refreshLabelsUI();
});

/* === Добавяне към сметката === */
labels.add?.addEventListener('click',()=>{
  const r=calcLabels(false);
  if(r){
    pushRow(r);
    showToast("✅ Етикети са добавени към сметката!");
  }
});

/* === Изтегляне на визуализация === */
labels.download?.addEventListener('click',()=>downloadCanvas('lblCanvas','label.png'));

/* === Начално зареждане === */
fillLabelSizes();
refreshLabelsUI();

/******************************************************************
 * ФИРМЕНИ ПЕЧАТИ (визуализация) — FIXED
 ******************************************************************/
const STAMP_PRICES = {
  brother: {"30x30":14.38,"40x40":17.90,"14x38":13.29,"18x50":14.83,"22x60":17.90,"27x70":20.45,"40x90":29.14},
  colop:   {"30x30":14.38,"40x40":17.90,"18x47":14.83}
};
const CIRCLE_SIZES = new Set(["30x30","40x40"]);

const stamp = {
  brand:document.getElementById('stampBrand'),
  size:document.getElementById('stampSize'),
  color:document.getElementById('stampColor'),
  qty:document.getElementById('stampQty'),

  roundTop:document.getElementById('roundTop'),
  roundBottom:document.getElementById('roundBottom'),
  roundCenter:document.getElementById('roundCenter'),

  rectCompany:document.getElementById('rectCompany'),
  rectCity:document.getElementById('rectCity'),
  rectCountry:document.getElementById('rectCountry'),
  rectStreet:document.getElementById('rectStreet'),
  rectVAT:document.getElementById('rectVAT'),

  roundWrap:document.getElementById('roundFields'),
  rectWrap:document.getElementById('rectFields'),

  canvas:document.getElementById('stampCanvas'),
  rowBGN:document.getElementById('stampRowBGN'),
  rowEUR:document.getElementById('stampRowEUR'),
  add:document.getElementById('stampAdd'),
  clear:document.getElementById('stampClear')
};
const scx = stamp.canvas ? stamp.canvas.getContext('2d') : null;

/* --- Пълнене на размерите, без да „забива“ селекта и с запазване на избора --- */
function fillStampSizes(){
  if(!stamp.size || !stamp.brand) return;
  const list = STAMP_PRICES[stamp.brand.value] || {};
  const prev = stamp.size.value;          // запази предишния избор, ако е валиден
  stamp.size.disabled = false;
  stamp.size.innerHTML = '';
  Object.keys(list).forEach(k=>{
    const o = document.createElement('option');
    o.value = k;
    o.textContent = `${k.replace('x','×')} мм – ${list[k].toFixed(2)} €`;
    stamp.size.appendChild(o);
  });
  if (prev && list[prev] != null) stamp.size.value = prev;
  else if (stamp.size.options.length) stamp.size.selectedIndex = 0;
}

/* --- Заключване на цветовете за Colop --- */
function enforceColorByBrand(){
  if(!stamp.color || !stamp.brand) return;
  const isColop = (stamp.brand.value === 'colop');
  [...stamp.color.options].forEach(opt=>{
    if(isColop){
      opt.disabled = opt.value !== '#1f4ed8';
      if (!opt.disabled) stamp.color.value = '#1f4ed8';
    }else{
      opt.disabled = false;
    }
  });
}

/* --- Показване на полетата според форма --- */
function showStampFields(){
  const circ = CIRCLE_SIZES.has(stamp.size?.value);
  if(stamp.roundWrap) stamp.roundWrap.style.display = circ ? 'block' : 'none';
  if(stamp.rectWrap)  stamp.rectWrap.style.display  = circ ? 'none'  : 'block';
}

/* ===== Рисуване ===== */
function drawStamp() {
  if (!scx || !stamp.canvas) return;
  const W = stamp.canvas.width, H = stamp.canvas.height;
  scx.clearRect(0, 0, W, H);
  scx.fillStyle = '#fff';
  scx.fillRect(0, 0, W, H);

  const ink = stamp.color?.value || '#1f4ed8';
  const circ = CIRCLE_SIZES.has(stamp.size?.value);

  scx.save();
  scx.translate(W / 2, H / 2);

  if (circ) {
    // === КРЪГЪЛ ПЕЧАТ (30×30, 40×40) ===
    const R = Math.min(W, H) * 0.42;
    const midR = R * 0.94;
    const innerR = R * 0.55;

    scx.strokeStyle = ink;
    scx.lineWidth = 2;
    [R, midR, innerR].forEach(r => {
      scx.beginPath();
      scx.arc(0, 0, r, 0, Math.PI * 2);
      scx.stroke();
    });

    const top = (stamp.roundTop?.value || '').trim().toUpperCase();
    const bot = (stamp.roundBottom?.value || '').trim().toUpperCase();
    const ctr = (stamp.roundCenter?.value || '').trim();

    // Текст по дъга – стабилна версия
function drawArcTextBalanced(text, onTop) {
  if (!text) return;

  const fontSize = 20;
  scx.font = `bold ${fontSize}px Arial`;
  scx.fillStyle = ink;
  scx.textAlign = "center";
  scx.textBaseline = "middle";

  // Радиусът, на който ще стои текста
  const Rtxt = onTop
    ? midR - (midR - innerR) / 2
    : innerR + (midR - innerR) / 2;

  // 📏 Определяме дължината на текста и дъгата според него
  const len = text.trim().length;
  // При по-къси текстове – по-тясна дъга (по-събрани букви)
  const baseArc = Math.PI * (len < 8 ? 0.40 : len < 12 ? 0.75 : 0.9);

  const spacing = 1.08;
  const chars = [...text];
  const widths = chars.map(ch => scx.measureText(ch).width * spacing);
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  const anglePerWidth = baseArc / totalWidth;
  const angles = widths.map(w => w * anglePerWidth);
  const totalAngle = angles.reduce((a, b) => a + b, 0);

  const centerAngle = onTop ? -Math.PI / 2 : Math.PI / 2;
  let startAngle = centerAngle - totalAngle / 2;

  // 🔄 Долният ред: обръщаме ъглите и символите, за да не е огледален
  if (!onTop) {
    chars.reverse();
    angles.reverse();
  }

  for (let i = 0; i < chars.length; i++) {
    const a = angles[i];
    const angle = startAngle + a / 2;
    scx.save();
    scx.translate(Math.cos(angle) * Rtxt, Math.sin(angle) * Rtxt);
    scx.rotate(onTop ? angle + Math.PI / 2 : angle - Math.PI / 2);
    scx.fillText(chars[i], 0, 0);
    scx.restore();
    startAngle += a;
  }
}

    drawArcTextBalanced(top, true);
    drawArcTextBalanced(bot, false);

    // Централен текст
    if (ctr) {
      let lines = ctr.split(/\n+/).map(v => v.trim()).filter(Boolean);
      if (lines.length === 0) lines = [ctr];
      let fs = 18;
      const maxW = innerR * 1.6;
      const maxH = innerR * 1.30;

      function wrapLineToWidth(line) {
        const words = line.split(/\s+/);
        const out = [];
        let current = '';
        scx.font = `bold ${fs}px Arial`;
        for (const w of words) {
          const test = current ? current + ' ' + w : w;
          if (scx.measureText(test).width <= maxW) current = test;
          else { if (current) out.push(current); current = w; }
        }
        if (current) out.push(current);
        return out;
      }

      scx.font = `bold ${fs}px Arial`;
      let wrapped = lines.flatMap(wrapLineToWidth);
      let lineH = fs * 1.18;
      while (
        (wrapped.some(l => scx.measureText(l).width > maxW) ||
          wrapped.length * lineH > maxH) && fs > 8
      ) {
        fs--;
        scx.font = `bold ${fs}px Arial`;
        lineH = fs * 1.18;
        wrapped = lines.flatMap(wrapLineToWidth);
      }

      scx.fillStyle = ink;
      scx.textAlign = 'center';
      scx.textBaseline = 'middle';
      scx.font = `bold ${fs}px Arial`;
      const startY = -(wrapped.length - 1) * lineH / 2;
      for (let i = 0; i < wrapped.length; i++) {
        scx.fillText(wrapped[i], 0, startY + i * lineH);
      }
    }

  } else {
    // === ПРАВОЪГЪЛЕН ПЕЧАТ – ХОРИЗОНТАЛЕН ВАРИАНТ ===
    let [wmm, hmm] = (stamp.size?.value || '40x90').split('x').map(parseFloat);

    // гарантираме, че е широк (легнал)
    if (wmm < hmm) { const t = wmm; wmm = hmm; hmm = t; }

    const s  = Math.min((W * 0.75) / wmm, (H * 0.45) / hmm);
    const rw = wmm * s, rh = hmm * s, rx = -rw / 2, ry = -rh / 2;

    // рамка
    scx.strokeStyle = ink; scx.lineWidth = 2;
    scx.strokeRect(rx, ry, rw, rh);

    const rawLines = [
      stamp.rectCompany?.value,
      stamp.rectCity?.value,
      stamp.rectCountry?.value,
      stamp.rectStreet?.value,
      stamp.rectVAT?.value
    ].filter(Boolean);

    if (!rawLines.length) { scx.restore(); return; }

    const pad = Math.max(6, Math.min(rw, rh) * 0.08);
    const contentW = rw - pad * 2, contentH = rh - pad * 2;

    scx.textAlign = 'center';
    scx.textBaseline = 'middle';
    scx.fillStyle = ink;

    function wrapToWidth(line, fs) {
      scx.font = `${fs}px Arial`;
      const words = line.split(/\s+/);
      const out = [];
      let cur = '';
      for (const w of words) {
        const test = cur ? cur + ' ' + w : w;
        if (scx.measureText(test).width <= contentW) cur = test;
        else { if (cur) out.push(cur); cur = w; }
      }
      if (cur) out.push(cur);
      return out;
    }

    let fs = Math.round(Math.min(rw, rh) * 0.20);
    fs = Math.max(10, Math.min(28, fs));
    const lineGapK = 1.15;
    let wrapped = [], totalH = Infinity, lineH;

    function computeWrapped(fsCur) {
      let lines = [];
      for (const l of rawLines) lines = lines.concat(wrapToWidth(l, fsCur));
      const lh = fsCur * lineGapK, height = lines.length * lh;
      return { lines, lineH: lh, height };
    }

    while (fs >= 8) {
      const test = computeWrapped(fs);
      if (test.height <= contentH && test.lines.every(l => scx.measureText(l).width <= contentW)) {
        wrapped = test.lines; totalH = test.height; lineH = test.lineH; break;
      }
      fs--;
    }
    if (!wrapped.length) {
      const test = computeWrapped(8);
      wrapped = test.lines; lineH = test.lineH; totalH = test.height; fs = 8;
    }

    const yStart = ry + pad + (contentH - totalH) / 2 + lineH / 2;
    let y = yStart;
    for (let i = 0; i < wrapped.length; i++) {
      const ln = wrapped[i];
      const x = 0; // center
      scx.font = (i === 0) ? `bold ${fs + 2}px Arial` : `${fs}px Arial`;
      scx.fillText(ln, x, y);
      y += lineH;
    }
  }

  scx.restore();
}

/* --- Цена/ред: показваме въведените данни долу в таблицата --- */
/* --- Цена/ред: показваме само евро, без повторна конверсия --- */
function calcStamp(p = true) {
  const priceEUR = STAMP_PRICES[stamp.brand.value]?.[stamp.size.value] || 0;
  const q = Math.max(1, Number(stamp.qty.value || 1));
  const totEUR = priceEUR * q;

  const isRound = CIRCLE_SIZES.has(stamp.size?.value);

  const topTxt = (stamp.roundTop?.value || '').trim();
  const botTxt = (stamp.roundBottom?.value || '').trim();
  const ctrTxt = (stamp.roundCenter?.value || '').trim();

  const company = (stamp.rectCompany?.value || '').trim();
  const city    = (stamp.rectCity?.value || '').trim();
  const country = (stamp.rectCountry?.value || '').trim();
  const street  = (stamp.rectStreet?.value || '').trim();
  const vat     = (stamp.rectVAT?.value || '').trim();

  let details = `${stamp.brand.value.toUpperCase()}, ${stamp.size.value}, ${q} бр.`;

  if (isRound) {
    const parts = [];
    if (topTxt) parts.push(`Горен: "${topTxt}"`);
    if (botTxt) parts.push(`Долен: "${botTxt}"`);
    if (ctrTxt) parts.push(`Център: "${ctrTxt}"`);
    if (parts.length) details += ' | ' + parts.join(' | ');
  } else {
    const parts = [];
    if (company) parts.push(`Фирма: ${company}`);
    if (city)    parts.push(`Град: ${city}`);
    if (country) parts.push(`Държава: ${country}`);
    if (street)  parts.push(`Адрес: ${street}`);
    if (vat)     parts.push(`ЕИК: ${vat}`);
    if (parts.length) details += ' | ' + parts.join(' | ');
  }

  // 🟢 Показваме само евро (цените вече са в евро)
  stamp.rowBGN.textContent = fmtEUR(totEUR);
  if (stamp.rowEUR) stamp.rowEUR.textContent = "";
  if (p) pulse(stamp.rowBGN);

  return { service: 'Фирмен печат', details, priceEUR: +totEUR.toFixed(2) };
}
/* --- Обновяване --- */
function refreshStamp() {
  fillStampSizes();
  enforceColorByBrand();
  showStampFields();
  drawStamp();
  calcStamp(false);
}

/* --- Събития --- */
['input','change'].forEach(ev=>{
  [
    stamp.brand, stamp.size, stamp.color, stamp.qty,
    stamp.roundTop, stamp.roundBottom, stamp.roundCenter,
    stamp.rectCompany, stamp.rectCity, stamp.rectCountry,
    stamp.rectStreet, stamp.rectVAT
  ].forEach(el => el && el.addEventListener(ev, ()=>{
    if (el === stamp.brand) fillStampSizes();
    refreshStamp();
  }));
});

/* Многоредов център: Enter добавя нов ред */
stamp.roundCenter?.addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){
    e.preventDefault();
    const el=e.target, s=el.selectionStart, v=el.value;
    el.value = v.slice(0,s) + '\n' + v.slice(s);
    el.setSelectionRange(s+1,s+1);
    refreshStamp();
  }
});

/* Нулиране и добавяне */
stamp.clear?.addEventListener('click',()=>{
  ['roundTop','roundBottom','roundCenter','rectCompany','rectCity','rectCountry','rectStreet','rectVAT']
    .forEach(k=>{ if(stamp[k]) stamp[k].value=''; });
  if(stamp.qty) stamp.qty.value='1';
  if(stamp.brand){ stamp.brand.value='brother'; fillStampSizes(); }
  if(stamp.color) stamp.color.value='#1f4ed8';
  refreshStamp();
});

/* --- Добавяне към сметката + известие --- */
stamp.add?.addEventListener('click',()=>{
  const r = calcStamp(false);
  if (r) {
    pushRow(r);
    showToast("✅ Фирмен печат е добавен към сметката!");
  }
});

document.getElementById('stampDownload')?.addEventListener('click',()=>downloadCanvas('stampCanvas','stamp.png'));
refreshStamp();

/******************************************************************
 * ДАНЪЧНИ ФАКТУРИ — ИЗЦЯЛО В ЕВРО (БЕЗ ДЕЛЕНЕ)
 ******************************************************************/
const invoice = {
  company:document.getElementById('invCompany'),
  eik:document.getElementById('invEIK'),
  mol:document.getElementById('invMOL'),
  addr:document.getElementById('invAddr'),
  email:document.getElementById('invEmail'),
  bank:document.getElementById('invBank'),
  swift:document.getElementById('invSwift'),
  iban:document.getElementById('invIban'),
  qty:document.getElementById('invQty'),
  warning:document.getElementById('invWarning'),
  format:document.getElementById('invFormat'),
  copies:document.getElementById('invCopies'),
  numbering:document.getElementById('invNumbering'),
  number:document.getElementById('invNumber'),
  newCliche:document.getElementById('invNewCliche'),
  rowBGN:document.getElementById('invRowBGN'),
  rowEUR:document.getElementById('invRowEUR'),
  add:document.getElementById('invAdd'),
  clear:document.getElementById('invClear')
};

// Запазваме празната функция за съвместимост с HTML структурата ти
(function relocateInvoiceExtras(){})();

if(invoice.copies){ invoice.copies.value = '2'; }

function buildInvoiceDetails(q){
  const parts=[];
  if(invoice.company?.value) parts.push(`Фирма: ${invoice.company.value}`);
  if(invoice.eik?.value)     parts.push(`ЕИК: ${invoice.eik.value}`);
  if(invoice.mol?.value)     parts.push(`М.О.Л.: ${invoice.mol.value}`);
  if(invoice.addr?.value)    parts.push(`Адрес: ${invoice.addr.value}`);
  if(invoice.email?.value)   parts.push(`Имейл: ${invoice.email.value}`);
  if(invoice.bank?.value)    parts.push(`Банка: ${invoice.bank.value}`);
  if(invoice.swift?.value)   parts.push(`SWIFT/BIC: ${invoice.swift.value}`);
  if(invoice.iban?.value)    parts.push(`Сметка (EUR): ${invoice.iban.value}`);
  parts.push(`Формат: ${invoice.format?.selectedOptions?.[0]?.textContent||''}`);
  parts.push(`Екземпляри: ${invoice.copies?.selectedOptions?.[0]?.textContent||''}`);
  parts.push(`Количество: ${q} бр.`);
  if(invoice.numbering?.checked) parts.push(`Номериране: ${invoice.number?.value||''}`);
  if(invoice.newCliche?.checked) parts.push(`Ново клише: +2.56 €`); // Корекция на текста тук
  parts.push('1 кочан = 100 листа');
  return parts.join(' | ');
}

function calcInvoice(pulseOn = true) {
  const q = Math.max(1, Number(invoice.qty?.value || 1));

  // ✅ ДИРЕКТНИ ЦЕНИ В ЕВРО (взимаме ги от HTML value, които трябва да са 7.16 или 4.55)
  // Ако в HTML все още са стари (14 или 8.9), тук ги преизчисляваме твърдо:
  let baseEUR = Number(invoice.format?.value || 0);
  if (baseEUR === 14) baseEUR = 7.16;
  if (baseEUR === 8.9) baseEUR = 4.55;

  const clicheEUR = invoice.newCliche?.checked ? 2.56 : 0; 

  // ✅ Точно изчисление директно в ЕВРО
  const totalEUR = +(baseEUR * q + clicheEUR).toFixed(2);

  // Проверка за нечетно количество
  const isOdd = q % 2 !== 0;
  if (invoice.warning)
    invoice.warning.style.display = isOdd ? "block" : "none";

  // ✔ Показваме само ЕВРО
  invoice.rowBGN.textContent = totalEUR.toFixed(2) + " €";
  if (invoice.rowEUR) invoice.rowEUR.textContent = "";

  if (pulseOn) pulse(invoice.rowBGN);

  return {
    service: "Данъчни фактури",
    details: buildInvoiceDetails(q),
    priceEUR: totalEUR
  };
}

// Слушателите остават същите, за да не се чупи интерактивността
['input','change'].forEach(ev=>{
  [invoice.company, invoice.eik, invoice.mol, invoice.addr, invoice.email, invoice.bank, invoice.swift, invoice.iban, invoice.qty, invoice.format, invoice.copies, invoice.numbering, invoice.number, invoice.newCliche
  ].forEach(el=> el && el.addEventListener(ev,()=>calcInvoice()));
});

invoice.numbering?.addEventListener('change',()=>{ 
  if(invoice.number) invoice.number.style.display = invoice.numbering.checked ? 'block' : 'none'; 
});

invoice.add?.addEventListener("click", () => {
  if (invoice.numbering?.checked) {
    const numberValue = invoice.number?.value?.trim() || "";
    if (!/^\d{10}$/.test(numberValue)) {
      alert("❗ Въведете точно 10 цифри за номерацията!");
      invoice.number.focus();
      return;
    }
  }
  const r = calcInvoice(false);
  if (r) {
    pushRow(r);
    showToast("✅ Данъчна фактура е добавена към сметката!");
  }
});

invoice.clear?.addEventListener('click',()=>{
  ['company','eik','mol','addr','email','bank','swift','iban'].forEach(k=>{ if(invoice[k]) invoice[k].value=''; });
  if(invoice.qty) invoice.qty.value = '2';
  if(invoice.format) invoice.format.value = '14'; // Тук 14 съответства на A4 (7.16€)
  if(invoice.copies) invoice.copies.value = '2';
  if(invoice.numbering) invoice.numbering.checked = false;
  if(invoice.number){ invoice.number.value = ''; invoice.number.style.display = 'none'; }
  if(invoice.newCliche) invoice.newCliche.checked = false;
  calcInvoice();
});

calcInvoice(false);


/******************************************************************
 * УСЛУГИ — ЧИСТИ ЕВРО (final)
 ******************************************************************/

const servicesUI = {
  list: document.getElementById('servicesList'),
  qty: document.getElementById('serviceQty'),
  row: document.getElementById('serviceRowBGN'),
  add: document.getElementById('serviceAdd'),
  clear: document.getElementById('serviceClear')
};

let selectedService = null;

// Основно пресмятане
function calcService(pulseOn = true) {
  if (!selectedService) {
    servicesUI.row.textContent = "0.00 €";
    servicesUI.add.disabled = true;
    return;
  }

  const q = Math.max(1, Number(servicesUI.qty.value || 1));

  // 🔥 ЦЕНАТА Е В ЕВРО, НЕ СЕ ДЕЛИ НИЩО
  const total = selectedService.perItem
    ? selectedService.price * q
    : selectedService.price;

  // 🔥 Показваме финалната цена
  servicesUI.row.textContent = total.toFixed(2) + " €";

  servicesUI.add.disabled = false;

  if (pulseOn) pulse(servicesUI.row);
}

// Избор на услуга
servicesUI.list?.addEventListener('click', e => {
  const btn = e.target.closest('.service-btn');
  if (!btn) return;

  servicesUI.list.querySelectorAll('.service-btn')
    .forEach(b => b.classList.remove('primary'));

  btn.classList.add('primary');

  selectedService = {
    label: btn.textContent.trim(),
    price: Number(btn.dataset.price),       // ⬅️ В ЕВРО!
    perItem: btn.dataset.peritem === "true"
  };

  calcService();
});

// Количество
['input','change'].forEach(ev => {
  servicesUI.qty?.addEventListener(ev, () => calcService());
});

// Добавяне към сметка
servicesUI.add?.addEventListener('click', () => {
  if (!selectedService) return;

  const q = Math.max(1, Number(servicesUI.qty.value || 1));

  const total = selectedService.perItem
    ? selectedService.price * q
    : selectedService.price;

  const details = selectedService.perItem
    ? `${selectedService.label} | Количество: ${q}`
    : selectedService.label;

  pushRow({
    service: "Услуга",
    details,
    priceEUR: Number(total.toFixed(2))
  });

  showToast(`✅ ${selectedService.label} е добавена към сметката!`);
});

// Изчистване
servicesUI.clear?.addEventListener('click', () => {
  selectedService = null;
  servicesUI.qty.value = "1";
  servicesUI.list.querySelectorAll('.service-btn')
    .forEach(b => b.classList.remove('primary'));
  calcService(false);
});

// Старт
calcService(false);

/******************************************************************
 * BILL AS TEXT – генерира списък за имейла (не го пипай)
 ******************************************************************/
function billAsText() {
  if (!bill || bill.length === 0) return "-";

  return bill
    .map(
      (r, i) =>
        `${i + 1}. ${r.service} — ${r.details} → ${r.priceEUR.toFixed(2)} €`
    )
    .join("\n");
}


/******************************************************************
 * MAILTO МОДАЛ (с доставка +2.50 € и линк към файловете)
 ******************************************************************/
const modal = {
  wrap: document.getElementById('sendModal'),
  openBtn: document.getElementById('sendOffer'),
  confirm: document.getElementById('confirmSend'),
  cancel: document.getElementById('cancelSend'),
  name: document.getElementById('clientName'),
  email: document.getElementById('clientEmail'),
  phone: document.getElementById('clientPhone'),
  msg: document.getElementById('clientMessage'),
  pickup: document.getElementById('clientPickup'),
  delivery: document.getElementById('clientDelivery'),
  deliveryFields: document.getElementById('deliveryFields'),
  city: document.getElementById('clientCity'),
  zip: document.getElementById('clientZip'),
  street: document.getElementById('clientStreet'),
  number: document.getElementById('clientNumber'),
  invoice: document.getElementById('clientInvoice'),
  fileLink: document.getElementById('clientFileLink'),
  total: document.getElementById('finalTotalBGN')
};


/* === Обща сума в евро === */
function billTotalEUR() {
  return bill.reduce((sum, r) => sum + (Number(r.priceEUR) || 0), 0);
}


/* === Обновяване на тотала === */
function updateFinalTotals() {
  const base = billTotalEUR();
  const delivery = modal.delivery.checked ? 2.50 : 0;
  const finalEUR = base + delivery;
  modal.total.textContent = finalEUR.toFixed(2) + " €";
}


/* === Отваряне на модала === */
function openSendModal() {
  updateFinalTotals();
  document.body.classList.add("no-scroll");
  modal.wrap.classList.remove("hidden");
}


/* === Затваряне на модала === */
function closeSendModal() {
  modal.wrap.classList.add("hidden");
  document.body.classList.remove("no-scroll");
}


/* === Бутон “Изпрати за изработка” === */
modal.openBtn?.addEventListener('click', () => {
  if (bill.length === 0) {
    alert('Нямате добавени редове в сметката.');
    return;
  }

  modal.deliveryFields.style.display =
    modal.delivery.checked ? "grid" : "none";

  openSendModal();
});


/* === Затваряне === */
modal.cancel?.addEventListener('click', closeSendModal);


/* === Доставка → показване/скриване на адрес === */
modal.delivery?.addEventListener('change', () => {
  modal.deliveryFields.style.display =
    modal.delivery.checked ? "grid" : "none";
  updateFinalTotals();
});


/* === Вземане от място → изключва доставка === */
modal.pickup?.addEventListener('change', () => {
  if (modal.pickup.checked) {
    modal.delivery.checked = false;
    modal.deliveryFields.style.display = "none";
  }
  updateFinalTotals();
});


/* === ИЗПРАЩАНЕ НА EMAIL === */
modal.confirm?.addEventListener('click', () => {
  const name = modal.name.value.trim();
  const email = modal.email.value.trim();

  if (!name || !email) {
    alert("Попълнете име и имейл.");
    return;
  }

  const base = billTotalEUR();
  const delivery = modal.delivery.checked ? 2.50 : 0;
  const finalEUR = base + delivery;

  const wantsInvoice = modal.invoice.checked ? "Да" : "Не";
  const fileLink = modal.fileLink.value.trim() || "—";

  const deliveryMode = modal.delivery.checked
    ? "ДО АДРЕС (+2.50 €)"
    : modal.pickup.checked
        ? "ВЗИМАНЕ ОТ МЯСТО"
        : "—";

  const address = modal.delivery.checked
    ? `Град: ${modal.city.value || ''}, ПК: ${modal.zip.value || ''}, Улица: ${modal.street.value || ''}, №: ${modal.number.value || ''}`
    : "—";

  const subject = encodeURIComponent("Заявка за изработка – Копирен Център");

  const body = encodeURIComponent(
    `Име: ${name}\nИмейл: ${email}\nТелефон: ${modal.phone.value || ''}\n\n` +
    `Желая фактура: ${wantsInvoice}\n\n` +
    `Доставка: ${deliveryMode}\nАдрес: ${address}\n\n` +
    `Линк към файлове: ${fileLink}\n\n` +
    `Бележка:\n${modal.msg.value || ''}\n\n` +
    `Обща сума: ${finalEUR.toFixed(2)} €\n\n` +
    `Избрани услуги:\n${billAsText()}\n\n` +
    `Дата: ${new Date().toLocaleString('bg-BG')}`
  );

  window.location.href = `mailto:?subject=${subject}&body=${body}`;
  closeSendModal();
});



/******************************************************************
 * ПРИНУДИТЕЛНО ПРЕОБНОВЯВАНЕ НА ВСИЧКИ ЦЕНИ В ЕВРО ПРИ ЗАРЕЖДАНЕ
 ******************************************************************/
window.addEventListener("load", () => {
  setTimeout(() => {
    document.querySelectorAll("#rowTotalBGN, #scanRowBGN, #wfRowBGN, #bindRowBGN, #lamRowBGN, #cardsRowBGN, #lblRowBGN, #stampRowBGN, #invRowBGN, #serviceRowBGN")
      .forEach(el => {
        const txt = el.textContent.trim();
        if (txt.includes("лв")) {
          const num = parseFloat(txt);
          if (!isNaN(num)) el.textContent = `${(num / 1.95583).toFixed(2)} €`;
        }
      });
  }, 300);
});

window.addEventListener('beforeunload', saveBill);
updateFinalTotals();
// window.addEventListener("load", () => {
//   document.body.classList.add("loaded");
//   const splash = document.getElementById("splash-screen");
//   if (splash) splash.remove();
// });

/******************************************************************
 * ЗАПАЗИ КАТО PDF — финален стабилен блок
 ******************************************************************/
if (elsBill.savePDF) {
  elsBill.savePDF.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      if (!window.html2pdf) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src =
            "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }

      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 500));

      const billTable = document.getElementById("billTable");
      if (!billTable) {
        alert("Няма данни за запазване.");
        return;
      }

      const clone = billTable.cloneNode(true);
      clone.querySelectorAll(".btn-del").forEach((b) => b.remove());
      clone.querySelectorAll("th:last-child, td:last-child").forEach((c) => c.remove());
      clone.style.borderCollapse = "collapse";
      clone.querySelectorAll("th,td").forEach((td) => {
        td.style.border = "1px solid #ccc";
        td.style.padding = "8px 10px";
        td.style.fontSize = "12px";
      });

      // Зареждаме логото от public/logo.png
const logoBase64 = "./logo.png";

const wrapper = document.createElement("div");
wrapper.style.fontFamily = 'Arial, "DejaVu Sans", sans-serif';
wrapper.style.padding = "20px";
wrapper.style.width = "700px";          // 🟢 по-широк документ (по-близо до A4)
wrapper.style.margin = "0 auto";        // 🟢 центрира целия контейнер
wrapper.style.background = "#fff";
wrapper.innerHTML = `
  <div style="position:relative;color:#111;text-align:center;padding:10px;
              border-bottom:3px solid #2e7d32;margin-bottom:25px;">

    <!-- 🕓 Десен горен ъгъл: дата -->
    <div style="position:absolute;top:10px;right:10px;
                font-size:9px;color:#555;opacity:0.8;font-style:italic;">
      ${new Date().toLocaleString("bg-BG")}
    </div>

    <!-- 🟢 Централен блок: лого + текст -->
    <div style="display:flex;align-items:center;justify-content:center;gap:10px;">
      <img src="${logoBase64}" style="height:55px;width:auto;object-fit:contain;">
      <div>
        <h2 style="margin:0;font-size:18px;">Копирен Център</h2>
        <div style="font-size:12px;opacity:0.9;">Оферта</div>
      </div>
    </div>
  </div>
`;
      wrapper.appendChild(clone);

      const footer = document.createElement("div");
      footer.style.borderTop = "2px solid #2e7d32";
      footer.style.marginTop = "25px";
      footer.style.paddingTop = "8px";
      footer.style.textAlign = "center";
      footer.style.fontSize = "11px";
      footer.style.color = "#777";
      footer.innerHTML =
        'Благодарим Ви, че избрахте <strong>Копирния Център на книжарница "Кирил и Методий"</strong>';
      wrapper.appendChild(footer);
      const philoFooter = document.createElement("div");
philoFooter.style.marginTop = "10px";
philoFooter.style.textAlign = "center";
philoFooter.style.fontSize = "10px";
philoFooter.style.color = "#999";
philoFooter.innerHTML = "© Philoscod<br>Всички права запазени – 2025";
wrapper.appendChild(philoFooter);

      const opt = {
        margin: 10,
        filename: `Offer_Copy_Center_${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, background: "#ffffff" },
        jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
      };

      const worker = window.html2pdf().set(opt).from(wrapper);
      const pdf = await worker.toPdf().get("pdf");
      const blob = pdf.output("blob");
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = opt.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
    } catch (err) {
      console.error(err);
      alert("Грешка при генериране на PDF: " + err.message);
    }
  });
}
// Dark Mode превключвател
const themeBtn = document.getElementById("themeToggle");
if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    // смяна на иконата
    themeBtn.textContent = document.body.classList.contains("dark-mode") ? "☀️" : "🌙";
    // запомняне на избора
    localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
  });
  // зареждане на последно избраната тема
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    themeBtn.textContent = "☀️";
  }
}
// === Известие (toast) при добавяне към сметката ===
function showToast(message = "Услугата е добавена успешно!") {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/******************************************************************
 * ГАРАНЦИЯ – стартиране след зареждане на DOM (фиксира Safari bug)
 ******************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  if (typeof updateFinalTotals === "function") {
    updateFinalTotals();
  }
});