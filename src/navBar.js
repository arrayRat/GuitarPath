document.addEventListener("DOMContentLoaded", function () {
  const navbarHTML = `
    <header class="bg-custom text-white shadow-sm fixed-top">
      <div class="container-fluid d-flex justify-content-between align-items-center px-4 py-2">
        <a href="/index.html" class="d-flex align-items-center text-white text-decoration-none">
            <img src="/src/imgs/guitarpath-white.png" alt="GuitarPath Logo" class="logo-img" />
        </a>
        <nav>
          <ul class="nav">
            <li class="nav-item">
              <a class="nav-link text-white" href="/tab-editor.html" data-nav="editor">Editor</a>
            </li>
            <li class="nav-item">
              <a class="nav-link text-white" href="/lessons/lesson-index.html" data-nav="lessons">Lessons</a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  `;

  const style = document.createElement("style");
  style.textContent = `
/* Navbar base styles */
.bg-custom {
  background-color: #174978;
  z-index: 9999;
}
.fixed-top {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 9999;
}
nav .nav-link {
  font-weight: 500;
  transition: 0.2s ease-in-out;
}
nav .nav-link:hover {
  text-decoration: underline;
  color: #2727ad !important;
}

/* Keep header at its normal height and allow logo overflow */
header.bg-custom {
  position: relative;
  height: 60px;        /* match your navbar’s height */
  padding: 0 1rem;
  overflow: visible;
}

/* Enlarge the logo without pushing anything down */
.logo-img {
  position: absolute;
  top: 50%;
  left: 1rem;
  transform: translateY(-50%);
  height: 100px;        /* make it taller—tweak this value */
  width: auto;
  object-fit: contain;
}

/* Ensure page content stays below the navbar */


  `;
  
  document.head.appendChild(style);
  document.getElementById("navbar").innerHTML = navbarHTML;
});
