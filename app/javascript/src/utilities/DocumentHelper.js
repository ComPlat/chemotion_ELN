const DocumentHelper = {
  getMetaContent(name) {
    const metas = document.getElementsByTagName('meta');

    for (let i = 0; i < metas.length; i++) {
      if (metas[i].getAttribute('name') == name) {
        return metas[i].getAttribute('content');
      }
    }

    return '';
  }
};

module.exports = DocumentHelper;
