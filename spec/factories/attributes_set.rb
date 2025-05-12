# frozen_string_literal: true

FIXTURES_DIR = Rails.root.join('spec/fixtures')

# Factory to parse a json file and return a hash
FactoryBot.define do
  # @param [Symbol, String] :from the name of the json file to use to generate the structures
  #   (with or without .json extension)
  # @option [Pathname] :fixtures_dir the directory where the json file is located (default: FIXTURES_DIR)
  # @option [String, Pathname] :file_path path to the json file (default: fixtures_dir.join("#{from}.json"))
  factory :parsed_json, class: Hash do
    transient do
      from { nil }
      fixtures_dir { FIXTURES_DIR }

      # private
      file_path { fixtures_dir.join("#{from}#{from.end_with?('.json') ? '' : '.json'}") }
      data { File.exist?(file_path) ? JSON.parse(File.read(file_path)) : {} }
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
