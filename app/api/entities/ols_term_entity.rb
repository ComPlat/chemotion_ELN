module Entities
  class OlsTermEntity < Grape::Entity
    expose :search do |obj|
      if obj['owl_name'] == 'rxno' || obj['synonym'].nil?
        obj['term_id'] + ' | ' + obj['label']
      else
        obj['term_id'] + ' | ' + obj['label'] + ' (' + obj['synonym'] + ')' + '|' + (obj['synonyms']||[]).join(',')
      end
    end

    expose :title do |obj|
      if obj['owl_name'] == 'rxno' || obj['synonym'].nil?
        obj['label']
      else
        obj['label'] + ' (' + obj['synonym'] + ')'
      end
    end
    expose :synonym do |obj|
      obj['synonym']
    end
    expose :value do |obj|
      if obj['owl_name'] == 'rxno' || obj['synonyms'].nil?
        obj['term_id'] + ' | ' + obj['label']
      else
        obj['term_id'] + ' | ' + obj['label'] + ' (' + obj['synonym'] + ')'
      end
    end

    expose :is_enabled do |obj|
      obj['is_enabled']
    end

    expose :id do |obj|
      obj['id']
    end

    expose :children do |obj|
      Entities::OlsTermEntity.represent obj['children']
    end
  end
end
