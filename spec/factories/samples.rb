FactoryBot.define do
  factory :sample do

    sequence(:name) { |i| "Sample #{i}" }
    target_amount_value 1.0
    target_amount_unit "g"
    molarity_value 1.0
    molarity_unit "M"
    density 0.0

  #  molfile "\n  Ketcher 05301616272D 1   1.00000     0.00000     0\n\n  2  1  0     0  0            999 V2000\n    1.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\nM  END\n"
    callback(:before_create) do |sample|
      sample.creator = FactoryBot.build(:user) unless sample.creator
      sample.collections << FactoryBot.build(:collection) #if sample.collections.blank?
      sample.molecule = FactoryBot.create(:molecule) unless (sample.molecule || sample.molfile)
      unless sample.container
        sample.container = FactoryBot.create(:container, :with_analysis)
      end
    end

    factory :valid_sample do
      after(:build) do |sample|
        creator = FactoryBot.create(:user)
        sample.creator = creator unless sample.creator
        collection = FactoryBot.create(:collection, user_id: creator.id)
        sample.collections << collection if sample.collections.blank?
        sample.molecule = FactoryBot.build(:molecule) unless sample.molecule
        unless sample.container
          sample.container = FactoryBot.create(:container, :with_analysis)
        end
      end
    end
  end

  factory :sample_without_analysis, class: Sample do
    sequence(:name) { |i| "Sample #{i}" }

    target_amount_value 100
    target_amount_unit "mg"
    callback(:before_create) do |sample|
      sample.creator = FactoryBot.build(:user) unless sample.creator
      sample.collections << FactoryBot.build(:collection) #if sample.collections.blank?
      sample.molecule = FactoryBot.build(:molecule) unless sample.molecule
    end
  end
end
