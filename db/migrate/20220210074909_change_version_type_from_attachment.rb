class ChangeVersionTypeFromAttachment < ActiveRecord::Migration[5.2]
  def up
<<<<<<< HEAD
    type = Attachment.column_for_attribute(:version).type
    return if(type == :string)

=======
    return if Attachment.column_for_attribute('version').type == :string
>>>>>>> 1277-using-gemshrine-file-service
    change_column :attachments, :version, :string, null: true, default: nil
    Attachment.find_each do |attach|
      attach.update_column(:version, nil)
    end
  end

  def down
    change_column :attachments, :version, 'integer USING CAST(version AS integer)'
  end
end
