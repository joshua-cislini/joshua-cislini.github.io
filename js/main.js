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

// Graceful Turnstile Success Handler with Worker Fetch & Fallback Unlock
window.onTurnstileSuccess = async function (token) {
    const statusEl = document.getElementById("gate-status");
    if (statusEl) {
        statusEl.textContent = "Verifying safety check...";
        statusEl.style.color = "";
    }

    let workerData = null;
    let fetchFailed = false;

    try {
        const response = await fetch("https://contact-decrypt.cislinij.workers.dev/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ token: token })
        });

        if (response.ok) {
            workerData = await response.json();
        } else {
            fetchFailed = true;
        }
    } catch (error) {
        console.warn("Cloudflare Worker fetch error (CORS or server unreachable):", error);
        fetchFailed = true;
    }

    // 1. If Cloudflare Worker succeeded
    if (workerData && workerData.success) {
        const emailLink = document.getElementById("email-link");
        const phoneLink = document.getElementById("phone-link");

        if (emailLink) {
            emailLink.href = "mailto:" + workerData.email;
            emailLink.textContent = workerData.email;
        }

        if (phoneLink) {
            phoneLink.href = "tel:" + workerData.phone.replace(/\s+/g, '');
            phoneLink.textContent = workerData.phone;
        }

        if (workerData.resumeBase64) {
            const blob = base64ToBlob(workerData.resumeBase64, 'application/pdf');
            activeResumeBlobUrl = URL.createObjectURL(blob);
            const dlBtn = document.getElementById("download-resume-link");
            if (dlBtn) dlBtn.href = activeResumeBlobUrl;
        }

        const gate = document.getElementById("contact-gate");
        const info = document.getElementById("contact-info-content");
        if (gate) gate.style.display = "none";
        if (info) info.style.display = "block";

        // 2. Fallback: If Turnstile passed green checkmark but Worker failed CORS/Connection
    } else if (token && token.length > 5) {
        console.log("Turnstile token valid. Unlocking contact details via client fallback...");
        unlockContactWithFallback();
    } else if (statusEl) {
        statusEl.textContent = "Verification failed. Please try again.";
        statusEl.style.color = "var(--ni-danger)";
    }
};

function base64ToBlob(base64, mimeType) {
    try {
        // 1. Strip the data URI prefix if it exists
        let cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;

        // 2. Remove any accidental whitespace or newlines from copy-pasting
        cleanBase64 = cleanBase64.replace(/\s+/g, '');

        const bin = atob(cleanBase64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
            bytes[i] = bin.charCodeAt(i);
        }
        return new Blob([bytes], { type: mimeType });
    } catch (e) {
        console.error("Failed to decode base64 resume:", e);
        return new Blob([], { type: mimeType });
    }
}

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
            if (typeof updateParticleColorsCache === 'function') updateParticleColorsCache();
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

    const licenseSection = document.querySelector("#licences");
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
            if (titleEl && !titleEl.querySelector(".valid-badge") && !titleEl.querySelector(".expired-badge")) {
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
