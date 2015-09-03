var Functions = {
  getMetaContent: function(name) {
    var metas = document.getElementsByTagName('meta');
 
    for (var i=0; i<metas.length; i++) {
      if (metas[i].getAttribute("name") == name) {
        return metas[i].getAttribute("content");
      }
    }
 
    return "";
  }
}
 
module.exports = Functions;