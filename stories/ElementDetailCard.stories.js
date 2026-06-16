import React from 'react';
import PropTypes from 'prop-types';
import { fn } from 'storybook/test';
import {
  Badge,
  Button,
  ButtonToolbar,
  Col,
  Form,
  Row,
} from 'react-bootstrap';

import ElementDetailCard from 'src/apps/mydb/elements/details/ElementDetailCard';
import DetailCardButton, {
  detailFooterButton,
  detailHeaderButton,
} from 'src/apps/mydb/elements/details/DetailCardButton';

function ElementDetailCardDemo({
  title,
  titleTooltip,
  body,
  elementType,
  iconClass,
  isNew,
  canCopy,
  showCollectionLabels,
  showRepresentativeIntegrations,
  elementChanged,
  isPendingToSave,
  saveDisabled,
  showPrintCode,
  showCalendar,
  showUserLabels,
  showHeaderCommentSection,
  showTitleAppendix,
  showHeaderToolbar,
  showFooterToolbar,
  onSave,
  onSaveClose,
  onClose,
}) {
  const element = {
    id: 101,
    type: elementType,
    icon_name: iconClass,
    changed: elementChanged,
    isPendingToSave,
    isNew,
    can_copy: canCopy,
    tag: {
      taggable_data: {
        collection_labels: showCollectionLabels ? [
          { id: 1, is_shared: false },
          { id: 2, is_shared: false },
          { id: 3, is_shared: true },
        ] : [],
      },
    },
  };

  const integrationTitleAppendix = showRepresentativeIntegrations ? (
    <>
      {showCollectionLabels && (
        <Button size="xxsm" variant="secondary">
          <i className="fa fa-list" />
          {' 2 | '}
          <i className="fa fa-share-alt" />
          {' 1 '}
        </Button>
      )}
      {showUserLabels && (
        <span className="d-inline-flex align-items-center gap-1 ms-1">
          <Badge bg="info">Priority</Badge>
          <Badge bg="dark">Shared</Badge>
        </span>
      )}
    </>
  ) : null;

  const titleAppendix = (
    <>
      {integrationTitleAppendix}
      {showTitleAppendix && <Badge bg="secondary">ELN-101</Badge>}
    </>
  );

  const integrationHeaderToolbar = showRepresentativeIntegrations ? (
    <>
      {showHeaderCommentSection && (
        <ButtonToolbar>
          <DetailCardButton
            label="Show/Add Comments"
            iconClass="fa fa-comments"
            active
            header
          />
          <DetailCardButton
            label="Show/Hide Section Comments"
            iconClass="fa fa-angle-down"
            header
          />
        </ButtonToolbar>
      )}
      {showPrintCode && (
        <Button size="sm" variant="secondary" disabled>
          <i className="fa fa-barcode" />
        </Button>
      )}
      {showCalendar && !isNew && (
        <Button size="sm" variant="secondary" disabled>
          <i className="fa fa-calendar" />
        </Button>
      )}
      {canCopy && <DetailCardButton iconClass="fa fa-clone" label="Copy" header />}
    </>
  ) : null;

  const customActionButtonProps = {
    onClick: fn(),
    iconClass: 'fa fa-magic',
    label: 'Custom action',
  };

  const headerToolbar = showHeaderToolbar
    ? (
      <>
        {integrationHeaderToolbar}
        {detailHeaderButton(customActionButtonProps)}
      </>
    )
    : undefined;

  const footerToolbar = showFooterToolbar
    ? detailFooterButton(customActionButtonProps)
    : undefined;

  return (
    <div style={{ height: '32rem' }}>
      <ElementDetailCard
        element={element}
        isPendingToSave={isPendingToSave}
        title={title}
        titleTooltip={titleTooltip}
        titleAppendix={titleAppendix}
        headerToolbar={headerToolbar}
        footerToolbar={footerToolbar}
        onClose={onClose}
        onSave={onSave}
        onSaveClose={onSaveClose}
        saveDisabled={saveDisabled}
        showPrintCode={showPrintCode}
        showCalendar={showCalendar}
        showUserLabels={showUserLabels}
        showHeaderCommentSection={showHeaderCommentSection}
      >
        <Form>
          <Row className="mb-3">
            <Col xs={8}>
              <Form.Group>
                <Form.Label>Name</Form.Label>
                <Form.Control type="text" value={body} disabled readOnly />
              </Form.Group>
            </Col>
            <Col xs={4}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select value="Draft" disabled>
                  <option>Draft</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col xs={6}>
              <Form.Group>
                <Form.Label>Identifier</Form.Label>
                <Form.Control type="text" value="ELN-101" disabled readOnly />
              </Form.Group>
            </Col>
            <Col xs={6}>
              <Form.Group>
                <Form.Label>Owner</Form.Label>
                <Form.Control type="text" value="Demo User" disabled readOnly />
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </ElementDetailCard>
    </div>
  );
}

ElementDetailCardDemo.propTypes = {
  title: PropTypes.string.isRequired,
  titleTooltip: PropTypes.string,
  body: PropTypes.string.isRequired,
  elementType: PropTypes.string,
  iconClass: PropTypes.string,
  isNew: PropTypes.bool,
  canCopy: PropTypes.bool,
  showCollectionLabels: PropTypes.bool,
  showRepresentativeIntegrations: PropTypes.bool,
  elementChanged: PropTypes.bool,
  isPendingToSave: PropTypes.bool,
  saveDisabled: PropTypes.bool,
  showPrintCode: PropTypes.bool,
  showCalendar: PropTypes.bool,
  showUserLabels: PropTypes.bool,
  showHeaderCommentSection: PropTypes.bool,
  showTitleAppendix: PropTypes.bool,
  showHeaderToolbar: PropTypes.bool,
  showFooterToolbar: PropTypes.bool,
  onSave: PropTypes.func,
  onSaveClose: PropTypes.func,
  onClose: PropTypes.func,
};

ElementDetailCardDemo.defaultProps = {
  titleTooltip: undefined,
  elementType: 'sample',
  iconClass: 'icon-sample',
  isNew: false,
  canCopy: false,
  showCollectionLabels: true,
  showRepresentativeIntegrations: false,
  elementChanged: false,
  isPendingToSave: false,
  saveDisabled: false,
  showPrintCode: false,
  showCalendar: false,
  showUserLabels: false,
  showHeaderCommentSection: false,
  showTitleAppendix: true,
  showHeaderToolbar: true,
  showFooterToolbar: true,
  onSave: undefined,
  onSaveClose: undefined,
  onClose: undefined,
};

function renderStory(args) {
  return (
    <ElementDetailCardDemo
      title={args.title}
      titleTooltip={args.titleTooltip}
      body={args.body}
      elementType={args.elementType}
      iconClass={args.iconClass}
      isNew={args.isNew}
      canCopy={args.canCopy}
      showCollectionLabels={args.showCollectionLabels}
      showRepresentativeIntegrations={args.showRepresentativeIntegrations}
      elementChanged={args.elementChanged}
      isPendingToSave={args.isPendingToSave}
      saveDisabled={args.saveDisabled}
      showPrintCode={args.showPrintCode}
      showCalendar={args.showCalendar}
      showUserLabels={args.showUserLabels}
      showHeaderCommentSection={args.showHeaderCommentSection}
      showTitleAppendix={args.showTitleAppendix}
      showHeaderToolbar={args.showHeaderToolbar}
      showFooterToolbar={args.showFooterToolbar}
      onSave={args.onSave}
      onSaveClose={args.onSaveClose}
      onClose={args.onClose}
    />
  );
}

export default {
  title: 'Organisms/ElementDetailCard',
  component: ElementDetailCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
ElementDetailCard extends DetailCard with element-specific defaults and actions.

It adds:
- element icon handling
- integrated save and save-and-close actions
- close confirmation when unsaved changes exist
- optional integrations (calendar, labels, comments, print)
        `,
      },
    },
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Card title text',
    },
    titleTooltip: {
      control: 'text',
      description: 'Optional tooltip shown for the title',
    },
    body: {
      control: 'text',
      description: 'Body copy shown by this story wrapper',
      table: {
        category: 'Story controls',
      },
    },
    elementType: {
      control: 'text',
      description: 'Element type used for icon and API type inference',
      table: {
        category: 'Story controls',
      },
    },
    iconClass: {
      control: 'text',
      description: 'CSS class for the leading element icon',
      table: {
        category: 'Story controls',
      },
    },
    isPendingToSave: {
      control: 'boolean',
      description: 'Mark the element as changed so save actions are enabled '
        + 'and the header gets the unsaved warning highlight',
    },
    saveDisabled: {
      control: 'boolean',
      description: 'Disable save actions',
    },
    isNew: {
      control: 'boolean',
      description: 'Treat the element as newly created, which switches '
        + 'save labels from Save to Create and hides existing-element '
        + 'actions like copy',
      table: {
        category: 'Story controls',
      },
    },
    canCopy: {
      control: 'boolean',
      description: 'Enable copy action for existing elements',
      table: {
        category: 'Story controls',
      },
    },
    showCollectionLabels: {
      control: 'boolean',
      description: 'Show collection-label counts in the title appendix area',
      table: {
        category: 'Story controls',
      },
    },
    showRepresentativeIntegrations: {
      control: 'boolean',
      description: 'Render representative integration UI directly in the story wrapper',
      table: {
        category: 'Story controls',
      },
    },
    showTitleAppendix: {
      control: 'boolean',
      description: 'Show sample title appendix badge',
      table: {
        category: 'Story controls',
      },
    },
    showHeaderToolbar: {
      control: 'boolean',
      description: 'Show a custom action rendered with the header helper',
      table: {
        category: 'Story controls',
      },
    },
    showFooterToolbar: {
      control: 'boolean',
      description: 'Show the same custom action rendered with the footer helper',
      table: {
        category: 'Story controls',
      },
    },
    showPrintCode: {
      control: 'boolean',
      description: 'Show print-code integration button',
      table: {
        category: 'Story controls',
      },
    },
    showCalendar: {
      control: 'boolean',
      description: 'Show calendar integration button',
      table: {
        category: 'Story controls',
      },
    },
    showUserLabels: {
      control: 'boolean',
      description: 'Show user label badges in the title appendix',
      table: {
        category: 'Story controls',
      },
    },
    showHeaderCommentSection: {
      control: 'boolean',
      description: 'Show comment-section actions in the header',
      table: {
        category: 'Story controls',
      },
    },
  },
  args: {
    title: 'Element details',
    titleTooltip: 'Element metadata and actions',
    body: 'Catalyst screening series',
    elementType: 'sample',
    iconClass: 'icon-sample',
    isPendingToSave: false,
    saveDisabled: false,
    isNew: false,
    canCopy: false,
    showCollectionLabels: true,
    showRepresentativeIntegrations: false,
    elementChanged: false,
    showPrintCode: false,
    showCalendar: false,
    showUserLabels: false,
    showHeaderCommentSection: false,
    showTitleAppendix: true,
    showHeaderToolbar: true,
    showFooterToolbar: true,
    onSave: fn(),
    onSaveClose: fn(),
    onClose: fn(),
  },
};

export const Default = {
  render: renderStory,
};

export const PendingChanges = {
  args: {
    isPendingToSave: true,
    elementChanged: true,
    body: 'Pending changes are present, so save actions are emphasized.',
  },
  render: renderStory,
};

PendingChanges.parameters = {
  docs: {
    description: {
      story: `
Use this state when the element has unsaved edits.

It enables the save actions, adds save-and-close in the header,
and applies the orange unsaved highlight to the card header.
      `,
    },
  },
};

export const NewElement = {
  args: {
    isNew: true,
    canCopy: false,
    isPendingToSave: true,
    title: 'New element',
    body: 'Use this state to preview create and save-and-close flows.',
  },
  render: renderStory,
};

NewElement.parameters = {
  docs: {
    description: {
      story: `
Use this state to document first-save behavior for elements that have not been created yet.

The save labels switch from Save to Create, copy stays unavailable,
and close confirmation still applies when the new element has pending changes.
      `,
    },
  },
};

export const WithSpecialIntegrations = {
  args: {
    title: 'Element details',
    titleTooltip: 'Element metadata, labels, and secondary integrations',
    body: 'Catalyst screening sample A-17',
    showRepresentativeIntegrations: true,
    canCopy: true,
    showCollectionLabels: true,
    showPrintCode: true,
    showCalendar: true,
    showUserLabels: true,
    showHeaderCommentSection: true,
    isPendingToSave: true,
    elementChanged: true,
  },
  render: renderStory,
};
