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
end #module
