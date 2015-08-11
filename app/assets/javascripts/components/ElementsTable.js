import React from 'react';
import {Label, Pagination, Table} from 'react-bootstrap';

import ElementStore from './stores/ElementStore';
import ElementAllCheckbox from './ElementAllCheckbox';
import ElementCheckbox from './ElementCheckbox';

export default class ElementsTable extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      elements: [],
      type: props.type,

      // Pagination
      activePage: 1,
      numberOfPages: 0,
      pageSize: 5
    }
  }

  componentDidMount() {
    ElementStore.listen(this.onChange.bind(this));
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange.bind(this));
  }

  onChange(state) {
    // TODO switch based on type
    let numberOfPages = Math.ceil(state.samples.length / this.state.pageSize);

    this.setState({
      elements: state.samples,
      numberOfPages: numberOfPages
    });

    // reset pagination if element state changes
    if(state.samples != this.state.elements) {
      this.setState({activePage: 1});
    }
  }

  header() {
    return (
      <thead>
        <th width="40">
          <ElementAllCheckbox type={this.state.type} />
        </th>
        <th colSpan="2">All {this.state.type}s</th>
      </thead>
    )
  }

  entries() {
    // Pagination: startAt...Arrayindex to start with...
    // TODO Move to PaginationUtils?
    let pageSize = this.state.pageSize;
    let startAt = (this.state.activePage - 1) * pageSize;
    let endAt = startAt + pageSize;
    let elementsOnActivePage = this.state.elements.slice(startAt, endAt);

    return elementsOnActivePage.map((element, index) => {
      let elementRepresentationForUIAction = {type: this.props.type, id: element.id}
      // TODO: switch(this.state.type)...case 'sample'...SampleRow
      return (
        <tr key={index}>
          <td width="40">
            <ElementCheckbox element={elementRepresentationForUIAction}/>
          </td>
          <td onClick={this.showDetails.bind(this, element)} width="120" style={{cursor: 'pointer'}}>
            {element.name}
          </td>
          <td>
            {this.collectionLabels(element)}
          </td>
        </tr>
      )
    });
  }

  collectionLabels(element) {
    return element.collection_labels.map((label, index) => {
      return (
        <span>
          <Label bsStyle="primary" key={index}>{label}</Label>
          &nbsp;
        </span>
      )
    });
  }

  showDetails(element) {
    switch(this.state.type) {
      case 'sample':
        this.context.router.transitionTo('/sample/' + element.id);
        break;
    }
  }

  handlePaginationSelect(event, selectedEvent) {
    this.setState({
      activePage: selectedEvent.eventKey
    });
  }

  pagination() {
    if(this.state.numberOfPages > 1) {
      return (
        <Pagination activePage={this.state.activePage}
                    items={this.state.numberOfPages}
                    onSelect={this.handlePaginationSelect.bind(this)}/>
      )
    }
  }

  render() {
    return (
      <div>
        <Table bordered hover>
          {this.header()}
          <tbody>
            {this.entries()}
          </tbody>
        </Table>
        {this.pagination()}
      </div>
    )
  }
}

ElementsTable.contextTypes = {
  router: React.PropTypes.func.isRequired
};
