import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useDomain, Section } from "@/contexts/DomainContext";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, User, Moon, Sun, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { AUTH_REQUIRED } from "@/lib/authGate";

const DomainNavbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [deskNavReady, setDeskNavReady] = useState(
    () => document.documentElement.dataset.hireCeremony !== "1"
  );
  const { user, signOut } = useAuth();
  const { section, setSection } = useDomain();
  const { teachLanguage, setTeachLanguage, theme, setTheme } = useSettings();
  const navigate = useNavigate();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const sync = () =>
      setDeskNavReady(document.documentElement.dataset.hireCeremony !== "1");
    sync();
    window.addEventListener("rebon-hire-ceremony", sync);
    return () => window.removeEventListener("rebon-hire-ceremony", sync);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sections: { id: Section; label: string; path: string; activeClass: string; lineClass: string }[] = [
    { id: "learning", label: "Learn", path: "/learning", activeClass: "text-amber-brand", lineClass: "bg-[#F59E0B]" },
    { id: "workspace", label: "Work", path: "/workspace", activeClass: "text-violet-brand", lineClass: "bg-primary" },
    { id: "profile", label: "Proof", path: "/profile", activeClass: "text-emerald-brand", lineClass: "bg-[#10B981]" },
  ];

  const handleSectionChange = (newSection: Section) => {
    setSection(newSection);
    const sectionData = sections.find((s) => s.id === newSection);
    if (sectionData) navigate(sectionData.path);
  };

  const handleSignOut = async () => {
    setIsUserMenuOpen(false);
    await signOut();
    navigate("/login");
  };

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Guest";
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <motion.nav
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-white/[0.06]"
    >
      <div className="w-full px-8 md:px-14">
        <div className="flex items-center justify-between h-16 md:h-[4.5rem]">
          <Link to="/" className="font-display text-xl font-extrabold tracking-[0.08em] text-foreground md:text-2xl">
            LexiClash
          </Link>

          <div
            className={cn(
              "hidden md:flex items-center gap-10 absolute left-1/2 -translate-x-1/2 transition-opacity duration-500",
              deskNavReady ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSectionChange(s.id)}
                className={cn(
                  "relative text-[13px] tracking-wide transition-colors pb-1",
                  section === s.id ? s.activeClass : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s.label}
                {section === s.id && (
                  <motion.span
                    layoutId="nav-line"
                    className={cn("absolute left-0 right-0 -bottom-px h-px", s.lineClass)}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-6" ref={userMenuRef}>
            {user ? (
              <button
                id="rebon-profile-anchor"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center text-[10px] font-semibold tracking-wider text-foreground hover:border-primary/50 transition-colors"
                title={displayName}
              >
                {initials}
              </button>
            ) : (
              <Link to="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-white/15 hover:border-primary/50 text-foreground flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Log in
                </Button>
              </Link>
            )}

            <AnimatePresence>
              {isUserMenuOpen && user && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute top-14 right-4 w-64 bg-card border border-white/[0.08] shadow-elevated overflow-hidden rounded-xl"
                >
                  <div className="px-5 py-4 border-b border-white/[0.06]">
                    <p className="text-sm font-medium text-foreground">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {user?.email || "Authenticated candidate"}
                    </p>
                    {user?.user_metadata?.role && (
                      <span className="inline-block mt-2 px-2 py-0.5 text-[10px] rounded bg-primary/10 text-primary border border-primary/20">
                        {user.user_metadata.role}
                      </span>
                    )}
                  </div>
                  <div className="px-5 py-4 border-b border-white/[0.06] space-y-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Language</p>
                    <div className="flex gap-4 text-sm">
                      {(["english", "tanglish"] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setTeachLanguage(lang)}
                          className={cn(
                            "capitalize transition-colors",
                            teachLanguage === lang ? "text-primary" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="px-5 py-3 border-b border-white/[0.06]">
                    <button
                      onClick={() => { navigate("/profile"); setIsUserMenuOpen(false); }}
                      className="w-full flex items-center gap-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <User className="w-3.5 h-3.5" /> Profile
                    </button>
                    <button
                      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                      className="w-full flex items-center gap-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                      Appearance
                    </button>
                  </div>
                  <div className="px-5 py-3">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button className="md:hidden p-2 text-foreground" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {isMobileMenuOpen && deskNavReady && (
          <div className="md:hidden py-4 border-t border-white/[0.06] space-y-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => { handleSectionChange(s.id); setIsMobileMenuOpen(false); }}
                className={cn(
                  "w-full text-left px-2 py-3 text-sm",
                  section === s.id ? s.activeClass : "text-muted-foreground"
                )}
              >
                {s.label}
              </button>
            ))}
            {user ? (
              <button onClick={handleSignOut} className="w-full text-left px-2 py-3 text-sm text-red-400">
                Sign out
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block w-full text-left px-2 py-3 text-sm text-primary font-medium"
              >
                Log in
              </Link>
            )}
          </div>
        )}
      </div>
    </motion.nav>
  );
};

export default DomainNavbar;
