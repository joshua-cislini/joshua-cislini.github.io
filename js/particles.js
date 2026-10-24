/* Background Particle Engine & Mouse Repulsion/Attraction */
let cachedParticleColors = { r: 0, g: 155, b: 101 };

function updateParticleColorsCache() {
    const styles = getComputedStyle(document.documentElement);
    cachedParticleColors = {
        r: parseInt(styles.getPropertyValue('--particle-color-r').trim() || "0", 10),
        g: parseInt(styles.getPropertyValue('--particle-color-g').trim() || "155", 10),
        b: parseInt(styles.getPropertyValue('--particle-color-b').trim() || "101", 10)
    };
}

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