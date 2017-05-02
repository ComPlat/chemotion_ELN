import UIStore from '../stores/UIStore';
import _ from 'lodash'

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

    let elementString = `${element.type}`
    if (!isNaN(element.id)) elementString = elementString + `/${element.id}`

    Aviator.navigate(isSync
      ? `/scollection/${currentCollection.id}/${elementString}`
      : `/collection/${currentCollection.id}/${elementString}`,
      { silent: true }
    );
  } else {
    Aviator.navigate(isSync
      ? `/scollection/${currentCollection.id}/`
      : `/collection/${currentCollection.id}/`,
      { silent: true }
    );
  }
}

module.exports = { SameEleTypId, UrlSilentNavigation };
