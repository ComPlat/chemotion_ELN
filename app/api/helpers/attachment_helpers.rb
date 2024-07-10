module AttachmentHelpers
    extend Grape::API::Helpers


    def has_read_access(attachment_id,user)
        return false
    end
    def has_write_access(attachment_id,user)
        return false
    end
end