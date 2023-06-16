class AddPlainTextDescriptionToReactions < ActiveRecord::Migration[6.1]
  def change
    add_column :reactions, :plain_text_description, :text
  end
end
