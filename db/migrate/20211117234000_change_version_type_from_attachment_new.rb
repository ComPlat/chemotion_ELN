class ChangeVersionTypeFromAttachmentNew < ActiveRecord::Migration[5.2]
  def up
    change_column :attachments, :version, :string, null: true, default: nil
    Attachment.find_each do |attach|
      attach.update_column(:version, nil)
    end
  end

  def down
    change_column :attachments, :version, 'integer USING CAST(version AS integer)'
  end
end
