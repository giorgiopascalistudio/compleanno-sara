# 🎂✨ Quiz di compleanno — "Quanto conosci Sara?"

Sito per la festa di compleanno, con due funzioni:

- **Foto ricordo**: per tutta la serata il maxischermo mostra in loop le foto
  e i video (max 15s) che gli invitati scattano e caricano dal telefono (da
  soli o con Sara), inquadrando un piccolo QR sempre visibile in alto a
  sinistra. La prima volta che si inquadra questo QR viene chiesto nome e
  cognome (una sola volta per telefono): comparirà insieme a un'eventuale
  didascalia sotto ogni foto/video in proiezione. Sempre alla primissima
  apertura parte anche un tutorial guidato, passo per passo e diverso per
  iPhone/Android, che spiega come salvare la pagina nella schermata Home
  (così resta pronta per tutta la serata senza dover reinquadrare il QR
  ogni volta); si può saltare o richiamare in qualsiasi momento dal link
  "Come salvo questa pagina in Home?".
- **Quiz live**: quando l'host preme l'iconcina discreta sulla regia si apre
  la **lobby**: la regia mostra un QR dedicato con un contatore di chi è
  davvero pronto, e a chiunque sia sulla pagina foto compare un **popup**
  ("Il gioco sta per iniziare!") sopra alle foto, senza interromperle —
  si può ignorarlo con "Non ora" e continuare a scattare, oppure toccare
  "Partecipa" per entrare sul serio. **Solo chi tocca "Partecipa" (da lì o
  inquadrando il secondo QR) viene contato** dalla regia: il sito non dà mai
  per scontato che aver scattato una foto equivalga a voler giocare. Quando
  l'host vede che chi vuole giocare è dentro, preme "Inizia il gioco": parte
  per tutti un **timer di 10 minuti** (con un breve annuncio "Si comincia!"
  per chi era in attesa), poi arrivano le 30 domande su Sara, una alla
  volta. Alla fine (o prima, se tutti hanno già finito) il maxischermo
  mostra la **classifica generale** con podio e coriandoli, poi si torna
  alle foto. Un pulsante nella regia permette di uscire dal quiz e tornare
  alle foto in qualunque momento, anche a lobby aperta o a partita in corso.

Tema grafico **oro & argento**, con pioggia di glitter animata sullo sfondo e
titoli in "lamina metallica" che scintilla.

## Struttura dei file

| File | A cosa serve |
|---|---|
| `index.html` + `admin.js` | **Pagina principale** — la "regia": foto in loop, QR del quiz, avvio, timer e classifica live. È quella da aprire sul portatile collegato al proiettore. |
| `gioco.html` + `player.js` | Pagina del quiz che gli invitati aprono dal telefono — non si apre a mano, ci si arriva inquadrando il QR del quiz mostrato dalla regia. |
| `foto.html` + `capture.js` | Pagina per scattare/caricare una foto ricordo — ci si arriva inquadrando il QR piccolo sempre visibile in alto a sinistra sulla regia. |
| `photos.js` | Lo slideshow delle foto sulla regia (dissolvenza, 3s a foto, loop) |
| `quiz-data.js` | Le 30 domande e le risposte accettate (con varianti, maiuscole/minuscole e accenti ignorati) |
| `style.css` | Stile condiviso (palette oro/argento, animazioni) |
| `sparkles.js` | La pioggia di glitter animata sullo sfondo |
| `fullscreen.js` | Richiesta di schermo intero al primo "Inizia il gioco" |
| `firebase-config.js` | **Da compilare** — dati del progetto Firebase (elenco foto + dati del quiz, vedi sotto) |
| `cloudinary-config.js` | **Da compilare** — dati dell'account Cloudinary (dove vengono caricate le foto, vedi sotto) |
| `manifest.json` + `icon-192.png` / `icon-512.png` / `apple-touch-icon.png` | Fanno sì che `foto.html`/`gioco.html`, una volta salvate in Home, restino "come un'app" (niente barra del browser) anche passando dall'una all'altra |

Il sito è puramente statico (nessun server da installare). La sincronizzazione
in tempo reale (giocatori, risposte, elenco foto) usa **Firebase Realtime
Database**; le foto vere e proprie sono ospitate su **Cloudinary**. Entrambi
sono gratuiti per l'uso previsto qui e **non richiedono una carta di
credito**.

## 1. Crea il progetto Firebase (~5 minuti, gratis)

1. Vai su <https://console.firebase.google.com> ed effettua l'accesso con un
   account Google.
2. **Aggiungi progetto** → dagli un nome (es. `quiz-sara`) → puoi disattivare
   Google Analytics, non serve → **Crea progetto**.
3. Nella pagina del progetto clicca l'icona **`</>`** ("Aggiungi un'app web").
   Dai un nickname (es. `quiz-sara-web`) e clicca **Registra app**. *Non*
   serve Firebase Hosting.
4. Firebase mostra un blocco `firebaseConfig = { apiKey: "...", ... }`:
   copia questi valori, ti serviranno al punto 3 più sotto.
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

## 2. Crea l'account Cloudinary per le foto (~3 minuti, gratis)

1. Vai su <https://cloudinary.com/users/register/free> e registrati
   (basta un'email, **nessuna carta di credito richiesta**).
2. Nella **Dashboard** copia il **Cloud name** (in alto).
3. Vai su ⚙️ **Settings → Upload** → sezione **Upload presets** →
   **Add upload preset**.
4. Imposta **Signing Mode** su **Unsigned** (permette agli invitati di
   caricare foto senza dover fare login) → **Save**, e copia il nome del
   preset (es. `ml_default` o quello che gli dai tu).

Le foto caricate restano nella tua libreria Cloudinary anche dopo la festa:
puoi rivederle, scaricarle una per una o in blocco in qualsiasi momento dal
menu **Media Library** della dashboard — è lì che restano i ricordi.

## 3. Compila i file di configurazione

Apri `firebase-config.js` e incolla i valori copiati al punto 4 della
sezione Firebase, ad esempio:

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

Apri poi `cloudinary-config.js` e incolla cloud name e nome del preset:

```js
const CLOUDINARY_CONFIG = {
  cloudName: "il-tuo-cloud-name",
  uploadPreset: "il-tuo-preset",
};
```

## 4. Pubblica il sito (GitHub Pages)

In questa repository: **Settings → Pages → Build and deployment → Deploy
from a branch** → branch `main`, cartella `/ (root)` → **Save**. Dopo la
pubblicazione (1-2 minuti) le pagine saranno disponibili a:

- **Pagina regia (il link principale, da collegare al proiettore):**
  `https://<tuo-utente>.github.io/compleanno-sara/`
- **Pagina foto e pagina quiz:** non servono aperte a mano — la regia
  mostra da sola i rispettivi QR code.

Committa e pusha i due file di configurazione compilati: le chiavi di un
progetto web Firebase e il cloud name/preset Cloudinary **non sono segreti**
(sono normalmente visibili nel codice di qualsiasi sito che li usa) — la
sicurezza è affidata alle *regole*/impostazioni configurate sopra, non al
nascondere questi valori.

## 5. Prova prima della festa

1. Apri la pagina principale (`index.html` / la regia) sul portatile che
   collegherai al proiettore: di default mostra la schermata foto.
2. Dal tuo telefono inquadra il QR piccolo in alto a sinistra, scatta una
   foto di prova e caricala: dovrebbe comparire in loop sulla regia entro
   qualche secondo.
3. In alto a destra sulla regia c'è un'iconcina 🎮 poco visibile: premila
   per aprire la lobby (QR del quiz + conteggio + "Inizia il gioco"). Sul
   telefono che stava scattando foto dovrebbe comparire un popup "Il gioco
   sta per iniziare!" con i pulsanti "Partecipa" e "Non ora".
4. Tocca "Partecipa" dal popup (oppure inquadra il secondo QR, o apri
   `gioco.html` a mano, inserendo un nome di prova): solo da questo momento
   vieni contato — controlla che il numero sulla regia salga.
5. Sulla regia premi **"Inizia il gioco"**: sul telefono di prova dovrebbe
   comparire un breve "Si comincia!" e poi subito la prima domanda con il
   countdown.
6. Rispondi (premi "Avanti" per passare alla successiva, "Indietro" per
   tornare a modificare una risposta già data) fino all'ultima domanda dove
   "Avanti" diventa **"Invia le risposte"**. Il punteggio resta nascosto sul
   telefono finché il tempo non scade — puoi anche premere sulla regia
   **"🏁 Tutti hanno finito — mostra la classifica"** per non aspettare i 10
   minuti. Controlla che il nome compaia nel podio finale.
7. Premi l'icona **📸** in alto (o **"📸 Torna alle foto"** a fine partita, o
   l'icona **↺** per solo azzerare senza uscire) per tornare alla schermata
   foto e azzerare i dati del quiz prima dell'arrivo degli invitati.

## 6. Il giorno della festa

1. Collega il portatile al proiettore, apri la pagina principale (la regia)
   e mettila a schermo intero dal browser (F11 o equivalente).
2. Lascia che gli invitati scattino e carichino foto per tutta la serata,
   inquadrando il QR in alto a sinistra — appariranno in loop da sole.
3. Quando vuoi fare il quiz, premi l'iconcina 🎮 in basso a destra: compare
   il QR del quiz. Lascia entrare gli invitati (il conteggio sale in tempo
   reale), poi premi **"Inizia il gioco"**.
4. Dopo 10 minuti (o prima, con **"Tutti hanno finito"**) il proiettore
   mostra il podio con i coriandoli.
5. Premi **"📸 Torna alle foto"** per tornare alla modalità foto per il
   resto della serata — puoi ripetere il quiz quante volte vuoi.

## Personalizzare

- **Durata del timer:** cambia `DEFAULT_DURATION` (in millisecondi) in
  `admin.js` — è impostato a `600000` (10 minuti).
- **Domande e risposte accettate:** modifica l'array `QUIZ_QUESTIONS` in
  `quiz-data.js`. Ogni domanda ha una lista `accepted` di risposte valide:
  se l'ospite scrive una qualunque di quelle parole/frasi (senza contare
  maiuscole, minuscole, accenti o punteggiatura) la risposta è corretta —
  aggiungine quante ne vuoi per accettare più varianti.
- **Tempo di visione di ogni foto:** cambia `HOLD_MS` (e `OUT_MS` per la
  dissolvenza in uscita) all'inizio di `photos.js` — di default 3000ms.
- **Colori/font:** i colori sono definiti come variabili CSS all'inizio di
  `style.css` (`--gold-1`, `--gold-2`, `--silver-1`, `--silver-2`, ...).
- **Densità/velocità del glitter:** in `index.html`/`gioco.html`/`foto.html`
  la riga `initGlitter("glitter", { density: ... })` controlla quante
  particelle disegnare; velocità di caduta e sfarfallio sono in
  `sparkles.js`.
- **Le foto NON vengono cancellate** da "Nuova partita" / "Torna alle
  foto" (solo giocatori e punteggi del quiz): restano per tutta la festa,
  e su Cloudinary anche dopo.
- **Più partite con lo stesso progetto Firebase:** cambia `GAME_ID` in
  `firebase-config.js` per isolare i dati di una nuova festa senza
  toccare quelli vecchi (foto comprese).
