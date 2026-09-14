# 🎂✨ Quiz di compleanno — "Quanto conosci Sara?"

Gioco live per il compleanno: gli invitati inquadrano un QR code dal telefono,
inseriscono il loro nome ed entrano in un quiz di 30 domande su Sara, una alla
volta. Quando l'host avvia il gioco parte per tutti un **timer di 10 minuti**;
alla fine la pagina "regia" (da collegare al proiettore) mostra la
**classifica generale** in tempo reale, con podio e coriandoli per il/la
vincitore/trice.

Tema grafico **oro & argento**, con pioggia di glitter animata sullo sfondo e
titoli in "lamina metallica" che scintilla.

## Struttura dei file

| File | A cosa serve |
|---|---|
| `index.html` + `admin.js` | **Pagina principale** — la "regia": QR code, pulsante di avvio, timer e classifica live. È quella da aprire sul portatile collegato al proiettore. |
| `gioco.html` + `player.js` | Pagina che gli invitati aprono dal telefono — non si apre a mano, ci si arriva inquadrando il QR mostrato dalla regia. |
| `quiz-data.js` | Le 30 domande e le risposte accettate (con varianti, maiuscole/minuscole e accenti ignorati) |
| `style.css` | Stile condiviso (palette oro/argento, animazioni) |
| `sparkles.js` | La pioggia di glitter animata sullo sfondo (canvas leggero, si disattiva da solo se il dispositivo ha "riduci animazioni" attivo) |
| `fullscreen.js` | Richiesta di schermo intero al primo tocco/click |
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

- **Pagina regia (il link principale, da collegare al proiettore):**
  `https://<tuo-utente>.github.io/compleanno-sara/`
- **Pagina invitati:** non serve aprirla a mano — la regia mostra il suo QR
  code (punta a `https://<tuo-utente>.github.io/compleanno-sara/gioco.html`)

Committa e pusha `firebase-config.js` compilato: le chiavi di un progetto
web Firebase **non sono segrete** (sono normalmente visibili nel codice di
qualsiasi sito che usa Firebase) — la sicurezza è affidata alle *regole* del
database impostate al punto 1, non al nascondere questi valori.

## 4. Prova prima della festa

1. Apri la pagina principale (`index.html` / la regia) sul portatile che
   collegherai al proiettore.
2. Dal tuo telefono (o da un altro dispositivo) inquadra il QR mostrato lì
   — oppure apri `gioco.html` a mano per una prova — inserisci un nome di
   prova ed entra.
3. Sulla regia premi **"Inizia il gioco"**: sul telefono di prova dovrebbe
   apparire subito la prima domanda con il countdown.
4. Rispondi (premi "Avanti" per passare alla successiva, "Indietro" per
   tornare a modificare una risposta già data) fino all'ultima domanda dove
   "Avanti" diventa **"Invia le risposte"** — controlla che il nome compaia
   nella classifica live e poi nel podio finale sulla regia.
5. Premi **"↺ Nuova partita"** sulla regia per azzerare tutto prima
   dell'arrivo degli invitati (cancella tutti i giocatori e i punteggi).

## 5. Il giorno della festa

1. Collega il portatile al proiettore e apri la pagina principale (la
   regia) — è il link da tenere a portata di mano, gli invitati non lo
   toccano mai: entrano solo inquadrando il QR che la regia mostra.
2. Premi ⛶ in alto per mettere la regia a schermo intero (o lascia che
   parta da sola al primo "Inizia il gioco").
3. Lascia entrare gli invitati (il numero di "invitati pronti" sale in
   tempo reale mentre scansionano il QR).
4. Premi **"Inizia il gioco"**: partono contemporaneamente il quiz su tutti
   i telefoni e il countdown sul proiettore.
5. Dopo 10 minuti (o se il tempo scade prima) il proiettore mostra
   automaticamente il podio con i coriandoli.

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
- **Densità/velocità del glitter:** in `index.html`/`gioco.html` la riga
  `initGlitter("glitter", { density: ... })` controlla quante particelle
  disegnare; velocità di caduta e sfarfallio sono in `sparkles.js`. Il
  glitter si disattiva da solo se il dispositivo ha l'opzione "riduci
  animazioni" attiva.
- **Più partite con lo stesso progetto Firebase:** cambia `GAME_ID` in
  `firebase-config.js` per isolare i dati di una nuova partita senza
  toccare quelli vecchi.
