FactoryBot.define do
  factory :sample do
    sequence(:name) { |i| "Sample #{i}" }
    target_amount_value { 1.0 }
    target_amount_unit { 'g' }
    molarity_value { 1.0 }
    molarity_unit { 'M' }
    density { 0.0 }

    #  molfile "\n  Ketcher 05301616272D 1   1.00000     0.00000     0\n\n  2  1  0     0  0            999 V2000\n    1.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\n  1  2  1  0     0  0\nM  END\n"
    callback(:before_create) do |sample|
      sample.creator = FactoryBot.build(:user) unless sample.creator
      sample.collections << FactoryBot.build(:collection) # if sample.collections.blank?
      sample.molecule = FactoryBot.create(:molecule) unless sample.molecule || sample.molfile
      sample.container = FactoryBot.create(:container, :with_analysis) unless sample.container
    end

    trait :with_residues do
      transient do
        residues_count { 2 }
      end

      after(:create) do |sample, evaluator|
        sample.residues << build_list(:residue, evaluator.residues_count)
      end
    end

    factory :valid_sample do
      after(:build) do |sample|
        creator = FactoryBot.create(:user)
        sample.creator = creator unless sample.creator
        sample.collections << FactoryBot.create(:collection, user_id: creator.id) if sample.collections.blank?
        sample.molecule = FactoryBot.build(:molecule) unless sample.molecule
        sample.container = FactoryBot.create(:container, :with_analysis) unless sample.container
      end
    end

    factory :sample_with_valid_inventory_label do
      callback(:before_create) do |sample|
        inventory = FactoryBot.create(:inventory)
        inventory['name'] = 'Bräse Group Camp North'
        inventory['prefix'] = 'BGCN'
        inventory['counter'] = 1
        creator = FactoryBot.create(:user)
        sample.creator = creator unless sample.creator
        collection = sample.collections.first
        collection.inventory_id = inventory.id
        sample.collections << FactoryBot.create(:collection, user_id: creator.id, inventory_id: inventory.id)
      end
      after(:build) do |sample|
        sample.molecule = FactoryBot.build(:molecule) unless sample.molecule
        sample.container = FactoryBot.create(:container, :with_analysis) unless sample.container
      end
    end
  end

  factory :sample_without_analysis, class: Sample do
    sequence(:name) { |i| "Sample #{i}" }

    target_amount_value { 100 }
    target_amount_unit { 'mg' }
    callback(:before_create) do |sample|
      sample.creator = FactoryBot.build(:user) unless sample.creator
      sample.collections << FactoryBot.build(:collection) # if sample.collections.blank?
      sample.molecule = FactoryBot.build(:molecule) unless sample.molecule
    end
  end

  factory :sample_with_image_in_analysis, class: Sample do
    sequence(:name) { |i| "Sample #{i}" }

    target_amount_value { 100 }
    target_amount_unit { 'mg' }
    callback(:before_create) do |sample|
      user =  sample.creator || FactoryBot.create(:user)
      sample.creator = user
      sample.collections << FactoryBot.build(:collection) # if sample.collections.blank?
      sample.molecule = FactoryBot.create(:molecule) unless sample.molecule || sample.molfile
      sample.container = FactoryBot.create(:container, :with_analysis) unless sample.container
      attachment = FactoryBot.create(:attachment, :with_image,
        attachable_id: sample.container.children[0].children[0],
        created_for: user.id,
        attachable_type: 'Container')
        sample.container.children[0].children[0].attachments<<attachment;
    end
  end

  factory :sample_with_annotated_image_in_analysis, class: Sample do
    sequence(:name) { |i| "Sample #{i}" }

    target_amount_value { 100 }
    target_amount_unit { 'mg' }

    callback(:before_create) do |sample|
      user =  sample.creator || FactoryBot.create(:user)
      sample.creator = user
      sample.collections << FactoryBot.build(:collection) # if sample.collections.blank?
      sample.molecule = FactoryBot.create(:molecule) unless sample.molecule || sample.molfile
      sample.container = FactoryBot.create(:container, :with_analysis) unless sample.container

      attachment = FactoryBot.create(:attachment, :with_annotation,
        attachable_id: sample.container.children[0].children[0].id,
        created_for: user.id,
        attachable_type: 'Container'
      )
    end
  end
end
