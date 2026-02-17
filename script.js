gsap.registerPlugin(ScrollTrigger);

const video = document.getElementById("bgVideo");
const hero  = document.getElementById("hero");

let targetTime = 0;
let primed = false;

// Smooth seek loop
(function rafLoop() {
  if (primed && video.duration) {
    const cur = video.currentTime || 0;
    const next = cur + (targetTime - cur) * 0.18;
    if (Math.abs(next - cur) > 0.001) video.currentTime = next;
  }
  requestAnimationFrame(rafLoop);
})();

async function primeVideo() {
  // stop any autoplay immediately
  video.pause();

  // try play->pause once (helps “unlock” decoding)
  try {
    await video.play();
    video.pause();
  } catch (_) {}

  // force a tiny seek (the “console hack” you did)
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

  // reset to start, ready for scroll
  video.pause();
  video.currentTime = 0;
  primed = true;
}

function setupScroll() {
  const scrollDistance = () => window.innerHeight * 5; // 5 screens = whole video

  ScrollTrigger.create({
    trigger: hero,
    start: "top top",
    end: () => "+=" + scrollDistance(),
    pin: true,
    scrub: 0.4,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      targetTime = self.progress * video.duration;
    },
    // markers: true, // uncomment to verify start/end + pin
  });

  ScrollTrigger.refresh();
}

async function init() {
  if (!video.duration) return; // safety
  await primeVideo();
  setupScroll();
}

if (video.readyState >= 1) {
  // metadata already loaded (cached / fast)
  init();
} else {
  video.addEventListener("loadedmetadata", init, { once: true });
}

window.addEventListener("resize", () => ScrollTrigger.refresh());