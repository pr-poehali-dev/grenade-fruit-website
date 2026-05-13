import { useState } from "react";
import Icon from "@/components/ui/icon";

// ─── Types ───────────────────────────────────────────────
type Role = "teacher" | "parent";
type Section = "schedule" | "homework" | "grades" | "files" | "recommendations";

interface Notification {
  id: number;
  text: string;
  time: string;
  read: boolean;
  type: "grade" | "homework" | "recommendation" | "file";
}

interface Grade {
  id: number;
  subject: string;
  grade: number;
  date: string;
  comment: string;
  student: string;
}

interface Homework {
  id: number;
  subject: string;
  task: string;
  dueDate: string;
  files?: string[];
}

interface ScheduleItem {
  time: string;
  subject: string;
  teacher: string;
  room: string;
}

interface FileItem {
  id: number;
  name: string;
  subject: string;
  uploadedBy: string;
  date: string;
  size: string;
}

interface Recommendation {
  id: number;
  teacher: string;
  subject: string;
  text: string;
  date: string;
  student: string;
}

// ─── Mock Data ───────────────────────────────────────────
const TEACHERS_PASSWORD = "teacher2024";
const PARENTS: Record<string, { password: string; child: string }> = {
  parent1: { password: "parent1pass", child: "Алёша Петров" },
  parent2: { password: "parent2pass", child: "Маша Иванова" },
};

const SCHEDULE: Record<string, ScheduleItem[]> = {
  "Понедельник": [
    { time: "08:00–08:45", subject: "Математика", teacher: "Анна Сергеевна", room: "305" },
    { time: "09:00–09:45", subject: "Русский язык", teacher: "Ольга Петровна", room: "201" },
    { time: "10:00–10:45", subject: "История", teacher: "Михаил Иванович", room: "108" },
    { time: "11:00–11:45", subject: "Физкультура", teacher: "Сергей Николаевич", room: "Спортзал" },
    { time: "12:00–12:45", subject: "Биология", teacher: "Наталья Дмитриевна", room: "404" },
  ],
  "Вторник": [
    { time: "08:00–08:45", subject: "Физика", teacher: "Пётр Александрович", room: "302" },
    { time: "09:00–09:45", subject: "Математика", teacher: "Анна Сергеевна", room: "305" },
    { time: "10:00–10:45", subject: "Литература", teacher: "Ольга Петровна", room: "201" },
    { time: "11:00–11:45", subject: "Химия", teacher: "Наталья Дмитриевна", room: "402" },
  ],
  "Среда": [
    { time: "08:00–08:45", subject: "Математика", teacher: "Анна Сергеевна", room: "305" },
    { time: "09:00–09:45", subject: "Английский язык", teacher: "Ирина Владимировна", room: "112" },
    { time: "10:00–10:45", subject: "История", teacher: "Михаил Иванович", room: "108" },
  ],
};

const HOMEWORK: Homework[] = [
  { id: 1, subject: "Математика", task: "§12, упр. 345–350. Решить задачи на стр. 87 №4,5,6", dueDate: "14 мая", files: [] },
  { id: 2, subject: "Русский язык", task: "Написать сочинение-рассуждение «Что такое дружба» (150–200 слов)", dueDate: "15 мая", files: ["план_сочинения.pdf"] },
  { id: 3, subject: "История", task: "Прочитать §18–19, ответить на вопросы в конце параграфа", dueDate: "15 мая", files: [] },
  { id: 4, subject: "Биология", task: "Нарисовать схему строения клетки и подписать все органоиды", dueDate: "16 мая", files: ["схема_клетки.jpg"] },
];

const GRADES: Grade[] = [
  { id: 1, subject: "Математика", grade: 5, date: "12 мая", comment: "Отлично решил контрольную работу!", student: "Алёша Петров" },
  { id: 2, subject: "Русский язык", grade: 4, date: "11 мая", comment: "Хорошая работа, но есть ошибки в пунктуации", student: "Алёша Петров" },
  { id: 3, subject: "История", grade: 3, date: "10 мая", comment: "Нужно повторить материал по теме", student: "Маша Иванова" },
  { id: 4, subject: "Биология", grade: 5, date: "9 мая", comment: "Прекрасный доклад!", student: "Маша Иванова" },
  { id: 5, subject: "Физика", grade: 4, date: "8 мая", comment: "Хорошее понимание темы", student: "Алёша Петров" },
];

const FILES: FileItem[] = [
  { id: 1, name: "Контрольная_математика_май.pdf", subject: "Математика", uploadedBy: "Анна Сергеевна", date: "12 мая", size: "245 КБ" },
  { id: 2, name: "Правила_пунктуации.docx", subject: "Русский язык", uploadedBy: "Ольга Петровна", date: "10 мая", size: "112 КБ" },
  { id: 3, name: "Презентация_история_WW2.pptx", subject: "История", uploadedBy: "Михаил Иванович", date: "8 мая", size: "3.2 МБ" },
  { id: 4, name: "Задачи_олимпиада_2024.pdf", subject: "Математика", uploadedBy: "Анна Сергеевна", date: "5 мая", size: "890 КБ" },
];

const RECOMMENDATIONS: Recommendation[] = [
  { id: 1, teacher: "Анна Сергеевна", subject: "Математика", text: "Алёша отлично справляется с алгеброй. Рекомендую записать в математический кружок — там подготовка к олимпиаде. Нужно подтянуть геометрию, уделите 20 минут в день.", date: "12 мая", student: "Алёша Петров" },
  { id: 2, teacher: "Ольга Петровна", subject: "Русский язык", text: "Прошу обратить внимание на орфографию. Советую читать вслух по 15–20 минут ежедневно — это помогает усвоить правила интуитивно. Отличное сочинение на прошлой неделе!", date: "11 мая", student: "Алёша Петров" },
  { id: 3, teacher: "Наталья Дмитриевна", subject: "Биология", text: "Маша показала прекрасные знания. Рекомендую биологический клуб. Небольшие трудности с систематикой — можно использовать карточки для запоминания.", date: "9 мая", student: "Маша Иванова" },
];

const INIT_NOTIFS: Notification[] = [
  { id: 1, text: "Новая отметка по математике: 5 ⭐", time: "Сегодня, 12:30", read: false, type: "grade" },
  { id: 2, text: "Добавлено домашнее задание по биологии", time: "Сегодня, 11:15", read: false, type: "homework" },
  { id: 3, text: "Новая рекомендация от Ольги Петровны", time: "Вчера, 16:40", read: true, type: "recommendation" },
  { id: 4, text: "Загружен файл: Правила_пунктуации.docx", time: "Вчера, 10:20", read: true, type: "file" },
];

// ─── Floating seeds ───────────────────────────────────────
const SEEDS = [
  { top: "10%", left: "2%", size: 12, delay: "0s", opacity: 0.45 },
  { top: "18%", right: "4%", size: 8, delay: "1.2s", opacity: 0.35 },
  { top: "45%", left: "1%", size: 10, delay: "2.1s", opacity: 0.3 },
  { top: "65%", right: "2%", size: 14, delay: "0.6s", opacity: 0.4 },
  { top: "82%", left: "3%", size: 9, delay: "1.7s", opacity: 0.3 },
];

function Seed({ top, left, right, size, delay, opacity }: { top?: string; left?: string; right?: string; size: number; delay: string; opacity: number }) {
  return (
    <div className="pointer-events-none fixed animate-float"
      style={{ top, left, right, width: size, height: size, animationDelay: delay, opacity, zIndex: 1 }}>
      <div style={{
        width: size, height: size, borderRadius: "50% 50% 50% 20%",
        background: "radial-gradient(circle at 30% 30%, #D4A843, #8B1A2F)",
        transform: "rotate(-30deg)",
      }} />
    </div>
  );
}

// ─── Grade Badge ─────────────────────────────────────────
function GradeBadge({ grade }: { grade: number }) {
  return (
    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl font-bold grade-${grade} shrink-0`}
      style={{ fontFamily: "Cormorant, serif" }}>
      {grade}
    </div>
  );
}

// ─── NAV ─────────────────────────────────────────────────
const NAV: { id: Section; label: string; emoji: string }[] = [
  { id: "schedule", label: "Расписание", emoji: "📅" },
  { id: "homework", label: "Домашние задания", emoji: "📚" },
  { id: "grades", label: "Отметки", emoji: "⭐" },
  { id: "files", label: "Файлы", emoji: "📎" },
  { id: "recommendations", label: "Рекомендации", emoji: "💬" },
];

const NOTIF_EMOJI: Record<string, string> = { grade: "⭐", homework: "📚", recommendation: "💬", file: "📎" };

// ─── Login ────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (role: Role, name: string, child?: string) => void }) {
  const [tab, setTab] = useState<Role>("parent");
  const [loginVal, setLoginVal] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const tryLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (tab === "teacher") {
      if (pass === TEACHERS_PASSWORD) { onLogin("teacher", loginVal || "Учитель"); return; }
    } else {
      const p = PARENTS[loginVal];
      if (p && p.password === pass) { onLogin("parent", loginVal, p.child); return; }
    }
    setError("Неверный логин или пароль");
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div className="min-h-screen login-bg flex items-center justify-center p-4 relative overflow-hidden">
      {SEEDS.map((s, i) => <Seed key={i} {...s} />)}

      <div className="absolute right-0 bottom-0 w-80 h-80 opacity-[0.07] pointer-events-none rounded-full overflow-hidden">
        <img src="https://cdn.poehali.dev/projects/216115a8-6f23-4b25-a72a-91c740414743/files/e2a1af37-06ef-4ec7-a9e7-6f0549e28cfc.jpg" className="w-full h-full object-cover" alt="" />
      </div>
      <div className="absolute -left-12 top-0 w-56 h-56 opacity-[0.05] pointer-events-none rounded-full overflow-hidden">
        <img src="https://cdn.poehali.dev/projects/216115a8-6f23-4b25-a72a-91c740414743/files/e2a1af37-06ef-4ec7-a9e7-6f0549e28cfc.jpg" className="w-full h-full object-cover" alt="" />
      </div>

      <div className={`w-full max-w-sm animate-slide-up ${shake ? "animate-wiggle" : ""}`} style={{ position: "relative", zIndex: 10 }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 animate-pulse-glow"
            style={{ background: "linear-gradient(135deg, #5C0F1E, #8B1A2F)" }}>
            <span className="text-4xl">🍎</span>
          </div>
          <h1 style={{ color: "#5C0F1E", fontFamily: "Cormorant, serif", fontSize: 46, fontStyle: "italic", fontWeight: 700, lineHeight: 1 }}>
            Гранатовый
          </h1>
          <h2 style={{ color: "#8B1A2F", fontFamily: "Cormorant, serif", fontSize: 32, fontWeight: 600, lineHeight: 1.2 }}>
            Дневник
          </h2>
          <p className="text-sm mt-2" style={{ color: "#9B6A7A" }}>Электронный школьный журнал</p>
        </div>

        <div className="rounded-3xl p-7 shadow-2xl" style={{ background: "white", border: "1.5px solid rgba(139,26,47,0.1)" }}>
          <div className="flex rounded-2xl p-1 mb-6" style={{ background: "#F5E0E5" }}>
            {(["parent", "teacher"] as Role[]).map(r => (
              <button key={r} onClick={() => { setTab(r); setError(""); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  background: tab === r ? "#8B1A2F" : "transparent",
                  color: tab === r ? "white" : "#8B1A2F",
                }}>
                {r === "teacher" ? "👩‍🏫 Учитель" : "👨‍👩‍👧 Родитель"}
              </button>
            ))}
          </div>

          <form onSubmit={tryLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#9B6A7A" }}>
                {tab === "parent" ? "Логин" : "Ваше имя"}
              </label>
              <input
                value={loginVal} onChange={e => setLoginVal(e.target.value)}
                placeholder={tab === "parent" ? "parent1" : "Анна Сергеевна"}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: "#FDF6EE", border: "1.5px solid rgba(139,26,47,0.15)", color: "#3D1520" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#9B6A7A" }}>Пароль</label>
              <input
                type="password" value={pass} onChange={e => setPass(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: "#FDF6EE", border: "1.5px solid rgba(139,26,47,0.15)", color: "#3D1520" }}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl"
                style={{ background: "rgba(244,67,54,0.06)", border: "1px solid rgba(244,67,54,0.2)" }}>
                <Icon name="AlertCircle" size={15} className="text-red-500 shrink-0" />
                <span className="text-xs text-red-600">{error}</span>
              </div>
            )}

            <p className="text-xs text-center" style={{ color: "#9B6A7A" }}>
              {tab === "parent"
                ? <>Попробуйте: <b style={{ color: "#8B1A2F" }}>parent1</b> / <b style={{ color: "#8B1A2F" }}>parent1pass</b></>
                : <>Пароль: <b style={{ color: "#8B1A2F" }}>teacher2024</b></>}
            </p>

            <button type="submit"
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
              style={{ background: "linear-gradient(135deg, #5C0F1E, #8B1A2F)", color: "white", boxShadow: "0 8px 24px rgba(139,26,47,0.3)" }}>
              Войти в дневник 🍎
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────
export default function Index() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<Role>("parent");
  const [userName, setUserName] = useState("");
  const [childName, setChildName] = useState("");
  const [section, setSection] = useState<Section>("schedule");
  const [day, setDay] = useState("Понедельник");
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>(INIT_NOTIFS);
  const [key, setKey] = useState(0);

  const unread = notifs.filter(n => !n.read).length;

  const login = (r: Role, name: string, child?: string) => {
    setRole(r); setUserName(name);
    if (child) setChildName(child);
    setLoggedIn(true);
  };

  const logout = () => { setLoggedIn(false); setShowNotifs(false); };

  const go = (s: Section) => { setSection(s); setKey(k => k + 1); };

  if (!loggedIn) return <LoginScreen onLogin={login} />;

  const grades = role === "parent" ? GRADES.filter(g => g.student === childName) : GRADES;
  const recs = role === "parent" ? RECOMMENDATIONS.filter(r => r.student === childName) : RECOMMENDATIONS;

  return (
    <div className="min-h-screen" style={{ background: "#FDF6EE" }}>
      {SEEDS.slice(0, 4).map((s, i) => <Seed key={i} {...s} />)}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{
        background: "rgba(253,246,238,0.92)", backdropFilter: "blur(12px)",
        borderColor: "rgba(139,26,47,0.12)"
      }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #5C0F1E, #8B1A2F)" }}>
              <span className="text-xl">🍎</span>
            </div>
            <div>
              <p className="font-bold text-lg leading-tight" style={{ color: "#5C0F1E", fontFamily: "Cormorant, serif" }}>Гранатовый Дневник</p>
              <p className="text-xs" style={{ color: "#9B6A7A" }}>
                {role === "teacher" ? `👩‍🏫 ${userName}` : `👨‍👩‍👧 Родитель · ${childName}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {role === "parent" && (
              <div className="relative">
                <button onClick={() => setShowNotifs(!showNotifs)}
                  className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: showNotifs ? "#F5E0E5" : "transparent" }}>
                  <Icon name="Bell" size={20} style={{ color: "#8B1A2F" }} />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white font-bold animate-notification-pop"
                      style={{ background: "#8B1A2F", fontSize: 10 }}>
                      {unread}
                    </span>
                  )}
                </button>

                {showNotifs && (
                  <div className="absolute right-0 top-12 w-80 rounded-2xl shadow-2xl overflow-hidden z-50 animate-slide-up"
                    style={{ background: "white", border: "1.5px solid rgba(139,26,47,0.12)" }}>
                    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(139,26,47,0.08)" }}>
                      <span style={{ color: "#5C0F1E", fontFamily: "Cormorant, serif", fontSize: 20, fontWeight: 700 }}>Уведомления</span>
                      {unread > 0 && (
                        <button onClick={() => setNotifs(n => n.map(x => ({ ...x, read: true })))}
                          className="text-xs" style={{ color: "#8B1A2F" }}>
                          Прочитать все
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifs.map(n => (
                        <div key={n.id} className="flex gap-3 px-4 py-3 border-b hover:bg-gray-50"
                          style={{ borderColor: "rgba(139,26,47,0.05)", background: n.read ? "white" : "rgba(139,26,47,0.03)" }}>
                          <span className="text-lg shrink-0">{NOTIF_EMOJI[n.type]}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm" style={{ color: "#3D1520", fontWeight: n.read ? 400 : 600 }}>{n.text}</p>
                            <p className="text-xs mt-0.5" style={{ color: "#9B6A7A" }}>{n.time}</p>
                          </div>
                          {!n.read && <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: "#8B1A2F" }} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
              style={{ background: "#F5E0E5", color: "#8B1A2F" }}>
              <Icon name="LogOut" size={14} /> Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar desktop */}
        <aside className="w-52 shrink-0 hidden md:block">
          <nav className="space-y-1.5 sticky top-24">
            {NAV.map(item => (
              <button key={item.id} onClick={() => go(item.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: section === item.id ? "linear-gradient(135deg, #5C0F1E, #8B1A2F)" : "white",
                  color: section === item.id ? "white" : "#3D1520",
                  boxShadow: section === item.id ? "0 8px 20px rgba(139,26,47,0.25)" : "0 2px 8px rgba(0,0,0,0.04)",
                  border: section === item.id ? "none" : "1.5px solid rgba(139,26,47,0.08)",
                }}>
                <span className="text-xl">{item.emoji}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
            <div className="pt-5 flex justify-center">
              <img src="https://cdn.poehali.dev/projects/216115a8-6f23-4b25-a72a-91c740414743/files/e2a1af37-06ef-4ec7-a9e7-6f0549e28cfc.jpg"
                className="w-28 h-28 rounded-2xl object-cover"
                style={{ opacity: 0.65, boxShadow: "0 4px 16px rgba(139,26,47,0.18)" }} alt="🍎" />
            </div>
          </nav>
        </aside>

        {/* Mobile nav */}
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t"
          style={{ background: "rgba(253,246,238,0.96)", backdropFilter: "blur(12px)", borderColor: "rgba(139,26,47,0.12)" }}>
          <div className="flex justify-around py-2">
            {NAV.map(item => (
              <button key={item.id} onClick={() => go(item.id)}
                className="flex flex-col items-center gap-0.5 px-1 py-1"
                style={{ color: section === item.id ? "#8B1A2F" : "#9B6A7A" }}>
                <span className="text-xl">{item.emoji}</span>
                <span className="text-xs">{item.label.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 min-w-0 pb-24 md:pb-0" key={key}>

          {/* ── SCHEDULE ── */}
          {section === "schedule" && (
            <div className="section-enter">
              <SectionHeader emoji="📅" title="Расписание" sub="Учебная неделя · 7Б класс" />
              <div className="flex gap-2 mb-5 flex-wrap">
                {Object.keys(SCHEDULE).map(d => (
                  <button key={d} onClick={() => setDay(d)}
                    className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: day === d ? "#8B1A2F" : "white",
                      color: day === d ? "white" : "#8B1A2F",
                      border: "1.5px solid rgba(139,26,47,0.2)",
                    }}>{d}</button>
                ))}
              </div>
              <div className="space-y-3">
                {SCHEDULE[day]?.map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-2xl card-hover animate-slide-up"
                    style={{ background: "white", border: "1.5px solid rgba(139,26,47,0.08)", animationDelay: `${i * 0.07}s`, opacity: 0 }}>
                    <div className="shrink-0">
                      <span className="text-xs font-medium px-2 py-1 rounded-lg block"
                        style={{ background: "#F5E0E5", color: "#8B1A2F", whiteSpace: "nowrap" }}>{item.time}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm" style={{ color: "#3D1520" }}>{item.subject}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#9B6A7A" }}>{item.teacher}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-lg h-fit shrink-0"
                      style={{ background: "rgba(212,168,67,0.12)", color: "#7A5700" }}>🚪 {item.room}</span>
                  </div>
                ))}
              </div>
              {role === "teacher" && <AddButton label="Добавить урок" />}
            </div>
          )}

          {/* ── HOMEWORK ── */}
          {section === "homework" && (
            <div className="section-enter">
              <SectionHeader emoji="📚" title="Домашние задания" sub={`${HOMEWORK.length} задания`} />
              <div className="space-y-4">
                {HOMEWORK.map((hw, i) => (
                  <div key={hw.id} className="p-5 rounded-2xl card-hover animate-slide-up"
                    style={{ background: "white", border: "1.5px solid rgba(139,26,47,0.08)", animationDelay: `${i * 0.09}s`, opacity: 0 }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold"
                            style={{ background: "#F5E0E5", color: "#8B1A2F" }}>{hw.subject}</span>
                          <span className="text-xs" style={{ color: "#9B6A7A" }}>до {hw.dueDate}</span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: "#3D1520" }}>{hw.task}</p>
                        {hw.files && hw.files.length > 0 && (
                          <div className="flex gap-2 mt-3 flex-wrap">
                            {hw.files.map((f, fi) => (
                              <a key={fi} href="#"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                                style={{ background: "rgba(212,168,67,0.12)", color: "#7A5700", border: "1px solid rgba(212,168,67,0.3)" }}>
                                <Icon name="Download" size={12} /> {f}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      {role === "teacher" && (
                        <div className="flex gap-1 shrink-0">
                          <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                            <Icon name="Pencil" size={14} style={{ color: "#8B1A2F" }} />
                          </button>
                          <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50">
                            <Icon name="Trash2" size={14} className="text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {role === "teacher" && <AddButton label="Добавить задание" />}
            </div>
          )}

          {/* ── GRADES ── */}
          {section === "grades" && (
            <div className="section-enter">
              <SectionHeader emoji="⭐" title="Отметки" sub={role === "parent" ? `Ученик: ${childName}` : "Все ученики"} />
              {grades.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[5, 4, 3].map(g => (
                    <div key={g} className={`p-4 rounded-2xl text-center grade-${g}`}>
                      <div className="text-3xl font-bold" style={{ fontFamily: "Cormorant, serif" }}>
                        {grades.filter(gr => gr.grade === g).length}
                      </div>
                      <div className="text-xs font-medium mt-0.5">отметок «{g}»</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-3">
                {grades.map((g, i) => (
                  <div key={g.id} className="flex items-start gap-4 p-4 rounded-2xl card-hover animate-slide-up"
                    style={{ background: "white", border: "1.5px solid rgba(139,26,47,0.08)", animationDelay: `${i * 0.07}s`, opacity: 0 }}>
                    <GradeBadge grade={g.grade} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-sm" style={{ color: "#3D1520" }}>{g.subject}</span>
                        {role === "teacher" && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#F5E0E5", color: "#8B1A2F" }}>{g.student}</span>
                        )}
                      </div>
                      <p className="text-sm" style={{ color: "#9B6A7A" }}>{g.comment}</p>
                    </div>
                    <span className="text-xs shrink-0" style={{ color: "#9B6A7A" }}>{g.date}</span>
                  </div>
                ))}
              </div>
              {role === "teacher" && <AddButton label="Поставить отметку" />}
            </div>
          )}

          {/* ── FILES ── */}
          {section === "files" && (
            <div className="section-enter">
              <SectionHeader emoji="📎" title="Файлы" sub={`${FILES.length} материала`} />
              {role === "teacher" && (
                <div className="p-5 rounded-2xl mb-5 border-2 border-dashed text-center cursor-pointer hover:opacity-80 transition-all"
                  style={{ borderColor: "rgba(139,26,47,0.25)", background: "rgba(139,26,47,0.015)" }}>
                  <Icon name="Upload" size={28} style={{ color: "#8B1A2F", margin: "0 auto 8px" }} />
                  <p className="text-sm font-medium" style={{ color: "#8B1A2F" }}>Загрузить файл</p>
                  <p className="text-xs mt-1" style={{ color: "#9B6A7A" }}>PDF, DOCX, PPTX, JPG — до 50 МБ</p>
                </div>
              )}
              <div className="space-y-3">
                {FILES.map((f, i) => (
                  <div key={f.id} className="flex items-center gap-4 p-4 rounded-2xl card-hover animate-slide-up"
                    style={{ background: "white", border: "1.5px solid rgba(139,26,47,0.08)", animationDelay: `${i * 0.08}s`, opacity: 0 }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                      style={{ background: "#F5E0E5" }}>
                      {f.name.endsWith(".pdf") ? "📄" : f.name.endsWith(".pptx") ? "📊" : "📝"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" style={{ color: "#3D1520" }}>{f.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#9B6A7A" }}>{f.uploadedBy} · {f.date} · {f.size}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full inline-block mt-1" style={{ background: "#F5E0E5", color: "#8B1A2F" }}>
                        {f.subject}
                      </span>
                    </div>
                    <button className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 hover:scale-110 transition-all"
                      style={{ background: "linear-gradient(135deg, #5C0F1E, #8B1A2F)" }}>
                      <Icon name="Download" size={16} style={{ color: "white" }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── RECOMMENDATIONS ── */}
          {section === "recommendations" && (
            <div className="section-enter">
              <SectionHeader emoji="💬" title="Рекомендации" sub={role === "parent" ? `Для: ${childName}` : "Все рекомендации"} />
              <div className="space-y-4">
                {recs.map((rec, i) => (
                  <div key={rec.id} className="p-5 rounded-2xl card-hover animate-slide-up"
                    style={{ background: "white", border: "1.5px solid rgba(139,26,47,0.08)", animationDelay: `${i * 0.1}s`, opacity: 0 }}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg"
                        style={{ background: "linear-gradient(135deg, #5C0F1E, #8B1A2F)" }}>
                        👩‍🏫
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm" style={{ color: "#3D1520" }}>{rec.teacher}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#F5E0E5", color: "#8B1A2F" }}>{rec.subject}</span>
                          {role === "teacher" && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(212,168,67,0.15)", color: "#7A5700" }}>{rec.student}</span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "#9B6A7A" }}>{rec.date}</p>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "#3D1520", lineHeight: 1.75, paddingLeft: 52 }}>
                      {rec.text}
                    </p>
                    {role === "teacher" && (
                      <div className="flex gap-2 mt-3" style={{ paddingLeft: 52 }}>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: "#F5E0E5", color: "#8B1A2F" }}>
                          <Icon name="Pencil" size={12} /> Редактировать
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {role === "teacher" && <AddButton label="Написать рекомендацию" />}
            </div>
          )}
        </main>
      </div>

      {showNotifs && <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────
function SectionHeader({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
        style={{ background: "linear-gradient(135deg, #5C0F1E, #8B1A2F)" }}>{emoji}</div>
      <div>
        <h2 className="text-3xl font-bold" style={{ color: "#5C0F1E", fontFamily: "Cormorant, serif" }}>{title}</h2>
        <p className="text-sm" style={{ color: "#9B6A7A" }}>{sub}</p>
      </div>
    </div>
  );
}

function AddButton({ label }: { label: string }) {
  return (
    <button className="mt-4 w-full py-3 rounded-2xl text-sm font-medium border-2 border-dashed transition-all hover:opacity-70"
      style={{ borderColor: "rgba(139,26,47,0.25)", color: "#8B1A2F" }}>
      + {label}
    </button>
  );
}