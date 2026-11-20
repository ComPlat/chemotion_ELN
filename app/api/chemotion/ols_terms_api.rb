# frozen_string_literal: true

module Chemotion
  # OLS Terms API
  class OlsTermsAPI < Grape::API
    namespace :ols_terms do
      desc 'Get List'
      params do
        requires :name, type: String, desc: 'OLS Name', values: %w[chmo rxno bao]
        optional :edited, type: Boolean, default: true, desc: 'Only list visible terms'
      end

      get 'list' do
        file = Rails.public_path.join(
          'ontologies',
          "#{params[:name]}#{params[:edited] ? '.edited.json' : '.json'}",
        )
        result = JSON.parse(File.read(file, encoding: 'bom|utf-8')) if File.exist?(file)
        empty_tree = result&.fetch('ols_terms', [])&.all? do |node|
          node['title'] == OlsTerm::NODE_RECENTLY_SELECTED[:title]
        end
        # An empty export made before import must not mask the bundled vocabulary.
        # Imported vocabularies can intentionally have every term disabled.
        if result.nil? || (empty_tree && !OlsTerm.exists?(owl_name: params[:name]))
          file = Rails.public_path.join(
            'ontologies_default',
            "#{params[:name]}#{params[:edited] ? '.default.edited.json' : '.default.json'}",
          )
          result = JSON.parse(File.read(file, encoding: 'bom|utf-8')) if File.exist?(file)
        end
        result ||= { 'ols_terms' => [] }
        if params[:edited] && result['ols_terms'].present?
          recent_term_ids = current_user.profile&.data&.fetch(params[:name], nil)
          result['ols_terms'][0]['children'] = recent_term_ids if recent_term_ids.present?
        end
        result
      end

      get 'root' do
        list = OlsTerm.where(owl_name: params[:name], is_enabled: true, ancestry: '/')

        present list, with: Entities::OlsTermEntity, root: :ols_terms
      end
    end
  end
end
