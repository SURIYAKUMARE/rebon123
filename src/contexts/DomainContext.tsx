import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export type Domain = "communication" | "fullstack";
export type Section = "learning" | "workspace" | "profile";

const DOMAIN_KEY = "rebon_domain";

function readStoredDomain(): Domain {
  try {
    localStorage.setItem(DOMAIN_KEY, "fullstack");
  } catch {
    /* ignore */
  }
  return "fullstack";
}

interface DomainContextType {
  domain: Domain;
  setDomain: (domain: Domain) => void;
  section: Section;
  setSection: (section: Section) => void;
}

const DomainContext = createContext<DomainContextType | undefined>(undefined);

export const DomainProvider = ({ children }: { children: ReactNode }) => {
  const [domain, setDomainState] = useState<Domain>(readStoredDomain);
  const [section, setSection] = useState<Section>("learning");

  const setDomain = useCallback((next: Domain) => {
    const resolved: Domain = next === "communication" ? "fullstack" : next;
    setDomainState(resolved);
    try {
      localStorage.setItem(DOMAIN_KEY, resolved);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <DomainContext.Provider value={{ domain, setDomain, section, setSection }}>
      {children}
    </DomainContext.Provider>
  );
};

export const useDomain = () => {
  const context = useContext(DomainContext);
  if (!context) {
    throw new Error("useDomain must be used within a DomainProvider");
  }
  return context;
};
