import React from 'react';

import {
  Pagination, Form, Col, Row, InputGroup, FormGroup, FormControl, Glyphicon
} from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import deepEqual from 'deep-equal';

import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';
import ElementActions from './actions/ElementActions';

import ElementStore from './stores/ElementStore';
import ElementAllCheckbox from './ElementAllCheckbox';
import ElementsTableEntries from './ElementsTableEntries';
import ElementsTableSampleEntries from './ElementsTableSampleEntries';
import Switch from './Switch';

export default class ElementsTable extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      elements: [],
      currentElement: null,
      ui: {},
      sampleCollapseAll: false,
      moleculeSort: false,
      advancedSearch: false,
      productOnly: false,
    };

    this.onChange = this.onChange.bind(this);
    this.onChangeUI = this.onChangeUI.bind(this);

    this.collapseSample = this.collapseSample.bind(this);
    this.changeSort = this.changeSort.bind(this);

    this.toggleProductOnly = this.toggleProductOnly.bind(this);
    this.setFromDate = this.setFromDate.bind(this);
    this.setToDate = this.setToDate.bind(this);
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

  onChangeUI(state) {
    const { checkedIds, uncheckedIds, checkedAll } = state[this.props.type];
    const {
      fromDate, toDate, number_of_results, currentSearchSelection, productOnly
    } = state;

    // check if element details of any type are open at the moment
    const currentId = state.sample.currentId || state.reaction.currentId ||
                      state.wellplate.currentId;

    let isAdvS = false;
    if (currentSearchSelection && currentSearchSelection.search_by_method) {
      isAdvS = currentSearchSelection.search_by_method === 'advanced';
    }

    const stateChange = (
      checkedIds || uncheckedIds || checkedAll || currentId ||
      fromDate || toDate || productOnly !== this.state.productOnly ||
      isAdvS !== this.state.advancedSearch
    );

    if (stateChange) {
      this.setState({
        ui: {
          checkedIds,
          uncheckedIds,
          checkedAll,
          currentId,
          number_of_results,
          fromDate,
          toDate
        },
        productOnly,
        advancedSearch: isAdvS
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

      this.initializePagination()
    }
    else if (currentElementDidChange) {
      this.setState({
        page, pages, perPage, totalElements, currentElement
      }),

      this.initializePagination()
    }
  }

  initState() {
    this.onChange(ElementStore.getState());
  }

  initializePagination() {
    const {
      page, pages, perPage, totalElements
    } = this.state;
    this.setState({
      page, pages, perPage, totalElements
    });
  }

  collapseSample(sampelCollapseAll) {
    this.setState({sampleCollapseAll: !sampelCollapseAll})
  }

  changeSort() {
    let {moleculeSort} = this.state
    moleculeSort = !moleculeSort

    this.setState({
      moleculeSort
    }, () => ElementActions.changeSorting(moleculeSort))
  }

  handlePaginationSelect(eventKey) {
    const {pages} = this.state;
    const {type} = this.props;

    if(eventKey > 0 && eventKey <= pages) {
      this.setState({
        page: eventKey
      }, () => UIActions.setPagination({type, page: this.state.page}));
    }
  }

  pagination() {
    const {page, pages} = this.state;
    if(pages > 1) {
      return (
        <div className="list-pagination">
          <Pagination
            prev
            next
            first
            last
            maxButtons={5}
            activePage={page}
            items={pages}
            bsSize="small"
            onSelect={(eventKey) => this.handlePaginationSelect(eventKey)}/>
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
      <Form horizontal className='list-show-count'>
        <FormGroup>
          <InputGroup>
            <InputGroup.Addon>Show</InputGroup.Addon>
            <FormControl type="text" style={{textAlign: 'center'}}
               onChange={event => this.handleNumberOfResultsChange(event)}
               value={ui.number_of_results ? ui.number_of_results : 0} />
          </InputGroup>
        </FormGroup>
      </Form>
    );
  }

  toggleProductOnly() {
    UIActions.setProductOnly(!this.state.productOnly);
  }

  setFromDate(fromDate) {
    if (this.state.fromDate !== fromDate) UIActions.setFromDate(fromDate);
  }

  setToDate(toDate) {
    if (this.state.toDate !== toDate) UIActions.setToDate(toDate);
  }

  renderHeader() {
    const {
      sampleCollapseAll,
      moleculeSort, ui,
      advancedSearch, productOnly
    } = this.state;
    const { fromDate, toDate } = ui;
    const { type, showReport } = this.props;

    const collapseIcon = sampleCollapseAll ? 'chevron-right' : 'chevron-down';

    let switchBtnTitle = 'Change sorting to sort by ';
    let checkedLbl = 'Molecule';
    let uncheckedLbl = 'Sample';
    if (advancedSearch) {
      switchBtnTitle += (moleculeSort ? 'order of input' : 'sample last updated');
      checkedLbl = 'Updated';
      uncheckedLbl = 'Order';
    } else {
      switchBtnTitle += (moleculeSort ? 'Sample' : 'Molecule');
    }

    let sampleHeader = (<span />);
    if (type === 'sample') {
      const color = productOnly ? '#5cb85c' : 'currentColor';
      sampleHeader = (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Switch
            checked={moleculeSort}
            style={{ marginTop: '3px', width: '85px' }}
            onChange={this.changeSort}
            title={switchBtnTitle}
            checkedChildren={checkedLbl}
            unCheckedChildren={uncheckedLbl}
          />
          &nbsp;&nbsp;
          <button
            style={{ border: 'none' }}
            onClick={this.toggleProductOnly}
          >
            <i
              style={{ cursor: 'pointer', color }}
              className="fa fa-lg fa-product-hunt"
            />
          </button>
          &nbsp;&nbsp;
          <Glyphicon
            glyph={collapseIcon}
            title="Collapse/Uncollapse"
            onClick={() => this.collapseSample(sampleCollapseAll)}
            style={{
              fontSize: '20px',
              cursor: 'pointer',
              color: '#337ab7',
              top: 0
            }}
          />
        </div>
      );
    }

    const headerRight = (
      <div className="header-right">
        <div className="sample-list-from-date">
          <DatePicker
            selected={fromDate}
            placeholderText="From"
            onChange={this.setFromDate}
            popperPlacement="left-start"
            isClearable
            dateFormat="DD-MM-YY"
          />
        </div>
        <div className="sample-list-to-date">
          <DatePicker
            selected={toDate}
            placeholderText="To"
            popperPlacement="left-start"
            onChange={this.setToDate}
            isClearable
            dateFormat="DD-MM-YY"
          />
        </div>
        &nbsp;&nbsp;
        {sampleHeader}
      </div>
    );


    return (
      <div className="table-header" >
        <div className="select-all">
          <ElementAllCheckbox type={type} ui={ui} showReport={showReport} />
        </div>
        {headerRight}
      </div>
    );
  }

  renderEntries() {
    const {
      elements,
      ui,
      currentElement,
      sampleCollapseAll,
      moleculeSort
    } = this.state

    const {overview, type} = this.props
    let elementsTableEntries = null

    if (type === 'sample') {
      elementsTableEntries = (
        <ElementsTableSampleEntries collapseAll={sampleCollapseAll}
          elements={elements} currentElement={currentElement}
          showDragColumn={!overview} ui={ui} moleculeSort={moleculeSort}
          onChangeCollapse={(checked) => this.collapseSample(!checked)}
        />
      )
    } else {
      elementsTableEntries = (
        <ElementsTableEntries
          elements={elements} currentElement={currentElement}
          showDragColumn={!overview} ui={ui}
        />
      )
    }

    return (
      <div className="list-elements">
        {elementsTableEntries}
      </div>
    )
  }

  render() {
    return (
      <div className="list-container">
        {this.renderHeader()}
        {this.renderEntries()}
        <div className="list-container-bottom">
          <Row>
            <Col sm={6}>{this.pagination()}</Col>
            <Col sm={6}>{this.numberOfResultsInput()}</Col>
          </Row>
        </div>
      </div>
    );
  }
}
