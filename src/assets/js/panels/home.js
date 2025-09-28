/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
import { config, database, logger, changePanel, appdata, setStatus, pkg, popup } from '../utils.js'

const { Launch } = require('minecraft-java-core')
const { shell, ipcRenderer } = require('electron')

class Home {
    static id = "home";
    async init(config) {
        this.config = config;
        this.db = new database();
        this.news()
        this.socialLick()
        this.instancesSelect()
        document.querySelector('.settings-btn').addEventListener('click', e => changePanel('settings'))
    }

    async news() {
        let newsElement = document.querySelector('.news-list');
        let news = await config.getNews().then(res => res).catch(err => false);
        if (news) {
            if (!news.length) {
                let blockNews = document.createElement('div');
                blockNews.classList.add('news-block');
                blockNews.innerHTML = `
                    <div class="news-header">
                        <img class="server-status-icon" src="assets/images/icon.png">
                        <div class="header-text">
                            <div class="title">Aucun news n'ai actuellement disponible.</div>
                        </div>
                        <div class="date">
                            <div class="day">1</div>
                            <div class="month">Janvier</div>
                        </div>
                    </div>
                    <div class="news-content">
                        <div class="bbWrapper">
                            <p>Vous pourrez suivre ici toutes les news relative au serveur.</p>
                        </div>
                    </div>`
                newsElement.appendChild(blockNews);
            } else {
                for (let News of news) {
                    let date = this.getdate(News.publish_date)
                    let blockNews = document.createElement('div');
                    blockNews.classList.add('news-block');
                    blockNews.innerHTML = `
                        <div class="news-header">
                            <img class="server-status-icon" src="assets/images/icon.png">
                            <div class="header-text">
                                <div class="title">${News.title}</div>
                            </div>
                            <div class="date">
                                <div class="day">${date.day}</div>
                                <div class="month">${date.month}</div>
                            </div>
                        </div>
                        <div class="news-content">
                            <div class="bbWrapper">
                                <p>${News.content.replace(/\n/g, '</br>')}</p>
                                <p class="news-author">Auteur - <span>${News.author}</span></p>
                            </div>
                        </div>`
                    newsElement.appendChild(blockNews);
                }
            }
        } else {
            let blockNews = document.createElement('div');
            blockNews.classList.add('news-block');
            blockNews.innerHTML = `
                <div class="news-header">
                        <img class="server-status-icon" src="assets/images/icon.png">
                        <div class="header-text">
                            <div class="title">Error.</div>
                        </div>
                        <div class="date">
                            <div class="day">1</div>
                            <div class="month">Janvier</div>
                        </div>
                    </div>
                    <div class="news-content">
                        <div class="bbWrapper">
                            <p>Impossible de contacter le serveur des news.</br>Merci de vérifier votre configuration.</p>
                        </div>
                    </div>`
            newsElement.appendChild(blockNews);
        }
    }

    socialLick() {
        let socials = document.querySelectorAll('.social-block')

        socials.forEach(social => {
            social.addEventListener('click', e => {
                shell.openExternal(e.target.dataset.url)
            })
        });
    }

    async instancesSelect() {
        let configClient = await this.db.readData('configClient')
        let auth = await this.db.readData('accounts', configClient.account_selected)
        let instancesList = await config.getInstanceList()
        let instanceSelect = instancesList.find(i => i.name == configClient?.instance_selct) ? configClient?.instance_selct : null

        let instanceBTN = document.querySelector('.play-instance')
        let instancePopup = document.querySelector('.instance-popup')
        let instancesListPopup = document.querySelector('.instances-List')
        let instanceCloseBTN = document.querySelector('.close-popup')

        if (instancesList.length === 1) {
            document.querySelector('.instance-select').style.display = 'none'
            instanceBTN.style.paddingRight = '0'
        }

        if (!instanceSelect) {
            let newInstanceSelect = instancesList.find(i => i.whitelistActive == false)
            let configClient = await this.db.readData('configClient')
            configClient.instance_selct = newInstanceSelect.name
            instanceSelect = newInstanceSelect.name
            await this.db.updateData('configClient', configClient)
        }

        for (let instance of instancesList) {
            if (instance.whitelistActive) {
                let whitelist = instance.whitelist.find(whitelist => whitelist == auth?.name)
                if (whitelist !== auth?.name) {
                    if (instance.name == instanceSelect) {
                        let newInstanceSelect = instancesList.find(i => i.whitelistActive == false)
                        let configClient = await this.db.readData('configClient')
                        configClient.instance_selct = newInstanceSelect.name
                        instanceSelect = newInstanceSelect.name
                        setStatus(newInstanceSelect.status)
                        await this.db.updateData('configClient', configClient)
                    }
                }
            } else console.log(`Initializing instance ${instance.name}...`)
            if (instance.name == instanceSelect) setStatus(instance.status)
        }

        instancePopup.addEventListener('click', async e => {
            let configClient = await this.db.readData('configClient')

            if (e.target.classList.contains('instance-elements')) {
                let newInstanceSelect = e.target.id
                let activeInstanceSelect = document.querySelector('.active-instance')

                if (activeInstanceSelect) activeInstanceSelect.classList.toggle('active-instance');
                e.target.classList.add('active-instance');

                configClient.instance_selct = newInstanceSelect
                await this.db.updateData('configClient', configClient)
                instanceSelect = instancesList.filter(i => i.name == newInstanceSelect)
                instancePopup.style.display = 'none'
                let instance = await config.getInstanceList()
                let options = instance.find(i => i.name == configClient.instance_selct)
                await setStatus(options.status)
            }
        })

        instanceBTN.addEventListener('click', async e => {
            let configClient = await this.db.readData('configClient')
            let instanceSelect = configClient.instance_selct
            let auth = await this.db.readData('accounts', configClient.account_selected)

            if (e.target.classList.contains('instance-select')) {
                instancesListPopup.innerHTML = ''
                for (let instance of instancesList) {
                    if (instance.whitelistActive) {
                        instance.whitelist.map(whitelist => {
                            if (whitelist == auth?.name) {
                                if (instance.name == instanceSelect) {
                                    instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements active-instance">${instance.name}</div>`
                                } else {
                                    instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements">${instance.name}</div>`
                                }
                            }
                        })
                    } else {
                        if (instance.name == instanceSelect) {
                            instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements active-instance">${instance.name}</div>`
                        } else {
                            instancesListPopup.innerHTML += `<div id="${instance.name}" class="instance-elements">${instance.name}</div>`
                        }
                    }
                }

                instancePopup.style.display = 'flex'
            }

            if (!e.target.classList.contains('instance-select')) this.startGame()
        })

        instanceCloseBTN.addEventListener('click', () => instancePopup.style.display = 'none')
    }

    async startGame() {
            const fs = require('fs');
            let launch = new Launch();
            let configClient = await this.db.readData('configClient');
            let instance = await config.getInstanceList();
            let authenticator = await this.db.readData('accounts', configClient.account_selected);
            let options = instance.find(i => i.name == configClient.instance_selct);
            if (!options) {
                let popupError = new popup();
                popupError.openPopup({
                    title: 'Erreur instance',
                    content: 'Aucune instance Minecraft sélectionnée ou trouvée. Vérifie ta configuration dans les paramètres.',
                    color: 'red',
                    options: true
                });
                return;
            }

            // Rafraîchir le token du compte sélectionné avant de lancer le jeu
            let refreshedAuthenticator = authenticator;
            try {
                if (authenticator && authenticator.meta) {
                    if (authenticator.meta.type === 'Xbox' || authenticator.meta.type === 'Microsoft') {
                        const { Microsoft } = require('minecraft-java-core');
                        let refresh = await new Microsoft(authenticator.meta.client_id || configClient.client_id).refresh(authenticator);
                        if (!refresh.error && refresh.access_token) {
                            refreshedAuthenticator = refresh;
                            refreshedAuthenticator.ID = authenticator.ID;
                            await this.db.updateData('accounts', refreshedAuthenticator, authenticator.ID);
                        } else {
                            throw new Error('Votre session Microsoft a expiré ou le token est invalide. Veuillez vous reconnecter.');
                        }
                    } else if (authenticator.meta.type === 'Mojang') {
                        const { Mojang } = require('minecraft-java-core');
                        let refresh = await Mojang.refresh(authenticator);
                        if (!refresh.error && refresh.access_token) {
                            refreshedAuthenticator = refresh;
                            refreshedAuthenticator.ID = authenticator.ID;
                            await this.db.updateData('accounts', refreshedAuthenticator, authenticator.ID);
                        } else {
                            throw new Error('Votre session Mojang a expiré ou le token est invalide. Veuillez vous reconnecter.');
                        }
                    } else if (authenticator.meta.type === 'AZauth') {
                        const { AZauth } = require('minecraft-java-core');
                        let refresh = await new AZauth(configClient.online).verify(authenticator);
                        if (!refresh.error && refresh.access_token) {
                            refreshedAuthenticator = refresh;
                            refreshedAuthenticator.ID = authenticator.ID;
                            await this.db.updateData('accounts', refreshedAuthenticator, authenticator.ID);
                        } else {
                            throw new Error('Votre session AZauth a expiré ou le token est invalide. Veuillez vous reconnecter.');
                        }
                    }
                } else {
                    throw new Error('Aucun compte authentifié. Veuillez vous connecter.');
                }
            } catch (err) {
                let popupError = new popup();
                popupError.openPopup({
                    title: 'Erreur d\'authentification',
                    content: err.message,
                    color: 'red',
                    options: true
                });
                return;
            }

            // Vérification accès dossier .minecraft
            const mcPath = `${process.env.APPDATA}/.minecraft`;
            try {
                if (!fs.existsSync(mcPath)) {
                    fs.mkdirSync(mcPath, { recursive: true });
                }
                fs.accessSync(mcPath, fs.constants.W_OK);
            } catch (err) {
                let popupError = new popup();
                popupError.openPopup({
                    title: 'Erreur dossier Minecraft',
                    content: 'Impossible d\'accéder au dossier .minecraft. Vérifie tes droits d\'écriture.',
                    color: 'red',
                    options: true
                });
                return;
            }

            let playInstanceBTN = document.querySelector('.play-instance');
            let infoStartingBOX = document.querySelector('.info-starting-game');
            let infoStarting = document.querySelector('.info-starting-game-text');
            let progressBar = document.querySelector('.progress-bar');

            // Vérification du token et du type utilisateur
            if (!refreshedAuthenticator || !refreshedAuthenticator.access_token) {
                let popupError = new popup();
                popupError.openPopup({
                    title: 'Erreur d\'authentification',
                    content: 'Le token Microsoft/Mojang est manquant ou invalide. Veuillez vous reconnecter.',
                    color: 'red',
                    options: true
                });
                return;
            }

            // Construction des options de lancement avec forçage du type utilisateur
            let opt = {
                url: options.url,
                authenticator: {
                    ...refreshedAuthenticator,
                    accessToken: refreshedAuthenticator.access_token,
                    userType: 'msa',
                },
                timeout: 10000,
                path: mcPath,
                instance: options.name,
                version: options.loadder.minecraft_version,
                detached: configClient.launcher_config.closeLauncher == "close-all" ? false : true,
                downloadFileMultiple: configClient.launcher_config.download_multi,
                intelEnabledMac: configClient.launcher_config.intelEnabledMac,
                loader: {
                    type: options.loadder.loadder_type,
                    build: options.loadder.loadder_version,
                    enable: options.loadder.loadder_type == 'none' ? false : true
                },
                verify: options.verify,
                ignored: [...options.ignored],
                java: {
                    path: configClient.java_config.java_path,
                },
                JVM_ARGS:  options.jvm_args ? options.jvm_args : [],
                GAME_ARGS: options.game_args ? options.game_args : [],
                screen: {
                    width: configClient.game_config.screen_size.width,
                    height: configClient.game_config.screen_size.height
                },
                memory: {
                    min: `${configClient.java_config.java_memory.min * 1024}M`,
                    max: `${configClient.java_config.java_memory.max * 1024}M`
                }
            };

            try {
                launch.Launch(opt);
            } catch (err) {
                console.error('[Miyura-Launcher]: Erreur de téléchargement', err);
                if (err.name === 'AbortError' || (err.message && err.message.includes('signal is aborted'))) {
                    alert('Le téléchargement a été interrompu. Vérifie ta connexion ou relance le launcher.');
                } else {
                    alert('Erreur lors du téléchargement : ' + err.message);
                }
                return;
            }

        // Gestionnaire d'erreur sur l'objet launch
        launch.on('error', (err) => {
            console.error('[Miyura-Launcher]: Erreur de téléchargement (event)', err);
            if (err.name === 'AbortError' || (err.message && err.message.includes('signal is aborted'))) {
                alert('Le téléchargement a été interrompu. Vérifie ta connexion ou relance le launcher.');
            } else {
                alert('Erreur lors du téléchargement : ' + err.message);
            }
                    launch.Launch(opt);

            // Optionnel : tu peux ici relancer le téléchargement ou afficher un bouton pour réessayer
        });

        playInstanceBTN.style.display = "none"
        infoStartingBOX.style.display = "block"
        progressBar.style.display = "";
        ipcRenderer.send('main-window-progress-load')

        launch.on('extract', extract => {
            ipcRenderer.send('main-window-progress-load')
            console.log(extract);
        });

        launch.on('progress', (progress, size) => {
            infoStarting.innerHTML = `Téléchargement ${((progress / size) * 100).toFixed(0)}%`
            ipcRenderer.send('main-window-progress', { progress, size })
            progressBar.value = progress;
            progressBar.max = size;
        });

        launch.on('check', (progress, size) => {
            infoStarting.innerHTML = `Vérification ${((progress / size) * 100).toFixed(0)}%`
            ipcRenderer.send('main-window-progress', { progress, size })
            progressBar.value = progress;
            progressBar.max = size;
        });

        launch.on('estimated', (time) => {
            let hours = Math.floor(time / 3600);
            let minutes = Math.floor((time - hours * 3600) / 60);
            let seconds = Math.floor(time - hours * 3600 - minutes * 60);
            console.log(`${hours}h ${minutes}m ${seconds}s`);
        })

        launch.on('speed', (speed) => {
            console.log(`${(speed / 1067008).toFixed(2)} Mb/s`)
        })

        launch.on('patch', patch => {
            console.log(patch);
            ipcRenderer.send('main-window-progress-load')
            infoStarting.innerHTML = `Patch en cours...`
        });

        launch.on('data', (e) => {
            progressBar.style.display = "none"
            if (configClient.launcher_config.closeLauncher == 'close-launcher') {
                ipcRenderer.send("main-window-hide")
            };
            new logger('Minecraft', '#36b030');
            ipcRenderer.send('main-window-progress-load')
            infoStarting.innerHTML = `Demarrage en cours...`
            console.log(e);
        })

        launch.on('close', code => {
            if (configClient.launcher_config.closeLauncher == 'close-launcher') {
                ipcRenderer.send("main-window-show")
            };
            ipcRenderer.send('main-window-progress-reset')
            infoStartingBOX.style.display = "none"
            playInstanceBTN.style.display = "flex"
            infoStarting.innerHTML = `Vérification`
            new logger(pkg.name, '#7289da');
            console.log('Close');
        });

        launch.on('error', err => {
            let popupError = new popup()

            popupError.openPopup({
                title: 'Erreur',
                content: err.error,
                color: 'red',
                options: true
            })

            if (configClient.launcher_config.closeLauncher == 'close-launcher') {
                ipcRenderer.send("main-window-show")
            };
            ipcRenderer.send('main-window-progress-reset')
            infoStartingBOX.style.display = "none"
            playInstanceBTN.style.display = "flex"
            infoStarting.innerHTML = `Vérification`
            new logger(pkg.name, '#7289da');
            console.log(err);
        });
    }

    getdate(e) {
        let date = new Date(e)
        let year = date.getFullYear()
        let month = date.getMonth() + 1
        let day = date.getDate()
        let allMonth = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
        return { year: year, month: allMonth[month - 1], day: day }
    }
}
export default Home;