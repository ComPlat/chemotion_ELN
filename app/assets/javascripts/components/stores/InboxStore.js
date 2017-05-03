import alt from '../alt';
import InboxActions from '../actions/InboxActions';

class InboxStore{

  constructor() {
    this.state = {
      inbox: []
    };

    this.bindListeners({
      handleFetchInbox: InboxActions.fetchInbox,
      handleRemoveAttachmentFromList: InboxActions.removeAttachmentFromList,
      handleDeleteAttachment: InboxActions.deleteAttachment
    })
  }

  handleFetchInbox(result){
    this.state.inbox = result;
  }

  handleRemoveAttachmentFromList(attachment){
    const index = this.state.inbox.indexOf(attachment)

    return index !== (-1) ? this.setState(this.state.inbox.splice(index, 1))
                          : this.state.inbox;
  }

  handleDeleteAttachment(result){
    InboxActions.fetchInbox();
  }
}

export default alt.createStore(InboxStore, 'InboxStore');
