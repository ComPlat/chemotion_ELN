/* eslint-disable no-restricted-globals */
/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Card } from 'react-bootstrap';
import {
  GenInterface, GenToolbar, absOlsTermLabel, browseElement
} from 'chem-generic-ui';
import UserStore from 'src/stores/alt/stores/UserStore';
import MatrixCheck from 'src/components/common/MatrixCheck';
import UIStore from 'src/stores/alt/stores/UIStore';

const onNaviClick = (type, id) => {
  const { currentCollection, isSync } = UIStore.getState();
  const { genericEls = [] } = UserStore.getState();
  browseElement(currentCollection, isSync, type, id, genericEls, true);
};

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
    const {
      onChange, element, onDatasetChange, datasetContainer
    } = this.props;
    const { currentUser } = UserStore.getState();
    const layersLayout = (
      <GenInterface
        generic={genericDS}
        fnChange={onChange}
        isPreview={false}
        isActiveWF={false}
        fnNavi={onNaviClick}
        refSource={{
          element,
          datasetContainer,
          currentUser,
          fnRef: onDatasetChange,
        }}
      />
    );
    return <div>{layersLayout}</div>;
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
        <Card className="d-flex flex-column border-0 shadow-none">
          <Card.Body className="flex-grow-1 d-flex flex-column p-0">
            <div className="flex-grow-1 overflow-auto p-1">
              {this.elementalPropertiesItem(genericDS)}
            </div>
            <Card.Footer
              className="d-flex justify-content-between align-items-center px-3 bg-transparent border-top"
            >
              <span className="text-muted small">
                <strong>Selected analysis type:</strong>
                {' '}
                {absOlsTermLabel(kind)}
                <br />
                <strong>Content is designed for:</strong>
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
  element: PropTypes.object,
  datasetContainer: PropTypes.object,
  onDatasetChange: PropTypes.func,
};
GenericDSDetails.defaultProps = {
  kind: '',
  genericDS: {},
  klass: {},
  element: {},
  datasetContainer: {},
  onDatasetChange: () => {},
};

export default GenericDSDetails;
