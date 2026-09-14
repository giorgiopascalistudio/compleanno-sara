/* ============================================================
   Quiz di compleanno — domande, risposte accettate e matching.
   Ogni domanda ha un array `accepted`: se l'inviata dall'ospite
   contiene (come parola/frase intera) UNA qualsiasi delle varianti
   elencate, la risposta è considerata corretta. Maiuscole, minuscole,
   accenti e punteggiatura non contano.
   ============================================================ */

function normalizeAnswer(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // rimuove accenti
    .toLowerCase()
    .replace(/['’`]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isCorrectAnswer(userInput, accepted) {
  const candidate = " " + normalizeAnswer(userInput) + " ";
  if (candidate.trim() === "") return false;
  return accepted.some((variant) => {
    const v = " " + normalizeAnswer(variant) + " ";
    return candidate.includes(v);
  });
}

const QUIZ_QUESTIONS = [
  { q: "Qual è il mio nome completo?", accepted: ["Sara Anna"] },
  { q: "Qual è il mio segno zodiacale?", accepted: ["Vergine"] },
  { q: "Qual è il mio colore preferito?", accepted: ["Rosso"] },
  { q: "Qual è la mia stagione preferita?", accepted: ["Autunno"] },
  { q: "Dolce o salato?", accepted: ["Dolce"] },
  { q: "Qual è il mio piatto preferito?", accepted: ["Pasta"] },
  { q: "Qual è il mio cocktail preferito?", accepted: ["Gin lemon", "Gin limone", "Gin e lemon"] },
  { q: "Qual è il mio pregio più grande?", accepted: ["Disponibile", "Generosa"] },
  { q: "Qual è il mio difetto più evidente?", accepted: ["Permalosa"] },
  { q: "Se fossi un personaggio Disney, quale sarei?", accepted: ["Paperino", "Brontolo"] },
  { q: "Sono più puntuale o ritardataria?", accepted: ["Puntuale"] },
  { q: "Preferisco fare o ricevere sorprese?", accepted: ["Farle", "Fare", "Fare sorprese", "Fare le sorprese"] },
  { q: "Sono una persona che organizza tutto o improvvisa?", accepted: ["Organizza tutto", "Organizza", "Organizzare tutto", "Organizzatrice"] },
  { q: "Qual è la cosa che mi fa arrabbiare più facilmente?", accepted: ["Ritardo", "Ritardatari", "Ritardataria", "Chi è in ritardo", "Cambia idea", "Cambiare idea", "Chi cambia idea"] },
  { q: "Sono più impulsiva o riflessiva?", accepted: ["Impulsiva"] },
  { q: "Piango facilmente durante i film?", accepted: ["Si", "Sì", "Siii", "Certo", "Ovviamente"] },
  { q: "Se devo scegliere una serata, preferisco uscire o stare a casa?", accepted: ["Stare a casa", "Stare in casa", "Restare a casa", "Casa"] },
  { q: "Il mio cantante preferito?", accepted: ["Ligabue", "Ultimo"] },
  { q: "La mia serie TV preferita?", accepted: ["Grey's Anatomy", "Grey Anatomy", "Anatomia di Grey"] },
  { q: "Il mio periodo dell'anno preferito?", accepted: ["Natale", "Il mio compleanno", "Compleanno"] },
  { q: "Alba o tramonto?", accepted: ["Tramonto"] },
  { q: "Il nome di un mio eventuale figlio maschio?", accepted: ["Pietro"] },
  { q: "Di cosa ho più paura in assoluto?", accepted: ["Spazio", "Dello spazio"] },
  { q: "Se potessi trasferirmi domani, dove andrei?", accepted: ["Roma"] },
  { q: "Se vincessi un milione di euro, quale sarebbe il primo acquisto?", accepted: ["Naso nuovo", "Naso", "Baguette di Fendi", "Baguette Fendi", "Fendi"] },
  { q: "Se potessi cenare con un personaggio famoso anche non più presente sulla terra, chi sceglierei?", accepted: ["Heath Ledger", "Ledger"] },
  { q: "Cosa faccio appena mi sveglio?", accepted: ["Vado in bagno", "Bagno"] },
  { q: "Quando esco, qual è la cosa che dimentico più spesso?", accepted: ["Le chiavi di casa", "Chiavi di casa", "Chiavi"] },
  { q: "Qual è la frase che dico più spesso?", accepted: ["Sono stanca", "Stanca"] },
  { q: "Quale canzone mi fa alzare subito a ballare?", accepted: ["Aria Caddrhipulina", "Caddrhipulina", "Aria"] },
];
