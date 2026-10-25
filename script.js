/* Corrected turn flow: difficulty dropdown is never treated as a player. */
let gamePlayers=[],clues=[],votes=[],secretIndex=0,clueIndex=0,voteIndex=0,selectedVote=null,inputMode="text",recognition=null,aiIndex=-1,imposterIndex=-1,roundNumber=1;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let toastTimer;
function toast(s){$("toast").textContent=s;$("toast").classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").classList.remove("show"),2500)}
function showScreen(id){document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));$(id).classList.add("active");window.scrollTo(0,0)}
function showSetup(){showScreen("setupScreen")}function showHowToPlay(){showScreen("howScreen")}function goHome(){showScreen("homeScreen")}
function addPlayer(){const box=$("playersContainer"),n=box.querySelectorAll(".player-row").length;if(n>=6){toast("Maximum 6 human players.");return}const row=document.createElement("div");row.className="player-row";row.innerHTML='<span>'+String(n+1).padStart(2,"0")+'</span><input class="player-input" placeholder="Player '+(n+1)+'" maxlength="18"><small>READY</small>';box.appendChild(row);refreshSetup();row.querySelector("input").focus()}
function refreshSetup(){const rows=$("playersContainer").querySelectorAll(".player-row");$("addPlayerBtn").classList.toggle("hidden",rows.length>=6);rows.forEach((r,i)=>{r.querySelector("span").textContent=String(i+1).padStart(2,"0");r.querySelector("input").placeholder="Player "+(i+1)})}
function startGameSetup(){
  // Do NOT use querySelectorAll('.player-input') alone: difficulty selector used to be included.
  const names=[...$("playersContainer").querySelectorAll('input.player-input')].map((e,i)=>e.value.trim()||"Player "+(i+1));
  if(names.length<2||names.length>6)return toast("Choose 2–6 human players.");
  if(new Set(names.map(n=>n.toLowerCase())).size!==names.length)return toast("Player names must be different.");
  AI.difficulty=$("aiDifficulty").value;const withAI=$("aiToggle").checked;
  gamePlayers=names.map(name=>({name,word:"",isAI:false,clue:null,vote:null}));aiIndex=-1;
  if(withAI){aiIndex=gamePlayers.length;gamePlayers.push({name:"AI",word:"",isAI:true,clue:null,vote:null})}
  const pair=AI.WORD_PAIRS[Math.floor(Math.random()*AI.WORD_PAIRS.length)];imposterIndex=Math.floor(Math.random()*gamePlayers.length);
  gamePlayers.forEach((p,i)=>p.word=i===imposterIndex?pair.imposter:pair.normal);
  clues=[];votes=[];secretIndex=0;clueIndex=0;voteIndex=0;selectedVote=null;AI.lastReasoning=null;$("roundNumber").textContent=String(roundNumber).padStart(2,"0");renderSecret()
}
function renderSecret(){
  if(secretIndex>=gamePlayers.length){beginClues();return}
  const p=gamePlayers[secretIndex];
  $("secretPlayerName").textContent=p.isAI?"AI PLAYER":p.name;
  $("secretProgress").textContent=p.isAI?"AI IS GETTING READY":"PLAYER "+String(secretIndex+1).padStart(2,"0")+" / "+String(gamePlayers.length-(aiIndex>=0?1:0)).padStart(2,"0");
  $("wordArea").classList.add("hidden");
  $("revealBtn").classList.toggle("hidden",p.isAI);
  $("ackBtn").classList.toggle("hidden",!p.isAI);
  $("ackBtn").textContent=p.isAI?"AI CLUE IS COMING →":"I'VE SEEN IT →";
  $("secretPrivateNote").textContent=p.isAI?"The AI receives its word privately. No human player can see it.":"Make sure nobody else is looking.";
  $("secretFooterNote").textContent=p.isAI?"Next, the AI will generate its own clue.":"Your secret word is private. Pass the device when prompted.";
  const card=document.querySelector("#secretScreen .center");
  if(card)card.classList.toggle("ai-secret-state",p.isAI);
  showScreen("secretScreen");
}
function revealWord(){const p=gamePlayers[secretIndex];if(!p||p.isAI)return;$("secretWord").textContent=p.word;$("roleText").textContent=secretIndex===imposterIndex?"IMPOSTER":"NORMAL PLAYER";$("wordArea").classList.remove("hidden");$("revealBtn").classList.add("hidden");$("ackBtn").classList.remove("hidden")}
function nextSecretPlayer(){secretIndex++;renderSecret()}
function beginClues(){clueIndex=0;renderTurn();showScreen("gameScreen")}
function renderSidebar(){$("gamePlayers").innerHTML=gamePlayers.map((p,i)=>'<div class="score-row '+(i===clueIndex?'current':'')+'"><span>'+esc(p.name)+'</span><strong>'+(p.clue?'✓':i===clueIndex?'●':'')+'</strong></div>').join("")}
function renderTurn(){if(clueIndex>=gamePlayers.length){startVoting();return}const p=gamePlayers[clueIndex];$("currentPlayer").textContent=p.name;$("turnLabel").textContent=p.isAI?"AI TURN":"CURRENT TURN";$("turnInstruction").textContent=p.isAI?"AI is preparing its clue…":"Give a clue about your word without saying it directly."; $("clueInput").value="";$("charCount").textContent="0 / 120";$("speechResult").textContent="Your spoken clue will appear here.";$("textModeBtn").disabled=p.isAI;$("voiceModeBtn").disabled=p.isAI;$("textInputArea").classList.toggle("hidden",inputMode!=="text"||p.isAI);$("voiceInputArea").classList.toggle("hidden",inputMode!=="voice"||p.isAI);renderSidebar();if(p.isAI)runAIClue()}
async function runAIClue(){const p=gamePlayers[clueIndex];let text;try{text=await AI.makeClue(p,clues,AI.difficulty)}catch{text=AI.localClue(p,clues,AI.difficulty)}if(gamePlayers[clueIndex]!==p)return;addClue(p.name,text,true)}
function addClue(name,text,isAI=false){text=String(text||"").trim().slice(0,120);if(!text)return toast("Enter a clue first.");clues.push({player:name,text});gamePlayers.find(p=>p.name===name).clue=text;renderClues();if(isAI){$("turnInstruction").textContent="AI clue is ready. Read all clues before continuing.";let old=document.querySelector(".continue-voting");if(old)old.remove();const b=document.createElement("button");b.className="primary full continue-voting";b.textContent="EVERYONE HAS READ THE CLUES →";b.onclick=()=>{b.remove();startVoting()};$("cluesList").appendChild(b);toast("AI clue added. Read the board, then continue to voting.");return}clueIndex++;renderTurn()}
function renderClues(){$("clueCount").textContent=clues.length+" clue"+(clues.length===1?"":"s");$("cluesList").innerHTML=clues.map((c,i)=>'<div class="clue-item"><b>'+esc(c.player)+'</b><span>'+esc(c.text)+'</span></div>').join("")}
function submitClue(){const p=gamePlayers[clueIndex];if(!p||p.isAI)return;const t=$("clueInput").value.trim();if(!t)return toast("Type a clue first.");addClue(p.name,t)}
$("clueInput").addEventListener("input",()=>{$("charCount").textContent=$("clueInput").value.length+" / 120"});
function setInputMode(mode){inputMode=mode;$("textModeBtn").classList.toggle("active",mode==="text");$("voiceModeBtn").classList.toggle("active",mode==="voice");if($("gameScreen").classList.contains("active"))renderTurn()}
function toggleMic(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return toast("Voice recognition unavailable. Use TEXT mode.");if(recognition){recognition.stop();recognition=null;return}recognition=new SR();recognition.lang="en-IN";recognition.interimResults=true;$("micStatus").textContent="LISTENING…";recognition.onresult=e=>{let s="";for(let i=e.resultIndex;i<e.results.length;i++)s+=e.results[i][0].transcript;$("speechResult").textContent=s;$("speechResult").dataset.clue=s};recognition.onerror=()=>toast("Microphone error. Check browser permissions.");recognition.onend=()=>{$("micStatus").textContent="MICROPHONE OFF";recognition=null};recognition.start()}
function submitVoiceClue(){const t=($("speechResult").dataset.clue||"").trim();if(!t)return toast("Record a clue first.");addClue(gamePlayers[clueIndex].name,t)}
function startVoting(){const b=document.querySelector(".continue-voting");if(b)b.remove();if(recognition){try{recognition.stop()}catch{}recognition=null}voteIndex=0;votes=[];renderVote();showScreen("voteScreen")}
function renderVote(){const humans=gamePlayers.filter(p=>!p.isAI);if(voteIndex>=humans.length)return finishRound();const voter=humans[voteIndex];selectedVote=null;$("voteBtn").disabled=true;$("voteProgress").textContent="PLAYER "+(voteIndex+1)+" / "+humans.length;$("voteInstruction").textContent=voter.name+", secretly choose who you suspect.";$("votePlayers").innerHTML=gamePlayers.map((p,i)=>i===gamePlayers.findIndex(x=>x.name===voter.name)?"":'<button class="vote-card" data-target="'+i+'" onclick="selectVote('+i+')"><strong>'+esc(p.name)+'</strong><small>'+(p.isAI?"AI player":"Player")+'</small></button>').join("")}
function selectVote(i){selectedVote=i;document.querySelectorAll(".vote-card").forEach(b=>b.classList.toggle("selected",Number(b.dataset.target)===i));$("voteBtn").disabled=false}
function submitVote(){if(selectedVote===null)return toast("Choose a player first.");const voter=gamePlayers.filter(p=>!p.isAI)[voteIndex];votes.push({voter:voter.name,target:selectedVote});voteIndex++;if(voteIndex<gamePlayers.filter(p=>!p.isAI).length){renderVote();toast("Vote saved. Pass the device to the next player.")}else finishRound()}
async function finishRound(){showScreen("resultScreen");$("resultName").textContent=gamePlayers[imposterIndex].name;$("resultWord").textContent=gamePlayers[imposterIndex].word;const count={};votes.forEach(v=>count[v.target]=(count[v.target]||0)+1);$("voteResults").innerHTML=gamePlayers.map((p,i)=>'<div class="score-row"><span>'+esc(p.name)+'</span><strong>'+(count[i]||0)+' vote(s)</strong></div>').join("");if(aiIndex<0){$("aiSuspect").textContent="AI disabled";$("aiResult").textContent="Enable AI in setup to see an AI verdict.";$("aiReasoning").innerHTML="";return}let result;try{result=await AI.vote(gamePlayers,clues,aiIndex,AI.difficulty)}catch{}if(!result||result.target===null){$("aiSuspect").textContent="Unavailable";$("aiResult").textContent="AI vote unavailable.";return}AI.lastReasoning=result;$("aiSuspect").textContent=gamePlayers[result.target].name;$("aiResult").textContent=result.target===imposterIndex?"AI was correct!":"AI's suspicion was incorrect.";AI.renderReasoning()}
function restartGame(){roundNumber++;showSetup()}
document.addEventListener("DOMContentLoaded",()=>{
  refreshSetup();$("aiDifficulty").style.opacity=".75";
  $("aiToggle").addEventListener("change",()=>{$("aiDifficulty").style.opacity=$("aiToggle").checked?"1":".75"});
  const cursor=$("cursorAura");
  if(cursor && window.matchMedia("(pointer:fine)").matches){
    document.addEventListener("pointermove",e=>{cursor.style.setProperty("--mx",e.clientX+"px");cursor.style.setProperty("--my",e.clientY+"px");cursor.classList.add("visible")});
    document.addEventListener("pointerdown",()=>{cursor.classList.add("pulse");setTimeout(()=>cursor.classList.remove("pulse"),260)});
  } else if(cursor){cursor.remove()}
});