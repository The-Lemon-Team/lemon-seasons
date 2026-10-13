# Production Dockerfile for Admin CMS (Nginx)
FROM nginx:alpine
COPY apps/admin-cms/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
