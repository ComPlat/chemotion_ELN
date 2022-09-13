# frozen_string_literal: true

module Usecases
  module Attachments
    class Unlink
      attr_reader :attachment

      def initialize(attachment)
        @attachment = attachment
      end

      def self.execute!(attachment)
        new(attachment).execute!
      end

      def execute!
        attachment.tap do |a|
          a.attachable_id = nil
          a.attachable_type = 'Container'
          a.save!
        end
      end
    end
  end
end
