class CreateCollectionsVessels < ActiveRecord::Migration[6.1]
  def change
    create_table :collections_vessels, id: :uuid do |t|
      t.belongs_to :collection, index: true
      t.belongs_to :vessel, type: :uuid, index: true

      t.timestamps
      t.datetime :deleted_at, index: true

      t.index %i[vessel_id collection_id], unique: true
    end
  end
end
