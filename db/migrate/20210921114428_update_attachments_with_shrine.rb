class UpdateAttachmentsWithShrine < ActiveRecord::Migration[5.2]
  def change
    Attachment.where(attachment_data: [nil]).find_each do |item|
      next if item.nil? 
      file_path = item.store.path
      next unless File.exist? file_path
      item.attachment_attacher.attach(File.open(file_path, binmode: true))
      if item.valid?
        item.attachment_attacher.create_derivatives
        item.save!
      else
        File.write('failed_attachement_migrate.log', "#{item.id}: File_path: #{file_path}  Message: #{item.errors.to_h[:attachment]}\n", mode: 'a')
      end
    end
  end
end
