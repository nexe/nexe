FROM centos:7

RUN yum install -y which centos-release-scl && \
  yum install -y devtoolset-9-gcc \
    devtoolset-9-gcc-c++ \
    make \
    wget \
    python3 && \
  echo "source /opt/rh/devtoolset-9/enable" >> /etc/bashrc

SHELL ["/bin/bash", "--login", "-c"]

ADD flags.sh flags.sh

ARG NODE_VERSION=14.20.0

RUN wget https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}.tar.gz -O node.tar.gz && \
  mkdir node && tar -zxf node.tar.gz -C node --strip-components=1 && \
  rm node.tar.gz && \
  cd node && \
  . ../flags.sh && \
  ./configure $(echo $CONFIGURE_FLAGS) && \
  make $(echo $MAKE_FLAGS) && make install
