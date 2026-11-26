# 🎁 Secret Santa dell'ufficio

Ognuno sceglie il proprio nome, imposta un PIN di 4 cifre, scarta il pacco e scopre a chi fa il regalo.
Può anche lasciare un messaggio con qualche indizio per il proprio Babbo Natale segreto.

## Configurazione
Modifica solo **`config.mjs`**: partecipanti, esclusioni, budget e data dello scambio.
I colori sono in cima a `public/style.css` (variabili `--blue-*`, `--gold`, ecc.).

> ⚠️ L'estrazione parte al **primo accesso**, quindi sistema i nomi **prima** di condividere il link.
> Se cambi i nomi dopo, devi fare "Rifai estrazione" dalla pagina admin.

## Prova in locale
```bash
npm install
npm run dev        # http://localhost:8888  ·  admin: /admin.html con chiave "dev"
```

## Pubblicazione su Netlify
Netlify Drop (il trascina-e-rilascia) **non** va bene, perché l'app usa una Netlify Function.
1. Carica la cartella su un repository GitHub, poi su Netlify scegli *Add new site → Import from Git*.
   In alternativa: `npx netlify-cli deploy --prod`
2. In *Site configuration → Environment variables* aggiungi `ADMIN_KEY` con una password a tua scelta.
3. I dati (abbinamenti, PIN cifrati, messaggi) sono salvati in Netlify Blobs: nessun database da configurare.

## Area admin: `/admin.html`
Mostra chi è entrato e chi ha lasciato un messaggio, ma **non** gli abbinamenti.
Da qui puoi resettare il PIN di chi lo ha dimenticato (il messaggio resta) o rifare l'estrazione.

## Come funziona l'estrazione
È un unico giro (A→B→C→…→A): nessuno pesca se stesso, non ci sono scambi reciproci e le esclusioni vengono rispettate.
