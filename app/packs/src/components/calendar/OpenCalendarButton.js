import React, { Component } from 'react';
import {
  Button,
  ButtonGroup,
  Nav,
  NavItem,
} from 'react-bootstrap';
import CalendarActions from 'src/stores/alt/actions/CalendarActions';
import CalendarStore from 'src/stores/alt/stores/CalendarStore';
import PropTypes from 'prop-types';

function getDefaultDateTimeRange() {
  const date = new Date();
  const weekStart = new Date().setDate(date.getDate() - (date.getDay() || 7));
  const weekEnd = new Date().setDate(date.getDate() - date.getDay() + 7);
  return { start: new Date(weekStart), end: new Date(weekEnd) };
}

export default class OpenCalendarButton extends Component {
  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    const { start, end, showSharedCollectionEntries } = CalendarStore.getState();
    const params = {};
    if (!start || !end) {
      const range = getDefaultDateTimeRange();
      params.start = range.start;
      params.end = range.end;
    } else {
      params.start = start;
      params.end = end;
    }
    const { eventableType, eventableId } = this.props;
    params.eventableType = eventableType;
    params.eventableId = eventableId;
    params.showSharedCollectionEntries = showSharedCollectionEntries;

    CalendarActions.showCalendar(params);
  }

  render() {
    const { isPanelHeader } = this.props;
    if (isPanelHeader) {
      return (
        <Button
          bsSize="xsmall"
          className="button-right"
          onClick={this.onClick}
        >
          <i className="fa fa-calendar" />
        </Button>
      );
    }

    return (
      <Nav navbar pullRight>
        <NavItem eventKey={0} className="navItemCalendar">
          <ButtonGroup className="navCalendarButton">
            <Button
              variant="primary"
              onClick={this.onClick}
              style={{ width: '60px' }}
            >
              <i className="fa fa-calendar indicator" />
            </Button>
          </ButtonGroup>
        </NavItem>
      </Nav>
    );
  }
}

OpenCalendarButton.defaultProps = {
  eventableType: undefined,
  eventableId: undefined,
  isPanelHeader: undefined,
};

OpenCalendarButton.propTypes = {
  eventableType: PropTypes.string,
  eventableId: PropTypes.number,
  isPanelHeader: PropTypes.bool
};
