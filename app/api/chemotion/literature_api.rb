module Chemotion
  class LiteratureAPI < Grape::API
    helpers CollectionHelpers
    helpers ParamsHelpers

    resource :literatures do

      after_validation do
        unless request.url =~ /doi\/metadata|ui_state|collection/
          @element_klass = params[:element_type].classify
          @element = @element_klass.constantize.find_by(id: params[:element_id])
          @element_policy = ElementPolicy.new(current_user, @element)
          allowed = if request.env['REQUEST_METHOD'] =~ /get/i
                      @element_policy.read?
                    else
                      @element_policy.update?
                    end
          error!('401 Unauthorized', 401) unless allowed
        end
      end

      desc "Return the literature list for the given element"
      params do
        requires :element_id, type: Integer
        requires :element_type, type: String, values: %w[sample reaction research_plan]
      end

      get do
        literatures = Literature.by_element_attributes_and_cat(params[:element_id], @element_klass, 'detail')
        { literatures: literatures }
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
          optional :title, type: String
          optional :refs, type: Hash do
            optional :bibtex, type: String
          end
        end
      end

      post do
        lit = if params[:ref][:is_new]
                Literature.find_or_create_by(
                  doi: params[:ref][:doi],
                  url: params[:ref][:url],
                  title: params[:ref][:title]
                )
              else
                Literature.find_by(id: params[:ref][:id])
              end

        lit.update!(refs: (lit.refs || {}).merge(declared(params)[:ref][:refs])) if params[:ref][:refs]

        ltl = Literal.find_or_create_by(
          literature_id: lit.id,
          user_id: current_user.id,
          element_type: @element_klass,
          element_id: params[:element_id],
          category: 'detail'
        ) if lit
        # status(201) if ltl
        literatures = Literature.by_element_attributes_and_cat(params[:element_id], @element_klass, 'detail')
        { literatures: literatures }
      end

      params do
        requires :element_id, type: Integer
        requires :element_type, type: String, values: %w[sample reaction research_plan]
        requires :id, type: Integer
      end

      delete do
        Literal.find_by(
          literature_id: params[:id],
          user_id: current_user.id,
          element_type: @element_klass,
          element_id: params[:element_id],
          category: 'detail'
        ).destroy!
        literatures = Literature.by_element_attributes_and_cat(params[:element_id], @element_klass, 'detail')
        { literatures: literatures }
      end

      namespace :collection do
        params do
          requires :id, type: Integer
          optional :is_sync_to_me, type: Boolean, default: false
        end

        after_validation do
          set_var(params[:id], params[:is_sync_to_me])
          error!(404) unless @c
        end

        get do
          sample_ids = @dl_s > 1 ? @c.sample_ids : []
          reaction_ids = @dl_r > 1 ? @c.reaction_ids : []
          research_plan_ids = @dl_rp > 1 ? @c.research_plan_ids : []
          {
            collectionRefs: Literature.by_element_attributes_and_cat(@c_id, 'Collection', 'detail').group('literatures.id'),
            sampleRefs: Literature.by_element_attributes_and_cat(sample_ids, 'Sample', 'detail').group('literatures.id'),
            reactionRefs: Literature.by_element_attributes_and_cat(reaction_ids, 'Reaction', 'detail').group('literatures.id'),
            researchPlanRefs: Literature.by_element_attributes_and_cat(research_plan_ids, 'ResearchPlan', 'detail').group('literatures.id'),
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
          optional :is_sync_to_me, type: Boolean, default: false
          optional :ref, type: Hash do
            optional :is_new, type: Boolean
            optional :id, types: [Integer, String]
            optional :doi, type: String
            optional :url, type: String
            optional :title, type: String
            optional :refs, type: Hash do
              optional :bibtex, type: String
            end
          end
        end

        after_validation do
          set_var(params[:id], params[:is_sync_to_me])
          error!(404) unless @c

          @sids = @dl_s > 1 ? @c.samples.by_ui_state(declared(params)[:sample]).pluck(:id) : []
          @rids = @dl_r > 1 ? @c.reactions.by_ui_state(declared(params)[:reaction]).pluck(:id) : []
          @sql = <<~SQL
          (literals.element_type = 'Sample' and literals.element_id in (?))
          or (literals.element_type = 'Reaction' and literals.element_id in (?))
          SQL
          @selection = <<~SQL
          literatures.*
          , literals.element_id, literals.element_type
          , coalesce(reactions.short_label, samples.short_label ) as short_label
          , coalesce(reactions.name, samples.name ) as name
          , samples.external_label
          SQL
        end

        post do
          if params[:ref] && @pl >= 1
            lit = if params[:ref][:is_new]
                  Literature.find_or_create_by(
                    doi: params[:ref][:doi],
                    url: params[:ref][:url],
                    title: params[:ref][:title]
                  )
                else
                  Literature.find_by(id: params[:ref][:id])
                end

            lit.update!(refs: (lit.refs || {}).merge(declared(params)[:ref][:refs])) if params[:ref][:refs]
            if lit
              { 'Sample': @sids, 'Reaction': @rids }.each do |type, ids|
                ids.each do |id|
                  ltl = Literal.find_or_create_by(
                    literature_id: lit.id,
                    user_id: current_user.id,
                    element_type: type,
                    element_id: id,
                    category: 'detail'
                  )
                end
              end
            end
          end

          {
            selectedRefs: Literature.joins(:literals)
              .joins("left join samples on literals.element_type = 'Sample' and literals.element_id = samples.id")
              .joins("left join reactions on literals.element_type = 'Reaction' and literals.element_id = reactions.id")
              .where(@sql, @sids, @rids).where("literals.category = 'detail'").select(@selection),
          }

        end
      end


      namespace :doi do
        desc "get metadata from a doi input"
        params do
          requires :doi, type: String
        end

        after_validation do
          params[:doi].match(/(?:\s*10\.)(\S+)\/(\S+)/)
          @doi_prefix = $1
          @doi_suffix = $2
          error(400) unless (@doi_prefix.present? && @doi_suffix.present?)
        end

        get :metadata do
          connection = Faraday.new(url: "https://dx.doi.org") do |f|
            f.use FaradayMiddleware::FollowRedirects
            # f.headers = { 'Accept' => 'text/bibliography; style=bibtex'}
            f.headers = { 'Accept' => 'application/x-bibtex' }
            f.adapter :net_http
          end
          resp = connection.get { |req| req.url("/10.#{@doi_prefix}/#{@doi_suffix}") }
          unless resp.success?
            error!({ error: reason_phrase } , resp.status)
          end
          resp_json = begin
                        JSON.parse(BibTeX.parse(resp.body).to_json)
                      rescue StandardError => e
                        error!(e , 503)
                      end
          { bibtex: resp.body, BTjson: resp_json }
        end
      end
    end
  end
end
