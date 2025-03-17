import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { configure, mount, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import {
  describe, it, beforeEach
} from 'mocha';

import {
  AnalysesHeader
} from '@src/apps/mydb/elements/details/samples/analysesTab/SampleDetailsContainersAux';

import Container from '@src/models/Container';
import Sample from '@src/models/Sample';

configure({ adapter: new Adapter() });

describe('SampleDetailsContainersAux', () => {
  describe('AnalysesHeader deleted', () => {
    describe('Render without edit mode', () => {
      let container;
      let sample;
      beforeEach(() => {
        container = Container.buildEmpty();
        container.name = 'Just a string';
        container.is_deleted = true;
        sample = Sample.buildEmpty();
      });

      it('Render without kind and status', () => {
        const wrapper = shallow(React.createElement(AnalysesHeader, { container: container, sample: sample }));
        expect(wrapper.html()).toEqual(expect.stringContaining(
          `<h4 class="flex-grow-1 text-decoration-line-through">${container.name}</h4>`
        ));
      });

      it('Render with kind', () => {
        container.extended_metadata.kind = 'Just a kind string';
        const wrapper = shallow(React.createElement(AnalysesHeader, { container: container, sample: sample }));
        expect(wrapper.html()).toEqual(expect.stringContaining('Just a kind string'));
      });

      it('Render with status', () => {
        container.extended_metadata.status = 'Just a status string';
        const wrapper = shallow(React.createElement(AnalysesHeader, { container: container, sample: sample }));
        expect(wrapper.html()).toEqual(expect.stringContaining('Just a status string'));
      });

      it('Render with kind and status', () => {
        container.extended_metadata.kind = 'Just a kind string';
        container.extended_metadata.status = 'Just a status string';
        const wrapper = shallow(React.createElement(AnalysesHeader, { container: container, sample: sample }));
        expect(wrapper.html()).toEqual(expect.stringContaining('Just a kind string'));
        expect(wrapper.html()).toEqual(expect.stringContaining('Just a status string'));
      });
    });

    describe('Render with edit mode', () => {
      const container = Container.buildEmpty();
      container.name = 'Just a string';
      container.is_deleted = true;

      const sample = Sample.buildEmpty();

      it('Render without kind and status', () => {
        const wrapper = shallow(React.createElement(AnalysesHeader, { container: container, sample: sample, mode: "edit" }));
        const title = wrapper.find('h4');
        expect(title.text()).toEqual(container.name);
        expect(title.prop('className')).toEqual(expect.stringContaining('text-decoration-line-through'));
      });

      it('Check undo delete handler', () => {
        const testOnClick = sinon.spy();
        const wrapper = mount(
          React.createElement(AnalysesHeader, { container: container, sample: sample, mode: "edit", handleUndo: testOnClick })
        );
        wrapper.find('button').simulate('click');
        expect(testOnClick.calledWith(container)).toBeTruthy();
      });
    });
  });

  describe('AnalysesHeader not-deleted', () => {
    describe('Render without edit mode', () => {
      let container;
      let sample;

      beforeEach(() => {
        container = Container.buildEmpty();
        container.name = 'Just a string';
        container.extended_metadata.status = 'some status';
        sample = Sample.buildEmpty();
      });

      it('Render without status', () => {
        const wrapper = shallow(React.createElement(AnalysesHeader, { container: container, sample: sample }));

        const title = wrapper.find('h4');
        expect(title.text()).toEqual(container.name);

        expect(wrapper.text()).toEqual(expect.stringContaining('some status'));
      });
    });
  });
});
