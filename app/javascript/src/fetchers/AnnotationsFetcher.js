import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class AnnotationsFetcher {
  static extractAttachmentsFromContainer(container, attachments = []) {
    if (!container || !container.attachments) { return attachments; }

    Array.prototype.push.apply(attachments, container.attachments);
    container.children
      .forEach((child) => this.extractAttachmentsFromContainer(child, attachments));

    return attachments;
  }

  static updateTasksForAttachments(attachments) {
    const updateTasks = [];
    attachments
      .filter((attach) => attach.updatedAnnotation)
      .forEach((attach) => {
        const body = new FormData();
        body.append('updated_svg_string', attach.updatedAnnotation);
        const updateTask = ApiClient.postFormData(`/api/v1/attachments/${attach.id}/annotation`, { body });
        updateTasks.push(updateTask);
      });
    return updateTasks;
  }

  static updateAnnotationsInContainer(element) {
    const attachments = this.extractAttachmentsFromContainer(element.container, []);
    const updateTasks = this.updateTasksForAttachments(attachments);
    return Promise.all(updateTasks);
  }

  static updateAnnotationsForAttachments(attachments) {
    const updateTasks = this.updateTasksForAttachments(attachments);
    return Promise.all(updateTasks);
  }

  static updateAnnotationsOfAttachments(element) {
    if (!element.attachments) { return Promise.resolve(); }
    const updateTasks = this.updateTasksForAttachments(element.attachments);
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

  static getUpdatedAnnotationByAttachment(attachment, svgEditor, subDocument) {
    return ApiClient.getJson(`/api/v1/attachments/${attachment.id}/annotation`, {
      handleResponseSuccess: (response) => response.text()
    })
      .then((text) => {
        let canSave = false;
        if (attachment.updatedAnnotation) {
          svgEditor.svgCanvas.setSvgString(attachment.updatedAnnotation);
          canSave = true;
        } else {
          const safeParseJson = (string) => {
            try {
              const result = JSON.parse(string);
              canSave = true;
              return result;
            } catch (error) {
              console.log('Could not parse JSON when requesting attachment!', error);
              return '';
            }
          };
          const errorSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="1920"'
            + ' height="1080"><text fill="#000000" font-size="12" stroke="#FF0000" stroke-width="0"'
            + ' text-anchor="middle" transform="matrix(7.15604 0 0 7.15604 -3493.72 -3162.82)"'
            + ' x="622.37" xml:space="preserve" y="525.48">Loading error :(</text></svg>';
          const svgString = decodeURIComponent(safeParseJson(text)) || errorSVG;
          svgEditor.svgCanvas.setSvgString(svgString);
        }
        // Zoom fit-to-canvas
        subDocument.querySelector('se-text[text="tools.fit_to_all"]')?.click();
        svgEditor.updateCanvas(false, false);
        return canSave;
      });
  }
}
