module Ai::Inference
  def self.products(smis)
    url = Rails.configuration.inference.products[:url]
    port = Rails.configuration.inference.products[:port]
    body = { reactants: smis.join('.') }
    begin
      rsp = HTTParty.post(
        "http://#{url}:#{port}/predict_products",
        body: body.to_json,
        timeout: 30,
        headers: { 'Content-Type' => 'application/json' },
      )
      JSON.parse(rsp.body)
    rescue
      err_body = { 'error' => 'Prediction Sever not found. Please try again later.' }
      err_body
    end
  end
end
