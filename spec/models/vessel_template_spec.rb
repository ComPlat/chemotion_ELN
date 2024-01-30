# frozen_string_literal: true

require 'rails_helper'

RSpec.describe VesselTemplate do
  it_behaves_like 'acts_as_paranoid soft-deletable model'

  it { is_expected.to have_many(:vessels) }
end
