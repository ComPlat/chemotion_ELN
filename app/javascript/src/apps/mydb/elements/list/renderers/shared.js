import { useState, useEffect } from 'react';
import Aviator from 'aviator';

import ElementStore from 'src/stores/alt/stores/ElementStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import { elementShowOrNew } from 'src/utilities/routesUtils';

export function useIsElementSelected() {
  const [currentElement, setCurrentElement] = useState(ElementStore.getState().currentElement?.id || null);

  useEffect(() => {
    const updateCurrentElement = (state) => {
      setCurrentElement(state.currentElement);
    };

    ElementStore.listen(updateCurrentElement);
    return () => ElementStore.unlisten(updateCurrentElement);
  }, []);

  return (element) => element.id === currentElement?.id;
}

export function showDetails(element) {
  const { id, type } = element;
  const { currentCollection, isSync } = UIStore.getState();

  const uri = isSync
    ? `/scollection/${currentCollection.id}/${type}/${id}`
    : `/collection/${currentCollection.id}/${type}/${id}`;
  Aviator.navigate(uri, { silent: true });

  const isGenericEl = (UserStore.getState().genericEls || [])
    .some(({ name }) => name === type);

  elementShowOrNew({
    type,
    klassType: isGenericEl ? 'GenericEl' : undefined,
    params: {
      collectionID: currentCollection.id,
      [`${type}ID`]: id,
    }
  });
}
