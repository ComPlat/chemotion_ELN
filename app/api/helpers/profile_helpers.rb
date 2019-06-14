module ProfileHelpers
    extend Grape::API::Helpers 
    def recent_ols_term_update(name, ols_value, max=5)
        return if ols_value.nil?
        return unless %w[chmo rxno].include?(name)

        term_id = ols_value.split('|').first
        profile = current_user.profile
        data = profile.data
        list = data[name] unless data.nil?

        if list.nil?
          data.merge!(rxno: [term_id]) if name == 'rxno'
          data.merge!(chmo: [term_id]) if name == 'chmo'
        else
          return if (list.include?(term_id))
          list.unshift(term_id).uniq
          data.deep_merge!(rxno: list.first(max)) if name == 'rxno'
          data.deep_merge!(rxno: list.first(max)) if name == 'chmo'
        end
        current_user.profile.update!(**{data: data})
    end
  end
  