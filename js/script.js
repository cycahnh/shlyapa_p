let gameroom = "";
let scores = 0;
let next_pushable = true;
let inGame = false;
let word = "";
let lastChanse = false;
let players = "";
let isHost = false;

const API_URL = 'http://localhost:3000/api';

// Game state management using server
async function getGameState() {
    try {
        const response = await fetch(`${API_URL}/game/${gameroom}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching game state:', error);
        return { wordList: [], activeGame: [], players: [], scores: 0 };
    }
}

async function setGameState(state) {
    try {
        await fetch(`${API_URL}/game/${gameroom}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(state)
        });
        // Update last action timestamp
        localStorage.setItem(`lastAction_${gameroom}`, new Date().toLocaleString());
    } catch (error) {
        console.error('Error setting game state:', error);
    }
}

async function getWordList() {
    const state = await getGameState();
    return state.wordList || [];
}

async function setWordList(words) {
    const state = await getGameState();
    state.wordList = words;
    await setGameState(state);
}

async function getActiveGame() {
    const state = await getGameState();
    return state.activeGame || [];
}

async function setActiveGame(words) {
    const state = await getGameState();
    state.activeGame = words;
    await setGameState(state);
}

async function getPlayersList() {
    const state = await getGameState();
    return state.players || [];
}

async function setPlayersList(players) {
    const state = await getGameState();
    state.players = players;
    await setGameState(state);
}

async function getScores() {
    const state = await getGameState();
    return state.scores || 0;
}

async function setScores(newScores) {
    const state = await getGameState();
    state.scores = newScores;
    await setGameState(state);
    $("header span").text("очки: " + newScores);
}

async function clearGameState() {
    const emptyState = { wordList: [], activeGame: [], players: [], scores: 0 };
    await setGameState(emptyState);
    localStorage.removeItem(`lastAction_${gameroom}`);
}

async function checkRoomExists(room) {
    try {
        const response = await fetch(`${API_URL}/room/${room}/exists`);
        const data = await response.json();
        return data.exists;
    } catch (error) {
        console.error('Error checking room:', error);
        return false;
    }
}

$(document).ready(() => {
    $("#menu,#next,#play,#menuopen").hide();
    registration(preparePage);
});

async function registration(after) {
    let res, rej;
    $("#selectname").keyup((e) => {
        e.target.value = filterName(e.target.value);
        getLastAction(e.target);
        if (e.keyCode == 13) $("#selectnamebutton").click();
    });
    $("#selectnamebutton").click(async () => {
        const room = filterName(document.getElementById("selectname").value);
        const exists = await checkRoomExists(room);
        if (exists) {
            gameroom = room;
            isHost = false;
            $("#setgamename").fadeOut(150, res);
        } else {
            gameroom = room;
            isHost = true;
            $("#setgamename").fadeOut(150, res);
        }
    });
    (function setRoom() {
        new Promise((resolve, reject) => {
            res = resolve;
            rej = reject;
        }).then(after, setRoom);
        $("#setgamename").show(20);
    })();
}

async function preparePage() {
    $("#current_room").html(`Комната: ${gameroom} ${isHost ? '(Хост)' : ''}`);
    $("#msg").html(
        `<small><small>Откройте меню, чтобы положить слова в шляпу и затем запустить кон. Нажмите "ход", чтобы взять слова из шляпы.</small></small>`
    );
    $("#msg small").fadeIn(20);
    $("#play").fadeIn(30);
    $("#menuopen").fadeIn(100);
    $(".guestmessage").fadeOut(20);
    scores = await getScores();
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

    // Only show host controls if this is the host
    if (!isHost) {
        $("#addwords, #newgame, #clear, #nullScores").hide();
    }
}

async function resetScores() {
    scores = 0;
    await setScores(scores);
    play.coin();
    $("#information").text("Очки обнулены");
}

async function request(task) {
    let result;
    switch (task) {
        case "play":
            const activeGame = await getActiveGame();
            result = activeGame.join("\n");
            break;
        case "next":
            const currentWord = $("#msg").text();
            let words = await getActiveGame();
            words = words.filter(word => word !== currentWord);
            await setActiveGame(words);
            scores++;
            await setScores(scores);
            result = words.join("\n");
            break;
        case "newgame":
            const wordList = await getWordList();
            if (wordList.length > 0) {
                await setActiveGame([...wordList]);
                result = "Игра начата";
            } else {
                result = "Ошибка, в игре нет слов";
            }
            break;
        case "clear":
            await clearGameState();
            result = "Данные успешно очищены";
            break;
        case "addwords":
            const newWords = $(".newword")
                .map(function() { return $(this).val(); })
                .get()
                .filter(word => word.trim() !== "");
            if (newWords.length > 0) {
                const currentWords = await getWordList();
                await setWordList([...currentWords, ...newWords]);
                $(".newword").val("");
                result = "Данные в файл успешно занесены";
            } else {
                result = "Пустой набор слов";
            }
            break;
        case "info":
            result = (await getWordList()).join("\n");
            break;
        case "getPlayers":
            result = (await getPlayersList()).join("\n");
            break;
        case "setPlayers":
            const playerList = $("#players").val().split("\n").filter(p => p.trim() !== "");
            await setPlayersList(playerList);
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
