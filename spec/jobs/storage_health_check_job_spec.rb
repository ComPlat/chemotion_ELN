# frozen_string_literal: true

require 'rails_helper'

RSpec.describe StorageHealthCheckJob do
  before { create(:admin) }

  it 'emails admins when a tier is unavailable' do
    allow(StorageHealth).to receive(:problems).and_return(["tier 'cold': directory missing"])

    expect { described_class.perform_now }
      .to change { ActionMailer::Base.deliveries.size }.by(1)
  end

  it 'sends nothing when all tiers are healthy' do
    allow(StorageHealth).to receive(:problems).and_return([])

    expect { described_class.perform_now }
      .not_to(change { ActionMailer::Base.deliveries.size })
  end
end
