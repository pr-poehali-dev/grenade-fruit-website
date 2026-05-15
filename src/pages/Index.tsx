import { useState, useEffect, useCallback, useMemo } from "react";
import Icon from "@/components/ui/icon";

const API = "https://functions.poehali.dev/4adc107f-8465-4183-bc1a-9345fd1468dc";

async function api(action: string, method = "GET", body?: object) {
  const url = `${API}/?action=${action}`;
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ─── Types ────────────────────────────────────────────────
type Role = "teacher" | "parent";
type Tab = "classes" | "parents" | "schedule" | "homework" | "grades" | "files" | "recommendations";

interface User { id: number; login: string; role: Role; display_name: string; child?: string; child_id?: number; class_id?: number; }
interface SchoolClass { id: number; name: string; grade: number; letter: string; display_name?: string; }
interface Student { id: number; full_name: string; class_id: number; class_name?: string; }
interface ScheduleItem { id: number; day_of_week: string; time_slot: string; subject: string; teacher_name: string; room: string; class_id: number; sort_order: number; }
interface Module { id: number; name: string; number: number; date_start: string; date_end: string; school_year: string; }
interface ScheduleDate { id: number; lesson_date: string; day_of_week: string; time_slot: string; subject: string; teacher_name: string; room: string; sort_order: number; }
interface Break { id: number; name: string; date_start: string; date_end: string; school_year: string; }
interface Holiday { id: number; name: string; holiday_date: string; school_year: string; }
interface Trip { id: number; class_id: number; name: string; description: string; trip_date: string; date_end: string; }
interface Homework { id: number; subject: string; task: string; due_date: string; class_id: number; }
interface Grade { id: number; student_id: number; subject: string; grade: number; comment: string; grade_date: string; student_name: string; }
interface FileItem { id: number; name: string; subject: string; teacher_name: string; upload_date: string; size_label: string; s3_key: string; }
interface Recommendation { id: number; subject: string; text: string; rec_date: string; student_name: string; teacher_name: string; }
interface Notification { id: number; text: string; type: string; is_read: boolean; created_at: string; }

// ─── Floating seeds ───────────────────────────────────────
const SEEDS = [
  { top: "10%", left: "2%", size: 12, delay: "0s", opacity: 0.4 },
  { top: "20%", right: "3%", size: 8, delay: "1.2s", opacity: 0.3 },
  { top: "50%", left: "1%", size: 10, delay: "2s", opacity: 0.25 },
  { top: "70%", right: "2%", size: 14, delay: "0.7s", opacity: 0.35 },
];
function Seed({ top, left, right, size, delay, opacity }: { top?: string; left?: string; right?: string; size: number; delay: string; opacity: number }) {
  return (
    <div className="pointer-events-none fixed animate-float" style={{ top, left, right, width: size, height: size, animationDelay: delay, opacity, zIndex: 1 }}>
      <div style={{ width: size, height: size, borderRadius: "50% 50% 50% 20%", background: "radial-gradient(circle at 30% 30%, #D4A843, #8B1A2F)", transform: "rotate(-30deg)" }} />
    </div>
  );
}

function GradeBadge({ grade }: { grade: number }) {
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 grade-${grade}`} style={{ fontFamily: "Cormorant, serif" }}>
      {grade}
    </div>
  );
}

function SectionTitle({ emoji, title, sub }: { emoji: string; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0" style={{ background: "linear-gradient(135deg, #5C0F1E, #8B1A2F)" }}>{emoji}</div>
      <div>
        <h2 className="text-3xl font-bold leading-tight" style={{ color: "#5C0F1E", fontFamily: "Cormorant, serif" }}>{title}</h2>
        {sub && <p className="text-xs mt-0.5" style={{ color: "#9B6A7A" }}>{sub}</p>}
      </div>
    </div>
  );
}

function AddBtn({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="mt-3 w-full py-3 rounded-2xl text-sm font-medium border-2 border-dashed transition-all hover:opacity-70"
      style={{ borderColor: "rgba(139,26,47,0.25)", color: "#8B1A2F" }}>
      + {label}
    </button>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl p-6 shadow-2xl animate-bounce-in" style={{ background: "white" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-2xl font-bold" style={{ color: "#5C0F1E", fontFamily: "Cormorant, serif" }}>{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100">
            <Icon name="X" size={16} style={{ color: "#9B6A7A" }} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "#9B6A7A" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = { background: "#FDF6EE", border: "1.5px solid rgba(139,26,47,0.15)", color: "#3D1520", fontFamily: "Rubik, sans-serif" };
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />;
}
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />;
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />;
}

function SaveBtn({ label = "Сохранить", loading }: { label?: string; loading?: boolean }) {
  return (
    <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-semibold text-sm mt-2"
      style={{ background: "linear-gradient(135deg, #5C0F1E, #8B1A2F)", color: "white", opacity: loading ? 0.7 : 1 }}>
      {loading ? "Сохраняем..." : label}
    </button>
  );
}

const DAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница"];
const TEACHERS = ["Елена Сергеевна", "Александр Валерьевич", "Лариса Ивановна", "Олеся Александровна", "Ирина Олеговна", "Любовь Александровна", "Вадим Игоревич"];
const NOTIF_EMOJI: Record<string, string> = { grade: "⭐", homework: "📚", recommendation: "💬", file: "📎" };

const SUBJECTS_BY_GRADE: Record<string, string[]> = {
  "1-2": ["Математика", "Русский язык", "Английский язык", "Естествознание", "Урок осознанности", "Классный час", "ЖЗЛ", "ИЗО", "Нейротренинг", "Чтение по программе", "История искусств", "Чтение современной литературы", "ОФП"],
  "3-4": ["Математика", "Русский язык", "Чтение", "Биология", "География", "Астрономия", "Физика", "История искусств", "Английский язык", "Классный час", "Урок осознанности", "Нейротренинг", "ОФП"],
  "5-6": ["Математика", "Русский язык", "Литература", "Английский язык", "История", "Биология", "География", "Геометрия", "Физика+химия", "Классный час", "Самопознание", "Проект", "Нейротренинг", "ОФП"],
  "7":   ["Алгебра", "Геометрия", "Русский язык", "Литература", "Английский язык", "История", "Биология", "География", "Химия", "Физика", "Классный час", "Проект", "Самопознание", "ОФП"],
};

function getSubjectsByGrade(grade: number): string[] {
  if (grade <= 2) return SUBJECTS_BY_GRADE["1-2"];
  if (grade <= 4) return SUBJECTS_BY_GRADE["3-4"];
  if (grade <= 6) return SUBJECTS_BY_GRADE["5-6"];
  return SUBJECTS_BY_GRADE["7"];
}

// ─── Login ────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (u: User) => void }) {
  const [tab, setTab] = useState<Role>("parent");
  const [login, setLogin] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await api("login", "POST", { login, password: pass });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    onLogin(res as User);
  };

  return (
    <div className="min-h-screen login-bg flex items-center justify-center p-4 relative overflow-hidden">
      {SEEDS.map((s, i) => <Seed key={i} {...s} />)}
      <div className="absolute right-0 bottom-0 w-72 h-72 opacity-[0.07] pointer-events-none rounded-full overflow-hidden">
        <img src="https://cdn.poehali.dev/projects/216115a8-6f23-4b25-a72a-91c740414743/files/e2a1af37-06ef-4ec7-a9e7-6f0549e28cfc.jpg" className="w-full h-full object-cover" alt="" />
      </div>

      <div className="w-full max-w-sm animate-slide-up" style={{ position: "relative", zIndex: 10 }}>
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 animate-pulse-glow" style={{ background: "linear-gradient(135deg, #5C0F1E, #8B1A2F)" }}>
            <span className="text-4xl">🍎</span>
          </div>
          <div style={{ color: "#5C0F1E", fontFamily: "Cormorant, serif", fontSize: 44, fontStyle: "italic", fontWeight: 700, lineHeight: 1 }}>Гранатовый</div>
          <div style={{ color: "#8B1A2F", fontFamily: "Cormorant, serif", fontSize: 30, fontWeight: 600 }}>Дневник</div>
          <p className="text-sm mt-1.5" style={{ color: "#9B6A7A" }}>Электронный школьный журнал</p>
        </div>

        <div className="rounded-3xl p-7 shadow-2xl" style={{ background: "white", border: "1.5px solid rgba(139,26,47,0.1)" }}>
          <div className="flex rounded-2xl p-1 mb-5" style={{ background: "#F5E0E5" }}>
            {(["parent", "teacher"] as Role[]).map(r => (
              <button key={r} onClick={() => { setTab(r); setError(""); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                style={{ background: tab === r ? "#8B1A2F" : "transparent", color: tab === r ? "white" : "#8B1A2F" }}>
                {r === "teacher" ? "👩‍🏫 Учитель" : "👨‍👩‍👧 Родитель"}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="space-y-3">
            <Field label={tab === "parent" ? "Логин" : "Ваше имя"}>
              <Input value={login} onChange={e => setLogin(e.target.value)} placeholder={tab === "parent" ? "parent1" : "Анна Сергеевна"} />
            </Field>
            <Field label="Пароль">
              <Input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" />
            </Field>
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(244,67,54,0.06)", border: "1px solid rgba(244,67,54,0.2)" }}>
                <Icon name="AlertCircle" size={14} className="text-red-500 shrink-0" />
                <span className="text-xs text-red-600">{error}</span>
              </div>
            )}
            {tab === "parent" && (
              <p className="text-xs text-center" style={{ color: "#9B6A7A" }}>
                <b style={{ color: "#8B1A2F" }}>parent1</b> / <b style={{ color: "#8B1A2F" }}>parent1pass</b>
              </p>
            )}
            <SaveBtn label={loading ? "Входим..." : "Войти в дневник 🍎"} loading={loading} />
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────
export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [tab, setTab] = useState<Tab>("schedule");
  const [tabKey, setTabKey] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);

  const unread = notifs.filter(n => !n.is_read).length;

  useEffect(() => {
    if (user) {
      api("get_classes").then(data => {
        if (Array.isArray(data)) setClasses(data);
      });
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === "parent" && user.id) {
      api(`get_notifications&parent_id=${user.id}`).then(data => {
        if (Array.isArray(data)) setNotifs(data);
      });
    }
  }, [user]);

  // Для родителя — автовыбор класса ребёнка
  useEffect(() => {
    if (user?.role === "parent" && user.class_id && classes.length > 0) {
      const cl = classes.find(c => c.id === user.class_id);
      if (cl) setSelectedClass(cl);
    }
  }, [user, classes]);

  const goTab = (t: Tab) => { setTab(t); setTabKey(k => k + 1); };

  const markAllRead = async () => {
    if (!user) return;
    await api("mark_read", "POST", { parent_id: user.id });
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  if (!user) return <LoginScreen onLogin={setUser} />;

  // Классы отсортированные по параллели
  const sortedClasses = [...classes].sort((a, b) => a.grade - b.grade);

  const NAV = [
    { id: "schedule" as Tab, label: "Расписание", emoji: "📅" },
    { id: "homework" as Tab, label: "ДЗ", emoji: "📚" },
    { id: "grades" as Tab, label: "Отметки", emoji: "⭐" },
    { id: "files" as Tab, label: "Файлы", emoji: "📎" },
    { id: "recommendations" as Tab, label: "Советы", emoji: "💬" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#FDF6EE" }}>
      {SEEDS.map((s, i) => <Seed key={i} {...s} />)}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ background: "rgba(253,246,238,0.93)", backdropFilter: "blur(12px)", borderColor: "rgba(139,26,47,0.12)" }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #5C0F1E, #8B1A2F)" }}>
              <span className="text-lg">🍎</span>
            </div>
            <div>
              <p className="font-bold leading-tight" style={{ color: "#5C0F1E", fontFamily: "Cormorant, serif", fontSize: 18 }}>Гранатовый Дневник</p>
              <p className="text-xs" style={{ color: "#9B6A7A" }}>
                {user.role === "teacher" ? `👩‍🏫 ${user.display_name || user.login}` : `👨‍👩‍👧 ${user.child}`}
                {selectedClass && <span className="ml-1.5 px-1.5 py-0.5 rounded-md text-xs font-semibold" style={{ background: "#F5E0E5", color: "#8B1A2F" }}>{selectedClass.display_name || selectedClass.name}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user.role === "teacher" && (
              <div className="relative md:hidden">
                <button onClick={() => setShowClassPicker(!showClassPicker)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium"
                  style={{ background: "#F5E0E5", color: "#8B1A2F" }}>
                  {selectedClass ? (selectedClass.display_name || `${selectedClass.grade} класс`) : "Класс"}
                  <Icon name="ChevronDown" size={12} />
                </button>
                {showClassPicker && (
                  <div className="absolute right-0 top-10 rounded-2xl shadow-2xl z-50 animate-slide-up overflow-hidden"
                    style={{ background: "white", border: "1.5px solid rgba(139,26,47,0.12)", minWidth: 120 }}>
                    {sortedClasses.map(cl => (
                      <button key={cl.id}
                        onClick={() => { setSelectedClass(cl); goTab("schedule"); setShowClassPicker(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-pink-50 transition-colors"
                        style={{ color: selectedClass?.id === cl.id ? "#8B1A2F" : "#3D1520", fontWeight: selectedClass?.id === cl.id ? 700 : 500 }}>
                        {cl.display_name || `${cl.grade} класс`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {user.role === "parent" && (
              <div className="relative">
                <button onClick={() => setShowNotifs(!showNotifs)} className="relative w-9 h-9 rounded-full flex items-center justify-center" style={{ background: showNotifs ? "#F5E0E5" : "transparent" }}>
                  <Icon name="Bell" size={18} style={{ color: "#8B1A2F" }} />
                  {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold animate-notification-pop" style={{ background: "#8B1A2F", fontSize: 9 }}>{unread}</span>}
                </button>
                {showNotifs && (
                  <div className="absolute right-0 top-11 w-72 rounded-2xl shadow-2xl overflow-hidden z-50 animate-slide-up" style={{ background: "white", border: "1.5px solid rgba(139,26,47,0.12)" }}>
                    <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "rgba(139,26,47,0.08)" }}>
                      <span style={{ color: "#5C0F1E", fontFamily: "Cormorant, serif", fontSize: 18, fontWeight: 700 }}>Уведомления</span>
                      {unread > 0 && <button onClick={markAllRead} className="text-xs" style={{ color: "#8B1A2F" }}>Прочитать все</button>}
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifs.length === 0 && <p className="text-sm text-center py-6" style={{ color: "#9B6A7A" }}>Нет уведомлений</p>}
                      {notifs.map(n => (
                        <div key={n.id} className="flex gap-3 px-4 py-3 border-b" style={{ borderColor: "rgba(139,26,47,0.05)", background: n.is_read ? "white" : "rgba(139,26,47,0.03)" }}>
                          <span className="text-base shrink-0">{NOTIF_EMOJI[n.type] || "📌"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-snug" style={{ color: "#3D1520", fontWeight: n.is_read ? 400 : 600 }}>{n.text}</p>
                            <p className="text-xs mt-0.5" style={{ color: "#9B6A7A" }}>{new Date(n.created_at).toLocaleDateString("ru")}</p>
                          </div>
                          {!n.is_read && <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: "#8B1A2F" }} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button onClick={() => setUser(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium" style={{ background: "#F5E0E5", color: "#8B1A2F" }}>
              <Icon name="LogOut" size={13} /> Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-5 flex gap-5">
        {/* Left sidebar: class picker */}
        <aside className="w-44 shrink-0 hidden md:block">
          <div className="sticky top-20 space-y-4">
            {/* Классы */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: "#9B6A7A" }}>Классы</p>
              <div className="space-y-1">
                {sortedClasses.map(cl => (
                  <button key={cl.id} onClick={() => { setSelectedClass(cl); goTab("schedule"); }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
                    style={{
                      background: selectedClass?.id === cl.id ? "linear-gradient(135deg, #5C0F1E, #8B1A2F)" : "white",
                      color: selectedClass?.id === cl.id ? "white" : "#3D1520",
                      border: "1.5px solid rgba(139,26,47,0.12)",
                      boxShadow: selectedClass?.id === cl.id ? "0 4px 12px rgba(139,26,47,0.25)" : "none",
                    }}>
                    {cl.display_name || `${cl.grade} класс`}
                  </button>
                ))}
              </div>
            </div>
            {/* Гранат */}
            <img src="https://cdn.poehali.dev/projects/216115a8-6f23-4b25-a72a-91c740414743/files/e2a1af37-06ef-4ec7-a9e7-6f0549e28cfc.jpg"
              className="w-full rounded-2xl object-cover" style={{ opacity: 0.6, maxHeight: 120, boxShadow: "0 4px 16px rgba(139,26,47,0.15)" }} alt="" />
          </div>
        </aside>

        {/* Main area */}
        <div className="flex-1 min-w-0 pb-24 md:pb-0">
          {!selectedClass ? (
            /* No class selected */
            <div className="flex flex-col items-center justify-center min-h-64 text-center">
              <div className="text-6xl mb-4">🍎</div>
              <h2 className="text-3xl font-bold mb-2" style={{ color: "#5C0F1E", fontFamily: "Cormorant, serif" }}>Выберите класс</h2>
              <p className="text-sm" style={{ color: "#9B6A7A" }}>Нажмите на класс в панели слева</p>
              {/* Mobile class picker */}
              <div className="mt-6 flex flex-col gap-2 w-full max-w-xs md:hidden">
                {sortedClasses.map(cl => (
                  <button key={cl.id} onClick={() => { setSelectedClass(cl); goTab("schedule"); }}
                    className="py-2.5 px-4 rounded-xl text-sm font-medium text-left"
                    style={{ background: "white", color: "#3D1520", border: "1.5px solid rgba(139,26,47,0.12)" }}>
                    {cl.display_name || `${cl.grade} класс`}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Tab nav */}
              <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
                {NAV.map(n => (
                  <button key={n.id} onClick={() => goTab(n.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
                    style={{
                      background: tab === n.id ? "linear-gradient(135deg, #5C0F1E, #8B1A2F)" : "white",
                      color: tab === n.id ? "white" : "#3D1520",
                      border: "1.5px solid rgba(139,26,47,0.1)",
                      boxShadow: tab === n.id ? "0 4px 12px rgba(139,26,47,0.2)" : "none",
                    }}>
                    <span>{n.emoji}</span> {n.label}
                  </button>
                ))}
                {/* Teacher-only tabs */}
                {user.role === "teacher" && (
                  <>
                    <button onClick={() => goTab("classes")}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
                      style={{
                        background: tab === "classes" ? "linear-gradient(135deg, #5C0F1E, #8B1A2F)" : "white",
                        color: tab === "classes" ? "white" : "#3D1520",
                        border: "1.5px solid rgba(139,26,47,0.1)",
                        boxShadow: tab === "classes" ? "0 4px 12px rgba(139,26,47,0.2)" : "none",
                      }}>
                      <span>👥</span> Ученики
                    </button>
                    <button onClick={() => goTab("parents")}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
                      style={{
                        background: tab === "parents" ? "linear-gradient(135deg, #5C0F1E, #8B1A2F)" : "white",
                        color: tab === "parents" ? "white" : "#3D1520",
                        border: "1.5px solid rgba(139,26,47,0.1)",
                        boxShadow: tab === "parents" ? "0 4px 12px rgba(139,26,47,0.2)" : "none",
                      }}>
                      <span>👨‍👩‍👧</span> Родители
                    </button>
                  </>
                )}
              </div>

              {/* Tab content */}
              <div key={`${selectedClass.id}-${tabKey}`} className="section-enter">
                {tab === "schedule" && <ScheduleTab cls={selectedClass} user={user} />}
                {tab === "homework" && <HomeworkTab cls={selectedClass} user={user} />}
                {tab === "grades" && <GradesTab cls={selectedClass} user={user} />}
                {tab === "files" && <FilesTab cls={selectedClass} />}
                {tab === "recommendations" && <RecsTab cls={selectedClass} user={user} />}
                {tab === "classes" && user.role === "teacher" && <StudentsTab cls={selectedClass} />}
                {tab === "parents" && user.role === "teacher" && <ParentsTab cls={selectedClass} />}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-4 left-4 right-4 z-50 md:hidden rounded-2xl border" style={{ background: "rgba(253,246,238,0.97)", backdropFilter: "blur(12px)", borderColor: "rgba(139,26,47,0.15)", boxShadow: "0 8px 32px rgba(139,26,47,0.15)" }}>
        <div className="flex justify-around py-2">
          {NAV.map(n => (
            <button key={n.id} onClick={() => goTab(n.id)} className="flex flex-col items-center gap-0.5 px-1" style={{ color: tab === n.id ? "#8B1A2F" : "#9B6A7A" }}>
              <span className="text-xl">{n.emoji}</span>
              <span className="text-xs">{n.label}</span>
            </button>
          ))}
          {user.role === "teacher" && (
            <>
              <button onClick={() => goTab("classes")} className="flex flex-col items-center gap-0.5 px-1" style={{ color: tab === "classes" ? "#8B1A2F" : "#9B6A7A" }}>
                <span className="text-xl">👥</span>
                <span className="text-xs">Ученики</span>
              </button>
              <button onClick={() => goTab("parents")} className="flex flex-col items-center gap-0.5 px-1" style={{ color: tab === "parents" ? "#8B1A2F" : "#9B6A7A" }}>
                <span className="text-xl">👨‍👩‍👧</span>
                <span className="text-xs">Родители</span>
              </button>
            </>
          )}
        </div>
      </div>

      {showNotifs && <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />}
    </div>
  );
}

// ─── Schedule Tab ──────────────────────────────────────────
type SchedView = "week" | "module";

// Возвращает даты текущей недели (пн–пт) в формате YYYY-MM-DD
function getCurrentWeekDates(): { iso: string; dayName: string }[] {
  const today = new Date();
  const dow = today.getDay(); // 0=вс
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  const result = [];
  const DNAMES = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница"];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    result.push({ iso: d.toISOString().split("T")[0], dayName: DNAMES[i] });
  }
  return result;
}

interface LessonSlot { time_slot: string; subject: string; teacher_name: string; room: string; }

function ScheduleTab({ cls, user }: { cls: SchoolClass; user: User }) {
  const [view, setView] = useState<SchedView>("week");
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Week view state
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loadingWeek, setLoadingWeek] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [form, setForm] = useState({ day_of_week: "Понедельник", time_slot: "08:00–08:45", subject: "", teacher_name: "", room: "" });
  const [savingItem, setSavingItem] = useState(false);

  // Module calendar state
  const [schedDates, setSchedDates] = useState<ScheduleDate[]>([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [savingModule, setSavingModule] = useState(false);

  // Weekly template for module schedule builder
  const emptySlot = (): LessonSlot => ({ time_slot: "", subject: "", teacher_name: "", room: "" });
  const [weeklyTemplate, setWeeklyTemplate] = useState<Record<string, LessonSlot[]>>(
    Object.fromEntries(DAYS.map(d => [d, [emptySlot()]]))
  );

  // Load base week schedule
  const loadWeek = useCallback(async () => {
    setLoadingWeek(true);
    const data = await api(`get_schedule&class_id=${cls.id}`);
    if (Array.isArray(data)) setItems(data);
    setLoadingWeek(false);
  }, [cls.id]);

  // Load modules once
  useEffect(() => {
    api("get_modules").then(data => {
      if (Array.isArray(data)) {
        setModules(data);
        setSelectedModule(data[0] || null);
      }
    });
    loadWeek();
  }, [loadWeek]);

  // Даты текущей недели (пн-пт) для загрузки расписания
  const weekIsos = useMemo(() => getCurrentWeekDates().map(d => d.iso), []);

  // Уроки текущей недели из schedDates (для week view)
  const [weekSchedDates, setWeekSchedDates] = useState<ScheduleDate[]>([]);
  const [loadingWeekDates, setLoadingWeekDates] = useState(false);

  const loadWeekDates = useCallback(async () => {
    setLoadingWeekDates(true);
    const [d1, d2, d3, d4, d5] = weekIsos;
    const results = await Promise.all(
      [d1, d2, d3, d4, d5].filter(Boolean).map(date =>
        api(`get_schedule_dates&class_id=${cls.id}&lesson_date=${date}`)
      )
    );
    const all: ScheduleDate[] = [];
    results.forEach(r => { if (Array.isArray(r)) all.push(...r); });
    setWeekSchedDates(all);
    setLoadingWeekDates(false);
  }, [cls.id, weekIsos]);

  // Load module calendar dates (for module view)
  const loadDates = useCallback(async (modId: number) => {
    setLoadingDates(true);
    const data = await api(`get_schedule_dates&class_id=${cls.id}&module_id=${modId}`);
    if (Array.isArray(data)) setSchedDates(data);
    setLoadingDates(false);
  }, [cls.id]);

  useEffect(() => {
    loadWeekDates();
  }, [loadWeekDates]);

  useEffect(() => {
    if (view === "module" && selectedModule) loadDates(selectedModule.id);
  }, [view, selectedModule, loadDates]);

  const openEdit = (item: ScheduleItem) => {
    setEditing(item);
    setForm({ day_of_week: item.day_of_week, time_slot: item.time_slot, subject: item.subject, teacher_name: item.teacher_name, room: item.room });
    setShowAdd(true);
  };

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingItem(true);
    if (editing) await api("update_schedule", "POST", { ...form, id: editing.id });
    else await api("add_schedule", "POST", { ...form, class_id: cls.id });
    setSavingItem(false); setShowAdd(false); loadWeek();
  };

  const delItem = async (id: number) => {
    await api("delete_schedule", "POST", { id });
    loadWeek();
  };

  // Module calendar helpers
  const getAllDatesInModule = (mod: Module): string[] => {
    const dates: string[] = [];
    const start = new Date(mod.date_start);
    const end = new Date(mod.date_end);
    const cur = new Date(start);
    while (cur <= end) {
      if (cur.getDay() !== 0 && cur.getDay() !== 6) {
        dates.push(cur.toISOString().split("T")[0]);
      }
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  const getLessonsForDate = (date: string) =>
    schedDates.filter(s => s.lesson_date === date).sort((a, b) => a.sort_order - b.sort_order);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  const formatDay = (iso: string) => {
    const d = new Date(iso);
    return DAYS[d.getDay() - 1] || "";
  };

  const isToday = (iso: string) => iso === new Date().toISOString().split("T")[0];

  // Module schedule save
  const saveModuleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModule) return;
    // Убираем пустые слоты
    const clean: Record<string, LessonSlot[]> = {};
    DAYS.forEach(d => {
      const slots = weeklyTemplate[d].filter(s => s.subject.trim());
      if (slots.length) clean[d] = slots;
    });
    setSavingModule(true);
    await api("save_module_schedule", "POST", {
      class_id: cls.id,
      module_id: selectedModule.id,
      weekly_template: clean,
    });
    setSavingModule(false);
    setShowModuleForm(false);
    await Promise.all([loadDates(selectedModule.id), loadWeekDates()]);
  };

  const addSlot = (d: string) => setWeeklyTemplate(t => ({ ...t, [d]: [...t[d], emptySlot()] }));
  const removeSlot = (d: string, i: number) => setWeeklyTemplate(t => ({ ...t, [d]: t[d].filter((_, idx) => idx !== i) }));
  const updateSlot = (d: string, i: number, field: keyof LessonSlot, val: string) =>
    setWeeklyTemplate(t => ({ ...t, [d]: t[d].map((s, idx) => idx === i ? { ...s, [field]: val } : s) }));

  // Module editor + breaks + holidays + trips
  const [showModuleEditor, setShowModuleEditor] = useState(false);
  const [editorTab, setEditorTab] = useState<"modules" | "breaks" | "holidays" | "trips">("modules");
  const [editingModules, setEditingModules] = useState<Module[]>([]);
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [savingModuleEdit, setSavingModuleEdit] = useState(false);
  const [newBreak, setNewBreak] = useState({ name: "", date_start: "", date_end: "" });
  const [newHoliday, setNewHoliday] = useState({ name: "", holiday_date: "" });
  const [newTrip, setNewTrip] = useState({ name: "", description: "", trip_date: "", date_end: "" });
  const [savingBreak, setSavingBreak] = useState(false);
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);

  const loadBreaksHolidays = async () => {
    const [b, h, t] = await Promise.all([
      api("get_breaks"), api("get_holidays"),
      api(`get_trips&class_id=${cls.id}`),
    ]);
    if (Array.isArray(b)) setBreaks(b);
    if (Array.isArray(h)) setHolidays(h);
    if (Array.isArray(t)) setTrips(t);
  };

  const openModuleEditor = () => {
    setEditingModules(modules.map(m => ({ ...m })));
    setEditorTab("modules");
    loadBreaksHolidays();
    setShowModuleEditor(true);
  };

  // Для подсветки в календаре
  const breakDates = new Set<string>();
  breaks.forEach(b => {
    const s = new Date(b.date_start), e = new Date(b.date_end);
    const d = new Date(s);
    while (d <= e) { breakDates.add(d.toISOString().split("T")[0]); d.setDate(d.getDate() + 1); }
  });
  const holidayDates = new Set(holidays.map(h => h.holiday_date));
  const tripDates = new Set<string>();
  trips.forEach(t => {
    const s = new Date(t.trip_date), e = new Date(t.date_end || t.trip_date);
    const d = new Date(s);
    while (d <= e) { tripDates.add(d.toISOString().split("T")[0]); d.setDate(d.getDate() + 1); }
  });

  const saveAllModules = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingModuleEdit(true);
    for (const m of editingModules) {
      await api("update_module", "POST", { id: m.id, name: m.name, date_start: m.date_start, date_end: m.date_end });
    }
    const updated = await api("get_modules");
    if (Array.isArray(updated)) {
      setModules(updated);
      const cur = updated.find((m: Module) => m.id === selectedModule?.id);
      if (cur) setSelectedModule(cur);
    }
    setSavingModuleEdit(false);
    setShowModuleEditor(false);
  };

  const addBreak = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingBreak(true);
    await api("add_break", "POST", newBreak);
    setNewBreak({ name: "", date_start: "", date_end: "" });
    setSavingBreak(false);
    loadBreaksHolidays();
  };

  const removeBreak = async (id: number) => {
    await api("delete_break", "POST", { id });
    loadBreaksHolidays();
  };

  const addHoliday = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingHoliday(true);
    await api("add_holiday", "POST", newHoliday);
    setNewHoliday({ name: "", holiday_date: "" });
    setSavingHoliday(false);
    loadBreaksHolidays();
  };

  const removeHoliday = async (id: number) => {
    await api("delete_holiday", "POST", { id });
    loadBreaksHolidays();
  };

  const addTrip = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingTrip(true);
    await api("add_trip", "POST", { ...newTrip, class_id: cls.id, date_end: newTrip.date_end || newTrip.trip_date });
    setNewTrip({ name: "", description: "", trip_date: "", date_end: "" });
    setSavingTrip(false);
    loadBreaksHolidays();
  };

  const removeTrip = async (id: number) => {
    await api("delete_trip", "POST", { id });
    loadBreaksHolidays();
  };

  useEffect(() => { loadBreaksHolidays(); }, []);

  return (
    <div>
      <SectionTitle emoji="📅" title={`Расписание · ${cls.display_name || cls.name}`} />

      {/* View toggle */}
      <div className="flex gap-2 mb-5">
        {([["week", "📋 Недельное"], ["module", "🗓 Календарь модуля"]] as [SchedView, string][]).map(([v, label]) => (
          <button key={v} onClick={() => setView(v)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: view === v ? "linear-gradient(135deg, #5C0F1E, #8B1A2F)" : "white",
              color: view === v ? "white" : "#3D1520",
              border: "1.5px solid rgba(139,26,47,0.15)",
              boxShadow: view === v ? "0 4px 12px rgba(139,26,47,0.2)" : "none",
            }}>{label}</button>
        ))}
      </div>

      {/* ── WEEK VIEW ── */}
      {view === "week" && (
        <>
          {(loadingWeekDates || loadingWeek) ? <Loader /> : (() => {
            const weekDates = getCurrentWeekDates();
            const todayIso = new Date().toISOString().split("T")[0];
            return (
              <div className="space-y-4">
                {weekDates.map(({ iso, dayName }) => {
                  const isToday = iso === todayIso;
                  const isBreakDay = breakDates.has(iso);
                  const isHolidayDay = holidayDates.has(iso);
                  const isTripDay = tripDates.has(iso);
                  const holiday = holidays.find(h => h.holiday_date === iso);
                  const trip = trips.find(t => iso >= t.trip_date && iso <= (t.date_end || t.trip_date));
                  const breakItem = breaks.find(b => iso >= b.date_start && iso <= b.date_end);

                  // Уроки из реального расписания модуля
                  const dayLessons = weekSchedDates
                    .filter(s => s.lesson_date === iso)
                    .sort((a, b) => a.sort_order - b.sort_order);

                  // Запасной вариант — базовый шаблон (если модульное расписание ещё не заполнено)
                  const fallbackLessons = items
                    .filter(i => i.day_of_week === dayName)
                    .sort((a, b) => a.sort_order - b.sort_order);

                  const lessonsToShow = dayLessons.length > 0 ? dayLessons : fallbackLessons;
                  const isFromTemplate = dayLessons.length === 0 && fallbackLessons.length > 0;

                  const dateLabel = new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

                  return (
                    <div key={iso}>
                      {/* Day header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="px-3 py-1 rounded-xl text-xs font-bold"
                          style={{ background: isToday ? "linear-gradient(135deg,#5C0F1E,#8B1A2F)" : "#F5E0E5", color: isToday ? "white" : "#8B1A2F" }}>
                          {dayName}
                        </div>
                        <span className="text-xs" style={{ color: "#9B6A7A" }}>{dateLabel}</span>
                        {isToday && <span className="text-xs font-semibold" style={{ color: "#8B1A2F" }}>· сегодня</span>}
                        {user.role === "teacher" && !isBreakDay && !isHolidayDay && (
                          <button onClick={() => { setEditing(null); setForm({ day_of_week: dayName, time_slot: "08:00–08:45", subject: "", teacher_name: "", room: "" }); setShowAdd(true); }}
                            className="ml-auto w-6 h-6 rounded-lg flex items-center justify-center hover:bg-pink-100 transition-colors">
                            <Icon name="Plus" size={13} style={{ color: "#8B1A2F" }} />
                          </button>
                        )}
                      </div>

                      {/* Special events: break / holiday */}
                      {(isBreakDay || isHolidayDay) && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-1"
                          style={{ background: isBreakDay ? "rgba(212,168,67,0.1)" : "rgba(76,175,80,0.08)", border: `1.5px solid ${isBreakDay ? "rgba(212,168,67,0.3)" : "rgba(76,175,80,0.25)"}` }}>
                          <span>{isBreakDay ? "🏖" : "🎉"}</span>
                          <span className="text-xs font-medium" style={{ color: isBreakDay ? "#7A5700" : "#2E7D32" }}>
                            {isHolidayDay ? holiday?.name : (breakItem?.name || "Каникулы")}
                          </span>
                        </div>
                      )}

                      {/* Trip event */}
                      {isTripDay && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-1"
                          style={{ background: "rgba(33,150,243,0.07)", border: "1.5px solid rgba(33,150,243,0.2)" }}>
                          <span>🚌</span>
                          <div>
                            <span className="text-xs font-medium" style={{ color: "#1565C0" }}>{trip?.name}</span>
                            {trip?.description && <span className="text-xs ml-1" style={{ color: "#5B8DB8" }}>· {trip.description}</span>}
                          </div>
                        </div>
                      )}

                      {/* Lessons (not shown on full-day breaks) */}
                      {!isBreakDay && !isHolidayDay && (
                        lessonsToShow.length === 0 ? (
                          <p className="text-xs pl-1" style={{ color: "#C4B0B5" }}>Нет уроков</p>
                        ) : (
                          <div className="space-y-2">
                            {isFromTemplate && (
                              <p className="text-xs pl-1 mb-1" style={{ color: "#C4B0B5" }}>шаблон расписания</p>
                            )}
                            {lessonsToShow.map((lesson) => (
                              <div key={lesson.id} className="flex gap-3 items-center p-3 rounded-2xl"
                                style={{ background: isToday ? "rgba(139,26,47,0.04)" : "white", border: `1.5px solid ${isToday ? "rgba(139,26,47,0.12)" : "rgba(139,26,47,0.07)"}` }}>
                                <span className="text-xs font-medium px-2 py-1 rounded-lg shrink-0" style={{ background: "#F5E0E5", color: "#8B1A2F", whiteSpace: "nowrap" }}>{lesson.time_slot}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm truncate" style={{ color: "#3D1520" }}>{lesson.subject}</p>
                                  <p className="text-xs mt-0.5" style={{ color: "#9B6A7A" }}>{lesson.teacher_name}</p>
                                </div>
                                <span className="text-xs px-2 py-1 rounded-lg shrink-0" style={{ background: "rgba(212,168,67,0.12)", color: "#7A5700" }}>🚪 {lesson.room}</span>
                                {user.role === "teacher" && isFromTemplate && (
                                  <div className="flex gap-1 shrink-0">
                                    <button onClick={() => openEdit(lesson as unknown as ScheduleItem)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100"><Icon name="Pencil" size={13} style={{ color: "#8B1A2F" }} /></button>
                                    <button onClick={() => delItem(lesson.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50"><Icon name="Trash2" size={13} className="text-red-400" /></button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </>
      )}

      {/* ── MODULE CALENDAR VIEW ── */}
      {view === "module" && (
        <>
          {/* Module selector + edit button */}
          <div className="flex items-start gap-2 mb-4 flex-wrap">
            <div className="flex gap-2 flex-wrap flex-1">
              {modules.map(m => (
                <button key={m.id} onClick={() => setSelectedModule(m)}
                  className="px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: selectedModule?.id === m.id ? "#8B1A2F" : "white", color: selectedModule?.id === m.id ? "white" : "#8B1A2F", border: "1.5px solid rgba(139,26,47,0.2)" }}>
                  {m.name}
                </button>
              ))}
            </div>
            {user.role === "teacher" && (
              <button onClick={openModuleEditor}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all hover:opacity-80"
                style={{ background: "white", color: "#8B1A2F", border: "1.5px solid rgba(139,26,47,0.2)" }}>
                <Icon name="Settings" size={13} /> Модули
              </button>
            )}
          </div>

          {selectedModule && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm" style={{ color: "#9B6A7A" }}>
                  {formatDate(selectedModule.date_start)} — {formatDate(selectedModule.date_end)} · {selectedModule.school_year}
                </p>
                {user.role === "teacher" && (
                  <button onClick={() => setShowModuleForm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                    style={{ background: "linear-gradient(135deg, #5C0F1E, #8B1A2F)", color: "white" }}>
                    <Icon name="CalendarPlus" size={13} /> Заполнить модуль
                  </button>
                )}
              </div>

              {loadingDates ? <Loader /> : (
                <div className="space-y-2">
                  {getAllDatesInModule(selectedModule).map(date => {
                    const lessons = getLessonsForDate(date);
                    const active = selectedDate === date;
                    const isBreak = breakDates.has(date);
                    const isHoliday = holidayDates.has(date);
                    const isTrip = tripDates.has(date);
                    const holiday = holidays.find(h => h.holiday_date === date);
                    const trip = trips.find(t => {
                      const s = t.trip_date, e = t.date_end || t.trip_date;
                      return date >= s && date <= e;
                    });
                    const isSpecial = isBreak || isHoliday;

                    if (isSpecial) {
                      return (
                        <div key={date} className="flex items-center gap-3 p-3 rounded-2xl"
                          style={{ background: isBreak ? "rgba(212,168,67,0.1)" : "rgba(76,175,80,0.08)", border: `1.5px solid ${isBreak ? "rgba(212,168,67,0.3)" : "rgba(76,175,80,0.25)"}` }}>
                          <div className="w-12 text-center shrink-0">
                            <p className="text-lg font-bold leading-none" style={{ color: isBreak ? "#7A5700" : "#2E7D32", fontFamily: "Cormorant, serif" }}>{new Date(date).getDate()}</p>
                            <p className="text-xs mt-0.5" style={{ color: "#9B6A7A" }}>{new Date(date).toLocaleDateString("ru-RU", { month: "short" })}</p>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-medium" style={{ color: "#9B6A7A" }}>{formatDay(date)}</p>
                            <p className="text-sm font-medium" style={{ color: isBreak ? "#7A5700" : "#2E7D32" }}>
                              {isBreak ? "🏖" : "🎉"} {isHoliday ? holiday?.name : "Каникулы"}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={date}>
                        <button
                          onClick={() => setSelectedDate(active ? null : date)}
                          className="w-full flex items-center gap-3 p-3 rounded-2xl transition-all hover:opacity-90"
                          style={{
                            background: isToday(date) ? "linear-gradient(135deg, #5C0F1E, #8B1A2F)" : active ? "#F5E0E5" : "white",
                            border: `1.5px solid ${isToday(date) ? "transparent" : "rgba(139,26,47,0.1)"}`,
                          }}>
                          <div className="w-12 text-center shrink-0">
                            <p className="text-lg font-bold leading-none" style={{ color: isToday(date) ? "white" : "#8B1A2F", fontFamily: "Cormorant, serif" }}>
                              {new Date(date).getDate()}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: isToday(date) ? "rgba(255,255,255,0.8)" : "#9B6A7A" }}>
                              {new Date(date).toLocaleDateString("ru-RU", { month: "short" })}
                            </p>
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-xs font-medium" style={{ color: isToday(date) ? "rgba(255,255,255,0.7)" : "#9B6A7A" }}>
                              {formatDay(date)}
                            </p>
                            {isTrip && trip && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mr-1"
                                style={{ background: "rgba(33,150,243,0.15)", color: "#1565C0" }}>
                                🚌 {trip.name}
                              </span>
                            )}
                            {lessons.length > 0 ? (
                              <p className="text-sm font-medium mt-0.5" style={{ color: isToday(date) ? "white" : "#3D1520" }}>
                                {lessons.length} {lessons.length === 1 ? "урок" : lessons.length < 5 ? "урока" : "уроков"}
                                {" · "}{lessons.map(l => l.subject).slice(0, 3).join(", ")}
                                {lessons.length > 3 ? "..." : ""}
                              </p>
                            ) : (
                              <p className="text-sm mt-0.5" style={{ color: isToday(date) ? "rgba(255,255,255,0.5)" : "#C4B0B5" }}>нет уроков</p>
                            )}
                          </div>
                          {lessons.length > 0 && (
                            <Icon name={active ? "ChevronUp" : "ChevronDown"} size={16} style={{ color: isToday(date) ? "white" : "#9B6A7A", shrink: 0 }} />
                          )}
                        </button>

                        {/* Expanded lessons */}
                        {active && lessons.length > 0 && (
                          <div className="ml-4 mt-1 space-y-1.5 mb-2">
                            {lessons.map((l, i) => (
                              <div key={l.id} className="flex gap-3 items-center p-3 rounded-xl animate-slide-up"
                                style={{ background: "#FDF6EE", border: "1.5px solid rgba(139,26,47,0.08)", animationDelay: `${i * 0.04}s`, opacity: 0 }}>
                                <span className="text-xs font-medium px-2 py-0.5 rounded-lg shrink-0" style={{ background: "#F5E0E5", color: "#8B1A2F" }}>{l.time_slot}</span>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold" style={{ color: "#3D1520" }}>{l.subject}</p>
                                  <p className="text-xs" style={{ color: "#9B6A7A" }}>{l.teacher_name}</p>
                                </div>
                                <span className="text-xs px-2 py-0.5 rounded-lg shrink-0" style={{ background: "rgba(212,168,67,0.12)", color: "#7A5700" }}>🚪 {l.room}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── MODAL: edit/add single lesson (week view) ── */}
      {showAdd && (
        <Modal title={editing ? "Редактировать урок" : "Новый урок"} onClose={() => setShowAdd(false)}>
          <form onSubmit={saveItem} className="space-y-3">
            <Field label="День недели">
              <Select value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value }))}>
                {DAYS.map(d => <option key={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label="Время">
              <Select value={form.time_slot} onChange={e => setForm(f => ({ ...f, time_slot: e.target.value }))} required>
                <option value="">— Выберите время —</option>
                {["10:00–10:40","10:50–11:30","12:00–12:40","12:50–13:30","13:40–14:20"].map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Предмет">
              <Select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required>
                <option value="">— Выберите предмет —</option>
                {getSubjectsByGrade(cls.grade).map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Учитель">
              <Select value={form.teacher_name} onChange={e => setForm(f => ({ ...f, teacher_name: e.target.value }))} required>
                <option value="">— Выберите педагога —</option>
                {TEACHERS.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Кабинет"><Input value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} placeholder="305" required /></Field>
            <SaveBtn loading={savingItem} />
          </form>
        </Modal>
      )}

      {/* ── MODAL: fill module schedule ── */}
      {showModuleForm && selectedModule && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowModuleForm(false)}>
          <div className="w-full max-w-2xl rounded-3xl p-6 shadow-2xl my-4" style={{ background: "white" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-2xl font-bold" style={{ color: "#5C0F1E", fontFamily: "Cormorant, serif" }}>Расписание на {selectedModule.name}</h3>
                <p className="text-sm mt-0.5" style={{ color: "#9B6A7A" }}>Заполните шаблон недели — он применится на все дни модуля</p>
              </div>
              <button onClick={() => setShowModuleForm(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100">
                <Icon name="X" size={16} style={{ color: "#9B6A7A" }} />
              </button>
            </div>
            <form onSubmit={saveModuleSchedule} className="space-y-5">
              {DAYS.map(d => (
                <div key={d}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold" style={{ color: "#8B1A2F" }}>{d}</p>
                    <button type="button" onClick={() => addSlot(d)} className="text-xs px-2 py-1 rounded-lg" style={{ background: "#F5E0E5", color: "#8B1A2F" }}>
                      + Урок
                    </button>
                  </div>
                  <div className="space-y-2">
                    {weeklyTemplate[d].map((slot, i) => (
                      <div key={i} className="grid grid-cols-2 gap-2 p-3 rounded-xl" style={{ background: "#FDF6EE", border: "1px solid rgba(139,26,47,0.08)" }}>
                        <Select value={slot.time_slot} onChange={e => updateSlot(d, i, "time_slot", e.target.value)}>
                          <option value="">— Время —</option>
                          {["10:00–10:40","10:50–11:30","12:00–12:40","12:50–13:30","13:40–14:20"].map(t => <option key={t} value={t}>{t}</option>)}
                        </Select>
                        <div className="flex gap-1">
                          <Select value={slot.subject} onChange={e => updateSlot(d, i, "subject", e.target.value)}>
                            <option value="">— Предмет —</option>
                            {getSubjectsByGrade(cls.grade).map(s => <option key={s} value={s}>{s}</option>)}
                          </Select>
                          <button type="button" onClick={() => removeSlot(d, i)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 shrink-0">
                            <Icon name="X" size={13} className="text-red-400" />
                          </button>
                        </div>
                        <Select value={slot.teacher_name} onChange={e => updateSlot(d, i, "teacher_name", e.target.value)}>
                          <option value="">— Педагог —</option>
                          {TEACHERS.map(t => <option key={t} value={t}>{t}</option>)}
                        </Select>
                        <Input value={slot.room} onChange={e => updateSlot(d, i, "room", e.target.value)} placeholder="Кабинет" />
                      </div>
                    ))}
                    {weeklyTemplate[d].length === 0 && (
                      <p className="text-xs text-center py-2" style={{ color: "#C4B0B5" }}>Нет уроков в этот день</p>
                    )}
                  </div>
                </div>
              ))}
              <SaveBtn label={savingModule ? "Сохраняем..." : `Применить на ${selectedModule.name}`} loading={savingModule} />
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: module editor ── */}
      {showModuleEditor && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowModuleEditor(false)}>
          <div className="w-full max-w-lg rounded-3xl p-6 shadow-2xl my-4" style={{ background: "white" }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold" style={{ color: "#5C0F1E", fontFamily: "Cormorant, serif" }}>Учебный год</h3>
              <button onClick={() => setShowModuleEditor(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100">
                <Icon name="X" size={16} style={{ color: "#9B6A7A" }} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex rounded-xl p-1 mb-5" style={{ background: "#F5E0E5" }}>
              {([["modules", "📅 Модули"], ["breaks", "🏖 Каникулы"], ["holidays", "🎉 Праздники"], ["trips", "🚌 Выезды"]] as ["modules" | "breaks" | "holidays" | "trips", string][]).map(([t, label]) => (
                <button key={t} onClick={() => setEditorTab(t)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: editorTab === t ? "#8B1A2F" : "transparent", color: editorTab === t ? "white" : "#8B1A2F" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Tab: Modules */}
            {editorTab === "modules" && (
              <form onSubmit={saveAllModules} className="space-y-3">
                {editingModules.map((m, idx) => (
                  <div key={m.id} className="p-3 rounded-2xl" style={{ background: "#FDF6EE", border: "1.5px solid rgba(139,26,47,0.1)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: "linear-gradient(135deg, #5C0F1E, #8B1A2F)" }}>{m.number}</span>
                      <Input value={m.name}
                        onChange={e => setEditingModules(ms => ms.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                        placeholder="Название модуля" required />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Начало">
                        <Input type="date" value={m.date_start}
                          onChange={e => setEditingModules(ms => ms.map((x, i) => i === idx ? { ...x, date_start: e.target.value } : x))} required />
                      </Field>
                      <Field label="Конец">
                        <Input type="date" value={m.date_end}
                          onChange={e => setEditingModules(ms => ms.map((x, i) => i === idx ? { ...x, date_end: e.target.value } : x))} required />
                      </Field>
                    </div>
                  </div>
                ))}
                <SaveBtn label={savingModuleEdit ? "Сохраняем..." : "Сохранить все модули"} loading={savingModuleEdit} />
              </form>
            )}

            {/* Tab: Breaks */}
            {editorTab === "breaks" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  {breaks.length === 0 && <Empty text="Каникулы не добавлены" />}
                  {breaks.map(b => (
                    <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#FDF6EE", border: "1.5px solid rgba(139,26,47,0.1)" }}>
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: "#3D1520" }}>{b.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#9B6A7A" }}>
                          {new Date(b.date_start).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} — {new Date(b.date_end).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                        </p>
                      </div>
                      <button onClick={() => removeBreak(b.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 shrink-0">
                        <Icon name="Trash2" size={13} className="text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
                <form onSubmit={addBreak} className="p-3 rounded-xl space-y-2" style={{ background: "#FDF6EE", border: "1.5px dashed rgba(139,26,47,0.25)" }}>
                  <p className="text-xs font-semibold" style={{ color: "#8B1A2F" }}>+ Добавить каникулы</p>
                  <Input value={newBreak.name} onChange={e => setNewBreak(b => ({ ...b, name: e.target.value }))} placeholder="Осенние каникулы" required />
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Начало"><Input type="date" value={newBreak.date_start} onChange={e => setNewBreak(b => ({ ...b, date_start: e.target.value }))} required /></Field>
                    <Field label="Конец"><Input type="date" value={newBreak.date_end} onChange={e => setNewBreak(b => ({ ...b, date_end: e.target.value }))} required /></Field>
                  </div>
                  <SaveBtn label={savingBreak ? "Сохраняем..." : "Добавить"} loading={savingBreak} />
                </form>
              </div>
            )}

            {/* Tab: Holidays */}
            {editorTab === "holidays" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  {holidays.length === 0 && <Empty text="Праздники не добавлены" />}
                  {holidays.map(h => (
                    <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#FDF6EE", border: "1.5px solid rgba(139,26,47,0.1)" }}>
                      <span className="text-lg shrink-0">🎉</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: "#3D1520" }}>{h.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#9B6A7A" }}>
                          {new Date(h.holiday_date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                      <button onClick={() => removeHoliday(h.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 shrink-0">
                        <Icon name="Trash2" size={13} className="text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
                <form onSubmit={addHoliday} className="p-3 rounded-xl space-y-2" style={{ background: "#FDF6EE", border: "1.5px dashed rgba(139,26,47,0.25)" }}>
                  <p className="text-xs font-semibold" style={{ color: "#8B1A2F" }}>+ Добавить праздник</p>
                  <Input value={newHoliday.name} onChange={e => setNewHoliday(h => ({ ...h, name: e.target.value }))} placeholder="День Победы" required />
                  <Field label="Дата"><Input type="date" value={newHoliday.holiday_date} onChange={e => setNewHoliday(h => ({ ...h, holiday_date: e.target.value }))} required /></Field>
                  <SaveBtn label={savingHoliday ? "Сохраняем..." : "Добавить"} loading={savingHoliday} />
                </form>
              </div>
            )}

            {/* Tab: Trips */}
            {editorTab === "trips" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  {trips.length === 0 && <Empty text="Выезды не добавлены" />}
                  {trips.map(t => (
                    <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl"
                      style={{ background: "rgba(33,150,243,0.05)", border: "1.5px solid rgba(33,150,243,0.2)" }}>
                      <span className="text-lg shrink-0 mt-0.5">🚌</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: "#0D47A1" }}>{t.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#9B6A7A" }}>
                          {new Date(t.trip_date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                          {t.date_end && t.date_end !== t.trip_date && (
                            <> — {new Date(t.date_end).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</>
                          )}
                        </p>
                        {t.description && <p className="text-xs mt-1" style={{ color: "#9B6A7A" }}>{t.description}</p>}
                      </div>
                      <button onClick={() => removeTrip(t.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 shrink-0">
                        <Icon name="Trash2" size={13} className="text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
                <form onSubmit={addTrip} className="p-3 rounded-xl space-y-2" style={{ background: "rgba(33,150,243,0.04)", border: "1.5px dashed rgba(33,150,243,0.3)" }}>
                  <p className="text-xs font-semibold" style={{ color: "#1565C0" }}>+ Добавить выезд</p>
                  <Input value={newTrip.name} onChange={e => setNewTrip(v => ({ ...v, name: e.target.value }))} placeholder="Поход в театр" required />
                  <Input value={newTrip.description} onChange={e => setNewTrip(v => ({ ...v, description: e.target.value }))} placeholder="Описание (необязательно)" />
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Дата начала">
                      <Input type="date" value={newTrip.trip_date} onChange={e => setNewTrip(v => ({ ...v, trip_date: e.target.value }))} required />
                    </Field>
                    <Field label="Дата конца (если несколько дней)">
                      <Input type="date" value={newTrip.date_end} onChange={e => setNewTrip(v => ({ ...v, date_end: e.target.value }))} />
                    </Field>
                  </div>
                  <SaveBtn label={savingTrip ? "Сохраняем..." : "Добавить"} loading={savingTrip} />
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Students Tab ──────────────────────────────────────────
function StudentsTab({ cls }: { cls: SchoolClass }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api(`get_students&class_id=${cls.id}`);
    if (Array.isArray(data)) setStudents(data);
    setLoading(false);
  }, [cls.id]);

  useEffect(() => { load(); }, [load]);

  const removeStudent = async (id: number) => {
    if (!confirm("Удалить ученика? Это действие нельзя отменить.")) return;
    await api("delete_student", "POST", { student_id: id });
    load();
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await api("add_student", "POST", { full_name: name, class_id: cls.id });
    setSaving(false);
    setShowAdd(false);
    setName("");
    load();
  };

  return (
    <div>
      <SectionTitle emoji="👥" title={`Ученики · ${cls.display_name || cls.name}`} sub={`${students.length} учеников`} />
      {loading ? <Loader /> : (
        <div className="space-y-2">
          {students.length === 0 && <Empty text="Список пуст — добавьте первого ученика" />}
          {students.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl animate-slide-up card-hover"
              style={{ background: "white", border: "1.5px solid rgba(139,26,47,0.08)", animationDelay: `${i * 0.05}s`, opacity: 0 }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "linear-gradient(135deg, #5C0F1E, #8B1A2F)", color: "white" }}>
                {s.full_name.charAt(0)}
              </div>
              <p className="font-medium text-sm flex-1" style={{ color: "#3D1520" }}>{s.full_name}</p>
              <button onClick={() => removeStudent(s.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 shrink-0">
                <Icon name="Trash2" size={13} className="text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
      <AddBtn label="Добавить ученика" onClick={() => setShowAdd(true)} />

      {showAdd && (
        <Modal title="Новый ученик" onClose={() => setShowAdd(false)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Имя и фамилия"><Input value={name} onChange={e => setName(e.target.value)} placeholder="Иван Петров" required /></Field>
            <SaveBtn loading={saving} />
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Homework Tab ──────────────────────────────────────────
function HomeworkTab({ cls, user }: { cls: SchoolClass; user: User }) {
  const [items, setItems] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Homework | null>(null);
  const [form, setForm] = useState({ subject: "", task: "", due_date: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api(`get_homework&class_id=${cls.id}`);
    if (Array.isArray(data)) setItems(data);
    setLoading(false);
  }, [cls.id]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm({ subject: "", task: "", due_date: "" }); setShowAdd(true); };
  const openEdit = (hw: Homework) => { setEditing(hw); setForm({ subject: hw.subject, task: hw.task, due_date: hw.due_date }); setShowAdd(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (editing) {
      await api("update_homework", "POST", { ...form, id: editing.id });
    } else {
      await api("add_homework", "POST", { ...form, class_id: cls.id, teacher_id: user.id });
    }
    setSaving(false); setShowAdd(false); load();
  };

  return (
    <div>
      <SectionTitle emoji="📚" title={`Домашние задания · ${cls.display_name || cls.name}`} sub={`${items.length} заданий`} />
      {loading ? <Loader /> : (
        <div className="space-y-3">
          {items.length === 0 && <Empty text="Заданий нет" />}
          {items.map((hw, i) => (
            <div key={hw.id} className="p-4 rounded-2xl card-hover animate-slide-up"
              style={{ background: "white", border: "1.5px solid rgba(139,26,47,0.08)", animationDelay: `${i * 0.07}s`, opacity: 0 }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: "#F5E0E5", color: "#8B1A2F" }}>{hw.subject}</span>
                    <span className="text-xs" style={{ color: "#9B6A7A" }}>до {hw.due_date}</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "#3D1520" }}>{hw.task}</p>
                </div>
                {user.role === "teacher" && (
                  <button onClick={() => openEdit(hw)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 shrink-0">
                    <Icon name="Pencil" size={13} style={{ color: "#8B1A2F" }} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {user.role === "teacher" && <AddBtn label="Добавить задание" onClick={openAdd} />}

      {showAdd && (
        <Modal title={editing ? "Редактировать ДЗ" : "Новое задание"} onClose={() => setShowAdd(false)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Предмет"><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Математика" required /></Field>
            <Field label="Задание"><Textarea rows={4} value={form.task} onChange={e => setForm(f => ({ ...f, task: e.target.value }))} placeholder="Опишите задание..." required /></Field>
            <Field label="Срок сдачи"><Input value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} placeholder="14 мая" required /></Field>
            <SaveBtn loading={saving} />
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Grades Tab ────────────────────────────────────────────
function GradesTab({ cls, user }: { cls: SchoolClass; user: User }) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ student_id: "", subject: "", grade: "5", comment: "", grade_date: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const query = user.role === "parent" && user.child_id ? `student_id=${user.child_id}` : `class_id=${cls.id}`;
    const [g, s] = await Promise.all([
      api(`get_grades&${query}`),
      user.role === "teacher" ? api(`get_students&class_id=${cls.id}`) : Promise.resolve([]),
    ]);
    if (Array.isArray(g)) setGrades(g);
    if (Array.isArray(s)) setStudents(s);
    setLoading(false);
  }, [cls.id, user]);

  useEffect(() => { load(); }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await api("add_grade", "POST", { ...form, grade: Number(form.grade), teacher_id: user.id, class_id: cls.id });
    setSaving(false); setShowAdd(false); load();
  };

  const stats = [5, 4, 3, 2].map(g => ({ g, count: grades.filter(gr => gr.grade === g).length })).filter(x => x.count > 0);

  return (
    <div>
      <SectionTitle emoji="⭐" title={`Отметки · ${cls.display_name || cls.name}`} sub={user.role === "parent" ? user.child : undefined} />
      {!loading && stats.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {stats.map(({ g, count }) => (
            <div key={g} className={`px-4 py-2 rounded-2xl grade-${g} flex items-center gap-2`}>
              <span className="text-xl font-bold" style={{ fontFamily: "Cormorant, serif" }}>{g}</span>
              <span className="text-sm font-medium">× {count}</span>
            </div>
          ))}
        </div>
      )}
      {loading ? <Loader /> : (
        <div className="space-y-3">
          {grades.length === 0 && <Empty text="Отметок нет" />}
          {grades.map((g, i) => (
            <div key={g.id} className="flex items-start gap-3 p-4 rounded-2xl card-hover animate-slide-up"
              style={{ background: "white", border: "1.5px solid rgba(139,26,47,0.08)", animationDelay: `${i * 0.06}s`, opacity: 0 }}>
              <GradeBadge grade={g.grade} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-semibold text-sm" style={{ color: "#3D1520" }}>{g.subject}</span>
                  {user.role === "teacher" && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#F5E0E5", color: "#8B1A2F" }}>{g.student_name}</span>}
                </div>
                {g.comment && <p className="text-sm" style={{ color: "#9B6A7A" }}>{g.comment}</p>}
              </div>
              <span className="text-xs shrink-0" style={{ color: "#9B6A7A" }}>{g.grade_date}</span>
            </div>
          ))}
        </div>
      )}
      {user.role === "teacher" && (
        <>
          <AddBtn label="Поставить отметку" onClick={() => setShowAdd(true)} />
          {showAdd && (
            <Modal title="Новая отметка" onClose={() => setShowAdd(false)}>
              <form onSubmit={save} className="space-y-3">
                <Field label="Ученик">
                  <Select value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))} required>
                    <option value="">Выберите ученика</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </Select>
                </Field>
                <Field label="Предмет"><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Математика" required /></Field>
                <Field label="Отметка">
                  <Select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}>
                    {[5, 4, 3, 2, 1].map(g => <option key={g} value={g}>{g}</option>)}
                  </Select>
                </Field>
                <Field label="Комментарий"><Input value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} placeholder="Необязательно" /></Field>
                <Field label="Дата"><Input value={form.grade_date} onChange={e => setForm(f => ({ ...f, grade_date: e.target.value }))} placeholder="13 мая" required /></Field>
                <SaveBtn loading={saving} />
              </form>
            </Modal>
          )}
        </>
      )}
    </div>
  );
}

// ─── Files Tab ─────────────────────────────────────────────
function FilesTab({ cls }: { cls: SchoolClass }) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`get_files&class_id=${cls.id}`).then(data => {
      if (Array.isArray(data)) setFiles(data);
      setLoading(false);
    });
  }, [cls.id]);

  return (
    <div>
      <SectionTitle emoji="📎" title={`Файлы · ${cls.display_name || cls.name}`} sub={`${files.length} материалов`} />
      {loading ? <Loader /> : (
        <div className="space-y-3">
          {files.length === 0 && <Empty text="Файлы не загружены" />}
          {files.map((f, i) => (
            <div key={f.id} className="flex items-center gap-3 p-4 rounded-2xl card-hover animate-slide-up"
              style={{ background: "white", border: "1.5px solid rgba(139,26,47,0.08)", animationDelay: `${i * 0.07}s`, opacity: 0 }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: "#F5E0E5" }}>
                {f.name?.endsWith(".pdf") ? "📄" : f.name?.endsWith(".pptx") ? "📊" : "📝"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate" style={{ color: "#3D1520" }}>{f.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "#9B6A7A" }}>{f.teacher_name} · {f.upload_date} · {f.size_label}</p>
                <span className="text-xs px-2 py-0.5 rounded-full inline-block mt-1" style={{ background: "#F5E0E5", color: "#8B1A2F" }}>{f.subject}</span>
              </div>
              <button className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 hover:scale-110 transition-all"
                style={{ background: "linear-gradient(135deg, #5C0F1E, #8B1A2F)" }}>
                <Icon name="Download" size={15} style={{ color: "white" }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Recommendations Tab ───────────────────────────────────
function RecsTab({ cls, user }: { cls: SchoolClass; user: User }) {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ student_id: "", subject: "", text: "", rec_date: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const query = user.role === "parent" && user.child_id ? `student_id=${user.child_id}` : `class_id=${cls.id}`;
    const [r, s] = await Promise.all([
      api(`get_recommendations&${query}`),
      user.role === "teacher" ? api(`get_students&class_id=${cls.id}`) : Promise.resolve([]),
    ]);
    if (Array.isArray(r)) setRecs(r);
    if (Array.isArray(s)) setStudents(s);
    setLoading(false);
  }, [cls.id, user]);

  useEffect(() => { load(); }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await api("add_recommendation", "POST", { ...form, teacher_id: user.id, class_id: cls.id, teacher_name: user.display_name || user.login });
    setSaving(false); setShowAdd(false); load();
  };

  return (
    <div>
      <SectionTitle emoji="💬" title={`Рекомендации · ${cls.display_name || cls.name}`} sub={user.role === "parent" ? user.child : undefined} />
      {loading ? <Loader /> : (
        <div className="space-y-4">
          {recs.length === 0 && <Empty text="Рекомендаций нет" />}
          {recs.map((rec, i) => (
            <div key={rec.id} className="p-5 rounded-2xl card-hover animate-slide-up"
              style={{ background: "white", border: "1.5px solid rgba(139,26,47,0.08)", animationDelay: `${i * 0.08}s`, opacity: 0 }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-lg" style={{ background: "linear-gradient(135deg, #5C0F1E, #8B1A2F)" }}>👩‍🏫</div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: "#3D1520" }}>{rec.teacher_name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#F5E0E5", color: "#8B1A2F" }}>{rec.subject}</span>
                    {user.role === "teacher" && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(212,168,67,0.15)", color: "#7A5700" }}>{rec.student_name}</span>}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "#9B6A7A" }}>{rec.rec_date}</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#3D1520", lineHeight: 1.75 }}>{rec.text}</p>
            </div>
          ))}
        </div>
      )}
      {user.role === "teacher" && (
        <>
          <AddBtn label="Написать рекомендацию" onClick={() => setShowAdd(true)} />
          {showAdd && (
            <Modal title="Новая рекомендация" onClose={() => setShowAdd(false)}>
              <form onSubmit={save} className="space-y-3">
                <Field label="Ученик">
                  <Select value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))} required>
                    <option value="">Выберите ученика</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </Select>
                </Field>
                <Field label="Предмет"><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Математика" required /></Field>
                <Field label="Текст рекомендации"><Textarea rows={5} value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} placeholder="Напишите рекомендацию..." required /></Field>
                <Field label="Дата"><Input value={form.rec_date} onChange={e => setForm(f => ({ ...f, rec_date: e.target.value }))} placeholder="13 мая" required /></Field>
                <SaveBtn loading={saving} />
              </form>
            </Modal>
          )}
        </>
      )}
    </div>
  );
}

// ─── Parents Tab ──────────────────────────────────────────
interface Parent { id: number; login: string; display_name: string; child: string; child_id: number; }

function ParentsTab({ cls }: { cls: SchoolClass }) {
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ login: "", password: "", display_name: "", student_id: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [p, s] = await Promise.all([
      api(`get_parents&class_id=${cls.id}`),
      api(`get_students&class_id=${cls.id}`),
    ]);
    if (Array.isArray(p)) setParents(p);
    if (Array.isArray(s)) setStudents(s);
    setLoading(false);
  }, [cls.id]);

  useEffect(() => { load(); }, [load]);

  const removeParent = async (id: number) => {
    if (!confirm("Удалить профиль родителя? Родитель потеряет доступ к дневнику.")) return;
    await api("delete_parent", "POST", { parent_id: id });
    load();
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(""); setSaving(true);
    const res = await api("add_parent", "POST", { ...form, student_id: Number(form.student_id) });
    setSaving(false);
    if (res.error) { setSaveError(res.error); return; }
    setShowAdd(false);
    setForm({ login: "", password: "", display_name: "", student_id: "" });
    load();
  };

  return (
    <div>
      <SectionTitle emoji="👨‍👩‍👧" title={`Родители · ${cls.display_name || cls.name}`} sub={`${parents.length} профилей`} />
      {loading ? <Loader /> : (
        <div className="space-y-2">
          {parents.length === 0 && <Empty text="Родители не добавлены" />}
          {parents.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl animate-slide-up card-hover"
              style={{ background: "white", border: "1.5px solid rgba(139,26,47,0.08)", animationDelay: `${i * 0.05}s`, opacity: 0 }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 text-lg" style={{ background: "#F5E0E5" }}>👨‍👩‍👧</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm" style={{ color: "#3D1520" }}>{p.display_name || p.login}</p>
                <p className="text-xs mt-0.5" style={{ color: "#9B6A7A" }}>
                  Логин: <b style={{ color: "#8B1A2F" }}>{p.login}</b> · Ученик: {p.child}
                </p>
              </div>
              <button onClick={() => removeParent(p.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 shrink-0">
                <Icon name="Trash2" size={13} className="text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
      <AddBtn label="Добавить родителя" onClick={() => { setShowAdd(true); setSaveError(""); }} />

      {showAdd && (
        <Modal title="Новый профиль родителя" onClose={() => setShowAdd(false)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Ученик">
              <Select value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))} required>
                <option value="">Выберите ученика</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </Select>
            </Field>
            <Field label="Имя родителя">
              <Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} placeholder="Мария Петрова" />
            </Field>
            <Field label="Логин (для входа)">
              <Input value={form.login} onChange={e => setForm(f => ({ ...f, login: e.target.value }))} placeholder="petrov_mama" required />
            </Field>
            <Field label="Пароль">
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Минимум 6 символов" required />
            </Field>
            {saveError && (
              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(244,67,54,0.06)", border: "1px solid rgba(244,67,54,0.2)" }}>
                <Icon name="AlertCircle" size={14} className="text-red-500 shrink-0" />
                <span className="text-xs text-red-600">{saveError}</span>
              </div>
            )}
            <SaveBtn loading={saving} />
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Utils ─────────────────────────────────────────────────
function Loader() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(139,26,47,0.3)", borderTopColor: "#8B1A2F" }} />
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="py-10 text-center text-sm" style={{ color: "#9B6A7A" }}>{text}</div>;
}