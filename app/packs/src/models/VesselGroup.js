export default class VesselGroup {
  constructor() {
    this.vesselItems = [];
  }

  static buildFromElements(vesselElements = []) {
    const vesselGroups = [];
    vesselElements.forEach((vessel) => {
      let groupInFocus;
      if (vesselGroups.length === 0) {
        groupInFocus = new VesselGroup();
        vesselGroups.push(groupInFocus);
      } else {
        let matchingGroups = [];
        vesselGroups.forEach((g) => {
          if (g.matchingGroup(vessel)) {
            matchingGroups = [g];
          }
        });
        if (matchingGroups.length === 0) {
          groupInFocus = new VesselGroup();
          vesselGroups.push(groupInFocus);
        } else {
          groupInFocus = matchingGroups[0];
        }
      }
      groupInFocus.vesselItems.push(vessel);
    });
    return vesselGroups;
  }

  matchingGroup(vesselToCheck) {
    if (this.vesselItems.length === 0) { return false; }
    
    const firstItemInGroup = this.vesselItems[0];

    return firstItemInGroup.vesselTemplateName === vesselToCheck.vesselTemplateName
    && firstItemInGroup.vesselDetails === vesselToCheck.vesselDetails
    && firstItemInGroup.vesselType === vesselToCheck.vesselType
    && firstItemInGroup.volumeUnit === vesselToCheck.volumeUnit
    && firstItemInGroup.volumeAmount === vesselToCheck.volumeAmount
    && firstItemInGroup.materialType === vesselToCheck.materialType;
  }
}
