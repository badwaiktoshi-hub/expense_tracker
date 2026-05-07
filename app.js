/* ==========================================================================
 * EXPENSE TRACKER v2.0 — Built per spec
 * Sage glassmorphic UI · billing-cycle cap · mixed per-card mode · EMI cap
 * reduction · auto-prompt confirm queue · savings goals · avoidability tagging
 * ========================================================================== */

const { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } = React;
const { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } = Recharts;

const STORAGE_KEY = "expense_tracker_v2";
const APP_VERSION = "2.0.0";

/* ============= UTILITIES ============= */
const fmt = (n) => {
  if (n == null || isNaN(n)) return "0";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.abs(Number(n)));
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const monthKey = (iso) => (iso || todayISO()).slice(0, 7);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const formatDate = (iso, opts = { day: "numeric", month: "short" }) => new Date(iso).toLocaleDateString("en", opts);
const daysBetween = (a, b) => Math.ceil((new Date(b) - new Date(a)) / 86400000);

const sha256 = async (text) => {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
};

/* ============= BILLING CYCLE ============= */
const getCycleForDate = (cycleStartDay, refDate = new Date()) => {
  const d = new Date(refDate);
  const day = d.getDate();
  let cycleStart;
  if (day >= cycleStartDay) {
    cycleStart = new Date(d.getFullYear(), d.getMonth(), cycleStartDay);
  } else {
    cycleStart = new Date(d.getFullYear(), d.getMonth() - 1, cycleStartDay);
  }
  const cycleEnd = new Date(cycleStart);
  cycleEnd.setMonth(cycleEnd.getMonth() + 1);
  cycleEnd.setDate(cycleEnd.getDate() - 1);
  return {
    start: cycleStart.toISOString().slice(0, 10),
    end: cycleEnd.toISOString().slice(0, 10),
    daysLeft: Math.max(0, daysBetween(d.toISOString().slice(0, 10), cycleEnd.toISOString().slice(0, 10))),
  };
};
const isInCycle = (txDate, start, end) => txDate >= start && txDate <= end;

/* ============= DEFAULT DATA ============= */
const DEFAULT_CATEGORIES = [
  { id: "cat-food", name: "Food & Dining", icon: "🍽️", color: "#F59E0B", isDefault: true, position: 0, hidden: false },
  { id: "cat-groceries", name: "Groceries", icon: "🛒", color: "#10B981", isDefault: true, position: 1, hidden: false },
  { id: "cat-transport", name: "Transport / Fuel", icon: "🚗", color: "#3B82F6", isDefault: true, position: 2, hidden: false },
  { id: "cat-shopping", name: "Shopping", icon: "🛍️", color: "#8B5CF6", isDefault: true, position: 3, hidden: false },
  { id: "cat-entertainment", name: "Entertainment / OTT", icon: "🎬", color: "#EC4899", isDefault: true, position: 4, hidden: false },
  { id: "cat-health", name: "Health / Medical", icon: "🏥", color: "#EF4444", isDefault: true, position: 5, hidden: false },
  { id: "cat-travel", name: "Travel", icon: "✈️", color: "#06B6D4", isDefault: true, position: 6, hidden: false },
  { id: "cat-subscriptions", name: "Subscriptions", icon: "🔄", color: "#6366F1", isDefault: true, position: 7, hidden: false },
  { id: "cat-education", name: "Education", icon: "📚", color: "#14B8A6", isDefault: true, position: 8, hidden: false },
  { id: "cat-other", name: "Other", icon: "📌", color: "#64748B", isDefault: true, position: 9, hidden: false },
];
const DEFAULT_INVESTMENT_TYPES = [
  { id: "inv-fd", name: "Fixed Deposit", icon: "🏦", color: "#3B82F6", isDefault: true },
  { id: "inv-gold", name: "Gold", icon: "🪙", color: "#F59E0B", isDefault: true },
  { id: "inv-cash", name: "Cash", icon: "💵", color: "#10B981", isDefault: true },
];
const CARD_COLORS = ["#1D4ED8", "#7C3AED", "#DC2626", "#059669", "#EA580C", "#0891B2", "#DB2777", "#4F46E5"];

const defaultData = {
  settings: { globalCap: 0, billingCycleStartDay: 1, pinHash: null, pinSalt: null, biometricEnabled: false, cashIncludedInCapDefault: false, hasOnboarded: false, version: APP_VERSION },
  cards: [],
  income: [],
  categories: DEFAULT_CATEGORIES,
  regularExpenses: [],
  transactions: [],
  emis: [],
  templates: [],
  savingsCategories: [],
  savings: [],
  investmentTypes: DEFAULT_INVESTMENT_TYPES,
  investments: [],
  loans: [],
};

/* ============= STORAGE HOOK ============= */
const useStorage = () => {
  const [data, setData] = useState(defaultData);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setData({
          ...defaultData,
          ...parsed,
          settings: { ...defaultData.settings, ...(parsed.settings || {}) },
          categories: parsed.categories?.length ? parsed.categories : DEFAULT_CATEGORIES,
          investmentTypes: parsed.investmentTypes?.length ? parsed.investmentTypes : DEFAULT_INVESTMENT_TYPES,
        });
      }
    } catch (e) { console.error("Load failed", e); }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
      catch (e) { console.error("Save failed", e); }
    }
  }, [data, loaded]);

  return [data, setData, loaded];
};

/* ============= ICONS ============= */
const Icon = ({ d, size = 20, stroke = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const I = {
  home: (p) => <Icon {...p} d={<><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>}/>,
  target: (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>}/>,
  plus: (p) => <Icon {...p} d={<><path d="M5 12h14"/><path d="M12 5v14"/></>}/>,
  card: (p) => <Icon {...p} d={<><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></>}/>,
  more: (p) => <Icon {...p} d={<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>}/>,
  search: (p) => <Icon {...p} d={<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>}/>,
  menu: (p) => <Icon {...p} d={<><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/></>}/>,
  arrowUpRight: (p) => <Icon {...p} d={<><path d="M7 7h10v10"/><path d="M7 17 17 7"/></>}/>,
  arrowLeft: (p) => <Icon {...p} d={<><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></>}/>,
  arrowRight: (p) => <Icon {...p} d={<><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>}/>,
  x: (p) => <Icon {...p} d={<><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>}/>,
  check: (p) => <Icon {...p} d={<polyline points="20 6 9 17 4 12"/>}/>,
  trash: (p) => <Icon {...p} d={<><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>}/>,
  alert: (p) => <Icon {...p} d={<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></>}/>,
  download: (p) => <Icon {...p} d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></>}/>,
  upload: (p) => <Icon {...p} d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></>}/>,
  briefcase: (p) => <Icon {...p} d={<><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>}/>,
  piggy: (p) => <Icon {...p} d={<><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/><path d="M16 11h.01"/></>}/>,
  trend: (p) => <Icon {...p} d={<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>}/>,
  users: (p) => <Icon {...p} d={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></>}/>,
  edit: (p) => <Icon {...p} d={<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>}/>,
  settings: (p) => <Icon {...p} d={<><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></>}/>,
  lock: (p) => <Icon {...p} d={<><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>}/>,
  cal: (p) => <Icon {...p} d={<><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></>}/>,
  refresh: (p) => <Icon {...p} d={<><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></>}/>,
  cash: (p) => <Icon {...p} d={<><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></>}/>,
  zap: (p) => <Icon {...p} d={<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>}/>,
  sparkle: (p) => <Icon {...p} d={<><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/></>}/>,
  bank: (p) => <Icon {...p} d={<><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></>}/>,
};

/* ============= UI PRIMITIVES ============= */
const Button = ({ children, onClick, variant = "primary", className = "", disabled, type = "button" }) => {
  const variants = {
    primary: "bg-gradient-to-br from-[#1A1F1B] to-[#2D3530] text-white shadow-md hover:shadow-lg",
    secondary: "bg-white/70 backdrop-blur text-[#1A1F1B] border border-white/80",
    ghost: "text-[#1A1F1B] hover:bg-white/40",
    danger: "bg-red-50 text-red-600 border border-red-100",
    accent: "bg-[#7BAA42] text-white shadow-md",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`px-4 py-3 rounded-2xl font-medium text-sm transition-all tap-press disabled:opacity-50 ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Input = ({ label, error, prefix, ...props }) => (
  <div>
    {label && <label className="block text-xs font-medium text-[#3D4D3D] mb-1.5">{label}</label>}
    <div className="relative">
      {prefix && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5A6A5A] text-sm pointer-events-none">{prefix}</span>}
      <input {...props}
        className={`w-full ${prefix ? "pl-8" : "pl-3.5"} pr-3.5 py-3 rounded-2xl border bg-white/70 backdrop-blur focus:bg-white focus:border-[#5A8030] focus:outline-none focus:ring-2 focus:ring-[#5A8030]/15 text-sm transition-colors ${error ? "border-red-300" : "border-white/80"}`} />
    </div>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

const Modal = ({ open, onClose, title, children, size = "md" }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[#0A1A0A]/40 backdrop-blur-sm" onClick={onClose}>
      <div className={`bg-white w-full rounded-t-[28px] sm:rounded-3xl max-h-[92vh] overflow-y-auto sheet-anim safe-bottom ${size === "lg" ? "sm:max-w-lg" : "sm:max-w-md"}`} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10 rounded-t-[28px] sm:rounded-t-3xl">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 tap-press"><I.x size={20}/></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

const Toast = ({ message, type = "info", onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const colors = { warning: "from-amber-500 to-orange-500", danger: "from-red-500 to-rose-600", success: "from-emerald-500 to-green-600", info: "from-slate-700 to-slate-800" };
  return (
    <div className="fixed top-0 left-0 right-0 z-[200] flex justify-center pointer-events-none px-4" style={{ paddingTop: "max(env(safe-area-inset-top), 1rem)" }}>
      <div className={`bg-gradient-to-r ${colors[type]} text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 pointer-events-auto max-w-md toast-anim`}>
        {(type === "warning" || type === "danger") && <I.alert size={18}/>}
        {type === "success" && <I.check size={18}/>}
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
};

const ToastContext = createContext({ show: () => {} });
const useToast = () => useContext(ToastContext);

/* ============= CAP ENGINE ============= */
const useCapStats = (data) => useMemo(() => {
  const { settings, transactions, cards, emis } = data;
  const cycle = getCycleForDate(settings.billingCycleStartDay || 1);

  const activeEmis = (emis || []).filter(e => e.active && e.monthsPaid < e.totalMonths);
  const emiCommitments = activeEmis.reduce((s, e) => s + Number(e.monthlyAmount || 0), 0);

  const globalCards = (cards || []).filter(c => c.capMode === "global" && !c.archived);
  const individualCards = (cards || []).filter(c => c.capMode === "individual" && !c.archived);
  const globalCardIds = new Set(globalCards.map(c => c.id));

  const cycleTxns = (transactions || []).filter(t => {
    if (!isInCycle(t.date, cycle.start, cycle.end)) return false;
    if (!["personal", "emi"].includes(t.type)) return false;
    if (typeof t.paymentMethod === "string" && t.paymentMethod.startsWith("card-")) return true;
    if (t.paymentMethod === "cash") return t.cashIncludedInCap === true;
    return false;
  });

  const globalSpend = cycleTxns
    .filter(t => t.paymentMethod === "cash" || globalCardIds.has(t.paymentMethod))
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const individualSpends = {};
  individualCards.forEach(c => {
    individualSpends[c.id] = cycleTxns.filter(t => t.paymentMethod === c.id)
      .reduce((s, t) => s + Number(t.amount || 0), 0);
  });

  const globalCap = Number(settings.globalCap || 0);
  const effectiveGlobalCap = Math.max(0, globalCap - emiCommitments);
  const totalCap = globalCap + individualCards.reduce((s, c) => s + Number(c.individualCap || 0), 0);
  const effectiveTotalCap = effectiveGlobalCap + individualCards.reduce((s, c) => s + Number(c.individualCap || 0), 0);
  const totalSpend = globalSpend + Object.values(individualSpends).reduce((a, b) => a + b, 0);
  const leftToSpend = effectiveTotalCap - totalSpend;
  const percentUsed = effectiveTotalCap > 0 ? (totalSpend / effectiveTotalCap) * 100 : 0;

  return { cycle, globalCap, effectiveGlobalCap, emiCommitments, globalSpend, individualSpends, totalCap, effectiveTotalCap, totalSpend, leftToSpend, percentUsed, globalCards, individualCards, activeEmis, cycleTxns };
}, [data]);

/* ============= AUTO-PROMPT QUEUE ============= */
const buildPromptQueue = (data) => {
  const queue = [];
  const today = new Date();
  const tm = monthKey(today.toISOString());
  const td = today.getDate();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  (data.regularExpenses || []).forEach(r => {
    if (!r.active) return;
    const dueDay = r.dayOfMonth === 31 ? lastDay : Math.min(r.dayOfMonth, lastDay);
    if (td >= dueDay && r.lastConfirmedMonth !== tm) {
      queue.push({ kind: "regular", id: r.id, name: r.name, amount: r.amount, categoryId: r.categoryId, paymentMethod: r.paymentMethod });
    }
  });

  (data.emis || []).forEach(e => {
    if (!e.active || e.monthsPaid >= e.totalMonths) return;
    const startDay = new Date(e.startDate).getDate();
    const dueDay = Math.min(startDay, lastDay);
    const alreadyLogged = (data.transactions || []).some(t => t.emiId === e.id && monthKey(t.date) === tm);
    if (td >= dueDay && !alreadyLogged && e.lastConfirmedMonth !== tm) {
      queue.push({ kind: "emi", id: e.id, name: e.name, amount: e.monthlyAmount, categoryId: e.categoryId, paymentMethod: e.paymentMethod, progress: `${e.monthsPaid + 1} of ${e.totalMonths}` });
    }
  });
  return queue;
};

/* ============= HELPERS ============= */
const getPaymentLabel = (method, cards) => {
  if (method === "cash") return "Cash";
  if (method === "bank") return "Bank";
  const c = cards.find(x => x.id === method);
  if (!c) return "Unknown";
  return `${c.name}${c.last4 ? ` ····${c.last4}` : ""}`;
};
const getCategory = (id, categories) => categories.find(c => c.id === id) || { name: "Other", icon: "📌", color: "#64748B" };

/* ============= ONBOARDING ============= */
const Onboarding = ({ data, setData, onDone }) => {
  const [step, setStep] = useState(0);
  const [cap, setCap] = useState("");
  const [cycleDay, setCycleDay] = useState("1");
  const [cardName, setCardName] = useState("");
  const [cardLast4, setCardLast4] = useState("");

  const finish = () => {
    const newCards = cardName ? [{
      id: `card-${uid()}`, name: cardName, last4: cardLast4, color: CARD_COLORS[0],
      capMode: "global", individualCap: null, archived: false
    }] : data.cards;
    setData(d => ({
      ...d,
      cards: newCards,
      settings: { ...d.settings, globalCap: Number(cap) || 0, billingCycleStartDay: Number(cycleDay) || 1, hasOnboarded: true }
    }));
    onDone();
  };

  return (
    <div className="min-h-screen flex flex-col p-6 pt-12">
      <div className="flex items-center gap-2 mb-8">
        {[0,1,2].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? "bg-[#1A1F1B]" : "bg-white/60"}`}/>
        ))}
      </div>

      {step === 0 && (
        <div className="anim-stagger flex flex-col flex-1">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1A1F1B] to-[#2D3530] flex items-center justify-center mb-6 shadow-lg">
            <I.sparkle size={28} stroke={1.5}/>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">Welcome</h1>
          <p className="text-[#3D4D3D] mb-8">Set up in under a minute. Your data stays on this device — never sent anywhere.</p>
          <div className="glass rounded-2xl p-4 mb-6">
            <p className="text-sm font-medium mb-1">What you'll set up</p>
            <ul className="text-sm text-[#3D4D3D] space-y-1.5 mt-2">
              <li>• Your monthly spending cap</li>
              <li>• Credit card billing cycle date</li>
              <li>• Your first card (optional)</li>
            </ul>
          </div>
          <div className="mt-auto">
            <Button variant="primary" onClick={() => setStep(1)} className="w-full">Get started</Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="anim-stagger flex flex-col flex-1">
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Spending cap</h1>
          <p className="text-[#3D4D3D] mb-6 text-sm">The maximum amount you want to spend on personal expenses each billing cycle.</p>
          <Input label="Monthly cap (₹)" prefix="₹" type="number" inputMode="numeric" value={cap} onChange={e => setCap(e.target.value)} placeholder="20000" autoFocus/>
          <div className="mt-6">
            <label className="block text-xs font-medium text-[#3D4D3D] mb-1.5">Billing cycle starts on day</label>
            <p className="text-xs text-[#5A6A5A] mb-2">e.g., if your card statement closes on the 14th, the cycle starts on the 15th</p>
            <Input type="number" min="1" max="31" inputMode="numeric" value={cycleDay} onChange={e => setCycleDay(e.target.value)}/>
          </div>
          <div className="mt-auto flex gap-2">
            <Button variant="secondary" onClick={() => setStep(0)} className="flex-1">Back</Button>
            <Button variant="primary" onClick={() => setStep(2)} disabled={!cap} className="flex-1">Next</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="anim-stagger flex flex-col flex-1">
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Add your first card</h1>
          <p className="text-[#3D4D3D] mb-6 text-sm">Optional — you can add more cards anytime later.</p>
          <Input label="Card name" value={cardName} onChange={e => setCardName(e.target.value)} placeholder="HDFC Regalia"/>
          <div className="mt-4">
            <Input label="Last 4 digits (optional)" value={cardLast4} onChange={e => setCardLast4(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="4521" inputMode="numeric"/>
          </div>
          <div className="mt-auto flex gap-2">
            <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">Back</Button>
            <Button variant="primary" onClick={finish} className="flex-1">{cardName ? "Done" : "Skip & finish"}</Button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============= LOCK SCREEN ============= */
const LockScreen = ({ data, onUnlock }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);

  const checkPin = async (p) => {
    const hash = await sha256(p + (data.settings.pinSalt || ""));
    if (hash === data.settings.pinHash) {
      onUnlock();
    } else {
      const next = attempts + 1;
      setAttempts(next);
      setError(next >= 5 ? "Too many attempts. Try in 60s." : "Wrong PIN");
      setPin("");
      if (next >= 5) {
        setLockedUntil(Date.now() + 60000);
        setTimeout(() => { setLockedUntil(0); setAttempts(0); setError(""); }, 60000);
      }
    }
  };

  useEffect(() => {
    if (pin.length >= 4 && pin.length <= 6 && !lockedUntil) {
      // Auto-check at 4 digits, but allow up to 6
      const t = setTimeout(() => checkPin(pin), 200);
      return () => clearTimeout(t);
    }
  }, [pin]);

  const press = (n) => { if (lockedUntil) return; if (pin.length < 6) setPin(p => p + n); };
  const back = () => setPin(p => p.slice(0, -1));
  const locked = !!lockedUntil;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1A1F1B] to-[#2D3530] flex items-center justify-center mb-6 shadow-lg text-white">
        <I.lock size={28}/>
      </div>
      <h1 className="text-2xl font-semibold mb-2">Enter PIN</h1>
      <div className="flex gap-3 mb-6">
        {[0,1,2,3,4,5].map(i => (
          <div key={i} className={`w-3 h-3 rounded-full transition-all ${i < pin.length ? "bg-[#1A1F1B]" : "bg-white/70 border border-white/90"}`}/>
        ))}
      </div>
      {error && <p className={`text-sm mb-4 ${locked ? "text-red-600" : "text-amber-700"}`}>{error}</p>}
      <div className="grid grid-cols-3 gap-3 max-w-xs w-full">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => press(n.toString())} disabled={locked}
            className="glass-strong h-16 rounded-2xl text-2xl font-medium tap-press disabled:opacity-50">
            {n}
          </button>
        ))}
        <div/>
        <button onClick={() => press("0")} disabled={locked} className="glass-strong h-16 rounded-2xl text-2xl font-medium tap-press disabled:opacity-50">0</button>
        <button onClick={back} disabled={locked || !pin.length} className="h-16 rounded-2xl flex items-center justify-center tap-press disabled:opacity-50">
          <I.arrowLeft size={22}/>
        </button>
      </div>
    </div>
  );
};

/* ============= DASHBOARD ============= */
const Dashboard = ({ data, setData, onNav }) => {
  const stats = useCapStats(data);
  const [view, setView] = useState("combined");

  const monthData = useMemo(() => {
    const cm = monthKey(todayISO());
    const inMonth = (d) => monthKey(d) === cm;
    const income = (data.income || []).filter(i => inMonth(i.date)).reduce((s, i) => s + Number(i.amount || 0), 0);
    const regular = (data.transactions || []).filter(t => t.type === "regular" && inMonth(t.date)).reduce((s, t) => s + Number(t.amount || 0), 0);
    const personal = (data.transactions || []).filter(t => (t.type === "personal" || t.type === "emi") && inMonth(t.date)).reduce((s, t) => s + Number(t.amount || 0), 0);
    const savings = (data.savings || []).filter(s => inMonth(s.date)).reduce((s, e) => s + Number(e.amount || 0), 0);
    const investments = (data.investments || []).filter(i => inMonth(i.date)).reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalOut = regular + personal + savings + investments;
    return { income, regular, personal, savings, investments, totalOut, net: income - totalOut };
  }, [data]);

  const categoryBreakdown = useMemo(() => {
    const map = {};
    stats.cycleTxns.forEach(t => {
      const catId = t.categoryId || "cat-other";
      map[catId] = (map[catId] || 0) + Number(t.amount || 0);
    });
    const items = Object.entries(map).map(([catId, value]) => {
      const cat = getCategory(catId, data.categories);
      return { catId, name: cat.name, color: cat.color, icon: cat.icon, value };
    }).sort((a, b) => b.value - a.value);
    return { items, total: items.reduce((s, i) => s + i.value, 0) };
  }, [stats.cycleTxns, data.categories]);

  const recentTxns = useMemo(() => {
    return [...(data.transactions || [])]
      .sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id))
      .slice(0, 5);
  }, [data.transactions]);

  const activeLoans = (data.loans || []).filter(l => l.status === "active");
  const totalLent = activeLoans.reduce((s, l) => {
    const repaid = (l.repayments || []).reduce((x, r) => x + Number(r.amount || 0), 0);
    return s + Math.max(0, Number(l.amount || 0) - repaid);
  }, 0);

  const pct = Math.min(100, stats.percentUsed);
  const barColor = pct >= 100 ? "from-red-500 to-rose-500" : pct >= 80 ? "from-amber-400 to-orange-500" : "from-[#97C459] to-[#C0DD97]";
  const pillColor = pct >= 100 ? "bg-red-500/25 text-red-100 border-red-400/40" : pct >= 80 ? "bg-amber-500/25 text-amber-100 border-amber-400/40" : "bg-[#97C459]/20 text-[#C0DD97] border-[#97C459]/30";

  // Outflow segments
  const outflowSegs = [
    { key: "Regular", val: monthData.regular, color: "#E24B4A" },
    { key: "Personal", val: monthData.personal, color: "#EF9F27" },
    { key: "Savings", val: monthData.savings, color: "#1D9E75" },
    { key: "Investments", val: monthData.investments, color: "#378ADD" },
  ];
  const totalOut = monthData.totalOut || 1;

  return (
    <div className="anim-stagger space-y-3 px-4 pt-3 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => onNav("more")} className="glass tap-press w-10 h-10 rounded-xl flex items-center justify-center">
          <I.menu size={18}/>
        </button>
        <div className="flex gap-2">
          <button onClick={() => onNav("search")} className="glass tap-press w-10 h-10 rounded-xl flex items-center justify-center">
            <I.search size={18}/>
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9B89E] to-[#A89882] flex items-center justify-center text-[#4A1B0C] font-medium text-sm border-2 border-white/60">SK</div>
        </div>
      </div>

      {/* Title */}
      <div>
        <p className="text-xs text-[#5A6A5A]">Hello</p>
        <h1 className="text-2xl font-semibold tracking-tight">Your dashboard</h1>
      </div>

      {/* HERO CARD */}
      <div className="glass-dark rounded-3xl p-5 text-white overflow-hidden relative">
        <div className="absolute w-40 h-40 rounded-full top-[-50px] right-[-30px] pointer-events-none" style={{ background: "radial-gradient(circle, rgba(151,196,89,0.18), transparent 70%)" }}/>
        <div className="flex items-start justify-between mb-1.5 relative">
          <div className="flex items-center gap-1.5">
            <span className="live-dot w-1.5 h-1.5 rounded-full bg-[#97C459]" style={{ boxShadow: "0 0 8px #97C459" }}/>
            <p className="text-xs text-[#B8C2BA]">
              {stats.effectiveTotalCap > 0 ? `Left to spend · cycle ends ${formatDate(stats.cycle.end)}` : "Set your cap to begin"}
            </p>
          </div>
          {stats.effectiveTotalCap > 0 && (
            <span className={`${pillColor} text-xs font-medium px-2 py-1 rounded-full border`}>{Math.round(pct)}% used</span>
          )}
        </div>
        <div className="flex items-baseline gap-1.5 mt-1 mb-3 relative">
          <span className="text-4xl font-medium tracking-tight">₹{fmt(Math.max(0, stats.leftToSpend))}</span>
          {stats.effectiveTotalCap > 0 && <span className="text-sm text-[#B8C2BA]">/ ₹{fmt(stats.effectiveTotalCap)}</span>}
        </div>
        {stats.effectiveTotalCap > 0 && (
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-3 relative">
            <div className={`bar-grow h-full rounded-full bg-gradient-to-r ${barColor}`} style={{ "--w": `${pct}%`, width: `${pct}%`, boxShadow: "0 0 12px rgba(151,196,89,0.4)" }}/>
          </div>
        )}
        {stats.individualCards.length > 0 && (
          <div className="flex justify-between items-center pt-2.5 border-t border-white/10 relative">
            <div className="flex gap-1 bg-white/5 p-0.5 rounded-full">
              <button onClick={() => setView("combined")} className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${view === "combined" ? "bg-[#97C459]/20 text-[#C0DD97]" : "text-[#8A938C]"}`}>Combined</button>
              <button onClick={() => setView("per-card")} className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${view === "per-card" ? "bg-[#97C459]/20 text-[#C0DD97]" : "text-[#8A938C]"}`}>Per card</button>
            </div>
            <span className="text-xs text-[#B8C2BA]">{stats.cycle.daysLeft} days left</span>
          </div>
        )}
        {stats.emiCommitments > 0 && (
          <p className="text-[10px] text-[#8A938C] mt-2 relative">After ₹{fmt(stats.emiCommitments)}/cycle EMI commitments</p>
        )}
      </div>

      {/* PER-CARD VIEW (when toggled) */}
      {view === "per-card" && stats.individualCards.length > 0 && (
        <div className="glass rounded-3xl p-4 space-y-3">
          <p className="text-xs font-medium text-[#3D4D3D]">Per card breakdown</p>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Cards on shared cap</span>
                <span className="font-medium">₹{fmt(stats.globalSpend)} / ₹{fmt(stats.effectiveGlobalCap)}</span>
              </div>
              <div className="h-1.5 bg-white/40 rounded-full overflow-hidden">
                <div className="h-full bg-[#97C459]" style={{ width: `${stats.effectiveGlobalCap > 0 ? Math.min(100, (stats.globalSpend / stats.effectiveGlobalCap) * 100) : 0}%` }}/>
              </div>
            </div>
            {stats.individualCards.map(c => {
              const spend = stats.individualSpends[c.id] || 0;
              const cap = Number(c.individualCap || 0);
              const p = cap > 0 ? Math.min(100, (spend / cap) * 100) : 0;
              return (
                <div key={c.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{c.name}</span>
                    <span className="font-medium">₹{fmt(spend)} / ₹{fmt(cap)}</span>
                  </div>
                  <div className="h-1.5 bg-white/40 rounded-full overflow-hidden">
                    <div className="h-full" style={{ width: `${p}%`, background: c.color }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* INCOME VS OUTFLOWS */}
      <div className="glass rounded-3xl p-5">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-medium text-[#3D4D3D]">Income vs outflows · {new Date().toLocaleDateString("en", { month: "long" })}</p>
          <span className={`text-sm font-semibold ${monthData.net >= 0 ? "text-[#1D9E75]" : "text-[#E24B4A]"}`}>
            {monthData.net >= 0 ? "+ " : "− "}₹{fmt(monthData.net)}
          </span>
        </div>
        <div className="mb-3">
          <div className="flex justify-between text-xs text-[#5A6A5A] mb-1"><span>Income</span><span>₹{fmt(monthData.income)}</span></div>
          <div className="h-3 bg-[#1D9E75]/15 rounded-lg overflow-hidden">
            <div className="bar-grow h-full bg-gradient-to-r from-[#1D9E75] to-[#0F6E56]" style={{ "--w": "100%", width: monthData.income > 0 ? "100%" : "0%" }}/>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-[#5A6A5A] mb-1"><span>Outflows</span><span>₹{fmt(monthData.totalOut)}</span></div>
          <div className="h-3 rounded-lg overflow-hidden flex">
            {outflowSegs.map(s => s.val > 0 && (
              <div key={s.key} style={{ width: `${(s.val/totalOut)*100}%`, background: s.color }}/>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-[#3D4D3D]">
            {outflowSegs.map(s => (
              <span key={s.key} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }}/>{s.key}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* CATEGORY BREAKDOWN DONUT */}
      {categoryBreakdown.items.length > 0 && (
        <div className="glass rounded-3xl p-5">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-medium text-[#3D4D3D]">Spending by category · cycle</p>
            <span className="text-xs text-[#5A6A5A]">₹{fmt(categoryBreakdown.total)}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={categoryBreakdown.items} cx="50%" cy="50%" innerRadius={36} outerRadius={56} dataKey="value" stroke="none">
                    {categoryBreakdown.items.map((e, i) => <Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip formatter={v => `₹${fmt(v)}`}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              {categoryBreakdown.items.slice(0, 4).map(it => (
                <div key={it.catId} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: it.color }}/>
                  <span className="flex-1 truncate">{it.name}</span>
                  <span className="font-medium">₹{fmt(it.value)}</span>
                </div>
              ))}
              {categoryBreakdown.items.length > 4 && (
                <p className="text-[10px] text-[#5A6A5A] pt-1">+ {categoryBreakdown.items.length - 4} more</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECENT TRANSACTIONS */}
      {recentTxns.length > 0 && (
        <div className="glass rounded-3xl p-5">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-[#3D4D3D]">Recent transactions</p>
            <button onClick={() => onNav("personal")} className="tap-press"><I.arrowUpRight size={16}/></button>
          </div>
          {recentTxns.map((t, i) => {
            const cat = getCategory(t.categoryId, data.categories);
            return (
              <div key={t.id} className={`flex items-center gap-3 py-2.5 ${i > 0 ? "border-t border-black/5" : ""}`}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0" style={{ background: cat.color + "22", border: `0.5px solid ${cat.color}33` }}>
                  <span>{cat.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.merchant || cat.name}</p>
                  <p className="text-[10px] text-[#5A6A5A]">{cat.name} · {getPaymentLabel(t.paymentMethod, data.cards)}</p>
                </div>
                <p className="text-sm font-medium">−₹{fmt(t.amount)}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* MONEY LENT */}
      {totalLent > 0 && (
        <button onClick={() => onNav("more-loans")} className="glass rounded-3xl p-4 w-full flex items-center justify-between border-l-4 border-[#7F77DD]">
          <div className="text-left">
            <p className="text-xs text-[#5A6A5A]">Money lent · pending</p>
            <p className="text-lg font-semibold mt-0.5">₹{fmt(totalLent)}</p>
            <p className="text-[10px] text-[#5A6A5A]">{activeLoans.length} {activeLoans.length === 1 ? "person" : "people"}</p>
          </div>
          <I.users size={20}/>
        </button>
      )}
    </div>
  );
};

/* ============= ADD SHEET (entry point router) ============= */
const AddSheet = ({ data, setData, open, onClose, showToast }) => {
  const [mode, setMode] = useState(null);

  useEffect(() => { if (!open) setMode(null); }, [open]);

  if (!open) return null;
  if (!mode) {
    return (
      <Modal open={open} onClose={onClose} title="Add">
        <div className="space-y-2">
          <button onClick={() => setMode("personal")} className="w-full glass-strong rounded-2xl p-4 flex items-center gap-3 tap-press">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center"><I.card size={18}/></div>
            <div className="text-left flex-1">
              <p className="font-medium text-sm">Personal Expense</p>
              <p className="text-[11px] text-[#5A6A5A]">Most common — log a card or cash spend</p>
            </div>
            <I.arrowRight size={16}/>
          </button>
          <button onClick={() => setMode("income")} className="w-full glass rounded-2xl p-4 flex items-center gap-3 tap-press">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center"><I.briefcase size={18}/></div>
            <div className="text-left flex-1"><p className="font-medium text-sm">Income</p></div>
            <I.arrowRight size={16}/>
          </button>
          <button onClick={() => setMode("savings")} className="w-full glass rounded-2xl p-4 flex items-center gap-3 tap-press">
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center"><I.piggy size={18}/></div>
            <div className="text-left flex-1"><p className="font-medium text-sm">Add to Savings</p></div>
            <I.arrowRight size={16}/>
          </button>
          <button onClick={() => setMode("investment")} className="w-full glass rounded-2xl p-4 flex items-center gap-3 tap-press">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center"><I.trend size={18}/></div>
            <div className="text-left flex-1"><p className="font-medium text-sm">Investment</p></div>
            <I.arrowRight size={16}/>
          </button>
          <button onClick={() => setMode("loan")} className="w-full glass rounded-2xl p-4 flex items-center gap-3 tap-press">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center"><I.users size={18}/></div>
            <div className="text-left flex-1"><p className="font-medium text-sm">Lend / Repayment</p></div>
            <I.arrowRight size={16}/>
          </button>
          <button onClick={() => setMode("emi")} className="w-full glass rounded-2xl p-4 flex items-center gap-3 tap-press">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center"><I.refresh size={18}/></div>
            <div className="text-left flex-1"><p className="font-medium text-sm">Add EMI</p></div>
            <I.arrowRight size={16}/>
          </button>
        </div>
      </Modal>
    );
  }
  return <FormRouter mode={mode} data={data} setData={setData} onClose={onClose} showToast={showToast}/>;
};

/* ============= FORMS ============= */
const FormRouter = ({ mode, data, setData, onClose, showToast }) => {
  if (mode === "personal") return <PersonalExpenseForm data={data} setData={setData} onClose={onClose} showToast={showToast}/>;
  if (mode === "income") return <IncomeForm data={data} setData={setData} onClose={onClose} showToast={showToast}/>;
  if (mode === "savings") return <SavingsForm data={data} setData={setData} onClose={onClose} showToast={showToast}/>;
  if (mode === "investment") return <InvestmentForm data={data} setData={setData} onClose={onClose} showToast={showToast}/>;
  if (mode === "loan") return <LoanForm data={data} setData={setData} onClose={onClose} showToast={showToast}/>;
  if (mode === "emi") return <EmiForm data={data} setData={setData} onClose={onClose} showToast={showToast}/>;
  return null;
};

const PersonalExpenseForm = ({ data, setData, onClose, showToast, prefill = null }) => {
  const [amount, setAmount] = useState(prefill?.amount || "");
  const [categoryId, setCategoryId] = useState(prefill?.categoryId || "cat-other");
  const [paymentMethod, setPaymentMethod] = useState(prefill?.paymentMethod || (data.cards[0]?.id || "cash"));
  const [merchant, setMerchant] = useState(prefill?.merchant || "");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [cashIncl, setCashIncl] = useState(data.settings.cashIncludedInCapDefault);
  const [showAvoidability, setShowAvoidability] = useState(false);
  const [pendingTxn, setPendingTxn] = useState(null);

  const oldStats = useCapStats(data);
  const oldPct = oldStats.percentUsed;

  const buildTxn = (avoidability = null) => ({
    id: `tx-${uid()}`,
    amount: Number(amount) || 0,
    date,
    type: "personal",
    categoryId,
    paymentMethod,
    merchant: merchant.trim(),
    note: note.trim(),
    cashIncludedInCap: paymentMethod === "cash" ? cashIncl : false,
    avoidability,
  });

  const saveTxn = (txn) => {
    setData(d => ({ ...d, transactions: [txn, ...d.transactions] }));
    // Compute thresholds AFTER save
    const newSpend = oldStats.totalSpend + (txn.paymentMethod === "cash" && !txn.cashIncludedInCap ? 0 : Number(txn.amount));
    const newPct = oldStats.effectiveTotalCap > 0 ? (newSpend / oldStats.effectiveTotalCap) * 100 : 0;
    if (oldPct < 100 && newPct >= 100) {
      showToast(`Cap exceeded! ₹${fmt(newSpend - oldStats.effectiveTotalCap)} over limit`, "danger");
    } else if (oldPct < 80 && newPct >= 80) {
      showToast(`80% of cap used. ₹${fmt(oldStats.effectiveTotalCap - newSpend)} left for ${oldStats.cycle.daysLeft} days`, "warning");
    } else {
      showToast("Saved", "success");
    }
    onClose();
  };

  const submit = () => {
    if (!amount || Number(amount) <= 0) return;
    const txn = buildTxn();
    const counts = txn.paymentMethod !== "cash" || txn.cashIncludedInCap;
    if (counts && oldStats.effectiveTotalCap > 0 && oldPct >= 100) {
      // Already over cap → ask avoidability
      setPendingTxn(txn);
      setShowAvoidability(true);
    } else {
      saveTxn(txn);
    }
  };

  const onAvoidabilityPick = (val) => {
    saveTxn({ ...pendingTxn, avoidability: val });
    setShowAvoidability(false);
    setPendingTxn(null);
  };

  return (
    <>
      <Modal open={true} onClose={onClose} title="Personal Expense">
        <div className="space-y-4">
          <Input label="Amount" prefix="₹" type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="500" autoFocus/>

          <div>
            <label className="block text-xs font-medium text-[#3D4D3D] mb-1.5">Category</label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {data.categories.filter(c => !c.hidden).map(c => (
                <button key={c.id} onClick={() => setCategoryId(c.id)}
                  className={`flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press flex items-center gap-1.5 ${categoryId === c.id ? "bg-[#1A1F1B] text-white" : "bg-white/70 border border-white/80"}`}>
                  <span>{c.icon}</span>{c.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#3D4D3D] mb-1.5">Payment</label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {data.cards.filter(c => !c.archived).map(c => (
                <button key={c.id} onClick={() => setPaymentMethod(c.id)}
                  className={`flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press flex items-center gap-1.5 ${paymentMethod === c.id ? "bg-[#1A1F1B] text-white" : "bg-white/70 border border-white/80"}`}>
                  <span className="w-2 h-2 rounded-full" style={{ background: c.color }}/>
                  {c.name}{c.last4 ? ` ····${c.last4}` : ""}
                </button>
              ))}
              <button onClick={() => setPaymentMethod("bank")}
                className={`flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press ${paymentMethod === "bank" ? "bg-[#1A1F1B] text-white" : "bg-white/70 border border-white/80"}`}>Bank</button>
              <button onClick={() => setPaymentMethod("cash")}
                className={`flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press ${paymentMethod === "cash" ? "bg-[#1A1F1B] text-white" : "bg-white/70 border border-white/80"}`}>Cash</button>
            </div>
            {paymentMethod === "cash" && (
              <label className="flex items-center gap-2 mt-3 text-xs">
                <input type="checkbox" checked={cashIncl} onChange={e => setCashIncl(e.target.checked)} className="w-4 h-4 rounded"/>
                Include this cash spend in monthly cap
              </label>
            )}
          </div>

          <Input label="Merchant" value={merchant} onChange={e => setMerchant(e.target.value)} placeholder="Where? (optional)"/>
          <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)}/>
          <Input label="Note (optional)" value={note} onChange={e => setNote(e.target.value)}/>
          <Button onClick={submit} variant="primary" className="w-full" disabled={!amount}>Save</Button>
        </div>
      </Modal>
      {showAvoidability && (
        <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full modal-anim">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mb-4 text-red-600"><I.alert size={22}/></div>
            <h3 className="text-lg font-semibold mb-2">Already over cap</h3>
            <p className="text-sm text-[#3D4D3D] mb-5">Was this expense:</p>
            <div className="space-y-2">
              <Button onClick={() => onAvoidabilityPick("unavoidable")} variant="primary" className="w-full">Unavoidable</Button>
              <Button onClick={() => onAvoidabilityPick("avoidable")} variant="secondary" className="w-full">Avoidable</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const IncomeForm = ({ data, setData, onClose, showToast }) => {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");

  const submit = () => {
    if (!amount || Number(amount) <= 0) return;
    const item = { id: `inc-${uid()}`, amount: Number(amount), date, source: source.trim() || "Income", note };
    setData(d => ({ ...d, income: [item, ...d.income] }));
    showToast("Income logged", "success");
    onClose();
  };

  return (
    <Modal open={true} onClose={onClose} title="Income">
      <div className="space-y-4">
        <Input label="Amount" prefix="₹" type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="50000" autoFocus/>
        <Input label="Source" value={source} onChange={e => setSource(e.target.value)} placeholder="Salary, Freelance — ClientX, Rent…"/>
        <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)}/>
        <Input label="Note (optional)" value={note} onChange={e => setNote(e.target.value)}/>
        <Button onClick={submit} variant="primary" className="w-full" disabled={!amount}>Save</Button>
      </div>
    </Modal>
  );
};

const SavingsForm = ({ data, setData, onClose, showToast }) => {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [savingsCategoryId, setSavingsCategoryId] = useState(data.savingsCategories[0]?.id || "");
  const [note, setNote] = useState("");
  const [showNew, setShowNew] = useState(!data.savingsCategories.length);
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("");

  const submit = () => {
    if (!amount || Number(amount) <= 0 || !savingsCategoryId) return;
    const item = { id: `sav-${uid()}`, amount: Number(amount), date, savingsCategoryId, note };
    setData(d => ({ ...d, savings: [item, ...d.savings] }));
    showToast("Saving logged", "success");
    onClose();
  };

  const createCat = () => {
    if (!newName.trim()) return;
    const cat = { id: `sc-${uid()}`, name: newName.trim(), icon: "🎯", color: "#1D9E75", targetAmount: Number(newTarget) || null, targetDate: null, monthlyTargetAmount: null, archived: false };
    setData(d => ({ ...d, savingsCategories: [...d.savingsCategories, cat] }));
    setSavingsCategoryId(cat.id);
    setShowNew(false);
    setNewName(""); setNewTarget("");
  };

  const selected = data.savingsCategories.find(s => s.id === savingsCategoryId);
  const savedSoFar = selected ? data.savings.filter(s => s.savingsCategoryId === selected.id).reduce((a, b) => a + Number(b.amount || 0), 0) : 0;

  return (
    <Modal open={true} onClose={onClose} title="Add to Savings">
      <div className="space-y-4">
        {showNew || !data.savingsCategories.length ? (
          <div className="space-y-3 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
            <p className="text-xs font-medium text-emerald-800">Create a new goal</p>
            <Input label="Name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Emergency fund, Goa Trip…"/>
            <Input label="Target amount (optional)" prefix="₹" type="number" value={newTarget} onChange={e => setNewTarget(e.target.value)} placeholder="50000"/>
            <div className="flex gap-2">
              <Button onClick={createCat} variant="accent" className="flex-1" disabled={!newName.trim()}>Create</Button>
              {data.savingsCategories.length > 0 && <Button onClick={() => setShowNew(false)} variant="secondary" className="flex-1">Cancel</Button>}
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-[#3D4D3D] mb-1.5">Goal</label>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {data.savingsCategories.filter(s => !s.archived).map(s => (
                  <button key={s.id} onClick={() => setSavingsCategoryId(s.id)}
                    className={`flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press ${savingsCategoryId === s.id ? "bg-[#1A1F1B] text-white" : "bg-white/70 border border-white/80"}`}>
                    {s.icon} {s.name}
                  </button>
                ))}
                <button onClick={() => setShowNew(true)} className="flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press bg-emerald-50 text-emerald-700 border border-emerald-200">+ New</button>
              </div>
            </div>
            {selected && (
              <div className="p-3 rounded-xl bg-emerald-50/50 text-xs text-emerald-800">
                Saved so far: ₹{fmt(savedSoFar)}{selected.targetAmount ? ` of ₹${fmt(selected.targetAmount)} target (${Math.round((savedSoFar/selected.targetAmount)*100)}%)` : ""}
              </div>
            )}
            <Input label="Amount" prefix="₹" type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="5000" autoFocus/>
            <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)}/>
            <Input label="Note (optional)" value={note} onChange={e => setNote(e.target.value)}/>
            <Button onClick={submit} variant="primary" className="w-full" disabled={!amount || !savingsCategoryId}>Save</Button>
          </>
        )}
      </div>
    </Modal>
  );
};

const InvestmentForm = ({ data, setData, onClose, showToast }) => {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [investmentTypeId, setInvestmentTypeId] = useState(data.investmentTypes[0]?.id || "");
  const [note, setNote] = useState("");

  const submit = () => {
    if (!amount || Number(amount) <= 0 || !investmentTypeId) return;
    const item = { id: `inv-${uid()}`, amount: Number(amount), date, investmentTypeId, note };
    setData(d => ({ ...d, investments: [item, ...d.investments] }));
    showToast("Investment logged", "success");
    onClose();
  };

  return (
    <Modal open={true} onClose={onClose} title="Investment">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#3D4D3D] mb-1.5">Type</label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {data.investmentTypes.map(t => (
              <button key={t.id} onClick={() => setInvestmentTypeId(t.id)}
                className={`flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press ${investmentTypeId === t.id ? "bg-[#1A1F1B] text-white" : "bg-white/70 border border-white/80"}`}>
                {t.icon} {t.name}
              </button>
            ))}
          </div>
        </div>
        <Input label="Amount" prefix="₹" type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="10000" autoFocus/>
        <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)}/>
        <Input label="Note (optional)" value={note} onChange={e => setNote(e.target.value)}/>
        <Button onClick={submit} variant="primary" className="w-full" disabled={!amount}>Save</Button>
      </div>
    </Modal>
  );
};

const LoanForm = ({ data, setData, onClose, showToast }) => {
  const [tab, setTab] = useState("new");
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [lentDate, setLentDate] = useState(todayISO());
  const [expectedDate, setExpectedDate] = useState("");
  const [reason, setReason] = useState("");
  // Repayment
  const [loanId, setLoanId] = useState(data.loans.find(l => l.status === "active")?.id || "");
  const [repayAmt, setRepayAmt] = useState("");
  const [repayDate, setRepayDate] = useState(todayISO());

  const newLoan = () => {
    if (!person.trim() || !amount || Number(amount) <= 0) return;
    const item = { id: `loan-${uid()}`, person: person.trim(), amount: Number(amount), lentDate, expectedReturnDate: expectedDate || null, reason: reason.trim(), repayments: [], status: "active" };
    setData(d => ({ ...d, loans: [item, ...d.loans] }));
    showToast("Loan logged", "success");
    onClose();
  };

  const addRepayment = () => {
    if (!loanId || !repayAmt || Number(repayAmt) <= 0) return;
    setData(d => ({
      ...d,
      loans: d.loans.map(l => {
        if (l.id !== loanId) return l;
        const reps = [...(l.repayments || []), { amount: Number(repayAmt), date: repayDate, note: "" }];
        const totalRepaid = reps.reduce((a, r) => a + Number(r.amount), 0);
        const status = totalRepaid >= l.amount ? "settled" : "active";
        return { ...l, repayments: reps, status };
      }),
    }));
    showToast("Repayment recorded", "success");
    onClose();
  };

  const activeLoans = data.loans.filter(l => l.status === "active");

  return (
    <Modal open={true} onClose={onClose} title="Money Lent">
      <div className="flex gap-2 mb-4 bg-white/60 rounded-2xl p-1">
        <button onClick={() => setTab("new")} className={`flex-1 py-2 rounded-xl text-xs font-medium ${tab === "new" ? "bg-[#1A1F1B] text-white" : "text-[#5A6A5A]"}`}>New loan</button>
        <button onClick={() => setTab("repay")} className={`flex-1 py-2 rounded-xl text-xs font-medium ${tab === "repay" ? "bg-[#1A1F1B] text-white" : "text-[#5A6A5A]"}`}>Repayment</button>
      </div>
      {tab === "new" ? (
        <div className="space-y-4">
          <Input label="Person" value={person} onChange={e => setPerson(e.target.value)} placeholder="Friend's name" autoFocus/>
          <Input label="Amount" prefix="₹" type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="5000"/>
          <Input label="Lent on" type="date" value={lentDate} onChange={e => setLentDate(e.target.value)}/>
          <Input label="Expected return (optional)" type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)}/>
          <Input label="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)}/>
          <Button onClick={newLoan} variant="primary" className="w-full" disabled={!person.trim() || !amount}>Save</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {activeLoans.length === 0 ? (
            <p className="text-sm text-[#5A6A5A] text-center py-6">No active loans</p>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-[#3D4D3D] mb-1.5">Loan</label>
                <select value={loanId} onChange={e => setLoanId(e.target.value)} className="w-full px-3 py-3 rounded-2xl border bg-white/70 text-sm border-white/80">
                  {activeLoans.map(l => {
                    const repaid = (l.repayments || []).reduce((a, r) => a + Number(r.amount), 0);
                    const balance = Number(l.amount) - repaid;
                    return <option key={l.id} value={l.id}>{l.person} — ₹{fmt(balance)} pending</option>;
                  })}
                </select>
              </div>
              <Input label="Repayment amount" prefix="₹" type="number" inputMode="decimal" value={repayAmt} onChange={e => setRepayAmt(e.target.value)} placeholder="2000" autoFocus/>
              <Input label="Date" type="date" value={repayDate} onChange={e => setRepayDate(e.target.value)}/>
              <Button onClick={addRepayment} variant="primary" className="w-full" disabled={!repayAmt}>Save</Button>
            </>
          )}
        </div>
      )}
    </Modal>
  );
};

const EmiForm = ({ data, setData, onClose, showToast }) => {
  const [name, setName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [totalMonths, setTotalMonths] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [isNoCost, setIsNoCost] = useState(true);
  const [startDate, setStartDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState(data.cards[0]?.id || "");
  const [categoryId, setCategoryId] = useState("cat-shopping");

  // Auto-compute monthly for no-cost
  useEffect(() => {
    if (isNoCost && totalAmount && totalMonths) {
      const m = Math.round(Number(totalAmount) / Number(totalMonths));
      setMonthlyAmount(m.toString());
    }
  }, [isNoCost, totalAmount, totalMonths]);

  const submit = () => {
    if (!name.trim() || !totalAmount || !totalMonths || !monthlyAmount || !paymentMethod) return;
    const emi = {
      id: `emi-${uid()}`, name: name.trim(),
      totalAmount: Number(totalAmount), totalMonths: Number(totalMonths),
      monthlyAmount: Number(monthlyAmount), monthsPaid: 1,
      startDate, paymentMethod, categoryId,
      isNoCost, lastConfirmedMonth: monthKey(startDate), active: true,
    };
    // Log first month's transaction immediately
    const txn = {
      id: `tx-${uid()}`, amount: emi.monthlyAmount, date: startDate,
      type: "emi", categoryId, paymentMethod, merchant: `${emi.name} · 1 of ${emi.totalMonths}`,
      note: "", cashIncludedInCap: false, emiId: emi.id, avoidability: null,
    };
    setData(d => ({ ...d, emis: [emi, ...d.emis], transactions: [txn, ...d.transactions] }));
    showToast(`EMI started · ₹${fmt(emi.monthlyAmount)}/mo`, "success");
    onClose();
  };

  return (
    <Modal open={true} onClose={onClose} title="Add EMI">
      <div className="space-y-4">
        <Input label="What is this EMI for?" value={name} onChange={e => setName(e.target.value)} placeholder="iPhone 17, Laptop…" autoFocus/>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Total amount" prefix="₹" type="number" inputMode="decimal" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="60000"/>
          <Input label="Total months" type="number" inputMode="numeric" value={totalMonths} onChange={e => setTotalMonths(e.target.value)} placeholder="12"/>
        </div>
        <div>
          <div className="flex gap-2 bg-white/60 rounded-2xl p-1 mb-3">
            <button onClick={() => setIsNoCost(true)} className={`flex-1 py-2 rounded-xl text-xs font-medium ${isNoCost ? "bg-[#1A1F1B] text-white" : "text-[#5A6A5A]"}`}>No-cost EMI</button>
            <button onClick={() => setIsNoCost(false)} className={`flex-1 py-2 rounded-xl text-xs font-medium ${!isNoCost ? "bg-[#1A1F1B] text-white" : "text-[#5A6A5A]"}`}>With interest</button>
          </div>
          <Input label="Monthly EMI amount" prefix="₹" type="number" inputMode="decimal" value={monthlyAmount} onChange={e => setMonthlyAmount(e.target.value)} placeholder="5000"/>
          {isNoCost && totalAmount && totalMonths && <p className="text-[10px] text-emerald-700 mt-1">Auto-calculated from total ÷ months</p>}
        </div>
        <Input label="Start date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)}/>
        <div>
          <label className="block text-xs font-medium text-[#3D4D3D] mb-1.5">Card</label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {data.cards.filter(c => !c.archived).map(c => (
              <button key={c.id} onClick={() => setPaymentMethod(c.id)}
                className={`flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press flex items-center gap-1.5 ${paymentMethod === c.id ? "bg-[#1A1F1B] text-white" : "bg-white/70 border border-white/80"}`}>
                <span className="w-2 h-2 rounded-full" style={{ background: c.color }}/>{c.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#3D4D3D] mb-1.5">Category</label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {data.categories.filter(c => !c.hidden).map(c => (
              <button key={c.id} onClick={() => setCategoryId(c.id)}
                className={`flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press ${categoryId === c.id ? "bg-[#1A1F1B] text-white" : "bg-white/70 border border-white/80"}`}>
                {c.icon} {c.name}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-[#5A6A5A]">This EMI will reduce your effective cap by ₹{fmt(Number(monthlyAmount) || 0)}/cycle until paid off.</p>
        <Button onClick={submit} variant="primary" className="w-full" disabled={!name || !totalAmount || !totalMonths || !monthlyAmount || !paymentMethod}>Start EMI</Button>
      </div>
    </Modal>
  );
};

/* ============= AUTO-PROMPT QUEUE UI ============= */
const PromptQueue = ({ data, setData, queue, onClose, showToast }) => {
  const [edits, setEdits] = useState({});

  const editAmount = (id, val) => setEdits(e => ({ ...e, [id]: val }));

  const confirm = (item) => {
    const finalAmount = Number(edits[item.id] != null ? edits[item.id] : item.amount);
    const txn = {
      id: `tx-${uid()}`, amount: finalAmount, date: todayISO(),
      type: item.kind === "emi" ? "emi" : "regular",
      categoryId: item.categoryId, paymentMethod: item.paymentMethod,
      merchant: item.kind === "emi" ? `${item.name} · ${item.progress}` : item.name,
      note: "", cashIncludedInCap: false,
      emiId: item.kind === "emi" ? item.id : undefined,
      regularId: item.kind === "regular" ? item.id : undefined,
      avoidability: null,
    };
    const monthK = monthKey(todayISO());
    setData(d => {
      const next = { ...d, transactions: [txn, ...d.transactions] };
      if (item.kind === "regular") {
        next.regularExpenses = d.regularExpenses.map(r => r.id === item.id ? { ...r, lastConfirmedMonth: monthK } : r);
      } else {
        next.emis = d.emis.map(e => e.id === item.id ? { ...e, monthsPaid: e.monthsPaid + 1, lastConfirmedMonth: monthK } : e);
      }
      return next;
    });
    showToast(`${item.name} paid`, "success");
  };

  const skip = (item) => {
    const monthK = monthKey(todayISO());
    setData(d => {
      const next = { ...d };
      if (item.kind === "regular") {
        next.regularExpenses = d.regularExpenses.map(r => r.id === item.id ? { ...r, lastConfirmedMonth: monthK } : r);
      } else {
        next.emis = d.emis.map(e => e.id === item.id ? { ...e, lastConfirmedMonth: monthK } : e);
      }
      return next;
    });
  };

  return (
    <Modal open={true} onClose={onClose} title={`Confirm ${queue.length} payment${queue.length > 1 ? "s" : ""}`} size="lg">
      <p className="text-xs text-[#5A6A5A] mb-3">Tap "Pay" to log, or skip if not paid this month.</p>
      <div className="space-y-2">
        {queue.map(item => {
          const cat = getCategory(item.categoryId, data.categories);
          const cur = edits[item.id] != null ? edits[item.id] : item.amount;
          return (
            <div key={item.id} className="glass-strong rounded-2xl p-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0" style={{ background: cat.color + "22" }}>{cat.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-[10px] text-[#5A6A5A]">{item.kind === "emi" ? `EMI · ${item.progress}` : "Regular"} · {getPaymentLabel(item.paymentMethod, data.cards)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" inputMode="decimal" value={cur} onChange={e => editAmount(item.id, e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-white border border-white/80 text-sm"/>
                <button onClick={() => confirm(item)} className="px-3 py-2 rounded-xl bg-[#1A1F1B] text-white text-xs font-medium tap-press">Pay</button>
                <button onClick={() => skip(item)} className="px-3 py-2 rounded-xl bg-white/70 text-xs font-medium tap-press">Skip</button>
              </div>
            </div>
          );
        })}
      </div>
      <Button onClick={onClose} variant="ghost" className="w-full mt-4">Close</Button>
    </Modal>
  );
};

/* ============= GOALS TAB ============= */
const GoalsTab = ({ data, setData, showToast }) => {
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const cm = monthKey(todayISO());
  const savedThisMonth = data.savings.filter(s => monthKey(s.date) === cm).reduce((a, b) => a + Number(b.amount || 0), 0);
  const lifetimeTotal = data.savings.reduce((a, b) => a + Number(b.amount || 0), 0);

  const create = () => {
    if (!name.trim()) return;
    const cat = { id: `sc-${uid()}`, name: name.trim(), icon: "🎯", color: "#1D9E75", targetAmount: Number(target) || null, targetDate: targetDate || null, monthlyTargetAmount: null, archived: false };
    setData(d => ({ ...d, savingsCategories: [...d.savingsCategories, cat] }));
    setShowNew(false); setName(""); setTarget(""); setTargetDate("");
    showToast("Goal created", "success");
  };

  const archive = (id) => {
    setData(d => ({ ...d, savingsCategories: d.savingsCategories.map(s => s.id === id ? { ...s, archived: true } : s) }));
    setEditing(null);
  };

  const goals = data.savingsCategories.filter(s => !s.archived);

  return (
    <div className="anim-stagger px-4 pt-3 pb-28 space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Goals</h1>
        <Button onClick={() => setShowNew(true)} variant="primary"><I.plus size={16}/></Button>
      </div>

      <div className="glass rounded-3xl p-5">
        <p className="text-xs text-[#5A6A5A]">Saved this month</p>
        <p className="text-2xl font-semibold mt-1">₹{fmt(savedThisMonth)}</p>
        <p className="text-xs text-[#5A6A5A] mt-2">Lifetime: ₹{fmt(lifetimeTotal)}</p>
      </div>

      {goals.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center">
          <p className="text-sm text-[#5A6A5A]">No goals yet. Tap + to create one.</p>
        </div>
      ) : (
        goals.map(g => {
          const saved = data.savings.filter(s => s.savingsCategoryId === g.id).reduce((a, b) => a + Number(b.amount || 0), 0);
          const pct = g.targetAmount ? Math.min(100, (saved / g.targetAmount) * 100) : 0;
          return (
            <button key={g.id} onClick={() => setEditing(g)} className="glass rounded-3xl p-4 w-full text-left tap-press">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-xl">{g.icon}</div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{g.name}</p>
                  <p className="text-xs text-[#5A6A5A]">₹{fmt(saved)}{g.targetAmount ? ` of ₹${fmt(g.targetAmount)}` : ""}</p>
                </div>
                {g.targetAmount && <span className="text-xs font-medium">{Math.round(pct)}%</span>}
              </div>
              {g.targetAmount && (
                <div className="h-2 bg-white/40 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#1D9E75] to-[#0F6E56]" style={{ width: `${pct}%` }}/>
                </div>
              )}
            </button>
          );
        })
      )}

      {/* Investments inline */}
      {data.investments.length > 0 && (
        <div className="glass rounded-3xl p-5">
          <p className="text-sm font-medium mb-3 text-[#3D4D3D]">Investments</p>
          {data.investmentTypes.map(t => {
            const items = data.investments.filter(i => i.investmentTypeId === t.id);
            const total = items.reduce((a, b) => a + Number(b.amount || 0), 0);
            if (total === 0) return null;
            return (
              <div key={t.id} className="flex items-center gap-3 py-2">
                <div className="text-lg">{t.icon}</div>
                <div className="flex-1"><p className="text-sm font-medium">{t.name}</p><p className="text-[10px] text-[#5A6A5A]">{items.length} contributions</p></div>
                <p className="text-sm font-semibold">₹{fmt(total)}</p>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New goal">
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="Emergency fund, Goa Trip…" autoFocus/>
          <Input label="Target amount (optional)" prefix="₹" type="number" value={target} onChange={e => setTarget(e.target.value)}/>
          <Input label="Target date (optional)" type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}/>
          <Button onClick={create} variant="primary" className="w-full" disabled={!name.trim()}>Create goal</Button>
        </div>
      </Modal>

      {editing && (
        <Modal open={true} onClose={() => setEditing(null)} title={editing.name}>
          <div className="space-y-3">
            {data.savings.filter(s => s.savingsCategoryId === editing.id).slice(0, 20).map(s => (
              <div key={s.id} className="flex justify-between items-center py-2 border-b border-black/5">
                <div><p className="text-sm">{formatDate(s.date)}</p><p className="text-[10px] text-[#5A6A5A]">{s.note || "—"}</p></div>
                <p className="text-sm font-medium">+ ₹{fmt(s.amount)}</p>
              </div>
            ))}
            <Button onClick={() => archive(editing.id)} variant="danger" className="w-full">Archive goal</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

/* ============= PERSONAL TAB ============= */
const PersonalTab = ({ data, setData, showToast }) => {
  const [cycleOffset, setCycleOffset] = useState(0);
  const cycleRef = useMemo(() => {
    const today = new Date();
    today.setMonth(today.getMonth() + cycleOffset);
    return getCycleForDate(data.settings.billingCycleStartDay || 1, today);
  }, [cycleOffset, data.settings.billingCycleStartDay]);

  const txns = useMemo(() => {
    return data.transactions
      .filter(t => (t.type === "personal" || t.type === "emi") && isInCycle(t.date, cycleRef.start, cycleRef.end))
      .sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  }, [data.transactions, cycleRef]);

  const total = txns.reduce((s, t) => s + Number(t.amount || 0), 0);
  const stats = useCapStats(data);
  const isCurrentCycle = cycleOffset === 0;

  // Avoidability summary
  const overCapTxns = txns.filter(t => t.avoidability != null);
  const avoidableSum = overCapTxns.filter(t => t.avoidability === "avoidable").reduce((s, t) => s + Number(t.amount), 0);
  const unavoidableSum = overCapTxns.filter(t => t.avoidability === "unavoidable").reduce((s, t) => s + Number(t.amount), 0);

  const groupByDate = useMemo(() => {
    const map = {};
    txns.forEach(t => { (map[t.date] = map[t.date] || []).push(t); });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [txns]);

  const deleteTxn = (id) => {
    if (!confirm("Delete this transaction?")) return;
    setData(d => ({ ...d, transactions: d.transactions.filter(t => t.id !== id) }));
  };

  const cap = isCurrentCycle ? stats.effectiveTotalCap : stats.effectiveTotalCap;
  const pct = cap > 0 ? Math.min(100, (total / cap) * 100) : 0;
  const barColor = pct >= 100 ? "from-red-500 to-rose-500" : pct >= 80 ? "from-amber-400 to-orange-500" : "from-[#97C459] to-[#C0DD97]";

  return (
    <div className="anim-stagger px-4 pt-3 pb-28 space-y-3">
      <h1 className="text-2xl font-semibold">Personal</h1>

      <div className="glass rounded-3xl p-5">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setCycleOffset(o => o - 1)} className="p-1 tap-press"><I.arrowLeft size={18}/></button>
          <p className="text-xs font-medium text-[#3D4D3D]">{formatDate(cycleRef.start, { day: "numeric", month: "short" })} — {formatDate(cycleRef.end, { day: "numeric", month: "short" })}</p>
          <button onClick={() => setCycleOffset(o => Math.min(0, o + 1))} className="p-1 tap-press" disabled={cycleOffset >= 0}><I.arrowRight size={18}/></button>
        </div>
        <p className="text-2xl font-semibold mt-2">₹{fmt(total)}</p>
        {isCurrentCycle && cap > 0 && <p className="text-xs text-[#5A6A5A]">of ₹{fmt(cap)} cap · {Math.round(pct)}%</p>}
        {isCurrentCycle && cap > 0 && (
          <div className="h-2 mt-3 bg-white/40 rounded-full overflow-hidden">
            <div className={`h-full bg-gradient-to-r ${barColor}`} style={{ width: `${pct}%` }}/>
          </div>
        )}
        {overCapTxns.length > 0 && (
          <div className="mt-3 pt-3 border-t border-black/5 text-xs">
            <p className="text-red-700 font-medium">Over cap: ₹{fmt(avoidableSum + unavoidableSum)}</p>
            <p className="text-[#5A6A5A] mt-1">₹{fmt(avoidableSum)} avoidable · ₹{fmt(unavoidableSum)} unavoidable</p>
          </div>
        )}
      </div>

      {groupByDate.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center">
          <p className="text-sm text-[#5A6A5A]">No transactions in this cycle</p>
        </div>
      ) : (
        groupByDate.map(([date, list]) => {
          const dayTotal = list.reduce((s, t) => s + Number(t.amount), 0);
          return (
            <div key={date}>
              <div className="flex justify-between items-center px-2 mb-2 mt-3">
                <p className="text-xs font-medium text-[#5A6A5A]">{formatDate(date, { weekday: "short", day: "numeric", month: "short" })}</p>
                <p className="text-xs font-medium text-[#5A6A5A]">₹{fmt(dayTotal)}</p>
              </div>
              <div className="glass rounded-3xl divide-y divide-black/5">
                {list.map(t => {
                  const cat = getCategory(t.categoryId, data.categories);
                  return (
                    <div key={t.id} className="flex items-center gap-3 p-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0" style={{ background: cat.color + "22" }}>{cat.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.merchant || cat.name}</p>
                        <p className="text-[10px] text-[#5A6A5A]">{cat.name} · {getPaymentLabel(t.paymentMethod, data.cards)}{t.avoidability ? ` · ${t.avoidability}` : ""}</p>
                      </div>
                      <p className="text-sm font-medium">−₹{fmt(t.amount)}</p>
                      <button onClick={() => deleteTxn(t.id)} className="text-red-500 ml-1 tap-press"><I.trash size={14}/></button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

/* ============= MORE TAB ============= */
const MoreTab = ({ data, setData, showToast, onSubNav }) => {
  const sections = [
    { id: "cards", label: "Cards", icon: I.card, count: data.cards.filter(c => !c.archived).length },
    { id: "regulars", label: "Regular Expenses", icon: I.refresh, count: data.regularExpenses.filter(r => r.active).length },
    { id: "emis", label: "EMIs", icon: I.zap, count: data.emis.filter(e => e.active).length },
    { id: "income-history", label: "Income History", icon: I.briefcase, count: data.income.length },
    { id: "loans", label: "Money Lent", icon: I.users, count: data.loans.filter(l => l.status === "active").length },
    { id: "categories", label: "Categories", icon: I.target, count: data.categories.filter(c => !c.hidden).length },
    { id: "settings", label: "Settings", icon: I.settings },
    { id: "backup", label: "Backup & Restore", icon: I.download },
  ];
  return (
    <div className="anim-stagger px-4 pt-3 pb-28 space-y-3">
      <h1 className="text-2xl font-semibold">More</h1>
      <div className="glass rounded-3xl divide-y divide-black/5 overflow-hidden">
        {sections.map(s => (
          <button key={s.id} onClick={() => onSubNav(s.id)} className="w-full flex items-center gap-3 p-4 tap-press">
            <div className="w-9 h-9 rounded-xl bg-white/60 flex items-center justify-center"><s.icon size={18}/></div>
            <div className="flex-1 text-left"><p className="text-sm font-medium">{s.label}</p></div>
            {s.count != null && <span className="text-xs text-[#5A6A5A]">{s.count}</span>}
            <I.arrowRight size={16}/>
          </button>
        ))}
      </div>
      <p className="text-center text-[10px] text-[#5A6A5A] pt-4">Expense Tracker v{APP_VERSION} · Works offline</p>
    </div>
  );
};

/* ============= SUB-SCREENS in MORE ============= */
const CardsScreen = ({ data, setData, onBack, showToast }) => {
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [last4, setLast4] = useState("");
  const [color, setColor] = useState(CARD_COLORS[0]);
  const [capMode, setCapMode] = useState("global");
  const [individualCap, setIndividualCap] = useState("");

  const open = (c) => {
    setEditing(c || "new");
    setName(c?.name || ""); setLast4(c?.last4 || ""); setColor(c?.color || CARD_COLORS[data.cards.length % CARD_COLORS.length]);
    setCapMode(c?.capMode || "global"); setIndividualCap(c?.individualCap || "");
  };
  const save = () => {
    if (!name.trim()) return;
    const item = { id: editing === "new" ? `card-${uid()}` : editing.id, name: name.trim(), last4, color, capMode, individualCap: capMode === "individual" ? Number(individualCap) || 0 : null, archived: false };
    setData(d => ({ ...d, cards: editing === "new" ? [...d.cards, item] : d.cards.map(c => c.id === item.id ? item : c) }));
    setEditing(null);
    showToast("Saved", "success");
  };
  const archive = (id) => {
    if (!confirm("Archive this card?")) return;
    setData(d => ({ ...d, cards: d.cards.map(c => c.id === id ? { ...c, archived: true } : c) }));
  };

  return (
    <div className="px-4 pt-3 pb-28 space-y-3">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 tap-press"><I.arrowLeft size={20}/></button>
        <h1 className="text-2xl font-semibold flex-1">Cards</h1>
        <Button variant="primary" onClick={() => open(null)}><I.plus size={16}/></Button>
      </div>
      {data.cards.filter(c => !c.archived).length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center"><p className="text-sm text-[#5A6A5A]">No cards yet</p></div>
      ) : data.cards.filter(c => !c.archived).map(c => (
        <button key={c.id} onClick={() => open(c)} className="glass rounded-2xl p-4 w-full flex items-center gap-3 tap-press">
          <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: c.color }}/>
          <div className="flex-1 text-left">
            <p className="font-medium text-sm">{c.name}{c.last4 ? ` ····${c.last4}` : ""}</p>
            <p className="text-[10px] text-[#5A6A5A]">{c.capMode === "global" ? "Shared cap" : `Own cap ₹${fmt(c.individualCap)}`}</p>
          </div>
          <I.edit size={16}/>
        </button>
      ))}

      {editing && (
        <Modal open={true} onClose={() => setEditing(null)} title={editing === "new" ? "Add card" : "Edit card"}>
          <div className="space-y-4">
            <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="HDFC Regalia" autoFocus/>
            <Input label="Last 4 digits (optional)" value={last4} onChange={e => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric"/>
            <div>
              <label className="block text-xs font-medium text-[#3D4D3D] mb-1.5">Color</label>
              <div className="flex gap-2 flex-wrap">
                {CARD_COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-xl ${color === c ? "ring-2 ring-offset-2 ring-[#1A1F1B]" : ""}`} style={{ background: c }}/>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3D4D3D] mb-1.5">Cap mode</label>
              <div className="flex gap-2 bg-white/60 rounded-2xl p-1">
                <button onClick={() => setCapMode("global")} className={`flex-1 py-2 rounded-xl text-xs font-medium ${capMode === "global" ? "bg-[#1A1F1B] text-white" : "text-[#5A6A5A]"}`}>Shared (global)</button>
                <button onClick={() => setCapMode("individual")} className={`flex-1 py-2 rounded-xl text-xs font-medium ${capMode === "individual" ? "bg-[#1A1F1B] text-white" : "text-[#5A6A5A]"}`}>Own cap</button>
              </div>
              {capMode === "individual" && <div className="mt-3"><Input label="Individual cap" prefix="₹" type="number" value={individualCap} onChange={e => setIndividualCap(e.target.value)}/></div>}
            </div>
            <Button onClick={save} variant="primary" className="w-full">Save</Button>
            {editing !== "new" && <Button onClick={() => archive(editing.id)} variant="danger" className="w-full">Archive</Button>}
          </div>
        </Modal>
      )}
    </div>
  );
};

const RegularsScreen = ({ data, setData, onBack, showToast }) => {
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [categoryId, setCategoryId] = useState("cat-other");
  const [paymentMethod, setPaymentMethod] = useState(data.cards[0]?.id || "bank");

  const open = (r) => {
    setEditing(r || "new");
    setName(r?.name || ""); setAmount(r?.amount || ""); setDayOfMonth(String(r?.dayOfMonth || 1));
    setCategoryId(r?.categoryId || "cat-other"); setPaymentMethod(r?.paymentMethod || (data.cards[0]?.id || "bank"));
  };
  const save = () => {
    if (!name.trim() || !amount) return;
    const item = { id: editing === "new" ? `reg-${uid()}` : editing.id, name: name.trim(), amount: Number(amount), dayOfMonth: Number(dayOfMonth), categoryId, paymentMethod, active: true, lastConfirmedMonth: editing === "new" ? null : editing.lastConfirmedMonth };
    setData(d => ({ ...d, regularExpenses: editing === "new" ? [...d.regularExpenses, item] : d.regularExpenses.map(r => r.id === item.id ? item : r) }));
    setEditing(null); showToast("Saved", "success");
  };
  const remove = (id) => {
    if (!confirm("Delete this regular expense?")) return;
    setData(d => ({ ...d, regularExpenses: d.regularExpenses.filter(r => r.id !== id) }));
  };
  const togglePause = (id) => {
    setData(d => ({ ...d, regularExpenses: d.regularExpenses.map(r => r.id === id ? { ...r, active: !r.active } : r) }));
  };

  return (
    <div className="px-4 pt-3 pb-28 space-y-3">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 tap-press"><I.arrowLeft size={20}/></button>
        <h1 className="text-2xl font-semibold flex-1">Regulars</h1>
        <Button variant="primary" onClick={() => open(null)}><I.plus size={16}/></Button>
      </div>
      <p className="text-xs text-[#5A6A5A]">Set up monthly bills once. We'll prompt you to confirm each on its due date.</p>
      {data.regularExpenses.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center"><p className="text-sm text-[#5A6A5A]">No regulars yet</p></div>
      ) : data.regularExpenses.map(r => {
        const cat = getCategory(r.categoryId, data.categories);
        return (
          <div key={r.id} className={`glass rounded-2xl p-4 flex items-center gap-3 ${!r.active ? "opacity-50" : ""}`}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: cat.color + "22" }}>{cat.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{r.name}</p>
              <p className="text-[10px] text-[#5A6A5A]">₹{fmt(r.amount)} · day {r.dayOfMonth} · {getPaymentLabel(r.paymentMethod, data.cards)}</p>
            </div>
            <button onClick={() => togglePause(r.id)} className="text-xs px-2 py-1 rounded-lg bg-white/70 tap-press">{r.active ? "Pause" : "Resume"}</button>
            <button onClick={() => open(r)} className="tap-press"><I.edit size={16}/></button>
            <button onClick={() => remove(r.id)} className="text-red-500 tap-press"><I.trash size={16}/></button>
          </div>
        );
      })}

      {editing && (
        <Modal open={true} onClose={() => setEditing(null)} title={editing === "new" ? "Add regular" : "Edit regular"}>
          <div className="space-y-4">
            <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="Rent, Electricity…" autoFocus/>
            <Input label="Amount" prefix="₹" type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)}/>
            <Input label="Day of month (1-31)" type="number" min="1" max="31" inputMode="numeric" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)}/>
            <div>
              <label className="block text-xs font-medium text-[#3D4D3D] mb-1.5">Category</label>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {data.categories.filter(c => !c.hidden).map(c => (
                  <button key={c.id} onClick={() => setCategoryId(c.id)}
                    className={`flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press ${categoryId === c.id ? "bg-[#1A1F1B] text-white" : "bg-white/70 border border-white/80"}`}>
                    {c.icon} {c.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3D4D3D] mb-1.5">Payment</label>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {data.cards.filter(c => !c.archived).map(c => (
                  <button key={c.id} onClick={() => setPaymentMethod(c.id)} className={`flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press ${paymentMethod === c.id ? "bg-[#1A1F1B] text-white" : "bg-white/70 border border-white/80"}`}>{c.name}</button>
                ))}
                <button onClick={() => setPaymentMethod("bank")} className={`flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press ${paymentMethod === "bank" ? "bg-[#1A1F1B] text-white" : "bg-white/70 border border-white/80"}`}>Bank</button>
              </div>
            </div>
            <Button onClick={save} variant="primary" className="w-full">Save</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

const EmisScreen = ({ data, setData, onBack }) => {
  return (
    <div className="px-4 pt-3 pb-28 space-y-3">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 tap-press"><I.arrowLeft size={20}/></button>
        <h1 className="text-2xl font-semibold">EMIs</h1>
      </div>
      {data.emis.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center"><p className="text-sm text-[#5A6A5A]">No EMIs. Add one from + → Add EMI.</p></div>
      ) : data.emis.map(e => {
        const pct = (e.monthsPaid / e.totalMonths) * 100;
        return (
          <div key={e.id} className="glass rounded-2xl p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium text-sm">{e.name}</p>
                <p className="text-[10px] text-[#5A6A5A]">₹{fmt(e.monthlyAmount)}/mo · {getPaymentLabel(e.paymentMethod, data.cards)}</p>
              </div>
              <p className="text-xs font-medium">{e.monthsPaid}/{e.totalMonths}</p>
            </div>
            <div className="h-1.5 bg-white/40 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-rose-400 to-pink-500" style={{ width: `${pct}%` }}/>
            </div>
            <p className="text-[10px] text-[#5A6A5A] mt-2">Total ₹{fmt(e.totalAmount)} · {e.isNoCost ? "No-cost" : "With interest"}</p>
          </div>
        );
      })}
    </div>
  );
};

const IncomeHistoryScreen = ({ data, setData, onBack }) => {
  const grouped = useMemo(() => {
    const map = {};
    data.income.forEach(i => { (map[monthKey(i.date)] = map[monthKey(i.date)] || []).push(i); });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [data.income]);

  return (
    <div className="px-4 pt-3 pb-28 space-y-3">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 tap-press"><I.arrowLeft size={20}/></button>
        <h1 className="text-2xl font-semibold">Income</h1>
      </div>
      {grouped.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center"><p className="text-sm text-[#5A6A5A]">No income logged yet</p></div>
      ) : grouped.map(([m, list]) => {
        const total = list.reduce((s, i) => s + Number(i.amount), 0);
        return (
          <div key={m}>
            <div className="flex justify-between mb-2 mt-3 px-2">
              <p className="text-xs font-medium text-[#5A6A5A]">{new Date(m + "-01").toLocaleDateString("en", { month: "long", year: "numeric" })}</p>
              <p className="text-xs font-medium text-[#5A6A5A]">₹{fmt(total)}</p>
            </div>
            <div className="glass rounded-2xl divide-y divide-black/5">
              {list.map(i => (
                <div key={i.id} className="flex items-center gap-3 p-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center"><I.briefcase size={16}/></div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{i.source}</p><p className="text-[10px] text-[#5A6A5A]">{formatDate(i.date)}</p></div>
                  <p className="text-sm font-medium text-emerald-700">+ ₹{fmt(i.amount)}</p>
                  <button onClick={() => { if (confirm("Delete?")) setData(d => ({ ...d, income: d.income.filter(x => x.id !== i.id) })); }} className="text-red-500 tap-press"><I.trash size={14}/></button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const LoansScreen = ({ data, setData, onBack, showToast }) => {
  const active = data.loans.filter(l => l.status === "active");
  const settled = data.loans.filter(l => l.status === "settled");
  const remove = (id) => { if (confirm("Delete loan?")) setData(d => ({ ...d, loans: d.loans.filter(l => l.id !== id) })); };

  const renderLoan = (l) => {
    const repaid = (l.repayments || []).reduce((a, r) => a + Number(r.amount), 0);
    const balance = Math.max(0, Number(l.amount) - repaid);
    const overdue = l.expectedReturnDate && l.status === "active" && new Date(l.expectedReturnDate) < new Date();
    return (
      <div key={l.id} className={`glass rounded-2xl p-4 ${l.status === "settled" ? "opacity-50" : ""}`}>
        <div className="flex justify-between items-start">
          <div>
            <p className="font-medium text-sm">{l.person}</p>
            <p className="text-[10px] text-[#5A6A5A]">Lent {formatDate(l.lentDate)}{l.expectedReturnDate ? ` · expected ${formatDate(l.expectedReturnDate)}` : ""}</p>
            {overdue && <p className="text-[10px] text-red-600 font-medium mt-1">Overdue</p>}
            {l.reason && <p className="text-[10px] text-[#5A6A5A] mt-1">{l.reason}</p>}
          </div>
          <div className="text-right">
            <p className="font-semibold">₹{fmt(balance)}</p>
            <p className="text-[10px] text-[#5A6A5A]">of ₹{fmt(l.amount)}</p>
          </div>
        </div>
        {l.repayments?.length > 0 && (
          <div className="mt-2 pt-2 border-t border-black/5">
            <p className="text-[10px] text-[#5A6A5A] mb-1">Repaid:</p>
            {l.repayments.map((r, i) => (
              <p key={i} className="text-[11px]">₹{fmt(r.amount)} on {formatDate(r.date)}</p>
            ))}
          </div>
        )}
        <button onClick={() => remove(l.id)} className="text-xs text-red-500 mt-2 tap-press">Delete</button>
      </div>
    );
  };

  return (
    <div className="px-4 pt-3 pb-28 space-y-3">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 tap-press"><I.arrowLeft size={20}/></button>
        <h1 className="text-2xl font-semibold">Money Lent</h1>
      </div>
      {active.length === 0 && settled.length === 0 && (
        <div className="glass rounded-3xl p-8 text-center"><p className="text-sm text-[#5A6A5A]">No loans tracked</p></div>
      )}
      {active.length > 0 && (<><p className="text-xs font-medium text-[#5A6A5A] px-2">Active</p>{active.map(renderLoan)}</>)}
      {settled.length > 0 && (<><p className="text-xs font-medium text-[#5A6A5A] px-2 mt-4">Settled</p>{settled.map(renderLoan)}</>)}
    </div>
  );
};

const SettingsScreen = ({ data, setData, onBack, showToast }) => {
  const [globalCap, setGlobalCap] = useState(data.settings.globalCap || "");
  const [cycleDay, setCycleDay] = useState(data.settings.billingCycleStartDay || 1);
  const [cashIncl, setCashIncl] = useState(data.settings.cashIncludedInCapDefault);
  const [pinModal, setPinModal] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const saveSettings = () => {
    setData(d => ({ ...d, settings: { ...d.settings, globalCap: Number(globalCap) || 0, billingCycleStartDay: Number(cycleDay) || 1, cashIncludedInCapDefault: cashIncl } }));
    showToast("Settings saved", "success");
  };

  const setPin = async () => {
    if (newPin.length < 4 || newPin.length > 6 || newPin !== confirmPin) {
      showToast("PINs don't match or invalid length", "danger"); return;
    }
    const salt = uid();
    const hash = await sha256(newPin + salt);
    setData(d => ({ ...d, settings: { ...d.settings, pinHash: hash, pinSalt: salt } }));
    setPinModal(false); setNewPin(""); setConfirmPin("");
    showToast("PIN set", "success");
  };

  const removePin = () => {
    if (!confirm("Remove PIN lock?")) return;
    setData(d => ({ ...d, settings: { ...d.settings, pinHash: null, pinSalt: null } }));
    showToast("PIN removed", "success");
  };

  return (
    <div className="px-4 pt-3 pb-28 space-y-3">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 tap-press"><I.arrowLeft size={20}/></button>
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      <div className="glass rounded-3xl p-5 space-y-4">
        <Input label="Monthly cap" prefix="₹" type="number" value={globalCap} onChange={e => setGlobalCap(e.target.value)}/>
        <Input label="Billing cycle starts on day" type="number" min="1" max="31" value={cycleDay} onChange={e => setCycleDay(e.target.value)}/>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={cashIncl} onChange={e => setCashIncl(e.target.checked)} className="w-4 h-4"/>
          Include cash spends in cap by default
        </label>
        <Button onClick={saveSettings} variant="primary" className="w-full">Save</Button>
      </div>

      <div className="glass rounded-3xl p-5 space-y-3">
        <p className="text-sm font-medium">Security</p>
        {data.settings.pinHash ? (
          <Button onClick={removePin} variant="danger" className="w-full"><I.lock size={16}/> Remove PIN</Button>
        ) : (
          <Button onClick={() => setPinModal(true)} variant="primary" className="w-full"><I.lock size={16}/> Set PIN lock</Button>
        )}
      </div>

      <Modal open={pinModal} onClose={() => setPinModal(false)} title="Set PIN">
        <div className="space-y-4">
          <Input label="New PIN (4-6 digits)" type="password" inputMode="numeric" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus/>
          <Input label="Confirm PIN" type="password" inputMode="numeric" value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}/>
          <Button onClick={setPin} variant="primary" className="w-full" disabled={newPin.length < 4 || newPin !== confirmPin}>Set PIN</Button>
        </div>
      </Modal>
    </div>
  );
};

const CategoriesScreen = ({ data, setData, onBack, showToast }) => {
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📌");
  const [color, setColor] = useState("#64748B");

  const create = () => {
    if (!name.trim()) return;
    const cat = { id: `cat-${uid()}`, name: name.trim(), icon, color, isDefault: false, position: data.categories.length, hidden: false };
    setData(d => ({ ...d, categories: [...d.categories, cat] }));
    setShowNew(false); setName(""); setIcon("📌");
    showToast("Category added", "success");
  };
  const toggleHide = (id) => setData(d => ({ ...d, categories: d.categories.map(c => c.id === id ? { ...c, hidden: !c.hidden } : c) }));

  return (
    <div className="px-4 pt-3 pb-28 space-y-3">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 tap-press"><I.arrowLeft size={20}/></button>
        <h1 className="text-2xl font-semibold flex-1">Categories</h1>
        <Button variant="primary" onClick={() => setShowNew(true)}><I.plus size={16}/></Button>
      </div>
      {data.categories.map(c => (
        <div key={c.id} className={`glass rounded-2xl p-3 flex items-center gap-3 ${c.hidden ? "opacity-40" : ""}`}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: c.color + "22" }}>{c.icon}</div>
          <p className="flex-1 text-sm font-medium">{c.name}</p>
          <button onClick={() => toggleHide(c.id)} className="text-xs px-2 py-1 rounded-lg bg-white/70 tap-press">{c.hidden ? "Show" : "Hide"}</button>
        </div>
      ))}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New category">
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} autoFocus/>
          <Input label="Emoji icon" value={icon} onChange={e => setIcon(e.target.value)} placeholder="🏠 🎯 ⚡" maxLength="2"/>
          <div>
            <label className="block text-xs font-medium text-[#3D4D3D] mb-1.5">Color</label>
            <div className="flex gap-2 flex-wrap">
              {["#F59E0B","#10B981","#3B82F6","#8B5CF6","#EC4899","#EF4444","#06B6D4","#6366F1","#14B8A6","#64748B"].map(c => (
                <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-xl ${color === c ? "ring-2 ring-offset-2 ring-[#1A1F1B]" : ""}`} style={{ background: c }}/>
              ))}
            </div>
          </div>
          <Button onClick={create} variant="primary" className="w-full" disabled={!name.trim()}>Create</Button>
        </div>
      </Modal>
    </div>
  );
};

const BackupScreen = ({ data, setData, onBack, showToast }) => {
  const fileRef = useRef(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const exportData = () => {
    const payload = { version: APP_VERSION, exportedAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `expense-backup-${todayISO()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast("Backup downloaded", "success");
  };

  const importData = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const payload = parsed.data || parsed;
        if (typeof payload !== "object") throw new Error("invalid");
        setData({ ...defaultData, ...payload, settings: { ...defaultData.settings, ...(payload.settings || {}) } });
        showToast("Backup restored", "success");
      } catch { showToast("Invalid backup file", "danger"); }
    };
    reader.readAsText(file); e.target.value = "";
  };

  const reset = () => {
    setData(defaultData); setConfirmReset(false);
    showToast("All data cleared", "success");
  };

  const dataSize = useMemo(() => {
    const b = new Blob([JSON.stringify(data)]).size;
    return b < 1024 ? `${b} B` : `${(b/1024).toFixed(1)} KB`;
  }, [data]);

  return (
    <div className="px-4 pt-3 pb-28 space-y-3">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 tap-press"><I.arrowLeft size={20}/></button>
        <h1 className="text-2xl font-semibold">Backup & Restore</h1>
      </div>

      <div className="glass rounded-3xl p-5 space-y-3">
        <p className="text-xs text-[#5A6A5A]">Download all your data as JSON. Save it to iCloud Drive, email, etc. Restore later or on another device.</p>
        <Button onClick={exportData} variant="primary" className="w-full"><I.download size={16}/> Export backup</Button>
        <Button onClick={() => fileRef.current?.click()} variant="secondary" className="w-full"><I.upload size={16}/> Import backup</Button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={importData}/>
      </div>

      <div className="glass rounded-3xl p-5">
        <p className="text-sm font-medium mb-2">Storage</p>
        <div className="text-xs space-y-1 text-[#5A6A5A]">
          <div className="flex justify-between"><span>Data size</span><span className="font-medium text-[#1A1F1B]">{dataSize}</span></div>
          <div className="flex justify-between"><span>Transactions</span><span>{data.transactions.length}</span></div>
          <div className="flex justify-between"><span>Income entries</span><span>{data.income.length}</span></div>
          <div className="flex justify-between"><span>Savings</span><span>{data.savings.length}</span></div>
          <div className="flex justify-between"><span>Investments</span><span>{data.investments.length}</span></div>
          <div className="flex justify-between"><span>Loans</span><span>{data.loans.length}</span></div>
        </div>
      </div>

      <div className="glass rounded-3xl p-5">
        <p className="text-sm font-medium text-red-600 mb-2">Danger zone</p>
        {confirmReset ? (
          <div className="space-y-2">
            <p className="text-xs">This permanently deletes everything on this device.</p>
            <div className="flex gap-2"><Button onClick={reset} variant="danger" className="flex-1">Yes, delete all</Button><Button onClick={() => setConfirmReset(false)} variant="secondary" className="flex-1">Cancel</Button></div>
          </div>
        ) : <Button onClick={() => setConfirmReset(true)} variant="danger" className="w-full">Clear all data</Button>}
      </div>
    </div>
  );
};

/* ============= APP SHELL ============= */
function App() {
  const [data, setData, loaded] = useStorage();
  const [tab, setTab] = useState("home");
  const [moreSub, setMoreSub] = useState(null);
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [promptQueue, setPromptQueue] = useState([]);
  const [showPrompts, setShowPrompts] = useState(false);

  const showToast = useCallback((message, type = "info") => setToast({ message, type }), []);

  // Check prompt queue on app load
  useEffect(() => {
    if (loaded && data.settings.hasOnboarded) {
      const q = buildPromptQueue(data);
      if (q.length > 0) setPromptQueue(q);
    }
  }, [loaded, data.regularExpenses, data.emis]);

  if (!loaded) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-[#5A6A5A]">Loading…</p></div>;
  }
  if (!data.settings.hasOnboarded) {
    return <Onboarding data={data} setData={setData} onDone={() => {}}/>;
  }
  if (data.settings.pinHash && !unlocked) {
    return <LockScreen data={data} onUnlock={() => setUnlocked(true)}/>;
  }

  const onSubNav = (id) => setMoreSub(id);
  const back = () => setMoreSub(null);

  let content;
  if (tab === "home") content = <Dashboard data={data} setData={setData} onNav={(t) => { if (t === "more") setTab("more"); else if (t === "personal") setTab("personal"); else if (t === "more-loans") { setTab("more"); setMoreSub("loans"); } }}/>;
  else if (tab === "goals") content = <GoalsTab data={data} setData={setData} showToast={showToast}/>;
  else if (tab === "personal") content = <PersonalTab data={data} setData={setData} showToast={showToast}/>;
  else if (tab === "more") {
    if (moreSub === "cards") content = <CardsScreen data={data} setData={setData} onBack={back} showToast={showToast}/>;
    else if (moreSub === "regulars") content = <RegularsScreen data={data} setData={setData} onBack={back} showToast={showToast}/>;
    else if (moreSub === "emis") content = <EmisScreen data={data} setData={setData} onBack={back}/>;
    else if (moreSub === "income-history") content = <IncomeHistoryScreen data={data} setData={setData} onBack={back}/>;
    else if (moreSub === "loans") content = <LoansScreen data={data} setData={setData} onBack={back} showToast={showToast}/>;
    else if (moreSub === "categories") content = <CategoriesScreen data={data} setData={setData} onBack={back} showToast={showToast}/>;
    else if (moreSub === "settings") content = <SettingsScreen data={data} setData={setData} onBack={back} showToast={showToast}/>;
    else if (moreSub === "backup") content = <BackupScreen data={data} setData={setData} onBack={back} showToast={showToast}/>;
    else content = <MoreTab data={data} setData={setData} showToast={showToast} onSubNav={onSubNav}/>;
  }

  return (
    <ToastContext.Provider value={{ show: showToast }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}
      {promptQueue.length > 0 && !showPrompts && tab === "home" && (
        <button onClick={() => setShowPrompts(true)}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-30 glass-strong px-4 py-2 rounded-full text-xs font-medium tap-press flex items-center gap-2 shadow-lg" style={{ marginTop: "env(safe-area-inset-top)" }}>
          <span className="w-2 h-2 rounded-full bg-amber-500 live-dot"/>
          {promptQueue.length} payment{promptQueue.length > 1 ? "s" : ""} due
        </button>
      )}
      {showPrompts && <PromptQueue data={data} setData={setData} queue={promptQueue} onClose={() => { setShowPrompts(false); setPromptQueue(buildPromptQueue(data)); }} showToast={showToast}/>}
      <div className="max-w-md mx-auto">{content}</div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}>
        <div className="glass-strong max-w-md mx-auto rounded-[28px] py-2 px-3 flex justify-between items-center">
          <button onClick={() => { setTab("home"); setMoreSub(null); }} className="tap-press flex flex-col items-center gap-0.5 px-3 py-1.5">
            <I.home size={18}/><span className={`text-[9px] font-medium ${tab==="home"?"":"opacity-60"}`}>Home</span>
          </button>
          <button onClick={() => setTab("goals")} className="tap-press flex flex-col items-center gap-0.5 px-3 py-1.5">
            <I.target size={18}/><span className={`text-[9px] font-medium ${tab==="goals"?"":"opacity-60"}`}>Goals</span>
          </button>
          <button onClick={() => setShowAdd(true)} className="tap-strong w-12 h-12 rounded-full bg-gradient-to-br from-[#1A1F1B] to-[#2D3530] text-white flex items-center justify-center shadow-lg">
            <I.plus size={22} stroke={2.5}/>
          </button>
          <button onClick={() => { setTab("personal"); setMoreSub(null); }} className="tap-press flex flex-col items-center gap-0.5 px-3 py-1.5">
            <I.card size={18}/><span className={`text-[9px] font-medium ${tab==="personal"?"":"opacity-60"}`}>Personal</span>
          </button>
          <button onClick={() => { setTab("more"); setMoreSub(null); }} className="tap-press flex flex-col items-center gap-0.5 px-3 py-1.5">
            <I.more size={18}/><span className={`text-[9px] font-medium ${tab==="more"?"":"opacity-60"}`}>More</span>
          </button>
        </div>
      </nav>

      <AddSheet data={data} setData={setData} open={showAdd} onClose={() => setShowAdd(false)} showToast={showToast}/>
    </ToastContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
