module ProfileHelpers
    extend Grape::API::Helpers
    def recent_ols_term_update(name, ols_values, max=10)
      return if ols_values&.length == 0
      return unless %w[chmo rxno].include?(name)
      ols_values.each do |ols_value|
        next if ols_value.nil?
        ols_value =~ /(\w+\:?\d+) \| ([^()]*) (\((.*)\))?/
        term = {
          'owl_name' => name,
          'term_id' => $1,
          'title' => $2,
          'synonym' => $4,
          'synonyms' => [$4],
          'search' => ols_value,
          'value' => ols_value
        }

        next unless term['term_id']
        profile = current_user.profile
        data = profile.data || {}
        list = data[name]
        if list.present?
          return if (list.find{ |t|  t['term_id'] == term['term_id'] })
          list.unshift(term)
          data[name.to_sym] = list.first(max)
        else
          data[name.to_sym] =  [term_id]
        end
        current_user.profile.update!(**{ data: data })
      end
    end
  end
