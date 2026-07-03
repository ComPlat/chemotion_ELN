import React from 'react';
import PropTypes from 'prop-types';
import {
  Table, Button, Modal, Form, InputGroup, OverlayTrigger, Tooltip,
} from 'react-bootstrap';
import uuid from 'uuid';
import InfoSupportLinksFetcher from 'src/fetchers/InfoSupportLinksFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

const notify = ({ title, msg, lvl = 'info' }) => NotificationActions.add({
  title,
  message: msg,
  level: lvl,
  position: 'tc',
  dismissible: 'button',
  uid: uuid.v4(),
});

const emptyDraft = {
  id: null, label: '', url: '', position: 0, enabled: true,
};

function LinkFormModal({
  show, draft, onChange, onClose, onSave, isNew,
}) {
  return (
    <Modal centered show={show} onHide={onClose} backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>{isNew ? 'New Info & Support Link' : 'Edit Info & Support Link'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form className="d-flex flex-column gap-3">
          <Form.Group>
            <InputGroup>
              <InputGroup.Text>Label</InputGroup.Text>
              <Form.Control
                type="text"
                value={draft.label}
                onChange={(e) => onChange({ ...draft, label: e.target.value })}
                placeholder="e.g. Local RDM team"
              />
            </InputGroup>
          </Form.Group>
          <Form.Group>
            <InputGroup>
              <InputGroup.Text>URL</InputGroup.Text>
              <Form.Control
                type="text"
                value={draft.url}
                onChange={(e) => onChange({ ...draft, url: e.target.value })}
                placeholder="https://…"
              />
            </InputGroup>
          </Form.Group>
          <Form.Group>
            <InputGroup>
              <InputGroup.Text>Position</InputGroup.Text>
              <Form.Control
                type="number"
                value={draft.position ?? 0}
                onChange={(e) => onChange({ ...draft, position: Number(e.target.value) })}
              />
            </InputGroup>
          </Form.Group>
          <Form.Check
            type="checkbox"
            checked={!!draft.enabled}
            onChange={(e) => onChange({ ...draft, enabled: e.target.checked })}
            label="Enabled (shown to users)"
          />
        </Form>
      </Modal.Body>
      <Modal.Footer className="modal-footer border-0">
        <Button variant="warning" onClick={onClose} className="me-1">Cancel</Button>
        <Button variant="primary" onClick={onSave}>
          {isNew ? 'Create' : 'Update'}
          <i className="fa fa-save ms-1" />
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

LinkFormModal.propTypes = {
  show: PropTypes.bool.isRequired,
  draft: PropTypes.shape({
    id: PropTypes.number,
    label: PropTypes.string,
    url: PropTypes.string,
    position: PropTypes.number,
    enabled: PropTypes.bool,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  isNew: PropTypes.bool.isRequired,
};

export default class InfoSupportLinks extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      links: [],
      showModal: false,
      draft: emptyDraft,
      isNew: true,
    };
    this.openNew = this.openNew.bind(this);
    this.openEdit = this.openEdit.bind(this);
    this.close = this.close.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.handleDelete = this.handleDelete.bind(this);
  }

  componentDidMount() {
    this.fetchLinks();
  }

  fetchLinks() {
    InfoSupportLinksFetcher.fetchAdmin()
      .then((result) => {
        const links = Array.isArray(result) ? result : [];
        this.setState({ links });
      })
      .catch(() => notify({ title: 'Info & Support Links', msg: 'Failed to load links', lvl: 'error' }));
  }

  openNew() {
    this.setState({ showModal: true, isNew: true, draft: { ...emptyDraft } });
  }

  openEdit(link) {
    this.setState({ showModal: true, isNew: false, draft: { ...link } });
  }

  close() {
    this.setState({ showModal: false });
  }

  handleChange(draft) {
    this.setState({ draft });
  }

  validate(draft) {
    if (!draft.label || !draft.label.trim()) return 'Label is required';
    if (!draft.url || !draft.url.trim()) return 'URL is required';
    if (!/^https?:\/\/.+/i.test(draft.url.trim())) return 'URL must start with http:// or https://';
    return null;
  }

  handleSave() {
    const { draft, isNew } = this.state;
    const err = this.validate(draft);
    if (err) {
      notify({ title: 'Info & Support Links', msg: err, lvl: 'error' });
      return;
    }
    const payload = {
      label: draft.label.trim(),
      url: draft.url.trim(),
      position: Number(draft.position) || 0,
      enabled: !!draft.enabled,
    };
    const promise = isNew
      ? InfoSupportLinksFetcher.create(payload)
      : InfoSupportLinksFetcher.update(draft.id, payload);
    promise
      .then((result) => {
        if (result && result.errors) {
          notify({ title: 'Info & Support Links', msg: result.errors.join(', '), lvl: 'error' });
          return;
        }
        notify({ title: 'Info & Support Links', msg: isNew ? 'Created' : 'Updated' });
        this.setState({ showModal: false });
        this.fetchLinks();
      })
      .catch(() => notify({ title: 'Info & Support Links', msg: 'Save failed', lvl: 'error' }));
  }

  handleDelete(link) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete link "${link.label}"?`)) return;
    InfoSupportLinksFetcher.delete(link.id)
      .then(() => {
        notify({ title: 'Info & Support Links', msg: 'Deleted' });
        this.fetchLinks();
      })
      .catch(() => notify({ title: 'Info & Support Links', msg: 'Delete failed', lvl: 'error' }));
  }

  renderRows() {
    const { links } = this.state;
    return links.map((link, idx) => (
      <tr key={link.id}>
        <td>{idx + 1}</td>
        <td>
          <OverlayTrigger placement="bottom" overlay={<Tooltip id={`edit-${link.id}`}>Edit</Tooltip>}>
            <Button size="sm" variant="info" onClick={() => this.openEdit(link)} className="me-1">
              <i className="fa fa-pencil-square-o" />
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="bottom" overlay={<Tooltip id={`del-${link.id}`}>Delete</Tooltip>}>
            <Button size="sm" variant="danger" onClick={() => this.handleDelete(link)}>
              <i className="fa fa-trash-o" />
            </Button>
          </OverlayTrigger>
        </td>
        <td>{link.position}</td>
        <td>{link.label}</td>
        <td>
          <a href={link.url} target="_blank" rel="noopener noreferrer">{link.url}</a>
        </td>
        <td>{link.enabled ? 'yes' : 'no'}</td>
      </tr>
    ));
  }

  render() {
    const {
      showModal, draft, isNew,
    } = this.state;
    return (
      <div>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h4 className="m-0">Info &amp; Support Links</h4>
          <Button variant="primary" onClick={this.openNew}>
            <i className="fa fa-plus me-1" />
            New link
          </Button>
        </div>
        <p className="text-muted">
          These links appear in the user-facing &quot;Info &amp; Support&quot; dropdown, below the Chemotion defaults.
        </p>
        <Table responsive hover className="border">
          <thead>
            <tr className="bg-gray-200">
              <th>#</th>
              <th>Actions</th>
              <th>Position</th>
              <th>Label</th>
              <th>URL</th>
              <th>Enabled</th>
            </tr>
          </thead>
          <tbody>{this.renderRows()}</tbody>
        </Table>
        <LinkFormModal
          show={showModal}
          draft={draft}
          isNew={isNew}
          onChange={this.handleChange}
          onClose={this.close}
          onSave={this.handleSave}
        />
      </div>
    );
  }
}
