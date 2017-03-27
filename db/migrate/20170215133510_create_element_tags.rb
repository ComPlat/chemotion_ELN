class CreateElementTags < ActiveRecord::Migration
  def self.up
    create_table :element_tags do |t|
      t.string  :taggable_type
      t.integer :taggable_id
      t.jsonb   :taggable_data

      t.timestamps
    end

    add_index :element_tags, :taggable_id
  end

  def self.down
    drop_table :element_tags
  end
end
