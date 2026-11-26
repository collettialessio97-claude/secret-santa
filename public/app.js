(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = { info: null, nome: null, pin: null, nuovo: false, step: "pin", firstPin: "", data: null };

  // ---------------- API ----------------
  async function api(path, body) {
    const res = await fetch("/api" + path, body
      ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
      : { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.errore || "Qualcosa è andato storto"), { status: res.status, codice: data.codice });
    return data;
  }

  // ---------------- Utility ----------------
  const palette = [["#1769e0", "#7fb0ff"], ["#0aa3a3", "#7fe3d9"], ["#e5383b", "#ff9a8b"], ["#d99a1e", "#ffde8a"], ["#6b4dff", "#b3a4ff"], ["#0a4dbb", "#18c7c0"], ["#c2185b", "#f48fb1"], ["#2e7d32", "#a5d6a7"]];
  function avatar(el, nome) {
    let h = 0;
    for (const c of nome) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const [c1, c2] = palette[h % palette.length];
    el.style.setProperty("--c1", c1);
    el.style.setProperty("--c2", c2);
    const parts = nome.trim().split(/\s+/);
    el.textContent = ((parts[0]?.[0] || "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  }
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2600);
  }
  function show(id) {
    $$(".screen").forEach((s) => s.classList.toggle("active", s.id === "screen-" + id));
    scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }
  const fmtData = (iso) => new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", timeZone: "Europe/Rome" });
  const saveSession = () => sessionStorage.setItem("santa", JSON.stringify({ nome: state.nome, pin: state.pin }));
  const clearSession = () => sessionStorage.removeItem("santa");

  // ---------------- Neve ----------------
  function snow() {
    const c = $("#snow"), ctx = c.getContext("2d");
    let w, h, flakes;
    const resize = () => {
      w = c.width = innerWidth * devicePixelRatio;
      h = c.height = innerHeight * devicePixelRatio;
      const n = Math.min(160, Math.round(innerWidth / 9));
      flakes = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: (Math.random() * 2.4 + .6) * devicePixelRatio,
        s: Math.random() * .6 + .25, d: Math.random() * Math.PI * 2, o: Math.random() * .6 + .3,
      }));
    };
    resize();
    addEventListener("resize", resize);
    if (reduceMotion) return;
    (function loop(t) {
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.y += f.s * f.r * .6;
        f.x += Math.sin(t / 1800 + f.d) * .4 * devicePixelRatio;
        if (f.y > h + 10) { f.y = -10; f.x = Math.random() * w; }
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${f.o})`;
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(loop);
    })(0);
  }

  // ---------------- Coriandoli ----------------
  function confetti() {
    if (reduceMotion) return;
    const c = $("#confetti"), ctx = c.getContext("2d");
    const dpr = devicePixelRatio;
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    const colors = ["#f6c453", "#ffde8a", "#ffffff", "#1769e0", "#7fb0ff", "#e5383b"];
    const rect = $("#gift").getBoundingClientRect();
    const ox = (rect.left + rect.width / 2) * dpr, oy = (rect.top + rect.height / 2) * dpr;
    const parts = Array.from({ length: 220 }, () => {
      const a = Math.random() * Math.PI * 2, v = (Math.random() * 14 + 6) * dpr;
      return {
        x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 9 * dpr,
        w: (Math.random() * 8 + 5) * dpr, h: (Math.random() * 5 + 3) * dpr,
        rot: Math.random() * 6, vr: (Math.random() - .5) * .35,
        col: colors[(Math.random() * colors.length) | 0], star: Math.random() < .18,
      };
    });
    const start = performance.now();
    (function loop(t) {
      const el = t - start;
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of parts) {
        p.vy += .38 * dpr; p.vx *= .985; p.vy *= .985;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - el / 4200);
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.col;
        if (p.star) { ctx.font = `${p.w * 2}px serif`; ctx.fillText("✦", 0, 0); }
        else { ctx.scale(1, Math.cos(p.rot * 2)); ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
        ctx.restore();
      }
      if (el < 4400) requestAnimationFrame(loop); else ctx.clearRect(0, 0, c.width, c.height);
    })(start);
  }

  // ---------------- Countdown ----------------
  function countdown() {
    const target = new Date(state.info.dataScambio).getTime();
    const pad = (n) => String(n).padStart(2, "0");
    const tick = () => {
      let d = Math.max(0, target - Date.now());
      if (d === 0) {
        $("#countdown").className = "countdown glass done";
        $("#countdown").textContent = "🎉 È il giorno dello scambio!";
        return;
      }
      const s = Math.floor(d / 1000);
      $("#cd-d").textContent = Math.floor(s / 86400);
      $("#cd-h").textContent = pad(Math.floor(s / 3600) % 24);
      $("#cd-m").textContent = pad(Math.floor(s / 60) % 60);
      $("#cd-s").textContent = pad(s % 60);
      setTimeout(tick, 1000);
    };
    tick();
  }

  // ---------------- Home ----------------
  function renderHome() {
    const i = state.info;
    const budget = `${i.budgetMin}–${i.budgetMax} €`;
    $("#ufficio").textContent = i.ufficio;
    $("#titolo").textContent = i.titolo;
    $("#anno").textContent = new Date(i.dataScambio).getFullYear();
    $("#budget").textContent = budget;
    $$(".budget-txt").forEach((e) => (e.textContent = budget));
    $$(".data-txt").forEach((e) => (e.textContent = fmtData(i.dataScambio)));
    document.title = `${i.titolo} · ${i.ufficio} 🎄`;

    const box = $("#names");
    box.innerHTML = "";
    [...i.partecipanti].sort((a, b) => a.nome.localeCompare(b.nome, "it")).forEach((p, idx) => {
      const b = document.createElement("button");
      b.className = "name-btn";
      b.style.animationDelay = `${idx * 45}ms`;
      b.innerHTML = `<span class="avatar"></span><span class="nm"></span>${p.entrato ? '<span class="badge">✓ entrato</span>' : ""}`;
      avatar($(".avatar", b), p.nome);
      $(".nm", b).textContent = p.nome;
      b.dataset.search = p.nome.toLowerCase();
      b.addEventListener("click", () => openPin(p));
      box.appendChild(b);
    });
    const n = i.partecipanti.filter((p) => p.entrato).length, tot = i.partecipanti.length;
    requestAnimationFrame(() => ($("#progress-bar").style.width = `${(n / tot) * 100}%`));
    $("#progress-text").textContent = n === tot ? "🎉 Tutti hanno scoperto il loro abbinamento!" : `${n} su ${tot} hanno già scartato il loro pacco`;
  }

  // ---------------- Evento ----------------
  function renderEvent() {
    const e = state.info.evento;
    if (!e || !e.indirizzo) return;
    const q = encodeURIComponent(`${e.ristorante}, ${e.indirizzo}`);
    const start = new Date(state.info.dataScambio);
    const tz = { timeZone: "Europe/Rome" };
    const when = `${start.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", ...tz })} · ore ${start.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", ...tz })}`;
    $$(".ev-name").forEach((el) => (el.textContent = e.ristorante));
    $$(".ev-addr").forEach((el) => (el.textContent = e.indirizzo));
    $$(".ev-maps").forEach((el) => (el.href = `https://www.google.com/maps/dir/?api=1&destination=${q}`));
    $(".ev-when").textContent = `🗓️ ${when.charAt(0).toUpperCase() + when.slice(1)}`;
    $$(".tab[data-tab=dirs]").forEach((b) => (b.hidden = !(e.indicazioni || []).filter(Boolean).length && !e.indirizzo));
    $(".ev-note").textContent = e.note || "";
    const ul = $(".ev-dirs");
    ul.innerHTML = "";
    (e.indicazioni || []).filter(Boolean).forEach((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      ul.appendChild(li);
    });
    state.mapSrc = `https://www.google.com/maps?q=${q}&output=embed`;
    $("#hero-when").textContent = when.charAt(0).toUpperCase() + when.slice(1);
    $("#hero-where").textContent = `${e.ristorante} · ${e.indirizzo.split(",").pop().replace(/\d+/g, "").trim()}`;
    if (e.telefono) {
      const tel = $(".ev-tel");
      tel.hidden = false;
      tel.href = "tel:" + e.telefono.replace(/[^\d+]/g, "");
    }
    $(".ev-cal").onclick = () => {
      const end = new Date(start.getTime() + (e.durataOre || 3) * 3600e3);
      const f = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      const esc = (t) => String(t).replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
      const desc = [`Secret Santa 🎁 Porta il tuo regalo! Budget ${state.info.budgetMin}–${state.info.budgetMax} €`, ...(e.indicazioni || []), e.note].filter(Boolean).join("\n");
      const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Secret Santa//IT", "BEGIN:VEVENT",
        `UID:secret-santa-${start.getTime()}@ufficio`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`,
        `SUMMARY:${esc(`🎄 ${state.info.titolo} ${state.info.ufficio} · ${e.ristorante}`)}`, `LOCATION:${esc(e.indirizzo)}`, `DESCRIPTION:${esc(desc)}`,
        "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:Domani c'è la cena di Natale! Hai il regalo del Secret Santa? 🎁", "END:VALARM",
        "END:VEVENT", "END:VCALENDAR"].join("\r\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
      a.download = "secret-santa.ics";
      a.click();
      toast("Evento scaricato: aprilo per aggiungerlo al calendario 🗓️");
    };
    const ex = $(".ev-extra");
    ex.innerHTML = "";
    (e.extra || []).forEach((t) => {
      const s = document.createElement("span");
      s.className = "ev-badge";
      s.textContent = t;
      ex.appendChild(s);
    });
    renderMenu();
    $("#event").hidden = false;
    requestAnimationFrame(() => state.moveTabIndicator && state.moveTabIndicator());
    $("#event-mini").hidden = false;
  }

  function renderMenu() {
    const m = state.info.menu;
    if (!m || !m.portate?.length) return;
    const box = $(".menu-courses");
    box.innerHTML = "";
    m.portate.forEach((p) => {
      const c = document.createElement("div");
      c.className = "course";
      const h = document.createElement("h4");
      h.textContent = p.nome + (p.piatti.length > 1 ? " · a scelta" : "");
      c.appendChild(h);
      p.piatti.forEach((piatto, i) => {
        if (i > 0) {
          const o = document.createElement("span");
          o.className = "or";
          o.textContent = "oppure";
          c.appendChild(o);
        }
        const d = document.createElement("p");
        d.textContent = piatto;
        c.appendChild(d);
      });
      box.appendChild(c);
    });
    const ul = $(".menu-incl");
    ul.innerHTML = "";
    (m.incluso || []).forEach((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      ul.appendChild(li);
    });
    $(".menu-price").textContent = m.prezzo ? `${m.prezzo} € a persona` : "";
    $("#menu").hidden = false;
  }

  async function loadInfo() {
    state.info = await api("/stato");
    renderHome();
    renderEvent();
  }

  // ---------------- PIN ----------------
  const boxes = () => $$("#pin-boxes input");
  const pinValue = () => boxes().map((i) => i.value).join("");
  function clearPin() { boxes().forEach((i) => (i.value = "")); boxes()[0].focus(); }
  function pinError(msg) {
    $("#pin-error").textContent = msg;
    const p = $("#pin-boxes");
    p.classList.remove("shake"); void p.offsetWidth; p.classList.add("shake");
    clearPin();
  }

  function openPin(p) {
    state.nome = p.nome;
    state.nuovo = !p.entrato;
    state.step = state.nuovo ? "crea" : "entra";
    state.firstPin = "";
    avatar($("#pin-avatar"), p.nome);
    $("#pin-error").textContent = "";
    renderPinStep();
    show("pin");
    setTimeout(clearPin, 50);
  }

  function renderPinStep() {
    const nome = state.nome;
    const t = $("#pin-title"), s = $("#pin-sub"), h = $("#pin-hint"), b = $("#pin-submit");
    if (state.step === "crea") {
      t.textContent = `Ciao ${nome}! 👋`;
      s.innerHTML = "Scegli un <strong>PIN segreto di 4 cifre</strong>: ti servirà per rientrare e rileggere i messaggi.";
      h.textContent = `Non sei ${nome}? Torna indietro: scegliere il nome di un altro rovina la sorpresa 😉`;
      b.textContent = "Continua";
    } else if (state.step === "conferma") {
      t.textContent = "Ripeti il PIN 🔐";
      s.textContent = "Solo per essere sicuri. Ricordatelo!";
      h.textContent = "";
      b.textContent = "Conferma e apri il pacco 🎁";
    } else {
      t.textContent = `Bentornato/a, ${nome}! ✨`;
      s.textContent = "Inserisci il tuo PIN per rientrare.";
      h.textContent = "PIN dimenticato? Chiedi all'organizzatore di resettarlo.";
      b.textContent = "Entra";
    }
  }

  function setupPinInputs() {
    boxes().forEach((inp, idx, arr) => {
      inp.addEventListener("input", () => {
        inp.value = inp.value.replace(/\D/g, "").slice(-1);
        if (inp.value && idx < 3) arr[idx + 1].focus();
        if (pinValue().length === 4) $("#pin-form").requestSubmit();
      });
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !inp.value && idx > 0) { arr[idx - 1].focus(); arr[idx - 1].value = ""; }
        if (e.key === "ArrowLeft" && idx > 0) arr[idx - 1].focus();
        if (e.key === "ArrowRight" && idx < 3) arr[idx + 1].focus();
      });
      inp.addEventListener("paste", (e) => {
        const d = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 4);
        if (!d) return;
        e.preventDefault();
        arr.forEach((b, i) => (b.value = d[i] || ""));
        arr[Math.min(d.length, 3)].focus();
        if (d.length === 4) $("#pin-form").requestSubmit();
      });
      inp.addEventListener("focus", () => inp.select());
    });

    $("#pin-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const pin = pinValue();
      if (pin.length !== 4) return pinError("Inserisci 4 cifre");
      $("#pin-error").textContent = "";

      if (state.step === "crea") {
        state.firstPin = pin;
        state.step = "conferma";
        renderPinStep();
        return clearPin();
      }
      if (state.step === "conferma" && pin !== state.firstPin) {
        state.step = "crea";
        renderPinStep();
        return pinError("I PIN non coincidono, riprova da capo");
      }

      const btn = $("#pin-submit");
      btn.disabled = true;
      try {
        const data = await api("/entra", { nome: state.nome, pin, nuovo: state.nuovo });
        state.pin = pin;
        state.data = data;
        saveSession();
        openReveal();
      } catch (err) {
        if (err.codice === "gia_entrato" || err.codice === "nessun_pin") {
          await loadInfo().catch(() => {});
          const p = state.info.partecipanti.find((x) => x.nome === state.nome);
          if (p) { state.nuovo = !p.entrato; state.step = state.nuovo ? "crea" : "entra"; renderPinStep(); }
        }
        pinError(err.message);
      } finally {
        btn.disabled = false;
      }
    });

    $$("[data-back]").forEach((b) => b.addEventListener("click", () => { show("home"); loadInfo().catch(() => {}); }));
  }

  // ---------------- Rivelazione ----------------
  function openReveal() {
    const d = state.data;
    const stage = $("#screen-reveal");
    stage.classList.remove("opened");
    $("#dashboard").classList.remove("show");
    $("#result-name").textContent = d.destinatario;
    $$(".dest-name").forEach((e) => (e.textContent = d.destinatario));
    $("#reveal-kicker").textContent = d.nuovo ? `${d.nome}, il tuo pacco ti aspetta…` : `Bentornato/a ${d.nome}! Riapri il pacco 🎁`;
    renderHints();
    show("reveal");
  }

  let opening = false;
  function openGift() {
    const stage = $("#screen-reveal");
    if (opening || stage.classList.contains("opened")) return;
    opening = true;
    const g = $("#gift");
    g.classList.add("shake");
    setTimeout(() => {
      g.classList.remove("shake");
      stage.classList.add("opened");
      $("#reveal-kicker").textContent = "🎉 Tadaaa!";
      setTimeout(confetti, 350);
      if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
      setTimeout(() => { $("#dashboard").classList.add("show"); opening = false; }, 1500);
    }, reduceMotion ? 0 : 520);
  }

  function renderHints() {
    const d = state.data;
    const el = $("#dest-hint");
    if (d.indizioDestinatario) {
      el.textContent = d.indizioDestinatario;
      el.classList.remove("empty");
    } else {
      el.textContent = `${d.destinatario} non ha ancora lasciato indizi… ripassa più tardi! ⏳`;
      el.classList.add("empty");
    }
    $("#my-hint").value = d.mioIndizio || "";
    updateCount();
  }
  const updateCount = () => ($("#hint-count").textContent = `${$("#my-hint").value.length}/300`);

  const ideas = ["☕ Amo il caffè", "🍵 Team tè", "🍫 Goloso/a di cioccolato", "📚 Libri", "🌱 Piantine", "🧦 Calzini buffi", "🎲 Giochi", "🕯️ Candele", "🥜 Niente frutta secca (allergia)", "🚫 Niente profumi"];
  function setupDashboard() {
    const box = $("#ideas");
    ideas.forEach((txt) => {
      const b = document.createElement("button");
      b.className = "idea";
      b.type = "button";
      b.textContent = txt;
      b.addEventListener("click", () => {
        const ta = $("#my-hint");
        const sep = ta.value && !/[\s,]$/.test(ta.value) ? ", " : "";
        ta.value = (ta.value + sep + txt).slice(0, 300);
        updateCount();
        ta.focus();
      });
      box.appendChild(b);
    });
    $("#my-hint").addEventListener("input", updateCount);

    $("#save-hint").addEventListener("click", async () => {
      const btn = $("#save-hint");
      btn.disabled = true;
      try {
        const r = await api("/indizio", { nome: state.nome, pin: state.pin, indizio: $("#my-hint").value });
        state.data.mioIndizio = r.mioIndizio;
        toast("Messaggio salvato! Il tuo Babbo Natale segreto ringrazia 🎅");
      } catch (err) {
        toast("⚠️ " + err.message);
      } finally {
        btn.disabled = false;
      }
    });

    $("#refresh-hint").addEventListener("click", async () => {
      try {
        const mio = $("#my-hint").value;
        state.data = await api("/entra", { nome: state.nome, pin: state.pin });
        renderHints();
        $("#my-hint").value = mio;
        updateCount();
        toast(state.data.indizioDestinatario ? "Messaggio aggiornato ✨" : "Ancora nessun messaggio ⏳");
      } catch (err) { toast("⚠️ " + err.message); }
    });

    $("#logout").addEventListener("click", () => {
      clearSession();
      Object.assign(state, { nome: null, pin: null, data: null });
      show("home");
      loadInfo().catch(() => {});
    });

    $("#gift").addEventListener("click", openGift);
  }

  // ---------------- Avvio ----------------
  function setupSearch() {
    $("#search").addEventListener("input", (ev) => {
      const q = ev.target.value.trim().toLowerCase();
      let visible = 0;
      $$(".name-btn").forEach((b) => {
        const ok = !q || b.dataset.search.startsWith(q) || b.dataset.search.split(/\s+/).some((w) => w.startsWith(q));
        b.hidden = !ok;
        if (ok) visible++;
      });
      $("#no-results")?.remove();
      if (!visible) $("#names").insertAdjacentHTML("beforeend", '<p id="no-results" class="muted">Nessun nome trovato 🤔</p>');
    });
  }

  function setupTabs() {
    const tabs = $$(".tab");
    const move = () => {
      const a = $(".tab.active"), ind = $(".tab-indicator");
      if (!a || !a.offsetWidth) return;
      ind.style.width = a.offsetWidth + "px";
      ind.style.transform = `translateX(${a.offsetLeft}px)`;
    };
    tabs.forEach((t) => t.addEventListener("click", () => {
      tabs.forEach((x) => { x.classList.toggle("active", x === t); x.setAttribute("aria-selected", x === t); });
      $$(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "tab-" + t.dataset.tab));
      if (t.dataset.tab === "dirs") { const m = $(".ev-map"); if (!m.src && state.mapSrc) m.src = state.mapSrc; }
      move();
    }));
    addEventListener("resize", move);
    if (window.ResizeObserver) new ResizeObserver(move).observe($(".tabs"));
    document.fonts?.ready.then(move);
    state.moveTabIndicator = move;
  }

  async function init() {
    setupSearch();
    setupTabs();
    snow();
    setupPinInputs();
    setupDashboard();
    try {
      await loadInfo();
      countdown();
    } catch (err) {
      $("#names").innerHTML = `<p class="error">${err.message}</p>`;
      return;
    }
    const saved = JSON.parse(sessionStorage.getItem("santa") || "null");
    if (saved?.nome && saved?.pin) {
      try {
        state.nome = saved.nome; state.pin = saved.pin;
        state.data = await api("/entra", saved);
        openReveal();
        $("#screen-reveal").classList.add("opened");
        $("#dashboard").classList.add("show");
        $("#reveal-kicker").textContent = `Ciao ${saved.nome}! 🎄`;
      } catch { clearSession(); }
    }
  }
  init();
})();
