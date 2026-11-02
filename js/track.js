// Click tracking for the static pages: any element with data-ev sends a GA4 event,
// mirrored to Meta Pixel with the same mapping the home app uses.
(function(){
  var FB={whatsapp_click:"Contact"};
  document.addEventListener("click",function(e){
    var a=e.target.closest("[data-ev]");
    if(!a)return;
    var ev=a.getAttribute("data-ev"),p={location:a.getAttribute("data-loc")||"",page:location.pathname};
    if(typeof gtag==="function")gtag("event",ev,p);
    if(typeof fbq==="function"){FB[ev]?fbq("track",FB[ev],p):fbq("trackCustom",ev,p);}
  });
})();
