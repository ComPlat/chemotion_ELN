module ProfileHelpers
    extend Grape::API::Helpers
    def recent_ols_term_update(name, ols_values, max=10)
      return if ols_values.nil?
      return if ols_values&.length == 0
      return unless %w[chmo rxno].include?(name)

      ols_values.each do |ols_value|
        next if ols_value.nil?
        term_id = ols_value.split('|').first.strip
        next if term_id.nil? || term_id.length == 0
        profile = current_user.profile
        data = profile.data || {}
        list = data[name]
        if list.nil?
          data.merge!(rxno: [term_id]) if name == 'rxno'
          data.merge!(chmo: [term_id]) if name == 'chmo'
        else
          return if (list.include?(term_id))
          list.unshift(term_id).uniq
          data.deep_merge!(rxno: list.first(max)) if name == 'rxno'
          data.deep_merge!(chmo: list.first(max)) if name == 'chmo'
        end
        current_user.profile.update!(**{data: data})
      end
    end
  end
