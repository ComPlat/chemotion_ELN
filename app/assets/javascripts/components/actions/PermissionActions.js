import alt from '../alt';
import PermissionsFetcher from '../fetchers/PermissionsFetcher';

class PermissionActions {
  fetchPermissionStatus(params) {
    const { sample, reaction, screen, wellplate } = params.elements_filter;
    const hasAll = sample.all || reaction.all || screen.all || wellplate.all;
    const hasIncludes = [...sample.included_ids,
                          ...sample.included_ids,
                          ...sample.included_ids,
                          ...sample.included_ids].length > 0;
    const nonEmpty = hasAll || hasIncludes;

    return (dispatch) => {
      if(nonEmpty) {
        PermissionsFetcher.fetchPermissionStatus(params)
          .then((result) => {
            dispatch(result);
          }).catch((errorMessage) => {
            console.log(errorMessage);
          });
      };
    };
  }
}

export default alt.createActions(PermissionActions);
