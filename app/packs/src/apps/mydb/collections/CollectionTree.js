import React from 'react';
import { Button, OverlayTrigger, Badge, Glyphicon, Tooltip } from 'react-bootstrap';
import update from 'immutability-helper';
import Aviator from 'aviator';
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

const colVisibleTooltip = <Tooltip id="col_visible_tooltip">Toggle own collections</Tooltip>;

export default class CollectionTree extends React.Component {
  constructor(props) {
    super(props);

    const collecState = CollectionStore.getState();
    const inboxState = InboxStore.getState();

    this.state = {
      myCollections: collecState.myCollections,
      sharedCollections: collecState.sharedCollections,
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
  }

  componentDidMount() {
    CollectionStore.listen(this.onChange);
    InboxStore.listen(this.onChange);
    //CollectionActions.fetchGenericEls();
    CollectionActions.fetchLockedCollectionRoots();
    CollectionActions.fetchMyCollections();
    CollectionActions.fetchCollectionsSharedWithMe();
    CollectionActions.fetchUnsharedCollectionRoots();
    CollectionActions.fetchSharedCollectionRoots();
    CollectionActions.fetchRemoteCollectionRoots();
    CollectionActions.fetchSyncInCollectionRoots();
    InboxActions.fetchInboxCount();
  }

  componentWillUnmount() {
    CollectionStore.unlisten(this.onChange);
    InboxStore.unlisten(this.onChange);
  }

  handleSectionToggle = (visible) => {
    this.setState((prevState) => ({
      [visible]: !prevState[visible],
      inboxSectionVisible: false
    }));
  };

  onChange(state) {
    this.setState(state);
  }

  onClickInbox() {
    const {
      inboxSectionVisible, inbox, currentPage, itemsPerPage
    } = this.state;
    this.setState({ inboxSectionVisible: !inboxSectionVisible });
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

  myCollections() {
    let { myCollections } = this.state;
    myCollections = myCollections.filter(c => (c.is_shared === false && c.is_locked === false ));

    const subtrees = myCollections.map((root, index) => {
      return <CollectionSubtree root={root} key={index} />
    })

    return (
      <div>
        <div style={{ display: '' }}>
          {subtrees}
        </div>
      </div>
    );
  }

  unsharedSubtrees() {
    let roots = this.state.unsharedRoots;
    roots = roots.filter(function (item) { return !item.isNew })

    return this.subtrees(roots, null, false);
  }

  sharedSubtrees() {
    let { sharedRoots, sharedToCollectionVisible, myCollections } = this.state;
    myCollections = myCollections.filter(c => (c.is_shared === true));
    let collections = [];
    let sharedCollectionRoots = {};
    myCollections.forEach((collection) => {
      let children = []
      let label = ''
      let user = {}
      collection.collection_acls.forEach((acl) => {
        children.push(acl);
        label = `with ${acl.user.initials}`;
        user = acl.user;
      })
      const sameSharedTo = collections.find(c => (c.label == label));
      if (sameSharedTo) {
        children.forEach(c => sameSharedTo.children.push(c))
      } else {
        let sharedCollection = {}
        sharedCollection.id = collection.id;
        sharedCollection.label = label;
        sharedCollection.shared_to = user;
        sharedCollection.children = children;
        collections.push(sharedCollection);
      }
    });

    if (collections.length > 0) {
      sharedCollectionRoots = collections.map(e => {
        return update(e, {
          label: {
            $set:
              <span>{this.labelRoot('shared_to', e)}</span>
          }
        })
      })
    }

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
    return this.subtrees(sharedCollectionRoots, subTreeLabels,
      false, sharedToCollectionVisible, 'shared_to')
  }

  remoteSubtrees() {
    let { remoteRoots, sharedWithCollectionVisible, sharedCollections } = this.state
    remoteRoots = this.removeOrphanRoots(remoteRoots)

    const collections = []
    sharedCollections.forEach((collection) => {
      let children = []
      let label = ''
      let user = {}
      collection.collection_acls.forEach((acl) => {
        children.push(acl);
        label = `with ${acl.user.initials}`;
        user = acl.user
      })
      if (collection.collection_acls.length > 0){
        let sharedCollection = {};
        sharedCollection.label = label;
        sharedCollection.shared_to = user;
        sharedCollection.children = children;
        collections.push(sharedCollection);
      }
    });

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
      false, sharedWithCollectionVisible, 'shared_by')
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

  // remoteSyncInSubtrees() {
  sharedWithMeSubtrees() {
    let { syncInRoots, syncCollectionVisible, sharedCollections } = this.state
    syncInRoots = this.removeOrphanRoots(syncInRoots)
    sharedCollections = sharedCollections.filter(c => (c.shared_by !== null));

    const collections = [];
    let sharedLabelledRoots = {};
    sharedCollections.forEach((collection) => {
      let children = [];
      let label = `by ${collection.shared_by.initials}`;
      let user = {};
      let uid = -1;
      collection.collection_acls.forEach((acl) => {
        children.push(acl);
        user = acl.user;
        uid = acl.id;
      })

      const sameSharedTo = collections.find(c => (c.label == label));
      if (sameSharedTo) {
        children.forEach(c => sameSharedTo.children.push(c))
      } else {
        let sharedCollection = {}
        sharedCollection.uid = uid;
        sharedCollection.label = label;
        sharedCollection.shared_to = user;
        sharedCollection.shared_by = collection.shared_by;
        sharedCollection.children = children;
        collections.push(sharedCollection);
      }
    });

    sharedLabelledRoots = collections.map(e => {
      return update(e, {
        label: {
          $set:
            <span>{this.labelRoot('shared_by', e)}</span>
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
          Shared with me &nbsp;
        </div>
      </div>
    )

    return this.subtrees(sharedLabelledRoots, subTreeLabels,
      false, syncCollectionVisible, 'shared_by')
  }


  labelRoot(sharedToOrBy, rootCollection) {
    let collection = rootCollection[sharedToOrBy]
    if (!collection) return <span />

    return (
      <OverlayTrigger placement="bottom" overlay={UserInfos({ users:[collection] })}>
        <span>
          &nbsp; {sharedToOrBy == 'shared_to' ? 'with' : 'by'}
          &nbsp; {sharedToOrBy == 'shared_to' ? collection.initials : rootCollection.shared_by.initials}
        </span>
      </OverlayTrigger>
    )
  }

  convertToSlug(name) {
    return name.toLowerCase()
  }

  subtrees(roots, label, isRemote, visible = true, sharedToOrBy) {

    if (roots.length == undefined ) return <div />
    let subtrees = roots.map((root, index) => {
      return <CollectionSubtree root={root} key={index} isRemote={isRemote} sharedToOrBy={sharedToOrBy} />
    })

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
          title="Manage & organize collections: create or delete collections, adjust sharing options, adjust the visibility of tabs based on the collection level"
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
          {/*{this.lockedSubtrees()}*/}
          {/*{this.unsharedSubtrees()}*/}
          {/*{this.myLockedCollections()}*/}
          {this.myCollections()}
        </div>
        <div className="tree-wrapper">
          {this.sharedSubtrees()}
        </div>
        <div className="tree-wrapper">
          {/*{this.remoteSubtrees()}*/}
        </div>
        <div className="tree-wrapper">
          {/*{this.remoteSyncInSubtrees()}*/}
          {this.sharedWithMeSubtrees()}
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
