class AddAdditonalPlainTextFieldForDescriptionFields < ActiveRecord::Migration[6.1]
  def change
    add_column :reactions, :plain_text_description, :text
    add_column :reactions, :plain_text_observation, :text
    add_column :screens, :plain_text_description, :text
    add_column :wellplates, :plain_text_description, :text
  end
end
