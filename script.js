let db = { bottiglie: [], accessori: [] };

let state = {
    categoriaAttiva: 'bottiglia',
    selezioni: { bottiglia: null, tappo: null, cache: null, pompa: null, sottofamiglia: null },
    filtriAttivi: {}
};

window.onload = async () => {
    db.bottiglie = await caricaCSV('list_bottiglie2.csv');
    db.accessori = await caricaCSV('list_cap2.csv');
    db.essenze = await caricaCSV('list_essenze.csv');
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
                        <img src="assets/${sel.Codice}.png">
                        <p><b>${cat.toUpperCase()}</b><br>${sel.Codice}</p>`;
            
            if (cat === 'bottiglia') {
                html += `<span class="ml-info">${sel['Formato (ml)']} ml</span>`;
            }
            
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

function generaRender() {
    const nome = document.getElementById('input-nome-preventivo').value;
    document.getElementById('titolo-preventivo-dinamico').innerText = nome;
    
    const contenitore = document.getElementById('contenuto-preventivo');
    
    const getRenderPath = (item) => {
        if (!item || !item.render) return null;
        return `assets/${item.render}.png`;
    };

    const imgBottiglia = getRenderPath(state.selezioni.bottiglia);
    const imgTappo = getRenderPath(state.selezioni.tappo);

    let html = `
        <div class="preventivo-layout" style="display: flex; gap: 40px; margin-top: 40px; align-items: start; text-align: left;">
            
            <div id="render-final-container" style="flex: 1; min-height: 500px; background: radial-gradient(circle, #ffffff 0%, #f2f2f2 100%); border: 1px solid #eee; display: flex; align-items: center; justify-content: center; position: relative; border-radius: 10px; overflow: hidden;">
                ${imgBottiglia ? `<img id="img-render-bottiglia" src="${imgBottiglia}" style="position: absolute; width: 85%; height: 85%; object-fit: contain; z-index: 1;">` : ''}
                ${imgTappo ? `<img id="img-render-tappo" src="${imgTappo}" style="position: absolute; width: 85%; height: 85%; object-fit: contain; z-index: 2;">` : ''}
                ${(!imgBottiglia && !imgTappo) ? '<span style="color: #999;">Immagini render non configurate nel CSV</span>' : ''}
            </div>

            <div class="preventivo-tecnico" style="flex: 1;">
                <button onclick="window.print()" style="float:right; background:#d9534f; color:white; border:none; padding:5px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px;">SALVA PDF</button>

                <h3 style="margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 5px; font-size: 16px; text-transform: uppercase;">Specifiche Tecniche</h3>
                <table style="width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 13px;">
                    <thead>
                        <tr style="background-color: #f4f4f4; border-bottom: 2px solid #333;">
                            <th style="padding: 10px; text-align: left;">Componente</th>
                            <th style="padding: 10px; text-align: left;">Descrizione</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Bottiglia</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${state.selezioni.bottiglia?.Descrizione || '-'}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Tappo</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${state.selezioni.tappo?.Descrizione || '-'}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Cache</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${state.selezioni.cache?.Descrizione || '-'}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Pompa</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${state.selezioni.pompa?.Descrizione || '-'}</td></tr>
                        <tr style="background: #f9f9f9; font-weight: bold;">
                            <td style="padding: 10px; border-top: 1px solid #333;">ESSENZA</td>
                            <td style="padding: 10px; border-top: 1px solid #333; color: #1b4b6b;">${state.selezioni.sottofamiglia ? state.selezioni.sottofamiglia.toUpperCase() : 'NON SELEZIONATA'}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="color-picker-panel">
                    <label style="display:block; font-weight:bold; margin-bottom:10px; font-size:12px;">COLORAZIONE COMPONENTI:</label>
                    <div class="target-selector">
                        <button class="target-btn active" onclick="setTarget('bottiglia', this)">Bottiglia</button>
                        <button class="target-btn" onclick="setTarget('tappo', this)">Tappo</button>
                        <button class="target-btn" onclick="setTarget('entrambi', this)">Entrambi</button>
                    </div>
                    <div class="palette-grid">
                        <div class="color-dot" style="background:transparent; border:1px solid #ccc;" onclick="applyColor('transparent', this)"></div>
                        <div class="color-dot" style="background:#FFD700;" onclick="applyColor('#FFD700', this)"></div>
                        <div class="color-dot" style="background:#C0C0C0;" onclick="applyColor('#C0C0C0', this)"></div>
                        <div class="color-dot" style="background:#B87333;" onclick="applyColor('#B87333', this)"></div>
                        <div class="color-dot" style="background:#000000;" onclick="applyColor('#000000', this)"></div>
                        <div class="color-dot" style="background:#FF0000;" onclick="applyColor('#FF0000', this)"></div>
                        <div class="color-dot" style="background:#0000FF;" onclick="applyColor('#0000FF', this)"></div>
                        <div class="color-dot" style="background:#008000;" onclick="applyColor('#008000', this)"></div>
                        <div class="color-dot" style="background:#FFC0CB;" onclick="applyColor('#FFC0CB', this)"></div>
                        <div class="color-dot" style="background:#800080;" onclick="applyColor('#800080', this)"></div>
                    </div>
                    <label style="display:block; font-size:11px; margin-bottom:5px; font-weight:bold;">INTENSITÀ COLORE (SLIDER):</label>
                    <input type="range" class="intensity-slider" min="0" max="1" step="0.1" value="0.5" oninput="updateIntensity(this.value)">
                </div>

                <div style="margin-top: 25px;">
                    <label style="display: block; font-weight: bold; margin-bottom: 8px; font-size: 14px;">NOTE E SPECIFICHE TECNICHE:</label>
                    <textarea id="note-preventivo" placeholder="Inserisci qui le specifiche richieste dall'utente..." 
                              style="width: 100%; height: 120px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-family: sans-serif; resize: none;"></textarea>
                </div>
            </div>
        </div>
    `;

    contenitore.innerHTML = html;
    document.getElementById('tab-preventivo').style.display = 'block';
    cambiaPagina('preventivo-page');
}

function resetConfiguratore() {
    state.selezioni = { bottiglia: null, tappo: null, cache: null, pompa: null };
    state.filtriAttivi = {};
    document.getElementById('input-nome-preventivo').value = "";
    document.getElementById('tab-preventivo').style.display = 'none';
    aggiornaMiniature();
    gestisciSblocchi();
    caricaCategoria('bottiglia');
    cambiaPagina('crea-profumo');
}

function cambiaPagina(id) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    
    const target = document.getElementById(id);
    if (target) {
        target.classList.add('active');
    }
    
    document.querySelectorAll('.nav-tab').forEach(tab => {
        if (tab.getAttribute('onclick') && tab.getAttribute('onclick').includes(id)) {
            tab.classList.add('active');
        }
    });

    const tabPrev = document.getElementById('tab-preventivo');
    if (id === 'preventivo-page' && tabPrev) {
        tabPrev.style.display = 'block';
        tabPrev.classList.add('active');
    }
}

function gestisciSblocchi() {
    const nomePrev = document.getElementById('input-nome-preventivo').value.trim();
    const sel = state.selezioni;
    
    const btnTappo = document.querySelector('button[onclick*="tappo"]');
    const btnCache = document.querySelector('button[onclick*="cache"]');
    const btnPompa = document.querySelector('button[onclick*="pompa"]');
    const btnEssenza = document.getElementById('btn-essenza');
    const btnRender = document.querySelector('button[onclick="generaRender()"]');

    if (sel.bottiglia) {
        if (btnTappo) btnTappo.disabled = false;
        if (btnCache) btnCache.disabled = false;
        if (btnPompa) btnPompa.disabled = false;
    } else {
        if (btnTappo) btnTappo.disabled = true;
        if (btnCache) btnCache.disabled = true;
        if (btnPompa) btnPompa.disabled = true;
    }

    if (nomePrev !== "") {
        if (btnEssenza) btnEssenza.disabled = false;
        if (btnRender) btnRender.disabled = false;
    } else {
        if (btnEssenza) btnEssenza.disabled = true;
        if (btnRender) btnRender.disabled = true;
    }
}

function mostraMenuEssenze() {
    const btnEssenza = document.getElementById('btn-essenza');
    const vecchioMenu = document.getElementById('container-dropdown-essenze');
    if (vecchioMenu) {
        vecchioMenu.remove();
        return;
    }

    const container = document.createElement('div');
    container.id = 'container-dropdown-essenze';
    container.style.cssText = 'padding:10px; background:#f4f4f4; border-radius:5px; margin-top:5px; border:1px solid #ccc;';

    const famiglie = [...new Set(db.essenze.map(item => item['famiglia olfattiva']))].filter(f => f);
    
    container.innerHTML = `
        <select id="select-famiglia" onchange="aggiornaSottofamiglie()" style="width:100%; padding:8px; margin-bottom:10px;">
            <option value="">Scegli Famiglia...</option>
            ${famiglie.map(f => `<option value="${f}">${f.replace(/_/g, ' ')}</option>`).join('')}
        </select>
        <select id="select-sottofamiglia" onchange="mostraSceltaEssenza()" style="width:100%; padding:8px; display:none;">
            <option value="">Scegli Sottofamiglia...</option>
        </select>
    `;

    btnEssenza.after(container);
}

function aggiornaSottofamiglie() {
    const famigliaScelta = document.getElementById('select-famiglia').value;
    const selectSotto = document.getElementById('select-sottofamiglia');
    
    if (!famigliaScelta) {
        selectSotto.style.display = 'none';
        return;
    }

    const sottofamiglie = [...new Set(db.essenze
        .filter(item => item['famiglia olfattiva'] === famigliaScelta)
        .map(item => item.Sottofamiglia))].filter(s => s);
    
    selectSotto.innerHTML = `<option value="">Scegli Sottofamiglia...</option>` + 
                            sottofamiglie.map(s => `<option value="${s}">${s}</option>`).join('');
    
    selectSotto.style.display = 'block';
}

function mostraSceltaEssenza() {
    const sotto = document.getElementById('select-sottofamiglia').value;
    const notesContainer = document.getElementById('notes-container');
    state.selezioni.sottofamiglia = sotto; 

    if (sotto && notesContainer) {
        notesContainer.innerHTML = `
            <div style="padding:15px; background:#1b4b6b; color:white; border-radius:5px; margin-top:10px;">
                <strong>Sottofamiglia selezionata:</strong> ${sotto}
            </div>`;
    }
}

// --- LOGICA DI COLORAZIONE RENDER AGGIORNATA ---
let colorState = {
    target: 'bottiglia',
    color: 'transparent',
    opacity: 0.5
};

function setTarget(target, btn) {
    colorState.target = target;
    document.querySelectorAll('.target-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function applyColor(hex, dot) {
    colorState.color = hex;
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    if(dot) dot.classList.add('active');
    
    setTimeout(() => {
        updateRenderFilters();
    }, 50);
}

function updateIntensity(val) {
    colorState.opacity = val;
    updateRenderFilters();
}

function updateRenderFilters() {
    const imgBot = document.getElementById('img-render-bottiglia');
    const imgTap = document.getElementById('img-render-tappo');
    
    if (colorState.color === 'transparent') {
        if (imgBot) {
            imgBot.style.filter = 'none';
            imgBot.style.mixBlendMode = 'normal';
        }
        if (imgTap) {
            imgTap.style.filter = 'none';
            imgTap.style.mixBlendMode = 'normal';
        }
        return;
    }

    const rgba = hexToRgba(colorState.color, colorState.opacity);

    // Filtro per l'effetto vetro: drop-shadow per la tinta + contrasto per far risaltare i riflessi
    const glassFilter = `drop-shadow(0 0 0 ${rgba}) contrast(1.2) brightness(1.1)`;

    if (colorState.target === 'bottiglia' || colorState.target === 'entrambi') {
        if (imgBot) {
            imgBot.style.filter = glassFilter;
            // 'multiply' o 'hue' sono i migliori per l'effetto vetro colorato
            imgBot.style.mixBlendMode = 'multiply'; 
        }
    }
    if (colorState.target === 'tappo' || colorState.target === 'entrambi') {
        if (imgTap) {
            imgTap.style.filter = glassFilter;
            imgTap.style.mixBlendMode = 'multiply';
        }
    }
}

function hexToRgba(hex, alpha) {
    let r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}