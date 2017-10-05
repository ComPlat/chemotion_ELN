import React from 'react';

import {
  Pagination, Table, Form, Col, Row, Button, InputGroup, 
  FormGroup, FormControl, ControlLabel, Glyphicon
} from 'react-bootstrap';

import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';
import ElementActions from './actions/ElementActions';

import ElementStore from './stores/ElementStore';
import ElementAllCheckbox from './ElementAllCheckbox';
import ElementsTableEntries from './ElementsTableEntries';
import ElementsTableSampleEntries from './ElementsTableSampleEntries'
import Switch from './Switch.js';

import deepEqual from 'deep-equal';

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
      selectAllCurrentPage: true
    }

    this.onChange = this.onChange.bind(this)
    this.onChangeUI = this.onChangeUI.bind(this)

    this.collapseSample = this.collapseSample.bind(this)
    this.changeSort = this.changeSort.bind(this)
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

    if (checkedIds || uncheckedIds || checkedAll || currentId) {
      this.setState({
        ui: {
          checkedIds: checkedIds,
          uncheckedIds: uncheckedIds,
          checkedAll: checkedAll,
          currentId: currentId,
          number_of_results: state.number_of_results
        }
      });
    }

    let {currentSearchSelection} = state
    let isAdvS = false
    if (currentSearchSelection && currentSearchSelection.search_by_method) {
      isAdvS = currentSearchSelection.search_by_method == "advanced" ? true : false
      if (isAdvS != this.state.advancedSearch) {
        this.setState({advancedSearch: isAdvS})
      }
    } else if (this.state.advancedSearch == true) {
      this.setState({advancedSearch: false})
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

  renderHeader() {
    const {
      sampleCollapseAll,
      moleculeSort, ui,
      selectAllCurrentPage
    } = this.state

    const {type, showReport } = this.props
    const {advancedSearch} = this.state

    let collapseIcon = sampleCollapseAll ? "chevron-right" : "chevron-down"

    let switchBtnTitle = "Change sorting to sort by "
    let checkedLbl = "Molecule"
    let uncheckedLbl = "Sample"
    if (advancedSearch) {
      switchBtnTitle = switchBtnTitle + (moleculeSort ? "order of input" : "sample last updated")
      checkedLbl = "Updated"
      uncheckedLbl = "Order"
    } else {
      switchBtnTitle = switchBtnTitle + (moleculeSort ? "Sample" : "Molecule")
    }

    let headerRight = (<span />)
    if (type === 'sample') {
      headerRight = (
        <div className="header-right">
          <Switch checked={moleculeSort} style={{width: "90px"}}
            onChange={this.changeSort}
            title={switchBtnTitle}
            checkedChildren={checkedLbl}
            unCheckedChildren={uncheckedLbl}/>

          &nbsp;&nbsp;&nbsp;&nbsp;

          <Glyphicon glyph={collapseIcon} 
            title="Collapse/Uncollapse"
            onClick={() => this.collapseSample(sampleCollapseAll)}
            style={{
              fontSize: "20px", cursor: "pointer",
              top: 0, color: '#337ab7'
            }}/> 
        </div>
      )
    }

    return (
      <div className="table-header" >
        <div className="select-all">
          <ElementAllCheckbox type={type} ui={ui} showReport={showReport}/>
        </div>
        {headerRight}
      </div>
    )
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
