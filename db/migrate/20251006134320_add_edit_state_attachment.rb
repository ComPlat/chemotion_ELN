class AddEditStateAttachment < ActiveRecord::Migration[6.1]
  def change
    add_column :attachments, :edit_state, :integer, default: 0
  end
end
