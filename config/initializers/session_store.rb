# frozen_string_literal: true

# Be sure to restart your server when you modify this file.

# httponly defaults to true: the session cookie must not be readable from JavaScript.
Rails.application.config.session_store :cookie_store, key: '_chemotion_session'
