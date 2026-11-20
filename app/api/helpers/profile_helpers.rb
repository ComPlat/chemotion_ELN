module ProfileHelpers
    extend Grape::API::Helpers
    def recent_ols_term_update(name, ols_values, max=10)
      return if ols_values&.length == 0
      return unless %w[chmo rxno bao].include?(name)
      ols_values.each do |ols_value|
        next if ols_value.nil?
        ols_value =~ /(\w+\:?\d+) \| ([^()]*)(\((.*)\))?/
        term = {
          'owl_name' => name,
          'term_id' => $1,
          'title' => $3.nil? ? $2 : $2 + $3,
          'synonym' => $4,
          'synonyms' => [$4],
          'search' => ols_value,
          'value' => ' ' + ols_value
        }
        next unless term['term_id']
        # Analysis callers use the shared CHMO selector for both ontologies.
        ontology_name = name == 'chmo' && term['term_id'].start_with?('BAO:') ? 'bao' : name
        term['owl_name'] = ontology_name
        profile = current_user.profile
        data = profile.data || {}
        list = data[ontology_name]
        if list.present?
          next if (list.find{ |t|  t['term_id'] == term['term_id'] })
          list.unshift(term)
          data[ontology_name] = list.first(max)
        else
          data[ontology_name] =  [term]
        end
        current_user.profile.update!(**{ data: data })
      end
    end
  end
