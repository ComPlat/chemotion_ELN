import React from 'react';
import CellLinesFetcher from 'src/fetchers/CellLinesFetcher';
import PropTypes from 'prop-types';
import { StoreContext } from 'src/stores/mobx/RootStore';
import {
  Col, Row, FormControl
} from 'react-bootstrap';
import Creatable from 'react-select3/creatable';
import ControlLabel from 'src/components/legacyBootstrap/ControlLabel'

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
      .then((data) => data.map((x) => ({ value: x.id, label: x.name, name: x.name })))
      .then((data) => {
        this.setState({ nameSuggestions: data });
      });
  }

  static renderNameSuggestion(name, src) {
    return (
      <span style={{ display: 'block', textAlign: 'left' }}>
        {name}
        {' '}
        (
        {src}
        )
      </span>
    );
  }

  render() {
    const { cellLineDetailsStore } = this.context;
    const { nameSuggestions } = this.state;
    const { id, name, readOnly } = this.props;
    const className = cellLineDetailsStore.cellLines(id).cellLineName
      ? 'cell-line-name-autocomplete'
      : 'cell-line-name-autocomplete invalid';
    if (readOnly) {
      return (
        <Row>
          <Col componentClass={ControlLabel} sm={3}>Cell line name *</Col>
          <Col sm={9}>
            <FormControl
              disabled
              className=""
              type="text"
              value={cellLineDetailsStore.cellLines(id).cellLineName}
              onChange={() => {}}
            />
          </Col>
        </Row>
      );
    }

    return (
      <div className="cell-line-name">
        <Row>
          <Col componentClass={ControlLabel} sm={3}>Cell line name *</Col>
          <Col sm={9}>
            <Creatable
              className={className}
              onChange={(e) => {
                if (typeof e.value === 'number') {
                  const currentEntry = nameSuggestions.filter((x) => x.value === e.value);
                  if (currentEntry.length > 0) {
                    cellLineDetailsStore.changeCellLineName(id, currentEntry[0].name);
                    CellLinesFetcher.getCellLineMaterialById(e.value)
                      .then((result) => {
                        cellLineDetailsStore.setMaterialProperties(id, result);
                      });
                  }
                } else {
                  cellLineDetailsStore.changeCellLineName(id, e.value);
                }
              }}
              onInputChange={(e, action) => {
                if (action.action === 'input-change') {
                  cellLineDetailsStore.changeCellLineName(id, e);
                }
              }}
              options={nameSuggestions}
              placeholder="enter new cell line name or choose from existing ones "
              defaultInputValue={name}
            />
          </Col>
        </Row>
      </div>
    );
  }
}

CellLineName.propTypes = {
  id: PropTypes.string.isRequired,
  readOnly: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
};
