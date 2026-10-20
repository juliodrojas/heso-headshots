(function(){
  "use strict";
  var grid = document.getElementById('grid');
  var empty = document.getElementById('empty');
  var nomatch = document.getElementById('nomatch');
  var count = document.getElementById('count');
  var toolbar = document.getElementById('toolbar');
  var searchInput = document.getElementById('search');
  var sortSel = document.getElementById('sort');
  var selectToggle = document.getElementById('selectToggle');
  var dlSelected = document.getElementById('dlSelected');
  var dlAll = document.getElementById('dlAll');
  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lbImg');
  var lbName = document.getElementById('lbName');
  var lbCounter = document.getElementById('lbCounter');
  var lbDownload = document.getElementById('lbDownload');
  var lbReport = document.getElementById('lbReport');
  var lbSquare = document.getElementById('lbSquare');
  var lbCopy = document.getElementById('lbCopy');

  var photos = [];      // full manifest
  var view = [];        // filtered + sorted list the user sees/navigates
  var idx = 0;          // index into view for the lightbox
  var selectMode = false;
  var selected = {};    // key: photo file -> true

  function keyOf(p){ return p.file; }
  function slugOf(p){
    return (p.name || p.id || 'photo').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function photoLink(p){ return window.location.origin + '/gallery.html#photo-' + slugOf(p); }
  function fname(p){
    var base = (p.name || p.id || 'headshot').replace(/\s+/g, '-').toLowerCase();
    return 'heso-' + base + '.jpg';
  }
  function selectedList(){ return photos.filter(function(p){ return selected[keyOf(p)]; }); }

  function updateSelBtn(){
    var n = selectedList().length;
    dlSelected.textContent = '⬇ SELECTED (' + n + ')';
    dlSelected.disabled = n === 0;
  }

  /* ---------- grid ---------- */
  function applyView(){
    var q = (searchInput.value || '').trim().toLowerCase();
    view = photos.filter(function(p){ return !q || (p.name || '').toLowerCase().indexOf(q) !== -1; });
    var dir = sortSel.value === 'za' ? -1 : 1;
    view.sort(function(a, b){ return dir * String(a.name || '').localeCompare(String(b.name || '')); });
    render();
  }

  function render(){
    grid.innerHTML = '';
    nomatch.style.display = (photos.length && !view.length) ? 'block' : 'none';
    view.forEach(function(p, i){
      var card = document.createElement('div');
      card.className = 'card' + (selected[keyOf(p)] ? ' sel' : '');
      var img = document.createElement('img');
      img.src = p.thumb || p.file; img.alt = p.name || 'Headshot'; img.loading = 'lazy';
      var nm = document.createElement('div');
      nm.className = 'nm'; nm.textContent = p.name || '';
      var badge = document.createElement('div');
      badge.className = 'selbadge'; badge.textContent = selected[keyOf(p)] ? '✓' : '';
      card.appendChild(img); card.appendChild(nm); card.appendChild(badge);
      card.addEventListener('click', function(){
        if (selectMode){
          var k = keyOf(p);
          if (selected[k]) delete selected[k]; else selected[k] = true;
          card.classList.toggle('sel');
          badge.textContent = selected[k] ? '✓' : '';
          updateSelBtn();
        } else {
          openLb(i);
        }
      });
      grid.appendChild(card);
    });
  }

  /* ---------- lightbox: move / view / download one ---------- */
  function preload(i){
    if (!view.length) return;
    var p = view[(i + view.length) % view.length];
    var im = new Image(); im.src = p.file;
  }
  function openLb(i){
    if (!view.length) return;
    idx = (i + view.length) % view.length;
    var p = view[idx];
    lbImg.src = p.file;
    lbImg.alt = p.name || 'Headshot';
    lbName.textContent = p.name || '';
    lbCounter.textContent = (idx + 1) + ' / ' + view.length;
    if (lbDownload){
      lbDownload.href = p.file;
      lbDownload.setAttribute('download', fname(p));
    }
    if (lbReport){
      lbReport.href = 'mailto:julio.d.rojas.loo@gmail.com'
        + '?subject=' + encodeURIComponent('HESO headshot correction — ' + (p.name || p.file))
        + '&body=' + encodeURIComponent('Hi Julio — about the headshot "' + (p.name || '') + '" (' + p.file + '):\n\nWhat needs fixing: ');
    }
    try { history.replaceState(null, '', '#photo-' + slugOf(p)); } catch(e){}
    lb.classList.add('open');
    var lc = document.getElementById('lbClose'); if (lc) lc.focus();
    preload(idx - 1); preload(idx + 1);
  }
  function closeLb(){ lb.classList.remove('open'); }
  document.getElementById('lbClose').addEventListener('click', closeLb);
  document.getElementById('lbPrev').addEventListener('click', function(e){ e.stopPropagation(); openLb(idx - 1); });
  document.getElementById('lbNext').addEventListener('click', function(e){ e.stopPropagation(); openLb(idx + 1); });
  lb.addEventListener('click', function(e){ if (e.target === lb) closeLb(); });
  document.addEventListener('keydown', function(e){
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') openLb(idx - 1);
    if (e.key === 'ArrowRight') openLb(idx + 1);
    if (e.key === 'd' || e.key === 'D'){ if (lbDownload) lbDownload.click(); }
    if (e.key === 'Tab'){
      var f = [document.getElementById('lbPrev'), document.getElementById('lbNext'),
               document.getElementById('lbClose'), lbDownload, lbSquare, lbCopy, lbReport]
              .filter(function(el){ return !!el; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  });
  var sx = null;
  lb.addEventListener('touchstart', function(e){ sx = e.changedTouches[0].clientX; }, {passive:true});
  lb.addEventListener('touchend', function(e){
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 60) openLb(idx + (dx < 0 ? 1 : -1));
  }, {passive:true});

  /* ---------- zip downloads (chunked: max 20 photos per ZIP so phones don't run out of memory) ---------- */
  var ZIP_CHUNK = 20;
  function saveBlob(blob, name){
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  function buildZip(chunk, btn, label, doneSoFar, total){
    var zip = new JSZip();
    var done = 0, chain = Promise.resolve();
    chunk.forEach(function(p){
      chain = chain.then(function(){
        btn.textContent = '⏳ ' + label + ' ' + (doneSoFar + done + 1) + '/' + total + '…';
        return fetch(p.file).then(function(r){ return r.blob(); }).then(function(b){
          zip.file(fname(p), b); done++;
        }).catch(function(){ done++; });
      });
    });
    return chain.then(function(){
      btn.textContent = '⏳ BUILDING ZIP…';
      return zip.generateAsync({ type: 'blob' });
    });
  }
  function downloadZip(list, btn, label){
    if (!list.length) return;
    if (typeof JSZip === 'undefined'){ alert('ZIP is unavailable right now — open a photo and use DOWNLOAD PHOTO instead.'); return; }
    var orig = btn.textContent;
    btn.disabled = true;
    var chunks = [];
    for (var i = 0; i < list.length; i += ZIP_CHUNK) chunks.push(list.slice(i, i + ZIP_CHUNK));
    var chain = Promise.resolve(), doneSoFar = 0;
    chunks.forEach(function(chunk, ci){
      chain = chain.then(function(){
        return buildZip(chunk, btn, label, doneSoFar, list.length).then(function(blob){
          saveBlob(blob, chunks.length > 1 ? 'heso-headshots-part' + (ci + 1) + '.zip' : 'heso-headshots.zip');
          doneSoFar += chunk.length;
        });
      });
    });
    chain.then(function(){
      btn.textContent = orig; btn.disabled = false; updateSelBtn();
    }).catch(function(){
      btn.textContent = orig; btn.disabled = false; updateSelBtn();
      alert('Something went wrong building the ZIP — try fewer photos.');
    });
  }

  /* ---------- LinkedIn square (1:1) download ---------- */
  if (lbSquare){
    lbSquare.addEventListener('click', function(){
      var p = view[idx]; if (!p) return;
      var orig = lbSquare.textContent;
      lbSquare.textContent = '⏳ PREPARING…'; lbSquare.disabled = true;
      var img = new Image();
      img.onload = function(){
        try {
          var side = Math.min(img.naturalWidth, img.naturalHeight, 1080);
          var cv = document.createElement('canvas'); cv.width = side; cv.height = side;
          var ctx = cv.getContext('2d');
          var srcSide = Math.min(img.naturalWidth, img.naturalHeight);
          ctx.drawImage(img, (img.naturalWidth - srcSide) / 2, (img.naturalHeight - srcSide) / 2, srcSide, srcSide, 0, 0, side, side);
          cv.toBlob(function(b){
            if (b) saveBlob(b, fname(p).replace(/\.jpg$/, '-linkedin.jpg'));
            lbSquare.textContent = orig; lbSquare.disabled = false;
          }, 'image/jpeg', 0.92);
        } catch(e){
          lbSquare.textContent = orig; lbSquare.disabled = false;
          alert('Square crop failed — use DOWNLOAD PHOTO instead.');
        }
      };
      img.onerror = function(){ lbSquare.textContent = orig; lbSquare.disabled = false; };
      img.src = p.file;
    });
  }

  /* ---------- copy my photo link ---------- */
  if (lbCopy){
    lbCopy.addEventListener('click', function(){
      var p = view[idx]; if (!p) return;
      var url = photoLink(p), orig = lbCopy.textContent;
      function done(){ lbCopy.textContent = '✓ LINK COPIED'; setTimeout(function(){ lbCopy.textContent = orig; }, 2000); }
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(url).then(done).catch(function(){ window.prompt('Copy your photo link:', url); });
      } else {
        window.prompt('Copy your photo link:', url);
      }
    });
  }

  /* ---------- toolbar wiring ---------- */
  searchInput.addEventListener('input', applyView);
  sortSel.addEventListener('change', applyView);
  selectToggle.addEventListener('click', function(){
    selectMode = !selectMode;
    document.body.classList.toggle('selecting', selectMode);
    selectToggle.textContent = selectMode ? 'DONE' : 'SELECT';
    if (!selectMode){ selected = {}; updateSelBtn(); render(); }
  });
  dlSelected.addEventListener('click', function(){ downloadZip(selectedList(), dlSelected, 'ADDING'); });
  dlAll.addEventListener('click', function(){ downloadZip(photos, dlAll, 'ADDING'); });

  /* ---------- load manifest ---------- */
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'assets/manifest.json', true);
  xhr.timeout = 8000;
  xhr.onreadystatechange = function(){
    if (xhr.readyState !== 4) return;
    if (xhr.status === 200){
      try { photos = JSON.parse(xhr.responseText || '[]'); } catch(e){ photos = []; }
    }
    if (!photos.length){
      empty.style.display = 'block';
      count.textContent = '';
      return;
    }
    toolbar.style.display = 'flex';
    count.textContent = photos.length + (photos.length === 1 ? ' PHOTO' : ' PHOTOS');
    applyView();
    updateSelBtn();
    // Deep link: gallery.html#photo-firstname-lastname opens that photo directly.
    var m = (window.location.hash || '').match(/^#photo-(.+)$/);
    if (m){
      var target = decodeURIComponent(m[1]).toLowerCase();
      for (var i = 0; i < view.length; i++){
        if (slugOf(view[i]) === target){ openLb(i); break; }
      }
    }
  };
  xhr.send();
})();
