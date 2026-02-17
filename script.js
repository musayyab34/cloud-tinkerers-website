gsap.registerPlugin(ScrollTrigger);

window.addEventListener("load", () => {
  const video  = document.getElementById("bgVideo");
  const hero   = document.getElementById("hero");
  const navbar = document.querySelector(".navbar");

  if (!video || !hero) return;

  // ===== Cinematic knobs =====
  const TOTAL_SCREENS = 5;        // 5 screens = full video
  const NAV_FADE_SCREENS = 2;     // navbar fully gone after 2 screens
  const VIDEO_SCRUB = 1.4;        // higher = smoother scroll inertia (1.0–2.0)
  const VIDEO_SMOOTHING = 0.06;   // lower = more cinematic (0.05–0.10)
  const NAV_FADE_EASE_DUR = 0.8;  // smooth fade response time
  // ==========================

  let targetTime = 0;
  let primed = false;

  // Smooth seek loop for video frames
  (function rafLoop() {
    if (primed && video.duration) {
      const cur = video.currentTime || 0;
      const next = cur + (targetTime - cur) * VIDEO_SMOOTHING;
      if (Math.abs(next - cur) > 0.001) video.currentTime = next;
    }
    requestAnimationFrame(rafLoop);
  })();

  // Smooth navbar opacity setter (prevents jitter on fast wheel scrolls)
  const setNavAlpha = navbar
    ? gsap.quickTo(navbar, "opacity", { duration: NAV_FADE_EASE_DUR, ease: "power2.out" })
    : null;

  async function primeVideo() {
    video.pause();

    // play->pause (unlocks decoding on some systems)
    try {
      await video.play();
      video.pause();
    } catch (_) {}

    // tiny seek (automates the “console hack” that made it work)
    await new Promise((resolve) => {
      const t = Math.min(0.1, (video.duration || 1) - 0.001);
      const timeout = setTimeout(resolve, 800);

      video.addEventListener(
        "seeked",
        () => {
          clearTimeout(timeout);
          resolve();
        },
        { once: true }
      );

      video.currentTime = t;
    });

    video.pause();
    video.currentTime = 0;
    primed = true;
  }

  function setupUnifiedScroll() {
    const scrollDistance = () => window.innerHeight * TOTAL_SCREENS;

    ScrollTrigger.create({
      trigger: hero,
      start: "top top",
      end: () => "+=" + scrollDistance(),
      pin: true,
      scrub: VIDEO_SCRUB,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        // Video scrub (0..duration)
        targetTime = self.progress * video.duration;

        // Navbar fade based on "screens scrolled" inside the pinned hero
        if (navbar && setNavAlpha) {
          const screensScrolled = self.progress * TOTAL_SCREENS; // 0..5
          const fadeP = Math.min(1, screensScrolled / NAV_FADE_SCREENS); // 0..1 over first 2 screens
          const alpha = 1 - fadeP;

          setNavAlpha(alpha);
          navbar.style.pointerEvents = alpha < 0.05 ? "none" : "auto";
        }
      }
      // markers: true, // uncomment to debug
    });
  }

  async function init() {
    // If metadata isn't ready yet, wait for it
    if (video.readyState < 1) {
      video.addEventListener("loadedmetadata", init, { once: true });
      return;
    }

    await primeVideo();
    setupUnifiedScroll();
    ScrollTrigger.refresh();
  }

  init();
  window.addEventListener("resize", () => ScrollTrigger.refresh());
});