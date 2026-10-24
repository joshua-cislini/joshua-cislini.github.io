/**
 * main.js
 * Handles general UI, routing, and shortcuts.
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Particles and Circuit (from their respective files)
    if (typeof initParticles === 'function') initParticles();
    if (typeof initCircuit === 'function') initCircuit();

    // 2. Shortcut Key logic for PCB Editor (Ctrl + E)
    const pcbEditorCard = document.getElementById("pcb-editor-card");
    const closePcbBtn = document.getElementById("close-pcb-btn");

    function togglePcbEditor() {
        if (pcbEditorCard.style.display === "none" || pcbEditorCard.style.display === "") {
            pcbEditorCard.style.display = "block"; // Or "flex", depending on your CSS
        } else {
            pcbEditorCard.style.display = "none";
        }
    }

    // Toggle on Ctrl + E (or Cmd + E on Mac)
    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
            e.preventDefault(); // Prevent browser default search
            togglePcbEditor();
        }
    });

    // Close button logic
    if (closePcbBtn) {
        closePcbBtn.addEventListener("click", () => {
            pcbEditorCard.style.display = "none";
        });
    }
});
