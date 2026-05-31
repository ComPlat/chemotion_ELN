import React, { useEffect, useState } from 'react';

import WorkshopContent from 'src/components/workshopGuide/WorkshopContent';
import { workshopBase } from 'src/components/workshopGuide/workshopGuideFetch';

export default function WorkshopGuideInline() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${workshopBase}/home.md`, { method: 'HEAD' })
      .then((res) => { if (!cancelled) setAvailable(res.ok); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!available) return null;

  return (
    <div className="bg-light p-5 m-3 workshop-guide--inline-wrap">
      <WorkshopContent embedded />
    </div>
  );
}
