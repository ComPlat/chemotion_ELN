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
      checkedDeviceIds: [],
      checkedDeviceAll: false,
      inboxModalVisible: false,
      inboxVisible: false,
      currentPage: 1,
      itemsPerPage: 20,
      currentContainerPage: 1,
      currentUnsortedBoxPage: 1,
      currentDeviceBoxPage: 1,
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
      handleCheckDeviceAttachments: InboxActions.checkDeviceAttachments,
      handleCheckedDeviceIds: InboxActions.checkedDeviceIds,
      handleCheckedDeviceAll: InboxActions.checkedDeviceAll,
      handlePrevClick: InboxActions.prevClick,
      handleNextClick: InboxActions.nextClick,

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
      handleFetchInboxUnsorted: InboxActions.fetchInboxUnsorted,
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
    this.state.activeDeviceBoxId = null;

    this.sync();
    this.countAttachments();
  }

  handleFetchInboxUnsorted(payload) {
    this.setState((prevState) => ({
      inbox: {
        ...prevState.inbox,
        unlinked_attachments: payload.unlinked_attachments,
        inbox_count: payload.inbox_count,
      },
      currentUnsortedBoxPage: 1,
    }));
  }

  handleFetchInboxCount(result) {
    this.state.numberOfAttachments = result.inbox_count;
  }

  handleFetchInboxContainer(payload) {
    const { inbox } = this.state;
    const updatedChildren = inbox.children.map((child) => {
      if (child.id === payload.inbox.id) {
        return {
          ...child,
          children_count: payload.inbox.children_count,
          children: payload.inbox.children,
        };
      }
      return child;
    });

    this.setState((prevState) => ({
      inbox: {
        ...prevState.inbox,
        inbox_count: payload.inbox.inbox_count,
        children: updatedChildren,
      },
      currentContainerPage: payload.currentContainerPage,
    }));

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

  handlePrevClick() {
    this.setState((prevState) => ({
      currentUnsortedBoxPage: prevState.currentUnsortedBoxPage - 1,
      checkedAll: false,
      checkedIds: [],
    }));
  }

  handleNextClick = () => {
    this.setState((prevState) => ({
      currentUnsortedBoxPage: prevState.currentUnsortedBoxPage + 1,
      checkedAll: false,
      checkedIds: [],
    }));
  };

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
      const { activeDeviceBoxId, currentContainerPage } = this.state;

      InboxActions.fetchInboxContainer(activeDeviceBoxId, currentContainerPage);
    }
  }

  handleDeleteContainerLink(result) {
    const { currentPage, itemsPerPage } = this.state;
    InboxActions.fetchInbox({ currentPage, itemsPerPage });
  }

  handleDeleteContainer(result) {
    const { inbox, activeDeviceBoxId, currentContainerPage } = this.state;

    const parentIndex = inbox.children.findIndex((inboxItem) => inboxItem.id === result.id);

    if (parentIndex >= 0) {
      const newInbox = { ...this.state.inbox };
      newInbox.children.splice(parentIndex, 1);
      this.setState({ inbox: newInbox });
    } else {
      InboxActions.fetchInboxContainer(activeDeviceBoxId, currentContainerPage);
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
    const {
      inbox, checkedIds, currentUnsortedBoxPage, dataItemsPerPage,
    } = this.state;
    const unlinkedAttachments = inbox.unlinked_attachments;
    const startIndex = (currentUnsortedBoxPage - 1) * dataItemsPerPage;
    const endIndex = startIndex + dataItemsPerPage;
    const currentAttachments = unlinkedAttachments.slice(startIndex, endIndex);

    if (params.type && params.range === 'child') {
      ArrayUtils.pushUniq(checkedIds, params.ids);
    } else if (params.type === false && params.range === 'child') {
      ArrayUtils.removeFromListByValue(checkedIds || [], params.ids);
    } else if (params.range === 'all' && params.type === true) {
      currentAttachments.forEach((attachment) => ArrayUtils.pushUniq(checkedIds, attachment.id));

      this.handleCheckedAll(params);
    } else if (params.range === 'all' && params.type === false) {
      currentAttachments.forEach((attachment) => ArrayUtils.removeFromListByValue(checkedIds || [], attachment.id));
      this.handleCheckedAll(params);
    }

    // If unsortedBox, remove devicebox attachments from checkedIds
    if (this.state.activeDeviceBoxId === -1) {
      for (let i = checkedIds.length - 1; i >= 0; i--) {
        const checkedId = checkedIds[i];
        const hasCorrespondingAttachment = currentAttachments.some((attachment) => attachment.id === checkedId);
        if (!hasCorrespondingAttachment) {
          checkedIds.splice(i, 1);
        }
      }
    }
  }

  handleCheckedDeviceAll(params) {
    const { checkedDeviceAll, inbox, activeDeviceBoxId } = this.state;

    if (params.range === 'all') {
      if (params.type) {
        const currentDeviceBox = inbox.children.find((deviceBox) => deviceBox.id === activeDeviceBoxId);
        if (currentDeviceBox) {
          const allDatasetIdsFlat = currentDeviceBox.children.map((dataset) => dataset.id);
          const allAttachments = currentDeviceBox.children.reduce((acc, dataset) => {
            acc.push(...dataset.attachments);
            return acc;
          }, []);
          const allAttachmentsFlat = _.flatten(allAttachments).map((attachment) => attachment.id);

          this.setState({
            checkedDeviceIds: allDatasetIdsFlat,
            checkedIds: allAttachmentsFlat,
          });
        }
      } else {
        this.setState({
          checkedDeviceIds: [],
          checkedIds: [],
        });
      }
    }

    this.setState({ checkedDeviceAll: !checkedDeviceAll });
  }

  handleCheckedDeviceIds(params) {
    this.setState({
      checkedDeviceIds: params.checkedDeviceIds,
      checkedIds: params.checkedIds
    });
  }

  handleCheckDeviceAttachments(params) {
    const { checkedIds } = this.state;

    const newCheckedIds = (params.isSelected)
      ? checkedIds.filter((checkedId) => checkedId !== params.ids)
      : [...checkedIds, params.ids];

    this.setState({ checkedIds: newCheckedIds });
  }
}

export default alt.createStore(InboxStore, 'InboxStore');
