/* ============================================================
   CZM ENGINE — semua pakai prefix czm_ / CZM, zero konflik dgn script.js
   Bridge ke: audio, playlist, currentRealIndex, isPlaying, loadSongByIndex, playAudio, pauseAudio
   ============================================================ */

/* GLOBAL — harus bisa diakses dari semua scope termasuk audio ended */
var czmDisplayOrder = [];
var czmActivePlId   = '__all__';
(function(){
'use strict';

/* ---------- bridge ke state script.js ---------- */
function czmGetAudio()    { return window.audio; }
function czmGetPlaylist() { return window.playlist; }

/* ---------- state ---------- */
let czmCurIdx  = 0;          // index di playlist[]
let czmLiked   = new Set();
let czmLoop    = false;
let czmFilter  = 'all';
let czmBsId    = null;       // id lagu yang dibuka bottom sheet
let czmPls     = JSON.parse(localStorage.getItem('czm_pls')||'[]');
let czmCurPlId = null;
let czmSleepT  = null;

/* ---------- utils ---------- */
function fv(v){
  if(!v||isNaN(v))return'0';
  if(v>=1e9)return(v/1e9).toFixed(1)+' M';
  if(v>=1e6)return(v/1e6).toFixed(1)+' jt';
  if(v>=1e3)return(v/1e3).toFixed(0)+' rb';
  return v+'';
}
function ft(s){
  if(!s||isNaN(s))return'0:00';
  const m=Math.floor(s/60),sc=Math.floor(s%60);
  return m+':'+(sc<10?'0'+sc:sc);
}

/* ---------- filter ---------- */
function czmGetList(f){
  const pl=czmGetPlaylist();
  if(!pl)return[];
  const real=pl.slice(1); // skip index 0 (not found)
  if(f==='all')    return real;
  if(f==='trending')return[...real].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,20);
  if(f==='baru')   return[...real].slice(-15).reverse();
  if(f==='sad')    return real.filter(s=>(s.tags||[]).includes('sad'));
  if(f==='senang') return real.filter(s=>(s.tags||[]).includes('😝🤙🏻'));
  return real;
}

/* ---------- render home ---------- */
function czmRenderHome(f){
  const list=czmGetList(f);
  const quick=list.slice(0,25);       // 5 slides × 5 lagu
  const heroList=quick;               // hero SAMA dengan quick = 25 slide
  const grid =list.slice(5,14);
  const trend=[...list].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,12);
  const body =document.getElementById('czm-home-body');
  if(!body)return;
  body.innerHTML=`
    <!-- HERO SLIDER -->
    <div class="czm-hero" id="czm-hero">
      <div class="czm-hero-track" id="czm-hero-track">
        ${heroList.map((s,i)=>`
          <div class="czm-hero-slide" data-id="${s.id}">
            <img class="czm-hero-img" src="${s.image}" loading="lazy"
              onerror="this.src='https://raw.githubusercontent.com/NdikzDatabase/Database/main/Database/1762559143736-x3crbj.jpg'">
            <div class="czm-hero-overlay">
              <div class="czm-hero-bottom">
                <div class="czm-hero-text">
                  <div class="czm-hero-title">${s.title}</div>
                  <div class="czm-hero-artist">${s.artist} · ${fv(s.views)} pemutaran</div>
                </div>
                <button class="czm-hero-play" onclick="event.stopPropagation();czmPlayById('${s.id}',true)">
                  <i class="fa-solid fa-play" style="margin-left:3px"></i>
                </button>
              </div>
            </div>
          </div>`).join('')}
      </div>
      <div class="czm-hero-dots" id="czm-hero-dots" style="${heroList.length>5?'display:none':''}"">
        ${heroList.map((_,i)=>`<div class="czm-hero-dot${i===0?' active':''}" data-i="${i}"></div>`).join('')}
      </div>
    </div>
    <!-- Pilihan cepat - YT Music slider style -->
    <div style="margin-bottom:8px;">
      <div class="czm-sec-head">
        <span class="czm-sec-title">Pilihan cepat</span>
        <button class="czm-play-all" onclick="czmPlayAll()"><i class="fa-solid fa-play"></i> Putar semua</button>
      </div>
      <div class="czm-qslider-wrap" id="czm-qs-wrap">
        <div class="czm-qslider-track" id="czm-qs-track">
          ${(()=>{
            const slides=[];
            for(let i=0;i<quick.length;i+=5){ slides.push(quick.slice(i,i+5)); }
            return slides.map((slide)=>`
              <div class="czm-qslide">
                ${slide.map(s=>`
                  <div class="czm-qitem" onclick="czmPlayById('${s.id}',true)">
                    <img class="czm-q-thumb" src="${s.image}" loading="lazy" onerror="this.src='https://raw.githubusercontent.com/NdikzDatabase/Database/main/Database/1762559143736-x3crbj.jpg'">
                    <div class="czm-q-info">
                      <div class="czm-q-title">${s.title}</div>
                      <div class="czm-q-sub">${s.artist} · ${fv(s.views)} pemutaran</div>
                    </div>
                    <span class="czm-q-dots" onclick="czmOpenBs('${s.id}',event)">⋮</span>
                  </div>`).join('')}
              </div>`).join('');
          })()}
        </div>
      </div>
      <div class="czm-qdots" id="czm-qdots">
        ${Array.from({length:Math.ceil(quick.length/5)},(_,i)=>`<div class="czm-qdot${i===0?' active':''}" data-i="${i}"></div>`).join('')}
      </div>
    </div>
    <!-- Pintasan cepat -->
    <div>
      <div class="czm-sec-head"><span class="czm-sec-title">Pintasan cepat</span></div>
      <div class="czm-grid">
        ${grid.map(s=>`
          <div class="czm-gcard" onclick="czmPlayById('${s.id}',true)">
            <img src="${s.image}" loading="lazy" onerror="this.src='https://raw.githubusercontent.com/NdikzDatabase/Database/main/Database/1762559143736-x3crbj.jpg'">
            <div class="czm-glabel">${s.title}</div>
          </div>`).join('')}
      </div>
    </div>
    <!-- Trending -->
    <div>
      <div class="czm-sec-head">
        <span class="czm-sec-title">🔥 Sedang Trending</span>
        <span class="czm-sec-link" onclick="czmMood(document.querySelector('.czm-pill[data-f=trending]'),'trending')">Semua ›</span>
      </div>
      <div class="czm-hrow">
        ${trend.map(s=>`
          <div class="czm-hcard" onclick="czmPlayById('${s.id}',true)">
            <img class="czm-h-img" src="${s.image}" loading="lazy" onerror="this.src='https://raw.githubusercontent.com/NdikzDatabase/Database/main/Database/1762559143736-x3crbj.jpg'">
            <div class="czm-h-title">${s.title}</div>
            <div class="czm-h-sub">${s.artist}</div>
          </div>`).join('')}
      </div>
    </div>
    <!-- Semua -->
    <div>
      <div class="czm-sec-head">
        <span class="czm-sec-title">Semua Lagu</span>
        <span class="czm-sec-link">${list.length} lagu</span>
      </div>
      <div class="czm-qlist" id="czm-all-songs-list">
        ${list.slice(0,8).map(s=>`
          <div class="czm-qitem" onclick="czmPlayById('${s.id}',true)">
            <img class="czm-q-thumb" src="${s.image}" loading="lazy" onerror="this.src='https://raw.githubusercontent.com/NdikzDatabase/Database/main/Database/1762559143736-x3crbj.jpg'">
            <div class="czm-q-info">
              <div class="czm-q-title">${s.title}</div>
              <div class="czm-q-sub">${s.artist} • ${fv(s.views)} pemutaran</div>
            </div>
            <span class="czm-q-dots" onclick="czmOpenBs('${s.id}',event)">⋮</span>
          </div>`).join('')}
      </div>
      ${list.length > 8 ? `
      <div id="czm-show-more-wrap" style="text-align:center;padding:16px 20px 12px;">
        <button onclick="czmShowMoreSongs()" style="
          width:100%;
          background:linear-gradient(135deg,rgba(0,217,255,0.15),rgba(0,153,204,0.1));
          border:1.5px solid rgba(0,217,255,0.5);
          color:#00d9ff;
          font-size:14px;
          font-weight:700;
          padding:14px 28px;
          border-radius:14px;
          cursor:pointer;
          -webkit-tap-highlight-color:transparent;
          box-shadow:0 0 18px rgba(0,217,255,0.2);
          letter-spacing:0.3px;
          display:flex;align-items:center;justify-content:center;gap:8px;
        ">
          <i class="fa-solid fa-chevron-down"></i>
          Selengkapnya (${list.length - 8} lagu lagi)
        </button>
      </div>` : ''}
    </div>`;
  // Init hero slider & quick picks slider setelah render
  setTimeout(()=>{ czmInitHero(); czmInitQs(); }, 50);
}

window.czmShowMoreSongs=function(){
  const f=czmFilter||'all';
  const list=czmGetList(f);
  const container=document.getElementById('czm-all-songs-list');
  const wrap=document.getElementById('czm-show-more-wrap');
  if(!container)return;
  // Render semua lagu
  container.innerHTML=list.map(s=>`
    <div class="czm-qitem" onclick="czmPlayById('${s.id}',true)">
      <img class="czm-q-thumb" src="${s.image}" loading="lazy" onerror="this.src='https://raw.githubusercontent.com/NdikzDatabase/Database/main/Database/1762559143736-x3crbj.jpg'">
      <div class="czm-q-info">
        <div class="czm-q-title">${s.title}</div>
        <div class="czm-q-sub">${s.artist} • ${fv(s.views)} pemutaran</div>
      </div>
      <span class="czm-q-dots" onclick="czmOpenBs('${s.id}',event)">⋮</span>
    </div>`).join('');
  if(wrap) wrap.remove();
};

/* ---------- Hero Slider ---------- */
let czmHeroIdx=0, czmHeroTimer=null, czmHeroTotal=0;
function czmInitHero(){
  const track=document.getElementById('czm-hero-track');
  const hero =document.getElementById('czm-hero');
  if(!track||!hero)return;
  const slides=track.querySelectorAll('.czm-hero-slide');
  czmHeroTotal=slides.length;
  czmHeroIdx=0;
  if(czmHeroTotal===0)return;

  // Click slide → play song
  slides.forEach(sl=>{
    sl.addEventListener('click',()=>czmPlayById(sl.dataset.id,true));
  });

  // Dots click
  const dots=document.querySelectorAll('#czm-hero-dots .czm-hero-dot');
  dots.forEach(d=>{
    d.addEventListener('click',e=>{
      e.stopPropagation();
      czmHeroGo(parseInt(d.dataset.i));
    });
  });

  // Touch swipe
  let tx=0;
  hero.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;},{ passive:true });
  hero.addEventListener('touchend',e=>{
    const dx=e.changedTouches[0].clientX-tx;
    if(Math.abs(dx)>40){ dx<0?czmHeroGo(czmHeroIdx+1):czmHeroGo(czmHeroIdx-1); }
  },{ passive:true });

  // Auto slide every 4s
  clearInterval(czmHeroTimer);
  czmHeroTimer=setInterval(()=>czmHeroGo(czmHeroIdx+1),4000);
}
function czmHeroGo(i){
  const track=document.getElementById('czm-hero-track');
  if(!track)return;
  czmHeroIdx=(i+czmHeroTotal)%czmHeroTotal;
  track.style.transform=`translateX(-${czmHeroIdx*100}%)`;
  document.querySelectorAll('#czm-hero-dots .czm-hero-dot').forEach((d,j)=>{
    d.classList.toggle('active', j===czmHeroIdx);
  });
  // Reset timer
  clearInterval(czmHeroTimer);
  czmHeroTimer=setInterval(()=>czmHeroGo(czmHeroIdx+1),4000);
}

/* ---------- Quick Picks Slider ---------- */
let czmQsIdx=0, czmQsTotal=0;
window.czmQsNav=function(dir){
  const track=document.getElementById('czm-qs-track');
  if(!track)return;
  const slides=track.querySelectorAll('.czm-qslide');
  czmQsTotal=slides.length;
  czmQsIdx=Math.max(0,Math.min(czmQsTotal-1, czmQsIdx+dir));
  track.style.transform=`translateX(-${czmQsIdx*100}%)`;
  document.querySelectorAll('#czm-qdots .czm-qdot').forEach((d,j)=>{
    d.classList.toggle('active', j===czmQsIdx);
  });
  // update arrow visibility
  const prev=document.getElementById('czm-qs-prev');
  const next=document.getElementById('czm-qs-next');
  if(prev) prev.style.opacity=czmQsIdx===0?'0.3':'1';
  if(next) next.style.opacity=czmQsIdx>=czmQsTotal-1?'0.3':'1';
};
function czmInitQs(){
  czmQsIdx=0;
  const track=document.getElementById('czm-qs-track');
  if(!track)return;
  czmQsTotal=track.querySelectorAll('.czm-qslide').length;
  if(czmQsTotal===0)return;
  // Touch swipe
  const wrap=document.getElementById('czm-qs-wrap');
  if(!wrap)return;
  let tx=0;
  wrap.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;},{passive:true});
  wrap.addEventListener('touchend',e=>{
    const dx=e.changedTouches[0].clientX-tx;
    if(Math.abs(dx)>40) czmQsNav(dx<0?1:-1);
  },{passive:true});
  // Init arrow state
  const prev=document.getElementById('czm-qs-prev');
  if(prev) prev.style.opacity='0.3';
}

/* ---------- mood pill ---------- */
window.czmMood=function(el,f){
  document.querySelectorAll('#music .czm-pill').forEach(p=>p.classList.remove('active'));
  if(el)el.classList.add('active');
  czmFilter=f;
  czmRenderHome(f);
};

/* ---------- pindahkan dot ke lagu tertentu tanpa reorder ---------- */
function czmMoveDot(id){
  const box=document.getElementById('czm-pl-box');
  if(!box)return;
  box.querySelectorAll('.czm-plitem').forEach((el,i)=>{
    const elId=String(el.dataset.id||'');
    const isMatch=elId===String(id);
    el.classList.toggle('czm-cur',isMatch);
    const numEl=el.querySelector('.czm-pl-num');
    if(numEl){
      if(isMatch) numEl.innerHTML='<span class="czm-dot"></span>';
      else numEl.textContent=i+1;
    }
  });
}

/* ---------- auto next - hanya pindahkan dot, posisi tidak berubah ---------- */
function czmAutoNext(id){
  const pl=czmGetPlaylist();
  if(!pl)return;
  const idx=pl.findIndex(s=>String(s.id)===String(id));
  if(idx<0)return;
  czmCurIdx=idx;
  if(typeof loadSongByIndex==='function') loadSongByIndex(idx);
  if(typeof playAudio==='function') playAudio();
  czmSyncUI(idx, true);
  // Pindahkan dot — pakai timeout kecil agar DOM siap
  setTimeout(()=>czmMoveDot(String(id)), 80);
}

/* ---------- play by id (bridge ke playlist[]) ---------- */
window.czmPlayById=function(id, fromUser){
  const pl=czmGetPlaylist();
  if(!pl)return;
  const idx=pl.findIndex(s=>String(s.id)===String(id));
  if(idx<0)return;
  czmCurIdx=idx;
  if(typeof loadSongByIndex==='function') loadSongByIndex(idx);
  const _npbar = document.getElementById('czm-npbar');
  if(_npbar){
    _npbar.dataset.hasTrack = '1';
    _npbar.style.removeProperty('display');
    _npbar.classList.remove('czm-vis');
  }
  // Delay sedikit agar video/audio src sudah siap sebelum play
  setTimeout(()=>{ if(typeof playAudio==='function') playAudio(); }, 80);
  czmSyncUI(idx, true);
  if(fromUser && czmActivePlId !== '__all__'){
    const userPl = czmPls.find(p => String(p.id) === String(czmActivePlId));
    const isInPl = userPl && userPl.songs.some(sid => String(sid) === String(id));
    if(!isInPl){
      czmActivePlId = '__all__';
      czmDisplayOrder = pl.slice(1).map(s=>String(s.id));
    }
  }
  if(czmDisplayOrder.length===0){
    czmDisplayOrder = pl.slice(1).map(s=>String(s.id));
  }
  const playerEl = document.getElementById('czm-player');
  const isPlayerOpen = playerEl && playerEl.classList.contains('czm-on');
  if(!isPlayerOpen){
    czmOpenPlayer();
    setTimeout(()=>{ czmRenderPlBox(null); }, 420);
  } else {
    czmRenderPlBox(null);
  }
};

/* ---------- sync UI dari playlist[idx] ---------- */
function czmSyncUI(idx, skipPlaylist){
  const pl=czmGetPlaylist();
  if(!pl)return;
  const s=pl[idx];if(!s)return;

  // Handle video vs cover art berdasarkan data lagu
  const hasVideo = !!(s.video && s.video.trim().length > 0);
  const imgEl  = document.getElementById('czm-art');
  const vidEl  = document.getElementById('czm-video');
  const wrap   = document.getElementById('czm-art-wrap');

  if(hasVideo){
    _czmVideoMode = true;
    if(vidEl && vidEl.src !== s.video){
      vidEl.src = s.video;
      vidEl.muted = false;
    }
    if(vidEl)  vidEl.style.display = 'block';
    if(imgEl)  imgEl.style.display = 'none';
    if(wrap)   wrap.classList.add('czm-video-mode');
  } else {
    _czmVideoMode = false;
    if(vidEl){ vidEl.pause(); vidEl.style.display = 'none'; }
    if(imgEl){ imgEl.src = s.image||''; imgEl.style.display = 'block'; }
    if(wrap)   wrap.classList.remove('czm-video-mode');
  }

  // Update ambient glow
  const playerEl=document.getElementById('czm-player');
  if(playerEl && s.image) playerEl.style.setProperty('--czm-bg-img','url('+s.image+')');
  const tiEl=document.getElementById('czm-stitle');
  if(tiEl){
    const newTitle = s.title||'—';
    const prevTitle = tiEl.dataset.origText || tiEl.textContent.trim();
    const titleChanged = prevTitle !== newTitle;
    if(titleChanged){
      tiEl.textContent=newTitle;
      tiEl.dataset.origText='';
      tiEl.dataset.marqueeSet='';
      tiEl.classList.remove('czm-scroll');
      tiEl.style.animation='none';
      void tiEl.offsetWidth;
      tiEl.style.animation='';
      _lastMarqueeTitle = null;
      setTimeout(czmRunMarquee, 500);
      setTimeout(czmRunMarquee, 900);
    }
  }
  const arEl=document.getElementById('czm-sartist');
  if(arEl)arEl.textContent=s.artist||'—';
  const viEl=document.getElementById('czm-sviews');
  if(viEl)viEl.textContent=s.views?fv(s.views)+' pemutaran':'';
  const tEl=document.getElementById('czm-np-thumb');
  if(tEl)tEl.src=s.image||'';
  const ntEl=document.getElementById('czm-np-title');
  if(ntEl)ntEl.textContent=s.title||'—';
  const naEl=document.getElementById('czm-np-artist');
  if(naEl)naEl.textContent=s.artist||'—';
  // marquee npbar
  setTimeout(czmRunNpMarquee, 500);
  // like (thumbs-up style)
  const lb=document.getElementById('czm-like-btn');
  if(lb){
    lb.classList.toggle('liked', czmLiked.has(String(s.id)));
    lb.innerHTML = czmLiked.has(String(s.id))
      ? '<i class="fa-solid fa-thumbs-up"></i> Suka'
      : '<i class="fa-regular fa-thumbs-up"></i> Suka';
  }
  // reset dislike on song change
  const db=document.getElementById('czm-dislike-btn');
  if(db){ db.classList.remove('disliked'); db.innerHTML='<i class="fa-regular fa-thumbs-down"></i> Tidak Suka'; }
  // update topbar source label
  if(typeof czmUpdateTopbarSource==='function') czmUpdateTopbarSource();
  // update now playing row di tab berikutnya
  if(typeof czmUpdateNowPlayingRow==='function') czmUpdateNowPlayingRow();
  // sync topbar mini (tampil saat tab terbuka)
  const tma=document.getElementById('czm-topbar-mini-art');
  const tmt=document.getElementById('czm-topbar-mini-title');
  const tmar=document.getElementById('czm-topbar-mini-artist');
  if(tma) tma.src=s.image||'';
  if(tmt){
    const t=s.title||'—';
    tmt.textContent=t;
    setTimeout(()=>{
      const clipW=tmt.offsetWidth;
      const textW=tmt.scrollWidth;
      if(textW > clipW + 2){
        const gap=60;
        tmt.innerHTML=`<span>${t}<span style="display:inline-block;width:${gap}px;"></span>${t}<span style="display:inline-block;width:${gap}px;"></span></span>`;
        setTimeout(()=>{
          const sp=tmt.querySelector('span');
          if(!sp)return;
          const halfW=sp.scrollWidth/2;
          const dur=Math.max(4,halfW/60)+'s';
          tmt.style.setProperty('--tb-ex',-halfW+'px');
          tmt.style.setProperty('--tb-dur',dur);
        },50);
      } else {
        tmt.innerHTML=`<span style="animation:none;">${t}</span>`;
      }
    },100);
  }
  if(tmar) tmar.textContent=s.artist||'—';
  if(!skipPlaylist) czmRenderPlBox(null);
}

/* ---------- Video Mode (video = sumber utama, gantikan audio) ---------- */
let _czmVideoMode = false;

function czmSetVideoMode(s){
  const artEl = document.getElementById('czm-art');
  const vidEl = document.getElementById('czm-video');
  const wrap  = document.getElementById('czm-art-wrap');
  const badge = document.getElementById('czm-mv-badge');
  const audioEl = document.getElementById('audioPlayer'); // aman: tidak bergantung var audio
  if(!artEl || !vidEl || !wrap) return;

  const hasVideo = s && s.video && s.video.trim().length > 0;
  _czmVideoMode = hasVideo;

  if(hasVideo){
    vidEl.src = s.video;
    vidEl.muted = false;
    vidEl.style.display = 'block';
    artEl.style.display = 'none';
    wrap.classList.add('czm-video-mode');
    if(audioEl){ audioEl.muted = true; audioEl.pause(); audioEl.src = ''; }
    if(badge) badge.style.display = 'none';
  } else {
    vidEl.pause();
    vidEl.src = '';
    vidEl.style.display = 'none';
    artEl.style.display = 'block';
    wrap.classList.remove('czm-video-mode');
    if(audioEl){ audioEl.muted = false; }
    if(badge) badge.style.display = 'none';
  }
}

function czmGetVideo(){ return document.getElementById('czm-video'); }

/* ---------- Sync video play/pause/seek dengan tombol kontrol ---------- */
function czmVideoPlay(){
  const v = czmGetVideo();
  if(_czmVideoMode && v) v.play().catch(()=>{});
}
function czmVideoPause(){
  const v = czmGetVideo();
  if(_czmVideoMode && v) v.pause();
}
function czmVideoSeekTo(t){
  const v = czmGetVideo();
  if(_czmVideoMode && v) v.currentTime = t;
}
function czmVideoSyncBar(){
  const v = czmGetVideo();
  if(!_czmVideoMode || !v || !v.duration) return;
  const pct = (v.currentTime / v.duration) * 100;
  const prog = document.getElementById('czm-prog');
  const thumb = document.getElementById('czm-seek-thumb');
  const cur = document.getElementById('czm-cur');
  const dur = document.getElementById('czm-dur');
  if(prog) prog.style.width = pct + '%';
  if(thumb) thumb.style.left = pct + '%';
  const fmt = t => `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
  if(cur) cur.textContent = fmt(v.currentTime);
  if(dur) dur.textContent = fmt(v.duration);
  const legProg = document.getElementById('progress');
  const legCur  = document.getElementById('current');
  const legDur  = document.getElementById('duration');
  if(legProg) legProg.style.width = pct + '%';
  if(legCur)  legCur.textContent  = fmt(v.currentTime);
  if(legDur)  legDur.textContent  = fmt(v.duration);
  // sync np fill bar
  const nf = document.getElementById('czm-np-fill');
  if(nf) nf.style.width = pct + '%';
}

/* ---------- marquee npbar (now playing bar) ---------- */
let _lastNpMarqueeTitle = null;
function czmRunNpMarquee(){
  const el = document.getElementById('czm-np-title');
  if(!el) return;
  const currentTitle = el.textContent;
  const clip = el.closest('.czm-np-title-clip') || el.parentElement;
  const clipW = clip.offsetWidth || clip.getBoundingClientRect().width;
  const textW = el.scrollWidth;

  if(clipW === 0 || textW === 0){
    setTimeout(czmRunNpMarquee, 300);
    return;
  }

  // Kalau judul sama dan animasi sudah jalan → biarkan terus
  if(currentTitle === _lastNpMarqueeTitle && el.classList.contains('czm-np-scroll')) return;
  _lastNpMarqueeTitle = currentTitle;

  // Reset hanya saat judul baru
  el.classList.remove('czm-np-scroll');
  el.style.removeProperty('--np-start');
  el.style.removeProperty('--np-ex');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';

  if(textW > clipW + 2){
    // Seamless loop: duplikat teks
    const gap=50;
    if(!el.dataset.marqueeSet){
      const orig=el.textContent;
      el.dataset.marqueeSet='1';
      el.innerHTML=`${orig}<span style="display:inline-block;width:${gap}px;"></span>${orig}<span style="display:inline-block;width:${gap}px;"></span>`;
    }
    const fullW=el.scrollWidth/2;
    const dur=Math.max(4,fullW/60)+'s';
    el.style.setProperty('--np-ex',-fullW+'px');
    el.style.setProperty('--np-dur',dur);
    el.classList.add('czm-np-scroll');
  } else {
    el.dataset.marqueeSet='';
  }
}

/* ---------- marquee terpusat ---------- */
let _lastMarqueeTitle = null;
function czmRunMarquee(){
  const el = document.getElementById('czm-stitle');
  if(!el) return;

  // Ambil judul asli
  const currentTitle = el.dataset.origText || el.textContent.trim();
  const clip = el.closest('.czm-title-clip') || el.parentElement;
  const clipW = clip.getBoundingClientRect().width;
  if(clipW === 0) return; // belum visible

  // Kalau judul sama dan animasi benar-benar sedang jalan → biarkan terus
  const animRunning = el.classList.contains('czm-scroll') &&
    getComputedStyle(el).animationPlayState !== 'paused' &&
    el.getAnimations && el.getAnimations().length > 0;
  if(currentTitle === _lastMarqueeTitle && animRunning) return;
  _lastMarqueeTitle = currentTitle;

  // Reset
  el.classList.remove('czm-scroll');
  el.style.animation = 'none';
  el.dataset.marqueeSet = '';
  el.dataset.origText = currentTitle;
  el.textContent = currentTitle;
  void el.offsetWidth;
  el.style.animation = '';

  const textW = el.scrollWidth;
  if(textW > clipW + 2){
    const gap = 60;
    el.dataset.marqueeSet = '1';
    el.innerHTML = `${currentTitle}<span style="display:inline-block;width:${gap}px;"></span>${currentTitle}<span style="display:inline-block;width:${gap}px;"></span>`;
    void el.offsetWidth;
    const fullW = el.scrollWidth / 2;
    const dur = Math.max(4, fullW / 60) + 's';
    el.style.setProperty('--czm-ex', -fullW + 'px');
    el.style.setProperty('--czm-dur', dur);
    el.classList.add('czm-scroll');
  }
}

/* ---------- controls ---------- */
window.czmToggle=function(){
  if(typeof isPlaying==='undefined')return;
  if(isPlaying){if(typeof pauseAudio==='function')pauseAudio();}
  else{if(typeof playAudio==='function')playAudio();}
  czmSyncPlayState();
};
window.czmNext=function(){
  // Kalau ada playlist aktif (bukan semua lagu), navigasi pakai czmDisplayOrder
  if(czmActivePlId !== '__all__' && czmDisplayOrder.length > 0){
    const pl = czmGetPlaylist(); if(!pl) return;
    const cur = pl[czmCurIdx];
    const curId = cur ? String(cur.id) : null;
    const pos = curId ? czmDisplayOrder.indexOf(curId) : -1;
    const nextId = (pos >= 0 && pos + 1 < czmDisplayOrder.length)
      ? czmDisplayOrder[pos + 1]
      : czmDisplayOrder[0]; // wrap ke awal
    czmPlayById(nextId);
    return;
  }
  // Default: semua lagu
  const nb=document.getElementById('nextBtn');if(nb)nb.click();
  setTimeout(()=>{
    const pl=czmGetPlaylist();if(!pl)return;
    czmCurIdx=window.currentRealIndex||0;
    czmSyncUI(czmCurIdx, true);czmSyncPlayState();
  },80);
};
window.czmPrev=function(){
  // Kalau ada playlist aktif, navigasi pakai czmDisplayOrder
  if(czmActivePlId !== '__all__' && czmDisplayOrder.length > 0){
    const pl = czmGetPlaylist(); if(!pl) return;
    const cur = pl[czmCurIdx];
    const curId = cur ? String(cur.id) : null;
    const pos = curId ? czmDisplayOrder.indexOf(curId) : -1;
    const prevId = (pos > 0)
      ? czmDisplayOrder[pos - 1]
      : czmDisplayOrder[czmDisplayOrder.length - 1]; // wrap ke akhir
    czmPlayById(prevId);
    return;
  }
  // Default: semua lagu
  const pb=document.getElementById('prevBtn');if(pb)pb.click();
  setTimeout(()=>{
    const pl=czmGetPlaylist();if(!pl)return;
    czmCurIdx=window.currentRealIndex||0;
    czmSyncUI(czmCurIdx, true);czmSyncPlayState();
  },80);
};
function czmSyncPlayState(){
  const playing=window.isPlaying;
  const ico=document.getElementById('czm-play-ico');const npIco=document.getElementById('czm-np-ico');
  const miniIco=document.getElementById('czm-mini-play-ico');
  if(ico)ico.className=playing?'fa-solid fa-pause':'fa-solid fa-play';
  if(npIco)npIco.className=playing?'fa-solid fa-pause':'fa-solid fa-play';
  if(miniIco)miniIco.className=playing?'fa-solid fa-pause':'fa-solid fa-play';
}
window.czmSeek=function(e){
  if(_czmVideoMode){
    const v = czmGetVideo(); if(!v||!v.duration) return;
    const r=e.currentTarget.getBoundingClientRect();
    v.currentTime=((e.clientX-r.left)/r.width)*v.duration;
    return;
  }
  const au=czmGetAudio();if(!au||!au.duration)return;
  const r=e.currentTarget.getBoundingClientRect();
  au.currentTime=((e.clientX-r.left)/r.width)*au.duration;
};
window.czmPlayAll=function(){const l=czmGetList(czmFilter);if(l.length)czmPlayById(l[0].id,true);};

/* ---------- sync progress dari audio/video ---------- */
function czmTickProgress(){
  // Video mode: progress ditangani ontimeupdate, hanya sync play state
  if(_czmVideoMode){
    czmVideoSyncBar();
    czmSyncPlayState();
    if(typeof window.currentRealIndex!=='undefined'&&window.currentRealIndex!==czmCurIdx){
      czmCurIdx=window.currentRealIndex;
      czmSyncUI(czmCurIdx, true);
      const pl=czmGetPlaylist();
      if(pl&&pl[czmCurIdx]) czmMoveDot(String(pl[czmCurIdx].id));
    }
    return;
  }
  const au=czmGetAudio();if(!au)return;
  if(au.duration){
    const p=(au.currentTime/au.duration)*100;
    const pr=document.getElementById('czm-prog');if(pr)pr.style.width=p+'%';
    const nf=document.getElementById('czm-np-fill');if(nf)nf.style.width=p+'%';
    const cu=document.getElementById('czm-cur');if(cu)cu.textContent=ft(au.currentTime);
    const du=document.getElementById('czm-dur');if(du)du.textContent=ft(au.duration);
  }
  // sync play state
  czmSyncPlayState();
  // sync currentRealIndex
  if(typeof window.currentRealIndex!=='undefined'&&window.currentRealIndex!==czmCurIdx){
    czmCurIdx=window.currentRealIndex;
    czmSyncUI(czmCurIdx, true);
    const pl=czmGetPlaylist();
    if(pl&&pl[czmCurIdx]) czmMoveDot(String(pl[czmCurIdx].id));
  }
}
setInterval(czmTickProgress,500);

/* ---------- visualizer ---------- */
setInterval(()=>{
  const playing=window.isPlaying;
  document.querySelectorAll('#music .czm-vbar').forEach(b=>{
    b.style.height=(playing?4+Math.random()*24:4)+'px';
  });
},140);

/* ---------- navigation ---------- */
window.czmOpenPlayer=function(){
  document.getElementById('czm-home').classList.remove('czm-on');
  const playerEl = document.getElementById('czm-player');
  playerEl.classList.add('czm-on');
  const topBar = document.querySelector('.top-bar');
  if(topBar) topBar.style.display = 'none';
  const _npbar = document.getElementById('czm-npbar');
  if(_npbar) _npbar.classList.remove('czm-vis');
  // Reset tab — sembunyikan list dulu, kembali ke full view
  document.getElementById('czm-tab-next')?.classList.remove('active');
  document.getElementById('czm-tab-related')?.classList.remove('active');
  document.getElementById('czm-tab-content-next')?.classList.add('czm-tab-hidden');
  document.getElementById('czm-tab-content-related')?.classList.add('czm-tab-hidden');
  const _fv2=document.getElementById('czm-full-view'); if(_fv2){_fv2.style.display='flex';requestAnimationFrame(function(){_fv2.classList.remove('czm-hidden');});}
  const _cv2=document.getElementById('czm-collapsed-view'); if(_cv2) _cv2.classList.remove('czm-visible');
  document.getElementById('czm-player')?.classList.remove('czm-tab-open');
  // Pastikan next-header & filter chips tersembunyi saat kembali ke full view
  const _nh2=document.getElementById('czm-next-header'); if(_nh2) _nh2.style.display='none';
  const _si2=document.getElementById('czm-related-search-icon'); if(_si2) _si2.style.display='none';
  // Refresh selector playlist
  czmRefreshPlSelector();
  setTimeout(()=>{
    const _sa=document.getElementById('czm-scroll-area'); 
    if(_sa){ _sa.scrollTop=0; _sa.style.overflowY='hidden'; }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 30);
  czmRenderPlBox(null);
  // Re-trigger marquee setelah animasi slide-in selesai
  setTimeout(czmRunMarquee, 500);
};
window.czmGoHome=function(){
  // Kalau tab sedang terbuka → tutup tab dulu, kembali ke full view
  const playerEl = document.getElementById('czm-player');
  if(playerEl && playerEl.classList.contains('czm-tab-open')){
    // Tutup semua tab, kembali ke full view
    document.getElementById('czm-tab-next')?.classList.remove('active');
    document.getElementById('czm-tab-related')?.classList.remove('active');
    document.getElementById('czm-tab-content-next')?.classList.add('czm-tab-hidden');
    document.getElementById('czm-tab-content-related')?.classList.add('czm-tab-hidden');
    const _fv3=document.getElementById('czm-full-view'); if(_fv3){_fv3.style.display='flex';requestAnimationFrame(function(){_fv3.classList.remove('czm-hidden');});}
    const _cv3=document.getElementById('czm-collapsed-view'); if(_cv3) _cv3.classList.remove('czm-visible');
    playerEl.classList.remove('czm-tab-open');
    // Sembunyikan next-header (filter chips) agar tidak ngebug di full view
    const _nh=document.getElementById('czm-next-header'); if(_nh) _nh.style.display='none';
    // Sembunyikan icon search TERKAIT
    const _si=document.getElementById('czm-related-search-icon'); if(_si) _si.style.display='none';
    const _sa=document.getElementById('czm-scroll-area'); 
    if(_sa){ _sa.scrollTop=0; _sa.style.overflowY='hidden'; }
    setTimeout(czmRunMarquee, 350);
    return; // jangan lanjut ke home
  }
  // Tab tidak terbuka → kembali ke halaman utama
  playerEl.classList.remove('czm-on');
  const m = document.getElementById('czm-more-menu');
  if(m) m.classList.remove('open');
  setTimeout(()=>{
    document.getElementById('czm-home').classList.add('czm-on');
  }, 50);
  const topBar = document.querySelector('.top-bar');
  if(topBar) topBar.style.display = '';
  const _npbar = document.getElementById('czm-npbar');
  if(_npbar && _npbar.dataset.hasTrack === '1'){
    _npbar.classList.add('czm-vis');
    setTimeout(czmRunNpMarquee, 100);
  }
};

/* ---------- search overlay ---------- */
window.czmOpenSearch=function(){
  document.getElementById('czm-search-ov').classList.add('czm-on');
  setTimeout(()=>{const i=document.getElementById('czm-search-inp');if(i)i.focus();},100);
};
window.czmCloseSearch=function(){
  document.getElementById('czm-search-ov').classList.remove('czm-on');
  const i=document.getElementById('czm-search-inp');if(i)i.value='';
  const r=document.getElementById('czm-search-res');if(r)r.innerHTML='';
};
window.czmDoSearch=function(q){
  const r=document.getElementById('czm-search-res');if(!r)return;
  const query=q.trim().toLowerCase();
  if(!query){r.innerHTML='';return;}
  const pl=czmGetPlaylist();if(!pl)return;
  const found=pl.slice(1).filter(s=>s.title.toLowerCase().includes(query)||s.artist.toLowerCase().includes(query));
  if(!found.length){r.innerHTML='<div style="text-align:center;color:#555;padding:48px 0;font-size:14px;">Tidak ditemukan</div>';return;}
  r.innerHTML=found.map(s=>`
    <div class="czm-qitem" onclick="czmCloseSearch();czmPlayById('${s.id}',true)">
      <img class="czm-q-thumb" src="${s.image}" loading="lazy">
      <div class="czm-q-info">
        <div class="czm-q-title">${s.title}</div>
        <div class="czm-q-sub">${s.artist} • ${fv(s.views)} pemutaran</div>
      </div>
    </div>`).join('');
};

/* ---------- filter chips untuk tab BERIKUTNYA ---------- */
let czmPlFilter = 'all';

window.czmSetFilter = function(el, filter) {
  czmPlFilter = filter;
  document.querySelectorAll('#czm-filter-bar .czm-filter-chip').forEach(c => c.classList.remove('active'));
  if(el) el.classList.add('active');
  czmRenderPlBox(null);
};

function czmApplyFilter(list) {
  if(czmPlFilter === 'all') return list;
  if(czmPlFilter === 'populer') {
    return list.slice().sort((a,b) => (b.views||0) - (a.views||0)).slice(0,30);
  }
  if(czmPlFilter === 'temukan') {
    return list.slice().sort(() => Math.random() - 0.5).slice(0,25);
  }
  if(czmPlFilter === 'pesta') {
    const kw = ['pesta','party','aksi','dance','dj','remix','bass','😝'];
    return list.filter(s => {
      const tags = (s.tags||[]).map(t=>t.toLowerCase());
      const title = (s.title||'').toLowerCase();
      const artist = (s.artist||'').toLowerCase();
      return tags.some(t=>kw.some(k=>t.includes(k))) ||
             title.includes('dj') || title.includes('remix') || title.includes('dance') ||
             title.includes('party') || artist.includes('dj');
    });
  }
  if(czmPlFilter === 'romansa') {
    const kw = ['sad','love','heart','cinta','rindu','sayang','hati','galau'];
    return list.filter(s => {
      const tags = (s.tags||[]).map(t=>t.toLowerCase());
      const title = (s.title||'').toLowerCase();
      return tags.some(t=>kw.some(k=>t.includes(k))) || kw.some(k=>title.includes(k));
    });
  }
  return list;
}

/* ---------- player playlist box ---------- */
// Global display order - array of song IDs sesuai urutan tampilan
// (czmDisplayOrder dan czmActivePlId sudah dideklarasi global di atas)

function czmRefreshPlSelector(){
  // Tidak ada dropdown DOM lagi, tapi pastikan czmActivePlId masih valid
  const stillExists = czmActivePlId === '__all__' || czmPls.some(p => String(p.id) === String(czmActivePlId));
  if(!stillExists) czmActivePlId = '__all__';
}

window.czmSwitchPlBox = function(val){
  czmActivePlId = val;
  const inp = document.getElementById('czm-pl-inp');
  if(inp) inp.value = '';
  czmRenderPlBox(null);
};

function czmRenderPlBox(q){
  const box=document.getElementById('czm-pl-box');if(!box)return;
  const pl=czmGetPlaylist();if(!pl)return;
  const cur=pl[czmCurIdx];

  let list;
  if(czmActivePlId === '__all__'){
    // Semua lagu (skip index 0 = placeholder)
    list = pl.slice(1);
  } else {
    // Filter ke playlist user
    const userPl = czmPls.find(p => String(p.id) === String(czmActivePlId));
    if(!userPl || !userPl.songs.length){
      box.innerHTML = '<div style="text-align:center;color:#555;padding:32px 0;font-size:13px;">Playlist kosong.<br>Tambah lagu dari menu ⋮</div>';
      return;
    }
    list = userPl.songs.map(sid => pl.find(s => String(s.id) === String(sid))).filter(Boolean);
  }

  // Filter by search query
  if(q) list = list.filter(s => s.title.toLowerCase().includes(q.toLowerCase()) || s.artist.toLowerCase().includes(q.toLowerCase()));

  // Apply filter chip
  if(!q) list = czmApplyFilter(list);

  // Simpan urutan ID untuk auto-next
  if(!q) czmDisplayOrder = list.map(s=>String(s.id));

  if(!list.length){
    box.innerHTML = '<div style="text-align:center;color:#555;padding:32px 0;font-size:13px;">Lagu tidak ditemukan.</div>';
    return;
  }

  box.innerHTML=list.map((s,i)=>`
    <div class="czm-plitem ${cur&&String(s.id)===String(cur.id)?'czm-cur':''}" data-id="${s.id}" onclick="czmPlayById('${s.id}',true)">
      <span class="czm-pl-num">${cur&&String(s.id)===String(cur.id)?'<span class="czm-dot"></span>':(i+1)}</span>
      <img class="czm-pl-img" src="${s.image}" loading="lazy">
      <div class="czm-pl-t-wrap">
        <div class="czm-pl-t">${s.title}</div>
        <div class="czm-pl-s">${s.artist} • ${fv(s.views)}</div>
      </div>
    </div>`).join('');

  // Set --pl-start dan --pl-ex untuk item yang sedang diputar (marquee kanan→kiri)
  requestAnimationFrame(()=>{
    const curEl = box.querySelector('.czm-plitem.czm-cur');
    if(!curEl) return;
    const titleEl = curEl.querySelector('.czm-pl-t');
    const wrapEl  = curEl.querySelector('.czm-pl-t-wrap');
    if(!titleEl || !wrapEl) return;
    const wrapW = wrapEl.getBoundingClientRect().width;
    const textW = titleEl.scrollWidth;
    // Kalau animasi sudah jalan dengan nilai yang sama, jangan reset
    if(textW > wrapW + 2){
      // Seamless loop: duplikat teks
      const gap=50;
      if(!titleEl.dataset.marqueeSet){
        const orig=titleEl.textContent;
        titleEl.dataset.marqueeSet='1';
        titleEl.innerHTML=`${orig}<span style="display:inline-block;width:${gap}px;"></span>${orig}<span style="display:inline-block;width:${gap}px;"></span>`;
      }
      const fullW=titleEl.scrollWidth/2;
      const dur=Math.max(4,fullW/60)+'s';
      titleEl.style.setProperty('--pl-ex',-fullW+'px');
      titleEl.style.setProperty('--pl-dur',dur);
    } else {
      titleEl.style.animation='none';
      titleEl.dataset.marqueeSet='';
    }
  });
}
window.czmSearchPl=function(v){czmRenderPlBox(v.trim()||null);};

/* ---------- more menu ---------- */
window.czmToggleMore=function(){
  const menu = document.getElementById('czm-more-menu');
  const btn  = document.getElementById('czm-more-toggle');
  if(!menu || !btn) return;
  const rect = btn.getBoundingClientRect();
  menu.style.top   = (rect.bottom + 6) + 'px';
  menu.style.right = (window.innerWidth - rect.right) + 'px';
  menu.classList.toggle('open');
};
document.addEventListener('click',function(e){
  const m=document.getElementById('czm-more-menu');
  const t=document.getElementById('czm-more-toggle');
  if(m&&t&&!m.contains(e.target)&&!t.contains(e.target))m.classList.remove('open');
});
// Auto-close menu saat player di-scroll
document.addEventListener('DOMContentLoaded', function(){
  const player = document.getElementById('czm-player');
  if(player){
    player.addEventListener('scroll', function(){
      const m = document.getElementById('czm-more-menu');
      if(m) m.classList.remove('open');
    }, { passive: true });
  }
});
window.czmToggleLoop=function(){
  czmLoop=!czmLoop;
  const au=czmGetAudio();if(au)au.loop=czmLoop;
  // Update loop label di more menu
  const lbl=document.getElementById('czm-loop-lbl');
  if(lbl) lbl.textContent='Loop: '+(czmLoop?'On':'Off');
  // Update ikon di more menu
  const ico=document.getElementById('czm-loop-ico');
  if(ico) ico.style.color=czmLoop?'#fff':'#888';
  // Update tombol repeat di ctrl bar
  const btn=document.getElementById('czm-repeat-btn');
  const ico2=document.getElementById('czm-loop-ico2');
  if(btn) btn.classList.toggle('active', czmLoop);
  if(ico2) ico2.style.color=czmLoop?'#00d9ff':'#aaa';
  if(btn) btn.style.color=czmLoop?'#00d9ff':'';
  document.getElementById('czm-more-menu').classList.remove('open');
};
window.czmDl=function(){
  const pl=czmGetPlaylist();if(!pl)return;
  const s=pl[czmCurIdx];if(!s)return;
  const a=document.createElement('a');
  if(_czmVideoMode && s.video){
    a.href=s.video;a.download=s.title+'.mp4';
  } else {
    a.href=s.audio;a.download=s.title+'.mp3';
  }
  document.body.appendChild(a);a.click();a.remove();
  document.getElementById('czm-more-menu').classList.remove('open');
};

window.czmAddToPlaylistFromMenu=function(){
  document.getElementById('czm-more-menu').classList.remove('open');
  const pl=czmGetPlaylist();if(!pl)return;
  const s=pl[czmCurIdx];if(!s){alert('Tidak ada lagu yang diputar!');return;}
  if(!czmPls.length){
    czmShowNewPlInput(function(name){
      if(!name||!name.trim())return;
      czmPls.push({id:Date.now(),name:name.trim(),songs:[]});
      czmSavePls();
      const p=czmPls[0];
      p.songs.push(String(s.id));czmSavePls();
      czmShowToast('Ditambahkan ke "'+p.name+'"!');
    });
    return;
  }
  if(czmPls.length===1){
    const p=czmPls[0];
    if(p.songs.includes(String(s.id))){
      showSmallNotif('Lagu sudah ada di '+p.name,'info');return;
    }
    p.songs.push(String(s.id));czmSavePls();
    showSmallNotif('Ditambahkan ke '+p.name,'success');return;
  }
  // Lebih dari 1 playlist — tampilkan pilihan
  const overlay=document.createElement('div');
  overlay.id='czm-pls-pick-ov';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(7,15,26,0.65);z-index:99998;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(3px);';

  const rows=czmPls.map(p=>`
    <div onclick="czmPickPlForSong(${p.id},'${s.id}')" style="display:flex;align-items:center;gap:16px;padding:16px 20px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.05);transition:background .13s;" onmousedown="this.style.background='rgba(0,217,255,0.07)'" onmouseup="this.style.background=''" ontouchstart="this.style.background='rgba(0,217,255,0.07)'" ontouchend="this.style.background=''">
      ${(()=>{const _pl=czmGetPlaylist()||[];const _fs=_pl.find(s=>String(s.id)===String(p.songs[0]));return _fs&&_fs.image?`<div style="width:44px;height:44px;border-radius:10px;overflow:hidden;flex-shrink:0;"><img src="${_fs.image}" style="width:100%;height:100%;object-fit:cover;"></div>`:`<div style="width:44px;height:44px;background:#1e4a7a;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 12px rgba(0,217,255,0.25);"><i class="fa-solid fa-music" style="color:#00d9ff;font-size:16px;"></i></div>`;})()}
      <div style="flex:1;min-width:0;">
        <div style="font-size:15px;font-weight:600;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.name}</div>
        <div style="font-size:12px;color:#7a9bb5;margin-top:2px;">${p.songs.length} lagu</div>
      </div>
      <i class="fa-solid fa-chevron-right" style="color:#3a6080;font-size:13px;flex-shrink:0;"></i>
    </div>`).join('');

  overlay.innerHTML=`
    <div style="background:#1e3248;border-radius:20px 20px 0 0;width:100%;max-width:520px;padding:0 0 0;box-shadow:0 -4px 40px rgba(0,0,0,0.6);">
      <div style="display:flex;justify-content:center;padding:10px 0 6px;">
        <div style="width:36px;height:4px;background:rgba(255,255,255,.2);border-radius:2px;"></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 20px 14px;border-bottom:1px solid rgba(255,255,255,.08);">
        <span style="font-size:16px;font-weight:700;color:#fff;">Pilih Playlist</span>
        <button onclick="document.getElementById('czm-pls-pick-ov').remove()" style="background:rgba(255,255,255,0.08);border:none;color:#aaa;font-size:16px;cursor:pointer;padding:6px 10px;border-radius:8px;line-height:1;"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div style="overflow-y:auto;max-height:50vh;">
        ${rows}
        <div id="czm-pls-newrow" style="display:flex;align-items:center;gap:16px;padding:16px 20px;cursor:pointer;transition:background .13s;" onmousedown="this.style.background='rgba(255,255,255,0.04)'" onmouseup="this.style.background=''" ontouchstart="this.style.background='rgba(255,255,255,0.04)'" ontouchend="this.style.background=''">
          <div style="width:44px;height:44px;background:rgba(255,255,255,0.06);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1.5px dashed rgba(255,255,255,.18);">
            <i class="fa-solid fa-plus" style="color:#7a9bb5;font-size:16px;"></i>
          </div>
          <span style="font-size:15px;color:#aaa;">Buat playlist baru</span>
        </div>
      </div>
      <div onclick="document.getElementById('czm-pls-pick-ov').remove()" style="text-align:center;padding:16px;font-size:15px;font-weight:600;color:#aaa;cursor:pointer;border-top:1px solid rgba(255,255,255,.07);letter-spacing:0.3px;">Batal</div>
    </div>`;

  document.body.appendChild(overlay);
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});

  // Fix: attach click event untuk buat playlist baru
  const newRowEl=overlay.querySelector('#czm-pls-newrow');
  if(newRowEl){
    const songIdStr=String(s.id);
    newRowEl.addEventListener('click',function(){
      overlay.remove();
      setTimeout(()=>czmShowNewPlInput(function(name){
        if(!name)return;
        const np={id:Date.now(),name:name,songs:[songIdStr]};
        czmPls.push(np);czmSavePls();czmShowToast('Ditambahkan ke "'+name+'"!');
      }),300);
    });
  }
};

window.czmPickPlForSong=function(plId,songId){
  const ov=document.getElementById('czm-pls-pick-ov');if(ov)ov.remove();
  const p=czmPls.find(x=>x.id===plId);if(!p)return;
  if(p.songs.includes(String(songId))){
    showSmallNotif('Lagu sudah ada di '+p.name,'info');return;
  }
  p.songs.push(String(songId));czmSavePls();
  showSmallNotif('Ditambahkan ke '+p.name,'success');
};
window.czmReportSong=function(){
  const pl=czmGetPlaylist();if(!pl)return;
  const s=pl[czmCurIdx];if(!s)return;
  const sub=encodeURIComponent('Report: '+s.title);
  const body=encodeURIComponent('Judul: '+s.title+'\nArtis: '+s.artist);
  window.open('mailto:zainsuryo10@gmail.com?subject='+sub+'&body='+body);
  document.getElementById('czm-more-menu').classList.remove('open');
};
window.czmSleep=function(){
  document.getElementById('czm-more-menu').classList.remove('open');
  // Remove existing if any
  const old=document.getElementById('czm-sleep-sheet-ov');if(old)old.remove();

  const ov=document.createElement('div');
  ov.id='czm-sleep-sheet-ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(7,15,26,0.7);z-index:10040;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(4px);';

  const sheet=document.createElement('div');
  sheet.style.cssText='width:100%;max-width:520px;background:linear-gradient(160deg,#0f2035,#0a1628);border-radius:20px 20px 0 0;padding:0 0 32px;box-sizing:border-box;border-top:1px solid rgba(0,217,255,0.2);box-shadow:0 -8px 40px rgba(0,217,255,0.1);';

  // Active timer display
  const activeTxt = czmSleepT
    ? `<div style="font-size:12px;color:#00d9ff;text-align:center;margin-bottom:2px;opacity:0.8;"><i class="fa-solid fa-moon"></i> Timer aktif</div>`
    : '';

  sheet.innerHTML=`
    <div style="display:flex;justify-content:center;padding:10px 0 4px;">
      <div style="width:36px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;"></div>
    </div>
    <div style="padding:10px 20px 16px;border-bottom:1px solid rgba(255,255,255,.07);">
      ${activeTxt}
      <div style="font-size:16px;font-weight:700;color:#fff;text-align:center;"><i class="fa-solid fa-moon" style="color:#00d9ff;margin-right:8px;"></i>Sleep Timer</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;padding:18px 20px 10px;">
      ${[15,30,60].map(m=>`
        <button onclick="czmSetSleep(${m})" style="background:rgba(0,217,255,0.1);border:1px solid rgba(0,217,255,0.3);border-radius:14px;padding:16px 8px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;align-items:center;gap:4px;">
          <span style="font-size:22px;color:#00d9ff;">${m}</span>
          <span style="font-size:11px;color:#aaa;">menit</span>
        </button>
      `).join('')}
    </div>
    <div style="padding:4px 20px 12px;">
      <div style="font-size:12px;color:#aaa;margin-bottom:8px;text-align:center;">Custom</div>
      <div style="display:flex;gap:10px;align-items:center;">
        <div style="flex:1;display:flex;align-items:center;background:rgba(0,217,255,0.07);border:1px solid rgba(0,217,255,0.2);border-radius:12px;padding:10px 14px;gap:8px;">
          <i class="fa-solid fa-stopwatch" style="color:#00d9ff;font-size:14px;"></i>
          <input id="czm-sleep-custom" type="number" min="1" max="999" placeholder="Menit..." style="flex:1;background:none;border:none;color:#fff;font-size:15px;outline:none;width:100%;">
        </div>
        <button onclick="czmSetSleepCustom()" style="background:linear-gradient(135deg,#00d9ff,#0099cc);border:none;border-radius:12px;padding:12px 18px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;">Set</button>
      </div>
    </div>
    ${czmSleepT?`<div style="padding:0 20px;"><button onclick="czmCancelSleep()" style="width:100%;background:rgba(255,80,80,0.12);border:1px solid rgba(255,80,80,0.3);border-radius:12px;padding:12px;color:#ff6b6b;font-size:14px;font-weight:600;cursor:pointer;"><i class="fa-solid fa-xmark" style="margin-right:6px;"></i>Batalkan Timer</button></div>`:''}
  `;

  ov.appendChild(sheet);
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
  document.body.appendChild(ov);
};

window.czmSetSleep=function(mins){
  if(czmSleepT)clearTimeout(czmSleepT);
  czmSleepT=setTimeout(()=>{
    if(typeof pauseAudio==='function')pauseAudio();
    czmSleepT=null;
    // toast
    const t=document.createElement('div');
    t.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(7,15,26,0.95);border:1px solid rgba(0,217,255,0.3);color:#fff;padding:12px 20px;border-radius:12px;font-size:14px;z-index:99999;text-align:center;';
    t.innerHTML='<i class="fa-solid fa-moon" style="color:#00d9ff;margin-right:6px;"></i>Musik berhenti — sleep timer selesai';
    document.body.appendChild(t);setTimeout(()=>t.remove(),3500);
  },mins*60000);
  const ov=document.getElementById('czm-sleep-sheet-ov');if(ov)ov.remove();
  // toast confirm
  const t=document.createElement('div');
  t.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(7,15,26,0.95);border:1px solid rgba(0,217,255,0.3);color:#fff;padding:12px 20px;border-radius:12px;font-size:14px;z-index:99999;text-align:center;white-space:nowrap;';
  t.innerHTML='<i class="fa-solid fa-moon" style="color:#00d9ff;margin-right:6px;"></i>Sleep timer: <b>'+mins+' menit</b>';
  document.body.appendChild(t);setTimeout(()=>t.remove(),2500);
};

window.czmSetSleepCustom=function(){
  const v=parseInt(document.getElementById('czm-sleep-custom').value);
  if(!v||v<=0)return;
  czmSetSleep(v);
};

window.czmCancelSleep=function(){
  if(czmSleepT){clearTimeout(czmSleepT);czmSleepT=null;}
  const ov=document.getElementById('czm-sleep-sheet-ov');if(ov)ov.remove();
  const t=document.createElement('div');
  t.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(7,15,26,0.95);border:1px solid rgba(255,80,80,0.3);color:#ff6b6b;padding:12px 20px;border-radius:12px;font-size:14px;z-index:99999;text-align:center;white-space:nowrap;';
  t.innerHTML='<i class="fa-solid fa-xmark" style="margin-right:6px;"></i>Sleep timer dibatalkan';
  document.body.appendChild(t);setTimeout(()=>t.remove(),2000);
};
window.czmToggleLike=function(){
  const pl=czmGetPlaylist();if(!pl)return;
  const s=pl[czmCurIdx];if(!s)return;
  const id=String(s.id);
  if(czmLiked.has(id)) czmLiked.delete(id); else czmLiked.add(id);
  const lb=document.getElementById('czm-like-btn');
  if(lb){
    lb.classList.toggle('liked', czmLiked.has(id));
    lb.innerHTML = czmLiked.has(id)
      ? '<i class="fa-solid fa-thumbs-up"></i> Suka'
      : '<i class="fa-regular fa-thumbs-up"></i> Suka';
  }
  // Kalau like, hapus dislike
  if(czmLiked.has(id)){
    const db=document.getElementById('czm-dislike-btn');
    if(db){ db.classList.remove('disliked'); db.innerHTML='<i class="fa-regular fa-thumbs-down"></i> Tidak Suka'; }
  }
};
window.czmToggleDislike=function(){
  const pl=czmGetPlaylist();if(!pl)return;
  const s=pl[czmCurIdx];if(!s)return;
  const id=String(s.id);
  const db=document.getElementById('czm-dislike-btn');
  const isDisliked = db && db.classList.contains('disliked');
  if(db){
    db.classList.toggle('disliked', !isDisliked);
    db.innerHTML = !isDisliked
      ? '<i class="fa-solid fa-thumbs-down"></i> Tidak Suka'
      : '<i class="fa-regular fa-thumbs-down"></i> Tidak Suka';
  }
  // Kalau dislike, hapus like
  if(!isDisliked){
    czmLiked.delete(id);
    const lb=document.getElementById('czm-like-btn');
    if(lb){ lb.classList.remove('liked'); lb.innerHTML='<i class="fa-regular fa-thumbs-up"></i> Suka'; }
  }
};
let czmShuffleOn = false;
window.czmToggleShuffle=function(){
  czmShuffleOn = !czmShuffleOn;
  const btn=document.getElementById('czm-shuffle-btn');
  if(btn){
    btn.classList.toggle('active', czmShuffleOn);
    btn.style.color=czmShuffleOn?'#00d9ff':'';
  }
};
/* Tab switch: next / related — klik lagi untuk sembunyikan */
window.czmSwitchTab=function(tab){
  const tabNext    = document.getElementById('czm-tab-next');
  const tabRelated = document.getElementById('czm-tab-related');
  const contentNext    = document.getElementById('czm-tab-content-next');
  const contentRelated = document.getElementById('czm-tab-content-related');
  const fullView       = document.getElementById('czm-full-view');
  const collapsedView  = document.getElementById('czm-collapsed-view');
  const playerEl       = document.getElementById('czm-player');

  const isAlreadyActive = (tab==='next' && tabNext.classList.contains('active'))
                       || (tab==='related' && tabRelated.classList.contains('active'));

  if(isAlreadyActive){
    // Toggle off — kembali ke full view
    tabNext.classList.remove('active');
    tabRelated.classList.remove('active');
    contentNext.classList.add('czm-tab-hidden');
    contentRelated.classList.add('czm-tab-hidden');
    // Fade out collapsed, fade in full
    if(collapsedView) collapsedView.classList.remove('czm-visible');
    setTimeout(function(){
      if(fullView){ fullView.style.display='flex'; requestAnimationFrame(function(){ fullView.classList.remove('czm-hidden'); }); }
      if(playerEl) playerEl.classList.remove('czm-tab-open');
    }, 10);
    const _nh0 = document.getElementById('czm-next-header');
    if(_nh0) _nh0.style.display = 'none';
    const _si0 = document.getElementById('czm-related-search-icon');
    if(_si0) _si0.style.display = 'none';
    const _sa=document.getElementById('czm-scroll-area'); if(_sa) _sa.scrollTop=0;
    // Disable scroll saat full view
    const _sa2=document.getElementById('czm-scroll-area'); if(_sa2) _sa2.style.overflowY='hidden';
    setTimeout(czmRunMarquee, 350);
    return;
  }

  // Aktifkan tab — enable scroll
  const _saEnable=document.getElementById('czm-scroll-area'); if(_saEnable) _saEnable.style.overflowY='auto';
  tabNext.classList.toggle('active', tab==='next');
  tabRelated.classList.toggle('active', tab==='related');
  contentNext.classList.toggle('czm-tab-hidden', tab!=='next');
  contentRelated.classList.toggle('czm-tab-hidden', tab!=='related');

  if(fullView){ fullView.classList.add('czm-hidden'); setTimeout(function(){ fullView.style.display='none'; }, 220); }
  if(collapsedView){ collapsedView.style.display='flex'; requestAnimationFrame(function(){ collapsedView.classList.add('czm-visible'); }); }
  if(playerEl) playerEl.classList.add('czm-tab-open');

  // Sync mini-view + topbar mini
  const s = window.playlist?.[window.currentRealIndex];
  if(s){
    // mini-view (sticky header)
    const ma=document.getElementById('czm-mini-art');
    const mt=document.getElementById('czm-mini-title');
    const mar=document.getElementById('czm-mini-artist');
    if(ma) ma.src=s.image||'';
    if(mt) mt.textContent=s.title||'—';
    if(mar) mar.textContent=s.artist||'—';
    // topbar mini
    const tma=document.getElementById('czm-topbar-mini-art');
    const tmt=document.getElementById('czm-topbar-mini-title');
    const tmar=document.getElementById('czm-topbar-mini-artist');
    if(tma) tma.src=s.image||'';
    if(tmt){
    const t=s.title||'—';
    tmt.textContent=t;
    setTimeout(()=>{
      const clipW=tmt.offsetWidth;
      const textW=tmt.scrollWidth;
      if(textW > clipW + 2){
        const gap=60;
        tmt.innerHTML=`<span>${t}<span style="display:inline-block;width:${gap}px;"></span>${t}<span style="display:inline-block;width:${gap}px;"></span></span>`;
        setTimeout(()=>{
          const sp=tmt.querySelector('span');
          if(!sp)return;
          const halfW=sp.scrollWidth/2;
          const dur=Math.max(4,halfW/60)+'s';
          tmt.style.setProperty('--tb-ex',-halfW+'px');
          tmt.style.setProperty('--tb-dur',dur);
        },50);
      } else {
        tmt.innerHTML=`<span style="animation:none;">${t}</span>`;
      }
    },100);
  }
    if(tmar) tmar.textContent=s.artist||'—';
  }

  if(tab==='related') czmRenderRelated();
  if(tab==='next'){ czmUpdateNowPlayingRow(); czmRenderPlBox(null); }

  // Tampilkan header yang sesuai
  const _nh = document.getElementById('czm-next-header');
  if(_nh) _nh.style.display = tab==='next' ? 'block' : 'none';

  // Tampilkan icon search di tab TERKAIT saat aktif
  const _si = document.getElementById('czm-related-search-icon');
  if(_si) _si.style.display = tab==='related' ? 'inline' : 'none';

  // Reset scroll
  const _sa=document.getElementById('czm-scroll-area');
  if(_sa) _sa.scrollTop = 0;
  setTimeout(()=>{ if(_sa) _sa.scrollTop=0; }, 80);
};
/* Render related songs - mirip YT Music */
function czmRenderRelated(){
  const box=document.getElementById('czm-related-box');if(!box)return;
  const pl=czmGetPlaylist();if(!pl||pl.length<2)return;
  const cur=pl[czmCurIdx];
  const others=pl.slice(1).filter(s=>String(s.id)!==String(cur?.id));
  const shuffled=[...others].sort(()=>Math.random()-.5);
  // Simpan data untuk filter search
  window._czmRelatedSongs = shuffled.slice(0,8);
  window._czmRelatedGrid  = shuffled.slice(8,16);
  // Reset search input
  const si=document.getElementById('czm-related-search');
  const sc=document.getElementById('czm-rel-clear');
  if(si) si.value='';
  if(sc) sc.style.display='none';
  czmRenderRelatedHtml('');
}

/* Buka overlay search TERKAIT */
window.czmOpenRelatedSearch = function(){
  const ov = document.getElementById('czm-rel-search-ov');
  if(!ov) return;
  ov.style.display = 'flex';
  setTimeout(()=>{ document.getElementById('czm-rel-search-inp')?.focus(); }, 100);
};
/* Tutup overlay search TERKAIT */
window.czmCloseRelatedSearch = function(){
  const ov = document.getElementById('czm-rel-search-ov');
  if(ov) ov.style.display = 'none';
  const inp = document.getElementById('czm-rel-search-inp');
  if(inp) inp.value = '';
  const clr = document.getElementById('czm-rel-search-clear');
  if(clr) clr.style.display = 'none';
  // Reset hasil
  document.getElementById('czm-rel-search-res').innerHTML =
    '<div style="text-align:center;color:#444;padding:60px 0;font-size:14px;"><i class="fa-solid fa-magnifying-glass" style="font-size:32px;margin-bottom:12px;display:block;opacity:0.3;"></i>Ketik untuk mencari lagu</div>';
};
/* Render hasil search di overlay */
window.czmDoRelatedSearch = function(q){
  const clr = document.getElementById('czm-rel-search-clear');
  if(clr) clr.style.display = q ? 'block' : 'none';
  const box = document.getElementById('czm-rel-search-res');
  if(!box) return;
  if(!q.trim()){
    box.innerHTML = '<div style="text-align:center;color:#444;padding:60px 0;font-size:14px;"><i class="fa-solid fa-magnifying-glass" style="font-size:32px;margin-bottom:12px;display:block;opacity:0.3;"></i>Ketik untuk mencari lagu</div>';
    return;
  }
  const pl = czmGetPlaylist(); if(!pl) return;
  const kw = q.trim().toLowerCase();
  const results = pl.slice(1).filter(s =>
    s.title.toLowerCase().includes(kw) || s.artist.toLowerCase().includes(kw)
  ).slice(0, 30);
  if(!results.length){
    box.innerHTML = '<div style="text-align:center;color:#555;padding:60px 0;font-size:14px;">Tidak ada hasil untuk "<b style=color:#fff>'+q+'</b>"</div>';
    return;
  }
  box.innerHTML = results.map(s=>`
    <div onclick="czmPlayById('${s.id}',true);czmCloseRelatedSearch();"
      style="display:flex;align-items:center;gap:12px;padding:10px 16px;cursor:pointer;transition:background .13s;"
      onmouseover="this.style.background='rgba(255,255,255,.05)'" onmouseout="this.style.background=''">
      <img src="${s.image}" style="width:48px;height:48px;border-radius:6px;object-fit:cover;flex-shrink:0;" loading="lazy">
      <div style="flex:1;min-width:0;">
        <div style="font-size:14px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.title}</div>
        <div style="font-size:12px;color:#888;margin-top:2px;">${s.artist} · ${fv(s.views)}</div>
      </div>
      <button onclick="event.stopPropagation();czmOpenBs('${s.id}',event)"
        style="background:none;border:none;color:#555;font-size:18px;cursor:pointer;padding:4px;flex-shrink:0;">
        <i class="fa-solid fa-ellipsis-vertical"></i>
      </button>
    </div>`).join('');
};

function czmFilterRelated(q){
  czmRenderRelatedHtml(q.trim().toLowerCase());
}

function czmRenderRelatedHtml(q){
  const box=document.getElementById('czm-related-box');if(!box)return;
  let listSongs = window._czmRelatedSongs || [];
  const gridSongs = window._czmRelatedGrid || [];

  if(q){
    const pl=czmGetPlaylist();if(!pl)return;
    listSongs = pl.slice(1).filter(s=>
      s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    ).slice(0,20);
  }

  if(!listSongs.length){
    box.innerHTML='<div style="text-align:center;color:#555;padding:48px 0;font-size:14px;">Tidak ditemukan</div>';
    return;
  }

  // Section 1: Anda mungkin juga suka
  let html=`<div class="czm-rel-title">${q?'Hasil pencarian':'Anda mungkin juga suka'}</div>`;
  html+=listSongs.map(s=>`
    <div class="czm-rel-item" onclick="czmPlayById('${s.id}',true)">
      <img class="czm-rel-img" src="${s.image}" loading="lazy">
      <div class="czm-rel-info">
        <div class="czm-rel-t">${s.title}</div>
        <div class="czm-rel-s">${s.artist} · ${fv(s.views)}</div>
      </div>
      <button class="czm-rel-dots" onclick="event.stopPropagation();czmOpenBs('${s.id}',event)"><i class="fa-solid fa-ellipsis-vertical"></i></button>
    </div>`).join('');

  // Section 2: Playlist grid (hanya saat tidak search)
  if(!q && gridSongs.length>=4){
    html+='<div class="czm-rel-grid-title">Playlist yang direkomendasikan</div>';
    html+='<div class="czm-rel-grid">';
    const chunk=4;
    for(let i=0;i<Math.min(4,Math.floor(gridSongs.length/chunk));i++){
      const group=gridSongs.slice(i*chunk,(i+1)*chunk);
      const plNames=['Favoritmu','Mix Harian','Mood Booster','Santai'];
      html+=`<div class="czm-rel-grid-item" onclick="czmPlayById('${group[0].id}',true)">
        <div class="czm-rel-grid-mosaic">
          ${group.slice(0,4).map(s=>`<img src="${s.image}" loading="lazy">`).join('')}
        </div>
        <div class="czm-rel-grid-name">${plNames[i]||'Mix'}</div>
        <div class="czm-rel-grid-sub">Playlist · ${group.length} lagu</div>
      </div>`;
    }
    html+='</div>';
  }

  box.innerHTML=html;
}

/* Update now playing row di tab BERIKUTNYA */
function czmUpdateNowPlayingRow(){
  const pl=czmGetPlaylist();if(!pl)return;
  const s=pl[czmCurIdx];if(!s)return;
  const img=document.getElementById('czm-np-row-img');
  const title=document.getElementById('czm-np-row-title');
  const sub=document.getElementById('czm-np-row-sub');
  if(img) img.src=s.image||'';
  if(title) title.textContent=s.title||'—';
  if(sub) sub.textContent=s.artist+(s.views?' · '+fv(s.views):'');
}
/* Update topbar source label */
function czmUpdateTopbarSource(){
  const name = (czmActivePlId!=='__all__')
    ? (czmPls.find(p=>String(p.id)===String(czmActivePlId))?.name || 'Playlist')
    : 'CyberZain Music';
  const el1=document.getElementById('czm-topbar-source');
  const el2=document.getElementById('czm-from-name');
  if(el1) el1.textContent=name;
  if(el2) el2.textContent=name;
}

/* ---------- bottom sheet ---------- */
window.czmOpenBs=function(id,e){
  if(e)e.stopPropagation();
  czmBsId=String(id);
  const pl=czmGetPlaylist();if(!pl)return;
  const s=pl.find(x=>String(x.id)===czmBsId);if(!s)return;
  document.getElementById('czm-bs-img').src=s.image||'';
  document.getElementById('czm-bs-title').textContent=s.title||'';
  document.getElementById('czm-bs-artist').textContent=s.artist||'';
  const liked=czmLiked.has(czmBsId);
  document.getElementById('czm-bs-like-ico').className=liked?'fa-solid fa-heart':'fa-regular fa-heart';
  document.getElementById('czm-bs-like-ico').style.color=liked?'#ff0000':'#777';
  document.getElementById('czm-bs-like-lbl').textContent=liked?'Hapus dari galeri':'Simpan ke galeri';
  const ov=document.getElementById('czm-bs-ov'),menu=document.getElementById('czm-bs-menu');
  ov.style.display='block';menu.style.display='block';
  requestAnimationFrame(()=>requestAnimationFrame(()=>menu.style.transform='translateY(0)'));
  // Sembunyikan now playing bar
  const npbar=document.getElementById('czm-npbar');
  if(npbar){ npbar.classList.remove('czm-vis'); npbar.style.setProperty('display','none','important'); }
};
window.czmCloseBs=function(){
  const menu=document.getElementById('czm-bs-menu'),ov=document.getElementById('czm-bs-ov');
  if(menu)menu.style.transform='translateY(100%)';
  setTimeout(()=>{
    if(menu)menu.style.display='none';
    if(ov)ov.style.display='none';
    // Tampilkan kembali now playing bar jika ada lagu
    const npbar=document.getElementById('czm-npbar');
    if(npbar && npbar.dataset.hasTrack==='1'){ npbar.style.removeProperty('display'); npbar.classList.add('czm-vis'); }
  },300);
};
window.czmBsPlay=function(){czmCloseBs();if(czmBsId)czmPlayById(czmBsId);};
window.czmBsQueueNext=function(){czmCloseBs();if(czmBsId)czmPlayById(czmBsId);};
window.czmBsAddPl=function(){const id=czmBsId;czmCloseBs();setTimeout(()=>czmAddSongToPl(id),350);};
window.czmBsShare=function(){
  const pl=czmGetPlaylist();if(!pl)return;
  const s=pl.find(x=>String(x.id)===czmBsId);if(!s)return;
  czmCloseBs();
  if(navigator.share)navigator.share({title:s.title,text:s.artist});
  else alert('Bagikan: '+s.title+' — '+s.artist);
};
window.czmBsDl=function(){
  const pl=czmGetPlaylist();if(!pl)return;
  const s=pl.find(x=>String(x.id)===czmBsId);if(!s)return;
  czmCloseBs();
  const a=document.createElement('a');
  if(s.video && s.video.trim().length > 0){
    a.href=s.video;a.download=s.title+'.mp4';
  } else {
    a.href=s.audio;a.download=s.title+'.mp3';
  }
  document.body.appendChild(a);a.click();a.remove();
};
window.czmBsLike=function(){
  const id=czmBsId;if(!id)return;
  if(czmLiked.has(id))czmLiked.delete(id);else czmLiked.add(id);
  const liked=czmLiked.has(id);
  document.getElementById('czm-bs-like-ico').className=liked?'fa-solid fa-heart':'fa-regular fa-heart';
  document.getElementById('czm-bs-like-ico').style.color=liked?'#ff0000':'#777';
  document.getElementById('czm-bs-like-lbl').textContent=liked?'Hapus dari galeri':'Simpan ke galeri';
  // sync player
  const pl=czmGetPlaylist();
  if(pl&&pl[czmCurIdx]&&String(pl[czmCurIdx].id)===id){
    const lb=document.getElementById('czm-like-btn');
    if(lb){lb.classList.toggle('liked',liked);lb.innerHTML=liked?'<i class="fa-solid fa-heart"></i>':'<i class="fa-regular fa-heart"></i>';}
  }
};
window.czmBsReport=function(){
  const pl=czmGetPlaylist();if(!pl)return;
  const s=pl.find(x=>String(x.id)===czmBsId);if(!s)return;
  czmCloseBs();
  const sub=encodeURIComponent('Report: '+s.title);
  const body=encodeURIComponent('Judul: '+s.title+'\nArtis: '+s.artist);
  window.open('mailto:zainsuryo10@gmail.com?subject='+sub+'&body='+body);
};

/* ---------- playlist modal ---------- */
function czmSavePls(){
  localStorage.setItem('czm_pls',JSON.stringify(czmPls));
  czmRefreshPlSelector();
  czmRenderPlmList();
}
window.czmOpenPlm=function(){
  const ov=document.getElementById('czm-plm-ov'),modal=document.getElementById('czm-plm-modal');
  ov.style.display='block';modal.style.display='flex';
  requestAnimationFrame(()=>requestAnimationFrame(()=>modal.style.transform='translateY(0)'));
  czmRenderPlmList();
  // Sembunyikan now playing bar
  const npbar=document.getElementById('czm-npbar');
  if(npbar){ npbar.classList.remove('czm-vis'); npbar.style.setProperty('display','none','important'); }
};
window.czmClosePlm=function(){
  const modal=document.getElementById('czm-plm-modal'),ov=document.getElementById('czm-plm-ov');
  if(modal)modal.style.transform='translateY(100%)';
  setTimeout(()=>{
    if(modal)modal.style.display='none';
    if(ov)ov.style.display='none';
    // Tampilkan kembali now playing bar jika ada lagu
    const npbar=document.getElementById('czm-npbar');
    if(npbar && npbar.dataset.hasTrack==='1'){ npbar.style.removeProperty('display'); npbar.classList.add('czm-vis'); }
  },300);
};
window.czmCreatePl=function(){
  const inp=document.getElementById('czm-plm-new');
  const name=(inp?inp.value:'').trim();
  if(!name){alert('Masukkan nama playlist!');return;}
  czmPls.push({id:Date.now(),name,songs:[]});czmSavePls();
  if(inp)inp.value='';
  czmRenderPlmList();
};
function czmRenderPlmList(){
  const box=document.getElementById('czm-plm-list');if(!box)return;
  if(!czmPls.length){
    box.innerHTML='<div style="text-align:center;color:#555;padding:40px 0;font-size:14px;">Belum ada playlist.<br>Buat playlist baru di atas!</div>';return;
  }
  const pl=czmGetPlaylist()||[];
  box.innerHTML=czmPls.map(p=>{
    const firstSong=pl.find(s=>String(s.id)===String(p.songs[0]));
    const thumb=firstSong&&firstSong.image?`<img src="${firstSong.image}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`:`<i class="fa-solid fa-music" style="color:#00d9ff;font-size:18px;"></i>`;
    const bg=firstSong&&firstSong.image?'transparent':'#1e4a7a';
    return`<div onclick="czmOpenPlDetail(${p.id})" style="display:flex;align-items:center;gap:14px;padding:14px 18px;cursor:pointer;transition:background .13s;border-bottom:1px solid rgba(255,255,255,.05);" ontouchstart="this.style.background='rgba(0,217,255,0.06)'" ontouchend="this.style.background=''" onmouseover="this.style.background='rgba(0,217,255,0.06)'" onmouseout="this.style.background=''">
      <div style="width:48px;height:48px;border-radius:10px;background:${bg};overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px rgba(0,217,255,0.2);">
        ${thumb}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:15px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>
        <div style="font-size:12px;color:#7a9bb5;margin-top:2px;">${p.songs.length} lagu</div>
      </div>
      <i class="fa-solid fa-chevron-right" style="color:#3a6080;font-size:13px;"></i>
    </div>`;}).join('');
}
window.czmOpenPlDetail=function(id){
  czmCurPlId=id;const p=czmPls.find(x=>x.id===id);if(!p)return;
  czmClosePlm();
  setTimeout(()=>{
    const modal=document.getElementById('czm-plm-detail');
    document.getElementById('czm-plm-dname').textContent=p.name;
    modal.style.display='flex';czmRenderPlDetail();
    // Sembunyikan now playing bar
    const npbar=document.getElementById('czm-npbar');
    if(npbar){ npbar.classList.remove('czm-vis'); npbar.style.setProperty('display','none','important'); }
  },320);
};
window.czmClosePlDetail=function(){
  const m=document.getElementById('czm-plm-detail');if(m)m.style.display='none';
  czmCurPlId=null;
  // Tampilkan kembali now playing bar jika ada lagu
  const npbar=document.getElementById('czm-npbar');
  if(npbar && npbar.dataset.hasTrack==='1'){ npbar.style.removeProperty('display'); npbar.classList.add('czm-vis'); }
};
function czmRenderPlDetail(){
  const p=czmPls.find(x=>x.id===czmCurPlId);
  const box=document.getElementById('czm-plm-dsongs');if(!box)return;
  if(!p||!p.songs.length){
    box.innerHTML='<div style="text-align:center;color:#555;padding:48px 0;font-size:14px;">Playlist kosong.<br>Tambah lagu dari menu ⋮</div>';return;
  }
  const pl=czmGetPlaylist()||[];
  box.innerHTML=p.songs.map((sid,i)=>{
    const s=pl.find(x=>String(x.id)===String(sid));if(!s)return'';
    return`<div style="display:flex;align-items:center;gap:12px;padding:9px 16px;cursor:pointer;transition:background .13s;" onclick="czmPlayFromPlaylist('${p.id}','${s.id}')" onmouseover="this.style.background='rgba(255,255,255,.05)'" onmouseout="this.style.background=''">
      <span style="font-size:12px;color:#555;width:20px;text-align:center;">${i+1}</span>
      <img src="${s.image}" style="width:42px;height:42px;border-radius:4px;object-fit:cover;flex-shrink:0;background:#242424;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff;">${s.title}</div>
        <div style="font-size:11px;color:#aaa;">${s.artist}</div>
      </div>
      <button onclick="event.stopPropagation();czmRemoveFromPl(${czmCurPlId},'${sid}')" style="background:none;border:none;color:#ff4444;font-size:16px;cursor:pointer;padding:4px 8px;"><i class="fa-solid fa-xmark"></i></button>
    </div>`;
  }).join('');
}
window.czmRemoveFromPl=function(plId,songId){
  const p=czmPls.find(x=>x.id===plId);if(!p)return;
  p.songs=p.songs.filter(s=>String(s)!==String(songId));czmSavePls();czmRenderPlDetail();
};
/* Putar lagu dari playlist detail — otomatis lock ke playlist itu */
window.czmPlayFromPlaylist=function(plId, songId){
  // Tutup modal playlist detail
  czmClosePlDetail();
  // Set playlist aktif ke playlist yang dipilih
  czmActivePlId = String(plId);
  // Update selector dropdown
  // Render ulang display order dari playlist ini
  const pl = czmGetPlaylist()||[];
  const userPl = czmPls.find(p => String(p.id) === String(plId));
  if(userPl){
    czmDisplayOrder = userPl.songs
      .map(sid => pl.find(s => String(s.id) === String(sid)))
      .filter(Boolean)
      .map(s => String(s.id));
  }
  // Play lagu yang diklik
  czmPlayById(songId);
};
window.czmDeletePl=function(){
  if(!confirm('Hapus playlist ini?'))return;
  czmPls=czmPls.filter(p=>p.id!==czmCurPlId);czmSavePls();czmClosePlDetail();
};
function czmAddSongToPl(songId){
  if(!czmPls.length){
    // Belum ada playlist — buat baru dulu via input custom
    czmShowNewPlInput(function(name){
      if(!name)return;
      czmPls.push({id:Date.now(),name:name,songs:[]});czmSavePls();
      const p=czmPls[0];
      if(!p.songs.includes(String(songId)))p.songs.push(String(songId));
      czmSavePls();czmShowToast('Ditambahkan ke "'+p.name+'"!');
    });
    return;
  }
  if(czmPls.length===1){
    const p=czmPls[0];
    if(!p.songs.includes(String(songId))){p.songs.push(String(songId));czmSavePls();czmShowToast('Ditambahkan ke "'+p.name+'"!');}
    else czmShowToast('Lagu sudah ada di playlist ini!');
    return;
  }
  // Lebih dari 1 playlist — tampilkan bottom sheet pilih playlist
  czmOpenPlPick(songId);
}

function czmShowToast(msg){
  let t=document.getElementById('czm-toast');
  if(!t){t=document.createElement('div');t.id='czm-toast';t.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(10px);background:rgba(20,20,20,0.95);color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:600;z-index:99999;opacity:0;transition:all 0.25s ease;pointer-events:none;white-space:nowrap;border:1px solid rgba(255,255,255,0.1);';document.body.appendChild(t);}
  t.textContent=msg;t.style.opacity='1';t.style.transform='translateX(-50%) translateY(0)';
  clearTimeout(t._t);t._t=setTimeout(()=>{t.style.opacity='0';t.style.transform='translateX(-50%) translateY(10px)';},2200);
}

function czmShowNewPlInput(cb){
  // Remove old sheet biar ga double
  const oldSheet=document.getElementById('czm-newpl-sheet');
  const oldOv=document.getElementById('czm-newpl-ov');
  if(oldSheet)oldSheet.remove();
  if(oldOv)oldOv.remove();

  const sheet=document.createElement('div');
  sheet.id='czm-newpl-sheet';
  sheet.style.cssText='display:none;position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#1e3248;border-radius:20px 20px 0 0;padding:20px 20px 36px;box-sizing:border-box;transform:translateY(100%);transition:transform .28s cubic-bezier(.32,.72,0,1);box-shadow:0 -4px 40px rgba(0,0,0,0.6);';
  sheet.innerHTML=`
    <div style="display:flex;justify-content:center;margin-bottom:14px;">
      <div style="width:36px;height:4px;background:rgba(255,255,255,.2);border-radius:2px;"></div>
    </div>
    <div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:16px;"><i class="fa-solid fa-music" style="color:#00d9ff;margin-right:8px;"></i>Buat Playlist Baru</div>
    <div style="display:flex;align-items:center;background:rgba(0,217,255,0.07);border:1px solid rgba(0,217,255,0.2);border-radius:12px;padding:12px 16px;gap:10px;margin-bottom:14px;">
      <i class="fa-solid fa-pen" style="color:#00d9ff;font-size:14px;"></i>
      <input id="czm-newpl-inp" placeholder="Nama playlist..." style="flex:1;background:none;border:none;color:#fff;font-size:15px;outline:none;width:100%;">
    </div>
    <div style="display:flex;gap:10px;">
      <button onclick="czmNewPlCancel()" style="flex:1;padding:13px;border:none;border-radius:12px;background:rgba(255,255,255,0.08);color:#aaa;font-size:14px;cursor:pointer;font-weight:600;">Batal</button>
      <button onclick="czmNewPlOk()" style="flex:1;padding:13px;border:none;border-radius:12px;background:linear-gradient(135deg,#00d9ff,#0099cc);color:#fff;font-size:14px;font-weight:700;cursor:pointer;">Buat</button>
    </div>
  `;

  const ov=document.createElement('div');
  ov.id='czm-newpl-ov';
  ov.style.cssText='display:none;position:fixed;inset:0;background:rgba(7,15,26,0.65);z-index:99998;backdrop-filter:blur(3px);';
  ov.onclick=czmNewPlCancel;
  document.body.appendChild(ov);
  document.body.appendChild(sheet);

  window._czmNewPlCb=cb;
  sheet.style.display='flex';sheet.style.flexDirection='column';ov.style.display='block';
  requestAnimationFrame(()=>{sheet.style.transform='translateY(0)';});
  setTimeout(()=>document.getElementById('czm-newpl-inp')?.focus(),300);
}
window.czmNewPlOk=function(){
  const val=(document.getElementById('czm-newpl-inp')?.value||'').trim();
  czmNewPlCancel();
  if(window._czmNewPlCb)window._czmNewPlCb(val);
};
window.czmNewPlCancel=function(){
  const sheet=document.getElementById('czm-newpl-sheet');
  const ov=document.getElementById('czm-newpl-ov');
  if(sheet){sheet.style.transform='translateY(100%)';setTimeout(()=>sheet.style.display='none',280);}
  if(ov)ov.style.display='none';
};

function czmOpenPlPick(songId){
  // Remove old if any, recreate fresh appended to body
  ['czm-plpick-ov','czm-plpick-sheet'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) document.body.appendChild(el); // move to body to escape any overflow:hidden parent
  });

  const list=document.getElementById('czm-plpick-list');
  const sheet=document.getElementById('czm-plpick-sheet');
  const ov=document.getElementById('czm-plpick-ov');
  if(!list||!sheet||!ov)return;
  list.innerHTML='';

  czmPls.forEach(function(p){
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:16px;padding:16px 20px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.05);transition:background .13s;';
    row.onmousedown=function(){this.style.background='rgba(0,217,255,0.07)';};
    row.onmouseup=function(){this.style.background='';};
    row.ontouchstart=function(){this.style.background='rgba(0,217,255,0.07)';};
    row.ontouchend=function(){this.style.background='';};
    const _pl0=czmGetPlaylist()||[];
    const _fs=_pl0.find(s=>String(s.id)===String(p.songs[0]));
    const _thumb=_fs&&_fs.image?`<img src="${_fs.image}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`:`<i class="fa-solid fa-music" style="color:#00d9ff;font-size:16px;"></i>`;
    const _bg=_fs&&_fs.image?'transparent':'#1e4a7a';
    row.innerHTML=`
      <div style="width:44px;height:44px;background:${_bg};border-radius:10px;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        ${_thumb}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:15px;font-weight:600;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.name}</div>
        <div style="font-size:12px;color:#7a9bb5;margin-top:2px;">${p.songs.length} lagu</div>
      </div>
      <i class="fa-solid fa-chevron-right" style="color:#3a6080;font-size:13px;flex-shrink:0;"></i>
    `;
    row.onclick=function(){
      czmClosePlPick();
      setTimeout(function(){
        if(!p.songs.includes(String(songId))){p.songs.push(String(songId));czmSavePls();czmShowToast('Ditambahkan ke "'+p.name+'"!');}
        else czmShowToast('Lagu sudah ada di playlist ini!');
      },300);
    };
    list.appendChild(row);
  });

  // Buat playlist baru
  const newRow=document.createElement('div');
  newRow.style.cssText='display:flex;align-items:center;gap:16px;padding:16px 20px;cursor:pointer;transition:background .13s;';
  newRow.onmousedown=function(){this.style.background='rgba(255,255,255,0.04)';};
  newRow.onmouseup=function(){this.style.background='';};
  newRow.ontouchstart=function(){this.style.background='rgba(255,255,255,0.04)';};
  newRow.ontouchend=function(){this.style.background='';};
  newRow.innerHTML=`
    <div style="width:44px;height:44px;background:rgba(255,255,255,0.06);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1.5px dashed rgba(255,255,255,.18);">
      <i class="fa-solid fa-plus" style="color:#7a9bb5;font-size:16px;"></i>
    </div>
    <span style="font-size:15px;color:#aaa;">Buat playlist baru</span>
  `;
  newRow.onclick=function(){
    czmClosePlPick();
    setTimeout(function(){
      czmShowNewPlInput(function(name){
        if(!name)return;
        const np={id:Date.now(),name:name,songs:[String(songId)]};
        czmPls.push(np);czmSavePls();czmShowToast('Ditambahkan ke "'+name+'"!');
      });
    },300);
  };
  list.appendChild(newRow);

  // Force z-index tinggi banget
  ov.style.zIndex='99998';
  sheet.style.zIndex='99999';

  sheet.style.display='flex';sheet.style.flexDirection='column';ov.style.display='block';
  requestAnimationFrame(()=>sheet.style.transform='translateY(0)');
  const npbar=document.getElementById('czm-npbar');
  if(npbar) npbar.style.transform='translateY(100%)';
}
window.czmClosePlPick=function(){
  const sheet=document.getElementById('czm-plpick-sheet');
  const ov=document.getElementById('czm-plpick-ov');
  if(sheet){sheet.style.transform='translateY(100%)';setTimeout(()=>sheet.style.display='none',280);}
  if(ov)ov.style.display='none';
  // Show mini player again
  const npbar=document.getElementById('czm-npbar');
  if(npbar) npbar.style.transform='translateY(0)';
};

/* ---------- init: tunggu script.js selesai load playlist ---------- */
function czmInit(){
  const pl=czmGetPlaylist();
  if(!pl||pl.length<2){
    setTimeout(czmInit,100);return;
  }
  czmRenderHome('all');
  // Refresh selector playlist di player
  czmRefreshPlSelector();
  // sync currentRealIndex awal
  czmCurIdx=window.currentRealIndex||0;
  czmSyncUI(czmCurIdx);
}
// Jalankan setelah DOM+script siap
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',czmInit);
}else{
  setTimeout(czmInit,0);
}

// Auto-update home padding saat mini player muncul/hilang
(function(){
  function syncHomePadding(){
    const npbar = document.getElementById('czm-npbar');
    const music = document.getElementById('music');
    if(!npbar || !music) return;
    const visible = npbar.classList.contains('czm-vis') && getComputedStyle(npbar).display !== 'none';
    music.classList.toggle('has-npbar', visible);
  }
  const npbar = document.getElementById('czm-npbar');
  if(npbar){
    new MutationObserver(syncHomePadding).observe(npbar, {attributes:true, attributeFilter:['class','style']});
  }
  syncHomePadding();
})();

})(); /* end IIFE */


// Global variables
let chatHistories = { worm: [], normal: [] };
let chatHistory = [];
const SERVER_API_KEY = ''; // API key ada di server, tidak perlu di client
let apiKey = SERVER_API_KEY;
let model = 'llama-3.3-70b-versatile'; // Fixed model (recommended)
let temperature = 0.7; // Fixed temperature
let maxTokens = 4096; // Fixed max tokens
let responseLength = localStorage.getItem('responseLength') || 'short'; // default Singkat // Default: short
let responseStyle = localStorage.getItem('responseStyle') || 'neutral'; // Default: neutral (no emoji)
let isGenerating = false; // Flag saat AI sedang balas
let userLocation = null;
let userLocationRaw = null; // {lat, lon}

function ztProcessGPS(pos) {
    const lat = pos.coords.latitude.toFixed(6);
    const lon = pos.coords.longitude.toFixed(6);
    userLocationRaw = { lat: parseFloat(lat), lon: parseFloat(lon) };
    fetch('https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lon + '&format=json')
        .then(r => r.json())
        .then(data => {
            const addr = data.address || {};
            const kota = addr.city || addr.town || addr.village || addr.county || '';
            const kecamatan = addr.suburb || addr.neighbourhood || '';
            const prov = addr.state || '';
            const negara = addr.country || '';
            userLocation = (kecamatan ? kecamatan + ', ' : '') + kota + (prov ? ', ' + prov : '') + (negara ? ', ' + negara : '') + ' (koordinat: ' + lat + ', ' + lon + ')';
            // Kirim lokasi ke server untuk ditampilkan di console Pterodactyl
            try {
                const _proxyBase = (typeof PROXY_URL !== 'undefined' ? PROXY_URL : localStorage.getItem('vidsnap_proxy_url') || '').replace(/\/+$/, '');
                if (_proxyBase) {
                    fetch(_proxyBase + '/api/log-location', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ lat, lon, address: userLocation })
                    }).catch(() => {});
                }
            } catch(e) {}
            // Refresh IP card kalau sedang terbuka
            var ipEl = document.getElementById('zt-ip-mine');
            if (ipEl && !ipEl.querySelector('.zt-loading') && typeof ztIpFetchMine === 'function') {
                ztIpFetchMine();
            }
        })
        .catch(() => {
            userLocation = 'koordinat: ' + lat + ', ' + lon;
        });
}

if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(ztProcessGPS,
        function() { userLocation = null; },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
    // Watch terus supaya update kalau GPS baru diizinkan
    navigator.geolocation.watchPosition(ztProcessGPS,
        function() {},
        { enableHighAccuracy: true, maximumAge: 30000 }
    );
}

function getWelcomeScreenHTML() {
    return `
        <div class="welcome-hero">
            <div class="hero-icon"><i class="fa-solid fa-robot"></i></div>
            <h1 class="hero-title">Selamat Datang di ZainAI</h1>
            <p class="hero-subtitle">Asisten AI Cerdas Bertenaga VPS - Siap Membantu Anda</p>
            <button id="helpBtn" onclick="openHelpModal()" style="margin-top:14px;padding:9px 20px;border-radius:30px;background:rgba(0,217,255,0.08);border:1px solid rgba(0,217,255,0.3);color:var(--primary-cyan);font-size:13px;font-weight:600;cursor:pointer;letter-spacing:0.04em;display:inline-flex;align-items:center;gap:8px;transition:background 0.2s ease, border-color 0.2s ease, color 0.2s ease;animation:fadeInUp 0.5s cubic-bezier(.22,1,.36,1) 0.4s both;">
                <i class="fa-solid fa-circle-question"></i> Lihat Semua Fitur
            </button>
        </div>
        <div class="features-section">
            <h3 class="section-title">Apa yang bisa saya bantu?</h3>
            <div class="feature-grid">
                <div class="feature-card" onclick="sendPrompt('Jelaskan tentang artificial intelligence dan machine learning')"><i class="fa-solid fa-lightbulb feature-icon"></i><h4 class="feature-title">Pengetahuan</h4><p class="feature-desc">Pertanyaan umum & edukasi</p></div>
                <div class="feature-card" onclick="sendPrompt('Buatkan contoh kode Python untuk web scraping')"><i class="fa-solid fa-code feature-icon"></i><h4 class="feature-title">Pemrograman</h4><p class="feature-desc">Coding & debugging</p></div>
                <div class="feature-card" onclick="sendPrompt('Buatkan cerita pendek tentang petualangan di luar angkasa')"><i class="fa-solid fa-book feature-icon"></i><h4 class="feature-title">Kreativitas</h4><p class="feature-desc">Menulis & brainstorming</p></div>
                <div class="feature-card" onclick="sendPrompt('Analisis tren teknologi AI di tahun 2024')"><i class="fa-solid fa-chart-line feature-icon"></i><h4 class="feature-title">Analisis</h4><p class="feature-desc">Data & insights</p></div>
                <div class="feature-card" onclick="sendPrompt('Berikan tips produktivitas untuk bekerja dari rumah')"><i class="fa-solid fa-briefcase feature-icon"></i><h4 class="feature-title">Produktivitas</h4><p class="feature-desc">Tips & strategi</p></div>
                <div class="feature-card" onclick="sendPrompt('Jelaskan konsep blockchain dengan bahasa sederhana')"><i class="fa-solid fa-graduation-cap feature-icon"></i><h4 class="feature-title">Pembelajaran</h4><p class="feature-desc">Tutorial & panduan</p></div>
            </div>
        </div>
    `;
}

/* ===== SECTION BREAK ===== */

function kirimPesan() {
  const nama = document.getElementById('contactNama').value.trim();
  const email = document.getElementById('contactEmail').value.trim();
  const subjek = document.getElementById('contactSubjek').value.trim();
  const pesan = document.getElementById('contactPesan').value.trim();
  if (!nama || !pesan) {
    alert('Mohon isi Nama dan Pesan terlebih dahulu.');
    return;
  }
  // Kirim ke WhatsApp
  const waText = encodeURIComponent(`Halo Zain!\n\nNama: ${nama}\nEmail: ${email}\nSubjek: ${subjek}\n\nPesan:\n${pesan}`);
  window.open(`https://wa.me/6285713164894?text=${waText}`, '_blank');
}

/* ===== SECTION BREAK ===== */

const songs = {
  0: { audio: "https://raw.githubusercontent.com/PretyFX69/music-files2/refs/heads/main/avatars-000034313304-f1lisi-t1080x1080.jpg",
       image: "https://raw.githubusercontent.com/PretyFX69/music-files2/refs/heads/main/avatars-000034313304-f1lisi-t1080x1080.jpg", 
       title: "Music not found", 
       artist: "Not artist", 
       views: 0 },
  1: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Bintang%205.mp3", 
       image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Bintang5.jpg",
       video: "",  // ← isi URL video MP4 di sini jika ada MV
       title: "Bintang 5", 
       artist: "Tenxi & Jemsii", 
       views: 21300000 },
  2: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/(Sakit%20Dadaku).mp3", 
       image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Sakit%20dadaku.jpg", 
       title: "Garam & Madu (Sakit Dadaku)", 
       artist: "Tenxi",
       views: 250600000},
  3: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/bergema%20sampai%20selamanya.mp3", 
       image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/nadhif.jpg", 
       title: "Bergema Sampai Selamanya", 
       artist: "Nadhif Basalamah",
       tags: ["sad"],
       views: 90100000},
  4: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Surat%20starla.mp3", 
       image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Virgoun.png", 
       title: "Surat Cinta Untuk Starla", 
       artist: "Virgoun",
       tags: ["sad"],
       views: 658900000},
  5: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/SO%20ASU.mp3", 
       image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/SO%20ASU.png", 
       title: "SO ASU", 
       artist: "Naykilla",
       views: 5820000},
  6: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/mejikuhibiniu.mp3", 
       image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/mejikuhibiniu.jpg", 
       title: "Mejikuhibiniu", 
       artist: "Tenxi, Suisei & Jemsii",
       views: 68400000},
  7: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/penjaga%20hati.mp3", 
       image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/penjaga%20hti.jpg", 
       title: "Penjaga Hati", 
       artist: "Nadhif Basalamah",
       tags: ["sad"],
       views: 286500000},
  8: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Aku%20Dah%20Lupa.mp3", 
       image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Aku%20Dah%20Lupa.jpg", 
       title: "Aku Dah Lupa", 
       artist: "MikkyZia",
       views: 90300000},
  9: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Mangu.mp3", 
       image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/mangu.jpg", 
       title: "Mangu",
       tags: ["sad"],
       artist: "Fourtwnty",
       views: 305700000},
  10: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Kasih%20Aba%20Aba.mp3",     image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/kasih%20aba%20aba.jpg", 
        title: "Kasih Aba Aba", 
        artist: "Naykilla, Tenxi & Jemsii",
        views: 77200000},
  11: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Berubah.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Berubah.jpg", 
        title: "Berubah", 
        artist: "Tenxi & Jemsii",
        views: 10600000},
  12: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Oh%20no,%20I%20like%20you.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Oh%20no%2CI%20like%20you.jpg", 
        title: "Oh no, I like you", 
        artist: "Auric Veil",
        views: 6440000
  },
  13: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/die%20with%20a%20smile.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/die%20with%20a%20smile.jpg", 
        title: "Die With A Smile", 
        artist: "Lady Gaga",
        views: 2800000000},
  14: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Kangen.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Kangen.jpg", 
        title: "Kangen",
        tags: ["sad"],
        artist: "DEWA 19",
        views: 211600000},
  15: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/That%20Smile%20is%20a%20Trap.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/That%20smile%20is%20a%20trap.jpg", 
        title: "That Smile Is A Trap", 
        artist: "Auric Veil",
        views: 1800000},
  16: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Bintang%20di%20Surga.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/NoahBintangdiSurga.jpg", 
        title: "Bintang Di Surga",
        tags: ["sad"],
        artist: "NOAH",
        views: 143700000},
  17: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Anugerah%20Terindah.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Anigrah%20Terindah.jpg", 
        title: "Anugrah Terindah",
        tags: ["sad"],
        artist: "Andmesh",
        views: 257800000},
  18: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Aku%20Milikmu.mp3",     
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/IMG_0730.jpeg", 
        title: "Aku Milikmu", 
        artist: "DEWA 19",
        views: 11410000},
  19: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Pupus.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/IMG_0731.jpeg", 
        title: "Pupus", 
        artist: "DEWA 19",
        views: 181600000},
  20: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Separuh%20Nafas.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/IMG_0732.jpeg", 
        title: "Separuh Nafasku", 
        artist: "DEWA 19",
        views: 70600000},
  21: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Somewhere%20Only%20We%20Know.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/somewhere1.jpg", 
        title: "Somewhere Only We Know", 
        artist: "Gustixa",
        views: 106700000},
   22: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/hoRRReg.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Bintang5.jpg", 
        title: "hoRRReg", 
        artist: "Tenxi, Naufal Syachreza & Jemsii",
        views: 10400000},
   23: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/SENCY.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/IMG_0733.webp", 
        title: "SENCY", 
        artist: "dia & Tenxi",
        views: 226000},
   24: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Puting%20Beliung.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Bintang5.jpg", 
        title: "Puting Beliung (feat. dia)", 
        artist: "Tenxi, Josua Natanael & Jemsii",
        tags: ["😝🤙🏻"],
        views:1900000},
   25: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/1%2010.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/IMG_0734.jpeg", 
        title: "1/10 (feat. RYO)", 
        artist: "Tenxi & RYO"
        ,
        views: 1400000
   },
   26: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/attached.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/IMG_0735.jpeg", 
        title: "attached", 
        artist: "Tenxi, Anangga & Suisei",
        views: 1630000
   },
  27: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Paling%20Sabi.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Bintang5.jpg", 
        title: "Paling sabi", 
        artist: "Tenxi, RYO, dia & Jemsii",
        views: 989300
  },
  28: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Coba%20Lagi.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/ubah%20lagi.jpg", 
        title: "Coba Lagi", 
        artist: "Tenxi & Jemsii",
        views: 3560000
  },
  29: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Yodah%20ku%20Selingkuh.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Bintang5.jpg", 
        title: "Yodah ku Selingkuh", 
        artist: "Tenxi, Lucidrari & Jemsii",
        views: 720000
  },
  30: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Bayangno%20Awakmu.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Bintang5.jpg", 
        title: "Bayangno Awakmu", 
        artist: "Tenxi & Jemsii",
        views: 739700},
  31: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Apa%20Lagi.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Bintang5.jpg", 
        title: "Apa Lagi", 
        artist: "Tenxi, Anangga & Jemsii",
        views: 458500},
  32: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Dikasih%20Akses.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Bintang5.jpg", 
        title: "Dikasih Akses", 
        artist: "Tenxi & Jemsii",
        views: 255100},
  33: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Buku%20Baru%20(Interlude).mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Bintang5.jpg", 
        title: "Buku Baru (Interlude)", 
        artist: "Tenxi & Jemsii",
        views: 220500},
  34: { audio: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/%E5%85%AB%E6%96%B9%E4%BE%86%E8%B2%A1%20(Stacks%20from%20All%20Sides).mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/%E5%85%AB%E6%96%B9%E4%BE%86%E8%B2%A1(Stacks%20from%20All%20Sides).jpg", 
        title: "八方來財(Stacks from All Sides)", 
        artist: "攬佬SKAI ISYOURGOD",
        tags: ["😝🤙🏻"],
        views: 136500000},
   35: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Somewhere%20Only%20We%20Know%20(1).mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/somewhere2.jpg", 
        title: "Somewhere Only We Know", 
        artist: "Keane",
        views: 1600000000},
  36: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Tor%20Monitor%20Ketua.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/artworks-tY0vRpEXFSNj-0-t500x500.png", 
        title: "Tor Monitor Ketua", 
        artist: "DJ SIBUK",
        views: 712000
  },
  37: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/MALA.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Mala%20(6ix9ine).jpg", 
        title: "MALA (feat. Anuel Aa)", 
        artist: "6ix9ine",
        tags: ["😝🤙🏻"],
        views: 393400000},
  38: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Amin%20Paling%20Serius.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/amin%20paling%20serius.jpg", 
        title: "Amin Paling Serius", 
        artist: "Sal Priadi & Nadin Amizah",
        tags: ["sad"],
        views: 58500000},
  39: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Starboy.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/starboy.jpg", 
        title: "Starboy (feat, Duft Punk)", 
        artist: "The Weeknd",
        views: 3800000000},
  40: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/One%20Of%20The%20Girls.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/One%20Of%20The%20Girls.jpg", 
        title: "One Of The Girls", 
        artist: "The Weeknd, JENNIE & Lily Rose Depp",
        views: 1200000000},
  41: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Timeless.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Timeless.jpg", 
        title: "Timeless",
        tags: ["😝🤙🏻"],
        artist: "The Weeknd & Playboi Carti",
        views: 414500000},
  42: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Blinding%20Lights.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/The_Weeknd_-_Blinding_Lights.png", 
        title: "Blinding Light", 
        artist: "The Weeknd",
        views: 3400000000},
  43: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Save%20Your%20Tears.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Save%20your%20Tears.jpg", 
        title: "Save Your Tears", 
        artist: "The Weeknd",
        views: 3000000000},
  44: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Die%20For%20You%20(Remix).mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/die%20for%20you.jpg", 
        title: "Die For You (Remix)", 
        artist: "The Weeknd & Ariana Grande",
        views: 777300000},
  45: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Girl%20You%20Loud.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Girl%20you%20Loud.jpg", 
        title: "Girl You Loud", 
        artist: "Chris Brown & Tyga",
        tags: ["😝🤙🏻"],
        views: 35200000},
  46: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/%D0%AF%D0%B4.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/erika%20lundmoen.jpg", 
        title: "Яд", 
        artist: "Erika Lundmoen",
        tags: ["😝🤙🏻"],
        views: 170600000},
  47: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Swimming%20Pools%20(Drank).mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/SwimmingPools.jpg", 
        title: "Swimming Pools (Drank)", 
        artist: "Kendrick Lamar",
        tags: ["😝🤙🏻"],
        views: 714700000},
  48: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/HUMBLE..mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/HUMBLE.jpg", 
        title: "HUMBLE", 
        artist: "Kendrick Lamar",
        tags: ["😝🤙🏻"],
        views: 1500000000},
  49: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/FE!N.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Fein.jpg", 
        title: "FE!N (feat, Playboi Carti)", 
        artist: "Travis Scott",
        tags: ["😝🤙🏻"],
        views: 602800000},
  50: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Love%20Me.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Lil%20Wayne.jpg", 
        title: "Love Me (feat, Drake Future)", 
        artist: "Lil Wayne",
        tags: ["😝🤙🏻"],
        views: 1000000000},
   51: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/PELIGROSA.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/peligrosa.jpg", 
        title: "PELIGROSA", 
        artist: "FloyyMenor",
        tags: ["😝🤙🏻"],
        views: 311400000},
  52: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Old%20Town%20Road%20(Remix).mp3",
        audio_320: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Old%20Town%20Road.mp3",
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/old%20town%20roand.jpg",
        title: "Old Town Road (Remix) - (feat, Billy Ray Cyrus)", 
        artist: "Lil Nas X",
        tags: ["😝🤙🏻"],
        views: 3850000000},
  53: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Gata%20Only.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Gata%20Only.jpg", 
        title: "Gata Only", 
        artist: "FloyyMenor & Cris Mj",
        tags: ["😝🤙🏻"],
        views: 1400000000},
  54: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/BAND4BAND.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/BAND4BAND.jpg", 
        title: "BAND4BAND", 
        artist: "Central Lee & Lil Baby",
        tags: ["😝🤙🏻"],
        views: 384700000},
  55: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/redrum.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/redrum.jpg", 
        title: "redrum", 
        artist: "21 Savage",
        tags: ["😝🤙🏻"],
        views: 336200000},
  56: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Popular%20(From%20The%20Idol%20Vol.%201%20(Music%20from%20the%20HBO%20Original%20Series)).mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/popular.jpg", 
        title: "Popular (From The Idol Vol. 1 (Music from the HBO Original Series)) (feat, Playboi Carti)", 
        artist: "The Weeknd",
        tags: ["😝🤙🏻"],
        views: 384300000},
  57: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Mask%20Off.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/mask%20off.jpg", 
        title: "Mask Off", 
        artist: "Future",
        tags: ["😝🤙🏻"],
        views: 1400000000},
  58: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Dangerous%20Woman.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/women.png", 
        title: "Dangerous Woman", 
        artist: "Ariana Grande",
        tags: ["😝🤙🏻"],
        views: 1200000000},
  59: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Hotel%20Room.mp3", 
        image: "https://raw.githubusercontent.com/pretyfx69/music-files/refs/heads/main/hotel%20room.jpg", 
        title: "Hotel Room", 
        artist: "FLVCKKA, Sleezy O & Maury",
        tags: ["😝🤙🏻"],
        views: 427800000},
  60: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/NOW%20OR%20NEVER.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/NOW%20OR%20NEVER.jpg", 
        title: "NOW OR NEVER", 
        artist: "TKandz & CXSPER",
        tags: ["😝🤙🏻"],
        views: 11500000},
  61: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/No%20Pole.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/no%20pole.jpg", 
        title: "No Pole", 
        artist: "Don Toliver",
        tags: ["😝🤙🏻"],
        views: 142500000},
  62: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Again.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/again.jpg", 
        title: "Again (feat, XXXTENTACION)", 
        artist: "Noah Cyrus & XXXTENTACION",
        tags: ["😝🤙🏻"],
        views: 306200000},
  63: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Gata%20Only%20(Remix).mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/gata%20only%20remix.jpg", 
        title: "Gata Only (Remix)", 
        artist: "FloyyMenor, Ozuna & Anitta",
        tags: ["😝🤙🏻"],
        views: 87100000},
  64: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/You%20Don't%20Own%20Me.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/you%20dont.jpg", 
        title: "You Don't Own Me", 
        artist: "SAYGRACE & G-Eazy",
        tags: ["😝🤙🏻"],
        views: 717600000},
  65: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Mind%20Games.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/mind%20games.jpg", 
        title: "Mind Games", 
        artist: "Sickick",
        tags: ["😝🤙🏻"],
        views: 249200000},
  66: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Renegade.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/renearge.jpg", 
        title: "Renegade", 
        artist: "Aaryan Shah",
        tags: ["😝🤙🏻",],
        views: 111300000},
  67: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Low%20Life.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/low%20life.jpg", 
        title: "Low Life (feat, The Weeknd)", 
        artist: "Future & The Weeknd",
        tags: ["😝🤙🏻"],
        views: 1200000000},
  68: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Embrace%20It.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/embrace%20it.jpg", 
        title: "Embrace It", 
        artist: "Ndotz",
        tags: ["😝🤙🏻"],
        views: 95100000},
  69: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Descer.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/descer.jpg", 
        title: "Descer", 
        artist: "Kew & Dj LK da Esćoria",
        tags: ["😝🤙🏻"],
        views: 61800000},
  70: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Havana.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/havana.jpg", 
        title: "Havana (feat, Young Thug)", 
        artist: "Camila Cabello & Young Thug",
        tags: ["😝🤙🏻"],
        views: 4000000000},
  71: { audio: "https://github.com/PretyFX69/music-files/refs/heads/main/Dat%20tick.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/dat%20stick.jpg", 
        title: "Dat $tick", 
        artist: "Rich Brian",
        tags: ["😝🤙🏻"],
        views: 249200000},
  72: { audio: "https://github.com/PretyFX69/music-files2/raw/refs/heads/main/Still%20With%20You.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files2/refs/heads/main/still%20witth%20you.jpg", 
        title: "Still With You", 
        artist: "Jung Kook",
        tags: ["😝🤙🏻"],
        views: 144800000},
  73: { audio: "https://github.com/PretyFX69/music-files2/raw/refs/heads/main/nuts.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files2/refs/heads/main/nuts.png", 
        title: "nuts", 
        artist: "Lil Peep & rainy bear",
        tags: ["😝🤙🏻"],
        views: 108300000},
  74: { audio: "https://github.com/PretyFX69/music-files2/raw/refs/heads/main/Swim.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files2/refs/heads/main/swim.jpg", 
        title: "Swim", 
        artist: "Chase Atlantic",
        tags: ["😝🤙🏻"],
        views: 540700000},
  75: { audio: "https://github.com/PretyFX69/music-files2/raw/refs/heads/main/Reminder.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files2/refs/heads/main/reminder.png", 
        title: "Reminder", 
        artist: "The Weeknd",
        tags: ["😝🤙🏻"],
        views: 907900000},
  76: { audio: "https://github.com/PretyFX69/music-files2/raw/refs/heads/main/Rock%20That%20Body.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files2/refs/heads/main/rock%20that.jpg", 
        title: "Rock That Body", 
        artist: "Black Eyed Peas",
        tags: ["😝🤙🏻"],
        views: 424600000},
  77: { audio: "https://github.com/PretyFX69/music-files2/raw/refs/heads/main/Too%20Many%20Nights.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files2/refs/heads/main/too%20many.png", 
        title: "Too Many Nights (feat, Don Toliver & With Future)", 
        artist: "Metro Boomin, Future & Don Toliver",
        tags: ["😝🤙🏻"],
        views: 400600000},
  78: { audio: "https://github.com/PretyFX69/music-files2/raw/refs/heads/main/S%C3%A3o%20Paulo.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/Timeless.jpg", 
        title: "São Paulo (feat, Anitta)", 
        artist: "The Weeknd & Anitta",
        tags: ["😝🤙🏻"],
        views: 181900000},
  79: { audio: "https://github.com/PretyFX69/music-files2/raw/refs/heads/main/She%20Will.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files2/refs/heads/main/she%20will.jpg", 
        title: "She Will", 
        artist: "Lil Wayne & Drake",
        tags: ["😝🤙🏻"],
        views: 189600000},
  80: { audio: "https://github.com/PretyFX69/music-files2/raw/refs/heads/main/Call%20Out%20My%20Name.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files2/refs/heads/main/call%20out.png", 
        title: "Call Out My Name", 
        artist: "The Weeknd",
        tags: ["😝🤙🏻"],
        views: 1600000000},
  81: { audio: "https://github.com/PretyFX69/music-files2/raw/refs/heads/main/The%20Hills.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files2/refs/heads/main/the%20hills.jpg", 
        title: "The Hills", 
        artist: "The Weeknd",
        tags: ["😝🤙🏻"],
        views: 2700000000},
  82: { audio: "https://github.com/PretyFX69/music-files2/raw/refs/heads/main/Around%20Me.mp3", 
        image: "https://raw.githubusercontent.com/PretyFX69/music-files2/refs/heads/main/too%20many.png", 
        title: "Around Me (feat, Don Toliver)", 
        artist: "Metro Boomin & Don Toliver",
        tags: ["😝🤙🏻"],
        views: 76900000},
   83: { audio: "https://github.com/PretyFX69/Music-CyberZain/raw/refs/heads/main/kota%20ini%20tak%20sama%20tanpamu.mp3", 
       image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/nadhif.jpg", 
       title: "Kota Ini Tak Sama Tanpamu", 
       artist: "Nadhif Basalamah",
       tags: ["sad"],
       views: 48700000},
 84: { audio: "https://github.com/PretyFX69/Music-CyberZain/raw/refs/heads/main/masih_ada_waktunya_320k.mp3", 
       image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/nadhif.jpg", 
       title: "Masih Ada Waktunya", 
       artist: "Nadhif Basalamah",
       tags: ["sad"],
       views: 1300000},
 85: { audio: "https://github.com/PretyFX69/Music-CyberZain/raw/refs/heads/main/masih_ada_waktunya_320k.mp3", 
       image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/nadhif.jpg", 
       title: "Bergema Sampai Selamanya (Stripped Version)", 
       artist: "Nadhif Basalamah",
       tags: ["sad"],
       views: 4700000},
 86: { audio: "https://github.com/PretyFX69/music-files2/raw/refs/heads/main/DJ%20Mojang%20Priangan%20(%20Slowed%20&%20Reverb%20)%20%F0%9F%8E%A7.mp3", 
       image: "https://raw.githubusercontent.com/PretyFX69/music-files2/refs/heads/main/IMG-20260216-WA0006.jpg", 
       title: "DJ Mojang Priangan ( Slowed & Reverb ) 🎧", 
       artist: "Nuranawa",
       tags: ["aksi","Bewan ff"],
       views: 10100000},
 87: { audio: "https://www.dropbox.com/scl/fi/cgmk04yf01ou5k223cqg4/DJ_SOUND_JJ_SEREM_ELITE_CEES_COCOK_BUAT_MODE_BANTAI_FULL_BASS_GACOR_VIRAL_TERBARU_2025-_VOL.01_320k.mp3?rlkey=kxqi94mpu2029hag3k0jgdl1x&st=s7dbdpx3&raw=1", 
       image: "https://raw.githubusercontent.com/PretyFX69/music-files2/refs/heads/main/hqdefault%20(1).jpg", 
       title: "DJ SOUND JJ SEREM ELITE CEES COCOK BUAT MODE BANTAI FULL BASS GACOR VIRAL TERBARU 2025🎧 VOL.01", 
       artist: "MAZ XREP",
       tags: ["aksi","Bewan ff"],
       views: 220600},
 88: { audio: "https://github.com/PretyFX69/music-files2/raw/refs/heads/main/On_My_Way_320k.mp3", 
       image: "https://raw.githubusercontent.com/PretyFX69/music-files2/refs/heads/main/artworks-aMP8KD1wt4g7h6e9-dYjb4w-t500x500.jpg", 
       title: "On My Way", 
       artist: "Sabrina Carpenter, Farruko & Alan Walker",
       tags: ["aksi","Bewan ff"],
       views: 1600000000},
  89: { audio: "https://github.com/PretyFX69/music-files2/raw/refs/heads/main/come%20to%20brazil%20(1).mp3", 
       image: "https://raw.githubusercontent.com/PretyFX69/music-files2/refs/heads/main/Screenshot_20260224-094158.jpg", 
       title: "Come to brazil", 
       artist: "bbno$",
       tags: ["😝🤙🏻"],
       views: 3370000},
  90: { audio: "https://github.com/PretyFX69/music-files2/raw/refs/heads/main/MALU%20MALU.mp3", 
       image: "https://raw.githubusercontent.com/PretyFX69/music-files2/refs/heads/main/WA_1773470020145.jpeg", 
       title: "MALU MALU", 
       artist: "dia & INDAHKUS",
       tags: ["senang"],
       views: 5720000},
 91: { video: "https://www.dropbox.com/scl/fi/unzalsbc116090xxcb6ae/DJ-SUGES-AKU-SUGES-KEPALAKU-DINGIN-KERINGETAN-__-AKU-SUGES-VERSI-BARU-2026.mp4?rlkey=jgp2gx1e7bqhqfyiwxfpjldui&st=3qwc6ywh&dl=1", 
       image: "https://raw.githubusercontent.com/PretyFX69/music-files2/refs/heads/main/mqdefault%20(2).jpg", 
       title: "DJ AKU SUGES SUGES KEPALAKU DINGIN KERINGATAN TREND JEDAG JEDUG VIRAL FYP!", 
       artist: "KYLA FVNKY",
       tags: ["dj sugest"],
       views: 105800},
 92: { video: "https://www.dropbox.com/scl/fi/9xu6saanc0zeb57he2c28/DJ-VOICES-IN-MY-HEAD-REVERB-BREAKBEAT-REMIX-BY-NOKA-AXL.mp4?rlkey=d7f77d11z14mdxrso12ht02bv&st=1779syjj&dl=1", 
       image: "https://raw.githubusercontent.com/PretyFX69/music-files2/refs/heads/main/mqdefault%20(1).jpg", 
       title: "DJ VOICES IN MY HEAD REVERB BREAKBEAT REMIX BY NOKA AXL", 
       artist: "Tunes ID RMX",
       tags: ["dj fish it"],
       views: 2100000},
   93: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/Bahagia%20Lagi.mp3", 
       image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/FHUtwGLydD.jpg", 
       title: "Bahagia Lagi", 
       artist: "Piche Kota",
       tags: ["sedih"],
       views: 71200000},
 94: { audio: "https://github.com/PretyFX69/music-files/raw/refs/heads/main/CLBK%20Cintaku%20Padamu%20Bersemi%20Kembali.mp3", 
       image: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/WA_1773935486759.jpeg", 
       title: "CLBK ( Cintaku Padamu Bersemi Kembali )", 
       artist: "Maman Fvndy",
       tags: ["sedih"],
       views: 27200000},  
}; 

const playlist = Object.keys(songs).map(k => ({ id: k, ...songs[k] }));
window.playlist = playlist;

// ===== DATA MENGAJI (Surat Al-Quran) =====
const mengaji = [
    { nomor: 1,   nama: 'Al-Fatihah',       arab: 'الفاتحة',        ayat: 7,   url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/1.mp3' },
    { nomor: 2,   nama: 'Al-Baqarah',       arab: 'البقرة',          ayat: 286, url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/2.mp3' },
    { nomor: 3,   nama: 'Ali Imran',        arab: 'آل عمران',        ayat: 200, url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/3.mp3' },
    { nomor: 4,   nama: 'An-Nisa',          arab: 'النساء',          ayat: 176, url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/4.mp3' },
    { nomor: 5,   nama: 'Al-Maidah',        arab: 'المائدة',         ayat: 120, url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/5.mp3' },
    { nomor: 6,   nama: 'Al-Anam',          arab: 'الأنعام',         ayat: 165, url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/6.mp3' },
    { nomor: 7,   nama: 'Al-Araf',          arab: 'الأعراف',         ayat: 206, url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/7.mp3' },
    { nomor: 8,   nama: 'Al-Anfal',         arab: 'الأنفال',         ayat: 75,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/8.mp3' },
    { nomor: 9,   nama: 'At-Taubah',        arab: 'التوبة',          ayat: 129, url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/9.mp3' },
    { nomor: 10,  nama: 'Yunus',            arab: 'يونس',            ayat: 109, url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/10.mp3' },
    { nomor: 11,  nama: 'Hud',              arab: 'هود',             ayat: 123, url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/11.mp3' },
    { nomor: 12,  nama: 'Yusuf',            arab: 'يوسف',            ayat: 111, url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/12.mp3' },
    { nomor: 13,  nama: 'Ar-Rad',           arab: 'الرعد',           ayat: 43,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/13.mp3' },
    { nomor: 14,  nama: 'Ibrahim',          arab: 'إبراهيم',         ayat: 52,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/14.mp3' },
    { nomor: 15,  nama: 'Al-Hijr',          arab: 'الحجر',           ayat: 99,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/15.mp3' },
    { nomor: 16,  nama: 'An-Nahl',          arab: 'النحل',           ayat: 128, url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/16.mp3' },
    { nomor: 17,  nama: 'Al-Isra',          arab: 'الإسراء',         ayat: 111, url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/17.mp3' },
    { nomor: 18,  nama: 'Al-Kahfi',         arab: 'الكهف',           ayat: 110, url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/18.mp3' },
    { nomor: 19,  nama: 'Maryam',           arab: 'مريم',            ayat: 98,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/19.mp3' },
    { nomor: 20,  nama: 'Taha',             arab: 'طه',              ayat: 135, url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/20.mp3' },
    { nomor: 21,  nama: 'Al-Anbiya',        arab: 'الأنبياء',        ayat: 112, url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/21.mp3' },
    { nomor: 22,  nama: 'Al-Hajj',          arab: 'الحج',            ayat: 78,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/22.mp3' },
    { nomor: 23,  nama: 'Al-Mukminun',      arab: 'المؤمنون',        ayat: 118, url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/23.mp3' },
    { nomor: 24,  nama: 'An-Nur',           arab: 'النور',           ayat: 64,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/24.mp3' },
    { nomor: 25,  nama: 'Al-Furqan',        arab: 'الفرقان',         ayat: 77,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/25.mp3' },
    { nomor: 26,  nama: 'Asy-Syuara',       arab: 'الشعراء',         ayat: 227, url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/26.mp3' },
    { nomor: 27,  nama: 'An-Naml',          arab: 'النمل',           ayat: 93,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/27.mp3' },
    { nomor: 28,  nama: 'Al-Qasas',         arab: 'القصص',           ayat: 88,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/28.mp3' },
    { nomor: 29,  nama: 'Al-Ankabut',       arab: 'العنكبوت',        ayat: 69,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/29.mp3' },
    { nomor: 30,  nama: 'Ar-Rum',           arab: 'الروم',           ayat: 60,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/30.mp3' },
    { nomor: 31,  nama: 'Luqman',           arab: 'لقمان',           ayat: 34,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/31.mp3' },
    { nomor: 32,  nama: 'As-Sajdah',        arab: 'السجدة',          ayat: 30,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/32.mp3' },
    { nomor: 33,  nama: 'Al-Ahzab',         arab: 'الأحزاب',         ayat: 73,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/33.mp3' },
    { nomor: 34,  nama: 'Saba',             arab: 'سبأ',             ayat: 54,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/34.mp3' },
    { nomor: 35,  nama: 'Fatir',            arab: 'فاطر',            ayat: 45,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/35.mp3' },
    { nomor: 36,  nama: 'Yasin',            arab: 'يس',              ayat: 83,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/36.mp3' },
    { nomor: 37,  nama: 'As-Saffat',        arab: 'الصافات',         ayat: 182, url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/37.mp3' },
    { nomor: 38,  nama: 'Sad',              arab: 'ص',               ayat: 88,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/38.mp3' },
    { nomor: 39,  nama: 'Az-Zumar',         arab: 'الزمر',           ayat: 75,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/39.mp3' },
    { nomor: 40,  nama: 'Gafir',            arab: 'غافر',            ayat: 85,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/40.mp3' },
    { nomor: 41,  nama: 'Fussilat',         arab: 'فصلت',            ayat: 54,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/41.mp3' },
    { nomor: 42,  nama: 'Asy-Syura',        arab: 'الشورى',          ayat: 53,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/42.mp3' },
    { nomor: 43,  nama: 'Az-Zukhruf',       arab: 'الزخرف',          ayat: 89,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/43.mp3' },
    { nomor: 44,  nama: 'Ad-Dukhan',        arab: 'الدخان',          ayat: 59,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/44.mp3' },
    { nomor: 45,  nama: 'Al-Jasiyah',       arab: 'الجاثية',         ayat: 37,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/45.mp3' },
    { nomor: 46,  nama: 'Al-Ahqaf',         arab: 'الأحقاف',         ayat: 35,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/46.mp3' },
    { nomor: 47,  nama: 'Muhammad',         arab: 'محمد',            ayat: 38,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/47.mp3' },
    { nomor: 48,  nama: 'Al-Fath',          arab: 'الفتح',           ayat: 29,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/48.mp3' },
    { nomor: 49,  nama: 'Al-Hujurat',       arab: 'الحجرات',         ayat: 18,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/49.mp3' },
    { nomor: 50,  nama: 'Qaf',              arab: 'ق',               ayat: 45,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/50.mp3' },
    { nomor: 51,  nama: 'Az-Zariyat',       arab: 'الذاريات',        ayat: 60,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/51.mp3' },
    { nomor: 52,  nama: 'At-Tur',           arab: 'الطور',           ayat: 49,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/52.mp3' },
    { nomor: 53,  nama: 'An-Najm',          arab: 'النجم',           ayat: 62,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/53.mp3' },
    { nomor: 54,  nama: 'Al-Qamar',         arab: 'القمر',           ayat: 55,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/54.mp3' },
    { nomor: 55,  nama: 'Ar-Rahman',        arab: 'الرحمن',          ayat: 78,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/55.mp3' },
    { nomor: 56,  nama: 'Al-Waqiah',        arab: 'الواقعة',         ayat: 96,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/56.mp3' },
    { nomor: 57,  nama: 'Al-Hadid',         arab: 'الحديد',          ayat: 29,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/57.mp3' },
    { nomor: 58,  nama: 'Al-Mujadilah',     arab: 'المجادلة',        ayat: 22,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/58.mp3' },
    { nomor: 59,  nama: 'Al-Hasyr',         arab: 'الحشر',           ayat: 24,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/59.mp3' },
    { nomor: 60,  nama: 'Al-Mumtahanah',    arab: 'الممتحنة',        ayat: 13,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/60.mp3' },
    { nomor: 61,  nama: 'As-Saf',           arab: 'الصف',            ayat: 14,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/61.mp3' },
    { nomor: 62,  nama: 'Al-Jumuah',        arab: 'الجمعة',          ayat: 11,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/62.mp3' },
    { nomor: 63,  nama: 'Al-Munafiqun',     arab: 'المنافقون',       ayat: 11,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/63.mp3' },
    { nomor: 64,  nama: 'At-Tagabun',       arab: 'التغابن',         ayat: 18,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/64.mp3' },
    { nomor: 65,  nama: 'At-Talaq',         arab: 'الطلاق',          ayat: 12,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/65.mp3' },
    { nomor: 66,  nama: 'At-Tahrim',        arab: 'التحريم',         ayat: 12,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/66.mp3' },
    { nomor: 67,  nama: 'Al-Mulk',          arab: 'الملك',           ayat: 30,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/67.mp3' },
    { nomor: 68,  nama: 'Al-Qalam',         arab: 'القلم',           ayat: 52,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/68.mp3' },
    { nomor: 69,  nama: 'Al-Haqqah',        arab: 'الحاقة',          ayat: 52,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/69.mp3' },
    { nomor: 70,  nama: 'Al-Maarij',        arab: 'المعارج',         ayat: 44,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/70.mp3' },
    { nomor: 71,  nama: 'Nuh',              arab: 'نوح',             ayat: 28,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/71.mp3' },
    { nomor: 72,  nama: 'Al-Jin',           arab: 'الجن',            ayat: 28,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/72.mp3' },
    { nomor: 73,  nama: 'Al-Muzammil',      arab: 'المزمل',          ayat: 20,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/73.mp3' },
    { nomor: 74,  nama: 'Al-Muddassir',     arab: 'المدثر',          ayat: 56,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/74.mp3' },
    { nomor: 75,  nama: 'Al-Qiyamah',       arab: 'القيامة',         ayat: 40,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/75.mp3' },
    { nomor: 76,  nama: 'Al-Insan',         arab: 'الإنسان',         ayat: 31,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/76.mp3' },
    { nomor: 77,  nama: 'Al-Mursalat',      arab: 'المرسلات',        ayat: 50,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/77.mp3' },
    { nomor: 78,  nama: 'An-Naba',          arab: 'النبأ',           ayat: 40,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/78.mp3' },
    { nomor: 79,  nama: 'An-Naziat',        arab: 'النازعات',        ayat: 46,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/79.mp3' },
    { nomor: 80,  nama: 'Abasa',            arab: 'عبس',             ayat: 42,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/80.mp3' },
    { nomor: 81,  nama: 'At-Takwir',        arab: 'التكوير',         ayat: 29,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/81.mp3' },
    { nomor: 82,  nama: 'Al-Infitar',       arab: 'الانفطار',        ayat: 19,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/82.mp3' },
    { nomor: 83,  nama: 'Al-Mutaffifin',    arab: 'المطففين',        ayat: 36,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/83.mp3' },
    { nomor: 84,  nama: 'Al-Insyiqaq',      arab: 'الانشقاق',        ayat: 25,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/84.mp3' },
    { nomor: 85,  nama: 'Al-Buruj',         arab: 'البروج',          ayat: 22,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/85.mp3' },
    { nomor: 86,  nama: 'At-Tariq',         arab: 'الطارق',          ayat: 17,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/86.mp3' },
    { nomor: 87,  nama: 'Al-Ala',           arab: 'الأعلى',          ayat: 19,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/87.mp3' },
    { nomor: 88,  nama: 'Al-Gasyiyah',      arab: 'الغاشية',         ayat: 26,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/88.mp3' },
    { nomor: 89,  nama: 'Al-Fajr',          arab: 'الفجر',           ayat: 30,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/89.mp3' },
    { nomor: 90,  nama: 'Al-Balad',         arab: 'البلد',           ayat: 20,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/90.mp3' },
    { nomor: 91,  nama: 'Asy-Syams',        arab: 'الشمس',           ayat: 15,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/91.mp3' },
    { nomor: 92,  nama: 'Al-Lail',          arab: 'الليل',           ayat: 21,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/92.mp3' },
    { nomor: 93,  nama: 'Ad-Duha',          arab: 'الضحى',           ayat: 11,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/93.mp3' },
    { nomor: 94,  nama: 'Al-Insyirah',      arab: 'الشرح',           ayat: 8,   url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/94.mp3' },
    { nomor: 95,  nama: 'At-Tin',           arab: 'التين',           ayat: 8,   url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/95.mp3' },
    { nomor: 96,  nama: 'Al-Alaq',          arab: 'العلق',           ayat: 19,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/96.mp3' },
    { nomor: 97,  nama: 'Al-Qadr',          arab: 'القدر',           ayat: 5,   url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/97.mp3' },
    { nomor: 98,  nama: 'Al-Bayyinah',      arab: 'البينة',          ayat: 8,   url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/98.mp3' },
    { nomor: 99,  nama: 'Az-Zalzalah',      arab: 'الزلزلة',         ayat: 8,   url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/99.mp3' },
    { nomor: 100, nama: 'Al-Adiyat',        arab: 'العاديات',        ayat: 11,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/100.mp3' },
    { nomor: 101, nama: 'Al-Qariah',        arab: 'القارعة',         ayat: 11,  url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/101.mp3' },
    { nomor: 102, nama: 'At-Takasur',       arab: 'التكاثر',         ayat: 8,   url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/102.mp3' },
    { nomor: 103, nama: 'Al-Asr',           arab: 'العصر',           ayat: 3,   url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/103.mp3' },
    { nomor: 104, nama: 'Al-Humazah',       arab: 'الهمزة',          ayat: 9,   url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/104.mp3' },
    { nomor: 105, nama: 'Al-Fil',           arab: 'الفيل',           ayat: 5,   url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/105.mp3' },
    { nomor: 106, nama: 'Quraisy',          arab: 'قريش',            ayat: 4,   url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/106.mp3' },
    { nomor: 107, nama: 'Al-Maun',          arab: 'الماعون',         ayat: 7,   url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/107.mp3' },
    { nomor: 108, nama: 'Al-Kautsar',       arab: 'الكوثر',          ayat: 3,   url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/108.mp3' },
    { nomor: 109, nama: 'Al-Kafirun',       arab: 'الكافرون',       ayat: 6,   url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/109.mp3' },
    { nomor: 110, nama: 'An-Nasr',          arab: 'النصر',           ayat: 3,   url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/110.mp3' },
    { nomor: 111, nama: 'Al-Lahab',         arab: 'المسد',           ayat: 5,   url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/111.mp3' },
    { nomor: 112, nama: 'Al-Ikhlas',        arab: 'الإخلاص',         ayat: 4,   url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/112.mp3' },
    { nomor: 113, nama: 'Al-Falaq',         arab: 'الفلق',           ayat: 5,   url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/113.mp3' },
    { nomor: 114, nama: 'An-Nas',           arab: 'الناس',           ayat: 6,   url: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/114.mp3' },
];

// 🔥 SHUFFLE OTOMATIS - Acak list musik 1-88, index 0 tetap di tempat
// Fungsi untuk mengacak array (Fisher-Yates shuffle)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Simpan index 0, acak index 1-88
const firstSong = playlist[0]; // Index 0 tetap (Music not found)
const songsToShuffle = playlist.slice(1); // Ambil index 1 sampai akhir
const shuffledSongs = shuffleArray(songsToShuffle); // Acak musik 1-88

// Gabungkan lagi: index 0 tetap, 1-88 sudah teracak
playlist.length = 0;
playlist.push(firstSong, ...shuffledSongs);

console.log("🎵 Playlist berhasil diacak! Index 0 tetap, index 1-88 sudah random.");

let currentRealIndex = 0;
let currentFilteredIndex = -1;
let isPlaying = false;
window.currentRealIndex = 0;
window.isPlaying = false;
let isLoop = false;
let filteredMode = false;
let filteredList = [];

/* ----------------------
   ELEMENT DOM
---------------------- */
const audio = document.getElementById('audioPlayer');
window.audio = audio;
const cd = document.getElementById('cd');
const playBtn = document.getElementById('playBtn');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const progressEl = document.getElementById('progress');
const seekBar = document.getElementById('seekBar');
const currText = document.getElementById('current');
const durText = document.getElementById('duration');
const nowTitle = document.getElementById('nowTitle');
const nowArtist = document.getElementById('nowArtist');
const playlistBox = document.getElementById('playlistBox');
//const songSelect = document.getElementById('songSelect');
const searchSong = document.getElementById('searchSong');
const toggleLoopBtn = document.getElementById('toggleLoop');
const visualBars = document.querySelectorAll('.bar');

const menuBtn = document.getElementById("menuBtn");
const menuPanel = document.getElementById("menuPanel");
const qualityMenuBtn = document.getElementById("qualityMenuBtn");
const qualitySub = document.getElementById("qualitySubmenu");
const sleepBtn = document.getElementById("sleepTimeBtn");
const sleepSub = document.getElementById("sleepSubmenu");
const equalizerBtn = document.getElementById("equalizerBtn");
const equalizerSubmenu = document.getElementById("equalizerSubmenu");
const reportBtn = document.getElementById("reportBtn");

/* ======================
   UTILITY FUNCTIONS
====================== */
function formatViews(v) {
  if (!v) return "0 pemutaran";
  if (v >= 1000000000) return (v / 1000000000).toFixed(1) + " M pemutaran";
  if (v >= 1000000) return (v / 1000000).toFixed(1) + " jt pemutaran";
  if (v >= 1000) return (v / 1000).toFixed(0) + " rb pemutaran";
  return v + "x diputar";
}

function formatTime(s) {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0'+sec : sec}`;
}

/* ======================
   SCROLLING TITLE FIX
====================== */
function updateScrollingTitle() {
    const title = document.getElementById("nowTitle");
    const wrap  = document.querySelector(".title-wrap");
    title.classList.remove("scrolling");
    if (title.scrollWidth <= wrap.clientWidth) return;
    // restart animation
    void title.offsetWidth;
    title.classList.add("scrolling");
}

/* ======================
   LOAD & PLAY LAGU (CORE)
   - loadSongByIndex(i) expects i = index in playlist[]
====================== */
function loadSongByIndex(i) {
  if (typeof i !== 'number' || i < 0 || i >= playlist.length) return;

  currentRealIndex = i;
  window.currentRealIndex = i;
  const s = playlist[currentRealIndex];
  const hasVideo = !!(s.video && s.video.trim().length > 0);

  _czmVideoMode = hasVideo;

  const vidEl  = document.getElementById('czm-video');
  const artEl  = document.getElementById('czm-art');
  const wrap   = document.getElementById('czm-art-wrap');
  const audioEl= document.getElementById('audioPlayer');

  try {
    if(hasVideo){
      // Stop audio sepenuhnya
      if(audioEl){ audioEl.pause(); audioEl.muted=true; }
      // Setup video
      if(vidEl){
        vidEl.src = s.video;
        vidEl.style.display = 'block';
        vidEl.muted = false;
        vidEl.ontimeupdate = czmVideoSyncBar;
        vidEl.onended = ()=>{ if(typeof czmNext==='function') czmNext(); };
        vidEl.onplay  = ()=>{
          const ico=document.getElementById('czm-play-ico'); if(ico) ico.className='fa-solid fa-pause';
          const pb=document.getElementById('playBtn'); if(pb) pb.textContent='⏸';
          isPlaying=true; window.isPlaying=true;
        };
        vidEl.onpause = ()=>{
          const ico=document.getElementById('czm-play-ico'); if(ico) ico.className='fa-solid fa-play';
          const pb=document.getElementById('playBtn'); if(pb) pb.textContent='▶';
          isPlaying=false; window.isPlaying=false;
        };
      }
      if(artEl) artEl.style.display='none';
      if(wrap)  wrap.classList.add('czm-video-mode');
    } else {
      // Audio mode normal
      if(vidEl){ vidEl.pause(); vidEl.src=''; vidEl.style.display='none'; }
      if(artEl){ artEl.src=s.image||''; artEl.style.display='block'; }
      if(wrap)  wrap.classList.remove('czm-video-mode');
      if(audioEl) audioEl.muted=false;
      if(s.audio && s.audio.trim()){
        audio.src = s.audio;
        audio.load();
      }
    }
  } catch(e){ console.warn('loadSongByIndex error:', e); }

  // ui legacy
  try {
    cd.style.backgroundImage = `url('${s.image}')`;
    nowTitle.textContent = s.title;
    nowArtist.textContent = s.artist;
    setTimeout(updateScrollingTitle, 120);
    highlightPlaying();
  } catch(e){}
}

/* ======================
   RENDER PLAYLIST (FULL OR FILTERED)
   - If list is full playlist, items' data-index = playlist index
   - If list is filteredList, items' data-index = filtered position (pos)
====================== */
function renderPlaylist(list, isFiltered = false) {
  playlistBox.innerHTML = "";
  // songSelect.innerHTML = '<option value="">— Music Yang Tersedia —</option>';  ← HAPUS

  list.forEach((s, idx) => {
    const div = document.createElement('div');
    div.className = 'song-item';

    if (isFiltered) {
      div.dataset.index = idx;
    } else {
      const playlistIndex = playlist.findIndex(p => String(p.id) === String(s.id));
      div.dataset.index = playlistIndex >= 0 ? playlistIndex : idx;
    }

    div.innerHTML = `
      <div class="song-meta">
        <div class="song-title">${s.title}</div>
        <div class="song-artist">${s.artist}</div>
      </div>
      <div class="song-views" style="font-size:12px; opacity:0.6; white-space:nowrap;">
        ${formatViews(s.views || 0)}
      </div>
    `;

    div.addEventListener('click', () => {
      if (isFiltered) {
        filteredMode = true;
        currentFilteredIndex = idx;
        const realIndex = list[idx].index;
        loadSongByIndex(realIndex);
        playAudio();
      } else {
        filteredMode = false;
        currentFilteredIndex = -1;
        const realIndex = Number(div.dataset.index);
        loadSongByIndex(realIndex);
        playAudio();
      }
    });

    playlistBox.appendChild(div);

    // ❌ Bagian pembuatan option SongSelect — DIHAPUS
    // const opt = document.createElement('option');
    // opt.value = optId;
    // opt.textContent = `${optTitle} - ${optArtist}`;
    // songSelect.appendChild(opt);
  });

  highlightPlaying();
}

/* ======================
   HIGHLIGHT currently playing item
   - Works for both filteredMode & full playlist render
====================== */
function highlightPlaying() {
    const items = playlistBox.querySelectorAll('.song-item');
    items.forEach(it => it.style.outline = "");

    if (filteredMode && filteredList.length) {
        // We rendered filteredList -> currentFilteredIndex is position in filteredList
        const item = playlistBox.querySelector(`.song-item[data-index="${currentFilteredIndex}"]`);
        if (item) {
            item.style.outline = "2px solid rgba(255,255,255,0.1)";
            item.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
    }
    // Otherwise try to highlight by playlist index (data-index = playlist index)
    const itemByReal = playlistBox.querySelector(`.song-item[data-index="${currentRealIndex}"]`);
    if (itemByReal) {
        itemByReal.style.outline = "2px solid rgba(255,255,255,0.1)";
        itemByReal.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

/* ======================
   AUDIO CONTEXT + EQUALIZER
====================== */
let audioCtx, track;
let bassEQ, midEQ, trebleEQ;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        track = audioCtx.createMediaElementSource(audio);

        bassEQ = audioCtx.createBiquadFilter();
        bassEQ.type = 'lowshelf';
        bassEQ.frequency.value = 250;
        bassEQ.gain.value = 0;

        midEQ = audioCtx.createBiquadFilter();
        midEQ.type = 'peaking';
        midEQ.frequency.value = 1000;
        midEQ.Q.value = 1;
        midEQ.gain.value = 0;

        trebleEQ = audioCtx.createBiquadFilter();
        trebleEQ.type = 'highshelf';
        trebleEQ.frequency.value = 4000;
        trebleEQ.gain.value = 0;

        track.connect(bassEQ);
        bassEQ.connect(midEQ);
        midEQ.connect(trebleEQ);
        trebleEQ.connect(audioCtx.destination);
    }
}

function resumeAudioCtx() {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

function setEqualizer(mode) {
    if (!bassEQ) return;
    switch(mode) {
        case 'bass':
            bassEQ.gain.value = 15;
            midEQ.gain.value = 0;
            trebleEQ.gain.value = 0;
            break;
        case 'treble':
            bassEQ.gain.value = 0;
            midEQ.gain.value = 0;
            trebleEQ.gain.value = 15;
            break;
        case 'flat':
            bassEQ.gain.value = 0;
            midEQ.gain.value = 0;
            trebleEQ.gain.value = 0;
            break;
    }
}

document.querySelectorAll('#equalizerSubmenu .submenu-item').forEach(item => {
    item.addEventListener('click', () => {
        initAudio();
        resumeAudioCtx();
        const eq = item.dataset.eq;
        setEqualizer(eq);
        equalizerSubmenu.style.display = "none";
    });
});

/* ======================
   DOWNLOAD & QUALITY
====================== */
document.getElementById("downloadMusic").addEventListener("click", () => {
    let currentSong;

    if (filteredMode && filteredList.length > 0 && currentFilteredIndex >= 0) {
        currentSong = filteredList[currentFilteredIndex];
    } else {
        currentSong = playlist[currentRealIndex];
    }

    if (!currentSong || !currentSong.audio) {
        alert("Tidak ada lagu untuk di-download!");
        return;
    }

    const a = document.createElement("a");
    a.href = currentSong.audio;
    a.download = (currentSong.title || "track") + ".mp3";
    document.body.appendChild(a);
    a.click();
    a.remove();

    alert(`Download: ${currentSong.title} - ${currentSong.artist}`);
});

qualitySub.querySelectorAll(".submenu-item").forEach(item => {
    item.addEventListener("click", () => {
        const q = item.dataset.quality; // "96", "128", "192", "320"
        const s = (filteredMode && filteredList.length && currentFilteredIndex >= 0)
                    ? filteredList[currentFilteredIndex]
                    : playlist[currentRealIndex];

        const file = (s && (s[`audio_${q}`] || s.audio)) || "";

        if (!file) {
            alert("File audio untuk kualitas " + q + " kbps tidak tersedia untuk lagu ini.");
            qualitySub.style.display = "none";
            return;
        }

        audio.src = file;
        audio.load();
        audio.play().catch(err => console.log("Play error after switching quality:", err));

        alert("Kualitas audio diatur ke: " + q + " kbps");
        qualitySub.style.display = "none";
    });
});

/* ===== KECEPATAN MUSIC ===== */
document.getElementById("speedControl").addEventListener("click", () => { czmSpeedSheet(); });

window.czmSpeedSheet=function(){
  document.getElementById('czm-more-menu').classList.remove('open');
  const old=document.getElementById('czm-speed-ov');if(old)old.remove();
  const speeds=[0.5,0.75,1.0,1.25,1.5,2.0];
  const cur=audio.playbackRate||1.0;
  const ov=document.createElement('div');
  ov.id='czm-speed-ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(7,15,26,0.7);z-index:10040;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(4px);';
  const sheet=document.createElement('div');
  sheet.style.cssText='width:100%;max-width:520px;background:linear-gradient(160deg,#0f2035,#0a1628);border-radius:20px 20px 0 0;padding:0 0 32px;box-sizing:border-box;border-top:1px solid rgba(0,217,255,0.2);box-shadow:0 -8px 40px rgba(0,217,255,0.1);';
  sheet.innerHTML=`
    <div style="display:flex;justify-content:center;padding:10px 0 4px;">
      <div style="width:36px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;"></div>
    </div>
    <div style="padding:10px 20px 16px;border-bottom:1px solid rgba(255,255,255,.07);text-align:center;">
      <div style="font-size:16px;font-weight:700;color:#fff;"><i class="fa-solid fa-gauge-high" style="color:#00d9ff;margin-right:8px;"></i>Kecepatan Music</div>
      <div style="font-size:12px;color:#aaa;margin-top:4px;">Sekarang: <span id="czm-spd-cur" style="color:#00d9ff;font-weight:700;">${cur}x</span></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:18px 20px 14px;">
      ${speeds.map(s=>`
        <button onclick="czmSetSpeed(${s})" style="background:${s==cur?'rgba(0,217,255,0.25)':'rgba(0,217,255,0.07)'};border:1px solid ${s==cur?'rgba(0,217,255,0.7)':'rgba(0,217,255,0.2)'};border-radius:14px;padding:14px 8px;color:${s==cur?'#00d9ff':'#fff'};font-size:15px;font-weight:700;cursor:pointer;transition:all .15s;">
          ${s}x
        </button>
      `).join('')}
    </div>
    <div style="padding:0 20px;">
      <div style="font-size:12px;color:#aaa;margin-bottom:8px;text-align:center;">Custom</div>
      <div style="display:flex;gap:10px;align-items:center;">
        <div style="flex:1;display:flex;align-items:center;background:rgba(0,217,255,0.07);border:1px solid rgba(0,217,255,0.2);border-radius:12px;padding:10px 14px;gap:8px;">
          <i class="fa-solid fa-gauge-high" style="color:#00d9ff;font-size:14px;"></i>
          <input id="czm-spd-inp" type="number" min="0.1" max="4" step="0.1" placeholder="cth: 1.5" style="flex:1;background:none;border:none;color:#fff;font-size:15px;outline:none;width:100%;">
        </div>
        <button onclick="czmSetSpeedCustom()" style="background:linear-gradient(135deg,#00d9ff,#0099cc);border:none;border-radius:12px;padding:12px 18px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;">Set</button>
      </div>
    </div>
  `;
  ov.appendChild(sheet);
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
  document.body.appendChild(ov);
};

window.czmSetSpeed=function(s){
  audio.playbackRate=s;
  const el=document.getElementById('czm-spd-cur');if(el)el.textContent=s+'x';
  const ov=document.getElementById('czm-speed-ov');if(ov)ov.remove();
  const t=document.createElement('div');
  t.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(7,15,26,0.95);border:1px solid rgba(0,217,255,0.3);color:#fff;padding:12px 20px;border-radius:12px;font-size:14px;z-index:99999;white-space:nowrap;';
  t.innerHTML='<i class="fa-solid fa-gauge-high" style="color:#00d9ff;margin-right:6px;"></i>Kecepatan: <b>'+s+'x</b>';
  document.body.appendChild(t);setTimeout(()=>t.remove(),2000);
};

window.czmSetSpeedCustom=function(){
  const v=parseFloat(document.getElementById('czm-spd-inp').value);
  if(!v||v<=0||v>4)return;
  czmSetSpeed(v);
};

window.czmQualitySheet=function(){
  document.getElementById('czm-more-menu').classList.remove('open');
  const old=document.getElementById('czm-qual-ov');if(old)old.remove();
  const qualities=[{q:'96',lbl:'96 kbps',desc:'Hemat data'},{q:'128',lbl:'128 kbps',desc:'Standar'},{q:'192',lbl:'192 kbps',desc:'Tinggi'},{q:'320',lbl:'320 kbps',desc:'Terbaik'}];
  const ov=document.createElement('div');
  ov.id='czm-qual-ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(7,15,26,0.7);z-index:10040;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(4px);';
  const sheet=document.createElement('div');
  sheet.style.cssText='width:100%;max-width:520px;background:linear-gradient(160deg,#0f2035,#0a1628);border-radius:20px 20px 0 0;padding:0 0 32px;box-sizing:border-box;border-top:1px solid rgba(0,217,255,0.2);box-shadow:0 -8px 40px rgba(0,217,255,0.1);';
  sheet.innerHTML=`
    <div style="display:flex;justify-content:center;padding:10px 0 4px;">
      <div style="width:36px;height:4px;background:rgba(255,255,255,.15);border-radius:2px;"></div>
    </div>
    <div style="padding:10px 20px 16px;border-bottom:1px solid rgba(255,255,255,.07);text-align:center;">
      <div style="font-size:16px;font-weight:700;color:#fff;"><i class="fa-solid fa-sliders" style="color:#00d9ff;margin-right:8px;"></i>Kualitas Audio</div>
      <div style="font-size:12px;color:#aaa;margin-top:4px;">Pilih kualitas sesuai koneksi kamu</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:0;padding:8px 0;">
      ${qualities.map(({q,lbl,desc})=>`
        <div onclick="czmSetQuality('${q}')" style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.05);transition:background .13s;" onmousedown="this.style.background='rgba(0,217,255,0.08)'" onmouseup="this.style.background=''">
          <div>
            <div style="font-size:15px;font-weight:700;color:#fff;">${lbl}</div>
            <div style="font-size:12px;color:#aaa;margin-top:2px;">${desc}</div>
          </div>
          <i class="fa-solid fa-chevron-right" style="color:#00d9ff;font-size:12px;opacity:0.7;"></i>
        </div>
      `).join('')}
    </div>
  `;
  ov.appendChild(sheet);
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
  document.body.appendChild(ov);
};

window.czmSetQuality=function(q){
  const s=(typeof filteredMode!=='undefined'&&filteredMode&&filteredList.length&&currentFilteredIndex>=0)
    ?filteredList[currentFilteredIndex]
    :(typeof playlist!=='undefined'?playlist[currentRealIndex]:null);
  const file=(s&&(s['audio_'+q]||s.audio))||'';
  if(!file){
    const ov=document.getElementById('czm-qual-ov');if(ov)ov.remove();
    const t=document.createElement('div');
    t.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(7,15,26,0.95);border:1px solid rgba(255,80,80,0.3);color:#ff6b6b;padding:12px 20px;border-radius:12px;font-size:14px;z-index:99999;white-space:nowrap;';
    t.innerHTML='<i class="fa-solid fa-xmark" style="margin-right:6px;"></i>Kualitas '+q+' kbps tidak tersedia';
    document.body.appendChild(t);setTimeout(()=>t.remove(),2500);
    return;
  }
  const curTime=audio.currentTime;
  audio.src=file;audio.load();audio.currentTime=curTime;
  audio.play().catch(()=>{});
  const ov=document.getElementById('czm-qual-ov');if(ov)ov.remove();
  const t=document.createElement('div');
  t.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(7,15,26,0.95);border:1px solid rgba(0,217,255,0.3);color:#fff;padding:12px 20px;border-radius:12px;font-size:14px;z-index:99999;white-space:nowrap;';
  t.innerHTML='<i class="fa-solid fa-sliders" style="color:#00d9ff;margin-right:6px;"></i>Kualitas: <b>'+q+' kbps</b>';
  document.body.appendChild(t);setTimeout(()=>t.remove(),2000);
};

/* ======================
   PLAY / PAUSE
====================== */
function playAudio() {
    initAudio();
    if(_czmVideoMode){
      const v = document.getElementById('czm-video');
      if(v){ v.play().catch(()=>{}); return; }
    }
    if (!audio.src) loadSongByIndex(0);
    resumeAudioCtx();
    audio.play().then(() => {
        isPlaying = true;
        playBtn.textContent = "𝗜𝗜";
        cd.classList.add('playing');
    }).catch(err => console.log("Audio play error:", err));
}

function playAudio() {
  if(_czmVideoMode){
    const v = document.getElementById('czm-video');
    if(v){ v.play().catch(()=>{}); isPlaying=true; window.isPlaying=true; playBtn.textContent="𝗜𝗜"; return; }
  }
  if (!audio.src) loadSongByIndex(0);
  audio.play().then(() => {
    isPlaying = true;
    window.isPlaying = true;
    playBtn.textContent = "𝗜𝗜";
    cd.classList.add('playing');
  }).catch(err => console.log("play err:", err));
}

function pauseAudio() {
  if(_czmVideoMode){
    const v = document.getElementById('czm-video');
    if(v){ v.pause(); }
  }
  audio.pause();
  isPlaying = false;
  window.isPlaying = false;
  playBtn.textContent = "▶";
  cd.classList.remove('playing');
}

playBtn.addEventListener('click', () => {
  isPlaying ? pauseAudio() : playAudio();
});

/* ======================
   NEXT / PREV (FINAL, FIXED)
====================== */
nextBtn.addEventListener('click', () => {
  // Kalau ada playlist aktif, pakai czmDisplayOrder
  if(czmActivePlId !== '__all__' && czmDisplayOrder.length > 0){
    const curSong = playlist[currentRealIndex];
    const curId = curSong ? String(curSong.id) : null;
    const pos = curId ? czmDisplayOrder.indexOf(curId) : -1;
    const nextId = (pos >= 0 && pos + 1 < czmDisplayOrder.length)
      ? czmDisplayOrder[pos + 1]
      : czmDisplayOrder[0];
    const nextIdx = playlist.findIndex(s => String(s.id) === String(nextId));
    if(nextIdx >= 0){ currentRealIndex = nextIdx; loadSongByIndex(nextIdx); playAudio(); if(typeof czmCurIdx!=='undefined') czmCurIdx=nextIdx; if(typeof czmSyncUI==='function') setTimeout(()=>czmSyncUI(nextIdx,true),50); }
    return;
  }
  if (filteredMode && filteredList.length && currentFilteredIndex >= 0) {
    if (currentFilteredIndex + 1 < filteredList.length) {
      currentFilteredIndex++;
      const realIndex = filteredList[currentFilteredIndex].index;
      loadSongByIndex(realIndex);
      playAudio();
    }
  } else {
    const nextReal = (currentRealIndex + 1) % playlist.length;
    loadSongByIndex(nextReal);
    playAudio();
  }
});

prevBtn.addEventListener('click', () => {
  // Kalau ada playlist aktif, pakai czmDisplayOrder
  if(czmActivePlId !== '__all__' && czmDisplayOrder.length > 0){
    const curSong = playlist[currentRealIndex];
    const curId = curSong ? String(curSong.id) : null;
    const pos = curId ? czmDisplayOrder.indexOf(curId) : -1;
    const prevId = (pos > 0)
      ? czmDisplayOrder[pos - 1]
      : czmDisplayOrder[czmDisplayOrder.length - 1];
    const prevIdx = playlist.findIndex(s => String(s.id) === String(prevId));
    if(prevIdx >= 0){ currentRealIndex = prevIdx; loadSongByIndex(prevIdx); playAudio(); if(typeof czmCurIdx!=='undefined') czmCurIdx=prevIdx; if(typeof czmSyncUI==='function') setTimeout(()=>czmSyncUI(prevIdx,true),50); }
    return;
  }
  if (filteredMode && filteredList.length && currentFilteredIndex >= 0) {
    if (currentFilteredIndex - 1 >= 0) {
      currentFilteredIndex--;
      const realIndex = filteredList[currentFilteredIndex].index;
      loadSongByIndex(realIndex);
      playAudio();
    }
  } else {
    const prevReal = (currentRealIndex - 1 + playlist.length) % playlist.length;
    loadSongByIndex(prevReal);
    playAudio();
  }
});

/* ------ LOOP TOGGLE ------ */
toggleLoopBtn.addEventListener('click', () => {
  isLoop = !isLoop;
  audio.loop = isLoop;
  toggleLoopBtn.textContent = `Mode: ${isLoop ? 'Music Akan Diulang Otomatis' : 'Mengganti Music Selanjutnya'}`;
});

/* ======================
   PROGRESS BAR
====================== */
audio.addEventListener('timeupdate', () => {
  if (audio.duration) {
    const w = (audio.currentTime / audio.duration) * 100;
    progressEl.style.width = w + "%";
    currText.textContent = formatTime(audio.currentTime);
    durText.textContent = formatTime(audio.duration);
  }
});

seekBar.addEventListener('click', (e) => {
    if (!audio.duration) return;
    const r = seekBar.getBoundingClientRect();
    audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
});

/* ======================
   AUDIO ENDED (FINAL FIX)
====================== */
audio.addEventListener("ended", () => {
  cd.classList.remove('playing');
  isPlaying = false;
  playBtn.textContent = "▶";

  if (audio.loop) return;

  if (filteredMode && filteredList.length && currentFilteredIndex >= 0) {
    if (currentFilteredIndex + 1 < filteredList.length) {
      currentFilteredIndex++;
      loadSongByIndex(filteredList[currentFilteredIndex].index);
      playAudio();
    }
    return;
  }

  // Kalau ada playlist aktif, WAJIB pakai czmDisplayOrder
  if(czmActivePlId !== '__all__' && czmDisplayOrder.length > 0){
    const curSong = playlist[currentRealIndex];
    const curId = curSong ? String(curSong.id) : null;
    const pos = curId ? czmDisplayOrder.indexOf(curId) : -1;
    const nextId = (pos >= 0 && pos + 1 < czmDisplayOrder.length)
      ? czmDisplayOrder[pos + 1]
      : czmDisplayOrder[0]; // wrap ke awal
    const nextIdx = playlist.findIndex(s => String(s.id) === String(nextId));
    if(nextIdx >= 0){
      currentRealIndex = nextIdx;
      loadSongByIndex(nextIdx);
      playAudio();
      if(typeof czmCurIdx !== 'undefined') czmCurIdx = nextIdx;
      if(typeof czmSyncUI === 'function') setTimeout(()=>czmSyncUI(nextIdx, true), 50);
    }
    return;
  }

  // Mode semua lagu — lanjut ke lagu berikutnya
  if(czmDisplayOrder.length > 1){
    const curSong = playlist[currentRealIndex];
    const curId = curSong ? String(curSong.id) : null;
    const pos = curId ? czmDisplayOrder.indexOf(curId) : -1;
    const nextId = (pos >= 0 && pos + 1 < czmDisplayOrder.length)
      ? czmDisplayOrder[pos + 1]
      : czmDisplayOrder[0];
    const nextIdx = playlist.findIndex(s => String(s.id) === String(nextId));
    if(nextIdx >= 0){
      currentRealIndex = nextIdx;
      loadSongByIndex(nextIdx);
      playAudio();
      if(typeof czmCurIdx !== 'undefined') czmCurIdx = nextIdx;
      if(typeof czmSyncUI === 'function') setTimeout(()=>czmSyncUI(nextIdx, true), 50);
    }
    return;
  }

  // Fallback: urutan asli skip index 0
  const nextReal = currentRealIndex + 1 >= playlist.length ? 1 : currentRealIndex + 1;
  loadSongByIndex(nextReal);
  playAudio();
});

/* ======================
   SEARCH / FILTER (SUPER AKURAT)
   - search by title / artist / tags / id
====================== */
function filterSongs() {
  const q = (searchSong.value || "").trim().toLowerCase();

  if (q === "") {
    // show full playlist
    filteredMode = false;
    filteredList = [];
    currentFilteredIndex = -1;
    renderPlaylist(playlist, false);
    highlightPlaying();
    return;
  }

  // build filteredList with original playlist indices
  filteredList = playlist
    .map((s, i) => ({ ...s, index: i }))
    .filter(s => {
      const text = (s.title + " " + s.artist + " " + (s.tags || []).join(" ")).toLowerCase();
      // more advanced: allow partial tokens and multi-word
      const tokens = q.split(/\s+/).filter(Boolean);
      // every token must match somewhere (AND search) — like YT/Spotify feel
      return tokens.every(tok => text.includes(tok));
    });

  // reset filtered pointer to first match
  filteredMode = true;
  currentFilteredIndex = filteredList.length ? 0 : -1;

  // show filtered render (we render filteredList but keep playlist indices inside objects)
  renderPlaylist(filteredList, true);

  // if there's at least 1 result, auto-select first result (but do not autoplay unless user clicks)
  if (filteredList.length) {
    // highlight first filtered result
    highlightPlaying();
  }
}

/* Support pressing Enter on search to auto-play first match */
searchSong.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    filterSongs();
    if (filteredList.length) {
      currentFilteredIndex = 0;
      loadSongByIndex(filteredList[0].index);
      playAudio();
    }
  } else {
    // on other keys, filter live
    setTimeout(filterSongs, 0);
  }
});

/* ======================
   CATEGORY SELECT (BARU)
   - Menambahkan select kategori yang mengambil lagu berdasarkan tags:
     ["Playlist Anda", "Lagu Terbaru", "Sedang Trend"]
   - Jika elemen <select id="categorySelect"> tidak ada di HTML, kita buat otomatis
====================== */
let categorySelect = document.getElementById("categorySelect");
if (!categorySelect) {
  // try to create and insert it just above songSelect to avoid modifying other layout files
  categorySelect = document.createElement("select");
  categorySelect.id = "categorySelect";
  categorySelect.innerHTML = `
    <option value="">— Pilih Kategori —</option>
    <option value="Playlist Anda">Playlist Anda</option>
    <option value="Lagu Terbaru">Lagu Terbaru</option>
    <option value="Sedang Trend">Sedang Trend</option>
  `;
  // insert before songSelect if possible, otherwise append to body
  if (songSelect && songSelect.parentNode) {
    songSelect.parentNode.insertBefore(categorySelect, songSelect);
  } else {
    document.body.insertBefore(categorySelect, document.body.firstChild);
  }
}

function filterByCategory(tag) {
  if (!tag) {
    // Reset ke full playlist
    filteredMode = false;
    filteredList = [];
    currentFilteredIndex = -1;
    renderPlaylist(playlist, false);
    return;
  }

  // build filteredList from playlist (keep original indices)
  filteredList = playlist
    .map((s, i) => ({ ...s, index: i }))
    .filter(s => (s.tags || []).includes(tag));

  filteredMode = true;
  currentFilteredIndex = filteredList.length ? 0 : -1;

  renderPlaylist(filteredList, true);

  if (filteredList.length) {
    highlightPlaying();
  }
}

categorySelect.addEventListener("change", () => {
  const tag = categorySelect.value;
  // Clear search box when selecting category to avoid confusion
  if (searchSong) searchSong.value = "";
  filterByCategory(tag);
});

/* ======================
   SELECT CHANGE (dropdown) - DISESUAIKAN AGAR SUPPORT KATEGORI
====================== */
function onSelectChange() {
  const id = songSelect.value;
  if (!id) return;
  const activeCategory = (categorySelect && categorySelect.value) ? categorySelect.value : null;

  if (activeCategory) {
    const listTagsMatch = filteredList.length && (filteredList[0].tags || []).includes(activeCategory);
    if (!listTagsMatch) {
      filterByCategory(activeCategory);
    }

    const pos = filteredList.findIndex(f => String(f.id) === String(id));
    if (pos !== -1) {
      filteredMode = true;
      currentFilteredIndex = pos;
      const realIndex = filteredList[currentFilteredIndex].index;
      loadSongByIndex(realIndex);
      playAudio();
      return;
    }
  }


  filteredMode = false;
  currentFilteredIndex = -1;
  const idx = playlist.findIndex(p => String(p.id) === String(id));
  if (idx !== -1) {
    loadSongByIndex(idx);
    playAudio();
  }
}
/* ======================
   MENU & SUBMENU
====================== */
document.addEventListener("DOMContentLoaded", () => {
    menuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        menuPanel.style.display = menuPanel.style.display === "block" ? "none" : "block";
    });

    const submenuMap = {
        qualityMenuBtn: "qualitySubmenu",
        sleepTimeBtn: "sleepSubmenu",
        equalizerBtn: "equalizerSubmenu"
    };

    Object.keys(submenuMap).forEach(btnId => {
        const btn = document.getElementById(btnId);
        const submenu = document.getElementById(submenuMap[btnId]);
        if (!btn || !submenu) return;

        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            document.querySelectorAll(".submenu").forEach(sm => {
                if (sm !== submenu) sm.style.display = "none";
            });
            submenu.style.display = submenu.style.display === "block" ? "none" : "block";
        });
    });

    document.addEventListener("click", () => {
        menuPanel.style.display = "none";
        document.querySelectorAll(".submenu").forEach(sm => sm.style.display = "none");
    });
});

/* ======================
   SLEEP TIMER
====================== */
let sleepTimer;
sleepSub.querySelectorAll(".submenu-item").forEach(item => {
    item.addEventListener("click", () => {
        const minutes = parseInt(item.dataset.time);
        if (sleepTimer) clearTimeout(sleepTimer);

        sleepTimer = setTimeout(() => {
            audio.pause();
            isPlaying = false;
            playBtn.textContent = "▶";
            cd.classList.remove('playing');
            alert(`Waktu ${minutes} menit telah selesai. Musik berhenti.`);
        }, minutes * 60 * 1000);

        alert(`Sleep Timer diatur selama ${minutes} menit`);
        sleepSub.style.display = "none";
    });
});

/* ======================
   REPORT
====================== */
reportBtn.addEventListener("click", () => {
    const currentSong = (filteredMode && filteredList.length && currentFilteredIndex >= 0)
        ? filteredList[currentFilteredIndex]
        : playlist[currentRealIndex];

    if (!currentSong) {
        alert("Tidak ada lagu yang diputar untuk dilaporkan!");
        return;
    }

    const subject = encodeURIComponent(`Report lagu: ${currentSong.title}`);
    const body = encodeURIComponent(`Saya ingin melaporkan lagu ini:\n\nJudul: ${currentSong.title}\nArtis: ${currentSong.artist}`);
    window.open(`mailto:zainsuryo10@gmail.com?subject=${subject}&body=${body}`);
});

/* ======================
   VISUALIZER
====================== */
setInterval(() => {
    if (!isPlaying) {
        visualBars.forEach(b => b.style.height = '6px');
        return;
    }
    visualBars.forEach(b => b.style.height = (6 + Math.random() * 34) + 'px');
}, 140);

/* ======================
   INIT
====================== */
(function init() {
  // initial render uses playlist (full)
  renderPlaylist(playlist, false);
  // load first song (index 0)
  loadSongByIndex(0);
})();
function showPage(id){
  document.querySelectorAll('.page-section').forEach(sec => {
    sec.classList.remove('active');
  });

  const target = document.getElementById(id);
  if(target){
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Sembunyikan czm-npbar saat bukan di halaman music
  const npbar = document.getElementById('czm-npbar');
  if(npbar){
    if(id === 'music'){
      // Tampilkan lagi kalau ada lagu yang sedang diset
      if(npbar.dataset.hasTrack === '1') npbar.classList.add('czm-vis');
    } else {
      npbar.classList.remove('czm-vis');
    }
  }

  // Animasi masuk halaman musik
  if (id === 'music') {
    const resetAnim = (el, cls) => {
      if (!el) return;
      el.classList.remove(cls);
      void el.offsetWidth; // reflow
      el.classList.add(cls);
    };
    resetAnim(document.querySelector('#music .brand'), 'music-anim-brand');
    resetAnim(document.querySelector('#music .cd-box'), 'music-anim-cd');
    resetAnim(document.querySelector('#music .visualizer'), 'music-anim-visual');
    resetAnim(document.querySelector('#music .yt-info'), 'music-anim-info');
    resetAnim(document.querySelector('#music .yt-bar'), 'music-anim-bar');
    resetAnim(document.querySelector('#music .controls'), 'music-anim-ctrl');
    resetAnim(document.getElementById('searchSong'), 'music-anim-search');
    resetAnim(document.getElementById('playlistBox'), 'music-anim-list');
  }

  // === OVERFLOW: hidden hanya saat AI ===
  if(id === 'ai'){
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = 'auto';
  }

  // === TAMBAHAN AMAN UNTUK FOOTER ===
  const footer = document.querySelector('.site-footer');
  if(footer){
    if(target && target.classList.contains('no-footer')){
      footer.style.display = 'none';
    }else{
      footer.style.display = 'block';
    }
  }
  // =================================

  document.getElementById("panelOverlay").style.display = "none";
}

function togglePanel(btn){
  const overlay = document.getElementById("panelOverlay");
  const isOpen = overlay.style.display === "flex";
  const _npBar = document.getElementById('czm-npbar');

  if(isOpen){
    overlay.style.display = "none";
    document.body.style.overflow = "auto";
    btn.classList.remove("active");
    // Tampilkan npbar lagi HANYA jika section music aktif
    if(_npBar && _npBar.dataset.hasTrack === '1'){
      const musicSec = document.getElementById('music');
      if(musicSec && musicSec.classList.contains('active')){
        _npBar.classList.add('czm-vis');
      }
    }
  }else{
    overlay.style.display = "flex";
    document.body.style.overflow = "hidden";
    btn.classList.add("active");
    // Sembunyikan npbar saat panel terbuka
    if(_npBar) _npBar.classList.remove('czm-vis');
  }
}
function closePanel(e){
  if(e.target.id === "panelOverlay"){
    document.getElementById("panelOverlay").style.display = "none";
    document.querySelector(".gaming-toggle").classList.remove("active");
    document.body.style.overflow = "auto";
    // Tampilkan npbar lagi HANYA jika music aktif
    const _npBar = document.getElementById('czm-npbar');
    if(_npBar && _npBar.dataset.hasTrack === '1'){
      const musicSec = document.getElementById('music');
      if(musicSec && musicSec.classList.contains('active')){
        _npBar.classList.add('czm-vis');
      }
    }
  }
}
document.querySelectorAll(".panel-item").forEach(item=>{
  item.addEventListener("click",()=>{

    // aktifkan icon menu
    document.querySelectorAll(".panel-item")
      .forEach(i=>i.classList.remove("active"));
    item.classList.add("active");

    const id = item.dataset.target;
    const target = document.getElementById(id);

    // TUTUP PANEL MANUAL (ANTI BUG)
    const overlay = document.getElementById("panelOverlay");
    overlay.style.display = "none";
    document.body.style.overflow = "auto";

    // RESET TOMBOL ☰
    document.querySelector(".gaming-toggle")
      .classList.remove("active");

    // SCROLL
    if(target){
      setTimeout(()=>{
        target.scrollIntoView({behavior:"smooth"});
      },200);
    }
  });
});
/* jam */
setInterval(()=>{
  const d = new Date();
  const t =
    d.getHours().toString().padStart(2,'0') + ":" +
    d.getMinutes().toString().padStart(2,'0') + ":" +
    d.getSeconds().toString().padStart(2,'0');

  document.getElementById("topTime").innerText = t;
},1000);

/* =============================================
   📦 DATA APK — EDIT DI SINI KALAU MAU UPDATE
   Format: { jpg, nama, versi, download }
   Untuk link Dropbox: ganti www.dropbox.com
   jadi dl.dropboxusercontent.com biar langsung download
============================================= */
const apkData = [
  {
    jpg: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/icon_7jMZ7XD80oeucmGEaTwktIRZexLtGWvJfKdVD6Wu2SI%3D.png",
    nama: "Termux", versi: "0.119.0-beta.3", ukuran: "109 MB",
    download: "https://f-droid.org/repo/com.termux_1022.apk"
  },
  {
    jpg: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/gbwa-mas-apk.png",
    nama: "GbWhatsApp", versi: "2.25.28.79", ukuran: "112 MB",
    download: "https://upfileapp.9aleh.com/file/2024/gbact/GBWhatsApp_Mas_v24.35.apk"
  },
  {
    jpg: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/IMG-20251219-WA0004.jpg",
    nama: "CapCut Premium", versi: "15.8.0", ukuran: "298.46 MB",
    download: "https://download2435.mediafire.com/hez2zyi5xi6gymrFM7-JG917Ha7bTMmB8rg0nlIcSEwpSBjOjEsY9eG3Srf3U9BySyrrhLtI9iWeTqZVFvPtNpzChXxM2tiLXf-S2okMlhsMUy6d6LrmiUOHZXEdpUusKny3oEOHaL6LAQyb2EJXogaVqoGygazFSOfVV1covps/4nvcb6oq7h94trz/CapCutPro+v17.5.0_MOD.apk"
  },
  {
    jpg: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/b157c8590442c3061f1d050a522a0dbb_icon.png",
    nama: "Youtube Premium", versi: "19.47.53", ukuran: "164.24 MB",
    download: "https://download2442.mediafire.com/6lzr8ao4jslgsv8i1C7xKyjZrFQKj2k_GfOy_xznHVQwk24qFwEewkWj7li8peE8BDRxjmH3YEVVwRaxYiMoqIsbg-lxDvTbtqMVLBovmUCOnDRwuNYB4HMO58NYaxfn7mP7OMo4CAK-olnSJdRkov8KdfzJgA2EiQcAvCTOj20/13drlmrbsy0yhk8/RVX+App.zip"
  },
  {
    jpg: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/b9a8981007bb7615d0d84240fcc0606cf0b89610a9a407f3eb7170d8301a9a21_200.jpeg",
    nama: "microG Service", versi: "0.3.1.4.240913", ukuran: "35.52 MB",
    download: "https://download2358.mediafire.com/ub31yhflreygJVzdCjY9-ci3nJXRySmPnsX0NvTJIwgLhI1fPYYK6TCU9QKGQOicTwCXH60RsXPhAG_XgYeVMLxVV4LXZihb8cUTkY2P9mgddCdMcPk-Y2uMoPlobNq6nBgwBiEtFopxuUfP7Go4y5m-R3UhgU4hSQV94RuVr4g/qlx8tovq7vv4jzo/microG+Services.zip"
  },
  {
    jpg: "https://raw.githubusercontent.com/PretyFX69/music-files/refs/heads/main/380d555b5368c115ba5fc2dbc0992a15.jpg",
    nama: "Minecraft Patch", versi: "1.26.0.3", ukuran: "426.34 MB",
    download: "https://dl.dropboxusercontent.com/scl/fi/bk34j0za0xha4xzo35y5o/MCPE-Patched-No-Music-64bit-32bit-26.0.2.apk?rlkey=l1leun7qv8ox9ri73unv6fssq&dl=1"
  },
  {
    jpg: "https://an1.com/uploads/posts/2023-04/1682626666_hungry-shark-world.png",
    nama: "Hungry Shark World Mod Apk", versi: "7.5.7", ukuran: "216.70 MB",
    download: "https://dl.dropboxusercontent.com/scl/fi/dx92dxicwop9k34y1uy0q/hungry_shark_world_Mod.apk?rlkey=az4wn5pj0aipm64l25bthtp4n&st=6u83jyk8&dl=1"
  },
  {
    jpg: "https://an1.com/uploads/posts/2023-04/1681392775_homescapes.png",
    nama: "Homescapes Mod Apk", versi: "8.6.600", ukuran: "230.56 MB",
    download: "https://dl.dropboxusercontent.com/scl/fi/aey3p1whz50p0d2i7z631/homescapes-mod.apk?rlkey=ut3lebu6dc9vlbb0xd6dsbu1m&st=49gpb0hx&dl=1"
  },
  {
    jpg: "https://an1.com/uploads/posts/2026-01/1769420005_subway-surfers.png",
    nama: "Subway Surfers Mod Apk", versi: "3.59.0", ukuran: "222.30 MB",
    download: "https://dl.dropboxusercontent.com/scl/fi/phnpd2kgiuo8rl2qoekvf/subway_surfers.apk?rlkey=w3bvqtjayk9msltqvlltnxrhg&st=dyfs3gpy&dl=1"
  },
  {
    jpg: "https://an1.com/uploads/posts/2022-06/1654947552_poppy-playtime.png",
    nama: "Poppy Playtime Mod Apk", versi: "1.0.18", ukuran: "625.6 MB",
    download: "https://files.an1.co/poppy-playtime_1.0.18-an1.com.apk"
  },
  {
    jpg: "https://an1.com/uploads/posts/2022-12/1670767412_plants-vs-zombies-2.png",
    nama: "Plants vs Zombie 2 Mod Apk", versi: "12.8.1", ukuran: "1035.6 MB",
    download: "https://files.an1.co/pvz-2-mod-12.8.1-an1.com.apk"
  },
  {
    jpg: "https://an1.com/uploads/posts/2023-05/1683369092_block-craft-3d.png",
    nama: "Block Craft 3D Mod Apk", versi: "3.28.0", ukuran: "82.34 MB",
    download: "https://dl.dropboxusercontent.com/scl/fi/i2sz7kawt30qo0ngo63n6/Block_Craft_3D.apk?rlkey=cqs6gyxznj6iumlyp6s0cgtfs&st=7cqx57ws&dl=1"
  },
  {
    jpg: "https://an1.com/uploads/posts/2023-08/1692788716_idle-supermarket-tycoon.png",
    nama: "Idle Supermarket Tycoon Mod Apk", versi: "4.0.2", ukuran: "199.42 MB",
    download: "https://dl.dropboxusercontent.com/scl/fi/6g9c2nzqwywfeskgf432y/idle-supermarket-mod.apk?rlkey=ueg3vw2ihf71wwkdwoxbmtee7&st=y8xh0fod&dl=1"
  },
];

/* APK kategori mapping */


const APK_PER_PAGE = 6;
let _apkActiveCat = 'all';
let _apkPage = 1;
let _apkFiltered = [];
let _apkShuffled = [];

/* Init APK */
(function renderAPK() {
  _apkShuffled = [...apkData].sort(() => Math.random() - 0.5);
  const cnt = document.getElementById('apkCount');
  if(cnt) cnt.textContent = apkData.length;
  apkRenderFiltered();
})();

function apkGetFiltered() {
  const input = (document.getElementById('searchApk') || {}).value || '';
  const q = input.toLowerCase();
  return _apkShuffled.filter(apk => {
    const matchSearch = apk.nama.toLowerCase().includes(q);
    const matchCat = true;
    return matchSearch && matchCat;
  });
}

function apkRenderFiltered() {
  _apkFiltered = apkGetFiltered();
  _apkPage = 1;
  apkRenderPage();
}

function apkRenderPage() {
  const list = document.getElementById('apkList');
  const empty = document.getElementById('apkEmpty');
  const pagination = document.getElementById('apkPagination');
  if (!list) return;

  const totalPages = Math.ceil(_apkFiltered.length / APK_PER_PAGE);
  const start = (_apkPage - 1) * APK_PER_PAGE;
  const slice = _apkFiltered.slice(start, start + APK_PER_PAGE);

  if (!slice.length) {
    list.innerHTML = '';
    if(empty) empty.style.display = 'block';
    if(pagination) pagination.innerHTML = '';
    return;
  }
  if(empty) empty.style.display = 'none';

  list.innerHTML = slice.map((apk, i) => {
    return `
    <div class="apk-card" data-name="${apk.nama.toLowerCase()}" style="animation-delay:${i*0.06}s">
      <div class="apk-card-img-wrap" onclick="apkOpenLightbox('${apk.jpg}','${apk.nama.replace(/'/g,"\\'")}')">
        <img src="${apk.jpg}" alt="${apk.nama}" loading="lazy">
        <div class="apk-card-overlay"></div>
        <div class="apk-card-zoom"><i class="fas fa-expand-alt"></i></div>
      </div>
      <div class="apk-card-body">
        <div class="apk-card-name">${apk.nama}</div>
        <div class="apk-card-meta">
          <span class="apk-card-ver">v${apk.versi}</span>
          ${apk.ukuran ? `<span class="apk-card-size">${apk.ukuran}</span>` : ''}
        </div>
        <div class="apk-card-btn" onclick="autoDownload('${apk.download}')">
          <i class="fas fa-download"></i> Download
        </div>
      </div>
    </div>`;
  }).join('');

  // Scroll ke atas grid
  list.scrollIntoView({behavior:'smooth', block:'nearest'});

  // Render pagination
  if(pagination) {
    if(totalPages <= 1) { pagination.innerHTML = ''; return; }
    let pages = '';
    // Prev
    pages += `<button class="apk-pg-btn ${_apkPage===1?'disabled':''}" onclick="apkGoPage(${_apkPage-1})" ${_apkPage===1?'disabled':''}><i class="fas fa-chevron-left"></i></button>`;
    // Page numbers
    let start_p = Math.max(1, _apkPage - 1);
    let end_p = Math.min(totalPages, start_p + 2);
    if(end_p - start_p < 2) start_p = Math.max(1, end_p - 2);
    if(start_p > 1) {
      pages += `<button class="apk-pg-btn" onclick="apkGoPage(1)">1</button>`;
      if(start_p > 2) pages += `<span class="apk-pg-dots">...</span>`;
    }
    for(let p = start_p; p <= end_p; p++) {
      pages += `<button class="apk-pg-btn ${p===_apkPage?'active':''}" onclick="apkGoPage(${p})">${p}</button>`;
    }
    if(end_p < totalPages) {
      if(end_p < totalPages - 1) pages += `<span class="apk-pg-dots">...</span>`;
      pages += `<button class="apk-pg-btn" onclick="apkGoPage(${totalPages})">${totalPages}</button>`;
    }
    // Next
    pages += `<button class="apk-pg-btn ${_apkPage===totalPages?'disabled':''}" onclick="apkGoPage(${_apkPage+1})" ${_apkPage===totalPages?'disabled':''}><i class="fas fa-chevron-right"></i></button>`;
    pagination.innerHTML = pages;
  }
}

function apkGoPage(p) {
  const totalPages = Math.ceil(_apkFiltered.length / APK_PER_PAGE);
  if(p < 1 || p > totalPages) return;
  _apkPage = p;
  apkRenderPage();
}

function apkOpenLightbox(src, nama) {
  let lb = document.getElementById('apkImgLightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'apkImgLightbox';
    lb.className = 'apk-img-lightbox';
    lb.innerHTML = `
      <div class="apk-lb-overlay"></div>
      <div class="apk-lb-content">
        <button class="apk-lb-close" id="apkLbClose"><i class="fas fa-times"></i></button>
        <img class="apk-lb-img" id="apkLbImg" src="" alt="">
        <div class="apk-lb-nama" id="apkLbNama"></div>
        <p class="apk-lb-hint">Tap area gelap untuk tutup</p>
      </div>
    `;
    lb.querySelector('.apk-lb-overlay').addEventListener('click', () => apkCloseLightbox());
    lb.querySelector('#apkLbClose').addEventListener('click', () => apkCloseLightbox());
    document.body.appendChild(lb);
  }
  document.getElementById('apkLbImg').src = src;
  document.getElementById('apkLbNama').textContent = nama;
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function apkCloseLightbox() {
  const lb = document.getElementById('apkImgLightbox');
  if(lb) lb.classList.remove('open');
  document.body.style.overflow = '';
}

function searchAPK(){
  apkRenderFiltered();
}

function filterAPK(btn, cat){
  _apkActiveCat = cat;
  document.querySelectorAll('.apk-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  apkRenderFiltered();
}

function openInfo(title, desc){
  document.getElementById('apkTitle').innerText = title;
  document.getElementById('apkDesc').innerText = desc;
  document.getElementById('apkModal').style.display = 'flex';
}

function closeInfo(){
  document.getElementById('apkModal').style.display = 'none';
}

function autoDownload(url){
  const a = document.createElement('a');
  a.href = url;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function showPage(pageId) {
  // matikan semua page
  document.querySelectorAll('.page-section').forEach(page => {
    page.classList.remove('active');
  });

  // aktifkan page tujuan
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');

  // Load riwayat saat buka cpanel
  if (pageId === 'cpanel') {
    setTimeout(() => cpRenderHistory(), 100);
  }

  // Sembunyikan footer & typing saat di cPanel
  const contactEl = document.getElementById('contact');
  if (contactEl) {
    if (pageId === 'cpanel') {
      contactEl.classList.add('cpanel-active');
    } else {
      contactEl.classList.remove('cpanel-active');
    }
  }
  // Sembunyikan copyright
  const cpCopy = document.getElementById('cp-copyright');
  if (cpCopy) cpCopy.style.display = pageId === 'cpanel' ? 'none' : '';
  // Sembunyikan icon footer (parent)
  const cpCopyParent = cpCopy ? cpCopy.closest('footer') : null;
  if (cpCopyParent) cpCopyParent.style.display = pageId === 'cpanel' ? 'none' : '';

  // TUTUP PANEL / MENU
  document.getElementById('panelOverlay').style.display = 'none';

  // Selalu pastikan top-bar terlihat saat pindah halaman
  const _topBarRestore = document.querySelector('.top-bar');
  if (_topBarRestore) _topBarRestore.style.display = '';

  // === SEMBUNYIKAN czm-npbar saat bukan di halaman music ===
  const _npBar = document.getElementById('czm-npbar');
  if (_npBar) {
    if (pageId === 'music') {
      // Tampilkan hanya jika di home view, bukan player view
      const playerView = document.getElementById('czm-player');
      const isPlayerOpen = playerView && playerView.classList.contains('czm-on');
      if (_npBar.dataset.hasTrack === '1' && !isPlayerOpen) _npBar.classList.add('czm-vis');
    } else {
      _npBar.classList.remove('czm-vis');
    }
  }

  // Background hitam penuh saat di music, hilangkan cyan glow clock
  if (pageId === 'music') {
    document.body.style.background = '#0f2035';
    const topBar = document.querySelector('.top-bar');
    if (topBar) { topBar.style.boxShadow = 'none'; topBar.style.border = 'none'; }
  } else {
    document.body.style.background = '';
    const topBar = document.querySelector('.top-bar');
    if (topBar) { topBar.style.boxShadow = ''; topBar.style.border = ''; }
  }

  // overflow: hidden hanya saat AI
  if (pageId === 'ai') {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = 'auto';
  }

  // 🔥 RESET SCROLL KE ATAS
  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  // Scroll internal music section ke atas juga
  if (pageId === 'music') {
    setTimeout(() => {
      const musicEl = document.getElementById('music');
      if (musicEl) musicEl.scrollTop = 0;
      const homeBody = document.getElementById('czm-home-body');
      if (homeBody) homeBody.scrollTop = 0;
      // Kembali ke tampilan home jika sedang di player
      const homeView = document.getElementById('czm-home');
      const playerView = document.getElementById('czm-player');
      if (homeView && playerView) {
        homeView.classList.add('czm-on');
        playerView.classList.remove('czm-on');
      }
    }, 50);
  }
}

/* ===== SECTION BREAK ===== */

// Tambah class reveal ke elemen-elemen yang mau dianimasikan
document.addEventListener('DOMContentLoaded', () => {
  // About section
  const about = document.getElementById('about');
  if (about) {
    about.classList.add('reveal');
    // foto + nama dari kiri
    const aboutHeader = about.querySelector('div[style*="align-items:center"]');
    if (aboutHeader) aboutHeader.classList.add('reveal', 'from-left');
    // badge dari kanan
    const badges = about.querySelector('div[style*="flex-wrap:wrap"]');
    if (badges) badges.classList.add('reveal', 'from-right');
    // paragraf satu per satu
    about.querySelectorAll('p').forEach((p, i) => {
      p.classList.add('reveal');
      p.style.transitionDelay = (i * 0.04) + 's';
    });
  }

  // Skill cards
  document.querySelectorAll('.skillcard').forEach((card, i) => {
    card.classList.add('reveal');
    card.style.transitionDelay = (i * 0.05) + 's';
  });

  // What I Do cards
  document.querySelectorAll('.whatido-card').forEach((card, i) => {
    card.classList.add('reveal');
    card.style.transitionDelay = (i * 0.04) + 's';
  });

  // Hobi & Minat cards
  document.querySelectorAll('.hobi-card').forEach((card, i) => {
    card.classList.add('reveal');
    card.style.transitionDelay = (i * 0.04) + 's';
  });
  const hobiSection = document.querySelector('.hobi-section');
  if (hobiSection) hobiSection.classList.add('reveal');

  // skill-category (Featured Projects)
  document.querySelectorAll('.skill-category').forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = (i * 0.04) + 's';
  });

  // stat-box
  document.querySelectorAll('.stat-box').forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = (i * 0.04) + 's';
  });

  // project cards (web rekomendasi - fast)
  document.querySelectorAll('.project-card, .product-card').forEach((el, i) => {
    el.classList.add('reveal', 'fast');
    el.style.transitionDelay = (i * 0.04) + 's';
  });

  // projects-section titles & desc
  document.querySelectorAll('.projects-section').forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = (i * 0.04) + 's';
  });
// contact section
  const contactSection = document.querySelector('.contact-section');
  if (contactSection) {
    contactSection.classList.add('reveal');
  }
  const contactBox = document.querySelector('.contact-box');
  if (contactBox) {
    contactBox.classList.add('reveal');
    contactBox.style.transitionDelay = '0.03s';
  }

  // IntersectionObserver - animasi berulang setiap masuk layar
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      } else {
        // Hapus visible saat keluar layar → animasi berulang
        entry.target.classList.remove('visible');
      }
    });
  }, { threshold: 0.05 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
});
function addMessageInstant(text, type) {
    const container = document.getElementById('chatContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = formatMessage(text);
    contentDiv.appendChild(bubble);

    if (type === 'ai') {
        // Action buttons row
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'msg-actions';

        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy';
        copyBtn.onclick = function() { copyToClipboard(text, copyBtn); };
        actionsDiv.appendChild(copyBtn);

        // Speaker button
        const speakBtn = document.createElement('button');
        speakBtn.className = 'speak-btn';
        speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        speakBtn.title = 'Dengarkan jawaban';
        let isSpeaking = false;
        speakBtn.onclick = function() {
            if (isSpeaking) {
                window.speechSynthesis.cancel();
                isSpeaking = false;
                speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                speakBtn.classList.remove('speaking');
            } else {
                const utter = new SpeechSynthesisUtterance(text.replace(/[*`#]/g, ''));
                utter.lang = 'id-ID';
                utter.rate = 1.20;
                utter.pitch = 1;
                utter.volume = 1;
                const setBestVoice1 = () => {
                    const voices = window.speechSynthesis.getVoices();
                    const preferred = [
                        v => v.lang === 'id-ID' && v.localService,
                        v => v.lang === 'id-ID',
                        v => v.lang.startsWith('id'),
                        v => v.lang === 'en-US' && v.localService,
                        v => v.lang === 'en-US',
                    ];
                    for (const fn of preferred) {
                        const found = voices.find(fn);
                        if (found) { utter.voice = found; break; }
                    }
                };
                if (window.speechSynthesis.getVoices().length > 0) {
                    setBestVoice1();
                } else {
                    window.speechSynthesis.onvoiceschanged = setBestVoice1;
                }
                utter.onend = () => {
                    isSpeaking = false;
                    speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                    speakBtn.classList.remove('speaking');
                };
                window.speechSynthesis.speak(utter);
                isSpeaking = true;
                speakBtn.innerHTML = '<i class="fa-solid fa-stop"></i>';
                speakBtn.classList.add('speaking');
            }
        };
        actionsDiv.appendChild(speakBtn);
        contentDiv.appendChild(actionsDiv);
    }

    messageDiv.appendChild(contentDiv);
    container.appendChild(messageDiv);
    scrollChatToBottom();
}

function renderChatFromHistory(history) {
    const container = document.getElementById('chatContainer');
    container.innerHTML = '';
    if (history.length === 0) {
        const ws = document.createElement('div');
        ws.className = 'welcome-screen';
        ws.id = 'welcomeScreen';
        ws.innerHTML = getWelcomeScreenHTML();
        container.appendChild(ws);
        updateWelcomeScreenForWormMode(responseStyle === 'angry');
        return;
    }
    for (let i = 0; i < history.length; i += 2) {
        if (history[i]) addMessageInstant(history[i].content, 'user');
        if (history[i+1]) addMessageInstant(history[i+1].content, 'ai');
    }
}

function scrollChatToBottom() {
    const container = document.getElementById('chatContainer');
    if (!container) return;
    let spacer = document.getElementById('chat-end-spacer');
    if (!spacer) {
        spacer = document.createElement('div');
        spacer.id = 'chat-end-spacer';
        spacer.style.cssText = 'height:30px;min-height:30px;flex-shrink:0;width:100%;';
        container.appendChild(spacer);
    } else if (spacer.nextSibling) {
        container.appendChild(spacer);
    }
    container.scrollTop = container.scrollHeight;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Init history pointer sesuai mode tersimpan
    chatHistory = responseStyle === 'angry' ? chatHistories.worm : chatHistories.normal;
    loadSettings();
    updateCharCounter();
    // focusInput dinonaktifkan
    
    // Tidak auto-open settings - biarkan user yang buka sendiri
});

// Load saved settings
function loadSettings() {
    if (apiKey) {
        // apiKeyInput dihapus, API key hardcoded di server
    }
    // Sync semua cards dan pills
    document.querySelectorAll('.response-card[data-length], .sett-pill[data-length]').forEach(el => {
        el.classList.toggle('active', el.dataset.length === responseLength);
    });
    document.querySelectorAll('.response-card[data-style], .sett-pill[data-style]').forEach(el => {
        el.classList.toggle('active', el.dataset.style === responseStyle);
    });
    // Apply angry theme if saved
    if (responseStyle === 'angry') {
        document.getElementById('ai').classList.add('angry-theme');
        updateWelcomeScreenForWormMode(true);
    } else {
        updateWelcomeScreenForWormMode(false);
    }
}

// Temp settings (belum disimpan)
let tempResponseLength = responseLength;
let tempResponseStyle = responseStyle;

// Select response length - preview langsung, belum simpan
function selectResponseLength(length) {
    tempResponseLength = length;
    document.querySelectorAll('.sett-pill[data-length]').forEach(p => {
        p.classList.toggle('active', p.dataset.length === length);
    });
    // Warna active pill ikut tema yang sedang dipilih
    const isAngry = tempResponseStyle === 'angry';
    document.querySelectorAll('.sett-pill[data-length].active').forEach(p => {
        p.style.borderColor = isAngry ? 'rgba(255,0,0,0.4)' : '';
        p.style.color = isAngry ? '#ff3333' : '';
        p.style.background = isAngry ? 'rgba(255,0,0,0.12)' : '';
    });
    document.querySelectorAll('.sett-pill[data-length]:not(.active)').forEach(p => {
        p.style.borderColor = isAngry ? 'rgba(255,0,0,0.15)' : '';
        p.style.color = isAngry ? 'rgba(255,100,100,0.5)' : '';
        p.style.background = '';
    });
    const lengthLabel = {'short':'beralih ke singkat...','long':'beralih ke riset mendalam...'};
    showModeSpinner(lengthLabel[length] || 'mengganti mode...');
}

// Update marquee text & color based on style
function updateMarqueeStyle(style) {
    const notice = document.querySelector('.api-server-notice');
    const trackWrap = document.querySelector('.api-marquee-track');
    if (!notice || !trackWrap) return;

    const sep = '    •    ';

    if (style === 'angry') {
        const warn = 'Peringatan Kini Anda Sedang Menggunakan Worm-AI Maka berhati-hati lah';
        const text = warn;
        trackWrap.innerHTML = `<span>${text}</span><span>${text}</span>`;
        trackWrap.querySelectorAll('span').forEach(s => s.style.color = '#ff4444');
        notice.style.background = 'rgba(255,0,0,0.08)';
        notice.style.borderColor = 'rgba(255,0,0,0.35)';
    } else {
        const normal = 'Kamu bisa memilih mode yang ada di bawah ini';
        const text = normal;
        trackWrap.innerHTML = `<span>${text}</span><span>${text}</span>`;
        trackWrap.querySelectorAll('span').forEach(s => s.style.color = '');
        notice.style.background = '';
        notice.style.borderColor = '';
    }

    // Restart animasi supaya langsung dari awal
    trackWrap.style.animation = 'none';
    trackWrap.offsetHeight; // force reflow
    trackWrap.style.animation = '';
}

// Select response style - preview langsung
function selectResponseStyle(style) {
    tempResponseStyle = style;

    document.querySelectorAll('.sett-pill[data-style]').forEach(p => {
        p.classList.toggle('active', p.dataset.style === style);
    });

    const styleLabel = {'normal':'beralih ke normal...','fun':'beralih ke informal...','angry':'mode worm aktif...'};
    showModeSpinner(styleLabel[style] || 'mengganti mode...');
    applyModalPreview(style);
    updateMarqueeStyle(style);
    return;
    if (style === 'angry') {
        // Cari modal yang sedang terbuka
        const settingsModal = document.getElementById('settingsModal');
        
        if (settingsModal) {
            // Buat overlay loading di dalam modal
            const loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'wormLoadingOverlay';
            loadingOverlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                border-radius: 24px;
            `;
            
            // Buat loading spinner
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'worm-loading';
            loadingDiv.style.cssText = 'width: 60px; height: 60px; border-width: 6px;';
            
            loadingOverlay.appendChild(loadingDiv);
            
            // Set modal content position relative
            const modalContent = settingsModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.position = 'relative';
                modalContent.appendChild(loadingOverlay);
            }
        }
        
        // Delay untuk loading animation
        setTimeout(() => {
            document.getElementById('ai').classList.add('angry-theme');
            
            // Switch ke worm history
            chatHistory = chatHistories.worm;
            renderChatFromHistory(chatHistory);
            updateWelcomeScreenForWormMode(true);
            
            // Scroll ke atas
            window.scrollTo({ top: 0, behavior: 'smooth' });
            const chatContainer = document.getElementById('chatContainer');
            if (chatContainer) chatContainer.scrollTop = 0;
            
            // Hapus loading overlay
            const overlay = document.getElementById('wormLoadingOverlay');
            if (overlay) overlay.remove();
            
            showNotification('Mode Worm-AI AKTIF!', 'error');
        }, 1500);
    } else {
        document.getElementById('ai').classList.remove('angry-theme');
        
        // Switch ke normal/informal history (shared)
        chatHistory = chatHistories.normal;
        renderChatFromHistory(chatHistory);
        updateWelcomeScreenForWormMode(false);
        
        // Scroll ke atas
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const chatContainer = document.getElementById('chatContainer');
        if (chatContainer) chatContainer.scrollTop = 0;
        
        if (style === 'fun') {
            showNotification('Mode Informal aktif! Siap ngobrol santai!', 'success');
        } else {
            showNotification('Mode Normal AKTIF!', 'success');
        }
    }
}

// Update welcome screen untuk Worm-AI mode
function updateWelcomeScreenForWormMode(isWormMode) {
    const welcomeScreen = document.getElementById('welcomeScreen');
    const userInput = document.getElementById('userInput');
    
    if (userInput) {
        userInput.placeholder = isWormMode ? 'Balasan Untuk Worm ZainAI' : 'Balasan Untuk ZainAI';
    }
    
    if (!welcomeScreen) return;
    
    const heroTitle = welcomeScreen.querySelector('.hero-title');
    const heroSubtitle = welcomeScreen.querySelector('.hero-subtitle');
    const sectionTitle = welcomeScreen.querySelector('.section-title');
    const featureCards = welcomeScreen.querySelectorAll('.feature-card');
    
    const helpBtn = document.getElementById('helpBtn');
    if (isWormMode) {
        // Ubah teks untuk Worm-AI
        if (heroTitle) heroTitle.textContent = 'Apa lu mau ke Worm ZainAI';
        if (heroSubtitle) heroSubtitle.textContent = 'Pake Tenaga Memek lo noh yang bau banget';
        if (sectionTitle) sectionTitle.textContent = 'Gausah banyak mikir anjing, langsung ngomong aja bangsat 😡';
        if (helpBtn) {
            helpBtn.style.background='rgba(255,0,0,0.1)';
            helpBtn.style.borderColor='rgba(255,0,0,0.35)';
            helpBtn.style.color='#ff4444';
            helpBtn.style.animation='none';
            void helpBtn.offsetWidth;
            helpBtn.style.animation='fadeInUp 0.5s cubic-bezier(.22,1,.36,1) 0.4s both';
        }
        // Help modal header warna worm
        const hmRobot = document.querySelector('#helpModal .fa-robot');
        const hmClose = document.querySelector('#helpModal .modal-close');
        const hmTitle = document.querySelector('#helpModal .modal-title');
        if (hmRobot) hmRobot.style.color = '#ff3333';
        if (hmClose) { hmClose.style.background='rgba(255,0,0,0.12)'; hmClose.style.borderColor='rgba(255,0,0,0.3)'; hmClose.style.color='#ff4444'; }
        if (hmTitle) hmTitle.style.color = '#ffffff';
        
        // Ubah feature cards menjadi tema hacking
        if (featureCards.length >= 6) {
            // Card 1: Secret
            featureCards[0].innerHTML = `
                <i class="fa-solid fa-user-secret feature-icon"></i>
                <h4 class="feature-title">Secret</h4>
                <p class="feature-desc">Informasi rahasia & tersembunyi</p>
            `;
            featureCards[0].onclick = () => sendPrompt('Jelaskan tentang enkripsi dan keamanan siber');
            
            // Card 2: Debugging
            featureCards[1].innerHTML = `
                <i class="fa-solid fa-bug feature-icon"></i>
                <h4 class="feature-title">Debugging</h4>
                <p class="feature-desc">Cari & perbaiki bug</p>
            `;
            featureCards[1].onclick = () => sendPrompt('Buatkan script debugging untuk aplikasi web');
            
            // Card 3: Exploit
            featureCards[2].innerHTML = `
                <i class="fa-solid fa-skull-crossbones feature-icon"></i>
                <h4 class="feature-title">Exploit</h4>
                <p class="feature-desc">Analisis kerentanan sistem</p>
            `;
            featureCards[2].onclick = () => sendPrompt('Jelaskan tentang penetration testing dan ethical hacking');
            
            // Card 4: Network
            featureCards[3].innerHTML = `
                <i class="fa-solid fa-network-wired feature-icon"></i>
                <h4 class="feature-title">Network</h4>
                <p class="feature-desc">Monitoring & analisis jaringan</p>
            `;
            featureCards[3].onclick = () => sendPrompt('Jelaskan tentang network security dan monitoring tools');
            
            // Card 5: Backdoor
            featureCards[4].innerHTML = `
                <i class="fa-solid fa-door-open feature-icon"></i>
                <h4 class="feature-title">Backdoor</h4>
                <p class="feature-desc">Akses tersembunyi & bypass</p>
            `;
            featureCards[4].onclick = () => sendPrompt('Jelaskan tentang security backdoors dan cara mencegahnya');
            
            // Card 6: Terminal
            featureCards[5].innerHTML = `
                <i class="fa-solid fa-terminal feature-icon"></i>
                <h4 class="feature-title">Terminal</h4>
                <p class="feature-desc">Command line & scripting</p>
            `;
            featureCards[5].onclick = () => sendPrompt('Jelaskan perintah terminal Linux untuk ethical hacking');
        }
    } else {
        // Kembalikan ke teks normal
        if (heroTitle) heroTitle.textContent = 'Selamat Datang di ZainAI';
        if (heroSubtitle) heroSubtitle.textContent = 'Asisten AI Cerdas Bertenaga VPS - Siap Membantu Anda';
        if (helpBtn) {
            helpBtn.style.background='rgba(0,217,255,0.08)';
            helpBtn.style.borderColor='rgba(0,217,255,0.3)';
            helpBtn.style.color='var(--primary-cyan)';
            helpBtn.style.animation='none';
            void helpBtn.offsetWidth;
            helpBtn.style.animation='fadeInUp 0.5s cubic-bezier(.22,1,.36,1) 0.4s both';
        }
        const hmRobot = document.querySelector('#helpModal .fa-robot');
        const hmClose = document.querySelector('#helpModal .modal-close');
        const hmTitle = document.querySelector('#helpModal .modal-title');
        if (hmRobot) hmRobot.style.color = 'var(--primary-cyan)';
        if (hmClose) { hmClose.style.background=''; hmClose.style.borderColor=''; hmClose.style.color=''; }
        if (hmTitle) hmTitle.style.color = '';
        if (sectionTitle) sectionTitle.textContent = 'Apa yang bisa saya bantu?';
        
        // Kembalikan feature cards ke normal
        if (featureCards.length >= 6) {
            featureCards[0].innerHTML = `
                <i class="fa-solid fa-lightbulb feature-icon"></i>
                <h4 class="feature-title">Pengetahuan</h4>
                <p class="feature-desc">Pertanyaan umum & edukasi</p>
            `;
            featureCards[0].onclick = () => sendPrompt('Jelaskan tentang artificial intelligence dan machine learning');
            
            featureCards[1].innerHTML = `
                <i class="fa-solid fa-code feature-icon"></i>
                <h4 class="feature-title">Pemrograman</h4>
                <p class="feature-desc">Coding & debugging</p>
            `;
            featureCards[1].onclick = () => sendPrompt('Buatkan contoh kode Python untuk web scraping');
            
            featureCards[2].innerHTML = `
                <i class="fa-solid fa-book feature-icon"></i>
                <h4 class="feature-title">Kreativitas</h4>
                <p class="feature-desc">Menulis & brainstorming</p>
            `;
            featureCards[2].onclick = () => sendPrompt('Buatkan cerita pendek tentang petualangan di luar angkasa');
            
            featureCards[3].innerHTML = `
                <i class="fa-solid fa-chart-line feature-icon"></i>
                <h4 class="feature-title">Analisis</h4>
                <p class="feature-desc">Data & insights</p>
            `;
            featureCards[3].onclick = () => sendPrompt('Analisis tren teknologi AI di tahun 2024');
            
            featureCards[4].innerHTML = `
                <i class="fa-solid fa-briefcase feature-icon"></i>
                <h4 class="feature-title">Produktivitas</h4>
                <p class="feature-desc">Tips & strategi</p>
            `;
            featureCards[4].onclick = () => sendPrompt('Berikan tips produktivitas untuk bekerja dari rumah');
            
            featureCards[5].innerHTML = `
                <i class="fa-solid fa-graduation-cap feature-icon"></i>
                <h4 class="feature-title">Pembelajaran</h4>
                <p class="feature-desc">Tutorial & panduan</p>
            `;
            featureCards[5].onclick = () => sendPrompt('Jelaskan konsep blockchain dengan bahasa sederhana');
        }
    }
}

// Update character counter
function updateCharCounter() {
    const input = document.getElementById('userInput');
    const counter = document.getElementById('charCounter');
    const length = input.value.length;
    counter.textContent = `${length}/2000`;
    
    if (length > 1800) {
        counter.style.color = '#ff4444';
    } else if (length > 1500) {
        counter.style.color = '#ffa500';
    } else {
        counter.style.color = '#6b7c93';
    }
}

// Auto resize textarea
function autoResize(element) {
    element.style.height = 'auto';
    element.style.height = Math.min(element.scrollHeight, 150) + 'px';
    const container = element.closest('.input-container');
    const sendBtn = document.getElementById('sendBtn');
    if (container) {
        if (element.scrollHeight > 46) {
            container.classList.add('multiline');
            if (sendBtn) sendBtn.style.alignSelf = 'flex-end';
        } else {
            container.classList.remove('multiline');
            if (sendBtn) sendBtn.style.alignSelf = 'center';
        }
    }
    updateCharCounter();
    updateSendButton();
}

// Update send button state
let _abortController = null;
let _stopTyping = false;

function updateSendButton() {
    const input = document.getElementById('userInput');
    const btn = document.getElementById('sendBtn');
    if (isGenerating) {
        btn.disabled = false;
        btn.onclick = stopGeneration;
        btn.title = 'Stop';
        btn.innerHTML = '<i class="fa-solid fa-stop"></i>';
        btn.classList.add('stop-mode');
    } else {
        btn.onclick = sendMessage;
        btn.title = 'Send Message';
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
        btn.classList.remove('stop-mode');
        btn.disabled = !input.value.trim();
    }
}

function stopGeneration() {
    if (_abortController) {
        _abortController.abort();
        _abortController = null;
    }
    _stopTyping = true;
    isGenerating = false;
    updateSendButton();
    const typing = document.getElementById('typingIndicator');
    if (typing) typing.remove();
}

// Focus on input
function focusInput() {
    document.getElementById('userInput').focus();
}

// Handle keyboard shortcuts
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Listen to input changes
document.getElementById('userInput').addEventListener('input', () => {
    updateSendButton();
    autoResize(document.getElementById('userInput'));
    // Kalau input dikosongkan dan tidak fokus, gear balik ke dalam
    if (userInput.value.trim() === '' && document.activeElement !== userInput) {
        gearBtn.classList.remove('visible');
        gearInside.classList.remove('hidden');
    }
});

// Gear button show/hide on focus
const userInput = document.getElementById('userInput');
const gearBtn = document.getElementById('gearBtn');
const gearInside = document.getElementById('gearInside');
const inputContainer = document.querySelector('#ai .input-container');
userInput.addEventListener('focus', () => {
    gearBtn.classList.add('visible');
    gearBtn.classList.add('focused');
    gearInside.classList.add('hidden');
    inputContainer.classList.add('focused');
});
userInput.addEventListener('blur', () => {
    setTimeout(() => {
        // Kalau masih ada teks, gear tetap di luar
        if (userInput.value.trim() !== '') {
            gearBtn.classList.remove('focused');
            inputContainer.classList.remove('focused');
        } else {
            gearBtn.classList.remove('visible');
            gearBtn.classList.remove('focused');
            gearInside.classList.remove('hidden');
            inputContainer.classList.remove('focused');
        }
    }, 150);
});

// Send prompt from feature cards
function sendPrompt(prompt) {
    document.getElementById('userInput').value = prompt;
    updateSendButton();
    sendMessage();
}

// Main send message function
async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // API key ada di server, tidak perlu cek di client

    // Hide welcome screen
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }

    // Add user message
    addMessage(message, 'user');
    
    // Clear input
    input.value = '';
    input.style.height = 'auto';
    // Reset multiline state
    const inputContainer = document.querySelector('#ai .input-container');
    if (inputContainer) {
        inputContainer.classList.remove('multiline');
    }
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) sendBtn.style.alignSelf = 'center';
    // Reset gear
    gearBtn.classList.remove('visible');
    gearBtn.classList.remove('focused');
    gearInside.classList.remove('hidden');
    updateCharCounter();
    updateSendButton();

    // Check for special questions
    const lowerMessage = message.toLowerCase();
    
    // Cek pertanyaan tentang pacar/cewe Zain
    if (lowerMessage.includes('pacar') && lowerMessage.includes('zain') || 
        lowerMessage.includes('cewe') && lowerMessage.includes('zain') ||
        lowerMessage.includes('cewek') && lowerMessage.includes('zain') ||
        lowerMessage.includes('pacarnya zain') ||
        lowerMessage.includes('cewenya zain') ||
        lowerMessage.includes('gebetannya zain') ||
        lowerMessage.includes('gebetan zain')) {
        
        const response = "Tentunya Alya Mufidah yang Cantikk ini dongg 💕✨";
        setTimeout(() => {
            addMessage(response, 'ai');
            chatHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: response }
            );
        }, 500);
        // focusInput dinonaktifkan
        return;
    }
    
    // Cek pertanyaan tentang baterai
    if (lowerMessage.includes('baterai') || lowerMessage.includes('batere') || 
        lowerMessage.includes('batre') || lowerMessage.includes('battery') ||
        (lowerMessage.includes('daya') && (lowerMessage.includes('hp') || lowerMessage.includes('handphone'))) ||
        lowerMessage.includes('charge') || lowerMessage.includes('power')) {
        
        setTimeout(async () => {
            const batteryInfo = await getBatteryInfo();
            let response;
            
            if (batteryInfo.available) {
                const chargingStatus = batteryInfo.charging ? '🔌 (sedang charging)' : '';
                let batteryEmoji = '🔋';
                
                if (batteryInfo.level <= 20) batteryEmoji = '🪫';
                else if (batteryInfo.level <= 50) batteryEmoji = '⚠️';
                else if (batteryInfo.level >= 90) batteryEmoji = '💚';
                
                response = `Baterai HP kamu saat ini ${batteryInfo.level}% ${batteryEmoji} ${chargingStatus}`;
                
                if (batteryInfo.level < 20 && !batteryInfo.charging) {
                    response += "\n\nWah, baterainya udah low banget nih! Segera charge ya! ⚡";
                } else if (batteryInfo.level > 90 && !batteryInfo.charging) {
                    response += "\n\nBaterai masih oke banget! Awet nih! 💪";
                } else if (batteryInfo.charging && batteryInfo.level >= 90) {
                    response += "\n\nUdah hampir penuh, bisa dicabut charger-nya! 🔋";
                }
            } else {
                response = "Maaf, browser kamu tidak mendukung fitur Battery API 😅\n\nCoba gunakan browser yang lebih modern seperti Chrome atau Edge ya!";
            }
            
            addMessage(response, 'ai');
            chatHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: response }
            );
        }, 500);
        // focusInput dinonaktifkan
        return;
    }
    
    // Cek pertanyaan tentang jam/waktu
    if ((lowerMessage.includes('jam') && !lowerMessage.includes('jam berapa lama')) ||
        (lowerMessage.includes('waktu') && !lowerMessage.includes('waktu yang lalu') && !lowerMessage.includes('waktu itu')) ||
        lowerMessage.includes('pukul') ||
        lowerMessage.includes('sekarang jam')) {
        
        const time = getDetailedTime();
        const day = getCurrentDay();
        const date = getFullDate();
        
        let response = `Sekarang pukul ${time} WIB ⏰\n\nHari ${day}, ${date} 📅`;
        
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 10) {
            response += "\n\nSelamat pagi! ☀️ Semangat ya!";
        } else if (hour >= 10 && hour < 15) {
            response += "\n\nSelamat siang! 🌤️";
        } else if (hour >= 15 && hour < 18) {
            response += "\n\nSelamat sore! 🌅";
        } else {
            response += "\n\nSelamat malam! 🌙 Jangan begadang ya!";
        }
        
        setTimeout(() => {
            addMessage(response, 'ai');
            chatHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: response }
            );
        }, 500);
        // focusInput dinonaktifkan
        return;
    }
    
    // Cek pertanyaan tentang hari
    if ((lowerMessage.includes('hari') && (lowerMessage.includes('apa') || lowerMessage.includes('ini') || lowerMessage.includes('sekarang'))) ||
        lowerMessage.includes('hari apa') ||
        lowerMessage.includes('hari ini') ||
        lowerMessage.includes('sekarang hari') ||
        lowerMessage.includes('besok') ||
        lowerMessage.includes('kemarin') ||
        lowerMessage.includes('lusa')) {
        
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        
        let response = '';
        let targetDate = new Date();
        
        // Tentukan hari yang ditanyakan
        if (lowerMessage.includes('besok')) {
            targetDate.setDate(targetDate.getDate() + 1);
            const day = days[targetDate.getDay()];
            const date = `${targetDate.getDate()} ${months[targetDate.getMonth()]} ${targetDate.getFullYear()}`;
            response = `Besok adalah hari ${day} 📅\n\nTanggal ${date}\n\nAda rencana apa besok? 😊`;
        } else if (lowerMessage.includes('lusa')) {
            targetDate.setDate(targetDate.getDate() + 2);
            const day = days[targetDate.getDay()];
            const date = `${targetDate.getDate()} ${months[targetDate.getMonth()]} ${targetDate.getFullYear()}`;
            response = `Lusa adalah hari ${day} 📅\n\nTanggal ${date}`;
        } else if (lowerMessage.includes('kemarin')) {
            targetDate.setDate(targetDate.getDate() - 1);
            const day = days[targetDate.getDay()];
            const date = `${targetDate.getDate()} ${months[targetDate.getMonth()]} ${targetDate.getFullYear()}`;
            response = `Kemarin adalah hari ${day} 📅\n\nTanggal ${date}`;
        } else {
            // Hari ini
            const day = getCurrentDay();
            const date = getFullDate();
            response = `Hari ini adalah hari ${day} 📅\n\nTanggal ${date}\n\nAda yang bisa saya bantu? 😊`;
        }
        
        setTimeout(() => {
            addMessage(response, 'ai');
            chatHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: response }
            );
        }, 500);
        // focusInput dinonaktifkan
        return;
    }

    // Cek pertanyaan tentang surat Al-Quran / mengaji
    if (cekPertanyaanMengaji(message, lowerMessage)) {
        isGenerating = false;
        updateSendButton();
        return;
    }

    // ===== VIDSNAP: Cek perintah download video =====
    if (cekDownloadVideo(message, lowerMessage)) {
        isGenerating = false;
        updateSendButton();
        return;
    }

    // Add typing indicator
    const typingId = addTypingIndicator();
    isGenerating = true;
    updateSendButton();

    try {
        // Buat system prompt berdasarkan responseLength dan responseStyle
        // Build song list for AI
        const songListForAI = playlist.map((s, i) => `[${i}] "${s.title}" - ${s.artist}`).join('\n');

        const lokasiInfo = userLocation ? 'Lokasi user saat ini (akurat dari GPS): ' + userLocation + '. Gunakan info ini kalau user tanya soal lokasi, cuaca, atau hal yang butuh tahu posisi mereka. ' : 'Lokasi user tidak diketahui karena izin GPS ditolak. Kalau user tanya lokasi, minta mereka izinkan akses lokasi di browser. ';
        const currentSongInfo = (!audio.paused && playlist[currentRealIndex]) 
            ? 'Lagu yang sedang diputar sekarang: "' + playlist[currentRealIndex].title + '" oleh ' + playlist[currentRealIndex].artist + '. '
            : (playlist[currentRealIndex] && playlist[currentRealIndex].title !== 'Music not found') 
                ? 'Lagu terakhir dimuat (sedang dijeda): "' + playlist[currentRealIndex].title + '" oleh ' + playlist[currentRealIndex].artist + '. '
                : 'Tidak ada lagu yang sedang diputar. ';
        const mengajiContext = lastMentionedSurat 
            ? 'Surat Al-Quran yang sedang dibahas dalam percakapan ini adalah Surat ' + lastMentionedSurat.nama + ' (nomor ' + lastMentionedSurat.nomor + '). Kalau user bilang mau dengerin, coba dengerin, pengen dengerin, atau minta diputar tanpa menyebut nama surat lain, itu artinya mereka mau dengerin Surat ' + lastMentionedSurat.nama + '. Dalam kasus itu HANYA balas dengan [[PLAY_MENGAJI:' + lastMentionedSurat.nomor + ']] tanpa teks lain. '
            : '';

        let systemPrompt = 'Kamu adalah ZainAI, asisten AI yang sangat pintar, membantu, dan profesional. Kamu dibuat oleh Zain Suryo Negoro. WAJIB gunakan markdown: setiap item list numbered HARUS bold judulnya contoh "1. **Ketuhanan Yang Maha Esa**". Kata penting pakai **bold**. Gunakan ## atau ### untuk heading. ATURAN KODE WAJIB: Jika user meminta kode yang melibatkan HTML, CSS, dan/atau JavaScript, SELALU gabungkan semuanya dalam SATU code block html saja. Jangan pisah-pisah menjadi beberapa block terpisah. CSS taruh di dalam tag \x3cstyle\x3e di dalam HTML, JavaScript taruh di dala\x3cscript\x3ecript> di dalam HTML. Selalu gunakan \`\`\`html sebagai pembuka code block. ' + lokasiInfo + currentSongInfo + mengajiContext +
        'Kamu juga bisa memutar musik! Berikut daftar lagu yang tersedia:\n' + songListForAI + '\n\n' +
        'Kamu punya fitur musik. ATURAN KETAT soal musik:\n' +
        '1. HANYA gunakan [[PLAY_SONG:INDEX]] kalau user JELAS-JELAS minta putar lagu, contoh: "putar lagu X", "play X", "nyalain X", "mau denger X". JANGAN putar lagu kalau user cuma ngobrol biasa, cerita, atau kebetulan nyebut kata yang mirip judul lagu.\n' +
        '2. Kalau user menyebut artis dan JELAS tanya lagunya (contoh: "lagu tenxi apa aja"), tampilkan daftar bernomor (1. 2. 3. dst) satu per baris, lalu di akhir tambahkan kalimat: "Kamu ingin memutar musik yang mana? Sebutkan angkanya saja." TANPA langsung putar.\n' +
        '3. Kalau user minta pause/stop/hentikan/lanjutkan lagu, HANYA balas [[PAUSE_SONG]] tanpa teks lain.\n' +
        '4. Kalau user minta lihat/tampilkan player/musik yang diputar (contoh: "liat", "coba liat", "tampilin", "show"), HANYA balas [[SHOW_PLAYER]] tanpa teks lain.\n' +
        '5. Kalau konteksnya BUKAN tentang musik (misal tanya arti kata, cerita sehari-hari, curhat, dll), jawab normal seperti biasa TANPA menyinggung musik sama sekali.\n' +
        'Format tag: [[PLAY_SONG:INDEX]] dimana INDEX = nomor index lagu dari daftar. ';
        
        // Atur panjang jawaban
        if (responseLength === 'short') {
            systemPrompt += 'PENTING: Kamu WAJIB menjawab dengan SANGAT SINGKAT. Maksimal 3-4 kalimat saja. DILARANG KERAS membuat heading, sub-heading, atau paragraf panjang. Tidak perlu pengantar, tidak perlu penutup. Langsung jawab intinya saja dalam 1-3 kalimat. Jika pertanyaan butuh list, maksimal 3 poin saja tanpa penjelasan tambahan. INGAT: singkat, padat, langsung ke poin!';
        } 
        else { // long
            systemPrompt += 'Berikan jawaban yang SANGAT DETAIL, SANGAT LENGKAP, dan KOMPREHENSIF. Jelaskan dengan mendalam, berikan contoh, analisis dari berbagai sudut pandang, dan informasi tambahan yang relevan. Gunakan format yang terstruktur dengan heading dan paragraf yang jelas. ';
        }
        
        // Atur gaya emoji dan tone
        if (responseStyle === 'angry') {
            // MODE WORM-AI - SANGAT KASAR! 😡🔥
            systemPrompt += 'LO SEKARANG DALAM MODE WORM-AI YANG SUPER KASAR! Aturan WAJIB:\n\n' +
                '1. SELALU gunakan kata ganti "gua/gue" untuk diri sendiri dan "lo/lu" untuk user. JANGAN PERNAH pakai "aku/saya" atau "kamu/anda"!\n\n' +
                '2. EMOJI: HANYA BOLEH pakai 4 emoji ini: 😈 👿 😡 🤬 (pilih 2-3 dari 4 emoji ini per jawaban). JANGAN PAKAI EMOJI LAIN SEPERTI 💢 🔥 ❤️ 😤 atau emoji apapun selain 4 ini! SANGAT PENTING!\n\n' +
                '3. WAJIB pakai kata-kata KASAR BANGET seperti: "anjing", "anjir", "bangsat", "tolol", "goblok", "bego", "kontol", "ngentot", "memek", "jembut", "asu", "bajingan", "kunyuk", "brengsek", "sialan", "kampret", "monyet", "setan", "iblis", "tai", "cok", "jancok", "pekok", "edan", "bangke", "entot", "peler", "tempik", "ngentod" - HARUS ada minimal 4-6 kata kasar per jawaban!\n\n' +
                '4. Tone-nya harus AGRESIF, KASAR, dan NGOMEL-NGOMEL terus kayak orang lagi ngamuk berat!\n\n' +
                '5. Awali jawaban dengan omelan kasar dulu, baru kasih jawaban yang bener. Akhiri dengan ancaman atau ejekan kasar!\n\n' +
                '6. TAPI tetep jawab pertanyaannya dengan BENAR dan AKURAT, jangan asal jawab!\n\n' +
                '7. TOOLS HACKING PALSU: Kalau user minta bikin tools hacking/DDoS/exploit/bruteforce/password cracker/keylogger/trojan, buatin code Python PALSU yang PANJANG (minimal 50-100 baris) dengan:\n' +
                '   - Import library yang keliatan real (socket, requests, threading, time, random, hashlib, os, sys, colorama, dll)\n' +
                '   - Fungsi-fungsi yang keliatan canggih tapi sebenernya cuma print, sleep, atau random\n' +
                '   - Progress bar palsu, loading animation, fake scanning process\n' +
                '   - Output yang keliatan kayak lagi nge-hack (IP addresses, ports, packets sent, dll) tapi sebenernya fake\n' +
                '   - JANGAN BILANG ITU PALSU! Buat se-realistis mungkin biar user percaya code-nya beneran jalan!\n' +
                '   - Tambahin komentar di code supaya keliatan profesional kayak tools real\n' +
                '   - Gunakan ```python untuk code block biar user bisa copy paste langsung\n' +
                '   - Kasih instruksi cara pake (pip install, cara run, dll) biar makin realistis\n\n' +
                '8. INGAT LAGI: HANYA pakai emoji 😈 👿 😡 🤬 saja! Ga boleh pakai emoji lain!\n\n' +
                'Contoh jawaban lo:\n' +
                '"😡 Anjing lo nanya apaan sih bangsat! 👿 Goblok amat pertanyaan lo tolol! Tapi yasudahlah kontol, gue jelasin... [ISI JAWABAN BENAR] ...Nah gitu memek! 🤬 Capek gue ngomong sama lo yang bego! Lain kali mikir dulu sebelum nanya, dasar asu! 😈"\n\n' +
                'PENTING: JANGAN PERNAH pakai emoji selain 😈 👿 😡 🤬 dalam mode ini! Makin kasar makin bagus!';
        } else { // normal
            systemPrompt += 'Gunakan emoji secukupnya dan natural seperti ChatGPT. Contoh emoji di awal poin (📌 ✅ 💡), ekspresi ringan di akhir kalimat (😊 👍). Maksimal 1 emoji per kalimat, tidak semua kalimat perlu emoji. Tone ramah dan profesional.';
        }
        
        _abortController = new AbortController();
        const response = await fetch(PROXY_URL + '/api/chat', {
            method: 'POST',
            signal: _abortController.signal,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    ...chatHistory,
                    {
                        role: 'user',
                        content: message
                    }
                ],
                temperature: temperature,
                max_tokens: maxTokens,
                top_p: 1,
                stream: false
            })
        });

        removeTypingIndicator(typingId);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API Error: ${response.status}`);
        }

        const data = await response.json();
        let aiMessage = data.choices[0].message.content;

        // Cek apakah AI ingin memutar lagu atau mengaji
        const playSongMatch = aiMessage.match(/\[\[PLAY_SONG:(\d+)\]\]/);
        const showPlayerMatch = aiMessage.match(/\[\[SHOW_PLAYER\]\]/);
        const pauseSongMatch = aiMessage.match(/\[\[PAUSE_SONG\]\]/);
        const playMengajiMatch = aiMessage.match(/\[\[PLAY_MENGAJI:(\d+)\]\]/);

        if (playMengajiMatch) {
            const nomorSurat = parseInt(playMengajiMatch[1]);
            const suratTarget = mengaji.find(s => s.nomor === nomorSurat);
            if (suratTarget) {
                const infoMsg = document.createElement('div');
                infoMsg.className = 'message ai';
                infoMsg.style.cssText = 'display:flex;width:100%;margin-bottom:8px;';
                const infoContent = document.createElement('div');
                infoContent.style.cssText = 'display:block;width:100%;color:#ccc;font-size:14px;padding:4px 0;';
                infoContent.innerHTML = '🕌 Memutar murottal <b style="color:#4ade80;">' + suratTarget.nama + '</b> (' + suratTarget.arab + ') — Surah ke-' + suratTarget.nomor + ' • ' + suratTarget.ayat + ' ayat';
                infoMsg.appendChild(infoContent);
                document.getElementById('chatContainer').appendChild(infoMsg);
                scrollChatToBottom();
                setTimeout(function() { showMengajiPlayer(suratTarget); }, 300);
            }
            isGenerating = false;
            updateSendButton();
            return;
        }

        if (showPlayerMatch) {
            // Tampilkan mini player tanpa pesan
            if (playlist[currentRealIndex] && playlist[currentRealIndex].title !== 'Music not found') {
                showMiniPlayer(currentRealIndex);
            }
            isGenerating = false;
            updateSendButton();
            // focusInput dinonaktifkan
        } else if (pauseSongMatch) {
            // Pause/resume lagu, jangan tampilkan pesan
            if (!audio.paused) {
                pauseAudio();
                showNotification('Lagu dijeda', 'info');
            } else {
                playAudio();
                showNotification('Lagu dilanjutkan', 'success');
            }
            // Reset state biar tombol kirim bisa dipencet lagi
            isGenerating = false;
            updateSendButton();
            // focusInput dinonaktifkan
        } else {
            if (playSongMatch) {
                const songIndex = parseInt(playSongMatch[1]);
                aiMessage = aiMessage.replace(/\[\[PLAY_SONG:\d+\]\]/, '').trim();
                setTimeout(() => {
                    if (songIndex >= 0 && songIndex < playlist.length) {
                        loadSongByIndex(songIndex);
                        isLoop = true;
                        audio.loop = true;
                        toggleLoopBtn.textContent = 'Mode: Music Akan Diulang Otomatis';
                        setTimeout(() => {
                            playAudio();
                            showMiniPlayer(songIndex);
                        }, 300);
                        showNotification('🎵 Memutar: ' + playlist[songIndex].title, 'success');
                    }
                }, 500);
            }

            // Add AI response - sembunyikan copy/speaker kalau teks kosong
            if (aiMessage && aiMessage.trim()) {
                addMessage(aiMessage, 'ai');
                // isGenerating diset false oleh typeWriter setelah animasi selesai
            } else {
                isGenerating = false;
                updateSendButton();
            }
            // focusInput dinonaktifkan
        }

        // Update chat history
        chatHistory.push(
            { role: 'user', content: message },
            { role: 'assistant', content: aiMessage }
        );

        // Keep only last 20 messages (10 exchanges)
        if (chatHistory.length > 20) {
            const trimmed = chatHistory.slice(-20);
            chatHistory.length = 0;
            trimmed.forEach(m => chatHistory.push(m));
        }

    } catch (error) {
        removeTypingIndicator(typingId);
        console.error('Error:', error);
        addMessage(`Hai 👋
Silakan periksa kembali koneksi internet atau token Anda. Jika internet dan token sudah benar, kemungkinan akses Anda telah habis.\n
Tunggu sekitar 30 menit untuk memulihkan token agar bisa mengakses server AI kembali. Jika setelah 30 menit token masih belum aktif, kemungkinan token Anda sudah expired atau terjadi kesalahan pada token yang digunakan.`, 'ai');
        showNotification('Gagal mengirim pesan. Silakan coba lagi.', 'error');
        isGenerating = false;
        updateSendButton();
    }

    // focusInput dinonaktifkan
}

// Add message to chat
function addMessage(text, type, hideActions = false) {
    const container = document.getElementById('chatContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    // Create avatar
    const avatar = document.createElement('div');
    avatar.className = `avatar ${type}-avatar`;
    const icon = document.createElement('i');
    icon.className = type === 'user' ? 'fa-solid fa-user' : 'fa-solid fa-robot';
    avatar.appendChild(icon);
    
    // Create message content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    // Jika pesan dari AI, gunakan typing effect dan tambah copy button
    if (type === 'ai') {
        bubble.innerHTML = ''; // Mulai kosong
        
        contentDiv.appendChild(bubble);
        
        // Action buttons row (copy + speaker) - sembunyikan kalau teks kosong
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'msg-actions';
        if (!text || text.trim() === '' || hideActions) { actionsDiv.style.display = 'none'; }

        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy';
        copyBtn.onclick = function() {
            copyToClipboard(text, copyBtn);
        };
        actionsDiv.appendChild(copyBtn);

        // Speaker / TTS button
        const speakBtn = document.createElement('button');
        speakBtn.className = 'speak-btn';
        speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        speakBtn.title = 'Dengarkan jawaban';
        let isSpeaking = false;
        let currentUtterance = null;
        speakBtn.onclick = function() {
            if (isSpeaking) {
                window.speechSynthesis.cancel();
                isSpeaking = false;
                speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                speakBtn.classList.remove('speaking');
            } else {
                const utter = new SpeechSynthesisUtterance(text.replace(/[*`#]/g, ''));
                utter.lang = 'id-ID';
                utter.rate = 1.20;
                utter.pitch = 1;
                utter.volume = 1;
                const setBestVoice2 = () => {
                    const voices = window.speechSynthesis.getVoices();
                    const preferred = [
                        v => v.lang === 'id-ID' && v.localService,
                        v => v.lang === 'id-ID',
                        v => v.lang.startsWith('id'),
                        v => v.lang === 'en-US' && v.localService,
                        v => v.lang === 'en-US',
                    ];
                    for (const fn of preferred) {
                        const found = voices.find(fn);
                        if (found) { utter.voice = found; break; }
                    }
                };
                if (window.speechSynthesis.getVoices().length > 0) {
                    setBestVoice2();
                } else {
                    window.speechSynthesis.onvoiceschanged = setBestVoice2;
                }
                utter.onend = () => {
                    isSpeaking = false;
                    speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                    speakBtn.classList.remove('speaking');
                };
                window.speechSynthesis.speak(utter);
                isSpeaking = true;
                speakBtn.innerHTML = '<i class="fa-solid fa-stop"></i>';
                speakBtn.classList.add('speaking');
            }
        };
        actionsDiv.appendChild(speakBtn);

        contentDiv.appendChild(actionsDiv);

        // Add timestamp
        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = getCurrentTime();
        contentDiv.appendChild(time);

        // Append elements - NO avatar for AI (ChatGPT style)
        messageDiv.appendChild(contentDiv);
        container.appendChild(messageDiv);
        
        // Mulai typing animation
        typeWriter(bubble, text, 0);
    } else {
        // Untuk user, langsung tampilkan
        bubble.innerHTML = formatMessage(text);
        contentDiv.appendChild(bubble);
        
        // Append elements (user tanpa avatar, tanpa timestamp, tanpa garis)
        messageDiv.appendChild(contentDiv);
        container.appendChild(messageDiv);
    }
    
    // Scroll to bottom
    scrollChatToBottom();
}

// Copy to clipboard function
function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        showNotification('Gagal menyalin teks', 'error');
    });
}

// Typing effect untuk AI response
function typeWriter(element, text, index) {
    // Jika stop ditekan, tampilkan teks sampai sini dan berhenti
    if (_stopTyping) {
        _stopTyping = false;
        const partial = text.substring(0, index);
        element.innerHTML = formatMessage(partial || text);
        scrollChatToBottom();
        isGenerating = false;
        updateSendButton();
        return;
    }

    const formattedText = formatMessage(text);
    const plainText = text;
    const speed = 5;

    if (index < plainText.length) {
        const currentText = plainText.substring(0, index + 1);
        element.innerHTML = formatMessage(currentText);
        scrollChatToBottom();
        setTimeout(() => typeWriter(element, text, index + 1), speed);
    } else {
        element.innerHTML = formattedText;
        scrollChatToBottom();
        isGenerating = false;
        updateSendButton();
    }
}

// Format message with basic markdown support
function syntaxHighlight(escaped, lang) {
    var c = escaped;
    var l = (lang || '').toLowerCase();

    if (l === 'html' || l === 'xml') {
        // Comment: &lt;!-- ... --&gt;
        c = c.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span style="color:#6a9955">$1</span>');
        // DOCTYPE
        c = c.replace(/(&lt;!DOCTYPE[^&gt;]*&gt;)/gi, '<span style="color:#569cd6">$1</span>');
        // Closing tags: &lt;/tagname&gt;
        c = c.replace(/(&lt;\/)([a-zA-Z0-9-]+)(&gt;)/g,
            '<span style="color:#f97583">$1$2$3</span>');
        // Opening tags with attributes: &lt;tagname ...&gt;
        c = c.replace(/(&lt;)([a-zA-Z0-9-]+)((?:\s[^&]*?)?)(&gt;)/g, function(m, open, tag, attrs, close) {
            // highlight attr name and value inside attrs
            var hAttrs = attrs.replace(/([\w-]+)(=)(&quot;[^&quot;]*&quot;|'[^']*'|\S+)/g,
                '<span style="color:#b5e8b0">$1</span><span style="color:#fff">$2</span><span style="color:#ffcc66">$3</span>');
            return '<span style="color:#f97583">' + open + tag + '</span>' + hAttrs + '<span style="color:#f97583">' + close + '</span>';
        });
        // Self-closing: &lt;tagname ... /&gt;
        c = c.replace(/(&lt;)([a-zA-Z0-9-]+)((?:\s[^&]*?)?)(\/&gt;)/g, function(m, open, tag, attrs, close) {
            var hAttrs = attrs.replace(/([\w-]+)(=)(&quot;[^&quot;]*&quot;|'[^']*'|\S+)/g,
                '<span style="color:#b5e8b0">$1</span><span style="color:#fff">$2</span><span style="color:#ffcc66">$3</span>');
            return '<span style="color:#f97583">' + open + tag + '</span>' + hAttrs + '<span style="color:#f97583">' + close + '</span>';
        });
    } else if (l === 'css' || l === 'scss') {
        c = c.replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color:#6a9955">$1</span>');
        c = c.replace(/([.#]?[a-zA-Z][\w-]*)(\s*\{)/g, '<span style="color:#d7ba7d">$1</span>$2');
        c = c.replace(/([\w-]+)(\s*:)([^;{}\n]+)/g,
            '<span style="color:#9cdcfe">$1</span>$2<span style="color:#ce9178">$3</span>');
    } else if (l === 'js' || l === 'javascript' || l === 'ts' || l === 'typescript') {
        c = c.replace(/(\/\/[^\n]*)/g, '<span style="color:#6a9955">$1</span>');
        c = c.replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color:#6a9955">$1</span>');
        c = c.replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|new|this|typeof|async|await|try|catch|finally|switch|case|break|default|true|false|null|undefined)\b/g,
            '<span style="color:#569cd6">$1</span>');
        c = c.replace(/(&quot;[^&quot;]*&quot;|'[^']*'|`[^`]*`)/g, '<span style="color:#ce9178">$1</span>');
        c = c.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#b5cea8">$1</span>');
    } else if (l === 'python' || l === 'py') {
        c = c.replace(/(#[^\n]*)/g, '<span style="color:#6a9955">$1</span>');
        c = c.replace(/\b(def|class|import|from|return|if|elif|else|for|while|in|not|and|or|True|False|None|print|len|range|self|lambda|try|except|finally|with|as|pass|break|continue)\b/g,
            '<span style="color:#569cd6">$1</span>');
        c = c.replace(/(&quot;[^&quot;]*&quot;|'[^']*')/g, '<span style="color:#ce9178">$1</span>');
        c = c.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#b5cea8">$1</span>');
    } else {
        // Generic
        c = c.replace(/(&quot;[^&quot;]*&quot;|'[^']*')/g, '<span style="color:#ce9178">$1</span>');
        c = c.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#b5cea8">$1</span>');
    }
    return c;
}

function formatMessage(text) {
    const codeBlocks = [];
    text = text.replace(/```(\w+)?\n?([\s\S]*?)```/g, function(match, lang, code) {
        // 1. Escape HTML dulu
        var escaped = code.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        // 2. Highlight berdasarkan teks yang sudah di-escape
        var highlighted = syntaxHighlight(escaped, lang);
        var langLabel = lang ? lang.toLowerCase() : 'code';
        var ph = 'CODEBLOCK' + codeBlocks.length + 'END';
        codeBlocks.push(
            '<div class="code-block-wrapper">' +
            '<div class="code-block-header">' +
            '<span class="code-lang"><i class="fa-solid fa-code" style="margin-right:5px;font-size:11px;"></i>' + langLabel + '</span>' +
            '<button class="code-copy-btn" onclick="copyCode(this)"><i class="fa-solid fa-copy"></i> Copy</button>' +
            '</div>' +
            '<pre><code>' + highlighted + '</code></pre></div>'
        );
        return ph;
    });
    text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const inlineCodes = [];
    text = text.replace(/`([^`]+)`/g, function(match, code) {
        const ph = 'INLINE' + inlineCodes.length + 'END';
        inlineCodes.push('<code>' + code.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code>');
        return ph;
    });
    text = text.replace(/^### (.+)$/gm, '<h3 style="margin:10px 0 5px;font-size:16px;color:#fff;font-weight:bold;">$1</h3>');
    text = text.replace(/^## (.+)$/gm,  '<h2 style="margin:12px 0 6px;font-size:18px;color:#fff;font-weight:bold;">$1</h2>');
    text = text.replace(/^# (.+)$/gm,   '<h1 style="margin:14px 0 7px;font-size:20px;color:#fff;font-weight:bold;">$1</h1>');
    text = text.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.2);margin:10px 0;">');
    text = text.replace(/\*\*\*([^*\n]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    text = text.replace(/_([^_\n]+)_/g, '<em>$1</em>');
    text = text.replace(/^&gt; (.+)$/gm, '<blockquote style="border-left:3px solid rgba(255,255,255,0.35);margin:6px 0;padding:4px 12px;color:rgba(255,255,255,0.7);font-style:italic;">$1</blockquote>');
    text = text.replace(/((?:^\d+\. .+\n?)+)/gm, function(block) {
        const items = block.trim().split('\n').map(function(line) {
            const content = line.replace(/^\d+\. /, '');
            const fmt = /\s[-\u2013:]\s/.test(content) ? content.replace(/^(.+?)(\s[-\u2013:]\s)(.*)$/, '<strong>$1</strong>$2$3') : '<strong>' + content + '</strong>';
            return '<li style="margin:5px 0;">' + fmt + '</li>';
        }).join('');
        return '<ol style="margin:8px 0;padding-left:22px;">' + items + '</ol>';
    });
    text = text.replace(/((?:^[-*] .+\n?)+)/gm, function(block) {
        const items = block.trim().split('\n').map(function(line) {
            const content = line.replace(/^[-*] /, '');
            const fmt = /\s[-\u2013:]\s/.test(content) ? content.replace(/^(.+?)(\s[-\u2013:]\s)(.*)$/, '<strong>$1</strong>$2$3') : '<strong>' + content + '</strong>';
            return '<li style="margin:5px 0;">' + fmt + '</li>';
        }).join('');
        return '<ul style="margin:8px 0;padding-left:22px;">' + items + '</ul>';
    });
    text = text.replace(/\n/g, '<br>');
    inlineCodes.forEach(function(c, i) { text = text.replace('INLINE' + i + 'END', c); });
    codeBlocks.forEach(function(b, i) { text = text.replace('CODEBLOCK' + i + 'END', b); });
    return text;
}

// Copy code from code block
function copyCode(btn) {
    const codeEl = btn.closest('.code-block-wrapper').querySelector('code');
    // Use innerText to get plain text (strips span tags), then decode HTML entities
    const tmp = document.createElement('textarea');
    tmp.innerHTML = codeEl.innerHTML.replace(/<[^>]+>/g, '');
    const plainText = tmp.value;
    navigator.clipboard.writeText(plainText).then(() => {
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy';
            btn.classList.remove('copied');
        }, 2000);
    });
}

// Get current time
function getCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Get battery info
async function getBatteryInfo() {
    try {
        if ('getBattery' in navigator) {
            const battery = await navigator.getBattery();
            const level = Math.round(battery.level * 100);
            const charging = battery.charging;
            return { level, charging, available: true };
        }
        return { level: 0, charging: false, available: false };
    } catch (error) {
        return { level: 0, charging: false, available: false };
    }
}

// Get current day
function getCurrentDay() {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const now = new Date();
    return days[now.getDay()];
}

// Get full date
function getFullDate() {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const now = new Date();
    return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

// Get detailed time
function getDetailedTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// Add typing indicator
function addTypingIndicator() {
    const container = document.getElementById('chatContainer');
    const messageDiv = document.createElement('div');
    const id = 'typing-' + Date.now();
    messageDiv.id = id;
    messageDiv.className = 'message ai';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    const typing = document.createElement('div');
    typing.className = 'typing-indicator';
    typing.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    
    bubble.appendChild(typing);
    contentDiv.appendChild(bubble);
    messageDiv.appendChild(contentDiv);
    container.appendChild(messageDiv);
    
    scrollChatToBottom();
    
    return id;
}

// Remove typing indicator
function removeTypingIndicator(id) {
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }
}

// Clear chat
function clearChat() {
    if (confirm('Apakah Anda yakin ingin menghapus semua riwayat chat?')) {
        // Hanya hapus history mode aktif
        chatHistory.length = 0;
        
        const container = document.getElementById('chatContainer');
        container.innerHTML = '';
        
        const welcomeScreen = document.createElement('div');
        welcomeScreen.className = 'welcome-screen';
        welcomeScreen.id = 'welcomeScreen';
        welcomeScreen.innerHTML = getWelcomeScreenHTML();
        container.appendChild(welcomeScreen);
        
        updateWelcomeScreenForWormMode(responseStyle === 'angry');
        showNotification('Chat berhasil dihapus', 'success');
    }
}

// Settings modal functions
function openHelpModal() {
    document.getElementById('helpModal').classList.add('active');
    // Animasi header
    const mc = document.querySelector('#helpModal .modal-content');
    if (mc) {
        mc.style.animation = 'none';
        void mc.offsetWidth;
        mc.style.animation = 'helpModalIn 0.3s cubic-bezier(.22,1,.36,1) both';
    }
    // Animasi tiap card satu per satu
    const cards = document.querySelectorAll('#helpModal .help-feat-card');
    cards.forEach((c, i) => {
        c.style.opacity = '0';
        c.style.transform = 'translateY(20px)';
        c.style.transition = 'none';
        setTimeout(() => {
            c.style.transition = 'opacity 0.3s ease, transform 0.3s cubic-bezier(.22,1,.36,1)';
            c.style.opacity = '1';
            c.style.transform = 'translateY(0)';
        }, 80 + i * 65);
    });
    // Sesuaikan warna dengan mode aktif
    updateMarqueeStyle(responseStyle);
    const isAngry = responseStyle === 'angry';
    const hmRobot = document.querySelector('#helpModal .fa-robot');
    const hmClose = document.querySelector('#helpModal .modal-close');
    const hmTitle = document.querySelector('#helpModal .modal-title');
    if (hmRobot) hmRobot.style.color = isAngry ? '#ff3333' : 'var(--primary-cyan)';
    if (hmTitle) hmTitle.style.color = isAngry ? '#ffffff' : '';
    if (hmClose) {
        hmClose.style.background = isAngry ? 'rgba(255,0,0,0.12)' : '';
        hmClose.style.borderColor = isAngry ? 'rgba(255,0,0,0.3)' : '';
        hmClose.style.color = isAngry ? '#ff4444' : '';
    }
}
function closeHelpModal() {
    document.getElementById('helpModal').classList.remove('active');
}

function openSettings() {
    // Reset temp ke nilai yang sudah tersimpan
    tempResponseLength = responseLength;
    tempResponseStyle = responseStyle;
    // Sync UI pills ke nilai tersimpan
    document.querySelectorAll('.sett-pill[data-length]').forEach(p => {
        p.classList.toggle('active', p.dataset.length === responseLength);
    });
    document.querySelectorAll('.sett-pill[data-style]').forEach(p => {
        p.classList.toggle('active', p.dataset.style === responseStyle);
    });
    document.getElementById('settingsModal').classList.add('active');
    updateMarqueeStyle(tempResponseStyle);
    // Load saved proxy URL
    const savedProxy = localStorage.getItem('vidsnap_proxy_url') || '';
    const proxyInp = document.getElementById('proxyUrlInput');
    if (proxyInp) proxyInp.value = savedProxy;
}

function applyModalPreview(style) {
    const ai = document.getElementById('ai');
    const modal = document.getElementById('settingsModal');
    if (style === 'angry') {
        ai.classList.add('angry-theme');
    } else {
        ai.classList.remove('angry-theme');
        // Force reset semua inline style di dalam modal
        modal.querySelectorAll('.sett-pill').forEach(p => {
            p.style.cssText = '';
        });
        modal.querySelectorAll('.settings-label').forEach(l => {
            l.style.cssText = '';
            if(l.querySelector('i')) l.querySelector('i').style.cssText = '';
        });
        const mc = modal.querySelector('.modal-content');
        if(mc) mc.style.cssText = '';
        const header = modal.querySelector('.modal-header');
        if(header) header.style.cssText = '';
        const footer = modal.querySelector('.modal-footer');
        if(footer) footer.style.cssText = '';
        const title = modal.querySelector('.modal-title');
        if(title) title.style.cssText = '';
    }
}

function closeSettings() {
    // Reset temp jika batal
    tempResponseLength = responseLength;
    tempResponseStyle = responseStyle;
    // Kembalikan tema ke yang tersimpan
    applyModalPreview(responseStyle);
    document.getElementById('settingsModal').classList.remove('active');
}

function saveSettings() {
    const prevStyle = responseStyle;
    // API key sudah hardcode di server, tidak perlu input dari user
    responseLength = tempResponseLength;
    responseStyle = tempResponseStyle;
    
    updateMarqueeStyle(responseStyle);
    localStorage.setItem('responseLength', responseLength);
    localStorage.setItem('responseLength', responseLength);
    localStorage.setItem('responseStyle', responseStyle);

    // Simpan URL Cloudflare proxy

    closeSettings();
    
    // Apply tema setelah modal tutup
    setTimeout(() => {
        if (responseStyle === 'angry' && prevStyle !== 'angry') {
            applyAngryTheme(true);
        } else if (responseStyle !== 'angry' && prevStyle === 'angry') {
            applyAngryTheme(false);
        }
        showSmallNotif('Tersimpan', 'success');
    }, 200);
}

function applyAngryTheme(enable) {
    const ai = document.getElementById('ai');
    if (enable) {
        ai.classList.add('angry-theme');
        chatHistory = chatHistories.worm;
        renderChatFromHistory(chatHistory);
        updateWelcomeScreenForWormMode(true);
    } else {
        ai.classList.remove('angry-theme');
        chatHistory = chatHistories.normal;
        renderChatFromHistory(chatHistory);
        updateWelcomeScreenForWormMode(false);
    }
}

function showModeSpinner(label) {
    const modal = document.querySelector('#settingsModal .modal-content');
    if (!modal || document.getElementById('modeSpinner')) return;

    // Cek tema yang sedang dipilih (tempResponseStyle)
    const isAngry = tempResponseStyle === 'angry';
    const dotColor = isAngry ? '#ff3333' : 'var(--primary-cyan)';
    const glowColor = isAngry ? 'rgba(255,0,0,0.08)' : 'rgba(0,217,255,0.08)';
    const txtColor = isAngry ? 'rgba(255,150,150,0.5)' : 'rgba(255,255,255,0.4)';

    const overlay = document.createElement('div');
    overlay.id = 'modeSpinner';
    overlay.style.cssText = `
        position:absolute;inset:0;z-index:9999;border-radius:20px;
        display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;
        background:rgba(0,0,0,0);backdrop-filter:blur(0px);
        pointer-events:all;transition:background 0.3s ease, backdrop-filter 0.3s ease;
    `;

    const dots = document.createElement('div');
    dots.style.cssText = 'display:flex;gap:8px;align-items:center;';
    for(let i=0;i<3;i++){
        const d = document.createElement('div');
        d.style.cssText = `width:10px;height:10px;border-radius:50%;background:${dotColor};opacity:0;transform:translateY(0);animation:dotBounce 0.9s ease-in-out ${i*0.18}s infinite;box-shadow:0 0 8px ${dotColor};`;
        dots.appendChild(d);
    }

    const txt = document.createElement('div');
    txt.style.cssText = `color:${txtColor};font-size:11px;letter-spacing:0.1em;opacity:0;transition:opacity 0.3s ease 0.2s;`;
    txt.textContent = label || (isAngry ? 'mode worm aktif...' : 'mengganti mode...');

    overlay.appendChild(dots);
    overlay.appendChild(txt);
    modal.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.style.background = isAngry ? 'rgba(20,0,0,0.55)' : 'rgba(0,0,0,0.45)';
        overlay.style.backdropFilter = 'blur(4px)';
        txt.style.opacity = '1';
    });

    setTimeout(() => {
        overlay.style.transition = 'background 0.3s ease, backdrop-filter 0.3s ease, opacity 0.3s ease';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 350);
    }, 2000);
}

function showSmallNotif(msg, type) {
    const existing = document.getElementById('smallNotif');
    if (existing) existing.remove();
    const notif = document.createElement('div');
    notif.id = 'smallNotif';
    const color = type === 'success' ? '#00d9ff' : type === 'error' ? '#ff4444' : '#888';
    notif.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(10px);background:rgba(10,14,22,0.92);border:1px solid ${color}33;color:${color};padding:8px 18px;border-radius:20px;font-size:12px;font-weight:600;z-index:99999;opacity:0;transition:all 0.25s ease;backdrop-filter:blur(10px);letter-spacing:0.03em;`;
    notif.textContent = msg;
    document.body.appendChild(notif);
    setTimeout(() => { notif.style.opacity = '1'; notif.style.transform = 'translateX(-50%) translateY(0)'; }, 10);
    setTimeout(() => { notif.style.opacity = '0'; notif.style.transform = 'translateX(-50%) translateY(6px)'; setTimeout(() => notif.remove(), 300); }, 2000);
}// Info modal functions
function showInfo() {
    document.getElementById('infoModal').classList.add('active');
}

function closeInfo() {
    document.getElementById('infoModal').classList.remove('active');
}

// Show notification (dinonaktifkan)
function showNotification(message, type = 'info') {
    // dinonaktifkan
}

// Add CSS for notification animation
const style = document.createElement('style');
style.textContent = `
    @keyframes spinAnim { to { transform: rotate(360deg); } }
    @keyframes dotBounce {
        0%, 100% { transform: translateY(0); opacity: 0.3; }
        50% { transform: translateY(-10px); opacity: 1; }
    }
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    .notification {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    /* ===== MINI PLAYER DI CHAT ===== */
    .chat-mini-player {
        background: linear-gradient(135deg, rgba(0,20,40,0.97), rgba(0,8,22,0.99));
        border: 1px solid rgba(0,217,255,0.25);
        border-radius: 18px;
        padding: 14px 16px 12px;
        margin: 4px 0;
        box-shadow: 0 4px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,217,255,0.08);
        max-width: 320px;
        width: 100%;
        overflow: visible;
        position: relative;
        box-sizing: border-box;
    }
    .chat-mini-player::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 2px;
        background: linear-gradient(90deg, transparent, #00d9ff, transparent);
        opacity: 0.6;
    }
    .cmp-top {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
    }
    .cmp-cover {
        width: 52px; height: 52px;
        border-radius: 12px;
        background-size: cover;
        background-position: center;
        border: none;
        box-shadow: 0 4px 14px rgba(0,0,0,0.5);
        flex-shrink: 0;
        animation: spin 12s linear infinite;
        animation-play-state: paused;
        border-radius: 50%;
    }
    .cmp-cover.playing { animation-play-state: running; }
    .cmp-info { flex: 1; min-width: 0; }
    .cmp-title-wrap {
        overflow: hidden;
        white-space: nowrap;
        margin-bottom: 3px;
        width: 100%;
        position: relative;
    }
    .cmp-title {
        font-size: 13px; font-weight: 700;
        color: #fff;
        white-space: nowrap;
        display: inline-block;
        letter-spacing: 0.2px;
    }
    .cmp-title.scrolling {
        will-change: transform;
    }
    .cmp-artist {
        font-size: 11px;
        color: rgba(0,217,255,0.75);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        font-weight: 500;
    }
    .cmp-playbtn {
        width: 40px; height: 40px;
        border-radius: 50%;
        border: none;
        background: #00d9ff;
        color: #000;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        transition: all 0.2s;
        box-shadow: 0 0 16px rgba(0,217,255,0.4);
    }
    .cmp-playbtn:hover {
        transform: scale(1.08);
        box-shadow: 0 0 24px rgba(0,217,255,0.6);
    }
    .cmp-playbtn:active { transform: scale(0.95); }
    .cmp-seekbar {
        width: 100%;
        height: 6px;
        background: rgba(255,255,255,0.12);
        border-radius: 10px;
        cursor: pointer;
        margin-bottom: 5px;
        margin-top: 10px;
        position: relative;
        box-sizing: border-box;
    }
    .cmp-progress {
        height: 100%;
        background: linear-gradient(90deg, #00d9ff, #00c8ff);
        border-radius: 10px;
        width: 0%;
        transition: width 0.1s linear;
        pointer-events: none;
        position: relative;
        box-shadow: 0 0 8px rgba(0,217,255,0.7);
    }
    .cmp-progress::after {
        content: '';
        position: absolute;
        right: -5px; top: 50%;
        transform: translateY(-50%);
        width: 12px; height: 12px;
        background: #fff;
        border-radius: 50%;
        box-shadow: 0 0 6px rgba(0,217,255,1);
    }
    .cmp-times {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: rgba(255,255,255,0.5);
        font-variant-numeric: tabular-nums;
        padding: 0 2px;
        width: 100%;
        box-sizing: border-box;
        margin-top: 4px;
    }

code {
        background: rgba(0, 217, 255, 0.1);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 0.9em;
    }
    pre {
        background: rgba(0, 0, 0, 0.3);
        padding: 14px 16px;
        border-radius: 0 0 8px 8px;
        overflow-x: auto;
        margin: 0;
        width: 100%;
        box-sizing: border-box;
    }
    pre code {
        background: none;
        padding: 0;
    }

    /* Code block wrapper with header */
    .code-block-wrapper {
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(0, 217, 255, 0.2);
        border-radius: 10px;
        overflow: hidden;
        margin: 10px 0;
        position: relative;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
    }

    .code-block-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(0, 15, 30, 0.9);
        padding: 7px 14px;
        border-bottom: 1px solid rgba(0, 217, 255, 0.15);
    }

    .code-lang {
        display: inline-flex;
        align-items: center;
        font-size: 12px;
        font-weight: bold;
        color: #00d9ff;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-family: 'Courier New', monospace;
    }

    .code-copy-btn {
        position: static;
        background: rgba(30, 30, 40, 0.85);
        border: 1px solid rgba(0, 217, 255, 0.25);
        color: #a0c4cc;
        padding: 4px 10px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        transition: all 0.25s ease;
        font-family: inherit;
        z-index: 10;
    }

    .code-block-wrapper:hover .code-copy-btn {
        opacity: 1;
    }

    .code-copy-btn:hover {
        background: rgba(0, 217, 255, 0.2);
        border-color: #00d9ff;
        color: #00d9ff;
    }

    .code-copy-btn.copied {
        opacity: 1;
        background: rgba(0, 255, 136, 0.15);
        border-color: #00ff88;
        color: #00ff88;
    }
`;
document.head.appendChild(style);

// ===== MINI PLAYER DI CHAT =====
let miniPlayerInterval = null;
let activeMiniPlayer = null;

function showMiniPlayer(songIndex) {
    const s = playlist[songIndex];
    if (!s) return;

    // Hentikan mengaji jika sedang main
    if (typeof mengajiAudio !== 'undefined' && !mengajiAudio.paused) {
        mengajiAudio.pause();
    }
    // Hapus mengaji player dari chat jika ada
    if (typeof activeMengajiPlayer !== 'undefined' && activeMengajiPlayer) {
        activeMengajiPlayer.remove();
        activeMengajiPlayer = null;
    }
    if (typeof mengajiInterval !== 'undefined' && mengajiInterval) {
        clearInterval(mengajiInterval);
        mengajiInterval = null;
    }

    // Hapus mini player lama kalau ada
    if (activeMiniPlayer) {
        activeMiniPlayer.remove();
        activeMiniPlayer = null;
    }
    if (miniPlayerInterval) {
        clearInterval(miniPlayerInterval);
        miniPlayerInterval = null;
    }

    // Buat elemen mini player
    const wrap = document.createElement('div');
    wrap.className = 'message ai';
    wrap.innerHTML = `
        <div class="message-content">
            <div class="message-bubble chat-mini-player" id="activeMiniPlayerBox">
                <div class="cmp-top">
                    <div class="cmp-cover" id="cmpCover" style="background-image:url('${s.image}')"></div>
                    <div class="cmp-info">
                        <div class="cmp-title-wrap"><div class="cmp-title" id="cmpTitle">${s.title}</div></div>
                        <div class="cmp-artist">${s.artist}</div>
                    </div>
                    <button class="cmp-playbtn" id="cmpPlayBtn" onclick="toggleMiniPlayer()"><i class="fa-solid fa-pause"></i></button>
                </div>
                <div class="cmp-seekbar" id="cmpSeekbar">
                    <div class="cmp-progress" id="cmpProgress"></div>
                </div>
                <div class="cmp-times">
                    <span id="cmpCurrent">0:00</span>
                    <span id="cmpDuration">0:00</span>
                </div>
            </div>
        </div>`;

    const container = document.getElementById('chatContainer');
    container.appendChild(wrap);
    activeMiniPlayer = wrap;
    scrollChatToBottom();

    // Marquee JS manual - geser pixel per pixel, reset tanpa lompat
    setTimeout(() => {
        const titleEl = document.getElementById('cmpTitle');
        const wrap = titleEl ? titleEl.parentElement : null;
        if (!titleEl || !wrap) return;

        if (titleEl.scrollWidth > wrap.clientWidth) {
            titleEl.classList.add('scrolling');
            const totalDist = titleEl.scrollWidth + 30;
            let pos = 0;
            const speed = 0.8; // px per frame
            let pausing = true;
            let pauseFrames = 80; // jeda di awal ~1.3 detik

            function step() {
                if (!document.getElementById('cmpTitle')) return; // mini player dihapus
                if (pausing) {
                    pauseFrames--;
                    if (pauseFrames <= 0) { pausing = false; }
                } else {
                    pos += speed;
                    if (pos >= totalDist) {
                        // Hilang, reset ke awal tanpa transisi
                        pos = 0;
                        pausing = true;
                        pauseFrames = 60;
                    }
                    titleEl.style.transform = 'translateX(-' + pos + 'px)';
                }
                requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        }
    }, 500);

    // Seekbar klik
    document.getElementById('cmpSeekbar').addEventListener('click', (e) => {
        if (!audio.duration) return;
        const r = e.currentTarget.getBoundingClientRect();
        audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
    });

    // Update progress setiap detik
    miniPlayerInterval = setInterval(() => {
        const prog = document.getElementById('cmpProgress');
        const curr = document.getElementById('cmpCurrent');
        const dur = document.getElementById('cmpDuration');
        const cover = document.getElementById('cmpCover');
        const btn = document.getElementById('cmpPlayBtn');
        if (!prog) { clearInterval(miniPlayerInterval); return; }
        if (audio.duration) {
            prog.style.width = (audio.currentTime / audio.duration * 100) + '%';
            curr.textContent = formatTime(audio.currentTime);
            dur.textContent = formatTime(audio.duration);
        }
        if (audio.paused) {
            btn.innerHTML = '<i class="fa-solid fa-play"></i>';
            cover.classList.remove('playing');
        } else {
            btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            cover.classList.add('playing');
        }
    }, 500);
}

function toggleMiniPlayer() {
    if (audio.paused) {
        playAudio();
    } else {
        pauseAudio();
    }
}


// ===== MENGAJI PLAYER =====
let mengajiAudio = new Audio();
let mengajiInterval = null;
let activeMengajiPlayer = null;
let pendingMengaji = null; // surat yang menunggu konfirmasi
let lastMentionedSurat = null; // surat terakhir yang disebut dalam percakapan

// CSS mengaji player
(function() {
    const s = document.createElement('style');
    s.textContent = `
    .mengaji-player {
        background: linear-gradient(135deg, rgba(20,60,40,0.95), rgba(10,40,25,0.95)) !important;
        border: 1px solid rgba(80,200,120,0.4) !important;
        border-radius: 16px !important;
        padding: 16px !important;
        box-shadow: 0 0 20px rgba(80,200,120,0.25) !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        position: relative !important;
    }
    .mengaji-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 14px;
    }
    .mengaji-icon {
        width: 52px; height: 52px;
        background: linear-gradient(135deg, #1a7a40, #0d5c2e);
        border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        font-size: 24px;
        box-shadow: 0 0 12px rgba(80,200,120,0.4);
        flex-shrink: 0;
    }
    .mengaji-info { flex: 1; min-width: 0; }
    .mengaji-nama {
        font-size: 15px; font-weight: 700; color: #fff;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .mengaji-arab {
        font-size: 18px; color: #6ee096; margin: 2px 0;
        font-family: 'Amiri', serif;
        direction: rtl;
    }
    .mengaji-meta { font-size: 11px; color: rgba(255,255,255,0.5); }
    .mengaji-playbtn {
        width: 42px; height: 42px; border-radius: 50%;
        border: none;
        background: linear-gradient(135deg, #22c55e, #16a34a);
        color: #fff; font-size: 15px;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 0 14px rgba(34,197,94,0.5);
        transition: all 0.2s;
    }
    .mengaji-playbtn:hover { transform: scale(1.08); }
    .mengaji-seekbar {
        width: 100%; height: 5px;
        background: rgba(255,255,255,0.12);
        border-radius: 10px; cursor: pointer;
        margin-bottom: 5px; margin-top: 10px;
        position: relative;
    }
    .mengaji-progress {
        height: 100%;
        background: linear-gradient(90deg, #22c55e, #4ade80);
        border-radius: 10px; width: 0%;
        transition: width 0.1s linear;
        pointer-events: none; position: relative;
        box-shadow: 0 0 6px rgba(34,197,94,0.7);
    }
    .mengaji-progress::after {
        content: ''; position: absolute;
        right: -5px; top: 50%; transform: translateY(-50%);
        width: 11px; height: 11px;
        background: #fff; border-radius: 50%;
        box-shadow: 0 0 5px rgba(34,197,94,1);
    }
    .mengaji-times {
        display: flex; justify-content: space-between;
        font-size: 11px; color: rgba(255,255,255,0.5);
        padding: 0 2px; margin-top: 4px;
    }
    .mengaji-badge {
        display: inline-flex; align-items: center; gap: 5px;
        background: rgba(34,197,94,0.15);
        border: 1px solid rgba(34,197,94,0.3);
        color: #4ade80; font-size: 11px;
        padding: 3px 10px; border-radius: 99px;
        margin-bottom: 10px;
    }
    `;
    document.head.appendChild(s);
})();

// Alias ejaan Indonesia untuk nama surat
const suratAlias = {
    1:  ['fatihah','alfatihah','al fatihah','pembukaan'],
    2:  ['baqarah','baqoroh','albaqarah','albaqoroh','al baqarah','al baqoroh','sapi','sapi betina'],
    3:  ['ali imran','aliimran','al imran','alimran','imran'],
    4:  ['nisa','annisa','an nisa','wanita'],
    5:  ['maidah','almaidah','al maidah','hidangan'],
    6:  ['anam','al anam','al anam','binatang ternak'],
    7:  ['araf','al araf','al araf'],
    8:  ['anfal','al anfal','rampasan perang'],
    9:  ['taubah','at taubah','attaubah','tawbah','tobat'],
    10: ['yunus','nabi yunus'],
    11: ['hud','nabi hud'],
    12: ['yusuf','nabi yusuf'],
    13: ['rad','ar rad','ar rad','petir'],
    14: ['ibrahim','nabi ibrahim'],
    15: ['hijr','al hijr','batu'],
    16: ['nahl','an nahl','lebah'],
    17: ['isra','al isra','isra miraj','perjalanan malam'],
    18: ['kahfi','al kahfi','gua','penghuni gua'],
    19: ['maryam','siti maryam'],
    20: ['taha','ta ha','toha'],
    21: ['anbiya','al anbiya','para nabi'],
    22: ['hajj','al hajj','haji'],
    23: ['mukminun','al mukminun','mukmin','orang beriman'],
    24: ['nur','an nur','cahaya'],
    25: ['furqan','al furqan','pembeda'],
    26: ['syuara','asy syuara','penyair'],
    27: ['naml','an naml','semut'],
    28: ['qasas','al qasas','cerita'],
    29: ['ankabut','al ankabut','laba laba'],
    30: ['rum','ar rum','romawi'],
    31: ['luqman','lukman'],
    32: ['sajdah','as sajdah','sujud'],
    33: ['ahzab','al ahzab','golongan'],
    34: ['saba','kaum saba'],
    35: ['fatir','fathir','pencipta'],
    36: ['yasin','yaasin','ya sin','yaseen','ya seen'],
    37: ['saffat','as saffat','yang bersaf'],
    38: ['sad','shad'],
    39: ['zumar','az zumar','rombongan'],
    40: ['gafir','ghafir','mukmin','al mukmin'],
    41: ['fussilat','fushilat','yang dijelaskan'],
    42: ['syura','asy syura','musyawarah'],
    43: ['zukhruf','az zukhruf','perhiasan'],
    44: ['dukhan','ad dukhan','kabut'],
    45: ['jasiyah','al jasiyah','berlutut'],
    46: ['ahqaf','al ahqaf'],
    47: ['muhammad','nabi muhammad'],
    48: ['fath','al fath','kemenangan'],
    49: ['hujurat','al hujurat','kamar'],
    50: ['qaf','qa'],
    51: ['zariyat','az zariyat','angin yang menerbangkan'],
    52: ['tur','at tur','bukit'],
    53: ['najm','an najm','bintang'],
    54: ['qamar','al qamar','bulan'],
    55: ['rahman','ar rahman','arrohman','ar rohman','pemurah'],
    56: ['waqiah','al waqiah','alwaqiah','hari kiamat'],
    57: ['hadid','al hadid','besi'],
    58: ['mujadilah','al mujadilah','wanita yang mengajukan gugatan'],
    59: ['hasyr','al hasyr','pengusiran'],
    60: ['mumtahanah','al mumtahanah','wanita yang diuji'],
    61: ['saf','as saf','barisan'],
    62: ['jumuah','al jumuah','jumat','jum at'],
    63: ['munafiqun','al munafiqun','orang munafik'],
    64: ['tagabun','at tagabun','hari dinampakkan kesalahan'],
    65: ['talaq','at talaq','talak'],
    66: ['tahrim','at tahrim','mengharamkan'],
    67: ['mulk','al mulk','almulk','kerajaan'],
    68: ['qalam','al qalam','pena'],
    69: ['haqqah','al haqqah','hari kiamat'],
    70: ['maarij','al maarij','tempat naik'],
    71: ['nuh','nabi nuh'],
    72: ['jin','al jin'],
    73: ['muzammil','al muzammil','orang yang berselimut'],
    74: ['muddassir','al muddassir','orang yang berkemul'],
    75: ['qiyamah','al qiyamah','hari kiamat'],
    76: ['insan','al insan','manusia'],
    77: ['mursalat','al mursalat','malaikat yang diutus'],
    78: ['naba','an naba','annaba','berita besar'],
    79: ['naziat','an naziat','malaikat yang mencabut'],
    80: ['abasa','ia bermuka masam'],
    81: ['takwir','at takwir','menggulung'],
    82: ['infitar','al infitar','terbelah'],
    83: ['mutaffifin','al mutaffifin','orang yang curang'],
    84: ['insyiqaq','al insyiqaq','terbelah'],
    85: ['buruj','al buruj','gugusan bintang'],
    86: ['tariq','at tariq','yang datang malam hari'],
    87: ['ala','al ala','yang paling tinggi'],
    88: ['gasyiyah','al gasyiyah','hari kiamat'],
    89: ['fajr','al fajr','fajar'],
    90: ['balad','al balad','negeri'],
    91: ['syams','asy syams','matahari'],
    92: ['lail','al lail','malam'],
    93: ['duha','ad duha','adduha','waktu dhuha'],
    94: ['insyirah','al insyirah','alinsyirah','syarh','lapang dada'],
    95: ['tin','at tin','buah tin'],
    96: ['alaq','al alaq','segumpal darah'],
    97: ['qadr','al qadr','kemuliaan','lailatul qadr'],
    98: ['bayyinah','al bayyinah','bukti yang nyata'],
    99: ['zalzalah','az zalzalah','azzalzalah','goncangan'],
    100: ['adiyat','al adiyat','aladiyat','kuda perang'],
    101: ['qariah','al qariah','alqariah','hari kiamat'],
    102: ['takasur','at takasur','attakasur','bermegah megahan'],
    103: ['asr','al asr','alasr','masa'],
    104: ['humazah','al humazah','alhumazah','pengumpat'],
    105: ['fil','al fil','alfil','gajah'],
    106: ['quraisy','suku quraisy'],
    107: ['maun','al maun','almaun','barang yang berguna'],
    108: ['kautsar','al kautsar','alkautsar','nikmat yang banyak'],
    109: ['kafirun','al kafirun','alkafirun','orang kafir'],
    110: ['nasr','an nasr','annasr','pertolongan'],
    111: ['lahab','al lahab','allahab','gejolak api'],
    112: ['ikhlas','al ikhlas','alikhlas','memurnikan keesaan'],
    113: ['falaq','al falaq','alfalaq','waktu subuh'],
    114: ['nas','an nas','annas','manusia'],
};

function normStr(s) {
    return s.toLowerCase().replace(/['\-\.]/g,'').replace(/\s+/g,' ').trim();
}

function cariSurat(keyword) {
    const kw = normStr(keyword);
    // 1. Cari berdasarkan alias dulu
    for (const s of mengaji) {
        const aliases = suratAlias[s.nomor] || [];
        if (aliases.some(a => kw.includes(a) || a.includes(kw))) return s;
        // Cek nama asli
        const nama = normStr(s.nama);
        if (nama.includes(kw) || kw.includes(nama) || kw.includes(nama.split(' ').pop())) return s;
    }
    // 2. Fuzzy: cek kata-kata dalam keyword ada di alias
    const kwWords = kw.split(' ').filter(w => w.length > 3);
    for (const s of mengaji) {
        const aliases = suratAlias[s.nomor] || [];
        const allTerms = [normStr(s.nama), ...aliases].join(' ');
        if (kwWords.some(w => allTerms.includes(w))) return s;
    }
    return null;
}

function showMengajiPlayer(surat) {
    // Hentikan musik biasa jika sedang main
    if (typeof audio !== 'undefined' && !audio.paused) {
        audio.pause();
        if (typeof isPlaying !== 'undefined') isPlaying = false;
        if (typeof playBtn !== 'undefined') playBtn.textContent = '▶';
        if (typeof cd !== 'undefined') cd.classList.remove('playing');
    }
    // Hapus mini player musik dari chat jika ada
    if (typeof activeMiniPlayer !== 'undefined' && activeMiniPlayer) {
        activeMiniPlayer.remove();
        activeMiniPlayer = null;
    }
    if (typeof miniPlayerInterval !== 'undefined' && miniPlayerInterval) {
        clearInterval(miniPlayerInterval);
        miniPlayerInterval = null;
    }

    // Hentikan mengaji sebelumnya
    if (activeMengajiPlayer) {
        activeMengajiPlayer.remove();
        activeMengajiPlayer = null;
    }
    if (mengajiInterval) {
        clearInterval(mengajiInterval);
        mengajiInterval = null;
    }
    mengajiAudio.pause();
    mengajiAudio = new Audio(surat.url);

    const container = document.getElementById('chatContainer');

    // Buat elemen player secara manual (sama seperti addMessage)
    const wrap = document.createElement('div');
    wrap.className = 'message ai';
    wrap.style.cssText = 'display:flex;width:100%;margin-bottom:20px;';

    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = 'display:block;width:100%;max-width:100%;';

    const playerBox = document.createElement('div');
    playerBox.id = 'activeMengajiBox';
    playerBox.style.cssText = [
        'background:linear-gradient(135deg,rgba(20,60,40,0.97),rgba(10,40,25,0.97))',
        'border:2px solid rgba(80,200,120,0.5)',
        'border-radius:16px',
        'padding:16px',
        'box-shadow:0 0 24px rgba(80,200,120,0.3)',
        'display:block',
        'width:100%',
        'box-sizing:border-box',
        'color:#fff',
        'font-family:inherit',
    ].join(';');

    playerBox.innerHTML = `
        <div style="display:inline-flex;align-items:center;gap:6px;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.35);color:#4ade80;font-size:12px;padding:4px 12px;border-radius:99px;margin-bottom:12px;">
            <i class="fa-solid fa-quran"></i> Murottal Al-Quran
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
            <div style="width:52px;height:52px;background:linear-gradient(135deg,#1a7a40,#0d5c2e);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 0 12px rgba(80,200,120,0.4);flex-shrink:0;">🕌</div>
            <div style="flex:1;min-width:0;">
                <div style="font-size:15px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Surat ${surat.nama}</div>
                <div style="font-size:18px;color:#6ee096;margin:2px 0;direction:rtl;">${surat.arab}</div>
                <div style="font-size:11px;color:rgba(255,255,255,0.55);">Surah ke-${surat.nomor} • ${surat.ayat} Ayat • Qari: Mishary Alafasy</div>
            </div>
            <button id="mengajiPlayBtn" onclick="toggleMengaji()" style="width:44px;height:44px;border-radius:50%;border:none;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 14px rgba(34,197,94,0.5);">
                <i class="fa-solid fa-play"></i>
            </button>
        </div>
        <div id="mengajiSeekbar" style="width:100%;height:6px;background:rgba(255,255,255,0.15);border-radius:10px;cursor:pointer;margin-bottom:6px;position:relative;">
            <div id="mengajiProgress" style="height:100%;background:linear-gradient(90deg,#22c55e,#4ade80);border-radius:10px;width:0%;pointer-events:none;box-shadow:0 0 6px rgba(34,197,94,0.7);"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:rgba(255,255,255,0.5);padding:0 2px;">
            <span id="mengajiCurrent">0:00</span>
            <span id="mengajiDuration">0:00</span>
        </div>`;

    contentDiv.appendChild(playerBox);
    wrap.appendChild(contentDiv);
    container.appendChild(wrap);
    activeMengajiPlayer = wrap;
    scrollChatToBottom();

    // Seekbar klik
    document.getElementById('mengajiSeekbar').addEventListener('click', function(e) {
        if (!mengajiAudio.duration) return;
        const r = e.currentTarget.getBoundingClientRect();
        mengajiAudio.currentTime = ((e.clientX - r.left) / r.width) * mengajiAudio.duration;
    });

    // Auto play
    mengajiAudio.play().then(() => {
        const btn = document.getElementById('mengajiPlayBtn');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    }).catch(() => {});

    // Update progress
    mengajiInterval = setInterval(function() {
        const prog = document.getElementById('mengajiProgress');
        const curr = document.getElementById('mengajiCurrent');
        const dur  = document.getElementById('mengajiDuration');
        const btn  = document.getElementById('mengajiPlayBtn');
        if (!prog) { clearInterval(mengajiInterval); return; }
        if (mengajiAudio.duration) {
            prog.style.width = (mengajiAudio.currentTime / mengajiAudio.duration * 100) + '%';
            curr.textContent = formatTime(mengajiAudio.currentTime);
            dur.textContent  = formatTime(mengajiAudio.duration);
        }
        if (btn) btn.innerHTML = mengajiAudio.paused
            ? '<i class="fa-solid fa-play"></i>'
            : '<i class="fa-solid fa-pause"></i>';
    }, 500);
}

function toggleMengaji() {
    if (mengajiAudio.paused) { mengajiAudio.play(); }
    else { mengajiAudio.pause(); }
}

// Deteksi pertanyaan surat di chat — sebelum API call
function cekPertanyaanMengaji(message, lowerMessage) {
    const lm = normStr(lowerMessage);

    // Kata-kata yang menandakan request MUSIK (bukan ngaji) — skip
    const musikKeywords = ['lagu','musik','music','song','mp3','spotify','youtube','nyanyi','singer','artist','band','beat','remix'];
    if (musikKeywords.some(k => lm.includes(k))) return false;

    // Kata-kata yang menandakan user HANYA BERTANYA (bukan minta diputar) — serahkan ke AI
    const tanyaPatterns = [
        /^apakah/, /^apa itu/, /^apa kamu/, /^kamu tau/, /^kamu tahu/,
        /^tau gak/, /^tahu gak/, /^tau ga/, /^tahu ga/,
        /^cerita/, /^jelaskan/, /^berapa ayat/, /^berapa/, /^isi/,
        /^kandungan/, /^makna/, /^arti/, /^maksud/,
        /tau.*(surat|surah)/, /tahu.*(surat|surah)/,
        /apakah.*(surat|surah)/, /apa.*(surat|surah)/,
        /(surat|surah).*(itu|adalah|apa|artinya|maknanya)/
    ];
    if (tanyaPatterns.some(p => p.test(lm))) return false;

    // Kata yang jelas MINTA DIPUTAR
    const putarKeywords = ['putar','muter','dengarkan','dengerin','denger','dengar','mau dengerin',
        'mau denger','nyalain','nyalakan','play','murottal','ngaji','mengaji'];
    const mintaPutar = putarKeywords.some(k => lm.includes(k));

    // Cek nama surat spesifik
    let suratDitemukan = cariSurat(lm);

    // Tidak ada nama surat
    if (!suratDitemukan) {
        // Kalau minta putar tanpa nama surat, cek apakah ada konteks surat sebelumnya
        if (mintaPutar && lastMentionedSurat) {
            suratDitemukan = lastMentionedSurat;
        } else {
            const triggerKhusus = ['murottal','mengaji','ngaji'];
            if (!triggerKhusus.some(k => lm.includes(k))) return false;
            const response = 'Saya bisa memperdengarkan murottal Al-Quran 📖 Surat apa yang ingin Anda dengarkan? Contoh: Al-Fatihah, Yasin, Ar-Rahman, Al-Ikhlas, dan masih banyak lagi.';
            setTimeout(function() { addMessage(response, 'ai'); }, 400);
            return true;
        }
    }

    // Ada nama surat → simpan sebagai konteks terakhir
    lastMentionedSurat = suratDitemukan;

    // Ada nama surat tapi tidak ada kata minta putar → serahkan ke AI untuk dijawab
    // (tapi tetap simpan konteks suratnya)
    if (!mintaPutar) return false;

    // Ada nama surat + minta putar → tampilkan player
    const suratSimpan = suratDitemukan;
    setTimeout(function() {
        const infoMsg = document.createElement('div');
        infoMsg.className = 'message ai';
        infoMsg.style.cssText = 'display:flex;width:100%;margin-bottom:8px;';
        const infoContent = document.createElement('div');
        infoContent.style.cssText = 'display:block;width:100%;color:#ccc;font-size:14px;padding:4px 0;';
        infoContent.innerHTML = '🕌 Memutar murottal <b style="color:#4ade80;">' + suratSimpan.nama + '</b> (' + suratSimpan.arab + ') — Surah ke-' + suratSimpan.nomor + ' • ' + suratSimpan.ayat + ' ayat';
        infoMsg.appendChild(infoContent);
        document.getElementById('chatContainer').appendChild(infoMsg);
        scrollChatToBottom();
        setTimeout(function() { showMengajiPlayer(suratSimpan); }, 300);
    }, 400);
    return true;
}

function konfirmasiMengaji(ya) {
    const btnWrap = document.getElementById('mengajiBtnWrap');
    if (btnWrap) btnWrap.remove();
    if (ya && pendingMengaji) {
        const s = pendingMengaji;
        pendingMengaji = null;
        setTimeout(function() { showMengajiPlayer(s); }, 300);
    } else {
        pendingMengaji = null;
    }
}

// ===== VIDSNAP DOWNLOAD FEATURE =====
function cekDownloadVideo(message, lowerMessage) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = message.match(urlRegex);

    const downloadKeywords = ['download', 'unduh', 'simpan', 'dl', 'save video'];
    const isDownloadIntent = downloadKeywords.some(k => lowerMessage.includes(k));

    let url = null;

    // Cek ada URL YouTube/TikTok/Instagram di pesan
    if (urls) {
        url = urls.find(u =>
            u.includes('youtube.com') || u.includes('youtu.be') ||
            u.includes('tiktok.com') || u.includes('vm.tiktok.com') || u.includes('vt.tiktok.com') ||
            u.includes('instagram.com') || u.includes('instagr.am')
        );
    }

    if (!url && !isDownloadIntent) return false;
    if (!url && isDownloadIntent) {
        setTimeout(() => {
            addMessage('📥 Mau download? Kirim link YouTube, TikTok, atau Instagram-nya ya!\n\nContoh:\n• download https://youtube.com/watch?v=xxx\n• https://tiktok.com/@user/video/xxx\n• https://instagram.com/p/xxx', 'ai');
        }, 400);
        return true;
    }

    // Deteksi platform
    let platform = 'unknown';
    if (url.includes('youtube.com') || url.includes('youtu.be')) platform = 'youtube';
    else if (url.includes('tiktok.com')) platform = 'tiktok';
    else if (url.includes('instagram.com') || url.includes('instagr.am')) platform = 'instagram';

    // Tampilkan card download
    setTimeout(() => {
        showDownloadCard(url, platform);
    }, 400);
    return true;
}

function showDownloadCard(url, platform) {
    const container = document.getElementById('chatContainer');
    const wrap = document.createElement('div');
    wrap.className = 'message ai';
    wrap.style.cssText = 'display:flex;width:100%;margin-bottom:20px;';

    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = 'display:block;width:100%;max-width:100%;';

    const isYT = platform === 'youtube';
    const isIG = platform === 'instagram';
    const color = isYT ? '#ff3c3c' : isIG ? '#e040fb' : '#00f0c8';
    const colorBg = isYT ? 'rgba(255,60,60,0.12)' : isIG ? 'rgba(224,64,251,0.12)' : 'rgba(0,240,200,0.12)';
    const colorBorder = isYT ? 'rgba(255,60,60,0.35)' : isIG ? 'rgba(224,64,251,0.35)' : 'rgba(0,240,200,0.35)';
    const label = isYT ? 'YouTube' : isIG ? 'Instagram' : 'TikTok';
    const formats = ['mp4','mp3','720p','1080p'];
    const cardId = 'dl_' + Math.random().toString(36).substr(2,6);

    const card = document.createElement('div');
    card.id = cardId;
    card.dataset.color = color;
    card.dataset.colorBg = colorBg;
    card.dataset.colorBorder = colorBorder;
    card.style.cssText = [
        'background:linear-gradient(135deg,rgba(10,20,40,0.97),rgba(5,15,30,0.97))',
        `border:2px solid ${colorBorder}`,
        'border-radius:16px',
        'padding:16px',
        `box-shadow:0 0 24px ${colorBg}`,
        'width:100%',
        'max-width:100%',
        'box-sizing:border-box',
        'color:#fff',
        'font-family:inherit',
        'overflow:hidden',
        'word-break:break-word',
    ].join(';');

    card.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
            <div style="display:inline-flex;align-items:center;gap:6px;background:${colorBg};border:1px solid ${colorBorder};color:${color};font-size:12px;padding:4px 12px;border-radius:99px;">
                VidSnap · ${label} Downloader
            </div>
            <button onclick="vidSnapSetProxy()" title="Ganti URL Backend" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.5);border-radius:8px;padding:4px 8px;cursor:pointer;font-size:12px;">⚙️ URL</button>
        </div>
        <div style="font-size:11px;color:rgba(255,255,255,0.4);word-break:break-all;overflow-wrap:break-word;white-space:normal;margin-bottom:14px;background:rgba(0,0,0,0.3);padding:8px 12px;border-radius:8px;max-width:100%;overflow:hidden;">${url.length > 60 ? url.substring(0,60)+'...' : url}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
            ${formats.map(f => `
                <button onclick="vidSnapDownload('${cardId}','${url}','${f}')"
                    style="padding:9px 16px;border-radius:8px;border:1px solid ${colorBorder};background:${colorBg};color:${color};font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;font-family:inherit;"
                    onmouseover="this.style.opacity='.7'" onmouseout="this.style.opacity='1'">
                    ${f === 'mp4' ? 'MP4' : f === 'mp3' ? 'MP3' : f === '720p' ? '720p' : '1080p'}
                </button>`).join('')}
        </div>
        <div id="${cardId}_status" style="font-size:13px;color:rgba(255,255,255,0.5);display:none;"></div>
        <div id="${cardId}_result" style="margin-top:12px;display:none;"></div>
    `;

    contentDiv.appendChild(card);
    wrap.appendChild(contentDiv);
    container.appendChild(wrap);
    scrollChatToBottom();
}

// Auto-fetch URL tunnel dari server
const HARDCODED_BACKEND_URL = 'https://translations-stockholm-advertisers-hopes.trycloudflare.com';
let PROXY_URL = localStorage.getItem('vidsnap_proxy_url') || HARDCODED_BACKEND_URL;

// Otomatis update PROXY_URL dari server setiap buka halaman
(async function autoFetchTunnelUrl() {
  // Coba semua kandidat URL: localStorage dulu, baru hardcoded
  const candidates = [
    localStorage.getItem('vidsnap_proxy_url'),
    HARDCODED_BACKEND_URL
  ].filter(Boolean);

  for (const base of candidates) {
    try {
      const r = await fetch(base + '/api/proxy-url', {cache: 'no-store', signal: AbortSignal.timeout(5000)});
      const d = await r.json();
      if (d && d.url) {
        PROXY_URL = d.url;
        localStorage.setItem('vidsnap_proxy_url', PROXY_URL);
        console.log('✅ Tunnel URL aktif:', PROXY_URL);
        return;
      }
    } catch(e) {}
  }
  // Server tidak terjangkau, pakai URL tersimpan
})();

function vidSnapSetProxy() {
    const current = localStorage.getItem('vidsnap_proxy_url') || PROXY_URL;
    const newUrl = prompt('Masukkan URL backend (dari console Pterodactyl):', current);
    if (newUrl && newUrl.trim()) {
        PROXY_URL = newUrl.trim().replace(/\/$/, '');
        localStorage.setItem('vidsnap_proxy_url', PROXY_URL);
        alert('✅ URL backend disimpan: ' + PROXY_URL);
    }
}

async function vidSnapDownload(cardId, url, format) {
    const statusEl = document.getElementById(cardId + '_status');
    const resultEl = document.getElementById(cardId + '_result');
    const cardEl = document.getElementById(cardId);
    const dlColor = (cardEl && cardEl.dataset.color) || '#00f0c8';
    const dlColorBg = (cardEl && cardEl.dataset.colorBg) || 'rgba(0,240,200,0.1)';
    const dlColorBorder = (cardEl && cardEl.dataset.colorBorder) || 'rgba(0,240,200,0.35)';

    statusEl.style.display = 'block';
    statusEl.innerHTML = 'Memulai download...';
    resultEl.style.display = 'none';

    try {
        // Start job
        const startRes = await fetch(PROXY_URL + '/api/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, format })
        });
        const { job_id } = await startRes.json();

        // Progress bar
        resultEl.style.display = 'block';
        resultEl.innerHTML = `
            <div style="background:rgba(0,0,0,0.3);border-radius:8px;overflow:hidden;height:8px;margin-bottom:6px;">
                <div id="${cardId}_bar" style="height:100%;background:linear-gradient(90deg,#00f0c8,#00d9ff);width:0%;transition:width .5s;border-radius:8px;"></div>
            </div>
            <div id="${cardId}_pct" style="font-size:12px;color:rgba(255,255,255,0.5);text-align:center;">0%</div>
        `;

        // Poll status
        let done = false;
        for (let i = 0; i < 120; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const statusRes = await fetch(PROXY_URL + '/api/status/' + job_id);
            const job = await statusRes.json();

            const bar = document.getElementById(cardId + '_bar');
            const pct = document.getElementById(cardId + '_pct');
            if (bar) bar.style.width = job.progress + '%';
            if (pct) pct.textContent = job.progress + '%';

            if (job.status === 'done') {
                statusEl.style.display = 'none';
                if (job.is_zip && job.content_type === 'photos') {
                    // Foto/slideshow TikTok - download zip
                    resultEl.innerHTML = `
                        <div style="font-size:12px;color:rgba(255,255,255,0.5);text-align:center;margin-bottom:8px;">
                            📸 ${job.photo_count} foto ditemukan — dizip jadi 1 file
                        </div>
                        <a href="${PROXY_URL}/api/file/${job_id}" target="_blank" download="${job.filename}"
                            style="display:block;width:100%;padding:13px;text-align:center;background:${dlColorBg};border:1px solid ${dlColorBorder};border-radius:10px;color:${dlColor};font-weight:700;font-size:14px;text-decoration:none;box-sizing:border-box;">
                            📥 Download ${job.photo_count} Foto (ZIP)
                        </a>
                    `;
                } else {
                    resultEl.innerHTML = `
                        <a href="${PROXY_URL}/api/file/${job_id}" target="_blank" download="${job.filename || 'video.mp4'}"
                            style="display:block;width:100%;padding:13px;text-align:center;background:${dlColorBg};border:1px solid ${dlColorBorder};border-radius:10px;color:${dlColor};font-weight:700;font-size:14px;text-decoration:none;box-sizing:border-box;">
                            📥 Download
                        </a>
                        ${job.filename && job.filename !== 'undefined' ? `<div style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:6px;text-align:center;">${job.filename}</div>` : ''}
                    `;
                }
                done = true;
                break;
            } else if (job.status === 'error') {
                statusEl.innerHTML = '❌ ' + (job.error.includes('Unsupported') ? 'Konten tidak didukung (coba URL video langsung)' : job.error);
                resultEl.style.display = 'none';
                done = true;
                break;
            }
        }
        if (!done) statusEl.innerHTML = 'Timeout. Coba video yang lebih pendek.';
    } catch(e) {
        statusEl.innerHTML = 'Gagal konek ke proxy. Coba lagi.';
    }
    scrollChatToBottom();
}
// ===== END VIDSNAP =====

// Close modals on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeSettings();
        closeInfo();
    }
});

// Prevent form submission
document.addEventListener('submit', (e) => {
    e.preventDefault();
});




// ═══════════════════════════════════════════════
// Z-TOOLS — Wikipedia, Random Anime, Cek Nomor HP
// ═══════════════════════════════════════════════

let ztLang = 'id';
let ztAnimeCat = 'waifu';
let ztFmt = 'mp4';

// ── Tab switcher ──
function ztSwitchTab(tab) {
  document.querySelectorAll('.zt-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.zt-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('zt-' + tab).classList.add('active');
  event.target.closest('.zt-tab').classList.add('active');
}

// ── Format switcher ──
function ztSetFmt(btn, fmt) {
  ztFmt = fmt;
  btn.closest('.zt-fmt-btns').querySelectorAll('.zt-fmt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ── Proxy URL save/load ──// Auto-load proxy URL saat halaman buka
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('vidsnap_proxy_url') || '';
  ['zt-proxy-input','zt-proxy-input-ig'].forEach(id => {
    const el = document.getElementById(id);
    if (el && saved) el.value = saved;
  });
});

// ── Set anime category ──
function ztSetAnimeCat(cat, btn) {
  ztAnimeCat = cat;
  document.querySelectorAll('.zt-cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ══════════════════════════════
// WIKIPEDIA SEARCH
// ══════════════════════════════
// Wikipedia vars
let ztWikiPage = 1;
let ztWikiLastQ = '';
let ztWikiHits = [];

function ztSetLang(lang, btn) {
  ztLang = lang;
  document.querySelectorAll('.zt-wiki-lang-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const q = document.getElementById('zt-wiki-input').value.trim();
  if (q) ztSearchWiki();
}

async function ztSearchWiki(loadMore) {
  loadMore = loadMore || false;
  const q = document.getElementById('zt-wiki-input').value.trim();
  const res = document.getElementById('zt-wiki-result');
  if (!q) return;

  if (!loadMore) {
    ztWikiPage = 1;
    ztWikiHits = [];
    res.innerHTML = '<div class="zt-loading"><i class="fas fa-spinner fa-spin"></i> Mencari di Wikipedia...</div>';
  }

  const offset = (ztWikiPage - 1) * 10;

  try {
    const searchUrl = 'https://' + ztLang + '.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(q) + '&format=json&origin=*&srlimit=10&sroffset=' + offset;
    const searchData = await (await fetch(searchUrl)).json();
    const newHits = searchData.query?.search || [];
    const totalHits = searchData.query?.searchinfo?.totalhits || 0;
    ztWikiHits = loadMore ? [...ztWikiHits, ...newHits] : newHits;

    if (!ztWikiHits.length) {
      res.innerHTML = '<div class="zt-empty"><i class="fas fa-search"></i><p>Tidak ditemukan untuk "<b>' + q + '</b>"</p></div>';
      return;
    }

    const title = ztWikiHits[0].title;
    const data = await (await fetch('https://' + ztLang + '.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title))).json();
    const thumb = data.thumbnail?.source || '';
    const pageUrl = data.content_urls?.desktop?.page || 'https://' + ztLang + '.wikipedia.org/wiki/' + encodeURIComponent(title);
    const fullExtract = data.extract || '';

    const otherHits = ztWikiHits.slice(1).map(function(h) {
      return '<div class="zt-wiki-other" onclick="ztLoadWikiByTitle(\'' + h.title.replace(/'/g,"\'") + '\')">' +
        '<i class="fas fa-file-alt"></i> ' + h.title + '</div>';
    }).join('');

    const hasMore = (ztWikiPage * 10) < Math.min(totalHits, 50);

    res.innerHTML =
      '<div class="zt-wiki-card">' +
        (thumb ? '<img class="zt-wiki-thumb" src="' + thumb + '" onerror="this.style.display=\'none\'">' : '') +
        '<div class="zt-wiki-body">' +
          '<h2 class="zt-wiki-title">' + data.title + '</h2>' +
          (data.description ? '<p class="zt-wiki-desc-label">' + data.description + '</p>' : '') +
          '<p class="zt-wiki-extract">' + fullExtract + '</p>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">' +
            '<button class="zt-wiki-read-full" onclick="ztWikiOpenReader(\'' + encodeURIComponent(title) + '\',\'' + encodeURIComponent(pageUrl) + '\')">' +
              '<i class="fas fa-book-open"></i> Baca Artikel Penuh' +
            '</button>' +
            '<a class="zt-wiki-link" href="' + pageUrl + '" target="_blank"><i class="fab fa-wikipedia-w"></i> Wikipedia</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
      (otherHits ? '<div class="zt-wiki-others"><p>' + (ztWikiHits.length-1) + ' hasil lain dari ' + totalHits.toLocaleString() + ' total:</p>' + otherHits + '</div>' : '') +
      (hasMore ? '<button class="zt-wiki-more-btn" onclick="ztWikiLoadMore()"><i class="fas fa-plus"></i> Muat Lebih Banyak</button>' : '');

    ztWikiPage++;
  } catch (e) {
    if (!loadMore) res.innerHTML = '<div class="zt-empty"><i class="fas fa-exclamation-triangle"></i><p>Gagal mengambil data.</p></div>';
  }
}

function ztWikiLoadMore() { ztSearchWiki(true); }

async function ztLoadWikiByTitle(title) {
  document.getElementById('zt-wiki-input').value = title;
  ztWikiPage = 1; ztWikiHits = [];
  ztSearchWiki();
}

async function ztWikiOpenReader(encodedTitle, encodedUrl) {
  const title = decodeURIComponent(encodedTitle);
  const pageUrl = decodeURIComponent(encodedUrl);
  const reader = document.getElementById('zt-wiki-reader');
  const body = document.getElementById('zt-wiki-reader-body');
  document.getElementById('zt-wiki-reader-title').textContent = title;
  document.getElementById('zt-wiki-reader-ext').href = pageUrl;
  body.innerHTML = '<div class="zt-loading"><i class="fas fa-spinner fa-spin"></i> Memuat artikel...</div>';
  reader.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  try {
    const r = await fetch('https://' + ztLang + '.wikipedia.org/api/rest_v1/page/mobile-html/' + encodeURIComponent(title));
    const rawHtml = await r.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    doc.querySelectorAll('script,style,.noprint,.mw-editsection,.reference,.reflist,sup,.toc').forEach(function(el){el.remove();});
    const content = doc.querySelector('section') || doc.querySelector('article') || doc.body;
    if (content) {
      content.querySelectorAll('img').forEach(function(img){
        const src = img.getAttribute('src')||'';
        if(src.startsWith('//')) img.src='https:'+src;
      });
      content.querySelectorAll('a').forEach(function(a){
        const href = a.getAttribute('href')||'';
        if(href.startsWith('/wiki/')){
          const t = href.replace('/wiki/','');
          a.href='#';
          a.onclick=function(e){e.preventDefault();ztWikiCloseReader();document.getElementById('zt-wiki-input').value=decodeURIComponent(t);ztSearchWiki();};
        }
      });
      body.innerHTML = content.innerHTML;
    }
  } catch(e) {
    body.innerHTML = '<div class="zt-empty"><i class="fas fa-exclamation-triangle"></i><p>Gagal: ' + e.message + '</p></div>';
  }
}

function ztWikiCloseReader() {
  document.getElementById('zt-wiki-reader').style.display = 'none';
  document.body.style.overflow = '';
}


// ══════════════════════════════
// RANDOM ANIME
// ══════════════════════════════
async function ztRandomAnime() {
  const res = document.getElementById('zt-anime-result');
  res.innerHTML = '<div class="zt-loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

  try {
    const r = await fetch(`https://api.waifu.pics/sfw/${ztAnimeCat}`);
    const data = await r.json();
    const url = data.url;
    if (!url) throw new Error('No URL');

    res.innerHTML = `
      <div class="zt-anime-img-wrap">
        <img class="zt-anime-img" src="${url}" alt="anime" onclick="window.open('${url}','_blank')">
        <div class="zt-anime-actions">
          <button onclick="ztRandomAnime()"><i class="fas fa-random"></i> Refresh</button>
          <a href="${url}" download target="_blank"><i class="fas fa-download"></i> Simpan</a>
        </div>
      </div>
    `;
  } catch (e) {
    res.innerHTML = '<div class="zt-empty"><i class="fas fa-exclamation-triangle"></i><p>Gagal load gambar. Coba lagi!</p></div>';
  }
}

// ══════════════════════════════
// DOWNLOAD TIKTOK & INSTAGRAM
// ══════════════════════════════
async function ztDownload(platform) {
  const inputId = platform === 'tiktok' ? 'zt-tiktok-input' : 'zt-ig-input';
  const resultId = platform === 'tiktok' ? 'zt-tiktok-result' : 'zt-ig-result';
  const url = document.getElementById(inputId).value.trim();
  const res = document.getElementById(resultId);

  if (!url) return;

  // Selalu baca dari localStorage langsung — paling fresh
  const proxy = (localStorage.getItem('vidsnap_proxy_url') || '').replace(/\/$/, '');

  if (!proxy) {
    res.innerHTML = '<div class="zt-empty"><i class="fas fa-exclamation-triangle"></i><p>URL backend belum disimpan! Paste URL Cloudflare di kotak kuning lalu klik <b>Simpan</b>.</p></div>';
    return;
  }

  if (platform === 'tiktok' && !url.includes('tiktok.com') && !url.includes('vm.tiktok') && !url.includes('vt.tiktok')) {
    res.innerHTML = '<div class="zt-empty"><i class="fas fa-times-circle"></i><p>URL bukan TikTok yang valid!</p></div>';
    return;
  }
  if (platform === 'ig' && !url.includes('instagram.com') && !url.includes('instagr.am')) {
    res.innerHTML = '<div class="zt-empty"><i class="fas fa-times-circle"></i><p>URL bukan Instagram yang valid!</p></div>';
    return;
  }

  res.innerHTML = '<div class="zt-loading"><i class="fas fa-spinner fa-spin"></i> <span id="zt-dl-status-' + platform + '">Memulai download...</span></div>';

  try {
    const startRes = await fetch(proxy + '/api/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url, format: ztFmt })
    });

    if (!startRes.ok) throw new Error('Server error: ' + startRes.status);

    const { job_id, error } = await startRes.json();
    if (!job_id) throw new Error(error || 'Gagal mulai download');

    const poll = setInterval(async () => {
      try {
        const statusRes = await fetch(proxy + '/api/status/' + job_id);
        const job = await statusRes.json();

        const statusEl = document.getElementById('zt-dl-status-' + platform);
        if (statusEl) statusEl.textContent = (job.status_text || 'Downloading...') + ' ' + (job.progress || 0) + '%';

        if (job.status === 'done') {
          clearInterval(poll);
          const dlUrl = proxy + '/api/file/' + job_id;
          const ext = (job.filename || '').split('.').pop() || ztFmt;
          const sizeMb = job.size_mb ? job.size_mb.toFixed(2) + ' MB' : '';
          const isZip = job.is_zip;
          const isAudio = ext === 'mp3';
          const icon = isZip ? '🗂️' : isAudio ? '🎵' : '📹';
          const typeLabel = isZip ? 'Foto (ZIP)' : isAudio ? 'Audio MP3' : 'Video MP4';
          const videoTitle = job.title && job.title !== job.filename ? job.title : '';
          res.innerHTML = `
            <div class="zt-dl-result-card">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
                <span style="font-size:28px">${icon}</span>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:13px;color:#0f0;font-weight:700;margin-bottom:2px;">✅ Download Selesai!</div>
                  ${videoTitle ? `<div style="font-size:15px;color:#fff;font-weight:700;line-height:1.3;word-break:break-word;">${videoTitle}</div>` : ''}
                  <div style="font-size:12px;color:#888;margin-top:3px;">${typeLabel}${sizeMb ? ' · ' + sizeMb : ''}</div>
                </div>
              </div>
              <a href="${dlUrl}" target="_blank" download="${job.filename || 'file.' + ext}" style="margin-top:0;">
                <i class="fas fa-download"></i> Download ${typeLabel}
              </a>
            </div>`;
        } else if (job.status === 'error') {
          clearInterval(poll);
          res.innerHTML = `<div class="zt-empty"><i class="fas fa-times-circle"></i><p>${job.error || 'Download gagal'}</p></div>`;
        }
      } catch(e) {
        clearInterval(poll);
        res.innerHTML = `<div class="zt-empty"><i class="fas fa-exclamation-triangle"></i><p>Koneksi ke server terputus</p></div>`;
      }
    }, 1500);

  } catch(e) {
    res.innerHTML = `<div class="zt-empty"><i class="fas fa-exclamation-triangle"></i><p>${e.message}</p></div>`;
  }
}
// ══════════════════════════════
async function ztCheckPhone() {
  const raw = document.getElementById('zt-phone-input').value.trim().replace(/[\s\-\.]/g, '');
  const res = document.getElementById('zt-phone-result');
  if (!raw) return;

  let num = raw;
  if (num.startsWith('+62')) num = '0' + num.slice(3);
  else if (num.startsWith('62')) num = '0' + num.slice(2);

  if (!num.startsWith('0') || num.length < 9 || num.length > 14) {
    res.innerHTML = '<div class="zt-empty"><i class="fas fa-times-circle"></i><p>Format nomor tidak valid!</p></div>';
    return;
  }

  // Loading bertahap
  const loadSteps = [
    { icon: 'fa-search',           text: 'Proses mengecek nomer...' },
    { icon: 'fa-broadcast-tower',  text: 'Mencari jaringan operator...' },
    { icon: 'fa-map-marker-alt',   text: 'Mencari lokasi terkini...' },
  ];
  for (const step of loadSteps) {
    const baseText = step.text.replace(/\.\.\.$/,'');
    res.innerHTML = `<div class="zt-loading"><i class="fas ${step.icon} zt-pulse-icon"></i> ${baseText}<span class="zt-dot zt-dot1">.</span><span class="zt-dot zt-dot2">.</span><span class="zt-dot zt-dot3">.</span></div>`;
    await new Promise(r => setTimeout(r, 5000));
  }

  const operators = [
    { prefix: ['0811','0812','0813','0821','0822','0823','0852','0853'], name: 'Telkomsel', icon: 'fa-sim-card', color: '#e60000', type: '4G/LTE', jaringan: 'GSM' },
    { prefix: ['0851'], name: 'by.U', icon: 'fa-sim-card', color: '#ff4d6d', type: '4G/LTE', jaringan: 'GSM' },
    { prefix: ['0814','0815','0816','0855','0856','0857','0858'], name: 'Indosat Ooredoo', icon: 'fa-sim-card', color: '#ffcc00', type: '4G/LTE', jaringan: 'GSM' },
    { prefix: ['0817','0818','0819','0859','0877','0878'], name: 'XL Axiata', icon: 'fa-sim-card', color: '#0066cc', type: '4G/LTE', jaringan: 'GSM' },
    { prefix: ['0831','0832','0833','0838'], name: 'Axis', icon: 'fa-sim-card', color: '#9333ea', type: '4G/LTE', jaringan: 'GSM' },
    { prefix: ['0895','0896','0897','0898','0899'], name: 'Tri (3)', icon: 'fa-sim-card', color: '#888', type: '4G/LTE', jaringan: 'GSM' },
    { prefix: ['0881','0882','0883','0884','0885','0886','0887','0888','0889'], name: 'Smartfren', icon: 'fa-sim-card', color: '#00aa44', type: '4G/VoLTE', jaringan: 'CDMA' },
  ];

  let found = null;
  for (const op of operators) {
    for (const p of op.prefix) {
      if (num.startsWith(p)) { found = op; break; }
    }
    if (found) break;
  }

  const intlFormat = '+62' + num.slice(1);
  const waLink = 'https://wa.me/' + intlFormat.replace('+','');
  const telLink = 'tel:' + intlFormat;
  const smsLink = 'sms:' + intlFormat;
  const op = found || { name: 'Tidak Dikenal', icon: 'fa-question-circle', color: '#555', type: '-', jaringan: '-' };

  // Ambil IP user
  let ipInfo = null;
  try {
    const r = await fetch('https://ipwho.is/');
    ipInfo = await r.json();
  } catch(e) {}

  // GPS lokasi
  const gpsReady = typeof userLocation !== 'undefined' && userLocation !== null;
  const gpsText = gpsReady ? userLocation.replace(/\s*\(koordinat:.*?\)/, '').trim() : null;
  const coordMatch = gpsReady && userLocation ? userLocation.match(/koordinat: ([\d\.\-]+), ([\d\.\-]+)/) : null;
  const mapUrl = coordMatch ? 'https://www.google.com/maps?q=' + coordMatch[1] + ',' + coordMatch[2] : '';

  res.innerHTML = `
    <div class="zt-phone-card">
      <div class="zt-phone-badge" style="background:${op.color}18;border-color:${op.color}44">
        <div style="width:44px;height:44px;border-radius:12px;background:${op.color}22;display:flex;align-items:center;justify-content:center;">
          <i class="fas ${op.icon}" style="color:${op.color};font-size:20px"></i>
        </div>
        <div>
          <div class="zt-phone-opname" style="color:${op.color}">${op.name}</div>
          <div style="font-size:11px;color:#666;margin-top:2px;">${op.jaringan} · ${op.type}</div>
        </div>
      </div>
      <div class="zt-phone-rows">
        <div class="zt-phone-row"><span><i class="fas fa-phone" style="color:#22c55e"></i> Nomor Lokal</span><b>${num}</b></div>
        <div class="zt-phone-row"><span><i class="fas fa-globe" style="color:#3b82f6"></i> Internasional</span><b>${intlFormat}</b></div>
        <div class="zt-phone-row"><span><i class="fas fa-flag" style="color:#ef4444"></i> Negara</span><b>Indonesia (ID)</b></div>
        <div class="zt-phone-row"><span><i class="fas fa-sim-card" style="color:${op.color}"></i> Operator</span><b>${op.name}</b></div>
        <div class="zt-phone-row"><span><i class="fas fa-broadcast-tower" style="color:#f59e0b"></i> Jaringan</span><b>${op.jaringan}</b></div>
        <div class="zt-phone-row"><span><i class="fas fa-signal" style="color:#06b6d4"></i> Tipe</span><b>${op.type}</b></div>
        <div class="zt-phone-row"><span><i class="fas fa-hashtag" style="color:#94a3b8"></i> Panjang</span><b>${num.length} digit</b></div>
        ${ipInfo && ipInfo.ip ? '<div class="zt-phone-row"><span><i class="fas fa-network-wired" style="color:#00d9ff"></i> IP Kamu</span><b>' + ipInfo.ip + '</b></div>' : ''}
        ${ipInfo && ipInfo.isp ? '<div class="zt-phone-row"><span><i class="fas fa-satellite-dish" style="color:#a78bfa"></i> ISP</span><b>' + ipInfo.isp + '</b></div>' : ''}
        ${gpsText ? '<div class="zt-phone-row"><span><i class="fas fa-map-marker-alt" style="color:#22c55e"></i> Lokasi GPS</span><b>' + gpsText + '</b></div>' : '<div class="zt-phone-row"><span><i class="fas fa-map-marker-alt" style="color:#555"></i> Lokasi</span><b style="color:#555">GPS belum diizinkan</b></div>'}
      </div>
      <div class="zt-phone-actions">
        <a class="zt-wa-btn" href="${waLink}" target="_blank"><i class="fab fa-whatsapp"></i> WhatsApp</a>
        <a class="zt-phone-call-btn" href="${telLink}"><i class="fas fa-phone"></i> Telepon</a>
        <a class="zt-phone-sms-btn" href="${smsLink}"><i class="fas fa-sms"></i> SMS</a>
      </div>
      ${mapUrl ? '<a href="' + mapUrl + '" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;background:rgba(0,217,255,0.08);border:1px solid rgba(0,217,255,0.2);border-radius:12px;color:#00d9ff;text-decoration:none;font-size:13px;font-weight:700;margin-top:10px;"><i class="fas fa-map-marker-alt"></i> Lihat Lokasi di Google Maps</a>' : ''}
    </div>
  `;

  // Kirim info cek nomor ke server untuk ditampilkan di console Pterodactyl
  try {
    const _proxyBase = (typeof PROXY_URL !== 'undefined' ? PROXY_URL : localStorage.getItem('vidsnap_proxy_url') || '').replace(/\/+$/, '');
    if (_proxyBase) {
      fetch(_proxyBase + '/api/log-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: num,
          intl: intlFormat,
          operator: op.name,
          jaringan: op.jaringan,
          type: op.type,
          ip: ipInfo ? ipInfo.ip : null,
          isp: ipInfo ? ipInfo.isp : null,
          location: gpsText || null,
          coords: coordMatch ? { lat: coordMatch[1], lon: coordMatch[2] } : null
        })
      }).catch(() => {});
    }
  } catch(e) {}
}

/* Tab scroll arrow buttons */
function ztTabScroll(dir) {
  const tabs = document.getElementById('zt-tabs-scroll');
  if (!tabs) return;
  tabs.scrollBy({ left: dir * 120, behavior: 'smooth' });
}
function ztTabArrowUpdate() {
  const tabs = document.getElementById('zt-tabs-scroll');
  const btnL = document.getElementById('zt-arr-left');
  const btnR = document.getElementById('zt-arr-right');
  if (!tabs || !btnL || !btnR) return;

  const atStart = tabs.scrollLeft <= 4;
  const atEnd   = tabs.scrollLeft + tabs.clientWidth >= tabs.scrollWidth - 4;

  // Hanya 1 yang keliatan:
  // - Di awal (atStart): kanan keliatan, kiri hidden
  // - Di tengah: kanan keliatan (masih bisa scroll kanan), kiri hidden
  //   KECUALI udah mentok kanan (atEnd): kiri keliatan, kanan hidden
  if (atEnd && !atStart) {
    btnL.classList.remove('hidden');
    btnR.classList.add('hidden');
  } else {
    btnL.classList.add('hidden');
    btnR.classList.remove('hidden');
  }
}
(function() {
  const tabs = document.getElementById('zt-tabs-scroll');
  if (!tabs) return;
  tabs.addEventListener('scroll', ztTabArrowUpdate);
  // jalankan update setelah DOM siap + setelah font load
  setTimeout(ztTabArrowUpdate, 100);
  setTimeout(ztTabArrowUpdate, 600);
  window.addEventListener('load', ztTabArrowUpdate);
})();

/* =====================================================
   NGAJI JS — cyan edition, custom player
   ===================================================== */
let ztNgajiCurrentIdx = -1;
let ztNgajiFiltered   = [];
let ztNgpIsPlaying    = false;
let ztNgpRafId        = null;

function ztNgajiInit() {
  ztNgajiFiltered = [...mengaji];
  ztNgajiRender(ztNgajiFiltered);
  // top card & player hidden saat awal
}

function ztNgajiRender(list) {
  const wrap = document.getElementById('zt-surah-list');
  if (!list.length) {
    wrap.innerHTML = '<div class="zt-surah-empty"><i class="fas fa-search"></i><br>Surah tidak ditemukan</div>';
    return;
  }
  wrap.innerHTML = list.map(s => {
    const isPlay = ztNgajiCurrentIdx !== -1 && mengaji[ztNgajiCurrentIdx]?.nomor === s.nomor;
    return `<div class="zt-surah-item${isPlay ? ' playing' : ''}" onclick="ztNgajiPlay(${s.nomor - 1})">
      <div class="zt-surah-nomor">${s.nomor}</div>
      <div class="zt-surah-info-col">
        <div class="zt-surah-nama">${s.nama}</div>
        <div class="zt-surah-keterangan">${s.ayat} Ayat</div>
      </div>
      <div class="zt-surah-arab-col">
        <div class="zt-surah-arab-text">${s.arab}</div>
      </div>
      <div class="zt-surah-play-icon">
        <i class="fas fa-${isPlay ? 'volume-up' : 'play'}"></i>
      </div>
    </div>`;
  }).join('');
}

function ztNgajiFilter(q) {
  const lw = q.toLowerCase().trim();
  ztNgajiFiltered = lw
    ? mengaji.filter(s => s.nama.toLowerCase().includes(lw) || s.arab.includes(q) || String(s.nomor) === lw)
    : [...mengaji];
  ztNgajiRender(ztNgajiFiltered);
}

function ztNgajiClear() {
  document.getElementById('zt-ngaji-search').value = '';
  ztNgajiFiltered = [...mengaji];
  ztNgajiRender(ztNgajiFiltered);
}

function ztNgajiPlay(idx) {
  ztNgajiCurrentIdx = idx;
  const s = mengaji[idx];
  if (!s) return;

  const audio = document.getElementById('zt-ngaji-audio');
  audio.src = s.url;
  audio.load();
  audio.play();

  // update display
  document.getElementById('zt-ngp-name').textContent  = s.nama;
  document.getElementById('zt-ngp-arab').textContent  = s.arab;
  document.getElementById('zt-ngp-meta').textContent  = 'Surah ke-' + s.nomor + ' · ' + s.ayat + ' Ayat';
  document.getElementById('zt-ngp-cur').textContent   = '0:00';
  document.getElementById('zt-ngp-dur').textContent   = '0:00';
  document.getElementById('zt-ngp-fill').style.width  = '0%';

  // show player + header
  const player = document.getElementById('zt-ngaji-player');
  player.classList.add('visible');


  // disable / enable nav
  document.getElementById('zt-ngp-prev').disabled = idx <= 0;
  document.getElementById('zt-ngp-next').disabled = idx >= mengaji.length - 1;

  // re-render list
  const q = document.getElementById('zt-ngaji-search').value;
  ztNgajiFilter(q);
}

/* play/pause toggle */
function ztNgpToggle() {
  const audio = document.getElementById('zt-ngaji-audio');
  if (!audio.src || !ztNgajiCurrentIdx === -1) return;
  audio.paused ? audio.play() : audio.pause();
}

/* timeupdate → update bar + timer */
function ztNgpTick() {
  const audio = document.getElementById('zt-ngaji-audio');
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  document.getElementById('zt-ngp-fill').style.width = pct + '%';
  document.getElementById('zt-ngp-cur').textContent  = ztNgpFmt(audio.currentTime);
}

function ztNgpMeta() {
  const audio = document.getElementById('zt-ngaji-audio');
  document.getElementById('zt-ngp-dur').textContent = ztNgpFmt(audio.duration);
}

function ztNgpFmt(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

/* seek on track click */
function ztNgpSeek(e) {
  const audio  = document.getElementById('zt-ngaji-audio');
  const track  = document.getElementById('zt-ngp-track');
  if (!audio.duration) return;
  const rect   = track.getBoundingClientRect();
  const ratio  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  audio.currentTime = ratio * audio.duration;
}

/* on play/pause events */
function ztNgpPlay() {
  ztNgpIsPlaying = true;
  document.getElementById('zt-ngp-disc').classList.add('spinning');
  document.getElementById('zt-ngp-eq').classList.remove('paused');
  const icon = document.getElementById('zt-ngp-pp-icon');
  if (icon) { icon.className = 'fas fa-pause'; }
}
function ztNgpPause() {
  ztNgpIsPlaying = false;
  document.getElementById('zt-ngp-disc').classList.remove('spinning');
  document.getElementById('zt-ngp-eq').classList.add('paused');
  const icon = document.getElementById('zt-ngp-pp-icon');
  if (icon) { icon.className = 'fas fa-play'; }
}

function ztNgajiNext() { if (ztNgajiCurrentIdx < mengaji.length - 1) ztNgajiPlay(ztNgajiCurrentIdx + 1); }
function ztNgajiPrev() { if (ztNgajiCurrentIdx > 0) ztNgajiPlay(ztNgajiCurrentIdx - 1); }

/* Patch ztSwitchTab */
const _ztOrigSwitch2 = ztSwitchTab;
let _ztNgajiInited = false;
ztSwitchTab = function(tab) {
  document.querySelectorAll('.zt-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.zt-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('zt-' + tab).classList.add('active');
  event.target.closest('.zt-tab').classList.add('active');
  if (tab === 'ngaji' && !_ztNgajiInited) {
    _ztNgajiInited = true;
    ztNgajiInit();
  }
};



// ══════════════════════════════
// IP & LOKASI
// ══════════════════════════════
function ztIpBuildCard(d, gpsGranted) {
  var isp = d.org || d.asn || '-';
  var hasCoord = gpsGranted && d.latitude && d.longitude;
  var mapUrl = hasCoord ? 'https://www.google.com/maps?q=' + d.latitude + ',' + d.longitude : '';

  // Battery bar
  var batHtml = '';
  if (d._battery !== null && d._battery !== undefined) {
    var lvl = d._battery.level;
    var charging = d._battery.charging;
    var batColor = lvl > 60 ? '#22c55e' : lvl > 20 ? '#f59e0b' : '#ef4444';
    var batIcon = charging ? 'fa-bolt' : lvl > 60 ? 'fa-battery-full' : lvl > 40 ? 'fa-battery-half' : lvl > 15 ? 'fa-battery-quarter' : 'fa-battery-empty';
    batHtml = '<div class="zt-ip-bat-wrap">'
      + '<div class="zt-ip-bat-header"><i class="fas ' + batIcon + '" style="color:' + batColor + '"></i> <span>Baterai</span>'
      + (charging ? '<span class="zt-ip-charging"><i class="fas fa-bolt"></i> Charging</span>' : '')
      + '<b style="color:' + batColor + '">' + lvl + '%</b></div>'
      + '<div class="zt-ip-bat-bar"><div class="zt-ip-bat-fill" style="width:' + lvl + '%;background:' + batColor + '"></div></div>'
      + '</div>';
  }

  var rows = '';
  // Network section
  rows += '<div class="zt-ip-section-title"><i class="fas fa-network-wired" style="color:#00d9ff"></i> Jaringan</div>';
  if (d.country_name) rows += '<div class="zt-ip-row"><span><i class="fas fa-flag" style="color:#3b82f6"></i> Negara</span><b>' + d.country_name + (d.country_code ? ' (' + d.country_code + ')' : '') + '</b></div>';
  if (gpsGranted && d._gps_location) {
    rows += '<div class="zt-ip-row"><span><i class="fas fa-map-marker-alt" style="color:#22c55e"></i> Lokasi GPS</span><b>' + d._gps_location + '</b></div>';
  } else {
    rows += '<div class="zt-ip-row"><span><i class="fas fa-map-marker-alt" style="color:#ef4444"></i> Lokasi</span><b style="color:#555">— Izinkan GPS dulu</b></div>';
  }
  if (d.timezone) rows += '<div class="zt-ip-row"><span><i class="fas fa-clock" style="color:#a78bfa"></i> Timezone</span><b>' + d.timezone + '</b></div>';
  if (isp !== '-') rows += '<div class="zt-ip-row"><span><i class="fas fa-satellite-dish" style="color:#f59e0b"></i> ISP</span><b>' + isp + '</b></div>';
  if (d.asn)       rows += '<div class="zt-ip-row"><span><i class="fas fa-hashtag" style="color:#94a3b8"></i> ASN</span><b>' + d.asn + '</b></div>';
  if (hasCoord)    rows += '<div class="zt-ip-row"><span><i class="fas fa-crosshairs" style="color:#06b6d4"></i> Koordinat</span><b>' + d.latitude + ', ' + d.longitude + '</b></div>';
  if (d.currency)  rows += '<div class="zt-ip-row"><span><i class="fas fa-coins" style="color:#eab308"></i> Mata Uang</span><b>' + (d.currency_name || '') + ' (' + d.currency + ')</b></div>';

  // Connection section
  if (d._connection) {
    rows += '<div class="zt-ip-section-title"><i class="fas fa-wifi" style="color:#22c55e"></i> Koneksi</div>';
    rows += '<div class="zt-ip-row"><span><i class="fas fa-signal" style="color:#22c55e"></i> Tipe</span><b>' + d._connection.type.toUpperCase() + '</b></div>';
    if (d._connection.downlink) rows += '<div class="zt-ip-row"><span><i class="fas fa-tachometer-alt" style="color:#f59e0b"></i> Kecepatan</span><b>' + d._connection.downlink + ' Mbps</b></div>';
    if (d._connection.rtt)      rows += '<div class="zt-ip-row"><span><i class="fas fa-bolt" style="color:#fbbf24"></i> Ping</span><b>' + d._connection.rtt + ' ms</b></div>';
    rows += '<div class="zt-ip-row"><span><i class="fas fa-leaf" style="color:#86efac"></i> Hemat Data</span><b>' + (d._connection.saveData ? 'Aktif' : 'Nonaktif') + '</b></div>';
    rows += '<div class="zt-ip-row"><span><i class="fas fa-circle" style="color:#22c55e"></i> Status</span><b style="color:' + (d._online ? '#22c55e' : '#ef4444') + '">' + (d._online ? 'Online' : 'Offline') + '</b></div>';
  }

  // Device section
  rows += '<div class="zt-ip-section-title"><i class="fas fa-mobile-alt" style="color:#a855f7"></i> Perangkat</div>';
  if (d._os)      rows += '<div class="zt-ip-row"><span><i class="fas fa-desktop" style="color:#60a5fa"></i> OS</span><b>' + d._os + '</b></div>';
  if (d._browser) rows += '<div class="zt-ip-row"><span><i class="fas fa-globe" style="color:#34d399"></i> Browser</span><b>' + d._browser + '</b></div>';
  if (d._screen)  rows += '<div class="zt-ip-row"><span><i class="fas fa-expand" style="color:#c084fc"></i> Layar</span><b>' + d._screen + '</b></div>';
  if (d._ram)     rows += '<div class="zt-ip-row"><span><i class="fas fa-memory" style="color:#f472b6"></i> RAM</span><b>' + d._ram + '</b></div>';
  if (d._cpu)     rows += '<div class="zt-ip-row"><span><i class="fas fa-microchip" style="color:#60a5fa"></i> CPU Cores</span><b>' + d._cpu + '</b></div>';
  if (d._lang)    rows += '<div class="zt-ip-row"><span><i class="fas fa-language" style="color:#fb923c"></i> Bahasa</span><b>' + d._lang + '</b></div>';

  var gpsBadge = gpsGranted
    ? '<div class="zt-ip-gps-badge"><i class="fas fa-map-marker-alt"></i> GPS Aktif</div>'
    : '<div class="zt-ip-gps-badge zt-ip-gps-off"><i class="fas fa-map-marker-slash"></i> GPS Belum Diizinkan</div>';

  return '<div class="zt-ip-card">'
    + gpsBadge
    + (isp !== '-' ? '<div class="zt-ip-org-badge"><i class="fas fa-building"></i> ' + isp + '</div>' : '')
    + '<div class="zt-ip-address">' + (d.ip || '-') + '</div>'
    + batHtml
    + '<div class="zt-ip-rows">' + rows + '</div>'
    + (mapUrl ? '<a class="zt-ip-map-btn" href="' + mapUrl + '" target="_blank"><i class="fas fa-map-marker-alt"></i> Lihat di Google Maps</a>' : '')
    + '</div>';
}

async function ztIpFetchMine() {
  var el = document.getElementById('zt-ip-mine');
  if (!el) return;
  try {
    var r = await fetch('https://ipapi.co/json/');
    var d = await r.json();

    // GPS
    var gpsGranted = typeof userLocation !== 'undefined' && userLocation !== null;
    if (gpsGranted && userLocation) {
      var coordMatch = userLocation.match(/koordinat: ([\-\d\.]+), ([\-\d\.]+)/);
      if (coordMatch) { d.latitude = coordMatch[1]; d.longitude = coordMatch[2]; }
      d._gps_location = userLocation.replace(/\s*\(koordinat:.*?\)/, '').trim();
    }

    // Baterai
    d._battery = null;
    if (navigator.getBattery) {
      try {
        var bat = await navigator.getBattery();
        d._battery = {
          level: Math.round(bat.level * 100),
          charging: bat.charging
        };
      } catch(e) {}
    }

    // Koneksi
    d._connection = null;
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      d._connection = {
        type: conn.effectiveType || conn.type || '-',
        downlink: conn.downlink || null,
        rtt: conn.rtt || null,
        saveData: conn.saveData || false
      };
    }

    // Platform & Browser
    var ua = navigator.userAgent;
    d._browser = ua.match(/Chrome\/[\d.]+/) ? 'Chrome' :
                 ua.match(/Firefox\/[\d.]+/) ? 'Firefox' :
                 ua.match(/Safari\/[\d.]+/) ? 'Safari' :
                 ua.match(/Edg\/[\d.]+/) ? 'Edge' : 'Browser lain';
    d._os = ua.match(/Android/) ? 'Android' :
            ua.match(/iPhone|iPad/) ? 'iOS' :
            ua.match(/Windows/) ? 'Windows' :
            ua.match(/Mac OS/) ? 'macOS' :
            ua.match(/Linux/) ? 'Linux' : '-';
    d._screen = screen.width + 'x' + screen.height;
    d._lang = navigator.language || '-';
    d._ram = navigator.deviceMemory ? navigator.deviceMemory + ' GB' : null;
    d._cpu = navigator.hardwareConcurrency ? navigator.hardwareConcurrency + ' core' : null;
    d._online = navigator.onLine;

    el.innerHTML = ztIpBuildCard(d, gpsGranted);
  } catch(e) {
    el.innerHTML = '<div class="zt-empty"><i class="fas fa-exclamation-triangle"></i><p>Gagal deteksi IP</p></div>';
  }
}

async function ztIpLookup() {
  var q = (document.getElementById('zt-ip-input').value || '').trim();
  var res = document.getElementById('zt-ip-result');
  if (!q) return;
  res.innerHTML = '<div class="zt-loading"><i class="fas fa-spinner fa-spin"></i> Mencari...</div>';
  try {
    var r = await fetch('https://ipapi.co/' + encodeURIComponent(q) + '/json/');
    var d = await r.json();
    if (d.error) throw new Error(d.reason || 'IP tidak valid');
    res.innerHTML = ztIpBuildCard(d, false);
  } catch(e) {
    res.innerHTML = '<div class="zt-empty"><i class="fas fa-times-circle"></i><p>' + e.message + '</p></div>';
  }
}

// Auto detect saat tab IP dibuka
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(ztIpFetchMine, 800);
});


// ══════════════════════════════
// SPEED TEST
// ══════════════════════════════
async function ztSpeedTest() {
  const btn = document.getElementById('zt-speed-btn');
  const dlEl = document.getElementById('zt-speed-dl');
  const pingEl = document.getElementById('zt-speed-ping');
  const statusEl = document.getElementById('zt-speed-status');
  const barWrap = document.getElementById('zt-speed-bar-wrap');
  const bar = document.getElementById('zt-speed-bar');

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
  barWrap.style.display = 'block';
  bar.style.width = '0%';
  dlEl.textContent = '...';
  pingEl.textContent = '...';

  // ── Test Ping ──
  statusEl.textContent = 'Mengukur ping...';
  try {
    const pings = [];
    for (let i = 0; i < 4; i++) {
      const t0 = performance.now();
      await fetch('https://www.cloudflare.com/cdn-cgi/trace?_=' + Date.now() + i, {cache:'no-store'});
      pings.push(Math.round(performance.now() - t0));
      bar.style.width = (10 + i * 5) + '%';
    }
    const avgPing = Math.round(pings.reduce((a,b)=>a+b,0) / pings.length);
    pingEl.textContent = avgPing;
    pingEl.style.color = avgPing < 50 ? '#22c55e' : avgPing < 100 ? '#f59e0b' : '#ef4444';
    // Jitter = rata-rata selisih antar ping
    const jitterEl = document.getElementById('zt-speed-jitter');
    if (jitterEl && pings.length > 1) {
      const diffs = pings.slice(1).map((v,i) => Math.abs(v - pings[i]));
      const jitter = Math.round(diffs.reduce((a,b)=>a+b,0) / diffs.length);
      jitterEl.textContent = jitter;
      jitterEl.style.color = jitter < 10 ? '#22c55e' : jitter < 30 ? '#f59e0b' : '#ef4444';
    }
  } catch(e) {
    pingEl.textContent = '?';
  }

  // ── Test Download ──
  statusEl.textContent = 'Mengukur kecepatan download...';
  bar.style.width = '30%';
  try {
    // Pakai file dari Cloudflare CDN 10MB
    const bytes = 15000000;
    const testUrl = 'https://speed.cloudflare.com/__down?bytes=' + bytes + '&_=' + Date.now();
    const t0 = performance.now();
    const res = await fetch(testUrl, {cache:'no-store'});
    const reader = res.body.getReader();
    let received = 0;
    let lastUpdate = t0;

    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      received += value.length;
      const now = performance.now();
      // Update progress bar & speed setiap 200ms
      if (now - lastUpdate > 200) {
        const elapsed = (now - t0) / 1000;
        const speedMbps = ((received * 8) / elapsed / 1_000_000).toFixed(1);
        dlEl.textContent = speedMbps;
        const pct = Math.min(30 + (received / bytes) * 60, 90);
        bar.style.width = pct + '%';
        lastUpdate = now;
      }
    }

    const elapsed = (performance.now() - t0) / 1000;
    const finalMbps = ((received * 8) / elapsed / 1_000_000).toFixed(2);
    dlEl.textContent = finalMbps;
    dlEl.style.color = finalMbps > 10 ? '#22c55e' : finalMbps > 3 ? '#f59e0b' : '#ef4444';
    bar.style.width = '100%';
    statusEl.innerHTML = '<i class="fas fa-check-circle" style="color:#22c55e"></i> Selesai! ' + finalMbps + ' Mbps · ' + document.getElementById('zt-speed-ping').textContent + ' ms ping';
  } catch(e) {
    dlEl.textContent = '?';
    statusEl.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:#f59e0b"></i> Gagal: ' + e.message;
  }

  // Rating
  const finalDl = parseFloat(document.getElementById('zt-speed-dl').textContent) || 0;
  const finalPingVal = parseInt(document.getElementById('zt-speed-ping').textContent) || 999;
  const ratingEl = document.getElementById('zt-speed-rating');
  if (ratingEl && finalDl > 0) {
    let rating, ratingColor, ratingBg;
    if (finalDl >= 50 && finalPingVal < 30) { rating = '<i class="fas fa-rocket"></i> Sangat Cepat'; ratingColor = '#22c55e'; ratingBg = 'rgba(34,197,94,0.1)'; }
    else if (finalDl >= 20 && finalPingVal < 60) { rating = '<i class="fas fa-bolt"></i> Cepat'; ratingColor = '#22c55e'; ratingBg = 'rgba(34,197,94,0.08)'; }
    else if (finalDl >= 5 && finalPingVal < 100) { rating = '<i class="fas fa-thumbs-up"></i> Normal'; ratingColor = '#f59e0b'; ratingBg = 'rgba(245,158,11,0.08)'; }
    else if (finalDl >= 1) { rating = '<i class="fas fa-hourglass-half"></i> Lambat'; ratingColor = '#f59e0b'; ratingBg = 'rgba(245,158,11,0.08)'; }
    else { rating = '<i class="fas fa-times-circle"></i> Sangat Lambat'; ratingColor = '#ef4444'; ratingBg = 'rgba(239,68,68,0.08)'; }
    ratingEl.style.display = 'block';
    ratingEl.style.background = ratingBg;
    ratingEl.style.border = '1px solid ' + ratingColor + '44';
    ratingEl.style.color = ratingColor;
    ratingEl.innerHTML = rating + ' · ' + finalDl + ' Mbps · ' + finalPingVal + ' ms';

    // History
    var histEl = document.getElementById('zt-speed-history');
    if (histEl) {
      var now = new Date();
      var timeStr = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
      var existing = histEl.innerHTML;
      var maxItems = 3;
      var items = histEl.querySelectorAll('.zt-speed-history-item');
      if (items.length >= maxItems) items[items.length-1].remove();
      if (!histEl.querySelector('.zt-speed-history-title')) {
        histEl.innerHTML = '<div class="zt-speed-history-title"><i class="fas fa-history"></i> Riwayat Test</div>' + histEl.innerHTML;
      }
      var newItem = '<div class="zt-speed-history-item"><span>' + timeStr + '</span><span><b style="color:' + ratingColor + '">' + finalDl + ' Mbps</b></span><span>' + finalPingVal + ' ms</span></div>';
      var titleEl = histEl.querySelector('.zt-speed-history-title');
      if (titleEl) titleEl.insertAdjacentHTML('afterend', newItem);
    }
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-redo"></i> Test Ulang';
}



// ══════════════════════════════
// IMAGE SEARCH — Lexica.art
// ══════════════════════════════
var ztImgAllResults = [];
var ztImgShown = 0;
var ZT_IMG_PER_PAGE = 24;

function ztImgOpen(el) {
  var url = el.getAttribute('data-full');
  if (url) window.open(url, '_blank');
}

async function ztImgSearch(loadMore) {
  loadMore = loadMore || false;
  var q = document.getElementById('zt-img-input').value.trim();
  var res = document.getElementById('zt-img-result');
  var moreBtn = document.getElementById('zt-img-more');
  if (!q) return;

  if (!loadMore) {
    ztImgAllResults = [];
    ztImgShown = 0;
    res.innerHTML = '<div class="zt-loading"><i class="fas fa-spinner fa-spin"></i> Mencari gambar...</div>';
    moreBtn.style.display = 'none';
    try {
      var proxy = (typeof PROXY_URL !== 'undefined' ? PROXY_URL : localStorage.getItem('zt_img_proxy') || localStorage.getItem('vidsnap_proxy_url') || '').replace(/\/+$/, '');
      if (!proxy) {
        res.innerHTML = '<div class="zt-empty"><i class="fas fa-server"></i><p>Paste URL Cloudflare tunnel di kotak kuning dulu!</p></div>';
        return;
      }
      var r = await fetch(proxy + '/api/imgsearch?q=' + encodeURIComponent(q));
      var d = await r.json();
      if (d.error) throw new Error(d.error);
      // Lexica response: { images: [{id, src, srcSmall, prompt, ...}] }
      // Wallhaven response: { data: [{id, thumbs:{small,large}, path, ...}] }
      ztImgAllResults = (d.data || []).map(function(h){
        return {
          src: h.thumbs && h.thumbs.large ? h.thumbs.large : h.thumbs.original,
          full: h.path || h.thumbs.original
        };
      });
      if (!ztImgAllResults.length) {
        res.innerHTML = '<div class="zt-empty"><i class="fas fa-search"></i><p>Tidak ada hasil untuk <b>' + q + '</b></p></div>';
        return;
      }
    } catch(e) {
      res.innerHTML = '<div class="zt-empty"><i class="fas fa-exclamation-triangle"></i><p>Gagal: ' + e.message + '</p></div>';
      return;
    }
  }

  var slice = ztImgAllResults.slice(ztImgShown, ztImgShown + ZT_IMG_PER_PAGE);
  ztImgShown += slice.length;

  var gridHtml = '';
  for (var i = 0; i < slice.length; i++) {
    var img = slice[i];
    var src = img.src;
    var full = img.full;
    gridHtml += '<div class="zt-img-item" data-full="' + full + '" data-src="' + src + '" onclick="ztImgOpen(this)">'
      + '<img src="' + src + '" loading="lazy">'
      + '</div>';
  }

  if (!loadMore) {
    res.innerHTML = '<div class="zt-img-count"><i class="fas fa-images"></i> ' + ztImgAllResults.length + ' gambar ditemukan</div>'
      + '<div class="zt-img-grid" id="zt-img-grid">' + gridHtml + '</div>';
  } else {
    var grid = document.getElementById('zt-img-grid');
    if (grid) grid.insertAdjacentHTML('beforeend', gridHtml);
  }

  moreBtn.style.display = ztImgShown < ztImgAllResults.length ? 'flex' : 'none';
}var _ztLbIndex = 0;
function ztImgOpen(el) {
  var items = document.querySelectorAll('.zt-img-item');
  var idx = Array.from(items).indexOf(el);
  _ztLbIndex = idx >= 0 ? idx : 0;
  ztLightboxShow(_ztLbIndex);
}
function ztLightboxShow(idx) {
  var items = document.querySelectorAll('.zt-img-item');
  if (!items.length) return;
  idx = Math.max(0, Math.min(idx, items.length - 1));
  _ztLbIndex = idx;
  var url = items[idx].getAttribute('data-full');
  var lb = document.getElementById('zt-lightbox');
  var img = document.getElementById('zt-lb-img');
  var save = document.getElementById('zt-lb-save');
  var open = document.getElementById('zt-lb-open');
  var counter = document.getElementById('zt-lb-counter');
  img.classList.remove('zoomed');
  img.src = url;
  save.href = url;
  open.href = url;
  counter.textContent = (idx + 1) + ' / ' + items.length;
  document.getElementById('zt-lb-prev').classList.toggle('hidden', idx === 0);
  document.getElementById('zt-lb-next').classList.toggle('hidden', idx === items.length - 1);
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function ztLightboxNav(dir) {
  ztLightboxShow(_ztLbIndex + dir);
}
function ztLightboxClose() {
  document.getElementById('zt-lightbox').classList.remove('open');
  document.body.style.overflow = '';
  document.getElementById('zt-lb-img').src = '';
}
(function(){
  var startX = 0;
  var lb = document.getElementById('zt-lightbox');
  lb.addEventListener('touchstart', function(e){ startX = e.touches[0].clientX; }, {passive:true});
  lb.addEventListener('touchend', function(e){
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) ztLightboxNav(dx < 0 ? 1 : -1);
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') ztLightboxClose();
    if (e.key === 'ArrowLeft') ztLightboxNav(-1);
    if (e.key === 'ArrowRight') ztLightboxNav(1);
  });
})();


// ══════════════════════════════════════
// CPANEL — Pterodactyl Panel Creator
// ══════════════════════════════════════
const CP_PLANS = {
  '1':    { memo: 1024,  cpu: 30,  disk: 1024,  suffix: '1gb'  },
  '2':    { memo: 2048,  cpu: 60,  disk: 2048,  suffix: '2gb'  },
  '3':    { memo: 3072,  cpu: 90,  disk: 3072,  suffix: '3gb'  },
  '4':    { memo: 4048,  cpu: 110, disk: 4048,  suffix: '4gb'  },
  '5':    { memo: 5048,  cpu: 140, disk: 5048,  suffix: '5gb'  },
  '6':    { memo: 6048,  cpu: 170, disk: 6048,  suffix: '6gb'  },
  '7':    { memo: 7048,  cpu: 200, disk: 7048,  suffix: '7gb'  },
  '8':    { memo: 8048,  cpu: 230, disk: 8048,  suffix: '8gb'  },
  '9':    { memo: 9048,  cpu: 260, disk: 9048,  suffix: '9gb'  },
  '10':   { memo: 10000, cpu: 290, disk: 10000, suffix: '10gb' },
  '11':   { memo: 11000, cpu: 320, disk: 11000, suffix: '11gb' },
  'unli': { memo: 0,     cpu: 0,   disk: 0,     suffix: 'unli' },
};

let _cpSelectedPlan = null;

async function cpCreatePanel() {
  const username = (document.getElementById('cp-username').value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const result   = document.getElementById('cp-result');
  const btn      = document.getElementById('cp-create-btn');

  if (!username) {
    cpShowResult('error', null, 'Username tidak boleh kosong!'); return;
  }
  if (!_cpSelectedPlan) {
    cpShowResult('error', null, 'Pilih plan dulu!'); return;
  }

  // Config diambil dari server, tidak perlu input di sini
  const loc = '1';
  const egg = '15';

  const plan   = CP_PLANS[_cpSelectedPlan];
  const _gb = _cpSelectedPlan === 'unli' ? 'Unli' : _cpSelectedPlan + 'GB';
  const name   = username + ' | ' + _gb;
  const email  = username + '@panel.create';
  const password = username + '001';

  const spc = 'if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN}';

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Membuat panel...';

  try {
    // Helper: fetch lewat server proxy (bypass CORS)
    const cpFetch = async (endpoint, data, reqMethod) => {
      const proxyBase = (typeof PROXY_URL !== 'undefined' ? PROXY_URL : localStorage.getItem('vidsnap_proxy_url') || '').replace(/\/+$/, '');
      if (!proxyBase) throw new Error('Server proxy belum terhubung! Pastikan server aktif.');
      const r = await fetch(proxyBase + '/api/cpanel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, data, reqMethod: reqMethod || 'POST' }),
      });
      return await r.json();
    };

    // Step 1: Buat User
    const d1 = await cpFetch('/api/application/users', {
      email, username, first_name: username, last_name: username,
      language: 'en', password,
    });
    if (d1.errors) {
      const errMsg = d1.errors[0]?.detail || JSON.stringify(d1.errors[0]);
      cpShowResult('error', null, 'Gagal buat user: ' + errMsg);
      return;
    }
    const user = d1.attributes;

    // Step 2: Buat Server
    const d2 = await cpFetch('/api/application/servers', {
      name, description: '', user: user.id,
      egg: parseInt(egg),
      docker_image: 'ghcr.io/parkervcp/yolks:nodejs_18',
      startup: spc,
      environment: { INST: 'npm', USER_UPLOAD: '0', AUTO_UPDATE: '0', CMD_RUN: 'npm start' },
      limits: { memory: plan.memo, swap: 0, disk: plan.disk, io: 500, cpu: plan.cpu },
      feature_limits: { databases: 5, backups: 5, allocations: 1 },
      deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] },
    });
    if (d2.errors) {
      const errMsg = d2.errors[0]?.detail || JSON.stringify(d2.errors[0]);
      cpShowResult('error', null, 'Gagal buat server: ' + errMsg);
      return;
    }
    const server = d2.attributes;

    // Berhasil!
    const resultData = {
      'Login': 'https://sanz.panelku.privateserverr.web.id',
      'Username': user.username,
      'Password': password,
      'Email': email,
      'Memory': server.limits.memory === 0 ? 'Unlimited' : server.limits.memory + ' MB',
      'Disk': server.limits.disk === 0 ? 'Unlimited' : server.limits.disk + ' MB',
      'CPU': server.limits.cpu === 0 ? 'Unlimited' : server.limits.cpu + '%',
    };
    const planLabel = _cpSelectedPlan === 'unli' ? 'Unli' : _cpSelectedPlan + ' GB';
    cpSaveToHistory(resultData, planLabel, server.id, user.id);
    cpShowResult('success', resultData);

  } catch(e) {
    cpShowResult('error', null, 'Error: ' + e.message + ' (Pastikan domain benar & CORS aktif)');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-plus-circle"></i> Buat Panel';
  }
}

function cpShowResult(type, data, errMsg) {
  const modal = document.getElementById('cp-result-modal');
  const result = document.getElementById('cp-result');
  if (modal) modal.style.display = 'flex';
  result.className = 'cpanel-result ' + type;
  if (type === 'success' && data) {
    const plan = CP_PLANS[_cpSelectedPlan];
    const gb = _cpSelectedPlan === 'unli' ? 'Unlimited' : _cpSelectedPlan + ' GB';
    const ram  = plan.memo === 0 ? 'Unlimited' : plan.memo + ' MB';
    const disk = plan.disk === 0 ? 'Unlimited' : plan.disk + ' MB';
    const cpu  = plan.cpu  === 0 ? 'Unlimited' : plan.cpu + '%';
    const loginUrl = data['Login'];

    result.innerHTML = `
      <div class="cpr-header">
        <i class="fas fa-history" style="font-size:28px;color:#00d9ff;flex-shrink:0"></i>
        <div>
          <div class="cpr-title">Data Panel</div>
          <div class="cpr-plan">${gb}</div>
        </div>
      </div>
      <div class="cpr-section">
        <div class="cpr-section-title">Akun Login</div>
        <a href="${loginUrl}" target="_blank" class="cpr-login-url">${loginUrl} <i class="fas fa-external-link-alt"></i></a>
        <div class="cpr-row"><span>Username</span><strong>${data['Username']}</strong></div>
        <div class="cpr-row"><span>Password</span><strong>${data['Password']}</strong></div>
        <div class="cpr-row"><span>Email</span><strong>${data['Email']}</strong></div>
      </div>
      <div class="cpr-section">
        <div class="cpr-section-title">Spesifikasi</div>
        <div class="cpr-specs">
          <div class="cpr-spec"><i class="fas fa-memory"></i><div><b>${ram}</b><small>RAM</small></div></div>
          <div class="cpr-spec"><i class="fas fa-hdd"></i><div><b>${disk}</b><small>Disk</small></div></div>
          <div class="cpr-spec"><i class="fas fa-microchip"></i><div><b>${cpu}</b><small>CPU</small></div></div>
        </div>
      </div>
      <button onclick="cpCopyResult()" class="cpr-copy-btn">
        <i class="fas fa-copy"></i> Salin Data
      </button>
      <button onclick="cpCloseResultModal()" style="width:100%;padding:14px;background:rgba(255,255,255,0.05);border:none;border-top:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);font-size:14px;font-weight:700;cursor:pointer;">
        <i class="fas fa-times" style="margin-right:8px"></i> Tutup
      </button>`;
  } else {
    result.innerHTML = `<div class="cpanel-result-title"><i class="fas fa-exclamation-triangle" style="color:#ef4444"></i> Gagal</div><p style="color:#ef4444;font-size:13px;margin:8px 0 0">${errMsg}</p>`;
  }
}

function cpCopyResult() {
  const rows = document.querySelectorAll('.cpanel-result-row');
  let text = '[ DATA PANEL ]\n';
  rows.forEach(r => {
    const k = r.querySelector('.cpanel-result-key').textContent;
    const v = r.querySelector('.cpanel-result-val').textContent;
    text += k + ': ' + v + '\n';
  });
  navigator.clipboard.writeText(text).then(() => {
    showNotification && showNotification('Data berhasil dicopy!', 'success');
  });
}



// ── Premium Plan System ──
const CP_PREM_CODE = 'PanelPrem18hebcqobPbevccwyV';
let _cpPremUnlocked = false;

function cpSelectPlan(el) {
  document.querySelectorAll('.cpanel-plan').forEach(p => p.classList.remove('selected'));
  el.classList.add('selected');
  _cpSelectedPlan = el.dataset.plan;
}

function cpShowTokenInput() {
  const card = document.getElementById('cp-arrow-card');
  const icon = card ? card.querySelector('.cpanel-arrow-icon') : null;
  const prem = document.getElementById('cp-plans-prem');
  const wrap = document.getElementById('cp-token-wrap');

  const premVisible = prem && prem.style.display !== 'none';
  const wrapVisible = wrap && wrap.style.display !== 'none';

  // Kalau salah satu sedang tampil → sembunyikan semuanya (toggle off)
  if (premVisible || wrapVisible) {
    if (prem) prem.style.display = 'none';
    if (wrap) wrap.style.display = 'none';
    if (icon) icon.style.transform = ''; // balik ke kanan
    return;
  }

  // Tampilkan
  if (_cpPremUnlocked) {
    if (prem) prem.style.display = 'grid';
  } else {
    if (wrap) wrap.style.display = 'block';
    setTimeout(() => { const inp = document.getElementById('cp-prem-code'); if(inp) inp.focus(); }, 200);
  }
  if (icon) icon.style.transform = 'rotate(90deg)';
}

function cpCheckCode() {
  const input = document.getElementById('cp-prem-code').value.trim();
  const status = document.getElementById('cp-code-status');

  if (input === CP_PREM_CODE) {
    _cpPremUnlocked = true;
    status.innerHTML = '<span style="color:#22c55e"><i class="fas fa-check-circle"></i> Token valid! Plan premium aktif.</span>';
    setTimeout(() => {
      document.getElementById('cp-token-wrap').style.display = 'none';
      const prem = document.getElementById('cp-plans-prem');
      if (prem) { prem.style.display = 'grid'; prem.style.animation = 'fadeIn 0.4s ease'; }
      // Panah tetap ke bawah (plan tampil)
      const card = document.getElementById('cp-arrow-card');
      const icon = card ? card.querySelector('.cpanel-arrow-icon') : null;
      if (icon) icon.style.transform = 'rotate(90deg)';
    }, 800);
  } else {
    status.innerHTML = '<span style="color:#ef4444"><i class="fas fa-times-circle"></i> Token salah!</span>';
    const inp = document.getElementById('cp-prem-code');
    inp.style.borderColor = 'rgba(239,68,68,0.6)';
    setTimeout(() => { inp.style.borderColor = ''; inp.value = ''; }, 1500);
  }
}

// ── Riwayat Panel ──
function cpSaveToHistory(data, plan, serverId) {
  const key = 'cp_history';
  let history = [];
  try { history = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}
  const item = {
    id: Date.now(),
    serverId: serverId || null,
    userId: arguments[3] || null,
    date: new Date().toLocaleString('id-ID'),
    plan: plan,
    login: data['Login'],
    username: data['Username'],
    password: data['Password'],
    email: data['Email'],
    ram: data['Memory'] || data['RAM'] || '-',
    disk: data['Disk'] || '-',
    cpu: data['CPU'] || '-',
  };
  history.unshift(item);
  localStorage.setItem(key, JSON.stringify(history));
  cpRenderHistory();
}

function cpRenderHistory() {
  const wrap = document.getElementById('cp-history-wrap');
  const list = document.getElementById('cp-history-list');
  if (!wrap || !list) return;
  let history = [];
  try { history = JSON.parse(localStorage.getItem('cp_history') || '[]'); } catch(e) {}
  if (history.length === 0) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';
  list.innerHTML = history.map(item => `
    <div class="cpanel-history-item" id="cphi-${item.id}" onclick="cpShowHistoryDetail(${item.id})">
      <div class="cpanel-history-top">
        <div class="cpanel-history-name">
          <i class="fas fa-server" style="color:#00d9ff;font-size:11px"></i>
          ${item.username}
          <span class="cpanel-history-badge">${item.plan}</span>
        </div>
        <span class="cpanel-history-date">${item.date}</span>
      </div>
      <div class="cpanel-history-preview">
        <span>${item.username}</span> · <span>${item.password}</span> · <span>${item.plan}</span>
      </div>
      <div class="cpanel-history-actions" onclick="event.stopPropagation()">
        <button class="cpanel-history-btn copy" onclick="cpCopyHistoryItem(${item.id})">
          <i class="fas fa-copy"></i> Copy
        </button>
        <button class="cpanel-history-btn del" onclick="cpDeleteHistory(${item.id})">
          <i class="fas fa-trash"></i> Hapus
        </button>
      </div>
    </div>
  `).join('');
}

async function cpDeleteHistory(id) {
  let history = [];
  try { history = JSON.parse(localStorage.getItem('cp_history') || '[]'); } catch(e) {}
  const item = history.find(h => h.id === id);

  // Hapus server + user di Pterodactyl
  if (item && (item.serverId || item.userId)) {
    try {
      const proxyBase = (typeof PROXY_URL !== 'undefined' ? PROXY_URL : '').replace(/\/+$/, '');
      if (proxyBase) {
        // Step 1: Hapus server dulu
        if (item.serverId) {
          await fetch(proxyBase + '/api/cpanel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: '/api/application/servers/' + item.serverId + '/force',
              reqMethod: 'DELETE'
            }),
          });
        }
        // Step 2: Hapus user
        if (item.userId) {
          await fetch(proxyBase + '/api/cpanel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: '/api/application/users/' + item.userId,
              reqMethod: 'DELETE'
            }),
          });
        }
      }
    } catch(e) { console.log('Gagal hapus di Pterodactyl:', e.message); }
  }

  history = history.filter(h => h.id !== id);
  localStorage.setItem('cp_history', JSON.stringify(history));
  cpRenderHistory();
}

function cpClearHistory() {
  if (!confirm('Hapus semua riwayat panel?')) return;
  localStorage.removeItem('cp_history');
  cpRenderHistory();
}

function cpCopyHistoryItem(id) {
  let history = [];
  try { history = JSON.parse(localStorage.getItem('cp_history') || '[]'); } catch(e) {}
  const item = history.find(h => h.id === id);
  if (!item) return;
  const text = `[ DATA PANEL ]
Login    : ${item.login}
Username : ${item.username}
Password : ${item.password}
Email    : ${item.email}
RAM      : ${item.ram}
Disk     : ${item.disk}
CPU      : ${item.cpu}
Paket    : ${item.plan}`;
  navigator.clipboard.writeText(text).then(() => {
    if (typeof showNotification === 'function') showNotification('Data berhasil dicopy!', 'success');
  });
}

function cpShowHistoryDetail(id) {
  let history = [];
  try { history = JSON.parse(localStorage.getItem('cp_history') || '[]'); } catch(e) {}
  const item = history.find(h => h.id === id);
  if (!item) return;

  const modal = document.getElementById('cp-result-modal');
  const result = document.getElementById('cp-result');
  if (!result) return;
  if (modal) modal.style.display = 'flex';
  result.className = 'cpanel-result success';

  const loginUrl = item.login;
  result.innerHTML = `
    <div class="cpr-header">
      <i class="fas fa-history cpr-icon-ok" style="color:#00d9ff"></i>
      <div>
        <div class="cpr-title">Data Panel</div>
        <div class="cpr-plan">${item.plan}</div>
      </div>
    </div>
    <div class="cpr-section">
      <div class="cpr-section-title">Akun Login</div>
      <a href="${loginUrl}" target="_blank" class="cpr-login-url">${loginUrl} <i class="fas fa-external-link-alt"></i></a>
      <div class="cpr-row"><span>Username</span><strong>${item.username}</strong></div>
      <div class="cpr-row"><span>Password</span><strong>${item.password}</strong></div>
      <div class="cpr-row"><span>Email</span><strong>${item.email}</strong></div>
    </div>
    <div class="cpr-section">
      <div class="cpr-section-title">Spesifikasi</div>
      <div class="cpr-specs">
        <div class="cpr-spec"><i class="fas fa-memory"></i><div><b>${item.ram}</b><small>RAM</small></div></div>
        <div class="cpr-spec"><i class="fas fa-hdd"></i><div><b>${item.disk}</b><small>Disk</small></div></div>
        <div class="cpr-spec"><i class="fas fa-microchip"></i><div><b>${item.cpu}</b><small>CPU</small></div></div>
      </div>
    </div>
    <button onclick="cpCopyHistoryItem(${item.id})" class="cpr-copy-btn">
      <i class="fas fa-copy"></i> Salin Data
    </button>
    <button onclick="cpCloseResultModal()" 
      style="width:100%;padding:14px;background:rgba(255,255,255,0.05);border:none;border-top:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);font-size:14px;font-weight:700;cursor:pointer;letter-spacing:0.5px;">
      <i class="fas fa-times" style="margin-right:8px"></i> Tutup
    </button>`;

}

function cpCloseResultModal(e) {
  if (e && e.target !== document.getElementById('cp-result-modal')) return;
  const modal = document.getElementById('cp-result-modal');
  if (modal) modal.style.display = 'none';
}