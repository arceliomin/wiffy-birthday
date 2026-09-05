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
     PRELOADER — brief branded loading screen before the gate
     --------------------------------------------------------- */
  (function preloader() {
    var el = document.getElementById("preloader");
    if (!el) return;
    var minDelay = prefersReducedMotion ? 0 : 500;
    var start = Date.now();

    function hide() {
      var elapsed = Date.now() - start;
      var wait = Math.max(0, minDelay - elapsed);
      window.setTimeout(function () {
        el.classList.add("is-hidden");
        window.setTimeout(function () {
          el.remove();
        }, prefersReducedMotion ? 0 : 650);
      }, wait);
    }

    if (document.readyState === "complete") {
      hide();
    } else {
      window.addEventListener("load", hide);
      // safety net in case "load" is delayed by slow external fonts
      window.setTimeout(hide, 2500);
    }
  })();

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
     0b. SCROLL-LIT SENTENCES — cinematic "spotlight" reveal
     Splits text into sentence spans that light up as they pass
     the vertical center of the viewport, dim again once past.
     --------------------------------------------------------- */
  (function scrollLitText() {
    if (prefersReducedMotion) return;

    function wrapSentences(el) {
      var text = el.textContent;
      var parts = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
      el.innerHTML = "";
      parts.forEach(function (part) {
        if (!part.trim()) return;
        var span = document.createElement("span");
        span.className = "scroll-lit";
        span.textContent = part;
        el.appendChild(span);
      });
    }

    var targets = document.querySelectorAll(
      ".opening-text, .letter-body p:not(.letter-answer)"
    );
    if (!targets.length) return;
    targets.forEach(wrapSentences);

    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".scroll-lit").forEach(function (el) {
        el.classList.add("is-lit");
      });
      return;
    }

    var litObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          entry.target.classList.toggle("is-lit", entry.isIntersecting);
        });
      },
      { rootMargin: "-42% 0px -42% 0px", threshold: 0 }
    );

    // Observe lazily: letter-body sentences are inside a hidden
    // (display:none) container until the envelope opens, so wait
    // a tick to ensure layout exists before observing them too.
    window.requestAnimationFrame(function () {
      document.querySelectorAll(".scroll-lit").forEach(function (el) {
        litObserver.observe(el);
      });
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
     SOUND CHIMES — tiny synthesized tones (no audio files)
     Used for: password success, envelope open, surprise cards.
     --------------------------------------------------------- */
  var audioCtx = null;

  function getAudioCtx() {
    if (audioCtx) return audioCtx;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    return audioCtx;
  }

  function playChime(notes) {
    var ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    var t0 = ctx.currentTime;

    notes.forEach(function (note) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = note.freq;
      osc.connect(gain);
      gain.connect(ctx.destination);

      var start = t0 + note.delay;
      var peak = note.gain || 0.06;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(peak, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.duration);

      osc.start(start);
      osc.stop(start + note.duration + 0.05);
    });
  }

  function chimeSuccess() {
    playChime([
      { freq: 587.33, delay: 0, duration: 0.35 },
      { freq: 739.99, delay: 0.09, duration: 0.35 },
      { freq: 987.77, delay: 0.18, duration: 0.5, gain: 0.05 },
    ]);
  }

  function chimeOpen() {
    playChime([
      { freq: 523.25, delay: 0, duration: 0.3 },
      { freq: 659.25, delay: 0.12, duration: 0.45, gain: 0.05 },
    ]);
  }

  function chimeTap() {
    playChime([{ freq: 880, delay: 0, duration: 0.12, gain: 0.045 }]);
  }

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
    chimeSuccess();

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
      if (isOpen) chimeTap();
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

    // Auto-thumbnail: grab a frame partway through the clip and use
    // it as the poster, so the video doesn't start on a black frame.
    // Wrapped in try/catch — some browsers block canvas capture on
    // local file:// videos for security reasons, which is fine, the
    // video just falls back to its default first-frame preview.
    momentVideo.addEventListener("loadedmetadata", function () {
      try {
        momentVideo.currentTime = Math.min(0.5, (momentVideo.duration || 1) / 2);
      } catch (e) {}
    });
    momentVideo.addEventListener(
      "seeked",
      function grabThumb() {
        try {
          var canvas = document.createElement("canvas");
          canvas.width = momentVideo.videoWidth || 320;
          canvas.height = momentVideo.videoHeight || 180;
          canvas.getContext("2d").drawImage(momentVideo, 0, 0, canvas.width, canvas.height);
          momentVideo.poster = canvas.toDataURL("image/jpeg", 0.82);
        } catch (e) {
          /* canvas tainted or unsupported — keep default preview */
        }
        momentVideo.removeEventListener("seeked", grabThumb);
      },
      { once: true }
    );

    // Duck the background music while the video plays, and bring
    // it back once the video finishes.
    var wasBgPlayingBeforeVideo = false;
    momentVideo.addEventListener("play", function () {
      wasBgPlayingBeforeVideo = !bgAudio.paused;
      if (wasBgPlayingBeforeVideo) {
        bgAudio.pause();
        setMusicState(false);
      }
    });
    momentVideo.addEventListener("ended", function () {
      if (wasBgPlayingBeforeVideo) {
        playBgAudio();
        wasBgPlayingBeforeVideo = false;
      }
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
  var daysBadge = document.getElementById("days-badge");
  if (daysBadgeNum) {
    var REUNITED_DATE = new Date("2026-03-17T00:00:00+07:00").getTime();

    function getDaysCount() {
      var diff = Date.now() - REUNITED_DATE;
      return Math.max(0, Math.floor(diff / 86400000));
    }

    function setDaysText(n) {
      daysBadgeNum.textContent = n.toLocaleString("id-ID");
    }

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function animateDaysCount() {
      var target = getDaysCount();
      if (prefersReducedMotion) {
        setDaysText(target);
        return;
      }
      var duration = 1200;
      var start = null;
      function step(ts) {
        if (start === null) start = ts;
        var progress = Math.min(1, (ts - start) / duration);
        setDaysText(Math.floor(easeOutCubic(progress) * target));
        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      }
      window.requestAnimationFrame(step);
    }

    setDaysText(0);
    window.setInterval(function () {
      setDaysText(getDaysCount());
    }, 60 * 60 * 1000);

    if (daysBadge && "IntersectionObserver" in window && !prefersReducedMotion) {
      var daysObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateDaysCount();
              daysObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      daysObserver.observe(daysBadge);
    } else {
      setDaysText(getDaysCount());
    }
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
      chimeOpen();

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

  /* ---------------------------------------------------------
     12. THEME DEMO SWITCHER (sales/preview tool only)
     Add "?theme-demo" to the URL to reveal the swatch picker.
     A normal visitor never sees this.
     --------------------------------------------------------- */
  (function themeDemo() {
    if (window.location.search.indexOf("theme-demo") === -1) return;

    var panel = document.getElementById("theme-demo");
    if (!panel) return;
    panel.classList.remove("hidden");
    panel.setAttribute("aria-hidden", "false");

    var swatches = panel.querySelectorAll(".theme-swatch");

    function setActiveSwatch(theme) {
      swatches.forEach(function (btn) {
        btn.classList.toggle("is-active", btn.getAttribute("data-theme") === theme);
      });
    }

    var saved = "";
    try {
      saved = window.sessionStorage.getItem("wiffy-theme-demo") || "";
    } catch (e) {}
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    setActiveSwatch(saved);

    swatches.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var theme = btn.getAttribute("data-theme");
        if (theme) {
          document.documentElement.setAttribute("data-theme", theme);
        } else {
          document.documentElement.removeAttribute("data-theme");
        }
        setActiveSwatch(theme);
        try {
          window.sessionStorage.setItem("wiffy-theme-demo", theme);
        } catch (e) {}
      });
    });
  })();

  /* ---------------------------------------------------------
     13. PHOTO LIGHTBOX — tap a photo to view it full-screen
     --------------------------------------------------------- */
  (function photoLightbox() {
    var lightbox = document.getElementById("lightbox");
    var lightboxImg = document.getElementById("lightbox-img");
    var closeBtn = document.getElementById("lightbox-close");
    var prevBtn = document.getElementById("lightbox-prev");
    var nextBtn = document.getElementById("lightbox-next");
    if (!lightbox || !lightboxImg) return;

    var frames = Array.prototype.slice.call(
      document.querySelectorAll(".photo-frame")
    );
    var currentIndex = -1;

    function availableFrames() {
      return frames.filter(function (f) {
        return !f.classList.contains("no-image");
      });
    }

    function openAt(frame) {
      var list = availableFrames();
      currentIndex = list.indexOf(frame);
      if (currentIndex === -1) return;
      showCurrent(list);
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      window.requestAnimationFrame(function () {
        lightbox.classList.add("is-visible");
      });
    }

    function showCurrent(list) {
      list = list || availableFrames();
      if (!list.length) return;
      currentIndex = (currentIndex + list.length) % list.length;
      var img = list[currentIndex].querySelector("img");
      if (img) {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt || "";
      }
    }

    function close() {
      lightbox.classList.remove("is-visible");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      window.setTimeout(function () {
        lightbox.classList.remove("is-open");
        lightboxImg.src = "";
      }, prefersReducedMotion ? 0 : 300);
    }

    frames.forEach(function (frame) {
      frame.style.cursor = "zoom-in";
      frame.addEventListener("click", function () {
        if (frame.classList.contains("no-image")) return;
        openAt(frame);
      });
    });

    if (closeBtn) closeBtn.addEventListener("click", close);
    if (prevBtn)
      prevBtn.addEventListener("click", function () {
        currentIndex--;
        showCurrent();
      });
    if (nextBtn)
      nextBtn.addEventListener("click", function () {
        currentIndex++;
        showCurrent();
      });

    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) close();
    });

    document.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") {
        currentIndex--;
        showCurrent();
      }
      if (e.key === "ArrowRight") {
        currentIndex++;
        showCurrent();
      }
    });
  })();

  /* ---------------------------------------------------------
     14. CUSTOM CURSOR (desktop mouse only)
     --------------------------------------------------------- */
  (function customCursor() {
    var dot = document.getElementById("cursor-dot");
    if (!dot) return;
    var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!canHover || prefersReducedMotion) return;

    var targetX = 0,
      targetY = 0,
      curX = 0,
      curY = 0,
      started = false;

    document.addEventListener("mousemove", function (e) {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!started) {
        curX = targetX;
        curY = targetY;
        started = true;
        dot.classList.add("is-active");
      }
    });

    document.addEventListener("mouseleave", function () {
      dot.classList.remove("is-active");
    });

    var HOVER_SELECTOR =
      "a, button, .surprise-card, .photo-frame:not(.no-image), .envelope, input, .lightbox";

    document.addEventListener("mouseover", function (e) {
      if (e.target.closest && e.target.closest(HOVER_SELECTOR)) {
        dot.classList.add("is-hovering");
      }
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest && e.target.closest(HOVER_SELECTOR)) {
        dot.classList.remove("is-hovering");
      }
    });

    function render() {
      curX += (targetX - curX) * 0.2;
      curY += (targetY - curY) * 0.2;
      dot.style.transform = "translate(" + curX + "px, " + curY + "px)";
      window.requestAnimationFrame(render);
    }
    window.requestAnimationFrame(render);
  })();
})();
