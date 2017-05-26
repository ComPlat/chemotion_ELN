import alt from '../alt';
import InboxActions from '../actions/InboxActions';
import _ from 'lodash'

class InboxStore{

  constructor() {
    this.state = {
      inbox: {},
      cache: [],
      numberOfAttachments: 0
    };

    this.bindListeners({
      handleFetchInbox: InboxActions.fetchInbox,
      handleRemoveAttachmentFromList: InboxActions.removeAttachmentFromList,
      handleRemoveDatasetFromList:InboxActions.removeDatasetFromList,
      handleDeleteAttachment: InboxActions.deleteAttachment,
      handleDeleteContainer: InboxActions.deleteContainer,
      handleClearCache: InboxActions.clearCache
    })
  }

  handleFetchInbox(result){
    this.state.inbox = result;
    this.sync();
    this.countAttachments();
  }

  handleRemoveAttachmentFromList(attachment){
    let inbox = this.state.inbox

    inbox.children.forEach(device_box => {
      device_box.children.forEach(dataset => {
        var index = dataset.attachments.indexOf(attachment)
        if (index != -1){
            dataset.attachments.splice(index, 1)
            this.state.cache.push(attachment)
        }
      })
    })
    this.setState(inbox)
    this.countAttachments();
  }

  handleRemoveDatasetFromList(dataset){
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

  handleDeleteAttachment(result){
    InboxActions.fetchInbox();
  }

  handleDeleteContainer(result){
    InboxActions.fetchInbox();
  }

  handleClearCache(){
    this.state.cache = [];
  }

  sync(){
    let inbox = this.state.inbox

    inbox.children.forEach(device_box => {
      device_box.children.forEach(dataset => {
        this.state.cache.forEach(deletedAttachment => {
          dataset.attachments = dataset.attachments.filter(function(item) {
            if (item.id !== deletedAttachment.id){
              return item
            }

          })
        })
      })
    })

    this.setState(inbox)
  }

  countAttachments(){
    var count = 0;
    const inbox = this.state.inbox
    inbox.children.forEach(device_box => {
      device_box.children.forEach(dataset => {
        count += dataset.attachments.length
      })
    })
    this.state.numberOfAttachments = count
  }
}

export default alt.createStore(InboxStore, 'InboxStore');
