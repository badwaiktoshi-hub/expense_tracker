const { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } = React;
const { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } = Recharts;
const STORAGE_KEY = "expense_tracker_v2";
const APP_VERSION = "2.0.0";
const fmt = (n) => {
  if (n == null || isNaN(n)) return "0";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.abs(Number(n)));
};
const todayISO = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
const monthKey = (iso) => (iso || todayISO()).slice(0, 7);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const formatDate = (iso, opts = { day: "numeric", month: "short" }) => new Date(iso).toLocaleDateString("en", opts);
const daysBetween = (a, b) => Math.ceil((new Date(b) - new Date(a)) / 864e5);
const sha256 = async (text) => {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
};
const getCycleForDate = (cycleStartDay, refDate = /* @__PURE__ */ new Date()) => {
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
    daysLeft: Math.max(0, daysBetween(d.toISOString().slice(0, 10), cycleEnd.toISOString().slice(0, 10)))
  };
};
const isInCycle = (txDate, start, end) => txDate >= start && txDate <= end;
const DEFAULT_CATEGORIES = [
  { id: "cat-food", name: "Food & Dining", icon: "\u{1F37D}\uFE0F", color: "#F59E0B", isDefault: true, position: 0, hidden: false },
  { id: "cat-groceries", name: "Groceries", icon: "\u{1F6D2}", color: "#10B981", isDefault: true, position: 1, hidden: false },
  { id: "cat-transport", name: "Transport / Fuel", icon: "\u{1F697}", color: "#3B82F6", isDefault: true, position: 2, hidden: false },
  { id: "cat-shopping", name: "Shopping", icon: "\u{1F6CD}\uFE0F", color: "#8B5CF6", isDefault: true, position: 3, hidden: false },
  { id: "cat-entertainment", name: "Entertainment / OTT", icon: "\u{1F3AC}", color: "#EC4899", isDefault: true, position: 4, hidden: false },
  { id: "cat-health", name: "Health / Medical", icon: "\u{1F3E5}", color: "#EF4444", isDefault: true, position: 5, hidden: false },
  { id: "cat-travel", name: "Travel", icon: "\u2708\uFE0F", color: "#06B6D4", isDefault: true, position: 6, hidden: false },
  { id: "cat-subscriptions", name: "Subscriptions", icon: "\u{1F504}", color: "#6366F1", isDefault: true, position: 7, hidden: false },
  { id: "cat-education", name: "Education", icon: "\u{1F4DA}", color: "#14B8A6", isDefault: true, position: 8, hidden: false },
  { id: "cat-other", name: "Other", icon: "\u{1F4CC}", color: "#64748B", isDefault: true, position: 9, hidden: false }
];
const DEFAULT_INVESTMENT_TYPES = [
  { id: "inv-fd", name: "Fixed Deposit", icon: "\u{1F3E6}", color: "#3B82F6", isDefault: true },
  { id: "inv-gold", name: "Gold", icon: "\u{1FA99}", color: "#F59E0B", isDefault: true },
  { id: "inv-cash", name: "Cash", icon: "\u{1F4B5}", color: "#10B981", isDefault: true }
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
  loans: []
};
const useStorage = () => {
  const [data, setData] = useState(defaultData);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    var _a, _b;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setData({
          ...defaultData,
          ...parsed,
          settings: { ...defaultData.settings, ...parsed.settings || {} },
          categories: ((_a = parsed.categories) == null ? void 0 : _a.length) ? parsed.categories : DEFAULT_CATEGORIES,
          investmentTypes: ((_b = parsed.investmentTypes) == null ? void 0 : _b.length) ? parsed.investmentTypes : DEFAULT_INVESTMENT_TYPES
        });
      }
    } catch (e) {
      console.error("Load failed", e);
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.error("Save failed", e);
      }
    }
  }, [data, loaded]);
  return [data, setData, loaded];
};
const Icon = ({ d, size = 20, stroke = 2 }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round" }, d);
const I = {
  home: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }), /* @__PURE__ */ React.createElement("polyline", { points: "9 22 9 12 15 12 15 22" })) }),
  target: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "6" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "2" })) }),
  plus: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M5 12h14" }), /* @__PURE__ */ React.createElement("path", { d: "M12 5v14" })) }),
  card: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("rect", { width: "20", height: "14", x: "2", y: "5", rx: "2" }), /* @__PURE__ */ React.createElement("line", { x1: "2", x2: "22", y1: "10", y2: "10" })) }),
  more: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("circle", { cx: "5", cy: "12", r: "1" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "1" }), /* @__PURE__ */ React.createElement("circle", { cx: "19", cy: "12", r: "1" })) }),
  search: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("circle", { cx: "11", cy: "11", r: "8" }), /* @__PURE__ */ React.createElement("path", { d: "m21 21-4.3-4.3" })) }),
  menu: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("line", { x1: "4", x2: "20", y1: "6", y2: "6" }), /* @__PURE__ */ React.createElement("line", { x1: "4", x2: "20", y1: "12", y2: "12" }), /* @__PURE__ */ React.createElement("line", { x1: "4", x2: "20", y1: "18", y2: "18" })) }),
  arrowUpRight: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M7 7h10v10" }), /* @__PURE__ */ React.createElement("path", { d: "M7 17 17 7" })) }),
  arrowLeft: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "m12 19-7-7 7-7" }), /* @__PURE__ */ React.createElement("path", { d: "M19 12H5" })) }),
  arrowRight: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M5 12h14" }), /* @__PURE__ */ React.createElement("path", { d: "m12 5 7 7-7 7" })) }),
  x: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M18 6 6 18" }), /* @__PURE__ */ React.createElement("path", { d: "m6 6 12 12" })) }),
  check: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement("polyline", { points: "20 6 9 17 4 12" }) }),
  trash: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M3 6h18" }), /* @__PURE__ */ React.createElement("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }), /* @__PURE__ */ React.createElement("path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" })) }),
  alert: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" }), /* @__PURE__ */ React.createElement("line", { x1: "12", x2: "12", y1: "9", y2: "13" }), /* @__PURE__ */ React.createElement("line", { x1: "12", x2: "12.01", y1: "17", y2: "17" })) }),
  download: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), /* @__PURE__ */ React.createElement("polyline", { points: "7 10 12 15 17 10" }), /* @__PURE__ */ React.createElement("line", { x1: "12", x2: "12", y1: "15", y2: "3" })) }),
  upload: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), /* @__PURE__ */ React.createElement("polyline", { points: "17 8 12 3 7 8" }), /* @__PURE__ */ React.createElement("line", { x1: "12", x2: "12", y1: "3", y2: "15" })) }),
  briefcase: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("rect", { width: "20", height: "14", x: "2", y: "7", rx: "2" }), /* @__PURE__ */ React.createElement("path", { d: "M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" })) }),
  piggy: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z" }), /* @__PURE__ */ React.createElement("path", { d: "M2 9v1c0 1.1.9 2 2 2h1" }), /* @__PURE__ */ React.createElement("path", { d: "M16 11h.01" })) }),
  trend: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("polyline", { points: "22 7 13.5 15.5 8.5 10.5 2 17" }), /* @__PURE__ */ React.createElement("polyline", { points: "16 7 22 7 22 13" })) }),
  users: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }), /* @__PURE__ */ React.createElement("circle", { cx: "9", cy: "7", r: "4" })) }),
  edit: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }), /* @__PURE__ */ React.createElement("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })) }),
  settings: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "3" })) }),
  lock: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2" }), /* @__PURE__ */ React.createElement("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })) }),
  cal: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("rect", { width: "18", height: "18", x: "3", y: "4", rx: "2" }), /* @__PURE__ */ React.createElement("line", { x1: "16", x2: "16", y1: "2", y2: "6" }), /* @__PURE__ */ React.createElement("line", { x1: "8", x2: "8", y1: "2", y2: "6" }), /* @__PURE__ */ React.createElement("line", { x1: "3", x2: "21", y1: "10", y2: "10" })) }),
  refresh: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }), /* @__PURE__ */ React.createElement("path", { d: "M21 3v5h-5" }), /* @__PURE__ */ React.createElement("path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }), /* @__PURE__ */ React.createElement("path", { d: "M3 21v-5h5" })) }),
  cash: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("rect", { width: "20", height: "12", x: "2", y: "6", rx: "2" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "2" }), /* @__PURE__ */ React.createElement("path", { d: "M6 12h.01M18 12h.01" })) }),
  zap: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" }) }),
  sparkle: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z" })) }),
  bank: (p) => /* @__PURE__ */ React.createElement(Icon, { ...p, d: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("line", { x1: "3", x2: "21", y1: "22", y2: "22" }), /* @__PURE__ */ React.createElement("line", { x1: "6", x2: "6", y1: "18", y2: "11" }), /* @__PURE__ */ React.createElement("line", { x1: "10", x2: "10", y1: "18", y2: "11" }), /* @__PURE__ */ React.createElement("line", { x1: "14", x2: "14", y1: "18", y2: "11" }), /* @__PURE__ */ React.createElement("line", { x1: "18", x2: "18", y1: "18", y2: "11" }), /* @__PURE__ */ React.createElement("polygon", { points: "12 2 20 7 4 7" })) })
};
const Button = ({ children, onClick, variant = "primary", className = "", disabled, type = "button" }) => {
  const variants = {
    primary: "bg-gradient-to-br from-[#1A1F1B] to-[#2D3530] text-white shadow-md hover:shadow-lg",
    secondary: "bg-white/70 backdrop-blur text-[#1A1F1B] border border-white/80",
    ghost: "text-[#1A1F1B] hover:bg-white/40",
    danger: "bg-red-50 text-red-600 border border-red-100",
    accent: "bg-[#7BAA42] text-white shadow-md"
  };
  return /* @__PURE__ */ React.createElement(
    "button",
    {
      type,
      onClick,
      disabled,
      className: `px-4 py-3 rounded-2xl font-medium text-sm transition-all tap-press disabled:opacity-50 ${variants[variant]} ${className}`
    },
    children
  );
};
const Input = ({ label, error, prefix, ...props }) => /* @__PURE__ */ React.createElement("div", null, label && /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-[#3D4D3D] mb-1.5" }, label), /* @__PURE__ */ React.createElement("div", { className: "relative" }, prefix && /* @__PURE__ */ React.createElement("span", { className: "absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5A6A5A] text-sm pointer-events-none" }, prefix), /* @__PURE__ */ React.createElement(
  "input",
  {
    ...props,
    className: `w-full ${prefix ? "pl-8" : "pl-3.5"} pr-3.5 py-3 rounded-2xl border bg-white/70 backdrop-blur focus:bg-white focus:border-[#5A8030] focus:outline-none focus:ring-2 focus:ring-[#5A8030]/15 text-sm transition-colors ${error ? "border-red-300" : "border-white/80"}`
  }
)), error && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-red-500 mt-1" }, error));
const Modal = ({ open, onClose, title, children, size = "md" }) => {
  if (!open) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[#0A1A0A]/40 backdrop-blur-sm", onClick: onClose }, /* @__PURE__ */ React.createElement("div", { className: `bg-white w-full rounded-t-[28px] sm:rounded-3xl max-h-[92vh] overflow-y-auto sheet-anim safe-bottom ${size === "lg" ? "sm:max-w-lg" : "sm:max-w-md"}`, onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10 rounded-t-[28px] sm:rounded-t-3xl" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-semibold" }, title), /* @__PURE__ */ React.createElement("button", { onClick: onClose, className: "p-1.5 rounded-xl hover:bg-slate-100 tap-press" }, /* @__PURE__ */ React.createElement(I.x, { size: 20 }))), /* @__PURE__ */ React.createElement("div", { className: "p-5" }, children)));
};
const Toast = ({ message, type = "info", onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4e3);
    return () => clearTimeout(t);
  }, [onClose]);
  const colors = { warning: "from-amber-500 to-orange-500", danger: "from-red-500 to-rose-600", success: "from-emerald-500 to-green-600", info: "from-slate-700 to-slate-800" };
  return /* @__PURE__ */ React.createElement("div", { className: "fixed top-0 left-0 right-0 z-[200] flex justify-center pointer-events-none px-4", style: { paddingTop: "max(env(safe-area-inset-top), 1rem)" } }, /* @__PURE__ */ React.createElement("div", { className: `bg-gradient-to-r ${colors[type]} text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 pointer-events-auto max-w-md toast-anim` }, (type === "warning" || type === "danger") && /* @__PURE__ */ React.createElement(I.alert, { size: 18 }), type === "success" && /* @__PURE__ */ React.createElement(I.check, { size: 18 }), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-medium" }, message)));
};
const ToastContext = createContext({ show: () => {
} });
const useToast = () => useContext(ToastContext);
const useCapStats = (data) => useMemo(() => {
  const { settings, transactions, cards, emis } = data;
  const cycle = getCycleForDate(settings.billingCycleStartDay || 1);
  const activeEmis = (emis || []).filter((e) => e.active && e.monthsPaid < e.totalMonths);
  const emiCommitments = activeEmis.reduce((s, e) => s + Number(e.monthlyAmount || 0), 0);
  const globalCards = (cards || []).filter((c) => c.capMode === "global" && !c.archived);
  const individualCards = (cards || []).filter((c) => c.capMode === "individual" && !c.archived);
  const globalCardIds = new Set(globalCards.map((c) => c.id));
  const cycleTxns = (transactions || []).filter((t) => {
    if (!isInCycle(t.date, cycle.start, cycle.end)) return false;
    if (!["personal", "emi"].includes(t.type)) return false;
    if (typeof t.paymentMethod === "string" && t.paymentMethod.startsWith("card-")) return true;
    if (t.paymentMethod === "cash") return t.cashIncludedInCap === true;
    return false;
  });
  const globalSpend = cycleTxns.filter((t) => t.paymentMethod === "cash" || globalCardIds.has(t.paymentMethod)).reduce((s, t) => s + Number(t.amount || 0), 0);
  const individualSpends = {};
  individualCards.forEach((c) => {
    individualSpends[c.id] = cycleTxns.filter((t) => t.paymentMethod === c.id).reduce((s, t) => s + Number(t.amount || 0), 0);
  });
  const globalCap = Number(settings.globalCap || 0);
  const effectiveGlobalCap = Math.max(0, globalCap - emiCommitments);
  const totalCap = globalCap + individualCards.reduce((s, c) => s + Number(c.individualCap || 0), 0);
  const effectiveTotalCap = effectiveGlobalCap + individualCards.reduce((s, c) => s + Number(c.individualCap || 0), 0);
  const totalSpend = globalSpend + Object.values(individualSpends).reduce((a, b) => a + b, 0);
  const leftToSpend = effectiveTotalCap - totalSpend;
  const percentUsed = effectiveTotalCap > 0 ? totalSpend / effectiveTotalCap * 100 : 0;
  return { cycle, globalCap, effectiveGlobalCap, emiCommitments, globalSpend, individualSpends, totalCap, effectiveTotalCap, totalSpend, leftToSpend, percentUsed, globalCards, individualCards, activeEmis, cycleTxns };
}, [data]);
const buildPromptQueue = (data) => {
  const queue = [];
  const today = /* @__PURE__ */ new Date();
  const tm = monthKey(today.toISOString());
  const td = today.getDate();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  (data.regularExpenses || []).forEach((r) => {
    if (!r.active) return;
    const dueDay = r.dayOfMonth === 31 ? lastDay : Math.min(r.dayOfMonth, lastDay);
    if (td >= dueDay && r.lastConfirmedMonth !== tm) {
      queue.push({ kind: "regular", id: r.id, name: r.name, amount: r.amount, categoryId: r.categoryId, paymentMethod: r.paymentMethod });
    }
  });
  (data.emis || []).forEach((e) => {
    if (!e.active || e.monthsPaid >= e.totalMonths) return;
    const startDay = new Date(e.startDate).getDate();
    const dueDay = Math.min(startDay, lastDay);
    const alreadyLogged = (data.transactions || []).some((t) => t.emiId === e.id && monthKey(t.date) === tm);
    if (td >= dueDay && !alreadyLogged && e.lastConfirmedMonth !== tm) {
      queue.push({ kind: "emi", id: e.id, name: e.name, amount: e.monthlyAmount, categoryId: e.categoryId, paymentMethod: e.paymentMethod, progress: `${e.monthsPaid + 1} of ${e.totalMonths}` });
    }
  });
  return queue;
};
const getPaymentLabel = (method, cards) => {
  if (method === "cash") return "Cash";
  if (method === "bank") return "Bank";
  const c = cards.find((x) => x.id === method);
  if (!c) return "Unknown";
  return `${c.name}${c.last4 ? ` \xB7\xB7\xB7\xB7${c.last4}` : ""}`;
};
const getCategory = (id, categories) => categories.find((c) => c.id === id) || { name: "Other", icon: "\u{1F4CC}", color: "#64748B" };
const Onboarding = ({ data, setData, onDone }) => {
  const [step, setStep] = useState(0);
  const [cap, setCap] = useState("");
  const [cycleDay, setCycleDay] = useState("1");
  const [cardName, setCardName] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const finish = () => {
    const newCards = cardName ? [{
      id: `card-${uid()}`,
      name: cardName,
      last4: cardLast4,
      color: CARD_COLORS[0],
      capMode: "global",
      individualCap: null,
      archived: false
    }] : data.cards;
    setData((d) => ({
      ...d,
      cards: newCards,
      settings: { ...d.settings, globalCap: Number(cap) || 0, billingCycleStartDay: Number(cycleDay) || 1, hasOnboarded: true }
    }));
    onDone();
  };
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen flex flex-col p-6 pt-12" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-8" }, [0, 1, 2].map((i) => /* @__PURE__ */ React.createElement("div", { key: i, className: `h-1 flex-1 rounded-full transition-all ${i <= step ? "bg-[#1A1F1B]" : "bg-white/60"}` }))), step === 0 && /* @__PURE__ */ React.createElement("div", { className: "anim-stagger flex flex-col flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1A1F1B] to-[#2D3530] flex items-center justify-center mb-6 shadow-lg" }, /* @__PURE__ */ React.createElement(I.sparkle, { size: 28, stroke: 1.5 })), /* @__PURE__ */ React.createElement("h1", { className: "text-3xl font-semibold tracking-tight mb-2" }, "Welcome"), /* @__PURE__ */ React.createElement("p", { className: "text-[#3D4D3D] mb-8" }, "Set up in under a minute. Your data stays on this device \u2014 never sent anywhere."), /* @__PURE__ */ React.createElement("div", { className: "glass rounded-2xl p-4 mb-6" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium mb-1" }, "What you'll set up"), /* @__PURE__ */ React.createElement("ul", { className: "text-sm text-[#3D4D3D] space-y-1.5 mt-2" }, /* @__PURE__ */ React.createElement("li", null, "\u2022 Your monthly spending cap"), /* @__PURE__ */ React.createElement("li", null, "\u2022 Credit card billing cycle date"), /* @__PURE__ */ React.createElement("li", null, "\u2022 Your first card (optional)"))), /* @__PURE__ */ React.createElement("div", { className: "mt-auto" }, /* @__PURE__ */ React.createElement(Button, { variant: "primary", onClick: () => setStep(1), className: "w-full" }, "Get started"))), step === 1 && /* @__PURE__ */ React.createElement("div", { className: "anim-stagger flex flex-col flex-1" }, /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-semibold tracking-tight mb-2" }, "Spending cap"), /* @__PURE__ */ React.createElement("p", { className: "text-[#3D4D3D] mb-6 text-sm" }, "The maximum amount you want to spend on personal expenses each billing cycle."), /* @__PURE__ */ React.createElement(Input, { label: "Monthly cap (\u20B9)", prefix: "\u20B9", type: "number", inputMode: "numeric", value: cap, onChange: (e) => setCap(e.target.value), placeholder: "20000", autoFocus: true }), /* @__PURE__ */ React.createElement("div", { className: "mt-6" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-[#3D4D3D] mb-1.5" }, "Billing cycle starts on day"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-[#5A6A5A] mb-2" }, "e.g., if your card statement closes on the 14th, the cycle starts on the 15th"), /* @__PURE__ */ React.createElement(Input, { type: "number", min: "1", max: "31", inputMode: "numeric", value: cycleDay, onChange: (e) => setCycleDay(e.target.value) })), /* @__PURE__ */ React.createElement("div", { className: "mt-auto flex gap-2" }, /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: () => setStep(0), className: "flex-1" }, "Back"), /* @__PURE__ */ React.createElement(Button, { variant: "primary", onClick: () => setStep(2), disabled: !cap, className: "flex-1" }, "Next"))), step === 2 && /* @__PURE__ */ React.createElement("div", { className: "anim-stagger flex flex-col flex-1" }, /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-semibold tracking-tight mb-2" }, "Add your first card"), /* @__PURE__ */ React.createElement("p", { className: "text-[#3D4D3D] mb-6 text-sm" }, "Optional \u2014 you can add more cards anytime later."), /* @__PURE__ */ React.createElement(Input, { label: "Card name", value: cardName, onChange: (e) => setCardName(e.target.value), placeholder: "HDFC Regalia" }), /* @__PURE__ */ React.createElement("div", { className: "mt-4" }, /* @__PURE__ */ React.createElement(Input, { label: "Last 4 digits (optional)", value: cardLast4, onChange: (e) => setCardLast4(e.target.value.replace(/\D/g, "").slice(0, 4)), placeholder: "4521", inputMode: "numeric" })), /* @__PURE__ */ React.createElement("div", { className: "mt-auto flex gap-2" }, /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: () => setStep(1), className: "flex-1" }, "Back"), /* @__PURE__ */ React.createElement(Button, { variant: "primary", onClick: finish, className: "flex-1" }, cardName ? "Done" : "Skip & finish"))));
};
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
        setLockedUntil(Date.now() + 6e4);
        setTimeout(() => {
          setLockedUntil(0);
          setAttempts(0);
          setError("");
        }, 6e4);
      }
    }
  };
  useEffect(() => {
    if (pin.length >= 4 && pin.length <= 6 && !lockedUntil) {
      const t = setTimeout(() => checkPin(pin), 200);
      return () => clearTimeout(t);
    }
  }, [pin]);
  const press = (n) => {
    if (lockedUntil) return;
    if (pin.length < 6) setPin((p) => p + n);
  };
  const back = () => setPin((p) => p.slice(0, -1));
  const locked = !!lockedUntil;
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen flex flex-col items-center justify-center p-6" }, /* @__PURE__ */ React.createElement("div", { className: "w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1A1F1B] to-[#2D3530] flex items-center justify-center mb-6 shadow-lg text-white" }, /* @__PURE__ */ React.createElement(I.lock, { size: 28 })), /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-semibold mb-2" }, "Enter PIN"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 mb-6" }, [0, 1, 2, 3, 4, 5].map((i) => /* @__PURE__ */ React.createElement("div", { key: i, className: `w-3 h-3 rounded-full transition-all ${i < pin.length ? "bg-[#1A1F1B]" : "bg-white/70 border border-white/90"}` }))), error && /* @__PURE__ */ React.createElement("p", { className: `text-sm mb-4 ${locked ? "text-red-600" : "text-amber-700"}` }, error), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-3 max-w-xs w-full" }, [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: n,
      onClick: () => press(n.toString()),
      disabled: locked,
      className: "glass-strong h-16 rounded-2xl text-2xl font-medium tap-press disabled:opacity-50"
    },
    n
  )), /* @__PURE__ */ React.createElement("div", null), /* @__PURE__ */ React.createElement("button", { onClick: () => press("0"), disabled: locked, className: "glass-strong h-16 rounded-2xl text-2xl font-medium tap-press disabled:opacity-50" }, "0"), /* @__PURE__ */ React.createElement("button", { onClick: back, disabled: locked || !pin.length, className: "h-16 rounded-2xl flex items-center justify-center tap-press disabled:opacity-50" }, /* @__PURE__ */ React.createElement(I.arrowLeft, { size: 22 }))));
};
const Dashboard = ({ data, setData, onNav }) => {
  const stats = useCapStats(data);
  const [view, setView] = useState("combined");
  const monthData = useMemo(() => {
    const cm = monthKey(todayISO());
    const inMonth = (d) => monthKey(d) === cm;
    const income = (data.income || []).filter((i) => inMonth(i.date)).reduce((s, i) => s + Number(i.amount || 0), 0);
    const regular = (data.transactions || []).filter((t) => t.type === "regular" && inMonth(t.date)).reduce((s, t) => s + Number(t.amount || 0), 0);
    const personal = (data.transactions || []).filter((t) => (t.type === "personal" || t.type === "emi") && inMonth(t.date)).reduce((s, t) => s + Number(t.amount || 0), 0);
    const savings = (data.savings || []).filter((s) => inMonth(s.date)).reduce((s, e) => s + Number(e.amount || 0), 0);
    const investments = (data.investments || []).filter((i) => inMonth(i.date)).reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalOut2 = regular + personal + savings + investments;
    return { income, regular, personal, savings, investments, totalOut: totalOut2, net: income - totalOut2 };
  }, [data]);
  const categoryBreakdown = useMemo(() => {
    const map = {};
    stats.cycleTxns.forEach((t) => {
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
    return [...data.transactions || []].sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id)).slice(0, 5);
  }, [data.transactions]);
  const activeLoans = (data.loans || []).filter((l) => l.status === "active");
  const totalLent = activeLoans.reduce((s, l) => {
    const repaid = (l.repayments || []).reduce((x, r) => x + Number(r.amount || 0), 0);
    return s + Math.max(0, Number(l.amount || 0) - repaid);
  }, 0);
  const pct = Math.min(100, stats.percentUsed);
  const barColor = pct >= 100 ? "from-red-500 to-rose-500" : pct >= 80 ? "from-amber-400 to-orange-500" : "from-[#97C459] to-[#C0DD97]";
  const pillColor = pct >= 100 ? "bg-red-500/25 text-red-100 border-red-400/40" : pct >= 80 ? "bg-amber-500/25 text-amber-100 border-amber-400/40" : "bg-[#97C459]/20 text-[#C0DD97] border-[#97C459]/30";
  const outflowSegs = [
    { key: "Regular", val: monthData.regular, color: "#E24B4A" },
    { key: "Personal", val: monthData.personal, color: "#EF9F27" },
    { key: "Savings", val: monthData.savings, color: "#1D9E75" },
    { key: "Investments", val: monthData.investments, color: "#378ADD" }
  ];
  const totalOut = monthData.totalOut || 1;
  return /* @__PURE__ */ React.createElement("div", { className: "anim-stagger space-y-3 px-4 pt-3 pb-28" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("button", { onClick: () => onNav("more"), className: "glass tap-press w-10 h-10 rounded-xl flex items-center justify-center" }, /* @__PURE__ */ React.createElement(I.menu, { size: 18 })), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement("button", { onClick: () => onNav("search"), className: "glass tap-press w-10 h-10 rounded-xl flex items-center justify-center" }, /* @__PURE__ */ React.createElement(I.search, { size: 18 })), /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 rounded-full bg-gradient-to-br from-[#C9B89E] to-[#A89882] flex items-center justify-center text-[#4A1B0C] font-medium text-sm border-2 border-white/60" }, "SK"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-[#5A6A5A]" }, "Hello"), /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-semibold tracking-tight" }, "Your dashboard")), /* @__PURE__ */ React.createElement("div", { className: "glass-dark rounded-3xl p-5 text-white overflow-hidden relative" }, /* @__PURE__ */ React.createElement("div", { className: "absolute w-40 h-40 rounded-full top-[-50px] right-[-30px] pointer-events-none", style: { background: "radial-gradient(circle, rgba(151,196,89,0.18), transparent 70%)" } }), /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between mb-1.5 relative" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("span", { className: "live-dot w-1.5 h-1.5 rounded-full bg-[#97C459]", style: { boxShadow: "0 0 8px #97C459" } }), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-[#B8C2BA]" }, stats.effectiveTotalCap > 0 ? `Left to spend \xB7 cycle ends ${formatDate(stats.cycle.end)}` : "Set your cap to begin")), stats.effectiveTotalCap > 0 && /* @__PURE__ */ React.createElement("span", { className: `${pillColor} text-xs font-medium px-2 py-1 rounded-full border` }, Math.round(pct), "% used")), /* @__PURE__ */ React.createElement("div", { className: "flex items-baseline gap-1.5 mt-1 mb-3 relative" }, /* @__PURE__ */ React.createElement("span", { className: "text-4xl font-medium tracking-tight" }, "\u20B9", fmt(Math.max(0, stats.leftToSpend))), stats.effectiveTotalCap > 0 && /* @__PURE__ */ React.createElement("span", { className: "text-sm text-[#B8C2BA]" }, "/ \u20B9", fmt(stats.effectiveTotalCap))), stats.effectiveTotalCap > 0 && /* @__PURE__ */ React.createElement("div", { className: "h-1.5 bg-white/10 rounded-full overflow-hidden mb-3 relative" }, /* @__PURE__ */ React.createElement("div", { className: `bar-grow h-full rounded-full bg-gradient-to-r ${barColor}`, style: { "--w": `${pct}%`, width: `${pct}%`, boxShadow: "0 0 12px rgba(151,196,89,0.4)" } })), stats.individualCards.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center pt-2.5 border-t border-white/10 relative" }, /* @__PURE__ */ React.createElement("div", { className: "flex gap-1 bg-white/5 p-0.5 rounded-full" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setView("combined"), className: `px-3 py-1 text-xs font-medium rounded-full transition-all ${view === "combined" ? "bg-[#97C459]/20 text-[#C0DD97]" : "text-[#8A938C]"}` }, "Combined"), /* @__PURE__ */ React.createElement("button", { onClick: () => setView("per-card"), className: `px-3 py-1 text-xs font-medium rounded-full transition-all ${view === "per-card" ? "bg-[#97C459]/20 text-[#C0DD97]" : "text-[#8A938C]"}` }, "Per card")), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-[#B8C2BA]" }, stats.cycle.daysLeft, " days left")), stats.emiCommitments > 0 && /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-[#8A938C] mt-2 relative" }, "After \u20B9", fmt(stats.emiCommitments), "/cycle EMI commitments")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => onNav("add-expense"),
      className: "w-full glass-dark rounded-3xl py-4 px-5 flex items-center justify-between text-white tap-strong",
      style: { background: "linear-gradient(135deg, rgba(123,170,66,0.92), rgba(80,120,40,0.95))", boxShadow: "0 4px 20px rgba(123,170,66,0.3)" }
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(I.plus, { size: 20, stroke: 2.5 })), /* @__PURE__ */ React.createElement("div", { className: "text-left" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-sm" }, "Add expense"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-white/70" }, "Log a personal spend"))),
    /* @__PURE__ */ React.createElement(I.arrowRight, { size: 18 })
  ), view === "per-card" && stats.individualCards.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "glass rounded-3xl p-4 space-y-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-medium text-[#3D4D3D]" }, "Per card breakdown"), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-xs mb-1" }, /* @__PURE__ */ React.createElement("span", null, "Cards on shared cap"), /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "\u20B9", fmt(stats.globalSpend), " / \u20B9", fmt(stats.effectiveGlobalCap))), /* @__PURE__ */ React.createElement("div", { className: "h-1.5 bg-white/40 rounded-full overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "h-full bg-[#97C459]", style: { width: `${stats.effectiveGlobalCap > 0 ? Math.min(100, stats.globalSpend / stats.effectiveGlobalCap * 100) : 0}%` } }))), stats.individualCards.map((c) => {
    const spend = stats.individualSpends[c.id] || 0;
    const cap = Number(c.individualCap || 0);
    const p = cap > 0 ? Math.min(100, spend / cap * 100) : 0;
    return /* @__PURE__ */ React.createElement("div", { key: c.id }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-xs mb-1" }, /* @__PURE__ */ React.createElement("span", null, c.name), /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "\u20B9", fmt(spend), " / \u20B9", fmt(cap))), /* @__PURE__ */ React.createElement("div", { className: "h-1.5 bg-white/40 rounded-full overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "h-full", style: { width: `${p}%`, background: c.color } })));
  }))), /* @__PURE__ */ React.createElement("div", { className: "glass rounded-3xl p-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-[#3D4D3D]" }, "Income vs outflows \xB7 ", (/* @__PURE__ */ new Date()).toLocaleDateString("en", { month: "long" })), /* @__PURE__ */ React.createElement("span", { className: `text-sm font-semibold ${monthData.net >= 0 ? "text-[#1D9E75]" : "text-[#E24B4A]"}` }, monthData.net >= 0 ? "+ " : "\u2212 ", "\u20B9", fmt(monthData.net))), /* @__PURE__ */ React.createElement("div", { className: "mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-xs text-[#5A6A5A] mb-1" }, /* @__PURE__ */ React.createElement("span", null, "Income"), /* @__PURE__ */ React.createElement("span", null, "\u20B9", fmt(monthData.income))), /* @__PURE__ */ React.createElement("div", { className: "h-3 bg-[#1D9E75]/15 rounded-lg overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "bar-grow h-full bg-gradient-to-r from-[#1D9E75] to-[#0F6E56]", style: { "--w": "100%", width: monthData.income > 0 ? "100%" : "0%" } }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-xs text-[#5A6A5A] mb-1" }, /* @__PURE__ */ React.createElement("span", null, "Outflows"), /* @__PURE__ */ React.createElement("span", null, "\u20B9", fmt(monthData.totalOut))), /* @__PURE__ */ React.createElement("div", { className: "h-3 rounded-lg overflow-hidden flex" }, outflowSegs.map((s) => s.val > 0 && /* @__PURE__ */ React.createElement("div", { key: s.key, style: { width: `${s.val / totalOut * 100}%`, background: s.color } }))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mt-2 text-[10px] text-[#3D4D3D]" }, outflowSegs.map((s) => /* @__PURE__ */ React.createElement("span", { key: s.key, className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "w-2 h-2 rounded-full", style: { background: s.color } }), s.key))))), categoryBreakdown.items.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "glass rounded-3xl p-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-[#3D4D3D]" }, "Spending by category \xB7 cycle"), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-[#5A6A5A]" }, "\u20B9", fmt(categoryBreakdown.total))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex-shrink-0" }, /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: 120, height: 120 }, /* @__PURE__ */ React.createElement(PieChart, null, /* @__PURE__ */ React.createElement(Pie, { data: categoryBreakdown.items, cx: "50%", cy: "50%", innerRadius: 36, outerRadius: 56, dataKey: "value", stroke: "none" }, categoryBreakdown.items.map((e, i) => /* @__PURE__ */ React.createElement(Cell, { key: i, fill: e.color }))), /* @__PURE__ */ React.createElement(Tooltip, { formatter: (v) => `\u20B9${fmt(v)}` })))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0 space-y-1.5" }, categoryBreakdown.items.slice(0, 4).map((it) => /* @__PURE__ */ React.createElement("div", { key: it.catId, className: "flex items-center gap-2 text-xs" }, /* @__PURE__ */ React.createElement("span", { className: "w-2 h-2 rounded-sm flex-shrink-0", style: { background: it.color } }), /* @__PURE__ */ React.createElement("span", { className: "flex-1 truncate" }, it.name), /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "\u20B9", fmt(it.value)))), categoryBreakdown.items.length > 4 && /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-[#5A6A5A] pt-1" }, "+ ", categoryBreakdown.items.length - 4, " more")))), recentTxns.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "glass rounded-3xl p-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-[#3D4D3D]" }, "Recent transactions"), /* @__PURE__ */ React.createElement("button", { onClick: () => onNav("personal"), className: "tap-press" }, /* @__PURE__ */ React.createElement(I.arrowUpRight, { size: 16 }))), recentTxns.map((t, i) => {
    const cat = getCategory(t.categoryId, data.categories);
    return /* @__PURE__ */ React.createElement("div", { key: t.id, className: `flex items-center gap-3 py-2.5 ${i > 0 ? "border-t border-black/5" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0", style: { background: cat.color + "22", border: `0.5px solid ${cat.color}33` } }, /* @__PURE__ */ React.createElement("span", null, cat.icon)), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium truncate" }, t.merchant || cat.name), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-[#5A6A5A]" }, cat.name, " \xB7 ", getPaymentLabel(t.paymentMethod, data.cards))), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium" }, "\u2212\u20B9", fmt(t.amount)));
  })), totalLent > 0 && /* @__PURE__ */ React.createElement("button", { onClick: () => onNav("more-loans"), className: "glass rounded-3xl p-4 w-full flex items-center justify-between border-l-4 border-[#7F77DD]" }, /* @__PURE__ */ React.createElement("div", { className: "text-left" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-[#5A6A5A]" }, "Money lent \xB7 pending"), /* @__PURE__ */ React.createElement("p", { className: "text-lg font-semibold mt-0.5" }, "\u20B9", fmt(totalLent)), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-[#5A6A5A]" }, activeLoans.length, " ", activeLoans.length === 1 ? "person" : "people")), /* @__PURE__ */ React.createElement(I.users, { size: 20 })));
};
const AddSheet = ({ data, setData, open, onClose, showToast, initialMode = null }) => {
  const [mode, setMode] = useState(null);
  useEffect(() => {
    if (!open) setMode(null);
    else if (initialMode) setMode(initialMode);
  }, [open, initialMode]);
  if (!open) return null;
  if (!mode) {
    return /* @__PURE__ */ React.createElement(Modal, { open, onClose, title: "Add" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setMode("personal"), className: "w-full glass-strong rounded-2xl p-4 flex items-center gap-3 tap-press" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(I.card, { size: 18 })), /* @__PURE__ */ React.createElement("div", { className: "text-left flex-1" }, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-sm" }, "Personal Expense"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-[#5A6A5A]" }, "Most common \u2014 log a card or cash spend")), /* @__PURE__ */ React.createElement(I.arrowRight, { size: 16 })), /* @__PURE__ */ React.createElement("button", { onClick: () => setMode("income"), className: "w-full glass rounded-2xl p-4 flex items-center gap-3 tap-press" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(I.briefcase, { size: 18 })), /* @__PURE__ */ React.createElement("div", { className: "text-left flex-1" }, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-sm" }, "Income")), /* @__PURE__ */ React.createElement(I.arrowRight, { size: 16 })), /* @__PURE__ */ React.createElement("button", { onClick: () => setMode("savings"), className: "w-full glass rounded-2xl p-4 flex items-center gap-3 tap-press" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(I.piggy, { size: 18 })), /* @__PURE__ */ React.createElement("div", { className: "text-left flex-1" }, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-sm" }, "Add to Savings")), /* @__PURE__ */ React.createElement(I.arrowRight, { size: 16 })), /* @__PURE__ */ React.createElement("button", { onClick: () => setMode("investment"), className: "w-full glass rounded-2xl p-4 flex items-center gap-3 tap-press" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(I.trend, { size: 18 })), /* @__PURE__ */ React.createElement("div", { className: "text-left flex-1" }, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-sm" }, "Investment")), /* @__PURE__ */ React.createElement(I.arrowRight, { size: 16 })), /* @__PURE__ */ React.createElement("button", { onClick: () => setMode("loan"), className: "w-full glass rounded-2xl p-4 flex items-center gap-3 tap-press" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(I.users, { size: 18 })), /* @__PURE__ */ React.createElement("div", { className: "text-left flex-1" }, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-sm" }, "Lend / Repayment")), /* @__PURE__ */ React.createElement(I.arrowRight, { size: 16 })), /* @__PURE__ */ React.createElement("button", { onClick: () => setMode("emi"), className: "w-full glass rounded-2xl p-4 flex items-center gap-3 tap-press" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(I.refresh, { size: 18 })), /* @__PURE__ */ React.createElement("div", { className: "text-left flex-1" }, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-sm" }, "Add EMI")), /* @__PURE__ */ React.createElement(I.arrowRight, { size: 16 }))));
  }
  return /* @__PURE__ */ React.createElement(FormRouter, { mode, data, setData, onClose, showToast });
};
const FormRouter = ({ mode, data, setData, onClose, showToast }) => {
  if (mode === "personal") return /* @__PURE__ */ React.createElement(PersonalExpenseForm, { data, setData, onClose, showToast });
  if (mode === "income") return /* @__PURE__ */ React.createElement(IncomeForm, { data, setData, onClose, showToast });
  if (mode === "savings") return /* @__PURE__ */ React.createElement(SavingsForm, { data, setData, onClose, showToast });
  if (mode === "investment") return /* @__PURE__ */ React.createElement(InvestmentForm, { data, setData, onClose, showToast });
  if (mode === "loan") return /* @__PURE__ */ React.createElement(LoanForm, { data, setData, onClose, showToast });
  if (mode === "emi") return /* @__PURE__ */ React.createElement(EmiForm, { data, setData, onClose, showToast });
  return null;
};
const PersonalExpenseForm = ({ data, setData, onClose, showToast, prefill = null }) => {
  var _a;
  const [amount, setAmount] = useState((prefill == null ? void 0 : prefill.amount) || "");
  const [categoryId, setCategoryId] = useState((prefill == null ? void 0 : prefill.categoryId) || "cat-other");
  const [paymentMethod, setPaymentMethod] = useState((prefill == null ? void 0 : prefill.paymentMethod) || (((_a = data.cards[0]) == null ? void 0 : _a.id) || "cash"));
  const [merchant, setMerchant] = useState((prefill == null ? void 0 : prefill.merchant) || "");
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
    avoidability
  });
  const saveTxn = (txn) => {
    setData((d) => ({ ...d, transactions: [txn, ...d.transactions] }));
    const newSpend = oldStats.totalSpend + (txn.paymentMethod === "cash" && !txn.cashIncludedInCap ? 0 : Number(txn.amount));
    const newPct = oldStats.effectiveTotalCap > 0 ? newSpend / oldStats.effectiveTotalCap * 100 : 0;
    if (oldPct < 100 && newPct >= 100) {
      showToast(`Cap exceeded! \u20B9${fmt(newSpend - oldStats.effectiveTotalCap)} over limit`, "danger");
    } else if (oldPct < 80 && newPct >= 80) {
      showToast(`80% of cap used. \u20B9${fmt(oldStats.effectiveTotalCap - newSpend)} left for ${oldStats.cycle.daysLeft} days`, "warning");
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
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Modal, { open: true, onClose, title: "Personal Expense" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement(Input, { label: "Amount", prefix: "\u20B9", type: "number", inputMode: "decimal", value: amount, onChange: (e) => setAmount(e.target.value), placeholder: "500", autoFocus: true }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-[#3D4D3D] mb-1.5" }, "Category"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 overflow-x-auto no-scrollbar pb-1" }, data.categories.filter((c) => !c.hidden).map((c) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: c.id,
      onClick: () => setCategoryId(c.id),
      className: `flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press flex items-center gap-1.5 ${categoryId === c.id ? "bg-[#1A1F1B] text-white" : "bg-white/70 border border-white/80"}`
    },
    /* @__PURE__ */ React.createElement("span", null, c.icon),
    c.name
  )))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-[#3D4D3D] mb-1.5" }, "Payment"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 overflow-x-auto no-scrollbar pb-1" }, data.cards.filter((c) => !c.archived).map((c) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: c.id,
      onClick: () => setPaymentMethod(c.id),
      className: `flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press flex items-center gap-1.5 ${paymentMethod === c.id ? "bg-[#1A1F1B] text-white" : "bg-white/70 border border-white/80"}`
    },
    /* @__PURE__ */ React.createElement("span", { className: "w-2 h-2 rounded-full", style: { background: c.color } }),
    c.name,
    c.last4 ? ` \xB7\xB7\xB7\xB7${c.last4}` : ""
  )), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setPaymentMethod("bank"),
      className: `flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press ${paymentMethod === "bank" ? "bg-[#1A1F1B] text-white" : "bg-white/70 border border-white/80"}`
    },
    "Bank"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setPaymentMethod("cash"),
      className: `flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press ${paymentMethod === "cash" ? "bg-[#1A1F1B] text-white" : "bg-white/70 border border-white/80"}`
    },
    "Cash"
  )), paymentMethod === "cash" && /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 mt-3 text-xs" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: cashIncl, onChange: (e) => setCashIncl(e.target.checked), className: "w-4 h-4 rounded" }), "Include this cash spend in monthly cap")), /* @__PURE__ */ React.createElement(Input, { label: "Merchant", value: merchant, onChange: (e) => setMerchant(e.target.value), placeholder: "Where? (optional)" }), /* @__PURE__ */ React.createElement(Input, { label: "Date", type: "date", value: date, onChange: (e) => setDate(e.target.value) }), /* @__PURE__ */ React.createElement(Input, { label: "Note (optional)", value: note, onChange: (e) => setNote(e.target.value) }), /* @__PURE__ */ React.createElement(Button, { onClick: submit, variant: "primary", className: "w-full", disabled: !amount }, "Save"))), showAvoidability && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[150] bg-black/60 flex items-center justify-center p-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-3xl p-6 max-w-sm w-full modal-anim" }, /* @__PURE__ */ React.createElement("div", { className: "w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mb-4 text-red-600" }, /* @__PURE__ */ React.createElement(I.alert, { size: 22 })), /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-semibold mb-2" }, "Already over cap"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-[#3D4D3D] mb-5" }, "Was this expense:"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement(Button, { onClick: () => onAvoidabilityPick("unavoidable"), variant: "primary", className: "w-full" }, "Unavoidable"), /* @__PURE__ */ React.createElement(Button, { onClick: () => onAvoidabilityPick("avoidable"), variant: "secondary", className: "w-full" }, "Avoidable")))));
};
const IncomeForm = ({ data, setData, onClose, showToast }) => {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");
  const submit = () => {
    if (!amount || Number(amount) <= 0) return;
    const item = { id: `inc-${uid()}`, amount: Number(amount), date, source: source.trim() || "Income", note };
    setData((d) => ({ ...d, income: [item, ...d.income] }));
    showToast("Income logged", "success");
    onClose();
  };
  return /* @__PURE__ */ React.createElement(Modal, { open: true, onClose, title: "Income" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement(Input, { label: "Amount", prefix: "\u20B9", type: "number", inputMode: "decimal", value: amount, onChange: (e) => setAmount(e.target.value), placeholder: "50000", autoFocus: true }), /* @__PURE__ */ React.createElement(Input, { label: "Source", value: source, onChange: (e) => setSource(e.target.value), placeholder: "Salary, Freelance \u2014 ClientX, Rent\u2026" }), /* @__PURE__ */ React.createElement(Input, { label: "Date", type: "date", value: date, onChange: (e) => setDate(e.target.value) }), /* @__PURE__ */ React.createElement(Input, { label: "Note (optional)", value: note, onChange: (e) => setNote(e.target.value) }), /* @__PURE__ */ React.createElement(Button, { onClick: submit, variant: "primary", className: "w-full", disabled: !amount }, "Save")));
};
const SavingsForm = ({ data, setData, onClose, showToast }) => {
  var _a;
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [savingsCategoryId, setSavingsCategoryId] = useState(((_a = data.savingsCategories[0]) == null ? void 0 : _a.id) || "");
  const [note, setNote] = useState("");
  const [showNew, setShowNew] = useState(!data.savingsCategories.length);
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const submit = () => {
    if (!amount || Number(amount) <= 0 || !savingsCategoryId) return;
    const item = { id: `sav-${uid()}`, amount: Number(amount), date, savingsCategoryId, note };
    setData((d) => ({ ...d, savings: [item, ...d.savings] }));
    showToast("Saving logged", "success");
    onClose();
  };
  const createCat = () => {
    if (!newName.trim()) return;
    const cat = { id: `sc-${uid()}`, name: newName.trim(), icon: "\u{1F3AF}", color: "#1D9E75", targetAmount: Number(newTarget) || null, targetDate: null, monthlyTargetAmount: null, archived: false };
    setData((d) => ({ ...d, savingsCategories: [...d.savingsCategories, cat] }));
    setSavingsCategoryId(cat.id);
    setShowNew(false);
    setNewName("");
    setNewTarget("");
  };
  const selected = data.savingsCategories.find((s) => s.id === savingsCategoryId);
  const savedSoFar = selected ? data.savings.filter((s) => s.savingsCategoryId === selected.id).reduce((a, b) => a + Number(b.amount || 0), 0) : 0;
  return /* @__PURE__ */ React.createElement(Modal, { open: true, onClose, title: "Add to Savings" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, showNew || !data.savingsCategories.length ? /* @__PURE__ */ React.createElement("div", { className: "space-y-3 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-medium text-emerald-800" }, "Create a new goal"), /* @__PURE__ */ React.createElement(Input, { label: "Name", value: newName, onChange: (e) => setNewName(e.target.value), placeholder: "Emergency fund, Goa Trip\u2026" }), /* @__PURE__ */ React.createElement(Input, { label: "Target amount (optional)", prefix: "\u20B9", type: "number", value: newTarget, onChange: (e) => setNewTarget(e.target.value), placeholder: "50000" }), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(Button, { onClick: createCat, variant: "accent", className: "flex-1", disabled: !newName.trim() }, "Create"), data.savingsCategories.length > 0 && /* @__PURE__ */ React.createElement(Button, { onClick: () => setShowNew(false), variant: "secondary", className: "flex-1" }, "Cancel"))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-[#3D4D3D] mb-1.5" }, "Goal"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 overflow-x-auto no-scrollbar pb-1" }, data.savingsCategories.filter((s) => !s.archived).map((s) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: s.id,
      onClick: () => setSavingsCategoryId(s.id),
      className: `flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press ${savingsCategoryId === s.id ? "bg-[#1A1F1B] text-white" : "bg-white/70 border border-white/80"}`
    },
    s.icon,
    " ",
    s.name
  )), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowNew(true), className: "flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press bg-emerald-50 text-emerald-700 border border-emerald-200" }, "+ New"))), selected && /* @__PURE__ */ React.createElement("div", { className: "p-3 rounded-xl bg-emerald-50/50 text-xs text-emerald-800" }, "Saved so far: \u20B9", fmt(savedSoFar), selected.targetAmount ? ` of \u20B9${fmt(selected.targetAmount)} target (${Math.round(savedSoFar / selected.targetAmount * 100)}%)` : ""), /* @__PURE__ */ React.createElement(Input, { label: "Amount", prefix: "\u20B9", type: "number", inputMode: "decimal", value: amount, onChange: (e) => setAmount(e.target.value), placeholder: "5000", autoFocus: true }), /* @__PURE__ */ React.createElement(Input, { label: "Date", type: "date", value: date, onChange: (e) => setDate(e.target.value) }), /* @__PURE__ */ React.createElement(Input, { label: "Note (optional)", value: note, onChange: (e) => setNote(e.target.value) }), /* @__PURE__ */ React.createElement(Button, { onClick: submit, variant: "primary", className: "w-full", disabled: !amount || !savingsCategoryId }, "Save"))));
};
const InvestmentForm = ({ data, setData, onClose, showToast }) => {
  var _a;
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [investmentTypeId, setInvestmentTypeId] = useState(((_a = data.investmentTypes[0]) == null ? void 0 : _a.id) || "");
  const [note, setNote] = useState("");
  const submit = () => {
    if (!amount || Number(amount) <= 0 || !investmentTypeId) return;
    const item = { id: `inv-${uid()}`, amount: Number(amount), date, investmentTypeId, note };
    setData((d) => ({ ...d, investments: [item, ...d.investments] }));
    showToast("Investment logged", "success");
    onClose();
  };
  return /* @__PURE__ */ React.createElement(Modal, { open: true, onClose, title: "Investment" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-[#3D4D3D] mb-1.5" }, "Type"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 overflow-x-auto no-scrollbar pb-1" }, data.investmentTypes.map((t) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: t.id,
      onClick: () => setInvestmentTypeId(t.id),
      className: `flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press ${investmentTypeId === t.id ? "bg-[#1A1F1B] text-white" : "bg-white/70 border border-white/80"}`
    },
    t.icon,
    " ",
    t.name
  )))), /* @__PURE__ */ React.createElement(Input, { label: "Amount", prefix: "\u20B9", type: "number", inputMode: "decimal", value: amount, onChange: (e) => setAmount(e.target.value), placeholder: "10000", autoFocus: true }), /* @__PURE__ */ React.createElement(Input, { label: "Date", type: "date", value: date, onChange: (e) => setDate(e.target.value) }), /* @__PURE__ */ React.createElement(Input, { label: "Note (optional)", value: note, onChange: (e) => setNote(e.target.value) }), /* @__PURE__ */ React.createElement(Button, { onClick: submit, variant: "primary", className: "w-full", disabled: !amount }, "Save")));
};
const LoanForm = ({ data, setData, onClose, showToast }) => {
  var _a;
  const [tab, setTab] = useState("new");
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [lentDate, setLentDate] = useState(todayISO());
  const [expectedDate, setExpectedDate] = useState("");
  const [reason, setReason] = useState("");
  const [loanId, setLoanId] = useState(((_a = data.loans.find((l) => l.status === "active")) == null ? void 0 : _a.id) || "");
  const [repayAmt, setRepayAmt] = useState("");
  const [repayDate, setRepayDate] = useState(todayISO());
  const newLoan = () => {
    if (!person.trim() || !amount || Number(amount) <= 0) return;
    const item = { id: `loan-${uid()}`, person: person.trim(), amount: Number(amount), lentDate, expectedReturnDate: expectedDate || null, reason: reason.trim(), repayments: [], status: "active" };
    setData((d) => ({ ...d, loans: [item, ...d.loans] }));
    showToast("Loan logged", "success");
    onClose();
  };
  const addRepayment = () => {
    if (!loanId || !repayAmt || Number(repayAmt) <= 0) return;
    setData((d) => ({
      ...d,
      loans: d.loans.map((l) => {
        if (l.id !== loanId) return l;
        const reps = [...l.repayments || [], { amount: Number(repayAmt), date: repayDate, note: "" }];
        const totalRepaid = reps.reduce((a, r) => a + Number(r.amount), 0);
        const status = totalRepaid >= l.amount ? "settled" : "active";
        return { ...l, repayments: reps, status };
      })
    }));
    showToast("Repayment recorded", "success");
    onClose();
  };
  const activeLoans = data.loans.filter((l) => l.status === "active");
  return /* @__PURE__ */ React.createElement(Modal, { open: true, onClose, title: "Money Lent" }, /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mb-4 bg-white/60 rounded-2xl p-1" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setTab("new"), className: `flex-1 py-2 rounded-xl text-xs font-medium ${tab === "new" ? "bg-[#1A1F1B] text-white" : "text-[#5A6A5A]"}` }, "New loan"), /* @__PURE__ */ React.createElement("button", { onClick: () => setTab("repay"), className: `flex-1 py-2 rounded-xl text-xs font-medium ${tab === "repay" ? "bg-[#1A1F1B] text-white" : "text-[#5A6A5A]"}` }, "Repayment")), tab === "new" ? /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement(Input, { label: "Person", value: person, onChange: (e) => setPerson(e.target.value), placeholder: "Friend's name", autoFocus: true }), /* @__PURE__ */ React.createElement(Input, { label: "Amount", prefix: "\u20B9", type: "number", inputMode: "decimal", value: amount, onChange: (e) => setAmount(e.target.value), placeholder: "5000" }), /* @__PURE__ */ React.createElement(Input, { label: "Lent on", type: "date", value: lentDate, onChange: (e) => setLentDate(e.target.value) }), /* @__PURE__ */ React.createElement(Input, { label: "Expected return (optional)", type: "date", value: expectedDate, onChange: (e) => setExpectedDate(e.target.value) }), /* @__PURE__ */ React.createElement(Input, { label: "Reason (optional)", value: reason, onChange: (e) => setReason(e.target.value) }), /* @__PURE__ */ React.createElement(Button, { onClick: newLoan, variant: "primary", className: "w-full", disabled: !person.trim() || !amount }, "Save")) : /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, activeLoans.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-sm text-[#5A6A5A] text-center py-6" }, "No active loans") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-[#3D4D3D] mb-1.5" }, "Loan"), /* @__PURE__ */ React.createElement("select", { value: loanId, onChange: (e) => setLoanId(e.target.value), className: "w-full px-3 py-3 rounded-2xl border bg-white/70 text-sm border-white/80" }, activeLoans.map((l) => {
    const repaid = (l.repayments || []).reduce((a, r) => a + Number(r.amount), 0);
    const balance = Number(l.amount) - repaid;
    return /* @__PURE__ */ React.createElement("option", { key: l.id, value: l.id }, l.person, " \u2014 \u20B9", fmt(balance), " pending");
  }))), /* @__PURE__ */ React.createElement(Input, { label: "Repayment amount", prefix: "\u20B9", type: "number", inputMode: "decimal", value: repayAmt, onChange: (e) => setRepayAmt(e.target.value), placeholder: "2000", autoFocus: true }), /* @__PURE__ */ React.createElement(Input, { label: "Date", type: "date", value: repayDate, onChange: (e) => setRepayDate(e.target.value) }), /* @__PURE__ */ React.createElement(Button, { onClick: addRepayment, variant: "primary", className: "w-full", disabled: !repayAmt }, "Save"))));
};
const EmiForm = ({ data, setData, onClose, showToast }) => {
  var _a;
  const [name, setName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [totalMonths, setTotalMonths] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [isNoCost, setIsNoCost] = useState(true);
  const [startDate, setStartDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState(((_a = data.cards[0]) == null ? void 0 : _a.id) || "");
  const [categoryId, setCategoryId] = useState("cat-shopping");
  useEffect(() => {
    if (isNoCost && totalAmount && totalMonths) {
      const m = Math.round(Number(totalAmount) / Number(totalMonths));
      setMonthlyAmount(m.toString());
    }
  }, [isNoCost, totalAmount, totalMonths]);
  const submit = () => {
    if (!name.trim() || !totalAmount || !totalMonths || !monthlyAmount || !paymentMethod) return;
    const emi = {
      id: `emi-${uid()}`,
      name: name.trim(),
      totalAmount: Number(totalAmount),
      totalMonths: Number(totalMonths),
      monthlyAmount: Number(monthlyAmount),
      monthsPaid: 1,
      startDate,
      paymentMethod,
      categoryId,
      isNoCost,
      lastConfirmedMonth: monthKey(startDate),
      active: true
    };
    const txn = {
      id: `tx-${uid()}`,
      amount: emi.monthlyAmount,
      date: startDate,
      type: "emi",
      categoryId,
      paymentMethod,
      merchant: `${emi.name} \xB7 1 of ${emi.totalMonths}`,
      note: "",
      cashIncludedInCap: false,
      emiId: emi.id,
      avoidability: null
    };
    setData((d) => ({ ...d, emis: [emi, ...d.emis], transactions: [txn, ...d.transactions] }));
    showToast(`EMI started \xB7 \u20B9${fmt(emi.monthlyAmount)}/mo`, "success");
    onClose();
  };
  return /* @__PURE__ */ React.createElement(Modal, { open: true, onClose, title: "Add EMI" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement(Input, { label: "What is this EMI for?", value: name, onChange: (e) => setName(e.target.value), placeholder: "iPhone 17, Laptop\u2026", autoFocus: true }), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement(Input, { label: "Total amount", prefix: "\u20B9", type: "number", inputMode: "decimal", value: totalAmount, onChange: (e) => setTotalAmount(e.target.value), placeholder: "60000" }), /* @__PURE__ */ React.createElement(Input, { label: "Total months", type: "number", inputMode: "numeric", value: totalMonths, onChange: (e) => setTotalMonths(e.target.value), placeholder: "12" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 bg-white/60 rounded-2xl p-1 mb-3" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setIsNoCost(true), className: `flex-1 py-2 rounded-xl text-xs font-medium ${isNoCost ? "bg-[#1A1F1B] text-white" : "text-[#5A6A5A]"}` }, "No-cost EMI"), /* @__PURE__ */ React.createElement("button", { onClick: () => setIsNoCost(false), className: `flex-1 py-2 rounded-xl text-xs font-medium ${!isNoCost ? "bg-[#1A1F1B] text-white" : "text-[#5A6A5A]"}` }, "With interest")), /* @__PURE__ */ React.createElement(Input, { label: "Monthly EMI amount", prefix: "\u20B9", type: "number", inputMode: "decimal", value: monthlyAmount, onChange: (e) => setMonthlyAmount(e.target.value), placeholder: "5000" }), isNoCost && totalAmount && totalMonths && /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-emerald-700 mt-1" }, "Auto-calculated from total \xF7 months")), /* @__PURE__ */ React.createElement(Input, { label: "Start date", type: "date", value: startDate, onChange: (e) => setStartDate(e.target.value) }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-[#3D4D3D] mb-1.5" }, "Card"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 overflow-x-auto no-scrollbar pb-1" }, data.cards.filter((c) => !c.archived).map((c) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: c.id,
      onClick: () => setPaymentMethod(c.id),
      className: `flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press flex items-center gap-1.5 ${paymentMethod === c.id ? "bg-[#1A1F1B] text-white" : "bg-white/70 border border-white/80"}`
    },
    /* @__PURE__ */ React.createElement("span", { className: "w-2 h-2 rounded-full", style: { background: c.color } }),
    c.name
  )))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-[#3D4D3D] mb-1.5" }, "Category"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 overflow-x-auto no-scrollbar pb-1" }, data.categories.filter((c) => !c.hidden).map((c) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: c.id,
      onClick: () => setCategoryId(c.id),
      className: `flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press ${categoryId === c.id ? "bg-[#1A1F1B] text-white" : "bg-white/70 border border-white/80"}`
    },
    c.icon,
    " ",
    c.name
  )))), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-[#5A6A5A]" }, "This EMI will reduce your effective cap by \u20B9", fmt(Number(monthlyAmount) || 0), "/cycle until paid off."), /* @__PURE__ */ React.createElement(Button, { onClick: submit, variant: "primary", className: "w-full", disabled: !name || !totalAmount || !totalMonths || !monthlyAmount || !paymentMethod }, "Start EMI")));
};
const PromptQueue = ({ data, setData, queue, onClose, showToast }) => {
  const [edits, setEdits] = useState({});
  const editAmount = (id, val) => setEdits((e) => ({ ...e, [id]: val }));
  const confirm2 = (item) => {
    const finalAmount = Number(edits[item.id] != null ? edits[item.id] : item.amount);
    const txn = {
      id: `tx-${uid()}`,
      amount: finalAmount,
      date: todayISO(),
      type: item.kind === "emi" ? "emi" : "regular",
      categoryId: item.categoryId,
      paymentMethod: item.paymentMethod,
      merchant: item.kind === "emi" ? `${item.name} \xB7 ${item.progress}` : item.name,
      note: "",
      cashIncludedInCap: false,
      emiId: item.kind === "emi" ? item.id : void 0,
      regularId: item.kind === "regular" ? item.id : void 0,
      avoidability: null
    };
    const monthK = monthKey(todayISO());
    setData((d) => {
      const next = { ...d, transactions: [txn, ...d.transactions] };
      if (item.kind === "regular") {
        next.regularExpenses = d.regularExpenses.map((r) => r.id === item.id ? { ...r, lastConfirmedMonth: monthK } : r);
      } else {
        next.emis = d.emis.map((e) => e.id === item.id ? { ...e, monthsPaid: e.monthsPaid + 1, lastConfirmedMonth: monthK } : e);
      }
      return next;
    });
    showToast(`${item.name} paid`, "success");
  };
  const skip = (item) => {
    const monthK = monthKey(todayISO());
    setData((d) => {
      const next = { ...d };
      if (item.kind === "regular") {
        next.regularExpenses = d.regularExpenses.map((r) => r.id === item.id ? { ...r, lastConfirmedMonth: monthK } : r);
      } else {
        next.emis = d.emis.map((e) => e.id === item.id ? { ...e, lastConfirmedMonth: monthK } : e);
      }
      return next;
    });
  };
  return /* @__PURE__ */ React.createElement(Modal, { open: true, onClose, title: `Confirm ${queue.length} payment${queue.length > 1 ? "s" : ""}`, size: "lg" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-[#5A6A5A] mb-3" }, 'Tap "Pay" to log, or skip if not paid this month.'), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, queue.map((item) => {
    const cat = getCategory(item.categoryId, data.categories);
    const cur = edits[item.id] != null ? edits[item.id] : item.amount;
    return /* @__PURE__ */ React.createElement("div", { key: item.id, className: "glass-strong rounded-2xl p-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-2" }, /* @__PURE__ */ React.createElement("div", { className: "w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0", style: { background: cat.color + "22" } }, cat.icon), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium truncate" }, item.name), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-[#5A6A5A]" }, item.kind === "emi" ? `EMI \xB7 ${item.progress}` : "Regular", " \xB7 ", getPaymentLabel(item.paymentMethod, data.cards)))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        inputMode: "decimal",
        value: cur,
        onChange: (e) => editAmount(item.id, e.target.value),
        className: "flex-1 px-3 py-2 rounded-xl bg-white border border-white/80 text-sm"
      }
    ), /* @__PURE__ */ React.createElement("button", { onClick: () => confirm2(item), className: "px-3 py-2 rounded-xl bg-[#1A1F1B] text-white text-xs font-medium tap-press" }, "Pay"), /* @__PURE__ */ React.createElement("button", { onClick: () => skip(item), className: "px-3 py-2 rounded-xl bg-white/70 text-xs font-medium tap-press" }, "Skip")));
  })), /* @__PURE__ */ React.createElement(Button, { onClick: onClose, variant: "ghost", className: "w-full mt-4" }, "Close"));
};
const GoalsTab = ({ data, setData, showToast }) => {
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const cm = monthKey(todayISO());
  const savedThisMonth = data.savings.filter((s) => monthKey(s.date) === cm).reduce((a, b) => a + Number(b.amount || 0), 0);
  const lifetimeTotal = data.savings.reduce((a, b) => a + Number(b.amount || 0), 0);
  const create = () => {
    if (!name.trim()) return;
    const cat = { id: `sc-${uid()}`, name: name.trim(), icon: "\u{1F3AF}", color: "#1D9E75", targetAmount: Number(target) || null, targetDate: targetDate || null, monthlyTargetAmount: null, archived: false };
    setData((d) => ({ ...d, savingsCategories: [...d.savingsCategories, cat] }));
    setShowNew(false);
    setName("");
    setTarget("");
    setTargetDate("");
    showToast("Goal created", "success");
  };
  const archive = (id) => {
    setData((d) => ({ ...d, savingsCategories: d.savingsCategories.map((s) => s.id === id ? { ...s, archived: true } : s) }));
    setEditing(null);
  };
  const goals = data.savingsCategories.filter((s) => !s.archived);
  return /* @__PURE__ */ React.createElement("div", { className: "anim-stagger px-4 pt-3 pb-28 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center" }, /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-semibold" }, "Goals"), /* @__PURE__ */ React.createElement(Button, { onClick: () => setShowNew(true), variant: "primary" }, /* @__PURE__ */ React.createElement(I.plus, { size: 16 }))), /* @__PURE__ */ React.createElement("div", { className: "glass rounded-3xl p-5" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-[#5A6A5A]" }, "Saved this month"), /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-semibold mt-1" }, "\u20B9", fmt(savedThisMonth)), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-[#5A6A5A] mt-2" }, "Lifetime: \u20B9", fmt(lifetimeTotal))), goals.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "glass rounded-3xl p-8 text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-[#5A6A5A]" }, "No goals yet. Tap + to create one.")) : goals.map((g) => {
    const saved = data.savings.filter((s) => s.savingsCategoryId === g.id).reduce((a, b) => a + Number(b.amount || 0), 0);
    const pct = g.targetAmount ? Math.min(100, saved / g.targetAmount * 100) : 0;
    return /* @__PURE__ */ React.createElement("button", { key: g.id, onClick: () => setEditing(g), className: "glass rounded-3xl p-4 w-full text-left tap-press" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-xl" }, g.icon), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-sm" }, g.name), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-[#5A6A5A]" }, "\u20B9", fmt(saved), g.targetAmount ? ` of \u20B9${fmt(g.targetAmount)}` : "")), g.targetAmount && /* @__PURE__ */ React.createElement("span", { className: "text-xs font-medium" }, Math.round(pct), "%")), g.targetAmount && /* @__PURE__ */ React.createElement("div", { className: "h-2 bg-white/40 rounded-full overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "h-full bg-gradient-to-r from-[#1D9E75] to-[#0F6E56]", style: { width: `${pct}%` } })));
  }), data.investments.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "glass rounded-3xl p-5" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium mb-3 text-[#3D4D3D]" }, "Investments"), data.investmentTypes.map((t) => {
    const items = data.investments.filter((i) => i.investmentTypeId === t.id);
    const total = items.reduce((a, b) => a + Number(b.amount || 0), 0);
    if (total === 0) return null;
    return /* @__PURE__ */ React.createElement("div", { key: t.id, className: "flex items-center gap-3 py-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-lg" }, t.icon), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium" }, t.name), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-[#5A6A5A]" }, items.length, " contributions")), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold" }, "\u20B9", fmt(total)));
  })), /* @__PURE__ */ React.createElement(Modal, { open: showNew, onClose: () => setShowNew(false), title: "New goal" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement(Input, { label: "Name", value: name, onChange: (e) => setName(e.target.value), placeholder: "Emergency fund, Goa Trip\u2026", autoFocus: true }), /* @__PURE__ */ React.createElement(Input, { label: "Target amount (optional)", prefix: "\u20B9", type: "number", value: target, onChange: (e) => setTarget(e.target.value) }), /* @__PURE__ */ React.createElement(Input, { label: "Target date (optional)", type: "date", value: targetDate, onChange: (e) => setTargetDate(e.target.value) }), /* @__PURE__ */ React.createElement(Button, { onClick: create, variant: "primary", className: "w-full", disabled: !name.trim() }, "Create goal"))), editing && /* @__PURE__ */ React.createElement(Modal, { open: true, onClose: () => setEditing(null), title: editing.name }, /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, data.savings.filter((s) => s.savingsCategoryId === editing.id).slice(0, 20).map((s) => /* @__PURE__ */ React.createElement("div", { key: s.id, className: "flex justify-between items-center py-2 border-b border-black/5" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm" }, formatDate(s.date)), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-[#5A6A5A]" }, s.note || "\u2014")), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium" }, "+ \u20B9", fmt(s.amount)))), /* @__PURE__ */ React.createElement(Button, { onClick: () => archive(editing.id), variant: "danger", className: "w-full" }, "Archive goal"))));
};
const PersonalTab = ({ data, setData, showToast }) => {
  const [cycleOffset, setCycleOffset] = useState(0);
  const cycleRef = useMemo(() => {
    const today = /* @__PURE__ */ new Date();
    today.setMonth(today.getMonth() + cycleOffset);
    return getCycleForDate(data.settings.billingCycleStartDay || 1, today);
  }, [cycleOffset, data.settings.billingCycleStartDay]);
  const txns = useMemo(() => {
    return data.transactions.filter((t) => (t.type === "personal" || t.type === "emi") && isInCycle(t.date, cycleRef.start, cycleRef.end)).sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  }, [data.transactions, cycleRef]);
  const total = txns.reduce((s, t) => s + Number(t.amount || 0), 0);
  const stats = useCapStats(data);
  const isCurrentCycle = cycleOffset === 0;
  const overCapTxns = txns.filter((t) => t.avoidability != null);
  const avoidableSum = overCapTxns.filter((t) => t.avoidability === "avoidable").reduce((s, t) => s + Number(t.amount), 0);
  const unavoidableSum = overCapTxns.filter((t) => t.avoidability === "unavoidable").reduce((s, t) => s + Number(t.amount), 0);
  const groupByDate = useMemo(() => {
    const map = {};
    txns.forEach((t) => {
      (map[t.date] = map[t.date] || []).push(t);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [txns]);
  const deleteTxn = (id) => {
    if (!confirm("Delete this transaction?")) return;
    setData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }));
  };
  const cap = isCurrentCycle ? stats.effectiveTotalCap : stats.effectiveTotalCap;
  const pct = cap > 0 ? Math.min(100, total / cap * 100) : 0;
  const barColor = pct >= 100 ? "from-red-500 to-rose-500" : pct >= 80 ? "from-amber-400 to-orange-500" : "from-[#97C459] to-[#C0DD97]";
  return /* @__PURE__ */ React.createElement("div", { className: "anim-stagger px-4 pt-3 pb-28 space-y-3" }, /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-semibold" }, "Personal"), /* @__PURE__ */ React.createElement("div", { className: "glass rounded-3xl p-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setCycleOffset((o) => o - 1), className: "p-1 tap-press" }, /* @__PURE__ */ React.createElement(I.arrowLeft, { size: 18 })), /* @__PURE__ */ React.createElement("p", { className: "text-xs font-medium text-[#3D4D3D]" }, formatDate(cycleRef.start, { day: "numeric", month: "short" }), " \u2014 ", formatDate(cycleRef.end, { day: "numeric", month: "short" })), /* @__PURE__ */ React.createElement("button", { onClick: () => setCycleOffset((o) => Math.min(0, o + 1)), className: "p-1 tap-press", disabled: cycleOffset >= 0 }, /* @__PURE__ */ React.createElement(I.arrowRight, { size: 18 }))), /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-semibold mt-2" }, "\u20B9", fmt(total)), isCurrentCycle && cap > 0 && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-[#5A6A5A]" }, "of \u20B9", fmt(cap), " cap \xB7 ", Math.round(pct), "%"), isCurrentCycle && cap > 0 && /* @__PURE__ */ React.createElement("div", { className: "h-2 mt-3 bg-white/40 rounded-full overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: `h-full bg-gradient-to-r ${barColor}`, style: { width: `${pct}%` } })), overCapTxns.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-3 pt-3 border-t border-black/5 text-xs" }, /* @__PURE__ */ React.createElement("p", { className: "text-red-700 font-medium" }, "Over cap: \u20B9", fmt(avoidableSum + unavoidableSum)), /* @__PURE__ */ React.createElement("p", { className: "text-[#5A6A5A] mt-1" }, "\u20B9", fmt(avoidableSum), " avoidable \xB7 \u20B9", fmt(unavoidableSum), " unavoidable"))), groupByDate.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "glass rounded-3xl p-8 text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-[#5A6A5A]" }, "No transactions in this cycle")) : groupByDate.map(([date, list]) => {
    const dayTotal = list.reduce((s, t) => s + Number(t.amount), 0);
    return /* @__PURE__ */ React.createElement("div", { key: date }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center px-2 mb-2 mt-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-medium text-[#5A6A5A]" }, formatDate(date, { weekday: "short", day: "numeric", month: "short" })), /* @__PURE__ */ React.createElement("p", { className: "text-xs font-medium text-[#5A6A5A]" }, "\u20B9", fmt(dayTotal))), /* @__PURE__ */ React.createElement("div", { className: "glass rounded-3xl divide-y divide-black/5" }, list.map((t) => {
      const cat = getCategory(t.categoryId, data.categories);
      return /* @__PURE__ */ React.createElement("div", { key: t.id, className: "flex items-center gap-3 p-3" }, /* @__PURE__ */ React.createElement("div", { className: "w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0", style: { background: cat.color + "22" } }, cat.icon), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium truncate" }, t.merchant || cat.name), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-[#5A6A5A]" }, cat.name, " \xB7 ", getPaymentLabel(t.paymentMethod, data.cards), t.avoidability ? ` \xB7 ${t.avoidability}` : "")), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium" }, "\u2212\u20B9", fmt(t.amount)), /* @__PURE__ */ React.createElement("button", { onClick: () => deleteTxn(t.id), className: "text-red-500 ml-1 tap-press" }, /* @__PURE__ */ React.createElement(I.trash, { size: 14 })));
    })));
  }));
};
const MoreTab = ({ data, setData, showToast, onSubNav }) => {
  const sections = [
    { id: "cards", label: "Cards", icon: I.card, count: data.cards.filter((c) => !c.archived).length },
    { id: "regulars", label: "Regular Expenses", icon: I.refresh, count: data.regularExpenses.filter((r) => r.active).length },
    { id: "emis", label: "EMIs", icon: I.zap, count: data.emis.filter((e) => e.active).length },
    { id: "income-history", label: "Income History", icon: I.briefcase, count: data.income.length },
    { id: "loans", label: "Money Lent", icon: I.users, count: data.loans.filter((l) => l.status === "active").length },
    { id: "categories", label: "Categories", icon: I.target, count: data.categories.filter((c) => !c.hidden).length },
    { id: "settings", label: "Settings", icon: I.settings },
    { id: "backup", label: "Backup & Restore", icon: I.download }
  ];
  return /* @__PURE__ */ React.createElement("div", { className: "anim-stagger px-4 pt-3 pb-28 space-y-3" }, /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-semibold" }, "More"), /* @__PURE__ */ React.createElement("div", { className: "glass rounded-3xl divide-y divide-black/5 overflow-hidden" }, sections.map((s) => /* @__PURE__ */ React.createElement("button", { key: s.id, onClick: () => onSubNav(s.id), className: "w-full flex items-center gap-3 p-4 tap-press" }, /* @__PURE__ */ React.createElement("div", { className: "w-9 h-9 rounded-xl bg-white/60 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(s.icon, { size: 18 })), /* @__PURE__ */ React.createElement("div", { className: "flex-1 text-left" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium" }, s.label)), s.count != null && /* @__PURE__ */ React.createElement("span", { className: "text-xs text-[#5A6A5A]" }, s.count), /* @__PURE__ */ React.createElement(I.arrowRight, { size: 16 })))), /* @__PURE__ */ React.createElement("p", { className: "text-center text-[10px] text-[#5A6A5A] pt-4" }, "Expense Tracker v", APP_VERSION, " \xB7 Works offline"));
};
const CardsScreen = ({ data, setData, onBack, showToast }) => {
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [last4, setLast4] = useState("");
  const [color, setColor] = useState(CARD_COLORS[0]);
  const [capMode, setCapMode] = useState("global");
  const [individualCap, setIndividualCap] = useState("");
  const open = (c) => {
    setEditing(c || "new");
    setName((c == null ? void 0 : c.name) || "");
    setLast4((c == null ? void 0 : c.last4) || "");
    setColor((c == null ? void 0 : c.color) || CARD_COLORS[data.cards.length % CARD_COLORS.length]);
    setCapMode((c == null ? void 0 : c.capMode) || "global");
    setIndividualCap((c == null ? void 0 : c.individualCap) || "");
  };
  const save = () => {
    if (!name.trim()) return;
    const item = { id: editing === "new" ? `card-${uid()}` : editing.id, name: name.trim(), last4, color, capMode, individualCap: capMode === "individual" ? Number(individualCap) || 0 : null, archived: false };
    setData((d) => ({ ...d, cards: editing === "new" ? [...d.cards, item] : d.cards.map((c) => c.id === item.id ? item : c) }));
    setEditing(null);
    showToast("Saved", "success");
  };
  const archive = (id) => {
    if (!confirm("Archive this card?")) return;
    setData((d) => ({ ...d, cards: d.cards.map((c) => c.id === id ? { ...c, archived: true } : c) }));
  };
  return /* @__PURE__ */ React.createElement("div", { className: "px-4 pt-3 pb-28 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: onBack, className: "p-2 tap-press" }, /* @__PURE__ */ React.createElement(I.arrowLeft, { size: 20 })), /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-semibold flex-1" }, "Cards"), /* @__PURE__ */ React.createElement(Button, { variant: "primary", onClick: () => open(null) }, /* @__PURE__ */ React.createElement(I.plus, { size: 16 }))), data.cards.filter((c) => !c.archived).length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "glass rounded-3xl p-8 text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-[#5A6A5A]" }, "No cards yet")) : data.cards.filter((c) => !c.archived).map((c) => /* @__PURE__ */ React.createElement("button", { key: c.id, onClick: () => open(c), className: "glass rounded-2xl p-4 w-full flex items-center gap-3 tap-press" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 rounded-xl flex-shrink-0", style: { background: c.color } }), /* @__PURE__ */ React.createElement("div", { className: "flex-1 text-left" }, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-sm" }, c.name, c.last4 ? ` \xB7\xB7\xB7\xB7${c.last4}` : ""), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-[#5A6A5A]" }, c.capMode === "global" ? "Shared cap" : `Own cap \u20B9${fmt(c.individualCap)}`)), /* @__PURE__ */ React.createElement(I.edit, { size: 16 }))), editing && /* @__PURE__ */ React.createElement(Modal, { open: true, onClose: () => setEditing(null), title: editing === "new" ? "Add card" : "Edit card" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement(Input, { label: "Name", value: name, onChange: (e) => setName(e.target.value), placeholder: "HDFC Regalia", autoFocus: true }), /* @__PURE__ */ React.createElement(Input, { label: "Last 4 digits (optional)", value: last4, onChange: (e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4)), inputMode: "numeric" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-[#3D4D3D] mb-1.5" }, "Color"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 flex-wrap" }, CARD_COLORS.map((c) => /* @__PURE__ */ React.createElement("button", { key: c, onClick: () => setColor(c), className: `w-8 h-8 rounded-xl ${color === c ? "ring-2 ring-offset-2 ring-[#1A1F1B]" : ""}`, style: { background: c } })))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-[#3D4D3D] mb-1.5" }, "Cap mode"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 bg-white/60 rounded-2xl p-1" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setCapMode("global"), className: `flex-1 py-2 rounded-xl text-xs font-medium ${capMode === "global" ? "bg-[#1A1F1B] text-white" : "text-[#5A6A5A]"}` }, "Shared (global)"), /* @__PURE__ */ React.createElement("button", { onClick: () => setCapMode("individual"), className: `flex-1 py-2 rounded-xl text-xs font-medium ${capMode === "individual" ? "bg-[#1A1F1B] text-white" : "text-[#5A6A5A]"}` }, "Own cap")), capMode === "individual" && /* @__PURE__ */ React.createElement("div", { className: "mt-3" }, /* @__PURE__ */ React.createElement(Input, { label: "Individual cap", prefix: "\u20B9", type: "number", value: individualCap, onChange: (e) => setIndividualCap(e.target.value) }))), /* @__PURE__ */ React.createElement(Button, { onClick: save, variant: "primary", className: "w-full" }, "Save"), editing !== "new" && /* @__PURE__ */ React.createElement(Button, { onClick: () => archive(editing.id), variant: "danger", className: "w-full" }, "Archive"))));
};
const RegularsScreen = ({ data, setData, onBack, showToast }) => {
  var _a;
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [categoryId, setCategoryId] = useState("cat-other");
  const [paymentMethod, setPaymentMethod] = useState(((_a = data.cards[0]) == null ? void 0 : _a.id) || "bank");
  const open = (r) => {
    var _a2;
    setEditing(r || "new");
    setName((r == null ? void 0 : r.name) || "");
    setAmount((r == null ? void 0 : r.amount) || "");
    setDayOfMonth(String((r == null ? void 0 : r.dayOfMonth) || 1));
    setCategoryId((r == null ? void 0 : r.categoryId) || "cat-other");
    setPaymentMethod((r == null ? void 0 : r.paymentMethod) || (((_a2 = data.cards[0]) == null ? void 0 : _a2.id) || "bank"));
  };
  const save = () => {
    if (!name.trim() || !amount) return;
    const item = { id: editing === "new" ? `reg-${uid()}` : editing.id, name: name.trim(), amount: Number(amount), dayOfMonth: Number(dayOfMonth), categoryId, paymentMethod, active: true, lastConfirmedMonth: editing === "new" ? null : editing.lastConfirmedMonth };
    setData((d) => ({ ...d, regularExpenses: editing === "new" ? [...d.regularExpenses, item] : d.regularExpenses.map((r) => r.id === item.id ? item : r) }));
    setEditing(null);
    showToast("Saved", "success");
  };
  const remove = (id) => {
    if (!confirm("Delete this regular expense?")) return;
    setData((d) => ({ ...d, regularExpenses: d.regularExpenses.filter((r) => r.id !== id) }));
  };
  const togglePause = (id) => {
    setData((d) => ({ ...d, regularExpenses: d.regularExpenses.map((r) => r.id === id ? { ...r, active: !r.active } : r) }));
  };
  return /* @__PURE__ */ React.createElement("div", { className: "px-4 pt-3 pb-28 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: onBack, className: "p-2 tap-press" }, /* @__PURE__ */ React.createElement(I.arrowLeft, { size: 20 })), /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-semibold flex-1" }, "Regulars"), /* @__PURE__ */ React.createElement(Button, { variant: "primary", onClick: () => open(null) }, /* @__PURE__ */ React.createElement(I.plus, { size: 16 }))), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-[#5A6A5A]" }, "Set up monthly bills once. We'll prompt you to confirm each on its due date."), data.regularExpenses.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "glass rounded-3xl p-8 text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-[#5A6A5A]" }, "No regulars yet")) : data.regularExpenses.map((r) => {
    const cat = getCategory(r.categoryId, data.categories);
    return /* @__PURE__ */ React.createElement("div", { key: r.id, className: `glass rounded-2xl p-4 flex items-center gap-3 ${!r.active ? "opacity-50" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 rounded-xl flex items-center justify-center", style: { background: cat.color + "22" } }, cat.icon), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-sm" }, r.name), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-[#5A6A5A]" }, "\u20B9", fmt(r.amount), " \xB7 day ", r.dayOfMonth, " \xB7 ", getPaymentLabel(r.paymentMethod, data.cards))), /* @__PURE__ */ React.createElement("button", { onClick: () => togglePause(r.id), className: "text-xs px-2 py-1 rounded-lg bg-white/70 tap-press" }, r.active ? "Pause" : "Resume"), /* @__PURE__ */ React.createElement("button", { onClick: () => open(r), className: "tap-press" }, /* @__PURE__ */ React.createElement(I.edit, { size: 16 })), /* @__PURE__ */ React.createElement("button", { onClick: () => remove(r.id), className: "text-red-500 tap-press" }, /* @__PURE__ */ React.createElement(I.trash, { size: 16 })));
  }), editing && /* @__PURE__ */ React.createElement(Modal, { open: true, onClose: () => setEditing(null), title: editing === "new" ? "Add regular" : "Edit regular" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement(Input, { label: "Name", value: name, onChange: (e) => setName(e.target.value), placeholder: "Rent, Electricity\u2026", autoFocus: true }), /* @__PURE__ */ React.createElement(Input, { label: "Amount", prefix: "\u20B9", type: "number", inputMode: "decimal", value: amount, onChange: (e) => setAmount(e.target.value) }), /* @__PURE__ */ React.createElement(Input, { label: "Day of month (1-31)", type: "number", min: "1", max: "31", inputMode: "numeric", value: dayOfMonth, onChange: (e) => setDayOfMonth(e.target.value) }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-[#3D4D3D] mb-1.5" }, "Category"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 overflow-x-auto no-scrollbar pb-1" }, data.categories.filter((c) => !c.hidden).map((c) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: c.id,
      onClick: () => setCategoryId(c.id),
      className: `flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press ${categoryId === c.id ? "bg-[#1A1F1B] text-white" : "bg-white/70 border border-white/80"}`
    },
    c.icon,
    " ",
    c.name
  )))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-[#3D4D3D] mb-1.5" }, "Payment"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 overflow-x-auto no-scrollbar pb-1" }, data.cards.filter((c) => !c.archived).map((c) => /* @__PURE__ */ React.createElement("button", { key: c.id, onClick: () => setPaymentMethod(c.id), className: `flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press ${paymentMethod === c.id ? "bg-[#1A1F1B] text-white" : "bg-white/70 border border-white/80"}` }, c.name)), /* @__PURE__ */ React.createElement("button", { onClick: () => setPaymentMethod("bank"), className: `flex-shrink-0 px-3 py-2 rounded-2xl text-xs font-medium tap-press ${paymentMethod === "bank" ? "bg-[#1A1F1B] text-white" : "bg-white/70 border border-white/80"}` }, "Bank"))), /* @__PURE__ */ React.createElement(Button, { onClick: save, variant: "primary", className: "w-full" }, "Save"))));
};
const EmisScreen = ({ data, setData, onBack }) => {
  return /* @__PURE__ */ React.createElement("div", { className: "px-4 pt-3 pb-28 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: onBack, className: "p-2 tap-press" }, /* @__PURE__ */ React.createElement(I.arrowLeft, { size: 20 })), /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-semibold" }, "EMIs")), data.emis.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "glass rounded-3xl p-8 text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-[#5A6A5A]" }, "No EMIs. Add one from + \u2192 Add EMI.")) : data.emis.map((e) => {
    const pct = e.monthsPaid / e.totalMonths * 100;
    return /* @__PURE__ */ React.createElement("div", { key: e.id, className: "glass rounded-2xl p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-start mb-2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-sm" }, e.name), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-[#5A6A5A]" }, "\u20B9", fmt(e.monthlyAmount), "/mo \xB7 ", getPaymentLabel(e.paymentMethod, data.cards))), /* @__PURE__ */ React.createElement("p", { className: "text-xs font-medium" }, e.monthsPaid, "/", e.totalMonths)), /* @__PURE__ */ React.createElement("div", { className: "h-1.5 bg-white/40 rounded-full overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "h-full bg-gradient-to-r from-rose-400 to-pink-500", style: { width: `${pct}%` } })), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-[#5A6A5A] mt-2" }, "Total \u20B9", fmt(e.totalAmount), " \xB7 ", e.isNoCost ? "No-cost" : "With interest"));
  }));
};
const IncomeHistoryScreen = ({ data, setData, onBack }) => {
  const grouped = useMemo(() => {
    const map = {};
    data.income.forEach((i) => {
      (map[monthKey(i.date)] = map[monthKey(i.date)] || []).push(i);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [data.income]);
  return /* @__PURE__ */ React.createElement("div", { className: "px-4 pt-3 pb-28 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: onBack, className: "p-2 tap-press" }, /* @__PURE__ */ React.createElement(I.arrowLeft, { size: 20 })), /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-semibold" }, "Income")), grouped.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "glass rounded-3xl p-8 text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-[#5A6A5A]" }, "No income logged yet")) : grouped.map(([m, list]) => {
    const total = list.reduce((s, i) => s + Number(i.amount), 0);
    return /* @__PURE__ */ React.createElement("div", { key: m }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between mb-2 mt-3 px-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-medium text-[#5A6A5A]" }, (/* @__PURE__ */ new Date(m + "-01")).toLocaleDateString("en", { month: "long", year: "numeric" })), /* @__PURE__ */ React.createElement("p", { className: "text-xs font-medium text-[#5A6A5A]" }, "\u20B9", fmt(total))), /* @__PURE__ */ React.createElement("div", { className: "glass rounded-2xl divide-y divide-black/5" }, list.map((i) => /* @__PURE__ */ React.createElement("div", { key: i.id, className: "flex items-center gap-3 p-3" }, /* @__PURE__ */ React.createElement("div", { className: "w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(I.briefcase, { size: 16 })), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium truncate" }, i.source), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-[#5A6A5A]" }, formatDate(i.date))), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-emerald-700" }, "+ \u20B9", fmt(i.amount)), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      if (confirm("Delete?")) setData((d) => ({ ...d, income: d.income.filter((x) => x.id !== i.id) }));
    }, className: "text-red-500 tap-press" }, /* @__PURE__ */ React.createElement(I.trash, { size: 14 }))))));
  }));
};
const LoansScreen = ({ data, setData, onBack, showToast }) => {
  const active = data.loans.filter((l) => l.status === "active");
  const settled = data.loans.filter((l) => l.status === "settled");
  const remove = (id) => {
    if (confirm("Delete loan?")) setData((d) => ({ ...d, loans: d.loans.filter((l) => l.id !== id) }));
  };
  const renderLoan = (l) => {
    var _a;
    const repaid = (l.repayments || []).reduce((a, r) => a + Number(r.amount), 0);
    const balance = Math.max(0, Number(l.amount) - repaid);
    const overdue = l.expectedReturnDate && l.status === "active" && new Date(l.expectedReturnDate) < /* @__PURE__ */ new Date();
    return /* @__PURE__ */ React.createElement("div", { key: l.id, className: `glass rounded-2xl p-4 ${l.status === "settled" ? "opacity-50" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-start" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-sm" }, l.person), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-[#5A6A5A]" }, "Lent ", formatDate(l.lentDate), l.expectedReturnDate ? ` \xB7 expected ${formatDate(l.expectedReturnDate)}` : ""), overdue && /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-red-600 font-medium mt-1" }, "Overdue"), l.reason && /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-[#5A6A5A] mt-1" }, l.reason)), /* @__PURE__ */ React.createElement("div", { className: "text-right" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold" }, "\u20B9", fmt(balance)), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-[#5A6A5A]" }, "of \u20B9", fmt(l.amount)))), ((_a = l.repayments) == null ? void 0 : _a.length) > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-2 pt-2 border-t border-black/5" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-[#5A6A5A] mb-1" }, "Repaid:"), l.repayments.map((r, i) => /* @__PURE__ */ React.createElement("p", { key: i, className: "text-[11px]" }, "\u20B9", fmt(r.amount), " on ", formatDate(r.date)))), /* @__PURE__ */ React.createElement("button", { onClick: () => remove(l.id), className: "text-xs text-red-500 mt-2 tap-press" }, "Delete"));
  };
  return /* @__PURE__ */ React.createElement("div", { className: "px-4 pt-3 pb-28 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: onBack, className: "p-2 tap-press" }, /* @__PURE__ */ React.createElement(I.arrowLeft, { size: 20 })), /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-semibold" }, "Money Lent")), active.length === 0 && settled.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "glass rounded-3xl p-8 text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-[#5A6A5A]" }, "No loans tracked")), active.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-medium text-[#5A6A5A] px-2" }, "Active"), active.map(renderLoan)), settled.length > 0 && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-medium text-[#5A6A5A] px-2 mt-4" }, "Settled"), settled.map(renderLoan)));
};
const SettingsScreen = ({ data, setData, onBack, showToast }) => {
  const [globalCap, setGlobalCap] = useState(data.settings.globalCap || "");
  const [cycleDay, setCycleDay] = useState(data.settings.billingCycleStartDay || 1);
  const [cashIncl, setCashIncl] = useState(data.settings.cashIncludedInCapDefault);
  const [pinModal, setPinModal] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const saveSettings = () => {
    setData((d) => ({ ...d, settings: { ...d.settings, globalCap: Number(globalCap) || 0, billingCycleStartDay: Number(cycleDay) || 1, cashIncludedInCapDefault: cashIncl } }));
    showToast("Settings saved", "success");
  };
  const setPin = async () => {
    if (newPin.length < 4 || newPin.length > 6 || newPin !== confirmPin) {
      showToast("PINs don't match or invalid length", "danger");
      return;
    }
    const salt = uid();
    const hash = await sha256(newPin + salt);
    setData((d) => ({ ...d, settings: { ...d.settings, pinHash: hash, pinSalt: salt } }));
    setPinModal(false);
    setNewPin("");
    setConfirmPin("");
    showToast("PIN set", "success");
  };
  const removePin = () => {
    if (!confirm("Remove PIN lock?")) return;
    setData((d) => ({ ...d, settings: { ...d.settings, pinHash: null, pinSalt: null } }));
    showToast("PIN removed", "success");
  };
  return /* @__PURE__ */ React.createElement("div", { className: "px-4 pt-3 pb-28 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: onBack, className: "p-2 tap-press" }, /* @__PURE__ */ React.createElement(I.arrowLeft, { size: 20 })), /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-semibold" }, "Settings")), /* @__PURE__ */ React.createElement("div", { className: "glass rounded-3xl p-5 space-y-4" }, /* @__PURE__ */ React.createElement(Input, { label: "Monthly cap", prefix: "\u20B9", type: "number", value: globalCap, onChange: (e) => setGlobalCap(e.target.value) }), /* @__PURE__ */ React.createElement(Input, { label: "Billing cycle starts on day", type: "number", min: "1", max: "31", value: cycleDay, onChange: (e) => setCycleDay(e.target.value) }), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-sm" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: cashIncl, onChange: (e) => setCashIncl(e.target.checked), className: "w-4 h-4" }), "Include cash spends in cap by default"), /* @__PURE__ */ React.createElement(Button, { onClick: saveSettings, variant: "primary", className: "w-full" }, "Save")), /* @__PURE__ */ React.createElement("div", { className: "glass rounded-3xl p-5 space-y-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium" }, "Security"), data.settings.pinHash ? /* @__PURE__ */ React.createElement(Button, { onClick: removePin, variant: "danger", className: "w-full" }, /* @__PURE__ */ React.createElement(I.lock, { size: 16 }), " Remove PIN") : /* @__PURE__ */ React.createElement(Button, { onClick: () => setPinModal(true), variant: "primary", className: "w-full" }, /* @__PURE__ */ React.createElement(I.lock, { size: 16 }), " Set PIN lock")), /* @__PURE__ */ React.createElement(Modal, { open: pinModal, onClose: () => setPinModal(false), title: "Set PIN" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement(Input, { label: "New PIN (4-6 digits)", type: "password", inputMode: "numeric", value: newPin, onChange: (e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6)), autoFocus: true }), /* @__PURE__ */ React.createElement(Input, { label: "Confirm PIN", type: "password", inputMode: "numeric", value: confirmPin, onChange: (e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6)) }), /* @__PURE__ */ React.createElement(Button, { onClick: setPin, variant: "primary", className: "w-full", disabled: newPin.length < 4 || newPin !== confirmPin }, "Set PIN"))));
};
const CategoriesScreen = ({ data, setData, onBack, showToast }) => {
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("\u{1F4CC}");
  const [color, setColor] = useState("#64748B");
  const create = () => {
    if (!name.trim()) return;
    const cat = { id: `cat-${uid()}`, name: name.trim(), icon, color, isDefault: false, position: data.categories.length, hidden: false };
    setData((d) => ({ ...d, categories: [...d.categories, cat] }));
    setShowNew(false);
    setName("");
    setIcon("\u{1F4CC}");
    showToast("Category added", "success");
  };
  const toggleHide = (id) => setData((d) => ({ ...d, categories: d.categories.map((c) => c.id === id ? { ...c, hidden: !c.hidden } : c) }));
  return /* @__PURE__ */ React.createElement("div", { className: "px-4 pt-3 pb-28 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: onBack, className: "p-2 tap-press" }, /* @__PURE__ */ React.createElement(I.arrowLeft, { size: 20 })), /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-semibold flex-1" }, "Categories"), /* @__PURE__ */ React.createElement(Button, { variant: "primary", onClick: () => setShowNew(true) }, /* @__PURE__ */ React.createElement(I.plus, { size: 16 }))), data.categories.map((c) => /* @__PURE__ */ React.createElement("div", { key: c.id, className: `glass rounded-2xl p-3 flex items-center gap-3 ${c.hidden ? "opacity-40" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "w-9 h-9 rounded-xl flex items-center justify-center", style: { background: c.color + "22" } }, c.icon), /* @__PURE__ */ React.createElement("p", { className: "flex-1 text-sm font-medium" }, c.name), /* @__PURE__ */ React.createElement("button", { onClick: () => toggleHide(c.id), className: "text-xs px-2 py-1 rounded-lg bg-white/70 tap-press" }, c.hidden ? "Show" : "Hide"))), /* @__PURE__ */ React.createElement(Modal, { open: showNew, onClose: () => setShowNew(false), title: "New category" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement(Input, { label: "Name", value: name, onChange: (e) => setName(e.target.value), autoFocus: true }), /* @__PURE__ */ React.createElement(Input, { label: "Emoji icon", value: icon, onChange: (e) => setIcon(e.target.value), placeholder: "\u{1F3E0} \u{1F3AF} \u26A1", maxLength: "2" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-[#3D4D3D] mb-1.5" }, "Color"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 flex-wrap" }, ["#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444", "#06B6D4", "#6366F1", "#14B8A6", "#64748B"].map((c) => /* @__PURE__ */ React.createElement("button", { key: c, onClick: () => setColor(c), className: `w-8 h-8 rounded-xl ${color === c ? "ring-2 ring-offset-2 ring-[#1A1F1B]" : ""}`, style: { background: c } })))), /* @__PURE__ */ React.createElement(Button, { onClick: create, variant: "primary", className: "w-full", disabled: !name.trim() }, "Create"))));
};
const BackupScreen = ({ data, setData, onBack, showToast }) => {
  const fileRef = useRef(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const exportData = () => {
    const payload = { version: APP_VERSION, exportedAt: (/* @__PURE__ */ new Date()).toISOString(), data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expense-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Backup downloaded", "success");
  };
  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const payload = parsed.data || parsed;
        if (typeof payload !== "object") throw new Error("invalid");
        setData({ ...defaultData, ...payload, settings: { ...defaultData.settings, ...payload.settings || {} } });
        showToast("Backup restored", "success");
      } catch {
        showToast("Invalid backup file", "danger");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  const reset = () => {
    setData(defaultData);
    setConfirmReset(false);
    showToast("All data cleared", "success");
  };
  const dataSize = useMemo(() => {
    const b = new Blob([JSON.stringify(data)]).size;
    return b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`;
  }, [data]);
  return /* @__PURE__ */ React.createElement("div", { className: "px-4 pt-3 pb-28 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: onBack, className: "p-2 tap-press" }, /* @__PURE__ */ React.createElement(I.arrowLeft, { size: 20 })), /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-semibold" }, "Backup & Restore")), /* @__PURE__ */ React.createElement("div", { className: "glass rounded-3xl p-5 space-y-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-[#5A6A5A]" }, "Download all your data as JSON. Save it to iCloud Drive, email, etc. Restore later or on another device."), /* @__PURE__ */ React.createElement(Button, { onClick: exportData, variant: "primary", className: "w-full" }, /* @__PURE__ */ React.createElement(I.download, { size: 16 }), " Export backup"), /* @__PURE__ */ React.createElement(Button, { onClick: () => {
    var _a;
    return (_a = fileRef.current) == null ? void 0 : _a.click();
  }, variant: "secondary", className: "w-full" }, /* @__PURE__ */ React.createElement(I.upload, { size: 16 }), " Import backup"), /* @__PURE__ */ React.createElement("input", { ref: fileRef, type: "file", accept: ".json,application/json", className: "hidden", onChange: importData })), /* @__PURE__ */ React.createElement("div", { className: "glass rounded-3xl p-5" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium mb-2" }, "Storage"), /* @__PURE__ */ React.createElement("div", { className: "text-xs space-y-1 text-[#5A6A5A]" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", null, "Data size"), /* @__PURE__ */ React.createElement("span", { className: "font-medium text-[#1A1F1B]" }, dataSize)), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", null, "Transactions"), /* @__PURE__ */ React.createElement("span", null, data.transactions.length)), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", null, "Income entries"), /* @__PURE__ */ React.createElement("span", null, data.income.length)), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", null, "Savings"), /* @__PURE__ */ React.createElement("span", null, data.savings.length)), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", null, "Investments"), /* @__PURE__ */ React.createElement("span", null, data.investments.length)), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", null, "Loans"), /* @__PURE__ */ React.createElement("span", null, data.loans.length)))), /* @__PURE__ */ React.createElement("div", { className: "glass rounded-3xl p-5" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-red-600 mb-2" }, "Danger zone"), confirmReset ? /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs" }, "This permanently deletes everything on this device."), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(Button, { onClick: reset, variant: "danger", className: "flex-1" }, "Yes, delete all"), /* @__PURE__ */ React.createElement(Button, { onClick: () => setConfirmReset(false), variant: "secondary", className: "flex-1" }, "Cancel"))) : /* @__PURE__ */ React.createElement(Button, { onClick: () => setConfirmReset(true), variant: "danger", className: "w-full" }, "Clear all data")));
};
function App() {
  const [data, setData, loaded] = useStorage();
  const [tab, setTab] = useState("home");
  const [moreSub, setMoreSub] = useState(null);
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState(null);
  const [unlocked, setUnlocked] = useState(false);
  const [promptQueue, setPromptQueue] = useState([]);
  const [showPrompts, setShowPrompts] = useState(false);
  const showToast = useCallback((message, type = "info") => setToast({ message, type }), []);
  useEffect(() => {
    if (loaded && data.settings.hasOnboarded) {
      const q = buildPromptQueue(data);
      if (q.length > 0) setPromptQueue(q);
    }
  }, [loaded, data.regularExpenses, data.emis]);
  if (!loaded) {
    return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen flex items-center justify-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-[#5A6A5A]" }, "Loading\u2026"));
  }
  if (!data.settings.hasOnboarded) {
    return /* @__PURE__ */ React.createElement(Onboarding, { data, setData, onDone: () => {
    } });
  }
  if (data.settings.pinHash && !unlocked) {
    return /* @__PURE__ */ React.createElement(LockScreen, { data, onUnlock: () => setUnlocked(true) });
  }
  const onSubNav = (id) => setMoreSub(id);
  const back = () => setMoreSub(null);
  let content;
  if (tab === "home") content = /* @__PURE__ */ React.createElement(Dashboard, { data, setData, onNav: (t) => {
    if (t === "more") setTab("more");
    else if (t === "personal") setTab("personal");
    else if (t === "more-loans") {
      setTab("more");
      setMoreSub("loans");
    } else if (t === "add-expense") {
      setAddMode("personal");
      setShowAdd(true);
    }
  } });
  else if (tab === "goals") content = /* @__PURE__ */ React.createElement(GoalsTab, { data, setData, showToast });
  else if (tab === "personal") content = /* @__PURE__ */ React.createElement(PersonalTab, { data, setData, showToast });
  else if (tab === "more") {
    if (moreSub === "cards") content = /* @__PURE__ */ React.createElement(CardsScreen, { data, setData, onBack: back, showToast });
    else if (moreSub === "regulars") content = /* @__PURE__ */ React.createElement(RegularsScreen, { data, setData, onBack: back, showToast });
    else if (moreSub === "emis") content = /* @__PURE__ */ React.createElement(EmisScreen, { data, setData, onBack: back });
    else if (moreSub === "income-history") content = /* @__PURE__ */ React.createElement(IncomeHistoryScreen, { data, setData, onBack: back });
    else if (moreSub === "loans") content = /* @__PURE__ */ React.createElement(LoansScreen, { data, setData, onBack: back, showToast });
    else if (moreSub === "categories") content = /* @__PURE__ */ React.createElement(CategoriesScreen, { data, setData, onBack: back, showToast });
    else if (moreSub === "settings") content = /* @__PURE__ */ React.createElement(SettingsScreen, { data, setData, onBack: back, showToast });
    else if (moreSub === "backup") content = /* @__PURE__ */ React.createElement(BackupScreen, { data, setData, onBack: back, showToast });
    else content = /* @__PURE__ */ React.createElement(MoreTab, { data, setData, showToast, onSubNav });
  }
  return /* @__PURE__ */ React.createElement(ToastContext.Provider, { value: { show: showToast } }, toast && /* @__PURE__ */ React.createElement(Toast, { ...toast, onClose: () => setToast(null) }), promptQueue.length > 0 && !showPrompts && tab === "home" && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowPrompts(true),
      className: "fixed top-3 left-1/2 -translate-x-1/2 z-30 glass-strong px-4 py-2 rounded-full text-xs font-medium tap-press flex items-center gap-2 shadow-lg",
      style: { marginTop: "env(safe-area-inset-top)" }
    },
    /* @__PURE__ */ React.createElement("span", { className: "w-2 h-2 rounded-full bg-amber-500 live-dot" }),
    promptQueue.length,
    " payment",
    promptQueue.length > 1 ? "s" : "",
    " due"
  ), showPrompts && /* @__PURE__ */ React.createElement(PromptQueue, { data, setData, queue: promptQueue, onClose: () => {
    setShowPrompts(false);
    setPromptQueue(buildPromptQueue(data));
  }, showToast }), /* @__PURE__ */ React.createElement("div", { className: "max-w-md mx-auto" }, content), /* @__PURE__ */ React.createElement("nav", { className: "fixed bottom-0 left-0 right-0 z-40 px-3 pb-3", style: { paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" } }, /* @__PURE__ */ React.createElement("div", { className: "glass-strong max-w-md mx-auto rounded-[28px] py-2 px-3 flex justify-between items-center" }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setTab("home");
    setMoreSub(null);
  }, className: "tap-press flex flex-col items-center gap-0.5 px-3 py-1.5" }, /* @__PURE__ */ React.createElement(I.home, { size: 18 }), /* @__PURE__ */ React.createElement("span", { className: `text-[9px] font-medium ${tab === "home" ? "" : "opacity-60"}` }, "Home")), /* @__PURE__ */ React.createElement("button", { onClick: () => setTab("goals"), className: "tap-press flex flex-col items-center gap-0.5 px-3 py-1.5" }, /* @__PURE__ */ React.createElement(I.target, { size: 18 }), /* @__PURE__ */ React.createElement("span", { className: `text-[9px] font-medium ${tab === "goals" ? "" : "opacity-60"}` }, "Goals")), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setAddMode(null);
    setShowAdd(true);
  }, className: "tap-strong w-12 h-12 rounded-full bg-gradient-to-br from-[#1A1F1B] to-[#2D3530] text-white flex items-center justify-center shadow-lg" }, /* @__PURE__ */ React.createElement(I.plus, { size: 22, stroke: 2.5 })), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setTab("personal");
    setMoreSub(null);
  }, className: "tap-press flex flex-col items-center gap-0.5 px-3 py-1.5" }, /* @__PURE__ */ React.createElement(I.card, { size: 18 }), /* @__PURE__ */ React.createElement("span", { className: `text-[9px] font-medium ${tab === "personal" ? "" : "opacity-60"}` }, "Personal")), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    setTab("more");
    setMoreSub(null);
  }, className: "tap-press flex flex-col items-center gap-0.5 px-3 py-1.5" }, /* @__PURE__ */ React.createElement(I.more, { size: 18 }), /* @__PURE__ */ React.createElement("span", { className: `text-[9px] font-medium ${tab === "more" ? "" : "opacity-60"}` }, "More")))), /* @__PURE__ */ React.createElement(AddSheet, { data, setData, open: showAdd, onClose: () => {
    setShowAdd(false);
    setAddMode(null);
  }, showToast, initialMode: addMode }));
}
ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(App, null));
