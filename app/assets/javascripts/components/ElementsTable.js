import React from 'react';
import {Label, Pagination, Table} from 'react-bootstrap';

import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';

import ElementStore from './stores/ElementStore';
import ElementAllCheckbox from './ElementAllCheckbox';
import ElementsTableEntries from './ElementsTableEntries';

import deepEqual from 'deep-equal';

export default class ElementsTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      elements: [],
      ui: {},
      // Pagination
      activePage: this.props.activePage || 1,
      numberOfPages: 0,
      pageSize: 5,
      currentElement: null
    }
  }

  componentDidMount() {
    UIStore.getState();
    ElementStore.listen(this.onChange.bind(this));
    UIStore.listen(this.onChangeUI.bind(this));
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange.bind(this));
    UIStore.unlisten(this.onChangeUI.bind(this));
  }

  onChangeUI(state) {
    let type = this.props.type;
    let page = state.pagination && state.pagination[type] && state.pagination[type].page;
    if (page) {
      this.setState({
        activePage: parseInt(page)
      });
    }

    //console.log('ElementsType: ' + type + '#activePage ' + page);

    let {checkedIds, uncheckedIds, checkedAll} = state[this.props.type];

    // check if element details of any type are open at the moment
    let currentId = state.sample.currentId || state.reaction.currentId || state.wellplate.currentId;

    if (checkedIds || uncheckedIds || checkedAll || currentId) {
      this.setState({
        ui: {
          checkedIds: checkedIds,
          uncheckedIds: uncheckedIds,
          checkedAll: checkedAll,
          currentId: currentId
        }
      });
    }

  }

  onChange(state) {
    let type = this.props.type + 's';

    const elements = state.elements[type].elements;
    const totalElements = state.elements[type].totalElements;

    let currentElement;
    if(!state.currentElement || state.currentElement.type == this.props.type) {
      currentElement = state.currentElement
    }

    //console.log(type + ' ' + elements)
    let elementsDidChange = elements && ! deepEqual(elements, this.state.elements);
    let currentElementDidChange = ! deepEqual(currentElement, this.state.currentElement);

    let page = this.state.activePage;

    let numberOfPages = Math.ceil(totalElements / this.state.pageSize);
    if (page > numberOfPages) {
      page = 1
    }

    if (elementsDidChange) {
      this.setState({
        elements: elements,
        currentElement: currentElement,
        numberOfPages: numberOfPages,
        activePage: page
      });
    }
    else if (currentElementDidChange) {
      this.setState({
        currentElement: currentElement,
        activePage: page
      });
    }
  }

  handlePaginationSelect(event, selectedEvent) {
    const {type} = this.props;
    this.setState({
      activePage: selectedEvent.eventKey
    }, () => UIActions.setPagination({type, page: this.state.activePage}));
  }

  pagination() {
    const {numberOfPages, activePage} = this.state;
    return (numberOfPages > 1) ?
      <Pagination
        activePage={activePage}
        items={numberOfPages}
        onSelect={(event, selectedEvent) => this.handlePaginationSelect(event, selectedEvent)}/> :
      '';
  }

  render() {
    const {type} = this.props;
    const {elements, currentElement, ui} = this.state;
    const hasSvgColumn = (type == 'sample' || type == 'reaction');
    const colSpan = hasSvgColumn ? 2 : 1;
    return (
      <div>
        <Table className="elements" bordered hover>
          <thead>
            <th className="check">
              <ElementAllCheckbox type={this.props.type} checked={ui.checkedAll}/>
            </th>
            <th colSpan={colSpan}>
              All {this.props.type}s
            </th>
          <th className="drag"></th>
          </thead>
          <ElementsTableEntries elements={elements} currentElement={currentElement} ui={ui}/>
        </Table>
        {this.pagination()}
      </div>
    );
  }
}
