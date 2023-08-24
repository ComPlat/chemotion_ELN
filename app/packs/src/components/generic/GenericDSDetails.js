/* eslint-disable no-restricted-globals */
/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Panel, ButtonToolbar } from 'react-bootstrap';
import {
  GenInterface,
  GenButtonReload,
  absOlsTermLabel,
} from 'chem-generic-ui';
import UserStore from 'src/stores/alt/stores/UserStore';
import MatrixCheck from 'src/components/common/MatrixCheck';

class GenericDSDetails extends Component {
  constructor(props) {
    super(props);
    this.handleReload = this.handleReload.bind(this);
  }

  handleReload(generic) {
    const { klass, onChange } = this.props;
    const genericDS = generic;
    if (genericDS) {
      genericDS.dataset_klass_id = klass.id;
      genericDS.klass_ols = klass.ols_term_id;
      genericDS.klass_label = klass.label;
    }
    onChange(genericDS);
  }

  elementalPropertiesItem(genericDS) {
    const { onChange } = this.props;
    const layersLayout = (
      <GenInterface
        generic={genericDS}
        fnChange={onChange}
        isPreview={false}
        isActiveWF={false}
        fnNavi={() => {}}
      />
    );
    return <div style={{ margin: '5px' }}>{layersLayout}</div>;
  }

  render() {
    const { genericDS, kind, klass } = this.props;
    const currentUser =
      (UserStore.getState() && UserStore.getState().currentUser) || {};
    if (
      MatrixCheck(currentUser.matrix, 'genericDataset') &&
      Object.keys(genericDS).length !== 0
    ) {
      return (
        <Panel className="panel-detail generic-ds-panel"> 
          <Panel.Body>
            {this.elementalPropertiesItem(genericDS)}
            <span className="g-ds-note label">
              <span className="g-ds-title">Note</span>
              <br />
              Selected analysis type: {absOlsTermLabel(kind)}
              <br />
              Content is designed for: {genericDS.klass_label}
            </span>
            <ButtonToolbar className="pull-right">
              <GenButtonReload
                klass={klass}
                generic={genericDS}
                fnReload={this.handleReload}
              />
            </ButtonToolbar>
          </Panel.Body>
        </Panel>
      );
    }
    return null;
  }
}

GenericDSDetails.propTypes = {
  kind: PropTypes.string,
  genericDS: PropTypes.object,
  klass: PropTypes.object,
  onChange: PropTypes.func.isRequired,
};
GenericDSDetails.defaultProps = { kind: '', genericDS: {}, klass: {} };

export default GenericDSDetails;
