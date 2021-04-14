# == Schema Information
#
# Table name: text_templates
#
#  id         :integer          not null, primary key
#  type       :string
#  user_id    :integer          not null
#  data       :jsonb
#  deleted_at :datetime
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  name       :string
#
# Indexes
#
#  index_predefined_template           (name) UNIQUE WHERE ((type)::text = 'PredefinedTextTemplate'::text)
#  index_text_templates_on_deleted_at  (deleted_at)
#  index_text_templates_on_user_id     (user_id)
#

class TextTemplate < ApplicationRecord
  enum type: %i(
    SampleTextTemplate
    ReactionTextTemplate
    WellplateTextTemplate
    ScreenTextTemplate
    ResearchPlanTextTemplate
    ReactionDescriptionTextTemplate
  )

  belongs_to :user

  DEFAULT_TEMPLATES = {
    'MS': %w[ei fab esi apci asap maldi m+ hr hr-ei hr-fab aa bb],
    '_toolbar': %w[ndash h-nmr c-nmr ir uv ea]
  }.freeze

  def self.default_templates
    def_names = {}
    name.to_s.constantize::DEFAULT_TEMPLATES.each { |k, v| def_names[k] = PredefinedTextTemplate.where(name: v).pluck(:name)  }
    def_names
  end
end

class SampleTextTemplate < TextTemplate
end

class ReactionTextTemplate < TextTemplate
end

class ReactionDescTextTemplate < TextTemplate
end

class WellplateTextTemplate < TextTemplate
end

class ScreenTextTemplate < TextTemplate
end

class ResearchPlanTextTemplate < TextTemplate
end

class PredefinedTextTemplate < TextTemplate
  def self.init_seeds
    predefined_template_seeds_path = File.join(Rails.root, 'db', 'seeds', 'json', 'text_template_seeds.json')
    predefined_templates = JSON.parse(File.read(predefined_template_seeds_path))

    predefined_templates.each do |template|
      next if PredefinedTextTemplate.where(name: template['name']).count.positive?

      text_template = new(type: 'PredefinedTextTemplate')
      text_template.name = template.delete('name')
      text_template.data = template
      text_template.user_id = Admin.first.id
      text_template.save!
    end
  end
end

class ReactionDescriptionTextTemplate < TextTemplate
  DEFAULT_TEMPLATES = {
    '_toolbar': %w[
      ndash water-free resin-solvent resin-solvent-reagent hand-stop
      reaction-procedure gpx-a gpx-b washed-nahco3 acidified-hcl tlc-control
      dried isolated residue-purified residue-adsorbed residue-dissolved
    ]
  }.freeze
end
