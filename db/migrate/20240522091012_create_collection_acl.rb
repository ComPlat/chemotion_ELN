class CreateCollectionAcl < ActiveRecord::Migration[6.1]
  def change
    create_table :collection_acls do |t|
      t.integer :user_id, null: false
      t.integer :collection_id, null: false
      t.string :label
      t.integer :permission_level,          default: 0
      t.integer :sample_detail_level,       default: 10
      t.integer :reaction_detail_level,     default: 10
      t.integer :wellplate_detail_level,    default: 10
      t.integer :screen_detail_level,       default: 10
      t.integer :researchplan_detail_level, default: 10
      t.integer :element_detail_level,      default: 10
      t.integer :celllinesample_detail_level, default: 10

      t.index ["collection_id"], name: "index_collection_acls_on_collection_id"
      t.index ["user_id",], name: "index_collection_acls_on_user_id"

      t.timestamps null: false
    end
  end
end
