const tabs = document.querySelectorAll('.navbar__toggle-item[role="tab"]');
const panels = document.querySelectorAll('[role="tabpanel"]');
const panelsContainer = document.querySelector('.project__panels');
let designsLoaded = false;
let panelAnimation = null; // tracks an in-flight cross-fade so a fast second click can cancel it
// tracked separately from the `hidden` attribute, since both panels are briefly
// un-hidden at once while a cross-fade is in progress
let activePanel = document.querySelector('[role="tabpanel"]:not([hidden])') || panels[0];

const subnavStack = document.querySelector('.subnav-stack');
const subnavs = document.querySelectorAll('.subnav-stack .subnav'); // [0] = Overview list, [1] = Designs list
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Keep --nav-h in sync with the navbar's real rendered height, since it's
// no longer a fixed value — it changes with font-size, zoom, wrapping, etc.
const navbar = document.querySelector('.navbar');
const main = document.querySelector('main');
const syncNavHeight = () => {
    document.documentElement.style.setProperty('--nav-h', navbar.getBoundingClientRect().height + 'px');
};
syncNavHeight(); // set it immediately, don't wait for the first resize event
new ResizeObserver(syncNavHeight).observe(navbar);

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

function crossFadePanels(oldPanel, newPanel, enterFromLeft) {
    if (oldPanel === newPanel) return;

    // a fast second toggle interrupts the in-flight animation — finish it immediately
    if (panelAnimation) panelAnimation.cleanup();

    if (prefersReducedMotion || !panelsContainer) {
        oldPanel.hidden = true;
        newPanel.hidden = false;
        return;
    }

    const exitOffset = enterFromLeft ? '2rem' : '-2rem';
    const enterOffset = enterFromLeft ? '-2rem' : '2rem';

    // pin the container to its current height so it doesn't collapse once
    // the panels are taken out of flow (position: absolute) to overlap
    panelsContainer.style.height = panelsContainer.getBoundingClientRect().height + 'px';
    panelsContainer.classList.add('project__panels--animating');

    newPanel.hidden = false;
    newPanel.style.transition = 'none';
    newPanel.style.opacity = '0';
    newPanel.style.transform = `translateX(${enterOffset})`;
    newPanel.offsetWidth; // force reflow so the starting position is registered before animating
    newPanel.style.transition = '';

    // wait a full extra frame so the browser actually paints the "before" state above —
    // a single rAF can still fire before that paint happens, collapsing the transition to a jump
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            oldPanel.style.opacity = '0';
            oldPanel.style.transform = `translateX(${exitOffset})`;
            newPanel.style.opacity = '1';
            newPanel.style.transform = 'translateX(0)';
        });
    });

    const fallbackTimer = setTimeout(cleanup, 500);

    function onEnd(e) {
        if (e.target !== newPanel || e.propertyName !== 'transform') return;
        cleanup();
    }

    function cleanup() {
        newPanel.removeEventListener('transitionend', onEnd);
        clearTimeout(fallbackTimer);
        oldPanel.hidden = true;
        [oldPanel, newPanel].forEach(p => {
            p.style.transition = '';
            p.style.transform = '';
            p.style.opacity = '';
        });
        panelsContainer.classList.remove('project__panels--animating');
        panelsContainer.style.height = '';
        panelAnimation = null;
    }

    newPanel.addEventListener('transitionend', onEnd);
    panelAnimation = { cleanup };
}

function activate(tab) {
    const isOverview = tab.id === 'tab-overview';

    tabs.forEach(t => {
        const selected = t === tab;
        t.setAttribute('aria-selected', selected);
        t.tabIndex = selected ? 0 : -1;
        t.classList.toggle('navbar__toggle-item--active', selected);
    });

    animateSubnavWidth(isOverview);

    const newPanel = document.getElementById(tab.getAttribute('aria-controls'));
    // Overview sits to the left of Designs in the toggle, so switching to
    // Designs enters from the right, and switching to Overview enters from the left
    crossFadePanels(activePanel, newPanel, isOverview);
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