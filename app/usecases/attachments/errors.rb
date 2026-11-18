# frozen_string_literal: true

module Usecases
  module Attachments
    module Errors
      class NotPreviewable < StandardError; end
      class FileMissing < StandardError; end
      class ConversionFailed < StandardError; end
    end
  end
end
