# Be sure to restart your server when you modify this file.

Rails.application.config.session_store :cookie_store, {
  key: '_chemotion_session',
  httponly: false,
  same_site: :strict,
}
