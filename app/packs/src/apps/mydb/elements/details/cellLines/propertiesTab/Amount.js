import React from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import PropTypes from 'prop-types';
import {
  Button, OverlayTrigger, Tooltip,
  FormControl
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
  }

  getStyleClass(cellLineItem) {
    const { invalidInput } = this.state;
    return cellLineItem.isAmountValid() && !invalidInput ? '' : 'invalid-input';
  }

  renderDecimalRepresentation() {
    const { cellLineDetailsStore } = this.context;
    const { cellLineId, readOnly } = this.props;
    const { currentValue } = this.state;
    const cellLineItem = cellLineDetailsStore.cellLines(cellLineId);

    return (
      <FormControl
        disabled={readOnly}
        className={this.getStyleClass(cellLineItem)}
        value={currentValue}
        onChange={(e) => {
          const { value } = e.target;
          this.setState({
            currentValue: e.target.value,
            invalidInput: Number.isNaN(value)
          });

          if (!Number.isNaN(value)) {
            cellLineDetailsStore.changeAmount(cellLineId, Number(e.target.value));
          }
        }}
      />
    );
  }

  renderScienceViewButton() {
    const { currentValue } = this.state;

    return (
      <OverlayTrigger placement="top" overlay={<Tooltip id="detailed-info-button">Switch representation mode</Tooltip>}>
        <Button
          className="button-right"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            const isScientific = String(currentValue).toUpperCase().includes('E');
            const formattedValue = isScientific
              ? Number(currentValue)
              : Number(currentValue).toExponential();
            this.setState({ currentValue: formattedValue });
          }}
        >
          <i className="fa fa-calculator" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    );
  }

  render() {
    const { cellLineDetailsStore } = this.context;
    const { invalidInput } = this.state;
    const { cellLineId } = this.props;
    const cellLineItem = cellLineDetailsStore.cellLines(cellLineId);
    const scienceViewButton = cellLineItem.isAmountValid(cellLineItem) && !invalidInput
      ? this.renderScienceViewButton()
      : null;

    return (
      <div>
        <div className="floating amount">
          {this.renderDecimalRepresentation()}
        </div>
        <div className="scientific-button">
          {scienceViewButton}
        </div>
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
