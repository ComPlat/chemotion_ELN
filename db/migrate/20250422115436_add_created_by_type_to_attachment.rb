class AddCreatedByTypeToAttachment < ActiveRecord::Migration[6.1]
  def up
    add_column :attachments, :created_by_type, :string, null: true
  end

  def down
    remove_column :attachments, :created_by_type
  end
end
