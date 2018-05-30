//*******************************************************//
//  Загрузчик TO для публичного хостинга//
//******************************************************//

function launch() {
// релиз клиента (A/B тестирование)

    var publicReleaseDSN = "https://048cc079e2564a00a68cb9cfcdc0e51a@sentry.tankionline.com/6";
    var privateReleaseDSN = "https://7130333fffb649b99659c15328e42a05@admin.tankionline.com/9";
    var releaseDSN = "https://4dfa598ba1da4377b43a5583887d6d27@sentry.tankionline.com/5";


    reachGoal("launcherLoaded_html5");

    var releasesDSN = {};
    releasesDSN.A = "https://83dfde54283a4061879bf605a2e18dee@sentry.tankionline.com/7";
    releasesDSN.B = "https://a1679e4843f944dfb5b6b9fb22251bf1@sentry.tankionline.com/8";
    releasesDSN.C = "https://7130333fffb649b99659c15328e42a05@admin.tankionline.com/9";


    identifyRelease(
// a/b/c релиз
        function (releaseName, releaseId) {
            loadResourcesAndLaunchGame(releasesDSN[releaseName], "versions" + releaseName + ".json", releaseId, ravenConfig);
            window.to_releaseName = releaseName


        },
// основной релиз
        function () {
            window.to_releaseName = "main";
            var dsn = releaseDSN;
            if (window.location.hostname.indexOf("test-eu.tankionline.com") !== -1) {
                if (window.location.hostname.indexOf("public") !== -1) {
                    dsn = publicReleaseDSN
                } else {
                    dsn = privateReleaseDSN
                }
            }
		dsn = privateReleaseDSN
            loadResourcesAndLaunchGame(dsn, "versions.json", undefined);
		console.log(dsn);
        }
    );

}

function reachGoal(goal) {
// резчики баннеров могут блокировать Yandex метрику
    try {
        if (window.yaCounter == undefined) {
            window.yaCounter = new Ya.Metrika({id: 10288858, enableAll: true, trackHash: true, webvisor: true});
        }
        window.yaCounter.reachGoal(goal)
    } catch (e) {
        console.log(e)
    }
}

function loadResourcesAndLaunchGame(logDSN, versionsFileName, releaseId) {
    console.log("loadResourcesAndLaunchGame", logDSN, versionsFileName);
    reachGoal("loadResourcesAndLaunchGame_html5");

    var request = new XMLHttpRequest();
    request.onload = function () {
        manifest = request.response;

        if (releaseId == undefined) {
            releaseId = manifest.releaseId
        }

        Raven.config(logDSN, {
            debug: false,
            instrument: false,
            autoBreadcrumbs: {
                xhr: false,
                dom: false
            },
            release: manifest.releaseId
        }).install();
        loadCssAndJs(manifest)
    };

    request.open("GET", versionsFileName + "?rand=" + Math.random(), true);
    request.responseType = 'json';
    request.send();

}


/**
 * Определение ветки
 * releaseSelected - function(releaseName, releaseId){}
 * mainReleaseSelected - function(){}
 */
function identifyRelease(releaseSelected, mainReleaseSelected) {
    var allPossibleReleases = ["a", "b", "c"];
    var releases = [];
    var releaseIdToName = {};
    var checked = 0;
    allPossibleReleases.forEach(function (item, i, arr) {
            var request = new XMLHttpRequest();
            request.onload = function () {
                var releaseId = request.response;
                if (releaseId != undefined) {

                    releaseIdToName[releaseId.id] = item
                    releases[checked] = releaseId.id
                }

                checked++;
                if (checked == allPossibleReleases.length) {
// выбираем релиз из cookie
                    var currentReleaseId = window.localStorage.getItem("releaseId")
                    var releaseName = releaseIdToName[currentReleaseId]

                    if (releaseName != undefined) {
                        releaseSelected(releaseName, currentReleaseId)
                    } else {
// определяем текущий релиз
                        var rand = Math.round((Math.random() * 100) / 25);
                        var releaseId = releases[rand];
                        var releaseName = releaseIdToName[releaseId];

                        if (releaseId != undefined) {
                            window.localStorage.setItem("releaseId", releaseId)
                            releaseSelected(releaseName, releaseId);
                        } else {
                            mainReleaseSelected()
                        }

                    }
                }
            };

            request.open("GET", "release" + item + ".json?rand=" + Math.random(), true);
            request.responseType = 'json';
            request.send();
        }
    );
}

/**
 * Загрузка JS
 */
function loadJS(files, index, manifest, allSize, remainingSize, callback) {
    var src = manifest[files[index][0]].path;
    var size = files[index][1];
    var script = document.createElement("script");
    script.src = src;
    script.onload = function () {
        remainingSize = remainingSize - size;
        updateProgressInBar(Math.round((allSize - remainingSize) / allSize * 100));
        if (index + 1 < files.length) {
            loadJS(files, index + 1, manifest, allSize, remainingSize, callback)
        } else {
            callback()
        }
    };
    document.documentElement.appendChild(script);
}


/**
 * Предзагрузка изображеия
 */
function preloadAtlas(src, allSize, embedded_atlas_png_size, callback) {


    var loadedSize = 0;

    var timer = window.setInterval(function () {
        if (loadedSize < embedded_atlas_png_size) {
            loadedSize = loadedSize + embedded_atlas_png_size / 50;
        }
        var currentRemainingSize = allSize - loadedSize;
        updateProgressInBar(Math.round((allSize - currentRemainingSize) / allSize * 100));
    }, 2000);


    var req = new XMLHttpRequest();
    req.addEventListener("load", function (event) {
        clearInterval(timer);
        callback()
    }, false);

    req.responseType = "arraybuffer";
    req.open("GET", src, true);
    req.send();
}


/**
 * Загрузка CSS
 */
function loadCSS(href) {
    var script = document.createElement('link');
    script.setAttribute('type', "text/css");
    script.setAttribute('rel', "stylesheet");
    script.setAttribute('href', href);
    document.getElementsByTagName('head')[0].appendChild(script);
    showProgressBar();
}

function loadCssAndJs(manifest) {

    loadCSS(toPath('css/main.css', manifest));
	loadCSS(toPath('css/farsi.css', manifest));
    loadCSS(toPath('css/jquery.custom-scrollbar.css', manifest));
    loadCSS(toPath('css/jquery.nice-select.css', manifest));
    reachGoal("cssLoaded_html5");

    var files = [
        ['js/keyboard.js', 28 * 1024],
        ['js/web.min.js', 28 * 1024],
        ['js/polyfills.js', 2 * 1024],
        ['js/textencoding/encoding-indexes.js', 181 * 1024],
        ['js/textencoding/encoding.js', 18 * 1024],
        ['js/kotlin.js', 1300 * 1024],
        ['js/kotlinx-html-js.js', 620 * 1024],
        ['js/react.js', 137 * 1024],
        ['js/react-dom.js', 500 * 1024],
        ['js/signals.min.js', 1024],
        ['js/TweenLite.min.js', 10 * 1024],
        ['js/common.js', 3 * 1024],
        ['js/jquery.min.js', 30 * 1024],
        ['js/jquery-ui.js', 500 * 1024],
        ['js/jquery.custom-scrollbar.js', 5 * 1024],
        ['js/jquery.nice-select.min.js', 2 * 1024],
        ['to/core.js', 286 * 1024],
        ['to/to1.js', 426 * 1024],
        ['to/to2.js', 1.5 * 1024 * 1024]
    ];


    var embedded_atlas_png_size = 4.5 * 1024 * 1024;
    var allSize = files.reduce(function (previousValue, currentValue, index, array) {
        return previousValue + currentValue[1];
    }, 0) + embedded_atlas_png_size;

    preloadAtlas(toPath('sprite/sprite.png', manifest), embedded_atlas_png_size, allSize, function () {
        preloadAtlas(toPath('atlas/embedded/atlas.png', manifest), embedded_atlas_png_size, allSize, function () {
            loadCSS(toPath('atlas/embedded/atlas.css', manifest));
            loadCSS(toPath('sprite/sprite.css', manifest));
            reachGoal("atlasLoaded_html5");

        loadJS(files, 0, manifest, allSize, allSize - embedded_atlas_png_size, function () {

            window.setTimeout(function () {
                launchGame(manifest);
            }, 1)

            })

        });
    });
}

function toPath(name, manifest) {
    return manifest[name].path
}


function launchGame(manifest) {
    reachGoal("launchGame_html5");

    stage = document.getElementById("stage");

    window.onresize = arrange;
    arrange();

    TanksLauncher.projects.tanks.clients.html5.launcher.launchGame(function (name) {
        return toPath(name, manifest)
    })
}

function arrange() {
    var resultWidth = window.innerWidth;
    var resultHeight = window.innerHeight;

    stage.width = resultWidth;
    stage.height = resultHeight;

    stage.style.width = resultWidth + "px";
    stage.style.height = resultHeight + "px";

    var guiWrapper = document.getElementsByClassName("gui-wrapper");
    if (guiWrapper.length) {
        guiWrapper[0].style.width = (window.innerWidth >= 1000 ? window.innerWidth : 1000) + "px";
        guiWrapper[0].style.height = (window.innerHeight >= 600 ? window.innerHeight : 600) + "px";
    }

    stage.dispatchEvent(new Event("resizeEvent"));
}


/**
 * Управление индикатором загрузки
 */
var ruTips = ["1", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "2", "20", "21", "22", "23", "24", "25", "26", "27", "28", "3", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "4", "5", "6", "7", "8", "9"];
var brTips = ["1", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "2", "20", "21", "22", "23", "24", "25", "26", "27", "29", "3", "30", "33", "34", "35", "36", "37", "38", "39", "4", "5", "6", "7", "8", "9"];
var cnTips = ["1", "10", "11", "13", "14", "15", "16", "17", "18", "19", "2", "20", "21", "22", "23", "24", "27", "3", "31", "32", "33", "34", "35", "36", "37", "38", "4", "5", "6", "7", "8", "9"];
var deTips = ["1", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "2", "20", "21", "22", "23", "24", "25", "26", "27", "29", "3", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "4", "5", "6", "7", "8", "9"];
var enTips = ["1", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "2", "20", "21", "22", "23", "24", "25", "26", "27", "29", "3", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "4", "5", "6", "7", "8", "9"];
var esTips = ["1", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "2", "20", "21", "22", "23", "24", "25", "26", "27", "29", "3", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "4", "5", "6", "7", "8", "9"];
var plTips = ["1", "10", "11", "13", "14", "15", "16", "17", "18", "19", "2", "20", "21", "22", "23", "24", "25", "26", "27", "29", "3", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "4", "5", "6", "7", "8", "9"];
var faTips = ["1", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "2", "20", "21", "22", "23", "24", "25", "26", "27", "29", "3", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "4", "5", "6", "7", "8", "9"];

var lang = _GET("locale");
if (!lang) {
    lang = "en"
}
var tips = enTips;
switch (lang) {
    case 'ru':
        tips = ruTips;
        break;
    case 'br':
        tips = brTips;
        break;
    case 'cn':
        tips = cnTips;
        break;
    case 'de':
        tips = deTips;
        break;
    case 'es':
        tips = esTips;
        break;
    case 'pl':
        tips = plTips;
        break;
	case 'fa':
		tips = faTips;
		break;
}

/**
 * Версия отображения
 * @type {number}
 */
var showVersion = 0;
var firstShowProgressBar = true;

function showProgressBar() {
    if (isProgressBarShow()) {
        return;
    }
    showVersion++;
    updateProgressInBar(0);

    var launcher = window.document.getElementById("launcher");
    launcher.style.display = "flex";

    if (firstShowProgressBar) {
        firstShowProgressBar = false;
        window.setTimeout(function () {
            nextTipInProgressBar()
        }, 5000);
    } else {
        nextTipInProgressBar()
    }

}

function isProgressBarShow() {
    var launcher = window.document.getElementById("launcher");
    return launcher.style.display === "flex"
}


/**
 * true - первый слот
 * false - второй
 * @type {boolean}
 */
var currentActiveImageSlot = true;
/**
 * Номер отображаемого совета
 * @type {number}
 */
var tipsNumber = 0;


function nextTipInProgressBar() {
    if (!isProgressBarShow()) {
        return;
    }
    var currentShowVersion = showVersion;

    tipsNumber++;
    if (tipsNumber > tips.length - 1) {
        tipsNumber = 0;
    }
    var imageUrl = "img/advices/" + lang + "/advice_" + lang + "_" + tips[tipsNumber] + ".jpg";


    var img = new Image();
    img.onload = function () {
        if (currentShowVersion === showVersion) {
            var nextActiveImageSlot = !currentActiveImageSlot;

            var nextImage = window.document.getElementById("launcher-tip-" + nextActiveImageSlot);
            nextImage.className = "image-wrapper fade-in";
            nextImage.style.backgroundImage = "url('" + imageUrl + "')";

            var currentImage = window.document.getElementById("launcher-tip-" + currentActiveImageSlot);
            currentImage.className = "image-wrapper fade-out";

            currentActiveImageSlot = nextActiveImageSlot;

            window.setTimeout(function () {
                if (currentShowVersion === showVersion) {
                    // отключаем анимацию
                    nextImage.className = "image-wrapper visible";
                    currentImage.className = "image-wrapper";
                    // показываем следующий совет
                    window.setTimeout(function () {
                        if (currentShowVersion === showVersion) {
                            nextTipInProgressBar()
                        }
                    }, 1000)
                }
            }, 3000);
        }
    };
    img.onerror = function () {
        if (currentShowVersion === showVersion) {
            nextTipInProgressBar()
        }
    };
    img.src = imageUrl
}

function hideProgressBar() {
    var launcher = window.document.getElementById("launcher");
    launcher.style.display = "none";
}

function updateProgressInBar(progress) {
    if (progress > 100) {
        progress = 100;
    }
    var launcher = window.document.getElementById("launcher-loading-bar");
    launcher.style.width = progress + "%";
}

function _GET(param) {
    var vars = {};
    window.location.href.replace(location.hash, '').replace(
        /[?&]+([^=&]+)=?([^&]*)?/gi, // regexp
        function (m, key, value) { // callback
            vars[key] = value !== undefined ? value : '';
        }
    );

    if (param) {
        return vars[param] ? vars[param] : null;
    }
    return vars;
}
