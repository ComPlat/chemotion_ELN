module Chemotion
  class LiteratureAPI < Grape::API
    resource :literatures do

      after_validation do
        unless request.url =~ /doi\/metadata/
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
