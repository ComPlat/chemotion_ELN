class CurateProfileRecentOwl < ActiveRecord::Migration
  def change
    Profile.find_each do |profile|
      data = profile.data
      next unless data
      # break unless defined? OlsTerm
      %w[chmo rxno].each do |owl_name|
        next unless data[owl_name].present?
        recent_terms = []
        data[owl_name].each do |term|
          unless term.is_a?(String)
            recent_terms << term
            next
          end
          t = OlsTerm.find_by(term_id: term)
	  next unless t
          new_term = {
            'owl_name' => owl_name,
            'term_id' => term,
            'title' => t.label,
            'synonym' => t.synonym,
            'synonyms' => t.synonyms,
            'search' => "#{term} | #{t.label} (#{[t.synonyms].flatten.join(',')})",
            'value' => "#{term} | #{t.label} (#{t.synonym})",
          }
          recent_terms << new_term
        end
        data[owl_name] = recent_terms
      end
      profile.update(data: data)
    end
  end
end
