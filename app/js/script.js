const tl = gsap.timeline();

tl.fromTo(
  ".stagger",
  { opacity: 0, y: 20 },
  { opacity: 1, duration: .75, y: 0, ease: "power1.out", stagger: .4 }
);
