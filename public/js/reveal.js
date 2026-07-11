// ==========================================================
// Portfolio motion layer.
//
// Features: word/char split reveals, scroll reveals (+ clip),
// parallax, scroll progress, live clock, ISO-week version tag,
// counter tween, magnetic buttons, custom cursor with labels,
// seamless marquee, mobile nav toggle.
//
// Robust to no-JS: CSS-only safety nets reveal content after a
// timeout even if this script fails or IntersectionObserver is
// missing.
// ==========================================================

(function () {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(hover: none)').matches || window.matchMedia('(pointer: coarse)').matches;

    // ---------------- ISO-week tag ----------------
    // `v2026.<week>` labels in the status bar + footer.
    const isoWeek = (() => {
        const d = new Date();
        const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = target.getUTCDay() || 7;
        target.setUTCDate(target.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
        return Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
    })();
    document.querySelectorAll('[data-week-iso]').forEach(el => {
        el.textContent = String(isoWeek).padStart(2, '0');
    });

    // ---------------- Live clock ----------------
    const clocks = document.querySelectorAll('[data-clock]');
    if (clocks.length) {
        const tick = () => {
            const n = new Date();
            const hh = String(n.getHours()).padStart(2, '0');
            const mm = String(n.getMinutes()).padStart(2, '0');
            const stamp = `${hh}:${mm} local`;
            clocks.forEach(c => c.textContent = stamp);
        };
        tick();
        setInterval(tick, 15000);
    }

    // ---------------- Marquee seamless loop ----------------
    // Duplicate track children once so the `-50%` translate loop
    // appears continuous. Only do this for explicit data-marquee tracks.
    document.querySelectorAll('[data-marquee]').forEach(track => {
        if (track.dataset.marqueeReady) return;
        const kids = Array.from(track.children);
        kids.forEach(k => track.appendChild(k.cloneNode(true)));
        track.dataset.marqueeReady = '1';
    });

    // ---------------- Word split ----------------
    // Elements with data-split have contents re-wrapped so each word
    // (and each inline child) animates independently. Inline children
    // (<em>, <strong>) stay intact — the whole element animates as one "word".
    const wrapWord = (parent, node, wiRef) => {
        const wrap = document.createElement('span');
        wrap.className = 'word';
        const inner = document.createElement('span');
        inner.style.setProperty('--wi', wiRef.i++);
        inner.appendChild(node);
        wrap.appendChild(inner);
        parent.appendChild(wrap);
    };
    document.querySelectorAll('[data-split]').forEach(el => {
        if (el.dataset.splitDone) return;
        const wi = { i: 0 };
        const originalChildren = Array.from(el.childNodes);
        el.textContent = '';
        for (const node of originalChildren) {
            if (node.nodeType === Node.TEXT_NODE) {
                const parts = node.nodeValue.split(/(\s+)/);
                for (const p of parts) {
                    if (!p) continue;
                    if (/^\s+$/.test(p)) {
                        el.appendChild(document.createTextNode(p));
                    } else {
                        wrapWord(el, document.createTextNode(p), wi);
                    }
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                wrapWord(el, node, wi);
            }
        }
        el.classList.add('word-reveal');
        el.dataset.splitDone = '1';
    });

    // ---------------- Char split (for signature wordmark) ----------------
    // NB-space ( ) keeps the gap width the same as a normal space but
    // survives collapsing when wrapped in an inline-block span.
    const NBSP = ' ';
    document.querySelectorAll('[data-split-chars]').forEach(el => {
        if (el.dataset.splitDone) return;
        const text = el.textContent.trim();
        el.textContent = '';
        let ci = 0;
        for (const ch of text) {
            const span = document.createElement('span');
            if (ch === ' ') {
                span.className = 'char space';
                span.textContent = NBSP;
            } else {
                span.className = 'char';
                span.textContent = ch;
            }
            span.style.setProperty('--ci', ci++);
            el.appendChild(span);
        }
        el.classList.add('char-reveal');
        el.dataset.splitDone = '1';
    });

    // ---------------- Counter tween ----------------
    // Counts from 0 up to data-counter over ~1.4s with ease-out-cubic.
    const animateCounter = el => {
        if (el.dataset.counted) return;
        el.dataset.counted = '1';
        const target = parseInt(el.getAttribute('data-counter'), 10);
        if (!Number.isFinite(target)) return;
        if (prefersReducedMotion) {
            el.textContent = target;
            return;
        }
        const duration = 1400;
        const start = performance.now();
        const easeOut = t => 1 - Math.pow(1 - t, 3);
        const step = now => {
            const t = Math.min(1, (now - start) / duration);
            const v = Math.floor(easeOut(t) * target);
            el.textContent = v;
            if (t < 1) requestAnimationFrame(step);
            else el.textContent = target;
        };
        requestAnimationFrame(step);
    };

    // ---------------- Scroll reveal (IntersectionObserver) ----------------
    const revealSelector = [
        '.reveal', '.reveal-x', '.reveal-right',
        '.reveal-zoom', '.reveal-clip',
        '.word-reveal', '.char-reveal'
    ].join(', ');

    const fireReveal = el => {
        el.classList.add('in');
        // cascading counters inside the revealed subtree
        el.querySelectorAll?.('[data-counter]').forEach(animateCounter);
        if (el.matches?.('[data-counter]')) animateCounter(el);
    };

    if (!('IntersectionObserver' in window)) {
        document.querySelectorAll(revealSelector).forEach(fireReveal);
        document.querySelectorAll('[data-counter]').forEach(animateCounter);
    } else {
        const io = new IntersectionObserver(
            entries => {
                for (const e of entries) {
                    if (e.isIntersecting) {
                        fireReveal(e.target);
                        io.unobserve(e.target);
                    }
                }
            },
            { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
        );
        document.querySelectorAll(revealSelector).forEach(el => io.observe(el));
        // Counters not inside a reveal element — observe separately so
        // they still tween when scrolled into view.
        document.querySelectorAll('[data-counter]').forEach(el => {
            if (el.closest(revealSelector)) return;
            io.observe(el);
        });

        // Safety net — after load+1.8s, force-reveal anything still hidden.
        // Catches cases where the page was loaded already scrolled past.
        window.addEventListener('load', () => {
            setTimeout(() => {
                document.querySelectorAll(revealSelector).forEach(el => {
                    if (!el.classList.contains('in')) fireReveal(el);
                });
                document.querySelectorAll('[data-counter]').forEach(el => {
                    if (!el.dataset.counted) animateCounter(el);
                });
            }, 1800);
        });
    }

    // ---------------- Topbar shadow + scroll progress ----------------
    const topbar = document.querySelector('.topbar');
    const progress = document.querySelector('.scroll-progress > span');
    const onScroll = () => {
        const y = window.scrollY;
        if (topbar) topbar.classList.toggle('scrolled', y > 12);
        if (progress) {
            const doc = document.documentElement;
            const max = (doc.scrollHeight - doc.clientHeight) || 1;
            const pct = Math.min(100, Math.max(0, (y / max) * 100));
            progress.style.width = pct + '%';
        }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // ---------------- Parallax ----------------
    if (!prefersReducedMotion) {
        const parallaxEls = Array.from(document.querySelectorAll('[data-parallax]'))
            .map(el => ({
                el,
                rate: parseFloat(el.getAttribute('data-parallax')) || 0.15,
            }));

        if (parallaxEls.length) {
            let ticking = false;
            const update = () => {
                const vh = window.innerHeight;
                for (const { el, rate } of parallaxEls) {
                    const r = el.getBoundingClientRect();
                    if (r.bottom < -200 || r.top > vh + 200) continue;
                    const center = r.top + r.height / 2;
                    const delta = (center - vh / 2) * -rate;
                    // Use the `translate` property (not `transform`) so
                    // we compose cleanly with any `transform: scale(...)`
                    // on revealed elements.
                    el.style.translate = `0 ${delta.toFixed(1)}px`;
                }
                ticking = false;
            };
            const req = () => {
                if (!ticking) { requestAnimationFrame(update); ticking = true; }
            };
            window.addEventListener('scroll', req, { passive: true });
            window.addEventListener('resize', req);
            update();
        }
    }

    // ---------------- Mobile nav toggle ----------------
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.nav');
    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            nav.classList.toggle('open');
            toggle.setAttribute('aria-expanded', String(nav.classList.contains('open')));
        });
        nav.querySelectorAll('a').forEach(a =>
            a.addEventListener('click', () => nav.classList.remove('open'))
        );
    }

    // ---------------- Magnetic buttons ----------------
    // Cursor "pulls" the element within its bounding rect, at ~28% strength,
    // with a soft distance-based falloff past ~120px.
    if (!isTouch && !prefersReducedMotion) {
        document.querySelectorAll('.magnetic').forEach(el => {
            const strength = 0.28;
            const radius = 120;
            el.addEventListener('mousemove', e => {
                const r = el.getBoundingClientRect();
                const cx = r.left + r.width / 2;
                const cy = r.top + r.height / 2;
                const dx = e.clientX - cx;
                const dy = e.clientY - cy;
                const dist = Math.hypot(dx, dy);
                const falloff = Math.min(1, radius / (dist + 1));
                el.style.transform = `translate(${dx * strength * falloff}px, ${dy * strength * falloff}px)`;
            });
            el.addEventListener('mouseleave', () => { el.style.transform = ''; });
        });
    }

    // ---------------- Custom cursor ----------------
    if (!isTouch && !prefersReducedMotion) {
        const cursor = document.querySelector('.cursor');
        const label = document.querySelector('.cursor-label');
        if (cursor && label) {
            let mx = 0, my = 0, lx = 0, ly = 0;
            let lbx = 0, lby = 0;
            let rafId = null;
            let active = false;

            const loop = () => {
                // easy lerp for a slight trailing feel
                lx += (mx - lx) * 0.3;
                ly += (my - ly) * 0.3;
                // label trails a bit slower — feels heavier / intentional
                lbx += (mx + 28 - lbx) * 0.22;
                lby += (my - 28 - lby) * 0.22;
                cursor.style.transform = `translate3d(${lx}px, ${ly}px, 0) translate(-50%, -50%)`;
                label.style.transform = `translate3d(${lbx}px, ${lby}px, 0) translate(-50%, -50%)`;
                if (active) rafId = requestAnimationFrame(loop);
                else rafId = null;
            };

            window.addEventListener('mousemove', e => {
                mx = e.clientX;
                my = e.clientY;
                if (!active) {
                    // warm up on first move to avoid a positional jump
                    lx = mx; ly = my;
                    lbx = mx + 28; lby = my - 28;
                    active = true;
                    cursor.classList.add('visible');
                }
                if (!rafId) rafId = requestAnimationFrame(loop);
            });

            document.addEventListener('mouseleave', () => {
                active = false;
                cursor.classList.remove('visible');
                label.classList.remove('visible');
            });

            const hoverSelector = 'a, button, [data-cursor]';
            document.addEventListener('mouseover', e => {
                const target = e.target.closest(hoverSelector);
                if (!target) return;
                cursor.classList.add('hover-link');
                const txt = target.getAttribute('data-cursor');
                if (txt) {
                    label.textContent = txt;
                    label.classList.add('visible');
                } else {
                    label.classList.remove('visible');
                }
            });
            document.addEventListener('mouseout', e => {
                const from = e.target.closest(hoverSelector);
                const to = e.relatedTarget && e.relatedTarget.closest?.(hoverSelector);
                if (from && !to) {
                    cursor.classList.remove('hover-link');
                    label.classList.remove('visible');
                }
            });
        }
    }
})();
