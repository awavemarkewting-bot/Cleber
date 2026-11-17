/* Depoimentos em vídeo: um toque abre a visualização ampliada, com som. */
(() => {
  const cards = [...document.querySelectorAll(".depo")];
  const caixa = document.querySelector(".lightbox");
  if (!cards.length || !caixa || typeof caixa.showModal !== "function") return;

  const video = caixa.querySelector("video");
  const nome = caixa.querySelector(".lightbox-nome");
  let origem = null;

  const abrir = (card) => {
    origem = card.querySelector(".depo-play");
    video.src = card.dataset.src;
    video.poster = card.querySelector("img").src;
    nome.textContent = card.dataset.nome + " · depoimento real";
    caixa.showModal();
    video.play().catch(() => { video.controls = true; });
  };
  const fechar = () => { video.pause(); video.removeAttribute("src"); video.load(); if (caixa.open) caixa.close(); origem && origem.focus(); };

  cards.forEach((c) => c.querySelector(".depo-play").addEventListener("click", () => abrir(c)));
  caixa.querySelector(".lightbox-fechar").addEventListener("click", fechar);
  caixa.addEventListener("click", (e) => { if (e.target === caixa || e.target.classList.contains("lightbox-corpo")) fechar(); });
  caixa.addEventListener("cancel", (e) => { e.preventDefault(); fechar(); });
})();
