// Early global error handlers — external file (not inline) so the
// Content-Security-Policy can use script-src 'self' without 'unsafe-inline'.
(function () {
  function showError(message, stack) {
    var loading = document.getElementById("app-loading");
    if (loading) loading.style.display = "none";
    var errorDiv = document.getElementById("app-error");
    if (errorDiv) errorDiv.classList.add("show");
    var msgEl = document.getElementById("error-message");
    if (msgEl) msgEl.textContent = message;
    var stackEl = document.getElementById("error-stack");
    if (stackEl) stackEl.textContent = stack;
  }

  // Global error handler for uncaught errors
  window.onerror = function (msg, url, line, col, error) {
    console.error("Global error:", msg, url, line, col, error);
    showError(msg, (error && error.stack) || "at " + url + ":" + line + ":" + col);
    return false;
  };

  // Handle unhandled promise rejections
  window.onunhandledrejection = function (event) {
    console.error("Unhandled rejection:", event.reason);
    var reason = event.reason;
    showError(
      (reason && reason.message) || "Promise rejected",
      (reason && reason.stack) || String(reason)
    );
  };

  document.addEventListener("DOMContentLoaded", function () {
    var reloadBtn = document.getElementById("error-reload");
    if (reloadBtn) {
      reloadBtn.addEventListener("click", function () {
        location.reload();
      });
    }
  });
})();
