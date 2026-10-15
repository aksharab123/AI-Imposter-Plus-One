/* =========================================================
   AI IMPOSTER PLUS ONE
   GAME ENGINE
========================================================= */


/* ================= GAME DATA ================= */

let players = [];
let aiEnabled = false;

let currentSecretIndex = 0;
let currentTurnIndex = 0;
let currentVoteIndex = 0;

let selectedVote = null;

let clues = [];
let votes = {};

let aiVote = null;

let inputMode = "text";


/* ================= MICROPHONE ================= */

let micEnabled = false;
let recognition = null;

let finalSpeechText = "";
let interimSpeechText = "";

let restartingMic = false;


/* =========================================================
   SCREEN CONTROL
========================================================= */

function showScreen(id) {

    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.remove("active");
    });

    const target = document.getElementById(id);

    if (target) {
        target.classList.add("active");
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


function goHome() {

    stopMicrophone();

    showScreen("homeScreen");
}


function showSetup() {

    stopMicrophone();

    showScreen("setupScreen");
}


function showHowToPlay() {

    showScreen("howScreen");
}


/* =========================================================
   PLAYER SETUP
========================================================= */

function addPlayer() {

    const container =
        document.getElementById("playersContainer");

    const currentPlayers =
        container.querySelectorAll(".player-row").length;

    if (currentPlayers >= 6) {

        alert("Maximum 6 human players allowed.");

        return;
    }

    const number = currentPlayers + 1;

    const row =
        document.createElement("div");

    row.className = "player-row";

    row.innerHTML = `

        <div class="player-number">
            ${String(number).padStart(2, "0")}
        </div>

        <input
            type="text"
            class="player-input"
            placeholder="Player ${number}"
            maxlength="18"
        >

        <div class="player-status">
            READY
        </div>
    `;

    container.appendChild(row);

    updateAddButton();
}


function updateAddButton() {

    const count =
        document.querySelectorAll(".player-row").length;

    const button =
        document.getElementById("addPlayerBtn");

    if (!button) {
        return;
    }

    if (count >= 6) {

        button.style.opacity = ".4";
        button.style.pointerEvents = "none";

    } else {

        button.style.opacity = "1";
        button.style.pointerEvents = "auto";
    }
}


/* =========================================================
   START GAME
========================================================= */

function startGameSetup() {

    const inputs =
        document.querySelectorAll(".player-input");

    players = [];

    inputs.forEach((input, index) => {

        let name =
            input.value.trim();

        if (!name) {
            name = `Player ${index + 1}`;
        }

        players.push({

            name: name,

            isAI: false,

            role: null,

            word: null
        });
    });


    const aiToggle =
        document.getElementById("aiToggle");

    aiEnabled =
        aiToggle ? aiToggle.checked : false;


    if (aiEnabled && players.length >= 6) {

        alert(
            "Maximum 6 total players are allowed. Remove one human player to add AI."
        );

        return;
    }


    if (players.length < 2) {

        alert(
            "At least 2 players are required."
        );

        return;
    }


    if (aiEnabled) {

        players.push({

            name: "AI Player",

            isAI: true,

            role: null,

            word: null
        });
    }


    assignWords();

    currentSecretIndex = 0;

    showSecretScreen();
}


/* =========================================================
   WORD ASSIGNMENT
========================================================= */

function assignWords() {

    const wordPairs = [

        {
            normal: "BALL",
            imposter: "COFFEE"
        },

        {
            normal: "BEACH",
            imposter: "MOUNTAIN"
        },

        {
            normal: "PIZZA",
            imposter: "BURGER"
        },

        {
            normal: "RAIN",
            imposter: "SNOW"
        },

        {
            normal: "BOOK",
            imposter: "MOVIE"
        },

        {
            normal: "BICYCLE",
            imposter: "CAR"
        },

        {
            normal: "TEA",
            imposter: "JUICE"
        },

        {
            normal: "DOG",
            imposter: "CAT"
        }
    ];


    const pair =
        wordPairs[
            Math.floor(
                Math.random() *
                wordPairs.length
            )
        ];


    const imposterIndex =
        Math.floor(
            Math.random() *
            players.length
        );


    players.forEach((player, index) => {

        if (index === imposterIndex) {

            player.role = "IMPOSTER";

            player.word = pair.imposter;

        } else {

            player.role = "NORMAL";

            player.word = pair.normal;
        }
    });
}


/* =========================================================
   SECRET WORD SCREEN
========================================================= */

function showSecretScreen() {

    showScreen("secretScreen");

    processSecretPlayer();
}


function processSecretPlayer() {

    const player =
        players[currentSecretIndex];


    if (!player) {
        return;
    }


    /* AI receives its word silently */

    if (player.isAI) {

        currentSecretIndex++;

        if (currentSecretIndex >= players.length) {

            startActualGame();

            return;
        }

        processSecretPlayer();

        return;
    }


    updateSecretScreen();
}


function updateSecretScreen() {

    const player =
        players[currentSecretIndex];


    if (!player) {
        return;
    }


    document.getElementById("secretPlayerName")
        .textContent =
        player.name.toUpperCase();


    document.getElementById("secretProgress")
        .textContent =
        `PLAYER ${String(currentSecretIndex + 1).padStart(2, "0")} / ${String(players.length).padStart(2, "0")}`;


    document.getElementById("wordArea")
        .classList.add("hidden");


    document.getElementById("ackBtn")
        .classList.add("hidden");


    document.getElementById("revealBtn")
        .classList.remove("hidden");


    document.getElementById("secretWord")
        .textContent =
        player.word;


    document.getElementById("roleText")
        .textContent =
        player.role === "IMPOSTER"
            ? "YOU ARE THE IMPOSTER"
            : "NORMAL PLAYER";
}


function revealWord() {

    document.getElementById("wordArea")
        .classList.remove("hidden");


    document.getElementById("revealBtn")
        .classList.add("hidden");


    document.getElementById("ackBtn")
        .classList.remove("hidden");
}


function nextSecretPlayer() {

    currentSecretIndex++;

    if (currentSecretIndex >= players.length) {

        startActualGame();

        return;
    }

    processSecretPlayer();
}


/* =========================================================
   START ACTUAL GAME
========================================================= */

function startActualGame() {

    currentTurnIndex = 0;

    clues = [];

    votes = {};

    aiVote = null;

    selectedVote = null;

    showScreen("gameScreen");

    renderGamePlayers();

    updateTurn();
}


/* =========================================================
   PLAYER LIST
========================================================= */

function renderGamePlayers() {

    const container =
        document.getElementById("gamePlayers");

    container.innerHTML = "";


    players.forEach((player, index) => {

        const div =
            document.createElement("div");

        div.className =
            "game-player";


        if (player.isAI) {
            div.classList.add("ai");
        }


        if (index === currentTurnIndex) {
            div.classList.add("active");
        }


        div.innerHTML = `

            <div class="player-dot"></div>

            <span>
                ${escapeHTML(player.name)}
                ${player.isAI ? " 🤖" : ""}
            </span>

        `;


        container.appendChild(div);
    });
}


/* =========================================================
   TURN SYSTEM
========================================================= */

function updateTurn() {

    /*
       Stop only the microphone.
       DO NOT change inputMode here.
    */

    stopMicrophone();


    const player =
        players[currentTurnIndex];


    if (!player) {
        return;
    }


    document.getElementById("currentPlayer")
        .textContent =
        player.name;


    renderGamePlayers();


    const textArea =
        document.getElementById("textInputArea");

    const voiceArea =
        document.getElementById("voiceInputArea");


    /* =====================================================
       AI TURN
    ===================================================== */

    if (player.isAI) {

        document.getElementById("turnIcon")
            .textContent =
            "🤖";


        document.getElementById("turnInstruction")
            .textContent =
            "AI is analyzing the clues and preparing a response...";


        textArea.classList.add("hidden");

        voiceArea.classList.add("hidden");


        /*
           AI gets its clue after a short delay.
           The actual AI function now moves directly
           to the next turn after adding the clue.
        */

        setTimeout(
            generateAIClue,
            1200
        );

        return;
    }


    /* =====================================================
       HUMAN TURN
    ===================================================== */

    document.getElementById("turnIcon")
        .textContent =
        inputMode === "voice"
            ? "🎙"
            : "⌨";


    document.getElementById("turnInstruction")
        .textContent =
        inputMode === "voice"
            ? "Use the microphone to speak your clue."
            : "Type a clue about your secret word.";


    if (inputMode === "voice") {

        /*
           IMPORTANT:
           Voice mode stays voice mode for every player.
        */

        textArea.classList.add("hidden");

        voiceArea.classList.remove("hidden");

        resetVoiceArea();

    } else {

        textArea.classList.remove("hidden");

        voiceArea.classList.add("hidden");

        document.getElementById("clueInput").value = "";

        updateCharacterCount();
    }
}


/* =========================================================
   INPUT MODE
========================================================= */

function setInputMode(mode) {

    /*
       This is the ONLY place where inputMode changes.
    */

    inputMode = mode;

    stopMicrophone();


    const textButton =
        document.getElementById("textModeBtn");

    const voiceButton =
        document.getElementById("voiceModeBtn");


    if (textButton) {

        textButton.classList.toggle(
            "active",
            mode === "text"
        );
    }


    if (voiceButton) {

        voiceButton.classList.toggle(
            "active",
            mode === "voice"
        );
    }


    updateTurn();
}


/* =========================================================
   TEXT CLUE
========================================================= */

function submitClue() {

    const input =
        document.getElementById("clueInput");

    const text =
        input.value.trim();


    if (!text) {

        input.focus();

        return;
    }


    addClue(
        players[currentTurnIndex],
        text
    );


    nextTurn();
}


/* =========================================================
   MICROPHONE / SPEECH RECOGNITION
========================================================= */

function createSpeechRecognition() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        return null;
    }


    const instance =
        new SpeechRecognition();


    instance.continuous = true;

    instance.interimResults = true;

    instance.lang = "en-IN";


    /* =====================================================
       RECOGNITION START
    ===================================================== */

    instance.onstart = function() {

        micEnabled = true;

        restartingMic = false;

        updateMicUI(true);
    };


    /* =====================================================
       RECOGNITION RESULT
    ===================================================== */

    instance.onresult = function(event) {

        let newFinalText = "";

        let newInterimText = "";


        for (
            let i = event.resultIndex;
            i < event.results.length;
            i++
        ) {

            const transcript =
                event.results[i][0].transcript.trim();


            if (event.results[i].isFinal) {

                newFinalText +=
                    transcript + " ";

            } else {

                newInterimText +=
                    transcript + " ";
            }
        }


        if (newFinalText) {

            finalSpeechText +=
                newFinalText;
        }


        /*
           Keep the latest interim text separately.

           THIS FIXES THE PROBLEM SEEN IN YOUR VIDEO.

           Chrome was showing:
           "it will get"

           but it had not marked it final yet.
        */

        interimSpeechText =
            newInterimText;


        const displayText =
            (
                finalSpeechText +
                interimSpeechText
            ).trim();


        const result =
            document.getElementById("speechResult");


        if (result) {

            result.textContent =
                displayText ||
                "Listening...";
        }
    };


    /* =====================================================
       RECOGNITION ERROR
    ===================================================== */

    instance.onerror = function(event) {

        console.log(
            "Speech recognition error:",
            event.error
        );


        if (
            event.error === "not-allowed" ||
            event.error === "service-not-allowed"
        ) {

            micEnabled = false;

            restartingMic = false;

            updateMicUI(false);

            alert(
                "Microphone permission was denied. Please allow microphone access in your browser settings."
            );

            return;
        }


        /*
           These errors should NOT destroy voice mode.
        */

        if (
            event.error === "no-speech" ||
            event.error === "audio-capture" ||
            event.error === "network"
        ) {

            return;
        }
    };


    /* =====================================================
       RECOGNITION END
    ===================================================== */

    instance.onend = function() {

        /*
           If the player has not submitted the clue,
           automatically restart recognition.

           Voice mode itself is NEVER changed.
        */

        if (
            micEnabled &&
            !restartingMic
        ) {

            restartingMic = true;


            setTimeout(function() {

                if (!micEnabled) {

                    restartingMic = false;

                    return;
                }


                try {

                    instance.start();

                } catch (error) {

                    console.log(
                        "Recognition restart:",
                        error
                    );
                }


                setTimeout(function() {

                    restartingMic = false;

                }, 300);

            }, 250);


        } else {

            updateMicUI(false);
        }
    };


    return instance;
}


function setupSpeechRecognition() {

    if (recognition) {
        return recognition;
    }


    recognition =
        createSpeechRecognition();


    return recognition;
}


/* =========================================================
   TOGGLE MICROPHONE
========================================================= */

function toggleMic() {

    const voiceArea =
        document.getElementById("voiceInputArea");


    if (
        voiceArea &&
        voiceArea.classList.contains("hidden")
    ) {

        return;
    }


    if (!recognition) {

        recognition =
            setupSpeechRecognition();
    }


    if (!recognition) {

        alert(
            "Voice recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge."
        );

        return;
    }


    if (micEnabled) {

        stopMicrophone();

        return;
    }


    finalSpeechText = "";

    interimSpeechText = "";


    const result =
        document.getElementById("speechResult");


    if (result) {

        result.textContent =
            "Listening...";
    }


    try {

        micEnabled = true;

        recognition.start();

    } catch (error) {

        console.log(
            "Microphone start:",
            error
        );
    }
}


/* =========================================================
   STOP MICROPHONE
========================================================= */

function stopMicrophone() {

    micEnabled = false;

    restartingMic = false;


    if (recognition) {

        try {

            recognition.stop();

        } catch (error) {

            console.log(
                "Microphone stop:",
                error
            );
        }
    }


    updateMicUI(false);
}


/* =========================================================
   MICROPHONE UI
========================================================= */

function updateMicUI(active) {

    const button =
        document.getElementById("micBtn");

    const status =
        document.getElementById("micStatus");


    if (!button || !status) {
        return;
    }


    if (active) {

        button.classList.add("active");

        status.classList.add("active");

        status.textContent =
            "MICROPHONE ON — LISTENING";

    } else {

        button.classList.remove("active");

        status.classList.remove("active");

        status.textContent =
            "MICROPHONE OFF";
    }
}


/* =========================================================
   RESET VOICE AREA
========================================================= */

function resetVoiceArea() {

    /*
       Clear only the previous player's speech.
       Do NOT change inputMode.
    */

    stopMicrophone();

    finalSpeechText = "";

    interimSpeechText = "";


    const result =
        document.getElementById("speechResult");


    if (result) {

        result.textContent =
            "Your spoken clue will appear here.";
    }
}


/* =========================================================
   SUBMIT VOICE CLUE
========================================================= */

function submitVoiceClue() {

    /*
       IMPORTANT FIX:

       Use BOTH final speech AND interim speech.

       In your video Chrome showed:
       "it will get"

       but finalSpeechText was still empty.

       So the old code thought the player
       had not spoken anything.
    */

    const text =
        (
            finalSpeechText +
            " " +
            interimSpeechText
        ).trim();


    if (!text) {

        alert(
            "Please speak a clue first, or switch to Text mode."
        );

        return;
    }


    /*
       Stop microphone after we have captured
       the clue.
    */

    stopMicrophone();


    addClue(
        players[currentTurnIndex],
        text
    );


    /*
       Move to the next player.

       inputMode remains "voice".
    */

    nextTurn();
}


/* =========================================================
   ADD CLUE
========================================================= */

function addClue(player, text) {

    clues.push({

        player:
            player.name,

        isAI:
            player.isAI,

        text:
            text
    });


    renderClues();
}


/* =========================================================
   RENDER CLUES
========================================================= */

function renderClues() {

    const container =
        document.getElementById("cluesList");

    container.innerHTML = "";


    clues.forEach(clue => {

        const div =
            document.createElement("div");

        div.className =
            "clue-item";


        if (clue.isAI) {
            div.classList.add("ai");
        }


        const initials =
            clue.player
                .split(" ")
                .map(word => word[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();


        div.innerHTML = `

            <div class="clue-avatar">
                ${clue.isAI ? "AI" : initials}
            </div>

            <div class="clue-content">

                <strong>
                    ${escapeHTML(clue.player)}
                </strong>

                <p>
                    ${escapeHTML(clue.text)}
                </p>

            </div>
        `;


        container.appendChild(div);
    });


    document.getElementById("clueCount")
        .textContent =
        `${clues.length} clue${clues.length === 1 ? "" : "s"}`;
}


/* =========================================================
   AI CLUE
========================================================= */

function generateAIClue() {

    const ai =
        players[currentTurnIndex];


    if (!ai || !ai.isAI) {
        return;
    }


    const clueDatabase = {

        BALL: [
            "It is something people can play with.",
            "You can see it in different games.",
            "It can move from one person to another."
        ],

        BEACH: [
            "People usually go there to relax.",
            "You can find it outdoors.",
            "It is associated with holidays."
        ],

        PIZZA: [
            "People usually share it with others.",
            "It can have different toppings.",
            "It is a popular food."
        ],

        RAIN: [
            "You may need protection from it.",
            "It can change your plans.",
            "You can experience it outside."
        ],

        BOOK: [
            "People use it to learn or enjoy stories.",
            "It can take you into another world.",
            "There are many different types."
        ],

        BICYCLE: [
            "You can use it to travel.",
            "It does not need fuel.",
            "People often use it outdoors."
        ],

        TEA: [
            "People often have it during a break.",
            "It can be served hot.",
            "Many people have their own preference."
        ],

        DOG: [
            "It is a common companion.",
            "Many people keep one at home.",
            "It can be very playful."
        ]
    };


    const fallbackClues = [

        "It is something people commonly know.",
        "People can have different opinions about it.",
        "You might come across it in everyday life."
    ];


    const pool =
        clueDatabase[ai.word] ||
        fallbackClues;


    const clue =
        pool[
            Math.floor(
                Math.random() * pool.length
            )
        ];


    /*
       Add AI clue first.
    */

    addClue(ai, clue);


    /*
       IMPORTANT FIX:

       Do NOT rely on a delayed nextTurn
       after the AI clue.

       Move immediately to the next stage.
    */

    nextTurn();
}


/* =========================================================
   NEXT TURN
========================================================= */

function nextTurn() {

    stopMicrophone();


    currentTurnIndex++;


    /*
       All players have given clues.
       Go directly to voting.
    */

    if (
        currentTurnIndex >=
        players.length
    ) {

        startVoting();

        return;
    }


    /*
       Keep the currently selected input mode.

       If the user chose VOICE at the top,
       the next human player will also get VOICE.
    */

    setTimeout(
        updateTurn,
        400
    );
}


/* =========================================================
   CHARACTER COUNTER
========================================================= */

function updateCharacterCount() {

    const input =
        document.getElementById("clueInput");

    const counter =
        document.getElementById("charCount");


    if (!input || !counter) {
        return;
    }


    counter.textContent =
        `${input.value.length} / 120`;
}


/* =========================================================
   INDIVIDUAL VOTING
========================================================= */

function startVoting() {

    stopMicrophone();

    currentVoteIndex = 0;

    selectedVote = null;

    votes = {};

    aiVote = null;


    showScreen("voteScreen");


    processVoteTurn();
}


function processVoteTurn() {

    const player =
        players[currentVoteIndex];


    if (!player) {

        showResult();

        return;
    }


    /*
       AI votes automatically.
    */

    if (player.isAI) {

        generateAIVote();

        currentVoteIndex++;


        setTimeout(
            processVoteTurn,
            900
        );

        return;
    }


    showHumanVoteScreen(player);
}


/* =========================================================
   SHOW HUMAN VOTE
========================================================= */

function showHumanVoteScreen(player) {

    selectedVote = null;


    const voteButton =
        document.getElementById("voteBtn");


    if (voteButton) {
        voteButton.disabled = true;
    }


    document.getElementById("voteProgress")
        .textContent =
        `PLAYER ${String(currentVoteIndex + 1).padStart(2, "0")}`;


    document.getElementById("voteInstruction")
        .textContent =
        `${player.name}, choose who you suspect.`;


    const container =
        document.getElementById("votePlayers");

    container.innerHTML = "";


    players.forEach((candidate, index) => {

        /*
           Cannot vote for yourself.
        */

        if (index === currentVoteIndex) {
            return;
        }


        const card =
            document.createElement("div");


        card.className =
            "vote-card";


        if (candidate.isAI) {

            card.classList.add(
                "ai-option-card"
            );
        }


        card.dataset.playerId =
            String(index);


        const initials =
            candidate.name
                .split(" ")
                .map(word => word[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();


        card.innerHTML = `

            <div class="vote-avatar">
                ${candidate.isAI ? "AI" : initials}
            </div>

            <h3>
                ${escapeHTML(candidate.name)}
            </h3>

        `;


        card.addEventListener(
            "click",
            function() {

                container
                    .querySelectorAll(".vote-card")
                    .forEach(otherCard => {

                        otherCard.classList.remove(
                            "selected"
                        );
                    });


                card.classList.add(
                    "selected"
                );


                selectedVote =
                    index;


                voteButton.disabled =
                    false;
            }
        );


        container.appendChild(card);
    });
}


/* =========================================================
   HUMAN VOTE
========================================================= */

function submitVote() {

    if (selectedVote === null) {

        alert(
            "Please select a player first."
        );

        return;
    }


    if (
        !players[selectedVote]
    ) {

        selectedVote = null;

        return;
    }


    votes[currentVoteIndex] =
        selectedVote;


    selectedVote = null;


    const voteButton =
        document.getElementById("voteBtn");


    if (voteButton) {
        voteButton.disabled = true;
    }


    const container =
        document.getElementById("votePlayers");


    if (container) {
        container.innerHTML = "";
    }


    currentVoteIndex++;


    if (
        currentVoteIndex >=
        players.length
    ) {

        showResult();

        return;
    }


    setTimeout(
        processVoteTurn,
        500
    );
}


/* =========================================================
   AI VOTE
========================================================= */

function generateAIVote() {

    const aiIndex =
        players.findIndex(
            player => player.isAI
        );


    if (aiIndex === -1) {

        aiVote = null;

        return;
    }


    const possibleTargets =
        players
            .map(
                (_, index) => index
            )
            .filter(
                index => index !== aiIndex
            );


    if (possibleTargets.length === 0) {

        aiVote = null;

        return;
    }


    const suspicionScores = {};


    possibleTargets.forEach(index => {

        suspicionScores[index] = 0;
    });


    clues.forEach(clue => {

        const text =
            clue.text.toLowerCase();


        possibleTargets.forEach(index => {

            const name =
                players[index]
                    .name
                    .toLowerCase();


            if (
                text.includes(name)
            ) {

                suspicionScores[index] += 2;
            }
        });
    });


    possibleTargets.forEach(index => {

        suspicionScores[index] +=
            Math.random();
    });


    let bestTarget =
        possibleTargets[0];


    let bestScore =
        suspicionScores[bestTarget] || 0;


    possibleTargets.forEach(index => {

        const score =
            suspicionScores[index] || 0;


        if (score > bestScore) {

            bestScore = score;

            bestTarget = index;
        }
    });


    aiVote =
        bestTarget;
}


/* =========================================================
   RESULT
========================================================= */

function showResult() {

    stopMicrophone();


    const imposterIndex =
        players.findIndex(
            player =>
                player.role === "IMPOSTER"
        );


    const imposter =
        players[imposterIndex];


    if (!imposter) {
        return;
    }


    document.getElementById("resultName")
        .textContent =
        imposter.name.toUpperCase();


    document.getElementById("resultWord")
        .textContent =
        imposter.word;


    renderVoteResults();


    const aiIndex =
        players.findIndex(
            player => player.isAI
        );


    if (
        aiIndex !== -1 &&
        aiVote !== null &&
        players[aiVote]
    ) {

        document.getElementById("aiSuspect")
            .textContent =
            players[aiVote].name;


        document.getElementById("aiResult")
            .textContent =
            aiVote === imposterIndex
                ? "✓ AI correctly identified the Imposter."
                : "AI was fooled this round.";

    } else {

        document.getElementById("aiSuspect")
            .textContent =
            "No AI";

        document.getElementById("aiResult")
            .textContent =
            "AI was not included in this game.";
    }


    showScreen("resultScreen");
}


/* =========================================================
   VOTE RESULTS
========================================================= */

function renderVoteResults() {

    const resultContainer =
        document.getElementById("voteResults");

    resultContainer.innerHTML = "";


    const counts = {};


    Object.values(votes)
        .forEach(targetIndex => {

            counts[targetIndex] =
                (counts[targetIndex] || 0) + 1;
        });


    if (
        aiVote !== null &&
        players[aiVote]
    ) {

        counts[aiVote] =
            (counts[aiVote] || 0) + 1;
    }


    const sorted =
        Object.entries(counts)
            .sort(
                (a, b) =>
                    Number(b[1]) -
                    Number(a[1])
            );


    sorted.forEach(
        ([index, count]) => {

            const row =
                document.createElement("div");

            row.className =
                "vote-result-row";


            row.innerHTML = `

                <span>
                    ${escapeHTML(
                        players[index].name
                    )}
                </span>

                <strong>
                    ${count}
                    vote${count === 1 ? "" : "s"}
                </strong>

            `;


            resultContainer.appendChild(row);
        }
    );


    if (sorted.length === 0) {

        resultContainer.innerHTML = `

            <div class="vote-result-row">

                <span>
                    No votes
                </span>

                <strong>
                    0
                </strong>

            </div>
        `;
    }
}


/* =========================================================
   RESTART
========================================================= */

function restartGame() {

    stopMicrophone();


    players = [];

    clues = [];

    votes = {};

    aiVote = null;

    currentSecretIndex = 0;

    currentTurnIndex = 0;

    currentVoteIndex = 0;

    selectedVote = null;

    inputMode = "text";

    finalSpeechText = "";

    interimSpeechText = "";


    document.getElementById("playersContainer")
        .innerHTML = `

        <div class="player-row">

            <div class="player-number">
                01
            </div>

            <input
                type="text"
                class="player-input"
                placeholder="Player 1"
                maxlength="18"
            >

            <div class="player-status">
                READY
            </div>

        </div>


        <div class="player-row">

            <div class="player-number">
                02
            </div>

            <input
                type="text"
                class="player-input"
                placeholder="Player 2"
                maxlength="18"
            >

            <div class="player-status">
                READY
            </div>

        </div>
    `;


    document.getElementById("aiToggle")
        .checked = false;


    document.getElementById("textModeBtn")
        .classList.add("active");


    document.getElementById("voiceModeBtn")
        .classList.remove("active");


    updateAddButton();


    showSetup();
}


/* =========================================================
   SECURITY
========================================================= */

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        recognition =
            setupSpeechRecognition();


        updateAddButton();


        const clueInput =
            document.getElementById("clueInput");


        if (clueInput) {

            clueInput.addEventListener(
                "input",
                updateCharacterCount
            );
        }
    }
);