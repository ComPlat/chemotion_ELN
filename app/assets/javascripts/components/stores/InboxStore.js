import _ from 'lodash';
import alt from '../alt';
import InboxActions from '../actions/InboxActions';
import ElementActions from '../actions/ElementActions';
import DetailActions from '../actions/DetailActions';
import ElementStore from './ElementStore';

class InboxStore {
  constructor() {
    this.state = {
      inbox: {},
      cache: [],
      deleteEl: null,
      numberOfAttachments: 0,
      inboxModalVisible: false
    };

    this.bindListeners({
      handleToggleInboxModal: InboxActions.toggleInboxModal,
      handleFetchInbox: InboxActions.fetchInbox,
      handleFetchInboxCount: InboxActions.fetchInboxCount,
      handleRemoveAttachmentFromList: InboxActions.removeAttachmentFromList,
      handleRemoveUnlinkedAttachmentFromList: InboxActions.removeUnlinkedAttachmentFromList,
      handleRemoveDatasetFromList: InboxActions.removeDatasetFromList,
      handleDeleteAttachment: InboxActions.deleteAttachment,
      handleDeleteContainer: InboxActions.deleteContainer,
      handleBackToInbox: InboxActions.backToInbox,
      handleDeleteContainerLink: InboxActions.deleteContainerLink,

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
      handleDeleteElement: ElementActions.deleteElementsByUIState
    });
  }

  handleToggleInboxModal() {
    const { inboxModalVisible } = this.state;
    this.setState({ inboxModalVisible: !inboxModalVisible });
    this.emitChange();
  }

  handleFetchInbox(result) {
    this.state.inbox = result;
    this.sync();
    this.countAttachments();
  }

  handleFetchInboxCount(result) {
    this.state.numberOfAttachments = result.inbox_count;
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
      if(index != -1){
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
    InboxActions.fetchInbox();
  }

  handleDeleteContainerLink(result) {
    InboxActions.fetchInbox();
  }

  handleDeleteContainer(result) {
    InboxActions.fetchInbox();
  }

  handleBackToInbox(attachment) {
    var attachments = this.state.cache.filter(function(item) {
      if (item.id == attachment.id){
        return item
      }
    })

    if (attachments.length == 1) {
      var index = this.state.cache.indexOf(attachments[0])
      this.state.cache.splice(index, 1)
      InboxActions.fetchInbox()
    }else{
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
      InboxActions.fetchInbox();
    }
  }

  handleClose({deleteEl, force}) {
    this.state.deleteEl = deleteEl
  }

  handleConfirmDelete(confirm) {
    if(confirm){
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
    let count = 0;
    const inbox = this.state.inbox
    inbox.children.forEach(device_box => {
      device_box.children.forEach(dataset => {
        count += dataset.attachments.length
      })
    });
    count += inbox.unlinked_attachments.length
    this.state.numberOfAttachments = count;
  }
}

export default alt.createStore(InboxStore, 'InboxStore');
