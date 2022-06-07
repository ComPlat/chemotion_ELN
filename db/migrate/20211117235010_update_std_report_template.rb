class UpdateStdReportTemplate < ActiveRecord::Migration[5.2]
  def change
    rt = ReportTemplate.find_by(name: 'Standard')
<<<<<<< HEAD
    if rt.present?
      uid = Admin.first&.id || User.first.id
      file_path =  "#{Rails.root.join('lib', 'template').to_s}/Standard.docx";
      attachment = Attachment.create!(
        filename: 'Standard.docx',
        key: SecureRandom.uuid,
        created_by: uid,
        created_for: uid,
        content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
=======
    return if rt.nil? 
    uid = Admin.first&.id || User.first.id
    file_path =  "#{Rails.root.join('lib', 'template').to_s}/Standard.docx";
    attachment = Attachment.create!(
      filename: 'Standard.docx',
      key: SecureRandom.uuid,
      created_by: uid,
      created_for: uid,
      content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )

    attachment.attachment_attacher.attach(File.open(file_path, binmode: true))
      if attachment.valid?
        attachment.attachment_attacher.create_derivatives
        attachment.save!
      else
        File.write('failed_attachement_migrate.log', "#{attachment.id}: File_path: #{file_path}  Message: #{item.errors.to_h[:attachment]}\n", mode: 'a')
      end
>>>>>>> 1277-using-gemshrine-file-service

      attachment.attachment_attacher.attach(File.open(file_path, binmode: true))
      if attachment.valid?
        attachment.attachment_attacher.create_derivatives
        attachment.save!
      else
        File.write('failed_attachement_migrate.log', "#{attachment.id}: File_path: #{file_path}  Message: #{item.errors.to_h[:attachment]}\n", mode: 'a')
      end

      rt.update!(attachment_id: attachment.id)
    end
  end
end