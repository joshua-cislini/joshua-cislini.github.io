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

    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

    // Detects screens under 850px, touch devices, or system-level accessibility settings
    const isStatic = window.matchMedia && window.matchMedia("(max-width: 850px), (pointer: coarse), (prefers-reduced-motion: reduce)").matches;

    if (isStatic) {
        if (fpsWidget) fpsWidget.style.display = 'none';
        animate(performance.now(), true); // Draw exactly one static frame
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
            // Re-draw the static frame if the user resizes a static window
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

/* GitHub contribution chart: static JSON generated daily by a GitHub Action */
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
                    if (day) cell.title = day.c + (day.c === 1 ? " contribution on " : " contributions on ") + day.d;
                    grid.appendChild(cell);
                });
            });
            grid.hidden = false;
            fallback.hidden = true;

            // Format the generated date string 
            const genDate = new Date(data.generated);
            const formattedDate = genDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

            const summary = data.total + " contributions in the last " + data.weeks.length + " weeks";

            // Inject the summary and the last updated date
            meta.innerHTML = summary + "<br><span style='font-size: 0.75rem; opacity: 0.75;'>Last updated: " + formattedDate + "</span>";
            link.setAttribute("aria-label", summary + " – open GitHub profile");
        })
        .catch(function () { fallback.textContent = "View contribution activity on GitHub"; });
})();