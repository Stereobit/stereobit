var sbApp = sbApp || {};
    sbApp.config = sbApp.config || {};
    
sbApp.config.outputElement = $("content");

new sbApp.config.router;
      
$(function() {
  Backbone.history.start({pushState: true});
});