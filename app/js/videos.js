document.querySelectorAll('video').forEach((video) => {
    // Autoplay is blocked by browsers unless the video is muted
    video.muted = true;
    video.playsInline = true;

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
    const video = container.querySelector('video');
    if (!video) return;

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

    video.addEventListener('play', () => overlay.classList.remove('visible'));
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