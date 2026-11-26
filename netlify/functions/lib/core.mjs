import { scryptSync, randomBytes, timingSafeEqual, createHash, randomInt } from "node:crypto";

const MAX_TENTATIVI = 5;
const BLOCCO_MS = 10 * 60 * 1000;
const MAX_INDIZIO = 300;

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const sha = (s) => createHash("sha256").update(s).digest("hex");
const hashPin = (pin, salt) => scryptSync(pin, salt, 32).toString("hex");
const pinValido = (pin) => typeof pin === "string" && /^\d{4}$/.test(pin);

export function createApi({ store, config, adminKey }) {
  const nomi = config.partecipanti.map((n) => n.trim());
  if (new Set(nomi).size !== nomi.length) throw new Error("Ci sono nomi duplicati in config.mjs");
  const firmaNomi = sha(JSON.stringify([...nomi].sort()));
  const esclusioni = (config.esclusioni || []).map(([a, b]) => [a.trim(), b.trim()]);
  const escluso = (a, b) => esclusioni.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const userKey = (nome) => `utente/${sha(nome).slice(0, 24)}`;

  // Un unico grande giro A→B→C→…→A: nessuno pesca se stesso e niente scambi reciproci.
  function estrai() {
    const n = nomi.length;
    for (let t = 0; t < 50000; t++) {
      const s = [...nomi];
      for (let i = n - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [s[i], s[j]] = [s[j], s[i]];
      }
      let ok = true;
      for (let i = 0; i < n && ok; i++) if (escluso(s[i], s[(i + 1) % n])) ok = false;
      if (ok) return Object.fromEntries(s.map((g, i) => [g, s[(i + 1) % n]]));
    }
    throw new Error("Impossibile trovare un abbinamento con queste esclusioni");
  }

  async function getEstrazione() {
    let d = await store.get("estrazione", { type: "json" });
    if (!d) {
      await store.setJSON("estrazione", { firma: firmaNomi, coppie: estrai(), creata: Date.now() }, { onlyIfNew: true });
      d = await store.get("estrazione", { type: "json" });
    }
    if (d.firma !== firmaNomi) {
      const e = new Error("L'elenco dei partecipanti è cambiato dopo l'estrazione: l'organizzatore deve rifare l'estrazione.");
      e.status = 409;
      throw e;
    }
    return d.coppie;
  }

  const getUtente = (nome) => store.get(userKey(nome), { type: "json" });
  const salvaUtente = (nome, u, opts) => store.setJSON(userKey(nome), u, opts);

  async function autentica(nome, pin) {
    if (!nomi.includes(nome)) return { errore: json(404, { errore: "Nome non trovato" }) };
    if (!pinValido(pin)) return { errore: json(400, { errore: "Il PIN deve essere di 4 cifre" }) };
    const u = await getUtente(nome);
    if (!u || !u.pinHash) return { errore: json(404, { errore: "Questo nome non ha ancora un PIN", codice: "nessun_pin" }) };
    if (u.bloccatoFino && u.bloccatoFino > Date.now()) {
      const min = Math.ceil((u.bloccatoFino - Date.now()) / 60000);
      return { errore: json(429, { errore: `Troppi tentativi. Riprova tra ${min} minut${min === 1 ? "o" : "i"}.` }) };
    }
    const ok = timingSafeEqual(Buffer.from(hashPin(pin, u.salt), "hex"), Buffer.from(u.pinHash, "hex"));
    if (!ok) {
      u.errori = (u.errori || 0) + 1;
      let msg = `PIN sbagliato. Tentativi rimasti: ${MAX_TENTATIVI - u.errori}`;
      if (u.errori >= MAX_TENTATIVI) {
        u.errori = 0;
        u.bloccatoFino = Date.now() + BLOCCO_MS;
        msg = "PIN sbagliato troppe volte. Riprova tra 10 minuti.";
      }
      await salvaUtente(nome, u);
      return { errore: json(401, { errore: msg }) };
    }
    if (u.errori || u.bloccatoFino) {
      u.errori = 0;
      u.bloccatoFino = 0;
      await salvaUtente(nome, u);
    }
    return { utente: u };
  }

  async function risposta(nome, u, nuovo) {
    const coppie = await getEstrazione();
    const dest = coppie[nome];
    const ud = await getUtente(dest);
    return json(200, { nuovo, nome, destinatario: dest, indizioDestinatario: ud?.indizio || "", mioIndizio: u.indizio || "" });
  }

  const corpo = async (req) => {
    try { return await req.json(); } catch { return {}; }
  };

  async function handle(req) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api/, "").replace(/\/+$/, "") || "/";
    const m = req.method;

    if (m === "GET" && path === "/stato") {
      const utenti = await Promise.all(nomi.map(getUtente));
      return json(200, {
        titolo: config.titolo,
        ufficio: config.ufficio,
        budgetMin: config.budgetMin,
        budgetMax: config.budgetMax,
        dataScambio: config.dataScambio,
        evento: config.evento || null,
        menu: config.menu || null,
        partecipanti: nomi.map((nome, i) => ({ nome, entrato: !!utenti[i]?.pinHash })),
      });
    }

    if (m === "POST" && path === "/entra") {
      const { nome, pin, nuovo } = await corpo(req);
      if (!nomi.includes(nome)) return json(404, { errore: "Nome non trovato" });
      if (!pinValido(pin)) return json(400, { errore: "Il PIN deve essere di 4 cifre" });
      if (nuovo) {
        await getEstrazione(); // assicura che l'estrazione esista prima di registrarsi
        const esistente = await getUtente(nome);
        if (esistente?.pinHash) return json(409, { errore: "Qualcuno è già entrato con questo nome. Se eri tu, usa il tuo PIN.", codice: "gia_entrato" });
        const salt = randomBytes(16).toString("hex");
        const u = { ...(esistente || {}), salt, pinHash: hashPin(pin, salt), entratoIl: Date.now(), errori: 0, bloccatoFino: 0 };
        const res = await salvaUtente(nome, u, esistente ? undefined : { onlyIfNew: true });
        if (res && res.modified === false) return json(409, { errore: "Qualcuno è appena entrato con questo nome.", codice: "gia_entrato" });
        return risposta(nome, u, true);
      }
      const { utente, errore } = await autentica(nome, pin);
      if (errore) return errore;
      return risposta(nome, utente, false);
    }

    if (m === "POST" && path === "/indizio") {
      const { nome, pin, indizio } = await corpo(req);
      const { utente, errore } = await autentica(nome, pin);
      if (errore) return errore;
      utente.indizio = String(indizio || "").trim().slice(0, MAX_INDIZIO);
      await salvaUtente(nome, utente);
      return json(200, { ok: true, mioIndizio: utente.indizio });
    }

    if (path.startsWith("/admin")) {
      const key = req.headers.get("x-admin-key") || "";
      if (!adminKey) return json(503, { errore: "Area admin disattivata: imposta la variabile ADMIN_KEY su Netlify." });
      if (key.length !== adminKey.length || !timingSafeEqual(Buffer.from(key), Buffer.from(adminKey)))
        return json(401, { errore: "Chiave admin errata" });

      if (m === "GET" && path === "/admin") {
        const est = await store.get("estrazione", { type: "json" });
        const utenti = await Promise.all(nomi.map(getUtente));
        return json(200, {
          estrazioneFatta: !!est,
          estrazioneValida: !!est && est.firma === firmaNomi,
          partecipanti: nomi.map((nome, i) => ({ nome, entrato: !!utenti[i]?.pinHash, indizio: !!utenti[i]?.indizio })),
        });
      }
      if (m === "POST" && path === "/admin/reset-pin") {
        const { nome } = await corpo(req);
        const u = await getUtente(nome);
        if (!u) return json(404, { errore: "Nessun dato per questo nome" });
        delete u.pinHash; delete u.salt; u.errori = 0; u.bloccatoFino = 0;
        await salvaUtente(nome, u);
        return json(200, { ok: true });
      }
      if (m === "POST" && path === "/admin/rifai-estrazione") {
        const { conferma } = await corpo(req);
        if (conferma !== "RIFAI") return json(400, { errore: "Conferma mancante" });
        await store.delete("estrazione");
        await Promise.all(nomi.map((n) => store.delete(userKey(n))));
        await getEstrazione();
        return json(200, { ok: true });
      }
    }

    return json(404, { errore: "Non trovato" });
  }

  return async (req) => {
    try {
      return await handle(req);
    } catch (e) {
      console.error(e);
      return json(e.status || 500, { errore: e.status ? e.message : "Errore del server, riprova tra poco." });
    }
  };
}
