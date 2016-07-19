import React from 'react';
import { Pagination, Table, FormGroup, FormControl, ControlLabel} from 'react-bootstrap';

import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';
import ElementActions from './actions/ElementActions';

import ElementStore from './stores/ElementStore';
import ElementAllCheckbox from './ElementAllCheckbox';
import ElementsTableEntries from './ElementsTableEntries';
import ElementsTableSampleEntries from './ElementsTableSampleEntries'
import ElementsSvgCheckbox from './ElementsSvgCheckbox';
import deepEqual from 'deep-equal';

export default class ElementsTable extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      elements: [],
      currentElement: null,
      ui: {}
    }
    this.onChange = this.onChange.bind(this)
    this.onChangeUI = this.onChangeUI.bind(this)
  }

  componentDidMount() {
    UIStore.getState();
    ElementStore.listen(this.onChange);
    UIStore.listen(this.onChangeUI);
    this.initializePagination();
    this.initState();
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange);
    UIStore.unlisten(this.onChangeUI);
  }

  initializePagination() {
    const {page, pages, perPage, totalElements} = this.state;
    this.setState({
      page, pages, perPage, totalElements
    });
  }

  initState(){
    this.onChange(ElementStore.getState());
  }

  onChangeUI(state) {
    let {checkedIds, uncheckedIds, checkedAll} = state[this.props.type];

    // check if element details of any type are open at the moment
    let currentId = state.sample.currentId || state.reaction.currentId ||
                    state.wellplate.currentId;

    if (checkedIds || uncheckedIds || checkedAll || currentId ||
        state.showPreviews) {
      this.setState({
        ui: {
          checkedIds: checkedIds,
          uncheckedIds: uncheckedIds,
          checkedAll: checkedAll,
          currentId: currentId,
          showPreviews: state.showPreviews,
          number_of_results: state.number_of_results
        }
      });
    }

  }

  onChange(state) {
    let type = this.props.type + 's';
    let elementsState = state.elements[type];

    const {elements, page, pages, perPage, totalElements} = elementsState;

    let currentElement;
    if(!state.currentElement || state.currentElement.type == this.props.type) {
      currentElement = state.currentElement
    }

    let elementsDidChange = elements && ! deepEqual(elements, this.state.elements);
    let currentElementDidChange = !deepEqual(currentElement, this.state.currentElement);

    if (elementsDidChange) {
      this.setState({
        elements, page, pages, perPage, totalElements, currentElement
      }),
      () => this.initializePagination()
    }
    else if (currentElementDidChange) {
      this.setState({
        page, pages, perPage, totalElements, currentElement
      }),
      () => this.initializePagination()
    }
  }

  handlePaginationSelect(event, selectedEvent) {
    const {pages} = this.state;
    const {type} = this.props;
    if(selectedEvent.eventKey > 0 && selectedEvent.eventKey <= pages) {
      this.setState({
        page: selectedEvent.eventKey
      }, () => UIActions.setPagination({type, page: this.state.page}));
    }
  }

  pagination() {
    const {page, pages} = this.state;
    if(pages > 1) {
      return <Pagination
        prev
        next
        first
        last
        maxButtons={3}
        activePage={page}
        items={pages}
        bsSize="small"
        onSelect={(event, selectedEvent) => this.handlePaginationSelect(event, selectedEvent)}/>
    }
  }

  previewCheckbox() {
    const {ui} = this.state;
    const {type} = this.props;
    if(type == 'reaction' ) {
      return (
        <div style={{float: 'right'}}>
          <ElementsSvgCheckbox checked={ui.showPreviews}/>
        </div>
      )
    }
  }

  handleNumberOfResultsChange(event) {
    const value = event.target.value;
    const {type} = this.props;
    UIActions.changeNumberOfResultsShown(value);
    ElementActions.refreshElements(type)
  }

  numberOfResultsInput() {
    let {ui} = this.state
    return (
      <FormGroup >
        <ControlLabel>Show </ControlLabel>
        <FormControl
          className="number-shown-select"
          onChange={event => this.handleNumberOfResultsChange(event)}
          type="text"
          value={ui.number_of_results ? ui.number_of_results : 0} />
      </FormGroup>

    );
  }

  renderEntries() {
    const {elements, ui, currentElement} = this.state
    const {overview, showReport, type} = this.props
    if(type == 'sample') {
      return (
        <div>
          <Table className="elements" bordered hover style={{marginBottom: 0}}>
            <thead><tr>
              <th className="check">
                <ElementAllCheckbox type={this.props.type}
                  checked={ui.checkedAll}
                  showReport={showReport}/>
              </th>
              <th colSpan={3}>
                All {type}s
              </th>
            </tr></thead>
          </Table>
          <ElementsTableSampleEntries
            elements={elements}
            currentElement={currentElement}
            showDragColumn={!overview}
            ui={ui}
          />
        </div>
      )
    } else {
      return (
        <Table className="elements" bordered hover>
          <thead><tr>
            <th className="check">
              <ElementAllCheckbox type={this.props.type}
                checked={ui.checkedAll}
                showReport={showReport}/>
            </th>
            <th colSpan={3}>
              All {type}s
            </th>
          </tr></thead>
          <ElementsTableEntries
            elements={elements}
            currentElement={currentElement}
            showDragColumn={!overview}
            ui={ui}
          />
        </Table>
      )
    }
  }

  render() {
    return (
      <div>
        {this.renderEntries()}
        {this.pagination()}
        <div style={{float: 'right', paddingTop: 4}}>
          {this.numberOfResultsInput()}
          {this.previewCheckbox()}
        </div>
      </div>
    );
  }
}
