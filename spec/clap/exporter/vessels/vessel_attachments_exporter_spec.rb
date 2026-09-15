# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Clap::Exporter::Vessels::VesselAttachmentsExporter do
  subject(:attachments_export) { described_class.new(build(:reaction_process_vessel)).to_clap }

  it 'exports no attachments until vessel attachments are implemented' do
    pending 'Vessel Attachments Not yet implemented. Depends on upcoming enhancements in ELN Vessel code.'
    expect(attachments_export).to eq({ reaction_process_vessel: anything })
  end
end
