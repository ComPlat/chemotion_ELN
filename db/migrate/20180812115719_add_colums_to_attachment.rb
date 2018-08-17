class AddColumsToAttachment < ActiveRecord::Migration
  def change
    rename_column :attachments, :container_id, :attachable_id
    add_column :attachments, :attachable_type, :string

    add_index :attachments, [:attachable_type, :attachable_id]
    execute "update attachments set attachable_type = 'Container'"
  end
end
