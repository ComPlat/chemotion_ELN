class CreateResearchPlansWellplatesJoinTable < ActiveRecord::Migration[5.2]
  def change
    remove_column :research_plans, :screen_id, :integer

    create_join_table :research_plans, :wellplates do |t|
      t.primary_key :id
      t.integer :research_plan_id
      t.index :research_plan_id
      t.integer :wellplate_id
      t.index :wellplate_id
      t.datetime :created_at
      t.datetime :updated_at
      t.datetime :deleted_at
    end

    create_join_table :screens, :research_plans do |t|
      t.primary_key :id
      t.integer :research_plan_id
      t.index :research_plan_id
      t.integer :screen_id
      t.index :screen_id
      t.datetime :created_at
      t.datetime :updated_at
      t.datetime :deleted_at
    end
  end
end