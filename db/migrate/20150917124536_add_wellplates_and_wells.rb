class AddWellplatesAndWells < ActiveRecord::Migration[4.2]
  def change
    create_table "wells", force: :cascade do |t|
      t.integer "sample_id", null: false, index: true
      t.integer "wellplate_id", null: false, index: true
      t.integer  "position_x"
      t.integer  "position_y"
      t.datetime "created_at", null: false
      t.datetime "updated_at", null: false
    end

    create_table "wellplates", force: :cascade do |t|
      t.string   "name"
      t.integer  "size"
      t.string   "description"
      t.datetime "created_at",  null: false
      t.datetime "updated_at",  null: false
    end

    create_table :collections_wellplates do |t|
      t.integer :collection_id
      t.integer :wellplate_id
      t.index :collection_id
      t.index :wellplate_id
    end
  end
end
