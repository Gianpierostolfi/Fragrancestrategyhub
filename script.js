let db = { bottiglie: [], accessori: [] };

let state = {
    categoriaAttiva: 'bottiglia',
    selezioni: { bottiglia: null, tappo: null, cache: null, pompa: null },
    filtriAttivi: {}
};

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
    state.filtriAttivi = {}; 
    inizializzaSidebar();
    aggiornaFiltri();
    applicaFiltri();
}

function aggiornaFiltri() {
    const container = document.getElementById('filtri-dinamici');
    if(!container) return;
    container.innerHTML = "";
    const prodotti = (state.categoriaAttiva === 'bottiglia') ? db.bottiglie : db.accessori.filter(a => a.Categoria?.toLowerCase() === state.categoriaAttiva);
    
    const colonneFiltro = (state.categoriaAttiva === 'bottiglia') ? ['Capacita', 'Forma', 'Imboccatura'] : ['Materiale', 'Colore'];

    colonneFiltro.forEach(col => {
        const valoriUnici = [...new Set(prodotti.map(p => p[col]))].filter(v => v).sort();
        if(valoriUnici.length > 0) {
            const select = document.createElement('select');
            select.className = "filtro-select";
            select.innerHTML = `<option value="">Tutti ${col}</option>` + valoriUnici.map(v => `<option value="${v}">${v}</option>`).join('');
            select.onchange = (e) => {
                state.filtriAttivi[col] = e.target.value;
                applicaFiltri();
            };
            container.appendChild(select);
        }
    });
}

function applicaFiltri() {
    let prodotti = (state.categoriaAttiva === 'bottiglia') ? db.bottiglie : db.accessori.filter(a => a.Categoria?.toLowerCase() === state.categoriaAttiva);
    Object.keys(state.filtriAttivi).forEach(col => {
        if(state.filtriAttivi[col]) {
            prodotti = prodotti.filter(p => p[col] === state.filtriAttivi[col]);
        }
    });
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
            return `<div class="miniature"><img src="assets/${prod.Immagine}"><span>${prod.Codice}</span><button class="remove-btn" onclick="rimuoviSelezione('${cat}', event)">×</button></div>`;
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
    caricaCategoria('bottiglia');
}

function gestisciSblocchi() {
    const nomeInput = document.getElementById('input-nome-preventivo');
    const nome = nomeInput ? nomeInput.value.trim() : "";
    const btn = document.getElementById('btn-genera-render');
    if(btn) btn.disabled = !(nome && state.selezioni.bottiglia && state.selezioni.tappo);
}

// --- LOGICA RENDER PER SOVRAPPOSIZIONE (LAYERED) ---
function generaRender() {
    const nomeProgetto = document.getElementById('input-nome-preventivo').value || "Mio Progetto";
    cambiaPagina('preventivo-page');
    document.getElementById('titolo-preventivo-dinamico').innerText = nomeProgetto;

    const infoDiv = document.getElementById('contenuto-preventivo');
    
    // Funzione helper per ottenere il nome del file _render
    const getRenderImg = (prod) => {
        if(!prod || !prod.Immagine) return null;
        return `assets/${prod.Immagine.replace('.png', '_render.png')}`;
    };

    // Creazione HTML con z-index progressivo
    let layersHTML = `<div class="render-overlay-container">`;
    
    // 1. Bottiglia (Sotto)
    if(state.selezioni.bottiglia) {
        layersHTML += `<img src="${getRenderImg(state.selezioni.bottiglia)}" class="render-layer" style="z-index: 1;">`;
    }
    // 2. Pompa
    if(state.selezioni.pompa) {
        layersHTML += `<img src="${getRenderImg(state.selezioni.pompa)}" class="render-layer" style="z-index: 2;">`;
    }
    // 3. Cache
    if(state.selezioni.cache) {
        layersHTML += `<img src="${getRenderImg(state.selezioni.cache)}" class="render-layer" style="z-index: 3;">`;
    }
    // 4. Tappo (Sopra)
    if(state.selezioni.tappo) {
        layersHTML += `<img src="${getRenderImg(state.selezioni.tappo)}" class="render-layer" style="z-index: 4;">`;
    }
    
    layersHTML += `</div>`;

    // Riepilogo Scelte
    let riepilogoHTML = `<div style="max-width: 600px; margin: 0 auto; text-align: left;">
        <h3>Riepilogo Configurazione:</h3>
        <ul style="list-style: none; padding: 20px 0;">
            ${state.selezioni.bottiglia ? `<li><strong>Bottiglia:</strong> ${state.selezioni.bottiglia.Codice} - ${state.selezioni.bottiglia.Descrizione}</li>` : ''}
            ${state.selezioni.tappo ? `<li><strong>Tappo:</strong> ${state.selezioni.tappo.Codice} - ${state.selezioni.tappo.Descrizione}</li>` : ''}
            ${state.selezioni.pompa ? `<li><strong>Pompa:</strong> ${state.selezioni.pompa.Codice}</li>` : ''}
            ${state.selezioni.cache ? `<li><strong>Cache:</strong> ${state.selezioni.cache.Codice}</li>` : ''}
        </ul>
    </div>`;

    infoDiv.innerHTML = layersHTML + riepilogoHTML;
}

function cambiaPagina(id) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
    
    // Gestione visibilità tab preventivo
    const tabPrev = document.getElementById('tab-preventivo');
    if(id === 'preventivo-page' && tabPrev) {
        tabPrev.style.display = "block";
        tabPrev.classList.add('active');
    }
}