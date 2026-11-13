# frozen_string_literal: true

require 'net/http'

module OlsTerms
  # Builds the ontology files shipped in +public/ontologies_default+, which the API serves
  # while an instance has no +public/ontologies/<owl>.json+ of its own.
  #
  # The OWL file is imported exactly as the admin import does it ({OlsTerm.import_owl}),
  # inside a transaction that is rolled back, so the database is left unchanged.
  module DefaultFiles
    OLS_API = 'https://www.ebi.ac.uk/ols4/api/ontologies/'

    module_function

    # @param owl_name [String] ontology name, e.g. +chmo+
    # @param owl_path [String, nil] local OWL file; +nil+ downloads the current release
    #   listed by OLS4
    # @param dir [Pathname, String] target directory
    # @return [Hash] +:source+ (version IRI or path), +:terms+ and +:enabled+ counts
    def build(owl_name, owl_path: nil, dir: Rails.public_path.join('ontologies_default'))
      return import_and_write(owl_name, owl_path, owl_path, dir) if owl_path

      config = JSON.parse(fetch("#{OLS_API}#{owl_name}"))['config']
      Tempfile.create([owl_name, '.owl'], binmode: true) do |file|
        file.write(fetch(config['fileLocation']))
        file.flush
        import_and_write(owl_name, file.path, config['versionIri'] || config['fileLocation'], dir)
      end
    end

    def import_and_write(owl_name, path, source, dir)
      result = nil
      ActiveRecord::Base.transaction do
        OlsTerm.import_owl(owl_name, path)
        terms = OlsTerm.where(owl_name: owl_name)
        PublicFiles.write(owl_name, dir: dir, basename: "#{owl_name}.default", ids: false)
        result = { source: source, terms: terms.count, enabled: terms.where(is_enabled: true).count }
        raise ActiveRecord::Rollback
      end
      result
    end

    # GETs +url+, following up to +limit+ redirects (OBO PURLs redirect twice).
    def fetch(url, limit = 5)
      raise ArgumentError, "too many redirects: #{url}" if limit.zero?

      response = Net::HTTP.get_response(URI(url))
      case response
      when Net::HTTPSuccess then response.body
      when Net::HTTPRedirection then fetch(URI.join(url, response['location']).to_s, limit - 1)
      else raise "#{url}: HTTP #{response.code}"
      end
    end
  end
end
