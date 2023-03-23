import React, { useState, useEffect, useContext } from 'react';
import { Grid, Row, Col, FormGroup, FormControl, ControlLabel } from 'react-bootstrap';
import {
  GenPropertiesText, GenPropertiesCheckbox, GenPropertiesSelect, GenPropertiesCalculate,
  GenPropertiesNumber, GenPropertiesSystemDefined, GenPropertiesInputGroup, GenPropertiesDrop,
  GenPropertiesTextArea, GenPropertiesUpload, GenDummy, GenTextFormula, GenPropertiesTable
} from 'src/components/generic/GenericPropertiesFields';
import { GenProperties, GenPropertiesLayerSearchCriteria } from 'src/components/generic/GenericElCommon';
import GenericEl from 'src/models/GenericEl';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const GenericSearchForm = () => {
  const searchStore = useContext(StoreContext).search;
  const { id } = searchStore.searchModalSelectedForm;
  const genericElements = UserStore.getState().genericEls || [];

  let genericElement = genericElements.find((element) => {
    return element.id === id;
  });

  const buildGenericElementFormFields = () => {
    if (!genericElement) { return (<span />); }
    const template = genericElement.properties_template;
    const layers = template.layers;
    let layout = <span />;
    let sections = [];

    Object.entries(layers)
      .sort((a,b) => a.position - b.position)
      .map((value, i) => {
        sections.push(value[1]);
        console.log(value, value[1].condition, i);
      });
    console.log(sections[0].label);

    //<Tab.Container
    //    id="tabList"
    //    defaultActiveKey={0}
    //    activeKey={currentTabIndex}
    //    onSelect={handleTabSelect}
    //  >
    //    <Row className="clearfix">
    //    <Col sm={12}>
    //        <Navbar className="search-result-tab-navbar">
    //          <Nav bsStyle="tabs">
    //            {navItems}
    //          </Nav>
    //        </Navbar>
    //      </Col>
    //      <Col sm={12}>
    //        <Tab.Content className="search-result-tab-content" animation>
    //          {tabContents}
    //        </Tab.Content>
    //      </Col>
    //    </Row>
    //  </Tab.Container>

    return (
      <div style={{ margin: '15px' }}>{layout}</div>
    );
  };

  const basicFields = () => {
    // value={genericEl.search_name || ''} type="text" onChange={event => props.onChange(event, 'search_name', '')}
    // value={genericEl.search_short_label || ''} type="text" onChange={event => props.onChange(event, 'search_short_label', '')}

    return (
      <Row>
        <Col md={6}>
          <FormGroup>
            <ControlLabel>Name</ControlLabel>
            <FormControl
              type='text'
              value=''
              onChange={handleChangeSelection()}
            />
          </FormGroup>
        </Col>
        <Col md={6}>
          <FormGroup>
            <ControlLabel>Short Label</ControlLabel>
            <FormControl
              type='text'
              value=''
              onChange={handleChangeSelection()}
            />
          </FormGroup>
        </Col>
      </Row>
    );
  }

  // const formElementValue = (formElement, e) => {
  //   switch(formElement) {
  //     case 'value':
  //       return e.target.value;
  //       break;
  //     case 'field':
  //     case 'link':
  //       return e.value;
  //       break;
  //     default:
  //       return e;
  //   }
  // }

  const handleChangeSelection = () => (e) => {
    //let value = formElementValue(formElement, e);
    //selectedOptions[idx][formElement] = value;
    //setSelectedOptions((a) => [...a]);
  }

  return (
    <Grid>
      {basicFields()}
      {buildGenericElementFormFields()}
    </Grid>
  );
}

export default GenericSearchForm;
