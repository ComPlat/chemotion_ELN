# frozen_string_literal: true

FactoryBot.define do
  factory :element_klass, class: ElementKlass do
    name { 'element' }
    label { 'Label' }
  end

  factory :element, class: Element do
    name { 'New element' }
    element_klass { FactoryBot.build(:element_klass) }
    callback(:before_create) do |element|
      element.creator = FactoryBot.build(:user) unless element.creator.present?
      element.collections << FactoryBot.build(:collection)
      element.container = FactoryBot.create(:container, :with_analysis) unless element.container.present?
    end
  end
end
