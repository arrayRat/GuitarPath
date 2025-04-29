document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("d-flex", "flex-column", "min-vh-100");
  
    const footer = document.createElement("footer");
    footer.className =
      "bg-dark text-white small pt-3 pb-4 mt-auto w-100 text-center";
  
    footer.innerHTML = `
      <div class="container">
        <span>© ${new Date().getFullYear()} GuitarPath</span>
  
        <span class="mx-2">•</span>
        <a href="/index.html"                class="link-light text-decoration-none">Home</a>
        <span class="mx-2">|</span>
        <a href="/lessons/lesson-index.html" class="link-light text-decoration-none">Lessons</a>
        <span class="mx-2">|</span>
        <a href="/tab-editor.html"           class="link-light text-decoration-none">Editor</a>
  
        <div class="opacity-75 mt-2">Built with VexFlow&nbsp;&amp;&nbsp;Tone.js</div>
      </div>
    `;
  
    const placeholder = document.getElementById("footer");
    if (placeholder) {
      placeholder.replaceWith(footer);    // <-- footer becomes flex-item
    } else {
      document.body.appendChild(footer);  // works even if you forgot the div
    }
  
    const style = document.createElement("style");
    style.textContent = `
      footer a:hover { text-decoration: underline; color:#9ecbff !important; }
    `;
    document.head.appendChild(style);
  });