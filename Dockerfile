FROM node:10.13.0-alpine

ARG AWS_DYNAMODB_ENDPOINT
ARG AWS_DYNAMODB_REGION
ARG AWS_SES_ENDPOINT
ARG AWS_SES_FROM_EMAIL
ARG AWS_SES_REGION
ARG MC_API_KEY
ARG NODE_ENV=production

WORKDIR /rss-notification-service

ADD . /rss-notification-service

ENV AWS_DYNAMODB_ENDPOINT $AWS_DYNAMODB_ENDPOINT
ENV AWS_DYNAMODB_REGION $AWS_DYNAMODB_REGION
ENV AWS_SES_ENDPOINT $AWS_SES_ENDPOINT
ENV AWS_SES_FROM_EMAIL $AWS_SES_FROM_EMAIL
ENV AWS_SES_REGION $AWS_SES_REGION
ENV MC_API_KEY $MC_API_KEY
ENV NODE_ENV $NODE_ENV

RUN echo "Environment: (NODE_ENV): $NODE_ENV" && npm install

EXPOSE 3000

HEALTHCHECK --interval=5s --timeout=3s CMD curl --fail http://localhost:3000 || exit 1

CMD [ "npm", "start" ]
CMD [ "npm", "healthcheck" ]
