FactoryBot.define do
  factory :metadata do
    metadata { JSON.parse(File.read("#{Rails.root}/spec/fixtures/metadata.json")) }

    callback(:before_create) do |metadata|
      metadata.collection = FactoryBot.create(:collection)

      for i in 1..5 do
        sample = FactoryBot.create(:sample)
        sample.collections << metadata.collection
        sample.molecule = FactoryBot.create(:molecule)
      end
    end
  end
end
