FactoryBot.define do
  factory :reaction do
    callback(:before_create) do |reaction|
      reaction.creator = FactoryBot.build(:user) unless reaction.creator
      reaction.container = FactoryBot.create(:container, :with_analysis) unless reaction.container
    end

    sequence(:name) { |i| "Reaction #{i}" }
    status { 'Successful' }
    solvent { 'Aceton' }
    description { { 'ops' => [{ 'insert' => 'I am description' }] } }
    purification { '{TLC,Distillation}' }
    rf_value { 0.99 }
    tlc_solvents { 'D2O' }
    tlc_description { 'I am tlc_description' }
    observation { { 'ops' => [{ 'insert' => 'I am observation' }] } }

    factory :valid_reaction do
      after(:build) do |reaction|
        creator = FactoryBot.create(:user)
        collection = FactoryBot.create(:collection, user_id: creator.id)
        reaction.creator = creator unless reaction.creator
        reaction.collections << collection if reaction.collections.blank?
        reaction.container = FactoryBot.build(:container) unless reaction.container
      end
    end

    factory :reaction_with_variations do
      after(:build) do |reaction|
        def get_gas_type(material_type)
          case material_type
          when 'startingMaterials'
            'feedstock'
          when 'reactants', 'solvents'
            'off'
          when 'products'
            'gas'
          end
        end

        def get_aux(sample, material_type)
          {
            purity: sample.try(:purity),
            loading: sample.try(:loading),
            molarity: sample.try(:molarity_value),
            sumFormula: sample.try(:sum_formula),
            coefficient: sample.try(:coefficient),
            isReference: sample.try(:reference),
            molecularWeight: sample.molecule.try(:molecular_weight),
            gasType: get_gas_type(material_type),
            materialType: material_type,
            vesselVolume: 42,
            density: 42,
          }
        end

        variations = Array.new(2) do |i|
          starting_materials = reaction.starting_materials.index_by(&:id).transform_values do |sample|
            {
              aux: get_aux(sample, 'startingMaterials'),
              mass: { unit: 'g', value: 42 },
              amount: { unit: 'mol', value: 42 },
              equivalent: { unit: nil, value: 42 },
              volume: { unit: 'ml', value: 42 },
            }
          end

          reactants = reaction.reactants.index_by(&:id).transform_values do |sample|
            {
              aux: get_aux(sample, 'reactants'),
              mass: { unit: 'g', value: 42 },
              amount: { unit: 'mol', value: 42 },
              equivalent: { unit: nil, value: 42 },
              volume: { unit: 'ml', value: 42 },
            }
          end

          products = reaction.products.index_by(&:id).transform_values do |sample|
            {
              aux: get_aux(sample, 'products'),
              mass: { unit: 'g', value: 42 },
              amount: { unit: 'mol', value: 42 },
              yield: { unit: nil, value: 42 },
              duration: { unit: 'Second(s)', value: 42 },
              temperature: { unit: 'K', value: 42 },
              concentration: { unit: nil, value: 42 },
              turnoverNumber: { unit: nil, value: 42 },
              turnoverFrequency: { unit: nil, value: 42 },
              volume: { unit: 'ml', value: 42 },
            }
          end

          solvents = reaction.solvents.index_by(&:id).transform_values do |sample|
            {
              aux: get_aux(sample, 'solvents'),
              volume: { unit: 'ml', value: 42 },
            }
          end

          {
            id: i.to_s,
            metadata: {
              analyses: [],
              notes: '',
            },
            properties: {
              duration: { unit: 'Hour(s)', value: '42' },
              temperature: { unit: '°C', value: '42' },
            },
            startingMaterials: starting_materials,
            reactants: reactants,
            products: products,
            solvents: solvents,
          }
        end
        reaction.variations = variations
      end
    end
  end
end
