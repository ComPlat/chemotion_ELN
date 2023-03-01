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
      currentPage: 1,
      itemsPerPage: 3,
      totalPages: null,
    };

    this.bindListeners({
      handleToggleInboxModal: InboxActions.toggleInboxModal,
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
    });
  }

  handleToggleInboxModal() {
    const { inboxModalVisible } = this.state;
    this.setState({ inboxModalVisible: !inboxModalVisible });
    this.emitChange();
  }

  handleFetchInbox(result) {
    const { itemsPerPage } = this.state;
    const { inbox, count } = result;
    this.state.inbox = inbox;
    this.state.totalPages = Math.ceil(count / itemsPerPage);

    this.sync();
    this.countAttachments();
  }

  handleFetchInboxCount(result) {
    this.state.numberOfAttachments = result.inbox_count;
  }

  handleFetchInboxContainer(result) {
    const inbox = { ...this.state.inbox };
    const index = inbox.children.findIndex((obj) => obj.id === result.id);
    inbox.children[index].children = result.children;
    this.setState(inbox);
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

  handleDeleteAttachment(result) {
    const { currentPage, itemsPerPage } = this.state;
    InboxActions.fetchInbox({ currentPage, itemsPerPage });
  }

  handleDeleteContainerLink(result) {
    const { currentPage, itemsPerPage } = this.state;
    InboxActions.fetchInbox({ currentPage, itemsPerPage });
  }

  handleDeleteContainer(result) {
    const { currentPage, itemsPerPage } = this.state;
    InboxActions.fetchInbox({ currentPage, itemsPerPage });
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
    // #TODO: Fix this
    this.state.numberOfAttachments = 6;
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
