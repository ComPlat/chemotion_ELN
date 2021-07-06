import alt from '../alt';
import AttachmentFetcher from '../fetchers/AttachmentFetcher';

class QcActions {
  setLoading() {
    return null;
  }

  loadInfers({ sample }) {
    const sId = sample.id;
    const atts = sample.attachments();
    const ids = atts.map(att => (
      att.aasm_state === 'json' && att.filename.includes('.infer.json')
        ? att.id : null
    )).filter(r => r != null);

    return (dispatch) => {
      AttachmentFetcher.fetchFiles(ids)
        .then(result => dispatch({ result, sId }))
        .catch(err => console.log(err)); // eslint-disable-line
    };
  }
}

export default alt.createActions(QcActions);
