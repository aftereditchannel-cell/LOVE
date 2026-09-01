/**
 * Couple OS — local-first data store.
 * Works in the browser (localStorage) and in Node tests (memory storage).
 */

export const STORE_KEY = "coupleos_v2";

export function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      map.set(k, String(v));
    },
    removeItem: (k) => {
      map.delete(k);
    },
    clear: () => map.clear(),
  };
}

export function uid(prefix = "id") {
  const rand =
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${rand}`;
}

export function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function nowISO() {
  return new Date().toISOString();
}

export async function sha256(text) {
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(text).digest("hex");
}

export const THEMES = {
  "rose-glass": {
    id: "rose-glass",
    name: "رز شیشه‌ای",
    emoji: "🌹",
    accent: "#ff8aa0",
    accent2: "#c9a0ff",
    bg: "#14080e",
    text: "#fff4f6",
  },
  sakura: {
    id: "sakura",
    name: "ساکورا",
    emoji: "🌸",
    accent: "#ff7eb3",
    accent2: "#ffd3e8",
    bg: "#1a0d14",
    text: "#fff0f6",
  },
  lavender: {
    id: "lavender",
    name: "اسطوخودوس",
    emoji: "💜",
    accent: "#c9a0ff",
    accent2: "#8ec5ff",
    bg: "#120816",
    text: "#f6f0ff",
  },
  ocean: {
    id: "ocean",
    name: "اقیانوس",
    emoji: "🌊",
    accent: "#7fd4ff",
    accent2: "#9b8cff",
    bg: "#071018",
    text: "#eef8ff",
  },
  cream: {
    id: "cream",
    name: "کرم عسلی",
    emoji: "🍯",
    accent: "#e8a87c",
    accent2: "#f3c98b",
    bg: "#1a140e",
    text: "#fff6ea",
  },
  night: {
    id: "night",
    name: "شب ستاره‌ای",
    emoji: "✨",
    accent: "#f0c4de",
    accent2: "#9ad7ff",
    bg: "#07070c",
    text: "#f4f1ff",
  },
  candy: {
    id: "candy",
    name: "آبنبات پاستلی",
    emoji: "🍬",
    accent: "#ff9ec8",
    accent2: "#b8f0d4",
    bg: "#1a0e16",
    text: "#fff4fb",
  },
  peach: {
    id: "peach",
    name: "هلو کیوت",
    emoji: "🍑",
    accent: "#ffb199",
    accent2: "#ffd6e8",
    bg: "#1a100e",
    text: "#fff3ee",
  },
};

export const COMPLIMENTS = [
  "خنده‌ت قشنگ‌ترین چیز امروز بود.",
  "با تو دنیا نرم‌تره.",
  "امروزم عاشقتم، بدون دلیل اضافه.",
  "صدات آرومم می‌کنه.",
  "تو جای امن منی.",
  "چشات هنوز مثل روز اول قشنگه.",
  "مرسی که هستی — همین کافیه.",
  "بوغلت از هر قهوه‌ای بهتره.",
  "تو نسخه کیوت زندگی منی.",
  "اگر ستاره بودی، کل آسمون مال ما بود.",
  "دستات گرمه، دلم آرومه.",
  "یک پیام کوچیکت کل روزم رو قشنگ می‌کنه.",
];

export const FORTUNES = [
  { emoji: "🌸", text: "امروز یک بوس اضافه، حال هر دو را عوض می‌کند." },
  { emoji: "🌙", text: "شب، بدون موبایل، فقط شما دوتا." },
  { emoji: "🍓", text: "یک سورپرایز خوراکی کوچیک بساز." },
  { emoji: "💌", text: "یک جمله کوتاه بنویس و توی یخچال عشق بچسبون." },
  { emoji: "🧸", text: "حیوون دونفره‌تون گرسنه است — یه نوازش بده." },
  { emoji: "✨", text: "یک خاطره قدیمی را با هم مرور کنید." },
  { emoji: "🎀", text: "امروز نوبت تعریف کردن از هم است." },
  { emoji: "☕", text: "چای دونفره، بدون عجله." },
];

export const PETS = [
  { id: "bunny", emoji: "🐰", name: "نی‌نی خرگوش" },
  { id: "kitten", emoji: "🐱", name: "پیشی مهربون" },
  { id: "chick", emoji: "🐥", name: "جوجه طلایی" },
  { id: "panda", emoji: "🐼", name: "پاندای کوچولو" },
  { id: "cloud", emoji: "☁️", name: "ابر پنبه‌ای" },
  { id: "bear", emoji: "🧸", name: "تدی بغل‌کردنی" },
];

export const CHAT_STICKERS = ["💗", "🥰", "😘", "🌸", "✨", "🐻", "🐱", "🍓", "🎀", "🌙", "🐰", "🍑", "⭐", "🫧", "🧁", "🧸"];

export const DAILY_QUESTIONS = [
  "امروز بیشتر از همه دلت چی می‌خواد؟",
  "کدوم خاطره‌مون رو هیچ‌وقت فراموش نمی‌کنی؟",
  "اگر همین الان سفر می‌رفتیم کجا می‌رفتیم؟",
  "امروز از چه چیزی ممنونی؟",
  "یک چیز که امروز لبخند رو لبت آورد؟",
  "چه آهنگی الان حالت رو خوب می‌کنه؟",
  "اگر فردا تعطیل بود چیکار می‌کردی؟",
  "دوست داری امشب چی برات بپزم / چی بگیری؟",
  "یک راز کوچیک که هنوز نگفتی؟",
  "اولین چیزی که از من به خاطر میاری چیه؟",
  "اگر یک آرزو همین الان برآورده بشه چی می‌خوای؟",
  "امروز چطور می‌تونم حالت رو بهتر کنم؟",
];

export const DATE_IDEAS = [
  { emoji: "🕯️", title: "شام شمع و ستاره", desc: "میز رو با شمع و گل بچینید، موبایل‌ها خاموش، فقط شما دوتا." },
  { emoji: "🎬", title: "شب فیلم دونفره", desc: "پتو، پاپ‌کورن خونگی و فیلمی که هر دو دوست دارید." },
  { emoji: "🧺", title: "پیک‌نیک غروب", desc: "یک سبد کوچیک، چای فلاسک و تماشای غروب." },
  { emoji: "🚶", title: "پیاده‌روی بی‌هدف", desc: "بدون نقشه راه برید و هر جا قشنگ بود عکس بگیرید." },
  { emoji: "🎨", title: "نقاشی با هم", desc: "دو بوم کوچیک، هر کدوم همدیگه رو بکشید." },
  { emoji: "🍳", title: "آشپزی مشترک", desc: "یک دستور جدید که هیچ‌کدوم بلد نیستید با هم بپزید." },
  { emoji: "📸", title: "شکار خاطره", desc: "یک ساعت فقط عکس از چیزای کوچیک و کیوت." },
  { emoji: "🌙", title: "ستاره بینی", desc: "روی پشت‌بام یا پارک، پتو پهن کنید و ستاره‌ها رو بشمارید." },
  { emoji: "☕", title: "کافه مخفی", desc: "یک کافه جدید که هیچ‌کدوم نرفتید کشف کنید." },
  { emoji: "💌", title: "نامه و صبحانه", desc: "برای هم نامه بنویسید و با صبحانه عاشقانه باز کنید." },
  { emoji: "🧖", title: "اسپا خونگی", desc: "ماسک صورت، موسیقی آروم و مراقبت از هم." },
  { emoji: "🚲", title: "دوچرخه و بستنی", desc: "یک مسیر کوتاه و جایزه بستنی آخر راه." },
];

export const GAME_TRUTH = [
  "اولین چیزی که از پارتنرت عاشقش شدی چی بود؟",
  "یک عادت کوچیکش که دلت براش ضعف میره؟",
  "اگر یک روز جاتون عوض می‌شد چیکار می‌کردی؟",
  "یک ترس کوچیک که هنوز بهش نگفتی؟",
  "کدوم خاطره‌تون باید فیلم بشه؟",
];

export const GAME_RATHER = [
  ["سفر جاده‌ای شبانه", "هتل پنج ستاره ساحلی"],
  ["نامه دست‌نویس هر هفته", "سورپرایز ناگهانی"],
  ["باران و چای", "آفتاب و بستنی"],
  ["فیلم عاشقانه", "بازی دونفره"],
  ["صبح زود با هم", "شب دیر با هم"],
];

export const MEMORY_EMOJIS = ["💗", "🌸", "🍓", "🧸", "🐰", "🎀", "✨", "🧁"];

export const RPS_CHOICES = [
  { id: "flower", emoji: "🌸", name: "گل" },
  { id: "teddy", emoji: "🧸", name: "تدی" },
  { id: "bow", emoji: "🎀", name: "پاپیون" },
];

/** flower beats teddy, teddy beats bow, bow beats flower */
export function rpsBeats(a, b) {
  if (a === b) return 0;
  if ((a === "flower" && b === "teddy") || (a === "teddy" && b === "bow") || (a === "bow" && b === "flower")) return 1;
  return -1;
}

export const KNOW_ME = [
  { q: "صبحونه مورد علاقه‌ش چیه؟", options: ["نان و پنیر و چای", "کرپ و توت‌فرنگی", "هرچی تو بپزی"] },
  { q: "اگر بارون بیاد چیکار می‌کنه؟", options: ["چای و فیلم", "پیاده‌روی خیس", "عکس از قطره‌ها"] },
  { q: "کادوی رویایی‌ش چیه؟", options: ["نامه دست‌نویس", "گل غیرمنتظره", "سفر غافلگیرکننده"] },
  { q: "رنگ حال‌خوب‌کن‌ش؟", options: ["صورتی پاستلی", "یاسی", "کرم عسلی"] },
  { q: "قرار ایده‌آل؟", options: ["شام شمع", "پیک‌نیک غروب", "اسپا خونگی"] },
  { q: "چی بیشتر لوس‌ش می‌کنه؟", options: ["یک بوس الکی", "صدازدن با اسم کیوت", "بغل طولانی"] },
];

export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function tttWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every(Boolean)) return "draw";
  return null;
}

export const LOVE_LANGUAGES = ["حرفای تأییدکننده", "وقت باکیفیت", "هدیه", "خدمات", "لمس فیزیکی"];

export const MOODS = [
  { value: "عالی", emoji: "😍", label: "عالی" },
  { value: "عاشق", emoji: "🥰", label: "عاشق" },
  { value: "خوب", emoji: "😊", label: "خوب" },
  { value: "معمولی", emoji: "🙂", label: "معمولی" },
  { value: "خنثی", emoji: "😐", label: "خنثی" },
  { value: "ناراحت", emoji: "😔", label: "ناراحت" },
  { value: "خیلی بد", emoji: "😢", label: "خیلی بد" },
  { value: "عصبانی", emoji: "😡", label: "عصبانی" },
  { value: "خسته", emoji: "😴", label: "خسته" },
];

const SAD_MOODS = new Set(["ناراحت", "خیلی بد", "عصبانی"]);

export function defaultAppearance() {
  return {
    theme: "rose-glass",
    accent: "#ff8aa0",
    glass: 22,
    particles: true,
    cuteStickers: true,
    fontScale: 1,
    radius: 22,
    bgStyle: "orbs",
    coupleTitle: "دنیای کوچیک ما",
  };
}

export function defaultState() {
  return {
    meta: { version: 2, createdAt: nowISO() },
    auth: {
      paired: false,
      lockSetup: false,
      pinHash: null,
      biometricEnabled: false,
      biometricSecret: null,
      biometricMethod: null,
      role: null,
      userId: null,
      partnerId: null,
      demo: false,
    },
    profile: {
      personAName: "امیر",
      personBName: "ستایش",
      myNickname: "",
      partnerNickname: "",
      birthday: "",
      partnerBirthday: "",
      favoriteColor: "",
      favoriteThings: "",
      loveLanguage: "",
      coupleName: "دنیای کوچیک ما",
      startDate: "",
      anniversary: "",
      favoritePlace: "",
      favoriteSong: "",
      ourStory: "",
    },
    appearance: defaultAppearance(),
    moods: [],
    memories: [],
    photos: [],
    messages: [],
    events: [],
    tasks: [],
    journal: [],
    wishlist: [],
    bucket: [],
    letters: [],
    surprises: [],
    answers: [],
    countdowns: [],
    expenses: [],
    checkins: [],
    notes: [],
    habits: [],
    playlist: [],
    dates: [],
    story: [],
    games: {
      plays: 0,
      last: null,
      soloBest: { memoryMoves: 0, catchScore: 0 },
      duo: { tttMe: 0, tttPartner: 0, rpsMe: 0, rpsPartner: 0 },
      memory: null,
      ttt: null,
      rps: null,
      quiz: null,
    },
    kisses: { sent: 0, received: 0, last: null },
    compliments: [],
    capsules: [],
    pet: {
      type: "bunny",
      name: "نی‌نی",
      hunger: 70,
      love: 80,
      lastFed: "",
      lastPet: "",
    },
  };
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export class CoupleStore {
  constructor(storage) {
    this.storage = storage || globalThis.localStorage || memoryStorage();
    this.data = this.load();
  }

  load() {
    try {
      const raw = this.storage.getItem(STORE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const base = defaultState();
      return {
        ...base,
        ...parsed,
        auth: { ...base.auth, ...(parsed.auth || {}) },
        profile: { ...base.profile, ...(parsed.profile || {}) },
        appearance: { ...base.appearance, ...(parsed.appearance || {}) },
        games: {
          ...base.games,
          ...(parsed.games || {}),
          soloBest: { ...base.games.soloBest, ...((parsed.games && parsed.games.soloBest) || {}) },
          duo: { ...base.games.duo, ...((parsed.games && parsed.games.duo) || {}) },
        },
        kisses: { ...base.kisses, ...(parsed.kisses || {}) },
        pet: { ...base.pet, ...(parsed.pet || {}) },
      };
    } catch {
      return defaultState();
    }
  }

  persist() {
    this.storage.setItem(STORE_KEY, JSON.stringify(this.data));
    return this.data;
  }

  reset() {
    this.data = defaultState();
    this.persist();
    return this.data;
  }

  seedDemo() {
    const t = todayISO();
    const start = new Date();
    start.setDate(start.getDate() - 286);
    const startDate = start.toISOString().slice(0, 10);
    const ann = new Date();
    ann.setMonth(ann.getMonth() + 1);
    const annDate = ann.toISOString().slice(0, 10);
    this.data.profile.startDate = startDate;
    this.data.profile.anniversary = annDate;
    this.data.profile.ourStory =
      "داستان ما از یک پیام ساده شروع شد و کم‌کم شد دنیای کوچیک خودمون. اینجا هر خاطره، هر حال، هر نامه مال خودمونه.";
    this.data.profile.favoriteSong = "Perfect — Ed Sheeran";
    this.data.profile.favoritePlace = "کنار دریا، غروب";
    this.data.profile.loveLanguage = "وقت باکیفیت";
    this.data.memories = [
      {
        id: uid("mem"),
        title: "اولین قرار",
        description: "قهوه سرد شد ولی حرفامون تموم نشد.",
        date: startDate,
        location: "کافه کوچیک گوشه خیابان",
        favorite: true,
        createdAt: nowISO(),
      },
      {
        id: uid("mem"),
        title: "باران بی‌خبر",
        description: "چتر نداشتیم، خندیدیم تا خیس شدیم.",
        date: t,
        location: "پارک",
        favorite: false,
        createdAt: nowISO(),
      },
    ];
    this.data.tasks = [
      {
        id: uid("task"),
        title: "رزرو رستوران سالگرد",
        description: "همون میز کنار پنجره",
        dueDate: annDate,
        priority: "HIGH",
        assignedTo: "BOTH",
        status: "TODO",
        createdAt: nowISO(),
      },
    ];
    this.data.countdowns = [
      {
        id: uid("cd"),
        title: "سالگرد بعدی",
        targetDate: annDate,
        emoji: "💍",
        createdAt: nowISO(),
      },
    ];
    this.data.notes = [
      {
        id: uid("note"),
        text: "امروز خیلی قشنگ خندیدی.",
        color: "rose",
        author: "me",
        createdAt: nowISO(),
      },
    ];
    this.data.habits = [
      { id: uid("hab"), title: "دوستت دارم بگو", emoji: "💗", streak: 4, last: t, history: [t] },
      { id: uid("hab"), title: "یک بوس صبحگاهی", emoji: "😘", streak: 2, last: t, history: [t] },
    ];
    this.data.playlist = [
      { id: uid("song"), title: "Perfect", artist: "Ed Sheeran", note: "آهنگ ما" },
    ];
    this.data.wishlist = [
      {
        id: uid("wish"),
        title: "سفر شمال",
        description: "کلبه چوبی و باران",
        category: "سفر",
        privacy: "SHARED",
        isCompleted: false,
        createdAt: nowISO(),
      },
    ];
    this.data.bucket = [
      {
        id: uid("buck"),
        title: "دیدن شفق قطبی با هم",
        description: "",
        isCompleted: false,
        completedDate: "",
        createdAt: nowISO(),
      },
    ];
    this.persist();
    return this.data;
  }

  async setPin(pin) {
    if (!/^\d{4}$/.test(pin)) throw new Error("PIN must be 4 digits");
    this.data.auth.pinHash = await sha256(`coupleos:${pin}`);
    this.data.auth.lockSetup = true;
    this.persist();
    return true;
  }

  async verifyPin(pin) {
    if (!this.data.auth.pinHash) return false;
    const hash = await sha256(`coupleos:${pin}`);
    return hash === this.data.auth.pinHash;
  }

  enrollBiometric(secret, method = "local") {
    this.data.auth.biometricEnabled = true;
    this.data.auth.biometricSecret = secret;
    this.data.auth.biometricMethod = method;
    this.persist();
    return true;
  }

  disableBiometric() {
    this.data.auth.biometricEnabled = false;
    this.data.auth.biometricSecret = null;
    this.data.auth.biometricMethod = null;
    this.persist();
  }

  verifyBiometric(secret) {
    if (!this.data.auth.biometricEnabled) return false;
    if (!this.data.auth.biometricSecret) return false;
    return this.data.auth.biometricSecret === secret;
  }

  completeSetup({ role, demo = true, personAName, personBName }) {
    this.data.auth.paired = true;
    this.data.auth.demo = demo;
    this.data.auth.role = role || "PERSON_A";
    this.data.auth.userId = uid("user");
    this.data.auth.partnerId = uid("partner");
    if (personAName) this.data.profile.personAName = personAName;
    if (personBName) this.data.profile.personBName = personBName;
    this.persist();
    return this.data.auth;
  }

  myName() {
    return this.data.auth.role === "PERSON_B"
      ? this.data.profile.personBName
      : this.data.profile.personAName;
  }

  partnerName() {
    return this.data.auth.role === "PERSON_B"
      ? this.data.profile.personAName
      : this.data.profile.personBName;
  }

  daysTogether() {
    const s = this.data.profile.startDate;
    if (!s) return 0;
    const a = new Date(s + "T00:00:00");
    if (Number.isNaN(a.getTime())) return 0;
    const diff = Date.now() - a.getTime();
    return Math.max(0, Math.floor(diff / 86400000));
  }

  dailyQuestion(date = todayISO()) {
    const day = Math.floor(new Date(date + "T00:00:00").getTime() / 86400000);
    return DAILY_QUESTIONS[((day % DAILY_QUESTIONS.length) + DAILY_QUESTIONS.length) % DAILY_QUESTIONS.length];
  }

  add(collection, item) {
    if (!Array.isArray(this.data[collection])) throw new Error("unknown collection");
    const row = { id: item.id || uid(collection), createdAt: item.createdAt || nowISO(), ...item };
    this.data[collection].unshift(row);
    this.persist();
    return row;
  }

  update(collection, id, patch) {
    const list = this.data[collection];
    if (!Array.isArray(list)) throw new Error("unknown collection");
    const idx = list.findIndex((x) => x.id === id);
    if (idx < 0) return null;
    list[idx] = { ...list[idx], ...patch, updatedAt: nowISO() };
    this.persist();
    return list[idx];
  }

  remove(collection, id) {
    const list = this.data[collection];
    if (!Array.isArray(list)) throw new Error("unknown collection");
    const before = list.length;
    this.data[collection] = list.filter((x) => x.id !== id);
    this.persist();
    return before !== this.data[collection].length;
  }

  list(collection) {
    return Array.isArray(this.data[collection]) ? this.data[collection] : [];
  }

  todayMood(user = "me") {
    const t = todayISO();
    return this.data.moods.find((m) => m.date === t && m.user === user) || null;
  }

  saveMood(mood) {
    const t = todayISO();
    const existing = this.data.moods.find((m) => m.date === t && m.user === (mood.user || "me"));
    if (existing) {
      Object.assign(existing, mood, { date: t });
    } else {
      this.data.moods.unshift({ id: uid("mood"), date: t, user: "me", createdAt: nowISO(), ...mood });
    }
    this.persist();
    return this.todayMood(mood.user || "me");
  }

  partnerNeedsAttention() {
    const m = this.todayMood("partner");
    return !!(m && SAD_MOODS.has(m.mood));
  }

  search(query) {
    const q = (query || "").trim().toLowerCase();
    if (q.length < 2) return [];
    const hits = [];
    const push = (type, title, extra, id, route) => {
      hits.push({ type, title, extra, id, route });
    };
    for (const m of this.data.memories) {
      if (`${m.title} ${m.description} ${m.location}`.toLowerCase().includes(q)) {
        push("خاطره", m.title, m.description, m.id, "memories");
      }
    }
    for (const msg of this.data.messages) {
      if (`${msg.content}`.toLowerCase().includes(q)) {
        push("چت", msg.content.slice(0, 60), "", msg.id, "chat");
      }
    }
    for (const j of this.data.journal) {
      if (`${j.title} ${j.content}`.toLowerCase().includes(q)) {
        push("دفتر", j.title, j.content.slice(0, 60), j.id, "journal");
      }
    }
    for (const t of this.data.tasks) {
      if (`${t.title} ${t.description}`.toLowerCase().includes(q)) {
        push("کار", t.title, t.description, t.id, "tasks");
      }
    }
    for (const e of this.data.events) {
      if (`${e.title} ${e.description}`.toLowerCase().includes(q)) {
        push("تقویم", e.title, e.date, e.id, "calendar");
      }
    }
    for (const n of this.data.notes) {
      if (`${n.text}`.toLowerCase().includes(q)) {
        push("یادداشت عشق", n.text, "", n.id, "notes");
      }
    }
    for (const w of this.data.wishlist) {
      if (`${w.title} ${w.description}`.toLowerCase().includes(q)) {
        push("آرزو", w.title, w.description, w.id, "wishlist");
      }
    }
    for (const l of this.data.letters) {
      if (`${l.title} ${l.content}`.toLowerCase().includes(q)) {
        push("نامه", l.title, "", l.id, "letters");
      }
    }
    return hits.slice(0, 40);
  }

  expenseTotal() {
    return this.data.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  }

  letterIsLocked(letter, date = todayISO()) {
    if (!letter.openOnDate || letter.isOpened) return false;
    return letter.openOnDate > date;
  }

  openLetter(id, date = todayISO()) {
    const letter = this.data.letters.find((l) => l.id === id);
    if (!letter) return { ok: false, error: "نامه پیدا نشد" };
    if (this.letterIsLocked(letter, date)) {
      return { ok: false, error: `تا ${letter.openOnDate} قفل است` };
    }
    letter.isOpened = true;
    this.persist();
    return { ok: true, letter };
  }

  tickHabit(id, date = todayISO()) {
    const h = this.data.habits.find((x) => x.id === id);
    if (!h) return null;
    h.history = h.history || [];
    if (h.last === date) {
      h.history = h.history.filter((d) => d !== date);
      h.last = h.history[h.history.length - 1] || "";
      h.streak = Math.max(0, (h.streak || 0) - 1);
    } else {
      h.history.push(date);
      const y = new Date(date + "T00:00:00");
      y.setDate(y.getDate() - 1);
      const yiso = y.toISOString().slice(0, 10);
      h.streak = h.last === yiso ? (h.streak || 0) + 1 : 1;
      h.last = date;
    }
    this.persist();
    return h;
  }

  loveScore() {
    const t = todayISO();
    let score = 42;
    if (this.todayMood("me")) score += 8;
    if (this.todayMood("partner")) score += 8;
    score += Math.min(12, this.data.messages.filter((m) => (m.createdAt || "").startsWith(t)).length * 2);
    score += Math.min(10, this.data.memories.length);
    score += Math.min(10, this.data.notes.length * 2);
    const habitToday = this.data.habits.filter((h) => h.last === t).length;
    score += Math.min(12, habitToday * 4);
    if (this.data.checkins[0]) score += Math.round((this.data.checkins[0].average || 0) * 2);
    score += Math.min(8, Math.floor((this.data.kisses?.sent || 0) / 3));
    if (this.data.pet) score += Math.min(6, Math.floor((this.data.pet.love || 0) / 20));
    return Math.max(0, Math.min(100, score));
  }

  nextCountdown(date = todayISO()) {
    const upcoming = this.data.countdowns
      .map((c) => ({ ...c, days: daysBetween(date, c.targetDate) }))
      .filter((c) => Number.isFinite(c.days))
      .sort((a, b) => a.days - b.days);
    return upcoming[0] || null;
  }

  setAppearance(patch) {
    this.data.appearance = { ...this.data.appearance, ...patch };
    if (patch.theme && THEMES[patch.theme] && !patch.accent) {
      this.data.appearance.accent = THEMES[patch.theme].accent;
    }
    this.persist();
    return this.data.appearance;
  }

  updateProfile(patch) {
    this.data.profile = { ...this.data.profile, ...patch };
    this.persist();
    return this.data.profile;
  }

  refreshSnapshot() {
    return {
      at: nowISO(),
      counts: {
        memories: this.data.memories.length,
        messages: this.data.messages.length,
        tasks: this.data.tasks.length,
        photos: this.data.photos.length,
        notes: this.data.notes.length,
      },
      loveScore: this.loveScore(),
      daysTogether: this.daysTogether(),
    };
  }

  sendMessage(content, extra = {}) {
    const text = String(content || "").trim();
    if (!text) return null;
    return this.add("messages", {
      content: text,
      sender: extra.sender || "me",
      type: extra.type || "TEXT",
      reactions: extra.reactions || "",
    });
  }

  sendKiss() {
    this.data.kisses = this.data.kisses || { sent: 0, received: 0, last: null };
    this.data.kisses.sent = (this.data.kisses.sent || 0) + 1;
    this.data.kisses.last = nowISO();
    this.persist();
    return this.data.kisses;
  }

  receiveKiss() {
    this.data.kisses = this.data.kisses || { sent: 0, received: 0, last: null };
    this.data.kisses.received = (this.data.kisses.received || 0) + 1;
    this.data.kisses.last = nowISO();
    this.persist();
    return this.data.kisses;
  }

  dailyFortune(date = todayISO()) {
    const day = Math.floor(new Date(date + "T00:00:00").getTime() / 86400000);
    return FORTUNES[((day % FORTUNES.length) + FORTUNES.length) % FORTUNES.length];
  }

  drawCompliment() {
    const custom = this.data.compliments || [];
    const pool = [...COMPLIMENTS, ...custom.map((c) => c.text)];
    return pool[Math.floor(Math.random() * pool.length)] || COMPLIMENTS[0];
  }

  feedPet() {
    const p = this.data.pet || defaultState().pet;
    p.hunger = Math.min(100, (p.hunger || 50) + 18);
    p.love = Math.min(100, (p.love || 50) + 6);
    p.lastFed = todayISO();
    this.data.pet = p;
    this.persist();
    return p;
  }

  petPet() {
    const p = this.data.pet || defaultState().pet;
    p.love = Math.min(100, (p.love || 50) + 10);
    p.lastPet = todayISO();
    this.data.pet = p;
    this.persist();
    return p;
  }

  setPet(patch) {
    this.data.pet = { ...(this.data.pet || defaultState().pet), ...patch };
    this.persist();
    return this.data.pet;
  }

  petMood() {
    const p = this.data.pet || defaultState().pet;
    const score = ((p.hunger || 0) + (p.love || 0)) / 2;
    if (score >= 80) return { emoji: "🥰", label: "عاشق و سیر" };
    if (score >= 55) return { emoji: "😊", label: "خوشحال" };
    if (score >= 35) return { emoji: "🥺", label: "یه کم دلتنگ" };
    return { emoji: "😢", label: "گرسنه و غمگین" };
  }

  bumpPlays() {
    this.data.games.plays = (this.data.games.plays || 0) + 1;
    this.data.games.last = nowISO();
    this.persist();
  }

  startMemory() {
    const cards = shuffle([...MEMORY_EMOJIS, ...MEMORY_EMOJIS]).map((emoji, i) => ({
      id: i,
      emoji,
      flipped: false,
      matched: false,
    }));
    this.data.games.memory = { cards, first: null, moves: 0, matched: 0, won: false, lock: false };
    this.persist();
    return this.data.games.memory;
  }

  flipMemory(index) {
    const g = this.data.games.memory;
    if (!g || g.won || g.lock) return g;
    const card = g.cards[index];
    if (!card || card.flipped || card.matched) return g;
    card.flipped = true;
    if (g.first == null) {
      g.first = index;
      this.persist();
      return g;
    }
    g.moves += 1;
    const a = g.cards[g.first];
    if (a.emoji === card.emoji && g.first !== index) {
      a.matched = true;
      card.matched = true;
      g.matched += 1;
      g.first = null;
      if (g.matched >= MEMORY_EMOJIS.length) {
        g.won = true;
        const best = this.data.games.soloBest.memoryMoves || 0;
        if (!best || g.moves < best) this.data.games.soloBest.memoryMoves = g.moves;
        this.bumpPlays();
      }
      this.persist();
      return g;
    }
    g.lock = true;
    this.persist();
    return g;
  }

  memoryUnflip() {
    const g = this.data.games.memory;
    if (!g) return g;
    g.cards.forEach((c) => {
      if (!c.matched) c.flipped = false;
    });
    g.first = null;
    g.lock = false;
    this.persist();
    return g;
  }

  saveCatchScore(score) {
    const best = this.data.games.soloBest.catchScore || 0;
    if (score > best) this.data.games.soloBest.catchScore = score;
    this.bumpPlays();
    this.persist();
    return this.data.games.soloBest.catchScore;
  }

  startTtt(mode = "hotseat") {
    this.data.games.ttt = {
      board: ["", "", "", "", "", "", "", "", ""],
      turn: "me",
      mode,
      winner: null,
    };
    this.persist();
    return this.data.games.ttt;
  }

  playTtt(index, as = null) {
    const g = this.data.games.ttt;
    if (!g || g.winner) return g;
    if (g.board[index]) return g;
    const mark = as || g.turn;
    if (g.mode !== "hotseat" && mark !== g.turn) return g;
    g.board[index] = mark;
    g.winner = tttWinner(g.board);
    if (g.winner === "me") this.data.games.duo.tttMe += 1;
    if (g.winner === "partner") this.data.games.duo.tttPartner += 1;
    if (!g.winner) {
      g.turn = g.turn === "me" ? "partner" : "me";
      if (g.mode === "cpu" && g.turn === "partner") {
        const empty = g.board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
        const pick = empty[Math.floor(Math.random() * empty.length)];
        if (pick != null) {
          g.board[pick] = "partner";
          g.winner = tttWinner(g.board);
          if (g.winner === "partner") this.data.games.duo.tttPartner += 1;
          if (!g.winner) g.turn = "me";
        }
      }
    }
    if (g.winner) this.bumpPlays();
    else this.persist();
    return g;
  }

  startRps() {
    this.data.games.rps = { me: null, partner: null, result: null };
    this.persist();
    return this.data.games.rps;
  }

  lockRps(who, choice) {
    const g = this.data.games.rps || this.startRps();
    if (g.result) return g;
    if (who === "partner") g.partner = choice;
    else g.me = choice;
    if (g.me && g.partner) {
      const r = rpsBeats(g.me, g.partner);
      g.result = r === 0 ? "draw" : r > 0 ? "me" : "partner";
      if (g.result === "me") this.data.games.duo.rpsMe += 1;
      if (g.result === "partner") this.data.games.duo.rpsPartner += 1;
      this.bumpPlays();
    } else {
      this.persist();
    }
    return g;
  }

  startQuiz() {
    this.data.games.quiz = { index: 0, my: null, partner: null, revealed: false, matches: 0 };
    this.persist();
    return this.data.games.quiz;
  }

  answerQuiz(who, option) {
    const g = this.data.games.quiz || this.startQuiz();
    if (g.revealed) return g;
    if (who === "partner") g.partner = option;
    else g.my = option;
    if (g.my != null && g.partner != null) {
      g.revealed = true;
      if (g.my === g.partner) g.matches += 1;
    }
    this.persist();
    return g;
  }

  nextQuiz() {
    const g = this.data.games.quiz;
    if (!g) return this.startQuiz();
    g.index = (g.index + 1) % KNOW_ME.length;
    g.my = null;
    g.partner = null;
    g.revealed = false;
    this.bumpPlays();
    return g;
  }

  exportPlayCode() {
    const payload = {
      ttt: this.data.games.ttt,
      rps: this.data.games.rps,
      quiz: this.data.games.quiz,
      duo: this.data.games.duo,
    };
    try {
      return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    } catch {
      return "";
    }
  }

  importPlayCode(code) {
    try {
      const raw = String(code || "").trim();
      if (!raw) return { ok: false, error: "کد خالی است" };
      const payload = JSON.parse(decodeURIComponent(escape(atob(raw))));
      if (payload.ttt) this.data.games.ttt = payload.ttt;
      if (payload.rps) this.data.games.rps = payload.rps;
      if (payload.quiz) this.data.games.quiz = payload.quiz;
      if (payload.duo) this.data.games.duo = { ...this.data.games.duo, ...payload.duo };
      this.persist();
      return { ok: true };
    } catch {
      return { ok: false, error: "کد بازی نامعتبر است" };
    }
  }

  aiReply(prompt) {
    const p = (prompt || "").trim();
    if (!p) return "یک پیام بنویس تا کمکت کنم ❤️";
    if (/کادو|هدیه|سورپرایز/.test(p)) {
      const wish = this.data.wishlist.find((w) => !w.isCompleted);
      return wish
        ? `از روی لیست آرزوها: «${wish.title}» هنوز مونده — می‌تونی همون رو سورپرایز کنی. یا یک آلبوم عکس از خاطرات + نامه زمان‌دار.`
        : "پیشنهاد: یک آلبوم عکس دست‌ساز از خاطراتتون + یک نامه زمان‌دار برای سالگرد.";
    }
    if (/نامه|عاشقانه/.test(p)) {
      return `عزیزترینم ${this.partnerName()}، هر روز با تو دنیای کوچیکمون قشنگ‌تر میشه. ممنونم که هستی. — می‌تونی همین متن رو توی نامه‌ها بفرستی.`;
    }
    if (/قرار|دیت|ایده/.test(p)) {
      const idea = DATE_IDEAS[Math.floor(Math.random() * DATE_IDEAS.length)];
      return `${idea.emoji} ${idea.title}: ${idea.desc}`;
    }
    if (/حال|مود|ناراحت/.test(p)) {
      const m = this.todayMood("partner") || this.todayMood("me");
      return m
        ? `امروز حال ثبت‌شده «${m.mood}» است. یک پیام مهربون یا یک یادداشت روی یخچال عشق بذار.`
        : "اول حالتون رو ثبت کنید، بعد با یک کار کوچیک مهربون روز رو عوض کنید.";
    }
    const score = this.loveScore();
    return `متر عشقتون الان ${score} از ۱۰۰ است 💗 امروز یک خاطره ثبت کن، حال پارتنر رو بپرس و یک سؤال روزانه جواب بده.`;
  }
}

export function daysBetween(fromISO, toISO) {
  const a = new Date(fromISO + "T00:00:00");
  const b = new Date(toISO + "T00:00:00");
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return NaN;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function moodEmoji(value) {
  return MOODS.find((m) => m.value === value)?.emoji || "🤔";
}
