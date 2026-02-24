let db = { bottiglie: [], accessori: [] };

let state = {
    categoriaAttiva: 'bottiglia',
    selezioni: { bottiglia: null, tappo: null, cache: null, pompa: null },
    filtriAttivi: {}
};

// CONFIGURAZIONE AI
const HF_TOKEN = "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";
const MODEL_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";

window.onload = async () => {
    db.bottiglie = await caricaCSV('list_bottiglie2.csv');
    db.accessori = await caricaCSV('list_cap2.csv');
    inizializzaSidebar();
    caricaCategoria('bottiglia');
    
    const inputNome = document.getElementById('input-nome-preventivo');
    if(inputNome) inputNome.addEventListener('input', gestisciSblocchi);
};

async function caricaCSV(file) {
    try {
        const response = await fetch(file);
        const text = await response.text();
        const rows = text.split('\n').map(r => r.trim()).filter(r => r !== "");
        if (rows.length === 0) return [];
        const header = rows[0].split(';').map(h => h.trim()); 
        return rows.slice(1).map(row => {
            const values = row.split(';');
            let obj = {};
            header.forEach((h, i) => obj[h] = values[i] || "");
            return obj;
        });
    } catch (e) { console.error("Errore caricamento CSV:", file); return []; }
}

function inizializzaSidebar() {
    const categorie = ['bottiglia', 'tappo', 'cache', 'pompa'];
    const container = document.getElementById('sidebar-categorie');
    container.innerHTML = categorie.map(cat => `
        <div class="cat-item ${state.categoriaAttiva === cat ? 'active' : ''}" onclick="caricaCategoria('${cat}')">
            ${cat.toUpperCase()}
        </div>
    `).join('');
}

function caricaCategoria(cat) {
    state.categoriaAttiva = cat;
    inizializzaSidebar();
    const prodotti = (cat === 'bottiglia') ? db.bottiglie : db.accessori.filter(a => a.Categoria?.toLowerCase() === cat);
    const grid = document.getElementById('grid-prodotti');
    
    grid.innerHTML = prodotti.map(p => `
        <div class="item-card" onclick="selezionaProdotto('${cat}', '${p.Codice}')">
            <img src="assets/${p.Immagine}" onerror="this.src='https://via.placeholder.com/150'">
            <h4>${p.Codice}</h4>
            <p>${p.Descrizione || ''}</p>
        </div>
    `).join('');
}

function selezionaProdotto(cat, codice) {
    const lista = (cat === 'bottiglia') ? db.bottiglie : db.accessori;
    const prod = lista.find(p => p.Codice === codice);
    state.selezioni[cat] = prod;
    aggiornaMiniature();
}

function aggiornaMiniature() {
    const container = document.getElementById('miniatures-container');
    container.innerHTML = Object.values(state.selezioni).filter(s => s !== null).map(s => `
        <div class="miniature">
            <img src="assets/${s.Immagine}">
            <span>${s.Codice}</span>
        </div>
    `).join('');
}

function gestisciSblocchi() {
    // Logica opzionale per abilitare/disabilitare tasti
}

async function generaRender() {
    const nomeProgetto = document.getElementById('input-nome-preventivo').value || "Nuova Fragranza";
    
    // 1. Sposta l'utente sulla pagina preventivo
    cambiaPagina('preventivo-page');

    // 2. Prepara l'interfaccia preventivo
    document.getElementById('titolo-preventivo-dinamico').innerText = nomeProgetto;
    const statusDiv = document.getElementById('status-ai');
    const imgRender = document.getElementById('img-render-ai');
    const infoDiv = document.getElementById('contenuto-preventivo');

    statusDiv.style.display = "block";
    statusDiv.innerText = "L'AI sta creando il tuo flacone personalizzato (circa 20 sec)...";
    if(imgRender) imgRender.style.display = "none";

    // 3. Scrivi i componenti scelti
    let htmlInfo = `<h3>Componenti del Progetto:</h3><ul>`;
    for (const [key, value] of Object.entries(state.selezioni)) {
        if(value) htmlInfo += `<li><strong>${key.toUpperCase()}:</strong> ${value.Codice} - ${value.Descrizione || ''}</li>`;
    }
    htmlInfo += `</ul>`;
    infoDiv.innerHTML = htmlInfo;

    // 4. Prompt AI basato sulle selezioni
    const descBottiglia = state.selezioni.bottiglia ? state.selezioni.bottiglia.Descrizione : "luxury";
    const promptAI = `Professional 3D render of a luxury perfume bottle named ${nomeProgetto}, ${descBottiglia} design, elegant cap, studio lighting, 8k resolution, cinematic composition`;

    try {
        const response = await fetch(MODEL_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
                inputs: promptAI,
                parameters: { negative_prompt: "blurry, text, watermark, deformed", guidance_scale: 7.5 }
            }),
        });

        if (!response.ok) throw new Error("Errore durante la generazione");

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);

        statusDiv.innerText = "Render completato con successo!";
        if (imgRender) {
            imgRender.src = imageUrl;
            imgRender.style.display = "block";
        }
    } catch (error) {
        statusDiv.innerHTML = `<span style="color:red;">Errore: ${error.message}</span>`;
    }
}

function cambiaPagina(id) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    
    const target = document.getElementById(id);
    if(target) target.classList.add('active');

    if(id === 'preventivo-page') {
        document.getElementById('tab-preventivo').style.display = "inline-block";
        document.getElementById('tab-preventivo').classList.add('active');
    }
}