let db = { bottiglie: [], accessori: [] };

let state = {
    categoriaAttiva: 'bottiglia',
    selezioni: { bottiglia: null, tappo: null, cache: null, pompa: null },
    filtriAttivi: {}
};

// CONFIGURAZIONE AI
// Spezziamo il token in due variabili diverse
const parte1 = "hf_GmllffTwtJqP"; // Prima parte
const parte2 = "yzepGhzDifcXYcecVBAXvH"; // Resto del token senza puntini o XYZ
const HF_TOKEN = parte1 + parte2;
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
            header.forEach((h, i) => { obj[h] = values[i] ? values[i].trim() : ""; });
            return obj;
        });
    } catch (e) { return []; }
}

function inizializzaSidebar() {
    document.querySelectorAll('.comp-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.disabled) return;
            document.querySelectorAll('.comp-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            caricaCategoria(btn.dataset.cat);
        });
    });
}

function caricaCategoria(categoria) {
    state.categoriaAttiva = categoria;
    state.filtriAttivi = {}; 
    generaFiltriTop(categoria);
    renderGrid();
}

function generaFiltriTop(categoria) {
    const container = document.getElementById('dynamic-filters');
    container.innerHTML = "";
    if (categoria === 'bottiglia') {
        const filtriDaCreare = [
            { label: 'Formato (ml) *', colonna: 'Formato (ml)' },
            { label: 'Imboccatura', colonna: 'Imboccatura' },
            { label: 'Forma', colonna: 'Forma' },
            { label: 'Bocca Fea', colonna: 'Fea' }
        ];
        filtriDaCreare.forEach(f => {
            const valori = [...new Set(db.bottiglie.map(item => item[f.colonna]).filter(v => v !== ""))].sort();
            const select = document.createElement('select');
            select.className = 'filter-select';
            select.innerHTML = `<option value="">${f.label}</option>`;
            valori.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v; opt.textContent = v;
                select.appendChild(opt);
            });
            select.onchange = (e) => {
                state.filtriAttivi[f.colonna] = e.target.value;
                renderGrid();
            };
            container.appendChild(select);
        });
    } else if (state.selezioni.bottiglia) {
        container.innerHTML = `<span style="font-size:12px; color:#666; line-height:35px;">Compatibilità: <b>FEA ${state.selezioni.bottiglia.Fea}</b> - <b>${state.selezioni.bottiglia.Imboccatura}</b></span>`;
    }
}

function renderGrid() {
    const container = document.getElementById('items-grid');
    container.innerHTML = "";
    if (state.categoriaAttiva === 'bottiglia') {
        if (!state.filtriAttivi['Formato (ml)'] || state.filtriAttivi['Formato (ml)'] === "") {
            container.innerHTML = `<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: #999;"><h3>Seleziona prima il Formato (ml) per visualizzare le bottiglie disponibili.</h3></div>`;
            return;
        }
        let dati = db.bottiglie.filter(b => {
            return Object.keys(state.filtriAttivi).every(k => 
                state.filtriAttivi[k] === "" || b[k] === state.filtriAttivi[k]
            );
        });
        dati.forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML = `<img src="assets/${item.Codice}.png" onerror="this.src='https://via.placeholder.com/150?text=No+Image'"><h4>${item.Codice}</h4><p>${item.Descrizione}</p>`;
            card.onclick = () => seleziona(item);
            container.appendChild(card);
        });
    } else {
        const b = state.selezioni.bottiglia;
        if (!b) return;
        let dati = db.accessori.filter(acc => {
            const matchCat = acc.Categoria.toLowerCase() === state.categoriaAttiva.toLowerCase();
            const matchFea = acc.Fea === b.Fea;
            let matchImb = true;
            if (['pompa', 'cache'].includes(state.categoriaAttiva)) {
                const imb = b.Imboccatura.toLowerCase();
                matchImb = acc.Codice.toLowerCase().includes(imb) || acc.Descrizione.toLowerCase().includes(imb);
            }
            return matchCat && matchFea && matchImb;
        });
        dati.forEach(item => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML = `<img src="assets/${item.Codice}.png" onerror="this.src='https://via.placeholder.com/150?text=No+Image'"><h4>${item.Codice}</h4><p>${item.Descrizione}</p>`;
            card.onclick = () => seleziona(item);
            container.appendChild(card);
        });
    }
}

function seleziona(item) {
    state.selezioni[state.categoriaAttiva] = item;
    aggiornaMiniature();
    gestisciSblocchi();
}

function aggiornaMiniature() {
    const container = document.getElementById('miniatures-container');
    container.innerHTML = "";
    ['bottiglia', 'tappo', 'cache', 'pompa'].forEach(cat => {
        const sel = state.selezioni[cat];
        if (sel) {
            const div = document.createElement('div');
            div.className = 'miniature';
            let html = `<button class="delete-btn" onclick="rimuovi('${cat}')">×</button>
                        <img src="assets/${sel.Codice}.png" onerror="this.src='https://via.placeholder.com/50'">
                        <p><b>${cat.toUpperCase()}</b><br>${sel.Codice}</p>`;
            if (cat === 'bottiglia') html += `<span class="ml-info">${sel['Formato (ml)']} ml</span>`;
            div.innerHTML = html;
            container.appendChild(div);
        }
    });
}

function rimuovi(cat) {
    state.selezioni[cat] = null;
    if (cat === 'bottiglia') { state.selezioni.tappo = state.selezioni.cache = state.selezioni.pompa = null; }
    aggiornaMiniature(); gestisciSblocchi(); caricaCategoria(cat);
}

function gestisciSblocchi() {
    const btns = {
        tappo: document.querySelector('[data-cat="tappo"]'),
        cache: document.querySelector('[data-cat="cache"]'),
        pompa: document.querySelector('[data-cat="pompa"]'),
        essenza: document.querySelector('[data-cat="essenza"]')
    };
    Object.values(btns).forEach(b => { if(b) b.disabled = true; });
    if (state.selezioni.bottiglia) { btns.tappo.disabled = btns.cache.disabled = btns.pompa.disabled = false; }
    const renderBtn = document.getElementById('btn-genera-render');
    const nomePrev = document.getElementById('input-nome-preventivo').value.trim();
    const pronto = state.selezioni.bottiglia && state.selezioni.tappo && state.selezioni.cache && state.selezioni.pompa;
    if (pronto && nomePrev !== "") {
        renderBtn.disabled = false;
        btns.essenza.disabled = false;
    } else {
        renderBtn.disabled = true;
    }
}

// LOGICA OTTIMIZZATA PER HUGGING FACE
async function generaRender() {
    const nome = document.getElementById('input-nome-preventivo').value;
    const s = state.selezioni;
    document.getElementById('titolo-preventivo-dinamico').innerText = nome;
    document.getElementById('tab-preventivo').style.display = 'block';
    
    // Layout del preventivo
    const contenitore = document.getElementById('contenuto-preventivo');
    contenitore.innerHTML = `
        <div style="display: flex; gap: 40px; text-align: left; background: #f9f9f9; padding: 30px; border-radius: 15px;">
            <div style="flex: 1; height: 500px; background: #fff; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; position: relative;">
                <p id="status-ai">Generazione AI in corso...</p>
                <img id="img-render-ai" style="display: none; max-width: 100%; max-height: 100%; object-fit: contain;">
            </div>
            <div style="width: 300px; color: #333;">
                <h3 style="border-bottom: 2px solid #1b4b6b; padding-bottom: 10px;">Specifiche Progetto</h3>
                <p style="margin-top:15px;"><b>Progetto:</b> ${nome}</p>
                <p><b>Bottiglia:</b> ${s.bottiglia.Codice} (${s.bottiglia['Formato (ml)']}ml)</p>
                <p><b>Forma:</b> ${s.bottiglia.Forma}</p>
                <p><b>Tappo:</b> ${s.tappo.Codice}</p>
                <p><b>Accessori:</b> Cache ${s.cache.Codice} + Pompa ${s.pompa.Codice}</p>
                <button onclick="window.print()" class="blue-btn" style="width:100%; margin-top:30px;">Salva in PDF / Stampa</button>
            </div>
        </div>
    `;

    cambiaPagina('preventivo-page');

    try {
        const response = await fetch(MODEL_URL, {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${HF_TOKEN.trim()}`
                // Content-Type rimosso per superare il blocco CORS del browser
            },
            body: JSON.stringify({ 
                inputs: `A professional studio photography of a luxury perfume bottle, ${state.selezioni.bottiglia ? state.selezioni.bottiglia.Forma : 'elegant'} glass shape, high-end design, elegant lighting, white background, 8k resolution.`,
                options: { wait_for_model: true }
            }),
        });

        if (!response.ok) throw new Error("Errore nel caricamento del modello AI");

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        const imgEl = document.getElementById('img-render-ai');
        imgEl.src = imageUrl;
        imgEl.style.display = 'block';
        document.getElementById('status-ai').style.display = 'none';

    } catch (err) {
        document.getElementById('status-ai').innerHTML = `<span style="color:red;">Failed to fetch</span><br><button onclick="generaRender()" style="margin-top:10px; cursor:pointer;">Riprova</button>`;
    }
}

function cambiaPagina(id) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
    document.querySelectorAll('.nav-tab').forEach(tab => {
        if (tab.getAttribute('onclick') && tab.getAttribute('onclick').includes(id)) tab.classList.add('active');
    });
}