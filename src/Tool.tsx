// Leftoverture: plans the week's cooking around whatever in your fridge expires first.
import { useMemo, useState } from "react";
import { uid, useCopy, useStored } from "./lib/store";
import { addDays, prettyDate, todayISO } from "./lib/time";
import { Section, Stat, Stats } from "./ui/kit";

const T = "leftoverture";
type Item = { id: string; name: string; expires: string; qty: string };
type Recipe = { name: string; needs: string[]; pantry: string[]; mins: number; how: string };
const PANTRY = ["salt", "pepper", "olive oil", "garlic", "onion", "flour", "rice", "pasta", "harissa", "tomato paste", "spices", "sugar", "vinegar", "couscous", "lentils", "chickpeas", "bread"];
const RECIPES: Recipe[] = [
  { name: "Shakshuka", needs: ["eggs", "tomato", "pepper"], pantry: ["onion", "garlic", "harissa"], mins: 25, how: "Soften onion and peppers, add chopped tomatoes and harissa, simmer 10 minutes, crack in the eggs and cover until set." },
  { name: "Ojja with merguez", needs: ["merguez", "eggs", "tomato"], pantry: ["garlic", "harissa"], mins: 25, how: "Brown the merguez, add tomato and harissa, simmer, then stir in the eggs." },
  { name: "Vegetable couscous", needs: ["carrot", "courgette", "pumpkin"], pantry: ["couscous", "chickpeas", "tomato paste", "spices"], mins: 60, how: "Simmer the vegetables and chickpeas in a spiced tomato broth, steam the couscous over it or on the side." },
  { name: "Chicken and potato traybake", needs: ["chicken", "potato"], pantry: ["olive oil", "garlic", "spices"], mins: 50, how: "Toss everything in oil and spices, roast at 200°C for about 45 minutes." },
  { name: "Lentil soup", needs: ["carrot"], pantry: ["lentils", "onion", "garlic", "spices"], mins: 35, how: "Fry onion and carrot, add lentils and water, simmer 25 minutes, blend half." },
  { name: "Spinach and feta omelette", needs: ["eggs", "spinach", "feta"], pantry: ["olive oil"], mins: 10, how: "Wilt the spinach, pour over beaten eggs, crumble feta on top, fold." },
  { name: "Pasta with courgette and lemon", needs: ["courgette", "lemon"], pantry: ["pasta", "garlic", "olive oil"], mins: 20, how: "Grate the courgette into garlic oil, toss with pasta, lemon zest and juice." },
  { name: "Fried rice", needs: ["rice (cooked)", "eggs", "peas"], pantry: ["onion", "garlic"], mins: 15, how: "Fry onion, add cold rice and peas, push aside, scramble the eggs in, mix." },
  { name: "Tuna salad", needs: ["tuna", "tomato", "cucumber"], pantry: ["olive oil", "vinegar", "onion"], mins: 10, how: "Chop everything, dress with oil and vinegar." },
  { name: "Mechouia salad", needs: ["pepper", "tomato"], pantry: ["garlic", "olive oil", "spices"], mins: 30, how: "Grill peppers and tomatoes until charred, peel, chop with garlic, dress with oil." },
  { name: "Banana pancakes", needs: ["banana", "eggs", "milk"], pantry: ["flour"], mins: 15, how: "Mash the banana, whisk with eggs, milk and flour, fry small pancakes." },
  { name: "Yoghurt chicken skewers", needs: ["chicken", "yoghurt", "lemon"], pantry: ["garlic", "spices"], mins: 30, how: "Marinate chicken in yoghurt, lemon and spices, thread and grill." },
  { name: "Minced meat pasta bake", needs: ["minced meat", "cheese"], pantry: ["pasta", "tomato paste", "onion"], mins: 45, how: "Brown the meat with onion and tomato paste, mix with pasta, top with cheese and bake." },
  { name: "Leftover veg frittata", needs: ["eggs", "potato", "spinach"], pantry: ["onion", "olive oil"], mins: 25, how: "Fry sliced potato and onion, add greens, pour eggs over, finish under the grill." },
  { name: "Fruit smoothie", needs: ["banana", "yoghurt", "strawberries"], pantry: ["sugar"], mins: 5, how: "Blend it all with a little water or milk." },
  { name: "Bread pudding", needs: ["bread (stale)", "milk", "eggs"], pantry: ["sugar"], mins: 45, how: "Soak bread in milk, eggs and sugar, bake at 180°C for 35 minutes." },
  { name: "Chickpea stew", needs: ["tomato", "spinach"], pantry: ["chickpeas", "onion", "garlic", "spices"], mins: 30, how: "Fry onion and spices, add tomatoes and chickpeas, simmer, stir in spinach at the end." },
  { name: "Cheese and tomato toasties", needs: ["cheese", "tomato"], pantry: ["bread"], mins: 10, how: "Fill bread with cheese and tomato, toast in a pan until golden." },
];
const today = todayISO();
const SAMPLE: Item[] = [["eggs", 5, "6"], ["tomato", 2, "4"], ["pepper", 3, "2"], ["spinach", 1, "1 bag"], ["chicken", 2, "500 g"], ["yoghurt", 4, "2 pots"], ["courgette", 6, "3"], ["banana", 1, "3"], ["cheese", 10, "200 g"], ["lemon", 12, "2"], ["milk", 3, "1 L"], ["potato", 14, "1 kg"]].map(([n, d, q]) => ({ id: uid(), name: n as string, expires: addDays(today, d as number), qty: q as string }));
const daysLeft = (d: string) => Math.round((new Date(d).getTime() - new Date(today).getTime()) / 86400000);
const has = (items: Item[], need: string) => items.some(i => i.name.toLowerCase().includes(need.split(" (")[0]) || need.split(" (")[0].includes(i.name.toLowerCase()));

export default function Leftoverture() {
  const [items, setItems] = useStored<Item[]>(T, "items", SAMPLE);
  const [pantryHave, setPantryHave] = useStored<string[]>(T, "pantry", PANTRY);
  const [plan, setPlan] = useStored<Record<string, string>>(T, "plan", {});
  const [d, setD] = useState({ name: "", days: "3", qty: "" });
  const { copy, copied } = useCopy();

  const ranked = useMemo(() => RECIPES.map(r => {
    const got = r.needs.filter(n => has(items, n)), missing = r.needs.filter(n => !has(items, n)), pantryMissing = r.pantry.filter(p => !pantryHave.includes(p));
    const rescue = got.reduce((a, n) => { const it = items.find(i => has([i], n)); const dl = it ? daysLeft(it.expires) : 99; return a + (dl <= 1 ? 5 : dl <= 3 ? 3 : dl <= 6 ? 1 : 0); }, 0);
    return { r, got, missing, pantryMissing, score: rescue * 2 + got.length * 2 - missing.length * 3 - pantryMissing.length };
  }).filter(x => x.got.length > 0).sort((a, b) => b.score - a.score), [items, pantryHave]);
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const autoPlan = () => { const p: Record<string, string> = {}; const used = new Set<string>(); week.forEach(day => { const pick = ranked.find(x => !used.has(x.r.name)); if (pick) { p[day] = pick.r.name; used.add(pick.r.name); } }); setPlan(p); };
  const shopping = [...new Set(week.flatMap(day => { const x = ranked.find(y => y.r.name === plan[day]) ?? (plan[day] ? { missing: RECIPES.find(r => r.name === plan[day])?.needs.filter(n => !has(items, n)) ?? [], pantryMissing: [] } : null); return x ? [...x.missing, ...x.pantryMissing] : []; }))];
  const expiring = [...items].sort((a, b) => a.expires.localeCompare(b.expires));

  return (
    <div className="stack">
      <Section title="What needs using">
        <Stats><Stat value={items.length} label="Things in the fridge" /><Stat value={items.filter(i => daysLeft(i.expires) <= 2).length} label="Use in 2 days" tone="bad" /><Stat value={ranked.filter(x => !x.missing.length).length} label="Recipes you can cook now" tone="good" /></Stats>
        <div className="lo-items">{expiring.map(i => { const dl = daysLeft(i.expires); return (
          <div key={i.id} className="lo-item" style={{ borderColor: dl <= 1 ? "var(--bad)" : dl <= 3 ? "var(--warn)" : "var(--line)" }}>
            <strong>{i.name}</strong><span className="note">{i.qty}</span><span className={"pill " + (dl < 0 ? "bad" : dl <= 1 ? "bad" : dl <= 3 ? "warn" : "")}>{dl < 0 ? "expired" : dl === 0 ? "today" : dl === 1 ? "tomorrow" : `${dl} days`}</span>
            <button className="btn ghost small" aria-label={`Used up ${i.name}`} onClick={() => setItems(items.filter(x => x.id !== i.id))}>Used</button>
          </div>); })}</div>
        <form className="row" style={{ marginTop: 14, alignItems: "flex-end" }} onSubmit={e => { e.preventDefault(); if (!d.name.trim()) return; setItems([...items, { id: uid(), name: d.name.trim().toLowerCase(), expires: addDays(today, parseInt(d.days) || 3), qty: d.qty }]); setD({ name: "", days: "3", qty: "" }); }}>
          <label className="field"><span>Add food</span><input id="lo-n" className="input" value={d.name} onChange={e => setD({ ...d, name: e.target.value })} placeholder="minced meat" /></label>
          <label className="field" style={{ flex: "0 0 110px" }}><span>Good for (days)</span><input id="lo-d" className="input num" value={d.days} onChange={e => setD({ ...d, days: e.target.value })} /></label>
          <label className="field" style={{ flex: "0 0 110px" }}><span>Amount</span><input id="lo-q" className="input" value={d.qty} onChange={e => setD({ ...d, qty: e.target.value })} /></label>
          <button className="btn primary" type="submit">Add</button>
        </form>
      </Section>

      <Section title="Cook these first" aside={<button className="btn small primary" onClick={autoPlan}>Plan my week</button>}>
        <div className="lo-recipes">{ranked.slice(0, 9).map(x => (
          <article key={x.r.name} className="lo-rec">
            <div className="row" style={{ justifyContent: "space-between" }}><strong>{x.r.name}</strong><span className="note">{x.r.mins} min</span></div>
            <p className="note">Uses: {x.got.join(", ")}</p>
            {x.missing.length > 0 && <p className="note" style={{ color: "var(--warn)" }}>Missing: {x.missing.join(", ")}</p>}
            {x.pantryMissing.length > 0 && <p className="note">Also need: {x.pantryMissing.join(", ")}</p>}
            <p style={{ fontSize: 14 }}>{x.r.how}</p>
          </article>
        ))}</div>
      </Section>

      <div className="grid2">
        <Section title="This week">
          {week.map(day => (
            <div key={day} className="row" style={{ alignItems: "center", padding: "4px 0" }}>
              <span style={{ width: 110 }}>{prettyDate(day)}</span>
              <select className="input" style={{ flex: 1 }} aria-label={`Dinner on ${day}`} value={plan[day] ?? ""} onChange={e => setPlan({ ...plan, [day]: e.target.value })}><option value="">Not planned</option>{RECIPES.map(r => <option key={r.name}>{r.name}</option>)}</select>
            </div>
          ))}
        </Section>
        <Section title="Shopping list" aside={<button className="btn small" disabled={!shopping.length} onClick={() => copy(shopping.map(s => `- ${s}`).join("\n"))}>{copied ? "Copied" : "Copy"}</button>}>
          {shopping.length === 0 ? <p className="empty-note">Nothing to buy for the planned meals.</p> : <ul style={{ margin: 0, paddingLeft: 18 }}>{shopping.map(s => <li key={s}>{s}</li>)}</ul>}
          <details style={{ marginTop: 14 }}><summary className="note" style={{ cursor: "pointer" }}>Cupboard staples you have</summary>
            <div className="row" style={{ gap: 6, marginTop: 8 }}>{PANTRY.map(p => <label key={p} className="check note"><input type="checkbox" checked={pantryHave.includes(p)} onChange={e => setPantryHave(e.target.checked ? [...pantryHave, p] : pantryHave.filter(x => x !== p))} />{p}</label>)}</div>
          </details>
        </Section>
      </div>
      <style>{`.lo-items{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-top:16px}.lo-item{display:grid;grid-template-columns:1fr auto;gap:2px 8px;align-items:center;border:2px solid;border-radius:10px;padding:8px 10px}.lo-item .pill{justify-self:start}
      .lo-recipes{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}.lo-rec{border:1px solid var(--line);border-radius:10px;padding:12px;display:grid;gap:6px;align-content:start}`}</style>
    </div>
  );
}
