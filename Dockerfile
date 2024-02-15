FROM node:18-alpine

WORKDIR /usr/app

COPY . .

RUN npm i 

COPY . .

EXPOSE 8000

CMD ["npm","run","dev"]