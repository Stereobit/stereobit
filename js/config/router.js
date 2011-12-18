var sbApp = sbApp || {};
    sbApp.config = sbApp.config || {};

sbApp.config.router = Backbone.Router.extend({

  routes: {
    "home" : "home",
    "404"  : "errorPage" 
  },

  home: function() {
    var template = sbApp.config.templates.home;
        content = sbApp.config.content.home;
    this._renderContent(template, content);
  },
  
  errorPage: function() {
    this._standardContent("errorPage");
  },
  
  _standardContent: function(content) {
    this._renderContent(sbApp.config.templates.standard, sbApp.config.content[content]);
  },
  
  _renderContent: function(template, content) {
    sbApp.config.outputElement.html(_.template(template, content));
    sbApp.config.title.html(_.template(content.title));
  }

});