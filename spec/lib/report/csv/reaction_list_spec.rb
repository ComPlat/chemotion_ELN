# frozen_string_literal: true

require 'rails_helper'

describe Reporter::Csv::ReactionList do
  # required to make the roo gem use the correct parser
  let(:file_extension) { '.csv' }
  include_context 'Report shared declarations'

  it_behaves_like 'Rinchi Xlsx/Csv formats'
end
