import React, { Fragment, useState, useEffect } from 'react';
import classnames from 'classnames';

import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';

import CollectionSubtree from 'src/apps/mydb/collections/CollectionSubtree';
import CollapsibleButton from 'src/apps/mydb/layout/sidebar/CollapsibleButton';
import CollectionManagementButton from 'src/apps/mydb/collections/CollectionManagementButton';

export default function CollectionTree({ isCollapsed, expandSidebar }) {
  const [collections, setCollections] = useState(CollectionStore.getState());
  const [activeCollection, setActiveCollection] = useState('collections');
  const setCollection = (collection) => {
    if (isCollapsed) {
      expandSidebar();
      setActiveCollection(collection)
    } else {
      setActiveCollection(collection !== activeCollection ? collection : null);
    }
  };

  useEffect(() => {
    CollectionActions.fetchLockedCollectionRoots();
    CollectionActions.fetchUnsharedCollectionRoots();
    CollectionActions.fetchSharedCollectionRoots();
    CollectionActions.fetchRemoteCollectionRoots();
    CollectionActions.fetchSyncInCollectionRoots();

    // Create a copy of the collection store state to trigger a re-render
    const onCollectionStoreChange = (s) => setCollections({ ...s });
    CollectionStore.listen(onCollectionStoreChange);
    return () => CollectionStore.unlisten(onCollectionStoreChange);
  }, []);

  const {
    lockedRoots,
    unsharedRoots,
    sharedRoots,
    remoteRoots,
    syncInRoots,
  } = collections;

  const collectionGroups = [
    {
      label: 'Collections',
      icon: 'fa-list',
      collectionKey: 'collections',
      roots: [...lockedRoots, ...unsharedRoots],
    },
    {
      label: 'My shared collections',
      icon: 'fa-cloud-upload',
      collectionKey: 'sharedByMe',
      roots: sharedRoots,
    },
    {
      label: 'Shared with me',
      icon: 'fa-cloud-download',
      collectionKey: 'sharedWithMe',
      roots: remoteRoots,
    },
    {
      label: 'Synchronized with me',
      icon: 'fa-share-alt',
      collectionKey: 'syncedWithMe',
      roots: syncInRoots,
    }
  ]

  return (
    <div className={classnames(
      'd-flex flex-column mh-100 gap-1',
      { 'align-items-center': isCollapsed }
    )}>
      {collectionGroups.map(({ label, icon, collectionKey, roots }) => {
        const isActive = activeCollection === collectionKey;
        return (
          <Fragment key={collectionKey}>
            <CollapsibleButton
              label={label}
              icon={icon}
              isCollapsed={isCollapsed}
              onClick={() => setCollection(collectionKey)}
              variant={isActive && !isCollapsed ? 'primary' : 'light'}
            />
            {isActive && !isCollapsed && (
              <div className="overflow-y-auto ms-2">
                {roots.length === 0
                  ? <div className="text-muted text-center p-2">No collections</div>
                  : roots.map((root) => <CollectionSubtree key={root.id} root={root} />)
                }
              </div>
            )}
          </Fragment>
        );
      })}

      <CollectionManagementButton isCollapsed={isCollapsed} />
    </div>
  );
}
