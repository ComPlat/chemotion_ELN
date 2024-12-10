/* eslint-disable no-restricted-globals */
/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { GenInterface, GenToolbar } from 'chem-generic-ui';
import ElementActions from 'src/stores/alt/actions/ElementActions';

class GenericSGDetails extends Component {
  constructor(props) {
    super(props);
    this.handleReload = this.handleReload.bind(this);
    this.handleExport = this.handleExport.bind(this);
    this.handleRetrieveRevision = this.handleRetrieveRevision.bind(this);
  }

  handleReload(segment) {
    const { onChange } = this.props;
    onChange(segment);
  }

  handleExport() {
    const { segment } = this.props;
    ElementActions.exportElement(segment, 'Segment', 'docx');
  }

  handleRetrieveRevision(revision, cb) {
    const { segment, onChange } = this.props;
    segment.properties = revision;
    segment.changed = true;
    cb();
    onChange(segment);
  }

  elementalPropertiesItem(segment) {
    const { onChange, fnNavi, isSearch } = this.props;
    const layersLayout = (
      <GenInterface
        generic={segment}
        fnChange={onChange}
        extLayers={[]}
        genId={0}
        isPreview={false}
        isSearch={isSearch}
        isActiveWF
        fnNavi={fnNavi}
      />
    );
    return <div style={{ margin: '5px' }}>{layersLayout}</div>;
  }

  render() {
    const { uiCtrl, segment, klass } = this.props;
    if (!uiCtrl || Object.keys(segment).length === 0) return null;
    return (
      <div>
        <GenToolbar
          generic={segment}
          genericType="Segment"
          klass={klass}
          fnExport={this.handleExport}
          fnReload={this.handleReload}
          fnRetrieve={this.handleRetrieveRevision}
        />
        {this.elementalPropertiesItem(segment)}
      </div>
    );
  }
}

GenericSGDetails.propTypes = {
  uiCtrl: PropTypes.bool.isRequired,
  segment: PropTypes.object,
  klass: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  fnNavi: PropTypes.func,
  isSearch: PropTypes.bool,
};
GenericSGDetails.defaultProps = {
  segment: {},
  klass: {},
  fnNavi: () => {},
  isSearch: false,
};

export default GenericSGDetails;
