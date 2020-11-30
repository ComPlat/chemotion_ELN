class AddUniqCollectionsElements < ActiveRecord::Migration[4.2]
  def change
    add_index :collections_reactions, [:reaction_id, :collection_id], unique: true
    add_index :collections_wellplates, [:wellplate_id, :collection_id], unique: true
    add_index :collections_screens, [:screen_id, :collection_id], unique: true
    add_index :collections_research_plans, [:research_plan_id, :collection_id], unique: true, name: "index_collections_research_plans_on_rplan_id_and_coll_id"
    
    remove_index :collections_samples, [:sample_id]
    remove_index :collections_reactions, [:reaction_id]
    remove_index :collections_wellplates, [:wellplate_id]
    remove_index :collections_screens, [:screen_id]
  end
end
