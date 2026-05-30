# Dockerfile para servir el Frontend Estático del Portal Educativo
# Nota: La carpeta /api contiene Edge Functions que se despliegan en Vercel.
# Este contenedor empaqueta exclusivamente la UI (HTML/CSS/JS) para entornos locales o de nube privada.

FROM nginx:alpine

# Copiamos la configuración personalizada de Nginx (opcional, pero buena práctica)
# RUN rm /etc/nginx/conf.d/default.conf
# COPY nginx.conf /etc/nginx/conf.d/

# Copiamos los archivos estáticos al directorio público de Nginx
COPY index.html /usr/share/nginx/html/
COPY main.css /usr/share/nginx/html/
COPY manifest.json /usr/share/nginx/html/
COPY sw.js /usr/share/nginx/html/
COPY src/ /usr/share/nginx/html/src/
COPY assets/ /usr/share/nginx/html/assets/

# Exponemos el puerto estándar web
EXPOSE 80

# Nginx arranca por defecto, no es necesario un CMD explícito, pero lo declaramos por claridad
CMD ["nginx", "-g", "daemon off;"]
