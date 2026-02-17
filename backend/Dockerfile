FROM node:22-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run prisma:generate && npm run build

EXPOSE 3001
CMD ["sh", "-c", "npm run prisma:deploy && if [ \"${AUTO_SEED:-true}\" = \"true\" ]; then npm run seed; fi && npm run start"]
