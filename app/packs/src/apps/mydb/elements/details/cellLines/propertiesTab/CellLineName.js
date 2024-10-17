import React from 'react';
import CellLinesFetcher from 'src/fetchers/CellLinesFetcher';
import PropTypes from 'prop-types';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { Col, Row, Form } from 'react-bootstrap';
import { CreatableSelect } from 'src/components/common/Select';

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

    if (readOnly) {
      return (
        <Form.Group as={Row}>
          <Form.Label column sm={3}>Cell line name *</Form.Label>
          <Col sm={9}>
            <Form.Control
              disabled
              type="text"
              value={cellLineDetailsStore.cellLines(id).cellLineName}
            />
          </Col>
        </Form.Group>
      );
    }

    const className = cellLineDetailsStore.cellLines(id).cellLineName
      ? 'cell-line-name-autocomplete'
      : 'cell-line-name-autocomplete invalid';
    return (
      <Form.Group as={Row} className="cell-line-name">
        <Form.Label column sm={3}>Cell line name *</Form.Label>
        <Col sm={9}>
          <CreatableSelect
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
      </Form.Group>
    );
  }
}

CellLineName.propTypes = {
  id: PropTypes.string.isRequired,
  readOnly: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
};
