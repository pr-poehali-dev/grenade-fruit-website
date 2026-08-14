import { useState, useEffect, useCallback, useMemo } from "react";
import Icon from "@/components/ui/icon";
import { exportWeekTemplateToPdf, exportTeacherScheduleToPdf } from "@/lib/exportSchedulePdf";

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
type Tab = "classes" | "parents" | "schedule" | "homework" | "grades" | "attendance" | "recommendations" | "my_schedule" | "extended_day";

interface User { id: number; login: string; role: Role; display_name: string; child?: string; child_id?: number; class_id?: number; email?: string; }
interface SchoolClass { id: number; name: string; grade: number; letter: string; display_name?: string; }
interface Student { id: number; full_name: string; class_id: number; class_name?: string; }
interface ScheduleItem { id: number; day_of_week: string; time_slot: string; subject: string; teacher_name: string; room: string; class_id: number; sort_order: number; }
interface Module { id: number; name: string; number: number; date_start: string; date_end: string; school_year: string; }
interface ScheduleDate { id: number; lesson_date: string; day_of_week: string; time_slot: string; subject: string; teacher_name: string; room: string; sort_order: number; }
interface Break { id: number; name: string; date_start: string; date_end: string; school_year: string; }
interface Holiday { id: number; name: string; holiday_date: string; school_year: string; cancels_lessons: boolean; }
interface Trip { id: number; class_id: number; name: string; description: string; trip_date: string; date_end: string; }
interface Attachment { name: string; url: string; type: "file" | "link"; }
interface Homework { id: number; subject: string; task: string; due_date: string; class_id: number; attachments?: Attachment[]; }
interface Grade { id: number; student_id: number; subject: string; grade: number; comment: string; grade_date: string; student_name: string; }
interface Attendance { id: number; student_id: number; subject: string; status: "absent" | "late"; comment: string; lesson_date: string; student_name: string; }
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl p-6 shadow-2xl animate-bounce-in max-h-[90vh] overflow-y-auto" style={{ background: "white" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5 sticky top-0 -mt-6 -mx-6 px-6 pt-6 pb-3" style={{ background: "white" }}>
          <h3 className="text-2xl font-bold" style={{ color: "#5C0F1E", fontFamily: "Cormorant, serif" }}>{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 shrink-0">
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
const TEACHERS = ["Елена Сергеевна", "Александр Валерьевич", "Лариса Ивановна", "Олеся Александровна", "Ирина Олеговна", "Любовь Александровна", "Вадим Игоревич", "Артем Сергеевич", "Светлана Владимировна", "Мария"];
const NOTIF_EMOJI: Record<string, string> = { grade: "⭐", homework: "📚", recommendation: "💬", file: "📎", attendance: "🚸" };

const ELECTIVE_SUBJECTS = ["Чистописание", "Китайский язык (факультатив)", "STEM (факультатив)", "ОФП (факультатив)", "Шоу-лаборатория (факультатив)", "Занимательный русский язык (факультатив)", "Мышематика (факультатив)", "История архитектуры (факультатив)"];

const SUBJECTS_BY_GRADE: Record<string, string[]> = {
  "1-2": ["Математика", "Русский язык", "Английский язык", "Естествознание", "Урок осознанности", "Классный час", "ЖЗЛ", "ИЗО", "Нейротренинг", "Чтение по программе", "История искусств", "Чтение современной литературы", ...ELECTIVE_SUBJECTS],
  "3-4": ["Математика", "Русский язык", "Чтение", "Биология", "География", "Астрономия", "Физика", "История искусств", "Английский язык", "Классный час", "Урок осознанности", "ЖЗЛ", "Нейротренинг", ...ELECTIVE_SUBJECTS],
  "5-6": ["Математика", "Русский язык", "Литература", "Английский язык", "История", "Биология", "География", "Геометрия", "Физика+химия", "Классный час", "Самопознание", "Проект", "Нейротренинг", ...ELECTIVE_SUBJECTS],
  "7":   ["Алгебра", "Геометрия", "Русский язык", "Литература", "Английский язык", "История", "Биология", "География", "Химия", "Физика", "Классный час", "Проект", "Самопознание", ...ELECTIVE_SUBJECTS],
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
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [showAndroidHint, setShowAndroidHint] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
    if (isStandalone) setInstalled(true);
    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !(window as any).MSStream;
    setIsIos(ios);
    const onBeforeInstall = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    const onInstalled = () => { setInstalled(true); setInstallPrompt(null); };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) { setShowAndroidHint(true); return; }
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

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
        <img src="https://cdn.poehali.dev/projects/216115a8-6f23-4b25-a72a-91c740414743/bucket/4acd2a27-d58c-489e-8d93-6605b927987f.jpg" className="w-full h-full object-cover" alt="" />
      </div>

      <div className="w-full max-w-sm animate-slide-up" style={{ position: "relative", zIndex: 10 }}>
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 animate-pulse-glow" style={{ background: "#ffffff" }}>
            <img src="https://cdn.poehali.dev/projects/216115a8-6f23-4b25-a72a-91c740414743/bucket/4acd2a27-d58c-489e-8d93-6605b927987f.jpg" className="w-12 h-12 object-contain" alt="гранат" />
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
            <SaveBtn label={loading ? "Входим..." : "Войти в дневник"} loading={loading} />
          </form>
          {!isIos && !installed && (
            <>
              <button onClick={install} type="button"
                className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: "#F5E0E5", color: "#8B1A2F" }}>
                <Icon name="Download" size={15} /> Установить приложение
              </button>
              {showAndroidHint && (
                <div className="mt-3 p-3.5 rounded-xl text-xs leading-relaxed" style={{ background: "#FDF6EE", border: "1px solid rgba(139,26,47,0.15)", color: "#5C0F1E" }}>
                  <p className="font-medium mb-2" style={{ color: "#8B1A2F" }}>Установка приложения:</p>
                  <ol className="space-y-1.5">
                    <li className="flex items-center gap-1.5">
                      1. Откройте меню <Icon name="MoreVertical" size={13} /> в браузере
                    </li>
                    <li>2. Выберите «Установить приложение» или «Добавить на главный экран»</li>
                  </ol>
                </div>
              )}
            </>
          )}
          {isIos && !installed && (
            <>
              <button onClick={() => setShowIosHint(true)} type="button"
                className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: "#F5E0E5", color: "#8B1A2F" }}>
                <Icon name="Download" size={15} /> Установить приложение
              </button>
              {showIosHint && (
                <div className="mt-3 p-3.5 rounded-xl text-xs leading-relaxed" style={{ background: "#FDF6EE", border: "1px solid rgba(139,26,47,0.15)", color: "#5C0F1E" }}>
                  <p className="font-medium mb-2" style={{ color: "#8B1A2F" }}>Установка на iPhone/iPad:</p>
                  <ol className="space-y-1.5">
                    <li className="flex items-center gap-1.5">
                      1. Нажмите <Icon name="Share" size={13} /> «Поделиться» внизу Safari
                    </li>
                    <li>2. Выберите «На экран «Домой»»</li>
                    <li>3. Нажмите «Добавить»</li>
                  </ol>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────
export default function Index() {
  const [user, setUser] = useState<User | null>(() => {
    try { const s = localStorage.getItem("school_user"); return s ? JSON.parse(s) : null; } catch { return null; }
  });

  const login = (u: User) => { localStorage.setItem("school_user", JSON.stringify(u)); setUser(u); };
  const logout = () => { localStorage.removeItem("school_user"); setUser(null); };
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

  // Раз в сутки — сводка по email родителям с новыми оценками/ДЗ
  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = "digest_triggered_" + today;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    api("run_daily_digest", "POST", {});
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

  const [exportingMySchedule, setExportingMySchedule] = useState(false);
  const exportMySchedule = async () => {
    if (!user) return;
    const teacherName = user.display_name || user.login;
    setExportingMySchedule(true);
    try {
      const data = await api(`get_schedule&teacher_name=${encodeURIComponent(teacherName)}`);
      const rows: { day_of_week: string; time_slot: string; subject: string; room: string; class_id: number; class_display_name?: string }[] = Array.isArray(data) ? data : [];
      const classById = new Map(classes.map(c => [c.id, c.display_name || c.name]));
      const lessonsByDayOfWeek: Record<string, { time_slot: string; subject: string; class_name: string; room: string }[]> = {};
      rows.forEach(r => {
        const day = r.day_of_week;
        if (!lessonsByDayOfWeek[day]) lessonsByDayOfWeek[day] = [];
        lessonsByDayOfWeek[day].push({
          time_slot: r.time_slot,
          subject: r.subject,
          class_name: r.class_display_name || classById.get(r.class_id) || "—",
          room: r.room,
        });
      });
      exportTeacherScheduleToPdf(teacherName, lessonsByDayOfWeek);
    } finally {
      setExportingMySchedule(false);
    }
  };

  if (!user) return <LoginScreen onLogin={login} />;

  // Классы отсортированные по параллели
  const sortedClasses = [...classes].sort((a, b) => a.grade - b.grade);

  const NAV = [
    { id: "schedule" as Tab, label: "Расписание", emoji: "📅" },
    { id: "homework" as Tab, label: "ДЗ", emoji: "📚" },
    { id: "grades" as Tab, label: "Отметки", emoji: "⭐" },
    { id: "attendance" as Tab, label: "Явка", emoji: "🚸" },
    { id: "recommendations" as Tab, label: "Советы", emoji: "💬" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#FDF6EE" }}>
      {SEEDS.map((s, i) => <Seed key={i} {...s} />)}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ background: "rgba(253,246,238,0.93)", backdropFilter: "blur(12px)", borderColor: "rgba(139,26,47,0.12)" }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "#ffffff" }}>
              <img src="https://cdn.poehali.dev/projects/216115a8-6f23-4b25-a72a-91c740414743/bucket/4acd2a27-d58c-489e-8d93-6605b927987f.jpg" className="w-5 h-5 object-contain" alt="гранат" />
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
              <button onClick={exportMySchedule} disabled={exportingMySchedule}
                title="Скачать моё расписание в PDF"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-wait"
                style={{ background: "#F5E0E5", color: "#8B1A2F" }}>
                <Icon name={exportingMySchedule ? "Loader2" : "FileDown"} size={13} className={exportingMySchedule ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Моё расписание</span>
              </button>
            )}
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
                    <button
                      onClick={() => { setSelectedClass(null); goTab("extended_day"); setShowClassPicker(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-pink-50 transition-colors flex items-center gap-1.5"
                      style={{ color: tab === "extended_day" ? "#8B1A2F" : "#3D1520", fontWeight: tab === "extended_day" ? 700 : 500, borderTop: "1px solid rgba(139,26,47,0.08)" }}>
                      <Icon name="Sun" size={13} /> Продлёнка
                    </button>
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
            <button onClick={logout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium" style={{ background: "#F5E0E5", color: "#8B1A2F" }}>
              <Icon name="LogOut" size={13} /> Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-5 flex gap-5">
        {/* Left sidebar: class picker */}
        <aside className="w-44 shrink-0 hidden md:block">
          <div className="sticky top-20 space-y-4">
            {/* Моё расписание */}
            {user.role === "teacher" && (
              <div>
                <button onClick={() => { setSelectedClass(null); goTab("my_schedule"); }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] flex items-center gap-2"
                  style={{
                    background: tab === "my_schedule" ? "linear-gradient(135deg, #5C0F1E, #8B1A2F)" : "white",
                    color: tab === "my_schedule" ? "white" : "#3D1520",
                    border: "1.5px solid rgba(139,26,47,0.12)",
                    boxShadow: tab === "my_schedule" ? "0 4px 12px rgba(139,26,47,0.25)" : "none",
                  }}>
                  <Icon name="CalendarDays" size={15} /> Моё расписание
                </button>
              </div>
            )}
            {/* Классы */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: "#9B6A7A" }}>Классы</p>
              <div className="space-y-1">
                {sortedClasses.map(cl => (
                  <button key={cl.id} onClick={() => { setSelectedClass(cl); goTab("schedule"); }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
                    style={{
                      background: tab !== "my_schedule" && tab !== "extended_day" && selectedClass?.id === cl.id ? "linear-gradient(135deg, #5C0F1E, #8B1A2F)" : "white",
                      color: tab !== "my_schedule" && tab !== "extended_day" && selectedClass?.id === cl.id ? "white" : "#3D1520",
                      border: "1.5px solid rgba(139,26,47,0.12)",
                      boxShadow: tab !== "my_schedule" && tab !== "extended_day" && selectedClass?.id === cl.id ? "0 4px 12px rgba(139,26,47,0.25)" : "none",
                    }}>
                    {cl.display_name || `${cl.grade} класс`}
                  </button>
                ))}
                {user.role === "teacher" && (
                  <button onClick={() => { setSelectedClass(null); goTab("extended_day"); }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] flex items-center gap-2"
                    style={{
                      background: tab === "extended_day" ? "linear-gradient(135deg, #5C0F1E, #8B1A2F)" : "white",
                      color: tab === "extended_day" ? "white" : "#3D1520",
                      border: "1.5px solid rgba(139,26,47,0.12)",
                      boxShadow: tab === "extended_day" ? "0 4px 12px rgba(139,26,47,0.25)" : "none",
                    }}>
                    <Icon name="Sun" size={15} /> Продлёнка
                  </button>
                )}
              </div>
            </div>
            {/* Гранат */}
            <img src="https://cdn.poehali.dev/projects/216115a8-6f23-4b25-a72a-91c740414743/files/e2a1af37-06ef-4ec7-a9e7-6f0549e28cfc.jpg"
              className="w-full rounded-2xl object-cover" style={{ opacity: 0.6, maxHeight: 120, boxShadow: "0 4px 16px rgba(139,26,47,0.15)" }} alt="" />
          </div>
        </aside>

        {/* Main area */}
        <div className="flex-1 min-w-0 pb-24 md:pb-0">
          {tab === "my_schedule" && user.role === "teacher" ? (
            <MyScheduleTab user={user} classes={classes} />
          ) : tab === "extended_day" && user.role === "teacher" ? (
            <ExtendedDayTab classes={classes} />
          ) : !selectedClass ? (
            /* No class selected */
            <div className="flex flex-col items-center justify-center min-h-64 text-center">
              <div className="text-6xl mb-4">🍎</div>
              <h2 className="text-3xl font-bold mb-2" style={{ color: "#5C0F1E", fontFamily: "Cormorant, serif" }}>Выберите класс</h2>
              <p className="text-sm" style={{ color: "#9B6A7A" }}>Нажмите на класс в панели слева</p>
              {user.role === "teacher" && (
                <button onClick={() => goTab("my_schedule")}
                  className="mt-4 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: "#F5E0E5", color: "#8B1A2F" }}>
                  <Icon name="CalendarDays" size={15} /> Моё расписание
                </button>
              )}
              {/* Mobile class picker */}
              <div className="mt-6 flex flex-col gap-2 w-full max-w-xs md:hidden">
                {sortedClasses.map(cl => (
                  <button key={cl.id} onClick={() => { setSelectedClass(cl); goTab("schedule"); }}
                    className="py-2.5 px-4 rounded-xl text-sm font-medium text-left"
                    style={{ background: "white", color: "#3D1520", border: "1.5px solid rgba(139,26,47,0.12)" }}>
                    {cl.display_name || `${cl.grade} класс`}
                  </button>
                ))}
                {user.role === "teacher" && (
                  <button onClick={() => { setSelectedClass(null); goTab("extended_day"); }}
                    className="py-2.5 px-4 rounded-xl text-sm font-medium text-left flex items-center gap-1.5"
                    style={{ background: "white", color: "#3D1520", border: "1.5px solid rgba(139,26,47,0.12)" }}>
                    <Icon name="Sun" size={15} /> Продлёнка
                  </button>
                )}
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
                {tab === "attendance" && <AttendanceTab cls={selectedClass} user={user} />}
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
              <button onClick={() => { setSelectedClass(null); goTab("my_schedule"); }} className="flex flex-col items-center gap-0.5 px-1" style={{ color: tab === "my_schedule" ? "#8B1A2F" : "#9B6A7A" }}>
                <span className="text-xl">🗓</span>
                <span className="text-xs">Моё</span>
              </button>
              <button onClick={() => goTab("classes")} className="flex flex-col items-center gap-0.5 px-1" style={{ color: tab === "classes" ? "#8B1A2F" : "#9B6A7A" }}>
                <span className="text-xl">👥</span>
                <span className="text-xs">Ученики</span>
              </button>
              <button onClick={() => goTab("parents")} className="flex flex-col items-center gap-0.5 px-1" style={{ color: tab === "parents" ? "#8B1A2F" : "#9B6A7A" }}>
                <span className="text-xl">👨‍👩‍👧</span>
                <span className="text-xs">Родители</span>
              </button>
              <button onClick={() => { setSelectedClass(null); goTab("extended_day"); }} className="flex flex-col items-center gap-0.5 px-1" style={{ color: tab === "extended_day" ? "#8B1A2F" : "#9B6A7A" }}>
                <span className="text-xl">☀️</span>
                <span className="text-xs">Продлёнка</span>
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
  const [form, setForm] = useState({ day_of_week: "Понедельник", time_slot: "09:00–09:40", subject: "", teacher_name: "", room: "", event_type: "lesson", event_name: "", event_description: "", event_date: "" });
  const [savingItem, setSavingItem] = useState(false);

  // Module calendar state
  const [schedDates, setSchedDates] = useState<ScheduleDate[]>([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [savingModule, setSavingModule] = useState(false);

  // Single day-lesson edit/add (module calendar view)
  const [showDateLessonForm, setShowDateLessonForm] = useState(false);
  const [editingDateLesson, setEditingDateLesson] = useState<ScheduleDate | null>(null);
  const [dateLessonForm, setDateLessonForm] = useState({ lesson_date: "", time_slot: "", subject: "", teacher_name: "", room: "" });
  const [savingDateLesson, setSavingDateLesson] = useState(false);

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
        const todayIso = new Date().toISOString().split("T")[0];
        const current = data.find((m: Module) => todayIso >= m.date_start && todayIso <= m.date_end);
        setSelectedModule(current || data[0] || null);
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

  // Уроки можно добавлять только начиная со 2 сентября (после летних каникул)
  const NEW_SCHOOL_YEAR_START = "2026-09-02";
  const isLessonDateAllowed = (dateIso: string) => !dateIso || (dateIso >= NEW_SCHOOL_YEAR_START && !breakDates.has(dateIso));

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.event_type === "lesson" && !editing && !isLessonDateAllowed(form.event_date)) {
      alert("Уроки можно добавлять только начиная со 2 сентября — с 31 мая по 1 сентября летние каникулы");
      return;
    }
    setSavingItem(true);
    if (form.event_type === "trip") {
      await api("add_trip", "POST", { name: form.event_name, description: form.event_description, trip_date: form.event_date, date_end: form.event_date, class_id: cls.id });
      loadBreaksHolidays();
    } else if (form.event_type === "holiday") {
      await api("add_holiday", "POST", { name: form.event_name, holiday_date: form.event_date });
      loadBreaksHolidays();
    } else {
      if (editing) await api("update_schedule", "POST", { ...form, id: editing.id });
      else await api("add_schedule", "POST", { ...form, class_id: cls.id });
      loadWeek();
    }
    setSavingItem(false); setShowAdd(false);
  };

  const delItem = async (id: number) => {
    await api("delete_schedule", "POST", { id });
    loadWeek();
  };

  const exportSchedulePdf = async () => {
    let moduleDates: ScheduleDate[] = schedDates;
    if (selectedModule && (view !== "module" || schedDates.length === 0)) {
      const data = await api(`get_schedule_dates&class_id=${cls.id}&module_id=${selectedModule.id}`);
      if (Array.isArray(data)) moduleDates = data;
    }

    const lessonsByDayOfWeek: Record<string, { time_slot: string; subject: string; teacher_name: string; room: string }[]> = {};
    DAYS.forEach(day => {
      const fromModule = moduleDates.filter(s => s.day_of_week === day);
      const seen = new Set<string>();
      const uniqueLessons = fromModule
        .filter(l => {
          const key = `${l.time_slot}|${l.subject}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => a.time_slot.localeCompare(b.time_slot));

      lessonsByDayOfWeek[day] = uniqueLessons.length > 0
        ? uniqueLessons
        : items.filter(i => i.day_of_week === day).sort((a, b) => a.sort_order - b.sort_order);
    });

    exportWeekTemplateToPdf({ displayName: cls.display_name || cls.name }, selectedModule?.name, lessonsByDayOfWeek);
  };

  // Single date-lesson helpers (module calendar view)
  const openAddDateLesson = (date: string) => {
    setEditingDateLesson(null);
    setDateLessonForm({ lesson_date: date, time_slot: "", subject: "", teacher_name: "", room: "" });
    setShowDateLessonForm(true);
  };

  const openEditDateLesson = (lesson: ScheduleDate) => {
    setEditingDateLesson(lesson);
    setDateLessonForm({ lesson_date: lesson.lesson_date, time_slot: lesson.time_slot, subject: lesson.subject, teacher_name: lesson.teacher_name, room: lesson.room });
    setShowDateLessonForm(true);
  };

  const saveDateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDateLesson(true);
    if (editingDateLesson) {
      await api("update_schedule_date", "POST", { id: editingDateLesson.id, ...dateLessonForm });
    } else {
      await api("add_schedule_date", "POST", { ...dateLessonForm, class_id: cls.id, module_id: selectedModule?.id });
    }
    setSavingDateLesson(false);
    setShowDateLessonForm(false);
    setEditingDateLesson(null);
    if (selectedModule) loadDates(selectedModule.id);
    loadWeekDates();
  };

  const deleteDateLesson = async (id: number) => {
    if (!confirm("Удалить этот урок?")) return;
    await api("delete_schedule_date", "POST", { id });
    if (selectedModule) loadDates(selectedModule.id);
    loadWeekDates();
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

  // Открываем форму заполнения модуля, подставляя уже выставленное расписание
  const openModuleForm = () => {
    if (schedDates.length > 0) {
      const byDay: Record<string, LessonSlot[]> = {};
      DAYS.forEach(d => {
        const datesForDay = Array.from(new Set(schedDates.filter(s => s.day_of_week === d).map(s => s.lesson_date))).sort();
        if (datesForDay.length > 0) {
          const lessons = schedDates
            .filter(s => s.day_of_week === d && s.lesson_date === datesForDay[0])
            .sort((a, b) => a.sort_order - b.sort_order);
          byDay[d] = lessons.length > 0
            ? lessons.map(l => ({ time_slot: l.time_slot, subject: l.subject, teacher_name: l.teacher_name, room: l.room }))
            : [emptySlot()];
        } else {
          byDay[d] = [emptySlot()];
        }
      });
      setWeeklyTemplate(byDay);
    } else {
      setWeeklyTemplate(Object.fromEntries(DAYS.map(d => [d, [emptySlot()]])));
    }
    setShowModuleForm(true);
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
  const [editingBreak, setEditingBreak] = useState<Break | null>(null);
  const [newHoliday, setNewHoliday] = useState({ name: "", holiday_date: "", cancels_lessons: true });
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [newTrip, setNewTrip] = useState({ name: "", description: "", trip_date: "", date_end: "" });
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
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
  const holidayCancelDates = new Set(holidays.filter(h => h.cancels_lessons).map(h => h.holiday_date));
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

  const saveBreakEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBreak) return;
    setSavingBreak(true);
    await api("update_break", "POST", { id: editingBreak.id, name: editingBreak.name, date_start: editingBreak.date_start, date_end: editingBreak.date_end });
    setSavingBreak(false);
    setEditingBreak(null);
    loadBreaksHolidays();
  };

  const removeBreak = async (id: number) => {
    await api("delete_break", "POST", { id });
    loadBreaksHolidays();
  };

  const addHoliday = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingHoliday(true);
    await api("add_holiday", "POST", newHoliday);
    setNewHoliday({ name: "", holiday_date: "", cancels_lessons: true });
    setSavingHoliday(false);
    loadBreaksHolidays();
  };

  const saveHolidayEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHoliday) return;
    setSavingHoliday(true);
    await api("update_holiday", "POST", { id: editingHoliday.id, name: editingHoliday.name, holiday_date: editingHoliday.holiday_date, cancels_lessons: editingHoliday.cancels_lessons });
    setSavingHoliday(false);
    setEditingHoliday(null);
    loadBreaksHolidays();
  };

  const removeHoliday = async (id: number) => {
    if (!confirm("Отменить праздник? Уроки в этот день вернутся в расписание.")) return;
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

  const saveTripEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrip) return;
    setSavingTrip(true);
    await api("update_trip", "POST", { id: editingTrip.id, name: editingTrip.name, description: editingTrip.description, trip_date: editingTrip.trip_date, date_end: editingTrip.date_end || editingTrip.trip_date });
    setSavingTrip(false);
    setEditingTrip(null);
    loadBreaksHolidays();
  };

  const removeTrip = async (id: number) => {
    if (!confirm("Отменить выезд?")) return;
    await api("delete_trip", "POST", { id });
    loadBreaksHolidays();
  };

  useEffect(() => { loadBreaksHolidays(); }, []);

  return (
    <div>
      <SectionTitle emoji="📅" title={`Расписание · ${cls.display_name || cls.name}`} />

      {/* View toggle */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="flex gap-2 flex-1">
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
        <button
          onClick={exportSchedulePdf}
          title="Скачать расписание на неделю в PDF"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80 shrink-0"
          style={{ background: "white", color: "#8B1A2F", border: "1.5px solid rgba(139,26,47,0.2)" }}>
          <Icon name="FileDown" size={15} /> Экспорт PDF
        </button>
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
                  const isHolidayCancels = holidayCancelDates.has(iso);
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
                        {user.role === "teacher" && !isBreakDay && (
                          <button onClick={() => { setEditing(null); setForm({ day_of_week: dayName, time_slot: "08:00–08:45", subject: "", teacher_name: "", room: "", event_type: "lesson", event_name: "", event_description: "", event_date: iso }); setShowAdd(true); }}
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
                          <span className="text-xs font-medium flex-1" style={{ color: isBreakDay ? "#7A5700" : "#2E7D32" }}>
                            {isHolidayDay ? holiday?.name : (breakItem?.name || "Каникулы")}
                            {isHolidayDay && !isHolidayCancels && <span className="font-normal" style={{ color: "#5B8D63" }}> · уроки по расписанию</span>}
                          </span>
                          {user.role === "teacher" && isHolidayDay && holiday && (
                            <button onClick={() => removeHoliday(holiday.id)}
                              className="flex items-center gap-1 px-2 h-6 rounded-lg hover:bg-red-50 shrink-0 text-xs font-medium text-red-400">
                              <Icon name="X" size={12} /> Отменить
                            </button>
                          )}
                        </div>
                      )}

                      {/* Trip event */}
                      {isTripDay && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-1"
                          style={{ background: "rgba(33,150,243,0.07)", border: "1.5px solid rgba(33,150,243,0.2)" }}>
                          <span>🚌</span>
                          <div className="flex-1">
                            <span className="text-xs font-medium" style={{ color: "#1565C0" }}>{trip?.name}</span>
                            {trip?.description && <span className="text-xs ml-1" style={{ color: "#5B8DB8" }}>· {trip.description}</span>}
                          </div>
                          {user.role === "teacher" && trip && (
                            <button onClick={() => removeTrip(trip.id)}
                              className="flex items-center gap-1 px-2 h-6 rounded-lg hover:bg-red-50 shrink-0 text-xs font-medium text-red-400">
                              <Icon name="X" size={12} /> Отменить
                            </button>
                          )}
                        </div>
                      )}

                      {/* Lessons (not shown on full-day breaks or lesson-cancelling holidays) */}
                      {!isBreakDay && !(isHolidayDay && isHolidayCancels) && (
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
                                {lesson.time_slot === "13:40–14:20" && (
                                  <span className="text-xs px-2 py-1 rounded-lg shrink-0" style={{ background: "rgba(212,168,67,0.12)", color: "#7A5700" }}>🚪 {lesson.room}</span>
                                )}
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
                  <button onClick={openModuleForm}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                    style={{ background: "linear-gradient(135deg, #5C0F1E, #8B1A2F)", color: "white" }}>
                    <Icon name="CalendarPlus" size={13} /> {schedDates.length > 0 ? "Изменить расписание" : "Заполнить модуль"}
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
                    const isHolidayCancels = holidayCancelDates.has(date);
                    const isTrip = tripDates.has(date);
                    const holiday = holidays.find(h => h.holiday_date === date);
                    const trip = trips.find(t => {
                      const s = t.trip_date, e = t.date_end || t.trip_date;
                      return date >= s && date <= e;
                    });
                    const isSpecial = isBreak || (isHoliday && isHolidayCancels);

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
                          {user.role === "teacher" && isHoliday && holiday && (
                            <button onClick={() => removeHoliday(holiday.id)}
                              className="flex items-center gap-1 px-2 h-6 rounded-lg hover:bg-red-50 shrink-0 text-xs font-medium text-red-400">
                              <Icon name="X" size={12} /> Отменить
                            </button>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div key={date}>
                        <div className="w-full flex items-center gap-2 rounded-2xl transition-all"
                          style={{
                            background: isToday(date) ? "linear-gradient(135deg, #5C0F1E, #8B1A2F)" : active ? "#F5E0E5" : "white",
                            border: `1.5px solid ${isToday(date) ? "transparent" : "rgba(139,26,47,0.1)"}`,
                          }}>
                          <button
                            onClick={() => setSelectedDate(active ? null : date)}
                            className="flex-1 flex items-center gap-3 p-3 rounded-2xl transition-all hover:opacity-90 text-left">
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
                              {isHoliday && !isHolidayCancels && holiday && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mr-1"
                                  style={{ background: "rgba(76,175,80,0.15)", color: "#2E7D32" }}>
                                  🎉 {holiday.name}
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
                          {user.role === "teacher" && (
                            <div className="flex items-center gap-1 mr-3 shrink-0">
                              <button
                                onClick={() => openAddDateLesson(date)}
                                title="Добавить урок на этот день"
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                style={{ background: isToday(date) ? "rgba(255,255,255,0.15)" : "#F5E0E5" }}>
                                <Icon name="CalendarPlus" size={14} style={{ color: isToday(date) ? "white" : "#8B1A2F" }} />
                              </button>
                              <button
                                onClick={() => { setEditing(null); setForm({ day_of_week: formatDay(date), time_slot: "09:00–09:40", subject: "", teacher_name: "", room: "", event_type: "trip", event_name: "", event_description: "", event_date: date }); setShowAdd(true); }}
                                title="Добавить выезд или праздник"
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                style={{ background: isToday(date) ? "rgba(255,255,255,0.15)" : "#F5E0E5" }}>
                                <Icon name="Plus" size={14} style={{ color: isToday(date) ? "white" : "#8B1A2F" }} />
                              </button>
                            </div>
                          )}
                        </div>

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
                                {l.time_slot === "13:40–14:20" && (
                                  <span className="text-xs px-2 py-0.5 rounded-lg shrink-0" style={{ background: "rgba(212,168,67,0.12)", color: "#7A5700" }}>🚪 {l.room}</span>
                                )}
                                {user.role === "teacher" && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => openEditDateLesson(l)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100">
                                      <Icon name="Pencil" size={13} style={{ color: "#8B1A2F" }} />
                                    </button>
                                    <button onClick={() => deleteDateLesson(l.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50">
                                      <Icon name="Trash2" size={13} className="text-red-400" />
                                    </button>
                                  </div>
                                )}
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

      {/* ── MODAL: edit/add single lesson for a specific date (module calendar) ── */}
      {showDateLessonForm && (
        <Modal title={editingDateLesson ? "Редактировать урок" : "Добавить урок"} onClose={() => setShowDateLessonForm(false)}>
          <form onSubmit={saveDateLesson} className="space-y-3">
            <Field label="Дата">
              <Input type="date" value={dateLessonForm.lesson_date} onChange={e => setDateLessonForm(f => ({ ...f, lesson_date: e.target.value }))} required disabled={!!editingDateLesson} />
            </Field>
            <Field label="Время">
              <Select value={dateLessonForm.time_slot} onChange={e => setDateLessonForm(f => ({ ...f, time_slot: e.target.value }))} required>
                <option value="">— Выберите время —</option>
                {["09:00–09:40","10:00–10:40","10:50–11:30","12:00–12:40","12:50–13:30","13:40–14:20","15:30–16:30"].map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Предмет">
              <Select value={dateLessonForm.subject} onChange={e => setDateLessonForm(f => ({ ...f, subject: e.target.value }))} required>
                <option value="">— Выберите предмет —</option>
                {getSubjectsByGrade(cls.grade).map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Учитель">
              <Select value={dateLessonForm.teacher_name} onChange={e => setDateLessonForm(f => ({ ...f, teacher_name: e.target.value }))} required>
                <option value="">— Выберите педагога —</option>
                {TEACHERS.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Кабинет"><Input value={dateLessonForm.room} onChange={e => setDateLessonForm(f => ({ ...f, room: e.target.value }))} placeholder="305" required /></Field>
            <SaveBtn label={savingDateLesson ? "Сохраняем..." : "Сохранить"} loading={savingDateLesson} />
          </form>
        </Modal>
      )}

      {/* ── MODAL: edit/add single lesson / trip / holiday (week view) ── */}
      {showAdd && (
        <Modal title={editing ? "Редактировать урок" : "Добавить в расписание"} onClose={() => setShowAdd(false)}>
          <form onSubmit={saveItem} className="space-y-3">
            {!editing && (
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl" style={{ background: "#F5E0E5" }}>
                {[{ val: "lesson", label: "📚 Урок", disabled: !isLessonDateAllowed(form.event_date) }, { val: "trip", label: "🚌 Выезд", disabled: false }, { val: "holiday", label: "🎉 Праздник", disabled: false }].map(({ val, label, disabled }) => (
                  <button key={val} type="button" disabled={disabled} onClick={() => setForm(f => ({ ...f, event_type: val }))}
                    className="py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: form.event_type === val ? "#8B1A2F" : "transparent", color: form.event_type === val ? "white" : "#8B1A2F" }}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {form.event_type === "lesson" && !isLessonDateAllowed(form.event_date) && (
              <p className="text-xs px-3 py-2 rounded-xl" style={{ background: "rgba(212,168,67,0.12)", color: "#7A5700" }}>
                🏖 Уроки можно добавлять только со 2 сентября — с 31 мая по 1 сентября летние каникулы
              </p>
            )}

            {form.event_type === "lesson" && (<>
              <Field label="День недели">
                <Select value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value }))}>
                  {DAYS.map(d => <option key={d}>{d}</option>)}
                </Select>
              </Field>
              <Field label="Время">
                <Select value={form.time_slot} onChange={e => setForm(f => ({ ...f, time_slot: e.target.value }))} required>
                  <option value="">— Выберите время —</option>
                  {["09:00–09:40","10:00–10:40","10:50–11:30","12:00–12:40","12:50–13:30","13:40–14:20","15:30–16:30"].map(t => <option key={t} value={t}>{t}</option>)}
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
            </>)}

            {form.event_type === "trip" && (<>
              <Field label="Название выезда"><Input value={form.event_name} onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))} placeholder="Поход в театр" required /></Field>
              <Field label="Описание (необязательно)"><Input value={form.event_description} onChange={e => setForm(f => ({ ...f, event_description: e.target.value }))} placeholder="Театр им. Пушкина" /></Field>
              <Field label="Дата"><Input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} required /></Field>
            </>)}

            {form.event_type === "holiday" && (<>
              <Field label="Название праздника"><Input value={form.event_name} onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))} placeholder="День Победы" required /></Field>
              <Field label="Дата"><Input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} required /></Field>
            </>)}

            <SaveBtn loading={savingItem} />
          </form>
        </Modal>
      )}

      {/* ── MODAL: fill module schedule ── */}
      {showModuleForm && selectedModule && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowModuleForm(false)}>
          <div className="w-full max-w-2xl rounded-3xl p-6 shadow-2xl my-4 max-h-[90vh] overflow-y-auto" style={{ background: "white" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5 sticky top-0 -mt-6 -mx-6 px-6 pt-6 pb-3 z-10" style={{ background: "white" }}>
              <div>
                <h3 className="text-2xl font-bold" style={{ color: "#5C0F1E", fontFamily: "Cormorant, serif" }}>Расписание на {selectedModule.name}</h3>
                <p className="text-sm mt-0.5" style={{ color: "#9B6A7A" }}>Заполните шаблон недели — он применится на все дни модуля</p>
              </div>
              <button onClick={() => setShowModuleForm(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 shrink-0">
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
                          {["09:00–09:40","10:00–10:40","10:50–11:30","12:00–12:40","12:50–13:30","13:40–14:20","15:30–16:30"].map(t => <option key={t} value={t}>{t}</option>)}
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
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowModuleEditor(false)}>
          <div className="w-full max-w-lg rounded-3xl p-6 shadow-2xl my-4 max-h-[90vh] overflow-y-auto" style={{ background: "white" }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4 sticky top-0 -mt-6 -mx-6 px-6 pt-6 pb-3 z-10" style={{ background: "white" }}>
              <h3 className="text-2xl font-bold" style={{ color: "#5C0F1E", fontFamily: "Cormorant, serif" }}>Учебный год</h3>
              <button onClick={() => setShowModuleEditor(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 shrink-0">
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
                    <div key={b.id}>
                      {editingBreak?.id === b.id ? (
                        <form onSubmit={saveBreakEdit} className="p-3 rounded-xl space-y-2" style={{ background: "#FDF6EE", border: "1.5px solid rgba(139,26,47,0.25)" }}>
                          <Input value={editingBreak.name} onChange={e => setEditingBreak(v => v ? { ...v, name: e.target.value } : v)} placeholder="Название каникул" required />
                          <div className="grid grid-cols-2 gap-2">
                            <Field label="Начало"><Input type="date" value={editingBreak.date_start} onChange={e => setEditingBreak(v => v ? { ...v, date_start: e.target.value } : v)} required /></Field>
                            <Field label="Конец"><Input type="date" value={editingBreak.date_end} onChange={e => setEditingBreak(v => v ? { ...v, date_end: e.target.value } : v)} required /></Field>
                          </div>
                          <div className="flex gap-2">
                            <SaveBtn label={savingBreak ? "Сохраняем..." : "Сохранить"} loading={savingBreak} />
                            <button type="button" onClick={() => setEditingBreak(null)} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: "#9B6A7A" }}>Отмена</button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#FDF6EE", border: "1.5px solid rgba(139,26,47,0.1)" }}>
                          <div className="flex-1">
                            <p className="text-sm font-semibold" style={{ color: "#3D1520" }}>{b.name}</p>
                            <p className="text-xs mt-0.5" style={{ color: "#9B6A7A" }}>
                              {new Date(b.date_start).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} — {new Date(b.date_end).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                            </p>
                          </div>
                          <button onClick={() => setEditingBreak(b)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 shrink-0">
                            <Icon name="Pencil" size={13} style={{ color: "#8B1A2F" }} />
                          </button>
                          <button onClick={() => removeBreak(b.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 shrink-0">
                            <Icon name="Trash2" size={13} className="text-red-400" />
                          </button>
                        </div>
                      )}
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
                    <div key={h.id}>
                      {editingHoliday?.id === h.id ? (
                        <form onSubmit={saveHolidayEdit} className="p-3 rounded-xl space-y-2" style={{ background: "#FDF6EE", border: "1.5px solid rgba(139,26,47,0.25)" }}>
                          <Input value={editingHoliday.name} onChange={e => setEditingHoliday(v => v ? { ...v, name: e.target.value } : v)} placeholder="Название праздника" required />
                          <Field label="Дата"><Input type="date" value={editingHoliday.holiday_date} onChange={e => setEditingHoliday(v => v ? { ...v, holiday_date: e.target.value } : v)} required /></Field>
                          <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "#5C0F1E" }}>
                            <input type="checkbox" checked={editingHoliday.cancels_lessons} onChange={e => setEditingHoliday(v => v ? { ...v, cancels_lessons: e.target.checked } : v)} />
                            Отменяет уроки в этот день
                          </label>
                          <div className="flex gap-2">
                            <SaveBtn label={savingHoliday ? "Сохраняем..." : "Сохранить"} loading={savingHoliday} />
                            <button type="button" onClick={() => setEditingHoliday(null)} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: "#9B6A7A" }}>Отмена</button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#FDF6EE", border: "1.5px solid rgba(139,26,47,0.1)" }}>
                          <span className="text-lg shrink-0">🎉</span>
                          <div className="flex-1">
                            <p className="text-sm font-semibold" style={{ color: "#3D1520" }}>{h.name}</p>
                            <p className="text-xs mt-0.5" style={{ color: "#9B6A7A" }}>
                              {new Date(h.holiday_date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                              {!h.cancels_lessons && <span className="ml-1.5" style={{ color: "#2E7D32" }}>· уроки идут</span>}
                            </p>
                          </div>
                          <button onClick={() => setEditingHoliday(h)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 shrink-0">
                            <Icon name="Pencil" size={13} style={{ color: "#8B1A2F" }} />
                          </button>
                          <button onClick={() => removeHoliday(h.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 shrink-0">
                            <Icon name="Trash2" size={13} className="text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <form onSubmit={addHoliday} className="p-3 rounded-xl space-y-2" style={{ background: "#FDF6EE", border: "1.5px dashed rgba(139,26,47,0.25)" }}>
                  <p className="text-xs font-semibold" style={{ color: "#8B1A2F" }}>+ Добавить праздник</p>
                  <Input value={newHoliday.name} onChange={e => setNewHoliday(h => ({ ...h, name: e.target.value }))} placeholder="День Победы" required />
                  <Field label="Дата"><Input type="date" value={newHoliday.holiday_date} onChange={e => setNewHoliday(h => ({ ...h, holiday_date: e.target.value }))} required /></Field>
                  <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "#5C0F1E" }}>
                    <input type="checkbox" checked={newHoliday.cancels_lessons} onChange={e => setNewHoliday(h => ({ ...h, cancels_lessons: e.target.checked }))} />
                    Отменяет уроки в этот день
                  </label>
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
                    <div key={t.id}>
                      {editingTrip?.id === t.id ? (
                        <form onSubmit={saveTripEdit} className="p-3 rounded-xl space-y-2" style={{ background: "rgba(33,150,243,0.05)", border: "1.5px solid rgba(33,150,243,0.35)" }}>
                          <Input value={editingTrip.name} onChange={e => setEditingTrip(v => v ? { ...v, name: e.target.value } : v)} placeholder="Название выезда" required />
                          <Input value={editingTrip.description} onChange={e => setEditingTrip(v => v ? { ...v, description: e.target.value } : v)} placeholder="Описание (необязательно)" />
                          <div className="grid grid-cols-2 gap-2">
                            <Field label="Дата начала"><Input type="date" value={editingTrip.trip_date} onChange={e => setEditingTrip(v => v ? { ...v, trip_date: e.target.value } : v)} required /></Field>
                            <Field label="Дата конца"><Input type="date" value={editingTrip.date_end} onChange={e => setEditingTrip(v => v ? { ...v, date_end: e.target.value } : v)} /></Field>
                          </div>
                          <div className="flex gap-2">
                            <SaveBtn label={savingTrip ? "Сохраняем..." : "Сохранить"} loading={savingTrip} />
                            <button type="button" onClick={() => setEditingTrip(null)} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: "#9B6A7A" }}>Отмена</button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex items-start gap-3 p-3 rounded-xl"
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
                          <button onClick={() => setEditingTrip(t)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 shrink-0">
                            <Icon name="Pencil" size={13} style={{ color: "#1565C0" }} />
                          </button>
                          <button onClick={() => removeTrip(t.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 shrink-0">
                            <Icon name="Trash2" size={13} className="text-red-400" />
                          </button>
                        </div>
                      )}
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

// ─── My Schedule Tab (для учителя — все уроки во всех классах + ДЗ) ──
const CURRENT_SCHOOL_YEAR = "2026-2027";
interface MyLesson { id: number; day_of_week: string; time_slot: string; subject: string; room: string; class_id: number; class_display_name?: string; sort_order: number; }
function MyScheduleTab({ user, classes }: { user: User; classes: SchoolClass[] }) {
  const [lessons, setLessons] = useState<MyLesson[]>([]);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const teacherName = user.display_name || user.login;
  const classById = useMemo(() => new Map(classes.map(c => [c.id, c.display_name || c.name])), [classes]);

  const load = useCallback(async () => {
    setLoading(true);
    const [datesData, scheduleData, homeworkData] = await Promise.all([
      api(`get_schedule_dates&teacher_name=${encodeURIComponent(teacherName)}&school_year=${encodeURIComponent(CURRENT_SCHOOL_YEAR)}`),
      api(`get_schedule&teacher_name=${encodeURIComponent(teacherName)}`),
      api(`get_homework&teacher_id=${user.id}`),
    ]);
    // Расписание берётся из schedule_dates (актуальные уроки по модулям текущего учебного года).
    // Один и тот же урок повторяется в каждом модуле — дедуплицируем по дню+времени+предмету+классу.
    const fromDates: MyLesson[] = Array.isArray(datesData) ? datesData : [];
    const seen = new Set<string>();
    const dedupedDates = fromDates.filter(l => {
      const key = `${l.day_of_week}|${l.time_slot}|${(l.subject || "").trim()}|${l.class_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // Фолбэк на базовый шаблон (schedule), если по модулям текущего года ничего не найдено
    const finalLessons = dedupedDates.length > 0 ? dedupedDates : (Array.isArray(scheduleData) ? scheduleData : []);
    setLessons(finalLessons);
    if (Array.isArray(homeworkData)) setHomeworks(homeworkData);
    setLoading(false);
  }, [teacherName, user.id]);

  useEffect(() => { load(); }, [load]);

  const homeworkBySubjectClass = useMemo(() => {
    const map = new Map<string, Homework[]>();
    homeworks.forEach(hw => {
      const key = `${hw.class_id}|${(hw.subject || "").trim()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(hw);
    });
    return map;
  }, [homeworks]);

  const exportPdf = () => {
    setExporting(true);
    try {
      const lessonsByDayOfWeek: Record<string, { time_slot: string; subject: string; class_name: string; room: string }[]> = {};
      lessons.forEach(l => {
        const day = l.day_of_week;
        if (!lessonsByDayOfWeek[day]) lessonsByDayOfWeek[day] = [];
        lessonsByDayOfWeek[day].push({
          time_slot: l.time_slot,
          subject: l.subject,
          class_name: l.class_display_name || classById.get(l.class_id) || "—",
          room: l.room,
        });
      });
      exportTeacherScheduleToPdf(teacherName, lessonsByDayOfWeek);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <SectionTitle emoji="🗓" title="Моё расписание" sub={`${teacherName} · все классы`} />
        <button onClick={exportPdf} disabled={exporting}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-wait shrink-0"
          style={{ background: "white", color: "#8B1A2F", border: "1.5px solid rgba(139,26,47,0.2)" }}>
          <Icon name={exporting ? "Loader2" : "FileDown"} size={15} className={exporting ? "animate-spin" : ""} /> Экспорт PDF
        </button>
      </div>

      {lessons.length === 0 ? (
        <Empty text="У вас пока нет уроков в расписании" />
      ) : (
        <div className="space-y-4">
          {DAYS.map(dayName => {
            const dayLessons = lessons.filter(l => l.day_of_week === dayName).sort((a, b) => a.time_slot.localeCompare(b.time_slot));
            if (dayLessons.length === 0) return null;
            return (
              <div key={dayName}>
                <div className="px-3 py-1 rounded-xl text-xs font-bold inline-block mb-2" style={{ background: "#F5E0E5", color: "#8B1A2F" }}>
                  {dayName}
                </div>
                <div className="space-y-2">
                  {dayLessons.map(lesson => {
                    const className = lesson.class_display_name || classById.get(lesson.class_id) || "—";
                    const hwKey = `${lesson.class_id}|${(lesson.subject || "").trim()}`;
                    const hwList = homeworkBySubjectClass.get(hwKey) || [];
                    return (
                      <div key={lesson.id} className="p-3 rounded-2xl" style={{ background: "white", border: "1.5px solid rgba(139,26,47,0.07)" }}>
                        <div className="flex gap-3 items-center">
                          <span className="text-xs font-medium px-2 py-1 rounded-lg shrink-0" style={{ background: "#F5E0E5", color: "#8B1A2F", whiteSpace: "nowrap" }}>{lesson.time_slot}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate" style={{ color: "#3D1520" }}>{lesson.subject}</p>
                            <p className="text-xs mt-0.5" style={{ color: "#9B6A7A" }}>{className}{lesson.room && ` · 🚪 ${lesson.room}`}</p>
                          </div>
                        </div>
                        {hwList.length > 0 && (
                          <div className="mt-2 pt-2 space-y-1" style={{ borderTop: "1px solid rgba(139,26,47,0.08)" }}>
                            {hwList.map(hw => (
                              <div key={hw.id} className="flex items-start gap-1.5 text-xs">
                                <Icon name="BookOpen" size={12} className="mt-0.5 shrink-0" style={{ color: "#D4A843" }} />
                                <span style={{ color: "#3D1520" }}>{hw.task} <span style={{ color: "#9B6A7A" }}>· до {hw.due_date}</span></span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Extended Day Tab (Продлёнка) ───────────────────────────
interface ExtendedDayStudent { extended_id: number; student_id: number; full_name: string; class_id: number; class_display_name?: string; class_name?: string; grade: number; letter: string; homework: Homework[]; }
function ExtendedDayTab({ classes }: { classes: SchoolClass[] }) {
  const [students, setStudents] = useState<ExtendedDayStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [pickerClassId, setPickerClassId] = useState<number | null>(null);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [loadingClassStudents, setLoadingClassStudents] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);

  const sortedClasses = useMemo(() => [...classes].sort((a, b) => a.grade - b.grade), [classes]);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api("get_extended_day_students");
    if (Array.isArray(data)) setStudents(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const groupedByClass = useMemo(() => {
    const map = new Map<number, ExtendedDayStudent[]>();
    students.forEach(s => {
      if (!map.has(s.class_id)) map.set(s.class_id, []);
      map.get(s.class_id)!.push(s);
    });
    return map;
  }, [students]);

  const classById = useMemo(() => new Map(classes.map(c => [c.id, c.display_name || `${c.grade} класс`])), [classes]);
  const groupedClassIds = useMemo(() => [...groupedByClass.keys()].sort((a, b) => {
    const ca = classes.find(c => c.id === a)?.grade || 0;
    const cb = classes.find(c => c.id === b)?.grade || 0;
    return ca - cb;
  }), [groupedByClass, classes]);

  const addedStudentIds = useMemo(() => new Set(students.map(s => s.student_id)), [students]);

  const openAdd = () => { setShowAdd(true); setPickerClassId(null); setClassStudents([]); };

  const pickClass = async (classId: number) => {
    setPickerClassId(classId);
    setLoadingClassStudents(true);
    const data = await api(`get_students&class_id=${classId}`);
    if (Array.isArray(data)) setClassStudents(data);
    setLoadingClassStudents(false);
  };

  const addStudent = async (studentId: number) => {
    setSaving(studentId);
    await api("add_extended_day_student", "POST", { student_id: studentId });
    setSaving(null);
    load();
  };

  const removeStudent = async (studentId: number) => {
    if (!confirm("Убрать ученика из продлёнки?")) return;
    await api("remove_extended_day_student", "POST", { student_id: studentId });
    load();
  };

  if (loading) return <Loader />;

  return (
    <div>
      <SectionTitle emoji="☀️" title="Продлёнка" sub={`${students.length} учеников · из всех классов`} />

      {students.length === 0 ? (
        <Empty text="Пока никого не добавили в продлёнку" />
      ) : (
        <div className="space-y-5">
          {groupedClassIds.map(classId => {
            const group = groupedByClass.get(classId) || [];
            return (
              <div key={classId}>
                <div className="px-3 py-1 rounded-xl text-xs font-bold inline-block mb-2" style={{ background: "#F5E0E5", color: "#8B1A2F" }}>
                  {classById.get(classId) || group[0]?.class_display_name || group[0]?.class_name || "—"}
                </div>
                <div className="space-y-2">
                  {group.map(s => (
                    <div key={s.extended_id} className="p-3 rounded-2xl" style={{ background: "white", border: "1.5px solid rgba(139,26,47,0.07)" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "linear-gradient(135deg, #5C0F1E, #8B1A2F)", color: "white" }}>
                          {s.full_name.charAt(0)}
                        </div>
                        <p className="font-medium text-sm flex-1" style={{ color: "#3D1520" }}>{s.full_name}</p>
                        <button onClick={() => removeStudent(s.student_id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 shrink-0">
                          <Icon name="Trash2" size={13} className="text-red-400" />
                        </button>
                      </div>
                      {s.homework.length > 0 && (
                        <div className="mt-2 pt-2 space-y-1" style={{ borderTop: "1px solid rgba(139,26,47,0.08)" }}>
                          {s.homework.map(hw => (
                            <div key={hw.id} className="flex items-start gap-1.5 text-xs">
                              <Icon name="BookOpen" size={12} className="mt-0.5 shrink-0" style={{ color: "#D4A843" }} />
                              <span style={{ color: "#3D1520" }}><b>{hw.subject}</b>: {hw.task} <span style={{ color: "#9B6A7A" }}>· до {hw.due_date}</span></span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddBtn label="Добавить ученика в продлёнку" onClick={openAdd} />

      {showAdd && (
        <Modal title="Добавить в продлёнку" onClose={() => setShowAdd(false)}>
          {!pickerClassId ? (
            <div className="space-y-1">
              <p className="text-xs mb-2" style={{ color: "#9B6A7A" }}>Выберите класс</p>
              {sortedClasses.map(cl => (
                <button key={cl.id} onClick={() => pickClass(cl.id)}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-pink-50 transition-colors"
                  style={{ color: "#3D1520", border: "1.5px solid rgba(139,26,47,0.1)" }}>
                  {cl.display_name || `${cl.grade} класс`}
                </button>
              ))}
            </div>
          ) : loadingClassStudents ? (
            <Loader />
          ) : (
            <div className="space-y-2">
              <button onClick={() => setPickerClassId(null)} className="flex items-center gap-1 text-xs mb-2" style={{ color: "#8B1A2F" }}>
                <Icon name="ChevronLeft" size={14} /> Назад к классам
              </button>
              {classStudents.length === 0 && <Empty text="В этом классе нет учеников" />}
              {classStudents.map(s => {
                const already = addedStudentIds.has(s.id);
                return (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ border: "1.5px solid rgba(139,26,47,0.1)" }}>
                    <p className="text-sm flex-1" style={{ color: "#3D1520" }}>{s.full_name}</p>
                    <button onClick={() => addStudent(s.id)} disabled={already || saving === s.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                      style={{ background: already ? "#F5E0E5" : "linear-gradient(135deg, #5C0F1E, #8B1A2F)", color: already ? "#8B1A2F" : "white" }}>
                      {already ? "Добавлен" : saving === s.id ? "..." : "Добавить"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
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
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api(`get_homework&class_id=${cls.id}`);
    if (Array.isArray(data)) setItems(data);
    setLoading(false);
  }, [cls.id]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm({ subject: "", task: "", due_date: "" }); setAttachments([]); setLinkInput(""); setShowAdd(true); };
  const openEdit = (hw: Homework) => { setEditing(hw); setForm({ subject: hw.subject, task: hw.task, due_date: hw.due_date }); setAttachments(hw.attachments || []); setLinkInput(""); setShowAdd(true); };

  const addLink = () => {
    const url = linkInput.trim();
    if (!url) return;
    const name = url.replace(/^https?:\/\//, "").slice(0, 40);
    setAttachments(a => [...a, { name, url: url.startsWith("http") ? url : `https://${url}`, type: "link" }]);
    setLinkInput("");
  };

  const removeAttachment = (idx: number) => setAttachments(a => a.filter((_, i) => i !== idx));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (editing) {
      await api("update_homework", "POST", { ...form, id: editing.id, attachments });
    } else {
      await api("add_homework", "POST", { ...form, class_id: cls.id, teacher_id: user.id, attachments });
    }
    setSaving(false); setShowAdd(false); load();
  };

  return (
    <div>
      <SectionTitle emoji="📚" title={`Домашние задания · ${cls.display_name || cls.name}`} sub={`${items.length} заданий · для всего класса`} />
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
                  {hw.attachments && hw.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {hw.attachments.map((a, ai) => (
                        <a key={ai} href={a.url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium transition-colors hover:opacity-80"
                          style={{ background: "rgba(212,168,67,0.12)", color: "#7A5700" }}>
                          <Icon name={a.type === "link" ? "Link" : "Paperclip"} size={12} />
                          {a.name}
                        </a>
                      ))}
                    </div>
                  )}
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
        <Modal title={editing ? "Редактировать ДЗ" : "Новое задание · весь класс"} onClose={() => setShowAdd(false)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Предмет"><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Математика" required /></Field>
            <Field label="Задание"><Textarea rows={4} value={form.task} onChange={e => setForm(f => ({ ...f, task: e.target.value }))} placeholder="Опишите задание..." required /></Field>
            <Field label="Срок сдачи"><Input value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} placeholder="14 мая" required /></Field>

            <Field label="Ссылка">
              <div className="flex gap-2">
                <Input value={linkInput} onChange={e => setLinkInput(e.target.value)} placeholder="https://..." />
                <button type="button" onClick={addLink}
                  className="px-3 rounded-xl text-sm font-medium shrink-0" style={{ background: "#8B1A2F", color: "white" }}>
                  <Icon name="Plus" size={15} />
                </button>
              </div>
            </Field>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {attachments.map((a, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg font-medium"
                    style={{ background: "rgba(212,168,67,0.12)", color: "#7A5700" }}>
                    <Icon name={a.type === "link" ? "Link" : "Paperclip"} size={12} />
                    {a.name}
                    <button type="button" onClick={() => removeAttachment(i)}>
                      <Icon name="X" size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <SaveBtn loading={saving} />
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Дата с русским месяцем → ISO (для сопоставления с модулем) ──
const RU_MONTHS: Record<string, number> = {
  "января": 0, "февраля": 1, "марта": 2, "апреля": 3, "мая": 4, "июня": 5,
  "июля": 6, "августа": 7, "сентября": 8, "октября": 9, "ноября": 10, "декабря": 11,
};
function parseRuDateInModule(dateStr: string, mod: Module): string | null {
  const parts = (dateStr || "").trim().toLowerCase().split(" ");
  if (parts.length < 2) return null;
  const day = parseInt(parts[0], 10);
  const month = RU_MONTHS[parts[1]];
  if (isNaN(day) || month === undefined) return null;
  const years = new Set([new Date(mod.date_start).getFullYear(), new Date(mod.date_end).getFullYear()]);
  for (const year of years) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (iso >= mod.date_start && iso <= mod.date_end) return iso;
  }
  return null;
}

// ─── Grades Tab ────────────────────────────────────────────
function GradesTab({ cls, user }: { cls: SchoolClass; user: User }) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ student_id: "", subject: "", grade: "5", comment: "", grade_date: "" });
  const [saving, setSaving] = useState(false);

  // Модули (учебные периоды) для сводки
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [showSummary, setShowSummary] = useState(false);

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

  useEffect(() => {
    api("get_modules").then(data => {
      if (Array.isArray(data)) {
        setModules(data);
        const todayIso = new Date().toISOString().split("T")[0];
        const current = data.find((m: Module) => todayIso >= m.date_start && todayIso <= m.date_end);
        setSelectedModule(current || data[0] || null);
      }
    });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await api("add_grade", "POST", { ...form, grade: Number(form.grade), teacher_id: user.id, class_id: cls.id });
    setSaving(false); setShowAdd(false); load();
  };

  const stats = [5, 4, 3, 2].map(g => ({ g, count: grades.filter(gr => gr.grade === g).length })).filter(x => x.count > 0);

  const moduleGrades = selectedModule
    ? grades.filter(g => parseRuDateInModule(g.grade_date, selectedModule) !== null)
    : grades;

  const moduleStats = [5, 4, 3, 2, 1].map(g => ({ g, count: moduleGrades.filter(gr => gr.grade === g).length })).filter(x => x.count > 0);

  const studentSummary = students.map(s => {
    const recs = moduleGrades.filter(g => g.student_id === s.id);
    const avg = recs.length ? recs.reduce((sum, g) => sum + g.grade, 0) / recs.length : 0;
    return { student: s, count: recs.length, avg };
  }).filter(x => x.count > 0);

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
      {modules.length > 0 && (
        <button onClick={() => setShowSummary(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium mb-4 transition-all hover:opacity-80"
          style={{ background: "white", color: "#8B1A2F", border: "1.5px solid rgba(139,26,47,0.2)" }}>
          <Icon name="BarChart3" size={13} /> Сводка за модуль
        </button>
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
      {showSummary && (
        <Modal title="Сводка за модуль" onClose={() => setShowSummary(false)}>
          <div className="space-y-3">
            <Field label="Модуль">
              <Select value={selectedModule?.id || ""} onChange={e => setSelectedModule(modules.find(m => m.id === Number(e.target.value)) || null)}>
                {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </Field>
            {selectedModule && (
              <p className="text-xs" style={{ color: "#9B6A7A" }}>
                {new Date(selectedModule.date_start).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} — {new Date(selectedModule.date_end).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
              </p>
            )}
            {moduleStats.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {moduleStats.map(({ g, count }) => (
                  <div key={g} className={`px-4 py-2 rounded-2xl grade-${g} flex items-center gap-2`}>
                    <span className="text-xl font-bold" style={{ fontFamily: "Cormorant, serif" }}>{g}</span>
                    <span className="text-sm font-medium">× {count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty text="За этот модуль отметок нет" />
            )}
            {user.role === "teacher" && studentSummary.length > 0 && (
              <div className="space-y-2 pt-2">
                {studentSummary.map(({ student, count, avg }) => (
                  <div key={student.id} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl" style={{ background: "#FDF6EE", border: "1.5px solid rgba(139,26,47,0.08)" }}>
                    <p className="font-medium text-sm flex-1" style={{ color: "#3D1520" }}>{student.full_name}</p>
                    <span className="text-xs" style={{ color: "#9B6A7A" }}>{count} отметок</span>
                    <span className="text-sm font-bold px-2 py-0.5 rounded-full" style={{ background: "#F5E0E5", color: "#8B1A2F" }}>ср. {avg.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Attendance Tab ────────────────────────────────────────
function AttendanceTab({ cls, user }: { cls: SchoolClass; user: User }) {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Attendance | null>(null);
  const [form, setForm] = useState({ student_id: "", subject: "", status: "absent", comment: "", lesson_date: "" });
  const [saving, setSaving] = useState(false);

  // Модули (учебные периоды) для сводки
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const query = user.role === "parent" && user.child_id ? `student_id=${user.child_id}` : `class_id=${cls.id}`;
    const [a, s] = await Promise.all([
      api(`get_attendance&${query}`),
      user.role === "teacher" ? api(`get_students&class_id=${cls.id}`) : Promise.resolve([]),
    ]);
    if (Array.isArray(a)) setRecords(a);
    if (Array.isArray(s)) setStudents(s);
    setLoading(false);
  }, [cls.id, user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api("get_modules").then(data => {
      if (Array.isArray(data)) {
        setModules(data);
        const todayIso = new Date().toISOString().split("T")[0];
        const current = data.find((m: Module) => todayIso >= m.date_start && todayIso <= m.date_end);
        setSelectedModule(current || data[0] || null);
      }
    });
  }, []);

  const moduleRecords = selectedModule
    ? records.filter(r => r.lesson_date >= selectedModule.date_start && r.lesson_date <= selectedModule.date_end)
    : records;

  const studentSummary = students.map(s => {
    const recs = moduleRecords.filter(r => r.student_id === s.id);
    return {
      student: s,
      absent: recs.filter(r => r.status === "absent").length,
      late: recs.filter(r => r.status === "late").length,
    };
  }).filter(x => x.absent > 0 || x.late > 0);

  const openAdd = () => {
    setEditing(null);
    setForm({ student_id: "", subject: "", status: "absent", comment: "", lesson_date: new Date().toISOString().split("T")[0] });
    setShowAdd(true);
  };

  const openEdit = (rec: Attendance) => {
    setEditing(rec);
    setForm({ student_id: String(rec.student_id), subject: rec.subject, status: rec.status, comment: rec.comment, lesson_date: rec.lesson_date });
    setShowAdd(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (editing) {
      await api("update_attendance", "POST", { ...form, id: editing.id });
    } else {
      await api("add_attendance", "POST", { ...form, teacher_id: user.id, class_id: cls.id });
    }
    setSaving(false); setShowAdd(false); setEditing(null); load();
  };

  const remove = async (id: number) => {
    await api("delete_attendance", "POST", { id });
    load();
  };

  const lateCount = records.filter(r => r.status === "late").length;
  const absentCount = records.filter(r => r.status === "absent").length;

  return (
    <div>
      <SectionTitle emoji="🚸" title={`Явка · ${cls.display_name || cls.name}`} sub={user.role === "parent" ? user.child : undefined} />
      {!loading && (lateCount > 0 || absentCount > 0) && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {absentCount > 0 && (
            <div className="px-4 py-2 rounded-2xl flex items-center gap-2" style={{ background: "rgba(244,67,54,0.12)", color: "#b71c1c" }}>
              <span className="text-sm font-semibold">Отсутствий: {absentCount}</span>
            </div>
          )}
          {lateCount > 0 && (
            <div className="px-4 py-2 rounded-2xl flex items-center gap-2" style={{ background: "rgba(255,152,0,0.12)", color: "#e65100" }}>
              <span className="text-sm font-semibold">Опозданий: {lateCount}</span>
            </div>
          )}
        </div>
      )}
      {modules.length > 0 && (
        <button onClick={() => setShowSummary(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium mb-4 transition-all hover:opacity-80"
          style={{ background: "white", color: "#8B1A2F", border: "1.5px solid rgba(139,26,47,0.2)" }}>
          <Icon name="BarChart3" size={13} /> Сводка за модуль
        </button>
      )}
      {loading ? <Loader /> : (
        <div className="space-y-3">
          {records.length === 0 && <Empty text="Записей нет" />}
          {records.map((r, i) => (
            <div key={r.id} className="flex items-start gap-3 p-4 rounded-2xl card-hover animate-slide-up"
              style={{ background: "white", border: "1.5px solid rgba(139,26,47,0.08)", animationDelay: `${i * 0.06}s`, opacity: 0 }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                style={{ background: r.status === "late" ? "rgba(255,152,0,0.15)" : "rgba(244,67,54,0.15)" }}>
                {r.status === "late" ? "⏰" : "🚫"}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-semibold text-sm" style={{ color: "#3D1520" }}>{r.subject}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: r.status === "late" ? "rgba(255,152,0,0.15)" : "rgba(244,67,54,0.15)", color: r.status === "late" ? "#e65100" : "#b71c1c" }}>
                    {r.status === "late" ? "Опоздание" : "Отсутствие"}
                  </span>
                  {user.role === "teacher" && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#F5E0E5", color: "#8B1A2F" }}>{r.student_name}</span>}
                </div>
                {r.comment && <p className="text-sm" style={{ color: "#9B6A7A" }}>{r.comment}</p>}
              </div>
              <span className="text-xs shrink-0" style={{ color: "#9B6A7A" }}>
                {new Date(r.lesson_date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
              </span>
              {user.role === "teacher" && (
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(r)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100"><Icon name="Pencil" size={13} style={{ color: "#8B1A2F" }} /></button>
                  <button onClick={() => remove(r.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50"><Icon name="Trash2" size={13} className="text-red-400" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {user.role === "teacher" && (
        <>
          <AddBtn label="Отметить опоздание/отсутствие" onClick={openAdd} />
          {showAdd && (
            <Modal title={editing ? "Изменить запись" : "Новая запись"} onClose={() => { setShowAdd(false); setEditing(null); }}>
              <form onSubmit={save} className="space-y-3">
                <Field label="Ученик">
                  <Select value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))} required disabled={!!editing}>
                    <option value="">Выберите ученика</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </Select>
                </Field>
                <Field label="Предмет"><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Математика" required /></Field>
                <Field label="Тип">
                  <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="absent">Отсутствие</option>
                    <option value="late">Опоздание</option>
                  </Select>
                </Field>
                <Field label="Дата"><Input type="date" value={form.lesson_date} onChange={e => setForm(f => ({ ...f, lesson_date: e.target.value }))} required /></Field>
                <Field label="Комментарий"><Input value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} placeholder="Необязательно" /></Field>
                <SaveBtn loading={saving} />
              </form>
            </Modal>
          )}
        </>
      )}
      {showSummary && (
        <Modal title="Сводка за модуль" onClose={() => setShowSummary(false)}>
          <div className="space-y-3">
            <Field label="Модуль">
              <Select value={selectedModule?.id || ""} onChange={e => setSelectedModule(modules.find(m => m.id === Number(e.target.value)) || null)}>
                {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </Field>
            {selectedModule && (
              <p className="text-xs" style={{ color: "#9B6A7A" }}>
                {new Date(selectedModule.date_start).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} — {new Date(selectedModule.date_end).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
              </p>
            )}
            <div className="flex gap-2 flex-wrap">
              <div className="px-4 py-2 rounded-2xl flex items-center gap-2" style={{ background: "rgba(244,67,54,0.12)", color: "#b71c1c" }}>
                <span className="text-sm font-semibold">Отсутствий: {moduleRecords.filter(r => r.status === "absent").length}</span>
              </div>
              <div className="px-4 py-2 rounded-2xl flex items-center gap-2" style={{ background: "rgba(255,152,0,0.12)", color: "#e65100" }}>
                <span className="text-sm font-semibold">Опозданий: {moduleRecords.filter(r => r.status === "late").length}</span>
              </div>
            </div>
            {user.role === "teacher" && (
              <div className="space-y-2 pt-2">
                {studentSummary.length === 0 && <Empty text="За этот модуль пропусков нет" />}
                {studentSummary.map(({ student, absent, late }) => (
                  <div key={student.id} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl" style={{ background: "#FDF6EE", border: "1.5px solid rgba(139,26,47,0.08)" }}>
                    <p className="font-medium text-sm flex-1" style={{ color: "#3D1520" }}>{student.full_name}</p>
                    {absent > 0 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(244,67,54,0.15)", color: "#b71c1c" }}>🚫 {absent}</span>}
                    {late > 0 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,152,0,0.15)", color: "#e65100" }}>⏰ {late}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
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
                    <option value="all">👥 Весь класс</option>
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
interface Parent { id: number; login: string; display_name: string; child: string; child_id: number; last_login_at: string | null; }

function formatLastLogin(iso: string | null): string {
  if (!iso) return "Ещё не заходил(а)";
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Только что";
  if (diffMin < 60) return `${diffMin} мин назад`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} ч назад`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Вчера";
  if (diffD < 7) return `${diffD} дн назад`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) });
}

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
                <p className="text-xs mt-1 flex items-center gap-1" style={{ color: p.last_login_at ? "#4A8B5C" : "#B08A94" }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.last_login_at ? "#4A8B5C" : "#D9C3C9" }} />
                  {formatLastLogin(p.last_login_at)}
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