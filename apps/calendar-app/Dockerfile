# Production Dockerfile for Calendar App (Nginx)
FROM nginx:alpine
COPY apps/calendar-app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
