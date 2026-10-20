/* Shaban G. Satti — portfolio interactions */
(() => {
  const root = document.documentElement;
  root.classList.add("js");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const year = $("[data-year]");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Split text into characters ---------- */
  $$("[data-split]").forEach((el) => {
    const text = el.textContent;
    el.setAttribute("aria-label", text);
    el.textContent = "";
    let i = 0;
    const total = text.replace(/\s/g, "").length;
    text.split(/(\s+)/).forEach((part) => {
      if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(" ")); return; }
      const word = document.createElement("span");
      word.className = "word";
      word.setAttribute("aria-hidden", "true");
      [...part].forEach((ch) => {
        const c = document.createElement("span");
        c.className = "char";
        c.textContent = ch;
        c.style.setProperty("--i", i);
        if (el.classList.contains("accent")) {
          c.style.setProperty("--bgw", total * 100 + "%");
          c.style.setProperty("--bgx", (total > 1 ? (i / (total - 1)) * 100 : 0) + "%");
        }
        word.appendChild(c);
        i++;
      });
      el.appendChild(word);
    });
  });

  /* ---------- Typed roles ---------- */
  const typed = $(".typed");
  if (typed && !reduceMotion) {
    const words = typed.dataset.words.split("|");
    let w = 0, c = words[0].length, deleting = true;
    const tick = () => {
      const word = words[w];
      c += deleting ? -1 : 1;
      typed.textContent = word.slice(0, c);
      let delay = deleting ? 40 : 85;
      if (!deleting && c === word.length) { deleting = true; delay = 1800; }
      else if (deleting && c === 0) { deleting = false; w = (w + 1) % words.length; delay = 300; }
      setTimeout(tick, delay);
    };
    setTimeout(tick, 3200);
  }

  /* ---------- Counters ---------- */
  const runCounters = (scope) => {
    $$("[data-count]", scope).forEach((el) => {
      const end = +el.dataset.count;
      const suffix = el.dataset.suffix || "";
      if (reduceMotion) { el.textContent = end + suffix; return; }
      const t0 = performance.now() + 500, dur = 1600;
      const step = (t) => {
        const p = Math.max(0, Math.min((t - t0) / dur, 1));
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 4))) + (p === 1 ? suffix : "");
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  };

  /* ---------- Page progress (scroll within a view) ---------- */
  const bar = $(".progress span");
  const nav = $(".nav");
  let lastY = window.scrollY, ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    if (nav && !reduceMotion) nav.classList.toggle("is-hidden", y > lastY && y > 300 && !menuOpen);
    lastY = y;
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* ---------- Nav pill ---------- */
  const links = $$(".nav-links a");
  const pill = $(".nav-pill");
  const movePill = (a) => {
    if (!pill) return;
    if (!a) { pill.style.opacity = 0; return; }
    pill.style.opacity = 1;
    pill.style.width = a.offsetWidth + "px";
    pill.style.transform = `translateX(${a.offsetLeft}px)`;
  };
  links.forEach((a) => a.addEventListener("mouseenter", () => movePill(a)));
  $(".nav-links")?.addEventListener("mouseleave", () => movePill($(".nav-links a.is-active")));
  addEventListener("resize", () => movePill($(".nav-links a.is-active")));

  /* ---------- Views: one section at a time, switched from the navbar ---------- */
  const views = $$(".view");
  const ids = views.map((v) => v.id);
  let current = null;

  const enter = (view) => {
    const items = $$(".reveal, [data-split]", view);
    items.forEach((el) => el.classList.remove("is-in"));
    const line = $(".timeline-line", view);
    if (line) line.style.setProperty("--p", 0);
    void view.offsetWidth; // restart transitions
    let n = 0;
    items.forEach((el) => {
      if (!el.matches("[data-split]")) el.style.setProperty("--delay", Math.min(n++, 14) * 70 + 120 + "ms");
      el.classList.add("is-in");
    });
    if (line) requestAnimationFrame(() => line.style.setProperty("--p", 1));
    if (view.id === "home") runCounters(view);
  };

  const show = (id, { focus = false } = {}) => {
    if (!ids.includes(id)) id = "home";
    if (id === current) return;
    const next = document.getElementById(id);
    const prev = current && document.getElementById(current);
    current = id;
    if (prev) {
      prev.classList.remove("is-active");
      prev.hidden = true;
    }
    next.hidden = false;
    next.classList.add("is-active");
    window.scrollTo({ top: 0, behavior: "instant" });
    nav?.classList.remove("is-hidden");
    $$("[data-view-link]").forEach((a) => {
      const on = a.dataset.viewLink === id;
      a.classList.toggle("is-active", on);
      if (on && a.closest(".nav-links, .mobile-menu")) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    movePill($(".nav-links a.is-active"));
    document.title = id === "home" ? "Shaban G. Satti" : `${$("h2", next)?.textContent || id} · Shaban G. Satti`;
    enter(next);
    document.dispatchEvent(new CustomEvent("viewchange", { detail: id }));
    if (focus) {
      const h = $("h1, h2", next);
      if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    }
  };

  views.forEach((v) => { v.hidden = true; });

  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-view-link]");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    const id = a.dataset.viewLink;
    if (id !== current) history.pushState(null, "", "#" + id);
    show(id, { focus: true });
  });
  addEventListener("popstate", () => show(location.hash.slice(1)));

  /* ---------- Intro, then first view ---------- */
  const intro = $(".intro");
  const firstId = location.hash.slice(1);
  if (reduceMotion || !intro) {
    intro && intro.remove();
    show(firstId);
  } else {
    document.body.classList.add("is-loading");
    setTimeout(() => { document.body.classList.remove("is-loading"); show(firstId); }, 1300);
    intro.addEventListener("animationend", (e) => { if (e.animationName === "curtain") intro.remove(); });
  }

  /* ---------- Mobile menu ---------- */
  const menuBtn = $(".menu-btn");
  const menu = $("#mobile-menu");
  let menuOpen = false;
  const setMenu = (open) => {
    menuOpen = open;
    menu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", open);
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.style.overflow = open ? "hidden" : "";
  };
  menuBtn?.addEventListener("click", () => setMenu(!menuOpen));
  menu && $$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && menuOpen) setMenu(false); });

  if (reduceMotion) return; // everything below is purely decorative motion

  /* ---------- Pointer effects ---------- */
  if (finePointer) {
    document.body.classList.add("has-pointer");
    const glow = $(".cursor-glow");
    let gx = innerWidth / 2, gy = innerHeight / 2, tx = gx, ty = gy;
    addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    const follow = () => {
      gx += (tx - gx) * 0.12; gy += (ty - gy) * 0.12;
      glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
      requestAnimationFrame(follow);
    };
    follow();

    // 3D tilt + spotlight
    $$("[data-tilt]").forEach((el) => {
      const max = el.classList.contains("hero-portrait") ? 10 : 6;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.transition = "transform .1s linear";
        el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg)`;
        el.style.setProperty("--mx", px * 100 + "%");
        el.style.setProperty("--my", py * 100 + "%");
      });
      el.addEventListener("pointerleave", () => {
        el.style.transition = "transform .7s cubic-bezier(.2,.8,.2,1)";
        el.style.transform = "";
      });
    });

    // magnetic buttons
    $$(".magnetic").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
        el.firstElementChild.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
        el.firstElementChild.style.transform = "";
      });
    });
  }

  /* ---------- Hero canvas: a living power grid ---------- */
  const canvas = $(".grid-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H, dpr, nodes = [], edges = [], pulses = [], running = true, mouse = { x: -999, y: -999 };

  const build = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(90, (W * H) / 16000));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.6 + 1, bus: Math.random() < 0.12,
    }));
    pulses = [];
  };

  const LINK = 150;
  const draw = () => {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    edges = [];
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
      const dx = n.x - mouse.x, dy = n.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < 140 && d > 0) { n.x += (dx / d) * 0.8; n.y += (dy / d) * 0.8; }
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK) {
          edges.push([a, b]);
          const alpha = (1 - d / LINK) * 0.35;
          ctx.strokeStyle = `rgba(139,160,220,${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    // spawn power-flow pulses along lines
    if (edges.length && pulses.length < 26 && Math.random() < 0.25) {
      const [a, b] = edges[(Math.random() * edges.length) | 0];
      pulses.push({ a, b, t: 0, s: 0.008 + Math.random() * 0.012, hue: Math.random() < 0.5 ? "34,211,238" : "167,139,250" });
    }
    pulses = pulses.filter((p) => p.t <= 1 && Math.hypot(p.a.x - p.b.x, p.a.y - p.b.y) < LINK);
    for (const p of pulses) {
      p.t += p.s;
      const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 8);
      g.addColorStop(0, `rgba(${p.hue},1)`); g.addColorStop(1, `rgba(${p.hue},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
    }
    for (const n of nodes) {
      ctx.fillStyle = n.bus ? "rgba(34,211,238,.9)" : "rgba(220,228,255,.55)";
      ctx.beginPath(); ctx.arc(n.x, n.y, n.bus ? n.r + 1.5 : n.r, 0, Math.PI * 2); ctx.fill();
      if (n.bus) {
        ctx.strokeStyle = "rgba(34,211,238,.25)";
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 6, 0, Math.PI * 2); ctx.stroke();
      }
    }
    requestAnimationFrame(draw);
  };

  build();
  // the canvas has no size while the home view is hidden, so rebuild when it appears
  document.addEventListener("viewchange", (e) => { if (e.detail === "home") build(); });
  let rT;
  addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(build, 200); });
  canvas.parentElement.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  canvas.parentElement.addEventListener("pointerleave", () => { mouse.x = mouse.y = -999; });
  // pause when the hero is off-screen or the tab is hidden
  let onScreen = true;
  const update = () => {
    const was = running; running = onScreen && !document.hidden;
    if (running && !was) requestAnimationFrame(draw);
  };
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; update(); }).observe(canvas);
  document.addEventListener("visibilitychange", update);
  requestAnimationFrame(draw);
})();
