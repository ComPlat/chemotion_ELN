# frozen_string_literal: true

FactoryBot.define do
  factory :element, class: 'Labimotion::Element' do
    name { "New element #{Labimotion::Element.count + 1}" }
    element_klass { FactoryBot.build(:element_klass) }
    short_label { 'label' }
    properties { element_klass.properties_release }
    uuid { SecureRandom.uuid }
    klass_uuid { element_klass.uuid }
    callback(:before_create) do |element|
      element.creator = FactoryBot.build(:user) if element.creator.blank?
      element.collections << FactoryBot.build(:collection)
      element.container = FactoryBot.create(:container, :with_analysis) if element.container.blank?
    end
  end
end

