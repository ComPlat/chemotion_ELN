import _ from 'lodash';
import alt from 'alt';
import FreeScanActions from 'src/stores/alt/actions/FreeScanActions';

class FreeScanStore {
  constructor() {
    this.state = {
      free_scan: {},
      cache: [],
      deleteEl: null,
      numberOfFreeScans: 0,
      freeScanModalVisible: false
    };

    this.bindListeners({
      handleFetchFreeScanCount: FreeScanActions.fetchFreeScanCount,
     
      handleDeleteContainer: FreeScanActions.deleteContainer,
     
      handleFetchFreeScan: FreeScanActions.fetchFreeScan,
    });
  }

  handleFetchFreeScan(result) {
    this.state.free_scan = result;
    this.countAttachments();
  }

  handleFetchFreeScanCount(result) {
    this.state.numberOfFreeScans = result.inbox_count;
  }

 

  handleDeleteContainer(result) {
    FreeScanActions.fetchFreeScan();
  }

  

  sync() {
    let free_scan = this.state.free_scan
    this.setState(free_scan)
  }

  countAttachments() {
    const free_scan = this.state.free_scan
    this.state.numberOfFreeScans = free_scan.children.length;
  }
}

export default alt.createStore(FreeScanStore, 'FreeScanStore');
