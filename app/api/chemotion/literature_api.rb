# frozen_string_literal: true

# rubocop:disable Metrics/ClassLength
# rubocop:disable Rails/SkipsModelValidations

module Chemotion
  class LiteratureAPI < Grape::API
    helpers CollectionHelpers
    helpers ParamsHelpers

    helpers do
      def citation_for_elements(id = params[:element_id], type = @element_klass, cat = 'detail')
        return Literature.none if id.blank?

        Literature.by_element_attributes_and_cat(id, type, cat).with_user_info
      end
    end

    resource :literatures do
      after_validation do
        unless %r{doi/metadata|ui_state|collection}.match?(request.url)
          @element_klass = params[:element_type].classify
          @element = @element_klass.constantize.find_by(id: params[:element_id])
          @element_policy = ElementPolicy.new(current_user, @element)
          allowed = if /get/i.match?(request.env['REQUEST_METHOD'])
                      @element_policy.read?
                    else
                      @element_policy.update?
                    end
          error!('401 Unauthorized', 401) unless allowed
        end
      end

      desc 'Update type of literals by element'
      params do
        requires :element_id, type: Integer
        requires :element_type, type: String, values: %w[sample reaction research_plan]
        requires :id, type: Integer
        requires :litype, type: String, values: %w[citedOwn citedRef referTo]
      end
      put do
        Literal.find(params[:id])&.update(litype: params[:litype])

        present(
          citation_for_elements,
          with: Entities::LiteratureEntity,
          root: :literatures,
          with_element_count: false,
          with_user_info: true,
        )
      end

      desc 'Return the literature list for the given element'
      params do
        requires :element_id, type: Integer
        requires :element_type, type: String, values: %w[sample reaction research_plan]
      end

      get do
        present(
          citation_for_elements,
          with: Entities::LiteratureEntity,
          root: :literatures,
          with_element_count: false,
          with_user_info: true,
        )
      end

      desc 'create a literature entry'
      params do
        requires :element_id, type: Integer
        requires :element_type, type: String, values: %w[sample reaction research_plan]
        requires :ref, type: Hash do
          optional :is_new, type: Boolean
          optional :id, types: [Integer, String]
          optional :doi, type: String
          optional :url, type: String
          optional :litype, type: String
          optional :title, type: String
          optional :isbn, type: String
          optional :refs, type: Hash do
            optional :bibtex, type: String
            optional :bibliography, type: String
          end
        end
      end

      post do
        lit = if params[:ref][:is_new]
                Literature.find_or_create_by(
                  doi: params[:ref][:doi],
                  url: params[:ref][:url],
                  title: params[:ref][:title],
                  isbn: params[:ref][:isbn],
                )
              else
                Literature.find_by(id: params[:ref][:id])
              end

        lit.update!(refs: (lit.refs || {}).merge(declared(params)[:ref][:refs])) if params[:ref][:refs]
        attributes = {
          literature_id: lit.id,
          user_id: current_user.id,
          element_type: @element_klass,
          element_id: params[:element_id],
          litype: params[:ref][:litype],
          category: 'detail',
        }
        unless Literal.find_by(attributes)
          Literal.create(attributes)
          @element.touch
        end

        present(
          citation_for_elements,
          with: Entities::LiteratureEntity,
          root: :literatures,
          with_element_count: false,
          with_user_info: true,
        )
      end

      params do
        requires :element_id, type: Integer
        requires :element_type, type: String, values: %w[sample reaction research_plan]
        requires :id, type: Integer
      end

      delete do
        literal = Literal.find_by(
          id: params[:id],
          # user_id: current_user.id,
          element_type: @element_klass,
          element_id: params[:element_id],
          category: 'detail',
        )

        error!('Literal not found', 400) unless literal

        literal.destroy!
        status 200
      end

      namespace :collection do
        params do
          requires :id, type: Integer
        end

        after_validation do
          set_var(params[:id])
          error!(404) unless @c
        end

        get do
          sample_ids = @dl_s > 1 ? @c.sample_ids : []
          reaction_ids = @dl_r > 1 ? @c.reaction_ids : []
          research_plan_ids = @dl_rp > 1 ? @c.research_plan_ids : []
          collection_references = Literature.by_element_attributes_and_cat(@c_id, 'Collection',
                                                                           'detail').group_by_element
          sample_references = Literature.by_element_attributes_and_cat(sample_ids, 'Sample', 'detail').group_by_element
          reaction_references = Literature.by_element_attributes_and_cat(reaction_ids, 'Reaction',
                                                                         'detail').group_by_element
          research_plan_references = Literature.by_element_attributes_and_cat(research_plan_ids, 'ResearchPlan',
                                                                              'detail').group_by_element

          {
            collectionRefs: Entities::LiteratureEntity.represent(collection_references, with_element_count: true),
            sampleRefs: Entities::LiteratureEntity.represent(sample_references, with_element_count: true),
            reactionRefs: Entities::LiteratureEntity.represent(reaction_references, with_element_count: true),
            researchPlanRefs: Entities::LiteratureEntity.represent(research_plan_references, with_element_count: true),
          }
        end
      end

      namespace :ui_state do
        params do
          requires :sample, type: Hash do
            use :ui_state_params
          end
          requires :reaction, type: Hash do
            use :ui_state_params
          end
          requires :id, type: Integer
          optional :ref, type: Hash do
            optional :is_new, type: Boolean
            optional :id, types: [Integer, String]
            optional :doi, type: String
            optional :url, type: String
            optional :litype, type: String
            optional :title, type: String
            optional :refs, type: Hash do
              optional :bibtex, type: String
            end
          end
        end

        after_validation do
          set_var(params[:id])
          error!(404) unless @c
          @sids = @dl_s > 1 ? @c.samples.by_ui_state(declared(params)[:sample]).pluck(:id) : []
          @rids = @dl_r > 1 ? @c.reactions.by_ui_state(declared(params)[:reaction]).pluck(:id) : []
          @cat = 'detail'
        end

        post do
          if params[:ref] && @pl >= 1
            lit = if params[:ref][:is_new]
                    Literature.find_or_create_by(
                      doi: params[:ref][:doi],
                      url: params[:ref][:url],
                      title: params[:ref][:title],
                    )
                  else
                    Literature.find_by(id: params[:ref][:id])
                  end

            lit.update!(refs: (lit.refs || {}).merge(declared(params)[:ref][:refs])) if params[:ref][:refs]
            if lit
              { Sample: @sids, Reaction: @rids }.each do |type, ids|
                ids.each do |id|
                  Literal.find_or_create_by(
                    literature_id: lit.id,
                    user_id: current_user.id,
                    element_type: type,
                    element_id: id,
                    litype: params[:ref][:litype],
                    category: 'detail',
                  )
                end
              end
            end
          end

          sample_references = Literature.by_element_attributes_and_cat(@sids, 'Sample', @cat).with_element_and_user_info
          reaction_references = Literature.by_element_attributes_and_cat(@rids, 'Reaction',
                                                                         @cat).with_element_and_user_info

          present(
            sample_references + reaction_references,
            with: Entities::LiteratureEntity,
            root: :selectedRefs,
            with_element_and_user_info: true,
          )
        end
      end

      namespace :doi do
        desc 'get metadata from a doi input'
        params do
          requires :doi, type: String
        end

        after_validation do
          params[:doi] =~ %r{(?:\s*10\.)(\S+)/(\S+)}
          @doi_prefix = ::Regexp.last_match(1)
          @doi_suffix = ::Regexp.last_match(2)
          error(400) unless @doi_prefix.present? && @doi_suffix.present?
        end

        get :metadata do
          connection = Faraday.new(url: 'https://dx.doi.org') do |faraday|
            faraday.response :follow_redirects
            faraday.headers = { 'Accept' => 'application/x-bibtex' }
          end
          resp = connection.get { |req| req.url("/10.#{@doi_prefix}/#{@doi_suffix}") }
          error!({ error: reason_phrase }, resp.status) unless resp.success?
          resp_json = begin
            JSON.parse(BibTeX.parse(resp.body).to_json)
          rescue StandardError => e
            error!(e, 503)
          end
          { bibtex: resp.body, BTjson: resp_json }
        end
      end
    end
  end
end
# rubocop:enable Metrics/ClassLength
# rubocop:enable Rails/SkipsModelValidations
