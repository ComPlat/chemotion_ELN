class CreateResearchPlans < ActiveRecord::Migration[4.2]
  def change
    create_table :research_plans do |t|
      t.string :name, null: false
      t.text :description
      t.string :sdf_file
      t.string :svg_file
      t.integer :created_by, null: false
      t.datetime :deleted_at

      t.timestamps null: false
    end

    create_table :collections_research_plans do |t|
      t.integer :collection_id
      t.integer :research_plan_id

      t.datetime :deleted_at
    end

    add_column :collections, :researchplan_detail_level, :integer, default: 10

    change_column :users, :layout, :hstore, default: {
      sample: 1,
      reaction: 2,
      wellplate: 3,
      screen: 4,
      research_plan: 5
    }

    User.find_each do |u|
      u.layout[:research_plan] = 5
      u.save!
    end
  end
end
