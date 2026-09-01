import { CoupleStore, THEMES, MOODS, DATE_IDEAS, GAME_TRUTH, GAME_RATHER, LOVE_LANGUAGES, PETS, CHAT_STICKERS, RPS_CHOICES, KNOW_ME, moodEmoji, daysBetween, todayISO } from "./store.js";
import { Biometrics, fingerprintSvg } from "./biometrics.js";

const store = new CoupleStore();
const appEl = () => document.getElementById("app");
const tabEl = () => document.getElementById("tabbar");
const modalEl = () => document.getElementById("modal");

const TABS = new Set(["home", "chat", "memories", "calendar", "more"]);

const state = {
  route: "splash",
  pin: "",
  pinFirst: "",
  pinMode: "unlock", // setup | confirm | unlock
  fpStatus: "",
  calendar: new Date(),
  selectedDate: todayISO(),
  filter: "ALL",
  q: "",
  ai: { prompt: "", reply: "" },
  refreshing: false,
  drawn: "",
  catcher: { running: false, score: 0, left: 20, x: 42, y: 38 },
};

function toast(msg) {
  const el = document.getElementById("toast");
  el.hidden = false;
  el.textContent = msg;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.hidden = true;
  }, 2400);
}

function applyAppearance() {
  const a = store.data.appearance;
  const html = document.documentElement;
  html.dataset.theme = a.theme || "rose-glass";
  html.style.setProperty("--accent", a.accent || THEMES[a.theme]?.accent || "#ff8aa0");
  html.style.setProperty("--glass", `${a.glass || 22}px`);
  html.style.setProperty("--radius", `${a.radius || 22}px`);
  html.style.setProperty("--font-scale", String(a.fontScale || 1));
  const theme = THEMES[a.theme];
  if (theme) html.style.setProperty("--accent-2", theme.accent2);
  document.getElementById("hearts").style.display = a.particles ? "block" : "none";
}

function go(route, extra = {}) {
  if (state.route === "game-catch" && route !== "game-catch") stopCatcher();
  state.route = route;
  Object.assign(state, extra);
  if (route === "lock") {
    state.pin = "";
    state.fpStatus = "";
  }
  location.hash = route;
  render();
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function faDate(iso) {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("fa-IR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return iso;
  }
}

function topBar(title, sub = "", back = true) {
  return `<div class="top">
    <div>
      ${back ? `<button class="icon-btn" data-act="back" style="margin-bottom:8px">‹</button>` : ""}
      <h2>${esc(title)}</h2>
      ${sub ? `<div class="sub">${esc(sub)}</div>` : ""}
    </div>
    <button class="icon-btn" data-act="refresh" title="بازخوانی">⟳</button>
  </div>`;
}

function empty(emoji, title, sub) {
  return `<div class="empty cute-empty"><div class="empty-emoji">${emoji}</div><h3>${esc(title)}</h3><p class="sub">${esc(sub)}</p></div>`;
}

function burst(x, y, emojis = ["💗", "✨", "🌸"]) {
  for (let i = 0; i < 8; i++) {
    const s = document.createElement("span");
    s.className = "burst";
    s.textContent = emojis[i % emojis.length];
    const dx = (Math.random() * 160 - 80) + "px";
    const dy = (Math.random() * -140 - 20) + "px";
    s.style.left = x + "px";
    s.style.top = y + "px";
    s.style.setProperty("--dx", dx);
    s.style.setProperty("--dy", dy);
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 900);
  }
}

function fab(act = "add") {
  return `<button class="fab" data-act="${act}">+</button>`;
}

/* ───────── screens ───────── */

function screenSplash() {
  return `<div class="splash">
    <div>
      <div class="mascot">
        <div class="spark a">✨</div>
        <div class="face">💗</div>
        <div class="spark b">🌸</div>
      </div>
      <h1>${esc(store.data.appearance.coupleTitle || "دنیای کوچیک ما")}</h1>
      <p class="sub">دنیای کوچیک دوتایی ما — نرم، شیشه‌ای، مال خودتون</p>
    </div>
  </div>`;
}

function screenSetup() {
  const p = store.data.profile;
  return `<div class="screen">
    <div class="love-hero">
      <div class="logo" style="font-size:52px">💗</div>
      <h1>دنیای کوچیک ما</h1>
      <p class="sub">این دنیای کوچیک فقط برای ما دوتاست</p>
    </div>
    <div class="card col">
      <div class="tiny faint">اسم‌هاتون</div>
      <input class="input" id="nameA" value="${esc(p.personAName)}" placeholder="اسم اول" />
      <input class="input" id="nameB" value="${esc(p.personBName)}" placeholder="اسم دوم" />
    </div>
    <div class="gap"></div>
    <p style="text-align:center;font-weight:700">تو کدومی؟</p>
    <div class="col">
      <button class="person-btn" data-act="pick-role" data-role="PERSON_A">من ${esc(p.personAName)}م ✨</button>
      <button class="person-btn" data-act="pick-role" data-role="PERSON_B">من ${esc(p.personBName)}م 🌙</button>
    </div>
    <p class="tiny faint" style="text-align:center;margin-top:14px">ورود آزمایشی — همه قابلیت‌ها همین‌جا کار می‌کنن</p>
  </div>`;
}

function pinDots(len) {
  return `<div class="pin-dots">${[0, 1, 2, 3].map((i) => `<i class="${i < len ? "on" : ""}"></i>`).join("")}</div>`;
}

function numberPad(showFp) {
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, "fp", 0, "del"];
  return `<div class="pad">${keys
    .map((k) => {
      if (k === "fp") {
        return showFp
          ? `<button class="key ghost" data-act="fp">${fingerprintSvg()}</button>`
          : `<span></span>`;
      }
      if (k === "del") return `<button class="key ghost" data-act="pin-del">⌫</button>`;
      return `<button class="key" data-act="pin-digit" data-d="${k}">${k}</button>`;
    })
    .join("")}</div>`;
}

function screenLockSetup() {
  const confirming = state.pinMode === "confirm";
  return `<div class="screen center" style="padding-top:48px">
    <div>
      <div style="font-size:42px">🔐</div>
      <h2>${confirming ? "PIN رو تأیید کن" : "برای ورود یک قفل بساز"}</h2>
      <p class="sub">${confirming ? "همان ۴ رقم را دوباره وارد کن" : "یک رمز ۴ رقمی انتخاب کن"}</p>
      ${pinDots(state.pin.length)}
      ${state.fpStatus ? `<p class="tiny danger">${esc(state.fpStatus)}</p>` : ""}
      ${numberPad(false)}
    </div>
  </div>`;
}

function screenBiometricSetup() {
  return `<div class="screen center" style="padding-top:40px">
    <div>
      <h2>ورود با اثر انگشت</h2>
      <p class="sub">انگشتت رو روی اسکنر بذار و نگه دار تا ثبت بشه</p>
      <button class="fp-wrap ${state.fpStatus}" data-act="fp-enroll" id="fpBtn">
        ${fingerprintSvg()}
        <div class="fp-scan"></div>
      </button>
      <p class="tiny muted" id="fpHint">لمس کن و یک و نیم ثانیه نگه دار</p>
      <div class="gap"></div>
      <button class="btn ghost block" data-act="skip-fp">الان نه — فقط PIN</button>
    </div>
  </div>`;
}

function screenLock() {
  const bio = store.data.auth.biometricEnabled;
  return `<div class="screen center" style="padding-top:36px">
    <div>
      <div style="font-size:42px">❤️</div>
      <h2>PIN خودت رو وارد کن</h2>
      <p class="sub">${esc(store.data.appearance.coupleTitle)}</p>
      ${pinDots(state.pin.length)}
      ${state.fpStatus ? `<p class="tiny ${state.fpStatus === "ok" ? "ok" : "danger"}">${esc(state.fpStatus === "ok" ? "خوش اومدی 💗" : state.fpStatus)}</p>` : ""}
      ${bio ? `<button class="fp-wrap ${state.fpScan || ""}" data-act="fp" id="fpBtn">${fingerprintSvg()}<div class="fp-scan"></div></button>
      <p class="tiny muted">یا با اثر انگشت باز کن</p>` : ""}
      ${numberPad(false)}
    </div>
  </div>`;
}

function loveMeterCard() {
  const score = store.loveScore();
  const days = store.daysTogether();
  return `<div class="card love-hero">
    <div class="tiny muted">متر عشق امروز</div>
    <div class="score">${score}</div>
    <div class="meter" style="max-width:220px;margin:8px auto 0"><i style="width:${score}%"></i></div>
    <div class="sub">${days > 0 ? `${days} روز با هم` : "تاریخ شروع رابطه رو توی پروفایل بذار"}</div>
  </div>`;
}

function screenHome() {
  const me = store.todayMood("me");
  const partner = store.todayMood("partner");
  const cd = store.nextCountdown();
  const q = store.dailyQuestion();
  const name = store.myName();
  return `<div class="screen">
    <div class="top">
      <div>
        <h1>سلام ${esc(name)} ❤️</h1>
        <div class="sub">${faDate(todayISO())}</div>
      </div>
      <div class="row">
        <button class="icon-btn" data-act="go" data-route="search">⌕</button>
        <button class="icon-btn" data-act="go" data-route="customize">✦</button>
      </div>
    </div>
    ${loveMeterCard()}
    <div class="gap"></div>
    <div class="row">
      <button class="card grow" data-act="go" data-route="mood" style="text-align:center">
        <div class="tiny faint">حال امروزت</div>
        <div style="font-size:32px">${me ? moodEmoji(me.mood) : "🤔"}</div>
        <div class="tiny">${me ? esc(me.mood) : "ثبت نکردی هنوز"}</div>
      </button>
      <div class="card grow" style="text-align:center">
        <div class="tiny faint">حال ${esc(store.partnerName())}</div>
        <div style="font-size:32px">${partner ? moodEmoji(partner.mood) : "💭"}</div>
        <div class="tiny">${partner ? esc(partner.mood) : "هنوز ثبت نشده"}</div>
        ${store.partnerNeedsAttention() ? `<div class="tiny accent">شاید الان بیشتر بهت نیاز داشته باشه ❤️</div>` : ""}
        <button class="chip" data-act="demo-partner-mood" style="margin-top:8px">شبیه‌سازی حال پارتنر</button>
      </div>
    </div>
    <div class="gap"></div>
    ${cd ? `<div class="card between" data-act="go" data-route="countdown">
      <div><div class="tiny faint">رویداد بعدی</div><b>${esc(cd.emoji || "🎯")} ${esc(cd.title)}</b>
      <div class="tiny muted">${cd.days >= 0 ? cd.days + " روز مونده" : Math.abs(cd.days) + " روز گذشته"}</div></div>
    </div><div class="gap"></div>` : ""}
    <div class="card" data-act="go" data-route="questions">
      <div class="tiny faint">سؤال امروز</div>
      <div>${esc(q)}</div>
    </div>
    <div class="gap"></div>
    <div class="tiny muted" style="margin-bottom:8px">دسترسی سریع</div>
    <div class="quick">
      <button data-act="go" data-route="mood"><span class="e">😊</span>حال</button>
      <button data-act="go" data-route="memories"><span class="e">📸</span>خاطره</button>
      <button data-act="go" data-route="journal"><span class="e">📓</span>یادداشت</button>
      <button data-act="go" data-route="tasks"><span class="e">✅</span>کار</button>
    </div>
    <div class="gap"></div>
    <div class="quick">
      <button data-act="go" data-route="notes"><span class="e">🧊</span>یخچال</button>
      <button data-act="go" data-route="games"><span class="e">🎲</span>بازی</button>
      <button data-act="go" data-route="dates"><span class="e">🍝</span>قرار</button>
      <button data-act="go" data-route="photos"><span class="e">🖼️</span>عکس</button>
    </div>
    ${store.data.tasks.filter((t) => t.status !== "DONE").length ? `<div class="gap"></div><div class="card" data-act="go" data-route="tasks">${store.data.tasks.filter((t) => t.status !== "DONE").length} کار فعال</div>` : ""}
    <p class="tiny faint" style="text-align:center;margin-top:18px">صفحه رو پایین بکش تا داده‌ها بازخوانی بشن ✨</p>
  </div>`;
}

function screenChat() {
  const msgs = [...store.list("messages")].reverse();
  return `<div class="screen" style="padding-bottom:0">
    ${topBar(store.partnerName(), "چت دونفره 💬", false)}
    <div class="chat-log" id="chatLog">
      ${msgs.length === 0 ? empty("💬", "هنوز پیامی ندارید", "اولین پیام عاشقانه رو بفرست") : msgs.map((m) => `
        <div class="bubble ${m.sender === "me" ? "mine" : "theirs"}">
          ${esc(m.content)}
          <div class="tiny faint">${esc((m.createdAt || "").slice(11, 16))}</div>
        </div>`).join("")}
    </div>
    <div class="sticker-row">
      ${CHAT_STICKERS.map((s) => `<button data-act="sticker" data-s="${s}">${s}</button>`).join("")}
    </div>
    <div class="composer">
      <input class="input" id="chatInput" placeholder="پیام بنویس…" />
      <button class="btn" data-act="send-chat">➤</button>
    </div>
  </div>`;
}

function screenMemories() {
  const items = store.list("memories");
  return `<div class="screen">
    ${topBar("خاطرات تصویری ما", `${items.length} خاطره`)}
    ${items.length === 0 ? empty("📸", "هنوز خاطره‌ای ثبت نکردید ❤️", "اولین خاطره‌تون رو ثبت کنید") : `<div class="list">${items.map((m) => `
      <div class="card">
        <div class="between">
          <b>${esc(m.title)}</b>
          <button class="icon-btn" data-act="fav-mem" data-id="${m.id}">${m.favorite ? "❤️" : "♡"}</button>
        </div>
        <div class="muted">${esc(m.description || "")}</div>
        <div class="tiny faint">${esc(m.date)} ${m.location ? "📍 " + esc(m.location) : ""}</div>
        <button class="tiny danger" data-act="del" data-col="memories" data-id="${m.id}">حذف</button>
      </div>`).join("")}</div>`}
    ${fab("add-memory")}
  </div>`;
}

function screenCalendar() {
  const y = state.calendar.getFullYear();
  const m = state.calendar.getMonth();
  const first = new Date(y, m, 1);
  const start = (first.getDay() + 1) % 7; // sat-first-ish: we'll use sun=0 then shift
  // Persian week labels Sat-Fri
  const daysIn = new Date(y, m + 1, 0).getDate();
  const eventDates = new Set(store.list("events").map((e) => e.date));
  const cells = [];
  for (let i = 0; i < start; i++) cells.push("<div></div>");
  for (let d = 1; d <= daysIn; d++) {
    const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const cls = [
      "cal-day",
      iso === state.selectedDate ? "on" : "",
      iso === todayISO() ? "today" : "",
      eventDates.has(iso) ? "has" : "",
    ].join(" ");
    cells.push(`<button class="${cls}" data-act="pick-date" data-date="${iso}">${d}</button>`);
  }
  const dayEvents = store.list("events").filter((e) => e.date === state.selectedDate);
  const monthName = state.calendar.toLocaleDateString("fa-IR", { month: "long", year: "numeric" });
  return `<div class="screen">
    ${topBar("تقویم ما", monthName, false)}
    <div class="between">
      <button class="icon-btn" data-act="cal-prev">›</button>
      <b>${esc(monthName)}</b>
      <button class="icon-btn" data-act="cal-next">‹</button>
    </div>
    <div class="gap"></div>
    <div class="card">
      <div class="cal-grid">${["ش", "ی", "د", "س", "چ", "پ", "ج"].map((d) => `<div class="cal-dow">${d}</div>`).join("")}${cells.join("")}</div>
    </div>
    <div class="gap"></div>
    <div class="tiny muted">رویدادهای ${esc(state.selectedDate)}</div>
    <div class="gap"></div>
    ${dayEvents.length === 0 ? `<p class="faint">رویدادی برای این روز نیست</p>` : dayEvents.map((e) => `<div class="card"><b>${esc(e.title)}</b><div class="muted">${esc(e.description || "")}</div></div>`).join("")}
    ${fab("add-event")}
  </div>`;
}

function screenMore() {
  const item = (route, ico, title) =>
    `<button class="menu-item" data-act="go" data-route="${route}" style="width:100%;background:none;border:0;text-align:right">
      <span class="ico">${ico}</span><span class="grow">${title}</span><span class="faint">‹</span>
    </button>`;
  return `<div class="screen">
    ${topBar("بیشتر", "همه قابلیت‌ها اینجان ❤️", false)}
    <div class="card" style="padding:6px 12px">
      <div class="section-label">شخصی</div>
      ${item("profile", "👤", "پروفایل")}
      ${item("mood", "😊", "حال روزانه")}
      ${item("journal", "📓", "دفتر خاطرات")}
      <div class="section-label">دنیای ما</div>
      ${item("story", "📖", "داستان ما")}
      ${item("photos", "📸", "عکس‌ها")}
      ${item("wishlist", "⭐", "لیست آرزوها")}
      ${item("bucket", "🎯", "لیست خواسته‌ها")}
      ${item("countdown", "⏱️", "شمارش معکوس")}
      ${item("dates", "🍝", "برنامه قرار")}
      <div class="section-label">ویژه و کیوت</div>
      ${item("letters", "💌", "نامه‌های عاشقانه")}
      ${item("surprises", "🎁", "سورپرایزها")}
      ${item("notes", "🧊", "یخچال عشق")}
      ${item("kisses", "💋", "بوس‌شمار")}
      ${item("pet", "🐰", "حیوون دونفره")}
      ${item("jar", "🫙", "شیشه تعریف")}
      ${item("fortune", "🥠", "فال عشق")}
      ${item("capsules", "💊", "کپسول عشق")}
      ${item("games", "🎲", "بازی دونفره")}
      ${item("habits", "🔥", "عادت‌های دونفره")}
      ${item("music", "🎵", "آهنگ ما")}
      ${item("questions", "❓", "سؤال روزانه")}
      ${item("relationship", "💞", "رابطه ما")}
      <div class="section-label">مدیریت</div>
      ${item("tasks", "✅", "کارها")}
      ${item("expenses", "💰", "هزینه‌ها")}
      <div class="section-label">ابزار</div>
      ${item("ai", "🤖", "دستیار هوشمند")}
      ${item("search", "🔍", "جستجو")}
      ${item("customize", "🎨", "کاستوم‌سازی")}
      ${item("settings", "⚙️", "تنظیمات")}
    </div>
  </div>`;
}

function screenMood() {
  const cur = store.todayMood("me") || {};
  return `<div class="screen">
    ${topBar("امروز چطوری؟")}
    <div class="mood-grid">
      ${MOODS.map((m) => `<button class="mood-cell ${cur.mood === m.value ? "on" : ""}" data-act="pick-mood" data-mood="${m.value}">
        <span class="e">${m.emoji}</span>${m.label}
      </button>`).join("")}
    </div>
    <div class="gap"></div>
    ${["energy:انرژی", "stress:استرس", "sleep:خواب", "loveLevel:سطح عشق", "social:باتری اجتماعی"]
      .map((pair) => {
        const [k, label] = pair.split(":");
        const v = cur[k] || 5;
        return `<div class="card"><div class="between"><span>${label}</span><span class="tiny muted">${v}/10</span></div>
          <input class="range" type="range" min="1" max="10" value="${v}" data-act="mood-sl" data-k="${k}" /></div>`;
      })
      .join("")}
    <div class="gap"></div>
    <textarea class="input" id="moodNote" placeholder="یادداشت">${esc(cur.note || "")}</textarea>
    <div class="gap"></div>
    <button class="btn block" data-act="save-mood">ذخیره حال</button>
  </div>`;
}

function crudList(opts) {
  const items = store.list(opts.col);
  return `<div class="screen">
    ${topBar(opts.title, opts.sub || `${items.length} مورد`)}
    ${items.length === 0 ? empty(opts.emoji, opts.empty, opts.emptySub || "") : `<div class="list">${items.map(opts.render).join("")}</div>`}
    ${fab(opts.add)}
  </div>`;
}

function screenJournal() {
  return crudList({
    col: "journal",
    title: "دفتر خاطرات 📓",
    emoji: "📓",
    empty: "هنوز یادداشتی ننوشتید ❤️",
    add: "add-journal",
    render: (j) => `<div class="card"><div class="between"><b>${esc(j.title)}</b><span class="tag">${j.privacy === "PRIVATE" ? "🔒 خصوصی" : "💞 مشترک"}</span></div>
      <div class="muted">${esc(j.content)}</div>
      <div class="tiny faint">${esc(j.date || "")}</div>
      <button class="tiny danger" data-act="del" data-col="journal" data-id="${j.id}">حذف</button></div>`,
  });
}

function screenTasks() {
  const all = store.list("tasks");
  const items = state.filter === "TODO" ? all.filter((t) => t.status !== "DONE") : state.filter === "DONE" ? all.filter((t) => t.status === "DONE") : all;
  return `<div class="screen">
    ${topBar("کارهای دونفره ✅")}
    <div class="row">
      <button class="chip ${state.filter === "ALL" ? "on" : ""}" data-act="filter" data-f="ALL">همه (${all.length})</button>
      <button class="chip ${state.filter === "TODO" ? "on" : ""}" data-act="filter" data-f="TODO">فعال</button>
      <button class="chip ${state.filter === "DONE" ? "on" : ""}" data-act="filter" data-f="DONE">انجام شده</button>
    </div>
    <div class="gap"></div>
    ${items.length === 0 ? empty("✅", "کاری ثبت نشده", "اولین کار مشترکتون رو بسازید") : `<div class="list">${items.map((t) => `
      <div class="card">
        <div class="between">
          <b>${esc(t.title)}</b>
          <button class="check ${t.status === "DONE" ? "on" : ""}" data-act="toggle-task" data-id="${t.id}">${t.status === "DONE" ? "✓" : ""}</button>
        </div>
        <div class="muted">${esc(t.description || "")}</div>
        <div class="tiny faint">اولویت: <span class="prio-${t.priority}">${t.priority}</span> · مسئول: ${esc(t.assignedTo)} ${t.dueDate ? "· " + esc(t.dueDate) : ""}</div>
        <button class="tiny danger" data-act="del" data-col="tasks" data-id="${t.id}">حذف</button>
      </div>`).join("")}</div>`}
    ${fab("add-task")}
  </div>`;
}

function screenWishlist() {
  return crudList({
    col: "wishlist",
    title: "لیست آرزوها ⭐",
    emoji: "⭐",
    empty: "لیست آرزوها خالیه",
    add: "add-wish",
    render: (w) => `<div class="card"><div class="between"><b>${esc(w.title)}</b>
      <button class="check ${w.isCompleted ? "on" : ""}" data-act="toggle-wish" data-id="${w.id}">${w.isCompleted ? "✓" : ""}</button></div>
      <div class="muted">${esc(w.description || "")}</div>
      <div class="tiny faint">${w.privacy === "PRIVATE" ? "🔒 خصوصی" : "💞 مشترک"} ${w.category ? "· " + esc(w.category) : ""}</div>
      <button class="tiny danger" data-act="del" data-col="wishlist" data-id="${w.id}">حذف</button></div>`,
  });
}

function screenBucket() {
  const items = store.list("bucket");
  const done = items.filter((b) => b.isCompleted).length;
  return `<div class="screen">
    ${topBar("لیست خواسته‌ها 🎯", items.length ? `${done} از ${items.length} انجام شده` : "")}
    ${items.length ? `<div class="meter"><i style="width:${(done / items.length) * 100}%"></i></div><div class="gap"></div>` : ""}
    ${items.length === 0 ? empty("🎯", "هنوز موردی اضافه نکردید", "رویاهاتون رو اینجا بنویسید") : `<div class="list">${items.map((b) => `
      <div class="card"><div class="between">
        <div><b>${esc(b.title)}</b><div class="muted">${esc(b.description || "")}</div>
        ${b.isCompleted ? `<div class="tiny ok">✓ ${esc(b.completedDate)}</div>` : ""}</div>
        <button class="check ${b.isCompleted ? "on" : ""}" data-act="toggle-bucket" data-id="${b.id}">${b.isCompleted ? "✓" : ""}</button>
      </div><button class="tiny danger" data-act="del" data-col="bucket" data-id="${b.id}">حذف</button></div>`).join("")}</div>`}
    ${fab("add-bucket")}
  </div>`;
}

function screenLetters() {
  const items = store.list("letters");
  return `<div class="screen">
    ${topBar("نامه‌های عاشقانه 💌")}
    ${items.length === 0 ? empty("💌", "هنوز نامه‌ای نیست", "نامه زمان‌دار بنویس") : `<div class="list">${items.map((l) => {
      const locked = store.letterIsLocked(l);
      return `<div class="card"><b>${esc(l.title)}</b>
        ${locked ? `<p class="accent">🔒 تا ${esc(l.openOnDate)} قفل است — سورپرایز!</p>
          <button class="btn block" data-act="open-letter" data-id="${l.id}">باز کردن</button>`
          : `<p class="muted">${esc(l.content)}</p><div class="tiny faint">${esc(l.openOnDate || l.createdAt?.slice(0, 10) || "")}</div>`}
      </div>`;
    }).join("")}</div>`}
    ${fab("add-letter")}
  </div>`;
}

function screenSurprises() {
  const items = store.list("surprises");
  return `<div class="screen">
    ${topBar("سورپرایزها 🎁")}
    ${items.length === 0 ? empty("🎁", "سورپرایزی نداری", "یکی بساز و مخفی نگه دار") : `<div class="list">${items.map((s) => `
      <div class="card"><b>${esc(s.title)}</b>
        ${s.isRevealed ? `<p>${esc(s.content)}</p>` : `<p class="accent">🎀 محتوای مخفی</p>
        <button class="btn block" data-act="reveal" data-id="${s.id}">باز کردن سورپرایز</button>`}
      </div>`).join("")}</div>`}
    ${fab("add-surprise")}
  </div>`;
}

function screenQuestions() {
  const q = store.dailyQuestion();
  const answers = store.list("answers").filter((a) => a.date === todayISO());
  return `<div class="screen">
    ${topBar("سؤال روزانه ❓")}
    <div class="card col" style="text-align:center">
      <div class="tiny faint">سؤال امروز</div>
      <h3>${esc(q)}</h3>
      <textarea class="input" id="qAnswer" placeholder="پاسخت رو بنویس..."></textarea>
      <button class="btn block" data-act="save-answer">ثبت پاسخ</button>
    </div>
    <div class="gap"></div>
    ${answers.length === 0 ? `<p class="faint">هنوز پاسخی ثبت نشده</p>` : answers.map((a) => `<div class="card">${esc(a.text)}<div class="tiny faint">${esc(a.who)}</div></div>`).join("")}
  </div>`;
}

function screenCountdown() {
  return crudList({
    col: "countdowns",
    title: "شمارش معکوس ⏱️",
    emoji: "⏱️",
    empty: "شمارشی ثبت نشده",
    add: "add-countdown",
    render: (c) => {
      const days = daysBetween(todayISO(), c.targetDate);
      return `<div class="card between"><div class="row" style="align-items:center">
        <div style="font-size:28px">${esc(c.emoji || "❤️")}</div>
        <div><b>${esc(c.title)}</b><div class="tiny faint">${esc(c.targetDate)}</div>
        <div class="accent">${Number.isFinite(days) ? (days >= 0 ? days + " روز مونده" : Math.abs(days) + " روز گذشته") : ""}</div></div>
      </div><button class="tiny danger" data-act="del" data-col="countdowns" data-id="${c.id}">حذف</button></div>`;
    },
  });
}

function screenDates() {
  const items = store.list("dates");
  const idea = DATE_IDEAS[Math.abs(todayISO().split("-").join("") | 0) % DATE_IDEAS.length];
  return `<div class="screen">
    ${topBar("برنامه قرار 🍝", "ایده بگیر و ذخیره کن")}
    <div class="card col">
      <div class="tiny faint">ایده امروز</div>
      <h3>${idea.emoji} ${esc(idea.title)}</h3>
      <p class="muted">${esc(idea.desc)}</p>
      <button class="btn" data-act="save-idea">افزودن به برنامه‌ها</button>
      <button class="btn ghost" data-act="random-idea">ایده تصادفی</button>
    </div>
    <div class="gap"></div>
    ${items.length === 0 ? empty("🍝", "قراری برنامه‌ریزی نشده", "") : `<div class="list">${items.map((d) => `
      <div class="card"><b>${esc(d.emoji || "💕")} ${esc(d.title)}</b><div class="muted">${esc(d.desc || "")}</div>
      <div class="tiny faint">${esc(d.when || "زمان آزاد")}</div>
      <button class="tiny danger" data-act="del" data-col="dates" data-id="${d.id}">حذف</button></div>`).join("")}</div>`}
    ${fab("add-date")}
  </div>`;
}

function screenExpenses() {
  const total = store.expenseTotal();
  const items = store.list("expenses");
  return `<div class="screen">
    ${topBar("هزینه‌های مشترک 💰")}
    <div class="card"><div class="tiny faint">جمع کل</div><h2 class="accent">${total.toLocaleString("fa-IR")} تومان</h2></div>
    <div class="gap"></div>
    ${items.length === 0 ? empty("💰", "هزینه‌ای ثبت نشده", "") : `<div class="list">${items.map((e) => `
      <div class="card between"><div><b>${esc(e.category || "سایر")} — ${Number(e.amount).toLocaleString("fa-IR")}</b>
      <div class="tiny faint">${esc(e.date)} ${e.note ? "· " + esc(e.note) : ""}</div></div>
      <button class="tiny danger" data-act="del" data-col="expenses" data-id="${e.id}">حذف</button></div>`).join("")}</div>`}
    ${fab("add-expense")}
  </div>`;
}

function screenRelationship() {
  const last = store.list("checkins")[0] || {
    communication: 5, trust: 5, qualityTime: 5, affection: 5, funScore: 5, support: 5,
  };
  const keys = [
    ["communication", "ارتباط 💬"],
    ["trust", "اعتماد 🤝"],
    ["qualityTime", "وقت دونفره ⏰"],
    ["affection", "محبت ❤️"],
    ["funScore", "خوش گذرونی 🎉"],
    ["support", "حمایت 🛟"],
  ];
  const avg = keys.reduce((s, [k]) => s + Number(last[k] || 5), 0) / 6;
  return `<div class="screen">
    ${topBar("رابطه ما 💞")}
    <div class="card"><b>امتیاز کلی: ${avg.toFixed(1)}/5</b>
      <div class="meter" style="margin-top:8px"><i style="width:${(avg / 5) * 100}%"></i></div>
    </div>
    <div class="gap"></div>
    ${keys.map(([k, label]) => `<div class="card"><div class="between"><span>${label}</span><span class="accent">${last[k] || 5}/5</span></div>
      <input class="range" type="range" min="1" max="5" value="${last[k] || 5}" data-act="rel-sl" data-k="${k}" /></div>`).join("")}
    <div class="gap"></div>
    <button class="btn block" data-act="save-checkin">ثبت بررسی</button>
  </div>`;
}

function screenProfile() {
  const p = store.data.profile;
  const field = (k, label, extra = "") =>
    `<label class="tiny muted">${label}</label><input class="input" data-profile="${k}" value="${esc(p[k] || "")}" ${extra} />`;
  return `<div class="screen">
    ${topBar("پروفایل من 👤")}
    <div class="col">
      ${field("personAName", "اسم اول")}
      ${field("personBName", "اسم دوم")}
      ${field("birthday", "تولد (YYYY-MM-DD)")}
      ${field("favoriteColor", "رنگ مورد علاقه")}
      ${field("favoriteThings", "چیزای مورد علاقه")}
      <label class="tiny muted">زبان عشق</label>
      <select class="input" data-profile="loveLanguage">
        ${LOVE_LANGUAGES.map((l) => `<option ${p.loveLanguage === l ? "selected" : ""}>${l}</option>`).join("")}
      </select>
      ${field("coupleName", "اسم دونفره")}
      ${field("startDate", "تاریخ شروع رابطه")}
      ${field("anniversary", "سالگرد")}
      ${field("favoritePlace", "مکان مورد علاقه")}
      ${field("favoriteSong", "آهنگ دونفره")}
      <label class="tiny muted">داستان ما</label>
      <textarea class="input" data-profile="ourStory">${esc(p.ourStory || "")}</textarea>
      <button class="btn block" data-act="save-profile">ذخیره</button>
    </div>
  </div>`;
}

function screenStory() {
  const p = store.data.profile;
  const items = [
    p.startDate && { date: p.startDate, title: "شروع داستان", text: "روز اول دنیای کوچیک ما" },
    ...store.list("memories").map((m) => ({ date: m.date, title: m.title, text: m.description })),
    ...store.list("story"),
  ].filter(Boolean).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return `<div class="screen">
    ${topBar("داستان ما 📖", p.coupleName)}
    <div class="card">${esc(p.ourStory || "داستانتون رو توی پروفایل بنویسید.")}</div>
    <div class="gap"></div>
    <div class="story-line">
      ${items.map((it) => `<div class="story-dot"></div><div class="card" style="margin-bottom:10px">
        <div class="tiny faint">${esc(it.date)}</div><b>${esc(it.title)}</b><div class="muted">${esc(it.text || "")}</div>
      </div>`).join("") || empty("📖", "هنوز خط داستانی ندارید", "")}
    </div>
    ${fab("add-story")}
  </div>`;
}

function screenPhotos() {
  const photos = store.list("photos");
  return `<div class="screen">
    ${topBar("عکس‌های ما 📸", `${photos.length} عکس`)}
    <label class="btn block">افزودن عکس
      <input type="file" accept="image/*" hidden id="photoFile" />
    </label>
    <div class="gap"></div>
    ${photos.length === 0 ? empty("📸", "گالری خالیه", "اولین عکس دونفره رو اضافه کن") : `<div class="photo-grid">${photos.map((p) => `
      <div class="ph" data-act="open-photo" data-id="${p.id}"><img src="${p.src}" alt="" /></div>`).join("")}</div>`}
  </div>`;
}

function screenSearch() {
  const hits = store.search(state.q);
  return `<div class="screen">
    ${topBar("جستجو 🔍")}
    <input class="input" id="searchQ" value="${esc(state.q)}" placeholder="چی رو می‌گردی؟" />
    <div class="gap"></div>
    ${!state.q ? empty("🔍", "جستجو در خاطرات، چت، تقویم ...", "حداقل ۲ حرف بنویس")
      : hits.length === 0 ? empty("🫧", "چیزی پیدا نشد", "")
      : `<div class="list">${hits.map((h) => `<button class="card" data-act="go" data-route="${h.route}" style="text-align:right;width:100%">
          <div class="tiny accent">${esc(h.type)}</div><b>${esc(h.title)}</b><div class="muted">${esc(h.extra || "")}</div>
        </button>`).join("")}</div>`}
  </div>`;
}

function screenAI() {
  return `<div class="screen">
    ${topBar("دستیار هوشمند 🤖")}
    <div class="card col">
      <div class="tiny faint">ایده بگیر ✨</div>
      <textarea class="input" id="aiPrompt" placeholder="مثلا برای سالگرد چی کادو بگیرم؟">${esc(state.ai.prompt)}</textarea>
      <button class="btn block" data-act="ask-ai">ارسال</button>
      ${state.ai.reply ? `<div class="card" style="background:var(--accent-soft)">${esc(state.ai.reply)}</div>` : ""}
    </div>
    <div class="gap"></div>
    <div class="card tiny muted">
      • پیشنهاد کادو بر اساس آرزوها<br/>• نوشتن نامه عاشقانه<br/>• ایده برای قرار<br/>• تحلیل حال روزانه
    </div>
  </div>`;
}

function screenCustomize() {
  const a = store.data.appearance;
  const colors = ["#ff8aa0", "#ff7eb3", "#c9a0ff", "#7fd4ff", "#e8a87c", "#f0c4de", "#8fd9a4", "#ffd36e"];
  return `<div class="screen">
    ${topBar("کاستوم‌سازی 🎨", "تم، شیشه، رنگ، کیوت")}
    <div class="tiny muted">تم</div>
    <div class="theme-grid">
      ${Object.values(THEMES).map((t) => `<button class="theme-swatch ${a.theme === t.id ? "on" : ""}" data-act="theme" data-id="${t.id}">
        <div>${t.emoji}</div>${t.name}
      </button>`).join("")}
    </div>
    <div class="gap"></div>
    <div class="card col">
      <div class="between"><span>رنگ اکسنت</span></div>
      <div class="color-dots">
        ${colors.map((c) => `<button style="background:${c}" class="${a.accent === c ? "on" : ""}" data-act="accent" data-c="${c}"></button>`).join("")}
      </div>
      <div class="between"><span>شیشه (بلور)</span><span class="tiny">${a.glass}px</span></div>
      <input class="range" type="range" min="8" max="36" value="${a.glass}" data-act="glass" />
      <div class="between"><span>گردی گوشه‌ها</span><span class="tiny">${a.radius}px</span></div>
      <input class="range" type="range" min="10" max="32" value="${a.radius}" data-act="radius" />
      <div class="between"><span>اندازه نوشته</span><span class="tiny">${a.fontScale}</span></div>
      <input class="range" type="range" min="0.9" max="1.2" step="0.05" value="${a.fontScale}" data-act="font" />
      <div class="between"><span>قلب‌های شناور</span><button class="switch ${a.particles ? "on" : ""}" data-act="toggle" data-k="particles"><i></i></button></div>
      <div class="between"><span>استیکر کیوت</span><button class="switch ${a.cuteStickers ? "on" : ""}" data-act="toggle" data-k="cuteStickers"><i></i></button></div>
      <label class="tiny muted">عنوان اپ</label>
      <input class="input" id="coupleTitle" value="${esc(a.coupleTitle)}" />
      <button class="btn block" data-act="save-title">ذخیره عنوان</button>
    </div>
  </div>`;
}

function screenSettings() {
  const a = store.data.auth;
  return `<div class="screen">
    ${topBar("تنظیمات ⚙️")}
    <div class="card col">
      <div class="between"><div><b>اثر انگشت</b><div class="tiny faint">${a.biometricEnabled ? "فعال — " + (a.biometricMethod || "") : "خاموش"}</div></div>
        <button class="switch ${a.biometricEnabled ? "on" : ""}" data-act="toggle-bio"><i></i></button>
      </div>
      <button class="btn ghost" data-act="go" data-route="bio-setup">ثبت دوباره اثر انگشت</button>
      <button class="btn ghost" data-act="lock-now">قفل کردن اپ</button>
      <button class="btn ghost" data-act="go" data-route="customize">کاستوم‌سازی ظاهر</button>
    </div>
    <div class="gap"></div>
    <div class="card tiny muted">
      داده‌ها روی همین دستگاه ذخیره می‌شن (آفلاین). می‌تونی هر وقت خواستی صفحه رو پایین بکشی تا بازخوانی بشه.
    </div>
    <div class="gap"></div>
    <div class="card">
      <button class="btn danger block" data-act="wipe">حذف تمام داده‌ها و خروج</button>
    </div>
  </div>`;
}

function screenNotes() {
  const items = store.list("notes");
  return `<div class="screen">
    ${topBar("یخچال عشق 🧊", "یادداشت‌های چسبونکی")}
    ${items.length === 0 ? empty("🧊", "یخچال خالیه", "یک نوت کیوت بچسبون") : `<div class="list">${items.map((n) => `
      <div class="note c-${n.color || "rose"}">${esc(n.text)}
        <div class="tiny" style="margin-top:8px;opacity:.7">${esc(n.author === "me" ? store.myName() : store.partnerName())}</div>
        <button data-act="del" data-col="notes" data-id="${n.id}" style="background:none;border:0;color:inherit">حذف</button>
      </div>`).join("")}</div>`}
    ${fab("add-note")}
  </div>`;
}

function gameCard(route, emoji, title, tag) {
  return `<button class="game-tile" data-act="go" data-route="${route}">
    <span class="e">${emoji}</span>
    <b>${title}</b>
    <span class="tag">${tag}</span>
  </button>`;
}

function screenGames() {
  const g = store.data.games || {};
  const duo = g.duo || {};
  const best = g.soloBest || {};
  return `<div class="screen">
    ${topBar("اتاق بازی 🎮", "یه‌نفره کیوت + دونفره آنلاین")}
    <div class="card" style="text-align:center">
      <div class="tiny faint">امتیاز دونفره</div>
      <b>💗 ${duo.tttMe || 0} — ${duo.tttPartner || 0} 🌸</b>
      <div class="tiny muted">دوز · گل‌تدی ${duo.rpsMe || 0}:${duo.rpsPartner || 0} · رکورد قلب ${best.catchScore || 0}</div>
    </div>
    <div class="gap"></div>
    <div class="tiny muted">یه‌نفره — برای دل خودت</div>
    <div class="game-grid">
      ${gameCard("game-memory", "🧸", "حافظه قلب‌ها", "یه‌نفره")}
      ${gameCard("game-catch", "💗", "باران قلب", "یه‌نفره")}
    </div>
    <div class="gap"></div>
    <div class="tiny muted">دونفره آنلاین — نوبتی یا با کد</div>
    <div class="game-grid">
      ${gameCard("game-ttt", "🌸", "دوز عاشقانه", "آنلاین")}
      ${gameCard("game-rps", "🎀", "گل و تدی", "آنلاین")}
      ${gameCard("game-quiz", "💌", "چقدر منو می‌شناسی", "آنلاین")}
      ${gameCard("game-truth", "🌙", "حقیقت نرم", "دونفره")}
    </div>
    <div class="gap"></div>
    <div class="card col">
      <div class="tiny faint">اتاق آنلاین</div>
      <p class="muted tiny">کد بازی رو بفرست تا پارتنر همون صفحه رو ببینه — یا دو تب همزمان باز کنید.</p>
      <button class="btn ghost block" data-act="copy-play">کپی کد اتاق 💌</button>
      <input class="input" id="playCode" placeholder="کد پارتنر را بچسبون" />
      <button class="btn block" data-act="join-play">ورود به اتاق</button>
    </div>
    <p class="tiny faint" style="text-align:center;margin-top:12px">${g.plays || 0} دور بازی کردید</p>
  </div>`;
}

function screenGameMemory() {
  const g = store.data.games.memory;
  if (!g) {
    return `<div class="screen">${topBar("حافظه قلب‌ها 🧸", "جفت کیوت‌ها را پیدا کن")}
      <div class="card col" style="text-align:center">
        <div style="font-size:52px">🧁</div>
        <p>۸ جفت قلب و گل و تدی. کمتر حرکت = قشنگ‌تر.</p>
        <button class="btn block" data-act="memory-new">شروع</button>
      </div></div>`;
  }
  return `<div class="screen">
    ${topBar("حافظه قلب‌ها 🧸", g.won ? "همه جفت‌ها پیدا شد 💗" : `${g.moves} حرکت · ${g.matched}/۸ جفت`)}
    <div class="mem-grid">
      ${g.cards.map((c, i) => `<button class="mem-card ${c.flipped || c.matched ? "open" : ""} ${c.matched ? "ok" : ""}" data-act="memory-flip" data-i="${i}">${c.flipped || c.matched ? c.emoji : "♡"}</button>`).join("")}
    </div>
    <div class="gap"></div>
    ${g.won ? `<div class="card" style="text-align:center">آفرین گل 🌸 رکورد: ${store.data.games.soloBest.memoryMoves || g.moves} حرکت</div>` : ""}
    <button class="btn ghost block" data-act="memory-new">دور جدید</button>
  </div>`;
}

function screenGameCatch() {
  const c = state.catcher;
  return `<div class="screen">
    ${topBar("باران قلب 💗", c.running ? `${c.left} ثانیه` : "۲۰ ثانیه قلب بزن")}
    <div class="card" style="text-align:center"><b>امتیاز ${c.score}</b><div class="tiny muted">بهترین: ${store.data.games.soloBest.catchScore || 0}</div></div>
    <div class="gap"></div>
    <div class="catch-arena" id="catchArena">
      ${c.running ? `<button class="catch-heart" data-act="catch-tap" style="left:${c.x}%;top:${c.y}%">💗</button>` : `<p class="faint" style="padding-top:70px">قلب‌ها از آسمون میان ✨</p>`}
    </div>
    <div class="gap"></div>
    ${c.running ? "" : `<button class="btn block" data-act="catch-start">ببار قلب</button>`}
  </div>`;
}

function tttMark(v) {
  if (v === "me") return "💗";
  if (v === "partner") return "🌸";
  return "";
}

function screenGameTtt() {
  const g = store.data.games.ttt;
  const name = (who) => (who === "me" ? store.myName() : store.partnerName());
  if (!g) {
    return `<div class="screen">${topBar("دوز عاشقانه 🌸", "آنلاین دونفره")}
      <p class="muted">تو 💗 هستی، ${esc(store.partnerName())} 🌸. نوبتی بازی کنید یا کد اتاق بفرستید.</p>
      <button class="btn block" data-act="ttt-new" data-mode="hotseat">دونفره روی یک گوشی</button>
      <div class="gap"></div>
      <button class="btn ghost block" data-act="ttt-new" data-mode="online">اتاق آنلاین (کد)</button>
      <div class="gap"></div>
      <button class="btn ghost block" data-act="ttt-new" data-mode="cpu">یه‌نفره با دنیای کوچیک</button>
    </div>`;
  }
  const turnName = g.winner ? "" : name(g.turn);
  const msg = g.winner === "draw" ? "مساوی شد 🤍" : g.winner === "me" ? `${store.myName()} برنده 💗` : g.winner === "partner" ? `${store.partnerName()} برنده 🌸` : `نوبت ${turnName}`;
  return `<div class="screen">
    ${topBar("دوز عاشقانه 🌸", msg)}
    <div class="ttt-grid">
      ${g.board.map((v, i) => `<button class="ttt-cell" data-act="ttt-play" data-i="${i}">${tttMark(v)}</button>`).join("")}
    </div>
    <div class="gap"></div>
    <button class="btn ghost block" data-act="copy-play">کد اتاق برای پارتنر</button>
    <div class="gap"></div>
    <button class="btn block" data-act="ttt-new" data-mode="${g.mode}">دور جدید</button>
  </div>`;
}

function screenGameRps() {
  const g = store.data.games.rps || { me: null, partner: null, result: null };
  const label = (id) => RPS_CHOICES.find((c) => c.id === id);
  const res = !g.result ? "هر کس پنهانی انتخاب کنه 🎀" : g.result === "draw" ? "جفت‌تون قشنگ بود — مساوی 🤍" : g.result === "me" ? `${store.myName()} برد 💗` : `${store.partnerName()} برد 🌸`;
  return `<div class="screen">
    ${topBar("گل و تدی 🎀", "آنلاین · گل > تدی > پاپیون > گل")}
    <div class="card" style="text-align:center"><b>${res}</b></div>
    <div class="gap"></div>
    <div class="tiny muted">انتخاب تو</div>
    <div class="rps-row">
      ${RPS_CHOICES.map((c) => `<button class="rps-btn ${g.me === c.id ? "on" : ""}" data-act="rps-lock" data-who="me" data-c="${c.id}">${c.emoji}<span>${c.name}</span></button>`).join("")}
    </div>
    <div class="gap"></div>
    <div class="tiny muted">انتخاب ${esc(store.partnerName())} ${g.partner && !g.result ? "✓ ثبت شد" : ""}</div>
    <div class="rps-row">
      ${RPS_CHOICES.map((c) => `<button class="rps-btn ${g.partner === c.id ? "on" : ""}" data-act="rps-lock" data-who="partner" data-c="${c.id}">${g.result ? c.emoji : "❔"}<span>${c.name}</span></button>`).join("")}
    </div>
    ${g.result ? `<div class="card" style="text-align:center;margin-top:12px">${label(g.me)?.emoji || ""} در برابر ${label(g.partner)?.emoji || ""}</div>` : ""}
    <div class="gap"></div>
    <button class="btn ghost block" data-act="copy-play">کد اتاق</button>
    <div class="gap"></div>
    <button class="btn block" data-act="rps-new">دور جدید</button>
  </div>`;
}

function screenGameQuiz() {
  const g = store.data.games.quiz || { index: 0, my: null, partner: null, revealed: false, matches: 0 };
  const item = KNOW_ME[g.index % KNOW_ME.length];
  return `<div class="screen">
    ${topBar("چقدر منو می‌شناسی 💌", `${g.matches || 0} جواب جفت`)}
    <div class="card col">
      <div class="tiny faint">سؤال ${g.index + 1}</div>
      <h3>${esc(item.q)}</h3>
    </div>
    <div class="gap"></div>
    <div class="tiny muted">جواب تو</div>
    ${item.options.map((o, i) => `<button class="person-btn ${g.my === i ? "on" : ""}" data-act="quiz-ans" data-who="me" data-i="${i}">${esc(o)}</button>`).join("")}
    <div class="gap"></div>
    <div class="tiny muted">حدس ${esc(store.partnerName())}</div>
    ${item.options.map((o, i) => `<button class="person-btn ${g.partner === i ? "on" : ""}" data-act="quiz-ans" data-who="partner" data-i="${i}">${g.revealed ? esc(o) : "انتخاب پنهان"}</button>`).join("")}
    ${g.revealed ? `<div class="card" style="text-align:center;margin-top:12px">${g.my === g.partner ? "جفت شدین 💗 همینو دوست داره" : "این‌بار فرق داشت — بپرس چرا 🌸"}</div>` : ""}
    <div class="gap"></div>
    <button class="btn ghost block" data-act="copy-play">کد اتاق</button>
    <div class="gap"></div>
    <button class="btn block" data-act="quiz-next">سؤال بعدی</button>
  </div>`;
}

function screenGameTruth() {
  const truth = GAME_TRUTH[store.data.games.plays % GAME_TRUTH.length];
  const rather = GAME_RATHER[store.data.games.plays % GAME_RATHER.length];
  return `<div class="screen">
    ${topBar("حقیقت نرم 🌙", "سوالای کیوت دونفره")}
    <div class="card col">
      <div class="tiny faint">حقیقت</div>
      <h3>${esc(truth)}</h3>
    </div>
    <div class="gap"></div>
    <div class="card col">
      <div class="tiny faint">کدوم رو ترجیح می‌دی؟</div>
      <button class="person-btn" data-act="pick-rather">${esc(rather[0])}</button>
      <button class="person-btn" data-act="pick-rather">${esc(rather[1])}</button>
    </div>
    <div class="gap"></div>
    <button class="btn block" data-act="next-game">سؤال بعدی</button>
  </div>`;
}

function screenHabits() {
  const items = store.list("habits");
  return `<div class="screen">
    ${topBar("عادت‌های دونفره 🔥")}
    ${items.length === 0 ? empty("🔥", "عادتی نیست", "یک عادت کوچیک عاشقانه بساز") : `<div class="list">${items.map((h) => `
      <div class="card between">
        <div><b>${esc(h.emoji || "💗")} ${esc(h.title)}</b><div class="tiny muted">استریک ${h.streak || 0} روز</div></div>
        <button class="check ${h.last === todayISO() ? "on" : ""}" data-act="tick-habit" data-id="${h.id}">${h.last === todayISO() ? "✓" : ""}</button>
      </div>`).join("")}</div>`}
    ${fab("add-habit")}
  </div>`;
}

function screenMusic() {
  const items = store.list("playlist");
  return `<div class="screen">
    ${topBar("آهنگ ما 🎵", store.data.profile.favoriteSong || "")}
    ${items.length === 0 ? empty("🎵", "پلی‌لیست خالیه", "آهنگ دونفره‌تون رو اضافه کنید") : `<div class="list">${items.map((s) => `
      <div class="card between"><div><b>🎵 ${esc(s.title)}</b><div class="tiny muted">${esc(s.artist || "")} ${s.note ? "· " + esc(s.note) : ""}</div></div>
      <button class="tiny danger" data-act="del" data-col="playlist" data-id="${s.id}">حذف</button></div>`).join("")}</div>`}
    ${fab("add-song")}
  </div>`;
}

const SCREENS = {
  splash: screenSplash,
  setup: screenSetup,
  "pin-setup": screenLockSetup,
  "bio-setup": screenBiometricSetup,
  lock: screenLock,
  home: screenHome,
  chat: screenChat,
  memories: screenMemories,
  calendar: screenCalendar,
  more: screenMore,
  mood: screenMood,
  journal: screenJournal,
  tasks: screenTasks,
  wishlist: screenWishlist,
  bucket: screenBucket,
  letters: screenLetters,
  surprises: screenSurprises,
  questions: screenQuestions,
  countdown: screenCountdown,
  dates: screenDates,
  expenses: screenExpenses,
  relationship: screenRelationship,
  profile: screenProfile,
  story: screenStory,
  photos: screenPhotos,
  search: screenSearch,
  ai: screenAI,
  customize: screenCustomize,
  settings: screenSettings,
  notes: screenNotes,
  games: screenGames,
  "game-memory": screenGameMemory,
  "game-catch": screenGameCatch,
  "game-ttt": screenGameTtt,
  "game-rps": screenGameRps,
  "game-quiz": screenGameQuiz,
  "game-truth": screenGameTruth,
  habits: screenHabits,
  music: screenMusic,
};

function render() {
  applyAppearance();
  const shell = document.getElementById("app-shell");
  const hide = !TABS.has(state.route);
  shell.classList.toggle("hide-tabs", hide);
  tabEl().hidden = hide;
  if (!hide) {
    tabEl().innerHTML = [
      ["home", "🏠", "خانه"],
      ["chat", "💬", "چت"],
      ["memories", "💗", "خاطرات"],
      ["calendar", "📅", "تقویم"],
      ["more", "✧", "بیشتر"],
    ]
      .map(([r, ico, l]) => `<button class="nav-item ${state.route === r ? "on" : ""}" data-act="go" data-route="${r}"><span class="ico">${ico}</span>${l}</button>`)
      .join("");
  }
  const view = SCREENS[state.route] || screenHome;
  appEl().innerHTML = view();
  if (store.data.appearance.cuteStickers && TABS.has(state.route)) {
    const s = document.createElement("div");
    s.className = "sticker";
    s.textContent = ["✨", "🌸", "💖", "🌙"][state.route.length % 4];
    s.style.top = "72px";
    s.style.left = "12px";
    appEl().appendChild(s);
  }
  bindDynamic();
  if (state.route === "chat") {
    const log = document.getElementById("chatLog");
    if (log) log.scrollTop = log.scrollHeight;
  }
}

function bindFpHold() {
  const btn = document.getElementById("fpBtn");
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = "1";
  let timer = 0;
  const start = () => {
    btn.classList.add("scanning");
    timer = setTimeout(() => {
      scanFingerprint({ enroll: state.route === "bio-setup" });
    }, 900);
  };
  const cancel = () => {
    clearTimeout(timer);
    if (state.route === "bio-setup" || state.route === "lock") btn.classList.remove("scanning");
  };
  btn.addEventListener("pointerdown", start);
  btn.addEventListener("pointerup", cancel);
  btn.addEventListener("pointerleave", cancel);
}

function bindDynamic() {
  bindFpHold();
  const search = document.getElementById("searchQ");
  if (search) {
    search.addEventListener("input", () => {
      state.q = search.value;
      render();
      const el = document.getElementById("searchQ");
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  }
  const photo = document.getElementById("photoFile");
  if (photo) photo.addEventListener("change", onPhoto);
  document.querySelectorAll("[data-profile]").forEach((el) => {
    el.addEventListener("change", () => {
      store.updateProfile({ [el.dataset.profile]: el.value });
    });
  });
}

function openSheet(html) {
  const m = modalEl();
  m.hidden = false;
  m.innerHTML = `<div class="sheet">${html}</div>`;
}
function closeSheet() {
  modalEl().hidden = true;
  modalEl().innerHTML = "";
}

function fieldHtml(id, label, extra = "") {
  return `<label class="tiny muted">${label}</label><input class="input" id="${id}" ${extra} />`;
}

async function onPinDigit(d) {
  if (state.pin.length >= 4) return;
  state.pin += String(d);
  render();
  if (state.pin.length < 4) return;
  if (state.route === "pin-setup") {
    if (state.pinMode !== "confirm") {
      state.pinFirst = state.pin;
      state.pin = "";
      state.pinMode = "confirm";
      render();
      return;
    }
    if (state.pin !== state.pinFirst) {
      state.fpStatus = "رمز مطابقت ندارد. دوباره تلاش کنید.";
      state.pin = "";
      state.pinMode = "setup";
      render();
      return;
    }
    await store.setPin(state.pin);
    state.pin = "";
    go("bio-setup");
    return;
  }
  if (state.route === "lock") {
    const ok = await store.verifyPin(state.pin);
    if (ok) {
      state.pin = "";
      go("home");
    } else {
      state.fpStatus = "رمز اشتباه";
      state.pin = "";
      render();
    }
  }
}

async function scanFingerprint({ enroll = false } = {}) {
  if (scanFingerprint._busy) return;
  scanFingerprint._busy = true;
  try {
    await scanFingerprintInner({ enroll });
  } finally {
    scanFingerprint._busy = false;
  }
}

async function scanFingerprintInner({ enroll = false } = {}) {
  const btn = document.getElementById("fpBtn");
  if (btn) btn.classList.add("scanning");
  state.fpScan = "scanning";
  await wait(1400);
  if (enroll) {
    const res = await Biometrics.enroll();
    if (!res.ok) {
      state.fpStatus = "bad";
      toast(res.error || "ثبت نشد");
      if (btn) btn.classList.remove("scanning");
      render();
      return;
    }
    store.enrollBiometric(res.secret, res.method);
    if (btn) {
      btn.classList.remove("scanning");
      btn.classList.add("ok");
    }
    toast(res.method === "webauthn" ? "اثر انگشت دستگاه ثبت شد 💗" : "اثر انگشت روی این دستگاه فعال شد 💗");
    await wait(500);
    go("home");
    return;
  }
  if (!store.data.auth.biometricEnabled) {
    toast("اول اثر انگشت را از تنظیمات فعال کن");
    state.fpScan = "";
    render();
    return;
  }
  const res = await Biometrics.authenticate(store.data.auth.biometricSecret, store.data.auth.biometricMethod);
  if (res.ok) {
    const okLocal = store.verifyBiometric(store.data.auth.biometricSecret);
    if (okLocal || res.method === "webauthn") {
      if (btn) btn.classList.add("ok");
      toast("خوش اومدی 💗");
      await wait(350);
      go("home");
      return;
    }
  }
  state.fpStatus = "اثر انگشت تأیید نشد";
  state.fpScan = "bad";
  render();
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 900 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, img.width * scale);
      c.height = Math.max(1, img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function onPhoto(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const src = await compressImage(file);
  store.add("photos", { src, title: file.name, date: todayISO() });
  toast("عکس ذخیره شد 📸");
  render();
}

function refreshData() {
  state.refreshing = true;
  document.getElementById("ptr").classList.add("show");
  const snap = store.refreshSnapshot();
  setTimeout(() => {
    state.refreshing = false;
    document.getElementById("ptr").classList.remove("show");
    toast(`بازخوانی شد ✨ عشق ${snap.loveScore}`);
    render();
  }, 650);
}

function onAct(act, el) {
  const id = el.dataset.id;
  const col = el.dataset.col;
  switch (act) {
    case "go":
      go(el.dataset.route);
      break;
    case "back":
      history.length > 1 ? history.back() : go("home");
      break;
    case "refresh":
      refreshData();
      break;
    case "pick-role": {
      const a = document.getElementById("nameA")?.value;
      const b = document.getElementById("nameB")?.value;
      store.completeSetup({ role: el.dataset.role, demo: true, personAName: a, personBName: b });
      store.seedDemo();
      state.pinMode = "setup";
      state.pin = "";
      go("pin-setup");
      break;
    }
    case "pin-digit":
      onPinDigit(el.dataset.d);
      break;
    case "pin-del":
      state.pin = state.pin.slice(0, -1);
      state.fpStatus = "";
      render();
      break;
    case "fp":
    case "fp-enroll":
      scanFingerprint({ enroll: state.route === "bio-setup" });
      break;
    case "skip-fp":
      go("home");
      break;
    case "send-chat": {
      const input = document.getElementById("chatInput");
      store.sendMessage(input?.value || "");
      render();
      break;
    }
    case "sticker":
      store.sendMessage(el.dataset.s, { type: "STICKER" });
      burst(window.innerWidth / 2, window.innerHeight - 120, [el.dataset.s, "✨"]);
      render();
      break;
    case "send-kiss": {
      store.sendKiss();
      const r = el.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top, ["💋", "💗", "✨"]);
      toast("بوس فرستاده شد 💋");
      render();
      break;
    }
    case "receive-kiss":
      store.receiveKiss();
      toast("یک بوس برگشت 💗");
      render();
      break;
    case "say-hi": {
      const kind = el.dataset.kind;
      const text = kind === "night" ? `شب بخیر ${store.partnerName()} 🌙` : `صبح بخیر ${store.partnerName()} ☀️`;
      store.sendMessage(text);
      toast(text);
      go("chat");
      break;
    }
    case "feed-pet":
      store.feedPet();
      burst(window.innerWidth / 2, 180, ["🍓", "✨", "💗"]);
      toast("نی‌نی سیر شد 🍓");
      render();
      break;
    case "pet-pet":
      store.petPet();
      burst(window.innerWidth / 2, 180, ["🤍", "✨"]);
      toast("نوازش شد 🤍");
      render();
      break;
    case "set-pet":
      store.setPet({ type: el.dataset.type });
      render();
      break;
    case "save-pet-name":
      store.setPet({ name: document.getElementById("petName")?.value || "نی‌نی" });
      toast("اسم ذخیره شد");
      render();
      break;
    case "draw-compliment":
      state.drawn = store.drawCompliment();
      burst(window.innerWidth / 2, 200, ["💌", "💗", "✨"]);
      toast("یک تعریف درآمد");
      render();
      break;
    case "add-compliment":
      openSheet(`<h3>تعریف جدید</h3><textarea class="input" id="f-desc" placeholder="یه جمله نرم..."></textarea>
        <div class="gap"></div><button class="btn block" data-act="save-compliment">بریز توی شیشه</button><button class="btn ghost block" data-act="close">انصراف</button>`);
      break;
    case "save-compliment":
      store.add("compliments", { text: val("f-desc") || "دوستت دارم", author: "me" });
      closeSheet();
      render();
      break;
    case "add-capsule":
      openSheet(`<h3>کپسول عشق</h3>${fieldHtml("f-title", "عنوان")}<textarea class="input" id="f-desc" placeholder="پیام برای آینده"></textarea>${fieldHtml("f-date", "تاریخ اختیاری YYYY-MM-DD")}
        <div class="gap"></div><button class="btn block" data-act="save-capsule">ببند</button><button class="btn ghost block" data-act="close">انصراف</button>`);
      break;
    case "save-capsule":
      store.add("capsules", { title: val("f-title") || "کپسول", text: val("f-desc"), openOnDate: val("f-date") });
      closeSheet();
      render();
      break;
    case "fav-mem":
      store.update("memories", id, { favorite: !store.list("memories").find((m) => m.id === id)?.favorite });
      render();
      break;
    case "del":
      store.remove(col, id);
      toast("حذف شد");
      render();
      break;
    case "filter":
      state.filter = el.dataset.f;
      render();
      break;
    case "toggle-task": {
      const t = store.list("tasks").find((x) => x.id === id);
      store.update("tasks", id, { status: t.status === "DONE" ? "TODO" : "DONE" });
      render();
      break;
    }
    case "toggle-wish": {
      const w = store.list("wishlist").find((x) => x.id === id);
      store.update("wishlist", id, { isCompleted: !w.isCompleted });
      render();
      break;
    }
    case "toggle-bucket": {
      const b = store.list("bucket").find((x) => x.id === id);
      store.update("bucket", id, { isCompleted: !b.isCompleted, completedDate: !b.isCompleted ? todayISO() : "" });
      render();
      break;
    }
    case "open-letter": {
      const r = store.openLetter(id);
      toast(r.ok ? "باز شد 💌" : r.error);
      render();
      break;
    }
    case "reveal":
      store.update("surprises", id, { isRevealed: true });
      render();
      break;
    case "pick-mood":
      store.saveMood({ ...(store.todayMood("me") || {}), mood: el.dataset.mood, user: "me" });
      render();
      break;
    case "save-mood": {
      const note = document.getElementById("moodNote")?.value || "";
      const cur = store.todayMood("me") || { mood: "خوب" };
      store.saveMood({ ...cur, note, user: "me" });
      toast("حال ذخیره شد 💗");
      go("home");
      break;
    }
    case "demo-partner-mood":
      store.saveMood({ mood: "عاشق", user: "partner", energy: 8, loveLevel: 9 });
      toast("حال پارتنر همگام شد");
      render();
      break;
    case "save-answer": {
      const text = document.getElementById("qAnswer")?.value.trim();
      if (!text) return;
      store.add("answers", { text, who: store.myName(), date: todayISO(), question: store.dailyQuestion() });
      toast("ثبت شد");
      render();
      break;
    }
    case "save-idea": {
      const idea = DATE_IDEAS[Math.floor(Math.random() * DATE_IDEAS.length)];
      store.add("dates", { ...idea, when: "" });
      toast("به برنامه‌ها اضافه شد");
      render();
      break;
    }
    case "random-idea":
      render();
      toast("یک ایده تازه ✨");
      break;
    case "save-checkin": {
      const sl = [...document.querySelectorAll("[data-act=rel-sl]")];
      const rec = { average: 0 };
      sl.forEach((s) => (rec[s.dataset.k] = Number(s.value)));
      rec.average = sl.reduce((a, s) => a + Number(s.value), 0) / sl.length;
      rec.date = todayISO();
      store.add("checkins", rec);
      toast("بررسی ثبت شد");
      render();
      break;
    }
    case "save-profile":
      toast("پروفایل ذخیره شد");
      break;
    case "ask-ai": {
      const p = document.getElementById("aiPrompt")?.value || "";
      state.ai = { prompt: p, reply: store.aiReply(p) };
      render();
      break;
    }
    case "theme":
      store.setAppearance({ theme: el.dataset.id });
      render();
      break;
    case "accent":
      store.setAppearance({ accent: el.dataset.c });
      render();
      break;
    case "toggle":
      store.setAppearance({ [el.dataset.k]: !store.data.appearance[el.dataset.k] });
      render();
      break;
    case "save-title":
      store.setAppearance({ coupleTitle: document.getElementById("coupleTitle")?.value || "دنیای کوچیک ما" });
      toast("عنوان ذخیره شد");
      render();
      break;
    case "toggle-bio":
      if (store.data.auth.biometricEnabled) {
        store.disableBiometric();
        toast("اثر انگشت خاموش شد");
        render();
      } else go("bio-setup");
      break;
    case "lock-now":
      go("lock");
      break;
    case "wipe":
      if (confirm("همه داده‌ها پاک بشه؟")) {
        store.reset();
        go("setup");
      }
      break;
    case "pick-date":
      state.selectedDate = el.dataset.date;
      render();
      break;
    case "cal-prev":
      state.calendar = new Date(state.calendar.getFullYear(), state.calendar.getMonth() - 1, 1);
      render();
      break;
    case "cal-next":
      state.calendar = new Date(state.calendar.getFullYear(), state.calendar.getMonth() + 1, 1);
      render();
      break;
    case "tick-habit":
      store.tickHabit(id);
      render();
      break;
    case "next-game":
    case "pick-rather":
      store.bumpPlays();
      toast("عاشقانه بود 💗");
      render();
      break;
    case "memory-new":
      store.startMemory();
      render();
      break;
    case "memory-flip": {
      const mem = store.flipMemory(Number(el.dataset.i));
      render();
      if (mem?.lock) {
        setTimeout(() => {
          store.memoryUnflip();
          render();
        }, 700);
      }
      if (mem?.won) {
        burst(window.innerWidth / 2, 180, ["🧸", "💗", "🌸"]);
        toast("همه جفت‌ها پیدا شد 🧁");
      }
      break;
    }
    case "catch-start":
      startCatcher();
      break;
    case "catch-tap":
      if (!state.catcher.running) break;
      state.catcher.score += 1;
      state.catcher.x = 8 + Math.random() * 72;
      state.catcher.y = 10 + Math.random() * 62;
      burst(el.getBoundingClientRect().left, el.getBoundingClientRect().top, ["💗", "✨"]);
      render();
      break;
    case "ttt-new":
      store.startTtt(el.dataset.mode || "hotseat");
      syncPlay();
      render();
      break;
    case "ttt-play": {
      const before = store.data.games.ttt?.turn;
      store.playTtt(Number(el.dataset.i));
      const w = store.data.games.ttt?.winner;
      if (w && w !== "draw") burst(window.innerWidth / 2, 200, ["💗", "🌸", "✨"]);
      if (before && store.data.games.ttt?.turn !== before) syncPlay();
      render();
      break;
    }
    case "rps-new":
      store.startRps();
      syncPlay();
      render();
      break;
    case "rps-lock":
      store.lockRps(el.dataset.who, el.dataset.c);
      syncPlay();
      render();
      break;
    case "quiz-ans":
      store.answerQuiz(el.dataset.who, Number(el.dataset.i));
      syncPlay();
      render();
      break;
    case "quiz-next":
      if (!store.data.games.quiz) store.startQuiz();
      else store.nextQuiz();
      syncPlay();
      render();
      break;
    case "copy-play": {
      const code = store.exportPlayCode();
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).catch(() => {});
      store.sendMessage(`🎮 کد اتاق بازی:\n${code}`);
      toast("کد توی چت هم فرستاده شد 💌");
      break;
    }
    case "join-play": {
      const r = store.importPlayCode(val("playCode") || document.getElementById("playCode")?.value);
      toast(r.ok ? "وارد اتاق شدی 🌸" : r.error);
      if (r.ok) {
        const g = store.data.games;
        if (g.ttt?.board?.some(Boolean) || g.ttt?.mode) go("game-ttt");
        else if (g.rps?.me || g.rps?.partner) go("game-rps");
        else if (g.quiz) go("game-quiz");
        else go("games");
      } else render();
      break;
    }
    case "add-memory":
      openSheet(`<h3>خاطره جدید</h3>${fieldHtml("f-title", "عنوان")}${fieldHtml("f-desc", "توضیح")}${fieldHtml("f-loc", "مکان")}
        <div class="gap"></div><button class="btn block" data-act="save-memory">ذخیره</button><button class="btn ghost block" data-act="close">انصراف</button>`);
      break;
    case "save-memory":
      store.add("memories", {
        title: val("f-title") || "خاطره",
        description: val("f-desc"),
        location: val("f-loc"),
        date: todayISO(),
        favorite: false,
      });
      closeSheet();
      toast("خاطره ثبت شد ❤️");
      render();
      break;
    case "add-event":
      openSheet(`<h3>رویداد جدید</h3>${fieldHtml("f-title", "عنوان")}${fieldHtml("f-desc", "توضیح")}
        <div class="gap"></div><button class="btn block" data-act="save-event">ذخیره</button><button class="btn ghost block" data-act="close">انصراف</button>`);
      break;
    case "save-event":
      store.add("events", { title: val("f-title") || "رویداد", description: val("f-desc"), date: state.selectedDate });
      closeSheet();
      render();
      break;
    case "add-journal":
      openSheet(`<h3>یادداشت جدید</h3>${fieldHtml("f-title", "عنوان")}<textarea class="input" id="f-desc" placeholder="متن"></textarea>
        <div class="gap"></div><button class="btn block" data-act="save-journal">ذخیره</button><button class="btn ghost block" data-act="close">انصراف</button>`);
      break;
    case "save-journal":
      store.add("journal", { title: val("f-title") || "یادداشت", content: val("f-desc"), privacy: "PRIVATE", date: todayISO() });
      closeSheet();
      render();
      break;
    case "add-task":
      openSheet(`<h3>کار جدید</h3>${fieldHtml("f-title", "عنوان")}${fieldHtml("f-desc", "توضیح")}${fieldHtml("f-due", "موعد YYYY-MM-DD")}
        <div class="gap"></div><button class="btn block" data-act="save-task">افزودن</button><button class="btn ghost block" data-act="close">انصراف</button>`);
      break;
    case "save-task":
      store.add("tasks", { title: val("f-title") || "کار", description: val("f-desc"), dueDate: val("f-due"), priority: "MEDIUM", assignedTo: "BOTH", status: "TODO" });
      closeSheet();
      render();
      break;
    case "add-wish":
      openSheet(`<h3>آرزوی جدید</h3>${fieldHtml("f-title", "عنوان")}${fieldHtml("f-desc", "توضیح")}${fieldHtml("f-cat", "دسته")}
        <div class="gap"></div><button class="btn block" data-act="save-wish">افزودن</button><button class="btn ghost block" data-act="close">انصراف</button>`);
      break;
    case "save-wish":
      store.add("wishlist", { title: val("f-title") || "آرزو", description: val("f-desc"), category: val("f-cat"), privacy: "SHARED", isCompleted: false });
      closeSheet();
      render();
      break;
    case "add-bucket":
      openSheet(`<h3>خواسته جدید</h3>${fieldHtml("f-title", "عنوان")}${fieldHtml("f-desc", "توضیح")}
        <div class="gap"></div><button class="btn block" data-act="save-bucket">افزودن</button><button class="btn ghost block" data-act="close">انصراف</button>`);
      break;
    case "save-bucket":
      store.add("bucket", { title: val("f-title") || "رویا", description: val("f-desc"), isCompleted: false, completedDate: "" });
      closeSheet();
      render();
      break;
    case "add-letter":
      openSheet(`<h3>نامه جدید 💌</h3>${fieldHtml("f-title", "عنوان")}<textarea class="input" id="f-desc" placeholder="متن عاشقانه"></textarea>${fieldHtml("f-date", "تاریخ بازگشایی YYYY-MM-DD")}
        <div class="gap"></div><button class="btn block" data-act="save-letter">ارسال</button><button class="btn ghost block" data-act="close">انصراف</button>`);
      break;
    case "save-letter":
      store.add("letters", { title: val("f-title") || "نامه", content: val("f-desc"), openOnDate: val("f-date"), isOpened: !val("f-date") });
      closeSheet();
      render();
      break;
    case "add-surprise":
      openSheet(`<h3>سورپرایز جدید</h3>${fieldHtml("f-title", "عنوان")}<textarea class="input" id="f-desc" placeholder="محتوا"></textarea>
        <div class="gap"></div><button class="btn block" data-act="save-surprise">ساخت</button><button class="btn ghost block" data-act="close">انصراف</button>`);
      break;
    case "save-surprise":
      store.add("surprises", { title: val("f-title") || "سورپرایز", content: val("f-desc"), isRevealed: false });
      closeSheet();
      render();
      break;
    case "add-countdown":
      openSheet(`<h3>شمارش جدید</h3>${fieldHtml("f-title", "عنوان")}${fieldHtml("f-date", "تاریخ YYYY-MM-DD")}${fieldHtml("f-emoji", "اموجی", 'value="❤️"')}
        <div class="gap"></div><button class="btn block" data-act="save-cd">افزودن</button><button class="btn ghost block" data-act="close">انصراف</button>`);
      break;
    case "save-cd":
      store.add("countdowns", { title: val("f-title") || "رویداد", targetDate: val("f-date") || todayISO(), emoji: val("f-emoji") || "❤️" });
      closeSheet();
      render();
      break;
    case "add-date":
      openSheet(`<h3>قرار جدید</h3>${fieldHtml("f-title", "عنوان")}${fieldHtml("f-desc", "توضیح")}${fieldHtml("f-when", "کی؟")}
        <div class="gap"></div><button class="btn block" data-act="save-date">افزودن</button><button class="btn ghost block" data-act="close">انصراف</button>`);
      break;
    case "save-date":
      store.add("dates", { title: val("f-title") || "قرار", desc: val("f-desc"), when: val("f-when"), emoji: "💕" });
      closeSheet();
      render();
      break;
    case "add-expense":
      openSheet(`<h3>هزینه جدید</h3>${fieldHtml("f-amount", "مبلغ تومان", 'type="number"')}${fieldHtml("f-cat", "دسته")}${fieldHtml("f-note", "یادداشت")}
        <div class="gap"></div><button class="btn block" data-act="save-exp">افزودن</button><button class="btn ghost block" data-act="close">انصراف</button>`);
      break;
    case "save-exp":
      store.add("expenses", { amount: Number(val("f-amount") || 0), category: val("f-cat"), note: val("f-note"), date: todayISO(), paidBy: "me" });
      closeSheet();
      render();
      break;
    case "add-note":
      openSheet(`<h3>نوت چسبونکی</h3><textarea class="input" id="f-desc" placeholder="یه جمله کیوت..."></textarea>
        <div class="gap"></div><button class="btn block" data-act="save-note">بچسبون</button><button class="btn ghost block" data-act="close">انصراف</button>`);
      break;
    case "save-note": {
      const colors = ["rose", "lemon", "mint", "sky", "lilac"];
      store.add("notes", { text: val("f-desc") || "دوستت دارم", color: colors[Math.floor(Math.random() * colors.length)], author: "me" });
      closeSheet();
      render();
      break;
    }
    case "add-habit":
      openSheet(`<h3>عادت جدید</h3>${fieldHtml("f-title", "عنوان")}${fieldHtml("f-emoji", "اموجی", 'value="💗"')}
        <div class="gap"></div><button class="btn block" data-act="save-habit">افزودن</button><button class="btn ghost block" data-act="close">انصراف</button>`);
      break;
    case "save-habit":
      store.add("habits", { title: val("f-title") || "عادت", emoji: val("f-emoji") || "💗", streak: 0, last: "", history: [] });
      closeSheet();
      render();
      break;
    case "add-song":
      openSheet(`<h3>آهنگ جدید</h3>${fieldHtml("f-title", "عنوان")}${fieldHtml("f-artist", "خواننده")}${fieldHtml("f-note", "نوت")}
        <div class="gap"></div><button class="btn block" data-act="save-song">افزودن</button><button class="btn ghost block" data-act="close">انصراف</button>`);
      break;
    case "save-song":
      store.add("playlist", { title: val("f-title") || "آهنگ", artist: val("f-artist"), note: val("f-note") });
      closeSheet();
      render();
      break;
    case "add-story":
      openSheet(`<h3>نقطه داستان</h3>${fieldHtml("f-title", "عنوان")}${fieldHtml("f-date", "تاریخ YYYY-MM-DD")}${fieldHtml("f-desc", "متن")}
        <div class="gap"></div><button class="btn block" data-act="save-story">افزودن</button><button class="btn ghost block" data-act="close">انصراف</button>`);
      break;
    case "save-story":
      store.add("story", { title: val("f-title") || "لحظه", date: val("f-date") || todayISO(), text: val("f-desc") });
      closeSheet();
      render();
      break;
    case "close":
      closeSheet();
      break;
    default:
      break;
  }
}

function val(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function startCatcher() {
  clearInterval(startCatcher._t);
  state.catcher = { running: true, score: 0, left: 20, x: 42, y: 36 };
  render();
  startCatcher._t = setInterval(() => {
    if (!state.catcher.running) return;
    state.catcher.left -= 1;
    if (state.catcher.left <= 0) {
      clearInterval(startCatcher._t);
      state.catcher.running = false;
      store.saveCatchScore(state.catcher.score);
      toast(`باران تموم شد — ${state.catcher.score} قلب 💗`);
    }
    render();
  }, 1000);
}

function stopCatcher() {
  clearInterval(startCatcher._t);
  if (state.catcher) state.catcher.running = false;
}

function syncPlay() {
  try {
    syncPlay._ch = syncPlay._ch || new BroadcastChannel("coupleos-play");
    syncPlay._ch.postMessage({ at: Date.now() });
  } catch {
    /* older browsers */
  }
}

function listenPlay() {
  try {
    const ch = new BroadcastChannel("coupleos-play");
    ch.onmessage = () => {
      store.data = store.load();
      if (String(state.route).startsWith("game")) render();
    };
  } catch {
    /* ignore */
  }
  window.addEventListener("storage", (e) => {
    if (e.key === "coupleos_v2") {
      store.data = store.load();
      if (String(state.route).startsWith("game") || state.route === "games") render();
    }
  });
}

function bootHearts() {
  const root = document.getElementById("hearts");
  root.innerHTML = "";
  for (let i = 0; i < 14; i++) {
    const s = document.createElement("span");
    s.className = "heart-p";
    s.textContent = ["💗", "✨", "🌸", "💞"][i % 4];
    s.style.left = `${Math.random() * 100}%`;
    s.style.animationDuration = `${7 + Math.random() * 6}s`;
    s.style.animationDelay = `${Math.random() * 6}s`;
    s.style.fontSize = `${12 + Math.random() * 10}px`;
    root.appendChild(s);
  }
}

function setupPullRefresh() {
  const el = appEl();
  let startY = 0;
  let pulling = false;
  el.addEventListener(
    "touchstart",
    (e) => {
      if (el.scrollTop <= 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    },
    { passive: true }
  );
  el.addEventListener(
    "touchmove",
    (e) => {
      if (!pulling) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 24) document.getElementById("ptr").classList.add("show");
    },
    { passive: true }
  );
  el.addEventListener("touchend", (e) => {
    if (!pulling) return;
    pulling = false;
    const dy = (e.changedTouches[0]?.clientY || 0) - startY;
    if (dy > 64 && el.scrollTop <= 0) refreshData();
    else document.getElementById("ptr").classList.remove("show");
  });
}

function initialRoute() {
  if (!store.data.auth.paired) return "setup";
  if (!store.data.auth.lockSetup) return "pin-setup";
  return "lock";
}

function init() {
  applyAppearance();
  bootHearts();
  listenPlay();
  document.getElementById("orbs").innerHTML = `<div class="orb a"></div><div class="orb b"></div><div class="orb c"></div>`;
  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) {
      if (e.target.id === "modal") closeSheet();
      return;
    }
    onAct(btn.dataset.act, btn);
  });
  document.body.addEventListener("input", (e) => {
    const t = e.target;
    if (t.dataset.act === "mood-sl") {
      const cur = store.todayMood("me") || { mood: "معمولی", user: "me" };
      store.saveMood({ ...cur, [t.dataset.k]: Number(t.value) });
    }
    if (t.dataset.act === "glass") {
      store.setAppearance({ glass: Number(t.value) });
      applyAppearance();
    }
    if (t.dataset.act === "radius") {
      store.setAppearance({ radius: Number(t.value) });
      applyAppearance();
    }
    if (t.dataset.act === "font") {
      store.setAppearance({ fontScale: Number(t.value) });
      applyAppearance();
    }
  });
  document.body.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && state.route === "chat") {
      const input = document.getElementById("chatInput");
      if (document.activeElement === input) {
        store.sendMessage(input.value);
        render();
      }
    }
  });
  window.addEventListener("hashchange", () => {
    const r = location.hash.replace("#", "");
    if (r && SCREENS[r] && r !== state.route) {
      if (state.route === "game-catch" && r !== "game-catch") stopCatcher();
      state.route = r;
      render();
    }
  });
  setupPullRefresh();
  state.route = "splash";
  render();
  setTimeout(() => {
    const next = initialRoute();
    go(next);
  }, 1200);
}

init();

export { store, state };
