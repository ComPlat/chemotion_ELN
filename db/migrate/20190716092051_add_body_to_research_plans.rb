class AddBodyToResearchPlans < ActiveRecord::Migration
  class ResearchPlan < ActiveRecord::Base
    serialize :description, Hash
    serialize :body, Array
  end

  def up
    add_column :research_plans, :body, :text

    ResearchPlan.find_each do |rp|
      body = [
        {
          "id" => SecureRandom.uuid,
          "type" => "ketcher",
          "value" => {
            "sdf_file" => rp.sdf_file,
            "svg_file" => rp.svg_file,
            "thumb_svg" => rp.thumb_svg
          }
        },
        {
          "id" => SecureRandom.uuid,
          "type" => "richtext",
          "value" => rp.description
        }
      ]
      rp.update_column(:body, body)
    end

    remove_column :research_plans, :description
    remove_column :research_plans, :sdf_file
    remove_column :research_plans, :svg_file
    remove_column :research_plans, :thumb_svg

    ResearchPlan.reset_column_information
  end

  def down
    add_column :research_plans, :thumb_svg, :string
    add_column :research_plans, :svg_file, :string
    add_column :research_plans, :sdf_file, :string
    add_column :research_plans, :description, :text

    ResearchPlan.find_each do |rp|
      rp.update_column(:thumb_svg, rp.body[0]["value"]["thumb_svg"])
      rp.update_column(:svg_file, rp.body[0]["value"]["svg_file"])
      rp.update_column(:sdf_file, rp.body[0]["value"]["sdf_file"])
      rp.update_column(:description, rp.body[1]["value"])
    end

    remove_column :research_plans, :body

    ResearchPlan.reset_column_information
  end
end
