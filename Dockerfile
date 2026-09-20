# Sitio estático: no hay build, solo servirlo.
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/

# Los archivos no llevan hash en el nombre. Sin esto, un CDN por delante sigue
# sirviendo el CSS y el JS viejos después de un despliegue: pasó con Cloudflare,
# que los había cacheado cuatro horas. La marca de build cambia las URLs y lo
# obliga a buscar de nuevo.
RUN V=$(date +%s) && \
    sed -i "s/__V__/$V/g" /usr/share/nginx/html/index.html /usr/share/nginx/html/js/*.js

EXPOSE 80
