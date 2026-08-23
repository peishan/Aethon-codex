// Shortens/replaces the long build-changelog banner in the page footer,
// regardless of what text is baked into the currently deployed index.html.
(function shortenCodexBuildBanner() {
  function apply() {
    document.querySelectorAll('.codex-build-fixed').forEach(el => {
      el.textContent = 'Aethon Codex · v12.91';
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();

// Removes the leftover "Test Senedra — Final Ability" dev/debug button that
// was left sitting on the landing page footer. Done from game.js (rather
// than editing index.html) so the fix works regardless of which index.html
// build is actually deployed.
(function removeSenedraTestButton() {
  function apply() {
    const btn = document.getElementById('senedra-ability-test-v170');
    if (btn) btn.remove();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();

window.codexStartRoadEncounter = function(encounterId) {
  try {
    if (typeof window.startGrindingBattle === 'function') {
      return window.startGrindingBattle('unmappedRoad', encounterId);
    }
    if (typeof startGrindingBattleImpl === 'function') {
      return startGrindingBattleImpl('unmappedRoad', encounterId);
    }
    if (typeof showNotification === 'function') showNotification('Could not start this encounter.');
    return false;
  } catch (err) {
    console.error('Road encounter error:', err);
    if (typeof showNotification === 'function') showNotification('Could not start this encounter.');
    return false;
  }
};

function getAisyahHagglingDiscountPercent() {
  return 10;
}
function isAisyahActiveForHaggling() {
  try {
    const party = (typeof getActiveParty === 'function') ? getActiveParty() : [];
    return party.some(p => /aisyah/i.test(String(p?.id || p?.name || '')));
  } catch (e) {
    return false;
  }
}
function getTraderPriceWithHaggling(basePrice) {
  const base = Math.max(1, Math.floor(Number(basePrice) || 0));
  if (!isAisyahActiveForHaggling()) return base;
  const pct = getAisyahHagglingDiscountPercent();
  return Math.max(1, Math.floor(base * (1 - pct / 100)));
}

/* ENTER_CODEX_SAVE_FIX_V150 */
function enterCodexV150() {
  try {
    const raw = localStorage.getItem('aethonCodexSave');
    if (!raw) {
      gameState = createInitialGameState();
      beginGame();
      if (typeof showNotification === 'function') showNotification('New journey started');
      return true;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      alert('A saved journey exists, but its JSON could not be read. Your save was not changed.');
      console.error('Save JSON parse failed:', e);
      return false;
    }

    if (!data || !data.gameState || typeof data.gameState !== 'object') {
      alert('A saved journey exists, but it uses an unsupported save format. Your save was not changed.');
      console.error('Save structure invalid:', data);
      return false;
    }

    try {
      if (typeof applySaveData !== 'function' || !applySaveData(data)) {
        throw new Error('applySaveData returned false');
      }
    } catch (e) {
      alert('Your saved journey could not be loaded. Your save was not changed.');
      console.error('Save application failed:', e);
      return false;
    }

    beginGame();
    if (typeof showNotification === 'function') showNotification('Saved journey loaded');
    return true;
  } catch (e) {
    console.error('Enter Codex failed:', e);
    alert('Your saved journey could not be loaded. Your save was not changed.');
    return false;
  }
}

/* SAVE_SYSTEM_V148 */
const RECOVERY_SAVE_KEY_V148 = 'aethonCodexSaveRecoveryV148';
const SAVE_SLOT_KEY_V148 = 'aethonCodexSaveSlotV148';

function readSaveRecordV148(key) {
  try {
    const raw=localStorage.getItem(key);
    if(!raw) return null;
    const data=JSON.parse(raw);
    return (data && data.gameState && typeof data.gameState==='object') ? data : null;
  } catch(e) { return null; }
}
function writeSaveRecordV148(key,data) {
  const raw=JSON.stringify(data);
  localStorage.setItem(key,raw);
  return localStorage.getItem(key)===raw;
}
function currentSaveRecordV148() { return readSaveRecordV148(SAVE_KEY); }
function saveGameV148() {
  try {
    const old=currentSaveRecordV148();
    if(old) writeSaveRecordV148(RECOVERY_SAVE_KEY_V148,old);
    const payload=getSavePayload();
    if(!writeSaveRecordV148(SAVE_KEY,payload)) throw new Error('Primary save verification failed');
    // Keep a second independent browser slot as a rolling recovery copy.
    writeSaveRecordV148(SAVE_SLOT_KEY_V148,payload);
    return true;
  } catch(e) {
    console.warn('Save failed:',e);
    return false;
  }
}
function applyRecordV148(data) {
  if(!data || !data.gameState) return false;
  return !!applySaveData(data);
}
function loadLocalSaveV148() {
  const data=currentSaveRecordV148();
  if(!data) {
    alert('No saved journey is available in this browser.');
    return false;
  }
  if(!applyRecordV148(data)) {
    alert('The saved journey could not be loaded. Your save was not changed.');
    return false;
  }
  beginGame();
  showNotification('Saved journey loaded');
  return true;
}
function loadRecoverySaveV148() {
  const data=readSaveRecordV148(RECOVERY_SAVE_KEY_V148) || readSaveRecordV148(SAVE_SLOT_KEY_V148);
  if(!data) { alert('No recovery save is available.'); return false; }
  if(!applyRecordV148(data)) { alert('The recovery save could not be loaded.'); return false; }
  // Restore it to primary only after successful validation/application.
  writeSaveRecordV148(SAVE_KEY,data);
  beginGame();
  showNotification('Recovery save loaded');
  return true;
}
function continueSavedGameV148() { return loadLocalSaveV148(); }
function startNewGameV148() {
  const existing=currentSaveRecordV148();
  if(existing) {
    const ok=confirm('Start a new game? Your current saved journey will be kept as a recovery save.');
    if(!ok) return false;
    writeSaveRecordV148(RECOVERY_SAVE_KEY_V148,existing);
  }
  // Never delete the existing primary save here. The old save remains recoverable
  // until a new game is explicitly saved.
  gameState = createInitialGameState();
  beginGame();
  showNotification('New game started — your previous save is kept as recovery');
  return true;
}
function saveAndVerifyV148() {
  if(!saveGameV148()) { alert('Save failed. Your previous save was not intentionally removed.'); return false; }
  const s=gameState||{};
  alert('Save verified — Level '+(s.level??1)+' · '+(Array.isArray(s.activeQuests)?s.activeQuests.length:0)+' active quests');
  return true;
}
function exportSaveV148() {
  const payload=getSavePayload();
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download='aethon-codex-save-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  showNotification('Backup downloaded');
}
function importSaveV148(event) {
  const file=event.target.files&&event.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    try {
      const data=JSON.parse(reader.result);
      if(!data || !data.gameState) throw new Error('Not an Aethon Codex save');
      const old=currentSaveRecordV148(); if(old) writeSaveRecordV148(RECOVERY_SAVE_KEY_V148,old);
      if(!applyRecordV148(data)) throw new Error('Save data could not be applied');
      if(!writeSaveRecordV148(SAVE_KEY,data)) throw new Error('Save verification failed');
      writeSaveRecordV148(SAVE_SLOT_KEY_V148,data);
      beginGame(); showNotification('Backup imported successfully');
    } catch(e) { alert('That backup could not be imported. Your existing save was not changed.'); console.warn(e); }
    event.target.value='';
  };
  reader.readAsText(file);
}
function saveStatusV148() {
  const d=currentSaveRecordV148();
  if(!d) return {exists:false,valid:false};
  const s=d.gameState;
  return {exists:true,valid:true,version:d.version??null,level:s.level??null,book:s.currentBook??null,
    activeQuests:Array.isArray(s.activeQuests)?s.activeQuests.length:0,
    completedQuests:Array.isArray(s.completedQuests)?s.completedQuests.length:0};
}
/* SAVE_RECOVERY_V147 */
const RECOVERY_SAVE_KEY_V147 = 'aethonCodexSaveRecovery';

function isValidCodexSaveV147(data) {
  return !!(data && data.gameState && typeof data.gameState === 'object');
}

function backupCurrentSaveV147() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!isValidCodexSaveV147(parsed)) return false;
    localStorage.setItem(RECOVERY_SAVE_KEY_V147, raw);
    return true;
  } catch (e) {
    console.warn('Could not create recovery save:', e);
    return false;
  }
}

function saveGameV147() {
  try {
    backupCurrentSaveV147();
    const payload = JSON.stringify(getSavePayload());
    localStorage.setItem(SAVE_KEY, payload);
    const check = localStorage.getItem(SAVE_KEY);
    if (check !== payload) throw new Error('Save verification failed');
    return true;
  } catch (e) {
    console.warn('Save failed:', e);
    return false;
  }
}

function loadLocalSaveV147() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      alert('No saved journey was found in this browser.');
      return false;
    }
    const data = JSON.parse(raw);
    if (!isValidCodexSaveV147(data)) throw new Error('Invalid save structure');
    if (!applySaveData(data)) throw new Error('Save could not be applied');
    beginGame();
    showNotification('Saved journey loaded');
    return true;
  } catch (e) {
    alert('The local save could not be read. Your recovery save was not changed.');
    return false;
  }
}

function loadRecoverySaveV147() {
  try {
    const raw = localStorage.getItem(RECOVERY_SAVE_KEY_V147);
    if (!raw) {
      alert('No recovery save is available on this browser.');
      return false;
    }
    const data = JSON.parse(raw);
    if (!isValidCodexSaveV147(data) || !applySaveData(data)) throw new Error('Invalid recovery save');
    // Do not overwrite the recovery copy while restoring it.
    localStorage.setItem(SAVE_KEY, raw);
    beginGame();
    showNotification('Recovery save loaded');
    return true;
  } catch (e) {
    alert('The recovery save could not be read.');
    return false;
  }
}

function startNewGameV147() {
  if (hasSavedGame()) {
    const ok=confirm('Start a new game? Your current save will be kept as a recovery save.');
    if (!ok) return;
    backupCurrentSaveV147();
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  }
  beginGame();
}

function saveAndVerifyV147() {
  if (saveGameV147()) {
    const s=codexSaveStatusV146 ? codexSaveStatusV146() : {};
    const bits=[];
    if (s.level!=null) bits.push('Level '+s.level);
    if (s.quests!=null) bits.push(s.quests+' quests');
    alert('Save verified' + (bits.length ? ' — '+bits.join(' · ') : '') + '.');
  } else {
    alert('Save could not be verified. Your previous save was not intentionally removed.');
  }
}

/* SAVE_UI_V146 */
function codexSaveStatusV146() {
  try {
    const raw = localStorage.getItem('aethonCodexSave');
    if (!raw) return { exists:false, valid:false };
    const data = JSON.parse(raw);
    return {
      exists:true,
      valid:true,
      level:data.level ?? data.playerLevel ?? null,
      quests:Array.isArray(data.quests) ? data.quests.length :
             (Array.isArray(data.questLog) ? data.questLog.length : null),
      chapters:Array.isArray(data.chapters) ? data.chapters.length :
                (Array.isArray(data.completedChapters) ? data.completedChapters.length : null)
    };
  } catch (e) {
    return { exists:true, valid:false };
  }
}

function loadLocalSaveV146() {
  const status = codexSaveStatusV146();
  if (!status.exists) {
    alert('No local save was found on this browser.');
    return false;
  }
  if (!status.valid) {
    alert('The local save exists but could not be read. Use Import Backup with a verified JSON save.');
    return false;
  }
  try {
    if (typeof loadGameFromStorage === 'function') {
      loadGameFromStorage();
    } else if (typeof loadGame === 'function') {
      loadGame();
    } else {
      throw new Error('No local load function available.');
    }
    return true;
  } catch (e) {
    alert('Could not load the local save. Your existing save was not overwritten.');
    return false;
  }
}

function saveLocalAndVerifyV146() {
  try {
    if (typeof saveGame === 'function') saveGame();
    const status = codexSaveStatusV146();
    if (status.valid) {
      const parts = [];
      if (status.level != null) parts.push('Level ' + status.level);
      if (status.quests != null) parts.push(status.quests + ' quests');
      alert('Save verified' + (parts.length ? ' — ' + parts.join(' · ') : '') + '.');
      return true;
    }
    alert('Save was not verified. No backup was removed.');
    return false;
  } catch (e) {
    alert('Save failed. Your previous save was not intentionally removed.');
    return false;
  }
}

/* SAVE_INTEGRITY_CHECK_V1 */
function runSaveIntegrityCheckV1() {
  const raw = localStorage.getItem('aethonCodexSave');
  if (!raw) return { exists:false, valid:false, reason:'No save found' };
  try {
    const data = JSON.parse(raw);
    const checks = {
      chapters: Array.isArray(data.chapters) || Array.isArray(data.completedChapters),
      quests: Array.isArray(data.quests) || Array.isArray(data.questLog) || !!data.quests,
      party: Array.isArray(data.party),
      level: data.level !== undefined || data.playerLevel !== undefined,
      gold: data.gold !== undefined,
      inventory: Array.isArray(data.inventory) || !!data.inventory
    };
    return {
      exists:true,
      valid:Object.values(checks).filter(Boolean).length >= 3,
      checks
    };
  } catch (e) {
    return { exists:true, valid:false, reason:'Save JSON could not be parsed' };
  }
}

/* MEZSTORM_SPELLBOOK_V1 */
const MEZSTORM_SPELLBOOK_V1 = {
  1: [{id:'lightning_bolt',name:'Lightning Bolt',emoji:'⚡',mp:5,power:1.10,type:'single',description:'Reliable single-target storm magic.'}],
  3: [{id:'thunder_strike',name:'Thunder Strike',emoji:'🌩️',mp:10,power:1.40,type:'single',description:'A heavier bolt backed by thunder.'}],
  5: [{id:'chain_lightning',name:'Chain Lightning',emoji:'⛓️',mp:18,power:1.25,type:'multi',description:'Lightning that can arc between enemies.'}],
  7: [{id:'storm_surge',name:'Storm Surge',emoji:'🌪️',mp:22,power:1.60,type:'multi',description:'A violent burst of storm energy.'}],
  10:[{id:'tempest',name:'Tempest',emoji:'🌩️',mp:35,power:2.20,type:'multi',description:'Mezstorm calls down a devastating storm.'}]
};
function getMezstormKnownSpells(level){
  const known=[];
  Object.keys(MEZSTORM_SPELLBOOK_V1).map(Number).sort((a,b)=>a-b).forEach(l=>{
    if(level>=l) known.push(...MEZSTORM_SPELLBOOK_V1[l]);
  });
  return known;
}
function mezstormSpellById(id){
  return Object.values(MEZSTORM_SPELLBOOK_V1).flat().find(s=>s.id===id)||null;
}
function initializeMezstormSpellbookV1(){
  const mez=(gameState.party||[]).find(p=>p.id==='mezstorm');
  if(!mez) return;
  const known=getMezstormKnownSpells(Number(gameState.level||1));
  mez.spellbook=known.map(s=>s.id);
  if(!Array.isArray(mez.preparedSpells)||!mez.preparedSpells.length){
    mez.preparedSpells=known.slice(0,4).map(s=>s.id);
  } else {
    mez.preparedSpells=mez.preparedSpells.filter(id=>known.some(s=>s.id===id));
    known.forEach(s=>{if(mez.preparedSpells.length<4&&!mez.preparedSpells.includes(s.id)) mez.preparedSpells.push(s.id);});
  }
}
function getMezstormPreparedSpellDataV1(){
  const mez=(gameState.party||[]).find(p=>p.id==='mezstorm');
  if(!mez) return [];
  initializeMezstormSpellbookV1();
  return (mez.preparedSpells||[]).map(mezstormSpellById).filter(Boolean);
}
const STORM_STAFF_V1={id:'storm_staff',name:'Storm Staff',emoji:'⚡',description:'A staff charged with contained lightning.',magicPower:3,mp:5,lightningBonus:0.10};

/* SAN_SPELLBOOK_V1 */
const SAN_SPELLBOOK_V1 = {
  1: [
    { id:'arcane_bolt', name:'Arcane Bolt', emoji:'✨', mp:5, power:1.00,
      type:'single', description:'Reliable single-target arcane damage.' }
  ],
  3: [
    { id:'ember_burst', name:'Ember Burst', emoji:'🔥', mp:10, power:1.35,
      type:'single', description:'Stronger single-target magical damage.' }
  ],
  5: [
    { id:'echo_pulse', name:'Echo Pulse', emoji:'🌌', mp:15, power:1.45,
      type:'single', description:'A Codex-touched pulse of Aethon magic.' }
  ],
  7: [
    { id:'arcane_ward', name:'Arcane Ward', emoji:'🛡️', mp:15, power:0,
      type:'defensive', description:'Protective arcane magic.' }
  ],
  9: [
    { id:'astral_surge', name:'Astral Surge', emoji:'💥', mp:25, power:1.90,
      type:'single', description:'Powerful focused arcane damage.' }
  ],
  10: [
    { id:'daybreak', name:'Daybreak', emoji:'🌟', mp:35, power:2.25,
      type:'single', description:'San’s first major milestone spell.' }
  ],
  12: [
    { id:'astral_lance', name:'Astral Lance', emoji:'☄️', mp:40, power:2.55,
      type:'single', description:'A concentrated lance of astral force.' }
  ],
  15: [
    { id:'veil_breaker', name:'Veil Breaker', emoji:'🌀', mp:45, power:2.80,
      type:'single', description:'Strikes through layered magical defenses.' }
  ],
  18: [
    { id:'starfall', name:'Starfall', emoji:'🌠', mp:55, power:3.10,
      type:'single', description:'Calls down a devastating fragment of the stars.' }
  ],
  20: [
    { id:'aethon_apex', name:'Aethon Apex', emoji:'👑', mp:70, power:3.60,
      type:'single', description:'A high-level expression of San’s arcane mastery.' }
  ]
};

function getSanKnownSpells(level) {
  const known = [];
  Object.keys(SAN_SPELLBOOK_V1)
    .map(Number)
    .sort((a,b) => a-b)
    .forEach(unlockLevel => {
      if (level >= unlockLevel) known.push(...SAN_SPELLBOOK_V1[unlockLevel]);
    });
  return known;
}

function getSanSpellUnlocks(level) {
  return SAN_SPELLBOOK_V1[level] || [];
}


// ---------------------------------------------------------------------------
// AETHON CODEX ART ASSETS
// Keep these paths centralized so compressed WebP/PNG artwork can be swapped
// without touching the story or battle code.
// ---------------------------------------------------------------------------
const ART_ASSETS = {
  party: {
    san: 'assets/party/san.webp',
    joel: 'assets/party/joel.webp',
    aisyah: 'assets/party/aisyah.webp',
    mezstorm: 'assets/party/mezstorm.webp',
    eliz: 'assets/party/eliz.webp',
    senedra: 'assets/party/senedra.webp',
    zaki: 'assets/party/zaki.webp',
    soel: 'assets/party/soel.webp',
    mimi: 'assets/party/mimi.webp',
    wren: 'assets/party/wren.webp',
    aldric: 'assets/party/aldric.webp'
  },
  bosses: {
    // Boss art files were uploaded under an older, now-abandoned chapter
    // numbering scheme (e.g. "ch10-abyssal-leviathan.webp"), which no longer
    // matches the current chapterId values below. Re-mapped by boss NAME
    // (the one stable identifier) to the chapterId each boss actually uses
    // today. Files with no name-match to a current boss (ch14-ch20, ch22-
    // ch30, ch32, ch36-38, ch86 etc.) are leftover art from that earlier
    // draft and aren't wired to anything real yet.
    31: 'assets/boss/ch31-astral-devourer.webp',   // Astral Devourer
    33: 'assets/boss/ch62-veilshaper.webp',        // The Veilshaper
    34: 'assets/boss/ch13-frost-queen.webp',       // Eternal Frost Queen
    35: 'assets/boss/ch10-abyssal-leviathan.webp', // Abyssal Leviathan
    38: 'assets/boss/ch12-nexus-planarch.webp',    // Nexus Planarch
    39: 'assets/boss/ch39-temporal-fracture.webp', // Temporal Fracture
    40: 'assets/boss/ch40-the-last-guard.webp',    // The Last Guard
    41: 'assets/boss/ch41-scavenger-king.webp',    // Scavenger King
    42: 'assets/boss/ch42-debt-wraith.webp',       // Debt Wraith
    50: 'assets/boss/ch21-echo-of-aisyah.webp'     // Echo of Aisyah
    // Still missing art (using icon fallback): Infernal Tyrant(32),
    // Elder Dragon of Regret(36), Astral Lord(37), The Foreman(43),
    // Widow's Watch(44), Vanished Guide(45), The Room(46), Rustbound(47),
    // Unbroken Storm(48), Fading Familiar(49), The Tired Version(51),
    // The Splinter Court(54), The Unmended(56), The Relapse(57),
    // The Wayfinder(66), The Tidereaver(67), The Ledgerbound(68),
    // The Undertow(69), The Horizon Keeper(70).
  }
};

function getPartyArt(member) {
  return member && ART_ASSETS.party[member.id] ? ART_ASSETS.party[member.id] : '';
}

function getBossArt(chapterId) {
  return ART_ASSETS.bosses[Number(chapterId)] || '';
}

function safeImage(src, alt, className, fallback) {
  if (!src) return fallback;
  const escapedSrc = String(src).replace(/'/g, '&#39;');
  const escapedAlt = String(alt || '').replace(/'/g, '&#39;');
  return '<img class="' + className + '" src="' + escapedSrc + '" alt="' + escapedAlt +
    '" loading="lazy" decoding="async" fetchpriority="low" ' +
    'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
    '<span class="' + className + '-fallback" style="display:none">' + fallback + '</span>';
}

const GAME_DATA = {
  chapters: [
// ===== BOOK 1: LEGENDS OF DAYBREAK =====
    {
      id: 1, book: 1,
      title: "The Summoning",
      quote: "Some journeys are not chosen. They choose you.",
      image: "book1/ch1.png",
      narrative: `It started on an ordinary Tuesday. 10:47 PM, Brunei.\n\nJust one more report and I could go home... But the world forgot to ask if I was ready.\n\nWhen I opened my eyes again... where am I?\n\nA new world. A new system. And a hundred questions with no answers.\n\nAnd then... someone who was not a stranger. Soel. A cat that talks.\n\nFor the first time since I woke up, I didn't feel completely alone.\n\nWhatever happens from now on... Let's figure this out together.`,
      codexNote: "Subject displays disorientation upon arrival. Emotional response: Comfort. System stability: Improving.",
      systemHints: ["You are not the first.", "This world observes.", "It remembers what you forget.", "Companions are not random."],
      quest: {
        title: "Awaken in Aethon",
        desc: "You have been summoned to a world called Aethon. A mysterious system has activated, and a talking cat named Soel has appeared. Survive, understand what this world is, and find out why you were brought here.",
        outcome: "The Codex activates. You accept your new reality. Soel becomes your first companion. The story officially begins.",
        xp: 100, gold: 50,
        rewards: [{ name: "Codex Fragment", icon: "📜", desc: "A piece of the ancient system" }, { name: "Soel's Trust", icon: "🐱", desc: "Companion bond initiated" }]
      }
    },
{
      id: 2, book: 1,
      title: "The Arrival",
      quote: "Every arrival comes with a witness.",
      image: "book1/ch2.png",
      narrative: `The world did not greet me. But someone did.\n\nA small pair of eyes, watching me as if he had been expecting me long before I fell.\n\nNot human. Not voice. Just presence.\n\nHe stepped closer. Not afraid. Not demanding. Only calm.\n\nSo I breathed. And for the first time since I disappeared, I did not feel completely alone.\n\nWherever I am... I guess you're here too.\n\nA step forward. Not toward the past. But toward something that might explain why I was brought here.`,
      codexNote: "Companion detected upon arrival. Subject shows immediate acknowledgement of familiar entity. Emotional response: Comfort. Stability increased.",
      systemHints: ["You are not the first.", "This world observes.", "It remembers what you forget.", "Companions are not random."],
      quest: {
        title: "Acknowledge the Companion",
        desc: "Soel has chosen to stay by your side. The system recognizes this bond. Acknowledge Soel as your companion and accept the path forward together.",
        outcome: "Companion: SOEL confirmed. Species: Feline (Dilute Tuxedo). Role: Listener / Guide. Bond Level: Initiating. Sync Rate: 12%. You do not walk this path alone.",
        xp: 120, gold: 30,
        rewards: [{ name: "Companion Bond", icon: "💫", desc: "Soel officially joins your journey" }, { name: "Sync Crystal", icon: "💎", desc: "Resonates with companion energy" }]
      }
    },
{
      id: 3, book: 1,
      title: "The Unknown World",
      quote: "I do not know this world. But this world does not feel empty.",
      image: "book1/ch3.png",
      narrative: `The air was different. Not heavy, not light. Just... watching.\n\nThe mountains did not crowd me. They invited me.\n\nSoel walked ahead, tail high, as if he had been here all along.\n\nI followed. Because I had nothing else.\n\nSo many ruins. So many things I do not remember.\n\nMemories... only when I am ready, I guess.\n\nA clue? Or a greeting?\n\nIn the unknown, every step writes your story.`,
      codexNote: "Early-world exploration phase. Subject displays curiosity and low-level confidence. Emotional stability: Steady. Risk level: Minimal.",
      systemHints: ["The world responds.", "Observe before deciding.", "New information unlocks.", "Trust is earned through choice."],
      quest: {
        title: "Explore the Eastern Reach",
        desc: "Follow Soel into the ruins of the Eastern Reach. The world is watching. Observe before deciding. New area data is ready to synchronize.",
        outcome: "New area data synchronized. Fragments of memory may be triggered. The world responds to those who move with purpose. Trust is earned through choice.",
        xp: 150, gold: 40,
        rewards: [{ name: "Map Fragment", icon: "🗺️", desc: "Partial map of the Eastern Reach" }, { name: "Memory Shard", icon: "🔮", desc: "A fragment of something forgotten" }]
      }
    },
{
      id: 4, book: 1,
      title: "The First Steps",
      quote: "You do not need to understand everything to move forward. You only need to choose a direction.",
      image: "book1/ch4.png",
      narrative: `I followed Soel. He did not look back.\n\nThe ruins stretched further than my eyes could trace.\n\nYet it did not feel dangerous. It felt... waiting.\n\nEach step carried a whisper. Each whisper carried a memory that was not mine, but still felt close.\n\nMaybe this world is not empty. Maybe it only needs someone willing to walk it.\n\nA seal. Locked.\n\nSeek knowledge... Explore... Observe...\n\nThen let's start here. One step at a time.\n\nUnderstanding is earned by those who keep going.`,
      codexNote: "Exploration phase continues. Subject shows curiosity and adaptability. Emotional stability: Improving. Risk level: Low.",
      systemHints: ["Paths reveal themselves to those who move.", "Symbols are a language.", "Silence is sometimes guidance.", "Companions see what you miss."],
      quest: {
        title: "Seek Knowledge",
        desc: "Ancient mechanism detected. Insufficient data to unlock. Recommended action: Seek knowledge. Explore. Observe. Learn. Find the sealed mechanism and understand its purpose.",
        outcome: "You discover an ancient seal. The path forward requires understanding, not force. The Codex notes: Paths reveal themselves to those who move. Symbols are a language.",
        xp: 180, gold: 60,
        rewards: [{ name: "Ancient Seal Rubbing", icon: "📜", desc: "A copy of mysterious runes" }, { name: "Explorer's Badge", icon: "🏅", desc: "Proof of your first discovery" }]
      }
    },
{
      id: 5, book: 1,
      title: "Not Alone Anymore",
      quote: "Sometimes, the first connection is not made by words, but by choice.",
      image: "book1/ch5.png",
      narrative: `Soel stayed by my side. Not because I asked. But because he chose.\n\nThe world is still vast. Still unknown. Still full of questions.\n\nBut it no longer feels as if I am walking into it alone.\n\nA small presence. A steady heartbeat. A quiet promise.\n\nIt is enough... for now.\n\nShared perception? You mean I can see what you see?\n\nThen... show me.\n\nYou are never truly alone, if someone chooses to walk with you.`,
      codexNote: "First bond established. Companion loyalty confirmed. Mutual trust initiated. Emotional stability: Rising. Risk level: Moderate.",
      systemHints: ["Companions are not items.", "They remember.", "They choose.", "Guard what chooses you."],
      quest: {
        title: "Deepen the Bond",
        desc: "The companion bond is deepening. Sync Rate: 28% → 46%. New ability unlocked: [SHARED PERCEPTION]. Allows limited connection with companion senses. Strengthen your bond with Soel.",
        outcome: "Companion bond deepened. Sync Rate increased to 46%. New ability unlocked: [SHARED PERCEPTION]. You can now see through Soel's eyes in limited capacity. The system recognizes connection as key to survival.",
        xp: 200, gold: 50,
        rewards: [{ name: "Shared Perception", icon: "👁️", desc: "See through companion senses" }, { name: "Bond Crystal", icon: "💎", desc: "Amplifies companion resonance" }]
      }
    },
{
      id: 6, book: 1,
      title: "Signs and Choices",
      quote: "The world gives signs in many ways. It is up to you to read them.",
      image: "book1/ch6.png",
      narrative: `We reached a broken plaza covered in vines and light.\n\nIn the center, a stone monolith rose like a question.\n\nRunes circled it like whispers waiting for an answer.\n\nSoel watched. Then looked at me. As if asking — will you choose?\n\nTouching is easier. But... observing feels safer.\n\nWhat if this is a test? What if it changes me?\n\nYou choose. I'll be here.\n\nOkay. I'll observe first. One step. One choice.\n\nObserve. Learn. Understand. Then act.`,
      codexNote: "Several ancient markers detected in region. Purpose: Unknown. Risk level: Low. Curiosity level: High.",
      systemHints: ["Look for patterns.", "Symbols hold meaning.", "Understanding opens paths.", "Choices shape outcomes."],
      quest: {
        title: "Read the Ancient Marker",
        desc: "You have discovered an Ancient Marker. Analysis requires interaction or observation. The runes are moving. Will you TOUCH or OBSERVE? Choose wisely — choices shape outcomes.",
        outcome: "You chose to observe first. The runes respond to patience and intent. Understanding opens paths. The marker remembers those who respect its silence before seeking its secrets.",
        xp: 220, gold: 70,
        rewards: [{ name: "Rune Decoder", icon: "🔣", desc: "Translates ancient symbols" }, { name: "Wisdom Token", icon: "🎖️", desc: "Reward for patient observation" }]
      }
    },
{
      id: 7, book: 1,
      title: "The Ancient Echoes",
      quote: "Some places remember what the world tries to forget.",
      image: "book1/ch7.png",
      narrative: `The marker reacted when we touched it.\n\nA pulse. A whisper. A memory.\n\nIt was as if the world itself was exhaling — something long held finally allowed to breathe.\n\nSoel sat still as though listening to a language older than speech.\n\nAnd I... I felt it too.\n\nNot fear. Not danger. Recognition.\n\nI can feel images... fragments... voices.\n\nIf we want answers... we have to be brave. Let's proceed.\n\nThe past is not something we escape. It is something we learn to understand.`,
      codexNote: "Markers are older than maps. They were placed by those who came before the fall. Purpose: Preserve knowledge. Risk level: Moderate.",
      systemHints: ["The past can guide.", "But not all memories want to be found.", "Understanding requires both caution and heart."],
      quest: {
        title: "Listen to the Past",
        desc: "Memory resonance detected. Data fragments incoming. Warning: Incomplete memories may be misleading. Proceed with caution? The marker holds knowledge from before the fall.",
        outcome: "You proceed into the memory resonance. Fragments of the past reveal themselves — not as answers, but as guideposts. The past can guide, but not all memories want to be found. Understanding requires both caution and heart.",
        xp: 250, gold: 80,
        rewards: [{ name: "Echo Fragment", icon: "🎵", desc: "A recorded memory from the past" }, { name: "Ancient Insight", icon: "📖", desc: "Knowledge from before the fall" }]
      }
    },
{
      id: 8, book: 1,
      title: "The Path Forward",
      quote: "A path is not found. It is remembered.",
      image: "book1/ch8.png",
      narrative: `The marker awakened when we listened — not with words, but with intent.\n\nIt showed us a direction. Not a destination.\n\nSoel said nothing. But I felt the approval in the stillness.\n\nWe are not chasing answers anymore.\n\nWe are learning to walk with them.\n\nWe have an objective now. Not just questions.\n\nThen let's keep walking.\n\nThe unknown is not the enemy. Ignoring it is.`,
      codexNote: "Markers respond to resonance. Alignment of intent establishes communication. Purpose: Guidance. Risk level: Moderate.",
      systemHints: ["Follow the flow, not the force.", "Patterns repeat.", "The world teaches those who pay attention.", "Trust builds paths."],
      quest: {
        title: "Follow the Resonance",
        desc: "Directional resonance aligned. Pathway projection initiated. New objective added: Find the memory fragments. Understand the truth. Protect one another. The marker has shown you the way forward.",
        outcome: "The path forward is illuminated. Directional resonance aligned. You now have a clear objective: find memory fragments, understand the truth, and protect one another. The unknown is not the enemy — ignoring it is.",
        xp: 280, gold: 90,
        rewards: [{ name: "Pathfinder's Compass", icon: "🧭", desc: "Points toward memory fragments" }, { name: "Resonance Stone", icon: "💎", desc: "Aligns with ancient pathways" }]
      }
    },
{
      id: 9, book: 1,
      title: "The World Responds",
      quote: "The world does not answer right away. But it does answer.",
      image: "book1/ch9.png",
      narrative: `We walked until the sun touched the horizon.\n\nThe path opened. The air changed.\n\nThe world acknowledged us.\n\nNot with words. With weather. With wind. With something older.\n\nSoel said it was normal. But I know now — nothing about this is normal.\n\nSo this is how the world responds. Not with answers...\n\nA map... of the areas around us? It wasn't there before.\n\nWhen you walk with purpose, even the world will point the way.`,
      codexNote: "Environmental shifts occur when the system recognizes a party's presence. Not all parties are accepted. Risk level: Moderate.",
      systemHints: ["Changes in environment are responses, not random.", "The world is listening.", "Recognition brings opportunity and risk."],
      quest: {
        title: "Walk with Purpose",
        desc: "Environmental resonance confirmed. Party presence registered. New system function unlocked: [WORLD MAP — PROXIMITY]. The world is responding to your journey. Open the map and see what has been revealed.",
        outcome: "The world responds to purpose. A new map of the surrounding areas materializes — it wasn't there before. The system recognizes your party's presence. Recognition brings both opportunity and risk.",
        xp: 300, gold: 100,
        rewards: [{ name: "World Map", icon: "🗺️", desc: "Reveals nearby landmarks" }, { name: "Wind Whisper", icon: "🌬️", desc: "The world's acknowledgment of your path" }]
      }
    },
{
      id: 10, book: 1,
      title: "What We See Now",
      quote: "Clarity is not everything. But it is something.",
      image: "book1/ch10.png",
      narrative: `We reached the rise by midmorning.\n\nFrom here, the world opened wide.\n\nRivers. Valleys. Ruins. Aethon stretched out — alive and unchanged.\n\nSoel sat beside me, tail flicking in the wind.\n\nWe weren't in a rush anymore.\n\nWe were seeing.\n\nAnd sometimes... that is enough.\n\nLet's record what we can. Places. Things. Small details.\n\nThey matter.\n\nWe don't need all the answers today. We just need to keep remembering.`,
      codexNote: "Observation anchors memory. The more you see with intent, the more the Codex can remember for you. Purpose: Awareness. Risk level: Low.",
      systemHints: ["Open places reveal more data.", "Height improves perception.", "Look. Listen. Record.", "Understanding begins with presence."],
      quest: {
        title: "Record What Remains",
        desc: "Area scan complete. New data points recorded: 1,248. Landmarks detected: 17. Echo traces detected: 3. [OBSERVE] to continue scanning. Document what you see — small details matter.",
        outcome: "You record the landscape with intent. 1,248 new data points logged. 17 landmarks detected. 3 echo traces found. Observation anchors memory. Understanding begins with presence. We don't need all the answers today — we just need to keep remembering.",
        xp: 320, gold: 120,
        rewards: [{ name: "Codex Journal", icon: "📓", desc: "Records observations automatically" }, { name: "Echo Lens", icon: "🔍", desc: "Detects hidden echo traces" }]
      }
    },
{
      id: 11, book: 1,
      title: "The First Companion",
      quote: "We were never meant to walk forever alone.",
      image: "book1/ch11.png",
      narrative: `The system speaks again. Not as a guide. But as a truth.\n\nIt was not built for one person.\n\nNot for one voice. Not for one memory.\n\nStories are completed by the ones we meet along the way.\n\nAnd somewhere... across these valleys, beyond these ruins, they are coming.\n\nNot as strangers. But as the missing parts of something we once were.\n\nVoices I know. Faces I should remember.\n\nI feel like I've been waiting for them.\n\nWhy do I feel like I've been waiting for them?\n\nStories are not finished by strength alone. They are finished by the hearts that choose to stay.`,
      codexNote: "The Codex recognizes connection as key to survival. Solo fate: incomplete. Shared fate: multiplied.",
      systemHints: ["Stories are written together.", "Bonds unlock dormant potential.", "Companions reveal forgotten strength."],
      quest: {
        title: "Find the Others",
        desc: "Party scan initialized. Detected Entities: SAN — Origin: Sorcerer, Status: Confirmed. SOEL — Origin: Blessed Companion, Status: Confirmed. Party Status: INCOMPLETE. Evidence of former travelers detected. A story on hold. Find the ones who walked with you before.",
        outcome: "The path is not yours alone. Others carry the same echoes. The Codex recognizes connection as key to survival. Solo fate: incomplete. Shared fate: multiplied. New quest unlocked: Find the Ones Who Walked With You Before.",
        xp: 500, gold: 200,
        rewards: [{ name: "Party Beacon", icon: "📡", desc: "Detects nearby companions" }, { name: "Echo of Unity", icon: "🌟", desc: "Resonates with lost companions" }]
      }
    },
// ===== BOOK 2: THE GATHERING =====
    {
      id: 12, book: 2,
      title: "The Man Who Promised",
      quote: "Not all who answer a call do so for glory. Some answer... because someone begged them to.",
      image: "book2/b2ch1.png",
      narrative: `BRUNEI. Before the system. Before the Codex. Before any of them knew what Aethon truly was.\n\nHe notices what others ignore. He carries responsibility without needing to be seen. He thinks before he speaks. Because when he does speak... people listen.\n\nSAN: What if this is a line we're not supposed to hold?\nJOEL: Then we'll hold it anyway.\n\nI can't promise I'll fix everything. But I can promise, I'll stand with you.\n\nA promise. A ring. A reason.\n\nHe promised he would protect her. The Codex gave him the power to keep that promise.\n\nThis is how his legend begins.`,
      codexNote: "Entity: JOEL — Paladin, Shield of the Line. Origin: Philippines. Based in: Brunei. Age: 36. The Codex awakens. An ancient system recognizes his promise. Not for glory. Not for power. For her.",
      systemHints: ["Promises are remembered.", "The system recognizes intent.", "Protection is a choice made before danger."],
      quest: {
        title: "Accept Joel as Partner",
        desc: "A potential bond has been detected. Accept Joel of Brunei as your Partner? This choice may affect future events. He promised to protect you before the Codex ever existed.",
        outcome: "Joel accepts the bond. Partner status confirmed. The shield is not just a weapon — it is a promise made visible. A choice. A future. A shield you never thought you'd accept.",
        xp: 600, gold: 250,
        rewards: [{ name: "Joel's Promise", icon: "💍", desc: "A bond that predates the Codex" }, { name: "Shield of the Line", icon: "🛡️", desc: "Protection forged in intent" }]
      }
    },
{
      id: 13, book: 2,
      title: "The Fragment of Us",
      quote: "Some memories survive even when the mind forgets.",
      image: "book2/b2ch2.png",
      narrative: `San had lost most of her memories... but some fragments kept coming back.\n\nA laugh. A touch. A feeling... that felt so familiar.\n\nYou remembered me, didn't you?\n\nTwo years after she was separated from her ex... San and Joel started a relationship. On Sundays, when they don't work... they live together in a shared apartment.\n\nSometimes... fragments returned. The feel of his toothbrush... brushing side by side. A movie. His arm around me. Soel between us. His laugh when I burned the berries.\n\nIt wasn't a perfect story... but it was our story.\n\nAnd even with the missing memories... my heart still knows.`,
      codexNote: "Memory reconstruction in progress. Emotional anchors detected: laughter, touch, routine. The heart retains what the mind loses. Bond stability: STRONG.",
      systemHints: ["Love is not a memory.", "It is a pattern the heart refuses to forget.", "Fragments are enough to rebuild."],
      quest: {
        title: "Remember the Fragments",
        desc: "Memory fragments are surfacing. Not all at once. Not perfectly. But enough. Help San piece together what remains of her past with Joel.",
        outcome: "Memory reconstruction: PARTIAL. The fragments reveal a life shared — imperfect, real, and worth remembering. Love is not a memory. It is a pattern the heart refuses to forget.",
        xp: 550, gold: 200,
        rewards: [{ name: "Memory Fragment", icon: "🧩", desc: "A piece of a shared past" }, { name: "Heart's Anchor", icon: "❤️", desc: "Emotional bond stabilizer" }]
      }
    },
{
      id: 14, book: 2,
      title: "The Shield I Didn't Expect",
      quote: "Protection isn't always taken. Sometimes, it's offered.",
      image: "book2/b2ch3.png",
      narrative: `Memories... They come in waves. Some clear. Some sharp. Some... gone.\n\nI remember his voice. I remember his warmth. But parts of us... still feel like mist.\n\nYou don't have to do this alone, San.\n\nLet me be the one who stands between you and harm.\n\nTake this. My shield. My promise.\n\nJoel... Why me?\n\nBecause it's always been you.\n\nA choice. A future. A shield I never thought I'd accept.`,
      codexNote: "SYSTEM MESSAGE: A potential bond has been detected. Accept Joel of Brunei as your Partner? Partner status: CONFIRMED. This choice may affect future events.",
      systemHints: ["Protection offered is stronger than protection demanded.", "The best shields are given, not taken.", "Trust is the foundation of all bonds."],
      quest: {
        title: "Accept the Shield",
        desc: "Joel offers his shield and his promise. Not as a transaction, but as a choice. Will you accept protection offered freely? This choice may affect future events.",
        outcome: "You accept Joel's shield. Partner bond confirmed. The system recognizes: protection offered is stronger than protection demanded. The best shields are given, not taken.",
        xp: 650, gold: 220,
        rewards: [{ name: "Partner Bond", icon: "🔗", desc: "Unbreakable connection" }, { name: "Promise Ring", icon: "💍", desc: "A vow made before the Codex" }]
      }
    },
{
      id: 15, book: 2,
      title: "The Days We Didn't Count",
      quote: "Some places heal you without asking for your name.",
      image: "book2/b2ch4.png",
      narrative: `AETHON. We lived in a small cottage on the edge of the wild.\n\nWe survived on what Aethon gave us... Berries. Water. Each other.\n\nSimple days. Quiet laughter. A life that felt like ours.\n\nNights we shared. Dreams we didn't question.\n\nSometimes... fragments returned. The feel of his toothbrush... brushing side by side. A movie. His arm around me. Soel between us. His laugh when I burned the berries.\n\nThen one morning. I woke before he did. And I knew.\n\nA presence outside.\n\nA familiar aura. A name my heart would never forget.\n\nAisyah.\n\nMemories fade. Connections remain.`,
      codexNote: "Domestic stability achieved. Emotional recovery: ongoing. New entity detected at perimeter. Classification: FAMILIAR. Threat level: NONE. Response recommended: ACKNOWLEDGE.",
      systemHints: ["Peace is not the absence of conflict.", "It is the presence of what matters.", "Old friends arrive when you need them most."],
      quest: {
        title: "Welcome the Sisterblade",
        desc: "A presence has been detected outside your cottage. A familiar aura. A name your heart would never forget. Aisyah has found you. Welcome her into your story.",
        outcome: "Aisyah reunites with the party. The Sisterblade returns. Memories fade, but connections remain. Some places heal you without asking for your name.",
        xp: 700, gold: 300,
        rewards: [{ name: "Sisterblade's Return", icon: "🗡️", desc: "Aisyah rejoins the party" }, { name: "Cottage Key", icon: "🏠", desc: "A home in the wild" }]
      }
    },
{
      id: 16, book: 2,
      title: "The Sisterblade Returns",
      quote: "Some bonds are never broken. They just wait for the right step back into your life.",
      image: "book2/b2ch5.png",
      narrative: `Long time, San. Still forget how to lock your door?\n\nAisyah? What are you doing here?\n\nWhat do you think? I was worried you'd starve without me.\n\nAnd you, living in the wild, eating berries like animals. Some things never change.\n\nI heard bits and pieces. About the fights, the losses... and you.\n\nYou always think you can do it alone. Even when the world keeps proving you wrong.\n\nBut I know you, San. You never stay alone for long.\n\nBecause deep down, you know... you were never meant to.\n\nSo let me catch up. And if you'll have me... let me fight beside you again.\n\nAisyah... I'd be stupid to say no.\n\nGood. Let's make more stupid decisions together.`,
      codexNote: "SYSTEM MESSAGE: A strong bond has been detected. Aisyah of Brunei wishes to join your journey. Accept her as your Companion? Class: Rogue / Merchant. Role: Scout • Assassin. Weapon: Dual Daggers. Insightful • Loyal • Sharp.",
      systemHints: ["Old friends are not replaced.", "They are returned.", "The Sisterblade remembers what others forget."],
      quest: {
        title: "Accept Aisyah as Companion",
        desc: "A strong bond has been detected. Aisyah of Brunei wishes to join your journey. Accept her as your Companion? This choice may affect future events. She was worried you'd starve without her.",
        outcome: "Aisyah joins the party. The Sisterblade returns. Some bonds are never broken — they just wait for the right step back into your life. Class: Rogue / Merchant confirmed.",
        xp: 750, gold: 280,
        rewards: [{ name: "Sisterblade Bond", icon: "⚔️", desc: "Aisyah officially joins" }, { name: "Dual Daggers", icon: "🗡️", desc: "Precision weapons of the rogue" }]
      }
    },
{
      id: 17, book: 2,
      title: "A Life That Refused to Break",
      quote: "The strongest people aren't the ones who never fall. They're the ones who rise, rebuild, and keep moving forward.",
      image: "book2/b2ch6.png",
      narrative: `Aisyah of Brunei. Once, I was Miss Aisyah. A mathematics teacher in a secondary school.\n\nI loved numbers. Loved logic. Loved the spark in a student's eyes when they finally understood.\n\nI built my life around purpose, independence, and hard work.\n\nThen love turned into a lie. My husband stole from me. Not just money — but trust, peace, and years I'll never get back.\n\nI lost more than I thought I could survive. But I refused to stay broken.\n\nI started over. One parcel at a time. Online reselling on TikTok became my new classroom.\n\nDifferent students. Different lessons. Same me — patient, persistent, and never giving up.\n\nI learned new skills. Built new confidence. Rebuilt my life — on my own terms.\n\nI'm not who I used to be. I'm who I chose to become.\n\nI have two incredible children. Senedra. Strategic, fierce, and fiercely loyal. Zaki. Disciplined, ambitious, and my constant worry.\n\nThey are my heart outside my body. Everything I do, I do for them.`,
      codexNote: "Entity: AISYAH — Resilience profile: EXCEPTIONAL. Trauma survived: Multiple. Recovery method: Self-directed reconstruction. Current status: THRIVING. Children: SENEDRA (Scout), ZAKI (Fighter).",
      systemHints: ["Resilience is a skill.", "It is practiced, not gifted.", "The strongest steel is forged in the hottest fire."],
      quest: {
        title: "Witness Aisyah's Strength",
        desc: "Aisyah shares her story — not for pity, but for understanding. She rebuilt her life from nothing. Witness her strength and honor her journey.",
        outcome: "Aisyah's resilience is recorded in the Codex. The strongest people aren't the ones who never fall — they're the ones who rise, rebuild, and keep moving forward. Two children detected: Senedra and Zaki.",
        xp: 800, gold: 350,
        rewards: [{ name: "Resilience Badge", icon: "🏅", desc: "Proof of unbreakable spirit" }, { name: "Family Portrait", icon: "👨‍👩‍👧‍👦", desc: "Senedra and Zaki's image" }]
      }
    },
{
      id: 18, book: 2,
      title: "The Whispering Woods",
      quote: "Some forests don't hide monsters. They hide the truth.",
      image: "book2/b2ch7.png",
      narrative: `AETHON. The Whispering Woods.\n\nA forest where the trees themselves seem to breathe. Where the wind carries voices that are not quite human.\n\nSoel's ears twitched. He heard them too.\n\nSomething is watching us.\n\nThe deeper we walked, the louder the whispers became. Not threatening. Not welcoming. Just... waiting.\n\nAnd then — a clearing. A figure standing in the center, bathed in dappled light.\n\nEliz. The Gentle Healer.\n\nShe didn't speak. She only smiled — a smile that held more understanding than any words could carry.\n\nThe forest didn't hide a monster. It hid someone who had been waiting for us all along.`,
      codexNote: "Entity: ELIZ — Healer, Life Binder. Origin: Unknown. Classification: NEURODIVERGENT. Trust requirement: HIGH. Approach recommended: PATIENCE. Emotional sensitivity: EXCEPTIONAL.",
      systemHints: ["Not all who wait are lost.", "Some are simply waiting for the right moment.", "Gentleness is not weakness."],
      quest: {
        title: "Find the Gentle Healer",
        desc: "The Whispering Woods hold a secret. A healer who does not speak but understands. Find Eliz and earn her trust. Approach with patience.",
        outcome: "Eliz joins the party. The Gentle Healer's trust is earned, not given. She sees bonds others cannot. Her healing is not just of body, but of heart.",
        xp: 850, gold: 400,
        rewards: [{ name: "Healer's Grace", icon: "💚", desc: "Eliz joins your party" }, { name: "Life Binder's Mark", icon: "🌿", desc: "Restores health over time" }]
      }
    },
{
      id: 19, book: 2,
      title: "The Healer's Touch",
      quote: "Healing is not the absence of pain. It is the presence of understanding.",
      image: "book2/b2ch8.png",
      narrative: `Eliz didn't speak much. But when she touched your hand, you felt it.\n\nNot magic. Not medicine. Understanding.\n\nShe saw the cracks in your armor. The ones you hid from everyone else.\n\nAnd she didn't try to fix them. She simply sat beside them.\n\nThat is enough.\n\nHer hands glowed softly — not with power, but with presence.\n\nThe Codex registered something new. Not a spell. Not a skill.\n\nA connection.\n\nEliz... thank you.\n\nShe only smiled. And in that smile, the whole world felt a little less heavy.`,
      codexNote: "Entity: ELIZ — Ability registered: [EMPATHIC HEALING]. Effect: Restores emotional stability alongside physical health. Range: Touch. Limitation: Requires mutual trust.",
      systemHints: ["Healing begins with being seen.", "Not all wounds are visible.", "Understanding is the first medicine."],
      quest: {
        title: "Accept the Healer's Gift",
        desc: "Eliz offers her gift — not as a transaction, but as a connection. Accept her healing and understand that not all wounds are visible.",
        outcome: "Eliz's empathic healing is unlocked. She restores emotional stability alongside physical health. Healing begins with being seen. Not all wounds are visible.",
        xp: 900, gold: 450,
        rewards: [{ name: "Empathic Healing", icon: "💫", desc: "Restores emotional stability" }, { name: "Trust Crystal", icon: "💎", desc: "Deepens bonds with Eliz" }]
      }
    },
{
      id: 20, book: 2,
      title: "The Healer's Memories",
      quote: "Some memories are not lost. They are simply waiting for the right heart to hold them.",
      image: "book2/b2ch9.png",
      narrative: `Eliz sat alone in the cottage garden, fingers tracing patterns in the dirt.\n\nShe wasn't drawing. She was remembering.\n\nA name came to her lips. Soft. Almost silent.\n\nMum...\n\nMezstorm. The one who had been a mother to her. The one who had taught her that storms could be beautiful.\n\nThe memories were fragments. A laugh. A scolding. A warm hand on her shoulder.\n\nBut they were enough.\n\nI remember her. Even when I don't.\n\nThe Codex hummed. A new resonance detected.\n\nSomeone was coming. Someone Eliz had been waiting for.\n\nNot a stranger. A storm.\n\nMemories are not lost. They are simply waiting for the right heart to hold them.`,
      codexNote: "Entity: ELIZ — Memory trace detected: MEZSTORM. Relationship: MATERNAL. Emotional anchor: STRONG. New resonance incoming. Classification: STORM MAGE.",
      systemHints: ["The heart remembers what the mind forgets.", "Connections survive distance.", "Storms can be beautiful too."],
      quest: {
        title: "Recover the Healer's Past",
        desc: "Eliz's memories hold the key to finding Mezstorm. Help her piece together the fragments of her past and prepare for the storm that is coming.",
        outcome: "Eliz's memories reveal Mezstorm — her maternal figure, her teacher, her storm. The heart remembers what the mind forgets. A storm is coming, and it is beautiful.",
        xp: 950, gold: 500,
        rewards: [{ name: "Storm's Memory", icon: "⚡", desc: "Resonates with Mezstorm" }, { name: "Maternal Bond", icon: "👩‍👧", desc: "Eliz and Mezstorm connection" }]
      }
    },
{
      id: 21, book: 2,
      title: "Memories Misplaced",
      quote: "Not all who are lost have wandered. Some were taken.",
      image: "book2/b2ch10.png",
      narrative: `The Codex flickered. A warning.\n\nEntity: MEZSTORM — Status: UNKNOWN. Last known location: The Tempest Spire. Current status: MEMORY FRAGMENTATION DETECTED.\n\nMezstorm had not simply disappeared. She had been taken.\n\nHer memories — scattered. Her identity — fractured. The system had done this to her.\n\nBut why?\n\nWe have to find her. Not just for Eliz. For all of us.\n\nThe path to the Tempest Spire was treacherous. Lightning carved new rivers in the stone. Wind that could strip flesh from bone.\n\nBut we walked it anyway.\n\nBecause some people are worth any storm.\n\nNot all who are lost have wandered. Some were taken. And some... are worth any storm to bring back.`,
      codexNote: "Entity: MEZSTORM — Status: COMPROMISED. Memory fragmentation: SEVERE. Location: Tempest Spire. Threat level: HIGH. Rescue recommended: IMMEDIATE.",
      systemHints: ["Some storms are not natural.", "They are prisons.", "Breaking them requires more than strength."],
      quest: {
        title: "Rescue the Storm Mage",
        desc: "Mezstorm has been taken. Her memories scattered, her identity fractured. Journey to the Tempest Spire and rescue her from the system that imprisoned her.",
        outcome: "You reach the Tempest Spire. Mezstorm's prison is a storm of her own making — but the system twisted it. Breaking it requires more than strength. It requires the bonds you've built.",
        xp: 1000, gold: 550,
        rewards: [{ name: "Storm Breaker", icon: "🌩️", desc: "Dispels magical storms" }, { name: "Memory Anchor", icon: "⚓", desc: "Prevents memory fragmentation" }]
      }
    },
{
      id: 22, book: 2,
      title: "The Lost Storm",
      quote: "The storm knows no past, but the heart remembers.",
      image: "book2/b2ch11.png",
      narrative: `The Tempest Spire shattered as we reached its peak.\n\nAnd there she was.\n\nMezstorm. Surrounded by lightning that didn't strike. Wind that didn't blow. A storm frozen in time.\n\nShe didn't recognize us. Not at first.\n\nBut Eliz stepped forward. And she spoke the only word that mattered.\n\nMum.\n\nThe storm paused.\n\nMezstorm's eyes — they changed. Not recognition. Not yet. But something deeper.\n\nA feeling. A warmth. A memory that the storm could not erase.\n\nThe heart remembers. Even when the mind is lost.\n\nMezstorm... it's us. We're here.\n\nAnd slowly, like dawn breaking through clouds, the storm began to clear.\n\nThe storm knows no past, but the heart remembers. And the heart... always finds its way home.`,
      codexNote: "Entity: MEZSTORM — Status: RECOVERING. Memory reconstruction: INITIATED. Emotional anchor: ELIZ. Storm suppression: SUCCESSFUL. Identity restoration: IN PROGRESS.",
      systemHints: ["Love is stronger than any storm.", "The heart remembers what the mind loses.", "Family is not always blood."],
      quest: {
        title: "Restore the Storm Mage",
        desc: "Mezstorm is found but lost within her own storm. Eliz's voice is the key. Help restore Mezstorm's identity and bring her back from the tempest.",
        outcome: "Mezstorm's storm clears. Memory reconstruction initiated. Emotional anchor: Eliz. The heart remembers what the mind loses. Love is stronger than any storm. Family is not always blood.",
        xp: 1100, gold: 600,
        rewards: [{ name: "Mezstorm's Return", icon: "⚡", desc: "Storm Mage rejoins the party" }, { name: "Tempest Heart", icon: "💜", desc: "Channels storm energy safely" }]
      }
    },
{
      id: 23, book: 2,
      title: "The Cursed Catacombs",
      quote: "Some dungeons are not built to keep things out. They are built to keep things in.",
      image: "book2/b2ch12.png",
      narrative: `The Codex warned us. But we went anyway.\n\nThe Cursed Catacombs — a labyrinth beneath the ruins of Old Aethon. Where the system had buried its failures.\n\nAnd where something else had been waiting.\n\nSoel's fur stood on end. He felt it before any of us.\n\nThere's something down there. Something old. Something angry.\n\nThe catacombs breathed. The walls pulsed with a rhythm that matched no heartbeat we knew.\n\nAnd in the deepest chamber — we found it.\n\nNot a monster. A door.\n\nA door that led somewhere the Codex could not see.\n\nSome dungeons are not built to keep things out. They are built to keep things in. And some doors... should never be opened.`,
      codexNote: "Location: Cursed Catacombs. Classification: FORBIDDEN. System access: DENIED. Entity detected: UNKNOWN. Threat level: EXTREME. Recommendation: DO NOT PROCEED.",
      systemHints: ["Some doors lead nowhere.", "Others lead to everywhere.", "The Codex does not see all."],
      quest: {
        title: "Survive the Catacombs",
        desc: "The Cursed Catacombs hold a door the Codex cannot see. Something old and angry waits within. Survive the labyrinth and discover what the system buried.",
        outcome: "You survive the Cursed Catacombs and discover a door that leads somewhere the Codex cannot see. Some doors lead nowhere. Others lead to everywhere. The Codex does not see all.",
        xp: 1200, gold: 650,
        rewards: [{ name: "Catacomb Key", icon: "🗝️", desc: "Unlocks forbidden paths" }, { name: "Void Resistor", icon: "🛡️", desc: "Protects against unknown energies" }]
      }
    },
{
      id: 24, book: 2,
      title: "The Bone Tyrant Who Would Not Stay Dead",
      quote: "Some enemies don't stay buried. Not because they are strong, but because they are remembered.",
      image: "book2/b2ch13.png",
      narrative: `The door opened. And hell walked through.\n\nThe Bone Tyrant — a king who had refused death so many times that death had given up on him.\n\nHis skeleton was fused with the stone of the catacombs. His crown was not gold, but the calcified remains of those who had tried to stop him.\n\nYou should not be here.\n\nHis voice was not sound. It was memory. A memory of every fear we had ever buried.\n\nBut we had buried fears before. And we had dug them up again.\n\nWe are the Daybreak Seven. And you... are just a bad memory.\n\nSome enemies don't stay buried. Not because they are strong, but because they are remembered. And we are here to make sure you are forgotten.`,
      codexNote: "Entity: BONE TYRANT — Classification: UNDEAD SOVEREIGN. Death count: UNKNOWN. Weakness: FORGETTING. Strength: REMEMBRANCE. Strategy: Do not fear. Do not remember. Simply end.",
      systemHints: ["Fear gives form to the formless.", "Memory is power.", "Some things are better forgotten."],
      quest: {
        title: "Defeat the Bone Tyrant",
        desc: "The Bone Tyrant refuses to stay dead. He feeds on memory and fear. Defeat him by refusing to remember him. End his reign of terror.",
        outcome: "The Bone Tyrant falls. His power was remembrance — and you refused to give it. Some enemies don't stay buried because they are remembered. You made sure he was forgotten.",
        xp: 1300, gold: 700,
        rewards: [{ name: "Tyrant's Crown", icon: "👑", desc: "Proof of the undead king's fall" }, { name: "Oblivion Shard", icon: "💀", desc: "Erases memories of enemies" }]
      }
    },
{
      id: 25, book: 2,
      title: "The Frost Queen Who Never Moved",
      quote: "Some prisons are not made of bars. They are made of stillness.",
      image: "book2/b2ch14.png",
      narrative: `Beyond the catacombs, we found her.\n\nThe Frost Queen — not a ruler, but a prisoner. Frozen in time, in place, in a moment of grief so deep that it had become her throne.\n\nShe had not moved in centuries. Not because she couldn't. But because moving meant feeling. And feeling meant remembering what she had lost.\n\nPlease... don't make me feel again.\n\nHer voice was the sound of ice cracking under weight.\n\nWe didn't fight her. We couldn't.\n\nInstead, we sat with her. In the cold. In the silence. In the grief.\n\nAnd slowly, so slowly, the ice began to melt.\n\nSome prisons are not made of bars. They are made of stillness. And sometimes, the only way to free someone... is to sit with them until they are ready to move.`,
      codexNote: "Entity: FROST QUEEN — Classification: GRIEF-BOUND. Status: IMPRISONED BY SORROW. Threat level: NONE. Approach: COMPASSION. Weapon: PATIENCE. Victory: UNDERSTANDING.",
      systemHints: ["Stillness is not surrender.", "Grief is a prison with no walls.", "Compassion is the key to every lock."],
      quest: {
        title: "Melt the Frost Queen's Prison",
        desc: "The Frost Queen is imprisoned by her own grief. She has not moved in centuries. Sit with her. Melt her prison with compassion, not force.",
        outcome: "The Frost Queen's ice melts. She moves for the first time in centuries. Grief is a prison with no walls — and compassion is the key to every lock. She gifts you her blessing.",
        xp: 1400, gold: 750,
        rewards: [{ name: "Frost Queen's Blessing", icon: "❄️", desc: "Immunity to cold damage" }, { name: "Thawed Heart", icon: "💙", desc: "Restores emotional warmth" }]
      }
    },
{
      id: 26, book: 2,
      title: "The Abyss That Remembered Nothing",
      quote: "Some voids are not empty. They are full of everything that was forgotten.",
      image: "book2/b2ch15.png",
      narrative: `The Abyss did not have a bottom. It had a memory.\n\nEvery step into it was a step into something someone had forgotten. A name. A face. A feeling.\n\nAnd the deeper we went, the more we lost.\n\nI can't remember... why are we here?\n\nSan's voice was small. Frightened.\n\nJoel took her hand. And he answered with the only truth that mattered.\n\nBecause we chose to be.\n\nThe Abyss remembered nothing. But we remembered everything.\n\nAnd that was enough.\n\nSome voids are not empty. They are full of everything that was forgotten. And the only way through... is to remember why you started.`,
      codexNote: "Location: THE ABYSS. Classification: MEMORY VOID. Effect: PROGRESSIVE AMNESIA. Countermeasure: BONDS. The deeper you go, the more you need each other.",
      systemHints: ["Memory is anchor.", "Bonds are rope.", "Without either, you fall forever."],
      quest: {
        title: "Cross the Abyss Together",
        desc: "The Abyss steals memories the deeper you go. Cross it together, holding onto your bonds. Remember why you started.",
        outcome: "You cross the Abyss by holding onto your bonds. Memory is anchor. Bonds are rope. Without either, you fall forever. The Daybreak Seven emerges stronger than before.",
        xp: 1500, gold: 800,
        rewards: [{ name: "Abyss Walker", icon: "🌑", desc: "Immunity to memory loss" }, { name: "Bond Anchor", icon: "🔗", desc: "Strengthens party connections" }]
      }
    },
{
      id: 27, book: 2,
      title: "Starlight Ascension",
      quote: "Some ascensions are not upward. They are inward.",
      image: "book2/b2ch16.png",
      narrative: `We reached the summit of the Spire of Echoes at dawn.\n\nThe sky was not blue. It was starlight — even in daylight. Aethon's true face, revealed only to those who had earned the right to see it.\n\nThe Codex spoke. Not as a system. Not as a guide.\n\nAs a witness.\n\nYou have walked far. You have lost much. You have found more.\n\nBut this is not the end. This is the beginning of what you choose to become.\n\nSan looked at each of us. Joel. Aisyah. Eliz. Mezstorm. Senedra. Zaki. Soel.\n\nAnd she smiled.\n\nWe are not what the world made us. We are what we chose to become.\n\nSome ascensions are not upward. They are inward. And we have ascended together.`,
      codexNote: "Location: SPIRE OF ECHOES. Classification: ASCENSION POINT. Requirement: COMPLETE PARTY. Status: ACHIEVED. The Daybreak Seven has reached the threshold of transformation.",
      systemHints: ["Ascension is not elevation.", "It is integration.", "You become what you choose to carry."],
      quest: {
        title: "Ascend as the Daybreak Seven",
        desc: "The Spire of Echoes awaits. With your complete party, ascend not upward, but inward. Become what you chose to carry.",
        outcome: "The Daybreak Seven ascends together. You are not what the world made you. You are what you chose to become. Ascension is not elevation — it is integration.",
        xp: 1600, gold: 900,
        rewards: [{ name: "Starlight Crest", icon: "⭐", desc: "Mark of the ascended" }, { name: "Seven's Unity", icon: "🌟", desc: "Party bond at maximum" }]
      }
    },
{
      id: 28, book: 2,
      title: "Planar Convergence",
      quote: "Some meetings are not coincidence. They are convergence.",
      image: "book2/b2ch17.png",
      narrative: `The planes converged. Not with sound. Not with light.\n\nWith presence.\n\nEvery world we had touched. Every bond we had formed. Every choice we had made.\n\nThey all arrived at this moment. This place. This convergence.\n\nThe Codex was not a system. It was a bridge.\n\nBetween what was and what could be. Between who we were and who we chose to become.\n\nAnd now, at the convergence, we had to choose.\n\nGo back. Or go forward.\n\nBut we had already chosen.\n\nWe chose each other.\n\nSome meetings are not coincidence. They are convergence. And we are the point where all paths meet.`,
      codexNote: "Event: PLANAR CONVERGENCE. Classification: REALITY NEXUS. All timelines intersecting. Choice required: CONTINUATION. The Daybreak Seven stands at the center of all possibilities.",
      systemHints: ["Every choice creates a world.", "Every bond creates a path.", "You are the convergence of everything you chose."],
      quest: {
        title: "Choose the Convergence",
        desc: "The planes converge. All timelines intersect. You stand at the center of all possibilities. Choose to go forward, together, as the Daybreak Seven.",
        outcome: "You choose each other. The Codex is a bridge between what was and what could be. Every choice creates a world. Every bond creates a path. You are the convergence of everything you chose.",
        xp: 1700, gold: 1000,
        rewards: [{ name: "Convergence Shard", icon: "💎", desc: "Holds all possibilities" }, { name: "Path Weaver", icon: "🧵", desc: "Binds timelines together" }]
      }
    },
{
      id: 29, book: 2,
      title: "The Long Way To You",
      quote: "The longest journey is not the one across worlds. It is the one to reach someone you thought you'd lost.",
      image: "book2/b2ch18.png",
      narrative: `Senedra and Zaki did not arrive late.\n\nThey had been fighting their way toward us the entire time.\n\nThrough the Whispering Woods. Across the Abyss. Past the Frost Queen's domain.\n\nEvery step a battle. Every breath a choice.\n\nWe didn't know. We couldn't know.\n\nBut they knew.\n\nThey knew we were waiting.\n\nAnd they came anyway.\n\nThe longest journey is not the one across worlds. It is the one to reach someone you thought you'd lost.\n\nAnd they made it.\n\nWelcome home, Senedra. Welcome home, Zaki.\n\nThe Daybreak Seven is complete.`,
      codexNote: "Entities: SENEDRA (Scout) and ZAKI (Fighter) — Status: ARRIVED. Journey duration: EXTENDED. Difficulty: MAXIMUM. Reason for delay: PROTECTING THE PATH. Classification: HEROIC. The Daybreak Seven is now COMPLETE.",
      systemHints: ["The longest road is walked for love.", "Family finds a way.", "Seven lights. One dawn."],
      quest: {
        title: "Welcome the Final Two",
        desc: "Senedra and Zaki have fought their way to you through every danger Aethon could throw at them. Welcome them home. The Daybreak Seven is complete.",
        outcome: "Senedra and Zaki arrive. The Daybreak Seven is complete. Seven lights. One dawn. The longest journey is not across worlds — it is to reach someone you thought you'd lost. And they made it.",
        xp: 2000, gold: 1500,
        rewards: [{ name: "Daybreak Seven Crest", icon: "🌅", desc: "The complete party emblem" }, { name: "Family's End", icon: "🏠", desc: "Home is where your party is" }]
      }
    },
// ===== BOOK 3: The Bonds We Carry =====
    {
      id: 30, book: 3, title: "What Victory Leaves Behind",
      quote: "Victory is not the absence of struggle, but the courage to face what comes after.",
      image: "book3/b3ch1.png",
      narrative: "The Tower has fallen. The world is saved. But San stands in the ruins of what was once a battlefield, and the silence is louder than any war cry. The party has scattered to their own lives, their own healing. San returns to Daybreak to find it changed—growing, thriving, but also forgetting. The people celebrate heroes they no longer know. San must decide what to do with a life that no longer has a clear enemy to fight. The chapter explores the hollow space that victory leaves behind, and the slow, uncertain process of building a life in peacetime.",
      codexNote: "Heroes often struggle more with peace than with war. The absence of purpose can be more devastating than any blade.",
      systemHints: ["Explore Daybreak and speak with old friends", "San must find a new purpose", "The quiet moments matter most"],
      quest: {
        title: "Find Your Footing",
        desc: "Navigate life after victory. Reconnect with the party and find new meaning in peacetime.",
        rewards: [{ type: "xp", value: 300, label: "+300 XP" }, { type: "item", label: "Peacetime Medallion" }],
        outcome: "San begins to understand that the battle is never truly over—it simply changes form.",
        hasBattle: false
      }
    },
{
      id: 31, book: 3, title: "The Astral Threshold",
      quote: "In the space between stars, we discover who we truly are.",
      image: "book3/b3ch2.png",
      narrative: "San is drawn to the Astral Threshold, a rift between dimensions where the laws of reality fray. Here, they encounter the Astral Devourer—a creature that feeds on possibilities, consuming the futures that might have been. The battle is not merely physical but existential: the Devourer shows San visions of lives unlived, choices unmade, and the weight of every path not taken. Mezstorm's storm magic proves essential, as the chaos of the storm disrupts the Devourer's ordered consumption. The chapter explores identity, choice, and the burden of infinite possibility.",
      codexNote: "The Astral Devourer is a natural phenomenon, not a malevolent entity. It feeds on unrealized potential, leaving behind only the hollow certainty of what is.",
      systemHints: ["Mezstorm's storm magic is highly effective", "The Devourer shifts between material and astral forms", "Use Memory Surge when the Devourer is astral"],
      quest: {
        title: "Defeat the Astral Devourer",
        desc: "Confront the Astral Devourer at the Threshold. Protect your future from being consumed.",
        rewards: [{ type: "xp", value: 600, label: "+600 XP" }, { type: "item", label: "Astral Essence" }],
        outcome: "The Devourer is driven back. San claims their chosen future, rejecting the lure of what might have been.",
        hasBattle: true
      },
      battle: {
        bossName: "Astral Devourer", bossIcon: "👻",
        bossHP: 120, bossMaxHP: 120, bossAC: 15,
        phases: [
          { name: "Material", threshold: 80, ac: 15, attack: "Possibility Drain", damage: 12, desc: "The Devourer feeds on your potential futures." },
          { name: "Astral", threshold: 50, ac: 18, attack: "Consume Paths", damage: 18, desc: "It shifts to astral form, becoming harder to hit but more vulnerable to storm magic." },
          { name: "Void", threshold: 20, ac: 20, attack: "Primordial Hunger", damage: 25, desc: "Desperate and ravenous, the Devourer attacks with reckless abandon." }
        ]
      }
    },
{
      id: 32, book: 3, title: "Heart of Fire",
      quote: "The hottest fires forge the strongest bonds, but they also leave the deepest scars.",
      image: "book3/b3ch3.png",
      narrative: "The Infernal Crucible calls—a volcanic realm where the Infernal Tyrant waits. But this battle is not about conquest; it is about bonds. Joel faces the Tyrant, a creature of pure flame that represents the burning intensity of parental love. The Tyrant was once a father who loved too fiercely, whose devotion became destructive. Joel must confront his own fears about fatherhood, protection, and the fine line between love and control. The chapter weaves together themes of sacrifice, the weight of responsibility, and the courage to love despite the risk of loss.",
      codexNote: "The Infernal Tyrant is not evil—he is love without boundaries, protection without restraint. He represents the danger of loving too much.",
      systemHints: ["Joel must lead this battle—his story is central", "Water and ice magic are effective", "The Tyrant's rage builds over time—endure and counter"],
      quest: {
        title: "Quell the Inferno",
        desc: "Face the Infernal Tyrant in the Crucible. Help Joel confront the nature of protective love.",
        rewards: [{ type: "xp", value: 650, label: "+650 XP" }, { type: "item", label: "Heart of Flame" }],
        outcome: "Joel emerges with a new understanding of love—not as control, but as presence. The Tyrant's fire is quenched by acceptance.",
        hasBattle: true
      },
      battle: {
        bossName: "Infernal Tyrant", bossIcon: "🔥",
        bossHP: 140, bossMaxHP: 140, bossAC: 16,
        phases: [
          { name: "Devotion", threshold: 75, ac: 16, attack: "Smothering Embrace", damage: 14, desc: "The Tyrant wraps you in suffocating warmth, believing it protects you." },
          { name: "Fury", threshold: 45, ac: 14, attack: "Burning Wrath", damage: 22, desc: "When his love is rejected, the Tyrant's flames turn to rage. His AC drops but his damage soars." },
          { name: "Ashes", threshold: 15, ac: 18, attack: "Final Sacrifice", damage: 30, desc: "In his final moments, the Tyrant offers one last destructive act of love." }
        ]
      }
    },
{
      id: 33, book: 3, title: "The Veil Between Worlds",
      quote: "Every choice creates a world. Every world holds a version of us we may never meet.",
      image: "book3/b3ch4.png",
      narrative: "The Veilshaper awaits at the crossroads of realities—a being that exists in the space between choices, weaving the fabric of what is and what could be. San must navigate a labyrinth of mirrored worlds, each reflecting a different choice made along the journey. In one world, San never left Daybreak. In another, the party was never formed. In yet another, the Shadow Veil was never defeated. The Veilshaper offers San a chance to rewrite history, to choose a different path. The battle is one of conviction: San must affirm that every choice, even the painful ones, has value.",
      codexNote: "The Veilshaper is a guardian, not an enemy. It tests those who would change reality to ensure they understand the cost.",
      systemHints: ["Each mirrored world has a puzzle based on a past choice", "The Veilshaper cannot be defeated through force alone", "Affirm your choices to weaken the Veilshaper's hold"],
      quest: {
        title: "Confront the Veilshaper",
        desc: "Navigate the labyrinth of mirrored worlds. Face the Veilshaper and affirm your chosen path.",
        rewards: [{ type: "xp", value: 700, label: "+700 XP" }, { type: "item", label: "Veil Fragment" }],
        outcome: "San rejects the chance to rewrite history. The Veilshaper bows to conviction stronger than regret.",
        hasBattle: true
      },
      battle: {
        bossName: "The Veilshaper", bossIcon: "🔮",
        bossHP: 130, bossMaxHP: 130, bossAC: 17,
        phases: [
          { name: "Reflection", threshold: 70, ac: 17, attack: "Mirror Strike", damage: 15, desc: "The Veilshaper reflects your own attacks back at you." },
          { name: "Possibility", threshold: 40, ac: 19, attack: "What Could Be", damage: 20, desc: "It shows you visions of alternate paths, distracting and disorienting." },
          { name: "Truth", threshold: 10, ac: 15, attack: "Absolute Reality", damage: 28, desc: "Stripped of illusions, the Veilshaper attacks with raw, unfiltered truth." }
        ]
      }
    },
{
      id: 34, book: 3, title: "Frostbound Eternity",
      quote: "Some would preserve the world in ice rather than let it change. But life is change, and change is life.",
      image: "book3/b3ch5.png",
      narrative: "The Eternal Frost Queen rules a realm where time itself has frozen—a beautiful, perfect, dead world. She offers San a choice: stay in her eternal winter, where nothing ever changes and nothing ever hurts, or return to the messy, painful, beautiful world of change. The Queen represents the desire to preserve what we love, to keep it safe from the ravages of time. San must confront their own fears of loss and change, and choose to embrace the impermanence that makes life precious. The battle is as much philosophical as physical.",
      codexNote: "The Frost Queen was once a mortal who lost everything she loved. Her ice is not cruelty—it is the desperate act of a broken heart trying to preserve what remains.",
      systemHints: ["Fire magic melts the Queen's defenses", "The frozen statues are her lost loved ones—touching them weakens her", "She is vulnerable when she remembers warmth"],
      quest: {
        title: "Melt the Eternal Winter",
        desc: "Face the Eternal Frost Queen. Choose change over preservation, life over stasis.",
        rewards: [{ type: "xp", value: 650, label: "+650 XP" }, { type: "item", label: "Thawed Heart" }],
        outcome: "The Queen's ice melts, and she weeps for the first time in centuries. Change is painful, but it is the price of being alive.",
        hasBattle: true
      },
      battle: {
        bossName: "Eternal Frost Queen", bossIcon: "❄️",
        bossHP: 150, bossMaxHP: 150, bossAC: 18,
        phases: [
          { name: "Preservation", threshold: 75, ac: 18, attack: "Frozen Touch", damage: 16, desc: "The Queen freezes you in place, trying to preserve you forever." },
          { name: "Despair", threshold: 50, ac: 16, attack: "Bitter Wind", damage: 20, desc: "Her sorrow manifests as biting winds that cut through armor." },
          { name: "Thaw", threshold: 25, ac: 14, attack: "Melting Rage", damage: 24, desc: "As her ice melts, the Queen fights with the fury of one losing everything again." }
        ]
      }
    },
{
      id: 35, book: 3, title: "The Abyss That Listens",
      quote: "The deepest abyss is not below us, but within us—the place where unspoken words go to die.",
      image: "book3/b3ch6.png",
      narrative: "The Abyssal Leviathan dwells in the deepest trench of the ocean, a creature that feeds not on flesh but on the words never spoken, the feelings never expressed. San and the party descend into the crushing darkness, where the pressure is not just physical but emotional. The Leviathan forces each character to confront the things they have left unsaid—to each other, to themselves, to those they have lost. The battle is one of vulnerability: to defeat the Leviathan, the party must speak their truths aloud, giving voice to the silence that has fed it.",
      codexNote: "The Leviathan grows stronger with every secret, every unspoken apology, every buried feeling. It is the manifestation of emotional repression.",
      systemHints: ["Each party member must speak a truth to weaken the Leviathan", "The abyss pressure damages over time—Eliz's healing is crucial", "Sound-based magic is highly effective"],
      quest: {
        title: "Speak to the Abyss",
        desc: "Descend into the abyss and confront the Leviathan. Force the party to speak their unspoken truths.",
        rewards: [{ type: "xp", value: 700, label: "+700 XP" }, { type: "item", label: "Spoken Truth" }],
        outcome: "The Leviathan dissolves into silence, starved of the secrets it fed upon. The party emerges closer than ever before.",
        hasBattle: true
      },
      battle: {
        bossName: "Abyssal Leviathan", bossIcon: "🐠",
        bossHP: 160, bossMaxHP: 160, bossAC: 16,
        phases: [
          { name: "Silence", threshold: 70, ac: 16, attack: "Crushing Depths", damage: 18, desc: "The pressure of unspoken words bears down on you." },
          { name: "Secrets", threshold: 45, ac: 18, attack: "Buried Truth", damage: 22, desc: "The Leviathan weaponizes your own secrets against you." },
          { name: "Void", threshold: 20, ac: 15, attack: "Final Silence", damage: 30, desc: "Desperate to survive, the Leviathan tries to drag you into eternal muteness." }
        ]
      }
    },
{
      id: 36, book: 3, title: "The Weight of the Words Unsent",
      quote: "A letter unsent weighs more than a mountain. A word unspoken echoes louder than a scream.",
      image: "book3/b3ch7.png",
      narrative: "Joel discovers a cache of unsent letters he wrote to his fallen kingdom—apologies, promises, goodbyes that never reached their destination. These letters have taken physical form, becoming an Elder Dragon of grief and regret. The dragon is not malevolent; it is the accumulated weight of love that never found its target. Joel must face the dragon alone, reading each letter aloud, giving voice to the words that have haunted him for years. The party can only watch and support as Joel confronts the deepest wound of his past.",
      codexNote: "Grief given form is not an enemy to be slain, but a burden to be acknowledged. Only by speaking the unspeakable can Joel find release.",
      systemHints: ["Joel must read the letters—other characters cannot intervene directly", "Support Joel with healing and encouragement", "The dragon weakens with each letter read"],
      quest: {
        title: "Read the Unsent Letters",
        desc: "Help Joel confront the Elder Dragon of unsent words. Guide him through reading his letters.",
        rewards: [{ type: "xp", value: 750, label: "+750 XP" }, { type: "item", label: "Sent Letters" }],
        outcome: "Joel finally says goodbye. The dragon dissolves into light, and Joel weeps—not in sorrow, but in release.",
        hasBattle: true
      },
      battle: {
        bossName: "Elder Dragon of Regret", bossIcon: "🐉",
        bossHP: 180, bossMaxHP: 180, bossAC: 17,
        phases: [
          { name: "Burden", threshold: 75, ac: 17, attack: "Crushing Guilt", damage: 18, desc: "The dragon's presence weighs on Joel's soul." },
          { name: "Memory", threshold: 50, ac: 15, attack: "Haunting Echo", damage: 20, desc: "Memories of the fallen kingdom manifest as painful visions." },
          { name: "Release", threshold: 25, ac: 13, attack: "Final Goodbye", damage: 25, desc: "The dragon fights to remain, clinging to the grief that gives it form." }
        ]
      }
    },
{
      id: 37, book: 3, title: "The Star That Remained",
      quote: "We are not our memories. We are the light that remains when memory fades.",
      image: "book3/b3ch8.png",
      narrative: "San faces the Astral Lord, a being of pure starlight who exists without memory, without past, without identity. The Astral Lord offers San a chance to shed their burdens—to forget the pain, the loss, the weight of every choice. But in doing so, San would also forget the bonds they have formed, the love they have shared, the person they have become. The battle is one of identity: San must choose to carry their memories, even the painful ones, because they are the foundation of who they are. The Astral Lord is not defeated but understood.",
      codexNote: "The Astral Lord represents the temptation of oblivion—the desire to forget and be free. But freedom without memory is merely emptiness.",
      systemHints: ["San must affirm their identity to resist the Astral Lord's offer", "Memory-based spells are effective", "The party's presence strengthens San's resolve"],
      quest: {
        title: "Remember Who You Are",
        desc: "Face the Astral Lord and choose memory over oblivion. Affirm your identity and your bonds.",
        rewards: [{ type: "xp", value: 700, label: "+700 XP" }, { type: "item", label: "Starlight Memory" }],
        outcome: "San chooses to remember. The Astral Lord smiles—a rare expression—and fades, leaving behind a single star that will always burn for those who choose to remember.",
        hasBattle: true
      },
      battle: {
        bossName: "Astral Lord", bossIcon: "⭐",
        bossHP: 140, bossMaxHP: 140, bossAC: 19,
        phases: [
          { name: "Oblivion", threshold: 70, ac: 19, attack: "Forget", damage: 15, desc: "The Astral Lord tries to make you forget your purpose." },
          { name: "Emptiness", threshold: 40, ac: 17, attack: "Void Touch", damage: 22, desc: "His touch drains not health but memory of your skills." },
          { name: "Acceptance", threshold: 15, ac: 15, attack: "Starlight", damage: 28, desc: "In his final phase, the Astral Lord attacks with the beauty of pure, unburdened existence." }
        ]
      }
    },
{
      id: 38, book: 3, title: "The Nexus Between Worlds",
      quote: "At the crossroads of infinity, the only map is the heart.",
      image: "book3/b3ch9.png",
      narrative: "The Nexus Planarch stands at the center of all possible paths, a being that exists in every reality simultaneously. It offers San a final choice: to walk any path, to become any version of themselves, to live any life they desire. The Planarch shows San infinite futures—some bright, some dark, all possible. But San realizes that the only path worth walking is the one they have already chosen, with the companions they have already found. The Planarch is not an enemy to be defeated but a guide who helps San see the value of their own journey.",
      codexNote: "The Nexus Planarch is the ultimate crossroads. It does not judge choices—it merely ensures that those who choose understand what they are choosing.",
      systemHints: ["The Planarch cannot be harmed by conventional means", "San's choice determines the Planarch's reaction", "All party members must affirm their chosen path"],
      quest: {
        title: "Choose Your Path",
        desc: "Face the Nexus Planarch and choose your reality. Affirm the bonds that define your journey.",
        rewards: [{ type: "xp", value: 750, label: "+750 XP" }, { type: "item", label: "Chosen Path" }],
        outcome: "San chooses this life, these friends, this world. The Planarch bows and opens the way forward.",
        hasBattle: true
      },
      battle: {
        bossName: "Nexus Planarch", bossIcon: "🏺",
        bossHP: 150, bossMaxHP: 150, bossAC: 18,
        phases: [
          { name: "Infinity", threshold: 70, ac: 18, attack: "Infinite Paths", damage: 16, desc: "The Planarch attacks from multiple realities simultaneously." },
          { name: "Choice", threshold: 45, ac: 16, attack: "What If", damage: 20, desc: "It shows you what you could have been, shaking your resolve." },
          { name: "Destiny", threshold: 20, ac: 20, attack: "Fated Strike", damage: 26, desc: "The Planarch accepts your choice and tests its strength one final time." }
        ]
      }
    },
{
      id: 39, book: 3, title: "The Fracture of Yesterday",
      quote: "We are all fractured. The light gets in through the cracks.",
      image: "book3/b3ch10.png",
      narrative: "Temporal echoes of the party's past selves begin to manifest—versions of each character from moments of failure, doubt, and pain. These echoes are not enemies; they are fragments of the party's own history, seeking integration. San must help each party member confront their past self, not to defeat it, but to embrace it. The battle is one of self-acceptance: each character must acknowledge their failures as part of what makes them whole. The chapter culminates in San facing their own echo—the person they were before the journey began.",
      codexNote: "Temporal echoes are fragments of self that have been rejected. They cannot be destroyed, only accepted and reintegrated.",
      systemHints: ["Each party member must face their own echo", "Attacking echoes makes them stronger—acceptance weakens them", "San's echo is the final challenge"],
      quest: {
        title: "Embrace Your Echoes",
        desc: "Help each party member confront and accept their temporal echo. Face your own past self.",
        rewards: [{ type: "xp", value: 700, label: "+700 XP" }, { type: "item", label: "Integrated Self" }],
        outcome: "The echoes merge with their present selves. The party is whole, scars and all.",
        hasBattle: true
      },
      battle: {
        bossName: "Temporal Fracture", bossIcon: "🔪",
        bossHP: 170, bossMaxHP: 170, bossAC: 16,
        phases: [
          { name: "Fragmentation", threshold: 75, ac: 16, attack: "Splintered Strike", damage: 17, desc: "The fracture attacks with the pain of past failures." },
          { name: "Regret", threshold: 50, ac: 18, attack: "What Was Lost", damage: 21, desc: "It weaponizes your regrets, making you relive your worst moments." },
          { name: "Wholeness", threshold: 25, ac: 14, attack: "Acceptance", damage: 24, desc: "As you accept the fracture, it fights to remain separate." }
        ]
      }
    },
{
      id: 40, book: 3, title: "The Last Guard",
      quote: "Some promises outlive the world that made them.",
      image: "book3/b3ch11.png",
      narrative: "The Last Guard is a sentinel who has kept watch for centuries, bound by a promise made to a world that no longer exists. He represents the weight of duty carried too long, the cost of promises that outlive their purpose. Joel sees himself in the Guard—the same devotion, the same inability to let go. The battle is not about defeating the Guard but about releasing him, helping him understand that his duty is fulfilled, that he has permission to rest. It is a battle of compassion, not conquest.",
      codexNote: "The Last Guard was once mortal, like Joel. He chose eternity to keep a promise. His tragedy is not that he failed, but that he succeeded too well.",
      systemHints: ["Joel must lead the conversation with the Guard", "The Guard cannot be defeated through combat—only released", "Show him that his promise has been kept"],
      quest: {
        title: "Release the Guard",
        desc: "Confront the Last Guard and help him find peace. Show him that his duty is done.",
        rewards: [{ type: "xp", value: 650, label: "+650 XP" }, { type: "item", label: "Released Promise" }],
        outcome: "The Guard crumbles—not in defeat, but in relief. For the first time in centuries, he closes his eyes. Joel understands that letting go is also a form of courage.",
        hasBattle: true
      },
      battle: {
        bossName: "The Last Guard", bossIcon: "🛡️",
        bossHP: 200, bossMaxHP: 200, bossAC: 20,
        phases: [
          { name: "Duty", threshold: 80, ac: 20, attack: "Eternal Vigil", damage: 15, desc: "The Guard fights with mechanical precision, driven by centuries of duty." },
          { name: "Promise", threshold: 60, ac: 18, attack: "Bound Blade", damage: 18, desc: "His blade carries the weight of every promise ever made." },
          { name: "Rest", threshold: 30, ac: 15, attack: "Final Stand", damage: 22, desc: "As he weakens, the Guard fights with desperate strength, afraid to stop." }
        ]
      }
    },
{
      id: 41, book: 3, title: "The Market That Forgot Its Worth",
      quote: "Value is not what the market demands, but what the heart refuses to sell.",
      image: "book3/b3ch12.png",
      narrative: "Aisyah finds herself in a strange market where everything is for sale—memories, dreams, loyalties, even love. The Scavenger King rules this place, a creature who consumes what others discard and resells it at a profit. Aisyah confronts her own tendency to measure worth in terms of utility and gain. The battle is about recognizing that some things—friendship, trust, love—have no price. The Scavenger King cannot comprehend this, and his inability to understand becomes his weakness.",
      codexNote: "The Scavenger King was once a merchant who traded everything for profit. He became so good at it that he traded his own soul, becoming a creature of pure transaction.",
      systemHints: ["Aisyah must reject the King's offers to weaken him", "Items of sentimental value are powerful weapons here", "The King is vulnerable when he cannot assign a price"],
      quest: {
        title: "Reject the Market",
        desc: "Confront the Scavenger King. Reject the commodification of bonds and emotions.",
        rewards: [{ type: "xp", value: 650, label: "+650 XP" }, { type: "item", label: "Priceless Bond" }],
        outcome: "The King's market crumbles when Aisyah declares that some things are not for sale. He dissolves, unable to exist in a world where value is measured in love.",
        hasBattle: true
      },
      battle: {
        bossName: "Scavenger King", bossIcon: "💰",
        bossHP: 130, bossMaxHP: 130, bossAC: 16,
        phases: [
          { name: "Transaction", threshold: 70, ac: 16, attack: "Buy Loyalty", damage: 14, desc: "The King tries to purchase your allegiance." },
          { name: "Desperation", threshold: 45, ac: 14, attack: "Sell Your Soul", damage: 20, desc: "He offers everything he has for your bonds." },
          { name: "Collapse", threshold: 20, ac: 12, attack: "Bankruptcy", damage: 25, desc: "When no one will trade with him, the King collapses in on himself." }
        ]
      }
    },
{
      id: 42, book: 3, title: "What We Never Owed",
      quote: "Love given freely has no debt. The moment it demands payment, it ceases to be love.",
      image: "book3/b3ch13.png",
      narrative: "The Debt Wraith haunts the party, a creature formed from every obligation, every expectation, every unspoken debt that has accumulated over their journey. It demands payment for every kindness, every sacrifice, every moment of love. The party must confront the toxic idea that love is transactional, that bonds are ledgers to be balanced. The Wraith is defeated not by combat but by forgiveness—by releasing each other from every debt, real or imagined, and choosing to love without expectation of return.",
      codexNote: "The Debt Wraith feeds on guilt and obligation. It cannot exist where love is given freely, without expectation or condition.",
      systemHints: ["The Wraith cannot be damaged by attacks—only by forgiveness", "Each party member must forgive a debt to weaken it", "San must forgive themselves most of all"],
      quest: {
        title: "Forgive the Debt",
        desc: "Confront the Debt Wraith. Release each other from obligation and choose unconditional love.",
        rewards: [{ type: "xp", value: 700, label: "+700 XP" }, { type: "item", label: "Forgiven Debt" }],
        outcome: "The Wraith dissolves, starved of the guilt that sustained it. The party is free—truly free—for the first time.",
        hasBattle: true
      },
      battle: {
        bossName: "Debt Wraith", bossIcon: "📜",
        bossHP: 150, bossMaxHP: 150, bossAC: 17,
        phases: [
          { name: "Obligation", threshold: 70, ac: 17, attack: "Demand Payment", damage: 16, desc: "The Wraith demands repayment for every kindness." },
          { name: "Guilt", threshold: 45, ac: 19, attack: "Unpaid Debt", damage: 20, desc: "It weaponizes your guilt, making you feel unworthy of love." },
          { name: "Release", threshold: 20, ac: 14, attack: "Final Demand", damage: 24, desc: "Desperate, the Wraith demands everything you have left." }
        ]
      }
    },
{
      id: 43, book: 3, title: "The Foreman Never Clocks Out",
      quote: "Rest is not a reward for labor. It is a right of the living.",
      image: "book3/b3ch14.png",
      narrative: "The Foreman is a spirit of endless toil, a creature who believes that worth is measured only in productivity. He has built a factory that never stops, where workers labor until they become part of the machinery. The party must confront their own tendencies to overwork, to define themselves by their output, to believe that rest is weakness. The Foreman is defeated not by force but by the radical act of stopping—of declaring that rest is holy, that being is enough without doing.",
      codexNote: "The Foreman was once a laborer who worked himself to death. He became a spirit because he could not accept that his life had value beyond his work.",
      systemHints: ["The Foreman is weakened when you refuse to work", "Resting during battle reduces his power", "Show him that life has value beyond productivity"],
      quest: {
        title: "Clock Out",
        desc: "Confront the Foreman. Reclaim the right to rest and exist without constant labor.",
        rewards: [{ type: "xp", value: 650, label: "+650 XP" }, { type: "item", label: "Restful Soul" }],
        outcome: "The factory stops. The workers wake. The Foreman finally closes his eyes, understanding that he was always enough, even when he was not working.",
        hasBattle: true
      },
      battle: {
        bossName: "The Foreman", bossIcon: "⏰",
        bossHP: 160, bossMaxHP: 160, bossAC: 18,
        phases: [
          { name: "Overtime", threshold: 75, ac: 18, attack: "Endless Shift", damage: 15, desc: "The Foreman demands you work until you break." },
          { name: "Exhaustion", threshold: 50, ac: 16, attack: "Burnout", damage: 20, desc: "His exhaustion becomes a weapon that drains your will." },
          { name: "Retirement", threshold: 25, ac: 14, attack: "Final Punch", damage: 22, desc: "In his final moments, the Foreman fights with the desperation of one who has never known rest." }
        ]
      }
    },
{
      id: 44, book: 3, title: "The Widow's Watch",
      quote: "Grief is love with nowhere to go. But love always finds a way.",
      image: "book3/b3ch15.png",
      narrative: "An echo of Joel's past manifests—the Widow's Watch, a spirit formed from the grief of those left behind when heroes fall. It takes the form of Joel's lost love, not to torment him but to show him that grief is not betrayal, that moving on is not forgetting. Joel must confront the hardest truth: that those who love us want us to live, even when they are gone. The battle is one of release, of giving permission to be happy without the ones we have lost.",
      codexNote: "The Widow's Watch is not a ghost but a projection of unresolved grief. It exists only where the living refuse to let go.",
      systemHints: ["Joel must speak to the Watch, not fight it", "His party's presence reminds him he is not alone", "The Watch fades when Joel chooses to live fully"],
      quest: {
        title: "Release the Grief",
        desc: "Help Joel confront the Widow's Watch. Choose life over eternal mourning.",
        rewards: [{ type: "xp", value: 700, label: "+700 XP" }, { type: "item", label: "Released Grief" }],
        outcome: "Joel says goodbye, not with sorrow but with gratitude. The Watch smiles and fades, finally at peace.",
        hasBattle: true
      },
      battle: {
        bossName: "Widow's Watch", bossIcon: "💔",
        bossHP: 140, bossMaxHP: 140, bossAC: 16,
        phases: [
          { name: "Mourning", threshold: 70, ac: 16, attack: "Lingering Sorrow", damage: 14, desc: "The Watch wraps you in the comfort of grief." },
          { name: "Memory", threshold: 45, ac: 18, attack: "Haunting Love", damage: 18, desc: "She shows you what you have lost, making it harder to let go." },
          { name: "Release", threshold: 20, ac: 14, attack: "Final Embrace", damage: 22, desc: "She offers one last chance to stay in the past." }
        ]
      }
    },
{
      id: 45, book: 3, title: "The Roads Senedra Walked",
      quote: "The map is not the territory. The path is not the journey.",
      image: "book3/b3ch16.png",
      narrative: "Senedra confronts the Vanished Guide, a spirit who represents the paths not taken, the maps that lead nowhere, the plans that fell apart. Senedra has always been the planner, the scout, the one who needs to know the way forward. But the Guide shows her that some journeys have no map, that the most important paths are the ones we forge ourselves. The battle is about trusting the unknown, about walking forward without knowing where the road leads.",
      codexNote: "The Vanished Guide was once a cartographer who mapped every road in existence. He vanished when he realized that the most important roads cannot be mapped.",
      systemHints: ["Senedra must abandon her maps to defeat the Guide", "The Guide is strongest when you try to plan", "Trust and intuition are your weapons"],
      quest: {
        title: "Walk Without a Map",
        desc: "Help Senedra confront the Vanished Guide. Learn to trust the unmapped path.",
        rewards: [{ type: "xp", value: 650, label: "+650 XP" }, { type: "item", label: "Unmapped Road" }],
        outcome: "Senedra burns her maps—not in anger, but in liberation. The Guide bows and steps aside, honoring her courage.",
        hasBattle: true
      },
      battle: {
        bossName: "Vanished Guide", bossIcon: "🗺️",
        bossHP: 130, bossMaxHP: 130, bossAC: 17,
        phases: [
          { name: "Direction", threshold: 70, ac: 17, attack: "Wrong Turn", damage: 14, desc: "The Guide leads you astray, making you doubt your path." },
          { name: "Lost", threshold: 45, ac: 19, attack: "Endless Maze", damage: 18, desc: "He traps you in a labyrinth of plans and contingencies." },
          { name: "Found", threshold: 20, ac: 14, attack: "Final Direction", damage: 22, desc: "When you stop following, the Guide has no power left." }
        ]
      }
    },
{
      id: 46, book: 3, title: "The Room That Waited",
      quote: "To be needed is not the same as to be loved. The room waits, but love does not wait—it arrives.",
      image: "book3/b3ch17.png",
      narrative: "Eliz confronts the Room That Waited, a space that represents her fear of being forgotten, of having value only when she is needed. The room is filled with versions of herself—each one waiting for someone to need her, to validate her existence. Eliz must confront the truth that her worth is not dependent on being useful, that she is loved for who she is, not for what she can do. The battle is one of self-acceptance, of choosing to exist without needing to earn the right.",
      codexNote: "The Room That Waited is a manifestation of conditional self-worth. It exists wherever someone believes they must be needed to be loved.",
      systemHints: ["Eliz must enter the room alone but accept help to leave", "The room's illusions show her being forgotten", "Love, not need, is the key"],
      quest: {
        title: "Leave the Room",
        desc: "Help Eliz confront the Room That Waited. Choose love over being needed.",
        rewards: [{ type: "xp", value: 650, label: "+650 XP" }, { type: "item", label: "Unconditional Love" }],
        outcome: "Eliz walks out of the room, not because anyone needs her, but because she chooses to be present. The room dissolves, no longer needed.",
        hasBattle: true
      },
      battle: {
        bossName: "The Room", bossIcon: "🚪",
        bossHP: 150, bossMaxHP: 150, bossAC: 16,
        phases: [
          { name: "Waiting", threshold: 70, ac: 16, attack: "Loneliness", damage: 15, desc: "The room makes you feel forgotten and unneeded." },
          { name: "Need", threshold: 45, ac: 18, attack: "Desperate Plea", damage: 19, desc: "It begs you to stay, promising you are essential." },
          { name: "Release", threshold: 20, ac: 14, attack: "Final Wait", damage: 22, desc: "The room clings to you, afraid to be empty." }
        ]
      }
    },
{
      id: 47, book: 3, title: "The Boy Who Stopped Checking",
      quote: "Preparation is wisdom. But wisdom knows when to act.",
      image: "book3/b3ch18.png",
      narrative: "Zaki faces the Rustbound, a creature of endless preparation who never acts. It represents Zaki's own tendency to plan, to prepare, to wait for the perfect moment that never comes. The Rustbound has been sharpening its sword for centuries, waiting for the right time to strike. Zaki must confront the truth that no plan survives contact with reality, that the perfect moment is the one you choose to seize. The battle is about the courage to act imperfectly, to move forward without knowing every step.",
      codexNote: "The Rustbound was once a warrior who waited so long for the perfect moment that he rusted into immobility. He is a warning against the paralysis of perfectionism.",
      systemHints: ["Zaki must act without a perfect plan", "The Rustbound is invulnerable while preparing", "Strike while he is still planning"],
      quest: {
        title: "Act Without Perfection",
        desc: "Help Zaki confront the Rustbound. Choose imperfect action over perfect inaction.",
        rewards: [{ type: "xp", value: 650, label: "+650 XP" }, { type: "item", label: "Imperfect Courage" }],
        outcome: "Zaki strikes without a plan. The Rustbound shatters, unable to comprehend action without preparation. Zaki learns that courage is not the absence of fear but the willingness to move despite it.",
        hasBattle: true
      },
      battle: {
        bossName: "Rustbound", bossIcon: "⚔️",
        bossHP: 160, bossMaxHP: 160, bossAC: 20,
        phases: [
          { name: "Preparation", threshold: 80, ac: 20, attack: "Sharpen", damage: 10, desc: "The Rustbound prepares endlessly, becoming harder to hit but dealing less damage." },
          { name: "Hesitation", threshold: 55, ac: 18, attack: "Almost Strike", damage: 16, desc: "He almost acts, but pulls back at the last moment." },
          { name: "Regret", threshold: 30, ac: 14, attack: "Too Late", damage: 25, desc: "Realizing he waited too long, the Rustbound attacks with desperate, rusty fury." }
        ]
      }
    },
{
      id: 48, book: 3, title: "The Storm That Never Broke",
      quote: "The storm that never breaks is the heaviest burden of all.",
      image: "book3/b3ch19.png",
      narrative: "Mezstorm faces his own storm made manifest—a tempest that has been building for years, the accumulation of every emotion he has suppressed, every word he has left unsaid, every feeling he has buried beneath his calm exterior. The Storm That Never Broke is not an enemy but a release, a catharsis that Mezstorm has been avoiding. He must let the storm break, must allow himself to feel the full weight of his emotions, even if it means being vulnerable, even if it means being seen as weak. The battle is one of emotional honesty, of the courage to feel.",
      codexNote: "Mezstorm's storm magic has always been a metaphor for his emotional state. The storm that never broke is the emotions he has never allowed himself to feel.",
      systemHints: ["Mezstorm must let the storm break—suppressing it makes it stronger", "The storm damages everyone, including allies", "Healing is essential during this battle"],
      quest: {
        title: "Let the Storm Break",
        desc: "Help Mezstorm confront his unbroken storm. Choose emotional honesty over stoic silence.",
        rewards: [{ type: "xp", value: 700, label: "+700 XP" }, { type: "item", label: "Broken Storm" }],
        outcome: "The storm breaks. Mezstorm weeps, rages, laughs, and finally rests. The storm passes, leaving behind clear skies and a heart that is lighter for having felt.",
        hasBattle: true
      },
      battle: {
        bossName: "Unbroken Storm", bossIcon: "⛈️",
        bossHP: 170, bossMaxHP: 170, bossAC: 15,
        phases: [
          { name: "Building", threshold: 70, ac: 15, attack: "Pressure", damage: 16, desc: "The storm builds, the pressure mounting unbearably." },
          { name: "Thunder", threshold: 45, ac: 17, attack: "Lightning Strike", damage: 22, desc: "The storm begins to crack, releasing bolts of suppressed emotion." },
          { name: "Catharsis", threshold: 20, ac: 13, attack: "Deluge", damage: 28, desc: "The storm breaks completely, flooding everything with raw feeling." }
        ]
      }
    },
{
      id: 49, book: 3, title: "What The Ember Remembers",
      quote: "Even the smallest ember remembers the fire it came from.",
      image: "book3/b3ch20.png",
      narrative: "Soel confronts the Fading Familiar, a spirit that represents the bonds we outgrow. Soel has grown from a child hiding in fortress shadows to a young companion who has found her place in the world. But growth means leaving things behind, and the Familiar represents the fear that in growing up, we lose the magic of who we were. Soel must choose: cling to the familiar comfort of childhood, or step forward into the unknown of adulthood. The battle is about the courage to grow, to change, to become.",
      codexNote: "The Fading Familiar is not a loss but a transformation. It represents the parts of ourselves we must release to become who we are meant to be.",
      systemHints: ["Soel must choose growth over comfort", "The Familiar is strongest when she hesitates", "Her friends' support reminds her she is not alone"],
      quest: {
        title: "Choose to Grow",
        desc: "Help Soel confront the Fading Familiar. Embrace growth without fear of losing yourself.",
        rewards: [{ type: "xp", value: 650, label: "+650 XP" }, { type: "item", label: "Growing Ember" }],
        outcome: "Soel thanks the Familiar for its protection and steps forward. The Familiar smiles and fades, its work complete. Soel is no longer a child.",
        hasBattle: true
      },
      battle: {
        bossName: "Fading Familiar", bossIcon: "🔥",
        bossHP: 130, bossMaxHP: 130, bossAC: 16,
        phases: [
          { name: "Comfort", threshold: 70, ac: 16, attack: "Nostalgia", damage: 13, desc: "The Familiar wraps you in the warmth of what was." },
          { name: "Fear", threshold: 45, ac: 18, attack: "Growing Pains", damage: 18, desc: "It shows you the pain of growing up, trying to make you stay." },
          { name: "Release", threshold: 20, ac: 14, attack: "Final Hug", damage: 22, desc: "The Familiar holds on tight, afraid to be forgotten." }
        ]
      }
    },
{
      id: 50, book: 3, title: "What The Ledger Never Said",
      quote: "The ledger records what was given. But love records what was felt.",
      image: "book3/b3ch21.png",
      narrative: "Aisyah faces the Echo of herself—a version that kept score, that measured love in sacrifices made, that believed relationships were transactions to be balanced. The Echo shows Aisyah every time she gave too much, every time she held back, every time she confused sacrifice with love. The battle is about understanding that love is not a ledger, that bonds are not debts to be paid. Aisyah must forgive herself for the times she loved conditionally and choose to love without keeping score.",
      codexNote: "The Echo is not a villain but a teacher. It shows us the patterns we must break to love more fully.",
      systemHints: ["Aisyah must reject the ledger to weaken the Echo", "The Echo attacks with guilt and obligation", "Forgiveness is the only weapon that works"],
      quest: {
        title: "Burn the Ledger",
        desc: "Help Aisyah confront her Echo. Choose love without scorekeeping.",
        rewards: [{ type: "xp", value: 650, label: "+650 XP" }, { type: "item", label: "Unwritten Ledger" }],
        outcome: "Aisyah tears the ledger in half. The Echo smiles and merges with her, becoming part of a whole that no longer needs to keep score.",
        hasBattle: true
      },
      battle: {
        bossName: "Echo of Aisyah", bossIcon: "📊",
        bossHP: 140, bossMaxHP: 140, bossAC: 17,
        phases: [
          { name: "Calculation", threshold: 70, ac: 17, attack: "Balance Sheet", damage: 15, desc: "The Echo calculates every debt, every sacrifice, every imbalance." },
          { name: "Resentment", threshold: 45, ac: 19, attack: "Unpaid Debt", damage: 19, desc: "She weaponizes old grievances, making you feel owed." },
          { name: "Forgiveness", threshold: 20, ac: 14, attack: "Final Tally", damage: 23, desc: "The Echo demands one last accounting before she can rest." }
        ]
      }
    },
{
      id: 51, book: 3, title: "The Version That Stopped Pretending",
      quote: "The mask we wear to survive can become the face we forget is not our own.",
      image: "book3/b3ch22.png",
      narrative: "San faces the most difficult enemy yet: the version of themselves that stopped pretending. This is San without the mask, without the armor, without the brave face they have worn for the entire journey. The Tired Version is exhausted, overwhelmed, and honest about it. It shows San every moment they faked strength, every time they said 'I am fine' when they were not, every time they carried more than they could bear. The battle is not about defeating this version but about embracing it, about giving permission to be tired, to be vulnerable, to be human.",
      codexNote: "The Tired Version is not weakness—it is truth. It represents the parts of ourselves we hide to protect others, and the courage it takes to stop hiding.",
      systemHints: ["San cannot defeat the Tired Version—only accept it", "The party must support San in this vulnerability", "Rest is the ultimate victory"],
      quest: {
        title: "Embrace Exhaustion",
        desc: "Help San confront the Tired Version. Choose authenticity over performance.",
        rewards: [{ type: "xp", value: 700, label: "+700 XP" }, { type: "item", label: "Authentic Self" }],
        outcome: "San stops pretending. They admit they are tired, they are scared, they are human. The Tired Version smiles and embraces them, becoming one. For the first time, San is whole.",
        hasBattle: true
      },
      battle: {
        bossName: "The Tired Version", bossIcon: "😔",
        bossHP: 180, bossMaxHP: 180, bossAC: 16,
        phases: [
          { name: "Exhaustion", threshold: 75, ac: 16, attack: "Burnout", damage: 16, desc: "The Tired Version shows you the cost of pretending." },
          { name: "Vulnerability", threshold: 50, ac: 14, attack: "Raw Truth", damage: 20, desc: "It strips away your defenses, forcing you to feel everything." },
          { name: "Acceptance", threshold: 25, ac: 18, attack: "Final Rest", damage: 24, desc: "The Tired Version asks you to finally stop fighting yourself." }
        ]
      }
    },
{
      id: 52, book: 3, title: "Tomorrow",
      quote: "Tomorrow is not a promise. It is a choice we make every day.",
      image: "book3/b3ch23.png",
      narrative: "There is no boss in this chapter. No battle, no quest, no reward. Only the party, together, sitting on a hill overlooking Daybreak. They talk about nothing and everything—the weather, the future, the past, the jokes that only they understand. San opens the Aethon Codex one last time and finds a blank page. The Codex whispers: 'The story is yours now. Write it.' And so they do—not with spells or swords, but with laughter, with tears, with the simple, profound act of being together. The journey does not end. It simply becomes life. And life, they discover, is the greatest adventure of all.",
      codexNote: "The Aethon Codex is complete. But every ending is a beginning, and the blank pages are the most important part of any book.",
      systemHints: ["Talk to every party member", "Enjoy the moment—there are no more battles", "The Codex has one final secret for those who look closely"],
      quest: {
        title: "Live",
        desc: "There is no quest. Only life. Choose to live it.",
        rewards: [{ type: "xp", value: 1000, label: "+1000 XP" }, { type: "item", label: "Tomorrow" }],
        outcome: "The Aethon Codex is complete. The story of San and the party becomes legend, passed down through generations. But the true ending is not in the book—it is in every tomorrow they choose to face together.",
        hasBattle: false
      }
    },
    {
      id:53, book:4, title:"The Door Built on Purpose",
      quote:"I don't let it finish. I stop what was always going to be breaking.",
      image:"book4/b4ch1_compress.png",
      narrative:"The Architect requests the party's return. The Breaking is presented as something that can be built, and the party assembles for the next phase.",
      codexNote:"Book 4 source chapter. Classification: story / system",
      systemHints:["Read the chapter artwork and journal entry.", "Book 4 chapters unlock sequentially.", ""],
      quest:{
        title:"The Door Built on Purpose",
        desc:"Read and complete Book 4, Chapter 1: The Door Built on Purpose.",
        rewards:[{type:"xp",value:510,label:"+510 XP"}],
        outcome:"The Architect requests the party's return. The Breaking is presented as something that can be built, and the party assembles for the next phase.",
        hasBattle:false
      }
    },
    {
      id:54, book:4, title:"The Tribunal of Every Echo",
      quote:"Every grief you have survived, fused into one question: why do you keep choosing to stay?",
      image:"book4/b4ch2_compress.png",
      narrative:"The Tribunal gathers echoes and archived versions of the party. San and the others are tested by grief, memory, and competing versions of what they should choose.",
      codexNote:"Book 4 source chapter. Classification: combat. Boss encounter: The Splinter Court.",
      systemHints:["Read the chapter artwork and journal entry.", "Book 4 chapters unlock sequentially.", ""],
      quest:{
        title:"The Splinter Court",
        desc:"Confront The Splinter Court. Read and complete Book 4, Chapter 2: The Tribunal of Every Echo.",
        rewards:[{type:"xp",value:830,label:"+830 XP"}],
        outcome:"The Tribunal gathers echoes and archived versions of the party. San and the others are tested by grief, memory, and competing versions of what they should choose.",
        hasBattle:true
      },
      battle:{
        bossName:"The Splinter Court", bossIcon:"⚔️",
        bossHP:320, bossMaxHP:320, bossAC:16,
        phases:[
          {name:"Opening",threshold:211,ac:16,attack:"Signature Strike",damage:12,desc:"The encounter begins."},
          {name:"Escalation",threshold:105,ac:18,attack:"Escalating Pressure",damage:16,desc:"The encounter intensifies."},
          {name:"Final Phase",threshold:0,ac:19,attack:"Final Measure",damage:19,desc:"The final phase of the encounter."}
        ]
      }
    },
    {
      id:55, book:4, title:"The First Break",
      quote:"It can be mended. We just proved it.",
      image:"book4/b4ch3_compress.png",
      narrative:"Below the Tower, the party finds that the echoes are records rather than memories. The First Door is mended and a new world function is unlocked.",
      codexNote:"Book 4 source chapter. Classification: repair / story",
      systemHints:["Read the chapter artwork and journal entry.", "Book 4 chapters unlock sequentially.", ""],
      quest:{
        title:"The First Break",
        desc:"Read and complete Book 4, Chapter 3: The First Break.",
        rewards:[{type:"xp",value:630,label:"+630 XP"}],
        outcome:"Below the Tower, the party finds that the echoes are records rather than memories. The First Door is mended and a new world function is unlocked.",
        hasBattle:false
      }
    },
    {
      id:56, book:4, title:"The Slow Work",
      quote:"Mending is slower than breaking.",
      image:"book4/b4ch4_compress.png",
      narrative:"The first repair begins. The Unmended forms from what was left behind, and the party works together to stabilize a fracture one seam at a time.",
      codexNote:"Book 4 source chapter. Classification: combat / repair. Boss encounter: The Unmended.",
      systemHints:["Read the chapter artwork and journal entry.", "Book 4 chapters unlock sequentially.", ""],
      quest:{
        title:"The Unmended",
        desc:"Confront The Unmended. Read and complete Book 4, Chapter 4: The Slow Work.",
        rewards:[{type:"xp",value:1010,label:"+1010 XP"}],
        outcome:"The first repair begins. The Unmended forms from what was left behind, and the party works together to stabilize a fracture one seam at a time.",
        hasBattle:true
      },
      battle:{
        bossName:"The Unmended", bossIcon:"⚔️",
        bossHP:380, bossMaxHP:380, bossAC:14,
        phases:[
          {name:"Opening",threshold:250,ac:14,attack:"Signature Strike",damage:14,desc:"The encounter begins."},
          {name:"Escalation",threshold:125,ac:16,attack:"Escalating Pressure",damage:18,desc:"The encounter intensifies."},
          {name:"Final Phase",threshold:0,ac:17,attack:"Final Measure",damage:21,desc:"The final phase of the encounter."}
        ]
      }
    },
    {
      id:57, book:4, title:"A Setback Is Not a Failure",
      quote:"Not every day of mending goes forward.",
      image:"book4/b4ch5_compress.png",
      narrative:"A previously mended seam reopens. The Relapse changes tactics, forcing the party to repair the same break again without treating the setback as failure.",
      codexNote:"Book 4 source chapter. Classification: combat / recurring fracture. Boss encounter: The Relapse.",
      systemHints:["Read the chapter artwork and journal entry.", "Book 4 chapters unlock sequentially.", ""],
      quest:{
        title:"The Relapse",
        desc:"Confront The Relapse. Read and complete Book 4, Chapter 5: A Setback Is Not a Failure.",
        rewards:[{type:"xp",value:1100,label:"+1100 XP"}],
        outcome:"A previously mended seam reopens. The Relapse changes tactics, forcing the party to repair the same break again without treating the setback as failure.",
        hasBattle:true
      },
      battle:{
        bossName:"The Relapse", bossIcon:"⚔️",
        bossHP:410, bossMaxHP:410, bossAC:15,
        phases:[
          {name:"Opening",threshold:270,ac:15,attack:"Signature Strike",damage:15,desc:"The encounter begins."},
          {name:"Escalation",threshold:135,ac:17,attack:"Escalating Pressure",damage:19,desc:"The encounter intensifies."},
          {name:"Final Phase",threshold:0,ac:18,attack:"Final Measure",damage:22,desc:"The final phase of the encounter."}
        ]
      }
    },
    {
      id:58, book:4, title:"The Question of After",
      quote:"The Question of After",
      image:"book4/b4ch6_compress.png",
      narrative:"The party confronts the question of what comes after repair. An enduring gift from Aethon's will is revealed, tied to purpose rather than simple power.",
      codexNote:"Book 4 source chapter. Classification: story / repair",
      systemHints:["Read the chapter artwork and journal entry.", "Book 4 chapters unlock sequentially.", ""],
      quest:{
        title:"The Question of After",
        desc:"Read and complete Book 4, Chapter 6: The Question of After.",
        rewards:[{type:"xp",value:810,label:"+810 XP"}],
        outcome:"The party confronts the question of what comes after repair. An enduring gift from Aethon's will is revealed, tied to purpose rather than simple power.",
        hasBattle:false
      }
    },
    {
      id:59, book:4, title:"Everyone, Together",
      quote:"When eight choose together, even a broken world can be remade.",
      image:"book4/b4ch7_compress.png",
      narrative:"The Unity Ward tests whether the full party can choose together. Unity is confirmed when every member acts as part of the whole.",
      codexNote:"Book 4 source chapter. Classification: party trial",
      systemHints:["Read the chapter artwork and journal entry.", "Book 4 chapters unlock sequentially.", ""],
      quest:{
        title:"Everyone, Together",
        desc:"Read and complete Book 4, Chapter 7: Everyone, Together.",
        rewards:[{type:"xp",value:870,label:"+870 XP"}],
        outcome:"The Unity Ward tests whether the full party can choose together. Unity is confirmed when every member acts as part of the whole.",
        hasBattle:false
      }
    },
    {
      id:60, book:4, title:"Daybreak",
      quote:"Not an ending. A morning.",
      image:"book4/b4ch8_compress.png",
      narrative:"Daybreak appears as a world-spirit confirmation. The party carries what they have learned through the door and is formally recognized as Legends of Daybreak.",
      codexNote:"Book 4 source chapter. Classification: story / world-spirit",
      systemHints:["Read the chapter artwork and journal entry.", "Book 4 chapters unlock sequentially.", ""],
      quest:{
        title:"Daybreak",
        desc:"Read and complete Book 4, Chapter 8: Daybreak.",
        rewards:[{type:"xp",value:600,label:"+600 XP"}],
        outcome:"Daybreak appears as a world-spirit confirmation. The party carries what they have learned through the door and is formally recognized as Legends of Daybreak.",
        hasBattle:false
      }
    },
    {
      id:61, book:4, title:"The Pace of Tomorrow",
      quote:"Growing no longer has to be a sprint.",
      image:"book4/b4ch9_compress.png",
      narrative:"The pace changes from sprinting to continuing. The party prepares for what comes next without needing to force tomorrow.",
      codexNote:"Book 4 source chapter. Classification: story / transition",
      systemHints:["Read the chapter artwork and journal entry.", "Book 4 chapters unlock sequentially.", ""],
      quest:{
        title:"The Pace of Tomorrow",
        desc:"Read and complete Book 4, Chapter 9: The Pace of Tomorrow.",
        rewards:[{type:"xp",value:990,label:"+990 XP"}],
        outcome:"The pace changes from sprinting to continuing. The party prepares for what comes next without needing to force tomorrow.",
        hasBattle:false
      }
    },
    {
      id:62, book:4, bonus:true, title:"The Door We Leave Open",
      quote:"The Door We Leave Open",
      image:"book4/b4bonus_compress.png",
      narrative:"A bonus relationship chapter placed between Book 4 Chapters 9 and 10. It is a quiet continuation rather than a conventional quest.",
      codexNote:"Bonus chapter; deliberately placed after Chapter 9 and before Chapter 10.",
      systemHints:["Bonus chapter.","No combat.","Read before continuing to Chapter 10."],
      quest:{
        title:"The Door We Leave Open",
        desc:"Read the Book 4 bonus chapter before proceeding to Chapter 10.",
        rewards:[{type:"xp",value:350,label:"+350 XP"}],
        outcome:"The door remains open for what comes next.",
        hasBattle:false
      }
    },
    {
      id:63, book:4, title:"The Children Before Me",
      quote:"The Children Before Me",
      image:"book4/b4ch10_compress.png",
      narrative:"San begins uncovering more about the children before her and the fears surrounding their parents. A memory fragment becomes available.",
      codexNote:"Book 4 source chapter. Classification: story / memory",
      systemHints:["Read the chapter artwork and journal entry.", "Book 4 chapters unlock sequentially.", ""],
      quest:{
        title:"The Children Before Me",
        desc:"Read and complete Book 4, Chapter 10: The Children Before Me.",
        rewards:[{type:"xp",value:1050,label:"+1050 XP"}],
        outcome:"San begins uncovering more about the children before her and the fears surrounding their parents. A memory fragment becomes available.",
        hasBattle:false
      }
    },
    {
      id:64, book:4, title:"The Things We Choose Not to Repeat",
      quote:"The Things We Choose Not to Repeat",
      image:"book4/b4ch11_compress.png",
      narrative:"Joel and San discuss family choices and the things they do not want to repeat. A memory fragment concerning Joel's family is unlocked.",
      codexNote:"Book 4 source chapter. Classification: story / memory",
      systemHints:["Read the chapter artwork and journal entry.", "Book 4 chapters unlock sequentially.", ""],
      quest:{
        title:"The Things We Choose Not to Repeat",
        desc:"Read and complete Book 4, Chapter 11: The Things We Choose Not to Repeat.",
        rewards:[{type:"xp",value:1110,label:"+1110 XP"}],
        outcome:"Joel and San discuss family choices and the things they do not want to repeat. A memory fragment concerning Joel's family is unlocked.",
        hasBattle:false
      }
    },
    {
      id:65, book:4, title:"The Things We Carry Home",
      quote:"The Things We Carry Home",
      image:"book4/b4ch12_compress.png",
      narrative:"The conversation about their parents continues into what the party carries home. Joel's family memory develops further.",
      codexNote:"Book 4 source chapter. Classification: story / memory",
      systemHints:["Read the chapter artwork and journal entry.", "Book 4 chapters unlock sequentially.", ""],
      quest:{
        title:"The Things We Carry Home",
        desc:"Read and complete Book 4, Chapter 12: The Things We Carry Home.",
        rewards:[{type:"xp",value:1170,label:"+1170 XP"}],
        outcome:"The conversation about their parents continues into what the party carries home. Joel's family memory develops further.",
        hasBattle:false
      }
    },
    {
      id:66, book:4, title:"The Wayfinder",
      quote:"The Wayfinder",
      image:"book4/b4ch13_compress.png",
      narrative:"The family chooses to keep walking. The Wayfinder presents a set of trials and reveals a new path beyond the repaired world.",
      codexNote:"Book 4 source chapter. Classification: exploration / boss. Boss encounter: The Wayfinder.",
      systemHints:["Read the chapter artwork and journal entry.", "Book 4 chapters unlock sequentially.", ""],
      quest:{
        title:"The Wayfinder",
        desc:"Confront The Wayfinder. Read and complete Book 4, Chapter 13: The Wayfinder.",
        rewards:[{type:"xp",value:900,label:"+900 XP"}],
        outcome:"The family chooses to keep walking. The Wayfinder presents a set of trials and reveals a new path beyond the repaired world.",
        hasBattle:true
      },
      battle:{
        bossName:"The Wayfinder", bossIcon:"⚔️",
        bossHP:650, bossMaxHP:650, bossAC:15,
        phases:[
          {name:"Opening",threshold:429,ac:15,attack:"Signature Strike",damage:23,desc:"The encounter begins."},
          {name:"Escalation",threshold:214,ac:17,attack:"Escalating Pressure",damage:27,desc:"The encounter intensifies."},
          {name:"Final Phase",threshold:0,ac:18,attack:"Final Measure",damage:30,desc:"The final phase of the encounter."}
        ]
      }
    },
    {
      id:67, book:4, title:"The Borrowed Coast",
      quote:"The Borrowed Coast remembers everyone who ever passed through it.",
      image:"book4/b4ch14_compress.png",
      narrative:"The Borrowed Coast is discovered: a place that remembers everyone who has passed through it. The Tidereaver guards the new territory.",
      codexNote:"Book 4 source chapter. Classification: combat. Boss encounter: The Tidereaver.",
      systemHints:["Read the chapter artwork and journal entry.", "Book 4 chapters unlock sequentially.", ""],
      quest:{
        title:"The Tidereaver",
        desc:"Confront The Tidereaver. Read and complete Book 4, Chapter 14: The Borrowed Coast.",
        rewards:[{type:"xp",value:1910,label:"+1910 XP"}],
        outcome:"The Borrowed Coast is discovered: a place that remembers everyone who has passed through it. The Tidereaver guards the new territory.",
        hasBattle:true
      },
      battle:{
        bossName:"The Tidereaver", bossIcon:"⚔️",
        bossHP:680, bossMaxHP:680, bossAC:16,
        phases:[
          {name:"Opening",threshold:448,ac:16,attack:"Signature Strike",damage:24,desc:"The encounter begins."},
          {name:"Escalation",threshold:224,ac:18,attack:"Escalating Pressure",damage:28,desc:"The encounter intensifies."},
          {name:"Final Phase",threshold:0,ac:19,attack:"Final Measure",damage:31,desc:"The final phase of the encounter."}
        ]
      }
    },
    {
      id:68, book:4, title:"The Salt Debt",
      quote:"The Salt Debt runs on obligation.",
      image:"book4/b4ch15_compress.png",
      narrative:"The Salt Debt is a settlement built around obligation rather than ordinary trade. The Ledgerbound embodies what has accumulated there.",
      codexNote:"Book 4 source chapter. Classification: combat. Boss encounter: The Ledgerbound.",
      systemHints:["Read the chapter artwork and journal entry.", "Book 4 chapters unlock sequentially.", ""],
      quest:{
        title:"The Ledgerbound",
        desc:"Confront The Ledgerbound. Read and complete Book 4, Chapter 15: The Salt Debt.",
        rewards:[{type:"xp",value:2000,label:"+2000 XP"}],
        outcome:"The Salt Debt is a settlement built around obligation rather than ordinary trade. The Ledgerbound embodies what has accumulated there.",
        hasBattle:true
      },
      battle:{
        bossName:"The Ledgerbound", bossIcon:"⚔️",
        bossHP:710, bossMaxHP:710, bossAC:17,
        phases:[
          {name:"Opening",threshold:468,ac:17,attack:"Signature Strike",damage:25,desc:"The encounter begins."},
          {name:"Escalation",threshold:234,ac:19,attack:"Escalating Pressure",damage:29,desc:"The encounter intensifies."},
          {name:"Final Phase",threshold:0,ac:20,attack:"Final Measure",damage:32,desc:"The final phase of the encounter."}
        ]
      }
    },
    {
      id:69, book:4, title:"The Undertow",
      quote:"The Undertow",
      image:"book4/b4ch16_compress.png",
      narrative:"The Undertow carries what the Salt Debt never paid for a very long time. The party confronts what can no longer be settled normally.",
      codexNote:"Book 4 source chapter. Classification: combat. Boss encounter: The Undertow.",
      systemHints:["Read the chapter artwork and journal entry.", "Book 4 chapters unlock sequentially.", ""],
      quest:{
        title:"The Undertow",
        desc:"Confront The Undertow. Read and complete Book 4, Chapter 16: The Undertow.",
        rewards:[{type:"xp",value:2090,label:"+2090 XP"}],
        outcome:"The Undertow carries what the Salt Debt never paid for a very long time. The party confronts what can no longer be settled normally.",
        hasBattle:true
      },
      battle:{
        bossName:"The Undertow", bossIcon:"⚔️",
        bossHP:740, bossMaxHP:740, bossAC:14,
        phases:[
          {name:"Opening",threshold:488,ac:14,attack:"Signature Strike",damage:26,desc:"The encounter begins."},
          {name:"Escalation",threshold:244,ac:16,attack:"Escalating Pressure",damage:30,desc:"The encounter intensifies."},
          {name:"Final Phase",threshold:0,ac:17,attack:"Final Measure",damage:33,desc:"The final phase of the encounter."}
        ]
      }
    },
    {
      id:70, book:4, title:"The Horizon Keeper",
      quote:"The Horizon Keeper",
      image:"book4/b4ch17_compress.png",
      narrative:"The Horizon Keeper stands at the end of the Book IV journey. The party reaches the horizon of The Open Doors and completes the act.",
      codexNote:"Book 4 source chapter. Classification: combat / act ending. Boss encounter: The Horizon Keeper.",
      systemHints:["Read the chapter artwork and journal entry.", "Book 4 chapters unlock sequentially.", "The free-leveling zone follows Book 4."],
      quest:{
        title:"The Horizon Keeper",
        desc:"Confront The Horizon Keeper. Read and complete Book 4, Chapter 17: The Horizon Keeper.",
        rewards:[{type:"xp",value:2180,label:"+2180 XP"}],
        outcome:"The Horizon Keeper stands at the end of the Book IV journey. The party reaches the horizon of The Open Doors and completes the act.",
        hasBattle:true
      },
      battle:{
        bossName:"The Horizon Keeper", bossIcon:"⚔️",
        bossHP:770, bossMaxHP:770, bossAC:15,
        phases:[
          {name:"Opening",threshold:508,ac:15,attack:"Signature Strike",damage:27,desc:"The encounter begins."},
          {name:"Escalation",threshold:254,ac:17,attack:"Escalating Pressure",damage:31,desc:"The encounter intensifies."},
          {name:"Final Phase",threshold:0,ac:18,attack:"Final Measure",damage:34,desc:"The final phase of the encounter."}
        ]
      }
    }
],
  partyMembers: [
    {
      id: "san", name: "San", role: "Sorcerer", icon: "🔮",
      desc: "The protagonist. A sorcerer who wields memory magic and the power of the Aethon Codex. In Book 3, San has grown from an uncertain apprentice into a leader who understands that true strength comes from vulnerability.",
      stats: { hp: 80, maxHP: 80, mp: 100, maxMP: 100, atk: 45, def: 40, mag: 85, spd: 60 },
      skills: ["Firebolt", "Shield", "Memory Surge", "Arcane Blast"],
      joined: true, active: true,
      spells: [
        { name: "Firebolt", icon: "🔥", cost: 0, damage: "2d6", target: "enemy", type: "attack", desc: "Hurl a mote of fire. Basic attack." },
        { name: "Shield", icon: "🛡️", cost: 0, effect: "buff_def", target: "self", type: "defense", desc: "+2 AC for 2 turns." },
        { name: "Memory Surge", icon: "✨", cost: 15, damage: "4d8", target: "enemy", type: "attack", desc: "Channel lost memories into raw power." },
        { name: "Arcane Blast", icon: "💥", cost: 25, damage: "3d10", target: "all_enemies", type: "attack", desc: "Unleash a wave of arcane energy." }
      ]
    },
    {
      id: "joel", name: "Joel", role: "Paladin", icon: "⚔️",
      desc: "Former captain of the Silver Guard. A tank and protector who has learned that the strongest shield is the willingness to be vulnerable. His Divine Protection can shield the entire party.",
      stats: { hp: 120, maxHP: 120, mp: 60, maxMP: 60, atk: 70, def: 85, mag: 35, spd: 45 },
      skills: ["Shield Bash", "Divine Protection", "Oath Strike", "Sacred Ground"],
      joined: true, active: true,
      spells: [
        { name: "Shield Bash", icon: "🛡️", cost: 0, damage: "2d8", target: "enemy", type: "attack", desc: "Strike with your shield. Basic attack." },
        { name: "Divine Protection", icon: "✝️", cost: 20, effect: "party_shield", target: "all_allies", type: "defense", desc: "Shield all allies for 2 turns." },
        { name: "Oath Strike", icon: "⚡", cost: 15, damage: "3d8", target: "enemy", type: "attack", desc: "A holy strike fueled by your oath." },
        { name: "Sacred Ground", icon: "🌟", cost: 30, effect: "heal_party", target: "all_allies", type: "heal", desc: "Heal all allies with sacred light." }
      ]
    },
    {
      id: "aisyah", name: "Aisyah", role: "Rogue", icon: "🗡️",
      desc: "A rogue archaeologist who has learned that some treasures cannot be stolen—only given. Her Sneak Attack deals devastating damage to weakened foes.",
      stats: { hp: 70, maxHP: 70, mp: 50, maxMP: 50, atk: 80, def: 40, mag: 30, spd: 90 },
      skills: ["Sneak Attack", "Poison Blade", "Shadow Step", "Coup de Grace"],
      joined: true, active: true,
      spells: [
        { name: "Sneak Attack", icon: "🗡️", cost: 0, damage: "2d6", target: "enemy", type: "attack", desc: "Strike from the shadows. Basic attack." },
        { name: "Poison Blade", icon: "☠️", cost: 10, effect: "poison", target: "enemy", type: "debuff", desc: "Coat your blade in poison." },
        { name: "Shadow Step", icon: "👤", cost: 15, effect: "dodge", target: "self", type: "defense", desc: "Become untargetable for 1 turn." },
        { name: "Coup de Grace", icon: "💀", cost: 25, damage: "5d8", target: "enemy", type: "attack", desc: "A devastating strike to a weakened foe." }
      ]
    },
    {
      id: "eliz", name: "Eliz", role: "Healer", icon: "💚",
      desc: "A former archmage who has learned that the most powerful magic is not destruction but restoration. She carries Resurrect—the ultimate expression of refusing to let go.",
      stats: { hp: 65, maxHP: 65, mp: 120, maxMP: 120, atk: 25, def: 45, mag: 80, spd: 50 },
      skills: ["Heal", "Resurrect", "Purify", "Bless"],
      joined: true, active: true,
      spells: [
        { name: "Heal", icon: "💚", cost: 10, heal: "2d8+5", target: "ally", type: "heal", desc: "Restore health to an ally." },
        { name: "Resurrect", icon: "🌟", cost: 40, effect: "revive", target: "ally", type: "heal", desc: "Bring a fallen ally back with 30% HP." },
        { name: "Purify", icon: "🌿", cost: 15, effect: "cleanse", target: "ally", type: "heal", desc: "Remove all debuffs from an ally." },
        { name: "Bless", icon: "🙏", cost: 20, effect: "buff_atk", target: "all_allies", type: "buff", desc: "Bless all allies. +2 to all rolls for 2 turns." }
      ]
    },
    {
      id: "mezstorm", name: "Mezstorm", role: "Storm Mage", icon: "⚡",
      desc: "A storm mage who has learned that chaos is not destruction but transformation. His Tempest Fury can turn the tide of any battle.",
      stats: { hp: 75, maxHP: 75, mp: 110, maxMP: 110, atk: 40, def: 35, mag: 90, spd: 70 },
      skills: ["Lightning Bolt", "Storm Call", "Tempest Fury", "Thunderclap"],
      joined: true, active: true,
      spells: [
        { name: "Lightning Bolt", icon: "⚡", cost: 0, damage: "2d8", target: "enemy", type: "attack", desc: "Strike with lightning. Basic attack." },
        { name: "Storm Call", icon: "🌩️", cost: 20, damage: "3d8", target: "all_enemies", type: "attack", desc: "Call down lightning on all foes." },
        { name: "Tempest Fury", icon: "🌀", cost: 30, damage: "4d10", target: "enemy", type: "attack", desc: "Unleash the full fury of the storm." },
        { name: "Thunderclap", icon: "🔊", cost: 15, effect: "stun", target: "enemy", type: "debuff", desc: "Deafening thunder that stuns the target." }
      ]
    },
    {
      id: "senedra", name: "Senedra", role: "Scout", icon: "🏹",
      desc: "A scout who has learned that the most important journeys are the ones without maps. Her Reveal Weakness exposes enemy vulnerabilities.",
      stats: { hp: 70, maxHP: 70, mp: 55, maxMP: 55, atk: 65, def: 40, mag: 35, spd: 85 },
      skills: ["Precision Shot", "Reveal Weakness", "Trailblazer", "Hunter's Mark"],
      joined: true, active: true,
      spells: [
        { name: "Precision Shot", icon: "🏹", cost: 0, damage: "2d6", target: "enemy", type: "attack", desc: "A precise ranged strike. Basic attack." },
        { name: "Reveal Weakness", icon: "👁️", cost: 10, effect: "vulnerable", target: "enemy", type: "debuff", desc: "Expose the target's weakness. -3 AC for 2 turns." },
        { name: "Trailblazer", icon: "🦌", cost: 15, effect: "buff_spd", target: "all_allies", type: "buff", desc: "Increase all allies' speed for 2 turns." },
        { name: "Hunter's Mark", icon: "🎯", cost: 20, effect: "marked", target: "enemy", type: "debuff", desc: "Mark the target. All attacks against it deal +50% damage." }
      ]
    },
    {
      id: "zaki", name: "Zaki", role: "Fighter", icon: "🪓",
      desc: "A wandering swordsman who has learned that strength without purpose is merely violence. His Power Strike can break through any defense.",
      stats: { hp: 110, maxHP: 110, mp: 45, maxMP: 45, atk: 85, def: 60, mag: 20, spd: 55 },
      skills: ["Power Strike", "Battle Cry", "Vanguard Charge", "Iron Will"],
      joined: true, active: true,
      spells: [
        { name: "Power Strike", icon: "🪓", cost: 0, damage: "2d10", target: "enemy", type: "attack", desc: "A powerful melee strike. Basic attack." },
        { name: "Battle Cry", icon: "📢", cost: 15, effect: "buff_atk", target: "all_allies", type: "buff", desc: "Rally allies. +3 ATK for 2 turns." },
        { name: "Vanguard Charge", icon: "🐎", cost: 20, damage: "3d10", target: "enemy", type: "attack", desc: "A devastating charge attack." },
        { name: "Iron Will", icon: "🛡️", cost: 15, effect: "buff_def", target: "self", type: "defense", desc: "Harden your resolve. +4 DEF for 2 turns." }
      ]
    },
    {
      id: "soel", name: "Soel", role: "Companion", icon: "🌸",
      desc: "A young companion who has grown from a frightened child into a beacon of hope. Her Inspire ability can turn despair into determination.",
      stats: { hp: 60, maxHP: 60, mp: 90, maxMP: 90, atk: 30, def: 35, mag: 70, spd: 65 },
      skills: ["Inspire", "Comfort", "Detect", "Hope's Light"],
      joined: true, active: true,
      spells: [
        { name: "Inspire", icon: "🌟", cost: 10, effect: "buff_mag", target: "ally", type: "buff", desc: "Inspire an ally. +3 MAG for 2 turns." },
        { name: "Comfort", icon: "🤗", cost: 15, heal: "2d6+3", target: "ally", type: "heal", desc: "Comfort and heal an ally." },
        { name: "Detect", icon: "🔍", cost: 5, effect: "reveal", target: "self", type: "buff", desc: "Reveal hidden traps and secrets." },
        { name: "Hope's Light", icon: "💫", cost: 30, effect: "heal_party", target: "all_allies", type: "heal", desc: "Restore hope to all allies. Heal + remove fear." }
      ]
    }
  ],
  xpPerLevel: [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 6600, 7800, 9100, 10500, 12000, 13600, 15300, 17100, 19000]
};;


/* ============================================================
   CODEX EQUIPMENT FOUNDATION — v12.0
   Phase 1: equipment definitions + compatibility only.
   No loot, traders, inventory mutation, or battle-stat changes.
   ============================================================ */
const CODEX_EQUIPMENT_SLOTS = ['weapon','armor','accessory'];
const CODEX_EQUIPMENT_RULES = {
  san:{weapon:['san_focus'],armor:['caster'],accessory:['any']},
  mezstorm:{weapon:['mezstorm_focus'],armor:['caster'],accessory:['any']},
  eliz:{weapon:['eliz_focus'],armor:['caster'],accessory:['any']},
  joel:{weapon:['sword_shield'],armor:['heavy'],accessory:['any']},
  zaki:{weapon:['two_handed_sword'],armor:['heavy'],accessory:['any']},
  aisyah:{weapon:['twin_blades'],armor:['light'],accessory:['any']},
  senedra:{weapon:['bow'],armor:['light'],accessory:['any']}
};
const CODEX_EQUIPMENT = [
  {id:'san_focus_basic',name:'Aether Focus',slot:'weapon',family:'san_focus',owner:'san',atk:1,magic:1},
  {id:'mez_focus_basic',name:'Storm Focus',slot:'weapon',family:'mezstorm_focus',owner:'mezstorm',atk:1,magic:1},
  {id:'eliz_focus_basic',name:'Healer’s Focus',slot:'weapon',family:'eliz_focus',owner:'eliz',atk:1,magic:1},
  {id:'joel_sword_basic',name:'Knight’s Sword',slot:'weapon',family:'sword_shield',owner:'joel',atk:1},
  {id:'joel_shield_basic',name:'Training Shield',slot:'accessory',family:'any',owner:'joel',defense:1},
  {id:'zaki_sword_basic',name:'Warblade',slot:'weapon',family:'two_handed_sword',owner:'zaki',atk:2},
  {id:'aisyah_blades_basic',name:'Sisterblades',slot:'weapon',family:'twin_blades',owner:'aisyah',atk:1},
  {id:'senedra_bow_basic',name:'Scout Bow',slot:'weapon',family:'bow',owner:'senedra',atk:1}
];
function codexCanEquip(characterId,item){
  if(!item||!characterId)return false;
  if(item.owner&&item.owner!==characterId)return false;
  const rule=CODEX_EQUIPMENT_RULES[characterId];
  return !!(rule&&rule[item.slot]&&
    (rule[item.slot].includes('any')||rule[item.slot].includes(item.family)));
}


/* ============================================================
   CODEX LOOT FOUNDATION — v12.1
   Phase 2: equipment can exist as loot.
   This phase does NOT equip items or alter combat stats.
   ============================================================ */
const CODEX_LOOT = {
  chest: [
    { id:'chest_light_armor_01', itemId:'trailweave_armor', name:'Trailweave Armor', slot:'armor', family:'light', owner:null, defense:2 },
    { id:'chest_accessory_01', itemId:'traveler_charm', name:'Traveler Charm', slot:'accessory', family:'any', owner:null, hp:3 }
  ],
  monster: [
    { id:'monster_caster_drop_01', itemId:'arcane_shard', name:'Arcane Shard', slot:'accessory', family:'any', owner:null, magic:1 },
    { id:'monster_light_drop_01', itemId:'scout_leather', name:'Scout Leather', slot:'armor', family:'light', owner:null, defense:1 }
  ],
  boss: [
    { id:'boss_heavy_drop_01', itemId:'guardian_plate', name:'Guardian Plate', slot:'armor', family:'heavy', owner:null, defense:4 },
    { id:'boss_san_drop_01', itemId:'memory_focus', name:'Memory Focus', slot:'weapon', family:'san_focus', owner:'san', magic:3 }
  ]
};

function getCodexLoot(type) {
  return (CODEX_LOOT[type] || []).map(item => ({...item}));
}

function addCodexLootToInventory(type, itemId) {
  const item = getCodexLoot(type).find(x => x.id === itemId);
  if (!item) return false;
  if (!Array.isArray(gameState.inventory)) gameState.inventory = [];
  gameState.inventory.push({...item});
  return true;
}


/* ============================================================
   CODEX INVENTORY FOUNDATION — v12.2
   Phase 3: loot acquisition.
   Existing save/battle systems are untouched.
   ============================================================ */
function codexEnsureEquipmentInventory() {
  if (!Array.isArray(gameState.codexEquipmentInventory)) {
    gameState.codexEquipmentInventory = [];
  }
  return gameState.codexEquipmentInventory;
}

function codexAcquireLoot(type, itemId) {
  const source = getCodexLoot(type);
  const item = source.find(x => x.id === itemId);
  if (!item) return null;

  const inventory = codexEnsureEquipmentInventory();
  const copy = {...item, acquiredFrom:type};
  inventory.push(copy);
  return copy;
}

function codexInventoryItems() {
  return codexEnsureEquipmentInventory();
}

function codexInventoryLabel(item) {
  return item ? item.name : 'Unknown Item';
}


/* ============================================================
   CODEX LOOT REWARD TEST — v12.3
   One boss reward is wired into the existing victory flow.
   ============================================================ */
const CODEX_BOSS_LOOT_BY_BOSS = {
  'Astral Devourer': [{'itemId': 'devourer_edge', 'name': 'Devourer Edge', 'slot': 'weapon', 'family': 'two_handed_sword', 'atk': 3}],
  'Infernal Tyrant': [{'itemId': 'infernal_guard', 'name': 'Infernal Guard', 'slot': 'armor', 'family': 'heavy', 'defense': 3}],
  'The Veilshaper': [{'itemId': 'veilshaper_focus', 'name': 'Veilshaper Focus', 'slot': 'weapon', 'family': 'mezstorm_focus', 'magic': 3}],
  'Abyssal Leviathan': [{'itemId': 'abyssal_focus', 'name': 'Abyssal Focus', 'slot': 'weapon', 'family': 'san_focus', 'magic': 3}]
};
function codexGetBossLoot(chapterId, bossName) {
  const name = String(bossName || '').trim();
  return (CODEX_BOSS_LOOT_BY_BOSS[name] || []).map(x => ({...x}));
}

function codexAwardBossLoot(chapterId, bossName) {
  const drops = codexGetBossLoot(chapterId, bossName);
  if (!drops.length) return [];

  const inventory = codexEnsureEquipmentInventory();
  const awarded = [];

  drops.forEach(item => {
    const key = 'boss-loot-' + String(bossName || chapterId) + '-' + item.itemId;
    if (inventory.some(x => x.codexRewardKey === key)) return;
    const copy = {...item, acquiredFrom:'boss', codexRewardKey:key};
    inventory.push(copy);
    awarded.push(copy);
  });

  return awarded;
}

function codexAwardTestBossReward() {
  // Retained as a harmless compatibility wrapper for old saves/code paths.
  return [];
}


/* ============================================================
   CODEX EQUIP / UNEQUIP — v12.5
   Phase 4: inventory items can be equipped to compatible party members.
   Combat stat integration is intentionally deferred.
   ============================================================ */
function codexEnsureEquipmentState() {
  if (!gameState.codexEquipment) gameState.codexEquipment = {};
  const core = ['san','joel','aisyah','mezstorm','eliz','senedra','zaki'];
  core.forEach(id => {
    if (!gameState.codexEquipment[id]) {
      gameState.codexEquipment[id] = { weapon:null, armor:null, accessory:null };
    }
  });
  return gameState.codexEquipment;
}

function codexEquipItem(inventoryIndex, characterId) {
  const inv = codexInventoryItems();
  const item = inv[inventoryIndex];
  if (!item || !codexCanEquip(characterId, item)) return false;

  const state = codexEnsureEquipmentState();
  const slot = item.slot;
  if (!state[characterId]) return false;

  // If another item occupies the slot, return it to inventory.
  const old = state[characterId][slot];
  if (old) inv.push({...old});

  state[characterId][slot] = {...item};
  inv.splice(inventoryIndex, 1);
  return true;
}

function codexUnequipItem(characterId, slot) {
  const state = codexEnsureEquipmentState();
  const current = state[characterId] && state[characterId][slot];
  if (!current) return false;

  codexInventoryItems().push({...current});
  state[characterId][slot] = null;
  return true;
}

function codexEquippedFor(characterId) {
  const state = codexEnsureEquipmentState();
  return state[characterId] || {weapon:null,armor:null,accessory:null};
}


/* ============================================================
   CODEX EQUIPMENT COMBAT STATS — v12.6
   Phase 5: equipped gear contributes to battle calculations.
   Simple additive bonuses only.
   ============================================================ */
function codexEquipmentBonus(characterId) {
  const e = codexEquippedFor(characterId);
  let atk = 0, magic = 0, defense = 0, hp = 0, mp = 0;
  [e.weapon, e.armor, e.accessory].forEach(item => {
    if (!item) return;
    atk += Number(item.atk || 0);
    magic += Number(item.magic || 0);
    defense += Number(item.defense || 0);
    hp += Number(item.hp || 0);
    mp += Number(item.mp || 0);
  });
  return {atk, magic, defense, hp, mp};
}

function codexEffectiveStats(characterId, baseStats) {
  const b = baseStats || {};
  const bonus = codexEquipmentBonus(characterId);
  return {
    ...b,
    atk: Number(b.atk || b.attack || 0) + bonus.atk,
    magic: Number(b.magic || b.mag || 0) + bonus.magic,
    defense: Number(b.defense || b.def || b.ac || 0) + bonus.defense,
    hp: Number(b.hp || 0) + bonus.hp,
    mp: Number(b.mp || 0) + bonus.mp
  };
}

function codexBattleCharacterStats(characterId, character) {
  const base = character && character.stats ? character.stats : {};
  return codexEffectiveStats(characterId, base);
}


/* ============================================================
   CODEX EQUIPMENT BATTLE BRIDGE — v12.7
   Phase 6: effective equipment stats are available to combat.
   The existing combat engine remains authoritative; this bridge
   provides additive gear bonuses for controlled integration.
   ============================================================ */
function codexCombatAttackBonus(characterId) {
  return Number(codexEquipmentBonus(characterId).atk || 0);
}

function codexCombatMagicBonus(characterId) {
  return Number(codexEquipmentBonus(characterId).magic || 0);
}

function codexCombatDefenseBonus(characterId) {
  return Number(codexEquipmentBonus(characterId).defense || 0);
}

function codexApplyEquipmentToCharacter(characterId, character) {
  if (!character) return character;
  const bonus = codexEquipmentBonus(characterId);
  return {
    ...character,
    stats: {
      ...(character.stats || {}),
      atk: Number(character.stats?.atk || character.stats?.attack || 0) + bonus.atk,
      magic: Number(character.stats?.magic || character.stats?.mag || 0) + bonus.magic,
      defense: Number(character.stats?.defense || character.stats?.def || character.stats?.ac || 0) + bonus.defense
    }
  };
}


/* ============================================================
   CODEX PHYSICAL EQUIPMENT INTEGRATION — v12.8
   First live combat-stat integration: physical attack bonus.
   Magic and defense remain unchanged until separately tested.
   ============================================================ */
function codexPhysicalAttackDamage(characterId, baseDamage) {
  const bonus = codexCombatAttackBonus(characterId);
  return Math.max(0, Math.floor(Number(baseDamage || 0) + bonus));
}


/* ============================================================
   CODEX LIVE PHYSICAL ATTACK — v12.9
   Uses the tested equipment ATK bonus for a controlled physical hit.
   ============================================================ */
function codexLivePhysicalAttack(characterId, baseDamage, target) {
  const damage = codexPhysicalAttackDamage(characterId, baseDamage);
  if (target && typeof target.hp === 'number') {
    target.hp = Math.max(0, target.hp - damage);
  }
  return damage;
}


/* ============================================================
   CODEX REAL ATTACK BRIDGE — v12.10
   Physical attack action uses the tested equipment ATK bonus.
   ============================================================ */
function codexPhysicalAttackForPartyMember(characterId, baseDamage, target) {
  const damage = codexLivePhysicalAttack(characterId, baseDamage, target);
  return damage;
}

function codexResolvePlayerPhysicalAttack(characterId, baseDamage, target) {
  const damage = codexPhysicalAttackForPartyMember(characterId, baseDamage, target);
  return {
    characterId,
    damage,
    targetHp: target && typeof target.hp === 'number' ? target.hp : null
  };
}


/* v12.13.1 — incoming DEF test */
function codexTestIncomingDamage(characterId, rawDamage) {
  const defense = codexCombatDefenseBonus(characterId);
  const finalDamage = Math.max(1, Number(rawDamage || 0) - defense);
  return {characterId, rawDamage:Number(rawDamage||0), defense, finalDamage};
}
function runJoelDefenseTest() {
  const r=codexTestIncomingDamage('joel', 10);
  const el=document.getElementById('joelDefenseTestResult');
  if(el) el.innerHTML='<strong>Joel</strong> — raw 10 · DEF bonus -'+r.defense+
    ' · final damage <strong>'+r.finalDamage+'</strong>';
}

// Party structure — Codex fixed roster
// The seven original companions are always part of the party.
// Soel is a familiar and does not consume a party slot.
// Sister Wren and Ser Aldric are later temporary quest allies.
const CORE_PARTY_IDS = new Set([
  'san', 'joel', 'aisyah', 'mezstorm', 'eliz', 'senedra', 'zaki'
]);
const FAMILIAR_IDS = new Set(['soel']);
// Core starting party used when migrating/loading legacy saves.
const INITIAL_PARTY_IDS = new Set(['san', 'joel', 'aisyah', 'mezstorm', 'eliz', 'senedra', 'zaki']);

function isCorePartyMember(member) {
  return !!member && CORE_PARTY_IDS.has(member.id);
}

function isFamiliar(member) {
  return !!member && FAMILIAR_IDS.has(member.id);
}

function isFixedPartyMember(member) {
  return isCorePartyMember(member) || isFamiliar(member);
}

function canBenchPartyMember() {
  return false;
}

// ============================================================
// GAME STATE
// ============================================================

const CODEX_POTION_DEFS = {
  hpPotion: { name: 'HP Potion', icon: '🧪', restoreHP: 50 },
  mpPotion: { name: 'MP Potion', icon: '💧', restoreMP: 40 },
  elixir: { name: 'Codex Elixir', icon: '✨', restoreHP: 100, restoreMP: 80 }
};

function getPotions() {
  if (!gameState.potions || typeof gameState.potions !== 'object') {
    gameState.potions = { hpPotion: 3, mpPotion: 5, elixir: 0 };
  }
  if (!Number.isFinite(Number(gameState.potions.hpPotion))) gameState.potions.hpPotion = 0;
  if (!Number.isFinite(Number(gameState.potions.mpPotion))) gameState.potions.mpPotion = 0;
  if (!Number.isFinite(Number(gameState.potions.elixir))) gameState.potions.elixir = 0;
  return gameState.potions;
}

function createInitialGameState() {
  return {
    currentBook: 1,
    selectedBook: 1,
    xp: 0,
    level: 1,
    gold: 0,
    potions: { hpPotion: 3, mpPotion: 5, elixir: 0 },
    inventory: [],
    memories: [],
    completedChapters: [],
    activeQuests: [],
    completedQuests: [],
    unlockedChapters: [1],
    currentTab: 'dashboard',
    journalChapter: null,
    battleState: null,
    battleInputLocked: false,
    bondPoints: 0,
    readJournal: [],
    party: GAME_DATA.partyMembers.map(p => ({ ...p, currentHP: p.stats.hp, currentMP: p.stats.mp, buffs: [], debuffs: [] }))
  };
}

let gameState = createInitialGameState();

// ============================================================
// SAVE / LOAD SYSTEM
// ============================================================

const SAVE_KEY = 'aethonCodexSave';
const SAVE_VERSION = 11;

function getSavePayload() {
  return {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    gameState: gameState
  };
}

function saveGame() { return saveGameV148(); }

function applySaveData(data) {
  if (!data || !data.gameState) return false;

  const loaded = data.gameState;
  const previousVersion = Number(data.version || 0);

  // Start from the current schema so newly introduced fields always exist.
  const baseState = {
    currentBook: 1,
    selectedBook: 1,
    xp: 0,
    level: 1,
    gold: 0,
    potions: { hpPotion: 3, mpPotion: 5, elixir: 0 },
    inventory: [],
    memories: [],
    completedChapters: [],
    activeQuests: [],
    completedQuests: [],
    unlockedChapters: [1],
    currentTab: 'dashboard',
    journalChapter: null,
    battleState: null,
    battleInputLocked: false,
    bondPoints: 0,
    readJournal: [],
    party: GAME_DATA.partyMembers.map(p => ({
      ...p,
      currentHP: p.stats.hp,
      currentMP: p.stats.mp,
      buffs: [],
      debuffs: []
    }))
  };

  gameState = Object.assign(baseState, loaded);

  // Normalize arrays that older saves may have omitted.
  const arrayFields = [
    'inventory', 'memories', 'completedChapters',
    'activeQuests', 'completedQuests', 'unlockedChapters', 'readJournal'
  ];
  arrayFields.forEach(key => {
    if (!Array.isArray(gameState[key])) gameState[key] = [];
  });

  // A save with a malformed (non-object) potions field shouldn't linger —
  // getPotions() also self-heals, but fixing it here keeps gameState
  // consistent immediately after load rather than on next access.
  if (!gameState.potions || typeof gameState.potions !== 'object') {
    gameState.potions = { hpPotion: 3, mpPotion: 5, elixir: 0 };
  }

  // Older saves can contain a stale/partial battle object. Never resume an
  // unknown battle state during this migration; story progression is safer.
  gameState.battleState = null;
  gameState.battleInputLocked = false;

  // Rebuild the party from the current canonical roster, preserving only
  // compatible persistent fields from the saved roster.
  const savedParty = Array.isArray(loaded.party) ? loaded.party : [];
  gameState.party = GAME_DATA.partyMembers.map(p => {
    const saved = savedParty.find(m => m.id === p.id);
    const member = {
      ...p,
      currentHP: p.stats.hp,
      currentMP: p.stats.mp,
      buffs: [],
      debuffs: []
    };

    if (saved) {
      member.joined = saved.joined !== undefined ? !!saved.joined : !!p.joined;
      member.active = saved.active !== undefined ? !!saved.active : !!p.active;
      member.currentHP = Number.isFinite(Number(saved.currentHP))
        ? Number(saved.currentHP) : p.stats.hp;
      member.currentMP = Number.isFinite(Number(saved.currentMP))
        ? Number(saved.currentMP) : p.stats.mp;
      member.buffs = Array.isArray(saved.buffs) ? saved.buffs : [];
      member.debuffs = Array.isArray(saved.debuffs) ? saved.debuffs : [];
    }

    // Prevent old combat state from making a required story character
    // appear dead or unusable after migration.
    member.currentHP = Math.max(0, Math.min(member.currentHP, member.stats.hp));
    member.currentMP = Math.max(0, Math.min(member.currentMP, member.stats.mp));
    return member;
  });

  // Until a later recruit has actually joined, the original/core party is
  // always active. This prevents legacy saves or early UI interactions from
  // benching the starting roster.
  const laterRecruitJoined = gameState.party.some(
    p => p.joined && !INITIAL_PARTY_IDS.has(p.id)
  );
  if (!laterRecruitJoined) {
    gameState.party.forEach(p => {
      if (INITIAL_PARTY_IDS.has(p.id) && p.joined) p.active = true;
    });
  }

  // Codex fixed-party rule: the seven core members are always active.
  // Soel is a familiar and is never treated as a benchable party slot.
  gameState.party.forEach(p => {
    if (CORE_PARTY_IDS.has(p.id) && p.joined !== false) {
      p.joined = true;
      p.active = true;
    }
    if (FAMILIAR_IDS.has(p.id)) {
      p.joined = true;
      p.active = true;
    }
  });

  // San is the protagonist and must always be recruitable/available.
  const san = gameState.party.find(p => p.id === 'san');
  if (san) {
    san.joined = true;
    san.active = true;
    if (san.currentHP <= 0) san.currentHP = san.stats.hp;
    if (san.currentMP < 0) san.currentMP = san.stats.mp;
  }

  // Clamp progression fields from legacy saves.
  gameState.xp = Math.max(0, Number(gameState.xp) || 0);
  gameState.gold = Math.max(0, Number(gameState.gold) || 0);
  gameState.level = Math.max(1, Number(gameState.level) || 1);
  gameState.currentBook = [1, 2, 3, 4].includes(Number(gameState.currentBook))
    ? Number(gameState.currentBook) : 1;
  gameState.selectedBook = [1, 2, 3, 4].includes(Number(gameState.selectedBook))
    ? Number(gameState.selectedBook) : gameState.currentBook;

  // Legacy saves may have chapter IDs as strings.
  ['completedChapters', 'activeQuests', 'completedQuests', 'unlockedChapters', 'readJournal']
    .forEach(key => {
      gameState[key] = gameState[key]
        .map(Number)
        .filter(Number.isFinite);
    });

  // Migration is applied in memory here. The explicit save routine can be
  // invoked by the user after a successful load; do not save during loading.
  return true;
}

function hasSavedGame() {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch (e) {
    return false;
  }
}

function loadGameFromStorage() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    return applySaveData(JSON.parse(raw));
  } catch (e) {
    console.warn('Could not read saved game:', e);
    return false;
  }
}

function continueSavedGame() { return continueSavedGameV148(); }

function startNewGame() { return startNewGameV148(); }

function exportSave() {
  const payload = getSavePayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const stamp = new Date().toISOString().slice(0, 10);
  a.download = 'aethon-codex-save-' + stamp + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showNotification('Save downloaded');
}

function importSave(event) { return importSaveV148(event); }

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function rollDie(sides) { return Math.floor(Math.random() * sides) + 1; }

function rollDice(count, sides) {
  let total = 0;
  for (let i = 0; i < count; i++) total += rollDie(sides);
  return total;
}

function getModifier(stat) { return Math.floor((stat - 50) / 5); }

function showDice(roll, modifier, total, label, callback) {
  const display = document.getElementById('diceDisplay');
  const box = document.getElementById('diceBox');
  const result = document.getElementById('diceResult');
  const detail = document.getElementById('diceDetail');

  display.classList.add('active');
  box.classList.add('rolling');
  box.textContent = '?';
  result.textContent = 'Rolling...';
  detail.textContent = label || '';

  setTimeout(() => {
    box.classList.remove('rolling');
    box.textContent = roll;
    result.textContent = total >= 20 ? 'CRITICAL HIT!' : total >= 15 ? 'Strong Hit!' : total >= 10 ? 'Hit!' : total >= 5 ? 'Glancing Blow' : 'Miss!';
    detail.textContent = (label ? label + ' | ' : '') + 'd20: ' + roll + (modifier !== 0 ? ' + ' + modifier : '') + ' = ' + total;

    setTimeout(() => {
      display.classList.remove('active');
      if (callback) callback();
    }, 1500);
  }, 1000);
}

function addCombatLog(message, type) {
  const battle = gameState.battleState;
  if (!battle) return;

  if (!Array.isArray(battle.log)) battle.log = [];
  battle.log.push({message: String(message), type: type || 'info'});
  if (battle.log.length > 30) battle.log.shift();

  // Keep the existing Battle Arena renderer authoritative.
  renderBattle();
}




function showDamagePopup(element, amount, type) {
  const popup = document.createElement('div');
  popup.className = 'damage-popup ' + (type || 'damage');
  popup.textContent = (type === 'heal' ? '+' : '-') + amount;
  const rect = element.getBoundingClientRect();
  popup.style.left = rect.left + rect.width / 2 + 'px';
  popup.style.top = rect.top + 'px';
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 1500);
}

function showXP(amount) {
  const container = document.getElementById('xpNotification');
  const popup = document.createElement('div');
  popup.className = 'xp-popup';
  popup.textContent = '+' + amount + ' XP';
  container.appendChild(popup);
  setTimeout(() => popup.remove(), 2000);
}

// ============================================================
// PARTY FUNCTIONS
// ============================================================

function getActiveParty() {
  return gameState.party.filter(p => p.active && p.currentHP > 0);
}

function getPartyMember(id) {
  return gameState.party.find(p => p.id === id);
}

function healPartyMember(id, amount) {
  const member = getPartyMember(id);
  if (!member) return;
  member.currentHP = Math.min(member.currentHP + amount, member.stats.maxHP);
}

function damagePartyMember(id, amount) {
  const member = getPartyMember(id);
  if (!member) return;

  const incoming = Math.max(0, Number(amount) || 0);
  const remaining = member.currentHP - incoming;

  // Soel's spiritual identity makes him unkillable. Lethal damage causes
  // Spirit Flame reforming rather than a normal death/downed state.
  if (member.id === 'soel' && remaining <= 0) {
    member.currentHP = Math.max(1, Math.floor(Number(member.stats?.maxHP || 1) * 0.35));
    addCombatLog('🔥 SOEL — SPIRIT FLAME! SOEL REFORMS!', 'skill');
    return;
  }

  // Eliz is likewise protected from permanent battle death.
  if (member.id === 'eliz' && remaining <= 0) {
    member.currentHP = Math.max(1, Math.floor(Number(member.stats?.maxHP || 1) * 0.35));
    addCombatLog('✨ ELIZ — SPIRITUAL SURVIVAL!', 'skill');
    return;
  }

  member.currentHP = Math.max(remaining, 0);
}

function restoreMP(id, amount) {
  const member = getPartyMember(id);
  if (!member) return;
  member.currentMP = Math.min(member.currentMP + amount, member.stats.maxMP);
}

function spendMP(id, amount) {
  const member = getPartyMember(id);
  if (!member) return false;
  if (member.currentMP < amount) return false;
  member.currentMP -= amount;
  return true;
}

// ============================================================
// BATTLE SYSTEM
// ============================================================

function chapterHasInteractiveBattle(chapter) {
  return !!(
    chapter &&
    (
      chapter.battle ||
      (chapter.quest && chapter.quest.hasBattle === true)
    )
  );
}

function getChapterBattleConfig(chapter) {
  if (!chapter) return null;
  if (chapter.battle) return chapter.battle;

  // Legacy-compatible adapter: older data may only flag a battle on the quest.
  // We deliberately do not invent boss statistics when the source data does
  // not provide them. Such chapters are reported as needing battle data.
  if (chapter.quest && chapter.quest.hasBattle === true) {
    return {
      missingDefinition: true,
      bossName: chapter.quest.bossName || "Unspecified Encounter",
      bossIcon: chapter.quest.bossIcon || "⚔️"
    };
  }

  return null;
}

function startBattleFromQuest(chapterId) {
  try {
    const id = Number(chapterId);
    const chapter = GAME_DATA.chapters.find(c => c.id === id);
    const battle = getChapterBattleConfig(chapter);

    if (!chapter) {
      showNotification("Battle chapter could not be found.");
      return;
    }

    if (!battle) {
      showNotification("This quest has no interactive battle configured yet.");
      return;
    }

    if (battle.missingDefinition) {
      console.warn("Aethon Codex: chapter is marked for battle but has no battle definition:", id);
      showNotification("Battle data for this encounter still needs to be migrated.");
      return;
    }

    closeQuestModal();
    initBattle(id);
  } catch (error) {
    console.error("Aethon Codex battle start failed:", error);
    gameState.battleState = null;
    gameState.battleInputLocked = false;
    saveGame();
    showNotification("Battle could not start. Your progress is safe.");
  }
}

function initBattle(chapterId) {
  const id = Number(chapterId);
  const chapter = GAME_DATA.chapters.find(c => c.id === id);

  const battleConfig = getChapterBattleConfig(chapter);
  if (!chapter || !battleConfig || battleConfig.missingDefinition) {
    showNotification("Battle data for this encounter still needs to be migrated.");
    return false;
  }

  if (!Array.isArray(gameState.readJournal)) gameState.readJournal = [];
  if (!gameState.readJournal.includes(id)) {
    showNotification("Read this chapter's journal entry first.");
    goReadJournal(id);
    return false;
  }

  // Normalize party state one final time before combat. This is especially
  // important when loading a save created before the party system existed.
  if (!Array.isArray(gameState.party)) {
    gameState.party = [];
  }

  const san = gameState.party.find(p => p.id === 'san');
  if (!san) {
    showNotification("San could not be loaded into the party.");
    return false;
  }

  san.joined = true;
  san.active = true;
  if (!Number.isFinite(Number(san.currentHP)) || san.currentHP <= 0) san.currentHP = san.stats.hp;
  if (!Number.isFinite(Number(san.currentMP)) || san.currentMP < 0) san.currentMP = san.stats.mp;

  // A new battle begins with every currently active living member restored.
  gameState.party.forEach(p => {
    if (p.active && p.joined) {
      p.currentHP = p.stats.hp;
      p.currentMP = p.stats.mp;
      p.buffs = [];
      p.debuffs = [];
    }
  });

  const activeParty = gameState.party.filter(p => p.active && p.joined && p.currentHP > 0);
  if (!activeParty.length) {
    san.active = true;
    san.currentHP = san.stats.hp;
    san.currentMP = san.stats.mp;
    activeParty.push(san);
  }

  gameState.battleInputLocked = false;
  gameState.battleState = {
    chapterId: id,
    boss: {
      name: battleConfig.bossName,
      icon: battleConfig.bossIcon,
      hp: Number(battleConfig.bossHP),
      maxHP: Number(battleConfig.bossMaxHP),
      ac: Number(battleConfig.bossAC),
      phaseIndex: 0,
      phases: Array.isArray(battleConfig.phases) ? battleConfig.phases : []
    },
    turnIndex: -1,
    turnOrder: [],
    round: 1,
    log: [],
    active: true,
    waitingForPlayer: false,
    narrative: 'The battle begins...',
    winner: null
  };

  gameState.battleState.turnOrder = activeParty
    .map(p => ({
      id: p.id,
      initiative: rollDie(20) + getModifier(Number(p.stats.spd) || 10)
    }))
    .sort((a, b) => b.initiative - a.initiative);

  if (!gameState.battleState.turnOrder.length) {
    gameState.battleState.active = false;
    gameState.battleState.winner = 'boss';
    showNotification("No active party members are available.");
    return false;
  }

  addCombatLog("=== Battle begins! ===", "phase");
  switchTab('battle');

  // Begin the actual turn cycle. The previous build rendered the battle
  // while turnIndex was 0 but never handed control to the first actor, so
  // when Joel/Aisyah/etc. rolled first there were no San action buttons.
  nextTurn();

  // On mobile, move the viewport to the newly opened battle panel.
  requestAnimationFrame(() => {
    const battlePanel = document.getElementById('battleTab');
    if (battlePanel) {
      battlePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  return true;
}

function getCurrentPhase(boss) {
  const hpPercent = (boss.hp / boss.maxHP) * 100;
  for (let i = boss.phases.length - 1; i >= 0; i--) {
    if (hpPercent <= boss.phases[i].threshold) {
      return i;
    }
  }
  return 0;
}

function updateBossPhase() {
  const battle = gameState.battleState;
  const newPhase = getCurrentPhase(battle.boss);
  if (newPhase !== battle.boss.phaseIndex) {
    battle.boss.phaseIndex = newPhase;
    const phase = battle.boss.phases[newPhase];
    battle.boss.ac = phase.ac;
    addCombatLog('=== ' + battle.boss.name + ' enters ' + phase.name + ' Phase! ===', 'phase');
    addCombatLog(phase.desc, 'info');
  }
}


function chooseCompanionSkill(member, battle) {
  if (!member || member.currentHP <= 0) return 'attack';
  const mp = Number(member.currentMP || 0);
  const hpRatio = Number(member.currentHP || 0) / Number(member.stats?.maxHP || 1);
  const bossRatio = battle?.boss ? Number(battle.boss.hp || 0) / Number(battle.boss.maxHP || 1) : 1;

  if (member.id === 'zaki') {
    if (mp >= 15 && hpRatio < 0.45 && !member._ironWillUsedThisRound) {
      member._ironWillUsedThisRound = true;
      return 'iron_will';
    }
    if (mp >= 15 && !battle._battleCryUsed && bossRatio > 0.45) {
      battle._battleCryUsed = true;
      return 'battle_cry';
    }
    if (mp >= 20 && (bossRatio < 0.55 || Math.random() < 0.22)) return 'vanguard_charge';
  }
  return 'attack';
}


function companionAIAction(member, battle) {
  if (!member || !battle || !battle.active || member.currentHP <= 0) return {type:'skip'};

  const hpRatio = Number(member.currentHP || 0) / Number(member.stats?.maxHP || 1);
  const mp = Number(member.currentMP || 0);
  const active = getActiveParty();

  // Zaki — Fighter.
  if (member.id === 'zaki') {
    const bossRatio = battle.boss ? Number(battle.boss.hp || 0) / Number(battle.boss.maxHP || 1) : 1;
    if (mp >= 20 && bossRatio <= 0.55) return {type:'skill', skill:'vanguard_charge'};
    if (mp >= 15 && !battle._battleCryUsed && bossRatio > 0.45) {
      battle._battleCryUsed = true;
      return {type:'skill', skill:'battle_cry'};
    }
    if (mp >= 15 && hpRatio <= 0.45 && !member._ironWillUsed) {
      member._ironWillUsed = true;
      return {type:'skill', skill:'iron_will'};
    }
  }

  // Joel — Paladin.
  if (member.id === 'joel') {
    const lowest = active
      .filter(p => p.currentHP > 0)
      .sort((a,b) => (a.currentHP/a.stats.maxHP) - (b.currentHP/b.stats.maxHP))[0];

    if (mp >= 20 && lowest && (lowest.currentHP / lowest.stats.maxHP) <= 0.60 && !battle._divineProtectionUsed) {
      battle._divineProtectionUsed = true;
      return {type:'skill', skill:'divine_protection'};
    }
    if (mp >= 20 && hpRatio <= 0.50 && !battle._divineProtectionUsed) {
      battle._divineProtectionUsed = true;
      return {type:'skill', skill:'divine_protection'};
    }
  }

  // Eliz — Healer / Resurrection.
  if (member.id === 'eliz') {
    // NOTE: getActiveParty() only returns members with currentHP > 0, so it
    // can never contain a fallen ally. Use the full active-flagged roster
    // here so resurrection can actually be detected and chosen.
    const roster = gameState.party.filter(p => p.active);
    const living = roster.filter(p => p.currentHP > 0);
    const fallen = roster.filter(p =>
      p.currentHP <= 0 &&
      p.id !== 'eliz' &&
      p.id !== 'soel'
    );

    // Resurrection has the highest priority, but only once per battle for now.
    if (mp >= 30 && fallen.length && !battle._elizResurrectionUsed) {
      battle._elizResurrectionUsed = true;
      return {type:'skill', skill:'resurrection'};
    }

    // Heal the most injured living ally before she attacks.
    const lowest = living
      .filter(p => p !== member)
      .sort((a,b) => (a.currentHP/a.stats.maxHP) - (b.currentHP/b.stats.maxHP))[0];

    if (mp >= 15 && lowest && (lowest.currentHP / lowest.stats.maxHP) <= 0.60 && !battle._elizHealUsedThisRound) {
      battle._elizHealUsedThisRound = true;
      return {type:'skill', skill:'heal'};
    }
  }


  // Senedra — Scout. During the dedicated test, exercise her real spellbook
  // instead of falling back to basic attacks.
  if (member.id === 'senedra' && window._senedraAbilityTestV172) {

  }  
  // Aisyah — Coup de Grace test: target is deliberately weakened by the test
  // launcher, then the actual companion AI selects the existing skill executor.
  if (member.id === 'aisyah' && window.__removed_test_flag) {
    const hp = Number(battle.boss?.currentHP ?? battle.boss?.hp ?? 0);
    const maxHp = Number(battle.boss?.maxHP ?? battle.boss?.hp ?? 1);
    if (hp > 0 && hp <= maxHp * 0.25 && !battle._aisyahCoupDeGraceUsed) {
      battle._aisyahCoupDeGraceUsed = true;
      return {type:'skill', skill:'coup_de_grace'};
    }
  }

return {type:'attack'};
}


function executeCompanionSkill(member, skill, battle) {
  if (!member || !battle || !battle.active) return false;
  const boss = battle.boss;
  const spend = (amount) => {
    member.currentMP = Math.max(0, Number(member.currentMP || 0) - amount);
  };

  if (member.id === 'senedra') {
    if (skill === 'reveal_weakness' && member.currentMP >= 10) {
      spend(10);
      boss.ac = Math.max(0, Number(boss.ac || 0) - 3);
      boss._revealWeaknessTurns = 2;
      addCombatLog('👁️ ' + member.name.toUpperCase() + " — REVEAL WEAKNESS!", 'skill');
      addCombatLog(boss.name + ' is exposed! AC -3 for 2 turns.', 'info');
      battle.narrative = member.name + " exposes the enemy's weakness!";
      return true;
    }
    if (skill === 'hunter_mark' && member.currentMP >= 20) {
      spend(20);
      boss._hunterMarkedTurns = 2;
      addCombatLog('🎯 ' + member.name.toUpperCase() + " — HUNTER'S MARK!", 'skill');
      addCombatLog(boss.name + ' is marked! Attacks against it deal +50% damage.', 'info');
      battle.narrative = member.name + " marks the enemy for the party!";
      return true;
    }
    if (skill === 'trailblazer' && member.currentMP >= 15) {
      spend(15);
      gameState.party.filter(p => p.active && p.currentHP > 0).forEach(p => {
        p._trailblazerBonus = 5;
      });
      addCombatLog('🦌 ' + member.name.toUpperCase() + ' — TRAILBLAZER!', 'skill');
      addCombatLog('Party SPD increased for 2 turns!', 'info');
      battle.narrative = member.name + " leads the party forward!";
      return true;
    }
  }

  if (member.id === 'aisyah') {
    if (skill === 'coup_de_grace') {
      const hp = Number(boss.currentHP ?? boss.hp ?? 0);
      const maxHp = Number(boss.maxHP ?? boss.hp ?? 1);
      // Coup de Grace is an execution move: only available when the target
      // is below 25% HP. Otherwise it does not fire and normal attacks remain.
      if (hp > maxHp * 0.25) return false;
      const roll = rollDie(20) + getModifier(Number(member.stats.str) || 10);
      const base = Math.max(1, Number(member.stats.dex) || 10);
      const damage = Math.max(1, Math.floor(base * 2.5) + rollDie(8));
      boss.currentHP = Math.max(0, hp - damage);
      boss.hp = boss.currentHP;
      addCombatLog('🗡️ ' + member.name.toUpperCase() + ' — COUP DE GRACE!', 'skill');
      addCombatLog(boss.name + ' takes ' + damage + ' execution damage.', 'damage');
      battle.narrative = member.name + ' strikes the weakened enemy with Coup de Grace!';
      return true;
    }
  }

  if (member.id !== 'zaki') return false;

  if (skill === 'battle_cry' && member.currentMP >= 15) {
    spend(15);
    gameState.party.filter(p => p.active && p.currentHP > 0).forEach(p => {
      p._battleCryBonus = 3;
    });
    addCombatLog('📢 ' + member.name.toUpperCase() + ' — BATTLE CRY!', 'skill');
    addCombatLog('Party ATK +3 for 2 turns!', 'info');
    battle.narrative = member.name + ' rallies the party!';
    return true;
  }

  if (skill === 'iron_will' && member.currentMP >= 15) {
    spend(15);
    member._defBonus = 4;
    addCombatLog('🛡️ ' + member.name.toUpperCase() + ' — IRON WILL!', 'skill');
    addCombatLog(member.name + ' DEF +4!', 'info');
    battle.narrative = member.name + ' braces for the incoming attack.';
    return true;
  }

  if (skill === 'vanguard_charge' && member.currentMP >= 20) {
    spend(20);
    const effective = codexEffectiveStats(member.id, member.stats);
    const atkMod = getModifier(effective.atk);
    const roll = rollDie(20);
    let dmg;
    if (roll === 20) {
      dmg = rollDice(3,10) * 2 + codexCombatAttackBonus(member.id);
      addCombatLog('🐎 ' + member.name.toUpperCase() + ' — VANGUARD CHARGE! CRITICAL ' + dmg + ' damage!', 'skill');
    } else {
      dmg = Math.max(1, rollDice(3,10) + atkMod);
      addCombatLog('🐎 ' + member.name.toUpperCase() + ' — VANGUARD CHARGE! ' + dmg + ' damage!', 'skill');
    }
    boss.hp = Math.max(0, boss.hp - dmg);
    battle.narrative = member.name + ' charges through the enemy line!';
    return true;
  }

  return false;
}


function executeJoelSkill(member, skill, battle) {
  if (!member || !battle || !battle.active || member.id !== 'joel') return false;
  if (skill === 'divine_protection' && member.currentMP >= 20) {
    member.currentMP = Math.max(0, member.currentMP - 20);
    gameState.party.filter(p => p.active && p.currentHP > 0).forEach(p => {
      p._divineProtection = 1;
    });
    addCombatLog('🛡️ ' + member.name.toUpperCase() + ' — DIVINE PROTECTION!', 'skill');
    addCombatLog('The party is shielded!', 'info');
    battle.narrative = member.name + ' raises his shield and protects the party!';
    return true;
  }
  return false;
}


function executeElizSkill(member, skill, battle) {
  if (!member || !battle || !battle.active || member.id !== 'eliz') return false;
  const party = gameState.party || [];

  if (skill === 'resurrection' && member.currentMP >= 30) {
    const target = party.find(p => p.currentHP <= 0);
    if (!target) return false;

    member.currentMP = Math.max(0, member.currentMP - 30);
    target.currentHP = Math.max(1, Math.floor((Number(target.stats?.maxHP || 1)) * 0.35));
    target._justResurrected = true;

    addCombatLog('✨ ' + member.name.toUpperCase() + ' — RESURRECTION!', 'skill');
    addCombatLog(target.name + ' returns to the battle!', 'info');
    battle.narrative = member.name + ' calls a fallen ally back to life!';
    return true;
  }

  if (skill === 'heal' && member.currentMP >= 15) {
    const target = party
      .filter(p => p.currentHP > 0 && p !== member)
      .sort((a,b) => (a.currentHP/a.stats.maxHP) - (b.currentHP/b.stats.maxHP))[0];

    if (!target) return false;

    member.currentMP = Math.max(0, member.currentMP - 15);
    const heal = Math.max(1, Math.floor(Number(target.stats?.maxHP || 1) * 0.25));
    target.currentHP = Math.min(Number(target.stats?.maxHP || 1), target.currentHP + heal);

    addCombatLog('💚 ' + member.name.toUpperCase() + ' — HEAL!', 'skill');
    addCombatLog(target.name + ' recovers ' + heal + ' HP!', 'info');
    battle.narrative = member.name + ' restores ' + target.name + '!';
    return true;
  }

  return false;
}


function initializeSanSpellbookV1() {
  const san = (gameState.party || []).find(p => p.id === 'san');
  if (!san) return;

  // Codex progression uses the main character level stored in gameState.
  // Party members inherit that progression rather than carrying a separate level.
  const level = Number(gameState.level || 1);
  const known = getSanKnownSpells(level);
  san.spellbook = known.map(s => s.id);

  // Keep the compact four-button layout. Newly unlocked spells are added
  // automatically until the prepared list is full.
  if (!Array.isArray(san.preparedSpells) || !san.preparedSpells.length) {
    san.preparedSpells = known.slice(0, 4).map(s => s.id);
  } else {
    // Preserve the player's current prepared choices, then fill open slots
    // with newly unlocked spells.
    san.preparedSpells = san.preparedSpells.filter(id => known.some(s => s.id === id));

    // At higher levels, keep the compact UI focused on San's newest tools.
    // This is intentionally automatic for the ADHD-friendly hands-off flow;
    // a full manual spellbook/selection screen can be added later.
    if (known.length > 4) {
      san.preparedSpells = known.slice(-4).map(s => s.id);
    } else {
      known.forEach(spell => {
        if (san.preparedSpells.length < 4 &&
            !san.preparedSpells.includes(spell.id)) {
          san.preparedSpells.push(spell.id);
        }
      });
    }
  }
}


function sanSpellById(id) {
  const all = Object.values(SAN_SPELLBOOK_V1).flat();
  return all.find(s => s.id === id) || null;
}




function mountSanSpellUIV1() {
  const san = (gameState.party || []).find(p => p.id === 'san');
  if (!san) return;

  // Prefer an explicitly marked San action area if present.
  let container = document.querySelector('[data-san-actions]');
  if (!container) {
    // Otherwise find the existing combat action area containing San's name.
    const candidates = Array.from(document.querySelectorAll(
      '#combat-screen .actions, #combat-screen .action-buttons, .combat-actions, .action-buttons, .battle-actions'
    ));
    container = candidates[0] || null;
  }
  if (!container) return;

  container.setAttribute('data-san-actions', 'true');
  renderSanSpellButtonsV1(container);
}

function renderSanSpellButtonsV1(container) {
  if (!container) return;
  const spells = getSanPreparedSpellDataV1();
  container.querySelectorAll('.san-spell-v1').forEach(el => el.remove());

  spells.forEach(spell => {
    const button = document.createElement('button');
    button.className = 'san-spell-v1';
    button.type = 'button';
    button.innerHTML = '<span>' + spell.emoji + '</span> <strong>' +
      spell.name + '</strong> <small>' + spell.mp + ' MP</small>';
    button.disabled = Number((gameState.party || []).find(p => p.id === 'san')?.currentMP || 0) < spell.mp;
    button.addEventListener('click', () => {
      if (castSanSpellV1(spell.id)) renderSanSpellButtonsV1(container);
    });
    container.appendChild(button);
  });
}

function getSanPreparedSpellDataV1() {
  const san = (gameState.party || []).find(p => p.id === 'san');
  if (!san) return [];
  initializeSanSpellbookV1();
  return (san.preparedSpells || [])
    .map(id => sanSpellById(id))
    .filter(Boolean);
}

function castSanSpellV1(spellId, targetId) {
  const san = (gameState.party || []).find(p => p.id === 'san');
  const battle = gameState.battleState;
  const spell = sanSpellById(spellId);

  if (!san || !battle || !spell) return false;
  if (Number(san.currentMP || 0) < Number(spell.mp || 0)) {
    addCombatLog('Not enough MP for ' + spell.name + '!', 'info');
    return false;
  }

  const target = targetId
    ? (gameState.party || []).find(p => p.id === targetId)
    : null;

  san.currentMP = Math.max(0, Number(san.currentMP || 0) - Number(spell.mp || 0));

  if (spell.type === 'defensive') {
    san._arcaneWardTurns = 2;
    addCombatLog(spell.emoji + ' ' + spell.name + ' — San is protected!', 'skill');
    battle.narrative = 'San casts ' + spell.name + '!';
    return true;
  }

  // Use the existing battle damage function where available.
  // The exact boss object varies by build, so resolve the active enemy safely.
  const boss = battle.boss || battle.enemy || gameState.boss;
  if (!boss) return false;

  const attackPower = Number(san.stats?.magicPower || san.stats?.magic || san.stats?.attack || 20);
  const damage = Math.max(1, Math.floor(attackPower * Number(spell.power || 1)));

  if (typeof damageBoss === 'function') {
    damageBoss(damage);
  } else if (typeof dealDamageToBoss === 'function') {
    dealDamageToBoss(damage);
  } else if ('hp' in boss) {
    boss.hp = Math.max(0, Number(boss.hp || 0) - damage);
  }

  addCombatLog(spell.emoji + ' ' + spell.name + ' — ' + damage + ' damage!', 'skill');
  battle.narrative = 'San casts ' + spell.name + '!';
  return true;
}
function aiAction(member) {
  initializeSanSpellbookV1();
  const battle = gameState.battleState;
  if (!battle || !battle.active || !member) return;
  const boss = battle.boss;

  // Companion AI decision layer.
  const decision = companionAIAction(member, battle);
  if (decision && decision.type === 'skill') {
    if (typeof executeCompanionSkill === 'function' &&
        executeCompanionSkill(member, decision.skill, battle)) return;
    if (typeof executeJoelSkill === 'function' &&
        executeJoelSkill(member, decision.skill, battle)) return;
    if (typeof executeElizSkill === 'function' &&
        executeElizSkill(member, decision.skill, battle)) return;
  }

  const narrativeByRole = {
    senedra: member.name + ' releases a rapid volley of arrows!',
    joel: member.name + ' charges forward, shield raised — Shield Wall!',
    aisyah: member.name + ' darts forward with both blades ready!',
    mezstorm: member.name + ' gathers arcane energy!',
    eliz: member.name + ' raises her healing power!',
    zaki: member.name + ' surges forward with his weapon!'
  };
  battle.narrative = narrativeByRole[member.id] || member.name + ' acts.';

  // AI logic based on role
  if (member.role === 'Healer') {
    const allies = getActiveParty().sort((a, b) => a.currentHP / a.stats.maxHP - b.currentHP / b.stats.maxHP);
    const lowest = allies[0];
    if (lowest && lowest.currentHP / lowest.stats.maxHP < 0.5 && member.currentMP >= 10) {
      const healAmount = rollDice(2, 8) + 5 + getModifier(member.stats.mag);
      spendMP(member.id, 10);
      healPartyMember(lowest.id, healAmount);
      addCombatLog(member.name + ' casts Heal on ' + lowest.name + ' for ' + healAmount + ' HP!', 'heal');
      return;
    }
    const dead = gameState.party.find(p =>
      p.currentHP === 0 &&
      p.active &&
      p.id !== 'eliz' &&
      p.id !== 'soel'
    );
    if (dead && member.currentMP >= 40) {
      spendMP(member.id, 40);
      dead.currentHP = Math.floor(dead.stats.maxHP * 0.3);
      addCombatLog(member.name + ' casts Resurrect on ' + dead.name + '! They return with ' + dead.currentHP + ' HP!', 'heal');
      return;
    }
  }

  if (member.role === 'Paladin') {
    const allies = getActiveParty().sort((a, b) => a.currentHP / a.stats.maxHP - b.currentHP / b.stats.maxHP);
    const lowest = allies[0];
    if (lowest && lowest.currentHP / lowest.stats.maxHP < 0.4 && member.currentMP >= 20) {
      spendMP(member.id, 20);
      addCombatLog(member.name + ' casts Divine Protection! All allies are shielded!', 'info');
      return;
    }
  }

  if (member.id === 'mezstorm') {
    initializeMezstormSpellbookV1();
    const mezLevel = Number(gameState.level || 1);

    // Dedicated v12.56 AoE test: use the first known multi-target spell and
    // apply it to all three real Road Wisp test targets.
    if (battle.mezstormAoETest && Array.isArray(battle.aoeTargets) && battle.aoeTargets.length >= 3) {
      const aoeSpell = battle.mezstormAoESpellId
        ? mezstormSpellById(battle.mezstormAoESpellId)
        : getMezstormKnownSpells(mezLevel).find(s => s.type === 'multi');
      if (aoeSpell && member.currentMP >= aoeSpell.mp) {
        spendMP('mezstorm', aoeSpell.mp);
        const effectiveMez = codexEffectiveStats('mezstorm', member.stats || {});
        const magMod = getModifier(effectiveMez.magic);
        const roll = rollDie(20);
        const total = roll + magMod;
        const baseDamage = Math.max(1, Math.floor(Number(effectiveMez.magic || 10) * Number(aoeSpell.power || 1)));
        if (roll === 20 || total >= Math.max(...battle.aoeTargets.map(t => t.ac))) {
          const dmg = roll === 20 ? baseDamage * 2 : baseDamage;
          battle.aoeTargets.forEach(t => { t.hp = Math.max(0, t.hp - dmg); });
          addCombatLog((roll === 20 ? 'CRITICAL! ' : '') + aoeSpell.emoji + ' Mezstorm casts ' + aoeSpell.name + ' for ' + dmg + ' damage to ALL 3 targets!', roll === 20 ? 'crit' : 'damage');
        } else {
          addCombatLog("Mezstorm's " + aoeSpell.name + ' misses all three targets!', 'info');
        }
        battle.boss = battle.aoeTargets[0];
        return;
      }
    }
    const thunder = mezstormSpellById('thunder_strike');
    const lightning = mezstormSpellById('lightning_bolt');
    const stormSpell = (mezLevel >= 3 && thunder && member.currentMP >= thunder.mp)
      ? thunder
      : lightning;

    if (stormSpell && member.currentMP >= stormSpell.mp) {
      spendMP('mezstorm', stormSpell.mp);
      const effectiveMez = codexEffectiveStats('mezstorm', member.stats || {});
      const magMod = getModifier(effectiveMez.magic);
      const roll = rollDie(20);
      const total = roll + magMod;
      if (roll === 20) {
        const dmg = Math.max(1, Math.floor(Number(effectiveMez.magic || 10) * stormSpell.power)) * 2;
        boss.hp = Math.max(boss.hp - dmg, 0);
        addCombatLog('CRITICAL! ' + stormSpell.emoji + ' Mezstorm casts ' + stormSpell.name + ' for ' + dmg + ' damage!', 'crit');
      } else if (total >= boss.ac) {
        const dmg = Math.max(1, Math.floor(Number(effectiveMez.magic || 10) * stormSpell.power));
        boss.hp = Math.max(boss.hp - dmg, 0);
        addCombatLog(stormSpell.emoji + ' Mezstorm casts ' + stormSpell.name + ' for ' + dmg + ' damage!', 'damage');
      } else {
        addCombatLog("Mezstorm's " + stormSpell.name + ' misses!', 'info');
      }
      return;
    }
  }

  const effectiveMember = codexEffectiveStats(member.id, member.stats);
  const atkMod = getModifier(effectiveMember.atk);
  const roll = rollDie(20);
  const total = roll + atkMod;

  if (roll === 20) {
    const dmg = rollDice(2, 6) * 2 + codexCombatAttackBonus(member.id);
    boss.hp = Math.max(boss.hp - dmg, 0);
    addCombatLog(member.name + ' — Attack — CRITICAL ' + dmg + ' damage', 'crit');
  } else if (total >= boss.ac) {
    const dmg = rollDice(2, 6) + atkMod;
    boss.hp = Math.max(boss.hp - dmg, 0);
    addCombatLog(member.name + ' — Attack — ' + dmg + ' damage', 'damage');
  } else {
    addCombatLog(member.name + ' — Attack — Miss', 'info');
  }
}

function bossAction() {
  const battle = gameState.battleState;
  if (!battle || !battle.active) return;

  const boss = battle.boss;
  const phase = boss.phases[boss.phaseIndex] || boss.phases[0];
  const activeParty = getActiveParty();

  if (activeParty.length === 0) {
    battle.active = false;
    battle.winner = 'boss';
    return;
  }

  const target = activeParty[Math.floor(Math.random() * activeParty.length)];
  const rawDamage = Math.max(1, (phase.damage || 1) + rollDie(6));
  const defenseBonus = codexCombatDefenseBonus(target.id);
  const dmg = Math.max(1, rawDamage - defenseBonus);

  damagePartyMember(target.id, dmg);
  addCombatLog(boss.name + ' — Signature Strike — ' + target.name + ' takes ' + dmg + ' damage' + (defenseBonus > 0 ? ' (DEF -' + defenseBonus + ')' : ''), 'damage');

  if (target.currentHP <= 0) {
    addCombatLog(target.name + ' has fallen!', 'damage');
  }

  if (getActiveParty().length === 0) {
    battle.active = false;
    battle.winner = 'boss';
  }
}


function getCurrentBattleMember() {
  const battle = gameState.battleState;
  if (!battle || !battle.turnOrder.length) return null;
  const turn = battle.turnOrder[battle.turnIndex];
  return turn ? getPartyMember(turn.id) : null;
}

function advanceBattleTurn() {
  const battle = gameState.battleState;
  if (!battle || !battle.active) return;

  const order = battle.turnOrder;
  if (!order.length) {
    battle.active = false;
    battle.winner = 'boss';
    renderBattle();
    return;
  }

  let attempts = 0;
  do {
    battle.turnIndex = (battle.turnIndex + 1) % order.length;
    if (battle.turnIndex === 0) {
      battle.round++;
      // This flag is named "ThisRound" (battle._elizHealUsedThisRound) but
      // was never actually cleared anywhere, which silently turned it into
      // a once-per-battle flag — Eliz could only ever heal a single time in
      // an entire fight. Reset it here so it behaves as its name promises.
      battle._elizHealUsedThisRound = false;
    }
    attempts++;
    const member = getCurrentBattleMember();
    if (member && member.currentHP > 0) return;
  } while (attempts <= order.length);

  battle.active = false;
  battle.winner = 'boss';
  addCombatLog('=== The party has fallen... ===', 'damage');
  renderBattle();
}

function nextTurn() {
  const battle = gameState.battleState;
  if (!battle || !battle.active) return;

  // Advance exactly once to the next living actor.
  advanceBattleTurn();
  if (!battle.active) return;

  const current = getCurrentBattleMember();
  if (!current) return;

  // San's turn is a hard pause. Nothing happens until the player chooses.
  if (current.id === 'san') {
    gameState.battleInputLocked = false;
    battle.waitingForPlayer = true;
    battle.narrative = 'San watches the battlefield. What will she do?';
    renderBattle();
    return;
  }

  battle.waitingForPlayer = false;
  gameState.battleInputLocked = true;
  battle.narrative = current.name + ' acts.';
  renderBattle();

  setTimeout(() => {
    if (!battle.active) return;

    aiAction(current);

    if (battle.boss.hp <= 0) {
      battle.boss.hp = 0;
      if (battle.grind) {
        finishGrindingBattle();
        return;
      }
      battle.active = false;
      battle.winner = 'party';
      codexAwardBossLoot(battle.chapterId, battle.boss && battle.boss.name);
      battle.waitingForPlayer = false;
      gameState.battleInputLocked = false;
      addCombatLog('=== ' + battle.boss.name + ' has been defeated! ===', 'crit');
      renderBattle();
      return;
    }

    if (!battle.active) {
      renderBattle();
      return;
    }

    renderBattle();

    // The next call advances once. If it reaches San, it stops there.
    gameState.battleInputLocked = false;
    nextTurn();
  }, 650);
}

function playerAction(actionType, spellIndex) {
  const battle = gameState.battleState;
  if (!battle || !battle.active || gameState.battleInputLocked) return;

  const current = getCurrentBattleMember();
  if (!current || current.id !== 'san' || current.currentHP <= 0) return;

  const san = current;
  const boss = battle.boss;

  gameState.battleInputLocked = true;

  const finishPlayerAction = () => {
    if (battle.boss.hp <= 0) {
      battle.boss.hp = 0;
      if (battle.grind) {
        finishGrindingBattle();
        return;
      }
      battle.active = false;
      battle.winner = 'party';
      codexAwardBossLoot(battle.chapterId, battle.boss && battle.boss.name);
      battle.waitingForPlayer = false;
      gameState.battleInputLocked = false;
      addCombatLog('=== ' + battle.boss.name + ' has been defeated! ===', 'crit');
      renderBattle();
      return;
    }

    renderBattle();

    setTimeout(() => {
      if (!battle.active) return;

      bossAction();

      if (!battle.active) {
        gameState.battleInputLocked = false;
        renderBattle();
        return;
      }

      renderBattle();
      gameState.battleInputLocked = false;
      nextTurn();
    }, 800);
  };

  if (actionType === 'attack') {
    const effectiveSan = codexEffectiveStats('san', san.stats);
    const magMod = getModifier(effectiveSan.magic);
    const roll = rollDie(20);
    const total = roll + magMod;

    showDice(roll, magMod, total, 'Firebolt', () => {
      if (roll === 20) {
        const dmg = rollDice(2, 6) * 2 + codexCombatMagicBonus('san');
        boss.hp = Math.max(boss.hp - dmg, 0);
        addCombatLog('CRITICAL! San deals ' + dmg + ' damage with Firebolt!', 'crit');
      } else if (total >= boss.ac) {
        const dmg = rollDice(2, 6) + magMod;
        boss.hp = Math.max(boss.hp - dmg, 0);
        addCombatLog('San hits ' + boss.name + ' with Firebolt for ' + dmg + ' damage!', 'damage');
      } else {
        addCombatLog('San misses ' + boss.name + '!', 'info');
      }
      finishPlayerAction();
    });

  } else if (actionType === 'mezSpell' && spellIndex !== undefined) {
    const spell = mezstormSpellById(spellIndex);
    const mez = (gameState.party || []).find(p => p.id === 'mezstorm');
    if (!spell || !mez || !spendMP('mezstorm', spell.mp || 0)) {
      gameState.battleInputLocked = false;
      addCombatLog('Not enough MP!', 'info');
      renderBattle();
      return;
    }
    const effectiveMez = codexEffectiveStats('mezstorm', mez.stats || {});
    const magMod = getModifier(effectiveMez.magic);
    const roll = rollDie(20);
    const total = roll + magMod;
    showDice(roll, magMod, total, spell.name, () => {
      const baseDamage = Math.max(1, Math.floor(
        Number(effectiveMez.magic || 10) * Number(spell.power || 1)
      ));
      if (roll === 20) {
        const dmg = baseDamage * 2;
        boss.hp = Math.max(boss.hp - dmg, 0);
        addCombatLog('CRITICAL! ' + spell.emoji + ' Mezstorm casts ' + spell.name + ' for ' + dmg + ' damage!', 'crit');
      } else if (total >= boss.ac) {
        const dmg = baseDamage;
        boss.hp = Math.max(boss.hp - dmg, 0);
        addCombatLog(spell.emoji + ' Mezstorm casts ' + spell.name + ' on ' + boss.name + ' for ' + dmg + ' damage!', 'damage');
      } else {
        addCombatLog("Mezstorm's " + spell.name + ' misses!', 'info');
      }
      finishPlayerAction();
    });

  } else if (actionType === 'sanSpell' && spellIndex !== undefined) {
    const spell = sanSpellById(spellIndex);
    if (!spell || !spendMP('san', spell.mp || 0)) {
      gameState.battleInputLocked = false;
      addCombatLog('Not enough MP!', 'info');
      renderBattle();
      return;
    }

    if (spell.type === 'defensive') {
      san._arcaneWardTurns = 2;
      addCombatLog(spell.emoji + ' San casts ' + spell.name + '!', 'skill');
      finishPlayerAction();
      return;
    }

    const effectiveSan = codexEffectiveStats('san', san.stats);
    const magMod = getModifier(effectiveSan.magic);
    const roll = rollDie(20);
    const total = roll + magMod;

    showDice(roll, magMod, total, spell.name, () => {
      const baseDamage = Math.max(1, Math.floor(
        Number(effectiveSan.magic || 10) * Number(spell.power || 1)
      ));

      if (roll === 20) {
        const dmg = baseDamage * 2;
        boss.hp = Math.max(boss.hp - dmg, 0);
        addCombatLog('CRITICAL! ' + spell.emoji + ' San casts ' + spell.name + ' for ' + dmg + ' damage!', 'crit');
      } else if (total >= boss.ac) {
        const dmg = baseDamage;
        boss.hp = Math.max(boss.hp - dmg, 0);
        addCombatLog(spell.emoji + ' San casts ' + spell.name + ' on ' + boss.name + ' for ' + dmg + ' damage!', 'damage');
      } else {
        addCombatLog('San\'s ' + spell.name + ' misses!', 'info');
      }
      finishPlayerAction();
    });

  } else if (actionType === 'skill' && spellIndex !== undefined) {
    const spell = san.spells && san.spells[spellIndex];
    if (!spell || !spendMP('san', spell.cost || 0)) {
      gameState.battleInputLocked = false;
      addCombatLog('Not enough MP!', 'info');
      renderBattle();
      return;
    }

    if (spell.type === 'attack') {
      const parts = spell.damage.split('d');
      const count = parseInt(parts[0], 10);
      const sides = parseInt(parts[1], 10);
      const effectiveSan = codexEffectiveStats('san', san.stats);
      const magMod = getModifier(effectiveSan.magic);
      const roll = rollDie(20);
      const total = roll + magMod;

      showDice(roll, magMod, total, spell.name, () => {
        if (roll === 20) {
          const dmg = rollDice(count, sides) * 2;
          boss.hp = Math.max(boss.hp - dmg, 0);
          addCombatLog('CRITICAL! San casts ' + spell.name + ' for ' + dmg + ' damage!', 'crit');
        } else if (total >= boss.ac) {
          const dmg = rollDice(count, sides) + magMod;
          boss.hp = Math.max(boss.hp - dmg, 0);
          addCombatLog('San casts ' + spell.name + ' on ' + boss.name + ' for ' + dmg + ' damage!', 'damage');
        } else {
          addCombatLog('San\'s ' + spell.name + ' misses!', 'info');
        }
        finishPlayerAction();
      });
    } else {
      addCombatLog('San casts ' + spell.name + '!', 'info');
      finishPlayerAction();
    }

  } else if (actionType === 'defend') {
    addCombatLog('San takes a defensive stance!', 'info');
    finishPlayerAction();

  } else if (actionType === 'useItem' && spellIndex) {
    const potions = getPotions();
    const def = CODEX_POTION_DEFS[spellIndex];
    if (!def || !(Number(potions[spellIndex]) > 0)) {
      gameState.battleInputLocked = false;
      addCombatLog('No ' + (def ? def.name : 'item') + ' left!', 'info');
      renderBattle();
      return;
    }
    potions[spellIndex] -= 1;
    // Apply both HP and MP restoration if the item grants both (e.g. the
    // Codex Elixir), instead of only the first that happens to be truthy.
    const gains = [];
    if (def.restoreHP) {
      healPartyMember('san', def.restoreHP);
      gains.push('+' + def.restoreHP + ' HP');
    }
    if (def.restoreMP) {
      restoreMP('san', def.restoreMP);
      gains.push('+' + def.restoreMP + ' MP');
    }
    addCombatLog(def.icon + ' San uses a ' + def.name + ' and recovers ' + gains.join(' and ') + '!', 'heal');
    finishPlayerAction();

  } else {
    gameState.battleInputLocked = false;
  }
}


function renderEquipmentBattlePreview() {
  const el=document.getElementById('equipmentBattlePreview');
  if(!el)return;
  const roster=['san','joel','aisyah','mezstorm','eliz','senedra','zaki'];
  const names={san:'San',joel:'Joel',aisyah:'Aisyah',mezstorm:'Mezstorm',eliz:'Eliz',senedra:'Senedra',zaki:'Zaki'};
  el.innerHTML=roster.map(id=>{
    const b=codexEquipmentBonus(id);
    return '<div class="equipped-row"><strong>'+names[id]+'</strong> — '+
      'ATK +'+b.atk+' · MAG +'+b.magic+' · DEF +'+b.defense+'</div>';
  }).join('');
}


function renderPhysicalEquipmentTest() {
  const el=document.getElementById('physicalEquipmentTest');
  if(!el)return;
  const roster=['san','joel','aisyah','mezstorm','eliz','senedra','zaki'];
  const names={san:'San',joel:'Joel',aisyah:'Aisyah',mezstorm:'Mezstorm',eliz:'Eliz',senedra:'Senedra',zaki:'Zaki'};
  el.innerHTML=roster.map(id=>{
    const bonus=codexCombatAttackBonus(id);
    const sample=codexPhysicalAttackDamage(id,10);
    return '<div class="equipped-row"><strong>'+names[id]+'</strong> — '+
      'ATK bonus +'+bonus+' · sample 10 → <strong>'+sample+'</strong></div>';
  }).join('');
}


function renderVisibleCombatLog() {
  const visible = document.getElementById('visibleCombatLog');
  if (!visible) return;

  const battle = gameState.battleState;
  const lines = battle && Array.isArray(battle.log) ? battle.log.slice(-8) : [];

  visible.innerHTML = lines.length
    ? lines.map(entry =>
        '<div class="combat-log-line">' +
        String(entry.message || entry.text || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') +
        '</div>'
      ).join('')
    : 'Battle messages will appear here.';
  visible.scrollTop = visible.scrollHeight;
}


function renderBattle() {
  renderVisibleCombatLog();
  const battle = gameState.battleState;
  const container = document.getElementById('battleContent');

  if (!battle) {
    container.innerHTML = '<p style="text-align:center;color:var(--parchment-dark);padding:40px;">Select a quest with a boss battle from the Dashboard to begin combat.</p>';
    return;
  }

  const boss = battle.boss;
  const phase = boss.phases[boss.phaseIndex] || boss.phases[0];
  const hpPercent = Math.max(0, Math.min(100, (boss.hp / boss.maxHP) * 100));
  const currentTurn = battle.turnOrder[battle.turnIndex];
  const currentMember = getCurrentBattleMember();

  let html = '<div class="battle-arena">';

  html += '<div class="battle-v2-header">';
  html += '<div class="battle-v2-round">ROUND ' + Number(battle.round || 1) + '</div>';
  html += '<div class="battle-v2-turn">' +
    (currentMember ? (currentMember.name + (currentMember.id === 'san' ? ' — YOUR TURN' : ' — ACTING')) : 'Battle') +
    '</div>';
  html += '</div>';

  // Turn order remains informational only; portraits make it readable at a glance.
  html += '<div class="battle-turn-order" aria-label="Turn order">';
  (battle.turnOrder || []).forEach(turn => {
    const member = getPartyMember(turn.id);
    if (!member) return;
    const active = currentTurn && currentTurn.id === turn.id;
    const dead = member.currentHP <= 0;
    html += '<div class="turn-chip ' + (active ? 'active ' : '') + (dead ? 'dead' : '') + '" title="' +
      String(member.name || '') + '">' +
      safeImage(getPartyArt(member), member.name + ' turn portrait', 'turn-chip-portrait', member.icon) +
      '</div>';
  });
  html += '<div class="turn-chip turn-chip-boss" title="' + String(boss.name || 'Boss') + '">' +
    safeImage(getBossArt(battle.chapterId), boss.name + ' turn portrait', 'turn-chip-portrait', boss.icon) +
    '</div>';
  html += '</div>';

  // Boss section
  html += '<div class="boss-section v2-boss">';
  const bossArt = getBossArt(battle.chapterId);
  html += '<div class="boss-avatar">' +
    safeImage(bossArt, boss.name, 'boss-portrait', boss.icon) +
    '</div>';
  html += '<div class="boss-name">' + boss.name + '</div>';
  html += '<div class="boss-phase">Phase: ' + phase.name + '</div>';
  html += '<div class="boss-hp-bar"><div class="boss-hp-fill" style="width:' + hpPercent + '%"></div><div class="boss-hp-text">' + boss.hp + '/' + boss.maxHP + ' HP</div></div>';
  html += '<div style="font-size:0.8rem;color:var(--parchment-dark);margin-top:8px;">' + phase.desc + '</div>';
  if (battle.mezstormAoETest && Array.isArray(battle.aoeTargets)) {
    html += '<div style="margin-top:12px;padding:10px;border:1px solid rgba(100,180,255,.35);border-radius:8px;">';
    html += '<div style="font-size:.85rem;margin-bottom:6px;">AoE Test Targets</div>';
    battle.aoeTargets.forEach(t => {
      const pct = Math.max(0, Math.min(100, t.hp / t.maxHP * 100));
      html += '<div style="font-size:.78rem;margin:4px 0;">' + t.name + ' — ' + t.hp + '/' + t.maxHP + ' HP <span style="opacity:.75">(' + Math.round(pct) + '%)</span></div>';
    });
    html += '</div>';
  }
  html += '</div>';

  html += '<div class="companion-ai-strip"><span><strong>Companions</strong> use class AI</span><span class="companion-ai-mode">ASSISTED</span></div>';

  // Party cards
  html += '<div class="party-battle-grid">';
  gameState.party.filter(p => p.active).forEach(p => {
    const hp = Math.max(0, Number(p.currentHP) || 0);
    const mp = Math.max(0, Number(p.currentMP) || 0);
    const hpPercent = Math.max(0, Math.min(100, (hp / p.stats.maxHP) * 100));
    const mpPercent = Math.max(0, Math.min(100, (mp / p.stats.maxMP) * 100));
    const isCurrent = currentTurn && currentTurn.id === p.id;
    const isDead = hp <= 0;
    html += '<div class="battle-member ' + (isCurrent ? 'active-turn' : '') + ' ' + (isDead ? 'dead' : '') + '">';
    html += '<div class="battle-member-avatar">' +
      safeImage(getPartyArt(p), p.name + ' portrait', 'battle-portrait', p.icon) +
      '</div>';
    html += '<div class="battle-member-name">' + p.name + '</div>';
    html += '<div class="battle-member-role">' + p.role + '</div>';
    html += '<div class="battle-hp-bar"><div class="battle-hp-fill" style="width:' + hpPercent + '%"></div></div>';
    html += '<div class="battle-hp-text">HP: ' + hp + '/' + p.stats.maxHP + '</div>';
    html += '<div class="battle-mp-bar"><div class="battle-mp-fill" style="width:' + mpPercent + '%"></div></div>';
    html += '<div class="battle-mp-text">MP: ' + mp + '/' + p.stats.maxMP + '</div>';
    html += '</div>';
  });
  html += '</div>';

  // Player actions
  if (battle.active && currentMember && currentMember.id === 'san' && !gameState.battleInputLocked) {
    html += '<div class="battle-actions">';
    html += '<button class="battle-action-btn attack" onclick="playerAction(\'attack\')"><span class="battle-action-icon">⚔️</span><span class="battle-action-label">Attack</span><span class="battle-action-sub">Basic attack</span></button>';

    // San's prepared Codex spells occupy the existing compact action area.
    initializeSanSpellbookV1();
    const sanPreparedV1 = getSanPreparedSpellDataV1();
    sanPreparedV1.forEach(function(spell) {
      html += '<button class="battle-action-btn skill san-spell-v1" onclick="playerAction(\'sanSpell\', \'' +
        spell.id + '\')">' +
        '<span class="battle-action-icon">' + spell.emoji + '</span>' +
        '<span class="battle-action-label">' + spell.name + '</span>' +
        '<span class="battle-action-sub">' + spell.mp + ' MP</span></button>';
    });

    html += '<button class="battle-action-btn defend" onclick="playerAction(\'defend\')"><span class="battle-action-icon">🛡️</span><span class="battle-action-label">Defend</span><span class="battle-action-sub">Reduce damage</span></button>';
    html += '</div>';

    // Potion bar — lets San use an item on her own turn instead of attacking.
    const potions = getPotions();
    html += '<div class="battle-actions potion-bar">';
    html += '<button class="battle-action-btn item" type="button" ' +
      (potions.hpPotion > 0 ? 'onclick="playerAction(\'useItem\',\'hpPotion\')"' : 'disabled style="opacity:.4;cursor:not-allowed;"') +
      '><span class="battle-action-icon">🧪</span><span class="battle-action-label">HP Potion</span><span class="battle-action-sub">+' +
      CODEX_POTION_DEFS.hpPotion.restoreHP + ' HP · x' + potions.hpPotion + '</span></button>';
    html += '<button class="battle-action-btn item" type="button" ' +
      (potions.mpPotion > 0 ? 'onclick="playerAction(\'useItem\',\'mpPotion\')"' : 'disabled style="opacity:.4;cursor:not-allowed;"') +
      '><span class="battle-action-icon">💧</span><span class="battle-action-label">MP Potion</span><span class="battle-action-sub">+' +
      CODEX_POTION_DEFS.mpPotion.restoreMP + ' MP · x' + potions.mpPotion + '</span></button>';
    html += '<button class="battle-action-btn item" type="button" ' +
      (potions.elixir > 0 ? 'onclick="playerAction(\'useItem\',\'elixir\')"' : 'disabled style="opacity:.4;cursor:not-allowed;"') +
      '><span class="battle-action-icon">✨</span><span class="battle-action-label">Codex Elixir</span><span class="battle-action-sub">+' +
      CODEX_POTION_DEFS.elixir.restoreHP + ' HP / +' + CODEX_POTION_DEFS.elixir.restoreMP + ' MP · x' + potions.elixir + '</span></button>';
    html += '</div>';
  } else if (battle.active && currentMember && gameState.battleInputLocked) {
    html += '<div class="battle-turn-status">⚔️ ' + currentMember.name + ' takes their turn.</div>';
  }

  // Compact latest-result display. The underlying full log remains below.
  const latest = Array.isArray(battle.log) && battle.log.length ? battle.log[battle.log.length - 1] : null;
  if (latest && latest.message) {
    html += '<div class="battle-result-strip"><strong>Combat</strong> · ' +
      String(latest.message).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') +
      '</div>';
  }

  html += '<div class="battle-turn-narrative" id="battleTurnNarrative">' +
    (battle.narrative || 'The battle begins...') + '</div>';

  html += '<div class="combat-log" id="combatLog">';
  (battle.log || []).forEach(entry => {
    html += '<div class="combat-log-entry ' + entry.type + '">' + entry.message + '</div>';
  });
  html += '</div>';

  if (!battle.active) {
    if (battle.winner === 'party') {
      html += '<div style="text-align:center;margin-top:20px;">';
      html += '<h3 style="color:var(--green-accent);font-family:Cinzel,serif;">VICTORY!</h3>';
      html += '<p style="color:var(--parchment);">' + boss.name + ' has been defeated!</p>';
      if (battle.grind) {
        html += '<p style="color:var(--parchment-dark);">The road will repopulate. You can return for another encounter.</p>';
        html += '<button class="btn-quest complete" onclick="switchTab(\'explore\')" style="margin-top:12px;">Return to The Unmapped Road</button>';
      } else {
        html += '<button class="btn-quest complete" onclick="completeBattleQuest()" style="margin-top:12px;">Complete Quest</button>';
      }
      html += '</div>';
    } else {
      html += '<div style="text-align:center;margin-top:20px;">';
      html += '<h3 style="color:var(--red-accent);font-family:Cinzel,serif;">DEFEAT...</h3>';
      html += '<p style="color:var(--parchment);">The party has fallen. But bonds transcend defeat.</p>';
      html += '<button class="btn-quest" onclick="retryBattle()" style="margin-top:12px;">Try Again</button>';
      if (battle.grind) {
        html += '<button class="btn-quest complete" onclick="switchTab(\'explore\')" style="margin-top:12px;margin-left:8px;">Return to The Unmapped Road</button>';
      }
      html += '</div>';
    }
  }

  html += '</div>';
  container.innerHTML = html;
}

function completeBattleQuest() {
  const battle = gameState.battleState;
  if (!battle || battle.winner !== 'party') return;

  const chapter = GAME_DATA.chapters.find(c => c.id === battle.chapterId);
  if (chapter && chapter.quest && chapter.quest.memoryFragment) {
    gameState.memories = gameState.memories || [];
    gameState.memories.push(chapter.quest.memoryFragment);
  }

  const chapterId = battle.chapterId;
  completeQuest(chapterId);

  gameState.battleState = null;
  gameState.battleInputLocked = false;

  // Restore the active party after the battle so HP/MP do not remain in
  // their combat-only state between encounters.
  gameState.party.forEach(p => {
    if (p.active) {
      p.currentHP = p.stats.hp;
      p.currentMP = p.stats.mp;
      p.buffs = [];
      p.debuffs = [];
    }
  });

  saveGame();
  switchTab('dashboard');
}

function retryBattle() {
  const battle = gameState.battleState;
  if (!battle) return;
  if (battle.grind) {
    startGrindingBattle(battle.grindZoneId,battle.grindEncounterId);
    return;
  }
  initBattle(battle.chapterId);
}

// ============================================================
// CORE FUNCTIONS
// ============================================================

function installImageDiagnostics() {
  document.addEventListener('error', (event) => {
    const img = event.target;
    if (img && img.tagName === 'IMG') {
      img.classList.add('image-load-failed');
      img.title = 'Image could not be loaded: ' + (img.getAttribute('src') || '');
      console.warn('Aethon Codex image failed to load:', img.getAttribute('src'));
    }
  }, true);
}

function beginGame() {
  installImageDiagnostics();
  document.getElementById('landingPage').style.display = 'none';
  document.getElementById('gameContainer').classList.add('active');
  initParticles();
  updateUI();
}

function startBook(bookNum) {
  document.getElementById('book' + bookNum + 'Transition').classList.remove('active');
  gameState.currentBook = bookNum;
  updateUI();
  saveGame();
}

function closeBook4Transition() {
  document.getElementById('book4Transition').classList.remove('active');
  saveGame();
  switchTab('explore');
}


const CODEX_TRADERS = [
  {
    n:'Lewis', title:'Senior Colleague', zone:'Whispering Woods', zoneLv:1,
    icon:'🧳',
    greeting:'Lewis lays out practical equipment for the road. Nothing extravagant — just enough to get started.',
    stock:[
      {n:'Woodsman Blade', type:'equipment', slot:'weapon', family:'any', atk:2, price:45, d:'A dependable starter weapon.'},
      {n:'Traveler Guard', type:'equipment', slot:'armor', family:'light', defense:2, price:50, d:'Simple protective gear for the road.'},
      {n:'Apprentice Focus', type:'equipment', slot:'weapon', family:'san_focus', magic:1, price:55, d:'A modest focus for a beginning sorcerer.'},
      {n:'Traveler Charm', type:'equipment', slot:'accessory', family:'any', hp:3, price:40, d:'A small charm carried by travelers.'},
      {n:'HP Potion', type:'potion', potionId:'hpPotion', price:15, d:'Restores ' + CODEX_POTION_DEFS.hpPotion.restoreHP + ' HP in battle.'},
      {n:'MP Potion', type:'potion', potionId:'mpPotion', price:20, d:'Restores ' + CODEX_POTION_DEFS.mpPotion.restoreMP + ' MP in battle.'},
      {n:'Potion Refill Bundle', type:'potionBundle', hpPotion:3, mpPotion:5, price:130, d:'Tops up 3 HP Potions and 5 MP Potions in one go.'}
    ]
  },
  {
    n:'Ribald', title:'Arms & Adventuring Merchant', zone:'Merchant Quarter', zoneLv:10,
    icon:'🧳',
    greeting:'Ribald opens a much better-stocked case. Some of these pieces clearly came from adventurers who knew what they were doing.',
    stock:[
      {n:'Robe of Vecna', type:'equipment', slot:'armor', family:'san_focus', magic:8, mp:10, price:1800, d:'BG2-inspired legendary mage robe.'},
      {n:'Staff of the Magi', type:'equipment', slot:'weapon', family:'san_focus', magic:7, atk:2, price:2200, d:'BG2-inspired arcane staff.'},
      {n:'Ring of the Ram', type:'equipment', slot:'accessory', family:'any', magic:4, price:900, d:'BG2-inspired magical ring.'},
      {n:'Girdle of Hill Giant Strength', type:'equipment', slot:'accessory', family:'any', atk:5, price:1100, d:'BG2-inspired strength-enhancing belt.'},
      {n:'Flail of Ages', type:'equipment', slot:'weapon', family:'any', atk:8, price:2400, d:'BG2-inspired enchanted flail.'}
    ]
  }
];
const CODEX_TRADER_BY_NAME = Object.fromEntries(CODEX_TRADERS.map(t=>[t.n,t]));

function renderCodexTraderPanel(){
  const panel=document.getElementById('codexTraderPanel'), list=document.getElementById('codexTraderList');
  const gold=document.getElementById('codexTraderGold');
  if(!panel||!list)return;
  panel.style.display='block';
  if(gold)gold.textContent=Number(gameState.gold||0);
  list.innerHTML=CODEX_TRADERS.map((trader,ti)=>{
    const unlocked=trader.n==='Lewis'||Number(gameState.level||0)>=Number(trader.zoneLv||1);
    let s='<div class="trader-card '+(unlocked?'':'locked')+'"><div class="trader-name">'+trader.icon+' '+trader.n+'</div>';
    s+='<div class="trader-zone">'+trader.title+' · '+trader.zone+'</div>';
    if(!unlocked)s+='<div class="trader-item-meta">🔒 Unlocks at level '+trader.zoneLv+'</div>';
    else{
      s+='<div class="trader-greeting">'+trader.greeting+'</div><div class="trader-stock">';
      trader.stock.forEach((item,ii)=>{
        const basePrice=Number(item.price||0);
        const price=getTraderPriceWithHaggling(basePrice);
        const can=Number(gameState.gold||0)>=price;
        const priceLabel=price<basePrice
          ? '<span style="text-decoration:line-through;opacity:.55">'+basePrice+'G</span> '+price+'G'
          : price+'G';
        s+='<div class="trader-item"><div><div class="trader-item-name">✦ '+item.n+'</div><div class="trader-item-meta">'+item.d+'</div></div>';
        s+='<button class="trader-buy" '+(can?'':'disabled')+' onclick="buyFromCodexTrader(\''+trader.n+'\','+ii+')">'+priceLabel+'</button></div>';
      });
      s+='</div>';
    }
    return s+'</div>';
  }).join('');
}
function openCodexTrader(){
  document.querySelectorAll('.dashboard-container,.journal-container,.party-container,.equipment-container,.inventory-container,.loot-container,.battle-container').forEach(c=>c.classList.remove('active'));
  const panel=document.getElementById('codexTraderPanel');
  if(panel)panel.classList.add('active');
  renderCodexTraderPanel();
}
function buyFromCodexTrader(traderName,itemIndex){
  const trader=CODEX_TRADER_BY_NAME[traderName], item=trader&&trader.stock[itemIndex];
  if(!item)return;
  const basePrice=Number(item.price||0);
  const price=getTraderPriceWithHaggling(basePrice);
  if(Number(gameState.gold||0)<price){showNotification('Not enough gold.');return;}

  if (item.type === 'potion') {
    const potions = getPotions();
    potions[item.potionId] = Number(potions[item.potionId] || 0) + 1;
    gameState.gold -= price;
    saveGame(); renderCodexTraderPanel();
    showNotification('Bought ' + item.n + ' for ' + price + 'G.');
    if (typeof renderTrader === 'function') renderTrader();
    return;
  }

  if (item.type === 'potionBundle') {
    const potions = getPotions();
    potions.hpPotion = Number(potions.hpPotion || 0) + Number(item.hpPotion || 0);
    potions.mpPotion = Number(potions.mpPotion || 0) + Number(item.mpPotion || 0);
    gameState.gold -= price;
    saveGame(); renderCodexTraderPanel();
    showNotification('Bought ' + item.n + ' for ' + price + 'G.');
    if (typeof renderTrader === 'function') renderTrader();
    return;
  }

  const copy={
    ...item,
    name:item.n,
    type:'equipment',
    slot:item.slot || (item.t==='weapon' ? 'weapon' : item.t==='armor' ? 'armor' : item.t),
    atk:Number(item.atk||0),
    mag:Number(item.mag||item.magic||0),
    def:Number(item.def||item.defense||0),
    defense:Number(item.defense||item.def||0),
    acquiredFrom:'trader',
    sourceTrader:traderName
  };
  delete copy.n; delete copy.price;
  codexEnsureEquipmentInventory().push(copy);
  gameState.gold-=price;
  saveGame(); renderCodexTraderPanel(); renderCodexInventory();
  showNotification('Bought '+item.n+' for '+price+'G.');
  if (typeof renderTrader === 'function') renderTrader();
}


function renderTrader() {
  const list=document.getElementById('traderList');
  const gold=document.getElementById('traderGold');
  if(!list)return;
  if(gold)gold.textContent=Number(gameState.gold||0);
  const traders=Array.isArray(CODEX_TRADERS)?CODEX_TRADERS:[];
  let html=traders.map((trader)=>{
    const unlocked=trader.n==='Lewis'||Number(gameState.level||0)>=Number(trader.zoneLv||1);
    let s='<div class="trader-card '+(unlocked?'':'locked')+'">';
    s+='<div class="trader-name">'+(trader.icon||'🧳')+' '+trader.n+'</div>';
    s+='<div class="trader-zone">'+trader.title+' · '+trader.zone+'</div>';
    if(!unlocked){
      s+='<div class="trader-item-meta">🔒 Unlocks at level '+trader.zoneLv+'</div>';
    } else {
      s+='<div class="trader-greeting">'+trader.greeting+'</div><div class="trader-stock">';
      (trader.stock||[]).forEach((item,ii)=>{
        const basePrice=Number(item.price||0);
        const price=getTraderPriceWithHaggling(basePrice);
        const can=Number(gameState.gold||0)>=price;
        const priceLabel=price<basePrice
          ? '<span style="text-decoration:line-through;opacity:.55">'+basePrice+'G</span> '+price+'G'
          : price+'G';
        s+='<div class="trader-item"><div><div class="trader-item-name">✦ '+item.n+'</div>';
        s+='<div class="trader-item-meta">'+item.d+'</div></div>';
        s+='<button class="trader-buy" '+(can?'':'disabled')+
          ' onclick="buyFromCodexTrader(\''+trader.n+'\','+ii+')">'+priceLabel+'</button></div>';
      });
      s+='</div>';
    }
    return s+'</div>';
  }).join('');

  // Sell-back: turn unequipped loot/equipment into gold from the same panel.
  const sellItems = codexInventoryItems();
  html += '<div class="trader-card"><div class="trader-name">💰 Sell Your Loot</div>' +
    '<div class="trader-zone">Any trader here will buy back unequipped gear.</div>';
  if (!sellItems.length) {
    html += '<div class="trader-item-meta">Nothing to sell right now.</div>';
  } else {
    html += '<div class="trader-stock">';
    sellItems.forEach((item, i) => {
      const value = codexItemSellValue(item);
      html += '<div class="trader-item"><div><div class="trader-item-name">✦ ' + item.name +
        '</div><div class="trader-item-meta">' + item.slot + ' · ' + (item.acquiredFrom || 'unknown source') + '</div></div>';
      html += '<button class="trader-buy" data-index="' + i +
        '" onclick="codexSellInventoryItem(Number(this.dataset.index)); renderTrader();">Sell for ' + value + 'G</button></div>';
    });
    html += '</div>';
  }
  html += '</div>';

  list.innerHTML = html;
}


/* ============================================================
   POST-BOOK 4 FRONTIER — v12.18
   "The Unmapped Road" is a gameplay extension of the exploration
   path established in Book 4 Chapter 13. The repeatable combat,
   rewards and encounter names below are Codex gameplay design,
   not additional Book 4 story chapters.
   ============================================================ */

/* ============================================================
   POST-BOOK 4 FRONTIER — v12.86
   The Unmapped Road is now a real repeatable boss zone.
   A boss appears, can be defeated for XP + gold only, then the
   road enters a 3-minute respawn cooldown before a new random
   earlier boss appears.
   ============================================================ */
const CODEX_UNMAPPED_ROAD_RESPAWN_MS = 3 * 60 * 1000;

const CODEX_UNMAPPED_ROAD_BOSS_POOL = [
  {
    id:'astral_devourer', chapterId:31, name:'Astral Devourer', icon:'👻',
    hp:120, ac:15, xp:600, gold:250,
    phaseList:[
      {name:'Material',threshold:80,ac:15,attack:'Possibility Drain',damage:12,desc:'The Devourer feeds on unrealized futures.'},
      {name:'Astral',threshold:50,ac:18,attack:'Consume Paths',damage:18,desc:'It shifts to astral form, becoming harder to hit.'},
      {name:'Void',threshold:20,ac:20,attack:'Primordial Hunger',damage:25,desc:'Desperate and ravenous, it attacks with reckless force.'}
    ]
  },
  {
    id:'infernal_tyrant', chapterId:32, name:'Infernal Tyrant', icon:'🔥',
    hp:140, ac:16, xp:650, gold:275,
    phaseList:[
      {name:'Devotion',threshold:75,ac:16,attack:'Smothering Embrace',damage:14,desc:'The Tyrant wraps the party in suffocating flame.'},
      {name:'Fury',threshold:45,ac:14,attack:'Burning Wrath',damage:22,desc:'Rejected devotion becomes destructive rage.'},
      {name:'Ashes',threshold:15,ac:18,attack:'Final Sacrifice',damage:30,desc:'The Tyrant unleashes one final destructive act.'}
    ]
  },
  {
    id:'veilshaper', chapterId:33, name:'The Veilshaper', icon:'🔮',
    hp:130, ac:17, xp:700, gold:300,
    phaseList:[
      {name:'Reflection',threshold:70,ac:17,attack:'Mirror Strike',damage:15,desc:'The Veilshaper reflects attacks through alternate realities.'},
      {name:'Possibility',threshold:40,ac:19,attack:'What Could Be',damage:20,desc:'Visions of alternate paths distract the party.'},
      {name:'Truth',threshold:10,ac:15,attack:'Absolute Reality',damage:28,desc:'The illusions fall away and raw reality strikes.'}
    ]
  },
  {
    id:'eternal_frost_queen', chapterId:34, name:'Eternal Frost Queen', icon:'❄️',
    hp:150, ac:18, xp:650, gold:275,
    phaseList:[
      {name:'Preservation',threshold:75,ac:18,attack:'Frozen Touch',damage:16,desc:'The Queen tries to preserve the party in ice.'},
      {name:'Despair',threshold:50,ac:16,attack:'Bitter Wind',damage:20,desc:'Her sorrow manifests as cutting frozen winds.'},
      {name:'Thaw',threshold:25,ac:14,attack:'Melting Rage',damage:24,desc:'As the ice melts, the Queen fights with renewed fury.'}
    ]
  },
  {
    id:'abyssal_leviathan', chapterId:35, name:'Abyssal Leviathan', icon:'🐠',
    hp:160, ac:16, xp:800, gold:320,
    phaseList:[
      {name:'Opening',threshold:112,ac:15,attack:'Opening Strike',damage:16,desc:'Abyssal Leviathan tests the party with its opening stance.'},
      {name:'Escalation',threshold:64,ac:17,attack:'Escalating Pressure',damage:24,desc:'Abyssal Leviathan grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:24,ac:19,attack:'Final Resolve',damage:34,desc:'Abyssal Leviathan fights with everything it has left.'}
    ]
  },
  {
    id:'elder_dragon_of_regret', chapterId:36, name:'Elder Dragon of Regret', icon:'🐉',
    hp:180, ac:17, xp:900, gold:360,
    phaseList:[
      {name:'Opening',threshold:126,ac:16,attack:'Opening Strike',damage:18,desc:'Elder Dragon of Regret tests the party with its opening stance.'},
      {name:'Escalation',threshold:72,ac:18,attack:'Escalating Pressure',damage:27,desc:'Elder Dragon of Regret grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:27,ac:20,attack:'Final Resolve',damage:38,desc:'Elder Dragon of Regret fights with everything it has left.'}
    ]
  },
  {
    id:'astral_lord', chapterId:37, name:'Astral Lord', icon:'⭐',
    hp:140, ac:19, xp:700, gold:280,
    phaseList:[
      {name:'Opening',threshold:98,ac:18,attack:'Opening Strike',damage:14,desc:'Astral Lord tests the party with its opening stance.'},
      {name:'Escalation',threshold:56,ac:20,attack:'Escalating Pressure',damage:21,desc:'Astral Lord grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:21,ac:22,attack:'Final Resolve',damage:29,desc:'Astral Lord fights with everything it has left.'}
    ]
  },
  {
    id:'nexus_planarch', chapterId:38, name:'Nexus Planarch', icon:'🏺',
    hp:150, ac:18, xp:750, gold:300,
    phaseList:[
      {name:'Opening',threshold:105,ac:17,attack:'Opening Strike',damage:15,desc:'Nexus Planarch tests the party with its opening stance.'},
      {name:'Escalation',threshold:60,ac:19,attack:'Escalating Pressure',damage:22,desc:'Nexus Planarch grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:22,ac:21,attack:'Final Resolve',damage:32,desc:'Nexus Planarch fights with everything it has left.'}
    ]
  },
  {
    id:'temporal_fracture', chapterId:39, name:'Temporal Fracture', icon:'🔪',
    hp:170, ac:16, xp:850, gold:340,
    phaseList:[
      {name:'Opening',threshold:119,ac:15,attack:'Opening Strike',damage:17,desc:'Temporal Fracture tests the party with its opening stance.'},
      {name:'Escalation',threshold:68,ac:17,attack:'Escalating Pressure',damage:26,desc:'Temporal Fracture grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:26,ac:19,attack:'Final Resolve',damage:36,desc:'Temporal Fracture fights with everything it has left.'}
    ]
  },
  {
    id:'the_last_guard', chapterId:40, name:'The Last Guard', icon:'🛡️',
    hp:200, ac:20, xp:1000, gold:400,
    phaseList:[
      {name:'Opening',threshold:140,ac:19,attack:'Opening Strike',damage:20,desc:'The Last Guard tests the party with its opening stance.'},
      {name:'Escalation',threshold:80,ac:21,attack:'Escalating Pressure',damage:30,desc:'The Last Guard grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:30,ac:23,attack:'Final Resolve',damage:42,desc:'The Last Guard fights with everything it has left.'}
    ]
  },
  {
    id:'scavenger_king', chapterId:41, name:'Scavenger King', icon:'💰',
    hp:130, ac:16, xp:650, gold:260,
    phaseList:[
      {name:'Opening',threshold:91,ac:15,attack:'Opening Strike',damage:13,desc:'Scavenger King tests the party with its opening stance.'},
      {name:'Escalation',threshold:52,ac:17,attack:'Escalating Pressure',damage:20,desc:'Scavenger King grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:20,ac:19,attack:'Final Resolve',damage:27,desc:'Scavenger King fights with everything it has left.'}
    ]
  },
  {
    id:'debt_wraith', chapterId:42, name:'Debt Wraith', icon:'📜',
    hp:150, ac:17, xp:750, gold:300,
    phaseList:[
      {name:'Opening',threshold:105,ac:16,attack:'Opening Strike',damage:15,desc:'Debt Wraith tests the party with its opening stance.'},
      {name:'Escalation',threshold:60,ac:18,attack:'Escalating Pressure',damage:22,desc:'Debt Wraith grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:22,ac:20,attack:'Final Resolve',damage:32,desc:'Debt Wraith fights with everything it has left.'}
    ]
  },
  {
    id:'the_foreman', chapterId:43, name:'The Foreman', icon:'⏰',
    hp:160, ac:18, xp:800, gold:320,
    phaseList:[
      {name:'Opening',threshold:112,ac:17,attack:'Opening Strike',damage:16,desc:'The Foreman tests the party with its opening stance.'},
      {name:'Escalation',threshold:64,ac:19,attack:'Escalating Pressure',damage:24,desc:'The Foreman grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:24,ac:21,attack:'Final Resolve',damage:34,desc:'The Foreman fights with everything it has left.'}
    ]
  },
  {
    id:'widow_s_watch', chapterId:44, name:"Widow's Watch", icon:'💔',
    hp:140, ac:16, xp:700, gold:280,
    phaseList:[
      {name:'Opening',threshold:98,ac:15,attack:'Opening Strike',damage:14,desc:"Widow's Watch tests the party with its opening stance."},
      {name:'Escalation',threshold:56,ac:17,attack:'Escalating Pressure',damage:21,desc:"Widow's Watch grows more aggressive as the fight wears on."},
      {name:'Final Resolve',threshold:21,ac:19,attack:'Final Resolve',damage:29,desc:"Widow's Watch fights with everything it has left."}
    ]
  },
  {
    id:'vanished_guide', chapterId:45, name:'Vanished Guide', icon:'🗺️',
    hp:130, ac:17, xp:650, gold:260,
    phaseList:[
      {name:'Opening',threshold:91,ac:16,attack:'Opening Strike',damage:13,desc:'Vanished Guide tests the party with its opening stance.'},
      {name:'Escalation',threshold:52,ac:18,attack:'Escalating Pressure',damage:20,desc:'Vanished Guide grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:20,ac:20,attack:'Final Resolve',damage:27,desc:'Vanished Guide fights with everything it has left.'}
    ]
  },
  {
    id:'the_room', chapterId:46, name:'The Room', icon:'🚪',
    hp:150, ac:16, xp:750, gold:300,
    phaseList:[
      {name:'Opening',threshold:105,ac:15,attack:'Opening Strike',damage:15,desc:'The Room tests the party with its opening stance.'},
      {name:'Escalation',threshold:60,ac:17,attack:'Escalating Pressure',damage:22,desc:'The Room grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:22,ac:19,attack:'Final Resolve',damage:32,desc:'The Room fights with everything it has left.'}
    ]
  },
  {
    id:'rustbound', chapterId:47, name:'Rustbound', icon:'⚔️',
    hp:160, ac:20, xp:800, gold:320,
    phaseList:[
      {name:'Opening',threshold:112,ac:19,attack:'Opening Strike',damage:16,desc:'Rustbound tests the party with its opening stance.'},
      {name:'Escalation',threshold:64,ac:21,attack:'Escalating Pressure',damage:24,desc:'Rustbound grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:24,ac:23,attack:'Final Resolve',damage:34,desc:'Rustbound fights with everything it has left.'}
    ]
  },
  {
    id:'unbroken_storm', chapterId:48, name:'Unbroken Storm', icon:'⛈️',
    hp:170, ac:15, xp:850, gold:340,
    phaseList:[
      {name:'Opening',threshold:119,ac:14,attack:'Opening Strike',damage:17,desc:'Unbroken Storm tests the party with its opening stance.'},
      {name:'Escalation',threshold:68,ac:16,attack:'Escalating Pressure',damage:26,desc:'Unbroken Storm grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:26,ac:18,attack:'Final Resolve',damage:36,desc:'Unbroken Storm fights with everything it has left.'}
    ]
  },
  {
    id:'fading_familiar', chapterId:49, name:'Fading Familiar', icon:'🔥',
    hp:130, ac:16, xp:650, gold:260,
    phaseList:[
      {name:'Opening',threshold:91,ac:15,attack:'Opening Strike',damage:13,desc:'Fading Familiar tests the party with its opening stance.'},
      {name:'Escalation',threshold:52,ac:17,attack:'Escalating Pressure',damage:20,desc:'Fading Familiar grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:20,ac:19,attack:'Final Resolve',damage:27,desc:'Fading Familiar fights with everything it has left.'}
    ]
  },
  {
    id:'echo_of_aisyah', chapterId:50, name:'Echo of Aisyah', icon:'📊',
    hp:140, ac:17, xp:700, gold:280,
    phaseList:[
      {name:'Opening',threshold:98,ac:16,attack:'Opening Strike',damage:14,desc:'Echo of Aisyah tests the party with its opening stance.'},
      {name:'Escalation',threshold:56,ac:18,attack:'Escalating Pressure',damage:21,desc:'Echo of Aisyah grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:21,ac:20,attack:'Final Resolve',damage:29,desc:'Echo of Aisyah fights with everything it has left.'}
    ]
  },
  {
    id:'the_tired_version', chapterId:51, name:'The Tired Version', icon:'😔',
    hp:180, ac:16, xp:900, gold:360,
    phaseList:[
      {name:'Opening',threshold:126,ac:15,attack:'Opening Strike',damage:18,desc:'The Tired Version tests the party with its opening stance.'},
      {name:'Escalation',threshold:72,ac:17,attack:'Escalating Pressure',damage:27,desc:'The Tired Version grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:27,ac:19,attack:'Final Resolve',damage:38,desc:'The Tired Version fights with everything it has left.'}
    ]
  },
  {
    id:'the_splinter_court', chapterId:54, name:'The Splinter Court', icon:'⚔️',
    hp:320, ac:16, xp:1600, gold:640,
    phaseList:[
      {name:'Opening',threshold:224,ac:15,attack:'Opening Strike',damage:32,desc:'The Splinter Court tests the party with its opening stance.'},
      {name:'Escalation',threshold:128,ac:17,attack:'Escalating Pressure',damage:48,desc:'The Splinter Court grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:48,ac:19,attack:'Final Resolve',damage:67,desc:'The Splinter Court fights with everything it has left.'}
    ]
  },
  {
    id:'the_unmended', chapterId:56, name:'The Unmended', icon:'⚔️',
    hp:380, ac:14, xp:1900, gold:760,
    phaseList:[
      {name:'Opening',threshold:266,ac:13,attack:'Opening Strike',damage:38,desc:'The Unmended tests the party with its opening stance.'},
      {name:'Escalation',threshold:152,ac:15,attack:'Escalating Pressure',damage:57,desc:'The Unmended grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:57,ac:17,attack:'Final Resolve',damage:80,desc:'The Unmended fights with everything it has left.'}
    ]
  },
  {
    id:'the_relapse', chapterId:57, name:'The Relapse', icon:'⚔️',
    hp:410, ac:15, xp:2050, gold:820,
    phaseList:[
      {name:'Opening',threshold:287,ac:14,attack:'Opening Strike',damage:41,desc:'The Relapse tests the party with its opening stance.'},
      {name:'Escalation',threshold:164,ac:16,attack:'Escalating Pressure',damage:62,desc:'The Relapse grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:62,ac:18,attack:'Final Resolve',damage:86,desc:'The Relapse fights with everything it has left.'}
    ]
  },
  {
    id:'the_wayfinder', chapterId:66, name:'The Wayfinder', icon:'⚔️',
    hp:650, ac:15, xp:3250, gold:1300,
    phaseList:[
      {name:'Opening',threshold:455,ac:14,attack:'Opening Strike',damage:65,desc:'The Wayfinder tests the party with its opening stance.'},
      {name:'Escalation',threshold:260,ac:16,attack:'Escalating Pressure',damage:98,desc:'The Wayfinder grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:98,ac:18,attack:'Final Resolve',damage:136,desc:'The Wayfinder fights with everything it has left.'}
    ]
  },
  {
    id:'the_tidereaver', chapterId:67, name:'The Tidereaver', icon:'⚔️',
    hp:680, ac:16, xp:3400, gold:1360,
    phaseList:[
      {name:'Opening',threshold:476,ac:15,attack:'Opening Strike',damage:68,desc:'The Tidereaver tests the party with its opening stance.'},
      {name:'Escalation',threshold:272,ac:17,attack:'Escalating Pressure',damage:102,desc:'The Tidereaver grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:102,ac:19,attack:'Final Resolve',damage:143,desc:'The Tidereaver fights with everything it has left.'}
    ]
  },
  {
    id:'the_ledgerbound', chapterId:68, name:'The Ledgerbound', icon:'⚔️',
    hp:710, ac:17, xp:3550, gold:1420,
    phaseList:[
      {name:'Opening',threshold:497,ac:16,attack:'Opening Strike',damage:71,desc:'The Ledgerbound tests the party with its opening stance.'},
      {name:'Escalation',threshold:284,ac:18,attack:'Escalating Pressure',damage:106,desc:'The Ledgerbound grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:106,ac:20,attack:'Final Resolve',damage:149,desc:'The Ledgerbound fights with everything it has left.'}
    ]
  },
  {
    id:'the_undertow', chapterId:69, name:'The Undertow', icon:'⚔️',
    hp:740, ac:14, xp:3700, gold:1480,
    phaseList:[
      {name:'Opening',threshold:518,ac:13,attack:'Opening Strike',damage:74,desc:'The Undertow tests the party with its opening stance.'},
      {name:'Escalation',threshold:296,ac:15,attack:'Escalating Pressure',damage:111,desc:'The Undertow grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:111,ac:17,attack:'Final Resolve',damage:155,desc:'The Undertow fights with everything it has left.'}
    ]
  },
  {
    id:'the_horizon_keeper', chapterId:70, name:'The Horizon Keeper', icon:'⚔️',
    hp:770, ac:15, xp:3850, gold:1540,
    phaseList:[
      {name:'Opening',threshold:539,ac:14,attack:'Opening Strike',damage:77,desc:'The Horizon Keeper tests the party with its opening stance.'},
      {name:'Escalation',threshold:308,ac:16,attack:'Escalating Pressure',damage:116,desc:'The Horizon Keeper grows more aggressive as the fight wears on.'},
      {name:'Final Resolve',threshold:116,ac:18,attack:'Final Resolve',damage:162,desc:'The Horizon Keeper fights with everything it has left.'}
    ]
  }
];

function getUnmappedRoadState() {
  if (!gameState.unmappedRoad) {
    gameState.unmappedRoad = {
      currentBossId: null,
      nextSpawnAt: 0
    };
  }
  if (!Number.isFinite(Number(gameState.unmappedRoad.nextSpawnAt))) {
    gameState.unmappedRoad.nextSpawnAt = 0;
  }
  return gameState.unmappedRoad;
}

function getUnmappedRoadBoss(id) {
  return CODEX_UNMAPPED_ROAD_BOSS_POOL.find(b => b.id === id) || null;
}

function chooseUnmappedRoadBoss() {
  return CODEX_UNMAPPED_ROAD_BOSS_POOL[
    Math.floor(Math.random() * CODEX_UNMAPPED_ROAD_BOSS_POOL.length)
  ];
}

function ensureUnmappedRoadSpawn() {
  const state = getUnmappedRoadState();
  const now = Date.now();

  if (state.currentBossId) {
    const current = getUnmappedRoadBoss(state.currentBossId);
    if (current) return current;
    state.currentBossId = null;
  }

  if (now < Number(state.nextSpawnAt || 0)) return null;

  const boss = chooseUnmappedRoadBoss();
  state.currentBossId = boss.id;
  state.nextSpawnAt = 0;
  return boss;
}

function formatUnmappedRoadCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes + ':' + String(seconds).padStart(2, '0');
}

const CODEX_UNMAPPED_ROAD_REGULAR_POOL = [
  {
    id:'road_wisp', name:'Road Wisp', icon:'✨',
    level:20, hp:420, ac:18, xp:420, gold:90,
    damage:18, desc:'A wandering spark left behind by the repaired road.'
  },
  {
    id:'fracture_hound', name:'Fracture Hound', icon:'🐺',
    level:21, hp:560, ac:19, xp:560, gold:120,
    damage:22, desc:'A creature that follows the seams between paths.'
  },
  {
    id:'echo_guardian', name:'Echo Guardian', icon:'⚔️',
    level:22, hp:760, ac:20, xp:760, gold:160,
    damage:26, desc:'A stronger sentinel encountered deeper along the road.'
  },
  {
    id:'horizon_stalker', name:'Horizon Stalker', icon:'🐆',
    level:23, hp:920, ac:21, xp:920, gold:190,
    damage:30, desc:'Something that watches from just past where the map ends.'
  },
  {
    id:'unwritten_sentinel', name:'Unwritten Sentinel', icon:'📖',
    level:24, hp:1080, ac:22, xp:1080, gold:220,
    damage:34, desc:'A guardian assembled from chapters that have not been written yet.'
  },
  {
    id:'threshold_wraith', name:'Threshold Wraith', icon:'🌫️',
    level:25, hp:1260, ac:23, xp:1260, gold:260,
    damage:38, desc:'A shape that lingers exactly on the border between what is known and what is next.'
  }
];

function getUnmappedRoadRegular(id) {
  return CODEX_UNMAPPED_ROAD_REGULAR_POOL.find(e => e.id === id) || null;
}

function renderExplore() {
  const list = document.getElementById('grindEncounterList');
  if (!list) return;

  if (window._unmappedRoadRespawnTimer) {
    clearInterval(window._unmappedRoadRespawnTimer);
    window._unmappedRoadRespawnTimer = null;
  }

  const unlocked = gameState.completedChapters.includes(70) ||
    Boolean(gameState.book4Complete) ||
    Number(gameState.currentBook || 1) >= 4 ||
    Number(gameState.level || 1) >= 20;

  if (!unlocked) {
    list.innerHTML = '<div class="explore-locked">The Unmapped Road becomes available after the Book 4 journey.</div>';
    return;
  }

  const state = getUnmappedRoadState();
  const boss = ensureUnmappedRoadSpawn();

  let html =
    '<div class="grind-zone-card">' +
      '<div class="grind-zone-title">🌌 The Unmapped Road</div>' +
      '<div class="grind-zone-copy">High-level road creatures roam here between the delayed return of earlier bosses.</div>' +
      '<div class="grind-zone-note">Regular encounters are level 20–25. Boss encounters are separate, delayed, and grant XP + gold only. Every boss the party has faced across Books 3 and 4 can be drawn back through the road.</div>' +
    '</div>';

  html += '<div class="grind-zone-card">' +
    '<div class="grind-zone-title">⚔️ Regular Encounters</div>';

  CODEX_UNMAPPED_ROAD_REGULAR_POOL.forEach(e => {
    html +=
      '<div class="grind-encounter">' +
        '<div>' +
          '<div class="grind-name">' + e.icon + ' ' + e.name + ' <span style="opacity:.75">Lv ' + e.level + '</span></div>' +
          '<div class="grind-meta">HP ' + e.hp + ' · AC ' + e.ac + ' · XP ' + e.xp + ' · ' + e.gold + 'G</div>' +
          '<div class="grind-desc">' + e.desc + '</div>' +
        '</div>' +
        '<button class="grind-fight" type="button" onclick="window.codexStartRoadEncounter(this.dataset.roadEncounter)" data-road-encounter="' + e.id + '">Fight</button>' +
      '</div>';
  });
  html += '</div>';

  if (boss) {
    html +=
      '<div class="grind-zone-card">' +
        '<div class="grind-zone-title">👑 A Boss Has Appeared</div>' +
        '<div class="grind-zone-copy">The repaired road has drawn an earlier foe back into the world.</div>' +
        '<div class="grind-encounter">' +
          '<div>' +
            '<div class="grind-name">' + boss.icon + ' ' + boss.name + '</div>' +
            '<div class="grind-meta">HP ' + boss.hp + ' · AC ' + boss.ac + ' · XP ' + boss.xp + ' · ' + boss.gold + 'G</div>' +
            '<div class="grind-desc">Repeatable encounter. Victory grants XP and gold only — no boss equipment or drops.</div>' +
          '</div>' +
          '<button class="grind-fight" type="button" onclick="window.codexStartRoadEncounter(this.dataset.roadEncounter)" data-road-encounter="boss">Fight</button>' +
        '</div>' +
      '</div>';
  } else {
    const remaining = Math.max(0, Number(state.nextSpawnAt || 0) - Date.now());
    html +=
      '<div class="grind-zone-card">' +
        '<div class="grind-zone-title">🕰️ Earlier Bosses — Cooling Down</div>' +
        '<div class="grind-zone-copy">The last boss has been defeated. Regular monsters remain available while another earlier boss is drawn back through the road.</div>' +
        '<div class="grind-respawn">Next boss encounter in <strong id="unmappedRoadCountdown">' +
          formatUnmappedRoadCountdown(remaining) +
        '</strong></div>' +
        '<div class="grind-zone-note">Boss respawn is deliberately delayed and randomly selected.</div>' +
      '</div>';
  }

  html +=
    '<div class="grind-zone-card book5-teaser-card">' +
      '<div class="grind-zone-title">📖 Book V — On the Horizon</div>' +
      '<img src="book5/b5ch2_compress.png" alt="Book 5 preview" class="book5-teaser-img">' +
      '<div class="grind-zone-copy">Beyond the Unmapped Road, the next chapter of the Codex is still being written. Book V continues the Daybreak Seven\'s story — check back as new chapters are added.</div>' +
      '<div class="grind-zone-note">In the meantime, the Unmapped Road keeps every earlier battle alive.</div>' +
    '</div>';

  list.innerHTML = html;

  if (!boss) {
    window._unmappedRoadRespawnTimer = setInterval(() => {
      const el = document.getElementById('unmappedRoadCountdown');
      if (!el) {
        clearInterval(window._unmappedRoadRespawnTimer);
        window._unmappedRoadRespawnTimer = null;
        return;
      }
      const left = Math.max(0, Number(state.nextSpawnAt || 0) - Date.now());
      el.textContent = formatUnmappedRoadCountdown(left);
      if (left <= 0) {
        clearInterval(window._unmappedRoadRespawnTimer);
        window._unmappedRoadRespawnTimer = null;
        renderExplore();
      }
    }, 1000);
  }
}



window.startGrindingBattle = window.startGrindingBattle = function startGrindingBattle(zoneId, encounterId) {
  if (zoneId !== 'unmappedRoad') return false;

  const regular = typeof getUnmappedRoadRegular === 'function'
    ? getUnmappedRoadRegular(encounterId)
    : null;
  const boss = encounterId === 'boss' && typeof ensureUnmappedRoadSpawn === 'function'
    ? ensureUnmappedRoadSpawn()
    : null;
  const enemy = boss || regular;

  if (!enemy) {
    if (typeof showNotification === 'function') showNotification('Encounter not startable.');
    return false;
  }

  const party = (typeof getActiveParty === 'function')
    ? getActiveParty().filter(p => Number(p.currentHP ?? p.stats?.hp ?? 1) > 0)
    : [];

  if (!party.length) {
    if (typeof showNotification === 'function') showNotification('No active party members available.');
    return false;
  }

  // Normalize the enemy to the structure expected by the existing battle UI.
  const maxHp = Number(enemy.hp || enemy.maxHP || 1);
  // Regular Unmapped Road encounters (CODEX_UNMAPPED_ROAD_REGULAR_POOL) don't
  // define a phaseList like the returning bosses do. Without a fallback here,
  // boss.phases ends up [] and both renderBattle() (phase.name) and
  // updateBossPhase() (phase.ac) crash on the very first render/turn.
  const enemyPhases = (Array.isArray(enemy.phaseList) && enemy.phaseList.length)
    ? enemy.phaseList
    : [{
        name: 'Standard',
        threshold: 0,
        ac: Number(enemy.ac || 10),
        attack: enemy.name + ' Strike',
        damage: Number(enemy.damage || 20),
        desc: enemy.desc || (enemy.name + ' attacks.')
      }];
  gameState.battleState = {
    active: true,
    grind: true,
    grindZoneId: 'unmappedRoad',
    grindEncounterId: boss ? boss.id : regular.id,
    grindIsBoss: Boolean(boss),
    chapterId: null,
    boss: {
      id: enemy.id,
      name: enemy.name,
      icon: enemy.icon || '👹',
      hp: maxHp,
      currentHP: maxHp,
      maxHP: maxHp,
      ac: Number(enemy.ac || 10),
      level: Number(enemy.level || 20),
      damage: Number(enemy.damage || 20),
      phaseList: enemyPhases,
      phases: enemyPhases,
      phaseIndex: 0
    },
    round: 1,
    turnIndex: -1,
    turnOrder: party.map(p => ({
      id:p.id,
      initiative:(typeof rollDie === 'function' ? rollDie(20) : 10) +
        (typeof getModifier === 'function' ? getModifier(Number(p.stats?.spd) || 10) : 0)
    })).sort((a,b) => b.initiative-a.initiative),
    log: [],
    narrative: enemy.name + ' appears on The Unmapped Road.',
    waitingForPlayer: false,
    winner: null
  };

  if (typeof addCombatLog === 'function')
    addCombatLog('=== ' + enemy.name + ' appears on The Unmapped Road! ===', 'info');

  gameState.battleInputLocked = false;

  if (typeof switchTab === 'function') switchTab('battle');
  if (typeof renderBattle === 'function') renderBattle();
  if (typeof nextTurn === 'function') nextTurn();

  return true;
}

function finishGrindingBattle() 
{
  const battle = gameState.battleState;
  if (!battle || !battle.grind) return;

  const boss = battle.grindIsBoss ? getUnmappedRoadBoss(battle.grindEncounterId) : null;
  const regular = !boss ? getUnmappedRoadRegular(battle.grindEncounterId) : null;
  const enemy = boss || regular;
  if (!enemy) return;

  addXP(enemy.xp);
  gameState.gold = Number(gameState.gold || 0) + Number(enemy.gold || 0);
  addCombatLog('Reward: +' + enemy.xp + ' XP · +' + enemy.gold + 'G', 'heal');

  if (boss) {
    const state = getUnmappedRoadState();
    state.currentBossId = null;
    state.nextSpawnAt = Date.now() + CODEX_UNMAPPED_ROAD_RESPAWN_MS;
    addCombatLog('The road falls quiet. Another earlier boss will return later.', 'info');
  }

  battle.active = false;
  battle.winner = 'party';
  battle.waitingForPlayer = false;
  gameState.battleInputLocked = false;

  saveGame();
  renderExplore();
}


const CODEX_BOOK4_ROADMAP = [
  {id:1,title:'The Door System Built on Purpose',type:'story / system',boss:''},
  {id:2,title:'The Tribunal of Every Echo',type:'combat',boss:'The Splinter Court'},
  {id:3,title:'The First Break',type:'repair / story',boss:''},
  {id:4,title:'The Slow Work',type:'combat / repair',boss:'The Unmended'},
  {id:5,title:'A Setback Is Not a Failure',type:'combat / recurring fracture',boss:'The Relapse'},
  {id:6,title:'The Question of After',type:'story / repair',boss:''},
  {id:7,title:'Everyone, Together',type:'trial / party challenge',boss:''},
  {id:8,title:'Daybreak',type:'story / world-spirit confirmation',boss:''},
  {id:9,title:'The Pace of Tomorrow',type:'story / transition',boss:''},
  {id:'bonus',title:'The Door We Leave Open',type:'bonus / relationship',boss:''},
  {id:10,title:'The Children Before Me',type:'story / memory',boss:''},
  {id:11,title:'The Things We Choose Not to Repeat',type:'story / memory',boss:''},
  {id:12,title:'The Things We Carry Home',type:'story / memory',boss:''},
  {id:13,title:'The Wayfinder',type:'exploration',boss:''},
  {id:14,title:'The Borrowed Coast',type:'combat',boss:'The Tidereaver'},
  {id:15,title:'The Salt Debt',type:'combat',boss:'The Ledgerbound'},
  {id:16,title:'The Undertow',type:'combat',boss:'The Undertow'},
  {id:17,title:'The Horizon Keeper',type:'combat / act ending',boss:'The Horizon Keeper'}
];

function renderBook4Roadmap(){
  const el=document.getElementById('book4RoadmapList');
  if(!el)return;
  el.innerHTML=CODEX_BOOK4_ROADMAP.map((c,i)=>{
    const label=c.id==='bonus'?'BONUS':('CH. '+c.id);
    const boss=c.boss?'<span class="book4-boss">⚔ '+c.boss+'</span>':'';
    return '<div class="book4-row">'+
      '<div class="book4-ch">'+label+'</div>'+
      '<div class="book4-title">'+c.title+'<span class="book4-type">'+c.type+'</span>'+boss+'</div>'+
      '</div>';
  }).join('');
}
function switchTab(tab) {
  gameState.currentTab = tab;
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const nav = document.querySelector('.nav-tab[data-tab="' + tab + '"]');
  if (nav) nav.classList.add('active');

  const containers = document.querySelectorAll(
    '.dashboard-container, .journal-container, .party-container, .equipment-container, ' +
    '.inventory-container, .loot-container, .trader-container, .explore-container, .battle-container'
  );
  containers.forEach(c => c.classList.remove('active'));

  const content = document.getElementById(tab + 'Tab');
  if (content) content.classList.add('active');

  if (tab === 'journal') { renderJournal(); renderBook4Roadmap(); }
  if (tab === 'party') renderParty();
  if (tab === 'equipment') renderEquipmentFoundation();
  if (tab === 'inventory') renderCodexInventory();
  if (tab === 'loot') renderLootFoundation();
  if (tab === 'trader') renderTrader();
  if (tab === 'battle') renderBattle();
  if (tab === 'explore') renderExplore();
}


function getChapterStatus(chapterId) {
  if (gameState.completedChapters.includes(chapterId)) return 'completed';
  if (gameState.unlockedChapters.includes(chapterId)) return 'unlocked';
  return 'locked';
}

function unlockNextChapter(chapterId) {
  const nextId = chapterId + 1;
  const nextChapter = GAME_DATA.chapters.find(c => c.id === nextId);
  if (nextChapter && !gameState.unlockedChapters.includes(nextId)) {
    gameState.unlockedChapters.push(nextId);
  }
}

function migrateBook4Integration() {
  if (!Array.isArray(gameState.completedChapters)) gameState.completedChapters=[];
  if (!Array.isArray(gameState.unlockedChapters)) gameState.unlockedChapters=[1];
  if (gameState.completedChapters.includes(52) && !gameState.unlockedChapters.includes(53)) {
    gameState.unlockedChapters.push(53);
  }
  if (gameState.completedChapters.includes(52) && Number(gameState.currentBook) < 4) {
    gameState.currentBook = 4;
    gameState.selectedBook = 4;
  }
}



function codexXPThreshold(level) {
  const table = GAME_DATA.xpPerLevel || [];
  if (level < table.length && Number.isFinite(Number(table[level]))) return Number(table[level]);
  // The existing table reaches level 19. Beyond that, Codex deliberately
  // slows progression with a rising threshold rather than stopping the bar.
  const base = Number(table[table.length - 1] || 19000);
  let xp = base;
  for (let lv = table.length; lv <= level; lv++) {
    xp += Math.round(900 + lv * 180);
  }
  return xp;
}

function addXP(amount) {
  const gain = Math.max(0, Number(amount) || 0);
  if (!gain) return;

  gameState.xp += gain;
  showXP(gain);

  let leveled = 0;
  while (gameState.xp >= codexXPThreshold(gameState.level + 1)) {
    gameState.level++;
    leveled++;
  }

  if (leveled) {
    showNotification('Level Up! You are now level ' + gameState.level);
  }
  updateUI();
  saveGame();
}


function showNotification(message) {
  const container = document.getElementById('xpNotification');
  const popup = document.createElement('div');
  popup.className = 'xp-popup';
  popup.style.color = 'var(--blue-glow)';
  popup.textContent = message;
  container.appendChild(popup);
  setTimeout(() => popup.remove(), 3000);
}

function acceptQuest(chapterId, reopenModal = false) {
  if (!gameState.activeQuests.includes(chapterId)) {
    gameState.activeQuests.push(chapterId);
    updateUI();
    saveGame();
  }
  closeQuestModal();
  if (reopenModal) {
    // Let the dashboard/modal DOM finish updating before reopening.
    requestAnimationFrame(() => openQuestModal(chapterId));
  }
}


function getNormalizedQuestRewards(quest) {
  if (!quest) return [];

  const rewards = [];

  // Older Book 1/2 quests store XP and gold directly on quest,
  // while their item rewards use { name, icon, desc }.
  if (typeof quest.xp === 'number') {
    rewards.push({ type: 'xp', value: quest.xp, label: '+' + quest.xp + ' XP' });
  }
  if (typeof quest.gold === 'number') {
    rewards.push({ type: 'gold', value: quest.gold, label: '+' + quest.gold + ' Gold' });
  }

  (quest.rewards || []).forEach(reward => {
    if (!reward) return;

    if (reward.type === 'xp') {
      // Newer Book 3 format.
      if (typeof quest.xp !== 'number') {
        rewards.push({
          type: 'xp',
          value: Number(reward.value) || 0,
          label: reward.label || ('+' + (Number(reward.value) || 0) + ' XP')
        });
      }
      return;
    }

    if (reward.type === 'gold') {
      if (typeof quest.gold !== 'number') {
        rewards.push({
          type: 'gold',
          value: Number(reward.value) || 0,
          label: reward.label || ('+' + (Number(reward.value) || 0) + ' Gold')
        });
      }
      return;
    }

    // Old Book 1/2 item format: { name, icon, desc }
    // New format: { type:'item', label }
    const label = reward.label || reward.name || 'Item';
    rewards.push({
      type: 'item',
      label: (reward.icon ? reward.icon + ' ' : '') + label,
      name: reward.name || label,
      icon: reward.icon || '',
      desc: reward.desc || ''
    });
  });

  return rewards;
}

function completeQuest(chapterId) {

  if (!gameState.readJournal.includes(chapterId)) {
    closeQuestModal();
    showNotification("Read this chapter's journal entry first");
    goReadJournal(chapterId);
    return;
  }
  if (!gameState.completedQuests.includes(chapterId)) {
    gameState.completedQuests.push(chapterId);
    gameState.completedChapters.push(chapterId);
    gameState.activeQuests = gameState.activeQuests.filter(id => id !== chapterId);

    const chapter = GAME_DATA.chapters.find(c => c.id === chapterId);
    if (chapter && chapter.quest) {
      const rewards = getNormalizedQuestRewards(chapter.quest);
      rewards.forEach(reward => {
        if (reward.type === 'xp') {
          addXP(reward.value);
        } else if (reward.type === 'gold') {
          gameState.gold = (gameState.gold || 0) + reward.value;
        } else if (reward.type === 'item') {
          if (!gameState.inventory) gameState.inventory = [];
          gameState.inventory.push(reward);
        } else if (reward.type === 'loot') {
          const acquired = codexAcquireLoot(reward.lootType || 'chest', reward.itemId);
          if (acquired) {
            showNotification('Loot acquired: ' + acquired.name);
          }
        }
      });
    }

    unlockNextChapter(chapterId);

    // Show book transition
    if (chapterId === 11) {
      document.getElementById('book2Transition').classList.add('active');
    } else if (chapterId === 29) {
      document.getElementById('book3Transition').classList.add('active');
    } else if (chapterId === 52) {
      gameState.currentBook = 4;
      gameState.selectedBook = 4;
      showNotification('Book IV — The Open Doors is now available.');
    } else if (chapterId === 70) {
      gameState.book4Complete = true;
      document.getElementById('book4Transition').classList.add('active');
    }

    updateUI();
    saveGame();
  }
  closeQuestModal();
}

function openQuestModal(chapterId) {
  const chapter = GAME_DATA.chapters.find(c => c.id === chapterId);
  if (!chapter) return;

  const isCompleted = gameState.completedQuests.includes(chapterId);
  let isActive = gameState.activeQuests.includes(chapterId);
  const hasBattle = chapterHasInteractiveBattle(chapter);

  // Unlocked quests become active when opened. This preserves the
  // existing quest state model while removing the unnecessary
  // two-click Accept -> reopen -> Read Journal flow.
  if (!isCompleted && !isActive && chapter.quest) {
    gameState.activeQuests.push(chapterId);
    isActive = true;
    saveGame();
  }

  const hasReadJournal = gameState.readJournal.includes(chapterId);

  document.getElementById('modalChapter').textContent = 'Book ' + chapter.book + ' - Chapter ' + chapter.id;
  document.getElementById('modalTitle').textContent = chapter.quest ? chapter.quest.title : chapter.title;
  document.getElementById('modalDesc').textContent = chapter.quest ? chapter.quest.desc : chapter.narrative.substring(0, 200) + '...';
  document.getElementById('modalOutcomeText').textContent = chapter.quest ? chapter.quest.outcome : '';

  const rewardsContainer = document.getElementById('modalRewards');
  rewardsContainer.innerHTML = '';
  if (chapter.quest) {
    getNormalizedQuestRewards(chapter.quest).forEach(reward => {
      const tag = document.createElement('span');
      tag.className = 'reward-tag ' + (
        reward.type === 'xp' ? 'xp' :
        reward.type === 'item' ? 'item' : ''
      );
      tag.textContent = reward.label;
      rewardsContainer.appendChild(tag);
    });
  }

  const actionsContainer = document.getElementById('modalActions');
  actionsContainer.innerHTML = '';

  if (isCompleted) {
    const btn = document.createElement('button');
    btn.className = 'btn-quest';
    btn.textContent = 'Completed';
    btn.disabled = true;
    actionsContainer.appendChild(btn);
  } else if (hasBattle) {
    if (!isActive) {
      const acceptBtn = document.createElement('button');
      acceptBtn.className = 'btn-quest accept';
      acceptBtn.textContent = 'Accept Quest';
      acceptBtn.onclick = () => acceptQuest(chapterId);
      actionsContainer.appendChild(acceptBtn);
    } else if (!hasReadJournal) {
      const readBtn = document.createElement('button');
      readBtn.className = 'btn-quest complete';
      readBtn.textContent = '📖 Read Journal to Unlock';
      readBtn.onclick = () => goReadJournal(chapterId);
      actionsContainer.appendChild(readBtn);
      const note = document.createElement('div');
      note.className = 'quest-lock-note';
      note.textContent = "You must read this chapter's journal entry before you can start the battle.";
      actionsContainer.appendChild(note);
    } else {
      const battleBtn = document.createElement('button');
      battleBtn.className = 'btn-quest battle';
      battleBtn.textContent = '⚔️ Start Battle';
      battleBtn.onclick = () => startBattleFromQuest(chapterId);
      actionsContainer.appendChild(battleBtn);
    }
  } else {
    if (!isActive) {
      const acceptBtn = document.createElement('button');
      acceptBtn.className = 'btn-quest accept';
      acceptBtn.textContent = 'Accept Quest';
      acceptBtn.onclick = () => acceptQuest(chapterId);
      actionsContainer.appendChild(acceptBtn);
    } else if (!hasReadJournal) {
      const readBtn = document.createElement('button');
      readBtn.className = 'btn-quest complete';
      readBtn.textContent = '📖 Read Journal to Unlock';
      readBtn.onclick = () => goReadJournal(chapterId);
      actionsContainer.appendChild(readBtn);
      const note = document.createElement('div');
      note.className = 'quest-lock-note';
      note.textContent = "You must read this chapter's journal entry before you can complete the quest.";
      actionsContainer.appendChild(note);
    } else {
      const completeBtn = document.createElement('button');
      completeBtn.className = 'btn-quest complete';
      completeBtn.textContent = '✓ Complete Quest';
      completeBtn.onclick = () => completeQuest(chapterId);
      actionsContainer.appendChild(completeBtn);
    }
  }

  document.getElementById('questModal').classList.add('active');
}

function closeQuestModal() {
  document.getElementById('questModal').classList.remove('active');
}

function openJournalEntry(chapterId) {
  gameState.journalChapter = chapterId;
  if (!gameState.readJournal.includes(chapterId)) {
    gameState.readJournal.push(chapterId);
  }
  renderJournal();
  updateUI();
  saveGame();
}

function goReadJournal(chapterId) {
  // Close the quest modal first. Keeping the overlay open was causing
  // the "read journal" action to feel stuck and required pressing X.
  closeQuestModal();

  // Render the journal after the tab switch so the old modal cannot
  // visually block the journal and the transition feels immediate.
  requestAnimationFrame(() => {
    switchTab('journal');
    openJournalEntry(chapterId);
  });
}


function renderJournal() {
  const sidebar = document.getElementById('journalSidebar');
  const view = document.getElementById('journalView');

  sidebar.innerHTML = '';
  GAME_DATA.chapters.forEach(chapter => {
    const status = getChapterStatus(chapter.id);
    const btn = document.createElement('button');
    btn.className = 'journal-entry-btn ' + (status === 'locked' ? 'locked' : '') + (gameState.journalChapter === chapter.id ? ' active' : '');
    btn.textContent = 'Ch. ' + chapter.id + ': ' + chapter.title;
    if (status !== 'locked') {
      btn.onclick = () => openJournalEntry(chapter.id);
    }
    sidebar.appendChild(btn);
  });

  if (!gameState.journalChapter) {
    view.innerHTML = '<p style="text-align:center;color:var(--parchment-dark);padding:40px;">Select a chapter from the sidebar to read its journal entry.</p>';
    return;
  }

  const chapter = GAME_DATA.chapters.find(c => c.id === gameState.journalChapter);
  if (!chapter) return;

  const status = getChapterStatus(chapter.id);
  let html = '';

  if (status === 'locked') {
    html += '<div class="quest-lock-note">Complete the previous chapter to unlock this journal entry.</div>';
  } else {
html += '<a href="' + chapter.image + '" target="_blank" class="journal-chapter-img-link"><img src="' + chapter.image + '" alt="' + chapter.title + '" class="journal-chapter-img" loading="lazy"></a>';
    html += '<div class="journal-img-hint">Click image to view full size</div>';
  }

  html += '<h2 class="journal-chapter-title">' + chapter.title + '</h2>';
  html += '<div class="journal-chapter-quote">"' + chapter.quote + '"</div>';

  if (status !== 'locked') {
    html += '<div class="journal-narrative">' + chapter.narrative + '</div>';
    html += '<div class="journal-codex"><div class="journal-codex-title">Codex Note</div><div class="journal-codex-text">' + chapter.codexNote + '</div></div>';
    html += '<div class="journal-hints"><div class="journal-hints-title">System Hints</div><ul class="journal-hints-list">';
    chapter.systemHints.forEach(hint => html += '<li>' + hint + '</li>');
    html += '</ul></div>';
  }

  html += '<button class="btn-quest journal-back-btn" id="journalBackBtn" onclick="switchTab(\'dashboard\')">Back to Dashboard</button>';
  view.innerHTML = html;

  if (status !== 'locked') {
    // Jump to the bottom of the entry so the reader lands on the
    // "Back to Dashboard" button after scrolling through the chapter.
    requestAnimationFrame(() => {
      const backBtn = document.getElementById('journalBackBtn');
      if (backBtn) backBtn.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }
}



function renderCodexInventory() {
  const el=document.getElementById('codexInventoryList');
  if(!el)return;
  const items=codexInventoryItems();
  const state=codexEnsureEquipmentState();
  const potions=getPotions();

  const roster=['san','joel','aisyah','mezstorm','eliz','senedra','zaki'];
  const names={san:'San',joel:'Joel',aisyah:'Aisyah',mezstorm:'Mezstorm',eliz:'Eliz',senedra:'Senedra',zaki:'Zaki'};

  let potionCard='<div class="inventory-card"><div class="inventory-section-title">Potions</div>'+
    '<div class="inventory-item-meta">🧪 HP Potion x'+potions.hpPotion+' · 💧 MP Potion x'+potions.mpPotion+'</div></div>';

  let equipped='<div class="inventory-card"><div class="inventory-section-title">Equipped</div>';

  roster.forEach(id=>{
    const e=state[id]||{};
    const member=(gameState.party||[]).find(p=>p.id===id);
    const base=member && member.stats ? member.stats : {};
    const effective=codexBattleCharacterStats(id,member||{});

    equipped+='<div class="character-equipment-row"><div class="character-equipment-name">'+names[id]+'</div>';

    ['weapon','armor','accessory'].forEach(slot=>{
      const x=e[slot];
      equipped+='<div class="slot-row"><span>'+slot+': '+(x?x.name:'—')+'</span>';
      if(x){
        equipped+='<button class="equip-btn" onclick="codexUnequipFromCharacter(\''+id+'\',\''+slot+'\')">Unequip</button>';
      }
      equipped+='</div>';
    });

    equipped+='<div class="stat-compare">'+
      '<span>ATK '+Number(base.atk||base.attack||0)+' → <strong>'+effective.atk+'</strong></span>'+
      '<span>MAG '+Number(base.magic||base.mag||0)+' → <strong>'+effective.magic+'</strong></span>'+
      '<span>DEF '+Number(base.defense||base.def||base.ac||0)+' → <strong>'+effective.defense+'</strong></span>'+
      '</div></div>';
  });

  equipped+='</div>';

  let inventory='<div class="inventory-card"><div class="inventory-section-title">Inventory</div>';
  if(!items.length) {
    inventory+='<div class="inventory-empty">No unequipped equipment.</div>';
  } else {
    inventory+=items.map((item,i)=>{
      const buttons=roster.filter(id=>codexCanEquip(id,item)).map(id=>
        '<button class="equip-btn" data-index="'+i+'" data-character="'+id+
        '" onclick="codexEquipFromInventory(Number(this.dataset.index), this.dataset.character)">Equip to '+names[id]+'</button>'
      ).join(' ');
      const sellValue=codexItemSellValue(item);
      const sellBtn='<button class="equip-btn sell-btn" data-index="'+i+
        '" onclick="codexSellInventoryItem(Number(this.dataset.index))">Sell for '+sellValue+'G</button>';
      return '<div class="inventory-item"><div class="inventory-item-name">'+item.name+
        '</div><div class="inventory-item-meta">'+item.slot+' · '+(item.acquiredFrom||'unknown source')+
        '</div><div class="equip-actions">'+buttons+' '+sellBtn+'</div></div>';
    }).join('');
  }
  inventory+='</div>';

  el.innerHTML=potionCard+renderCodexCrafting()+equipped+inventory;
}

// Simple valuation for loot/equipment items so traders can buy them back —
// no per-item price table exists yet, so this derives a fair gold value
// from the item's combined stat bonuses (higher-stat gear sells for more).
function codexItemSellValue(item) {
  const statTotal = Number(item.atk||0) + Number(item.magic||item.mag||0) +
    Number(item.defense||item.def||0) + Number(item.hp||0);
  return Math.max(15, 20 + statTotal * 12);
}

function codexSellInventoryItem(index) {
  const inventory = codexEnsureEquipmentInventory();
  const item = inventory[Number(index)];
  if (!item) return;
  const value = codexItemSellValue(item);
  inventory.splice(Number(index), 1);
  gameState.gold = Number(gameState.gold || 0) + value;
  saveGame();
  renderCodexInventory();
  showNotification('Sold ' + item.name + ' for ' + value + 'G.');
}

/* ============================================================
   CODEX CRAFTING — "The Codex remembers what is broken down."
   Two salvage recipes turn any spare, unequipped loot into potions
   (thematically: the Codex reclaims discarded gear as raw essence).
   One signature recipe combines specific early-game loot into a rare
   dual-restore Elixir, so hunting for its ingredients feels like a
   small side-quest rather than just busywork.
   ============================================================ */
const CODEX_RECIPES = [
  {
    id: 'salvage_hp',
    name: 'Salvage into HP Potion',
    icon: '🧪',
    desc: 'The Codex breaks down 2 unequipped items into a restorative brew.',
    namedCost: [],
    anyCost: 2,
    yieldPotion: 'hpPotion',
    yieldAmount: 1
  },
  {
    id: 'salvage_mp',
    name: 'Salvage into MP Potion',
    icon: '💧',
    desc: 'The Codex breaks down 2 unequipped items into a mana-rich brew.',
    namedCost: [],
    anyCost: 2,
    yieldPotion: 'mpPotion',
    yieldAmount: 1
  },
  {
    id: 'codex_elixir',
    name: 'Brew a Codex Elixir',
    icon: '✨',
    desc: 'Requires an Arcane Shard, a Traveler Charm, and one more unequipped item. Yields an elixir that restores both HP and MP at once.',
    namedCost: ['Arcane Shard', 'Traveler Charm'],
    anyCost: 1,
    yieldPotion: 'elixir',
    yieldAmount: 1
  }
];

// Checks feasibility without mutating the inventory: removes the named
// ingredients from a scratch copy first, then confirms enough items remain
// for the "any" portion of the cost.
function codexRecipeCanCraft(recipe) {
  const inventory = codexEnsureEquipmentInventory();
  const remaining = inventory.slice();
  for (const name of (recipe.namedCost || [])) {
    const idx = remaining.findIndex(it => it.name === name);
    if (idx < 0) return false;
    remaining.splice(idx, 1);
  }
  return remaining.length >= Number(recipe.anyCost || 0);
}

function codexCraftRecipe(recipeId) {
  const recipe = CODEX_RECIPES.find(r => r.id === recipeId);
  if (!recipe) return;
  if (!codexRecipeCanCraft(recipe)) {
    showNotification('Missing materials for ' + recipe.name + '.');
    return;
  }

  const inventory = codexEnsureEquipmentInventory();
  (recipe.namedCost || []).forEach(name => {
    const idx = inventory.findIndex(it => it.name === name);
    if (idx >= 0) inventory.splice(idx, 1);
  });
  for (let i = 0; i < Number(recipe.anyCost || 0); i++) {
    if (inventory.length) inventory.splice(0, 1);
  }

  const potions = getPotions();
  potions[recipe.yieldPotion] = Number(potions[recipe.yieldPotion] || 0) + Number(recipe.yieldAmount || 1);

  saveGame();
  renderCodexInventory();
  if (typeof renderTrader === 'function') renderTrader();
  showNotification('Crafted ' + recipe.name + '!');
}

function renderCodexCrafting() {
  let html = '<div class="inventory-card"><div class="inventory-section-title">Codex Crafting</div>';
  CODEX_RECIPES.forEach(recipe => {
    const can = codexRecipeCanCraft(recipe);
    html += '<div class="inventory-item"><div class="inventory-item-name">' + recipe.icon + ' ' + recipe.name + '</div>' +
      '<div class="inventory-item-meta">' + recipe.desc + '</div>' +
      '<div class="equip-actions"><button class="equip-btn" ' +
      (can ? '' : 'disabled style="opacity:.4;cursor:not-allowed;"') +
      ' onclick="codexCraftRecipe(\'' + recipe.id + '\')">Craft</button></div></div>';
  });
  html += '</div>';
  return html;
}

function codexEquipFromInventory(index, characterId) {
  if (codexEquipItem(Number(index), characterId)) {
    saveGame();
    renderCodexInventory();
    showNotification('Equipment equipped. Combat stats are now calculated from equipped gear.');
  }
}

function codexUnequipFromCharacter(characterId, slot) {
  if (codexUnequipItem(characterId, slot)) {
    saveGame();
    renderCodexInventory();
    showNotification('Equipment returned to inventory.');
  }
}


function renderLootFoundation(){
  const el=document.getElementById('lootRoster');
  if(!el)return;
  const labels={chest:'Chests',monster:'Monster Drops',boss:'Boss Drops'};
  el.innerHTML=Object.keys(labels).map(type=>{
    const rows=getCodexLoot(type).map(item=>
      '<div class="loot-item">• '+item.name+' — '+item.slot+
      (item.owner?' · '+item.owner:'')+'</div>'
    ).join('');
    return '<div class="loot-card"><div class="loot-type">'+labels[type]+'</div>'+rows+'</div>';
  }).join('');
}

function renderEquipmentFoundation(){
  const el=document.getElementById('equipmentRoster');
  if(!el)return;
  const core=['san','joel','aisyah','mezstorm','eliz','senedra','zaki'];
  el.innerHTML=core.map(id=>{
    const member=(gameState.party||[]).find(p=>p.id===id);
    const name=member?member.name:id;
    const items=CODEX_EQUIPMENT.filter(item=>codexCanEquip(id,item));
    const list=items.map(item=>'<div class="equipment-slots">• '+item.name+' — '+item.slot+'</div>').join('');
    return '<div class="equipment-card"><div class="equipment-name">'+name+'</div>'+list+'</div>';
  }).join('');
}

function renderParty() {
  const grid = document.getElementById('partyGrid');
  const activeList = document.getElementById('partyActiveList');

  activeList.innerHTML = '';
  gameState.party.filter(p => p.active).forEach(p => {
    const div = document.createElement('div');
    div.className = 'party-active-member';
    div.innerHTML =
      '<span class="member-icon">' + p.icon + '</span>' +
      '<span class="member-name">' + p.name + '</span>' +
      '<span class="member-role">' + p.role + '</span>';
    activeList.appendChild(div);
  });

  grid.innerHTML = '';
  const benchUnlocked = false;

  gameState.party.forEach(member => {
    const card = document.createElement('div');
    card.className =
      'party-card ' +
      (member.joined ? 'joined' : '') +
      ' ' + (!member.active ? 'benched' : '');

    const hpPercent = (member.currentHP / member.stats.maxHP) * 100;
    const mpPercent = (member.currentMP / member.stats.maxMP) * 100;

    let html = '';
    const partyArt = getPartyArt(member);
    html += '<div class="party-avatar">' +
      safeImage(partyArt, member.name + ' portrait', 'party-portrait', member.icon) +
      '</div>';
    html += '<div class="party-name">' + member.name + '</div>';
    html += '<div class="party-role">' + member.role + '</div>';
    html += '<div class="party-desc">' + member.desc + '</div>';
    html += '<div class="party-stats">';
    html += '<div class="party-stat"><div class="party-stat-val">' + member.stats.atk + '</div><div class="party-stat-label">ATK</div></div>';
    html += '<div class="party-stat"><div class="party-stat-val">' + member.stats.def + '</div><div class="party-stat-label">DEF</div></div>';
    html += '<div class="party-stat"><div class="party-stat-val">' + member.stats.mag + '</div><div class="party-stat-label">MAG</div></div>';
    html += '<div class="party-stat"><div class="party-stat-val">' + member.stats.spd + '</div><div class="party-stat-label">SPD</div></div>';
    html += '</div>';
    html += '<div class="party-hp-bar"><div class="party-hp-fill" style="width:' + hpPercent + '%"></div></div>';
    html += '<div class="party-mp-bar"><div class="party-mp-fill" style="width:' + mpPercent + '%"></div></div>';
    html += '<div class="party-skills">';
    member.skills.forEach(skill => html += '<span class="skill-tag">' + skill + '</span>');
    html += '</div>';

    if (member.joined) {
      html += '<div class="party-core-status">' +
        (isFamiliar(member) ? '🐾 Familiar — No Party Slot' : '⭐ Fixed Party') +
        '</div>';
    } else {
      html += '<button class="btn-party join" onclick="recruitMember(\'' +
        member.id + '\')">Recruit</button>';
    }

    card.innerHTML = html;
    grid.appendChild(card);
  });

  // Keep the UI explicit about why bench controls are not present early on.
  const noticeId = 'partyBenchNotice';
  let notice = document.getElementById(noticeId);
  if (false) {
    if (!notice) {
      notice = document.createElement('div');
      notice.id = noticeId;
      notice.className = 'party-bench-notice';
      grid.parentNode.insertBefore(notice, grid);
    }
    notice.textContent =
      'Your core party travels together. Bench / Activate unlocks when additional guild members join.';
  } else if (notice) {
    notice.remove();
  }
}

function togglePartyMember(id) {
  showNotification('The Codex uses a fixed core party. There is no bench system.');
}

function recruitMember(memberId) {
  const member = getPartyMember(memberId);
  if (!member) return;
  member.joined = true;
  member.active = true;
  renderParty();
  saveGame();
}

function updateUI() {
  const currentBookChapters = GAME_DATA.chapters.filter(c => c.book === gameState.currentBook);
  const totalChapters = GAME_DATA.chapters.length;
  const completedCount = gameState.completedChapters.length;
  const progressPercent = Math.round((completedCount / totalChapters) * 100);

  document.getElementById('playerXP').textContent = gameState.xp;
  document.getElementById('playerLevel').textContent = gameState.level;
  document.getElementById('questCount').textContent = completedCount + '/' + totalChapters;

  const nextLevelXP = codexXPThreshold(gameState.level + 1);
  const prevLevelXP = codexXPThreshold(gameState.level);
  const xpProgress = nextLevelXP > prevLevelXP
    ? ((gameState.xp - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100
    : 0;
  document.getElementById('xpBar').style.width = Math.max(0, Math.min(xpProgress, 100)) + '%';

  const ring = document.getElementById('progressRing');
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (progressPercent / 100) * circumference;
  ring.style.strokeDashoffset = offset;
  document.getElementById('progressText').textContent = progressPercent + '%';
  document.getElementById('progressLabel').textContent = completedCount + ' of ' + totalChapters + ' Chapters';
  document.getElementById('currentBookDisplay').textContent = 'Book ' + gameState.currentBook;

  // Active quests
  const activeQuestsContainer = document.getElementById('activeQuests');
  activeQuestsContainer.innerHTML = '';
  if (gameState.activeQuests.length === 0) {
    activeQuestsContainer.innerHTML = '<p style="color:var(--parchment-dark);font-style:italic;">No active quests. Select a chapter to begin.</p>';
  } else {
    gameState.activeQuests.forEach(questId => {
      const chapter = GAME_DATA.chapters.find(c => c.id === questId);
      if (!chapter || !chapter.quest) return;
      const card = document.createElement('div');
      card.className = 'quest-card';
      let html = '';
      html += '<div class="quest-chapter">Chapter ' + chapter.id + '</div>';
      html += '<div class="quest-title">' + chapter.quest.title + '</div>';
      html += '<div class="quest-desc">' + chapter.quest.desc + '</div>';
      html += '<div class="quest-rewards">';
      getNormalizedQuestRewards(chapter.quest).forEach(reward => {
        const cls = reward.type === 'xp' ? 'xp' : (reward.type === 'item' ? 'item' : '');
        html += '<span class="reward-tag ' + cls + '">' + reward.label + '</span>';
      });
      html += '</div>';
      if (!gameState.readJournal.includes(chapter.id)) {
        html += '<div class="quest-lock-note">You must read this chapter\'s journal entry before you can ' + (chapter.quest.hasBattle ? 'start the battle' : 'complete the quest') + '.</div>';
        html += '<button class="btn-quest complete" onclick="goReadJournal(' + chapter.id + ')">📖 Read Journal to Unlock</button>';
      } else if (chapter.quest.hasBattle) {
        html += '<button class="btn-quest battle" onclick="initBattle(' + chapter.id + ')">⚔️ Start Battle</button>';
      } else {
        html += '<button class="btn-quest complete" onclick="completeQuest(' + chapter.id + ')">✓ Complete Quest</button>';
      }
      card.innerHTML = html;
      activeQuestsContainer.appendChild(card);
    });
  }

  // Chapter list
  const chapterList = document.getElementById('chapterList');
  chapterList.innerHTML = '';
  currentBookChapters.forEach(chapter => {
    const status = getChapterStatus(chapter.id);
    const item = document.createElement('div');
    item.className = 'chapter-item ' + status + (gameState.activeQuests.includes(chapter.id) ? ' active' : '');
    item.innerHTML = '<span class="chapter-num">Ch. ' + chapter.id + '</span><span class="chapter-name">' + chapter.title + '</span><span class="chapter-status">' + (status === 'completed' ? '✓' : status === 'locked' ? '🔒' : '○') + '</span>';
    if (status !== 'locked') {
      item.onclick = () => openQuestModal(chapter.id);
    }
    chapterList.appendChild(item);
  });
  migrateBook4Integration();
}

function initParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
    particle.style.animationDelay = (Math.random() * 10) + 's';
    particle.style.width = (Math.random() * 3 + 1) + 'px';
    particle.style.height = particle.style.width;
    container.appendChild(particle);
  }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  initParticles();
  if (hasSavedGame()) {
    document.getElementById('continueRow').style.display = 'block';
  }
});

// Close modal on overlay click
document.getElementById('questModal').addEventListener('click', (e) => {
  if (e.target.id === 'questModal') closeQuestModal();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeQuestModal();
});
