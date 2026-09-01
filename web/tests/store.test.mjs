import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CoupleStore,
  memoryStorage,
  sha256,
  daysBetween,
  moodEmoji,
  todayISO,
  rpsBeats,
  tttWinner,
  STORE_KEY,
} from "../js/store.js";

function fresh() {
  return new CoupleStore(memoryStorage());
}

test("PIN hash and verify", async () => {
  const s = fresh();
  await s.setPin("2580");
  assert.equal(s.data.auth.lockSetup, true);
  assert.equal(await s.verifyPin("2580"), true);
  assert.equal(await s.verifyPin("0000"), false);
  const h = await sha256("coupleos:2580");
  assert.equal(s.data.auth.pinHash, h);
});

test("rejects non-4-digit PIN", async () => {
  const s = fresh();
  await assert.rejects(() => s.setPin("12"));
});

test("setup names and roles", () => {
  const s = fresh();
  s.completeSetup({ role: "PERSON_B", personAName: "علی", personBName: "نیکا" });
  assert.equal(s.myName(), "نیکا");
  assert.equal(s.partnerName(), "علی");
  assert.equal(s.data.auth.paired, true);
});

test("biometric enroll and verify", () => {
  const s = fresh();
  s.enrollBiometric("secret-finger", "local");
  assert.equal(s.data.auth.biometricEnabled, true);
  assert.equal(s.verifyBiometric("secret-finger"), true);
  assert.equal(s.verifyBiometric("wrong"), false);
  s.disableBiometric();
  assert.equal(s.data.auth.biometricEnabled, false);
  assert.equal(s.verifyBiometric("secret-finger"), false);
});

test("mood save and partner attention", () => {
  const s = fresh();
  s.saveMood({ mood: "خوب", user: "me", energy: 7 });
  assert.equal(s.todayMood("me").mood, "خوب");
  s.saveMood({ mood: "ناراحت", user: "partner" });
  assert.equal(s.partnerNeedsAttention(), true);
  s.saveMood({ mood: "عاشق", user: "partner" });
  assert.equal(s.partnerNeedsAttention(), false);
});

test("CRUD collections persist", () => {
  const mem = memoryStorage();
  const s = new CoupleStore(mem);
  const row = s.add("tasks", { title: "گل بخر", status: "TODO", priority: "HIGH" });
  assert.equal(s.list("tasks")[0].title, "گل بخر");
  s.update("tasks", row.id, { status: "DONE" });
  assert.equal(s.list("tasks")[0].status, "DONE");
  assert.equal(s.remove("tasks", row.id), true);
  assert.equal(s.list("tasks").length, 0);
  const s2 = new CoupleStore(mem);
  assert.equal(s2.list("tasks").length, 0);
});

test("chat send ignores blank", () => {
  const s = fresh();
  assert.equal(s.sendMessage("   "), null);
  const m = s.sendMessage("دوستت دارم");
  assert.equal(m.content, "دوستت دارم");
  assert.equal(s.list("messages").length, 1);
});

test("search across collections", () => {
  const s = fresh();
  s.add("memories", { title: "سفر شمال", description: "باران و چای", location: "رشت" });
  s.sendMessage("یادت هست شمال؟");
  s.add("journal", { title: "دلتنگی", content: "دلم برای دریا تنگ شده" });
  const hits = s.search("شمال");
  assert.ok(hits.length >= 2);
  assert.ok(hits.some((h) => h.type === "خاطره"));
  assert.equal(s.search("x").length, 0);
});

test("letters lock by date", () => {
  const s = fresh();
  const letter = s.add("letters", {
    title: "سالگرد",
    content: "سورپرایز",
    openOnDate: "2099-01-01",
    isOpened: false,
  });
  assert.equal(s.letterIsLocked(letter, "2026-09-01"), true);
  const blocked = s.openLetter(letter.id, "2026-09-01");
  assert.equal(blocked.ok, false);
  const opened = s.openLetter(letter.id, "2099-01-01");
  assert.equal(opened.ok, true);
  assert.equal(s.letterIsLocked(opened.letter, "2026-09-01"), false);
});

test("expenses total", () => {
  const s = fresh();
  s.add("expenses", { amount: 15000, category: "غذا" });
  s.add("expenses", { amount: 5000, category: "گل" });
  assert.equal(s.expenseTotal(), 20000);
});

test("habit streak ticks", () => {
  const s = fresh();
  const h = s.add("habits", { title: "بوس", streak: 0, last: "", history: [] });
  const t = todayISO();
  s.tickHabit(h.id, t);
  assert.equal(s.list("habits")[0].streak, 1);
  s.tickHabit(h.id, t);
  assert.equal(s.list("habits")[0].streak, 0);
});

test("days between and countdown", () => {
  assert.equal(daysBetween("2026-09-01", "2026-09-11"), 10);
  const s = fresh();
  s.add("countdowns", { title: "سالگرد", targetDate: "2099-01-01", emoji: "💍" });
  const n = s.nextCountdown("2026-09-01");
  assert.equal(n.title, "سالگرد");
  assert.ok(n.days > 0);
});

test("love score is bounded", () => {
  const s = fresh();
  const score = s.loveScore();
  assert.ok(score >= 0 && score <= 100);
  s.seedDemo();
  const after = s.loveScore();
  assert.ok(after >= score);
});

test("appearance themes apply", () => {
  const s = fresh();
  s.setAppearance({ theme: "ocean" });
  assert.equal(s.data.appearance.theme, "ocean");
  assert.equal(s.data.appearance.accent, "#7fd4ff");
});

test("AI replies are contextual", () => {
  const s = fresh();
  s.completeSetup({ role: "PERSON_A", personAName: "امیر", personBName: "ستایش" });
  assert.match(s.aiReply("کادو چی بخرم"), /آلبوم|آرزو|سورپرایز/);
  assert.match(s.aiReply("یک نامه عاشقانه"), /ستایش|عزیز/);
  assert.match(s.aiReply(""), /پیام/);
});

test("refresh snapshot counts", () => {
  const s = fresh();
  s.sendMessage("hi");
  const snap = s.refreshSnapshot();
  assert.equal(snap.counts.messages, 1);
  assert.ok(snap.at);
});

test("mood emoji map", () => {
  assert.equal(moodEmoji("عاشق"), "🥰");
  assert.equal(moodEmoji("unknown"), "🤔");
});

test("demo seed fills features", () => {
  const s = fresh();
  s.seedDemo();
  assert.ok(s.list("memories").length >= 1);
  assert.ok(s.list("habits").length >= 1);
  assert.ok(s.daysTogether() > 0);
});

test("kisses increment", () => {
  const s = fresh();
  s.sendKiss();
  s.sendKiss();
  s.receiveKiss();
  assert.equal(s.data.kisses.sent, 2);
  assert.equal(s.data.kisses.received, 1);
});

test("pet feed and mood", () => {
  const s = fresh();
  s.setPet({ type: "panda", name: "پو", hunger: 40, love: 40 });
  s.feedPet();
  assert.ok(s.data.pet.hunger > 40);
  s.petPet();
  assert.ok(s.data.pet.love > 40);
  assert.ok(s.petMood().label);
});

test("fortune and compliment jar", () => {
  const s = fresh();
  const f = s.dailyFortune("2026-09-01");
  const f2 = s.dailyFortune("2026-09-01");
  assert.equal(f.text, f2.text);
  s.add("compliments", { text: "قهرمان منی" });
  const drawn = s.drawCompliment();
  assert.ok(typeof drawn === "string" && drawn.length > 0);
});

test("candy theme exists", () => {
  const s = fresh();
  s.setAppearance({ theme: "candy" });
  assert.equal(s.data.appearance.theme, "candy");
  assert.equal(s.data.appearance.accent, "#ff9ec8");
});

test("memory hearts match a cute pair", () => {
  const s = fresh();
  const g = s.startMemory();
  assert.equal(g.cards.length, 16);
  const emoji = g.cards[0].emoji;
  const i2 = g.cards.findIndex((c, i) => i !== 0 && c.emoji === emoji);
  s.flipMemory(0);
  s.flipMemory(i2);
  assert.equal(s.data.games.memory.matched, 1);
  assert.equal(s.data.games.memory.cards[0].matched, true);
  assert.equal(s.data.games.memory.cards[i2].matched, true);
});

test("tic-tac-toe hearts win and persist score", () => {
  const s = fresh();
  s.startTtt("hotseat");
  s.playTtt(0);
  s.playTtt(3);
  s.playTtt(1);
  s.playTtt(4);
  s.playTtt(2);
  assert.equal(s.data.games.ttt.winner, "me");
  assert.equal(s.data.games.duo.tttMe, 1);
  assert.equal(tttWinner(["me", "me", "me", "partner", "partner", "", "", "", ""]), "me");
  assert.equal(tttWinner(["me", "partner", "me", "me", "partner", "partner", "partner", "me", "me"]), "draw");
});

test("flower teddy bow rps", () => {
  assert.equal(rpsBeats("flower", "teddy"), 1);
  assert.equal(rpsBeats("teddy", "bow"), 1);
  assert.equal(rpsBeats("bow", "flower"), 1);
  assert.equal(rpsBeats("flower", "flower"), 0);
  const s = fresh();
  s.startRps();
  s.lockRps("me", "flower");
  assert.equal(s.data.games.rps.result, null);
  s.lockRps("partner", "teddy");
  assert.equal(s.data.games.rps.result, "me");
  assert.equal(s.data.games.duo.rpsMe, 1);
  s.lockRps("me", "bow");
  assert.equal(s.data.games.rps.result, "me");
});

test("know-me quiz and room code roundtrip", () => {
  const s = fresh();
  s.startQuiz();
  s.answerQuiz("me", 1);
  s.answerQuiz("partner", 1);
  assert.equal(s.data.games.quiz.revealed, true);
  assert.equal(s.data.games.quiz.matches, 1);
  const code = s.exportPlayCode();
  assert.ok(code.length > 8);
  const s2 = fresh();
  assert.equal(s2.importPlayCode(code).ok, true);
  assert.equal(s2.data.games.quiz.matches, 1);
  assert.equal(s2.importPlayCode("!!!").ok, false);
  assert.equal(s2.importPlayCode("").ok, false);
});

test("heart catch keeps best score", () => {
  const s = fresh();
  s.saveCatchScore(4);
  s.saveCatchScore(9);
  s.saveCatchScore(3);
  assert.equal(s.data.games.soloBest.catchScore, 9);
  assert.ok(s.data.games.plays >= 3);
});

test("old games payload merges nested scores", () => {
  const mem = memoryStorage();
  mem.setItem(STORE_KEY, JSON.stringify({ games: { plays: 3 } }));
  const s = new CoupleStore(mem);
  assert.equal(s.data.games.plays, 3);
  assert.equal(s.data.games.soloBest.catchScore, 0);
  assert.equal(s.data.games.duo.tttMe, 0);
});
