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
            const db = new database();
            const configClient = await db.readData('configClient');
            const theme = configClient?.launcher_config?.theme || "auto";
            const isDarkTheme = await ipcRenderer.invoke('is-dark-theme', theme);
            
            document.body.className = isDarkTheme ? 'dark global' : 'light global';

            if (process.platform === 'win32') {
                ipcRenderer.send('update-window-progress-load');
            }

            this.startAnimation();
        });
    }

    async startAnimation() {
        const splashes = [
            { message: "Je... vie...", author: "Luuxis" },
            { message: "Salut je suis du code.", author: "Luuxis" },
            { message: "Linux n'est pas un os, mais un kernel.", author: "Luuxis" }
        ];

        const splash = splashes[Math.floor(Math.random() * splashes.length)];
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
        this.setStatus("Recherche de mise à jour...");

        try {
            await ipcRenderer.invoke('update-app');
        } catch (err) {
            return this.shutdown(`Erreur lors de la recherche de mise à jour :<br>${err.message}`);
        }

        ipcRenderer.on('updateAvailable', () => {
            this.setStatus("Mise à jour disponible !");
            if (process.platform === 'win32') {
                this.toggleProgress();
                ipcRenderer.send('start-update');
            } else {
                this.downloadUpdate();
            }
        });

        ipcRenderer.on('error', (_, err) => {
            if (err) this.shutdown(`${err.message}`);
        });

        ipcRenderer.on('download-progress', (_, progress) => {
            ipcRenderer.send('update-window-progress', {
                progress: progress.transferred,
                size: progress.total
            });
            this.setProgress(progress.transferred, progress.total);
        });

        ipcRenderer.on('update-not-available', () => {
            console.log("Mise à jour non disponible");
            this.maintenanceCheck();
        });
    }

    getLatestReleaseForOS(platform, extension, assets) {
        return assets
            .filter(asset => asset.name.toLowerCase().includes(platform) && asset.name.endsWith(extension))
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    }

    async downloadUpdate() {
        try {
            const [owner, repo] = pkg.repository.url
                .replace("git+", "")
                .replace(".git", "")
                .replace("https://github.com/", "")
                .split("/");

            const repoAPIUrl = `https://api.github.com/repos/${owner}/${repo}`;
            const repoData = await nodeFetch(repoAPIUrl).then(res => res.json());
            const releases = await nodeFetch(repoData.releases_url.replace("{/id}", '')).then(res => res.json());

            const assets = releases[0].assets;
            let latestAsset;

            if (process.platform === 'darwin') {
                latestAsset = this.getLatestReleaseForOS('mac', '.dmg', assets);
            } else if (process.platform === 'linux') {
                latestAsset = this.getLatestReleaseForOS('linux', '.appimage', assets);
            }

            this.setStatus(`Mise à jour disponible !<br><div class="download-update">Télécharger</div>`);

            document.querySelector(".download-update").addEventListener("click", () => {
                shell.openExternal(latestAsset.browser_download_url);
                this.shutdown("Téléchargement en cours...");
            });

        } catch (e) {
            this.shutdown(`Erreur lors du téléchargement de la mise à jour :<br>${e.message}`);
        }
    }

    async maintenanceCheck() {
        try {
            const launcherConfig = await config.GetConfig();
            if (launcherConfig.maintenance) {
                return this.shutdown(launcherConfig.maintenance_message);
            }
            this.startLauncher();
        } catch (e) {
            console.error(e);
            this.shutdown("Aucune connexion internet détectée,<br>veuillez réessayer ultérieurement.");
        }
    }

    startLauncher() {
        this.setStatus("Démarrage du launcher...");
        ipcRenderer.send('main-window-open');
        ipcRenderer.send('update-window-close');
    }

    shutdown(message) {
        this.setStatus(`${message}<br>Arrêt dans 5s`);
        let countdown = 4;

        const interval = setInterval(() => {
            this.setStatus(`${message}<br>Arrêt dans ${countdown--}s`);
            if (countdown < 0) {
                clearInterval(interval);
                ipcRenderer.send('update-window-close');
            }
        }, 1000);
    }

    setStatus(text) {
        this.message.innerHTML = text;
    }

    toggleProgress() {
        if (this.progress.classList.toggle("show")) {
            this.setProgress(0, 1);
        }
    }

    setProgress(value, max) {
        this.progress.value = value;
        this.progress.max = max;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// DevTools shortcut
document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey && e.shiftKey && e.keyCode === 73) || e.keyCode === 123) {
        ipcRenderer.send("update-window-dev-tools");
    }
});

// Start splash
new Splash();
