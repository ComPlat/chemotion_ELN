MOLECULE_FIXTURES_PATH = Rails.root.join('spec', 'fixtures', 'structures')
FactoryBot.define do
  factory :molecule do
    sequence(:inchikey) { |i| "XLYOFNOQVPJJNP-UHFFFAOYSA-#{i}" }
    inchistring       { 'inchistring' }
    density           { 0.12345 }
    molecular_weight  { 18.0153 }
    exact_molecular_weight { 18.0106 }
    molfile { build(:molfile, type: :water) }
    melting_point     { 150.00 }
    boiling_point     { 100.00 }
    sum_formular      { 'H2O' }
    names             { %w[name1 sum_formular iupac_name] }
    iupac_name        { 'iupac_name' }
    molecule_svg_file { 'molecule.svg' }

    transient do
      force_attributes { nil }
      clean_attributes { force_attributes&.symbolize_keys&.compact }
    end

    after(:create) do |molecule, evaluator|
      molecule.update_columns(evaluator.clean_attributes) if evaluator.force_attributes # rubocop:disable Rails/SkipsModelValidations
    end
  end

  # Build an array of created molecules with updated attributes 
  # @note: This allow to byebass validation and callbacks to create
  #   molecules with specific attributes (also invalid ones)
  # @example: build(:molecule_set, from: :pc_400,
  #                                default_attributes: { 
  #                                  molfile: build(:molfile, type: :pc_400)
  #                                  })
  #
  factory :molecule_set, class: Array do
    transient do
      from { nil }
      size { 0 }
      default_attributes { {} }
    end
    initialize_with do
      next build_list(:molecule, size) if from.nil?

      filename = "#{from.to_s}#{from.end_with?('.json') ? '' : '.json'}"
      path = MOLECULE_FIXTURES_PATH.join(filename)
      attributes_set = JSON.parse(File.read(path))
      attributes_set = attributes_set.first(size).to_h if size > 0

      attributes_set.map do |id, attributes|
        create(:molecule, force_attributes: default_attributes.merge(iupac_name: id).merge(attributes))
      end
    end
  end
end
