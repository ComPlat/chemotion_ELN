# frozen_string_literal: true

require 'rails_helper'

describe Reporter::Xlsx::ReactionList do
  let(:file_extension) { '.xlsx' }

  include_context 'Report shared declarations'
  it_behaves_like 'Rinchi Xlsx/Csv formats'
end
