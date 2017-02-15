import UIStore from '../stores/UIStore';

const SameEleTypId = (orig, next) => {
  let same = false;
  if(orig && next && orig.type === next.type && orig.id === next.id) {
    same = true;
  }
  return same;
}

const UrlSilentNavigation = (element) => {
  const {currentCollection, isSync} = UIStore.getState();
  if(element) {
    switch(element.type) {
      case 'deviceAnalysis':
        const {deviceId, sampleId, analysisType} = element
        Aviator.navigate(isSync
          ? `/scollection/${currentCollection.id}/device/${deviceId}/samples/${sampleId}/${analysisType}/`
          : `/collection/${currentCollection.id}/device/${deviceId}/samples/${sampleId}/${analysisType}/`,
          { silent: true }
        )
        break
      default:
        Aviator.navigate(isSync
          ? `/scollection/${currentCollection.id}/${element.type}/${element.id}/`
          : `/collection/${currentCollection.id}/${element.type}/${element.id}/`,
          { silent: true }
        )
        break
    }
  } else {
    Aviator.navigate(isSync
      ? `/scollection/${currentCollection.id}/`
      : `/collection/${currentCollection.id}/`,
      { silent: true }
    );
  }
}

module.exports = { SameEleTypId, UrlSilentNavigation };
