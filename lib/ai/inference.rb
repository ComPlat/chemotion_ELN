module Ai::Inference
  def self.products(smis)
    url = Rails.configuration.inference.url
    port = Rails.configuration.inference.port
    body = { reactants: [smis.join('.')] }
    begin
      rsp = HTTParty.post(
        "http://#{url}:#{port}/forward",
        body: body.to_json,
        timeout: 30,
        headers: { 'Content-Type' => 'application/json' },
      )
      JSON.parse(rsp.body)[0]
    rescue
      err_body = { 'error' => 'Prediction Sever not found. Please try again later.' }
      err_body
    end
  end

  def self.reactants(smis)
    url = Rails.configuration.inference.url
    port = Rails.configuration.inference.port
    body = { products: [smis.join('.')] }
    begin
      rsp = HTTParty.post(
        "http://#{url}:#{port}/retro",
        body: body.to_json,
        timeout: 30,
        headers: { 'Content-Type' => 'application/json' },
      )
      JSON.parse(rsp.body)[0]
    rescue
      err_body = { 'error' => 'Prediction Sever not found. Please try again later.' }
      err_body
    end
  end
end
