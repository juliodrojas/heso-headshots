(function(){
  "use strict";
  var pinInput = document.getElementById('pinInput');
  var pinGo = document.getElementById('pinGo');
  var pinErr = document.getElementById('pinErr');
  function err(m){ if (pinErr) pinErr.textContent = m || ''; }
  function unlock(){
    var pin = (pinInput.value || '').trim();
    if (!pin){ err('Enter the PIN.'); return; }
    err('');
    pinGo.disabled = true;
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/verify', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 9000;
    xhr.onreadystatechange = function(){
      if (xhr.readyState === 4){
        pinGo.disabled = false;
        var ok = false;
        try { ok = xhr.status === 200 && !!JSON.parse(xhr.responseText || '{}').ok; } catch(e){}
        if (ok){ window.location.href = '/gallery.html'; }
        else { err('Wrong PIN — try again.'); pinInput.value = ''; pinInput.focus(); }
      }
    };
    xhr.ontimeout = function(){ pinGo.disabled = false; err('No response — try again.'); };
    xhr.onerror = function(){ pinGo.disabled = false; err('No response — try again.'); };
    try { xhr.send(JSON.stringify({ pin: pin })); } catch(e){ pinGo.disabled = false; err('No response — try again.'); }
  }
  pinGo.addEventListener('click', unlock);
  pinInput.addEventListener('keydown', function(e){ if (e.key === 'Enter') unlock(); });

  // Already unlocked on this device? The auth cookie lasts 30 days — offer a straight path in.
  var enterBtn = document.getElementById('enterGallery');
  if (enterBtn && window.fetch){
    fetch('/gallery.html', { credentials: 'same-origin' }).then(function(r){
      if (r.ok && !r.redirected && r.url.indexOf('gallery.html') !== -1){
        enterBtn.style.display = 'block';
        enterBtn.addEventListener('click', function(){ window.location.href = '/gallery.html'; });
      }
    }).catch(function(){});
  }
  pinInput.focus();
})();
