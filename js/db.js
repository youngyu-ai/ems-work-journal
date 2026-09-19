// EMS PWA 3.1
// Generated modular frontend.

let selectedTags = [];
    let stagedFiles = [];
    let followupFiles = [];
    let activeFollowupRecord = null;
    let activeEditRecord = null;
    window.latestSearchResults = [];
    // ===== 速度優化：IndexedDB 搜尋快取 =====
    const SEARCH_CACHE_DB = 'EMSLogCacheV3';
    const SEARCH_CACHE_STORE = 'searches';
    const SEARCH_CACHE_TTL = 2 * 60 * 1000;

function openSearchCacheDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(SEARCH_CACHE_DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(SEARCH_CACHE_STORE))r.result.createObjectStore(SEARCH_CACHE_STORE,{keyPath:'key'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}

async function getSearchCache(key){try{const db=await openSearchCacheDB();return await new Promise((resolve,reject)=>{const r=db.transaction(SEARCH_CACHE_STORE,'readonly').objectStore(SEARCH_CACHE_STORE).get(key);r.onsuccess=()=>{const v=r.result;resolve(v&&Date.now()-v.time<SEARCH_CACHE_TTL?v.data:null);};r.onerror=()=>reject(r.error);});}catch(e){return null;}}

async function setSearchCache(key,data){try{const db=await openSearchCacheDB();await new Promise((resolve,reject)=>{const tx=db.transaction(SEARCH_CACHE_STORE,'readwrite');tx.objectStore(SEARCH_CACHE_STORE).put({key:key,time:Date.now(),data:data});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}catch(e){}}

async function clearSearchCache(){try{const db=await openSearchCacheDB();await new Promise((resolve,reject)=>{const tx=db.transaction(SEARCH_CACHE_STORE,'readwrite');tx.objectStore(SEARCH_CACHE_STORE).clear();tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}catch(e){}}

function searchCacheKey(q,s,e){return [q||'',s||'',e||''].join('|').toLowerCase();}

    // ===== 速度優化：JPEG 照片壓縮 + 3 路並行上傳 =====
