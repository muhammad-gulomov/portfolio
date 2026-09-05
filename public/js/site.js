// Theme toggle. That is the whole script.

(function () {
    var GROUND = { light: '#f3f6f4', dark: '#18181b' }

    // ── Theme ────────────────────────────────────────────────────────────────
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var root = document.documentElement
            var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
            root.setAttribute('data-theme', next)
            try { localStorage.setItem('theme', next) } catch (e) { /* private mode */ }
            var meta = document.querySelector('meta[name="theme-color"]')
            if (meta) meta.setAttribute('content', GROUND[next])

            // Restart the swap animation. Removing and re-adding the class in
            // the same frame does nothing on its own — the browser coalesces
            // both into one style computation and sees no change. Reading
            // offsetWidth in between forces a reflow, so the removal is
            // committed and re-adding it counts as a fresh start.
            btn.classList.remove('is-switching')
            void btn.offsetWidth
            btn.classList.add('is-switching')
        })
    })

    // ── Scroll cue ───────────────────────────────────────────────────────────
    var cue = document.querySelector('[data-scroll-cue]')
    if (cue) {
        var overflows = function () {
            return document.documentElement.scrollHeight - window.innerHeight > 24
        }

        var dismiss = function () {
            cue.classList.add('is-leaving')
            window.removeEventListener('scroll', dismiss)
            setTimeout(function () { cue.hidden = true }, 240)
        }

        var sync = function () {
            // Only offer the cue if the page has not been scrolled yet; showing
            // it to someone already partway down would be telling them what
            // they have already discovered.
            if (overflows() && window.scrollY < 8) {
                cue.hidden = false
                cue.classList.remove('is-leaving')
            } else if (!overflows()) {
                cue.hidden = true
            }
        }

        sync()

        // Re-check once webfonts have swapped in. font-display:swap means the
        // first layout is measured in the fallback face, whose metrics differ
        // enough to make a page that ends up fitting look like it overflows —
        // so the cue would latch on and never clear.
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(sync).catch(function () { /* no-op */ })
        }

        window.addEventListener('scroll', dismiss, { passive: true, once: true })
        // Rotating a phone changes whether the page overflows at all.
        window.addEventListener('resize', sync, { passive: true })
    }
})()
