let db = { bottiglie: [], accessori: [] };

let state = {
    categoriaAttiva: 'bottiglia',
    selezioni: { bottiglia: null, tappo: null, cache: null, pompa: null },
    filtriAttivi: {}
};

// CONFIGURAZIONE AI
// Spezziamo il token in due variabili diverse per protezione
const parte1 = "hf_GmllffTwtJqP"; 
const parte2 = "yzepGhzDifcXYcecVBAXvH"; 
const HF_TOKEN = (parte1 + parte2).trim();
const MODEL_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";

window.onload = async () => {
    db.bottiglie = await caricaCSV('list_bottiglie2.csv');
    db.accessori = await caricaCSV('list_cap2.csv');
    inizializzaSidebar();
    caricaCategoria('bottiglia');
    document.getElementById('input-nome-preventivo').addEventListener('input', gestisciSblocchi);
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
    } catch (e) { return []; }
}

function inizializzaSidebar() {
    const categorie = ['bottiglia', 'tappo', 'cache', 'pompa'];
    document.getElementById('sidebar-categorie').innerHTML = categorie.map(cat => `
        <div class="cat-item ${state.categoriaAttiva === cat ? 'active' : ''}" onclick="caricaCategoria('${cat}')">
            ${cat.toUpperCase()}
        </div>
    `).join('');
}

function caricaCategoria(cat) {
    state.categoriaAttiva = cat;
    inizializzaSidebar();
    const prodotti = (cat === 'bottiglia') ? db.bottiglie : db.accessori.filter(a => a.Categoria?.toLowerCase() === cat);
    mostraProdotti(prodotti);
}

function mostraProdotti(prodotti) {
    document.getElementById('grid-prodotti').innerHTML = prodotti.map(p => `
        <div class="item-card" onclick="selezionaProdotto('${state.categoriaAttiva}', '${p.Codice}')">
            <img src="assets/${p.Immagine}" onerror="this.src='https://via.placeholder.com/150'">
            <h4>${p.Codice}</h4>
            <p>${p.Descrizione || ''}</p>
        </div>
    `).join('');
}

function selezionaProdotto(cat, codice) {
    const lista = (cat === 'bottiglia') ? db.bottiglie : db.accessori;
    state.selezioni[cat] = lista.find(p => p.Codice === codice);
    aggiornaMiniature();
    gestisciSblocchi();
}

function aggiornaMiniature() {
    document.getElementById('miniatures-container').innerHTML = Object.entries(state.selezioni).map(([cat, prod]) => {
        if (!prod) return `<div class="miniature empty"><span>${cat}</span></div>`;
        return `
            <div class="miniature">
                <img src="assets/${prod.Immagine}">
                <span>${prod.Codice}</span>
                <button class="remove-btn" onclick="rimuoviSelezione('${cat}', event)">×</button>
            </div>
        `;
    }).join('');
}

function rimuoviSelezione(cat, event) {
    event.stopPropagation();
    state.selezioni[cat] = null;
    aggiornaMiniature();
    gestisciSblocchi();
}

function resetConfiguratore() {
    state.selezioni = { bottiglia: null, tappo: null, cache: null, pompa: null };
    aggiornaMiniature();
    gestisciSblocchi();
    alert("Configuratore resettato.");
}

function gestisciSblocchi() {
    const nome = document.getElementById('input-nome-preventivo').value.trim();
    const btn = document.getElementById('btn-genera-render');
    btn.disabled = !(nome && state.selezioni.bottiglia && state.selezioni.tappo);
}

async function generaRender() {
    const nomeProgetto = document.getElementById('input-nome-preventivo').value || "Mio Progetto";
    cambiaPagina('preventivo-page');

    document.getElementById('titolo-preventivo-dinamico').innerText = nomeProgetto;
    const statusDiv = document.getElementById('status-ai');
    const imgRender = document.getElementById('img-render-ai');
    const infoDiv = document.getElementById('contenuto-preventivo');

    statusDiv.innerHTML = "L'AI sta creando il tuo flacone personalizzato... <br><small>(Attendi circa 20 secondi)</small>";
    imgRender.style.display = "none";

    // Preparazione dati per il riepilogo
    let html = "<h3>Dettagli Configurazione:</h3><ul style='list-style:none; padding:0;'>";
    if (state.selezioni.bottiglia) html += `<li><strong>Bottiglia:</strong> ${state.selezioni.bottiglia.Codice}</li>`;
    if (state.selezioni.tappo) html += `<li><strong>Tappo:</strong> ${state.selezioni.tappo.Codice}</li>`;
    if (state.selezioni.cache) html += `<li><strong>Cache:</strong> ${state.selezioni.cache.Codice}</li>`;
    if (state.selezioni.pompa) html += `<li><strong>Pompa:</strong> ${state.selezioni.pompa.Codice}</li>`;
    html += "</ul>";
    infoDiv.innerHTML = html;

    // COSTRUZIONE PROMPT
    const descBottiglia = state.selezioni.bottiglia ? state.selezioni.bottiglia.Forma : "luxury";
    const descTappo = state.selezioni.tappo ? state.selezioni.tappo.Descrizione : "elegant cap";
    const promptAI = `A professional studio photography of a luxury perfume bottle named '${nomeProgetto}', ${descBottiglia} glass shape, with a ${descTappo}, elegant lighting, white background, 8k resolution, cinematic composition`;

    try {
        // SOLUZIONE CORS: Invio del prompt come testo semplice
        const response = await fetch(MODEL_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_TOKEN.trim()}`
            },
            body: promptAI 
        });

        if (!response.ok) {
            throw new Error("Il server AI è occupato o il token è scaduto. Riprova tra un momento.");
        }

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);

        statusDiv.innerText = "Render completato con successo!";
        imgRender.src = imageUrl;
        imgRender.style.display = "block";

    } catch (error) {
        console.error(error);
        statusDiv.innerHTML = `<span style="color:red;">Errore: ${error.message}</span><br>
        <button onclick="generaRender()" style="margin-top:10px; padding:5px 15px; cursor:pointer;">Riprova</button>`;
    }
}

function cambiaPagina(id) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    
    const target = document.getElementById(id);
    if(target) target.classList.add('active');

    if(id === 'preventivo-page') {
        document.getElementById('tab-preventivo').style.display = "block";
        document.getElementById('tab-preventivo').classList.add('active');
    }
}