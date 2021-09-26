class ChangeFileSizeToBeBigintInAttachments < ActiveRecord::Migration[5.2]
  def change
    change_column :attachments, :filesize, :bigint
  end
end
