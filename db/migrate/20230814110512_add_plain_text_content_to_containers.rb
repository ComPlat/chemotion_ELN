class AddPlainTextContentToContainers < ActiveRecord::Migration[6.1]
  def change
    add_column :containers, :plain_text_content, :text
  end
end
