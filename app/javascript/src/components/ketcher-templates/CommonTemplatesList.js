import React, {
  memo, useEffect, useMemo, useRef, useState
} from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import {
  OverlayTrigger,
  Tooltip,
  Form,
  Spinner,
} from 'react-bootstrap';
import TemplateFetcher from 'src/fetchers/TemplateFetcher';
import { isCommonTemplateLoadingSetter } from 'src/utilities/ketcherSurfaceChemistry/stateManager';

const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

// Copy the molfile to the system clipboard then auto-paste it into the Ketcher canvas.
// This avoids the fragment-placement flow: Ketcher treats a clipboard paste as a
// direct structure drop onto the canvas (no click-to-place required).
async function loadTemplateIntoKetcher(molfile) {
  try {
    isCommonTemplateLoadingSetter(true);
    await navigator.clipboard.writeText(molfile);

    // Find the Ketcher iframe and dispatch Ctrl+V into it so the structure
    // is pasted onto the canvas without the user needing to do anything.
    const iframe = document.querySelector('iframe#ketcher-iframe')
      || document.querySelector('iframe[src*="ketcher"]')
      || document.querySelector('iframe');

    if (iframe?.contentWindow) {
      iframe.contentWindow.focus();
      const ev = new KeyboardEvent('keydown', {
        key: 'v', code: 'KeyV', ctrlKey: true, bubbles: true, cancelable: true,
      });
      iframe.contentWindow.document.dispatchEvent(ev);
    }
  } catch (e) {
    console.error('Failed to load template into Ketcher:', e);
  } finally {
    setTimeout(() => isCommonTemplateLoadingSetter(false), 500);
  }
}

const TemplateCard = memo(({ item, onSelect }) => (
  <button
    type="button"
    className="common-templates-panel__card"
    onClick={() => onSelect(item)}
    title={item?.name}
  >
    <div className="common-templates-panel__card-img">
      <i className="fa fa-flask common-templates-panel__card-placeholder" />
    </div>
    <span className="common-templates-panel__card-name">{item?.name}</span>
  </button>
));
TemplateCard.displayName = 'TemplateCard';
TemplateCard.propTypes = {
  item: PropTypes.shape({
    name: PropTypes.string,
    molfile: PropTypes.string,
  }).isRequired,
  onSelect: PropTypes.func.isRequired,
};

const PAGE_SIZE = 15;
// Update this date whenever a new batch of templates is added.
// Templates with created_at >= NEW_SINCE are shown with the "New" badge.
const NEW_SINCE = new Date('2017-09-01');

const isNew = (template) => {
  if (!template?.created_at) return false;
  return new Date(template.created_at) >= NEW_SINCE;
};

const CommonTemplatesList = memo(() => {
  const [templateList, setTemplateList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [panelStyle, setPanelStyle] = useState({});
  const [showNewOnly, setShowNewOnly] = useState(false);
  const sentinelRef = useRef(null);
  const bodyRef = useRef(null);
  const toolTip = 'Select a template to load it into the editor.';

  useEffect(() => {
    let cancelled = false;
    TemplateFetcher.commonTemplates().then((templates) => {
      // Templates JSON has no id and names are not unique, so derive a stable key
      // from the position in the full list (survives search/"New" filtering).
      if (!cancelled) {
        setTemplateList((templates || []).map((t, i) => ({ ...t, key: t.id ?? `template-${i}` })));
      }
    });
    return () => { cancelled = true; };
  }, []);

  const onSelectItem = (item) => {
    setSelectedItem(item);
    setShowModal(false);
    loadTemplateIntoKetcher(item?.molfile);
  };

  // useMemo (not useCallback) so the debounced function is recreated only when the list changes.
  const handleSearch = useMemo(
    () => debounce((query, newOnly) => {
      const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const strip = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedQuery = normalize(query);
      const strippedQuery = strip(query);
      // `notes` holds alternative names (e.g. "DMSO", "Ala"), so search matches them as well.
      const matches = (text) => !!text
        && (normalize(text).includes(normalizedQuery) || strip(text).includes(strippedQuery));
      let results = templateList?.filter((item) => {
        const matchesQuery = matches(item.name) || matches(item.notes);
        const matchesNew = !newOnly || isNew(item);
        return matchesQuery && matchesNew;
      });
      if (newOnly) {
        results = [...results].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
      }
      setFilteredOptions(results);
      setVisibleCount(PAGE_SIZE);
    }, 300),
    [templateList]
  );

  useEffect(() => {
    handleSearch(searchQuery, showNewOnly);
  }, [searchQuery, showNewOnly, handleSearch]);

  // Intercept Escape in capture phase so Bootstrap modal doesn't close first.
  useEffect(() => {
    if (!showModal) return () => {};
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setShowModal(false);
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [showModal]);

  // Scroll panel body to top each time the panel opens (bodyRef mounts after showModal → true).
  useEffect(() => {
    if (showModal && bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [showModal]);

  const newCount = templateList.filter(isNew).length;

  const openPanel = () => {
    const panelWidth = 460;
    const panelHeight = Math.min(window.innerHeight * 0.55, 420);
    const left = Math.round((window.innerWidth - panelWidth) / 2);
    const top = Math.round((window.innerHeight - panelHeight) / 2);
    setPanelStyle({ top, left });
    setSearchQuery('');
    setShowNewOnly(false);
    setFilteredOptions(templateList);
    setVisibleCount(PAGE_SIZE);
    setShowModal(true);
  };

  const visibleItems = filteredOptions.slice(0, visibleCount);
  const hasMore = visibleCount < filteredOptions.length;
  const newBadgeClassName = `common-templates-panel__new-badge${
    showNewOnly ? ' common-templates-panel__new-badge--active' : ''
  }`;

  // Infinite scroll: when the sentinel div scrolls into view, reveal the next batch.
  // Depends on hasMore so the observer re-attaches whenever the sentinel remounts
  // (search/filter updates run unbatched in React 17 and can unmount it for one render),
  // and on visibleCount so a sentinel still in view after a batch triggers the next one.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!showModal || !hasMore || !sentinel) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredOptions.length));
        }
      },
      { root: bodyRef.current, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [showModal, hasMore, visibleCount, filteredOptions.length]);

  // The floating panel is rendered via a portal on document.body so it is completely
  // outside the Bootstrap Modal's DOM tree and any ancestor transform/stacking contexts.
  // This guarantees that SVG thumbnail loads inside the panel cannot trigger a layout
  // recalculation on the modal's subtree, which would otherwise cause the Ketcher iframe
  // to receive a resize event and redraw its toolbar (visible icon blinking).
  const panel = (
    <div className="common-templates-panel" style={panelStyle}>
      <div className="common-templates-panel__title-bar">
        <strong>Common Templates</strong>
        <button
          type="button"
          onClick={() => setShowModal(false)}
          className="common-templates-panel__close-btn"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="common-templates-panel__search">
        <div className="common-templates-panel__search-wrap">
          <Form.Control
            type="text"
            placeholder="Search templates by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e?.target?.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="common-templates-panel__search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <div className="common-templates-panel__count">
          <span>
            {filteredOptions.length !== templateList.length
              ? `${filteredOptions.length} of ${templateList.length} templates`
              : `${templateList.length} templates`}
          </span>
          {newCount > 0 && (
            <OverlayTrigger
              placement="top"
              overlay={(
                <Tooltip id="new-templates-tip" className="common-templates-tooltip">
                  Recently added templates — click to filter
                </Tooltip>
              )}
            >
              <button
                type="button"
                className={newBadgeClassName}
                onClick={() => setShowNewOnly((v) => !v)}
              >
                <i className="fa fa-clock-o" />
                ({newCount})
              </button>
            </OverlayTrigger>
          )}
        </div>
      </div>

      <div ref={bodyRef} className="common-templates-panel__body">
        <div className="common-templates-panel__grid">
          {visibleItems.map((item) => (
            <TemplateCard
              key={item.key}
              item={item}
              onSelect={onSelectItem}
            />
          ))}
        </div>

        {hasMore && (
          <div ref={sentinelRef} className="common-templates-panel__sentinel">
            <Spinner animation="border" size="sm" style={{ color: '#167782' }} />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="col-sm-6 d-flex align-items-center">
      <OverlayTrigger overlay={<Tooltip id="commontemplates">{toolTip}</Tooltip>}>
        <button
          type="button"
          className="common-templates-trigger"
          onClick={openPanel}
        >
          <i className="fa fa-th common-templates-trigger__icon" />
          <span className="common-templates-trigger__label">
            {selectedItem ? selectedItem.name : 'Common Templates'}
          </span>
          <i className={`fa fa-chevron-${showModal ? 'up' : 'down'} common-templates-trigger__caret`} />
        </button>
      </OverlayTrigger>

      {showModal && createPortal(panel, document.body)}
    </div>
  );
});
CommonTemplatesList.displayName = 'CommonTemplatesList';

export default CommonTemplatesList;
