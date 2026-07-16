import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RECIPES, type Recipe, type SpiritCategory } from "@/lib/recipes";
import {
  abvFromOgFg,
  correctSG,
  estimateDistillate,
  potentialAbv,
  suggestCuts,
  waterToDilute,
} from "@/lib/distilling";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { LoginGate } from "@/components/LoginGate";
import bgDefault from "@/assets/bg_default.png.asset.json";
import bgBatch from "@/assets/bg_batch.png.asset.json";


export const Route = createFileRoute("/")({
  component: GatedIndex,
});

function GatedIndex() {
  return (
    <LoginGate>
      <Index />
    </LoginGate>
  );
}

type Tab = "batches" | "recipes" | "calc" | "inventory";

interface GravityReading {
  date: string;
  sg: number;
  temp?: number;
  note?: string;
}

interface CutLog {
  foreshots?: number;
  heads?: number;
  hearts?: number;
  tails?: number;
  notes?: string;
}

interface Batch {
  id: string;
  name: string;
  recipeId?: string;
  category: SpiritCategory;
  startDate: string;
  yeastPitchedAt?: string;
  volumeL: number;
  og: number;
  fg?: number;
  yeast: string;
  fermentTemp: string;
  readings: GravityReading[];
  cuts?: CutLog;
  status: "Fermenting" | "Ready to distill" | "Distilled" | "Aging" | "Bottled";
  safetyVentilation?: boolean;
  safetyCooling?: boolean;
  safetyPressure?: boolean;
  notes: string;
}

const emptyBatch = (): Batch => ({
  id: crypto.randomUUID(),
  name: "",
  category: "Whiskey",
  startDate: new Date().toISOString().slice(0, 10),
  volumeL: 25,
  og: 1.06,
  yeast: "",
  fermentTemp: "22 °C",
  readings: [],
  status: "Fermenting",
  notes: "",
});

function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatElapsedSince(iso: string | undefined, now: number): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  const ms = Math.max(0, now - t);
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function localDatetimeNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function FermentElapsed({ pitchedAt }: { pitchedAt?: string }) {
  const now = useNow(60_000);
  const elapsed = formatElapsedSince(pitchedAt, now);
  if (!pitchedAt) return null;
  const pitchedDate = new Date(pitchedAt);
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="text-[10px] uppercase tracking-widest text-amber-300/80">Fermenting — elapsed since yeast pitch</div>
      <div className="mt-1 font-mono text-2xl text-amber-200">{elapsed ?? "—"}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Pitched {isNaN(pitchedDate.getTime()) ? pitchedAt : pitchedDate.toLocaleString()}
      </div>
    </div>
  );
}


function Index() {
  const [tab, setTab] = useState<Tab>("batches");
  const bgUrl = tab === "batches" ? bgBatch.url : bgDefault.url;

  return (
    <div className="relative min-h-screen">
      {/* Layer 0: fixed background skin */}
      <div
        aria-hidden
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url(${bgUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
          backgroundColor: "#0d1a17",
        }}
      />
      {/* Layer 30: fixed header plank overlay */}
      <Header tab={tab} setTab={setTab} />
      {/* Layer 10: scrollable content between bg and header */}
      <main
        className={
          tab === "batches"
            ? "relative z-10 mx-auto w-full max-w-2xl px-4 pb-24 pt-16 sm:px-6 sm:pt-20"
            : "relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-20 sm:px-6 sm:pt-24"
        }
      >
        {tab === "batches" && <BatchesView />}
        {tab === "recipes" && <RecipesView />}
        {tab === "calc" && <CalculatorsView />}
        {tab === "inventory" && <InventoryView />}
      </main>


      <footer className="relative z-10 py-6 text-center text-xs text-muted-foreground">
        Ego's Distilling · Data stays on your device
      </footer>
    </div>
  );
}

function Header({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "batches", label: "Batches" },
    { id: "recipes", label: "Recipes" },
    { id: "calc", label: "Calculators" },
    { id: "inventory", label: "Inventory" },
  ];
  return (
    <header className="fixed inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 sm:px-6 sm:py-3">
        {/* Spacer for baked-in logo on top plank */}
        <div className="w-[32%] max-w-[420px] shrink-0" aria-hidden />
        <nav className="flex flex-wrap rounded-full border border-[color:var(--copper-500)]/40 bg-black/50 p-1 text-xs shadow-[var(--shadow-deep)] backdrop-blur-md sm:text-sm">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3 py-1 font-medium transition sm:px-4 sm:py-1.5 ${
                tab === t.id
                  ? "btn-copper"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}



/* ---------------- Batches ---------------- */

function BatchesView() {
  const [batches, setBatches] = useLocalStorage<Batch[]>("sc-batches", []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const editing = batches.find((b) => b.id === editingId);

  const upsert = (b: Batch) => {
    setBatches((prev) => {
      const exists = prev.some((p) => p.id === b.id);
      return exists ? prev.map((p) => (p.id === b.id ? b : p)) : [b, ...prev];
    });
  };

  const remove = (id: string) => {
    setBatches((prev) => prev.filter((p) => p.id !== id));
    if (editingId === id) setEditingId(null);
  };

  if (creating || editing) {
    return (
      <BatchEditor
        initial={editing ?? emptyBatch()}
        onSave={(b) => {
          upsert(b);
          setCreating(false);
          setEditingId(null);
        }}
        onCancel={() => {
          setCreating(false);
          setEditingId(null);
        }}
        onDelete={editing ? () => remove(editing.id) : undefined}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Your Batches</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Log washes from mash to bottle. Track gravity, cuts, and aging.
          </p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-copper rounded-lg px-4 py-2 text-sm font-semibold">
          + New batch
        </button>
      </div>

      {batches.length === 0 ? (
        <EmptyState onCreate={() => setCreating(true)} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {batches.map((b) => (
            <BatchCard key={b.id} batch={b} onOpen={() => setEditingId(b.id)} />
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="surface-card rounded-2xl p-10 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full btn-copper text-2xl">⚗︎</div>
      <h2 className="text-2xl font-semibold">Start your first wash</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Pick a recipe or start blank. Log your original gravity, track fermentation,
        record your cuts, and note aging.
      </p>
      <button onClick={onCreate} className="btn-copper mt-6 rounded-lg px-5 py-2 text-sm font-semibold">
        Create a batch
      </button>
    </div>
  );
}

function BatchCard({ batch, onOpen }: { batch: Batch; onOpen: () => void }) {
  const abv = batch.fg ? abvFromOgFg(batch.og, batch.fg) : potentialAbv(batch.og);
  const now = useNow();
  const elapsed = formatElapsedSince(batch.yeastPitchedAt, now);
  const statusColor: Record<Batch["status"], string> = {
    Fermenting: "text-amber-300",
    "Ready to distill": "text-orange-300",
    Distilled: "text-primary",
    Aging: "text-accent",
    Bottled: "text-emerald-300",
  };
  return (
    <button
      onClick={onOpen}
      className="surface-card group rounded-2xl p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-warm)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{batch.category}</div>
          <div className="mt-1 font-display text-xl font-semibold">{batch.name || "Untitled batch"}</div>
        </div>
        <span className={`text-xs font-medium ${statusColor[batch.status]}`}>● {batch.status}</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <Stat label="Volume" value={`${batch.volumeL} L`} />
        <Stat label="OG" value={batch.og.toFixed(3)} />
        <Stat label={batch.fg ? "ABV" : "Est. ABV"} value={`${abv.toFixed(1)}%`} />
      </div>
      <div className="mt-4 text-xs text-muted-foreground">Started {batch.startDate}</div>
      {elapsed && batch.status === "Fermenting" && (
        <div className="mt-1 text-xs text-amber-300">Fermenting: {elapsed} since pitch</div>
      )}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}

function BatchEditor({
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: Batch;
  onSave: (b: Batch) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [b, setB] = useState<Batch>(initial);
  const [safetyAlert, setSafetyAlert] = useState(false);
  const update = <K extends keyof Batch>(k: K, v: Batch[K]) => setB((prev) => ({ ...prev, [k]: v }));

  const safetyCleared = !!(b.safetyVentilation && b.safetyCooling && b.safetyPressure);
  const handleStartDistilling = () => {
    if (!safetyCleared) {
      setSafetyAlert(true);
      return;
    }
    setSafetyAlert(false);
    setB((prev) => ({ ...prev, status: "Distilled" }));
  };

  const abv = b.fg ? abvFromOgFg(b.og, b.fg) : potentialAbv(b.og);

  const applyRecipe = (id: string) => {
    const r = RECIPES.find((r) => r.id === id);
    if (!r) return;
    setB((prev) => ({
      ...prev,
      recipeId: r.id,
      category: r.category,
      name: prev.name || r.name,
      og: r.targetOG,
      yeast: r.yeast,
      fermentTemp: r.fermentTemp,
      notes: prev.notes || r.notes,
    }));
  };

  const addReading = () =>
    update("readings", [
      ...b.readings,
      { date: new Date().toISOString().slice(0, 10), sg: b.readings.length ? b.readings[b.readings.length - 1].sg : b.og },
    ]);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </button>
        <div className="flex gap-2">
          {onDelete && (
            <button
              onClick={() => {
                if (confirm("Delete this batch?")) onDelete();
              }}
              className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
            >
              Delete
            </button>
          )}
          <button onClick={() => onSave(b)} className="btn-copper rounded-lg px-4 py-2 text-sm font-semibold">
            Save batch
          </button>
        </div>
      </div>

      {/* Pre-Flight Safety Check */}
      <div className="surface-card rounded-2xl border border-destructive/30 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-destructive">Pre-Flight Safety Check</div>
            <h2 className="mt-1 font-display text-lg font-semibold">Required before distilling</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              All three interlocks must be confirmed on the rig before you start the run.
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartDistilling}
            aria-disabled={!safetyCleared}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              safetyCleared
                ? "btn-copper"
                : "cursor-not-allowed border border-border bg-muted/40 text-muted-foreground opacity-60"
            }`}
          >
            Start Distilling
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {(
            [
              { key: "safetyVentilation", label: "Ventilation Confirmed" },
              { key: "safetyCooling", label: "Cooling Flow Verified" },
              { key: "safetyPressure", label: "Pressure Relief Path Clear" },
            ] as { key: "safetyVentilation" | "safetyCooling" | "safetyPressure"; label: string }[]
          ).map((item) => {
            const checked = !!b[item.key];
            return (
              <label
                key={item.key}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  checked
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                    : "border-border bg-muted/30 hover:bg-muted/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    update(item.key, e.target.checked);
                    if (e.target.checked) setSafetyAlert(false);
                  }}
                  className="h-4 w-4 accent-emerald-500"
                />
                <span>{item.label}</span>
              </label>
            );
          })}
        </div>

        {safetyAlert && !safetyCleared && (
          <div
            role="alert"
            className="mt-4 rounded-lg border-2 border-destructive bg-destructive/15 px-4 py-3 font-mono text-sm font-bold uppercase tracking-widest text-destructive"
          >
            RED FLAG: SAFETY INTERLOCK NOT CLEARED
          </div>
        )}
      </div>

      <div className="surface-card space-y-5 rounded-2xl p-5 sm:p-6">

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Batch name">
            <input
              value={b.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Bourbon #3"
              className="input"
            />
          </Field>
          <Field label="Starter recipe (optional)">
            <select
              value={b.recipeId ?? ""}
              onChange={(e) => (e.target.value ? applyRecipe(e.target.value) : update("recipeId", undefined))}
              className="input"
            >
              <option value="">— None —</option>
              {RECIPES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select
              value={b.category}
              onChange={(e) => update("category", e.target.value as SpiritCategory)}
              className="input"
            >
              {(["Neutral", "Whiskey", "Rum", "Brandy", "Gin", "Agave"] as SpiritCategory[]).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select value={b.status} onChange={(e) => update("status", e.target.value as Batch["status"])} className="input">
              {(["Fermenting", "Ready to distill", "Distilled", "Aging", "Bottled"] as Batch["status"][]).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Start date">
            <input type="date" value={b.startDate} onChange={(e) => update("startDate", e.target.value)} className="input" />
          </Field>
          <Field label="Volume (L)">
            <input
              type="number"
              step="0.5"
              value={b.volumeL}
              onChange={(e) => update("volumeL", parseFloat(e.target.value) || 0)}
              className="input"
            />
          </Field>
          <Field label="Original gravity (OG)">
            <input
              type="number"
              step="0.001"
              value={b.og}
              onChange={(e) => update("og", parseFloat(e.target.value) || 0)}
              className="input"
            />
          </Field>
          <Field label="Final gravity (FG)">
            <input
              type="number"
              step="0.001"
              value={b.fg ?? ""}
              onChange={(e) => update("fg", e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="—"
              className="input"
            />
          </Field>
          <Field label="Yeast">
            <input value={b.yeast} onChange={(e) => update("yeast", e.target.value)} className="input" placeholder="e.g. DADY" />
          </Field>
          <Field label="Ferment temp">
            <input value={b.fermentTemp} onChange={(e) => update("fermentTemp", e.target.value)} className="input" />
          </Field>
          <Field label="Yeast pitched (date & time)">
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={b.yeastPitchedAt ?? ""}
                onChange={(e) => update("yeastPitchedAt", e.target.value || undefined)}
                className="input flex-1"
              />
              <button
                type="button"
                onClick={() => update("yeastPitchedAt", localDatetimeNow())}
                className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"
              >
                Now
              </button>
            </div>
          </Field>
        </div>

        <FermentElapsed pitchedAt={b.yeastPitchedAt} />


        <div className="rounded-xl bg-muted/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {b.fg ? "Actual ABV" : "Potential ABV"}
              </div>
              <div className="font-mono text-2xl text-copper">{abv.toFixed(2)}%</div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              {b.fg ? `From OG ${b.og.toFixed(3)} → FG ${b.fg.toFixed(3)}` : `Based on OG ${b.og.toFixed(3)}`}
            </div>
          </div>
        </div>
      </div>

      {/* Gravity log */}
      <div className="surface-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Gravity log</h2>
          <button onClick={addReading} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">
            + Add reading
          </button>
        </div>
        {b.readings.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Track hydrometer readings to confirm fermentation is complete (three matching readings 24h apart).
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {b.readings.map((r, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2 rounded-lg bg-muted/30 p-2">
                <input
                  type="date"
                  value={r.date}
                  onChange={(e) => {
                    const next = [...b.readings];
                    next[i] = { ...r, date: e.target.value };
                    update("readings", next);
                  }}
                  className="input col-span-4 py-1.5"
                />
                <input
                  type="number"
                  step="0.001"
                  value={r.sg}
                  onChange={(e) => {
                    const next = [...b.readings];
                    next[i] = { ...r, sg: parseFloat(e.target.value) || 0 };
                    update("readings", next);
                  }}
                  className="input col-span-3 py-1.5"
                />
                <input
                  placeholder="Note"
                  value={r.note ?? ""}
                  onChange={(e) => {
                    const next = [...b.readings];
                    next[i] = { ...r, note: e.target.value };
                    update("readings", next);
                  }}
                  className="input col-span-4 py-1.5"
                />
                <button
                  onClick={() => update("readings", b.readings.filter((_, j) => j !== i))}
                  className="col-span-1 text-muted-foreground hover:text-destructive"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cuts */}
      <div className="surface-card rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Cuts (mL collected)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Foreshots go down the drain. Heads to redistill. Hearts to keep. Tails to save for the next spirit run.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["foreshots", "heads", "hearts", "tails"] as const).map((k) => (
            <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>
              <input
                type="number"
                value={b.cuts?.[k] ?? ""}
                onChange={(e) =>
                  update("cuts", { ...(b.cuts ?? {}), [k]: e.target.value ? parseFloat(e.target.value) : undefined })
                }
                className="input"
                placeholder="0"
              />
            </Field>
          ))}
        </div>
        <Field label="Cut notes" className="mt-4">
          <textarea
            rows={2}
            value={b.cuts?.notes ?? ""}
            onChange={(e) => update("cuts", { ...(b.cuts ?? {}), notes: e.target.value })}
            className="input"
            placeholder="Where you made each cut, ABV at collection jars, smells/tastes…"
          />
        </Field>
      </div>

      <div className="surface-card rounded-2xl p-5 sm:p-6">
        <Field label="Batch notes">
          <textarea
            rows={5}
            value={b.notes}
            onChange={(e) => update("notes", e.target.value)}
            className="input"
            placeholder="Mash schedule, aging vessel, tasting notes…"
          />
        </Field>
      </div>
    </section>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
      <style>{`
        .input { width: 100%; background: var(--input); border: 1px solid var(--border); color: var(--foreground);
          border-radius: 0.5rem; padding: 0.55rem 0.75rem; font-size: 0.875rem; font-family: var(--font-mono); }
        .input:focus { outline: none; border-color: var(--ring); box-shadow: 0 0 0 3px oklch(0.72 0.15 55 / 0.2); }
      `}</style>
    </label>
  );
}

/* ---------------- Recipes ---------------- */

const emptyRecipe = (): Recipe => ({
  id: crypto.randomUUID(),
  name: "",
  category: "Neutral",
  description: "",
  targetOG: 1.06,
  targetFG: 1.0,
  ingredients: [{ name: "", amount: "" }],
  yeast: "",
  fermentTemp: "",
  fermentDays: "",
  notes: "",
  isCustom: true,
});

function RecipesView() {
  const [customRecipes, setCustomRecipes] = useLocalStorage<Recipe[]>("sc-custom-recipes", []);
  type RecipeFilter = SpiritCategory | "All" | "My Recipes";
  const [filter, setFilter] = useState<RecipeFilter>("All");
  const [mySub, setMySub] = useState<SpiritCategory | "All">("All");
  const categories: RecipeFilter[] = ["All", "My Recipes", "Neutral", "Whiskey", "Bourbon", "Rum", "Brandy", "Gin", "Agave"];
  const allRecipes = useMemo(() => [...RECIPES, ...customRecipes], [customRecipes]);

  // Only categories the user actually has recipes in (plus always show "All")
  const mySubCategories = useMemo(() => {
    const set = new Set<SpiritCategory>();
    customRecipes.forEach((r) => set.add(r.category));
    const order: SpiritCategory[] = ["Neutral", "Whiskey", "Bourbon", "Rum", "Brandy", "Gin", "Agave", "Custom"];
    return order.filter((c) => set.has(c));
  }, [customRecipes]);

  const filtered = useMemo(() => {
    if (filter === "All") return allRecipes;
    if (filter === "My Recipes") {
      const mine = allRecipes.filter((r) => r.isCustom);
      return mySub === "All" ? mine : mine.filter((r) => r.category === mySub);
    }
    return allRecipes.filter((r) => r.category === filter);
  }, [filter, mySub, allRecipes]);

  const [open, setOpen] = useState<Recipe | null>(null);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [creating, setCreating] = useState(false);

  const saveCustom = (recipe: Recipe) => {
    setCustomRecipes((prev) => {
      const exists = prev.some((p) => p.id === recipe.id);
      return exists ? prev.map((p) => (p.id === recipe.id ? recipe : p)) : [recipe, ...prev];
    });
  };

  const removeCustom = (id: string) => {
    setCustomRecipes((prev) => prev.filter((p) => p.id !== id));
  };

  if (creating || editing) {
    return (
      <RecipeEditor
        initial={creating ? emptyRecipe() : editing!}
        onSave={(r) => {
          saveCustom(r);
          setCreating(false);
          setEditing(null);
          setFilter("My Recipes");
        }}
        onCancel={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    );
  }

  if (open) {
    return (
      <RecipeDetail
        recipe={open}
        onBack={() => setOpen(null)}
        onEdit={open.isCustom ? () => setEditing(open) : undefined}
        onDelete={open.isCustom ? () => { removeCustom(open.id); setOpen(null); } : undefined}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Recipe Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Starter recipes plus your own. Tag each with a spirit category and rename anytime.
          </p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-copper rounded-lg px-4 py-2 text-sm font-semibold">
          + New recipe
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => { setFilter(c); if (c !== "My Recipes") setMySub("All"); }}
            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-widest transition ${
              filter === c
                ? "border-transparent btn-copper"
                : "border-border/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {filter === "My Recipes" && (
        <div className="surface-card rounded-2xl p-4">
          <div className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            My Recipes — by spirit
          </div>
          {mySubCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No custom recipes yet. Tap <span className="text-copper font-semibold">+ New recipe</span> to create one.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setMySub("All")}
                className={`rounded-full border px-3 py-1 text-xs uppercase tracking-widest transition ${
                  mySub === "All"
                    ? "border-transparent btn-copper"
                    : "border-border/70 text-muted-foreground hover:text-foreground"
                }`}
              >
                All Mine ({customRecipes.length})
              </button>
              {mySubCategories.map((c) => {
                const count = customRecipes.filter((r) => r.category === c).length;
                return (
                  <button
                    key={c}
                    onClick={() => setMySub(c)}
                    className={`rounded-full border px-3 py-1 text-xs uppercase tracking-widest transition ${
                      mySub === c
                        ? "border-transparent btn-copper"
                        : "border-border/70 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => (
          <button
            key={r.id}
            onClick={() => setOpen(r)}
            className="surface-card rounded-2xl p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-warm)]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-widest text-accent">{r.category}</span>
              {r.isCustom && (
                <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Yours
                </span>
              )}
            </div>
            <h3 className="mt-2 font-display text-lg font-semibold">{r.name}</h3>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
            <div className="mt-4 flex gap-4 font-mono text-xs text-muted-foreground">
              <span>OG {r.targetOG.toFixed(3)}</span>
              <span>FG {r.targetFG.toFixed(3)}</span>
              <span>{potentialAbv(r.targetOG).toFixed(1)}% pot.</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}


function RecipeDetail({
  recipe,
  onBack,
  onEdit,
  onDelete,
}: {
  recipe: Recipe;
  onBack: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
          ← All recipes
        </button>
        {recipe.isCustom && (
          <div className="flex gap-2">
            {onEdit && (
              <button onClick={onEdit} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => {
                  onDelete();
                  onBack();
                }}
                className="rounded-lg border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
      <div className="surface-card overflow-hidden rounded-2xl">
        <div className="p-6 sm:p-8" style={{ background: "var(--gradient-copper)" }}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs uppercase tracking-[0.25em] text-primary-foreground/80">{recipe.category}</div>
            {recipe.isCustom && (
              <span className="rounded-full border border-primary-foreground/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary-foreground/80">
                Custom
              </span>
            )}
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold text-primary-foreground">{recipe.name}</h1>
          <p className="mt-3 max-w-2xl text-sm text-primary-foreground/90">{recipe.description}</p>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Ingredients</h3>
            <ul className="mt-3 divide-y divide-border/60">
              {recipe.ingredients.map((i, idx) => (
                <li key={`${i.name}-${idx}`} className="flex justify-between py-2 text-sm">
                  <span>{i.name}</span>
                  <span className="font-mono text-muted-foreground">{i.amount}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Fermentation</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <Metric label="Target OG" value={recipe.targetOG.toFixed(3)} />
                <Metric label="Target FG" value={recipe.targetFG.toFixed(3)} />
                <Metric label="Yeast" value={recipe.yeast} />
                <Metric label="Temp" value={recipe.fermentTemp} />
                <Metric label="Time" value={recipe.fermentDays} />
                <Metric label="Potential ABV" value={`${potentialAbv(recipe.targetOG).toFixed(1)}%`} />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Notes</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">{recipe.notes}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RecipeEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: Recipe;
  onSave: (r: Recipe) => void;
  onCancel: () => void;
}) {
  const [r, setR] = useState<Recipe>(initial);
  const update = <K extends keyof Recipe>(key: K, value: Recipe[K]) => setR((prev) => ({ ...prev, [key]: value }));

  const categories: SpiritCategory[] = ["Neutral", "Whiskey", "Bourbon", "Rum", "Brandy", "Gin", "Agave"];

  const updateIngredient = (idx: number, field: "name" | "amount", value: string) => {
    const next = r.ingredients.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing));
    update("ingredients", next);
  };

  const addIngredient = () => update("ingredients", [...r.ingredients, { name: "", amount: "" }]);
  const removeIngredient = (idx: number) => update("ingredients", r.ingredients.filter((_, i) => i !== idx));

  const isValid = r.name.trim().length > 0;

  const handleSave = () => {
    if (!isValid) return;
    const cleaned: Recipe = {
      ...r,
      name: r.name.trim(),
      ingredients: r.ingredients.filter((i) => i.name.trim() || i.amount.trim()),
    };
    onSave(cleaned);
  };


  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">{initial.id && initial.name ? "Edit recipe" : "New custom recipe"}</h1>
        <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>

      <div className="surface-card rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Recipe name">
            <input
              value={r.name}
              onChange={(e) => update("name", e.target.value)}
              className="input"
              placeholder="e.g. Ego's Honey Turbo"
            />
          </Field>
          <Field label="Category">
            <select value={r.category} onChange={(e) => update("category", e.target.value as SpiritCategory)} className="input">
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Description">
          <textarea
            rows={2}
            value={r.description}
            onChange={(e) => update("description", e.target.value)}
            className="input"
            placeholder="Short overview of the wash and style"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Target OG">
            <input
              type="number"
              step="0.001"
              value={r.targetOG}
              onChange={(e) => update("targetOG", parseFloat(e.target.value) || 0)}
              className="input"
            />
          </Field>
          <Field label="Target FG">
            <input
              type="number"
              step="0.001"
              value={r.targetFG}
              onChange={(e) => update("targetFG", parseFloat(e.target.value) || 0)}
              className="input"
            />
          </Field>
          <Field label="Ferment temp">
            <input
              value={r.fermentTemp}
              onChange={(e) => update("fermentTemp", e.target.value)}
              className="input"
              placeholder="e.g. 24–28 °C"
            />
          </Field>
          <Field label="Ferment time">
            <input
              value={r.fermentDays}
              onChange={(e) => update("fermentDays", e.target.value)}
              className="input"
              placeholder="e.g. 5–7 days"
            />
          </Field>
        </div>

        <Field label="Yeast">
          <input
            value={r.yeast}
            onChange={(e) => update("yeast", e.target.value)}
            className="input"
            placeholder="e.g. DADY turbo yeast"
          />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Ingredients</span>
            <button onClick={addIngredient} className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-muted">
              + Add
            </button>
          </div>
          <div className="space-y-2">
            {r.ingredients.map((ing, idx) => (
              <div key={idx} className="grid grid-cols-12 items-center gap-2">
                <input
                  value={ing.name}
                  onChange={(e) => updateIngredient(idx, "name", e.target.value)}
                  className="input col-span-6"
                  placeholder="Ingredient"
                />
                <input
                  value={ing.amount}
                  onChange={(e) => updateIngredient(idx, "amount", e.target.value)}
                  className="input col-span-5"
                  placeholder="Amount"
                />
                <button
                  onClick={() => removeIngredient(idx)}
                  className="col-span-1 text-muted-foreground hover:text-destructive"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <Field label="Notes">
          <textarea
            rows={4}
            value={r.notes}
            onChange={(e) => update("notes", e.target.value)}
            className="input"
            placeholder="Process tips, cuts, aging advice…"
          />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="btn-copper rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Save recipe
          </button>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-sm">{value}</div>
    </div>
  );
}

/* ---------------- Calculators ---------------- */

function CalculatorsView() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Calculators</h1>
        <p className="mt-1 text-sm text-muted-foreground">Quick tools for the still shed.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <AbvCalc />
        <DilutionCalc />
        <TempCorrectCalc />
        <CutsCalc />
      </div>
    </section>
  );
}

function CalcCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="surface-card space-y-4 rounded-2xl p-5 sm:p-6">
      <div>
        <h3 className="font-display text-xl font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg p-4" style={{ background: "var(--gradient-copper)" }}>
      <div className="text-[10px] uppercase tracking-widest text-primary-foreground/80">{label}</div>
      <div className="font-mono text-2xl font-semibold text-primary-foreground">{value}</div>
    </div>
  );
}

function AbvCalc() {
  const [og, setOg] = useState(1.06);
  const [fg, setFg] = useState(1.0);
  const abv = abvFromOgFg(og, fg);
  return (
    <CalcCard title="ABV from Gravity" subtitle="Wash strength from OG and FG readings">
      <div className="grid grid-cols-2 gap-3">
        <Field label="OG">
          <input type="number" step="0.001" value={og} onChange={(e) => setOg(+e.target.value || 0)} className="input" />
        </Field>
        <Field label="FG">
          <input type="number" step="0.001" value={fg} onChange={(e) => setFg(+e.target.value || 0)} className="input" />
        </Field>
      </div>
      <Result label="Alcohol by volume" value={`${abv.toFixed(2)}%`} />
    </CalcCard>
  );
}

function DilutionCalc() {
  const [abv, setAbv] = useState(75);
  const [vol, setVol] = useState(1000);
  const [target, setTarget] = useState(40);
  const water = waterToDilute(abv, vol, target);
  return (
    <CalcCard title="Proofing / Dilution" subtitle="Water to add to bring distillate to bottling strength">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Current %">
          <input type="number" value={abv} onChange={(e) => setAbv(+e.target.value || 0)} className="input" />
        </Field>
        <Field label="Volume (mL)">
          <input type="number" value={vol} onChange={(e) => setVol(+e.target.value || 0)} className="input" />
        </Field>
        <Field label="Target %">
          <input type="number" value={target} onChange={(e) => setTarget(+e.target.value || 0)} className="input" />
        </Field>
      </div>
      <Result label="Water to add" value={`${water.toFixed(0)} mL`} />
      <p className="text-xs text-muted-foreground">
        Add slowly. Rest 24h before final bottling to let the spirit re-integrate.
      </p>
    </CalcCard>
  );
}

function TempCorrectCalc() {
  const [sg, setSg] = useState(1.05);
  const [temp, setTemp] = useState(25);
  const corrected = correctSG(sg, temp);
  return (
    <CalcCard title="Hydrometer Temp Correction" subtitle="Adjust SG reading for wash temperature (calibrated 20 °C)">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Read SG">
          <input type="number" step="0.001" value={sg} onChange={(e) => setSg(+e.target.value || 0)} className="input" />
        </Field>
        <Field label="Temp (°C)">
          <input type="number" value={temp} onChange={(e) => setTemp(+e.target.value || 0)} className="input" />
        </Field>
      </div>
      <Result label="Corrected SG" value={corrected.toFixed(4)} />
    </CalcCard>
  );
}

function CutsCalc() {
  const [vol, setVol] = useState(25);
  const [abv, setAbv] = useState(8);
  const [collectAbv, setCollectAbv] = useState(70);
  const cuts = suggestCuts(vol, abv);
  const distillate = estimateDistillate(vol, abv, collectAbv);
  return (
    <CalcCard title="Spirit Run Estimator" subtitle="Rough distillate and cut sizes from a wash">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Wash L">
          <input type="number" value={vol} onChange={(e) => setVol(+e.target.value || 0)} className="input" />
        </Field>
        <Field label="Wash %">
          <input type="number" value={abv} onChange={(e) => setAbv(+e.target.value || 0)} className="input" />
        </Field>
        <Field label="Collect %">
          <input type="number" value={collectAbv} onChange={(e) => setCollectAbv(+e.target.value || 0)} className="input" />
        </Field>
      </div>
      <Result label="Estimated distillate" value={`${distillate.toFixed(2)} L @ ${collectAbv}%`} />
      <div className="grid grid-cols-4 gap-2 text-center">
        {(["foreshots", "heads", "hearts", "tails"] as const).map((k) => (
          <div key={k} className="rounded-lg bg-muted/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
            <div className="mt-1 font-mono text-sm">{cuts[k]} mL</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Guideline only — always cut by nose and taste, jar by jar.
      </p>
    </CalcCard>
  );
}

/* ---------------- Inventory ---------------- */

interface InventoryItem {
  id: string;
  name: string;
  category: "Grain" | "Ingredients" | "Yeast" | "Additives" | "Equipment" | "Bottles" | "Other";
  amount: string;
  lowStock: string;
  ordered: boolean;
  notes: string;
}

const emptyItem = (): InventoryItem => ({
  id: crypto.randomUUID(),
  name: "",
  category: "Grain",
  amount: "",
  lowStock: "",
  ordered: false,
  notes: "",
});

function parseAmount(value: string): number {
  const match = value.trim().match(/^-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : NaN;
}

function isLowStock(item: InventoryItem): boolean {
  const current = parseAmount(item.amount);
  const threshold = parseAmount(item.lowStock);
  return !isNaN(current) && !isNaN(threshold) && current <= threshold;
}

function InventoryView() {
  const [items, setItems] = useLocalStorage<InventoryItem[]>("sc-inventory", []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const editing = items.find((i) => i.id === editingId);

  const upsert = (item: InventoryItem) => {
    setItems((prev) => {
      const exists = prev.some((p) => p.id === item.id);
      return exists ? prev.map((p) => (p.id === item.id ? item : p)) : [item, ...prev];
    });
  };

  const remove = (id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const toggleOrdered = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ordered: !p.ordered } : p)));
  };

  const lowStockItems = items.filter(isLowStock);

  if (creating || editing) {
    return (
      <InventoryEditor
        initial={editing ?? emptyItem()}
        onSave={(item) => {
          upsert(item);
          setCreating(false);
          setEditingId(null);
        }}
        onCancel={() => {
          setCreating(false);
          setEditingId(null);
        }}
        onDelete={editing ? () => remove(editing.id) : undefined}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track grains, ingredients, yeast, additives, bottles, and shed supplies.
          </p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-copper rounded-lg px-4 py-2 text-sm font-semibold">
          + Add item
        </button>
      </div>

      {lowStockItems.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
          <span className="text-lg">⚠</span>
          <div>
            <span className="font-semibold text-destructive">{lowStockItems.length} item{lowStockItems.length === 1 ? "" : "s"} low on stock</span>
            <span className="text-muted-foreground"> — {lowStockItems.map((i) => i.name || "Untitled").join(", ")}</span>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="surface-card rounded-2xl p-10 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full btn-copper text-2xl">📦</div>
          <h2 className="text-2xl font-semibold">No inventory yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Log your grains, ingredients, yeast, nutrients, bottles, and anything else you need for the next run.
          </p>
          <button onClick={() => setCreating(true)} className="btn-copper mt-6 rounded-lg px-5 py-2 text-sm font-semibold">
            Add first item
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setEditingId(item.id)}
              className="surface-card group relative rounded-2xl p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-warm)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{item.category}</div>
                  <div className="mt-1 font-display text-xl font-semibold">{item.name || "Untitled item"}</div>
                </div>
                <div className="flex items-center gap-2">
                  {isLowStock(item) && (
                    <span className="rounded-md bg-destructive/15 px-2 py-1 text-xs font-semibold text-destructive">
                      Low stock
                    </span>
                  )}
                  <span
                    onClick={(e) => toggleOrdered(e, item.id)}
                    role="checkbox"
                    aria-checked={item.ordered}
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 text-sm transition ${
                      item.ordered
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-muted-foreground/40 text-transparent hover:border-emerald-400/70"
                    }`}
                    title={item.ordered ? "Ordered" : "Mark as ordered"}
                  >
                    ✓
                  </span>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-muted/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Stock</div>
                <div className="font-mono text-sm">{item.amount || "—"}</div>
              </div>
              {item.notes && <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{item.notes}</p>}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function InventoryEditor({
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: InventoryItem;
  onSave: (item: InventoryItem) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [item, setItem] = useState<InventoryItem>(initial);
  const update = <K extends keyof InventoryItem>(k: K, v: InventoryItem[K]) => setItem((prev) => ({ ...prev, [k]: v }));

  const categories: InventoryItem["category"][] = ["Grain", "Ingredients", "Yeast", "Additives", "Equipment", "Bottles", "Other"];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </button>
        <div className="flex gap-2">
          {onDelete && (
            <button
              onClick={() => {
                if (confirm("Delete this item?")) onDelete();
              }}
              className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
            >
              Delete
            </button>
          )}
          <button onClick={() => onSave(item)} className="btn-copper rounded-lg px-4 py-2 text-sm font-semibold">
            Save item
          </button>
        </div>
      </div>

      <div className="surface-card space-y-5 rounded-2xl p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Item name">
            <input
              value={item.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Flaked maize"
              className="input"
            />
          </Field>
          <Field label="Category">
            <select value={item.category} onChange={(e) => update("category", e.target.value as InventoryItem["category"])} className="input">
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Current stock">
            <input
              value={item.amount}
              onChange={(e) => update("amount", e.target.value)}
              placeholder="e.g. 25 kg"
              className="input"
            />
          </Field>
          <Field label="Low-stock threshold">
            <input
              type="number"
              value={item.lowStock}
              onChange={(e) => update("lowStock", e.target.value)}
              placeholder="e.g. 5"
              className="input"
            />
          </Field>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <span
              role="checkbox"
              aria-checked={item.ordered}
              onClick={() => update("ordered", !item.ordered)}
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 text-sm transition ${
                item.ordered
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-muted-foreground/40 text-transparent hover:border-emerald-400/70"
              }`}
            >
              ✓
            </span>
            <span className="text-sm font-medium">Ordered</span>
          </label>
        </div>
        <Field label="Notes">
          <textarea
            rows={4}
            value={item.notes}
            onChange={(e) => update("notes", e.target.value)}
            className="input"
            placeholder="Supplier, batch, storage location, reorder link…"
          />
        </Field>
      </div>
    </section>
  );
}
