"use client";
import { create } from "zustand";
import { defaultScenarios } from "@/lib/dcf/analysis";
import { deriveAssumptions } from "@/lib/dcf/defaults";
import type { Approach, Assumptions, CompanyData, Scenario, ScenarioShifts } from "@/lib/dcf/types";
import type { TabId } from "@/lib/learn";

export interface SavedModel {
  ticker: string;
  name: string;
  assumptions: Assumptions;
  scenarios: Scenario[];
  price: number | null;
  notes: string;
  savedAt: string;
}

interface ModelState {
  company: CompanyData | null;
  assumptions: Assumptions | null;
  defaults: Assumptions | null;
  scenarios: Scenario[];
  price: number | null;
  notes: string;
  load: (c: CompanyData) => void;
  set: (patch: Partial<Assumptions>) => void;
  setApproach: (approach: Approach) => void;
  setScenario: (id: Scenario["id"], patch: Partial<Scenario>) => void;
  setShift: (id: Scenario["id"], key: keyof ScenarioShifts, value: number) => void;
  setPrice: (p: number | null) => void;
  setNotes: (n: string) => void;
  reset: () => void;
}

const KEY = (t: string) => `dcf:model:${t.toUpperCase()}`;

export function listSavedModels(): SavedModel[] {
  try {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith("dcf:model:"))
      .map((k) => JSON.parse(localStorage.getItem(k)!) as SavedModel)
      .sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
  } catch {
    return [];
  }
}

function persist(s: ModelState) {
  if (!s.company || !s.assumptions) return;
  try {
    const m: SavedModel = {
      ticker: s.company.ticker,
      name: s.company.name,
      assumptions: s.assumptions,
      scenarios: s.scenarios,
      price: s.price,
      notes: s.notes,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(KEY(s.company.ticker), JSON.stringify(m));
  } catch {
    /* storage unavailable: the model still works for this session */
  }
}

export const useModel = create<ModelState>((set, get) => ({
  company: null,
  assumptions: null,
  defaults: null,
  scenarios: [],
  price: null,
  notes: "",
  load: (c) => {
    let saved: SavedModel | null = null;
    try {
      const raw = localStorage.getItem(KEY(c.ticker));
      saved = raw ? (JSON.parse(raw) as SavedModel) : null;
    } catch {}
    const auto = deriveAssumptions(c);
    // Models saved before the equity approach existed have no `approach`. If this company now
    // defaults to the equity approach, their margins and reinvestment mean something else, so
    // start the assumptions fresh (notes and scenarios are kept).
    const savedA = saved?.assumptions;
    const usable = savedA && (savedA.approach != null || auto.approach === "firm") ? savedA : null;
    const defaults = usable?.approach && usable.approach !== auto.approach ? deriveAssumptions(c, usable.approach) : auto;
    const assumptions = usable ? { ...defaults, ...usable } : defaults;
    set({
      company: c,
      defaults,
      assumptions,
      scenarios: saved?.scenarios?.every((x) => x.shifts) ? saved.scenarios : defaultScenarios(),
      // A live price always wins over a stale saved one.
      price: c.price ?? saved?.price ?? null,
      notes: saved?.notes ?? "",
    });
  },
  set: (patch) => {
    const a = get().assumptions;
    if (!a) return;
    set({ assumptions: { ...a, ...patch } });
    persist(get());
  },
  setApproach: (approach) => {
    const { company, assumptions: a } = get();
    if (!company || !a || a.approach === approach) return;
    // Margins, reinvestment and terminal inputs mean different things in each approach, so
    // take fresh defaults for those and keep everything else the user has set.
    const d = deriveAssumptions(company, approach);
    set({
      defaults: d,
      assumptions: {
        ...a,
        approach,
        currentMargin: d.currentMargin,
        targetMargin: d.targetMargin,
        salesToCapital: d.salesToCapital,
        terminalRoic: d.terminalRoic,
        exitMultiple: d.exitMultiple,
        waccOverride: null,
      },
    });
    persist(get());
  },
  setScenario: (id, patch) => {
    set({ scenarios: get().scenarios.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
    persist(get());
  },
  setShift: (id, key, value) => {
    set({
      scenarios: get().scenarios.map((s) => (s.id === id ? { ...s, shifts: { ...s.shifts, [key]: value } } : s)),
    });
    persist(get());
  },
  setPrice: (p) => {
    set({ price: p });
    persist(get());
  },
  setNotes: (n) => {
    set({ notes: n });
    persist(get());
  },
  reset: () => {
    const { company } = get();
    if (!company) return;
    try {
      localStorage.removeItem(KEY(company.ticker));
    } catch {}
    const defaults = deriveAssumptions(company);
    set({ defaults, assumptions: defaults, scenarios: defaultScenarios(), price: company.price, notes: "" });
  },
}));


/** UI state shared by the workbench and the guided tour. */
export const useUi = create<{
  tab: TabId;
  setTab: (t: TabId) => void;
  tourOpen: boolean;
  setTourOpen: (o: boolean) => void;
}>((set) => ({
  tab: "model",
  setTab: (tab) => set({ tab }),
  tourOpen: false,
  setTourOpen: (tourOpen) => set({ tourOpen }),
}));
