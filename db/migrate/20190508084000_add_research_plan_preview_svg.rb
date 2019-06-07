class AddResearchPlanPreviewSvg < ActiveRecord::Migration
  def change
    add_column :research_plans, :thumb_svg, :string
  end
end