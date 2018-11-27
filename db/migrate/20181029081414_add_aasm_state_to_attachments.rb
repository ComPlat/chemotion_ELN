class AddAasmStateToAttachments < ActiveRecord::Migration
  def change
    add_column :attachments, :aasm_state, :string
  end
end
