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
            // Descrizione card invariata come da script originale
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
            
            // Se è la bottiglia, aggiungo il formato SOTTO la miniatura
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

function gestisciSblocchi() {
    const nomePrev = document.getElementById('input-nome-preventivo').value.trim();
    const sel = state.selezioni;
    
    // 1. Sblocco PACKAGING: se hai scelto la bottiglia, accendi Tappo, Cache e Pompa
    const btnTappo = document.querySelector('button[data-cat="tappo"]');
    const btnCache = document.querySelector('button[data-cat="cache"]');
    const btnPompa = document.querySelector('button[data-cat="pompa"]');

    if (sel.bottiglia) {
        if (btnTappo) btnTappo.disabled = false;
        if (btnCache) btnCache.disabled = false;
        if (btnPompa) btnPompa.disabled = false;
    }

    // 2. Sblocco FUNZIONI FINALI: se hai scritto il nome, accendi Essenza e Render
    const btnEssenza = document.getElementById('btn-essenza');
    const btnRender = document.querySelector('button[onclick="generaRender()"]');

    if (nomePrev !== "") {
        if (btnEssenza) btnEssenza.disabled = false;
        if (btnRender) btnRender.disabled = false;
    } else {
        if (btnEssenza) btnEssenza.disabled = true;
        if (btnRender) btnRender.disabled = true;
    }
}

function generaRender() {
    const nome = document.getElementById('input-nome-preventivo').value;
    document.getElementById('titolo-preventivo-dinamico').innerText = nome;
    
    const contenitore = document.getElementById('contenuto-preventivo');
    
    // Funzione interna per recuperare i percorsi corretti (render o mask) dalle colonne del CSV
    const getAssetPath = (item, type) => {
        if (!item) return null;
        // Se type è 'render' prende la colonna render, se è 'mask' prende la tua nuova colonna mask
        const fileName = item[type]; 
        return fileName ? `assets/${fileName}.png` : null;
    };

    const imgBottiglia = getAssetPath(state.selezioni.bottiglia, 'render');
    const imgTappo = getAssetPath(state.selezioni.tappo, 'render');

    // LEGGE LE NUOVE COLONNE MASK DEI TUOI CSV
    const maskBottiglia = getAssetPath(state.selezioni.bottiglia, 'mask');
    const maskTappo = getAssetPath(state.selezioni.tappo, 'mask');

    let html = `
        <div class="preventivo-layout" style="display: flex; gap: 30px; margin-top: 20px; align-items: start; text-align: left;">
            
            <div id="render-final-container" style="flex: 1.2; min-height: 450px; background: radial-gradient(circle, #ffffff 0%, #f2f2f2 100%); border: 1px solid #eee; display: flex; align-items: center; justify-content: center; position: relative; border-radius: 10px; overflow: hidden;">
                
                ${imgBottiglia ? `<img src="${imgBottiglia}" style="position: absolute; width: 85%; height: 85%; object-fit: contain; z-index: 1;">` : ''}
                ${imgTappo ? `<img src="${imgTappo}" style="position: absolute; width: 85%; height: 85%; object-fit: contain; z-index: 3;">` : ''}
                
                ${maskBottiglia ? `<div id="mask-bottiglia-layer" data-src="${maskBottiglia}" style="position: absolute; width: 85%; height: 85%; z-index: 2; mix-blend-mode: multiply; opacity: 0; pointer-events: none; transition: opacity 0.3s; background-size: contain; background-position: center; background-repeat: no-repeat;"></div>` : ''}
                ${maskTappo ? `<div id="mask-tappo-layer" data-src="${maskTappo}" style="position: absolute; width: 85%; height: 85%; z-index: 4; mix-blend-mode: multiply; opacity: 0; pointer-events: none; transition: opacity 0.3s; background-size: contain; background-position: center; background-repeat: no-repeat;"></div>` : ''}
                
                <div id="container-etichetta-trascinabile" style="position: absolute; z-index: 10; cursor: move; display: none; line-height: 0;">
            <img id="etichetta-upload" src="" style="width: 100px; height: auto; pointer-events: none;">
        </div>
                
                ${(!imgBottiglia && !imgTappo) ? '<span style="color: #999;">Seleziona i componenti per il render</span>' : ''}
            </div>

            <div class="preventivo-tecnico" style="flex: 1; display: flex; flex-direction: column; gap: 15px;">
                <div style="background: #fff; padding: 10px; border-radius: 8px; border: 1px solid #eee;">
                    <h3 style="margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px; font-size: 14px; text-transform: uppercase;">Specifiche Tecniche</h3>
                    <table style="width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 12px;">
                        <tbody>`;

    const categorie = ['bottiglia', 'tappo', 'cache', 'pompa'];
    categorie.forEach(cat => {
        const item = state.selezioni[cat];
        if (item) {
            html += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 5px; font-weight: bold;">${cat.toUpperCase()}</td><td style="padding: 5px;">${item.Descrizione || '-'}</td></tr>`;
        }
    });

    html += `
                        <tr style="background: #f9f9f9; font-weight: bold;"><td style="padding: 5px;">ESSENZA</td><td style="padding: 5px; color: #1b4b6b;">${state.selezioni.sottofamiglia ? state.selezioni.sottofamiglia.toUpperCase() : 'DA DEFINIRE'}</td></tr>
                        </tbody>
                    </table>
                </div>

                <div>
                    <label style="display: block; font-weight: bold; margin-bottom: 3px; font-size: 10px; color: #666;">NOTE E SPECIFICHE UTENTE:</label>
                    <textarea id="note-preventivo" style="width: 100%; height: 50px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 11px; resize: none;"></textarea>
                </div>

                <div id="controllo-colore-container" style="padding: 10px; border: 1px solid #ddd; border-radius: 8px; background: #fefefe;">
                    <p style="font-weight: bold; font-size: 10px; margin-bottom: 8px; text-transform: uppercase;">Personalizzazione Colore:</p>
                    
                    <div style="display: flex; gap: 4px; margin-bottom: 8px;">
                        <button onclick="selezionaParteColore('bottiglia')" class="btn-color-target active" id="target-bottiglia" style="flex: 1; padding: 4px; font-size: 9px; cursor: pointer; border: 1px solid #1b4b6b; background: #fff;">BOTTIGLIA</button>
                        <button onclick="selezionaParteColore('tappo')" class="btn-color-target" id="target-tappo" style="flex: 1; padding: 4px; font-size: 9px; cursor: pointer; border: 1px solid #ccc; background: #fff;">TAPPO</button>
                        <button onclick="selezionaParteColore('entrambi')" class="btn-color-target" id="target-entrambi" style="flex: 1; padding: 4px; font-size: 9px; cursor: pointer; border: 1px solid #ccc; background: #fff;">ENTRAMBI</button>
                    </div>

                    <div id="palette-colori" style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; margin-bottom: 8px;">
                        <div onclick="applicaColore('transparent')" style="aspect-ratio: 1; border-radius: 50%; border: 1px solid #ccc; background: linear-gradient(45deg, transparent 45%, red 45%, red 55%, transparent 55%); cursor: pointer;"></div>
                        ${['#ffffff', '#000000', '#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#34495e', '#ecf0f1'].map(c => `
                            <div onclick="applicaColore('${c}')" style="aspect-ratio: 1; border-radius: 50%; background: ${c}; border: 1px solid #ddd; cursor: pointer;"></div>
                        `).join('')}
                    </div>
                  
                    <div style="background: #f1f1f1; padding: 5px; border-radius: 4px;">
                        <div style="display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 2px;">
                            <span>INTENSITÀ</span>
                            <span id="valore-intensita">50%</span>
                        </div>
                        <input type="range" id="slider-intensita" min="0" max="100" value="50" style="width: 100%; height: 3px; accent-color: #1b4b6b;" oninput="cambiaIntensita(this.value)">
                    </div>
                </div>
           <div id="controllo-etichetta-container" style="padding: 10px; border: 1px solid #ddd; border-radius: 8px; background: #fefefe; margin-top: 15px;">
                    <p style="font-weight: bold; font-size: 10px; margin-bottom: 8px; text-transform: uppercase; color: #1b4b6b;">Personalizzazione Etichetta:</p>
                    <div style="margin-bottom: 10px;">
                        <label style="font-size: 9px; display: block; margin-bottom: 3px; font-weight: bold;">CARICA LOGO/ETICHETTA:</label>
                        <input type="file" id="input-file-etichetta" accept="image/*" onchange="gestisciCaricamentoEtichetta(this)" style="font-size: 9px; width: 100%;">
                    </div>
                    <div id="comandi-etichetta-attivi" style="display: none; border-top: 1px solid #eee; padding-top: 8px;">
                        <label style="font-size: 9px; display: block; margin-bottom: 5px; font-weight: bold;">DIMENSIONE:</label>
                        <input type="range" id="slider-etichetta" min="20" max="250" value="100" oninput="ridimensionaEtichetta(this.value)" style="width: 100%; height: 5px; accent-color: #1b4b6b;">
                        <p style="font-size: 8px; color: #666; margin-top: 5px;">* Trascina l'immagine per posizionarla.</p>
                    </div>
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
    // 1. Nasconde tutte le sezioni
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    
    // 2. Rimuove lo stato "attivo" da tutti i bottoni del menu
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    
    // 3. Mostra la sezione richiesta
    const target = document.getElementById(id);
    if (target) {
        target.classList.add('active');
    }
    
    // 4. Attiva il bottone del menu corrispondente
    // Cerchiamo il bottone che ha l'attributo onclick contenente l'id della pagina
    document.querySelectorAll('.nav-tab').forEach(tab => {
        if (tab.getAttribute('onclick') && tab.getAttribute('onclick').includes(id)) {
            tab.classList.add('active');
        }
    });

    // 5. Gestione speciale per la tab preventivo
    const tabPrev = document.getElementById('tab-preventivo');
    if (id === 'preventivo-page' && tabPrev) {
        tabPrev.style.display = 'block';
        tabPrev.classList.add('active');
    }
}
// Funzione che sblocca i pulsanti solo tramite il nome preventivo
function gestisciSblocchi() {
    const nomePrev = document.getElementById('input-nome-preventivo').value.trim();
    const sel = state.selezioni;
    
    // Riferimenti ai pulsanti della sidebar
    const btnTappo = document.querySelector('button[onclick*="tappo"]');
    const btnCache = document.querySelector('button[onclick*="cache"]');
    const btnPompa = document.querySelector('button[onclick*="pompa"]');
    const btnEssenza = document.getElementById('btn-essenza');
    const btnRender = document.querySelector('button[onclick="generaRender()"]');

    // --- LOGICA 1: SBLOCCO PACKAGING (Basato sulla scelta della Bottiglia) ---
    if (sel.bottiglia) {
        if (btnTappo) btnTappo.disabled = false;
        if (btnCache) btnCache.disabled = false;
        if (btnPompa) btnPompa.disabled = false;
    } else {
        // Se deselezioni la bottiglia, questi tornano bloccati
        if (btnTappo) btnTappo.disabled = true;
        if (btnCache) btnCache.disabled = true;
        if (btnPompa) btnPompa.disabled = true;
    }

    // --- LOGICA 2: SBLOCCO ESSENZA E RENDER (Basato sul Nome Preventivo) ---
    if (nomePrev !== "") {
        if (btnEssenza) btnEssenza.disabled = false;
        if (btnRender) btnRender.disabled = false;
    } else {
        if (btnEssenza) btnEssenza.disabled = true;
        if (btnRender) btnRender.disabled = true;
    }
}

// Funzione che crea il primo menu (Famiglie)
function mostraMenuEssenze() {
    const btnEssenza = document.getElementById('btn-essenza');
    
    // Rimuove il menu se è già aperto (fuziona da interruttore)
    const vecchioMenu = document.getElementById('container-dropdown-essenze');
    if (vecchioMenu) {
        vecchioMenu.remove();
        return;
    }

    const container = document.createElement('div');
    container.id = 'container-dropdown-essenze';
    container.style.cssText = 'padding:10px; background:#f4f4f4; border-radius:5px; margin-top:5px; border:1px solid #ccc;';

    // Estrae i nomi unici dalla colonna "famiglia olfattiva"
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

// Funzione che crea il secondo menu (Sottofamiglie) filtrato
function aggiornaSottofamiglie() {
    const famigliaScelta = document.getElementById('select-famiglia').value;
    const selectSotto = document.getElementById('select-sottofamiglia');
    
    if (!famigliaScelta) {
        selectSotto.style.display = 'none';
        return;
    }

    // Filtra le righe del CSV in base alla famiglia scelta e prende le Sottofamiglie
    const sottofamiglie = [...new Set(db.essenze
        .filter(item => item['famiglia olfattiva'] === famigliaScelta)
        .map(item => item.Sottofamiglia))].filter(s => s);
    
    selectSotto.innerHTML = `<option value="">Scegli Sottofamiglia...</option>` + 
                            sottofamiglie.map(s => `<option value="${s}">${s}</option>`).join('');
    
    selectSotto.style.display = 'block';
}

// Funzione che scrive il risultato nel notes-container
function mostraSceltaEssenza() {
    const sotto = document.getElementById('select-sottofamiglia').value;
    const notesContainer = document.getElementById('notes-container');
    
    // SALVATAGGIO FONDAMENTALE: comunica al sistema la scelta per il preventivo
    state.selezioni.sottofamiglia = sotto; 

    if (sotto && notesContainer) {
        notesContainer.innerHTML = `
            <div style="padding:15px; background:#1b4b6b; color:white; border-radius:5px; margin-top:10px;">
                <strong>Sottofamiglia selezionata:</strong> ${sotto}
            </div>`;
    }
}
let coloreSelezionato = 'transparent';
let parteTarget = 'bottiglia';

function selezionaParteColore(target) {
    parteTarget = target;
    document.querySelectorAll('.btn-color-target').forEach(btn => {
        btn.style.border = '1px solid #ccc';
        btn.style.background = '#fff';
    });
    const btnAttivo = document.getElementById('target-' + target);
    if (btnAttivo) {
        btnAttivo.style.border = '1px solid #1b4b6b';
        btnAttivo.style.background = '#f0f7ff';
    }
}

function applicaColore(color) {
    coloreSelezionato = color;
    const intensita = document.getElementById('slider-intensita').value / 100;
    const mBot = document.getElementById('mask-bottiglia-layer');
    const mTap = document.getElementById('mask-tappo-layer');

    if (color === 'transparent') {
        if (mBot) mBot.style.opacity = '0';
        if (mTap) mTap.style.opacity = '0';
        return;
    }

    const aggiornaLayer = (layer) => {
        if (layer && layer.dataset.src) {
            layer.style.backgroundColor = color;
            layer.style.webkitMaskImage = `url(${layer.dataset.src})`;
            layer.style.maskImage = `url(${layer.dataset.src})`;
            layer.style.webkitMaskSize = layer.style.maskSize = "contain";
            layer.style.webkitMaskRepeat = layer.style.maskRepeat = "no-repeat";
            layer.style.webkitMaskPosition = layer.style.maskPosition = "center";
            layer.style.opacity = intensita;
        }
    };

    if (parteTarget === 'bottiglia' || parteTarget === 'entrambi') aggiornaLayer(mBot);
    if (parteTarget === 'tappo' || parteTarget === 'entrambi') aggiornaLayer(mTap);
}

function cambiaIntensita(val) {
    document.getElementById('valore-intensita').innerText = val + '%';
    if (coloreSelezionato !== 'transparent') applicaColore(coloreSelezionato);
}
// --- FUNZIONI PER GESTIONE ETICHETTA PERSONALIZZATA ---

function gestisciCaricamentoEtichetta(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const container = document.getElementById('container-etichetta-trascinabile');
            const img = document.getElementById('etichetta-upload');
            const controlliSlider = document.getElementById('comandi-etichetta-attivi');
            
            // Imposta l'immagine caricata
            img.src = e.target.result;
            
            // Mostra il container e i comandi dello slider
            container.style.display = 'block';
            controlliSlider.style.display = 'block';
            
            // Posiziona l'etichetta al centro del render inizialmente
            container.style.top = '45%';
            container.style.left = '50%';
            container.style.transform = 'translate(-50%, -50%)';
            
            // Attiva la funzione di trascinamento
            rendiTrascinabile(container);
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function ridimensionaEtichetta(valore) {
    const img = document.getElementById('etichetta-upload');
    if (img) {
        img.style.width = valore + 'px';
    }
}

function rendiTrascinabile(elemento) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    elemento.onmousedown = dragMouseDown;
    // Supporto per dispositivi touch
    elemento.ontouchstart = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        // Rimuove il transform translate per evitare conflitti con il posizionamento top/left durante il drag
        elemento.style.transform = 'none';
        
        // Prende la posizione del cursore o del tocco
        pos3 = (e.type === 'touchstart') ? e.touches[0].clientX : e.clientX;
        pos4 = (e.type === 'touchstart') ? e.touches[0].clientY : e.clientY;
        
        document.onmouseup = stopElementDrag;
        document.ontouchend = stopElementDrag;
        
        document.onmousemove = elementDrag;
        document.ontouchmove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        const clientX = (e.type === 'touchmove') ? e.touches[0].clientX : e.clientX;
        const clientY = (e.type === 'touchmove') ? e.touches[0].clientY : e.clientY;
        
        pos1 = pos3 - clientX;
        pos2 = pos4 - clientY;
        pos3 = clientX;
        pos4 = clientY;
        
        // Imposta la nuova posizione
        elemento.style.top = (elemento.offsetTop - pos2) + "px";
        elemento.style.left = (elemento.offsetLeft - pos1) + "px";
    }

    function stopElementDrag() {
        document.onmouseup = null;
        document.onmousemove = null;
        document.ontouchend = null;
        document.ontouchmove = null;
    }
}