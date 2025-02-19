FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install --frozen-lockfile

COPY . .

RUN chmod +x /app/node_modules/.bin/vite

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
