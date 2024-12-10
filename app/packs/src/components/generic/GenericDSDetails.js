/* eslint-disable no-restricted-globals */
/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Card } from 'react-bootstrap';
import { GenInterface, GenToolbar, absOlsTermLabel } from 'chem-generic-ui';
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
    return <div className="m-2">{layersLayout}</div>;
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
        <Card className="d-flex flex-column">
          <Card.Body className="flex-grow-1 d-flex flex-column p-0">
            <div className="flex-grow-1 overflow-auto p-3">
              {this.elementalPropertiesItem(genericDS)}
            </div>
            <Card.Footer className="d-flex justify-content-between align-items-center">
              <span>
                <h5>Note</h5>
                Selected analysis type:
                {' '}
                {absOlsTermLabel(kind)}
                <br />
                Content is designed for:
                {' '}
                {genericDS.klass_label}
              </span>
              <GenToolbar
                generic={genericDS}
                genericType="Dataset"
                klass={klass}
                fnReload={this.handleReload}
              />
            </Card.Footer>
          </Card.Body>
        </Card>
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
