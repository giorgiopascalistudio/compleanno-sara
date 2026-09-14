/* ============================================================
   CONFIGURAZIONE FIREBASE — da compilare prima di pubblicare il sito.
   Vedi le istruzioni passo-passo in README.md.

   1. Crea un progetto gratuito su https://console.firebase.google.com
   2. Aggiungi una "Web app" al progetto (icona </>)
   3. Copia i valori che Firebase ti mostra (firebaseConfig) qui sotto
   4. Crea un Realtime Database (modalità "test", vedi README per le regole)
   ============================================================ */

const FIREBASE_CONFIG = {
  apiKey: "INCOLLA_QUI_LA_TUA_API_KEY",
  authDomain: "INCOLLA_QUI.firebaseapp.com",
  databaseURL: "https://INCOLLA_QUI-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "INCOLLA_QUI",
  storageBucket: "INCOLLA_QUI.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxxxxxxxxxxxxxxxx",
};

/* Identificatore della partita: cambialo (es. "sara-2026") se vuoi
   riutilizzare lo stesso progetto Firebase per più feste/partite senza
   mischiare i dati. */
const GAME_ID = "compleanno-sara";
