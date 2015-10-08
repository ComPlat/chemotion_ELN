const Functions = {
  getMetaContent: function(name) {
    var metas = document.getElementsByTagName('meta');
 
    for (var i=0; i<metas.length; i++) {
      if (metas[i].getAttribute("name") == name) {
        return metas[i].getAttribute("content");
      }
    }
 
    return "";
  },
  downloadFile(file) {
    const {contents, name} = file;
    const link = document.createElement('a');
    link.download = name;
    link.href = contents;
    link.click();
  }
};
 
module.exports = Functions;