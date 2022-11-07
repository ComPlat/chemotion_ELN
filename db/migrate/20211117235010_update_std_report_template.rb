class UpdateStdReportTemplate < ActiveRecord::Migration[5.2]
  def change
    rt = ReportTemplate.find_by(name: 'Standard')
    return unless rt
    uid = Admin.first&.id || User.first.id
    attachment = Attachment.create!(
      filename: 'Standard.docx',
      key: SecureRandom.uuid,
      file_path: "#{Rails.root.join('lib', 'template').to_s}/Standard.docx",
      created_by: uid,
      created_for: uid,
      content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    primary_store = Rails.configuration.storage.primary_store
    attachment.update!(storage: primary_store)

    rt.update!(attachment_id: attachment.id)
  end
end
