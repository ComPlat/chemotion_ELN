import React from 'react';
import expect from 'expect';
import Enzyme, { mount, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import {
  describe, it, beforeEach
} from 'mocha';

import {
  HeaderDeleted, HeaderNormal
} from 'src/apps/mydb/elements/details/samples/analysesTab/SampleDetailsContainersAux';

import Container from 'src/models/Container';
import Sample from 'src/models/Sample';

Enzyme.configure({ adapter: new Adapter() });

describe('SampleDetailsContainersAux', () => {
  describe('HeaderDeleted', () => {
    describe('Render without edit mode', () => {
      let container;
      beforeEach(() => {
        container = Container.buildEmpty();
        container.name = 'Just a string';
      });

      it('Render without kind and status', () => {
        const wrapper = shallow(<HeaderDeleted container={container} />);
        expect(wrapper.html())
          .toEqual(
            '<div class="analysis-header-delete"><strike>'
            + `${container.name}</strike><div class="button-right undo-middle"></div></div>`
          );
      });

      it('Render with kind', () => {
        container.extended_metadata.kind = 'Just a kind string';
        const wrapper = shallow(<HeaderDeleted container={container} />);
        expect(wrapper.html())
          .toEqual(
            `<div class="analysis-header-delete"><strike>${container.name} - Type: `
            + `${container.extended_metadata.kind}</strike><div class="button-right undo-middle"></div></div>`
          );
      });

      it('Render with status', () => {
        container.extended_metadata.status = 'Just a status string';
        const wrapper = shallow(<HeaderDeleted container={container} />);
        expect(wrapper.html())
          .toEqual(
            `<div class="analysis-header-delete"><strike>${container.name} - Status: `
            + `${container.extended_metadata.status}</strike><div class="button-right undo-middle"></div></div>`
          );
      });

      it('Render with kind and status', () => {
        container.extended_metadata.kind = 'Just a kind string';
        container.extended_metadata.status = 'Just a status string';
        const wrapper = shallow(<HeaderDeleted container={container} />);
        expect(wrapper.html())
          .toEqual(
            `<div class="analysis-header-delete"><strike>${container.name} - `
            + `Type: ${container.extended_metadata.kind} - Status: ${container.extended_metadata.status}`
            + '</strike><div class="button-right undo-middle"></div></div>'
          );
      });
    });

    describe('Render with edit mode', () => {
      const container = Container.buildEmpty();
      container.name = 'Just a string';

      it('Render without kind and status', () => {
        const wrapper = shallow(<HeaderDeleted container={container} mode="edit" />);
        expect(wrapper.html())
          .toEqual(
            `<div class="analysis-header-delete"><strike>${container.name}</strike>`
            + '<div class="button-right undo-middle"><button type="button" class="pull-right btn btn-xs btn-danger">'
            + '<i class="fa fa-undo"></i></button></div></div>'
          );
      });

      it('Check on click instance', () => {
        const testOnClick = () => {};
        const wrapper = mount(<HeaderDeleted container={container} mode="edit" handleUndo={testOnClick} />);
        const button = wrapper.find('button');
        const onClickProp = button.prop('onClick');
        expect(onClickProp).toBeInstanceOf(Function);
      });
    });
  });

  function normalizeWhitespace(str) {
    return str.replace(/\s+/g, ' ').trim();
  }

  describe('HeaderNormal', () => {
    describe('Render without edit mode', () => {
      let container; let sample;

      beforeEach(() => {
        container = Container.buildEmpty();
        container.name = 'Just a string';
        sample = Sample.buildEmpty();
      });

      it('Render without status', () => {
        const wrapper = shallow(<HeaderNormal container={container} sample={sample} />);
        const actualHtml = normalizeWhitespace(wrapper.html());
        const expectedHtml = normalizeWhitespace(
          '<div class="analysis-header order"><div class="preview"><div class="preview-table">'
          + '<img src="/images/wild_card/no_attachment.svg" alt="" style="cursor:default"/></div></div>'
          + `<div class="abstract"><div class="lower-text"><div class="main-title">${container.name}</div>`
          + '<div class="sub-title">Type: </div><div class="sub-title">Status: </div><div class="desc sub-title">'
          + '<span style="float:left;margin-right:5px">Content:</span><span></span></div></div></div></div>'
        );
        expect(actualHtml).toEqual(expectedHtml);
      });
    });
  });
});
