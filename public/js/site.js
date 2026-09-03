// Theme toggle + language menu. That is the whole script.

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

    // ── Language menu ────────────────────────────────────────────────────────
    var trigger = document.querySelector('[data-lang-trigger]')
    var menu = document.querySelector('[data-lang-menu]')
    if (!trigger || !menu) return

    function open() {
        menu.hidden = false
        trigger.setAttribute('aria-expanded', 'true')
    }

    function close(refocus) {
        menu.hidden = true
        trigger.setAttribute('aria-expanded', 'false')
        if (refocus) trigger.focus()
    }

    trigger.addEventListener('click', function (e) {
        e.stopPropagation()
        if (!menu.hidden) { close(false); return }
        open()
        // Move focus into the menu only for keyboard activation. A click
        // fired by Enter/Space reports detail 0; a real mouse click reports
        // 1 or more. Focusing on a mouse open would paint a focus ring on
        // the first option, which reads as a second selected state.
        if (e.detail === 0) menu.querySelector('a').focus()
    })

    // Clicking anywhere else closes it. Clicks inside the menu are left alone
    // so the link still navigates.
    document.addEventListener('click', function (e) {
        if (!menu.hidden && !menu.contains(e.target) && e.target !== trigger) close(false)
    })

    // Escape closes and returns focus to the trigger, so keyboard users are
    // never stranded inside a menu they cannot see.
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !menu.hidden) close(true)
    })

    // Arrow keys move between options, matching how a listbox is expected
    // to behave.
    menu.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
        e.preventDefault()
        var items = Array.prototype.slice.call(menu.querySelectorAll('a'))
        var i = items.indexOf(document.activeElement)
        var step = e.key === 'ArrowDown' ? 1 : -1
        items[(i + step + items.length) % items.length].focus()
    })
})()
