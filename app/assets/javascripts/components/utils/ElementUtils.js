import Aviator from 'aviator';
import UIStore from '../stores/UIStore';

const SameEleTypId = (orig, next) => {
  let same = false;
  if (orig && next && orig.type === next.type && orig.id === next.id) {
    same = true;
  }
  return same;
};

const UrlSilentNavigation = (element) => {
  const { currentCollection, isSync } = UIStore.getState();
  if (element) {
    let elementString = `${element.type}`;
    if (!isNaN(element.id)) elementString += `/${element.id}`;

    const collectionUrl = `${currentCollection.id}/${elementString}`;
    Aviator.navigate(
      isSync ? `/scollection/${collectionUrl}` : `/collection/${collectionUrl}`,
      { silent: true },
    );
  } else {
    const cId = currentCollection.id;
    Aviator.navigate(
      isSync ? `/scollection/${cId}/` : `/collection/${cId}/`,
      { silent: true },
    );
  }
};

module.exports = { SameEleTypId, UrlSilentNavigation };
