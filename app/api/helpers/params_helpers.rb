module ParamsHelpers
  extend Grape::API::Helpers

  params :ui_state_params do
    optional :checkedAll, type: Boolean, default: false
    optional :checkedIds, type: Array, default: []
    optional :uncheckedIds, type: Array, default: []
    # legacy
    optional :all, type: Boolean, default: false
    optional :included_ids, type: Array, default: []
    optional :excluded_ids, type: Array, default: []
    optional :collection_id, type: Integer
    optional :is_sync_to_me, type: Boolean, default: false
  end

  params :main_ui_state_params do
    requires :currentCollection, type: Hash do
      requires :id, type: Integer
      optional :is_sync_to_me, type: Boolean, default: false
      optional :is_shared, type: Boolean, default: false
    end
    optional :sample, type: Hash do
      use :ui_state_params
    end
    optional :reaction, type: Hash do
      use :ui_state_params
    end
    optional :wellplate, type: Hash do
      use :ui_state_params
    end
    optional :screen, type: Hash do
      use :ui_state_params
    end
    optional :research_plan, type: Hash do
      use :ui_state_params
    end
  end

  params :common_container_params do
    optional :id, type: Integer
    optional :name, type: String
    optional :container_type, type: String
    optional :description
    optional :extended_metadata
    optional :is_new, coerce: Boolean
    optional :is_deleted, coerce: Boolean
    optional :_checksum, type: String
    optional :code_log

    optional :attachments, type: Array

  end

  params :root_container_params do
    requires :container, type: Hash do
      use :common_container_params
      optional :children, type: Array do
        use :common_container_params
        optional :children, type: Array do
          use :common_container_params
          optional :children, type: Array do
            # optional :id, type: Integer
             optional :name, type: String
             optional :container_type, type: String
             optional :description
             optional :extended_metadata
             optional :is_new #, type: Boolean
             optional :is_deleted #, type: Boolean
             optional :attachments, type: Array
             optional :_checksum, type: String
             optional :code_log
          #   optional :children
           end
        end
      end

    end
  end

  # Back to page one if the clicked page number > total page number
  def reset_pagination_page(scope)
    your_page = params[:page]
    per_page_recs = params[:per_page]
    total_recs = scope.size
    your_recs = your_page.to_i * per_page_recs.to_i
    total_page = (total_recs.to_f / per_page_recs.to_f).ceil

    if total_recs > 0 && your_page > total_page
      your_page = 1
    end

    params[:page] = your_page
  end
end #module
