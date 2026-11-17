/* Interactive particle network for the page background.
   - Nodes drift slowly and connect to nearby nodes
   - The pointer draws glowing links and gently pushes nodes away
   - Adapts to light/dark theme, pauses when the tab is hidden
   - Static (no motion) when the visitor prefers reduced motion
   Load with: <script src="particles.js" defer></script> */
(() => {
    'use strict';

    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const themeBox = document.getElementById('theme-toggle');

    const LINK_DIST = 140;
    const MOUSE_DIST = 180;
    const PUSH_DIST = 140;

    let w = 0, h = 0, dpr = 1, nodes = [], raf = 0, resizeTimer = 0;
    const mouse = { x: -9999, y: -9999 };

    const rand = (a, b) => a + Math.random() * (b - a);

    function makeNode() {
        return {
            x: rand(0, w),
            y: rand(0, h),
            vx: rand(-0.22, 0.22),
            vy: rand(-0.22, 0.22),
            r: rand(1, 2.4),
            blue: Math.random() < 0.22
        };
    }

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const max = w < 700 ? 40 : 95;
        const count = Math.round(Math.min(max, (w * h) / 15000));
        while (nodes.length < count) nodes.push(makeNode());
        nodes.length = count;

        // Re-draw immediately: resizing a canvas clears it
        frame(false);
    }

    function colors() {
        const light = themeBox && themeBox.checked;
        return light
            ? { orange: '232,93,42', blue: '59,91,219', node: 0.7, line: 0.26 }
            : { orange: '255,154,101', blue: '120,160,255', node: 0.85, line: 0.24 };
    }

    function frame(update) {
        ctx.clearRect(0, 0, w, h);
        const c = colors();

        // move nodes
        if (update) {
            for (const n of nodes) {
                n.x += n.vx;
                n.y += n.vy;

                if (n.x < -20) n.x = w + 20; else if (n.x > w + 20) n.x = -20;
                if (n.y < -20) n.y = h + 20; else if (n.y > h + 20) n.y = -20;

                const dx = n.x - mouse.x;
                const dy = n.y - mouse.y;
                const d = Math.hypot(dx, dy);
                if (d < PUSH_DIST && d > 0.1) {
                    const push = (1 - d / PUSH_DIST) * 0.9;
                    n.x += (dx / d) * push;
                    n.y += (dy / d) * push;
                }
            }
        }

        // links between nodes
        ctx.lineWidth = 1;
        for (let i = 0; i < nodes.length; i++) {
            const a = nodes[i];
            for (let j = i + 1; j < nodes.length; j++) {
                const b = nodes[j];
                const dx = a.x - b.x;
                if (dx > LINK_DIST || dx < -LINK_DIST) continue;
                const dy = a.y - b.y;
                const d = Math.hypot(dx, dy);
                if (d < LINK_DIST) {
                    const alpha = (1 - d / LINK_DIST) * c.line;
                    ctx.strokeStyle = 'rgba(' + c.orange + ',' + alpha.toFixed(3) + ')';
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }
        }

        // links to the pointer
        for (const n of nodes) {
            const d = Math.hypot(n.x - mouse.x, n.y - mouse.y);
            if (d < MOUSE_DIST) {
                const alpha = (1 - d / MOUSE_DIST) * 0.55;
                ctx.strokeStyle = 'rgba(' + c.orange + ',' + alpha.toFixed(3) + ')';
                ctx.beginPath();
                ctx.moveTo(n.x, n.y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
            }
        }

        // nodes (+ soft halo)
        for (const n of nodes) {
            const rgb = n.blue ? c.blue : c.orange;
            ctx.fillStyle = 'rgba(' + rgb + ',' + c.node + ')';
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(' + rgb + ',0.12)';
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r * 3.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function loop() {
        frame(true);
        raf = requestAnimationFrame(loop);
    }

    function start() {
        if (!raf && !reduce) raf = requestAnimationFrame(loop);
    }

    function stop() {
        cancelAnimationFrame(raf);
        raf = 0;
    }

    function resetMouse() {
        mouse.x = mouse.y = -9999;
    }

    // Debounced resize so dragging the window edge doesn't thrash the canvas
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 120);
    });

    // Pointer events cover mouse, pen and touch; touch is cleared on release
    window.addEventListener('pointermove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    }, { passive: true });
    window.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') resetMouse(); });
    window.addEventListener('pointercancel', resetMouse);
    document.documentElement.addEventListener('mouseleave', resetMouse);
    window.addEventListener('blur', resetMouse);

    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

    // Static mode: redraw once when the theme changes. Animated mode redraws every frame anyway.
    if (themeBox && reduce) themeBox.addEventListener('change', () => frame(false));

    // slow parallax for the aurora layer
    if (!reduce) {
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                document.documentElement.style.setProperty('--sy', window.scrollY);
                ticking = false;
            });
        }, { passive: true });
    }

    resize();
    start();
})();