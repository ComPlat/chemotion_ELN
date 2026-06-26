# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Actions::Base do
  subject(:clap_export) { described_class.new(action).to_clap(starts_at: 0) }

  let(:action) { create(:reaction_process_activity, activity_name: 'WAIT') }

  it 'raises when used without a concrete action type' do
    expect { clap_export }.to raise_error(/abstract/)
  end
end
