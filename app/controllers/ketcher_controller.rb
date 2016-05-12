class KetcherController < ApplicationController

  skip_before_filter :authenticate_user!
  layout false

  def index
  end
end
