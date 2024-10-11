import React from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import Aviator from 'aviator';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import CollectionSubtree from 'src/apps/mydb/collections/CollectionSubtree';
import UIActions from 'src/stores/alt/actions/UIActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import UserInfos from 'src/apps/mydb/collections/UserInfos';

const colVisibleTooltip = <Tooltip id="col_visible_tooltip">Toggle own collections</Tooltip>;

export default class CollectionTree extends React.Component {
  constructor(props) {
    super(props);

    const collecState = CollectionStore.getState();

    this.state = {
      unsharedRoots: collecState.unsharedRoots,
      sharedRoots: collecState.sharedRoots,
      remoteRoots: collecState.remoteRoots,
      lockedRoots: collecState.lockedRoots,
      syncInRoots: collecState.syncInRoots,
      ownCollectionVisible: true,
      sharedWithCollectionVisible: false,
      sharedToCollectionVisible: false,
      syncCollectionVisible: false,
      visible: false,
      root: {},
      selected: false,
    };

    this.onChange = this.onChange.bind(this);
    this.handleCollectionManagementToggle = this.handleCollectionManagementToggle.bind(this);
  }

  componentDidMount() {
    CollectionStore.listen(this.onChange);
    CollectionActions.fetchLockedCollectionRoots();
    CollectionActions.fetchUnsharedCollectionRoots();
    CollectionActions.fetchSharedCollectionRoots();
    CollectionActions.fetchRemoteCollectionRoots();
    CollectionActions.fetchSyncInCollectionRoots();
  }

  componentWillUnmount() {
    CollectionStore.unlisten(this.onChange);
  }

  handleSectionToggle = (visible) => {
    this.setState((prevState) => ({
      [visible]: !prevState[visible],
    }));
  };

  onChange(state) {
    this.setState(state);
  }

  lockedSubtrees() {
    const roots = this.state.lockedRoots;

    return this.subtrees(roots, null, false);
  }

  removeOrphanRoots(roots) {
    let newRoots = []
    roots.forEach((root) => {
      if (root.children.length > 0) newRoots.push(root)
    })

    return newRoots;
  }

  unsharedSubtrees() {
    let roots = this.state.unsharedRoots;
    roots = roots.filter(function (item) { return !item.isNew })

    return this.subtrees(roots, null, false);
  }

  sharedSubtrees() {
    let { sharedRoots, sharedToCollectionVisible } = this.state
    sharedRoots = this.removeOrphanRoots(sharedRoots)

    let labelledRoots = sharedRoots.map(e => ({
      ...e,
      label: <span>{this.labelRoot('shared_to', e)}</span>
    }));

    let subTreeLabels = (
      <div className="tree-view">
        <div
          className="title bg-white"
          onClick={() => this.handleSectionToggle('sharedToCollectionVisible')}
        >
          <i className="fa fa-share-alt share-icon" />&nbsp;&nbsp;
          My shared collections
        </div>
      </div>
    )
    return this.subtrees(labelledRoots, subTreeLabels,
      false, sharedToCollectionVisible)
  }

  remoteSubtrees() {
    let { remoteRoots, sharedWithCollectionVisible } = this.state
    remoteRoots = this.removeOrphanRoots(remoteRoots)

    let labelledRoots = remoteRoots.map(e => ({
      ...e,
      label: (
        <span>
          {this.labelRoot('shared_by', e)}
          {' '}
          {this.labelRoot('shared_to', e)}
        </span>
      )
    }));

    let subTreeLabels = (
      <div className="tree-view">
        <div
          id="shared-home-link"
          className="title bg-white"
          onClick={() => this.handleSectionToggle('sharedWithCollectionVisible')}
        >
          <i className="fa fa-share-alt share-icon" />
          &nbsp;&nbsp;
          Shared with me &nbsp;
        </div>
      </div>
    )

    return this.subtrees(labelledRoots, subTreeLabels,
      false, sharedWithCollectionVisible)
  }

  remoteSyncInSubtrees() {
    let { syncInRoots, syncCollectionVisible } = this.state
    syncInRoots = this.removeOrphanRoots(syncInRoots)

    let labelledRoots = syncInRoots.map(e => ({
      ...e,
      label: (
        <span>
          {this.labelRoot('shared_by', e)}
          {' '}
          {this.labelRoot('shared_to', e)}
        </span>
      )
    }));

    let subTreeLabels = (
      <div className="tree-view">
        <div
          id="synchron-home-link"
          className="title bg-white"
          onClick={() => this.handleSectionToggle('syncCollectionVisible')}
        >
          <i className="fa fa-share-alt" />&nbsp;&nbsp;
          Synchronized with me &nbsp;
        </div>
      </div>
    )

    return this.subtrees(labelledRoots, subTreeLabels,
      false, syncCollectionVisible)
  }


  labelRoot(sharedToOrBy, rootCollection) {
    let shared = rootCollection[sharedToOrBy]
    if (!shared) return <span />

    return (
      <OverlayTrigger placement="bottom" overlay={UserInfos({ users: [shared] })}>
        <span>
          &nbsp; {sharedToOrBy == 'shared_to' ? 'with' : 'by'}
          &nbsp; {shared.initials}
        </span>
      </OverlayTrigger>
    )
  }

  convertToSlug(name) {
    return name.toLowerCase()
  }

  subtrees(roots, label, isRemote, visible = true) {
    return (
      <div>
        {label}
        {visible && (
          <div>
            {roots && roots.map((root) => (
              <CollectionSubtree root={root} key={`collection-${root.id}`} isRemote={isRemote} />
            ))}
          </div>
        )}
      </div>
    )
  }

  handleCollectionManagementToggle() {
    UIActions.toggleCollectionManagement();
    const { showCollectionManagement, currentCollection, isSync } = UIStore.getState();
    if (showCollectionManagement) {
      Aviator.navigate('/collection/management');
    } else {
      if (currentCollection == null || currentCollection.label == 'All') {
        Aviator.navigate(`/collection/all/${this.urlForCurrentElement()}`);
      } else {
        Aviator.navigate(isSync
          ? `/scollection/${currentCollection.id}/${this.urlForCurrentElement()}`
          : `/collection/${currentCollection.id}/${this.urlForCurrentElement()}`);
      }
    }
  }

  urlForCurrentElement() {
    const { currentElement } = ElementStore.getState();
    if (currentElement) {
      if (currentElement.isNew) {
        return `${currentElement.type}/new`;
      }
      else {
        return `${currentElement.type}/${currentElement.id}`;
      }
    }
    else {
      return '';
    }
  }

  render() {
    const { ownCollectionVisible } = this.state;

    return (
      <div>
        <div className="tree-view">
          <div className="take-ownership-btn">
            <Button
              id="collection-management-button"
              size="xsm"
              variant="danger"
              title="Manage & organize collections: create or delete collections, adjust sharing options, adjust the visibility of tabs based on the collection level"
              onClick={this.handleCollectionManagementToggle}
            >
              <i className="fa fa-cog" />
            </Button>
          </div>
          <OverlayTrigger placement="top" delayShow={1000} overlay={colVisibleTooltip}>
            <div
              className="title bg-white"
              onClick={() => this.handleSectionToggle('ownCollectionVisible')}
            >
              <i className="fa fa-list me-2" />
              Collections
            </div>
          </OverlayTrigger>
        </div>
        {ownCollectionVisible && (
          <div className="tree-wrapper">
            {this.lockedSubtrees()}
            {this.unsharedSubtrees()}
          </div>
        )}
        <div className="tree-wrapper">
          {this.sharedSubtrees()}
        </div>
        <div className="tree-wrapper">
          {this.remoteSubtrees()}
        </div>
        <div className="tree-wrapper">
          {this.remoteSyncInSubtrees()}
        </div>
      </div>
    );
  }
}
