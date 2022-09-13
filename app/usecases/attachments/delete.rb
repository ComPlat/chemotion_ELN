# frozen_string_literal: true

module Usecases
  module Attachments
    class Delete
      def self.execute!(attachment)
        attachment.delete
      end
    end
  end
end
