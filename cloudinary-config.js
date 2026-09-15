/* ============================================================
   CONFIGURAZIONE CLOUDINARY — da compilare prima di pubblicare il sito
   (serve solo per la pagina foto.html). Vedi le istruzioni in README.md.

   1. Crea un account gratuito su https://cloudinary.com/users/register/free
      (nessuna carta di credito richiesta)
   2. Nella Dashboard copia il "Cloud name" (in alto)
   3. Vai su ⚙️ Settings → Upload → Upload presets → "Add upload preset"
      → Signing Mode: "Unsigned" → Save, e copia il nome del preset
   ============================================================ */

const CLOUDINARY_CONFIG = {
  cloudName: "INCOLLA_QUI_IL_CLOUD_NAME",
  uploadPreset: "INCOLLA_QUI_IL_NOME_DEL_PRESET",
};
