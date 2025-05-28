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

    callback(:before_create) do |sample|
      sample.creator = FactoryBot.build(:user) unless sample.creator
      sample.collections << FactoryBot.build(:collection) # if sample.collections.blank?
      sample.molecule = FactoryBot.create(:molecule) unless sample.molecule || sample.molfile
      sample.container = FactoryBot.create(:container, :with_analysis) unless sample.association(:container).reader
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
        unless sample.association(:container).reader
          sample.association(:container).target = FactoryBot.create(:container, :with_analysis)
        end
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
        sample.container = FactoryBot.create(:container, :with_analysis) unless sample.association(:container).reader
      end
    end
    after(:create) do |sample, evaluator|
      sample.update_columns(**evaluator.force_attributes) if evaluator.force_attributes # rubocop:disable Rails/SkipsModelValidations
    end
  end

  factory :sample_without_analysis, parent: :valid_sample do
    target_amount_value { 100 }
    target_amount_unit { 'mg' }
    callback(:after_create) do |sample|
      sample.analyses.each(&:destroy)
    end
  end

  factory :sample_with_image_in_analysis, parent: :sample_without_analysis do
    callback(:before_create) do |sample|
      container = sample.association(:container).reader
      attachment = FactoryBot.create(:attachment, :with_image,
                                     created_for: sample.creator.id,
                                     attachable_id: container.children[0].children[0].id,
                                     attachable_type: 'Container')
      # FIXME: container-dataset level is missing
      container.children[0].children[0].attachments << attachment
    end
  end

  factory :sample_with_annotated_image_in_analysis, parent: :sample_without_analysis do
    callback(:before_create) do |sample|
      container = sample.association(:container).reader
      attachment = FactoryBot.create(:attachment, :with_annotation,
                                     created_for: sample.creator.id,
                                     attachable_id: container.children[0].children[0].id,
                                     attachable_type: 'Container')
      # FIXME: container-dataset level is missing
      container.children[0].children[0].attachments << attachment
    end
  end

  # factory to create an array of samples
  # @note: This allow to bypass validation and callbacks to create
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
      build_attributes { {} }
      default_attributes { {} }
    end
    initialize_with do
      next build_list(:sample, size) if from.nil?

      attribute_names = Sample.attribute_names.map(&:to_sym)
      attributes_set = build(:attributes_set, from: from, fixtures_dir: fixtures_dir, slice: attribute_names)
      attributes_set = attributes_set.first(size).to_h if size > 0
      attributes_set.map do |id, attributes|
        sample_attributes = build_attributes.slice(*attribute_names).merge(
          force_attributes: default_attributes.merge(name: id).merge(attributes),
        )
        create(:sample, **sample_attributes)
      end
    end
  end

  # Dedicated factory to create problematic samples from the PC400 dataset
  #  grouped by problematic molecules
  factory :sample_map_pc400, class: Hash do
    initialize_with do
      molecule = create(:molecule, molfile: build(:molfile, type: :water))
      build_attributes = {
        user_id: create(:user).id,
        molfile: molecule.molfile,
        molecule_id: molecule.id,
      }

      molecule_map = build(
        :molecule_set, from: 'structures/pc400',
                       default_attributes: { molfile: build(:molfile, type: :pc400) }
      ).to_h { |m| [m.iupac_name, m.id] }

      molecule_map.to_h do |key, molecule_id|
        [
          molecule_id,
          build(
            :sample_set, from: "structures/samples/#{key}",
                         default_attributes: { molecule_id: molecule_id },
                         build_attributes: build_attributes
          ),
        ]
      end
    end
  end
end
