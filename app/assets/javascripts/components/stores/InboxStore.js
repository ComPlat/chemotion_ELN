import alt from '../alt';
import InboxActions from '../actions/InboxActions';

class InboxStore{

  constructor() {
    this.state = {
      inbox: []
    };

    this.bindListeners({
      handleFetchInbox: InboxActions.fetchInbox
    })
  }

  handleFetchInbox(result){
    this.state.inbox = result;
  }
}

export default alt.createStore(InboxStore, 'InboxStore');
