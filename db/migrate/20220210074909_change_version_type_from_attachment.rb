class ChangeVersionTypeFromAttachment < ActiveRecord::Migration[5.2]
  def up
    type = Attachment.column_for_attribute(:version).type
    return if(type == :string)

    change_column :attachments, :version, :string, null: true, default: nil
    Attachment.find_each do |attach|
      attach.update_column(:version, nil)
    end
  end

  def down
    change_column :attachments, :version, 'integer USING CAST(version AS integer)'
  end
end
