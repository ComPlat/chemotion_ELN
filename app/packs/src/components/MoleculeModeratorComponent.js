import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Col, Panel, Button, Row, FormControl, Table, Popover, ButtonGroup, Modal, OverlayTrigger, Tooltip, Form, FormGroup, InputGroup } from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import { findIndex } from 'lodash';
import StructureEditorModal from './structure_editor/StructureEditorModal';
import MoleculesFetcher from './fetchers/MoleculesFetcher';

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

    const name = this.m_name.value.trim();
    if (name == '') {
      // eslint-disable-next-line no-alert
      alert('Please input name!');
      return false;
    }

    molName.name = name;

    const params = {
      id: molecule.id,
      name_id: molName.id,
      description: molName.description,
      name
    };

    MoleculesFetcher.saveMoleculeName(params).then((result) => {
      if (result.error) {
        console.log(result);
        alert(result.error);
      } else {
        if (isNew == true) {
          molNames.push(result);
        } else {
          const idx = findIndex(molNames, o => o.id === molName.id);
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

  handleStructureEditorSave(molfile, svg_file = null, config = null) {
    this.props.handleEditorSave(molfile, svg_file, config);
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
        const idx = findIndex(molNames, o => o.id === nameObj.id);
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
        delete this molecule name <br />
        <div className="btn-toolbar">
          <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.confirmDelete(nameObj)}>
          Yes
          </Button><span>&nbsp;&nbsp;</span>
          <Button bsSize="xsmall" bsStyle="warning" onClick={this.handleClick} >
          No
          </Button>
        </div>
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
          <Button bsSize="xsmall" bsStyle="danger" >
            <i className="fa fa-trash-o" />
          </Button>
        </OverlayTrigger>
      </ButtonGroup>
    );
  }


  renderEditButton(nameObj) {
    return (
      <OverlayTrigger placement="top" overlay={<Tooltip id="groupUsersAdd">Edit molecule name</Tooltip>}>
        <Button bsSize="xsmall" bsStyle="primary" type="button" onClick={() => this.handleShowModal(nameObj)} >
          <i className="fa fa-pencil-square-o" />
        </Button>
      </OverlayTrigger>
    );
  }


  renderModal() {
    const { show, isNew, molName } = this.state;
    return (
      <Modal show={show} onHide={this.handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{isNew ? 'Create Molecule Name' : 'Edit Molecule Name'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Panel bsStyle="success">
            <Panel.Heading>
              <Panel.Title>
                {isNew ? 'Create Molecule Name' : 'Edit Molecule Name'}
              </Panel.Title>
            </Panel.Heading>
            <Panel.Body>
              <Form horizontal className="input-form">
                <FormGroup controlId="formControlId">
                  <InputGroup>
                    <InputGroup.Addon>Attr.</InputGroup.Addon>
                    <FormControl type="text" defaultValue={molName.description} readOnly />
                  </InputGroup>
                </FormGroup>
                <FormGroup controlId="formControlName">
                  <InputGroup>
                    <InputGroup.Addon>Molecule name</InputGroup.Addon>
                    <FormControl type="text" defaultValue={molName.name} inputRef={(ref) => { this.m_name = ref; }} />
                  </InputGroup>
                </FormGroup>
              </Form>
              <Button bsSize="small" type="button" bsStyle="warning" onClick={() => this.onSaveName()}>Save</Button>
            </Panel.Body>
          </Panel>
        </Modal.Body>

      </Modal>
    );
  }

  render() {
    const { molNames } = this.state;
    const componentEditor = (
      <div className="search-structure-draw">
        <StructureEditorModal
          showModal={this.props.showStructureEditor}
          onSave={this.handleStructureEditorSave}
          onCancel={this.handleStructureEditorCancel}
          molfile={this.props.molecule.molfile}
        />
      </div>
    );

    const tbodyHeader = (
      <thead>
        <tr>
          <td width="5%">#</td>
          <td width="15%">Action &nbsp;
            <OverlayTrigger placement="top" overlay={<Tooltip id="groupUsersAdd">Add new molecule name</Tooltip>}>
              <Button bsSize="xsmall" bsStyle="success" onClick={() => this.onAddName()}>
                <i className="fa fa-plus" />
              </Button>
            </OverlayTrigger>
          </td>
          <td width="20%">Attr.</td>
          <td width="60%">Moledule Name</td>
        </tr>
      </thead>
    );

    const tbodyContent = molNames.map((na, i) => (
      <tr key={`row_${na.id}`} id={`row_${na.id}`}>
        <td>{i + 1}</td>
        <td>
          { this.renderDeleteButton(na) }
          &nbsp;
          { this.renderEditButton(na) }
        </td>
        <td>{na.description}</td>
        <td>{na.name}</td>
      </tr>
    ));

    return (
      <div>
        {componentEditor}
        <div className="container">
          <Panel>
            <Panel.Heading>
              <b>InChiKey:</b>&nbsp;{this.props.molecule.inchikey}
              &nbsp;(<b>Chemotion molecule id:</b>&nbsp;{this.props.molecule.id})
              <br />
              <b>Canonical Smiles:</b>&nbsp;{this.props.molecule.cano_smiles}
            </Panel.Heading>
            <Panel.Body>
              <Row>
                <Col md={12}>
                  <Button bsStyle="primary" bsSize="sm" onClick={() => this.props.handleEditor(true)}>Open Editor&nbsp;<i className="fa fa-pencil" aria-hidden="true" /></Button>&nbsp;
                  <Button bsStyle="warning" bsSize="sm" onClick={() => this.handleSave()}>Update molfile and svg&nbsp;<i className="fa fa-floppy-o" aria-hidden="true" /></Button>
                </Col>
              </Row>
              <Row>
                <Col md={4}>
                  <b>molfile:</b><br />
                  <FormControl componentClass="textarea" placeholder="textarea" value={this.props.molecule.molfile} readOnly style={{ minHeight: 'calc(50vh)' }} />
                </Col>
                <Col md={8}>
                  <b>svg:</b><br />
                  <div className="svg-container">
                    <SVG key={this.props.molecule.molecule_svg_file} src={`/images/molecules/${this.props.molecule.molecule_svg_file}`} className="molecule-mid" />
                  </div>
                </Col>
              </Row>
              &nbsp;
              <Row>
                <Col md={12}>
                  <Table>
                    {tbodyHeader}
                    <tbody>
                      {tbodyContent}
                    </tbody>
                  </Table>
                </Col>
              </Row>
              { this.renderModal() }
            </Panel.Body>
          </Panel>
        </div>
      </div>
    );
  }
}

MoleculeModeratorComponent.propTypes = {
  molecule: PropTypes.object,
  showStructureEditor: PropTypes.bool.isRequired,
  handleEditorSave: PropTypes.func.isRequired,
  handleEditor: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};
