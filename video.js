/* ============================================================================
   ACA DESIGN SYSTEM — video page (aca-video-*.html)
   Captions: every language's WebVTT track is attached; the button shows the
   page language's track or hides all of them. Sign language: the button
   shows the interpreter window over the picture (on the server a second,
   synchronised video goes in it). Transcript: each cue's time stamp seeks
   the video when there is a file to play.
   ============================================================================ */
(function () {
  'use strict';

  var player = document.querySelector('[data-player]');
  if (!player) { return; }
  var video = player.querySelector('video');
  var sign = player.querySelector('.sign-window');
  var lang = document.documentElement.getAttribute('lang') || 'ru';

  function setCaptions(on) {
    var tracks = video.textTracks || [];
    for (var i = 0; i < tracks.length; i++) {
      tracks[i].mode = on && tracks[i].language === lang ? 'showing' : 'hidden';
    }
  }

  [].forEach.call(player.querySelectorAll('[data-toggle]'), function (btn) {
    btn.addEventListener('click', function () {
      var on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(on));
      if (btn.dataset.toggle === 'captions') { setCaptions(on); }
      if (btn.dataset.toggle === 'sign') { sign.hidden = !on; }
    });
  });

  [].forEach.call(document.querySelectorAll('.cue[data-t]'), function (cue) {
    cue.addEventListener('click', function () {
      player.scrollIntoView({ block: 'start', behavior: 'smooth' });
      if (!video.currentSrc) { video.focus(); return; }   // prototype: no file yet
      video.currentTime = parseFloat(cue.dataset.t) || 0;
      var played = video.play();
      if (played && played.catch) { played.catch(function () { /* autoplay refused: the seek stands */ }); }
    });
  });
})();
