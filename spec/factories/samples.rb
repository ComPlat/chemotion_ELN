FactoryBot.define do
  factory :sample do
    sequence(:name) { |i| "Sample #{i}" }
    target_amount_value { 1.0 }
    target_amount_unit { 'g' }
    molarity_value { 1.0 }
    molarity_unit { 'M' }
    density { 0.0 }

    transient do
      force_attributes { nil }
    end

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
    after(:create) do |sample, evaluator|
      sample.update_columns(**evaluator.force_attributes) if evaluator.force_attributes # rubocop:disable Rails/SkipsModelValidations
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

  # factory to create an array of samples
  # @note: This allow to byebass validation and callbacks to create
  #  samples with specific attributes (also invalid ones) from a json file
  # @option [String, Symbol] :from the name of the json file to load relative
  #  to the spec/fixtures/ directory
  # @option [Hash] :default_attributes common attributes to all samples
  #   can be overriden by the attributes in the json file
  # @option [Integer] :size the number of samples to create
  #   default to 0 (all samples in the json file)
  factory :sample_set, class: Array do
    transient do
      from { nil }
      size { 0 }
      fixtures_dir { Rails.root.join('spec/fixtures') }
      default_attributes { {} }
    end
    initialize_with do
      next build_list(:sample, size) if from.nil?

      attribute_names = Sample.attribute_names.map(&:to_sym)
      attributes_set = build(:attributes_set, from: from, fixtures_dir: fixtures_dir, slice: attribute_names)
      attributes_set = attributes_set.first(size).to_h if size > 0
      attributes_set.map do |id, attributes|
        create(:sample, force_attributes: default_attributes.merge(name: id).merge(attributes))
      end
    end
  end
end
