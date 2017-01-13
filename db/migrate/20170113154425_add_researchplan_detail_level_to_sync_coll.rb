class AddResearchplanDetailLevelToSyncColl < ActiveRecord::Migration
  def change
    add_column :sync_collections_users, :researchplan_detail_level, :integer, default: 10
  end
end
