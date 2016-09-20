class AddIdentifierToAttachments < ActiveRecord::Migration
  def change
    add_column :attachments, :identifier, :string
  end
end
