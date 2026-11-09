# frozen_string_literal: true

namespace :ontologies do
  desc <<~DESC.squish
    Regenerate public/ontologies_default/<owl>.default.json and <owl>.default.edited.json
    from the current OWL release listed by OLS4 (EBI). Args: ontology names separated by
    spaces or commas (default "chmo rxno"). OWL=<path> imports a local file instead
    (one ontology only). The database is left unchanged.
  DESC
  task :build_defaults, [:owl_names] => :environment do |_t, args|
    names = (args[:owl_names].presence || 'chmo rxno').split(/[\s,]+/)
    abort 'OWL=<path> takes a single ontology name' if ENV['OWL'].present? && names.size > 1

    names.each do |owl_name|
      result = OlsTerms::DefaultFiles.build(owl_name, owl_path: ENV['OWL'].presence)
      puts "#{owl_name}: #{result[:terms]} terms, #{result[:enabled]} enabled (#{result[:source]})"
    end
  end
end
