class FixScreenWellplateRelation < ActiveRecord::Migration
  def change
    remove_column :wellplates, :screen_id, :integer

    create_table :screens_wellplates do |t|
      t.integer :screen_id
      t.integer :wellplate_id
      t.index :screen_id
      t.index :wellplate_id
    end
  end
end
