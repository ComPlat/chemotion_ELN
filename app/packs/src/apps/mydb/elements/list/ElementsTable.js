/* eslint-disable camelcase */
import React from 'react';

import {
  Pagination, Form, Col, Row, InputGroup, FormGroup, FormControl, Glyphicon, Tooltip, OverlayTrigger, Modal, Panel, Button
} from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import deepEqual from 'deep-equal';

import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import UserActions from 'src/stores/alt/actions/UserActions';

import ElementStore from 'src/stores/alt/stores/ElementStore';
import ElementAllCheckbox from 'src/apps/mydb/elements/list/ElementAllCheckbox';
import ElementsTableEntries from 'src/apps/mydb/elements/list/ElementsTableEntries';
import ElementsTableSampleEntries from 'src/apps/mydb/elements/list/ElementsTableSampleEntries';

import UserStore from 'src/stores/alt/stores/UserStore';
import ElementsTableGroupedEntries from 'src/apps/mydb/elements/list/ElementsTableGroupedEntries';
import Select from 'react-select';
import PropTypes from 'prop-types';
import CellLineGroup from 'src/models/cellLine/CellLineGroup';
import CellLineContainer from 'src/apps/mydb/elements/list/cellLine/CellLineContainer';
import ThirdPartyAppFetcher from '../../../../fetchers/ThirdPartyAppFetcher';

export default class ElementsTable extends React.Component {
  constructor(props) {
    super(props);
    this.elementRef = React.createRef();

    this.state = {
      elements: [],
      currentElement: null,
      ui: {},
      collapseAll: false,
      moleculeSort: false,
      searchResult: false,
      productOnly: false,
      page: null,
      pages: null,
      elementsGroup: 'none',
      elementsSort: true,
      sortDirection: 'DESC',
      showAttachmentTokenModal: false,
      attachmentTokens: []
    };

    this.onChange = this.onChange.bind(this);
    this.onChangeUI = this.onChangeUI.bind(this);

    this.changeDateFilter = this.changeDateFilter.bind(this);

    this.toggleProductOnly = this.toggleProductOnly.bind(this);
    this.setFromDate = this.setFromDate.bind(this);
    this.setToDate = this.setToDate.bind(this);
    this.timer = null;
  }

  componentDidMount() {
    UIStore.getState();
    ElementStore.listen(this.onChange);
    UIStore.listen(this.onChangeUI);
    this.initState();
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange);
    UIStore.unlisten(this.onChangeUI);
  }

  handlePaginationSelect(eventKey) {
    const { pages } = this.state;
    const { type } = this.props;

    if (eventKey > 0 && eventKey <= pages) {
      this.setState({
        page: eventKey
      }, () => {
        const { page } = this.state;
        UIActions.setPagination({ type, page });
        this.handleScrollToElement(this.elementRef);
      });
    }
  }
  handleScrollToElement = () => {
    if (this.elementRef.current) {
      this.elementRef.current.scrollTo({ top: 0, left: 0, behavior: "smooth", });
    }
  };

  onChangeUI(state) {
    const { type } = this.props;
    if (typeof state[type] === 'undefined' || state[type] === null) {
      return;
    }
    const { checkedIds, uncheckedIds, checkedAll } = state[type];
    const {
      filterCreatedAt, fromDate, toDate, number_of_results, currentSearchByID, productOnly
    } = state;

    // check if element details of any type are open at the moment
    const currentId = state.sample.currentId || state.reaction.currentId
      || state.wellplate.currentId;

    let isSearchResult = currentSearchByID ? true : false;

    const { currentStateProductOnly, searchResult } = this.state;
    const stateChange = (
      checkedIds || uncheckedIds || checkedAll || currentId || filterCreatedAt
      || fromDate || toDate || productOnly !== currentStateProductOnly
      || isSearchResult !== searchResult
    );
    const moleculeSort = isSearchResult ? true : ElementStore.getState().moleculeSort;

    if (stateChange) {
      this.setState({
        filterCreatedAt,
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
        searchResult: isSearchResult,
        moleculeSort: moleculeSort
      });
    }
  }

  onChange(state) {
    const { type } = this.props;
    const elementsState = (state && state.elements && state.elements[`${type}s`]) || {};
    const { elements, page, pages } = elementsState;

    let currentElement;
    if (!state.currentElement || state.currentElement.type === type) {
      const { currentElement: stateCurrentElement } = state;
      currentElement = stateCurrentElement;
    }

    const { elements: stateElements, currentElement: stateCurrentElement } = this.state;
    const elementsDidChange = elements && !deepEqual(elements, stateElements);
    const currentElementDidChange = !deepEqual(currentElement, stateCurrentElement);

    const nextState = { page, pages, currentElement };
    if (elementsDidChange) { nextState.elements = elements; }
    if (elementsDidChange || currentElementDidChange) { this.setState(nextState); }
    this.setState({ attachmentTokens: ElementStore.getState().attachmentTokens });

  }

  setFromDate(date) {
    const { fromDate } = this.state;
    if (fromDate !== date) UIActions.setFromDate(date);
  }

  setToDate(date) {
    const { toDate } = this.state;
    if (toDate !== date) UIActions.setToDate(date);
  }

  initState = () => {
    this.onChange(ElementStore.getState());

    const { type, genericEl } = this.props;

    if (type === 'reaction' || genericEl) {
      const userState = UserStore.getState();
      const filters = userState.profile.data.filters || {};

      // you are not able to use this.setState because this would rerender it again and again ...
      // eslint-disable-next-line react/no-direct-mutation-state
      this.state.elementsGroup = filters[type]?.group || 'none';
      // eslint-disable-next-line react/no-direct-mutation-state
      this.state.elementsSort = filters[type]?.sort ?? true;
      // eslint-disable-next-line react/no-direct-mutation-state
      this.state.sortDirection = filters[type]?.direction || 'DESC';
    }
  };

  changeCollapse = (collapseAll) => {
    this.setState({ collapseAll: !collapseAll });
  };

  changeSampleSort = () => {
    let { moleculeSort } = this.state;
    moleculeSort = !moleculeSort;

    this.setState({
      moleculeSort
    }, () => ElementActions.changeSorting(moleculeSort));
  };

  updateFilterAndUserProfile = (elementsSort, sortDirection, elementsGroup) => {
    const { type } = this.props;

    ElementActions.changeElementsFilter({
      name: type,
      sort: elementsSort,
      direction: sortDirection,
      group: elementsGroup,
    });

    UserActions.updateUserProfile({
      data: {
        filters: {
          [type]: {
            sort: elementsSort,
            direction: sortDirection,
            group: elementsGroup,
          },
        },
      },
    });
  };

  changeElementsGroup = (elementsGroup) => {
    const { elementsSort, sortDirection } = this.state;

    this.setState({
      elementsGroup,
      elementsSort,
    }, () => {
      this.updateFilterAndUserProfile(elementsSort, sortDirection, elementsGroup);
    });
  };

  changeElementsSort = () => {
    const { elementsGroup, sortDirection } = this.state;
    let { elementsSort } = this.state;
    elementsSort = !elementsSort;

    this.setState({
      elementsSort
    }, () => {
      this.updateFilterAndUserProfile(elementsSort, sortDirection, elementsGroup);
    });
  };

  changeSortDirection = () => {
    const { elementsGroup, elementsSort, sortDirection } = this.state;
    const newSortDirection = sortDirection === 'DESC' ? 'ASC' : 'DESC';

    this.setState(
      { sortDirection: newSortDirection },
      () => {
        this.updateFilterAndUserProfile(elementsSort, newSortDirection, elementsGroup);
      }
    );
  };

  handleRevokeAttachmentToken = (key, idx, action_type) => {
    const { attachmentTokens } = this.state;
    ThirdPartyAppFetcher.update_attachment_token_with_action_type(key, action_type)
      .then(res => {
        let alias = attachmentTokens;
        alias = alias.filter((i, index) => {
          if (index !== idx) return i;
        });
        this.setState({ attachmentTokens: [...alias] });
        // tpa token call
        const uistoreContainer = UIStore.getState();
        ElementActions.fetchCollectionAttachmentTokens(uistoreContainer?.currentCollection?.id);
      })
      .catch((err) => {
        alert("Revoking token failed! check console to verify!");
        console.log(err.message);
      })
      ;
  };

  collapseButton = () => {
    const { collapseAll } = this.state;
    const collapseIcon = collapseAll ? 'chevron-right' : 'chevron-down';

    return (
      <Glyphicon
        glyph={collapseIcon}
        title="Collapse/Uncollapse"
        onClick={() => this.changeCollapse(collapseAll)}
        style={{
          fontSize: '20px',
          cursor: 'pointer',
          color: '#337ab7',
          top: 0
        }}
      />
    );
  };

  attachmentTokenModal = () => {
    const { showAttachmentTokenModal, attachmentTokens } = this.state;
    const { currentElement } = ElementStore.getState();
    return (
      <Modal show={showAttachmentTokenModal} onHide={this.toggleAttachmentTokens}>
        <Modal.Header closeButton />
        <Modal.Body>
          <Panel>
            <Panel.Heading>
              <Panel.Title>
                List of Attachment Tokens for element {currentElement.name}:
              </Panel.Title>
            </Panel.Heading>
            <Panel.Body>
              {
                attachmentTokens?.length > 0 ? attachmentTokens.map((item, idx) => {
                  const key = Object.keys(item);
                  const value = item[key[0]];
                  const key_split = key[0].split("/");

                  return currentElement.id == key_split[3] && (
                    <Row style={{ marginBottom: 10 }}>
                      <Col xs={10}>
                        {/* <div>Element: {item?.alias_element} </div> */}
                        <div>Attachment: {item?.alias_attachment_id} </div>
                        <div>App: {item?.alias_app_id} </div>
                        <div>Download: {value?.download} </div>
                        <div>Upload: {value?.upload} </div>
                      </Col>
                      <Col xs={2}>
                        <Button className='btn btn-danger' onClick={() => this.handleRevokeAttachmentToken(key, idx, 'revoke')}>
                          <i class="fa fa-trash"></i>
                        </Button>
                      </Col>
                    </Row>);
                }) : <p>No attachment tokens avaialable</p>
              }
            </Panel.Body>
          </Panel>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={this.toggleAttachmentTokens}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  toggleAttachmentTokens = () => {
    this.setState((prevState) => ({
      showAttachmentTokenModal: !prevState.showAttachmentTokenModal
    }));
  };

  changeDateFilter() {
    let { filterCreatedAt } = this.state;
    filterCreatedAt = !filterCreatedAt;
    UIActions.setFilterCreatedAt(filterCreatedAt);
  }

  toggleProductOnly() {
    const { productOnly } = this.state;
    UIActions.setProductOnly(!productOnly);
  }

  handleNumberOfResultsChange(event) {
    const { value } = event.target;

    if (parseInt(value, 10) > 0) {
      UIActions.changeNumberOfResultsShown(value);
      this.handleDelayForNumberOfResults();
    }
  }

  handleDelayForNumberOfResults() {
    const { type } = this.props;

    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      ElementActions.refreshElements(type);
    }, 900);
  }

  numberOfResultsInput() {
    const { ui } = this.state;
    return (
      <Form horizontal className="list-show-count">
        <FormGroup>
          <InputGroup>
            <InputGroup.Addon>Show</InputGroup.Addon>
            <FormControl
              type="text"
              style={
                { textAlign: 'center', zIndex: 0 }
              }
              onChange={(event) => this.handleNumberOfResultsChange(event)}
              value={ui.number_of_results ? ui.number_of_results : 0}
            />
          </InputGroup>
        </FormGroup>
      </Form>
    );
  }

  pagination() {
    const { page, pages } = this.state;
    if (pages <= 1) {
      return null;
    }

    const items = [];
    const minPage = Math.max(page - 2, 1);
    const maxPage = Math.min(minPage + 4, pages);

    items.push(<Pagination.First key="First" onClick={() => this.handlePaginationSelect(1)} />);
    if (page > 1) {
      items.push(<Pagination.Prev key="Prev" onClick={() => this.handlePaginationSelect(page - 1)} />);
    }
    for (let currentPage = minPage; currentPage <= maxPage; currentPage += 1) {
      items.push(
        <Pagination.Item
          key={`eltPage${currentPage}`}
          active={currentPage === page}
          onClick={() => this.handlePaginationSelect(currentPage)}
        >
          {currentPage}
        </Pagination.Item>
      );
    }

    if (pages > maxPage) {
      items.push(<Pagination.Ellipsis key="Ell" />);
    }
    if (page === pages) {
      items.push(<Pagination.Next key="Next" onClick={() => this.handlePaginationSelect(page + 1)} />);
    }
    items.push(<Pagination.Last key="Last" onClick={() => this.handlePaginationSelect(pages)} />);

    return (
      <div className="list-pagination">
        <Pagination>
          {items}
        </Pagination>
      </div>
    );
  }

  renderSamplesHeader = () => {
    const {
      moleculeSort,
      productOnly,
    } = this.state;

    const options = [
      { value: false, label: 'Grouped by Sample' },
      { value: true, label: 'Grouped by Molecule' }
    ];
    const color = productOnly ? '#5cb85c' : 'currentColor';
    const tooltipText = productOnly ? 'Show all' : 'Show products only';

    return (
      <>
        <Select
          simpleValue
          options={options}
          clearable={false}
          searchable
          value={moleculeSort}
          onChange={this.changeSampleSort}
          className="header-group-select"
        />
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip id="showProductsOnly">{tooltipText}</Tooltip>}
        >
          <button
            type="button"
            style={{ border: 'none' }}
            onClick={this.toggleProductOnly}
          >
            <i
              style={{ cursor: 'pointer', color }}
              className="fa fa-lg fa-product-hunt"
            />
          </button>
        </OverlayTrigger>
        {this.collapseButton()}
      </>
    );
  };

  renderChangeSortDirectionIcon = () => {
    const { sortDirection } = this.state;
    const sortDirectionIcon = sortDirection === 'ASC' ? 'fa-long-arrow-up' : 'fa-long-arrow-down';
    const changeSortDirectionTitle = sortDirection === 'ASC' ? 'change to descending' : 'change to ascending';
    const sortDirectionTooltip = <Tooltip id="change_sort_direction">{changeSortDirectionTitle}</Tooltip>;
    return (
      <OverlayTrigger placement="top" overlay={sortDirectionTooltip}>
        <button
          type="button"
          style={{ border: 'none' }}
          onClick={this.changeSortDirection}
        >
          <i className={`fa fa-fw ${sortDirectionIcon}`} />
        </button>
      </OverlayTrigger>
    );
  };

  renderReactionsHeader = () => {
    const { elementsGroup, elementsSort, sortDirection } = this.state;
    const optionsHash = {
      none: { sortColumn: 'create date', label: 'List' },
      rinchi_short_key: { sortColumn: 'RInChI', label: 'Grouped by RInChI' },
      rxno: { sortColumn: 'type', label: 'Grouped by type' },
    };
    const options = Object.entries(optionsHash).map((option) => ({
      value: option[0],
      label: option[1].label
    }));
    const { sortColumn } = optionsHash[elementsGroup];
    const sortDirectionText = sortDirection === 'ASC' ? 'ascending' : 'descending';
    const sortTitle = elementsSort
      ? `click to sort by update date (${sortDirectionText}) - currently sorted by ${sortColumn} (${sortDirectionText})`
      : `click to sort by ${sortColumn} (${sortDirectionText})`
      + ` - currently sorted by update date (${sortDirectionText})`;
    const sortTooltip = <Tooltip id="reaction_sort_tooltip">{sortTitle}</Tooltip>;
    let sortIconClass = 'fa-clock-o';
    if (elementsGroup !== 'none') {
      sortIconClass = elementsSort ? 'fa-sort-alpha-desc' : 'fa-clock-o';
    } else {
      sortIconClass = elementsSort ? 'fa-history' : 'fa-clock-o';
    }
    const sortIcon = <i className={`fa fa-fw ${sortIconClass}`} />;
    const sortContent = (
      <OverlayTrigger placement="top" overlay={sortTooltip}>
        <button
          type="button"
          style={{ border: 'none' }}
          onClick={this.changeElementsSort}
        >
          {sortIcon}
        </button>
      </OverlayTrigger>
    );

    return (
      <>
        <Select
          simpleValue
          options={options}
          clearable={false}
          searchable={false}
          value={elementsGroup}
          onChange={this.changeElementsGroup}
          className="header-group-select"
        />
        {sortContent}
        {this.renderChangeSortDirectionIcon()}
        {elementsGroup !== 'none' ? (this.collapseButton()) : null}
      </>
    );
  };

  renderGenericElementsHeader = () => {
    const { elementsGroup, elementsSort } = this.state;
    const { genericEl } = this.props;

    if (!genericEl.properties_release) return null;

    const optionsHash = {
      none: { sortColumn: 'update date', label: 'List' },
    };
    const { layers } = genericEl.properties_release;
    const allowedTypes = [
      'select',
      'text',
      'integer',
      'system-defined',
      'textarea'
    ];

    Object.entries(layers).forEach((layerEntry) => {
      layerEntry[1].fields
        .filter((field) => (allowedTypes.includes(field.type)))
        .forEach((field) => {
          if (Object.keys(optionsHash).length < 11) {
            optionsHash[`${layerEntry[0]}.${field.field}`] = {
              sortColumn: field.label,
              label: field.label
            };
          }
        });
    });
    const options = Object.entries(optionsHash).map((option, index) => {
      const label = index === 0 ? option[1].label : `Grouped by ${option[1].label}`;

      return { value: option[0], label };
    });

    if (!optionsHash[elementsGroup]) {
      // you are not able to use this.setState because this would rerender it again and again ...
      // eslint-disable-next-line react/no-direct-mutation-state
      this.state.elementsGroup = 'none';
    }
    const { sortColumn } = optionsHash[elementsGroup] || optionsHash.none;
    const sortTitle = elementsSort ? `sort by ${sortColumn}` : 'sort by update date';
    const sortTooltip = <Tooltip id="reaction_sort_tooltip">{sortTitle}</Tooltip>;
    const sortIconClass = elementsSort ? 'fa-sort-alpha-desc' : 'fa-clock-o';
    const sortIcon = <i className={`fa fa-fw ${sortIconClass}`} />;
    const sortContent = (
      <OverlayTrigger placement="top" overlay={sortTooltip}>
        <button
          type="button"
          style={{ border: 'none' }}
          onClick={this.changeElementsSort}
        >
          {sortIcon}
        </button>
      </OverlayTrigger>
    );

    return (
      <>
        <Select
          simpleValue
          options={options}
          clearable={false}
          searchable
          value={elementsGroup}
          onChange={this.changeElementsGroup}
          className="header-group-select"
        />
        {elementsGroup !== 'none' ? (sortContent) : null}
        {elementsGroup !== 'none' ? (this.collapseButton()) : null}
      </>
    );
  };

  renderHeader = () => {
    const { filterCreatedAt, ui, attachmentTokens, currentElement } = this.state;
    const { type, showReport, genericEl } = this.props;
    const { fromDate, toDate } = ui;
    const { currentType } = UserStore.getState();

    let typeSpecificHeader = <span />;
    if (type === 'sample') {
      typeSpecificHeader = this.renderSamplesHeader();
    } else if (type === 'reaction') {
      typeSpecificHeader = this.renderReactionsHeader();
    } else if (genericEl) {
      typeSpecificHeader = this.renderGenericElementsHeader();
    }

    const filterTitle = filterCreatedAt === true
      ? 'click to filter by update date - currently filtered by creation date'
      : 'click to filter by creation date - currently filtered by update date';
    const filterIconClass = filterCreatedAt === true ? 'fa-calendar' : 'fa-calendar-o';

    const filterTooltip = <Tooltip id="date_tooltip">{filterTitle}</Tooltip>;
    const filterIcon = <i className={`fa ${filterIconClass}`} />;


    const attachmentTokensToolTip = "Click to view/revoke all avaialable attachment tokens in this research plan.";
    const attachmentTokenIcon = <i className={`fa fa-key`} />;
    const attachmentToolTip = <Tooltip id="attachment_tokens_tooltip">{attachmentTokensToolTip}</Tooltip>;

    return (
      <div className="table-header">
        <div className="select-all">
          <ElementAllCheckbox
            type={type}
            ui={ui}
            showReport={showReport}
          />
        </div>
        <div
          className="header-right"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            flexWrap: 'wrap'
          }}
        >
          {
            attachmentTokens?.length > 0 &&
            <OverlayTrigger placement="top" overlay={attachmentToolTip}>
              <button
                disabled={!attachmentTokens?.length}
                type="button"
                style={{ border: 'none' }}
                onClick={this.toggleAttachmentTokens}
              >
                {attachmentTokenIcon}
              </button>
            </OverlayTrigger>
          }
          <OverlayTrigger placement="top" overlay={filterTooltip}>
            <button
              type="button"
              style={{ border: 'none' }}
              onClick={this.changeDateFilter}
            >
              {filterIcon}
            </button>
          </OverlayTrigger>
          <div className="sample-list-from-date">
            <DatePicker
              selected={fromDate}
              placeholderText="From"
              onChange={this.setFromDate}
              popperPlacement="bottom-start"
              isClearable
              dateFormat="DD-MM-YY"
            />
          </div>
          <div className="sample-list-to-date">
            <DatePicker
              selected={toDate}
              placeholderText="To"
              popperPlacement="bottom"
              onChange={this.setToDate}
              isClearable
              dateFormat="DD-MM-YY"
            />
          </div>
          {typeSpecificHeader}
          {this.attachmentTokenModal()}
        </div>
      </div>
    );
  };

  renderEntries() {
    const {
      elements,
      ui,
      currentElement,
      collapseAll,
      moleculeSort,
      elementsGroup,
    } = this.state;
    const { overview, type, genericEl } = this.props;
    let elementsTableEntries;

    if (type === 'sample') {
      elementsTableEntries = (
        <ElementsTableSampleEntries
          collapseAll={collapseAll}
          elements={elements}
          currentElement={currentElement}
          showDragColumn={!overview}
          ui={ui}
          moleculeSort={moleculeSort}
          onChangeCollapse={(checked) => this.changeCollapse(!checked)}
        />
      );
    } else if ((type === 'reaction' || genericEl) && elementsGroup !== 'none') {
      elementsTableEntries = (
        <ElementsTableGroupedEntries
          collapseAll={collapseAll}
          elements={elements}
          currentElement={currentElement}
          showDragColumn={!overview}
          ui={ui}
          elementsGroup={elementsGroup}
          onChangeCollapse={(checked) => this.changeCollapse(!checked)}
          genericEl={genericEl}
          type={type}
        />
      );
    } else if (type === 'cell_line') {
      elementsTableEntries = (
        <CellLineContainer
          cellLineGroups={CellLineGroup.buildFromElements(elements)}
        />
      );
    }


    else {
      elementsTableEntries = (
        <ElementsTableEntries
          elements={elements}
          currentElement={currentElement}
          showDragColumn={!overview}
          ui={ui}
        />
      );
    }

    return (
      <div ref={this.elementRef} className="list-elements">
        {elementsTableEntries}
      </div>
    );
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

ElementsTable.defaultProps = {
  genericEl: null,
};

ElementsTable.propTypes = {
  overview: PropTypes.bool.isRequired,
  showReport: PropTypes.bool.isRequired,
  type: PropTypes.string.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  genericEl: PropTypes.object,
};
