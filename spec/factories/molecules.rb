# frozen_string_literal: true

MOLECULE_FIXTURES_PATH = Rails.root.join('spec/fixtures/structures')
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
    end

    after(:create) do |molecule, evaluator|
      molecule.update_columns(**evaluator.force_attributes) if evaluator.force_attributes # rubocop:disable Rails/SkipsModelValidations
    end
  end

  # Build an array of created molecules with updated attributes
  # @note: This allow to byebass validation and callbacks to create
  #   molecules with specific attributes (also invalid ones)
  # @example: build(:molecule_set, from: :pc400,
  #                                default_attributes: {
  #                                  molfile: build(:molfile, type: :pc400)
  #                                  })
  #
  factory :molecule_set, class: Array do
    transient do
      from { nil }
      size { 0 }
      default_attributes { {} }
      fixtures_dir { Rails.root.join('spec/fixtures') }
    end
    initialize_with do
      attribute_names = Molecule.attribute_names.map(&:to_sym)
      attributes_set = build(:attributes_set, from: from, slice: attribute_names,
                                              fixtures_dir: fixtures_dir)
      attributes_set = attributes_set.first(size).to_h if size > 0

      attributes_set.map do |id, attributes|
        create(:molecule, force_attributes: default_attributes.merge(iupac_name: id).merge(attributes))
      end
    end
  end
end
