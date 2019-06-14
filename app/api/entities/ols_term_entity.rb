module Entities
  class OlsTermEntity < Grape::Entity
    expose :search do |obj|
      if obj['ols_name'] == 'rxno' || obj['synonym'].nil?
        obj['term_id'] + ' | ' + obj['label']
      else
        obj['term_id'] + ' | ' + obj['label'] + ' (' + obj['synonym'] + ')' + '|' + (obj['synonyms']||[]).join(',')
      end
    end

    expose :title do |obj|
      if obj['ols_name'] == 'rxno' || obj['synonym'].nil?
        obj['label']
      else
        obj['label'] + ' (' + obj['synonym'] + ')'
      end
    end
    expose :synonym do |obj|
      obj['synonym']
    end
    expose :value do |obj|
      if obj['ols_name'] == 'rxno' || obj['synonyms'].nil?
        obj['term_id'] + ' | ' + obj['label']
      else
        obj['term_id'] + ' | ' + obj['label'] + ' (' + obj['synonym'] + ')'
      end
    end

    expose :children do |obj|
      Entities::OlsTermEntity.represent obj['children']
    end
  end
end