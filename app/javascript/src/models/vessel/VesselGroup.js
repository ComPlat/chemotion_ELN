/* eslint-disable no-use-before-define */
export const buildVesselGroups = (vesselElements = []) => {
  const vesselGroups = [];

  vesselElements.forEach((vessel) => {
    addVesselToGroup(vessel, vesselGroups);
  });

  return vesselGroups;
};

const addVesselToGroup = (vessel, vesselGroups) => {
  const matchingGroup = findMatchingGroup(vesselGroups, vessel);

  if (matchingGroup) {
    matchingGroup.vesselItems.push(vessel);
  } else {
    vesselGroups.push(createNewGroup(vessel));
  }
};

const findMatchingGroup = (vesselGroups, vessel) => vesselGroups.find((group) =>
  group.vesselItems.some((item) => item.vessel_template.id === vessel.vessel_template.id)
);

const createNewGroup = (vessel) => ({
  vesselItems: [vessel],
});

export const groupVesselsByTemplateId = (vessels = []) => {
  const grouped = {};

  vessels.forEach((vessel) => {
    const templateId = vessel?.vessel_template?.id?.toString()?.trim();
    if (!templateId) return;

    if (!grouped[templateId]) {
      grouped[templateId] = {
        vesselTemplate: vessel.vessel_template,
        vesselItems: [],
      };
    }

    grouped[templateId].vesselItems.push(vessel);
  });

  return Object.values(grouped);
};

export default { buildVesselGroups, groupVesselsByTemplateId };
