import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import {
  describe, it, beforeEach, afterEach
} from 'mocha';

import { Button } from 'react-bootstrap';

import ReactionDetailsContainers from 'src/apps/mydb/elements/details/reactions/analysesTab/ReactionDetailsContainers';
import AccordionHeaderWithButtons from 'src/components/common/AccordionHeaderWithButtons';
import Reaction from 'src/models/Reaction';
import Container from 'src/models/Container';

Enzyme.configure({ adapter: new Adapter() });

describe('ReactionDetailsContainers', () => {
  describe('renderAnalysesHint()', () => {
    it('returns hint message with correct text and styling', () => {
      const reaction = Reaction.buildEmpty();
      const wrapper = shallow(React.createElement(ReactionDetailsContainers, { reaction, readOnly: false }));
      const instance = wrapper.instance();
      const hintElement = shallow(instance.renderAnalysesHint());

      expect(hintElement.type()).toBe('span');
      expect(hintElement.hasClass('text-muted')).toBe(true);
      expect(hintElement.hasClass('me-3')).toBe(true);
      expect(hintElement.hasClass('small')).toBe(true);
      expect(hintElement.text()).toContain('This tab can be used for reaction-related data');
      expect(hintElement.text()).toContain('For sample data (e.g., characterization), use the sample analysis tab.');
    });
  });

  describe('when it does not have any analysis', () => {
    const reaction = Reaction.buildEmpty();
    it('Render without any analysis and readonly', () => {
      const wrapper = shallow(React.createElement(ReactionDetailsContainers, { reaction: reaction, readOnly: true }));
      expect(wrapper.text()).toEqual(expect.stringContaining('There are currently no Analyses.'));
      expect(wrapper.find(Button)).toHaveLength(0);
    });

    it('Render without any analysis', () => {
      const wrapper = shallow(React.createElement(ReactionDetailsContainers, { reaction: reaction, readOnly: false }));
      expect(wrapper.text()).toEqual(expect.stringContaining('There are currently no Analyses.'));
      const button = wrapper.find(Button);
      expect(button.text()).toEqual('Add analysis');
    });

    it('displays hint message when container is null', () => {
      const reaction = Reaction.buildEmpty();
      reaction.container = null;
      const wrapper = shallow(React.createElement(ReactionDetailsContainers, { reaction, readOnly: false }));
      const hintText = wrapper.text();
      expect(hintText).toContain('This tab can be used for reaction-related data');
      expect(hintText).toContain('For sample data (e.g., characterization), use the sample analysis tab.');
    });

    it('displays hint message when container exists but has no analyses', () => {
      const reaction = Reaction.buildEmpty();
      // Container exists but analyses container is empty
      const wrapper = shallow(React.createElement(ReactionDetailsContainers, { reaction, readOnly: false }));
      const hintText = wrapper.text();
      expect(hintText).toContain('This tab can be used for reaction-related data');
      expect(hintText).toContain('For sample data (e.g., characterization), use the sample analysis tab.');
    });
  });

  describe('when it has analyses', () => {
    let reaction = null;

    beforeEach(() => {
      reaction = Reaction.buildEmpty();
    });

    afterEach(() => {
      reaction = null;
    });

    it('Render with analysis is deleted', () => {
      const analysis = Container.buildAnalysis();
      analysis.is_deleted = true;
      reaction.container.children[0].children.push(analysis);

      const wrapper = shallow(
        React.createElement(ReactionDetailsContainers, { reaction: reaction, readOnly: false })
      );

      const deletedHeader = wrapper.find(AccordionHeaderWithButtons).shallow().find('strike');
      expect(deletedHeader.text()).toContain(analysis.name);

      const button = wrapper.find(AccordionHeaderWithButtons).find(Button);
      expect(button.html()).toEqual(shallow(
        React.createElement(Button, { className: "ms-auto", size: "xsm", variant: "danger" }, 
          React.createElement("i", { className: "fa fa-undo" })
        )
      ).html());
    });

    it('displays hint message when analyses exist', () => {
      const analysis = Container.buildAnalysis();
      reaction.container.children[0].children.push(analysis);

      const wrapper = shallow(
        React.createElement(ReactionDetailsContainers, { reaction, readOnly: false })
      );

      const hintText = wrapper.text();
      expect(hintText).toContain('This tab can be used for reaction-related data');
      expect(hintText).toContain('For sample data (e.g., characterization), use the sample analysis tab.');
    });
  });
});
