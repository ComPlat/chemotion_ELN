class CreateAttachments < ActiveRecord::Migration
  def change
    create_table :attachments do |t|
      t.string :filename
      t.references :container, index: true

      t.timestamps null: false
    end
    add_foreign_key :attachments, :containers
  end
end
