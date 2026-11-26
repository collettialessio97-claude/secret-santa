// ============================================================
//  CONFIGURAZIONE SECRET SANTA: modifica solo questo file
// ============================================================
export default {
  titolo: "Cena di Natale",
  ufficio: "Account e Processi",

  // Budget del regalo, in euro
  budgetMin: 4,
  budgetMax: 10,

  // Giorno e ora della cena con lo scambio dei regali (fuso orario italiano: +01:00)
  dataScambio: "2026-12-16T20:00:00+01:00",

  // Dove si fa la cena / lo scambio dei regali
  evento: {
    ristorante: "ACCASA · Dinner & Live Music",
    indirizzo: "Via Carlo Ignazio Giulio 29, 10122 Torino",
    durataOre: 3, // per l'evento da aggiungere al calendario
    telefono: "331 189 7929",
    // Indicazioni per arrivare: una voce per riga, con un'emoji all'inizio
    indicazioni: [
      "📍 Zona Quadrilatero Romano, in pieno centro",
    ],
    note: "",
    // Cosa c'è in programma oltre alla cena (appare come "badge")
    extra: ["🎤 Musica dal vivo & karaoke"],
  },

  // Menù della serata. Le portate con più piatti vengono mostrate "a scelta".
  menu: {
    prezzo: 30,
    portate: [
      { nome: "Antipasto", piatti: ["Vitello tonnato"] },
      {
        nome: "Primo",
        piatti: [
          "Tagliolini alla monferrina",
          "Garganelli in crema di zucca, porcini, guanciale e panna",
        ],
      },
      {
        nome: "Secondo",
        piatti: [
          "Tortino di cicoriella e patate con crema di parmigiano",
          "Trancio di salmone con crema di zabaione limonato e julienne di zucchine",
        ],
      },
      { nome: "Dolce", piatti: ["Dolci"] },
    ],
    incluso: [
      "🍷 Una bottiglia di vino ogni 4 persone",
      "🥂 Spumante ogni 4 persone",
      "💧 Acqua",
      "🍞 Coperto",
    ],
  },

  // Elenco dei partecipanti (nomi unici, scritti come vuoi che appaiano)
  partecipanti: [
    "Alessio Colletti",
    "Alessio Papaianni",
    "Fabrizio Farris",
    "Alberto Farronato",
    "Alessia Bertola",
    "Chiara Matteoda",
    "Joseph Taverniti",
    "Lorenzo Chiaberto",
    "Lorenzo Invernizzi",
    "Marzia Allasia",
    "Riccardo Marchi",
    "Valentina Martongelli",
    "Francesca Peirano",
    "Stefania Rinaldi",
    "Sonia Morisco",
    "Andrea Cerro",
    "Diego Penna",
    "Federica Marasco",
    "Annalisa Bellobuono",
    "Francesca Colombo",
    "Beatriz Tortora",
    "Marzia Refano",
    "Ruben Ippoliti",
    "Giovanni Coco",
    "Alice Bulgarelli",
    "Gloria Bricco",
  ],

  // Coppie che NON devono pescarsi a vicenda (in nessuna delle due direzioni).
  // Es. partner, oppure chi si è pescato l'anno scorso. Lascia [] se nessuna.
  esclusioni: [],
};
