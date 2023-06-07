import React from 'react';
import CellLinesFetcher from 'src/fetchers/CellLinesFetcher';
import { ReactSearchAutocomplete } from 'react-search-autocomplete';
import PropTypes from 'prop-types';
import { StoreContext } from 'src/stores/mobx/RootStore';
import {
  Col, ControlLabel
} from 'react-bootstrap';

export default class CellLineName extends React.Component {
  // eslint-disable-next-line react/static-property-placement
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = {
      nameSuggestions: []
    };
  }

  componentDidMount() {
    CellLinesFetcher.getAllCellLineNames()
      .then((data) => {
        this.setState({ nameSuggestions: data });
      });
  }

  static renderNameSuggestion(name) {
    return (
      <span style={{ display: 'block', textAlign: 'left' }}>{name}</span>
    );
  }

  render() {
    const { cellLineDetailsStore } = this.context;
    const { nameSuggestions } = this.state;
    const { id, name } = this.props;
    const className = cellLineDetailsStore.cellLines(id).cellLineName
      ? 'cell-line-name-autocomplete'
      : 'cell-line-name-autocomplete invalid';

    return (
      <div className="cell-line-name">
        <Col componentClass={ControlLabel} sm={3}>Cell line name *</Col>
        <Col sm={9}>
          <ReactSearchAutocomplete
            className={className}
            showIcon={false}
            items={nameSuggestions}
            onSearch={(newName) => {
              cellLineDetailsStore.changeCellLineName(id, newName);
            }}
            onSelect={(item) => {
              cellLineDetailsStore.changeCellLineName(id, item.name);
            }}
            showNoResults={false}
            formatResult={(item) => (CellLineName.renderNameSuggestion(item.name))}
            inputSearchString={name}
            fuseOptions={{ threshold: 0.1 }}
          />
        </Col>
      </div>
    );
  }
}

CellLineName.propTypes = {
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
};
