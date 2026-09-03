const tabs = document.querySelectorAll('.navbar__toggle-item[role="tab"]');
const panels = document.querySelectorAll('[role="tabpanel"]');
let designsLoaded = false;
let panelToken = 0; // bumped on every switch so a fast second click abandons the in-flight one
// tracked separately from the `hidden` attribute, since both panels are briefly
// un-hidden at once while a switch is in progress
let activePanel = document.querySelector('[role="tabpanel"]:not([hidden])') || panels[0];

const subnavStack = document.querySelector('.subnav-stack');
const subnavs = document.querySelectorAll('.subnav-stack .subnav'); // [0] = Overview list, [1] = Designs list
const toggleIndicator = document.querySelector('.navbar__toggle-indicator');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function moveIndicatorTo(tab) {
    if (!toggleIndicator) return;
    toggleIndicator.style.width = tab.offsetWidth + 'px';
    toggleIndicator.style.transform = `translateX(${tab.offsetLeft}px)`;
}

// Keep --nav-h in sync with the navbar's real rendered height, since it's
// no longer a fixed value — it changes with font-size, zoom, wrapping, etc.
const navbar = document.querySelector('.navbar');
const main = document.querySelector('main');
const syncNavHeight = () => {
    document.documentElement.style.setProperty('--nav-h', navbar.getBoundingClientRect().height + 'px');
};
syncNavHeight(); // set it immediately, don't wait for the first resize event
new ResizeObserver(syncNavHeight).observe(navbar);

if (toggleIndicator) {
    // set the pill's starting position instantly, with no transition, before the first paint
    toggleIndicator.style.transition = 'none';
    moveIndicatorTo(document.querySelector('.navbar__toggle-item--active'));
    toggleIndicator.offsetWidth; // force reflow so the transition-less position is registered
    toggleIndicator.style.transition = '';

    // keep the pill aligned with the active tab if sizes change (font-size breakpoints, zoom, etc.)
    new ResizeObserver(() => moveIndicatorTo(document.querySelector('.navbar__toggle-item--active'))).observe(navbar);
}

function scrollToTop() {
    // Both panels start at the same position (right after the shared logo),
    // so we always scroll to the top of <main> rather than to a specific panel —
    // that keeps the logo visible instead of jumping past it every time.
    const navHeight = navbar.getBoundingClientRect().height;
    const targetY = window.scrollY + main.getBoundingClientRect().top - navHeight;
    window.scrollTo({
        top: Math.max(targetY, 0),
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
    });
}

function animateSubnavWidth(isOverview) {
    // FIRST: measure current width before anything changes
    const startWidth = subnavStack.getBoundingClientRect().width;

    // swap which list is in the layout
    subnavs[0].classList.toggle('subnav--show', isOverview);
    subnavs[0].classList.toggle('subnav--hidden', !isOverview);
    subnavs[1].classList.toggle('subnav--show', !isOverview);
    subnavs[1].classList.toggle('subnav--hidden', isOverview);

    // LAST: measure the new natural width now that the content changed
    const endWidth = subnavStack.getBoundingClientRect().width;

    if (prefersReducedMotion || startWidth === endWidth) return;

    // INVERT: pin the box back to its old width...
    subnavStack.style.width = startWidth + 'px';
    subnavStack.offsetWidth; // force a reflow so the browser registers the start value

    // PLAY: transition to the new width
    subnavStack.style.transition = 'width .18s ease';
    subnavStack.style.width = endWidth + 'px';

    subnavStack.addEventListener('transitionend', function onDone(e) {
        if (e.propertyName !== 'width') return;
        // release the inline width so the box stays responsive to content/viewport changes
        subnavStack.style.width = '';
        subnavStack.style.transition = '';
        subnavStack.removeEventListener('transitionend', onDone);
    });
}

// double rAF so the browser actually paints the current state before the next
// style change — a single rAF can still land before that paint, collapsing the transition
function nextFrame(fn) {
    requestAnimationFrame(() => requestAnimationFrame(fn));
}

function switchPanel(oldPanel, newPanel, enterFromLeft) {
    if (oldPanel === newPanel) return;

    const token = ++panelToken; // any earlier in-flight switch checks this and bails out
    const stale = () => token !== panelToken;

    if (prefersReducedMotion) {
        oldPanel.hidden = true;
        newPanel.hidden = false;
        return;
    }

    const exitOffset = enterFromLeft ? '8rem' : '-8rem'; // where the outgoing panel slides to
    const enterOffset = enterFromLeft ? '-8rem' : '8rem'; // where the incoming panel starts from

    // Clear any leftover styles from previous animations before starting a new one
    oldPanel.style.transition = '';
    oldPanel.style.transform = '';
    oldPanel.style.opacity = '';

    // Step 1: slide the outgoing panel out to the side and fade it out.
    // The incoming panel stays fully hidden (display: none) until this finishes,
    // so the two never occupy layout space at the same time.
    oldPanel.style.transform = `translateX(${exitOffset})`;
    oldPanel.style.opacity = '0';

    oldPanel.addEventListener('transitionend', function onExit(e) {
        if (e.target !== oldPanel || e.propertyName !== 'transform') return;
        oldPanel.removeEventListener('transitionend', onExit);
        
        oldPanel.hidden = true;
        oldPanel.style.transform = '';
        oldPanel.style.opacity = '';
        oldPanel.style.transition = '';
        
        if (stale()) {
            // Animation was interrupted. Ensure the current activePanel is fully visible and clean.
            activePanel.hidden = false;
            activePanel.style.transform = '';
            activePanel.style.opacity = '';
            activePanel.style.transition = '';
            return;
        }

        // Step 2: bring the incoming panel in, parked off-screen and invisible
        newPanel.hidden = false;
        newPanel.style.transition = 'none';
        newPanel.style.transform = `translateX(${enterOffset})`;
        newPanel.style.opacity = '0';
        newPanel.offsetWidth; // force reflow so the starting position is registered before animating
        newPanel.style.transition = '';

        nextFrame(() => {
            if (stale()) return;

            // Step 3: slide the incoming panel into place and fade it in
            newPanel.style.transform = 'translateX(0)';
            newPanel.style.opacity = '1';

            newPanel.addEventListener('transitionend', function onEnter(e2) {
                if (e2.target !== newPanel || e2.propertyName !== 'transform') return;
                newPanel.removeEventListener('transitionend', onEnter);
                
                newPanel.style.transition = '';
                newPanel.style.transform = '';
                newPanel.style.opacity = '';
                
                if (stale()) return;
            });
        });
    });
}

function activate(tab) {
    const isOverview = tab.id === 'tab-overview';

    tabs.forEach(t => {
        const selected = t === tab;
        t.setAttribute('aria-selected', selected);
        t.tabIndex = selected ? 0 : -1;
        t.classList.toggle('navbar__toggle-item--active', selected);
    });

    moveIndicatorTo(tab);
    animateSubnavWidth(isOverview);

    const newPanel = document.getElementById(tab.getAttribute('aria-controls'));
    // Overview sits to the left of Designs in the toggle, so switching to
    // Designs enters from the right, and switching to Overview enters from the left
    switchPanel(activePanel, newPanel, isOverview);
    activePanel = newPanel;

    // Lazily hydrate media the first time the Designs tab is opened
    if (tab.id === 'tab-designs' && !designsLoaded) {
        document.querySelectorAll('#panel-designs [data-src]').forEach(el => {
            el.src = el.dataset.src;
            el.removeAttribute('data-src');
        });
        designsLoaded = true;
    }

    // Bring the active panel into view — needed because the nav is sticky
    // and the user may have scrolled well past the panels themselves.
    scrollToTop();
}

tabs.forEach(tab => tab.addEventListener('click', () => activate(tab)));

// basic keyboard support (left/right arrow between the two toggle buttons)
document.querySelector('.navbar__toggle').addEventListener('keydown', e => {
    if (!e.target.matches('.navbar__toggle-item')) return;
    const list = Array.from(tabs);
    const i = list.indexOf(document.activeElement);
    if (e.key === 'ArrowRight') list[(i + 1) % list.length].focus();
    if (e.key === 'ArrowLeft') list[(i - 1 + list.length) % list.length].focus();
    if (e.key === 'Enter' || e.key === ' ') activate(document.activeElement);
});