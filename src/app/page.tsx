"use client";

// React imports
import { useEffect, useState, useMemo, useCallback, useRef } from "react";

// Auth
import { useSession, signOut } from "next-auth/react";

// Toast
import { toast } from "sonner";

// Lucide icons (only needed for inline JSX)
import {
  Ticket,
  Plus,
  Target,
  History,
  Mail,
} from "lucide-react";

// Types
import type { Tip, LiveScore, ApiStatus, BetType, LiveOddsData, AdminFormState, AdminTab, BetHistoryItem, BetSummary } from "@/types/goaledge";

// Existing components
import { ScrollToTop, ScrollProgress } from "@/components/goaledge/animations";

// Extracted components - Sections
import { Header } from "@/components/goaledge/Header";
import { Hero } from "@/components/goaledge/sections/Hero";
import { HowItWorks } from "@/components/goaledge/sections/HowItWorks";
import { Standings } from "@/components/goaledge/sections/Standings";
import { LiveScoresSection } from "@/components/goaledge/sections/LiveScoresSection";
import { TipsSection } from "@/components/goaledge/sections/TipsSection";
import { TipResults } from "@/components/goaledge/sections/TipResults";
import { AccumulatorOfTheDay } from "@/components/goaledge/sections/AccumulatorOfTheDay";
import { Features } from "@/components/goaledge/sections/Features";
import { Pricing } from "@/components/goaledge/sections/Pricing";
import { Testimonials } from "@/components/goaledge/sections/Testimonials";
import { FAQ } from "@/components/goaledge/sections/FAQ";
import { CTA } from "@/components/goaledge/sections/CTA";
import { Footer } from "@/components/goaledge/sections/Footer";

// Extracted components - Modals/Panels
import { TipDetailPanel } from "@/components/goaledge/modals/TipDetailPanel";
import { PaymentFlowModal } from "@/components/goaledge/modals/PaymentFlowModal";
import { UserProfilePanel } from "@/components/goaledge/modals/UserProfilePanel";
import { AchievementsPanel } from "@/components/goaledge/modals/AchievementsPanel";
import { BetSlipPanel } from "@/components/goaledge/modals/BetSlipPanel";
import { PlaceBetModal } from "@/components/goaledge/modals/PlaceBetModal";
import { ShareModal } from "@/components/goaledge/modals/ShareModal";
import { AuthModal } from "@/components/goaledge/modals/AuthModal";
import { AdminPanel } from "@/components/goaledge/modals/AdminPanel";
import { OddsCompareModal } from "@/components/goaledge/modals/OddsCompareModal";
import { ApiKeySettings } from "@/components/goaledge/modals/ApiKeySettings";

// Lib
import { generateAnalysis } from "@/lib/generate-analysis";
import { faqs } from "@/lib/faq-data";

/* ================================================================== */
/*  Notification type (inline, small)                                   */
/* ================================================================== */
interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "tip" | "win" | "alert";
}

/* ================================================================== */
/*  Page                                                               */
/* ================================================================== */
export default function HomePage() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedTip, setSelectedTip] = useState<Tip | null>(null);
  const [betSlip, setBetSlip] = useState<Tip[]>([]);
  const [betSlipOpen, setBetSlipOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [liveScores, setLiveScores] = useState<LiveScore[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [stake, setStake] = useState("100");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const [tipVotes, setTipVotes] = useState<Record<string, "up" | "down">>({});
  const [liveOdds, setLiveOdds] = useState<Record<string, LiveOddsData>>({});
  const [stakeCalcOpen, setStakeCalcOpen] = useState<string | null>(null);
  const [calcStake, setCalcStake] = useState("100");
  const [selectedDate, setSelectedDate] = useState(0);

  const [bankroll, setBankroll] = useState("10000");

  const { data: session } = useSession();
  const [authLoading, setAuthLoading] = useState(false);
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirm, setAuthConfirm] = useState("");
  const [authReferralCode, setAuthReferralCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({ newTips: true, results: true, odds: true, promotions: false });
  const [oddsBoostApplied, setOddsBoostApplied] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareTip, setShareTip] = useState<Tip | null>(null);

  const [bookmarkedTips, setBookmarkedTips] = useState<Set<string>>(new Set());

  const [heroScrollY, setHeroScrollY] = useState(0);
  const [accType, setAccType] = useState<BetType>("acca");
  const [eachWay, setEachWay] = useState(false);
  const [freeBetMode, setFreeBetMode] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>("tips");
  const [adminTips, setAdminTips] = useState<Tip[]>([]);
  const [adminForm, setAdminForm] = useState<AdminFormState>({
    league: "", country: "", flag: "⚽", homeTeam: "", awayTeam: "",
    matchTime: "", predictionType: "", prediction: "", odds: "",
    confidence: "75", confidenceLabel: "High", tipster: "GoalEdge_AI",
    isPremium: false, analysis: ""
  });
  const [adminLoading, setAdminLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentEmail, setPaymentEmail] = useState("");

  const [historyFilter, setHistoryFilter] = useState<"all" | "won" | "lost" | "void">("all");
  const [historyPeriod, setHistoryPeriod] = useState<"week" | "month" | "all">("week");
  const [compareTip, setCompareTip] = useState<Tip | null>(null);
  const [userProfileOpen, setUserProfileOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [savedSlips, setSavedSlips] = useState<Array<{ id: string; legs: Tip[]; stake: string; savedAt: string }>>([]);
  const [clearConfirming, setClearConfirming] = useState(false);
  const lastOddsToast = useRef<number>(0);
  // Real API status
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const [dataSource, setDataSource] = useState<string>("");
  const [liveRefreshTimer, setLiveRefreshTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");
  // Place Bet flow
  const [placeBetOpen, setPlaceBetOpen] = useState(false);
  const [placeBetStep, setPlaceBetStep] = useState<"confirm" | "processing" | "success" | "error">("confirm");
  const [placedBetId, setPlacedBetId] = useState<string>("");
  const [placeBetError, setPlaceBetError] = useState("");
  const [myBetsOpen, setMyBetsOpen] = useState(false);
  const [myBets, setMyBets] = useState<BetHistoryItem[]>([]);
  const [myBetsSummary, setMyBetsSummary] = useState<BetSummary | null>(null);
  const [myBetsFilter, setMyBetsFilter] = useState<"all" | "pending" | "won" | "lost" | "void">("all");
  const [myBetsLoading, setMyBetsLoading] = useState(false);
  // API Key Settings modal
  const [apiKeySettingsOpen, setApiKeySettingsOpen] = useState(false);

  const notifications: Notification[] = [
    { id: "n1", title: "New Premium Tip", message: "Arsenal vs Chelsea — Over 2.5 Goals @ 1.75", time: "2 min ago", type: "tip" },
    { id: "n2", title: "Tip Won! 🎉", message: "Real Madrid to Win — Won @ 1.45", time: "15 min ago", type: "win" },
    { id: "n3", title: "Value Alert", message: "Bayern vs Dortmund odds moved from 1.90 to 2.10", time: "32 min ago", type: "alert" },
    { id: "n4", title: "New Premium Tip", message: "PSG vs Lyon — BTTS Yes @ 1.80", time: "1 hr ago", type: "tip" },
    { id: "n5", title: "Accumulator Won! 🏆", message: "4-fold acca returned Ksh 3,100", time: "2 hr ago", type: "win" },
  ];

  // Referral link handling: /?ref=CODE prefills the signup form and opens it
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && ref.trim()) {
      setAuthReferralCode(ref.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10));
      setAuthMode("signup");
      setAuthOpen(true);
    }
  }, []);

  // Scroll detection for sticky header + parallax
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 20);
      if (scrollY < 800) setHeroScrollY(scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Active section tracking via IntersectionObserver
  useEffect(() => {
    const sectionIds = ["how-it-works", "standings", "live-scores", "tips", "features", "pricing", "faq"];
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(id);
            }
          });
        },
        { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedTip(null);
        setBetSlipOpen(false);
        setAuthOpen(false);
        setMobileMenuOpen(false);
        setNotificationsOpen(false);
        setSearchOpen(false);
        setAdminOpen(false);
        setPaymentOpen(false);
        setShareModalOpen(false);
        setUserProfileOpen(false);
        setAchievementsOpen(false);
        setApiKeySettingsOpen(false);
      }
      // Cmd/Ctrl+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 100);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Fetch tips and live scores
  const fetchTips = useCallback(async () => {
    try {
      const res = await fetch("/api/tips");
      const data = await res.json();
      const tipsList = (data.tips ?? []).map((t: Tip) => ({
        ...t,
        analysis: generateAnalysis(t),
        homeForm: t.league.includes("Premier")
          ? ["W", "W", "D", "W", "L"]
          : t.league.includes("La Liga")
            ? ["W", "D", "W", "W", "W"]
            : t.league.includes("Serie")
              ? ["D", "W", "W", "L", "W"]
              : t.league.includes("Bundesliga")
                ? ["W", "W", "W", "D", "W"]
                : t.league.includes("Ligue")
                  ? ["W", "W", "L", "W", "D"]
                  : ["D", "W", "L", "D", "W"],
        awayForm: t.league.includes("Premier")
          ? ["L", "D", "W", "L", "D"]
          : t.league.includes("La Liga")
            ? ["L", "W", "D", "L", "W"]
            : t.league.includes("Serie")
              ? ["W", "D", "L", "W", "D"]
              : t.league.includes("Bundesliga")
                ? ["D", "L", "W", "W", "L"]
                : t.league.includes("Ligue")
                  ? ["D", "L", "W", "D", "L"]
                  : ["L", "D", "W", "L", "W"],
        headToHead:
          Math.random() > 0.5
            ? `${t.homeTeam} 2-1 ${t.awayTeam} (Last 5: ${t.homeTeam} W3 D1 L1)`
            : `${t.homeTeam} 1-1 ${t.awayTeam} (Last 5: ${t.homeTeam} W2 D2 L1)`,
      }));
      setTips(tipsList);
      setDataSource(data.source || "unknown");
      if (data.apiConfigured) {
        setApiStatus(data.source === "live" ? "live" : "seed");
      } else {
        setApiStatus("offline");
      }
    } catch {
      setApiStatus("offline");
    }
  }, []);

  const fetchLiveScores = useCallback(async () => {
    try {
      const res = await fetch("/api/live-scores");
      const data = await res.json();
      setLiveScores(data.matches ?? []);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      await Promise.all([fetchTips(), fetchLiveScores()]);
      setLoading(false);
    }
    fetchData();
  }, [fetchTips, fetchLiveScores]);

  // Auto-refresh live scores every 45 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      fetchLiveScores();
    }, 45000);
    setLiveRefreshTimer(timer);
    return () => {
      clearInterval(timer);
      setLiveRefreshTimer(null);
    };
  }, [fetchLiveScores]);

  // WebSocket connection for live odds updates
  useEffect(() => {
    let socket: ReturnType<typeof import("socket.io-client").io> | null = null;
    try {
      // Dynamic import to avoid SSR issues
      import("socket.io-client").then(({ io }) => {
        socket = io("/?XTransformPort=3004", { transports: ["websocket"], reconnectionAttempts: 5, reconnectionDelay: 3000 });

        socket.on("connect", () => {
          // console.log("Connected to odds service");
        });

        socket.on("initial-odds", (data: Array<{ matchId: string; odds: string }>) => {
          const initial: Record<string, LiveOddsData> = {};
          data.forEach((m) => { initial[m.matchId] = { odds: m.odds, direction: "up", bookmaker: "1xBet" }; });
          setLiveOdds(initial);
        });

        socket.on("odds-update", (data: { matchId: string; homeTeam: string; awayTeam: string; newOdds: string; oldOdds: string; direction: "up" | "down"; bookmaker: string; timestamp: number }) => {
          setLiveOdds((prev) => ({ ...prev, [data.matchId]: { odds: data.newOdds, direction: data.direction, bookmaker: data.bookmaker } }));
          // Show toast for significant odds drops
          if (data.direction === "down") {
            const now = Date.now();
            if (now - lastOddsToast.current < 8000) return;
            const oldOdds = parseFloat(data.oldOdds);
            const newOdds = parseFloat(data.newOdds);
            const dropPct = ((oldOdds - newOdds) / oldOdds) * 100;
            if (dropPct > 3) {
              lastOddsToast.current = now;
              toast.warning(`📉 ${data.homeTeam} vs ${data.awayTeam} odds dropped ${dropPct.toFixed(1)}% (${data.oldOdds} → ${data.newOdds})`, {
                description: `Now ${data.newOdds} via ${data.bookmaker}`,
                duration: 4000,
              });
            }
          }
        });

        socket.on("connect_error", () => {
          // Silently handle - use fallback simulated odds
        });
      });
    } catch {
      // Fallback: no WebSocket available
    }
    return () => { socket?.disconnect(); };
  }, []);

  const leagues = useMemo(() => {
    const set = new Set(tips.map((t) => t.league));
    return ["All", ...Array.from(set)];
  }, [tips]);

  const filteredTips = useMemo(
    () =>
      activeFilter === "All"
        ? tips
        : activeFilter === "Saved"
        ? tips.filter((t) => bookmarkedTips.has(t.id))
        : tips.filter((t) => t.league === activeFilter),
    [tips, activeFilter, bookmarkedTips]
  );

  const searchedTips = useMemo(() => {
    if (!searchQuery.trim()) return [] as Tip[];
    const q = searchQuery.toLowerCase();
    return tips.filter(
      (t) =>
        t.homeTeam.toLowerCase().includes(q) ||
        t.awayTeam.toLowerCase().includes(q) ||
        t.league.toLowerCase().includes(q) ||
        t.prediction.toLowerCase().includes(q)
    );
  }, [searchQuery, tips]);

  const addToSlip = useCallback(
    (tip: Tip) => {
      if (betSlip.find((t) => t.id === tip.id)) {
        toast.info("Already in your bet slip");
        return;
      }
      setBetSlip((prev) => [...prev, tip]);
      toast.success(`${tip.homeTeam} vs ${tip.awayTeam} added to slip`);
    },
    [betSlip]
  );

  const removeFromSlip = useCallback((id: string) => {
    setBetSlip((prev) => prev.filter((t) => t.id !== id));
    toast("Removed from slip");
  }, []);

  const potentialReturn = useMemo(() => {
    const stakeNum = parseFloat(stake) || 0;
    const combinedOdds = betSlip.reduce(
      (acc, t) => acc * parseFloat(t.odds),
      1
    );
    return (stakeNum * combinedOdds).toFixed(0);
  }, [betSlip, stake]);

  const fetchAdminTips = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tips");
      const data = await res.json();
      setAdminTips(data.tips || []);
    } catch { /* silent */ }
  }, []);

  const copyTip = useCallback((tip: Tip) => {
    const text = `⚽ ${tip.league}\n${tip.homeTeam} vs ${tip.awayTeam}\nPrediction: ${tip.prediction}\nOdds: ${tip.odds}\nConfidence: ${tip.confidence}%\n\nvia GoalEdge`;
    navigator.clipboard.writeText(text).then(
      () => toast.success("Tip copied to clipboard!"),
      () => toast.error("Failed to copy")
    );
  }, []);

  const fetchMyBets = useCallback(async () => {
    const email = session?.user?.email || localStorage.getItem("betEmail");
    if (!email) { toast.error("Please sign in to view your bets"); return; }
    setMyBetsLoading(true);
    try {
      const res = await fetch(`/api/bets/history?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.bets) setMyBets(data.bets);
      if (data.summary) setMyBetsSummary(data.summary);
    } catch { toast.error("Failed to load bet history"); }
    finally { setMyBetsLoading(false); }
  }, [session?.user?.email]);

  const handleOpenMyBets = useCallback(() => {
    setMyBetsOpen(true);
    setMyBetsFilter("all");
    fetchMyBets();
  }, [fetchMyBets]);

  const handlePlaceBet = useCallback(async () => {
    if (betSlip.length === 0) return;
    const email = session?.user?.email || localStorage.getItem("betEmail") || "";
    if (!email) {
      setBetSlipOpen(false);
      setAuthMode("signin");
      setAuthError("Please sign in to place bets");
      setAuthOpen(true);
      return;
    }
    // Store email for future use
    if (!localStorage.getItem("betEmail")) localStorage.setItem("betEmail", email);

    const effectiveCount = accType === "acca" ? betSlip.length : accType === "single" ? 1 : accType === "double" ? 2 : accType === "treble" ? 3 : accType === "4fold" ? 4 : accType === "5fold" ? 5 : 6;
    const legsToPlace = betSlip.slice(0, effectiveCount === 0 ? betSlip.length : effectiveCount);
    const stakeNum = parseFloat(stake) || 0;

    if (stakeNum < 10) { toast.error("Minimum stake is Ksh 10"); return; }

    const legs = legsToPlace.map((t) => ({
      tipId: t.id, homeTeam: t.homeTeam, awayTeam: t.awayTeam,
      league: t.league, prediction: t.prediction, predictionType: t.predictionType,
      odds: t.odds, matchTime: t.matchTime,
    }));
    const totalOdds = legs.reduce((acc, l) => acc * parseFloat(l.odds), 1);
    const potentialRetVal = Math.round(stakeNum * totalOdds);

    setPlaceBetOpen(true);
    setPlaceBetStep("processing");
    setPlaceBetError("");
    setPlacedBetId("");
    setBetSlipOpen(false);

    try {
      const res = await fetch("/api/bets/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, betType: accType, legs, stake: stakeNum, totalOdds, potentialReturn: potentialRetVal }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPlacedBetId(data.bet.id);
        setPlaceBetStep("success");
        setBetSlip([]);
        setStake("100");
        toast.success("Bet placed successfully!");
      } else {
        setPlaceBetError(data.error || "Failed to place bet");
        setPlaceBetStep("error");
      }
    } catch {
      setPlaceBetError("Network error. Please try again.");
      setPlaceBetStep("error");
    }
  }, [betSlip, stake, accType, session?.user?.email]);

  const betSlipIds = useMemo(() => new Set(betSlip.map(t => t.id)), [betSlip]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      {/* ==================== SCROLL PROGRESS ==================== */}
      <ScrollProgress />

      {/* ==================== HEADER ==================== */}
      <Header
        scrolled={scrolled}
        activeSection={activeSection}
        apiStatus={apiStatus}
        dataSource={dataSource}
        tipsCount={tips.length}
        session={session}
        profileOpen={profileOpen}
        notificationsOpen={notificationsOpen}
        betSlipLength={betSlip.length}
        mobileMenuOpen={mobileMenuOpen}
        searchOpen={searchOpen}
        searchQuery={searchQuery}
        searchedTips={searchedTips}
        notifications={notifications}
        notifPrefs={notifPrefs}
        searchRef={searchRef}
        notifRef={notifRef}
        profileRef={profileRef}
        onSetSearchOpen={setSearchOpen}
        onSetSearchQuery={setSearchQuery}
        onSetSelectedTip={setSelectedTip}
        onSetNotificationsOpen={setNotificationsOpen}
        onSetProfileOpen={setProfileOpen}
        onSetMobileMenuOpen={setMobileMenuOpen}
        onSetUserProfileOpen={setUserProfileOpen}
        onSetAchievementsOpen={setAchievementsOpen}
        onSetAdminOpen={setAdminOpen}
        onSetAuthMode={setAuthMode}
        onSetAuthOpen={setAuthOpen}
        onSetAuthError={setAuthError}
        onSetBetSlipOpen={setBetSlipOpen}
        onSignOut={() => signOut()}
        onOpenMyBets={handleOpenMyBets}
        onFetchAdminTips={fetchAdminTips}
        onNotifPrefsChange={setNotifPrefs}
        onOpenApiKeySettings={() => setApiKeySettingsOpen(true)}
      />

      {/* ==================== LIVE STATS TICKER ==================== */}
      <div className="hidden overflow-hidden border-b border-emerald-100 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30 sm:block">
        <div className="animate-scroll flex w-max gap-12 py-2 px-4">
          <span className="shrink-0 text-xs font-medium text-emerald-700 dark:text-emerald-300">🔥 12,847 tips delivered today</span>
          <span className="shrink-0 text-xs font-medium text-emerald-700 dark:text-emerald-300">📈 73.2% win rate this week</span>
          <span className="shrink-0 text-xs font-medium text-emerald-700 dark:text-emerald-300">⚡ 156 active users online</span>
          <span className="shrink-0 text-xs font-medium text-emerald-700 dark:text-emerald-300">🏆 Ksh 2.4M potential returns today</span>
          <span className="shrink-0 text-xs font-medium text-emerald-700 dark:text-emerald-300">⚽ 28 matches live now</span>
          {/* Duplicate for seamless loop */}
          <span className="shrink-0 text-xs font-medium text-emerald-700 dark:text-emerald-300">🔥 12,847 tips delivered today</span>
          <span className="shrink-0 text-xs font-medium text-emerald-700 dark:text-emerald-300">📈 73.2% win rate this week</span>
          <span className="shrink-0 text-xs font-medium text-emerald-700 dark:text-emerald-300">⚡ 156 active users online</span>
          <span className="shrink-0 text-xs font-medium text-emerald-700 dark:text-emerald-300">🏆 Ksh 2.4M potential returns today</span>
          <span className="shrink-0 text-xs font-medium text-emerald-700 dark:text-emerald-300">⚽ 28 matches live now</span>
        </div>
      </div>

      <main className="flex-1 pb-20 sm:pb-0">
        {/* ==================== HERO ==================== */}
        <Hero heroScrollY={heroScrollY} onSetAuthMode={setAuthMode} onSetAuthOpen={setAuthOpen} />

        {/* ==================== HOW IT WORKS ==================== */}
        <HowItWorks />

        {/* ==================== LEAGUE STANDINGS ==================== */}
        <Standings />

        {/* ==================== LIVE SCORES ==================== */}
        <LiveScoresSection liveScores={liveScores} lastRefreshed={lastRefreshed} onRefresh={fetchLiveScores} />


        <TipsSection
          loading={loading}
          apiStatus={apiStatus}
          tipsCount={tips.length}
          selectedDate={selectedDate}
          leagues={leagues}
          activeFilter={activeFilter}
          bookmarkedTips={bookmarkedTips}
          filteredTips={filteredTips}
          betSlipIds={Array.from(betSlipIds)}
          tipVotes={tipVotes}
          liveOdds={liveOdds}
          stakeCalcOpen={stakeCalcOpen}
          calcStake={calcStake}
          onSetSelectedDate={setSelectedDate}
          onSetActiveFilter={setActiveFilter}
          onSetSelectedTip={setSelectedTip}
          onAddToSlip={addToSlip}
          onCopyTip={copyTip}
          onSetTipVotes={setTipVotes}
          onSetStakeCalcOpen={setStakeCalcOpen}
          onSetCalcStake={setCalcStake}
          onSetBookmarkedTips={setBookmarkedTips}
          onFetchTips={fetchTips}
          onSetSearchOpen={setSearchOpen}
          onSetCompareTip={setCompareTip}
          onSeeAll={() => {
            setActiveFilter("All");
            document.getElementById("tips")?.scrollIntoView({ behavior: "smooth" });
            toast.success("Showing all available tips");
          }}
        />

        <div className="h-4 section-dot-divider" aria-hidden="true" />

        {/* ==================== TIP RESULTS HISTORY ==================== */}
        <TipResults
          historyFilter={historyFilter}
          historyPeriod={historyPeriod}
          onSetHistoryFilter={setHistoryFilter}
          onSetHistoryPeriod={setHistoryPeriod}
        />

        {/* ==================== ACCUMULATOR OF THE DAY ==================== */}
        <AccumulatorOfTheDay tips={tips} onAddToSlip={addToSlip} />



        {/* ==================== FEATURES ==================== */}
        <Features />

        {/* ==================== PRICING ==================== */}
        <Pricing onSetAuthMode={setAuthMode} onSetAuthOpen={setAuthOpen} onSetPaymentOpen={setPaymentOpen} />

        {/* ==================== TESTIMONIALS ==================== */}
        <Testimonials />



        {/* ==================== FAQ ==================== */}
        <FAQ />

        {/* ==================== CTA ==================== */}
        <CTA onSetAuthMode={setAuthMode} onSetAuthOpen={setAuthOpen} />
      </main>

      {/* ==================== FOOTER ==================== */}
      <Footer apiStatus={apiStatus} onSetAuthMode={setAuthMode} onSetAuthOpen={setAuthOpen} />

      {/* ==================== MOBILE BOTTOM BAR ==================== */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 backdrop-blur-lg sm:hidden dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex items-end justify-around">
          {[
            { icon: Target, label: "Tips", action: () => document.getElementById("tips")?.scrollIntoView({ behavior: "smooth" }), id: "tips" },
            { icon: Ticket, label: "Bet Slip", action: () => setBetSlipOpen(true), id: "betslip", badge: betSlip.length },
            { icon: Plus, label: "", action: () => { setAuthMode("signup"); setAuthOpen(true); }, id: "premium", isFab: true },
            { icon: History, label: "My Bets", action: () => handleOpenMyBets(), id: "mybets" },
            { icon: Mail, label: "More", action: () => document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" }), id: "more" },
          ].map((item) => {
            if (item.isFab) {
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="flex h-12 -mt-5 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 transition-all active:scale-95 hover:shadow-emerald-500/40"
                >
                  <item.icon className="h-6 w-6" />
                </button>
              );
            }
            return (
              <button
                key={item.id}
                onClick={item.action}
                className="relative flex min-w-[48px] flex-col items-center gap-0.5 px-2 py-1.5 text-slate-400 transition-all active:scale-95 active:text-emerald-600"
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {item.badge ? item.badge > 0 && (
                    <span className="absolute -right-1.5 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-white ring-2 ring-white dark:ring-slate-950">{item.badge}</span>
                  ) : null}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================== BET SLIP FAB (Desktop) ==================== */}
      <button
        onClick={() => setBetSlipOpen(true)}
        className="fixed bottom-20 left-6 z-40 hidden items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all hover:bg-emerald-500 sm:inline-flex"
      >
        <Ticket className="h-4 w-4" />
        Bet Slip
        {betSlip.length > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-emerald-700">
            {betSlip.length}
          </span>
        )}
      </button>

      {/* ==================== SCROLL TO TOP ==================== */}
      <ScrollToTop />

      {/* ==================== MODALS & PANELS ==================== */}

      {/* Share Modal */}
      <ShareModal
        open={shareModalOpen}
        tip={shareTip}
        onClose={() => setShareModalOpen(false)}
      />

      {/* Odds Comparison Modal */}
      <OddsCompareModal tip={compareTip} onClose={() => setCompareTip(null)} />

      {/* Bet Slip Panel */}
      <BetSlipPanel
        open={betSlipOpen}
        onClose={() => setBetSlipOpen(false)}
        betSlip={betSlip}
        accType={accType}
        eachWay={eachWay}
        freeBetMode={freeBetMode}
        oddsBoostApplied={oddsBoostApplied}
        stake={stake}
        potentialReturn={potentialReturn}
        clearConfirming={clearConfirming}
        savedSlips={savedSlips}
        onSetAccType={setAccType}
        onSetEachWay={setEachWay}
        onSetFreeBetMode={setFreeBetMode}
        onSetOddsBoostApplied={setOddsBoostApplied}
        onSetStake={setStake}
        onRemoveFromSlip={removeFromSlip}
        onClearSlip={() => { setBetSlip([]); setClearConfirming(false); }}
        onSetClearConfirming={setClearConfirming}
        onSetSavedSlips={setSavedSlips}
        onPlaceBet={handlePlaceBet}
        onSetStakeCalcOpen={setStakeCalcOpen}
        onSetCalcStake={setCalcStake}
        stakeCalcOpen={stakeCalcOpen}
        calcStake={calcStake}
        liveOdds={liveOdds}
      />

      {/* Admin Panel */}
      <AdminPanel
        open={adminOpen}
        tab={adminTab}
        tips={adminTips}
        form={adminForm}
        loading={adminLoading}
        editingId={editingId}
        onClose={() => { setAdminOpen(false); setEditingId(null); }}
        onSetTab={setAdminTab}
        onSetForm={setAdminForm}
        onSetLoading={setAdminLoading}
        onSetEditingId={setEditingId}
        onFetchTips={fetchAdminTips}
      />

      {/* API Key Settings Modal */}
      <ApiKeySettings
        open={apiKeySettingsOpen}
        onClose={() => setApiKeySettingsOpen(false)}
        currentApiStatus={apiStatus}
        onKeySaved={() => {
          setApiKeySettingsOpen(false);
          // Re-fetch tips and live scores with the new key
          fetchTips();
          fetchLiveScores();
          setApiStatus("checking");
        }}
        onKeyRemoved={() => {
          setApiKeySettingsOpen(false);
          setApiStatus("offline");
          fetchTips();
        }}
      />

      {/* Payment Flow Modal */}
      {paymentOpen && (
        <PaymentFlowModal
          email={session?.user?.email || paymentEmail}
          onClose={() => setPaymentOpen(false)}
          onAuthenticated={(email) => {
            setPaymentEmail(email);
          }}
        />
      )}

      {/* User Profile Panel */}
      {userProfileOpen && (
        <UserProfilePanel
          session={session}
          bookmarkedTips={bookmarkedTips}
          tipVotes={tipVotes}
          betSlipLength={betSlip.length}
          onClose={() => setUserProfileOpen(false)}
          onUpgrade={() => { setUserProfileOpen(false); setPaymentOpen(true); }}
          notifPrefs={notifPrefs}
          onNotifPrefsChange={setNotifPrefs}
          bankroll={bankroll}
          onBankrollChange={setBankroll}
        />
      )}

      {/* Achievements Panel */}
      {achievementsOpen && (
        <AchievementsPanel
          betSlipLength={betSlip.length}
          bookmarkedCount={bookmarkedTips.size}
          tipVotesCount={Object.keys(tipVotes).length}
          isPremium={(session?.user as Record<string, unknown> | null)?.plan === "premium"}
          tips={tips}
          stake={stake}
          onClose={() => setAchievementsOpen(false)}
        />
      )}

      {/* Tip Detail Panel */}
      {selectedTip && (
        <TipDetailPanel
          tip={selectedTip}
          betSlipIds={betSlipIds}
          isPremium={(session?.user as Record<string, unknown> | null)?.plan === "premium"}
          onClose={() => setSelectedTip(null)}
          onAddToSlip={() => { addToSlip(selectedTip); }}
          onCopy={() => copyTip(selectedTip)}
          onShare={() => { setShareTip(selectedTip); setShareModalOpen(true); setSelectedTip(null); }}
          isBookmarked={bookmarkedTips.has(selectedTip.id)}
          onToggleBookmark={() => {
            setBookmarkedTips(prev => {
              const next = new Set(prev);
              if (next.has(selectedTip.id)) { next.delete(selectedTip.id); toast("Removed from favorites"); }
              else { next.add(selectedTip.id); toast.success("Saved to favorites!"); }
              return next;
            });
          }}
          onUpgrade={() => { setSelectedTip(null); setPaymentOpen(true); }}
          allTips={tips}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        open={authOpen}
        mode={authMode}
        error={authError}
        loading={authLoading}
        name={authName}
        email={authEmail}
        password={authPassword}
        confirm={authConfirm}
        referralCode={authReferralCode}
        onClose={() => setAuthOpen(false)}
        onSetMode={setAuthMode}
        onSetError={setAuthError}
        onSetLoading={setAuthLoading}
        onSetName={setAuthName}
        onSetEmail={setAuthEmail}
        onSetPassword={setAuthPassword}
        onSetConfirm={setAuthConfirm}
        onSetReferralCode={setAuthReferralCode}
      />

      {/* Place Bet Modal */}
      <PlaceBetModal
        open={placeBetOpen}
        step={placeBetStep}
        betSlip={betSlip}
        accType={accType}
        stake={stake}
        potentialReturn={potentialReturn}
        placedBetId={placedBetId}
        placeBetError={placeBetError}
        myBetsOpen={myBetsOpen}
        myBets={myBets}
        myBetsSummary={myBetsSummary}
        myBetsFilter={myBetsFilter}
        myBetsLoading={myBetsLoading}
        onClose={() => setPlaceBetOpen(false)}
        onPlaceBet={handlePlaceBet}
        onOpenMyBets={handleOpenMyBets}
        onFetchMyBets={fetchMyBets}
        onSetMyBetsFilter={setMyBetsFilter}
        onSetMyBetsOpen={setMyBetsOpen}
        onSetBetSlipOpen={setBetSlipOpen}
      />
    </div>
  );
}