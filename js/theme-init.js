/* Runs before first paint: saved choice wins, otherwise follow the OS color scheme. */
(function () {
  var dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  try {
    var saved = localStorage.getItem("cislini_resume_theme");
    if (saved === "dark" || saved === "light") dark = saved === "dark";
  } catch (e) {}
  var root = document.documentElement;
  if (dark) root.classList.add("dark-theme");
  var meta = document.getElementById("meta-theme-color");
  if (meta) meta.setAttribute("content", dark ? "#0b100d" : "#f4f4f4");
})();
