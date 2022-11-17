FROM ubuntu:focal

# set timezone
ENV TIMEZONE=Europe/Berlin
RUN AREA=$(echo $TIMEZONE | cut -d'/' -f1) && \
    REGION=$(echo $TIMEZONE | cut -d'/' -f2) && \
    rm -f /etc/localtime && \
    ln -s /usr/share/zoneinfo/$AREA/$REGION /etc/localtime

RUN apt-get -y update

RUN apt-get -y install locales dirmngr gpg curl gawk \
    build-essential \
    libssl-dev libreadline-dev zlib1g-dev \
    libsqlite3-dev libbz2-dev \
    git

# mostly for everything
RUN apt-get -y --autoremove --fix-missing install \
    git build-essential wget unzip

RUN curl https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update -qqy \
    && apt-get -qqy install google-chrome-stable

RUN CD_VERSION=$(curl https://chromedriver.storage.googleapis.com/LATEST_RELEASE) \
    && echo "Using chromedriver version: "$CD_VERSION \
    && wget --no-verbose -O /tmp/chromedriver_linux64.zip https://chromedriver.storage.googleapis.com/$CD_VERSION/chromedriver_linux64.zip \
    && rm -rf /opt/selenium/chromedriver \
    && unzip /tmp/chromedriver_linux64.zip -d /opt/selenium \
    && rm /tmp/chromedriver_linux64.zip \
    && mv /opt/selenium/chromedriver /opt/selenium/chromedriver-$CD_VERSION \
    && chmod 755 /opt/selenium/chromedriver-$CD_VERSION \
    && ln -fs /opt/selenium/chromedriver-$CD_VERSION /usr/bin/chromedriver

# this is for the gems
RUN apt-get -y --autoremove --fix-missing install \
    postgresql-client cmake libpq-dev swig \
    libboost-serialization-dev \
    libboost-iostreams-dev \
    libboost-system-dev \
    libeigen3-dev \
    imagemagick \
    libmagickcore-dev \
    xvfb \
    inkscape \
    python3-dev \
    libicu-dev

# set the locale
ENV LANG=en_US.UTF-8
RUN echo -e "LANG=${LANG}\nLC_ALL=${LANG}" > /etc/locale.conf
RUN sed -i '/'${LANG}'/s/^# //g' /etc/locale.gen && \
    locale-gen

RUN mkdir -p /precompiled && chmod a+rwx /precompiled

RUN echo '. $HOME/.asdf/asdf.sh' >> "/etc/bash.bashrc"

RUN useradd -mU -s /bin/bash vscode
USER vscode
WORKDIR /home/vscode/

RUN mkdir -p /home/vscode/.config/fontconfig/
COPY fonts.conf /home/vscode/.config/fontconfig/fonts.conf

RUN git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.8.1

SHELL ["/bin/bash", "-c"]
ENV ASDF_DIR=/home/vscode/.asdf
ENV PATH=/home/vscode/.asdf/shims:/home/vscode/.asdf/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

RUN asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git
RUN asdf install nodejs 14.20.0
RUN asdf global nodejs $(asdf list nodejs)
RUN npm install -g npm@7.11.1 yarn

RUN asdf plugin add ruby https://github.com/asdf-vm/asdf-ruby.git
RUN asdf install ruby 2.6.9
RUN asdf global ruby $(asdf list ruby)

RUN asdf plugin add python https://github.com/danhper/asdf-python.git

ENV RAILS_ENV=development

RUN gem install bundler -v 1.17.3
