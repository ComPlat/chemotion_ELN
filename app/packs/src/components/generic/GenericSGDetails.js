/* eslint-disable no-restricted-globals */
/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { GenInterface, GenButtonReload } from 'chem-generic-ui';
import { Panel, ButtonToolbar } from 'react-bootstrap';
import { FlowViewerBtn } from 'src/apps/generic/Utils';
import RevisionViewerBtn from 'src/components/generic/RevisionViewerBtn';

class GenericSGDetails extends Component {
  constructor(props) {
    super(props);
    this.handleReload = this.handleReload.bind(this);
    this.handleRetrieveRevision = this.handleRetrieveRevision.bind(this);
  }

  handleReload(segment) {
    const { onChange } = this.props;
    onChange(segment);
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
        isActiveWF={false}
        fnNavi={fnNavi}
      />
    );
    return <div style={{ margin: '5px' }}>{layersLayout}</div>;
  }

  elementalToolbar() {
    const { segment, klass } = this.props;
    return (
      <ButtonToolbar style={{ margin: '5px 0px' }}>
        <FlowViewerBtn generic={segment} />
        <RevisionViewerBtn
          fnRetrieve={this.handleRetrieveRevision}
          generic={segment}
        />
        <GenButtonReload
          klass={klass}
          generic={segment}
          fnReload={this.handleReload}
        />
      </ButtonToolbar>
    );
  }

  render() {
    const { uiCtrl, segment } = this.props;
    if (!uiCtrl || Object.keys(segment).length === 0) return null;
    return (
      <div>
        {this.elementalToolbar()}
        <Panel>
          <Panel.Body
            style={{ position: 'relative', minHeight: 260, overflowY: 'unset' }}
          >
            {this.elementalPropertiesItem(segment)}
          </Panel.Body>
        </Panel>
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
