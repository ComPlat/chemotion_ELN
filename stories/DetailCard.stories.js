import React from 'react';
import PropTypes from 'prop-types';
import { fn } from 'storybook/test';
import {
  Badge,
  Col,
  Form,
  Row,
} from 'react-bootstrap';

import DetailCard from 'src/apps/mydb/elements/details/DetailCard';
import ElementIcon from 'src/components/common/ElementIcon';
import {
  detailHeaderButton,
  detailFooterButton,
} from 'src/apps/mydb/elements/details/DetailCardButton';

function DetailCardDemo({
  title,
  titleTooltip,
  showTitleIcon,
  showTitleAppendix,
  showHeaderToolbar,
  showFooterToolbar,
  className,
  onClose,
  onReset,
  onGenerate,
}) {
  const titleIcon = showTitleIcon
    ? <ElementIcon element={{ type: 'report', icon_name: 'icon-report' }} />
    : undefined;

  const titleAppendix = showTitleAppendix
    ? <Badge bg="secondary">Template: Standard</Badge>
    : undefined;

  const resetButtonProps = {
    onClick: onReset,
    iconClass: 'fa fa-undo',
    label: 'Reset',
  };

  const generateButtonProps = {
    onClick: onGenerate,
    iconClass: 'fa fa-caret-square-o-right',
    label: 'Generate',
    variant: 'primary',
  };

  const headerToolbar = showHeaderToolbar
    ? (
      <>
        {detailHeaderButton(resetButtonProps)}
        {detailHeaderButton(generateButtonProps)}
      </>
    )
    : undefined;

  const footerToolbar = showFooterToolbar
    ? (
      <>
        {detailFooterButton(resetButtonProps)}
        {detailFooterButton(generateButtonProps)}
      </>
    )
    : undefined;

  return (
    <div style={{ height: '32rem' }}>
      <DetailCard
        title={title}
        titleTooltip={titleTooltip}
        titleIcon={titleIcon}
        titleAppendix={titleAppendix}
        headerToolbar={headerToolbar}
        footerToolbar={footerToolbar}
        onClose={onClose}
        className={className}
      >
        <Form>
          <Row className="mb-3">
            <Col xs={8}>
              <Form.Group>
                <Form.Label>Title</Form.Label>
                <Form.Control
                  type="text"
                  value="Aspirin stability screening"
                  disabled
                  readOnly
                />
              </Form.Group>
            </Col>
            <Col xs={4}>
              <Form.Group>
                <Form.Label>Type</Form.Label>
                <Form.Select value="Journal Article" disabled>
                  <option>Journal Article</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col xs={6}>
              <Form.Group>
                <Form.Label>DOI</Form.Label>
                <Form.Control
                  type="text"
                  value="10.1000/xyz123"
                  disabled
                  readOnly
                />
              </Form.Group>
            </Col>
            <Col xs={6}>
              <Form.Group>
                <Form.Label>URL</Form.Label>
                <Form.Control
                  type="text"
                  value="https://doi.org/10.1000/xyz123"
                  disabled
                  readOnly
                />
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </DetailCard>
    </div>
  );
}

DetailCardDemo.propTypes = {
  title: PropTypes.string.isRequired,
  titleTooltip: PropTypes.string,
  showTitleIcon: PropTypes.bool,
  showTitleAppendix: PropTypes.bool,
  showHeaderToolbar: PropTypes.bool,
  showFooterToolbar: PropTypes.bool,
  className: PropTypes.string,
  onClose: PropTypes.func,
  onReset: PropTypes.func,
  onGenerate: PropTypes.func,
};

DetailCardDemo.defaultProps = {
  titleTooltip: undefined,
  showTitleIcon: true,
  showTitleAppendix: true,
  showHeaderToolbar: true,
  showFooterToolbar: true,
  className: undefined,
  onClose: undefined,
  onReset: undefined,
  onGenerate: undefined,
};

function renderStory(args) {
  return (
    <DetailCardDemo
      title={args.title}
      titleTooltip={args.titleTooltip}
      showTitleIcon={args.showTitleIcon}
      showTitleAppendix={args.showTitleAppendix}
      showHeaderToolbar={args.showHeaderToolbar}
      showFooterToolbar={args.showFooterToolbar}
      className={args.className}
      onClose={args.onClose}
      onReset={args.onReset}
      onGenerate={args.onGenerate}
    />
  );
}

export default {
  title: 'Organisms/DetailCard',
  component: DetailCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
DetailCard is the base shell for details UIs.

It provides:
- a consistent header with title, optional tooltip, and close button
- optional title appendix and header toolbar content
- a scrollable body area
- an optional footer toolbar

Header and footer actions follow a consistent compact/full pattern. Use the dedicated
[DetailCardButton helpers](?path=/docs/molecules-detailcardbutton--docs) to render the same action
in both places without duplicating markup.
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
      description: 'Optional tooltip shown when hovering the title',
    },
    showTitleIcon: {
      control: 'boolean',
      description: 'Show a leading title icon',
      table: {
        category: 'Story controls',
      },
    },
    showTitleAppendix: {
      control: 'boolean',
      description: 'Show title appendix content next to title',
      table: {
        category: 'Story controls',
      },
    },
    showHeaderToolbar: {
      control: 'boolean',
      description: 'Show report-style header actions',
      table: {
        category: 'Story controls',
      },
    },
    showFooterToolbar: {
      control: 'boolean',
      description: 'Show report-style footer actions',
      table: {
        category: 'Story controls',
      },
    },
    className: {
      control: 'text',
      description: 'Optional className forwarded to DetailCard root element',
    },
  },
  args: {
    title: 'Report Generation',
    titleTooltip: 'Configure and generate reports for selected objects',
    showTitleIcon: true,
    showTitleAppendix: true,
    showHeaderToolbar: true,
    showFooterToolbar: true,
    onClose: fn(),
    onReset: fn(),
    onGenerate: fn(),
  },
};

export const Default = {
  render: renderStory,
};

export const Minimal = {
  args: {
    titleTooltip: '',
    showTitleIcon: false,
    showTitleAppendix: false,
    showHeaderToolbar: false,
    showFooterToolbar: false,
  },
  render: renderStory,
};
