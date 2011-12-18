sbApp.module.staticContent = (function() {
  sbApp.module.staticContent.model =  Backbone.Model.extend({
    initialize: function() {
      console.log(sbApp.config.outputElement);
    }
  });
});