import { getStore } from "@netlify/blobs";
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "node:crypto";

const CARS = ["golf", "corolla", "honda", "camry", "hilux", "lexus", "benz"];
const j = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const SEC = () => process.env.AUTH_SECRET || "";
const sign = (u) => { const p = Buffer.from(JSON.stringify({ u, e: Date.now() + 7 * 864e5 })).toString("base64url"); return p + "." + createHmac("sha256", SEC()).update(p).digest("base64url"); };
const verify = (t) => { try { const [p, g] = String(t).split("."); const h = createHmac("sha256", SEC()).update(p).digest("base64url"); if (!g || g.length !== h.length || !timingSafeEqual(Buffer.from(g), Buffer.from(h))) return null; const o = JSON.parse(Buffer.from(p, "base64url")); return o.e > Date.now() ? o.u : null; } catch { return null; } };
const n = (x) => Math.max(0, Math.floor(+x) || 0);

// Sanitise a profile sent by the browser and cap how fast it can grow.
function clean(p, prev) {
  p = p || {};
  const o = { name: String(p.name || "").replace(/[<>&"]/g, "").slice(0, 16), cash: n(p.cash), xp: n(p.xp), car: CARS.includes(p.car) ? p.car : "golf", own: [...new Set((Array.isArray(p.own) ? p.own : []).filter((c) => CARS.includes(c)))], up: {}, paint: {}, done: {}, rec: n(p.rec), jx: Math.min(60, n(p.jx)), mute: !!p.mute, q: p.q ? 1 : 0 };
  if (!o.own.includes("golf")) o.own.push("golf");
  if (!o.own.includes(o.car)) o.car = "golf";
  for (const c of o.own) {
    const u = (p.up || {})[c] || {};
    o.up[c] = { e: Math.min(3, n(u.e)), t: Math.min(3, n(u.t)), n: Math.min(3, n(u.n)) };
    if (p.paint && Number.isInteger(p.paint[c])) o.paint[c] = p.paint[c] & 0xffffff;
  }
  for (const [k, d] of Object.entries(p.done || {})) { const id = n(k); if (id >= 1 && id <= 14 && d) o.done[id] = { s: Math.min(3, Math.max(1, n(d.s))), t: Math.min(9e5, +d.t || 9e5) }; }
  if (prev) { o.xp = Math.min(o.xp, prev.xp + 1500); o.cash = Math.min(o.cash, prev.cash + 130000); }
  return o;
}
const DEFAULT = (name) => ({ name, cash: 3000, xp: 0, car: "golf", own: ["golf"], up: {}, paint: {}, done: {}, rec: 0, jx: 0, mute: false, q: 0 });

async function updateBoard(lbs, user, p) {
  const top = (await lbs.get("top", { type: "json" })) || [];
  const row = { u: user, xp: p.xp, lvl: 1 + Math.floor(p.xp / 1200), stars: Object.values(p.done).reduce((a, d) => a + d.s, 0), ev: Object.keys(p.done).length, rec: p.rec, car: p.car };
  const next = top.filter((r) => r.u !== user).concat(row).sort((a, b) => b.xp - a.xp).slice(0, 200);
  await lbs.setJSON("top", next);
}

export default async (req) => {
  if (!SEC()) return j({ error: "Server not configured (missing AUTH_SECRET)" }, 500);
  const path = new URL(req.url).pathname.replace(/^\/api\/?/, "");
  const users = getStore({ name: "users", consistency: "strong" });
  const lbs = getStore({ name: "lb", consistency: "strong" });
  try {
    if (path === "leaderboard" && req.method === "GET") return j((await lbs.get("top", { type: "json" })) || []);
    if (path === "register" && req.method === "POST") {
      const b = await req.json(), name = String(b.username || "").trim(), pw = String(b.password || "");
      if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return j({ error: "Username must be 3-16 letters, numbers or _" }, 400);
      if (pw.length < 6 || pw.length > 64) return j({ error: "Password must be 6-64 characters" }, 400);
      const key = "u:" + name.toLowerCase();
      if (await users.get(key)) return j({ error: "That username is taken" }, 409);
      const salt = randomBytes(16);
      let prof = DEFAULT(name);
      if (b.profile && n(b.profile.xp) <= 3000 && n(b.profile.cash) <= 40000) prof = clean(b.profile);
      const rec = { name, salt: salt.toString("hex"), hash: scryptSync(pw, salt, 32).toString("hex"), profile: prof, t: 0, fails: 0, lock: 0 };
      await users.setJSON(key, rec);
      await updateBoard(lbs, name, prof);
      return j({ token: sign(name.toLowerCase()), user: name, profile: prof });
    }
    if (path === "login" && req.method === "POST") {
      const b = await req.json(), key = "u:" + String(b.username || "").trim().toLowerCase();
      const rec = await users.get(key, { type: "json" });
      if (!rec) return j({ error: "Wrong username or password" }, 401);
      if (rec.lock > Date.now()) return j({ error: "Too many tries. Wait 5 minutes." }, 429);
      const h = scryptSync(String(b.password || ""), Buffer.from(rec.salt, "hex"), 32);
      if (!timingSafeEqual(h, Buffer.from(rec.hash, "hex"))) {
        rec.fails = (rec.fails || 0) + 1;
        if (rec.fails >= 8) { rec.lock = Date.now() + 300000; rec.fails = 0; }
        await users.setJSON(key, rec);
        return j({ error: "Wrong username or password" }, 401);
      }
      rec.fails = 0; await users.setJSON(key, rec);
      return j({ token: sign(key.slice(2)), user: rec.name, profile: rec.profile });
    }
    if (path === "profile") {
      const auth = (req.headers.get("authorization") || "").replace(/^Bearer /, ""), who = verify(auth);
      if (!who) return j({ error: "Please log in again" }, 401);
      const key = "u:" + who, rec = await users.get(key, { type: "json" });
      if (!rec) return j({ error: "Account not found" }, 404);
      if (req.method === "GET") return j({ profile: rec.profile, user: rec.name });
      if (req.method === "POST") {
        if (Date.now() - (rec.t || 0) < 4000) return j({ error: "Slow down" }, 429);
        const b = await req.json();
        rec.profile = clean(b.profile, rec.profile); rec.profile.name = rec.profile.name || rec.name; rec.t = Date.now();
        await users.setJSON(key, rec);
        await updateBoard(lbs, rec.name, rec.profile);
        return j({ ok: true });
      }
    }
    return j({ error: "Not found" }, 404);
  } catch (e) {
    return j({ error: "Server error" }, 500);
  }
};

export const config = { path: "/api/*" };
