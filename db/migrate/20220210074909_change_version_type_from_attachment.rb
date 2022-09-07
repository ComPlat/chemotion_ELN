class ChangeVersionTypeFromAttachment < ActiveRecord::Migration[5.2]
  def up
    return if Attachment.column_for_attribute('version').type == :string
    change_column :attachments, :version, :string, null: true, default: nil

    Attachment.update_all(version: nil)
  end

  def down
    change_column :attachments, :version, 'integer USING CAST(version AS integer)'
  end
end
