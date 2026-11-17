window.SITE = {
  nome: "Dr. Cleber Silva",

  whatsapp: {
    numero: "5534991629690", // só dígitos, ex.: 5511999998888
    mensagem: "Olá! Gostaria de agendar uma avaliação.",
  },

  contato: {
    // ATENÇÃO: trocar pelo e-mail que vai receber os contatos do formulário.
    email: "contato@drclebersilva.com.br",
    // Opcional: chave do Web3Forms (https://web3forms.com). Se vazio, usa FormSubmit.
    web3formsChave: "",
    assunto: "Novo contato pelo site do Dr. Cleber Silva",
  },

  // Cada cena (vídeo na rolagem) tem seus próprios frames. {n} vira 0001, 0002…
  // "mobile" com totalMobile = frames feitos para tela vertical; sem eles, o celular recorta o horizontal.
  cenas: {
    abertura: {
      desktop: "assets/frames/desktop/f_{n}.webp", total: 144,
      mobile: "assets/frames/mobile/f_{n}.webp", totalMobile: 144, vertical: true,
    },
    implante: {
      desktop: "assets/frames/implante/desktop/f_{n}.webp", total: 144,
      mobile: "assets/frames/implante/mobile/f_{n}.webp", totalMobile: 144,
    },
    consulta: {
      desktop: "assets/frames/consulta/desktop/f_{n}.webp", total: 144,
      mobile: "assets/frames/consulta/mobile/f_{n}.webp", totalMobile: 144,
    },
  },
};

