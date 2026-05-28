import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class AnnotationsFetcher {
  static extractAttachmentsFromContainer(container, attachments = []) {
    if (!container || !container.attachments) { return attachments; }

    Array.prototype.push.apply(attachments, container.attachments);
    container.children
      .forEach((child) => this.extractAttachmentsFromContainer(child, attachments));

    return attachments;
  }

  static updateAnnotationsInContainer(element) {
    const updateTasks = [];
    const attachments = this.extractAttachmentsFromContainer(element.container, []);

    attachments
      .filter((attach) => attach.updatedAnnotation)
      .forEach((attach) => {
        const body = new FormData();
        body.append('updated_svg_string', attach.updatedAnnotation);
        const updateTask = ApiClient.postFormData(`/api/v1/attachments/${attach.id}/annotation`, { body });
        updateTasks.push(updateTask);
      });

    return Promise.all(updateTasks);
  }

  static updateAnnotationsForAttachments(attachments) {
    const updateTasks = [];
    attachments
      .filter((attach) => attach.updatedAnnotation)
      .forEach((attach) => {
        const body = new FormData();
        body.append('updated_svg_string', attach.updatedAnnotation);
        updateTasks.push(ApiClient.postFormData(`/api/v1/attachments/${attach.id}/annotation`, { body }));
      });
    return Promise.all(updateTasks);
  }

  static updateAnnotationsOfAttachments(element) {
    const updateTasks = [];
    if (!element.attachments) {
      return Promise.resolve();
    }
    element.attachments
      .filter(((attach) => attach.hasOwnProperty('updatedAnnotation')))
      .forEach((attach) => {
        const body = new FormData();
        body.append('updated_svg_string', attach.updatedAnnotation);
        updateTasks.push(ApiClient.postFormData(`/api/v1/attachments/${attach.id}/annotation`, { body }));
      });
    return Promise.all(updateTasks);
  }

  static updateAnnotations(element) {
    return Promise.all(
      [
        this.updateAnnotationsOfAttachments(element),
        this.updateAnnotationsInContainer(element, [])
      ]
    );
  }
}
