import React, { useContext } from 'react';
import Tree from 'react-ui-tree';
import { Button, ButtonGroup, OverlayTrigger, Popover } from 'react-bootstrap';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

function SharedWithMeCollections() {
  const collectionsStore = useContext(StoreContext).collections;
  const tree = collectionsStore.shared_with_me_collection_tree;

  const handleChange = (tree) => {
    collectionsStore.setSharedWithMeCollectionTree(tree);
  }

  const rejectShared = (node) => {
    collectionsStore.deleteCollectionShare(node.collection_share_id, node.id);
  }

  const renderNode = (node) => {
    if (node.id === -1) { 
      return (
        <div className="ms-3 mb-2 fs-5">{node.label}</div>
      );
    }

    if (node.is_locked) {
      return (
        <h5
          className="ms-3"
          onMouseDown={(e) => e.stopPropagation}
        >
          {node.label}
        </h5>
      );
    } else {
      const popover = (
        <Popover>
          <Popover.Body>
            <div>Delete collection?</div>
            <div>"{node.label}"</div>
            <div className="mt-2">
              <ButtonGroup>
                <Button
                  variant="danger"
                  size="sm"
                  className="me-2"
                  onClick={() => rejectShared(node)}
                >
                  Yes
                </Button>
                <Button
                  variant="warning"
                  size="sm"
                  onClick={() => {}}
                >
                  No
                </Button>
              </ButtonGroup>
            </div>
          </Popover.Body>
        </Popover>
      );

      return (
        <div 
          className="d-flex align-items-center justify-content-between bg-dark-subtle mb-2"
          draggable={false}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="ms-3">
            {node.label}
          </div>
          <ButtonGroup>
            <OverlayTrigger
              animation
              placement="bottom"
              root
              trigger="focus"
              overlay={popover}
            >
              <Button size="sm" variant="danger">
                <i className="fa fa-trash-o" />
              </Button>
            </OverlayTrigger>
          </ButtonGroup>
        </div>
      );
    }
  }

  return (
    <div className="tree mt-2">
      <Tree
        paddingLeft={20}
        tree={tree}
        onChange={handleChange}
        renderNode={renderNode}
      />
    </div>
  );

}

export default observer(SharedWithMeCollections);
