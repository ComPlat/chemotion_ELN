import _ from 'lodash';
import alt from 'src/stores/alt/alt';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import ArrayUtils from 'src/utilities/ArrayUtils';

class InboxStore {
  constructor() {
    this.state = {
      inbox: {},
      cache: [],
      deleteEl: null,
      numberOfAttachments: 0,
      checkedIds: [],
      checkedAll: false,
      inboxModalVisible: false,
      inboxVisible: false,
      currentPage: 1,
      itemsPerPage: 20,
      dataItemsPerPage: 35,
      totalPages: null,
      activeDeviceBoxId: null,
    };

    this.bindListeners({
      handleToggleInboxModal: InboxActions.toggleInboxModal,
      handleShowInboxModal: InboxActions.showInboxModal,
      handleFetchInbox: InboxActions.fetchInbox,
      handleFetchInboxCount: InboxActions.fetchInboxCount,
      handleFetchInboxContainer: InboxActions.fetchInboxContainer,
      handleRemoveAttachmentFromList: InboxActions.removeAttachmentFromList,
      handleRemoveUnlinkedAttachmentFromList: InboxActions.removeUnlinkedAttachmentFromList,
      handleRemoveDatasetFromList: InboxActions.removeDatasetFromList,
      handleDeleteAttachment: InboxActions.deleteAttachment,
      handleDeleteContainer: InboxActions.deleteContainer,
      handleBackToInbox: InboxActions.backToInbox,
      handleDeleteContainerLink: InboxActions.deleteContainerLink,
      handleCheckedAll: InboxActions.checkedAll,
      handleCheckedIds: InboxActions.checkedIds,

      handleUpdateCreateElementDict: [
        ElementActions.createSample,
        ElementActions.updateSample,
        ElementActions.createReaction,
      ],
      handleUpdateCreateElement: [
        ElementActions.updateReaction,
        ElementActions.createWellplate,
        ElementActions.updateWellplate,
        ElementActions.createScreen,
        ElementActions.updateScreen,
      ],
      handleClose: DetailActions.close,
      handleConfirmDelete: DetailActions.confirmDelete,
      handleDeleteElement: ElementActions.deleteElementsByUIState,
      handleSetPagination: InboxActions.setInboxPagination,
      setInboxVisible: InboxActions.setInboxVisible,
      setActiveDeviceBoxId: InboxActions.setActiveDeviceBoxId,
    });
  }

  handleToggleInboxModal() {
    const { inboxModalVisible } = this.state;
    this.setState({ inboxModalVisible: !inboxModalVisible });
    this.emitChange();
  }

  handleShowInboxModal() {
    const { inboxModalVisible } = this.state;
    if (!inboxModalVisible) {
      this.setState({ inboxModalVisible: true, inboxVisible: true });
      this.emitChange();
    }
  }

  handleFetchInbox(result) {
    const { itemsPerPage } = this.state;
    this.state.inbox = result;
    this.state.totalPages = Math.ceil(this.state.inbox.count / itemsPerPage);

    this.sync();
    this.countAttachments();
  }

  handleFetchInboxCount(result) {
    this.state.numberOfAttachments = result.inbox_count;
  }

  handleFetchInboxContainer(result) {
    const { inbox } = this.state;
    const updatedChildren = inbox.children.map((child) => {
      if (child.id === result.id) {
        return {
          ...child,
          children_count: result.children_count,
          children: result.children,
        };
      }
      return child;
    });

    this.setState({
      inbox: {
        ...inbox,
        inbox_count: result.inbox_count,
        children: updatedChildren,
      },
    });

    this.sync();
    this.countAttachments();
  }

  handleRemoveAttachmentFromList(attachment) {
    const { inbox } = this.state;

    inbox.children.forEach((deviceBox) => {
      deviceBox.children.forEach((dataset) => {
        const index = dataset.attachments.indexOf(attachment);
        if (index !== -1) {
          dataset.attachments.splice(index, 1);
          this.state.cache.push(attachment);
        }
      });
    });
    this.setState(inbox);
    this.countAttachments();
  }

  handleRemoveUnlinkedAttachmentFromList(attachment) {
    const { inbox } = this.state;

    const index = inbox.unlinked_attachments.indexOf(attachment);
    if (index !== -1) {
      inbox.unlinked_attachments.splice(index, 1);
      this.state.cache.push(attachment);
    }

    this.setState(inbox);
    this.countAttachments();
  }

  handleRemoveDatasetFromList(dataset) {
    let inbox = this.state.inbox;

    inbox.children.forEach(device_box => {
      var index = device_box.children.indexOf(dataset)
      if (index != -1) {
        device_box.children[index].attachments.forEach(attachment => {
          this.state.cache.push(attachment)
        })
        device_box.children[index].attachments = []
      }
    })

    this.setState(inbox)
    this.countAttachments();
  }

  handleDeleteAttachment(payload) {
    if (payload?.fromUnsorted) {
      const { inbox } = this.state;

      const updatedAttachments = inbox.unlinked_attachments.filter(
        (attachment) => attachment.id !== payload?.result.id
      );

      this.setState({
        inbox: {
          ...inbox,
          unlinked_attachments: updatedAttachments,
        },
      });
      this.countAttachments();
    } else {
      const { activeDeviceBoxId, currentPage } = this.state;

      InboxActions.fetchInboxContainer(activeDeviceBoxId, currentPage);
    }
  }

  handleDeleteContainerLink(result) {
    const { currentPage, itemsPerPage } = this.state;
    InboxActions.fetchInbox({ currentPage, itemsPerPage });
  }

  handleDeleteContainer(result) {
    const { inbox, activeDeviceBoxId, currentPage } = this.state;

    const parentIndex = inbox.children.findIndex((inboxItem) => inboxItem.id === result.id);

    if (parentIndex >= 0) {
      const newInbox = { ...this.state.inbox };
      newInbox.children.splice(parentIndex, 1);
      this.setState({ inbox: newInbox });
    } else {
      InboxActions.fetchInboxContainer(activeDeviceBoxId, currentPage);
    }
  }

  handleBackToInbox(attachment) {
    var attachments = this.state.cache.filter(function (item) {
      if (item.id == attachment.id) {
        return item
      }
    })

    if (attachments.length == 1) {
      var index = this.state.cache.indexOf(attachments[0])
      this.state.cache.splice(index, 1)
      const { currentPage, itemsPerPage } = this.state;
      InboxActions.fetchInbox({ currentPage, itemsPerPage });
    } else {
      InboxActions.deleteContainerLink(attachment)
    }
  }

  getAttachments(containers, all_attachments) {
    if (containers) {
      containers.forEach(container => {
        all_attachments.push.apply(all_attachments, container.attachments)
        this.getAttachments(container.children, all_attachments)
      })
    }
    return all_attachments
  }

  updateCache(attachments) {
    this.state.cache = _.differenceBy(this.state.cache, attachments, 'id')
  }

  handleUpdateCreateElementDict({ element, closeView }) {
    this.handleUpdateCreateElement(element);
  }

  handleUpdateCreateElement(element) {
    if (element && element.isEdited && element.container) {
      const all_attachments = this.getAttachments(element.container.children, [])
      this.updateCache(all_attachments);
      const { currentPage, itemsPerPage } = this.state;
      InboxActions.fetchInbox({ currentPage, itemsPerPage });
    }
  }

  handleClose({ deleteEl, force }) {
    this.state.deleteEl = deleteEl
  }

  handleConfirmDelete(confirm) {
    if (confirm) {
      this.handleUpdateCreateElement(this.state.deleteEl)
    }
    this.state.deleteEl = null
  }

  handleDeleteElement(result) {
    // if (!result || !result.selecteds) { return null; }
    this.waitFor(ElementStore.dispatchToken);
    const { selecteds } = ElementStore.getState();
    selecteds.forEach(element => this.handleUpdateCreateElement(element));
  }

  handleSetPagination(pagination) {
    const { currentPage } = pagination;
    this.state.currentPage = currentPage;
  }

  setInboxVisible(params) {
    const { inboxVisible } = params;
    this.state.inboxVisible = inboxVisible;
  }

  setActiveDeviceBoxId(deviceBoxId) {
    this.state.activeDeviceBoxId = deviceBoxId;
  }

  sync() {
    let inbox = this.state.inbox

    inbox.children.forEach(device_box => {
      device_box.children.forEach(dataset => {
        dataset.attachments = _.differenceBy(dataset.attachments, this.state.cache, 'id')
      })
    })
    inbox.unlinked_attachments = _.differenceBy(inbox.unlinked_attachments, this.state.cache, 'id')

    this.setState(inbox)
  }

  countAttachments() {
    const { inbox } = this.state;
    this.state.numberOfAttachments = inbox.inbox_count + inbox.unlinked_attachments.length;
  }

  handleCheckedAll(params) {
    const { checkedAll } = this.state;
    this.setState(({ checkedAll: params.type }));
    return checkedAll;
  }

  handleCheckedIds(params) {
    const { inbox, checkedIds } = this.state;
    const unlikedAttachments = inbox.unlinked_attachments;
    if (params.type && params.range === 'child') {
      ArrayUtils.pushUniq(checkedIds, params.ids);
    } else if (params.type === false && params.range === 'child') {
      ArrayUtils.removeFromListByValue(checkedIds || [], params.ids);
    } else if (params.range === 'all' && params.type === true) {
      unlikedAttachments.map(attachment => ArrayUtils.pushUniq(checkedIds, attachment.id));
      this.handleCheckedAll(params);
    } else if (params.range === 'all' && params.type === false) {
      unlikedAttachments.map(attachment => ArrayUtils.removeFromListByValue(checkedIds || [], attachment.id));
      this.handleCheckedAll(params);
    }
  }
}

export default alt.createStore(InboxStore, 'InboxStore');
