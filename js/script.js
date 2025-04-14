let gameroom = "";
let scores = 0;
let next_pushable = true;
let inGame = false;
let word = "";
let lastChanse = false;
let players = "";

// Game state management using localStorage
function getGameState() {
    const state = localStorage.getItem(`game_${gameroom}`) || '{}';
    return JSON.parse(state);
}

function setGameState(state) {
    localStorage.setItem(`game_${gameroom}`, JSON.stringify(state));
    // Update last action timestamp
    localStorage.setItem(`lastAction_${gameroom}`, new Date().toLocaleString());
}

function getWordList() {
    const state = getGameState();
    return state.wordList || [];
}

function setWordList(words) {
    const state = getGameState();
    state.wordList = words;
    setGameState(state);
}

function getActiveGame() {
    const state = getGameState();
    return state.activeGame || [];
}

function setActiveGame(words) {
    const state = getGameState();
    state.activeGame = words;
    setGameState(state);
}

function getPlayersList() {
    const state = getGameState();
    return state.players || [];
}

function setPlayersList(players) {
    const state = getGameState();
    state.players = players;
    setGameState(state);
}

function getScores() {
    const state = getGameState();
    return state.scores || 0;
}

function setScores(newScores) {
    const state = getGameState();
    state.scores = newScores;
    setGameState(state);
    $("header span").text("очки: " + newScores);
}

function clearGameState() {
    localStorage.removeItem(`game_${gameroom}`);
    localStorage.removeItem(`lastAction_${gameroom}`);
}

$(document).ready(() => {
    $("#menu,#next,#play,#menuopen").hide();
    registration(preparePage);
});

function registration(after) {
    let res, rej;
    $("#selectname").keyup((e) => {
        e.target.value = filterName(e.target.value);
        getLastAction(e.target);
        if (e.keyCode == 13) $("#selectnamebutton").click();
    });
    $("#selectnamebutton").click(() => {
        gameroom = filterName(document.getElementById("selectname").value);
        $("#setgamename").fadeOut(150, gameroom ? res : rej);
    });
    (function setRoom() {
        new Promise((resolve, reject) => {
            res = resolve;
            rej = reject;
        }).then(after, setRoom);
        $("#setgamename").show(20);
    })();
}

function preparePage() {
    $("#current_room").html(`Комната: ${gameroom}`);
    $("#msg").html(
        `<small><small>Откройте меню, чтобы положить слова в шляпу и затем запустить кон. Нажмите "ход", чтобы взять слова из шляпы.</small></small>`
    );
    $("#msg small").fadeIn(20);
    $("#play").fadeIn(30);
    $("#menuopen").fadeIn(100);
    $(".guestmessage").fadeOut(20);
    scores = getScores();
    $("header span").text("очки: " + scores);
    $("#menuopen").click(() => $("#menu").fadeIn(100, getPlayers));
    $("#menuclose").click(() => $("#menu").fadeOut(150));
    $("#play").click(() => request("play"));
    $("#next").click(() => {
        if (next_pushable) {
            next_pushable = false;
            request("next");
        }
    });
    $("#newgame").click(() => request("newgame"));
    $("#clear").click(() => request("clear"));
    $("#addwords").click(() => request("addwords"));
    $("#infobutton").click(() => request("info"));
    $("#nullScores").click(resetScores);
    $("#randomiser").click(shufflePlayers);
}

function resetScores() {
    scores = 0;
    setScores(scores);
    play.coin();
    $("#information").text("Очки обнулены");
}

function request(task) {
    let result;
    switch (task) {
        case "play":
            const activeGame = getActiveGame();
            result = activeGame.join("\n");
            break;
        case "next":
            const currentWord = $("#msg").text();
            let words = getActiveGame();
            words = words.filter(word => word !== currentWord);
            setActiveGame(words);
            scores++;
            setScores(scores);
            result = words.join("\n");
            break;
        case "newgame":
            const wordList = getWordList();
            if (wordList.length > 0) {
                setActiveGame([...wordList]);
                result = "Игра начата";
            } else {
                result = "Ошибка, в игре нет слов";
            }
            break;
        case "clear":
            clearGameState();
            result = "Данные успешно очищены";
            break;
        case "addwords":
            const newWords = $(".newword")
                .map(function() { return $(this).val(); })
                .get()
                .filter(word => word.trim() !== "");
            if (newWords.length > 0) {
                const currentWords = getWordList();
                setWordList([...currentWords, ...newWords]);
                $(".newword").val("");
                result = "Данные в файл успешно занесены";
            } else {
                result = "Пустой набор слов";
            }
            break;
        case "info":
            result = getWordList().join("\n");
            break;
        case "getPlayers":
            result = getPlayersList().join("\n");
            break;
        case "setPlayers":
            const playerList = $("#players").val().split("\n").filter(p => p.trim() !== "");
            setPlayersList(playerList);
            result = "Данные в файл успешно занесены";
            break;
        default:
            result = "неверный запрос";
    }
    fSucces(result, task);
}

function fSucces(data, task) {
    if (task == "info") {
        $("#information").html(
            data
                ? `<small>В игре ${data.split("\n").length} слов</small>`
                : "<small>В игре нет слов</small>"
        );
    } else if (task == "clear") {
        $("#information").html(`<small>${data}</small>`);
        play.coin();
    } else if (task == "addwords") {
        $("#information").html(`<small>${data}</small>`);
        play.coin();
    } else if (task == "newgame") {
        $("#information").html(`<small>${data}</small>`);
        if (data == "Игра начата") {
            play.coin();
            inGame = true;
        }
    } else if (task == "play" || task == "next") {
        successGame(data, task);
    }
}

function successGame(data, task) {
    if (task == "play") {
        if (data) {
            const words = data.split("\n");
            word = words[Math.floor(Math.random() * words.length)];
            $("#msg").html(word);
            $("#next").show();
            $("#play").hide();
            timer();
            inGame = true;
        } else {
            $("#msg").html("<small>В игре нет слов</small>");
            play.warning();
        }
    } else if (task == "next") {
        if (data) {
            const words = data.split("\n");
            word = words[Math.floor(Math.random() * words.length)];
            $("#msg").html(word);
            next_pushable = true;
        } else {
            $("#msg").html("<small>Игра окончена</small>");
            $("#next").hide();
            $("#play").show();
            inGame = false;
            play.endgame();
        }
    }
}

function getWord(data) {
    return data.split("\n")[Math.floor(Math.random() * data.split("\n").length)];
}

function timer() {
    let time = 60;
    $("#timer").html(`<small>${time}</small>`);
    (function timeout(time) {
        if (time > 0 && inGame) {
            setTimeout(() => {
                time--;
                $("#timer").html(`<small>${time}</small>`);
                timeout(time);
            }, 1000);
        } else if (time == 0 && inGame) {
            $("#timer").html("<small>Время вышло!</small>");
            play.lose();
            inGame = false;
        }
    })(time);
}

function shufflePlayers() {
    const players = getPlayersList();
    if (players.length > 1) {
        const shuffled = [...players];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        let pairs = "";
        for (let i = 0; i < shuffled.length; i += 2) {
            if (i + 1 < shuffled.length) {
                pairs += `${shuffled[i]} - ${shuffled[i + 1]}<br>`;
            } else {
                pairs += `${shuffled[i]}<br>`;
            }
        }
        $("#randomiser-res").html(pairs);
    } else {
        $("#randomiser-res").html("Добавьте игроков");
    }
}

function setPlayers(str) {
    players = str;
    setPlayersList(str.split("\n").filter(p => p.trim() !== ""));
}

function getPlayers() {
    const players = getPlayersList();
    if (players.length > 0) {
        $("#players").val(players.join("\n"));
    }
}

function random(max) {
    return Math.floor(Math.random() * max);
}

const play = {
    upload() {
        const audio = new Audio("./sounds/upload.mp3");
        audio.play();
    },
    endgame() {
        const audio = new Audio("./sounds/endgame.mp3");
        audio.play();
    },
    lose() {
        const audio = new Audio("./sounds/lose.mp3");
        audio.play();
    },
    warning() {
        const audio = new Audio("./sounds/warning.mp3");
        audio.play();
    },
    coin() {
        const audio = new Audio("./sounds/coin.mp3");
        audio.play();
    },
    clock() {
        const audio = new Audio("./sounds/clock.mp3");
        audio.play();
    }
};

function getLastAction(elem) {
    const lastAction = localStorage.getItem(`lastAction_${gameroom}`);
    if (lastAction) {
        $(elem).next().html(`<small>Последнее действие: ${lastAction}</small>`);
    }
}

function filterName(str) {
    return str.replace(/[^a-zA-Zа-яА-Я0-9]/g, "");
}
