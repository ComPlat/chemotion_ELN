class AddScreen < ActiveRecord::Migration
  def change
    create_table "screens", force: :cascade do |t|
      t.string   "description"
      t.string   "name"
      t.string   "result"
      t.string   "collaborator"
      t.string   "conditions"
      t.string   "requirements"
      t.datetime "created_at",  null: false
      t.datetime "updated_at",  null: false
    end

    create_join_table :collections, :screens do |t|
      t.index :collection_id
      t.index :screen_id
    end

    change_table :collections do |t|
      t.integer :screen_detail_level,  default: 0
    end

    change_table :wellplates do |t|
      t.integer "screen_id", null: true, index: true
    end
  end
end
