/* global describe, it */

import expect from 'expect';
import Container from 'src/models/Container';
import { extractUpdateVesselTemplateApiParameter } from 'src/utilities/VesselUtilities';

describe('VesselUtilities template updates', () => {
  it('omits an existing container when saving ordinary template fields', () => {
    const payload = extractUpdateVesselTemplateApiParameter({
      id: 'template-id', vesselName: 'Updated name', container: { id: '42', children: [] },
    });

    expect(payload.name).toEqual('Updated name');
    expect(payload).not.toHaveProperty('container');
  });

  it('keeps a new container for initializing the first analyses', () => {
    const container = Container.init();
    const payload = extractUpdateVesselTemplateApiParameter({ id: 'template-id', container });

    expect(payload.container).toEqual(container);
  });

  it('handles template fields without a container', () => {
    expect(extractUpdateVesselTemplateApiParameter({ vesselName: 'Updated name' }))
      .not.toHaveProperty('container');
  });
});
