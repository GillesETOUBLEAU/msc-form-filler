FROM mcr.microsoft.com/playwright:v1.48.0-jammy

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY src/ ./src/

CMD ["node", "src/index.js"]
