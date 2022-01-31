class ChangeSectionToBeStringInComments < ActiveRecord::Migration[5.2]
  def up
    change_column :comments, :section, :string
  end

  def down
    change_column :comments, :section, 'integer USING CAST(section AS integer)'
  end
end
