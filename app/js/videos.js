document.querySelectorAll('video').forEach((video) => {
    // Autoplay is blocked by browsers unless the video is muted
    video.muted = true;
    video.playsInline = true;

    // Preload all videos on page load so metadata and posters are cached
    // This prevents dark screens when switching between tabs
    video.load();

    const observer = new IntersectionObserver(
        ([entry]) => {
            // intersectionRatio can land at 0.999x due to floating-point rounding,
            // so check "close to 1" rather than an exact 1.0 equality
            if (entry.isIntersecting && entry.intersectionRatio >= 0.999) {
                video.play().catch(() => { }); // catch: browser may still block if not yet muted in time
            } else {
                video.pause();
            }
        },
        { threshold: [0, 0.999, 1] }
    );

    observer.observe(video);
});

document.querySelectorAll('.ui-ux__video-container').forEach((container) => {
    const videos = container.querySelectorAll('video');
    if (videos.length === 0) return;

    videos.forEach((video) => {
        // Wrap just the <video> so the overlay doesn't stretch over the caption span
        const media = document.createElement('div');
        media.className = 'ui-ux__video-media';
        video.parentNode.insertBefore(media, video);
        media.appendChild(video);

        const overlay = document.createElement('button');
        overlay.className = 'play-overlay';
        overlay.setAttribute('aria-label', 'Play video');
        media.appendChild(overlay);

        video.muted = true;
        video.playsInline = true;

        video.addEventListener('play', () => {
            // Delay poster disappearing by 0.5s to avoid abrupt flash
            setTimeout(() => overlay.classList.remove('visible'), 500);
        });
        video.addEventListener('pause', () => overlay.classList.add('visible'));
        overlay.addEventListener('click', () => video.play().catch(() => { }));

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && entry.intersectionRatio >= 0.999) {
                    video.play().catch(() => { });
                } else {
                    video.pause();
                }
            },
            { threshold: [0, 0.999, 1] }
        );

        observer.observe(video);
    });
});

/* BROWSER TAB SWITCHING */

document.querySelectorAll('.browser').forEach((browser) => {
    const tabs = browser.querySelector('.browser__tabs');
    if (!tabs) return;

    const tabButtons = tabs.querySelectorAll('.browser__tab');
    const videos = browser.querySelectorAll('video');
    const images = browser.querySelectorAll('img');

    // Load the initially active video immediately
    const activeButton = tabs.querySelector('.browser__tab--active');
    if (activeButton) {
        const activeIndex = Array.from(tabButtons).indexOf(activeButton);
        if (activeIndex >= 0 && activeIndex < videos.length) {
            videos[activeIndex].load();
        }
    }

    tabButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            // Remove active class from all tabs
            tabButtons.forEach((btn) => btn.classList.remove('browser__tab--active'));

            // Add active class to clicked tab
            button.classList.add('browser__tab--active');

            // Toggle url-container collapsed state
            const urlContainer = browser.querySelector('.browser__url-container');
            if (index === 0) {
                // Final Design tab - show url container normally
                urlContainer?.classList.remove('browser__url-container--collapsed');
            } else {
                // Other tabs - collapse url container
                urlContainer?.classList.add('browser__url-container--collapsed');
            }

            // Hide all videos and images (including their overlays)
            videos.forEach((video) => {
                video.style.display = 'none';
                const overlay = video.parentElement?.querySelector('.play-overlay');
                if (overlay) {
                    overlay.style.display = 'none';
                }
            });
            images.forEach((img) => {
                img.style.display = 'none';
            });

            // Show the appropriate media for this tab
            if (index < videos.length) {
                const video = videos[index];
                video.style.display = '';
                const overlay = video.parentElement?.querySelector('.play-overlay');
                if (overlay) {
                    overlay.style.display = '';
                }
                // Preload the video poster and metadata
                video.load();
            } else if (index < videos.length + images.length) {
                images[index - videos.length].style.display = '';
            }
        });
    });
});