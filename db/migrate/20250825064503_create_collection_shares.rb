class CreateCollectionShares < ActiveRecord::Migration[6.1]
  def change
    create_table :collection_shares do |t|
      t.belongs_to :collection, foreign_key: true
      t.belongs_to :shared_with, null: false, foreign_key: { to_table: :users }
      t.integer :permission_level, null: false, default: 0
      t.integer :celllinesample_detail_level, null: false, default: 0
      t.integer :devicedescription_detail_level, null: false, default: 0
      t.integer :element_detail_level, null: false, default: 0
      t.integer :reaction_detail_level, null: false, default: 0
      t.integer :researchplan_detail_level, null: false, default: 0
      t.integer :sample_detail_level, null: false, default: 0
      t.integer :screen_detail_level, null: false, default: 0
      t.integer :sequencebasedmacromoleculesample_detail_level, null: false, default: 0
      t.integer :wellplate_detail_level, null: false, default: 0
      t.timestamps
    end
  end
end
