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
     0. HERO TITLE — word-by-word cinematic reveal
     Wraps each word so CSS can animate them in with a stagger.
     Runs immediately; the animation itself only becomes visible
     once #main leaves display:none (see gate unlock logic).
     --------------------------------------------------------- */
  (function wrapHeroWords() {
    var heroTitle = document.getElementById("hero-title");
    if (!heroTitle || prefersReducedMotion) return;

    var nodes = Array.prototype.slice.call(heroTitle.childNodes);
    heroTitle.innerHTML = "";

    nodes.forEach(function (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        var parts = node.textContent.split(/(\s+)/);
        parts.forEach(function (part) {
          if (part === "") return;
          if (/^\s+$/.test(part)) {
            heroTitle.appendChild(document.createTextNode(part));
            return;
          }
          var mask = document.createElement("span");
          mask.className = "word-mask";
          var inner = document.createElement("span");
          inner.className = "word-inner";
          inner.textContent = part;
          mask.appendChild(inner);
          heroTitle.appendChild(mask);
        });
      } else {
        heroTitle.appendChild(node.cloneNode(true));
      }
    });

    var i = 0;
    heroTitle.querySelectorAll(".word-inner").forEach(function (span) {
      span.style.animationDelay = i * 90 + "ms";
      i++;
    });
  })();

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

  function setCdValue(el, value) {
    if (!el) return;
    if (el.textContent === value) return;
    el.textContent = value;
    if (!prefersReducedMotion) {
      el.classList.remove("tick");
      // force reflow so the animation can restart on rapid updates
      void el.offsetWidth;
      el.classList.add("tick");
    }
  }

  function updateCountdown() {
    var now = Date.now();
    var diff = TARGET_DATE - now;

    if (diff <= 0) {
      setCdValue(cdDays, "00");
      setCdValue(cdHours, "00");
      setCdValue(cdMins, "00");
      setCdValue(cdSecs, "00");
      return;
    }

    var totalSeconds = Math.floor(diff / 1000);
    var days = Math.floor(totalSeconds / 86400);
    var hours = Math.floor((totalSeconds % 86400) / 3600);
    var mins = Math.floor((totalSeconds % 3600) / 60);
    var secs = totalSeconds % 60;

    setCdValue(cdDays, pad(days));
    setCdValue(cdHours, pad(hours));
    setCdValue(cdMins, pad(mins));
    setCdValue(cdSecs, pad(secs));
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

  function spawnConfettiBurst(originEl) {
    if (prefersReducedMotion || !originEl) return;
    var rect = originEl.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var chars = ["♥", "❀", "✦"];

    for (var i = 0; i < 12; i++) {
      var span = document.createElement("span");
      span.className = "confetti-heart";
      span.textContent = chars[Math.floor(Math.random() * chars.length)];
      span.style.left = cx + "px";
      span.style.top = cy + "px";
      span.style.color = Math.random() > 0.5 ? "#6E2436" : "#B99457";

      var angle = Math.random() * Math.PI * 2;
      var distance = 60 + Math.random() * 90;
      span.style.setProperty("--cx", Math.cos(angle) * distance + "px");
      span.style.setProperty("--cy", Math.sin(angle) * distance - 20 + "px");
      span.style.setProperty("--cr", Math.random() * 160 - 80 + "deg");
      span.style.animationDelay = Math.random() * 0.15 + "s";

      document.body.appendChild(span);
      (function (el) {
        window.setTimeout(function () {
          el.remove();
        }, 1300);
      })(span);
    }
  }

  function unlockSite() {
    gateMessage.textContent = "Yeay, wiffy berhasil masuk. Sekarang buka pelan-pelan ya.";
    gateMessage.className = "gate-message is-success";
    spawnConfettiBurst(gateForm.querySelector(".gate-button"));

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
     5. VOICE MESSAGE PLAYER (play/pause, seek, skip, duration)
     --------------------------------------------------------- */
  var voiceAudio = document.getElementById("voice-audio");
  var vpPlay = document.getElementById("vp-play");
  var vpIconPlay = vpPlay ? vpPlay.querySelector(".vp-icon-play") : null;
  var vpIconPause = vpPlay ? vpPlay.querySelector(".vp-icon-pause") : null;
  var vpRange = document.getElementById("vp-range");
  var vpCurrent = document.getElementById("vp-current");
  var vpDuration = document.getElementById("vp-duration");
  var vpBack = document.getElementById("vp-back");
  var vpForward = document.getElementById("vp-forward");
  var vpStatus = document.getElementById("vp-status");
  var wasBgPlayingBeforeVoice = false;
  var isScrubbing = false;

  function formatTime(seconds) {
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return "0:00";
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ":" + pad(s);
  }

  function setPlayIcon(isPlaying) {
    if (!vpPlay) return;
    vpPlay.setAttribute("aria-pressed", isPlaying ? "true" : "false");
    vpIconPlay.hidden = isPlaying;
    vpIconPause.hidden = !isPlaying;
  }

  if (voiceAudio && vpPlay && vpRange) {
    voiceAudio.addEventListener("loadedmetadata", function () {
      if (isFinite(voiceAudio.duration)) {
        vpRange.max = voiceAudio.duration;
        vpDuration.textContent = formatTime(voiceAudio.duration);
      }
    });

    voiceAudio.addEventListener("timeupdate", function () {
      if (!isScrubbing) {
        vpRange.value = voiceAudio.currentTime;
      }
      vpCurrent.textContent = formatTime(voiceAudio.currentTime);
    });

    voiceAudio.addEventListener("ended", function () {
      setPlayIcon(false);
      vpRange.value = 0;
      vpCurrent.textContent = "0:00";
      if (wasBgPlayingBeforeVoice) {
        playBgAudio();
      }
    });

    voiceAudio.addEventListener("error", function () {
      vpStatus.textContent = "Suara belum tersedia di sini.";
    });

    vpPlay.addEventListener("click", function () {
      if (voiceAudio.paused) {
        wasBgPlayingBeforeVoice = !bgAudio.paused;
        if (wasBgPlayingBeforeVoice) {
          bgAudio.pause();
          setMusicState(false);
        }
        var p = voiceAudio.play();
        if (p && p.then) {
          p.then(function () {
            setPlayIcon(true);
            vpStatus.textContent = "";
          }).catch(function () {
            vpStatus.textContent = "Suara belum tersedia di sini.";
          });
        } else {
          setPlayIcon(true);
        }
      } else {
        voiceAudio.pause();
        setPlayIcon(false);
      }
    });

    vpRange.addEventListener("input", function () {
      isScrubbing = true;
      vpCurrent.textContent = formatTime(parseFloat(vpRange.value));
    });
    vpRange.addEventListener("change", function () {
      voiceAudio.currentTime = parseFloat(vpRange.value);
      isScrubbing = false;
    });

    function skip(delta) {
      var dur = isFinite(voiceAudio.duration) ? voiceAudio.duration : 0;
      var next = voiceAudio.currentTime + delta;
      if (next < 0) next = 0;
      if (dur && next > dur) next = dur;
      voiceAudio.currentTime = next;
      vpRange.value = next;
      vpCurrent.textContent = formatTime(next);
    }

    if (vpBack) vpBack.addEventListener("click", function () { skip(-10); });
    if (vpForward) vpForward.addEventListener("click", function () { skip(10); });
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

  /* ---------------------------------------------------------
     9. PARALLAX — botanical watermarks drift softly on scroll
     --------------------------------------------------------- */
  var parallaxEls = document.querySelectorAll(".botanical[data-parallax]");

  if (parallaxEls.length && !prefersReducedMotion) {
    var parallaxTicking = false;

    function updateParallax() {
      parallaxEls.forEach(function (el) {
        var factor = parseFloat(el.getAttribute("data-parallax")) || 0.04;
        var rect = el.getBoundingClientRect();
        var offset = rect.top * factor;
        el.style.setProperty("--parallax-y", offset + "px");
      });
      parallaxTicking = false;
    }

    function onScrollParallax() {
      if (!parallaxTicking) {
        window.requestAnimationFrame(updateParallax);
        parallaxTicking = true;
      }
    }

    window.addEventListener("scroll", onScrollParallax, { passive: true });
    updateParallax();
  }

  /* ---------------------------------------------------------
     10. "HARI BERSAMA" — live counter since 17 March 2026
     --------------------------------------------------------- */
  var daysBadgeNum = document.getElementById("days-badge-num");
  if (daysBadgeNum) {
    var REUNITED_DATE = new Date("2026-03-17T00:00:00+07:00").getTime();

    function updateDaysBadge() {
      var diff = Date.now() - REUNITED_DATE;
      var days = Math.max(0, Math.floor(diff / 86400000));
      daysBadgeNum.textContent = days.toLocaleString("id-ID");
    }

    updateDaysBadge();
    window.setInterval(updateDaysBadge, 60 * 60 * 1000);
  }

  /* ---------------------------------------------------------
     11. SEALED ENVELOPE — tap to reveal the final letter
     --------------------------------------------------------- */
  var envelopeOpen = document.getElementById("envelope-open");
  var envelopeScene = document.getElementById("envelope-scene");
  var letterContent = document.getElementById("letter-content");

  if (envelopeOpen && envelopeScene && letterContent) {
    envelopeOpen.addEventListener("click", function () {
      if (envelopeOpen.getAttribute("aria-expanded") === "true") return;
      envelopeOpen.setAttribute("aria-expanded", "true");
      envelopeOpen.classList.add("is-open");

      var revealLetter = function () {
        envelopeScene.classList.add("is-gone");
        letterContent.classList.remove("hidden");
        letterContent
          .querySelectorAll(".reveal")
          .forEach(function (el) {
            el.classList.add("in-view");
          });
        window.requestAnimationFrame(function () {
          letterContent.classList.add("is-visible");
        });
      };

      if (prefersReducedMotion) {
        revealLetter();
      } else {
        window.setTimeout(revealLetter, 750);
      }
    });
  }
})();
