FROM nvcr.io/nvidia/dli/dli-nano-deepstream:v2.0.0-DS6.0GA

# Don't prompt with any configuration questions
ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update && \
apt-get install -y iproute2 && \
ip r && \
apt-get install -y ffmpeg && \
ffmpeg -version && \
apt-get install -y curl && \
curl -sL https://deb.nodesource.com/setup_16.x | bash - && \
apt-get install -y nodejs && \
node -v && \
npm -v

COPY . /dli/task/web
WORKDIR web
CMD ["npm", "start"]
EXPOSE 8001
