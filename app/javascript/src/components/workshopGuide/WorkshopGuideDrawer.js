import React, { useEffect, useState } from 'react';

import ChemotionLogo from 'src/components/common/ChemotionLogo';
import WorkshopContent from 'src/components/workshopGuide/WorkshopContent';
import { fetchWorkshopAvailability } from 'src/components/workshopGuide/workshopGuideFetch';

// The drawer auto-hides itself if no workshop content is checked out, so the
// feature is implicitly off on non-workshop instances (just don't run the rake
// sync task).
export default function WorkshopGuideDrawer() {
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [openedOnce, setOpenedOnce] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchWorkshopAvailability().then((ok) => { if (!cancelled) setAvailable(ok); });
    return () => { cancelled = true; };
  }, []);

  if (!available) return null;

  const toggle = () => {
    setOpen((v) => {
      if (!v) setOpenedOnce(true);
      return !v;
    });
  };

  return (
    <>
      <button
        type="button"
        className="workshop-guide-fab"
        title={open ? 'Hide Workshop Guide' : 'Show Workshop Guide'}
        aria-label="Workshop Guide"
        onClick={toggle}
      >
        <ChemotionLogo collapsed />
        <span className="workshop-guide-fab__label">Workshop&nbsp;Guide</span>
      </button>
      {openedOnce && (
        <div
          className={`workshop-guide-drawer${open ? '' : ' workshop-guide-drawer--hidden'}`}
          role="dialog"
          aria-label="Workshop Guide"
          aria-hidden={!open}
        >
          <div className="workshop-guide-drawer__header">
            <strong>Workshop Guide</strong>
            <button
              type="button"
              className="workshop-guide-drawer__close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="workshop-guide-drawer__body">
            <WorkshopContent />
          </div>
        </div>
      )}
    </>
  );
}
