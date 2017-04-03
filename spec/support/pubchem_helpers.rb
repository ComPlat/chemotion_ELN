module PubchemHelpers
  def get_cids_from_inchikeys(body)
    inchikey = body.split("=")[1]
    response_hash = {
      PropertyTable: {
        Properties: [
          {
            CID: 123456789,
            InChIKey: inchikey
          }
        ]
      }
    }
    response_hash.to_json.to_s
  end
end
