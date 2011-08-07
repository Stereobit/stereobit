$(function() {
  
  function calcFontSize(containerWidth) {    
    
    return containerWidth / 600;
  };
  
  function setFontSize(size) {
    $(".container").css("font-size", size + "em");
  };
  
  setFontSize(calcFontSize($(".container").width()));
  
  $(window).resize(function() {
    var containerWidth = $(".container").width();

    setFontSize(calcFontSize(containerWidth));
  });
  
});