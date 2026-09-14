/* ============================================================
   CONFIGURAZIONE FIREBASE — da compilare prima di pubblicare il sito.
   Vedi le istruzioni passo-passo in README.md.

   1. Crea un progetto gratuito su https://console.firebase.google.com
   2. Aggiungi una "Web app" al progetto (icona </>)
   3. Copia i valori che Firebase ti mostra (firebaseConfig) qui sotto
   4. Crea un Realtime Database (modalità "test", vedi README per le regole)
   ============================================================ */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCs9Jjlrv-RCBF8xbD44m0QIUwGijNfOYM",
  authDomain: "compleanno-sara.firebaseapp.com",
  databaseURL: "https://compleanno-sara-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "compleanno-sara",
  storageBucket: "compleanno-sara.firebasestorage.app",
  messagingSenderId: "670625628558",
  appId: "1:670625628558:web:4477d466ce230e9f8c24df",
};

/* Identificatore della partita: cambialo (es. "sara-2026") se vuoi
   riutilizzare lo stesso progetto Firebase per più feste/partite senza
   mischiare i dati. */
const GAME_ID = "compleanno-sara";
