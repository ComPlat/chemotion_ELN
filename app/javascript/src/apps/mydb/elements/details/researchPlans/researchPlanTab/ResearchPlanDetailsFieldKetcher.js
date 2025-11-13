/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SVG from 'react-inlinesvg';
import ResearchPlansFetcher from 'src/fetchers/ResearchPlansFetcher';
import StructureEditorModal from 'src/components/structureEditor/StructureEditorModal';
import {Alert} from "react-bootstrap";

export default class ResearchPlanDetailsFieldKetcher extends Component {
  constructor(props) {
    super(props);
    const {
      field, index, disabled, onChange
    } = props;
    this.state = {
      field,
      index,
      disabled,
      onChange,
      showStructureEditor: false,
      loadingMolecule: false,
      ketcherError: null
    };
    this.renderKetcherError = this.renderKetcherError.bind(this);
  }

  showStructureEditor() {
    this.setState({
      showStructureEditor: true
    });
  }

  hideStructureEditor() {
    this.setState({
      showStructureEditor: false
    });
  }

  handleStructureEditorSave(sdf_file, svg_file, config = null, _, errorMessage = null) {
    let { field, onChange } = this.state;

    if (errorMessage) {
      this.setState({ ketcherError: errorMessage }, () => {
        if (this.errorTimer) {
          clearTimeout(this.errorTimer);
        }
        this.setState({ ketcherError: errorMessage });
        this.errorTimer = setTimeout(() => {
          this.setState({ ketcherError: null });
          this.errorTimer = null;
        }, 5000);
      });
    }

    field.value = {
      sdf_file,
      svg_file
    };

    const smiles = config ? config.smiles : null;

    this.setState({ loadingMolecule: true });

    const isChemdraw = !!smiles;

    ResearchPlansFetcher.updateSVGFile(svg_file, isChemdraw).then((json) => {
      field.value.svg_file = json.svg_path;
      this.setState({
        field,
        loadingMolecule: false
      });
      onChange(field.value, field.id);
      this.hideStructureEditor();
    });
  }

  handleStructureEditorCancel() {
    this.hideStructureEditor();
  }

  renderStructureEditorModal(field) {
    const { showStructureEditor } = this.state;
    const molfile = field.value.sdf_file;

    return (
      <StructureEditorModal
        key={field.id}
        showModal={showStructureEditor}
        onSave={this.handleStructureEditorSave.bind(this)}
        onCancel={this.handleStructureEditorCancel.bind(this)}
        molfile={molfile}
      />
    );
  }

  renderKetcherError() {
    const { ketcherError } = this.state;
    if (!ketcherError) return null;
    return (
      <Alert
        variant="danger"
        show={ketcherError?.length > 0}
        dismissible
        onClose={() => this.setState({ ketcherError: null })}
      >
        <strong>
          Ketcher2 error:
          {' '}
        </strong>
        <small className="text-muted">{ketcherError}</small>
      </Alert>
    );
  }

  renderEdit() {
    const { field } = this.state;
    let svgPath;
    if (field.value.svg_file) {
      svgPath = `/images/research_plans/${field.value.svg_file}`;
    } else {
      svgPath = '/images/wild_card/no_image_180.svg';
    }
    return (
      <div>
        {this.renderKetcherError()}
        <div className="border border-info border-3 text-center" onClick={this.showStructureEditor.bind(this)}>
          <i className="fa fa-pencil fa-lg pull-right bg-info p-2" />
          <SVG key={svgPath} src={svgPath} className="molecule-mid" />
          {this.renderStructureEditorModal(field)}
        </div>
      </div>

    );
  }

  renderStatic() {
    const { field } = this.props;
    if (typeof (field.value.svg_file) === 'undefined'
      || field.value.svg_file === null) {
      return null;
    }
    const svgPath = `/images/research_plans/${field.value.svg_file}`;
    return (
      <div className="text-center">
        <img src={svgPath} alt="" className="img-fluid" />
      </div>
    );
  }

  render() {
    if (this.props.edit) {
      return this.renderEdit();
    }
    return this.renderStatic();
  }
}

ResearchPlanDetailsFieldKetcher.propTypes = {
  field: PropTypes.object,
  index: PropTypes.number,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  edit: PropTypes.bool,
};
