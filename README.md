# 🎂✨ Quiz di compleanno — "Quanto conosci Sara?"

Gioco live per il compleanno: gli invitati inquadrano un QR code dal telefono,
inseriscono il loro nome ed entrano in un quiz di 30 domande su Sara. Quando
l'host avvia il gioco parte per tutti un **timer di 10 minuti**; alla fine la
pagina "regia" (da collegare al proiettore) mostra la **classifica generale**
in tempo reale, con podio e coriandoli per il/la vincitore/trice.

Tema grafico **oro & argento**, con glitter animato di sottofondo e titoli in
"lamina metallica" che scintilla.

## Struttura dei file

| File | A cosa serve |
|---|---|
| `index.html` + `player.js` | Pagina che gli invitati aprono dal telefono (quella puntata dal QR code) |
| `admin.html` + `admin.js` | Pagina "regia": QR code, pulsante di avvio, timer e classifica live — da proiettare |
| `quiz-data.js` | Le 30 domande e le risposte accettate (con varianti, maiuscole/minuscole e accenti ignorati) |
| `style.css` | Stile condiviso (palette oro/argento, animazioni) |
| `sparkles.js` | Il glitter animato sullo sfondo (canvas leggero, si disattiva da solo se il dispositivo ha "riduci animazioni" attivo) |
| `firebase-config.js` | **Da compilare** con i dati del tuo progetto Firebase (vedi sotto) |

Il sito è puramente statico (nessun server da installare): la sincronizzazione
in tempo reale tra i telefoni degli invitati e il proiettore è affidata a
**Firebase Realtime Database** (gratuito, nessuna carta di credito richiesta
per l'uso previsto qui).

## 1. Crea il progetto Firebase (~5 minuti, gratis)

1. Vai su <https://console.firebase.google.com> ed effettua l'accesso con un
   account Google.
2. **Aggiungi progetto** → dagli un nome (es. `quiz-sara`) → puoi disattivare
   Google Analytics, non serve → **Crea progetto**.
3. Nella pagina del progetto clicca l'icona **`</>`** ("Aggiungi un'app web").
   Dai un nickname (es. `quiz-sara-web`) e clicca **Registra app**. *Non*
   serve Firebase Hosting.
4. Firebase mostra un blocco `firebaseConfig = { apiKey: "...", ... }`:
   copia questi valori, ti serviranno al punto 2 più sotto.
5. Nel menu a sinistra apri **Compilazione → Realtime Database** →
   **Crea database** → scegli una località (es. `europe-west1`) → avvia in
   **modalità test**.
6. Nella scheda **Regole** del Realtime Database incolla questo (limita
   lettura/scrittura al solo percorso usato dal gioco):

   ```json
   {
     "rules": {
       "games": {
         "$gameId": {
           ".read": true,
           ".write": true
         }
       }
     }
   }
   ```

   Queste regole non richiedono login (gli invitati non devono creare
   account): chiunque abbia il link può leggere/scrivere solo i dati del
   gioco. Va benissimo per un evento di una sera; **dopo la festa** valuta di
   eliminare il progetto Firebase (o di rimettere le regole di default) per
   non lasciare il database aperto a tempo indeterminato.

## 2. Compila `firebase-config.js`

Apri `firebase-config.js` e incolla i valori copiati al punto 4 sopra, ad
esempio:

```js
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD...",
  authDomain: "quiz-sara.firebaseapp.com",
  databaseURL: "https://quiz-sara-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "quiz-sara",
  storageBucket: "quiz-sara.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890",
};
```

`databaseURL` è visibile nella scheda **Realtime Database** della console
Firebase (in alto, sopra ai tuoi dati).

## 3. Pubblica il sito (GitHub Pages)

In questa repository: **Settings → Pages → Build and deployment → Deploy
from a branch** → branch `main`, cartella `/ (root)` → **Save**. Dopo la
pubblicazione (1-2 minuti) le pagine saranno disponibili a:

- **Pagina invitati (quella del QR code):**
  `https://<tuo-utente>.github.io/compleanno-sara/`
- **Pagina regia (da collegare al proiettore):**
  `https://<tuo-utente>.github.io/compleanno-sara/admin.html`

Committa e pusha `firebase-config.js` compilato: le chiavi di un progetto
web Firebase **non sono segrete** (sono normalmente visibili nel codice di
qualsiasi sito che usa Firebase) — la sicurezza è affidata alle *regole* del
database impostate al punto 1, non al nascondere questi valori.

## 4. Prova prima della festa

1. Apri `admin.html` sul portatile che collegherai al proiettore.
2. Dal tuo telefono (o da un altro dispositivo) apri `index.html`, inserisci
   un nome di prova ed entra.
3. Su `admin.html` premi **"Inizia il gioco"**: sul telefono di prova
   dovrebbe apparire subito il quiz con il countdown.
4. Rispondi a qualche domanda, premi **"Invia le risposte"** (o aspetta i 10
   minuti) e controlla che il nome compaia nella classifica live e poi nel
   podio finale su `admin.html`.
5. Premi **"↺ Nuova partita"** su `admin.html` per azzerare tutto prima
   dell'arrivo degli invitati (cancella tutti i giocatori e i punteggi).

## 5. Il giorno della festa

1. Genera e stampa (o mostra su un secondo schermo) il QR code: è quello
   mostrato in `admin.html` prima dell'avvio, oppure genera un QR da
   `https://<tuo-utente>.github.io/compleanno-sara/` con qualsiasi
   generatore di QR code.
2. Collega il portatile al proiettore e apri `admin.html`.
3. Lascia entrare gli invitati (il numero di "invitati pronti" sale in
   tempo reale).
4. Premi **"Inizia il gioco"**: partono contemporaneamente il quiz su tutti
   i telefoni e il countdown sul proiettore.
5. Dopo 10 minuti (o se premi manualmente fine sul countdown) il proiettore
   mostra automaticamente il podio con i coriandoli.

## Personalizzare

- **Durata del timer:** cambia `DEFAULT_DURATION` (in millisecondi) in
  `admin.js` — è impostato a `600000` (10 minuti).
- **Domande e risposte accettate:** modifica l'array `QUIZ_QUESTIONS` in
  `quiz-data.js`. Ogni domanda ha una lista `accepted` di risposte valide:
  se l'ospite scrive una qualunque di quelle parole/frasi (senza contare
  maiuscole, minuscole, accenti o punteggiatura) la risposta è corretta —
  aggiungine quante ne vuoi per accettare più varianti.
- **Colori/font:** i colori sono definiti come variabili CSS all'inizio di
  `style.css` (`--gold-1`, `--gold-2`, `--silver-1`, `--silver-2`, ...).
- **Densità del glitter:** in `index.html`/`admin.html` la riga
  `initGlitter("glitter", { density: ... })` controlla quante particelle
  disegnare (più alto = più denso). Il glitter si disattiva da solo se il
  dispositivo ha l'opzione "riduci animazioni" attiva.
- **Più partite con lo stesso progetto Firebase:** cambia `GAME_ID` in
  `firebase-config.js` per isolare i dati di una nuova partita senza
  toccare quelli vecchi.
