import React from 'react';
import { Button, OverlayTrigger, Badge, Glyphicon, Tooltip } from 'react-bootstrap';
import update from 'immutability-helper';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import CollectionSubtree from 'src/apps/mydb/collections/CollectionSubtree';
import UIActions from 'src/stores/alt/actions/UIActions';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import InboxStore from 'src/stores/alt/stores/InboxStore';
import UserInfos from 'src/apps/mydb/collections/UserInfos';
import SampleTaskNavigationElement from 'src/apps/mydb/collections/sampleTaskInbox/SampleTaskNavigationElement';
import SampleTaskInbox from 'src/apps/mydb/collections/sampleTaskInbox/SampleTaskInbox';

import DeviceBox from 'src/apps/mydb/inbox/DeviceBox';
import UnsortedBox from 'src/apps/mydb/inbox/UnsortedBox';
import GatePushBtn from './common/GatePushBtn';
import Aviator from 'aviator';
import { collectionShow, scollectionShow } from './routesUtils';

const colVisibleTooltip = <Tooltip id="col_visible_tooltip">Toggle own collections</Tooltip>;

export default class CollectionTree extends React.Component {
  constructor(props) {
    super(props);

    const collecState = CollectionStore.getState();
    const inboxState = InboxStore.getState();

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
      inbox: inboxState.inbox,
      numberOfAttachments: inboxState.numberOfAttachments,
      inboxVisible: false,
      visible: false,
      root: {},
      selected: false,
      itemsPerPage: inboxState.itemsPerPage,
      inboxSectionVisible: false,
    };

    this.onChange = this.onChange.bind(this);
    this.onClickInbox = this.onClickInbox.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.toggleExpansion = this.toggleExpansion.bind(this);
  }

  componentDidMount() {
    CollectionStore.listen(this.onChange);
    InboxStore.listen(this.onChange);
    //CollectionActions.fetchGenericEls();
    CollectionActions.fetchLockedCollectionRoots();
    CollectionActions.fetchUnsharedCollectionRoots();
    CollectionActions.fetchSharedCollectionRoots();
    CollectionActions.fetchRemoteCollectionRoots();
    CollectionActions.fetchSyncInCollectionRoots();
    InboxActions.fetchInboxCount();
    UIStore.listen(this.onChange);
  }

  componentWillUnmount() {
    CollectionStore.unlisten(this.onChange);
    InboxStore.unlisten(this.onChange);
    UIStore.unlisten(this.onChange);
  }

  handleSectionToggle = (visible) => {
    this.setState((prevState) => ({
      [visible]: !prevState[visible],
      inboxSectionVisible: false
    }));
  };

  onChange(state) {
    this.setState(state);
    if (state.currentCollection) {
      const visible = this.isVisible(this.state.root, state);
      const { root } = this.state;

      const selectedCol = (
        state.currentCollection.id == root.id &&
        state.currentCollection.is_synchronized == root.is_synchronized
      ) || (
        state.currentCollection.id == root.id &&
        state.currentCollection.isRemote == root.isRemote
      );

      if (selectedCol) {
        this.setState({
          selected: true,
          visible
        });
      } else {
        this.setState({
          selected: false,
          visible
        });
      }
    }
  }

  onClickInbox() {
    const {
      inboxSectionVisible, inbox, currentPage, itemsPerPage
    } = this.state;
    this.setState({
      inboxSectionVisible: !inboxSectionVisible,
      ownCollectionVisible: false,
      sharedToCollectionVisible: false,
      sharedWithCollectionVisible: false,
      syncCollectionVisible: false,
    });
    if (!inbox.children) {
      LoadingActions.start();
      InboxActions.fetchInbox({ currentPage, itemsPerPage });
    }
  }

  refreshInbox() {
    const { currentPage, itemsPerPage } = this.state;
    LoadingActions.start();
    InboxActions.fetchInbox({ currentPage, itemsPerPage });
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

    let labelledRoots = sharedRoots.map(e => {
      return update(e, {
        label: {
          $set:
            <span>{this.labelRoot('shared_to', e)}</span>
        }
      })
    })

    let subTreeLabels = (
      <div className="tree-view">
        <div
          className="title"
          style={{ backgroundColor: 'white' }}
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

    let labelledRoots = remoteRoots.map(e => {
      return update(e, {
        label: {
          $set:
            <span>
              {this.labelRoot('shared_by', e)}
              {' '}
              {this.labelRoot('shared_to', e)}
            </span>
        }
      })
    })

    let subTreeLabels = (
      <div className="tree-view">
        <div
          id="shared-home-link"
          className="title"
          style={{ backgroundColor: 'white' }}
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

  inboxSubtrees() {
    const { inbox, itemsPerPage } = this.state;

    let boxes = '';
    if (inbox.children) {
      inbox.children.sort((a, b) => {
        if (a.name > b.name) { return 1; } if (a.name < b.name) { return -1; } return 0;
      });
      boxes = inbox.children.map((deviceBox) => (
        <DeviceBox key={`box_${deviceBox.id}`} device_box={deviceBox} fromCollectionTree />
      ));
    }

    return (
      <div className="tree-view">
        <div
          role="button"
          onClick={InboxActions.showInboxModal}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              InboxActions.showInboxModal();
            }
          }}
        >
          {boxes}
          {inbox.children && inbox.children.length >= itemsPerPage ? (
            <div className="title" key="more" style={{ textAlign: 'center' }}>
              <i className="fa fa-ellipsis-h" aria-hidden="true" />
            </div>
          ) : ''}
        </div>
        {inbox.unlinked_attachments ? (
          <UnsortedBox
            key="unsorted_box"
            unsorted_box={inbox.unlinked_attachments}
            fromCollectionTree
          />
        ) : ''}
      </div>
    );
  }

  remoteSyncInSubtrees() {
    let { syncInRoots, syncCollectionVisible } = this.state
    syncInRoots = this.removeOrphanRoots(syncInRoots)

    let labelledRoots = syncInRoots.map(e => {
      return update(e, {
        label: {
          $set:
            <span>
              {this.labelRoot('shared_by', e)}
              {' '}
              {this.labelRoot('shared_to', e)}
            </span>
        }
      })
    })

    let subTreeLabels = (
      <div className="tree-view">
        <div
          id="synchron-home-link"
          className="title"
          style={{ backgroundColor: 'white' }}
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

  children(root) {
    return root.children || [];
  }

  hasChildren(root) {
    return this.children(root).length > 0;
  }
  subSubtrees(root) { // child
    // return null if root == undefined;
    const children = this.children(root);

    if (this.hasChildren(root)) {
      return children.map((child, index) => {
        return (
          <li key={index}>
            {this.collectionSubTree(child, child.label, this.state.isRemote, true)}
            {/*<CollectionSubtree root={child} isRemote={} />*/}
          </li>
        );
      });
    }
    return null;
  }
  isVisible(node, uiState) {
    if(node.descendant_ids) {
      let currentCollectionId = parseInt(uiState.currentCollection.id)
      if (node.descendant_ids.indexOf(currentCollectionId) > -1) return true
    }

    let { visibleRootsIds } = CollectionStore.getState();
    return (visibleRootsIds.indexOf(node.id) > -1)
  }

  synchronizedIcon(root) {
    let sharedUsers = root.sync_collections_users;
    return (
      sharedUsers && sharedUsers.length > 0
        ? <OverlayTrigger placement="bottom" overlay={UserInfos({ users: sharedUsers })}>
            <i className="fa fa-share-alt" style={{ float: "right" }}></i>
          </OverlayTrigger>
        : null
    )
  }

  toggleExpansion(e) {
    e.stopPropagation();
    const { visible, root } = this.state
    visible = !visible
    this.setState({ visible })

    let {visibleRootsIds} = CollectionStore.getState();
    if (visible) {
      visibleRootsIds.push(root.id)
    } else {
      let descendantIds = root.descendant_ids
        ? root.descendant_ids
        : root.children.map(function(s) { return s.id })
      descendantIds.push(root.id)
      visibleRootsIds = visibleRootsIds.filter(x => descendantIds.indexOf(x) == -1)
    }

    // Remove duplicate
    let newIds = Array.from(new Set(visibleRootsIds))
    CollectionActions.updateCollectrionTree(newIds)
  }

  expandButton(root) {
    let icon = this.state.visible ? 'minus' : 'plus';

    if (this.hasChildren(root)) {
      return (
        <Glyphicon
          glyph={icon}
          style={{ float: 'right', marginLeft: '5px' }}
          onClick={this.toggleExpansion}
        />
      );
    }
    return (<div />);
  }

  selectedCssClass() {
    return (this.state.selected) ? "selected" : "";
  }

  handleTakeOwnership(root) {
    const isSync = !!root.sharer;
    CollectionActions.takeOwnership({ id: root.id, isSync });
  }

  takeOwnershipButton(root, isRemote) {
    // const { root } = this.state;
    // const { isRemote } = this.state;
    const isTakeOwnershipAllowed = root.permission_level === 5;
    const isSync = !!((root.sharer && root.user && root.user.type !== 'Group'));
    if ((isRemote || isSync) && isTakeOwnershipAllowed) {
      return (
        <div className="take-ownership-btn">
          <i className="fa fa-exchange" onClick={e => this.handleTakeOwnership(e, root)} />
        </div>
      )
    }
    return (<div />);
  }

  handleClick(e, root) {
    const { fakeRoot } = this.props;
    if (fakeRoot) {
      e.stopPropagation();
      return;
    }

    this.setState({ root });
    // const { root } = this.state;
    let { visible } = this.state;
    const uiState = UIStore.getState();

    visible = visible || this.isVisible(root, uiState);
    this.setState({ visible });
    let collectionID = 'all';
    if (root.label === 'All' && root.is_locked) {
      Aviator.navigate(`/collection/all/${this.urlForCurrentElement()}`, { silent: true });
      collectionShow({ params: { collectionID } });
      return;
    }
    const url = (root.sharer)
      ? `/scollection/${root.id}/${this.urlForCurrentElement()}`
      : `/collection/${root.id}/${this.urlForCurrentElement()}`;
    Aviator.navigate(url, { silent: true });
    collectionID = root.id;
    const collShow = root.sharer ? scollectionShow : collectionShow;
    collShow({ params: { collectionID } });
  }

  collectionSubTree(root, label, isRemote, visible) {
    let style;
    if (!visible) {
      style = {
        display: 'none',
        marginBottom: 0
      };
    }
    const gated = root && root.is_locked && label == 'chemotion-repository.net' ?
      <GatePushBtn collection_id={root.id} /> : null;
    return (
      <div className="tree-view" key={root.id}>
        {this.takeOwnershipButton(root, isRemote)}

        <div
          id={`tree-id-${root.label}`}
          className={`title + ${this.selectedCssClass()}`}
          onClick={e => this.handleClick(e, root)}
        >
          {this.expandButton(root)}
          {this.synchronizedIcon(root)}
          {gated}
          {`${root.label}`}
        </div>
        <ul style={style}>
          { root && this.subSubtrees(root, label, isRemote, visible) }
        </ul>
      </div>
    );
  }
  subtrees(roots, label, isRemote, visible = true) {

    const subtrees = roots && roots.map((root, index) => {
    //   return <CollectionSubtree root={root} key={index} isRemote={isRemote}/>
    // })
      return (this.collectionSubTree(root, label, isRemote, visible));
    });

    let subtreesVisible = visible ? "" : "none"
    return (
      <div>
        {label}
        <div style={{ display: subtreesVisible }}>
          {subtrees}
        </div>
      </div>
    )
  }

  collectionManagementButton() {
    return (
      <div className="take-ownership-btn">
        <Button id="collection-management-button" bsSize="xsmall" bsStyle="danger"
          onClick={() => this.handleCollectionManagementToggle()}>
          <i className="fa fa-cog"></i>
        </Button>
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
    const { ownCollectionVisible, inboxSectionVisible } = this.state;

    const ownCollectionDisplay = ownCollectionVisible ? '' : 'none';
    const inboxDisplay = inboxSectionVisible ? '' : 'none';

    return (
      <div>
        <div className="tree-view">
          {this.collectionManagementButton()}
          <OverlayTrigger placement="top" delayShow={1000} overlay={colVisibleTooltip}>
            <div
              className="title"
              style={{ backgroundColor: 'white' }}
              onClick={() => this.handleSectionToggle('ownCollectionVisible')}
            >
              <i className="fa fa-list" /> &nbsp;&nbsp; Collections
            </div>
          </OverlayTrigger>
        </div>
        <div className="tree-wrapper" style={{ display: ownCollectionDisplay }}>
          {this.lockedSubtrees()}
          {this.unsharedSubtrees()}
        </div>
        <div className="tree-wrapper">
          {this.sharedSubtrees()}
        </div>
        <div className="tree-wrapper">
          {this.remoteSubtrees()}
        </div>
        <div className="tree-wrapper">
          {this.remoteSyncInSubtrees()}
        </div>
        <div className="tree-view">
          <div className="title" style={{ backgroundColor: 'white' }}>
            <button
              type="button"
              className="btn-inbox"
              onClick={() => this.onClickInbox()}
            >
              <i className="fa fa-inbox" />
              <span style={{ marginLeft: '10px', marginRight: '5px' }}>Inbox</span>
            </button>
            {
              this.state.numberOfAttachments > 0 ? <Badge> {this.state.numberOfAttachments} </Badge> : ''
            }
            <Glyphicon bsSize="small" glyph="refresh" style={{ marginLeft: '5px' }} onClick={() => this.refreshInbox()} />
            <OverlayTrigger placement="bottom" overlay={<Tooltip id="fullInbox">Show larger Inbox</Tooltip>}>
              <Button style={{ position: 'absolute', right: 0 }} bsSize="xsmall" onClick={InboxActions.toggleInboxModal}>
                <i className="fa fa-expand" aria-hidden="true" />
              </Button>
            </OverlayTrigger>

          </div>

        </div>
        <div className="tree-wrapper" style={{ display: inboxDisplay }}>
          {this.inboxSubtrees()}
        </div>
        <SampleTaskNavigationElement />
        <SampleTaskInbox />
      </div>
    );
  }
}
