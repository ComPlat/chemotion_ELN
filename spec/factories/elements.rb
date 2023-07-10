# frozen_string_literal: true

FactoryBot.define do
  factory :element do
    name { "New element #{Element.count + 1}" }
    element_klass { ElementKlass.first || create(:element_klass) }
    short_label { 'label' }
    properties { element_klass.properties_release }
    creator { User.first || create(:user) }
    uuid { SecureRandom.uuid }
    klass_uuid { element_klass.uuid }
  end
end
