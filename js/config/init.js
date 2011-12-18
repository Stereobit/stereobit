var sbApp = sbApp || {};
    sbApp.config = sbApp.config || {};   

$(function() {
  sbApp.config.outputElement = $("#content");
  sbApp.config.title = $("title");
  
   new sbApp.config.router; 
  
  Backbone.history.start({pushState: true});
});