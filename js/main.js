const startYear = 2026;
const currentYear = new Date().getFullYear();

document.getElementById("copyright-start").textContent = startYear;
document.getElementById("copyright-range").textContent = currentYear > startYear ? `–${currentYear}` : "";

let activeResumeBlobUrl = null;

const TURNSTILE_SITEKEY = "0x4AAAAAAFGMgR9DIjsQzy0M";
let turnstileRequested = false;

function loadTurnstile() {
    if (turnstileRequested) return;
    turnstileRequested = true;
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoaded";
    s.async = true;
    s.defer = true;
    s.onerror = function () { turnstileRequested = false; setGateStatus("Could not load the safety check.", true); };
    document.head.appendChild(s);
}

function setGateStatus(msg, isError) {
    const el = document.getElementById("gate-status");
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? "var(--ni-danger)" : "";
}

window.onTurnstileLoaded = function () {
    if (!window.turnstile) return;
    window.turnstile.render("#turnstile-widget", {
        sitekey: TURNSTILE_SITEKEY,
        theme: document.documentElement.classList.contains("dark-theme") ? "dark" : "light",
        size: "compact",
        callback: window.onTurnstileSuccess,
        "error-callback": function () { setGateStatus("Safety check failed. Please reload and retry.", true); },
        "expired-callback": function () { setGateStatus("Check expired, please verify again.", true); }
    });
};

(function observeContact() {
    const contact = document.getElementById("contact");
    if (!contact) return;
    if (!("IntersectionObserver" in window)) { loadTurnstile(); return; }
    const io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) {
            loadTurnstile();
            io.disconnect();
        }
    }, { rootMargin: "600px 0px" });
    io.observe(contact);
})();

window.handleHeroResumeClick = function () {
    if (activeResumeBlobUrl) {
        const a = document.createElement("a");
        a.href = activeResumeBlobUrl;
        a.download = "Joshua_Cislini_Resume.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } else {
        loadTurnstile();
        const contactSec = document.getElementById("contact");
        if (contactSec) {
            contactSec.scrollIntoView({ behavior: "smooth" });
        }
    }
};

window.onTurnstileSuccess = async function (token) {
    const statusEl = document.getElementById("gate-status");
    if (statusEl) { statusEl.textContent = "Verifying safety check..."; statusEl.style.color = ""; }

    try {
        const response = await fetch("https://contact-decrypt.cislinij.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: token })
        });

        const data = await response.json();

        if (data && data.success) {
            const emailLink = document.getElementById("email-link");
            const phoneLink = document.getElementById("phone-link");

            if (emailLink) {
                emailLink.href = "mailto:" + data.email;
                emailLink.textContent = data.email;
            }

            if (phoneLink) {
                phoneLink.href = "tel:" + data.phone.replace(/\s+/g, '');
                phoneLink.textContent = data.phone;
            }

            if (data.resumeBase64) {
                const blob = base64ToBlob(data.resumeBase64, 'application/pdf');
                activeResumeBlobUrl = URL.createObjectURL(blob);
                const dlBtn = document.getElementById("download-resume-link");
                if (dlBtn) dlBtn.href = activeResumeBlobUrl;
            }

            const gate = document.getElementById("contact-gate");
            const info = document.getElementById("contact-info-content");
            if (gate) gate.style.display = "none";
            if (info) info.style.display = "block";
        } else if (statusEl) {
            statusEl.textContent = "Verification failed. Please try again.";
            statusEl.style.color = "var(--ni-danger)";
        }
    } catch (error) {
        if (statusEl) {
            statusEl.textContent = "Unable to connect to verification server.";
            statusEl.style.color = "var(--ni-danger)";
        }
    }
};

function base64ToBlob(base64, mimeType) {
    try {
        const bin = atob(base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new Blob([bytes], { type: mimeType });
    } catch (e) {
        return new Blob([], { type: mimeType });
    }
}

let cachedParticleColors = { r: 0, g: 155, b: 101 };

function updateParticleColorsCache() {
    const styles = getComputedStyle(document.documentElement);
    cachedParticleColors = {
        r: parseInt(styles.getPropertyValue('--particle-color-r').trim() || "0", 10),
        g: parseInt(styles.getPropertyValue('--particle-color-g').trim() || "155", 10),
        b: parseInt(styles.getPropertyValue('--particle-color-b').trim() || "101", 10)
    };
}

/* Particle Canvas Script */
(function initParticleCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const PARTICLE_AREA_PER_PARTICLE = 8000;
    const MAX_PARTICLE_COUNT = 300;
    const MIN_PARTICLE_COUNT = 80;
    const MIN_PARTICLE_RADIUS = 1.5;
    const MAX_PARTICLE_RADIUS = 3.5;

    const BASE_SPEED_X = 0.3;
    const BASE_SPEED_Y = 0.3;

    const MOUSE_ATTRACT_RADIUS = 100;
    const MOUSE_ATTRACT_FORCE = 0.007;
    const MOUSE_LINE_MAX_DIST = 200;
    const MOUSE_LINE_ALPHA = 0.5;
    const MOUSE_LINE_WIDTH = 1.2;

    const CONNECTION_MAX_DIST = 120;
    const CAPTURED_MAX_CONN = 2;
    const UNCAPTURED_MAX_CONN = 5;
    const CONNECTION_BASE_ALPHA = 0.35;
    const CONNECTION_LINE_WIDTH = 1;

    const EXPLOSION_SPEED_MIN = 8;
    const EXPLOSION_SPEED_MAX = 24;
    const EXPLOSION_DRAG = 0.98;
    const EXPLOSION_RECOVERY_RATE = 0.02;
    const EXPLOSION_FADE_STEP = 0.03;
    const EXPLOSION_FADE_INTERVAL = 30;
    const POPUP_AUTO_HIDE_DELAY = 3500;

    const popup = document.getElementById('easter-egg-popup');
    const fpsText = document.getElementById('fps-text');
    const fpsWidget = document.getElementById('fps-widget');
    const fpsDot = document.getElementById('fps-dot');

    let width, height;
    let mouse = { x: -1000, y: -1000, active: false };
    let particles = [];

    let isExploding = false;
    let explosionProgress = 0;
    let popupTimeout = null;

    let lastTime = performance.now();
    let frameCount = 0;

    function updateDimensions() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth || document.documentElement.clientWidth || 1000;
        height = window.innerHeight || document.documentElement.clientHeight || 800;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * BASE_SPEED_X;
            this.vy = (Math.random() - 0.5) * BASE_SPEED_Y;
            this.targetVx = this.vx;
            this.targetVy = this.vy;
            this.radius = Math.random() * (MAX_PARTICLE_RADIUS - MIN_PARTICLE_RADIUS) + MIN_PARTICLE_RADIUS;
            this.captured = false;
            this.connectionsCount = 0;
        }

        update() {
            if (isExploding) {
                this.x += this.vx;
                this.y += this.vy;
                this.vx *= EXPLOSION_DRAG;
                this.vy *= EXPLOSION_DRAG;

                this.vx += (this.targetVx - this.vx) * EXPLOSION_RECOVERY_RATE;
                this.vy += (this.targetVy - this.vy) * EXPLOSION_RECOVERY_RATE;

                if (this.x < 0) this.x = width;
                if (this.x > width) this.x = 0;
                if (this.y < 0) this.y = height;
                if (this.y > height) this.y = 0;

                return;
            }

            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;

            if (mouse.active) {
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < MOUSE_ATTRACT_RADIUS) {
                    this.x += dx * MOUSE_ATTRACT_FORCE;
                    this.y += dy * MOUSE_ATTRACT_FORCE;
                    this.captured = true;
                } else {
                    this.captured = false;
                }
            } else {
                this.captured = false;
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

            const r = Math.round(cachedParticleColors.r + (229 - cachedParticleColors.r) * explosionProgress);
            const g = Math.round(cachedParticleColors.g + (62 - cachedParticleColors.g) * explosionProgress);
            const b = Math.round(cachedParticleColors.b + (62 - cachedParticleColors.b) * explosionProgress);
            const alpha = 0.6 + 0.3 * explosionProgress;

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            ctx.fill();
        }
    }

    function initParticles() {
        updateParticleColorsCache();
        updateDimensions();
        particles = [];
        const count = Math.min(MAX_PARTICLE_COUNT, Math.max(MIN_PARTICLE_COUNT, Math.floor((width * height) / PARTICLE_AREA_PER_PARTICLE)));
        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }
    }

    function triggerExplosion() {
        isExploding = true;
        explosionProgress = 1;

        if (popup) popup.classList.add('show');

        if (popupTimeout) clearTimeout(popupTimeout);
        popupTimeout = setTimeout(() => {
            if (popup) popup.classList.remove('show');
        }, POPUP_AUTO_HIDE_DELAY);

        particles.forEach(p => {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * (EXPLOSION_SPEED_MAX - EXPLOSION_SPEED_MIN) + EXPLOSION_SPEED_MIN;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.targetVx = (Math.random() - 0.5) * (BASE_SPEED_X * 0.88);
            p.targetVy = (Math.random() - 0.5) * (BASE_SPEED_Y * 0.88);
            p.captured = false;
        });

        const fadeInterval = setInterval(() => {
            explosionProgress -= EXPLOSION_FADE_STEP;
            if (explosionProgress <= 0) {
                explosionProgress = 0;
                isExploding = false;
                clearInterval(fadeInterval);
            }
        }, EXPLOSION_FADE_INTERVAL);
    }

    function updateFPS(now) {
        if (!fpsWidget || fpsWidget.getClientRects().length === 0) { lastTime = now; frameCount = 0; return; }
        frameCount++;
        if (now - lastTime >= 500) {
            const fps = Math.round((frameCount * 1000) / (now - lastTime));
            if (fpsText) fpsText.textContent = `${fps} FPS`;

            if (fpsDot) {
                if (fps >= 50) {
                    fpsDot.style.backgroundColor = 'var(--ni-green-primary)';
                } else if (fps >= 30) {
                    fpsDot.style.backgroundColor = 'var(--ni-warning)';
                } else {
                    fpsDot.style.backgroundColor = 'var(--ni-danger)';
                }
            }

            frameCount = 0;
            lastTime = now;
        }
    }

    let rafId = null;

    function animate(now, once) {
        if (!once) rafId = requestAnimationFrame(animate);
        updateFPS(now);
        ctx.clearRect(0, 0, width, height);

        let capturedCount = 0;

        for (let i = 0; i < particles.length; i++) {
            particles[i].connectionsCount = 0;
        }

        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();

            if (particles[i].captured) {
                capturedCount++;
            }

            for (let j = i + 1; j < particles.length; j++) {
                const maxI = particles[i].captured ? CAPTURED_MAX_CONN : UNCAPTURED_MAX_CONN;
                const maxJ = particles[j].captured ? CAPTURED_MAX_CONN : UNCAPTURED_MAX_CONN;

                if (particles[i].connectionsCount >= maxI || particles[j].connectionsCount >= maxJ) {
                    continue;
                }

                let dx = particles[i].x - particles[j].x;
                let dy = particles[i].y - particles[j].y;
                let dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < CONNECTION_MAX_DIST) {
                    particles[i].connectionsCount++;
                    particles[j].connectionsCount++;

                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);

                    const r = Math.round(cachedParticleColors.r + (229 - cachedParticleColors.r) * explosionProgress);
                    const g = Math.round(cachedParticleColors.g + (62 - cachedParticleColors.g) * explosionProgress);
                    const b = Math.round(cachedParticleColors.b + (62 - cachedParticleColors.b) * explosionProgress);
                    const alpha = (CONNECTION_BASE_ALPHA + 0.2 * explosionProgress) * (1 - dist / CONNECTION_MAX_DIST);

                    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                    ctx.lineWidth = CONNECTION_LINE_WIDTH;
                    ctx.stroke();
                }
            }

            if (mouse.active && !isExploding) {
                let dx = particles[i].x - mouse.x;
                let dy = particles[i].y - mouse.y;
                let dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < MOUSE_LINE_MAX_DIST) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.strokeStyle = `rgba(${cachedParticleColors.r}, ${cachedParticleColors.g}, ${cachedParticleColors.b}, ${MOUSE_LINE_ALPHA * (1 - dist / MOUSE_LINE_MAX_DIST)})`;
                    ctx.lineWidth = MOUSE_LINE_WIDTH;
                    ctx.stroke();
                }
            }
        }

        if (!isExploding && capturedCount >= particles.length && particles.length > 0) {
            triggerExplosion();
        }
    }

    initParticles();

    const isStatic = window.matchMedia && window.matchMedia("(max-width: 850px), (pointer: coarse), (prefers-reduced-motion: reduce)").matches;

    if (isStatic) {
        if (fpsWidget) fpsWidget.style.display = 'none';
        animate(performance.now(), true);
    } else {
        rafId = requestAnimationFrame(animate);
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                cancelAnimationFrame(rafId);
                rafId = null;
            } else if (rafId === null) {
                lastTime = performance.now();
                frameCount = 0;
                rafId = requestAnimationFrame(animate);
            }
        });
    }

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.active = true;
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
        mouse.active = false;
    });

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            initParticles();
            if (isStatic) animate(performance.now(), true);
        }, 200);
    });

    window.redrawParticles = function () {
        if (isStatic) animate(performance.now(), true);
    };
})();

/* Theme Switcher Script & Dynamic Date Status Parser */
document.addEventListener("DOMContentLoaded", function () {
    const THEME_KEY = "cislini_resume_theme";
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const metaTheme = document.getElementById("meta-theme-color");
    const themeToggleBtn = document.getElementById("theme-toggle");
    const themeIcon = document.getElementById("theme-icon");
    const themeText = document.getElementById("theme-text");

    function savedTheme() {
        try { const v = localStorage.getItem(THEME_KEY); return (v === "dark" || v === "light") ? v : null; }
        catch (e) { return null; }
    }

    function applyTheme(dark) {
        root.classList.toggle("dark-theme", dark);
        if (themeIcon) themeIcon.textContent = dark ? "☀️" : "🌙";
        if (themeText) themeText.textContent = dark ? "Light" : "Dark";
        if (themeToggleBtn) themeToggleBtn.setAttribute("aria-pressed", String(dark));
        if (metaTheme) metaTheme.setAttribute("content", dark ? "#0b100d" : "#f4f4f4");
        setTimeout(function () {
            updateParticleColorsCache();
            if (window.redrawParticles) window.redrawParticles();
            if (window.reinitPcbGenerator) window.reinitPcbGenerator();
        }, 50);
    }

    applyTheme(savedTheme() ? savedTheme() === "dark" : mq.matches);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", function () {
            const dark = !root.classList.contains("dark-theme");
            try { localStorage.setItem(THEME_KEY, dark ? "dark" : "light"); } catch (e) { }
            applyTheme(dark);
        });
    }
    const onSystemChange = function (e) { if (!savedTheme()) applyTheme(e.matches); };
    if (mq.addEventListener) mq.addEventListener("change", onSystemChange);
    else if (mq.addListener) mq.addListener(onSystemChange);

    const today = new Date();
    const monthMap = {
        "jan": 0, "feb": 1, "mar": 2, "apr": 3, "may": 4, "jun": 5,
        "jul": 6, "aug": 7, "sep": 8, "oct": 9, "nov": 10, "dec": 11
    };

    function parseDateString(str, isEnd) {
        if (!str) return null;
        const clean = str.trim().toLowerCase();
        if (clean.includes("present") || clean.includes("current")) {
            return new Date(8640000000000000);
        }

        const matches = clean.match(/([a-z]{3})\s+(\d{4})/);
        if (matches) {
            const m = monthMap[matches[1]];
            const y = parseInt(matches[2]);
            if (m !== undefined && !isNaN(y)) {
                return isEnd ? new Date(y, m + 1, 0, 23, 59, 59) : new Date(y, m, 1);
            }
        }

        const yearMatch = clean.match(/(\d{4})/);
        if (yearMatch) {
            const y = parseInt(yearMatch[1]);
            return isEnd ? new Date(y, 11, 31, 23, 59, 59) : new Date(y, 0, 1);
        }
        return null;
    }

    const generalSections = document.querySelectorAll("#experience, #education");
    generalSections.forEach(section => {
        const items = section.querySelectorAll(".timeline-item");
        items.forEach(item => {
            const dateEl = item.querySelector(".item-date");
            if (!dateEl) return;

            const dateText = dateEl.textContent;
            if (dateText.includes("⟶")) {
                const parts = dateText.split("⟶");
                const startDate = parseDateString(parts[0], false);
                const endDate = parseDateString(parts[1], true);

                if (startDate && endDate && today >= startDate && today <= endDate) {
                    item.classList.add("active-item");
                    const titleEl = item.querySelector(".item-title");
                    if (titleEl && !titleEl.querySelector(".active-badge")) {
                        const badge = document.createElement("span");
                        badge.className = "active-badge";
                        badge.textContent = "Current";
                        titleEl.appendChild(badge);
                    }
                }
            }
        });
    });

    const licenseSection = document.querySelector("#licenses");
    if (licenseSection) {
        const licenseItems = licenseSection.querySelectorAll(".timeline-item");
        licenseItems.forEach(item => {
            const dateEl = item.querySelector(".item-date");
            if (!dateEl) return;

            const dateText = dateEl.textContent;
            let isExpired = false;

            if (dateText.includes("Exp.")) {
                const expMatch = dateText.match(/Exp\.\s+([A-Za-z]{3}\s+\d{4})/i);
                if (expMatch) {
                    const expDate = parseDateString(expMatch[1], true);
                    if (expDate && today > expDate) {
                        isExpired = true;
                    }
                }
            }

            const titleEl = item.querySelector(".item-title");
            if (titleEl) {
                const badge = document.createElement("span");
                if (isExpired) {
                    badge.className = "expired-badge";
                    badge.textContent = "Expired";
                } else {
                    badge.className = "valid-badge";
                    badge.textContent = "Valid";
                }
                titleEl.appendChild(badge);
            }
        });
    }
});

(function () {
    const btn = document.getElementById("hero-resume-btn");
    if (btn) btn.addEventListener("click", function () { window.handleHeroResumeClick(); });
})();

/* GitHub contribution chart */
(function renderGithubChart() {
    const grid = document.getElementById("gh-grid");
    const fallback = document.getElementById("gh-fallback");
    const link = document.getElementById("github-chart");
    const meta = document.getElementById("gh-meta");
    if (!grid) return;

    fetch("data/github-contributions.json", { cache: "no-cache" })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (data) {
            if (!data.weeks || !data.weeks.length) throw new Error("empty");
            data.weeks.forEach(function (week) {
                week.forEach(function (day) {
                    const cell = document.createElement("span");
                    cell.className = "gh-cell";
                    cell.dataset.l = day ? day.l : "x";

                    if (day) {
                        const parts = day.d.split("-");
                        const euroDate = parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : day.d;
                        cell.title = day.c + (day.c === 1 ? " contribution on " : " contributions on ") + euroDate;
                    }

                    grid.appendChild(cell);
                });
            });
            grid.hidden = false;
            fallback.hidden = true;

            const genDate = new Date(data.generated);
            const formattedDate = genDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const summary = data.total + " contributions in the last " + data.weeks.length + " weeks";

            meta.innerHTML = summary + "<br><span style='font-size: 0.75rem;'>Last updated: " + formattedDate + "</span>";
            link.setAttribute("aria-label", summary + " – open GitHub profile");
        })
        .catch(function () { fallback.textContent = "View contribution activity on GitHub"; });
})();

/* PCB CAD Generator Setup */
(function initPcbCAD() {
    const canvas = document.getElementById('hero-pcb-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const traceCanvas = document.createElement('canvas');
    const traceCtx = traceCanvas.getContext('2d');

    // GitHub Actions secret placeholder target injected during build
    const SECRET_PASSCODE = "__PCB_SECRET_PLACEHOLDER__";

    let config = {
        mask: 'auto', // 'white' in Light theme, 'green' in Dark theme
        cardOpacity: 0.85,
        gridSize: 10,
        speed: 0.2,

        zoneW: 60,
        zoneH: 80,
        diagCutoff: 100,
        showBoundary: false,

        numPassives: 32,
        numSOIC: 8,
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
        white: { bg: 'rgba(235, 240, 235, 0.75)', trace: '#e2e8f0', silk: '#044123' },
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
        maskSelect.value = config.mask;
        maskSelect.addEventListener('change', (e) => { config.mask = e.target.value; });

        const showBoundaryCheckbox = document.getElementById('ctrl-showBoundary');
        showBoundaryCheckbox.checked = config.showBoundary;
        showBoundaryCheckbox.addEventListener('change', (e) => {
            config.showBoundary = e.target.checked;
            drawPCB();
        });

        document.getElementById('btn-regenerate-pcb').addEventListener('click', initGenerator);
    }

    function openSecretModal() {
        const inputPasscode = prompt("Enter Secret PCB Tuning Passcode:");
        if (!inputPasscode) return;

        if (inputPasscode.trim() === SECRET_PASSCODE.trim()) {
            const modal = document.getElementById('pcb-secret-modal');
            if (modal) {
                modal.classList.add('open');
                modal.setAttribute('aria-hidden', 'false');
            }
        } else {
            alert("Access Denied: Incorrect passcode.");
        }
    }

    // Trigger shortcut: Ctrl+Shift+P OR click brand logo 5 times
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            openSecretModal();
        }
    });

    let logoClicks = 0;
    const logoEl = document.getElementById('brand-logo');
    if (logoEl) {
        logoEl.addEventListener('click', () => {
            logoClicks++;
            if (logoClicks >= 5) {
                logoClicks = 0;
                openSecretModal();
            }
        });
    }

    const closeBtn = document.getElementById('btn-close-pcb-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const modal = document.getElementById('pcb-secret-modal');
            if (modal) {
                modal.classList.remove('open');
                modal.setAttribute('aria-hidden', 'true');
            }
        });
    }

    buildUI();
    setTimeout(initGenerator, 100);
})();