# frozen_string_literal: true

require 'rails_helper'

describe Reporter::Xlsx::ReactionList do
  let(:file_extension) { '.xlsx' }
  include_context 'Report shared declarations'
  pending "Requires Roo 2.9.0 to work properly" do
    raise 'Missing Roo 2.9.0'
    # it_behaves_like 'Rinchi Xlsx/Csv formats'
  end
end
