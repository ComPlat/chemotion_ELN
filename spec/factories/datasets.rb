FactoryBot.define do
  factory :dataset, class: 'Labimotion::Dataset' do
    dataset_klass { FactoryBot.build(:dataset_klass) }
    element { FactoryBot.build(:container) }
  end
end
