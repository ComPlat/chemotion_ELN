import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SVG from 'react-inlinesvg';
import { Card, Container, Col, Button, Row, Table, Popover, ButtonGroup, Modal, OverlayTrigger, Tooltip, Form, InputGroup } from 'react-bootstrap';
import { findIndex } from 'lodash';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
import StructureEditorModal from 'src/components/structureEditor/StructureEditorModal';

export default class MoleculeModeratorComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      show: false,
      isNew: false,
      molName: {},
      molNames: (this.props.molecule && this.props.molecule.molecule_names) || []
    };
    this.handleStructureEditorSave = this.handleStructureEditorSave.bind(this);
    this.handleStructureEditorCancel = this.handleStructureEditorCancel.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.confirmDelete = this.confirmDelete.bind(this);
    this.handleShowModal = this.handleShowModal.bind(this);
    this.handleCloseModal = this.handleCloseModal.bind(this);
    this.handleMolNameChange = this.handleMolNameChange.bind(this);
    this.onSaveName = this.onSaveName.bind(this);
    this.onAddName = this.onAddName.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (this.props !== prevProps) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        molNames: (this.props.molecule && this.props.molecule.molecule_names) || []
      });
    }
  }

  onAddName() {
    const molName = {
      id: -1,
      description: 'defined by user',
      name: ''
    };
    this.setState({
      molName,
      isNew: true,
      show: true
    });
  }

  onSaveName() {
    const { molecule } = this.props;
    const { molNames, molName, isNew } = this.state;

    if (molName.name === '') {
      // eslint-disable-next-line no-alert
      alert('Please input name!');
      return false;
    }

    const params = {
      id: molecule.id,
      name_id: molName.id,
      description: molName.description,
      name: molName.name,
    };

    MoleculesFetcher.saveMoleculeName(params).then((result) => {
      if (result.error) {
        console.log(result);
        alert(result.error);
      } else {
        if (isNew == true) {
          molNames.push(result);
        } else {
          const idx = findIndex(molNames, (o) => o.id === molName.id);
          molNames.splice(idx, 1, molName);
        }
        this.setState({
          show: false,
          molNames
        });
      }
    });
    return true;
  }

  handleStructureEditorCancel() {
    this.props.handleEditor(false);
  }

  handleStructureEditorSave(molfile, svgFile = null, config = null) {
    this.props.handleEditorSave(molfile, svgFile, config);
  }

  handleSave() {
    this.props.onSave();
  }

  handleShowModal(nameObj, isNew = false) {
    this.setState({
      show: true,
      isNew,
      molName: nameObj
    });
  }

  handleMolNameChange(e) {
    this.setState((state) => {
      const { molName } = state;
      return {
        ...state,
        molName: {
          ...molName,
          name: e.target.value.trim()
        }
      };
    });
  }

  handleCloseModal() {
    this.setState({
      show: false
    });
  }

  confirmDelete(nameObj) {
    const { molNames } = this.state;
    const params = { id: nameObj.id };
    MoleculesFetcher.deleteMoleculeName(params).then((result) => {
      if (result.error) {
        console.log(result);
        alert(result.error);
      } else {
        const idx = findIndex(molNames, (o) => o.id === nameObj.id);
        molNames.splice(idx, 1);
        this.setState({
          molNames
        });
      }
    });
  }

  renderDeleteButton(nameObj) {
    const popover = (
      <Popover id="popover-positioned-scrolling-left">
        <Popover.Header>
          Delete this molecule name?
        </Popover.Header>
        <Popover.Body className="d-flex gap-2">
          <Button size="sm" variant="danger" onClick={() => this.confirmDelete(nameObj)}>
            Yes
          </Button>
          <Button size="sm" variant="warning" onClick={this.handleClick}>
            No
          </Button>
        </Popover.Body>
      </Popover>
    );

    return (
      <ButtonGroup className="actions">
        <OverlayTrigger
          animation
          placement="right"
          root
          trigger="focus"
          overlay={popover}
        >
          <Button size="sm" variant="danger">
            <i className="fa fa-trash-o" />
          </Button>
        </OverlayTrigger>
      </ButtonGroup>
    );
  }

  renderEditButton(nameObj) {
    return (
      <OverlayTrigger placement="top" overlay={<Tooltip id="groupUsersAdd">Edit molecule name</Tooltip>}>
        <Button size="sm" variant="primary" type="button" onClick={() => this.handleShowModal(nameObj)}>
          <i className="fa fa-pencil-square-o" />
        </Button>
      </OverlayTrigger>
    );
  }

  renderModal() {
    const { show, isNew, molName } = this.state;
    return (
      <Modal centered show={show} onHide={this.handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{isNew ? 'Create Molecule Name' : 'Edit Molecule Name'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form horizontal className="input-form">
            <Form.Group className="mb-3" controlId="formControlId">
              <InputGroup>
                <InputGroup.Text>Attr.</InputGroup.Text>
                <Form.Control type="text" defaultValue={molName.description} readOnly />
              </InputGroup>
            </Form.Group>
            <Form.Group className="mb-3" controlId="formControlName">
              <InputGroup>
                <InputGroup.Text>Molecule name</InputGroup.Text>
                <Form.Control type="text" value={molName.name} onChange={this.handleMolNameChange} />
              </InputGroup>
            </Form.Group>
          </Form>
          <Button size="sm" type="button" onClick={() => this.onSaveName()}>Save</Button>
        </Modal.Body>
      </Modal>
    );
  }

  renderNameTable() {
    const { molNames } = this.state;

    return (
      <Table>
        <thead>
          <tr>
            <td width="5%">#</td>
            <td width="15%">
              Action
              <OverlayTrigger
                placement="top"
                overlay={(
                  <Tooltip id="groupUsersAdd">
                    Add new molecule name
                  </Tooltip>
                )}
              >
                <Button
                  className="ms-2"
                  size="sm"
                  variant="success"
                  onClick={() => this.onAddName()}
                >
                  <i className="fa fa-plus" />
                </Button>
              </OverlayTrigger>
            </td>
            <td width="20%">Attr.</td>
            <td width="60%">Moledule Name</td>
          </tr>
        </thead>
        <tbody>
          {molNames.map((na, i) => (
            <tr key={`row_${na.id}`} id={`row_${na.id}`}>
              <td>{i + 1}</td>
              <td className="d-flex gap-2">
                {this.renderDeleteButton(na)}
                {this.renderEditButton(na)}
              </td>
              <td>{na.description}</td>
              <td>{na.name}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  }

  render() {
    const { molecule, handleEditor, showStructureEditor } = this.props;

    const componentEditor = (
      <div className="search-structure-draw">
        <StructureEditorModal
          showModal={showStructureEditor}
          onSave={this.handleStructureEditorSave}
          onCancel={this.handleStructureEditorCancel}
          molfile={molecule.molfile}
        />
      </div>
    );

    return (
      <>
        {componentEditor}
        <Container>
          <Card>
            <Card.Header>
              <b>InChiKey:</b>
              {' '}
              {molecule.inchikey}
              {' '}
              (
              <b>Chemotion molecule id:</b>
              {' '}
              {molecule.id}
              )
              <br />
              <b>Canonical Smiles:</b>
              {' '}
              {molecule.cano_smiles}
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col>
                  <Button variant="primary" size="sm" onClick={() => handleEditor(true)}>
                    Open Editor
                    <i className="fa fa-pencil ms-1" aria-hidden="true" />
                  </Button>
  &nbsp;
                  <Button variant="warning" size="sm" onClick={() => this.handleSave()}>
                    Update molfile and svg
                    <i className="fa fa-floppy-o ms-1" aria-hidden="true" />
                  </Button>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col xs={4}>
                  <b>molfile:</b>
                  <Form.Control
                    as="textarea"
                    readOnly
                    placeholder="textarea"
                    value={molecule.molfile}
                    style={{ minHeight: 'calc(50vh)' }}
                  />
                </Col>
                <Col xs={8}>
                  <b>svg:</b>
                  <div className="svg-container">
                    <SVG
                      key={molecule.molecule_svg_file}
                      src={`/images/molecules/${molecule.molecule_svg_file}`}
                      className="molecule-mid"
                    />
                  </div>
                </Col>
              </Row>
              <Row>
                <Col>
                  {this.renderNameTable()}
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Container>
        {this.renderModal()}
      </>
    );
  }
}

MoleculeModeratorComponent.propTypes = {
  molecule: PropTypes.object.isRequired,
  showStructureEditor: PropTypes.bool.isRequired,
  handleEditorSave: PropTypes.func.isRequired,
  handleEditor: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};
