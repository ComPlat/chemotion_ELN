import React from 'react';
import {Label, Pagination, Table} from 'react-bootstrap';

import UIStore from './stores/UIStore';
import ElementStore from './stores/ElementStore';
import ElementAllCheckbox from './ElementAllCheckbox';
import ElementCheckbox from './ElementCheckbox';
import ElementCollectionLabels from './ElementCollectionLabels';

import SVG from 'react-inlinesvg';
import Aviator from 'aviator';
import deepEqual from 'deep-equal';

export default class ElementsTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      elements: [],

      // Pagination
      activePage: this.props.activePage || 1,
      numberOfPages: 0,
      pageSize: 5
    }
  }

  componentDidMount() {
    ElementStore.listen(this.onChange.bind(this));
    UIStore.listen(this.onChangeUI.bind(this));
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange.bind(this));
    UIStore.unlisten(this.onChangeUI.bind(this));
  }

  onChangeUI(state) {
    let {checkedSampleIds, uncheckedSampleIds, checkedAllSamples} = state;

    console.log('checkedAllSamples ' + checkedAllSamples);
    console.log('checkedSampleIds ' + checkedSampleIds.toArray());
    console.log('uncheckedSampleIds ' + uncheckedSampleIds.toArray());

    //console.log(state);

    let page = state.pagination && state.pagination.page;
    if(page) {
      this.setState({
        activePage: parseInt(page)
      });
    }
  }

  onChange(state) {
    const elements = state.elements.samples.elements;
    const totalElements = state.elements.samples.totalElements;

    let currentElement;
    if(state.currentElement && state.currentElement.type == this.props.type) {
      currentElement = state.currentElement
    }

    let elementsDidChange = elements && !deepEqual(elements, this.state.elements);
    let currentElementDidChange = !deepEqual(currentElement, this.state.currentElement);

    let pagination = UIStore.getState().pagination;
    let page = pagination.page && parseInt(pagination.page) || 1;
    let numberOfPages = Math.ceil(totalElements / this.state.pageSize);
    if(page > numberOfPages) {
      page = 1
    }

    if(elementsDidChange) {
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

  entries() {
    // Pagination: startAt...Arrayindex to start with...
    // TODO Move to PaginationUtils?
    let pageSize = this.state.pageSize;
    let elements = this.state.elements;

    return elements.map((element, index) => {
      let isSelected = this.state.currentElement && this.state.currentElement.id == element.id;

      let optionalLabelColumn
      let moleculeColumn
      let svgPath = `/images/molecules/${element.molecule.molecule_svg_file}`;
      let svgImage = <SVG src={svgPath} className={isSelected ? 'molecule-selected' : 'molecule'} key={element.molecule.id}/>

      if(this.showElementDetailsColumns()) {

        optionalLabelColumn = (
          <td className="labels">
            <ElementCollectionLabels element={element} key={element.id}/>
          </td>
        )

      }

      moleculeColumn = (
        <td className="molecule" margin="0" padding="0">{svgImage}</td>
      )

      let style = {}
      if(isSelected) {
        style = {
          color: '#fff',
          background: '#337ab7'
        }
      }

      return (
        <tr key={index} height="100" style={style}>
          <td className="check">
            <ElementCheckbox element={element} key={element.id}/>
          </td>
          <td className="name" onClick={e => this.showDetails(element)} style={{cursor: 'pointer'}}>
            {element.name}
          </td>
         {optionalLabelColumn}
         {moleculeColumn}
        </tr>
      )
    });
  }

  showElementDetailsColumns() {
    return !(this.state.currentElement);
  }

  showDetails(element) {
    Aviator.navigate(this._elementDetailsUrl(element), this._queryParams());
  }

  handlePaginationSelect(event, selectedEvent) {
    this.setState({
      activePage: selectedEvent.eventKey
    }, () => {
      if(this.state.currentElement) {
        Aviator.navigate(this._elementDetailsUrl(this.state.currentElement), this._queryParams())
      }
      else {
        Aviator.navigate(this._collectionUrl(), this._queryParams())
      }
    })
  }

  _elementDetailsUrl(element) {
    return `${this._collectionUrl()}/${element.type}/${element.id}`
  }

  _collectionUrl() {
    let uiState = UIStore.getState();
    return `/collection/${uiState.currentCollectionId}`
  }

  _queryParams() {
    return {queryParams: { page: this.state.activePage }};
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

  header() {
    let colSpan = this.showElementDetailsColumns() ? "3" : "2";
    return (
      <thead>
        <th className="check">
          <ElementAllCheckbox type={this.props.type} />
        </th>
        <th colSpan={colSpan}>
          All {this.props.type}s
        </th>
      </thead>
    )
  }

  render() {
    return (
      <div>
        <Table className="elements" bordered hover>
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
