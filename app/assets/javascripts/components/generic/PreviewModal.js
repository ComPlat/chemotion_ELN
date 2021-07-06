/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import Preview from '../../admin/generic/Preview';

export default class PreviewModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = { revisions: [] };
    this.handleClose = this.handleClose.bind(this);
    this.setRevisions = this.setRevisions.bind(this);
    this.retriveRevision = this.retriveRevision.bind(this);
    this.delRevision = this.delRevision.bind(this);
    this.fetchRevisions = this.fetchRevisions.bind(this);
  }

  componentDidUpdate(prevProps) {
    const { element, showModal } = this.props;
    if ((showModal !== prevProps.showModal && showModal) || (element.id !== prevProps.element.id)) {
      this.fetchRevisions();
    }
  }

  setRevisions(revisions) {
    this.setState({ revisions });
  }

  fetchRevisions() {
    const { fetcher, fetcherFn, element } = this.props;
    fetcher[fetcherFn](element.id).then((result) => {
      (result.revisions || []).map(r => Object.assign(r, { released_at: r.created_at }));
      this.setState({ revisions: result.revisions });
    });
  }

  handleClose() {
    this.props.fnClose();
  }

  retriveRevision(revision, cb) {
    this.props.fnRetrive(revision, cb);
  }

  delRevision(revision) {
    this.props.fnDelete({ id: revision.id }, this.fetchRevisions);
  }

  render() {
    const { showModal } = this.props;
    const { revisions } = this.state;
    return (
      <Modal backdrop="static" dialogClassName="importChemDrawModal" show={showModal} onHide={() => this.handleClose()}>
        <Modal.Header closeButton><Modal.Title>History</Modal.Title></Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-12">
            <Preview revisions={revisions} fnRetrive={this.retriveRevision} fnDelete={this.delRevision} src="properties" />
          </div>
        </Modal.Body>
      </Modal>
    );
  }
}

PreviewModal.propTypes = {
  showModal: PropTypes.bool.isRequired,
  fnClose: PropTypes.func.isRequired,
  fnRetrive: PropTypes.func,
  element: PropTypes.object,
  fetcher: PropTypes.func.isRequired,
  fetcherFn: PropTypes.string.isRequired,
  fnDelete: PropTypes.func.isRequired
};

PreviewModal.defaultProps = { element: {}, fnRetrive: () => {} };
