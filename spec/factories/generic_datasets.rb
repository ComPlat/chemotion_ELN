# frozen_string_literal: true

FactoryBot.define do
  factory :dataset_klass, class: DatasetKlass do
    label { 'dataset' }
    ols_term_id { 'CHMO:0000292' }
    created_by { 0 }
  end

  factory :dataset, class: Dataset do
    dataset_klass { FactoryBot.build(:dataset_klass) }
    element { FactoryBot.build(:container) }
  end
end
