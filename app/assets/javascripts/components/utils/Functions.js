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
    let event = new window.MouseEvent('click', {
      'view': window,
      'bubbles': true,
      'cancelable': true
    });
    link.dispatchEvent(event);
  },

  extraThing(extra){
    let obj = {}
    for (let i=0;i<extra['count'];i++){obj={...obj,...extra['content'+i]} }
    return obj;
  }


};

module.exports = Functions;
