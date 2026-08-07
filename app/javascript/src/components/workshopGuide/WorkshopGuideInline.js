import React, { useEffect, useState } from 'react';

import WorkshopContent from 'src/components/workshopGuide/WorkshopContent';
import { fetchWorkshopAvailability } from 'src/components/workshopGuide/workshopGuideFetch';

export default function WorkshopGuideInline() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchWorkshopAvailability().then((ok) => { if (!cancelled) setAvailable(ok); });
    return () => { cancelled = true; };
  }, []);

  if (!available) return null;

  return (
    <div className="bg-light p-5 m-3 workshop-guide--inline-wrap">
      <WorkshopContent embedded />
    </div>
  );
}
