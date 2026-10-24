/* PCB CAD Generator Setup */
(function initPcbCAD() {
    const canvas = document.getElementById('hero-pcb-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const traceCanvas = document.createElement('canvas');
    const traceCtx = traceCanvas.getContext('2d');

    let config = {
        mask: 'auto', // Ceramic White in Light theme, Industrial Green in Dark theme
        cardOpacity: 0.85,
        gridSize: 10,
        speed: 0.2,

        zoneW: 45,
        zoneH: 80,
        diagCutoff: 100,
        showBoundary: false,

        numPassives: 8,
        numSOIC: 1,
        numQFP: 1,

        thickness: 1.5,
        inertia: 0.98,
        targetBias: 0.9,
        branchChance: 0.05,

        passiveSpan: 2,
        passiveW: 0.6,
        passiveH: 0.6,
        icPitch: 1,
        icWidth: 4,
        icPadW: 0.8,
        icPadH: 0.8,
        viaSize: 0.5,
        viaDrill: 0.2
    };

    const uiControls = [
        { id: 'gridSize', label: 'Grid Size (Resolution)', min: 6, max: 24, step: 1, suffix: 'px', category: 'ui-board-ranges' },
        { id: 'speed', label: 'Animation Speed', min: 0.1, max: 5.0, step: 0.1, suffix: 'x', category: 'ui-board-ranges' },

        { id: 'zoneW', label: 'Zone Width', min: 10, max: 100, step: 1, suffix: '%', category: 'ui-area-ranges' },
        { id: 'zoneH', label: 'Zone Height', min: 10, max: 100, step: 1, suffix: '%', category: 'ui-area-ranges' },
        { id: 'diagCutoff', label: 'Diagonal Cutoff', min: 0, max: 100, step: 1, suffix: '%', category: 'ui-area-ranges' },

        { id: 'numPassives', label: 'Passive Components (R/C)', min: 0, max: 60, step: 1, suffix: '', category: 'ui-component-ranges' },
        { id: 'numSOIC', label: 'SOIC ICs', min: 0, max: 15, step: 1, suffix: '', category: 'ui-component-ranges' },
        { id: 'numQFP', label: 'QFP Microcontrollers', min: 0, max: 5, step: 1, suffix: '', category: 'ui-component-ranges' },

        { id: 'thickness', label: 'Trace Thickness', min: 0.5, max: 4.0, step: 0.5, suffix: 'px', category: 'ui-routing-ranges' },
        { id: 'inertia', label: 'Routing Inertia', min: 0.0, max: 0.98, step: 0.01, suffix: '', displayMult: 100, displaySuffix: '%', category: 'ui-routing-ranges' },
        { id: 'targetBias', label: 'Target-Seeking Bias', min: 0.0, max: 1.0, step: 0.05, suffix: '', displayMult: 100, displaySuffix: '%', category: 'ui-routing-ranges' },
        { id: 'branchChance', label: 'Trace Branching Chance', min: 0.0, max: 0.2, step: 0.01, suffix: '', displayMult: 100, displaySuffix: '%', category: 'ui-routing-ranges' },

        { id: 'passiveSpan', label: 'Passive Pin Span', min: 2, max: 6, step: 1, suffix: '', category: 'ui-size-ranges' },
        { id: 'passiveW', label: 'Passive Pad Width Ratio', min: 0.2, max: 1.5, step: 0.1, suffix: '', category: 'ui-size-ranges' },
        { id: 'passiveH', label: 'Passive Pad Height Ratio', min: 0.2, max: 1.5, step: 0.1, suffix: '', category: 'ui-size-ranges' },
        { id: 'icPitch', label: 'IC Pin Pitch', min: 1, max: 3, step: 1, suffix: '', category: 'ui-size-ranges' },
        { id: 'icWidth', label: 'SOIC Width', min: 3, max: 8, step: 1, suffix: '', category: 'ui-size-ranges' },
        { id: 'icPadW', label: 'IC Pad Width Ratio', min: 0.2, max: 1.5, step: 0.1, suffix: '', category: 'ui-size-ranges' },
        { id: 'icPadH', label: 'IC Pad Height Ratio', min: 0.2, max: 1.5, step: 0.1, suffix: '', category: 'ui-size-ranges' },
        { id: 'viaSize', label: 'Via Size Ratio', min: 0.3, max: 1.5, step: 0.1, suffix: '', category: 'ui-size-ranges' },
        { id: 'viaDrill', label: 'Via Drill Hole Ratio', min: 0.1, max: 0.8, step: 0.05, suffix: '', category: 'ui-size-ranges' },
    ];

    const Themes = {
        green: { bg: 'rgba(0, 40, 20, 0.4)', trace: '#008f4c', silk: '#ffffff' },
        white: { bg: 'rgba(235, 240, 235, 0.75)', trace: '#718096', silk: '#044123' },
        black: { bg: 'rgba(10, 10, 10, 0.6)', trace: '#3a3a3a', silk: '#e8e8e8' },
        blue: { bg: 'rgba(0, 20, 50, 0.5)', trace: '#005bb5', silk: '#f0f0f0' },
        purple: { bg: 'rgba(30, 0, 40, 0.5)', trace: '#8c1da6', silk: '#f3e8f5' },
        red: { bg: 'rgba(40, 5, 5, 0.5)', trace: '#a81c1c', silk: '#ffffff' },
    };

    const FINISH = { pad: '#d4af37', hole: '#0a0a0a' };

    let cols, rows;
    let grid = [];
    let components = [];
    let pendingComponents = [];
    let activeTraces = [];
    let completedVias = [];
    let animId = null;
    let dpr = 1;
    let stepAccumulator = 0;
    let componentSpawnAccumulator = 0;
    let startX = 0, startY = 0;

    const DIRS = [
        { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: -1, y: 1 },
        { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }
    ];

    function getActiveMaskKey() {
        if (config.mask !== 'auto') return config.mask;
        return document.documentElement.classList.contains('dark-theme') ? 'green' : 'white';
    }

    function getPassiveFootprint(prefix) {
        let span = config.passiveSpan;
        let h = 1;
        let silkX = 0.5 - (config.passiveW / 2) - 0.1;
        let silkY = 0.5 - (config.passiveH / 2) - 0.1;
        let silkW = (span - 1) + config.passiveW + 0.2;
        let silkH = config.passiveH + 0.2;

        return {
            type: 'PASSIVE', prefix: prefix, w: span, h: h,
            pads: [
                { x: 0, y: 0, escapes: [4, 5, 3] },
                { x: span - 1, y: 0, escapes: [0, 1, 7] }
            ],
            silk: [{ type: 'rect', x: silkX, y: silkY, w: silkW, h: silkH }]
        };
    }

    function getSOICFootprint() {
        let pitch = config.icPitch;
        let w = config.icWidth;
        let pinsPerSide = 4;
        let h = (pinsPerSide - 1) * pitch + 1;
        let pads = [];

        for (let i = 0; i < pinsPerSide; i++) {
            pads.push({ x: 0, y: i * pitch, escapes: [4, 5, 3] });
            pads.push({ x: w - 1, y: i * pitch, escapes: [0, 1, 7] });
        }

        return {
            type: 'SOIC', prefix: 'U', w, h, pads,
            silk: [
                { type: 'rect', x: 0.5, y: -0.2, w: w - 1, h: h + 0.4 },
                { type: 'circle', x: 1, y: 0.5, r: 0.25 }
            ]
        };
    }

    function getQFPFootprint() {
        let pitch = config.icPitch;
        let pins = 4;
        let edgeLength = (pins - 1) * pitch + 1;
        let offset = 1;
        let w = edgeLength + offset * 2;
        let h = edgeLength + offset * 2;
        let pads = [];

        for (let i = 0; i < pins; i++) {
            pads.push({ x: offset + i * pitch, y: 0, escapes: [6, 5, 7] });
            pads.push({ x: offset + i * pitch, y: h - 1, escapes: [2, 1, 3] });
            pads.push({ x: 0, y: offset + i * pitch, escapes: [4, 5, 3] });
            pads.push({ x: w - 1, y: offset + i * pitch, escapes: [0, 1, 7] });
        }

        return {
            type: 'QFP', prefix: 'U', w, h, pads,
            silk: [
                { type: 'rect', x: 0.5, y: 0.5, w: w - 1, h: h - 1 },
                { type: 'circle', x: 1.2, y: 1.2, r: 0.3 }
            ]
        };
    }

    class Trace {
        constructor(x, y, dir, targetX, targetY) {
            this.x = x;
            this.y = y;
            this.dir = dir;
            this.targetX = targetX;
            this.targetY = targetY;
            this.active = true;
            if (isValidBound(x, y)) grid[x][y] = 2;
        }

        step() {
            if (!this.active) return false;

            let d45L = (this.dir + 7) % 8;
            let d45R = (this.dir + 1) % 8;

            let forwardDirs = [this.dir, d45L, d45R].map(d => {
                let nx = this.x + DIRS[d].x;
                let ny = this.y + DIRS[d].y;
                let dist = Math.hypot(nx - this.targetX, ny - this.targetY);
                return { d, dist };
            });

            if (Math.random() < config.targetBias) {
                forwardDirs.sort((a, b) => a.dist - b.dist);
            } else {
                forwardDirs.sort(() => Math.random() - 0.5);
            }

            let candidates = [];
            if (Math.random() < config.inertia) {
                candidates.push(this.dir);
                candidates.push(...forwardDirs.filter(obj => obj.d !== this.dir).map(obj => obj.d));
            } else {
                candidates = forwardDirs.map(obj => obj.d);
            }

            let moved = false;
            for (let d of candidates) {
                if (isValidMove(this.x, this.y, DIRS[d].x, DIRS[d].y)) {
                    let nx = this.x + DIRS[d].x;
                    let ny = this.y + DIRS[d].y;
                    let half = config.gridSize / 2;

                    traceCtx.strokeStyle = Themes[getActiveMaskKey()].trace;
                    traceCtx.lineWidth = config.thickness;
                    traceCtx.lineCap = 'round';
                    traceCtx.beginPath();
                    traceCtx.moveTo(this.x * config.gridSize + half, this.y * config.gridSize + half);
                    traceCtx.lineTo(nx * config.gridSize + half, ny * config.gridSize + half);
                    traceCtx.stroke();

                    this.x = nx;
                    this.y = ny;
                    this.dir = d;
                    grid[nx][ny] = 2;
                    moved = true;

                    if (Math.random() < config.branchChance) {
                        let branchDir = Math.random() < 0.5 ? d45L : d45R;
                        if (isValidMove(this.x, this.y, DIRS[branchDir].x, DIRS[branchDir].y)) {
                            activeTraces.push(new Trace(this.x, this.y, branchDir, this.targetX, this.targetY));
                        }
                    }
                    break;
                }
            }

            if (!moved) {
                this.active = false;
                completedVias.push({ x: this.x, y: this.y });
            }
            return moved;
        }
    }

    function isValidBound(x, y) {
        if (x < startX || x >= cols || y < startY || y >= rows) return false;
        let w = cols - startX;
        let h = rows - startY;
        if (w <= 0 || h <= 0) return true;

        let val = (x - startX) / w + (y - startY) / h;
        return val >= (config.diagCutoff / 100);
    }

    function isValidMove(x, y, dx, dy) {
        let nx = x + dx;
        let ny = y + dy;
        if (!isValidBound(nx, ny)) return false;
        if (grid[nx][ny] !== 0) return false;

        if (dx !== 0 && dy !== 0) {
            if (grid[x + dx][y] !== 0 && grid[x][y + dy] !== 0) return false;
        }
        return true;
    }

    function placeComponentSet(count, footprintGen, countsObj) {
        let attempts = count * 10;
        let placed = 0;

        for (let i = 0; i < attempts; i++) {
            if (placed >= count) break;

            let template = footprintGen();
            let wSpaces = cols - startX - template.w - 2;
            let hSpaces = rows - startY - template.h - 2;

            if (wSpaces <= 0 || hSpaces <= 0) break;

            let x = Math.floor(Math.random() * wSpaces) + startX + 1;
            let y = Math.floor(Math.random() * hSpaces) + startY + 1;

            let clear = true;
            let margin = 1;

            for (let cy = -margin; cy <= template.h - 1 + margin; cy++) {
                for (let cx = -margin; cx <= template.w - 1 + margin; cx++) {
                    if (!isValidBound(x + cx, y + cy) || grid[x + cx][y + cy] !== 0) {
                        clear = false;
                        break;
                    }
                }
                if (!clear) break;
            }

            if (clear) {
                for (let cy = 0; cy < template.h; cy++) {
                    for (let cx = 0; cx < template.w; cx++) {
                        grid[x + cx][y + cy] = 1;
                    }
                }

                let comp = { ...template, x, y, name: template.prefix + countsObj[template.prefix]++ };
                placed++;
                pendingComponents.push({ comp });
            }
        }
    }

    function generateComponents() {
        let counts = { R: 1, C: 1, U: 1 };
        placeComponentSet(config.numPassives, () => getPassiveFootprint(Math.random() > 0.5 ? 'R' : 'C'), counts);
        placeComponentSet(config.numSOIC, getSOICFootprint, counts);
        placeComponentSet(config.numQFP, getQFPFootprint, counts);
    }

    function drawPCB() {
        let thm = Themes[getActiveMaskKey()];

        ctx.fillStyle = thm.bg;
        ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

        ctx.resetTransform();
        ctx.drawImage(traceCanvas, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        for (let c of components) {
            let cx = c.x * config.gridSize;
            let cy = c.y * config.gridSize;

            ctx.fillStyle = FINISH.pad;
            for (let p of c.pads) {
                let pw = (c.type === 'PASSIVE' ? config.passiveW : config.icPadW) * config.gridSize;
                let ph = (c.type === 'PASSIVE' ? config.passiveH : config.icPadH) * config.gridSize;
                let px = cx + p.x * config.gridSize + (config.gridSize - pw) / 2;
                let py = cy + p.y * config.gridSize + (config.gridSize - ph) / 2;

                ctx.beginPath();
                ctx.roundRect(px, py, pw, ph, 1.5);
                ctx.fill();
            }
        }

        for (let via of completedVias) {
            let vx = via.x * config.gridSize + config.gridSize / 2;
            let vy = via.y * config.gridSize + config.gridSize / 2;
            let rad = config.gridSize * (config.viaSize / 2);

            ctx.beginPath();
            ctx.arc(vx, vy, rad, 0, Math.PI * 2);
            ctx.fillStyle = FINISH.pad;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(vx, vy, rad * config.viaDrill, 0, Math.PI * 2);
            ctx.fillStyle = FINISH.hole;
            ctx.fill();
        }

        for (let c of components) {
            let cx = c.x * config.gridSize;
            let cy = c.y * config.gridSize;

            ctx.strokeStyle = thm.silk;
            ctx.fillStyle = thm.silk;
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = 0.9;

            for (let s of c.silk) {
                if (s.type === 'rect') {
                    ctx.strokeRect(cx + s.x * config.gridSize, cy + s.y * config.gridSize, s.w * config.gridSize, s.h * config.gridSize);
                } else if (s.type === 'circle') {
                    ctx.beginPath();
                    ctx.arc(cx + s.x * config.gridSize, cy + s.y * config.gridSize, s.r * config.gridSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.font = 'bold 10px monospace';
            ctx.fillText(c.name, cx, cy - 4);
            ctx.globalAlpha = 1.0;
        }

        if (config.showBoundary) {
            let cRatio = config.diagCutoff / 100;
            let w = (cols - startX);
            let h = (rows - startY);

            ctx.strokeStyle = '#fa003f';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();

            let p1x = cols * config.gridSize;
            let p1y = rows * config.gridSize;
            let p2x = startX * config.gridSize;
            let p2y = rows * config.gridSize;
            let p3x = startX * config.gridSize;
            let p3y = (startY + cRatio * h) * config.gridSize;
            let p4x = (startX + cRatio * w) * config.gridSize;
            let p4y = startY * config.gridSize;
            let p5x = cols * config.gridSize;
            let p5y = startY * config.gridSize;

            ctx.moveTo(p1x, p1y);
            ctx.lineTo(p2x, p2y);
            ctx.lineTo(p3x, p3y);
            ctx.lineTo(p4x, p4y);
            ctx.lineTo(p5x, p5y);
            ctx.closePath();
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    function gameLoop() {
        stepAccumulator += config.speed;
        componentSpawnAccumulator += config.speed;

        while (componentSpawnAccumulator >= 2 && pendingComponents.length > 0) {
            componentSpawnAccumulator -= 2;
            let nextComp = pendingComponents.pop();
            components.push(nextComp.comp);

            nextComp.comp.pads.forEach(p => {
                let padGridX = nextComp.comp.x + p.x;
                let padGridY = nextComp.comp.y + p.y;

                let validEscapes = p.escapes.filter(e => {
                    let ex = padGridX + DIRS[e].x;
                    let ey = padGridY + DIRS[e].y;
                    return isValidBound(ex, ey) && grid[ex][ey] === 0;
                });

                let ex, ey, escapeDir;

                if (validEscapes.length > 0) {
                    escapeDir = validEscapes[Math.floor(Math.random() * validEscapes.length)];
                    ex = padGridX + DIRS[escapeDir].x;
                    ey = padGridY + DIRS[escapeDir].y;
                } else {
                    let found = false;
                    for (let d = 0; d < 8; d++) {
                        let nx = padGridX + DIRS[d].x;
                        let ny = padGridY + DIRS[d].y;
                        if (isValidBound(nx, ny) && grid[nx][ny] === 0) {
                            ex = nx;
                            ey = ny;
                            escapeDir = d;
                            found = true;
                            break;
                        }
                    }
                    if (!found) return;
                }

                let padCenterX = padGridX * config.gridSize + config.gridSize / 2;
                let padCenterY = padGridY * config.gridSize + config.gridSize / 2;
                let half = config.gridSize / 2;

                traceCtx.strokeStyle = Themes[getActiveMaskKey()].trace;
                traceCtx.lineWidth = config.thickness;
                traceCtx.lineCap = 'round';
                traceCtx.beginPath();
                traceCtx.moveTo(padCenterX, padCenterY);
                traceCtx.lineTo(ex * config.gridSize + half, ey * config.gridSize + half);
                traceCtx.stroke();

                grid[ex][ey] = 2;

                let targetX = Math.random() > 0.5 ? (Math.random() > 0.5 ? startX : cols) : Math.floor(Math.random() * (cols - startX)) + startX;
                let targetY = Math.random() > 0.5 ? Math.floor(Math.random() * (rows - startY)) + startY : (Math.random() > 0.5 ? startY : rows);

                activeTraces.push(new Trace(ex, ey, escapeDir, targetX, targetY));
            });
        }

        while (stepAccumulator >= 1) {
            stepAccumulator -= 1;
            for (let t of activeTraces) {
                if (t.active) t.step();
            }
        }

        let activeCount = activeTraces.filter(t => t.active).length;
        drawPCB();

        if (activeCount > 0 || pendingComponents.length > 0) {
            animId = requestAnimationFrame(gameLoop);
        }
    }

    function initGenerator() {
        if (animId) cancelAnimationFrame(animId);

        const container = canvas.parentElement;
        dpr = window.devicePixelRatio || 1;

        let cw = container.clientWidth;
        let ch = container.clientHeight;

        canvas.style.width = cw + 'px';
        canvas.style.height = ch + 'px';
        canvas.width = cw * dpr;
        canvas.height = ch * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        traceCanvas.width = cw * dpr;
        traceCanvas.height = ch * dpr;
        traceCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        traceCtx.clearRect(0, 0, cw, ch);

        cols = Math.floor(cw / config.gridSize);
        rows = Math.floor(ch / config.gridSize);

        startX = Math.floor(cols * (1 - config.zoneW / 100));
        startY = Math.floor(rows * (1 - config.zoneH / 100));

        grid = Array(cols).fill().map(() => Array(rows).fill(0));
        components = [];
        pendingComponents = [];
        activeTraces = [];
        completedVias = [];
        stepAccumulator = 0;
        componentSpawnAccumulator = 0;

        generateComponents();
        pendingComponents.sort(() => Math.random() - 0.5);

        gameLoop();
    }

    window.reinitPcbGenerator = initGenerator;

    function buildUI() {
        uiControls.forEach(ctrl => {
            const container = document.getElementById(ctrl.category);
            if (!container) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'control-group';
            wrapper.innerHTML = `
                <label>
                    <span>${ctrl.label}</span> 
                    <span id="val-${ctrl.id}" style="color: var(--ni-green-primary); font-weight: 600;"></span>
                </label>
                <input type="range" id="input-${ctrl.id}" min="${ctrl.min}" max="${ctrl.max}" step="${ctrl.step}" value="${config[ctrl.id]}">
            `;
            container.appendChild(wrapper);

            const inputEl = document.getElementById(`input-${ctrl.id}`);
            const valEl = document.getElementById(`val-${ctrl.id}`);

            const updateDisplay = (val) => {
                let displayVal = parseFloat(val);
                if (ctrl.displayMult) displayVal *= ctrl.displayMult;
                let formatted = Number.isInteger(ctrl.step) ? Math.round(displayVal) : displayVal.toFixed(2).replace(/\.?0+$/, '');
                if (formatted === "") formatted = "0";
                valEl.innerText = `${formatted}${ctrl.displaySuffix || ctrl.suffix}`;
            };

            updateDisplay(config[ctrl.id]);

            inputEl.addEventListener('input', (e) => {
                let val = parseFloat(e.target.value);
                config[ctrl.id] = val;
                updateDisplay(val);
            });
        });

        const maskSelect = document.getElementById('ctrl-mask');
        if (maskSelect) {
            maskSelect.value = config.mask;
            maskSelect.addEventListener('change', (e) => { config.mask = e.target.value; });
        }

        const showBoundaryCheckbox = document.getElementById('ctrl-showBoundary');
        if (showBoundaryCheckbox) {
            showBoundaryCheckbox.checked = config.showBoundary;
            showBoundaryCheckbox.addEventListener('change', (e) => {
                config.showBoundary = e.target.checked;
                drawPCB();
            });
        }

        const regenBtn = document.getElementById('btn-regenerate-pcb');
        if (regenBtn) regenBtn.addEventListener('click', initGenerator);

        const exportBtn = document.getElementById('btn-export-pcb-config');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const configJson = JSON.stringify(config, null, 4);
                navigator.clipboard.writeText(configJson).then(() => {
                    alert("Configuration copied to clipboard!\n\nPaste these values into the 'config' object in js/circuit.js to make your tuned defaults permanent.");
                }).catch(() => {
                    console.log("PCB Config JSON:\n", configJson);
                    alert("Configuration printed to browser console!");
                });
            });
        }
    }

    // Direct toggle of PCB card in right column (no password required)
    function togglePcbCard() {
        const card = document.getElementById('pcb-editor-card');
        if (!card) return;
        const isHidden = card.style.display === 'none' || card.style.display === '';
        card.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    window.togglePcbEditorCard = togglePcbCard;

    // Shortcut: Ctrl + E or Cmd + E
    document.addEventListener('keydown', (e) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modifier = isMac ? e.metaKey : e.ctrlKey;

        if (modifier && e.key.toLowerCase() === 'e') {
            e.preventDefault();
            togglePcbCard();
        }
    });

    let logoClicks = 0;
    const logoEl = document.getElementById('brand-logo');
    if (logoEl) {
        logoEl.addEventListener('click', () => {
            logoClicks++;
            if (logoClicks >= 5) {
                logoClicks = 0;
                togglePcbCard();
            }
        });
    }

    const closeBtn = document.getElementById('btn-close-pcb-card');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const card = document.getElementById('pcb-editor-card');
            if (card) card.style.display = 'none';
        });
    }

    const heroToggleBtn = document.getElementById('btn-toggle-pcb-card');
    if (heroToggleBtn) {
        heroToggleBtn.addEventListener('click', togglePcbCard);
    }

    buildUI();
    setTimeout(initGenerator, 100);
})();
