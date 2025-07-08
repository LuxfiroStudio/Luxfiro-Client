/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

const { ipcRenderer, shell } = require('electron');
const pkg = require('../package.json');
const os = require('os');
import { config, database } from './utils.js';
const nodeFetch = require("node-fetch");


class Splash {
    constructor() {
        this.splash = document.querySelector(".splash");
        this.splashMessage = document.querySelector(".splash-message");
        this.splashAuthor = document.querySelector(".splash-author");
        this.message = document.querySelector(".message");
        this.progress = document.querySelector(".progress");
        document.addEventListener('DOMContentLoaded', async () => {
            let databaseLauncher = new database();
            let configClient = await databaseLauncher.readData('configClient');
            let theme = configClient?.launcher_config?.theme || "auto"
            let isDarkTheme = await ipcRenderer.invoke('is-dark-theme', theme).then(res => res)
            document.body.className = isDarkTheme ? 'dark global' : 'light global';
            if (process.platform == 'win32') ipcRenderer.send('update-window-progress-load')
            this.startAnimation()
        });
    }

    async startAnimation() {
        let splashes = [
            { "message": "Je... vie...", "author": "Luuxis" },
            { "message": "Salut je suis du code.", "author": "Luuxis" },
            { "message": "Linux n'est pas un os, mais un kernel.", "author": "Luuxis" }
        ];
        let splash = splashes[Math.floor(Math.random() * splashes.length)];
        this.splashMessage.textContent = splash.message;
        this.splashAuthor.children[0].textContent = "@" + splash.author;
        await sleep(100);
        document.querySelector("#splash").style.display = "block";
        await sleep(500);
        this.splash.classList.add("opacity");
        await sleep(500);
        this.splash.classList.add("translate");
        this.splashMessage.classList.add("opacity");
        this.splashAuthor.classList.add("opacity");
        this.message.classList.add("opacity");
        await sleep(1000);
        this.checkUpdate();
    }

    async checkUpdate() {
        this.setStatus(`Recherche de mise à jour...`);

        ipcRenderer.invoke('update-app').then().catch(err => {
            return this.shutdown(`erreur lors de la recherche de mise à jour :<br>${err.message}`);
        });

        ipcRenderer.on('updateAvailable', () => {
            this.setStatus(`Mise à jour disponible !`);
            if (os.platform() == 'win32') {
                this.toggleProgress();
                ipcRenderer.send('start-update');
            }
            else return this.dowloadUpdate();
        })

        ipcRenderer.on('error', (event, err) => {
            if (err) return this.shutdown(`${err.message}`);
        })

        ipcRenderer.on('download-progress', (event, progress) => {
            ipcRenderer.send('update-window-progress', { progress: progress.transferred, size: progress.total })
            this.setProgress(progress.transferred, progress.total);
        })

        ipcRenderer.on('update-not-available', () => {
            console.error("Mise à jour non disponible");
            this.maintenanceCheck();
        })
    }

    getLatestReleaseForOS(os, preferredFormat, asset) {
        return asset.filter(asset => {
            const name = asset.name.toLowerCase();
            const isOSMatch = name.includes(os);
            const isFormatMatch = name.endsWith(preferredFormat);
            return isOSMatch && isFormatMatch;
        }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    }

    async dowloadUpdate() {
        const repoURL = pkg.repository.url.replace("git+", "").replace(".git", "").replace("https://github.com/", "").split("/");
        const githubAPI = await nodeFetch('https://api.github.com').then(res => res.json()).catch(err => err);

        const githubAPIRepoURL = githubAPI.repository_url.replace("{owner}", repoURL[0]).replace("{repo}", repoURL[1]);
        const githubAPIRepo = await nodeFetch(githubAPIRepoURL).then(res => res.json()).catch(err => err);

        const releases_url = await nodeFetch(githubAPIRepo.releases_url.replace("{/id}", '')).then(res => res.json()).catch(err => err);
        const latestRelease = releases_url[0].assets;
        let latest;

        if (os.platform() == 'darwin') latest = this.getLatestReleaseForOS('mac', '.dmg', latestRelease);
        else if (os == 'linux') latest = this.getLatestReleaseForOS('linux', '.appimage', latestRelease);


        this.setStatus(`Mise à jour disponible !<br><div class="download-update">Télécharger</div>`);
        document.querySelector(".download-update").addEventListener("click", () => {
            shell.openExternal(latest.browser_download_url);
            return this.shutdown("Téléchargement en cours...");
        });
    }


    async maintenanceCheck() {
        config.GetConfig().then(res => {
            if (res.maintenance) return this.shutdown(res.maintenance_message);
            this.startLauncher();
        }).catch(e => {
            console.error(e);
            return this.shutdown("Aucune connexion internet détectée,<br>veuillez réessayer ultérieurement.");
        })
    }

    startLauncher() {
        this.setStatus(`Démarrage du launcher`);
        ipcRenderer.send('main-window-open');
        ipcRenderer.send('update-window-close');
    }

    shutdown(text) {
        this.setStatus(`${text}<br>Arrêt dans 5s`);
        let i = 4;
        setInterval(() => {
            this.setStatus(`${text}<br>Arrêt dans ${i--}s`);
            if (i < 0) ipcRenderer.send('update-window-close');
        }, 1000);
    }

    setStatus(text) {
        this.message.innerHTML = text;
    }

    toggleProgress() {
        if (this.progress.classList.toggle("show")) this.setProgress(0, 1);
    }

    setProgress(value, max) {
        this.progress.value = value;
        this.progress.max = max;
    }
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.keyCode == 73 || e.keyCode == 123) {
        ipcRenderer.send("update-window-dev-tools");
    }
})
new Splash();
async function cargarInstancias() {
  const instanciaSelect = document.getElementById("instance-select"); // agrega este select en el HTML
  const contenedor = document.getElementById("background-container");

  try {
    const res = await fetch("http://102.129.137.163:5003/main/files/php/instances.php");
    const instancias = await res.json();

    for (const nombre in instancias) {
      const option = document.createElement("option");
      option.value = nombre;
      option.textContent = nombre;
      instanciaSelect.appendChild(option);
    }

    instanciaSelect.addEventListener("change", () => {
      const nombre = instanciaSelect.value;
      const fondo = instancias[nombre].background_url;

      if (fondo.endsWith(".mp4")) {
        contenedor.innerHTML = `
          <video autoplay muted loop playsinline style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: -1;">
            <source src="${fondo}" type="video/mp4">
          </video>
        `;
      } else {
        contenedor.innerHTML = "";
        contenedor.style.background = `url('${fondo}') center/cover no-repeat`;
      }
    });

    instanciaSelect.dispatchEvent(new Event("change")); // fondo inicial
  } catch (e) {
    console.error("Error al cargar instancias:", e);
  }
}

window.addEventListener("DOMContentLoaded", cargarInstancias);
const INSTANCE_API = "http://102.129.137.163:5003/main/files/php/instances.php";
let instancias = {};
let instanciaSeleccionada = null;

async function cargarInstancias() {
  const selector = document.getElementById("instance-select");
  const contenedor = document.getElementById("background-container");

  try {
    const res = await fetch(INSTANCE_API);
    instancias = await res.json();

    for (const nombre in instancias) {
      const option = document.createElement("option");
      option.value = nombre;
      option.textContent = nombre;
      selector.appendChild(option);
    }

    selector.addEventListener("change", () => {
      instanciaSeleccionada = instancias[selector.value];
      cambiarFondo(instanciaSeleccionada.background_url);
    });

    // Selección inicial
    selector.dispatchEvent(new Event("change"));
  } catch (err) {
    console.error("Error al cargar instancias:", err);
  }
}

function cambiarFondo(url) {
  const contenedor = document.getElementById("background-container");

  if (url.endsWith(".mp4")) {
    contenedor.innerHTML = `
      <video autoplay muted loop playsinline style="position:absolute;width:100%;height:100%;object-fit:cover;z-index:-1;">
        <source src="${url}" type="video/mp4">
      </video>
      <div class="overlay">
        <select id="instance-select"></select>
        <button id="launch-button">Jugar</button>
      </div>
    `;
  } else {
    contenedor.style.background = `url('${url}') center/cover no-repeat`;
  }
}

// Lanza el juego usando la instancia seleccionada
document.getElementById("launch-button").addEventListener("click", () => {
  if (!instanciaSeleccionada) {
    alert("Selecciona una instancia");
    return;
  }

  const instanceOptions = {
    name: instanciaSeleccionada.status.nameServer,
    gameDirectory: `./.minecraft/${instanciaSeleccionada.status.nameServer}`,
    minecraftVersion: instanciaSeleccionada.loadder.minecraft_version,
    loader: {
      type: instanciaSeleccionada.loadder.loadder_type,
      version: instanciaSeleccionada.loadder.loadder_version
    },
    javaPath: "", // ruta al Java si aplica
    memory: {
      min: 2048,
      max: 4096
    }
  };

  // Aquí se llama la función de lanzamiento real del launcher
  require('../utils/Launcher').launch(instanceOptions);
});

window.addEventListener("DOMContentLoaded", cargarInstancias);
