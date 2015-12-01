require 'roo'
module ImportSamples
  extend ActiveSupport::Concern

  module ClassMethods
    def import_samples_from_file(file_path)
      xlsx = Roo::Spreadsheet.open(file_path)
      #TODO
      []
    end
  end

end