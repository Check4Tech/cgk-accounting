/* ==========================================================================
   CGK Accounting Services — site behaviour
   Vanilla JS, no dependencies. Loaded with `defer`.
   ========================================================================== */
(function () {
  "use strict";

  document.documentElement.classList.remove("no-js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var desktop = window.matchMedia("(min-width: 1000px)");

  /* ------------------------------------------------------------------
     Header shadow on scroll
     ------------------------------------------------------------------ */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-stuck", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ------------------------------------------------------------------
     Mobile navigation
     ------------------------------------------------------------------ */
  var navToggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");

  function closeNav() {
    if (!navToggle || !nav) return;
    navToggle.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
    document.body.classList.remove("nav-open");
  }

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
      document.body.classList.toggle("nav-open", !open);
    });

    // Close when a link is tapped (same-page anchors especially).
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a") && !desktop.matches) closeNav();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });

    desktop.addEventListener("change", closeNav);
  }

  /* ------------------------------------------------------------------
     Submenus — click to expand on mobile, CSS hover handles desktop
     ------------------------------------------------------------------ */
  Array.prototype.forEach.call(document.querySelectorAll(".sub-toggle"), function (btn) {
    var menu = document.getElementById(btn.getAttribute("aria-controls"));
    if (!menu) return;

    btn.addEventListener("click", function () {
      if (desktop.matches) {
        // On desktop the parent link target is what matters; let hover/focus rule.
        return;
      }
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      menu.classList.toggle("is-open", !open);
    });
  });

  /* ------------------------------------------------------------------
     Scroll reveal
     ------------------------------------------------------------------ */
  var revealables = document.querySelectorAll(".reveal, .reveal-group");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    Array.prototype.forEach.call(revealables, function (el) {
      el.classList.add("is-visible");
    });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    Array.prototype.forEach.call(revealables, function (el) {
      observer.observe(el);
    });
  }

  /* ------------------------------------------------------------------
     Sticky mobile call bar — appears once the hero is scrolled past
     ------------------------------------------------------------------ */
  var callbar = document.querySelector(".callbar");
  if (callbar) {
    var showAfter = function () {
      callbar.classList.toggle("is-visible", window.scrollY > 520);
    };
    showAfter();
    window.addEventListener("scroll", showAfter, { passive: true });
  }

  /* ------------------------------------------------------------------
     Current year in footer
     ------------------------------------------------------------------ */
  Array.prototype.forEach.call(document.querySelectorAll("[data-year]"), function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ------------------------------------------------------------------
     Years in public accounting. The pages state 15 as of 2026
     (data-years-base / data-years-base-year). That count advances by one
     at midnight Eastern on each January 1.
     ------------------------------------------------------------------ */
  var accountingYear = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric" }).format(new Date())
  );
  Array.prototype.forEach.call(document.querySelectorAll("[data-years-base]"), function (el) {
    var base = parseInt(el.getAttribute("data-years-base"), 10);
    var baseYear = parseInt(el.getAttribute("data-years-base-year"), 10);
    if (!base || !baseYear) return;
    var years = base + (accountingYear - baseYear);
    if (years < 1) return;
    var suffix = el.hasAttribute("data-years-suffix") ? el.getAttribute("data-years-suffix") : "";
    el.textContent = String(years) + suffix;
  });
  Array.prototype.forEach.call(document.querySelectorAll('script[type="application/ld+json"]'), function (script) {
    if (script.textContent.indexOf("fifteen years in public accounting") === -1) return;
    var sample = document.querySelector("[data-years-base]");
    if (!sample) return;
    var base = parseInt(sample.getAttribute("data-years-base"), 10);
    var baseYear = parseInt(sample.getAttribute("data-years-base-year"), 10);
    if (!base || !baseYear) return;
    var years = base + (accountingYear - baseYear);
    script.textContent = script.textContent.replace(
      /fifteen years in public accounting/g,
      years + " years in public accounting"
    );
  });

  /* ------------------------------------------------------------------
     Email addresses are assembled at runtime so harvesters scraping the
     raw HTML never see a mailto: address. Without JS the markup still
     links somewhere useful (the contact page).
     ------------------------------------------------------------------ */
  Array.prototype.forEach.call(document.querySelectorAll("[data-email-user]"), function (el) {
    var address = el.getAttribute("data-email-user") + "@" + el.getAttribute("data-email-domain");
    el.setAttribute("href", "mailto:" + address);
    if (el.hasAttribute("data-email-show")) el.textContent = address;
  });

  /* ------------------------------------------------------------------
     Contact form: validation + layered spam defence
     ------------------------------------------------------------------ */
  var form = document.querySelector("[data-secure-form]");
  if (!form) return;

  var status = form.querySelector(".form-status");
  var submitBtn = form.querySelector('[type="submit"]');
  var honeypot = form.querySelector('[name="bot-field"]');
  var loadedAt = Date.now();
  var MIN_FILL_MS = 3500; // humans do not complete this form in under 3.5s

  // Suppress native validation bubbles only once JS is confirmed running, so a
  // no-JS visitor still gets browser-enforced required/type checks.
  form.setAttribute("novalidate", "novalidate");

  // Character counters
  Array.prototype.forEach.call(form.querySelectorAll("[data-counter]"), function (field) {
    var out = document.getElementById(field.getAttribute("data-counter"));
    if (!out) return;
    var max = Number(field.getAttribute("maxlength")) || 0;
    var update = function () {
      var used = field.value.length;
      out.textContent = used + " / " + max;
      out.classList.toggle("is-near", max > 0 && used > max * 0.9);
    };
    field.addEventListener("input", update);
    update();
  });

  function fieldWrap(el) {
    return el.closest(".form-field");
  }

  function messageFor(el) {
    var v = el.validity;
    var label = el.getAttribute("data-label") || "This field";
    if (v.valueMissing) return label + " is required.";
    if (v.typeMismatch && el.type === "email") return "Enter a valid email address, e.g. name@example.com.";
    if (v.patternMismatch) return el.getAttribute("data-pattern-message") || "Please check the format.";
    if (v.tooShort) return label + " must be at least " + el.minLength + " characters.";
    if (v.tooLong) return label + " must be " + el.maxLength + " characters or fewer.";
    return "Please check this field.";
  }

  function validateField(el, show) {
    var wrap = fieldWrap(el);
    if (!wrap) return el.checkValidity();

    var ok = el.checkValidity();
    var errEl = wrap.querySelector(".field-error");

    if (ok) {
      wrap.classList.remove("is-invalid");
      el.removeAttribute("aria-invalid");
      if (errEl) errEl.textContent = "";
    } else if (show) {
      wrap.classList.add("is-invalid");
      el.setAttribute("aria-invalid", "true");
      if (errEl) errEl.textContent = messageFor(el);
    }
    return ok;
  }

  var fields = Array.prototype.slice.call(
    form.querySelectorAll("input[name], select[name], textarea[name]")
  ).filter(function (el) {
    return el.type !== "hidden" && el.name !== "bot-field";
  });

  fields.forEach(function (el) {
    // Validate on blur, then live-clear the error as the user fixes it.
    el.addEventListener("blur", function () {
      validateField(el, true);
    });
    el.addEventListener("input", function () {
      if (fieldWrap(el) && fieldWrap(el).classList.contains("is-invalid")) {
        validateField(el, true);
      }
    });
  });

  function showStatus(kind, text) {
    if (!status) return;
    status.className = "form-status is-visible form-status--" + kind;
    status.textContent = text;
  }

  function hideStatus() {
    if (!status) return;
    status.className = "form-status";
    status.textContent = "";
  }

  form.addEventListener("submit", function (e) {
    hideStatus();

    // 1. Honeypot — a real person never sees or fills this.
    if (honeypot && honeypot.value !== "") {
      e.preventDefault();
      return;
    }

    // 2. Timing trap — reject submissions that arrive impossibly fast.
    if (Date.now() - loadedAt < MIN_FILL_MS) {
      e.preventDefault();
      showStatus("error", "That was a little too quick — please take a moment and submit again.");
      return;
    }

    // 3. Field-level validation with readable, inline messages.
    var firstBad = null;
    fields.forEach(function (el) {
      if (!validateField(el, true) && !firstBad) firstBad = el;
    });

    if (firstBad) {
      e.preventDefault();
      showStatus("error", "Please correct the highlighted fields and try again.");
      firstBad.focus({ preventScroll: true });
      firstBad.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      return;
    }

    // 4. Send through Netlify Forms, then open the thank-you page.
    // A normal submit follows Netlify's redirect, which lands on the
    // "page not found" screen. Posting here lets us open the real page.
    e.preventDefault();
    if (submitBtn) {
      submitBtn.setAttribute("aria-busy", "true");
      submitBtn.textContent = "Sending…";
    }

    var body = new URLSearchParams(new FormData(form)).toString();
    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "text/html" },
      body: body
    }).then(function (res) {
      if ((res.url || "").indexOf("/thanks") !== -1) {
        window.location.href = "/thanks.html";
        return;
      }
      throw new Error("not accepted");
    }).catch(function () {
      showStatus("error", "That message didn't go through. Please call (631) 908-5130 or try again.");
      if (submitBtn) {
        submitBtn.removeAttribute("aria-busy");
        submitBtn.textContent = "Send message";
      }
    });
  });
})();
