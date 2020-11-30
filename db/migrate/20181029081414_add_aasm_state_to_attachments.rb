class AddAasmStateToAttachments < ActiveRecord::Migration[4.2]
  def change
    add_column :attachments, :aasm_state, :string
  end
end
