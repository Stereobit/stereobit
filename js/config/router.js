var sbApp = sbApp || {};
    sbApp.config = sbApp.config || {};

sbApp.config.router = Backbone.Router.extend({

  routes: {
    ""    : "home",
    "404" : "errorPage" 
  },

  home: function() {
    var template = sbApp.config.templates.home,
        content = {content : "Tobias polishes <dfn id=\"css\"><abbr title=\"Cascading Style Sheets\">CSS</abbr></dfn>, <dfn id=\"js\"><abbr title=\"JavaScript\">JS</abbr></dfn> and <dfn id=\"html\" title=\"Hypertext Markup Language\">markup</dfn>. He finds his interest piqued by the likes of accessibility, semantics, and usability. His goal is to create the most usable, fast and handsome interface that's possible."};
    console.log(this.compiled(template, content));
    console.log(sbApp);
  },
  
  errorPage: function() {
    var compiled = _.template("<p><%= content %></p>");
    console.log(compiled({content : "404"}));
  },
  
  compiled: function(template, content) {
    return _.template(template, content);
  }

});