(() => {
  const S = window.SITE || {};
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const celular = matchMedia("(max-width: 860px)").matches;

  /* ── Menu do celular ──────────────────────────────────────────────────── */
  const botaoMenu = document.querySelector(".menu-botao");
  if (botaoMenu) {
    const fechar = () => { document.body.classList.remove("menu-aberto"); botaoMenu.setAttribute("aria-expanded", "false"); };
    botaoMenu.addEventListener("click", () => {
      const aberto = document.body.classList.toggle("menu-aberto");
      botaoMenu.setAttribute("aria-expanded", String(aberto));
    });
    document.querySelectorAll(".menu a").forEach((a) => a.addEventListener("click", fechar));
    addEventListener("keydown", (e) => { if (e.key === "Escape") fechar(); });
  }

  /* ── Palavras que entram uma a uma (títulos e frases das cenas) ───────── */
  const dividir = (el) => {
    if (reduzir || el.dataset.dividido) return;
    el.dataset.dividido = "1";
    const rotulo = el.textContent.trim().replace(/\s+/g, " ");
    el.setAttribute("aria-label", rotulo);
    let i = 0;
    const percorrer = (no, alvo) => {
      no.childNodes.forEach((filho) => {
        if (filho.nodeType === 3) {
          filho.textContent.split(/(\s+)/).forEach((parte) => {
            if (!parte) return;
            if (/^\s+$/.test(parte)) { alvo.append(document.createTextNode(" ")); return; }
            const s = document.createElement("span");
            s.className = "pal"; s.setAttribute("aria-hidden", "true");
            s.style.setProperty("--i", i++); s.textContent = parte;
            alvo.append(s);
          });
        } else if (filho.nodeType === 1) {
          const copia = filho.cloneNode(false); // preserva <em> etc.
          alvo.append(copia);
          percorrer(filho, copia);
        }
      });
    };
    const novo = document.createElement(el.tagName);
    percorrer(el, novo);
    el.replaceChildren(...novo.childNodes);
  };
  document.querySelectorAll(".momento .cena-titulo, .momento .destaque, .revelar h2").forEach(dividir);

  /* ── Cenas: a rolagem toca o vídeo ────────────────────────────────────── */
  const cache = {}; // um conjunto de frames por cena e por modo (desktop/celular)
  const preparar = (chave) => {
    const cena = (S.cenas || {})[chave];
    if (!cena) return null;
    const usaM = celular && cena.mobile;
    const id = chave + (usaM ? ":m" : ":d");
    if (cache[id]) return cache[id];
    const total = usaM ? cena.totalMobile || cena.total : cena.total;
    const padrao = usaM ? cena.mobile : cena.desktop;
    const quadros = new Array(total);
    const src = (i) => padrao.replace("{n}", String(i + 1).padStart(4, "0"));
    const carregar = (i) => {
      if (i < 0 || i >= total) return null;
      if (quadros[i]) return quadros[i];
      const img = new Image();
      img.decoding = "async"; img.src = src(i);
      return (quadros[i] = img);
    };
    let iniciado = false;
    const baixar = () => {
      if (iniciado) return; iniciado = true;
      carregar(0);
      if (reduzir) return;
      const fila = [];
      for (const passo of [8, 4, 2, 1]) for (let i = 0; i < total; i += passo) if (!fila.includes(i)) fila.push(i);
      let k = 0;
      const lote = () => { for (let n = 0; n < 6 && k < fila.length; n++) carregar(fila[k++]); if (k < fila.length) setTimeout(lote, 40); };
      lote();
    };
    const pronto = (i) => quadros[i] && quadros[i].complete && quadros[i].naturalWidth;
    const maisProximo = (i) => {
      for (let d = 0; d < total; d++) { if (pronto(i - d)) return i - d; if (pronto(i + d)) return i + d; }
      return -1;
    };
    return (cache[id] = { total, quadros, baixar, maisProximo, vertical: !!(usaM && cena.vertical) || !!(usaM && cena.totalMobile && cena.vertical) });
  };

  const iniciarCena = (cine) => {
    const dados = preparar(cine.dataset.cena || "abertura");
    if (!dados) return;
    const { total, quadros, baixar, maisProximo } = dados;
    const canvas = cine.querySelector(".cine-canvas");
    const ctx = canvas.getContext("2d");
    const momentos = [...cine.querySelectorAll(".momento")];
    const capEl = cine.querySelector(".cine-capitulo");
    const faixaEl = cine.querySelector(".cine-trilho i");
    const foco = dados.vertical ? 0.5 : parseFloat((celular ? cine.dataset.foco : "") || 0.5); // recorte do horizontal no celular
    // data-de / data-ate: faixa do filme (0 a 1). de > ate toca o filme de trás para a frente.
    const de = parseFloat(cine.dataset.de ?? 0) * (total - 1);
    const ate = parseFloat(cine.dataset.ate ?? 1) * (total - 1);
    const vis = parseFloat(cine.dataset.vis || 1), vy = parseFloat(cine.dataset.vy || 0.6); // celular: largura visível do quadro e posição vertical
    const z0 = parseFloat(cine.dataset.zoom || 1), zx = parseFloat(cine.dataset.zx || 0.65), zy = parseFloat(cine.dataset.zy || 0.68); // desktop: aproximação inicial sobre o assunto
    let atual = de, desenhado = -1, visivel = false, capAtual = "";

    // Só baixa os frames quando a cena está perto da tela (a abertura baixa já)
    new IntersectionObserver(([e]) => { visivel = e.isIntersecting; if (e.isIntersecting) baixar(); }, { rootMargin: "30% 0px" }).observe(cine);
    new IntersectionObserver(([e]) => { if (e.isIntersecting) baixar(); }, { rootMargin: "250% 0px" }).observe(cine);
    if (cine.id === "inicio") { visivel = true; baixar(); }

    const ajustar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      desenhado = -1; desenhar(Math.round(atual), true);
    };
    function desenhar(i, forcar) {
      const j = maisProximo(i);
      if (j < 0 || (j === desenhado && !forcar && !z0)) return;
      const img = quadros[j], cw = canvas.width, ch = canvas.height;
      const iw = img.naturalWidth, ih = img.naturalHeight;
      if (celular && vis < 1 && !dados.vertical) {
        // celular: mostra a faixa inteira do assunto (sem cortar) e preenche o resto com o próprio quadro desfocado
        const cob = Math.max(cw / iw, ch / ih);
        ctx.save();
        try { ctx.filter = "blur(18px) brightness(.55)"; } catch (e) {}
        ctx.drawImage(img, -(iw * cob - cw) * foco, (ch - ih * cob) / 2, iw * cob, ih * cob);
        ctx.restore();
        const esc = cw / (vis * iw), w = iw * esc, h = ih * esc;
        ctx.drawImage(img, -(w - cw) * foco, ch * vy - h / 2, w, h);
      } else {
        const escala = Math.max(cw / iw, ch / ih); // "cover"
        let w = iw * escala, h = ih * escala, x = -(w - cw) * foco, y = (ch - h) / 2;
        if (z0 > 1 && !celular) { // desktop: começa aproximado no assunto e abre conforme a rolagem
          const z = 1 + (z0 - 1) * (1 - Math.min(1, progresso() * 1.6));
          w *= z; h *= z;
          x = Math.min(0, Math.max(cw - w, cw * 0.6 - zx * w));
          y = Math.min(0, Math.max(ch - h, ch * 0.62 - zy * h));
        }
        ctx.drawImage(img, x, y, w, h);
      }      desenhado = j;
    }
    const progresso = () => {
      const r = cine.getBoundingClientRect();
      return Math.min(1, Math.max(0, -r.top / ((cine.offsetHeight - innerHeight) || 1)));
    };
    const atualizar = (p) => {
      let ativo = null;
      for (const m of momentos) {
        const a = parseFloat(m.dataset.de || 0), b = parseFloat(m.dataset.ate || 1);
        const on = p >= a && (p < b || (b >= 1 && p >= 1));
        m.classList.toggle("ativo", on);
        if (on) ativo = m;
      }
      cine.classList.toggle("andou", p > 0.02);
      cine.style.setProperty("--p", p.toFixed(4));
      if (capEl) {
        const cap = ativo ? ativo.dataset.cap || "" : "";
        if (cap !== capAtual) { capAtual = cap; capEl.classList.remove("on"); setTimeout(() => { capEl.textContent = cap; capEl.classList.toggle("on", !!cap); }, 180); }
      }
      if (faixaEl) faixaEl.style.transform = `scaleY(${p.toFixed(4)})`;
    };
    const quadro = () => {
      if (visivel) {
        const p = progresso();
        const alvo = de + (ate - de) * p;
        atual += (alvo - atual) * 0.18; // suaviza: sensação de filme, não de slide
        if (Math.abs(alvo - atual) < 0.05) atual = alvo;
        desenhar(Math.round(atual));
        atualizar(p);
      }
      requestAnimationFrame(quadro);
    };
    addEventListener("resize", ajustar);
    ajustar();
    if (reduzir) atualizar(0); else requestAnimationFrame(quadro);
  };
  document.querySelectorAll(".cine").forEach(iniciarCena);

  /* ── Parallax + "dolly" leve nas artes ────────────────────────────────── */
  const artes = reduzir ? [] : [...document.querySelectorAll(".arte")];
  if (artes.length) {
    const mover = () => {
      for (const a of artes) {
        const r = a.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) continue;
        const c = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        const zoom = 1.05 + Math.max(0, 1 - Math.abs(c)) * 0.07;
        a.style.transform = `translate3d(0, ${(c * -60).toFixed(1)}px, 0) scale(${zoom.toFixed(3)})`;
      }
    };
    addEventListener("scroll", () => requestAnimationFrame(mover), { passive: true });
    mover();
  }

  /* ── Topo, revelar e ano ──────────────────────────────────────────────── */
  const topo = document.querySelector(".topo");
  const whats = document.querySelector(".whats");
  let formNaTela = false; // o botão flutuante se recolhe para não cobrir o "Enviar"
  const aoRolar = () => {
    topo && topo.classList.toggle("rolou", scrollY > 40);
    whats && whats.classList.toggle("visivel", scrollY > innerHeight * 0.6 && !formNaTela);
  };
  const formEl = document.querySelector(".form");
  if (formEl) new IntersectionObserver(([e]) => { formNaTela = e.isIntersecting; aoRolar(); }).observe(formEl);
  addEventListener("scroll", aoRolar, { passive: true });
  aoRolar();

  /* ── Números que sobem ao aparecer ────────────────────────────────────── */
  const contar = (el) => {
    const m = el.textContent.match(/\d+/);
    if (!m || reduzir) return;
    const fim = parseInt(m[0], 10), molde = el.textContent, t0 = performance.now(), dur = 1400;
    const passo = (t) => {
      const k = Math.min(1, (t - t0) / dur), v = Math.round(fim * (1 - Math.pow(1 - k, 3)));
      el.textContent = molde.replace(/\d+/, v);
      if (k < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  };
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add("visto");
      e.target.querySelectorAll(".fatos strong").forEach(contar);
      io.unobserve(e.target);
    }
  }), { threshold: 0.18 });
  document.querySelectorAll(".revelar").forEach((el) => io.observe(el));
  document.querySelectorAll("[data-ano]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ── WhatsApp ─────────────────────────────────────────────────────────── */
  if (whats && S.whatsapp) {
    const num = String(S.whatsapp.numero || "").replace(/\D/g, "");
    whats.href = `https://wa.me/${num}?text=${encodeURIComponent(S.whatsapp.mensagem || "")}`;
  }

  /* ── Formulário → e-mail ──────────────────────────────────────────────── */
  const form = document.querySelector(".form");
  if (form && S.contato) {
    const status = form.querySelector(".form-status");
    const botao = form.querySelector("button[type=submit]");
    const avisar = (txt, tipo) => { status.textContent = txt; status.className = `form-status campo--inteiro ${tipo || ""}`; };
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (form.elements._honey.value) return; // robô
      let valido = true;
      form.querySelectorAll("[required]").forEach((c) => {
        const ok = c.type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.value) : c.value.trim().length > 1;
        c.closest(".campo").classList.toggle("erro", !ok);
        if (!ok) valido = false;
      });
      if (!valido) return avisar("Confira os campos destacados.", "falha");
      const dados = Object.fromEntries(new FormData(form));
      delete dados._honey;
      const assunto = S.contato.assunto || `Novo contato pelo site ${S.nome || ""}`;
      let url, corpo;
      if (S.contato.web3formsChave) {
        url = "https://api.web3forms.com/submit";
        corpo = { access_key: S.contato.web3formsChave, subject: assunto, from_name: S.nome, ...dados };
      } else {
        url = `https://formsubmit.co/ajax/${encodeURIComponent(S.contato.email)}`;
        corpo = { _subject: assunto, _template: "table", _captcha: "false", ...dados };
      }
      botao.disabled = true; avisar("Enviando…");
      try {
        const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(corpo) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.success === false || j.success === "false") throw new Error(j.message || r.status);
        form.reset(); avisar("Recebemos seu contato. Em breve falamos com você.", "ok");
      } catch (e) {
        console.warn("Falha no envio do formulário:", e);
        avisar("Não foi possível enviar agora. Chame a gente no WhatsApp.", "falha");
      } finally { botao.disabled = false; }
    });
  }
})();


