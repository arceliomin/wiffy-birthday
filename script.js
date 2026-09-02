/* =========================================================
   WIFFY BIRTHDAY — script.js
   Password gate, real-time countdown, scroll reveal,
   surprise cards, falling petals, music & voice controls.
   ========================================================= */

(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------------------------------------------------------
     1. COUNTDOWN (30 Sept 2026, 00:00 WIB = UTC+7)
     --------------------------------------------------------- */
  var TARGET_DATE = new Date("2026-09-30T00:00:00+07:00").getTime();

  var cdDays = document.getElementById("cd-days");
  var cdHours = document.getElementById("cd-hours");
  var cdMins = document.getElementById("cd-mins");
  var cdSecs = document.getElementById("cd-secs");
  var countdownTimer = null;

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function updateCountdown() {
    var now = Date.now();
    var diff = TARGET_DATE - now;

    if (diff <= 0) {
      cdDays.textContent = "00";
      cdHours.textContent = "00";
      cdMins.textContent = "00";
      cdSecs.textContent = "00";
      return;
    }

    var totalSeconds = Math.floor(diff / 1000);
    var days = Math.floor(totalSeconds / 86400);
    var hours = Math.floor((totalSeconds % 86400) / 3600);
    var mins = Math.floor((totalSeconds % 3600) / 60);
    var secs = totalSeconds % 60;

    cdDays.textContent = pad(days);
    cdHours.textContent = pad(hours);
    cdMins.textContent = pad(mins);
    cdSecs.textContent = pad(secs);
  }

  function startCountdown() {
    updateCountdown();
    countdownTimer = window.setInterval(updateCountdown, 1000);
  }

  function stopCountdown() {
    if (countdownTimer) {
      window.clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  startCountdown();

  /* ---------------------------------------------------------
     2. PASSWORD GATE
     --------------------------------------------------------- */
  var CORRECT_PASSWORD = "hubbysayangwiffyforever";
  var gate = document.getElementById("gate");
  var gateForm = document.getElementById("gate-form");
  var gateInput = document.getElementById("gate-password");
  var gateMessage = document.getElementById("gate-message");
  var main = document.getElementById("main");

  function unlockSite() {
    gateMessage.textContent = "Yeay, wiffy berhasil masuk. Sekarang buka pelan-pelan ya.";
    gateMessage.className = "gate-message is-success";

    try {
      window.sessionStorage.setItem("wiffy-unlocked", "1");
    } catch (e) {
      /* sessionStorage unavailable — not critical */
    }

    window.setTimeout(function () {
      gate.classList.add("is-leaving");
      stopCountdown();

      window.setTimeout(function () {
        gate.classList.add("hidden");
        main.classList.remove("hidden");
        main.setAttribute("aria-hidden", "false");
        window.requestAnimationFrame(function () {
          main.classList.add("is-visible");
        });
        initScrollReveal();
      }, prefersReducedMotion ? 0 : 900);
    }, 900);
  }

  function rejectPassword() {
    gateMessage.textContent = "Hmm bukan ini sayang, coba inget lagi pelan-pelan.";
    gateMessage.className = "gate-message is-error";
    gate.classList.add("is-shaking");
    window.setTimeout(function () {
      gate.classList.remove("is-shaking");
    }, 450);
  }

  gateForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var value = gateInput.value.trim();
    if (value === CORRECT_PASSWORD) {
      unlockSite();
    } else {
      rejectPassword();
    }
  });

  // Optional: skip gate again this session if already unlocked once.
  try {
    if (window.sessionStorage.getItem("wiffy-unlocked") === "1") {
      gate.classList.add("hidden");
      main.classList.remove("hidden");
      main.classList.add("is-visible");
      main.setAttribute("aria-hidden", "false");
      stopCountdown();
      initScrollReveal();
    }
  } catch (e) {
    /* ignore */
  }

  /* ---------------------------------------------------------
     3. SCROLL REVEAL
     --------------------------------------------------------- */
  var revealObserver = null;

  function initScrollReveal() {
    if (revealObserver) return;

    var revealEls = document.querySelectorAll(".reveal");

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach(function (el) {
        el.classList.add("in-view");
      });
      return;
    }

    revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  /* ---------------------------------------------------------
     4. HERO BUTTON — start music + reveal sticky toggle
     --------------------------------------------------------- */
  var openGiftBtn = document.getElementById("open-gift");
  var bgAudio = document.getElementById("bg-audio");
  var musicToggle = document.getElementById("music-toggle");
  var musicLabel = document.getElementById("music-label");

  function setMusicState(isPlaying) {
    musicToggle.setAttribute("aria-pressed", isPlaying ? "true" : "false");
    musicLabel.textContent = isPlaying ? "Musik" : "Musik";
  }

  function playBgAudio() {
    var playPromise = bgAudio.play();
    if (playPromise && playPromise.catch) {
      playPromise
        .then(function () {
          setMusicState(true);
        })
        .catch(function () {
          setMusicState(false);
        });
    } else {
      setMusicState(true);
    }
  }

  if (openGiftBtn) {
    openGiftBtn.addEventListener("click", function () {
      musicToggle.classList.remove("hidden");
      playBgAudio();
    });
  }

  if (musicToggle) {
    musicToggle.addEventListener("click", function () {
      if (bgAudio.paused) {
        playBgAudio();
      } else {
        bgAudio.pause();
        setMusicState(false);
      }
    });
  }

  /* ---------------------------------------------------------
     5. VOICE MESSAGE BUTTON (pauses bg music while playing)
     --------------------------------------------------------- */
  var voiceAudio = document.getElementById("voice-audio");
  var voiceToggle = document.getElementById("voice-toggle");
  var voiceLabel = document.getElementById("voice-label");
  var wasBgPlayingBeforeVoice = false;

  if (voiceToggle) {
    voiceToggle.addEventListener("click", function () {
      if (voiceAudio.paused) {
        wasBgPlayingBeforeVoice = !bgAudio.paused;
        if (wasBgPlayingBeforeVoice) {
          bgAudio.pause();
          setMusicState(false);
        }
        var p = voiceAudio.play();
        if (p && p.then) {
          p.then(function () {
            voiceToggle.setAttribute("aria-pressed", "true");
            voiceLabel.textContent = "Jeda suara hubby";
          }).catch(function () {
            voiceLabel.textContent = "Suara belum tersedia";
          });
        } else {
          voiceToggle.setAttribute("aria-pressed", "true");
          voiceLabel.textContent = "Jeda suara hubby";
        }
      } else {
        voiceAudio.pause();
        voiceToggle.setAttribute("aria-pressed", "false");
        voiceLabel.textContent = "Putar suara hubby";
      }
    });

    voiceAudio.addEventListener("ended", function () {
      voiceToggle.setAttribute("aria-pressed", "false");
      voiceLabel.textContent = "Putar suara hubby";
      if (wasBgPlayingBeforeVoice) {
        playBgAudio();
      }
    });
  }

  /* ---------------------------------------------------------
     6. SURPRISE CARDS
     --------------------------------------------------------- */
  document.querySelectorAll(".surprise-card").forEach(function (card) {
    card.setAttribute("aria-expanded", "false");
    card.addEventListener("click", function () {
      var isOpen = card.classList.toggle("is-open");
      card.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  });

  /* ---------------------------------------------------------
     7. IMAGE / VIDEO FALLBACKS
     --------------------------------------------------------- */
  document.querySelectorAll("img[data-photo]").forEach(function (img) {
    img.addEventListener("error", function () {
      var frame = img.closest(".photo-frame");
      if (frame) frame.classList.add("no-image");
    });
    // If the placeholder src never resolves (e.g. zero-byte/missing file),
    // some browsers fire "error" immediately; this also covers that case.
    if (img.complete && img.naturalWidth === 0) {
      var frame2 = img.closest(".photo-frame");
      if (frame2) frame2.classList.add("no-image");
    }
  });

  var momentVideo = document.getElementById("moment-video");
  if (momentVideo) {
    momentVideo.addEventListener("error", function () {
      var vf = momentVideo.closest(".video-frame");
      if (vf) vf.classList.add("no-video");
    });
    momentVideo.querySelectorAll("source").forEach(function (src) {
      src.addEventListener("error", function () {
        var vf = momentVideo.closest(".video-frame");
        if (vf) vf.classList.add("no-video");
      });
    });
  }

  /* ---------------------------------------------------------
     8. FALLING PETALS (decorative, respects reduced motion)
     --------------------------------------------------------- */
  var petalContainer = document.getElementById("petals");

  function spawnPetal() {
    if (prefersReducedMotion || !petalContainer) return;

    var petal = document.createElement("span");
    petal.className = "petal";
    var left = Math.random() * 100;
    var duration = 9 + Math.random() * 7;
    var drift = (Math.random() - 0.5) * 120;
    var size = 6 + Math.random() * 6;
    var hueShift = Math.random() > 0.5;

    petal.style.left = left + "vw";
    petal.style.width = size + "px";
    petal.style.height = size + "px";
    petal.style.setProperty("--drift", drift + "px");
    petal.style.animationDuration = duration + "s";
    if (hueShift) {
      petal.style.background = "#B99457";
      petal.style.opacity = "0.4";
    }

    petalContainer.appendChild(petal);

    window.setTimeout(function () {
      petal.remove();
    }, duration * 1000 + 200);
  }

  if (!prefersReducedMotion) {
    window.setInterval(spawnPetal, 1400);
    spawnPetal();
  }
})();
