# frozen_string_literal: true

FactoryBot.define do
  factory :text_template do
    user { build(:user) }
    sequence(:name) { |n| "#{n}" }
    data { { foo: :bar } }

    before :build do |template, options|
      template.type = template.class.to_s
      if template.name.match?(/\d+/) # name has been autofilled by the factory
        template.name = [template.class.to_s, template.name].join(' ')
      end
    end
  end

  with_options(parent: :text_template) do
    factory :element_text_template, class: ElementTextTemplate
    factory :predefined_text_template, class: PredefinedTextTemplate
    factory :reaction_description_text_template, class: ReactionDescriptionTextTemplate
    factory :reaction_text_template, class: ReactionTextTemplate
    factory :research_plan_text_template, class: ResearchPlanTextTemplate
    factory :sample_text_template, class: SampleTextTemplate
    factory :screen_text_template, class: ScreenTextTemplate
    factory :wellplate_text_template, class: WellplateTextTemplate
  end
end
