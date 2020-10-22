const permitWrite = element => !!element.can_update;
export const permitCls = element => (permitWrite(element) ? '' : 'permission-r');
export const permitOn = element => permitWrite(element);
