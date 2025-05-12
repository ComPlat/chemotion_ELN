# frozen_string_literal: true

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
  belongs_to :user

  TYPES = %w[SampleTextTemplate ReactionTextTemplate WellplateTextTemplate ScreenTextTemplate
             ResearchPlanTextTemplate ReactionDescriptionTextTemplate DeviceDescriptionTextTemplate
             ElementTextTemplate].freeze

  DEFAULT_TEMPLATES = {
    MS: %w[ei fab esi apci asap maldi m+ hr hr-ei hr-fab aa bb],
    _toolbar: %w[ndash h-nmr c-nmr ir uv ea],
  }.freeze

  def self.default_templates
    def_names = {}
    name.to_s.constantize::DEFAULT_TEMPLATES
      .each { |k, v| def_names[k] = PredefinedTextTemplate.where(name: v).pluck(:name) }
    def_names
  end

  def self.create_default_text_templates_for_user(id)
    ids = TextTemplate::TYPES.map do |type|
      klass = type.to_s.constantize
      klass.create(user_id: id, data: klass.default_templates)&.id
    end
    where(id: ids.compact)
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

class ElementTextTemplate < TextTemplate
end

class DeviceDescriptionTextTemplate < TextTemplate
end

class PredefinedTextTemplate < TextTemplate
  def self.init_seeds
    filepath = Rails.root.join('db/seeds/json/text_template_seeds.json')
    predefined_template_seeds_path = File.join(filepath)
    predefined_templates = JSON.parse(File.read(predefined_template_seeds_path))

    predefined_templates.each do |template|
      next if TextTemplate.where(name: template['name'], type: 'PredefinedTextTemplate').count.positive?

      template_name = template.delete('name')
      TextTemplate.create!(
        type: 'PredefinedTextTemplate',
        name: template_name,
        data: template,
        user_id: Admin.default_admin&.id,
      )
    end
  end
end

class ReactionDescriptionTextTemplate < TextTemplate
  DEFAULT_TEMPLATES = {
    _toolbar: %w[
      ndash water-free resin-solvent resin-solvent-reagent hand-stop
      reaction-procedure gpx-a gpx-b washed-nahco3 acidified-hcl tlc-control
      dried isolated residue-purified residue-adsorbed residue-dissolved
    ],
  }.freeze
end
