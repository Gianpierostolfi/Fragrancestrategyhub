let db = { bottiglie: [], accessori: [] };

let state = {
    categoriaAttiva: 'bottiglia',
    selezioni: { bottiglia: null, tappo: null, cache: null, pompa: null },
    filtriAttivi: {}
};

// CONFIGURAZIONE AI
const parte1 = "hf_GmllffTwtJqP"; 
const parte2 = "yzepGhzDifcXYcecVBAXvH"; 
const HF_TOKEN = (parte1 + parte2).trim();
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
    } catch (e) { return []; }
}

function inizializzaSidebar() {
    const categorie = ['bottiglia', 'tappo', 'cache', 'pompa'];
    const sidebar = document.getElementById('sidebar-categorie');
    if(sidebar) {
        sidebar.innerHTML = categorie.map(cat => `
            <div class="cat-item ${state.categoriaAttiva === cat ? 'active' : ''}" onclick="caricaCategoria('${cat}')">
                ${cat.toUpperCase()}
            </div>
        `).join('');
    }
}

function caricaCategoria(cat) {
    state.categoriaAttiva = cat;
    inizializzaSidebar();
    const prodotti = (cat === 'bottiglia') ? db.bottiglie : db.accessori.filter(a => a.Categoria?.toLowerCase() === cat);
    mostraProdotti(prodotti);
}

function mostraProdotti(prodotti) {
    const grid = document.getElementById('grid-prodotti');
    if(grid) {
        grid.innerHTML = prodotti.map(p => `
            <div class="item-card" onclick="selezionaProdotto('${state.categoriaAttiva}', '${p.Codice}')">
                <img src="assets/${p.Immagine}" onerror="this.src='https://via.placeholder.com/150'">
                <h4>${p.Codice}</h4>
                <p>${p.Descrizione || ''}</p>
            </div>
        `).join('');
    }
}

function selezionaProdotto(cat, codice) {
    const lista = (cat === 'bottiglia') ? db.bottiglie : db.accessori;
    state.selezioni[cat] = lista.find(p => p.Codice === codice);
    aggiornaMiniature();
    gestisciSblocchi();
}

function aggiornaMiniature() {
    const container = document.getElementById('miniatures-container');
    if(container) {
        container.innerHTML = Object.entries(state.selezioni).map(([cat, prod]) => {
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
}

function rimuoviSelezione(cat, event) {
    event.stopPropagation();
    state.selezioni[cat] = null;
    aggiornaMiniature();
    gestisciSblocchi();
}

function resetConfiguratore() {
    state.selezioni = { bottiglia: null, tappo: null, cache: null, pompa: null };
    const inputNome = document.getElementById('input-nome-preventivo');
    if(inputNome) inputNome.value = "";
    aggiornaMiniature();
    gestisciSblocchi();
}

function gestisciSblocchi() {
    const nomeInput = document.getElementById('input-nome-preventivo');
    const nome = nomeInput ? nomeInput.value.trim() : "";
    const btn = document.getElementById('btn-genera-render');
    if(btn) {
        btn.disabled = !(nome && state.selezioni.bottiglia && state.selezioni.tappo);
    }
}

async function generaRender() {
    const nomeProgetto = document.getElementById('input-nome-preventivo').value || "Mio Progetto";
    cambiaPagina('preventivo-page');

    document.getElementById('titolo-preventivo-dinamico').innerText = nomeProgetto;
    const statusDiv = document.getElementById('status-ai');
    const imgRender = document.getElementById('img-render-ai');
    const infoDiv = document.getElementById('contenuto-preventivo');

    statusDiv.innerHTML = "L'AI sta creando il tuo flacone personalizzato... <br><small>(Attendi circa 20 secondi)</small>";
    if(imgRender) imgRender.style.display = "none";

    let html = "<h3>Dettagli Configurazione:</h3><ul style='list-style:none; padding:0;'>";
    if (state.selezioni.bottiglia) html += `<li><strong>Bottiglia:</strong> ${state.selezioni.bottiglia.Codice}</li>`;
    if (state.selezioni.tappo) html += `<li><strong>Tappo:</strong> ${state.selezioni.tappo.Codice}</li>`;
    if (state.selezioni.cache) html += `<li><strong>Cache:</strong> ${state.selezioni.cache.Codice}</li>`;
    if (state.selezioni.pompa) html += `<li><strong>Pompa:</strong> ${state.selezioni.pompa.Codice}</li>`;
    html += "</ul>";
    infoDiv.innerHTML = html;

    const descBottiglia = state.selezioni.bottiglia ? state.selezioni.bottiglia.Forma : "luxury";
    const descTappo = state.selezioni.tappo ? state.selezioni.tappo.Descrizione : "elegant cap";
    const promptAI = `A professional studio photography of a luxury perfume bottle named '${nomeProgetto}', ${descBottiglia} glass shape, high-end ${descTappo}, elegant lighting, white background, 8k resolution`;

    try {
        const response = await fetch(MODEL_URL, {
            method: "POST",
            headers: { "Authorization": `Bearer ${HF_TOKEN}` },
            body: JSON.stringify({ inputs: promptAI })
        });

        if (!response.ok) throw new Error("Il server AI è occupato. Riprova tra un momento.");

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);

        statusDiv.innerText = "Render completato con successo!";
        if(imgRender) {
            imgRender.src = imageUrl;
            imgRender.style.display = "block";
        }
    } catch (error) {
        statusDiv.innerHTML = `<span style="color:red;">Errore: ${error.message}</span><br><button onclick="generaRender()" style="margin-top:10px;">Riprova</button>`;
    }
}

function cambiaPagina(id) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    
    const target = document.getElementById(id);
    if(target) target.classList.add('active');

    const tabPrev = document.getElementById('tab-preventivo');
    if(id === 'preventivo-page' && tabPrev) {
        tabPrev.style.display = "block";
        tabPrev.classList.add('active');
    }
}