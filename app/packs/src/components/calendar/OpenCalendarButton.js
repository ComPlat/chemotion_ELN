import React, { Component } from 'react';
import { Button, ButtonGroup, Nav } from 'react-bootstrap';
import CalendarActions from 'src/stores/alt/actions/CalendarActions';
import CalendarStore from 'src/stores/alt/stores/CalendarStore';


function getDefaultDatetimeRange() {
  const date = new Date();
  const today = date.getDate();
  const currentDay = date.getDay();
  const weekStart = date.setDate(today - (currentDay || 7));
  const weekEnd = date.setDate(today - currentDay + 7);
  return { start: new Date(weekStart), end: new Date(weekEnd)};
}


export default class OpenCalendarButton extends Component {
  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
  }
  onClick() {
    const { start, end, showSharedCollectionEntries } = CalendarStore.getState();
    let params = {};
    if (!start || !end) {
      let range = getDefaultDatetimeRange();
      params.start = range.start;
      params.end = range.end;
    } else {
      params.start = start;
      params.end = end;
    }
    params.eventable_type = this.props.eventable_type;
    params.eventable_id = this.props.eventable_id;
    params.showSharedCollectionEntries = showSharedCollectionEntries;

    CalendarActions.showCalendar(params);
  }

  render() {
    if (this.props.isPanelHeader) {
      return (<Button
                // bsStyle="info"
                bsSize="xsmall"
                className="button-right"
                onClick={this.onClick} >
              <i className="fa fa-calendar"/>
            </Button>)
    } else {
      return (<Nav navbar pullRight>
             <ButtonGroup className='navCalendarButton' >
                <Button variant="primary" 
                  onClick={this.onClick} 
                  style={{width: "60px"}} 
                >
                  <i className="fa fa-calendar indicator" />
                </Button>
              </ButtonGroup>
            </Nav>

      )
    }
  }
}
