# ---- Builder Stage ----
    FROM node:20-alpine AS builder

    WORKDIR /app
    
    # Install dependencies
    COPY package*.json ./
    RUN npm install
    
    # Copy all sources
    COPY . .
    
    # ⏩ RUN Prisma generate
    RUN npx prisma generate
    
    # Build TypeScript
    RUN npm run build
    
    
    # ---- Production Stage ----
    FROM node:20-alpine AS production
    
    WORKDIR /app
    
    # Install production dependencies
    COPY package*.json ./
    RUN npm install --only=production
    
    # Copy build files
    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/ecosystem.config.js ./ecosystem.config.js
    
    # Copy prisma client (important)
    COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
    COPY --from=builder /app/node_modules/@prisma /app/node_modules/@prisma

    # 👉 Copy prisma schema (so migrate deploy can work)
    COPY --from=builder /app/prisma ./prisma
    
    # Install PM2
    RUN npm install pm2 -g
    
    EXPOSE 3000

   # Replace the CMD
#    CMD sh -c "echo 'Running Prisma Migrate Deploy...' && npx prisma migrate deploy && echo 'Starting application with PM2...' && npm start"
CMD sh -c "\
  echo 'Resolving failed Prisma migration...' && \
  echo 'Running Prisma Migrate Deploy...' && \
  npx prisma migrate deploy && \
  echo 'Starting application...' && \
  npm start"
#    CMD ["./docker-entrypoint.sh"]
    
    # CMD ["pm2-runtime", "ecosystem.config.js", "--only", "api-prod"]
    