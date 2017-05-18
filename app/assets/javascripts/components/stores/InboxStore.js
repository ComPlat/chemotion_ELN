import alt from '../alt';
import InboxActions from '../actions/InboxActions';

class InboxStore{

  constructor() {
    this.state = {
      inbox: {},
      numberOfAttachments: 0
    };

    this.bindListeners({
      handleFetchInbox: InboxActions.fetchInbox,
      handleRemoveAttachmentFromList: InboxActions.removeAttachmentFromList,
      handleRemoveDatasetFromList:InboxActions.removeDatasetFromList,
      handleDeleteAttachment: InboxActions.deleteAttachment
    })
  }

  handleFetchInbox(result){
    this.state.inbox = result;
    this.countAttachments();
  }

  handleRemoveAttachmentFromList(attachment){
    let inbox = this.state.inbox

    inbox.children.forEach(device_box => {
      device_box.children.forEach(dataset => {
        var index = dataset.attachments.indexOf(attachment)
        if (index != -1){
          if(dataset.attachments.length == 1){
              var index_dataset = device_box.children.indexOf(dataset)
              if(index_dataset != -1){
                device_box.children.splice(index_dataset, 1)
              }
          }else{
            dataset.attachments.splice(index, 1)
          }

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
        device_box.children.splice(index, 1)
      }
    })

    this.setState(inbox)
    this.countAttachments();
  }

  handleDeleteAttachment(result){
    InboxActions.fetchInbox();
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
