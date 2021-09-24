import alt from '../alt';
import MetadataFetcher from '../fetchers/MetadataFetcher';

class MetadataActions {
  fetchMetadata() {
    return (dispatch) => {
      MetadataFetcher.fetchMetadata()
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  storeMetadata() {
    return (dispatch) => {
      MetadataFetcher.storeMetadata()
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }
}

export default alt.createActions(MetadataActions);
