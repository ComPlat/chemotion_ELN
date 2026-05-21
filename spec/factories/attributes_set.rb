# frozen_string_literal: true

FIXTURES_DIR = Rails.root.join('spec/fixtures')

# Factory to parse a json or yaml fixture and return a hash
FactoryBot.define do
  # @param [Symbol, String] :from the name of the fixture file to use to generate the structures
  #   (with or without .json/.yml extension). A sibling +.yml+ file, if present,
  #   takes precedence over +.json+ — useful when the fixture contains characters
  #   (e.g. SMILES backslashes) that are awkward to embed in strict JSON.
  # @option [Pathname] :fixtures_dir the directory where the fixture is located (default: FIXTURES_DIR)
  # @option [String, Pathname] :file_path resolved fixture path (computed from +from+ and +fixtures_dir+)
  factory :parsed_json, class: Hash do
    transient do
      from { nil }
      fixtures_dir { FIXTURES_DIR }

      # private
      file_path do
        base = from.to_s.sub(/\.(json|ya?ml)\z/, '')
        %w[.yml .yaml .json].lazy.map { |ext| fixtures_dir.join("#{base}#{ext}") }.find(&:exist?) ||
          fixtures_dir.join("#{base}.json")
      end
      data do
        next {} unless File.exist?(file_path)

        case File.extname(file_path.to_s)
        when '.yml', '.yaml' then YAML.load_file(file_path)
        else JSON.parse(File.read(file_path))
        end
      end
    end
    initialize_with { data }
  end

  # Attributes-set factory
  # to parse a json file and return a hash with 2nd level symbolized keys
  # @note: expect a json of the form:
  # { key1: { key1_1: value1_1, key1_2: value1_2 }, key2: { key2_1: value2_1, key2_2: value2_2 }  ....}
  # @note: 2nd level keys are symbolized - expect to correspond to the attributes of the model
  # @option [Symbol, String] :from the name of the json file to use to generate the structures
  #  (with or without .json extension)
  # @option [Pathname] :fixtures_dir the directory where the json file is located (default: FIXTURES_DIR)
  # @option [String, Pathname] :file_path path to the json file (default: fixtures_dir.join("#{from}.json"))
  # @option [Array] :slice the keys to slice the value-hashes (default: nil)
  factory :attributes_set, parent: :parsed_json do
    transient do
      slice { nil }
      sym_data { data.transform_values(&:symbolize_keys) }
      sliced_data { slice.nil? ? sym_data : sym_data.transform_values { |v| v.slice(*slice) } }
    end
    initialize_with { sliced_data }
  end
end
