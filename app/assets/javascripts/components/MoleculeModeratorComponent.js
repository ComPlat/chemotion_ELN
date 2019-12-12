import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Col, Panel, Button, Row, FormControl } from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import StructureEditorModal from './structure_editor/StructureEditorModal';

export default class MoleculeModeratorComponent extends Component {
  constructor(props) {
    super(props);
    this.handleStructureEditorSave = this.handleStructureEditorSave.bind(this);
    this.handleStructureEditorCancel = this.handleStructureEditorCancel.bind(this);
    this.handleSave = this.handleSave.bind(this);
  }

  handleStructureEditorSave(molfile, svg_file = null, config = null) {
    this.props.handleEditorSave(molfile, svg_file, config);
  }

  handleStructureEditorCancel() {
    this.props.handleEditor(false);
  }

  handleSave() {
    this.props.onSave();
  }

  render() {
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

    return (
      <div>
        {componentEditor}
        <div className="container">
          <Panel>
            <Panel.Heading>
              <b>InChiKey:</b>&nbsp;{this.props.molecule.inchikey}
              &nbsp;(<b>Chemotion molecule id:</b>&nbsp;{this.props.molecule.id})
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
