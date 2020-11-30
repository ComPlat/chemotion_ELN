class AddResearchPlanPreviewSvg < ActiveRecord::Migration[4.2]
  def change
    add_column :research_plans, :thumb_svg, :string
  end
end