import React from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import PropTypes from 'prop-types';
import {
  Button, OverlayTrigger, Tooltip, Form
} from 'react-bootstrap';

class Amount extends React.Component {
  // eslint-disable-next-line react/static-property-placement
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    const { initialValue } = this.props;
    this.state = {
      currentValue: initialValue,
      invalidInput: false
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleScientificButtonClick = this.handleScientificButtonClick.bind(this);
  }

  handleInputChange(event) {
    const { value } = event.target;
    const { cellLineDetailsStore } = this.context;
    const { cellLineId } = this.props;

    this.setState({
      currentValue: value,
      invalidInput: Number.isNaN(value)
    });

    if (!Number.isNaN(value)) {
      cellLineDetailsStore.changeAmount(cellLineId, Number(value));
    }
  }

  handleScientificButtonClick(event) {
    const { currentValue } = this.state;

    event.stopPropagation();
    const isScientific = String(currentValue).toUpperCase().includes('E');
    const formattedValue = isScientific
      ? Number(currentValue)
      : Number(currentValue).toExponential();
    this.setState({ currentValue: formattedValue });
  }

  getStyleClass(cellLineItem) {
    const { invalidInput } = this.state;
    return cellLineItem.isAmountValid() && !invalidInput ? '' : 'invalid-input';
  }

  render() {
    const { cellLineDetailsStore } = this.context;
    const { invalidInput, currentValue } = this.state;
    const { cellLineId, readOnly } = this.props;
    const cellLineItem = cellLineDetailsStore.cellLines(cellLineId);
    const showScienceViewButton = cellLineItem.isAmountValid(cellLineItem) && !invalidInput;

    return (
      <div className="d-flex gap-1 align-items-center">
        <Form.Control
          disabled={readOnly}
          className={`flex-grow-1 ${this.getStyleClass(cellLineItem)}`}
          value={currentValue}
          onChange={this.handleInputChange}
        />
        {showScienceViewButton && (
          <OverlayTrigger
            placement="top"
            overlay={(
              <Tooltip>
                Switch representation mode
              </Tooltip>
            )}
          >
            <Button
              size="sm"
              onClick={this.handleScientificButtonClick}
            >
              <i className="fa fa-calculator" aria-hidden="true" />
            </Button>
          </OverlayTrigger>
        )}
      </div>
    );
  }
}

export default observer(Amount);

Amount.propTypes = {
  cellLineId: PropTypes.string.isRequired,
  readOnly: PropTypes.bool.isRequired,
  initialValue: PropTypes.number.isRequired,
};
