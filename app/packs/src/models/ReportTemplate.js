import Element from 'src/models/Element';

export default class ReportTemplate extends Element {

  constructor({ id, name, report_type, attachment, attachment_id }) {
    const reportTemplate = {
      id,
      name,
      report_type,
      attachment,
      attachment_id,
    }

    super(reportTemplate)
  }

  serialize() {
    return super.serialize({
      id: this.id,
      name: this.name,
      report_type: this.report_type,
      attachment: this.attachment,
      attachment_id: this.attachment_id,
    })
  }

}
