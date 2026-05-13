import { useState, useEffect, useCallback } from "react";
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
const NOTIF_EMOJI: Record<string, string> = { grade: "⭐", homework: "📚", recommendation: "💬", file: "📎" };

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
            <p className="text-xs text-center" style={{ color: "#9B6A7A" }}>
              {tab === "parent" ? <><b style={{ color: "#8B1A2F" }}>parent1</b> / <b style={{ color: "#8B1A2F" }}>parent1pass</b></> : <>Пароль: <b style={{ color: "#8B1A2F" }}>teacher2024</b></>}
            </p>
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

  // Уникальные классы по номеру (берём первый из каждой группы — они все с одним display_name)
  const uniqueGrades: SchoolClass[] = [];
  const seenGrades = new Set<number>();
  classes.forEach(c => {
    if (!seenGrades.has(c.grade)) { seenGrades.add(c.grade); uniqueGrades.push(c); }
  });
  uniqueGrades.sort((a, b) => a.grade - b.grade);

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
                {uniqueGrades.map(cl => (
                  <button key={cl.id} onClick={() => { setSelectedClass(cl); goTab("schedule"); }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
                    style={{
                      background: selectedClass?.grade === cl.grade ? "linear-gradient(135deg, #5C0F1E, #8B1A2F)" : "white",
                      color: selectedClass?.grade === cl.grade ? "white" : "#3D1520",
                      border: "1.5px solid rgba(139,26,47,0.12)",
                      boxShadow: selectedClass?.grade === cl.grade ? "0 4px 12px rgba(139,26,47,0.25)" : "none",
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
                {uniqueGrades.map(cl => (
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
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t" style={{ background: "rgba(253,246,238,0.96)", backdropFilter: "blur(12px)", borderColor: "rgba(139,26,47,0.12)" }}>
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
function ScheduleTab({ cls, user }: { cls: SchoolClass; user: User }) {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [day, setDay] = useState("Понедельник");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [form, setForm] = useState({ day_of_week: "Понедельник", time_slot: "08:00–08:45", subject: "", teacher_name: "", room: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await api(`get_schedule&class_id=${cls.id}`);
    if (Array.isArray(data)) setItems(data);
    setLoading(false);
  }, [cls.id]);

  useEffect(() => { load(); }, [load]);

  const dayItems = items.filter(i => i.day_of_week === day).sort((a, b) => a.sort_order - b.sort_order);

  const openEdit = (item: ScheduleItem) => {
    setEditing(item);
    setForm({ day_of_week: item.day_of_week, time_slot: item.time_slot, subject: item.subject, teacher_name: item.teacher_name, room: item.room });
    setShowAdd(true);
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ day_of_week: day, time_slot: "08:00–08:45", subject: "", teacher_name: "", room: "" });
    setShowAdd(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (editing) {
      await api("update_schedule", "POST", { ...form, id: editing.id });
    } else {
      await api("add_schedule", "POST", { ...form, class_id: cls.id });
    }
    setSaving(false);
    setShowAdd(false);
    load();
  };

  const del = async (id: number) => {
    await api("delete_schedule", "POST", { id });
    load();
  };

  return (
    <div>
      <SectionTitle emoji="📅" title={`Расписание · ${cls.display_name || cls.name}`} sub="Учебная неделя" />
      <div className="flex gap-2 mb-4 flex-wrap">
        {DAYS.map(d => (
          <button key={d} onClick={() => setDay(d)}
            className="px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: day === d ? "#8B1A2F" : "white", color: day === d ? "white" : "#8B1A2F", border: "1.5px solid rgba(139,26,47,0.2)" }}>
            {d}
          </button>
        ))}
      </div>

      {loading ? <Loader /> : (
        <div className="space-y-3">
          {dayItems.length === 0 && <Empty text="Уроки не добавлены" />}
          {dayItems.map((item, i) => (
            <div key={item.id} className="flex gap-3 items-center p-4 rounded-2xl card-hover animate-slide-up"
              style={{ background: "white", border: "1.5px solid rgba(139,26,47,0.08)", animationDelay: `${i * 0.06}s`, opacity: 0 }}>
              <span className="text-xs font-medium px-2 py-1 rounded-lg shrink-0" style={{ background: "#F5E0E5", color: "#8B1A2F", whiteSpace: "nowrap" }}>{item.time_slot}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: "#3D1520" }}>{item.subject}</p>
                <p className="text-xs mt-0.5" style={{ color: "#9B6A7A" }}>{item.teacher_name}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-lg shrink-0" style={{ background: "rgba(212,168,67,0.12)", color: "#7A5700" }}>🚪 {item.room}</span>
              {user.role === "teacher" && (
                <div className="flex gap-1">
                  <button onClick={() => openEdit(item)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100"><Icon name="Pencil" size={13} style={{ color: "#8B1A2F" }} /></button>
                  <button onClick={() => del(item.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50"><Icon name="Trash2" size={13} className="text-red-400" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {user.role === "teacher" && <AddBtn label="Добавить урок" onClick={openAdd} />}

      {showAdd && (
        <Modal title={editing ? "Редактировать урок" : "Новый урок"} onClose={() => setShowAdd(false)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="День недели">
              <Select value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value }))}>
                {DAYS.map(d => <option key={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label="Время"><Input value={form.time_slot} onChange={e => setForm(f => ({ ...f, time_slot: e.target.value }))} placeholder="08:00–08:45" /></Field>
            <Field label="Предмет"><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Математика" required /></Field>
            <Field label="Учитель"><Input value={form.teacher_name} onChange={e => setForm(f => ({ ...f, teacher_name: e.target.value }))} placeholder="Анна Сергеевна" required /></Field>
            <Field label="Кабинет"><Input value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} placeholder="305" required /></Field>
            <SaveBtn loading={saving} />
          </form>
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