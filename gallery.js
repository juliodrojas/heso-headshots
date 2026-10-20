(function(){
  "use strict";
  var grid = document.getElementById('grid');
  var empty = document.getElementById('empty');
  var count = document.getElementById('count');
  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lbImg');
  var lbName = document.getElementById('lbName');
  var lbDownload = document.getElementById('lbDownload');
  var photos = [], idx = 0;

  function openLb(i){
    idx = (i + photos.length) % photos.length;
    var p = photos[idx];
    lbImg.src = p.file;
    lbImg.alt = p.name || 'Headshot';
    lbName.textContent = p.name || '';
    if (lbDownload){
      lbDownload.href = p.file;
      lbDownload.setAttribute('download', 'heso-' + (p.name || p.id).replace(/\s+/g, '-').toLowerCase() + '.jpg');
    }
    lb.classList.add('open');
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
  });
  var sx = null;
  lb.addEventListener('touchstart', function(e){ sx = e.changedTouches[0].clientX; }, {passive:true});
  lb.addEventListener('touchend', function(e){
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 60) openLb(idx + (dx < 0 ? 1 : -1));
  }, {passive:true});

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
    count.textContent = photos.length + (photos.length === 1 ? ' PHOTO' : ' PHOTOS');
    photos.forEach(function(p, i){
      var card = document.createElement('div');
      card.className = 'card';
      var img = document.createElement('img');
      img.src = p.file; img.alt = p.name || 'Headshot'; img.loading = 'lazy';
      var nm = document.createElement('div');
      nm.className = 'nm'; nm.textContent = p.name || '';
      card.appendChild(img); card.appendChild(nm);
      card.addEventListener('click', function(){ openLb(i); });
      grid.appendChild(card);
    });
  };
  xhr.send();
})();
