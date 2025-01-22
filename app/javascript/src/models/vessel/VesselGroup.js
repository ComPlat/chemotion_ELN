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
  
  const findMatchingGroup = (vesselGroups, vessel) =>
    vesselGroups.find((group) =>
      group.vesselItems.some((item) => item.vessel_template.name === vessel.vessel_template.name)
    );
  
  const createNewGroup = (vessel) => ({
    vesselItems: [vessel],
  });

  export default { buildVesselGroups };