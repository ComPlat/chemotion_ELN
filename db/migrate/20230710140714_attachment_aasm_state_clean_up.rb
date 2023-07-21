class AttachmentAasmStateCleanUp < ActiveRecord::Migration[6.1]
  # update any attachment having the former aasm_state 'oo_editing' to 'idle'
  def change
    Attachment.where(aasm_state: 'oo_editing').find_each do |attachment|
      attachment.update_columns(aasm_state: 'idle')
    end
  end
end
