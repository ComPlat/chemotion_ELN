# frozen_string_literal: true

require 'rails_helper'

# Baseline regression tests for the Stage 2 asset-pipeline (Sprockets) removal.
#
# Purpose: lock in the CURRENT (pre-migration) contract of the server-rendered
# pages that Sprockets still serves — Devise login/sign-up, the 2FA layout and
# the grape_swagger_rails UI — so the same pages can be re-checked AFTER Sprockets
# is replaced by Shakapacker.
#
# Two kinds of assertion:
#   * INVARIANT  — must hold before AND after the migration (status, key DOM).
#   * PRE-MIGRATION — documents the current Sprockets asset tags. When Stage 2
#     lands, flip these to the Shakapacker pack-tag equivalents (see the
#     `AFTER MIGRATION` notes inline).
#
# NOTE: login/sign_up render `layouts/application`, which calls
# `javascript_pack_tag` — in the test env (shakapacker compile: true, no
# packs-test manifest) that would trigger a full webpack build in-process.
# Those two pages are therefore covered by the live-server script
# `tmp/asset_pipeline_testing/verify_baseline.sh` instead of here. The specs
# below only touch pages whose layout has NO pack tag (2FA, swagger), so they
# run cleanly in CI.
RSpec.describe 'Asset-pipeline baseline (Stage 2)', type: :request do
  describe 'GET /swagger (grape_swagger_rails UI — Sprockets-served)' do
    it 'renders and references the engine Sprockets assets' do
      get '/swagger'

      expect(response).to have_http_status(:ok) # INVARIANT
      # PRE-MIGRATION: the engine ships its CSS/JS through Sprockets.
      # AFTER MIGRATION: depends on the swagger decision (§2.2) — either the new
      # static/webpack swagger-ui asset, or this whole block is removed with the engine.
      expect(response.body).to include('grape_swagger_rails')
    end
  end

  describe 'POST /users/two_factor_auth/verify (renders the two_factor_auth layout)' do
    # decode_jwt runs first; with a blank token it renders the error result page
    # via `render :request_result, status: :unauthorized` — still through
    # `layout 'two_factor_auth'`, which is what exercises the Sprockets stylesheet
    # + favicon surface we care about. The 401 IS the current contract here.
    it 'renders the 2FA layout with the Sprockets stylesheet + favicon' do
      post '/users/two_factor_auth/verify', params: { jwt: '' }

      expect(response).to have_http_status(:unauthorized) # INVARIANT (blank-token error page)
      expect(response.body).to include('message-container') # INVARIANT: 2FA result view rendered
      # PRE-MIGRATION: two_factor_auth.haml uses `stylesheet_link_tag 'application'`
      #                + `favicon_link_tag` → Sprockets URLs under /assets/.
      # AFTER MIGRATION: expect `stylesheet_pack_tag`/pack URL + static favicon.
      expect(response.body).to match(%r{/assets/application[-.].*\.css}) # Sprockets fingerprinted CSS
      expect(response.body).to include('/assets/favicon')
    end
  end
end
