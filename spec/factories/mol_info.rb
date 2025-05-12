# frozen_string_literal: true

# require_relative './attributes_set.rb'

# Factory for smiles and molfile
DICT_SMILES = {
  water: 'O',
  benzen: 'c1ccccc1',
  faulty: 'C1CCCCN1(C)[Al]([H])(I)(I)N1(C)CCCCC1',
  invalid: 'invalid_string',
  aromatics: [
    'C#Cc1ccc(cc1)/N=N/c1ccc(cc1)C#C',
    'C[Si](C#Cc1ccc(cc1)/N=N/c1ccc(cc1)C#C[Si](C)(C)C)(C)C',
    'Nc1cnccc1c1ccncc1',
    'c1ccc(cc1)/N=N/c1cnccc1c1ccncc1', # CRS 25536
    'Fc1nc(F)cc(c1)c1ccc(c(c1)[N+](=O)[O-])c1ccncc1',
    '[O-][n+]1ccc(cc1)c1ccnc(c1)F', # CRS 26100
  ],
  problematic: [
    'CC1=C(CC)C(C)=[N]2C1=C(C)C3=CC(/C=C\B4NC5=C6C(C=CC=C6N4)=CC=C5)=CN3B2(F)F',
    'CC1=C(CC)C(C)=[N+]2C1=C(C)C3=CC(/C=C\B4NC5=C6C(C=CC=C6N4)=CC=C5)=CN3[B-]2(F)F',
    'K',
    '[K]',
    'N#[Cr]123O4N5C(C6=CC=CC=C6O7)=O[Mn]48(O([H])C)(O([H])C)OC9=CC=CC=C9C(N8O%103)=O[Mn]%11%10(Cl)(O([H])C)N(O%122)C(C%13=CC=CC=C%13O%11)=O[Mn]%14%12(O([H])C)(O([H])C)N%15C(C%16=CC=CC=C%16O%14)=O[Mn]57(O([H])C)(Cl)O%151', # rubocop:disable Style/LineLength
  ],
}.freeze

# list of filenames for molfiles in spec/fixtures/molfiles
# ensure the molfiles there have a "> <smiles>\n {smiles}\n" attribute
# so that the smiles factory can be used to generate the smiles out of the molfile

DICT_MOLFILE = {
  water: 'WATER.mol',
  aromatics: %w[1F-2Cl-3F-benzen.mol 1F-3F-benzen.mol],
  aromtic_2sub: '1F-3F-benzen.mol',
  aromtic_3sub: '1F-2Cl-3F-benzen.mol',
  aromatic_explicit_hydrogen: 'Q-1F-2H-3F-benzen.mol',
  invalid: 'invalid_01.mol',
  # pc400: 'pc400.mol',  # mofile from openbabel with pubchem 400 status
}.freeze

MOL_STRUCTURES_CONF = {
  smiles: {
    dictionary: DICT_SMILES,
    extension: 'smi',
    fixtures_directory: Rails.root.join('spec/fixtures/structures'),
  },
  molfile: {
    dictionary: DICT_MOLFILE,
    extension: 'mol',
    fixtures_directory: Rails.root.join('spec/fixtures/structures/molfiles'),
  },
}.freeze

# regex to extract the smiles line from a molfile
# the smiles line is the first line after '> <smiles>'
SMILES_LINE_REGEX = /^> <\w*\s?smiles>\n(?<smiles>\S*)\n$/m.freeze

FactoryBot.define do
  # parent class for smiles and molfile
  # @option [Symbol] :cat the category of the structure, either :smiles or :molfiles
  # @option [Symbol] :type the type of the structure, used to select the smiles from the dictionary or json file
  # @option [String, Symbol] :from the name of the json file to use to generate the structures
  # @option [String] :from_ctab the ctab (molfile content) to extract custom attributes smiles from
  #   (only for type: :smiles)
  # @option [Array] :values the list of smiles or molfile to use (if not using the dictionary or json file)
  # @option [Hash] :dictionary the dictionary to use to generate the structures (default: DICT_SMILES or DICT_MOLFILE)
  # @option [String] :fixtures_dir the directory to use to read the json file (default: spec/fixtures/structures)
  # @return [String] the smiles or molfile
  factory :mol_info, class: String do
    transient do
      cat { :smiles }
      sequence(:index)
      dictionary { MOL_STRUCTURES_CONF[cat][:dictionary] }
      fixtures_dir { MOL_STRUCTURES_CONF[cat][:fixtures_directory] }
      extension { MOL_STRUCTURES_CONF[cat][:extension] }
      from_ctab { nil } # if set, the smiles will be extracted from the ctab
      from { nil } # if set, the smiles will be extracted from the json, ex :pc400
      type { nil } # type of molecule to generate, used to select the smiles from the dictionary or json file

      # compute src/values from transient attributes
      # src is either the value of the filename to read the value
      src do
        data = dictionary[type]
        data.is_a?(Array) ? data[index % data.size] : data
      end
      # values is the list of smiles or molfile
      values do
        next [] if from.blank?

        data = build(:parsed_json, from: from, fixtures_dir: fixtures_dir).values
        data = data.filter { |d| d[:type] == type } if type.present?
        data = data.filter_map { |d| d[:smiles] || d[:cano_smiles] } if cat == :smiles
        data = data.filter_map { |d| d[:molfile] } if cat == :molfile
        data
      end
      value do
        next values[index % values.size] if values.present?
        next(src || dictionary[:aromatics].sample) if cat == :smiles

        filename = src.blank? && type.present? ? "#{type}.#{extension}" : src
        File.exist?(fixtures_dir.join(filename)) ? fixtures_dir.join(filename).read : nil
      end
    end
    initialize_with do
      if cat == :smiles && from_ctab.present?
        # return the smiles line from the ctab
        match = from_ctab.match(SMILES_LINE_REGEX)
        next match.present? && match[:smiles]
      end

      value
    end
  end

  factory :smiles, parent: :mol_info do
    transient do
      cat { :smiles }
      type { nil }
    end
  end

  factory :molfile, parent: :mol_info do
    transient do
      cat { :molfile }
      type { :water }
      extension { 'mol' }
    end
  end

  # use this factory to generate a set of smiles from a json input file
  # instead of using build_list to avoid reading the file multiple times
  # @option [Symbol, String] :from the name of the json file to use to generate the structures with or without
  factory :smiles_set, class: Array do
    transient do
      type { nil }
      count { 0 } # number of smiles to generate
      from { :bad_smiles } # json file to use
      fixtures_dir { MOL_STRUCTURES_CONF[:smiles][:fixtures_directory] }
      attributes { build(:attributes_set, from: from, fixtures_dir: fixtures_dir) }
      values do
        attributes.values
                  .filter_map { |data| data[:type] == type && (data[:smiles] || data[:cano_smiles]) }
      end
    end
    initialize_with do
      next values if count.zero?
      next values.sample(count) if count < values.size

      (values * (count.to_f / values.size).ceil)[0...count]
    end
  end

  factory :molfile_set, parent: :smiles_set do
    transient do
      from { :problematic } # json file to use
      values { attributes.values.filter_map { |data| data[:type] == type && data[:molfile] } }
    end
  end
end
