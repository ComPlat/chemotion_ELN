/* eslint-disable class-methods-use-this */
import alt from '../alt';
import TextTemplatesFetcher from '../fetchers/TextTemplatesFetcher';

class TextTemplateActions {
  fetchTextTemplates(elementName) {
    return (dispatch) => {
      TextTemplatesFetcher.fetchTextTemplates(elementName)
        .then(result => dispatch(result))
        .catch((errorMessage) => { console.log(errorMessage); });
    };
  }

  updateTextTemplates(elName, templates) {
    return (dispatch) => {
      TextTemplatesFetcher.updateTextTemplates(elName, templates)
        .then((result) => {
          if (result) {
            dispatch({ [elName]: templates });
          }
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }
}

export default alt.createActions(TextTemplateActions);
